using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using SPEAgentWithRetrieval.Core.Models;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using System.Net.Http.Headers;

namespace SPEAgentWithRetrieval.Core.Services;

public class CopilotRetrievalService : IRetrievalService
{
    private const string CopilotRetrievalEndpoint = "https://graph.microsoft.com/v1.0/copilot/retrieval";

    // Shared HttpClient instance reused across requests to avoid socket exhaustion
    // and to benefit from connection pooling.
    private static readonly HttpClient SharedHttpClient = new();

    private readonly HttpClient _httpClient;
    private readonly Microsoft365Options _microsoft365Options;
    private readonly ChatSettingsOptions _chatSettings;
    private readonly ILogger<CopilotRetrievalService> _logger;
    private readonly ITokenProvider _tokenProvider;

    public CopilotRetrievalService(
        IOptions<Microsoft365Options> microsoft365Options,
        IOptions<ChatSettingsOptions> chatSettings,
        ITokenProvider tokenProvider,
        ILogger<CopilotRetrievalService> logger)
        : this(microsoft365Options, chatSettings, tokenProvider, logger, SharedHttpClient)
    {
    }

    // Test-friendly constructor that allows injecting an HttpClient (e.g. one backed by
    // a stub message handler). Production code uses the shared client via the constructor above.
    internal CopilotRetrievalService(
        IOptions<Microsoft365Options> microsoft365Options,
        IOptions<ChatSettingsOptions> chatSettings,
        ITokenProvider tokenProvider,
        ILogger<CopilotRetrievalService> logger,
        HttpClient httpClient)
    {
        _microsoft365Options = microsoft365Options.Value;
        _chatSettings = chatSettings.Value;
        _logger = logger;
        _tokenProvider = tokenProvider;
        _httpClient = httpClient;
    }

    public async Task<List<RetrievedContent>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Searching for content ({Length} char query)", query.Length);
            _logger.LogDebug("Search query content: {Query}", query);

            if (string.IsNullOrWhiteSpace(_microsoft365Options.ContainerTypeId))
            {
                throw new InvalidOperationException(
                    "Microsoft365:ContainerTypeId is required to query SharePoint Embedded content.");
            }

            // Build the retrieval request body. SharePoint Embedded container content is returned
            // by setting dataSource to "SharePointEmbedded" and providing the container type via
            // dataSourceConfiguration.SharePointEmbedded.ContainerTypeId. The container type alone
            // scopes the query - no filterExpression is required.
            var requestBody = new Dictionary<string, object>
            {
                ["queryString"] = query,
                ["dataSource"] = "SharePointEmbedded",
                ["dataSourceConfiguration"] = new
                {
                    SharePointEmbedded = new
                    {
                        ContainerTypeId = _microsoft365Options.ContainerTypeId
                    }
                },
                ["maximumNumberOfResults"] = _chatSettings.TopK,
                ["resourceMetadata"] = new[] { "title", "author", "lastModifiedDateTime" }
            };

            // Serialize with exact property names (no naming policy) so the nested
            // SharePointEmbedded / ContainerTypeId keys are preserved as the API expects.
            var json = JsonSerializer.Serialize(requestBody);

            // Create HTTP request
            // Get token from token provider
            var token = await _tokenProvider.GetTokenAsync(cancellationToken);

            if (string.IsNullOrEmpty(token))
            {
                throw new InvalidOperationException("Authentication token is required but was not available");
            }

            // The Retrieval API can return transient throttling responses. These surface either as an
            // HTTP 429 or, for the SPE datasource, as an HTTP 500 whose body carries "code":"429".
            // Retry a few times with exponential backoff before giving up.
            const int maxAttempts = 4;
            HttpResponseMessage? response = null;
            string errorContent = string.Empty;

