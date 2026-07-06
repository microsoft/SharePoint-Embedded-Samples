using Azure.AI.Inference;
using Azure.Core;
using Azure.Core.Pipeline;
using Azure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using SPEAgentWithRetrieval.Core.Models;
using System.Text;

namespace SPEAgentWithRetrieval.Core.Services;

public class FoundryService : IFoundryService
{
    private readonly ChatCompletionsClient _chatClient;
    private readonly AzureAIFoundryOptions _foundryOptions;
    private readonly ChatSettingsOptions _chatSettings;
    private readonly ILogger<FoundryService> _logger;

    public FoundryService(
        IOptions<AzureAIFoundryOptions> foundryOptions,
        IOptions<ChatSettingsOptions> chatSettings,
        ILogger<FoundryService> logger)
    {
        _foundryOptions = foundryOptions.Value;
        _chatSettings = chatSettings.Value;
        _logger = logger;

        // Create the inference endpoint URL (based on Azure AI Projects pattern)
        var projectEndpoint = new Uri(_foundryOptions.ProjectEndpoint);
        var inferenceEndpoint = $"{projectEndpoint.GetLeftPart(UriPartial.Authority)}/models";

        // Set up authentication with proper scope for Azure AI
        var credential = new DefaultAzureCredential();
        var clientOptions = new AzureAIInferenceClientOptions();
        var tokenPolicy = new BearerTokenAuthenticationPolicy(credential, new string[] { "https://ai.azure.com/.default" });
        clientOptions.AddPolicy(tokenPolicy, HttpPipelinePosition.PerRetry);

        _chatClient = new ChatCompletionsClient(new Uri(inferenceEndpoint), credential, clientOptions);
    }

    public async Task<string> GenerateResponseAsync(string userMessage, List<RetrievedContent> context, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Generating response for user message with {ContextCount} context items", context.Count);

            var systemMessage = BuildSystemMessage(context);

            var requestOptions = new ChatCompletionsOptions()
            {
                Messages =
                {
                    new ChatRequestSystemMessage(systemMessage),
                    new ChatRequestUserMessage(userMessage)
                },
                Model = _foundryOptions.ModelName
            };

            // Reasoning models (e.g. gpt-5*, o1/o3/o4) reject a custom temperature and
            // require max_completion_tokens instead of max_tokens, so skip both and let
            // the service apply its defaults. Non-reasoning models keep the configured values.
            if (!IsReasoningModel(_foundryOptions.ModelName))
            {
                requestOptions.Temperature = _chatSettings.Temperature;
                requestOptions.MaxTokens = _chatSettings.MaxTokens;
            }

            var response = await _chatClient.CompleteAsync(requestOptions, cancellationToken);
            
            var assistantResponse = response.Value?.Content;
            
            _logger.LogInformation("Successfully generated response");
            return assistantResponse ?? "I apologize, but I couldn't generate a response at this time.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while generating response");
            return "I apologize, but an error occurred while processing your request.";
        }
    }

    private static bool IsReasoningModel(string modelName)
    {
        if (string.IsNullOrWhiteSpace(modelName))
        {
            return false;
        }

        var name = modelName.Trim();
        return name.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase)
            || name.StartsWith("o1", StringComparison.OrdinalIgnoreCase)
            || name.StartsWith("o3", StringComparison.OrdinalIgnoreCase)
            || name.StartsWith("o4", StringComparison.OrdinalIgnoreCase);
    }

    private string BuildSystemMessage(List<RetrievedContent> context)
    {
        var systemMessageBuilder = new StringBuilder();
        systemMessageBuilder.AppendLine("You are a helpful assistant that answers questions based on the provided context from Microsoft 365 content.");
        systemMessageBuilder.AppendLine("Use the following retrieved content to answer the user's question. If the context doesn't contain relevant information, say so clearly.");
        systemMessageBuilder.AppendLine();
        systemMessageBuilder.AppendLine("Retrieved Context:");

        foreach (var item in context)
        {
            systemMessageBuilder.AppendLine($"Source: {item.Title} ({item.Source})");
            systemMessageBuilder.AppendLine($"Content: {item.Content}");
            if (!string.IsNullOrEmpty(item.Url))
            {
                systemMessageBuilder.AppendLine($"URL: {item.Url}");
            }
            systemMessageBuilder.AppendLine();
        }

        systemMessageBuilder.AppendLine("Instructions:");
        systemMessageBuilder.AppendLine("- Answer based on the provided context");
        systemMessageBuilder.AppendLine("- Be concise and accurate");
        systemMessageBuilder.AppendLine("- Use proper formatting with line breaks and structure");
        systemMessageBuilder.AppendLine("- Use **bold** for important terms and headings");
        systemMessageBuilder.AppendLine("- Use numbered lists (1. 2. 3.) for ordered information");
        systemMessageBuilder.AppendLine("- Use bullet points with - for unordered lists");
        systemMessageBuilder.AppendLine("- Separate different topics with blank lines");
        systemMessageBuilder.AppendLine("- If asked about sources, reference the titles and URLs provided");
        systemMessageBuilder.AppendLine("- If the context doesn't contain enough information, be honest about limitations");

        return systemMessageBuilder.ToString();
    }
}