            try
            {
                for (var attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    // Dispose the response from any previous (throttled) attempt before reissuing.
                    response?.Dispose();

                    using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, CopilotRetrievalEndpoint)
                    {
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };
                    httpRequestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    response = await _httpClient.SendAsync(httpRequestMessage, cancellationToken);

                    if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    {
                        errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                        _logger.LogError("Retrieval API call returned Unauthorized (401): {Error}", errorContent);
                        throw new InvalidOperationException("Authentication failed with Microsoft Graph API. Token may be invalid or expired.");
                    }

                    if (response.IsSuccessStatusCode)
                    {
                        break;
                    }

                    errorContent = await response.Content.ReadAsStringAsync(cancellationToken);

                    if (IsThrottling(response, errorContent) && attempt < maxAttempts)
                    {
                        var delay = GetRetryDelay(response, attempt);
                        _logger.LogWarning("Retrieval API throttled (attempt {Attempt}/{Max}, status {StatusCode}). Retrying in {Delay}s. Body: {Error}",
                            attempt, maxAttempts, (int)response.StatusCode, delay.TotalSeconds, errorContent);
                        await Task.Delay(delay, cancellationToken);
                        continue;
                    }

                    _logger.LogError("Retrieval API call failed with status: {StatusCode}, Error: {Error}", response.StatusCode, errorContent);
                    throw new InvalidOperationException(
                        $"Retrieval API call failed with status {(int)response.StatusCode} ({response.StatusCode}).");
                }

                if (response == null || !response.IsSuccessStatusCode)
                {
                    _logger.LogError("Retrieval API call failed after {Attempts} attempts. Last error: {Error}", maxAttempts, errorContent);
                    throw new InvalidOperationException($"Retrieval API call failed after {maxAttempts} attempts.");
                }

                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                var retrievalResponse = JsonSerializer.Deserialize<CopilotRetrievalResponse>(responseContent,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

                var retrievedContent = new List<RetrievedContent>();

                if (retrievalResponse?.RetrievalHits != null)
                {
                    foreach (var hit in retrievalResponse.RetrievalHits)
                    {
                        var content = string.Join("\n", hit.Extracts?.Select(e => e.Text) ?? new List<string>());

                        retrievedContent.Add(new RetrievedContent
                        {
                            Title = hit.ResourceMetadata?.Title ?? "Unknown",
                            Content = content,
                            Url = hit.WebUrl ?? "",
                            Source = "SharePoint Embedded"
                        });
                    }
                }

                _logger.LogInformation("Retrieved {Count} items", retrievedContent.Count);
                return retrievedContent;
            }
            finally
            {
                response?.Dispose();
            }
        }
        catch (Exception ex)
        {
            // Surface configuration/auth/API failures to the caller instead of masking them as
            // "no results", which would let the pipeline generate ungrounded answers. The caller
            // (ChatService) logs and returns a user-facing error message.
            _logger.LogError(ex, "Error occurred while retrieving content for query of length {Length}", query.Length);
            throw;
        }
    }

    // Matches an inner throttling code in an error body, e.g. "code":"429" or "code": 429.
    private static readonly Regex ThrottleCodePattern =
        new("\"code\"\\s*:\\s*\"?429\"?", RegexOptions.Compiled);

    internal static bool IsThrottling(HttpResponseMessage response, string errorContent)
    {
        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            return true;
        }

        // The SPE datasource wraps throttling as an HTTP 5xx whose body carries an inner 429 code.
        // Restrict body-based detection to server errors and match the specific "code" field so a
        // 4xx response that merely mentions 429 elsewhere does not trigger spurious retries.
        return (int)response.StatusCode >= 500
            && !string.IsNullOrEmpty(errorContent)
            && ThrottleCodePattern.IsMatch(errorContent);
    }

    internal static TimeSpan GetRetryDelay(HttpResponseMessage response, int attempt)
    {
        if (response.Headers.RetryAfter?.Delta is TimeSpan delta && delta > TimeSpan.Zero)
        {
            return delta;
        }

        // Exponential backoff: 2s, 4s, 8s, ...
        return TimeSpan.FromSeconds(Math.Pow(2, attempt));
    }
}

// Response models for the Copilot Retrieval API
public class CopilotRetrievalResponse
{
    public List<RetrievalHit>? RetrievalHits { get; set; }
}

public class RetrievalHit
{
    public string? WebUrl { get; set; }
    public List<TextExtract>? Extracts { get; set; }
    public string? ResourceType { get; set; }
    public ResourceMetadata? ResourceMetadata { get; set; }
}

public class TextExtract
{
    public string? Text { get; set; }
}

public class ResourceMetadata
{
    public string? Title { get; set; }
    public string? Author { get; set; }
    public string? LastModifiedDateTime { get; set; }
}
