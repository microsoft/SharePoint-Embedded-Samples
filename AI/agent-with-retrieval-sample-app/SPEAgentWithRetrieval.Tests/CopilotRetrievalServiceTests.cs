using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SPEAgentWithRetrieval.Core.Models;
using SPEAgentWithRetrieval.Core.Services;
using Xunit;

namespace SPEAgentWithRetrieval.Tests;

public class CopilotRetrievalServiceTests
{
    private const string ContainerTypeId = "11111111-2222-3333-4444-555555555555";

    private static CopilotRetrievalService CreateService(
        StubHttpMessageHandler handler,
        string? containerTypeId = ContainerTypeId,
        string token = "fake-token")
    {
        var m365 = new Microsoft365Options { ContainerTypeId = containerTypeId ?? string.Empty };
        var chat = new ChatSettingsOptions { TopK = 5 };

        var tokenProvider = new Mock<ITokenProvider>();
        tokenProvider.Setup(t => t.GetTokenAsync(It.IsAny<CancellationToken>())).ReturnsAsync(token);

        return new CopilotRetrievalService(
            TestHelpers.Options(m365),
            TestHelpers.Options(chat),
            tokenProvider.Object,
            NullLogger<CopilotRetrievalService>.Instance,
            new HttpClient(handler));
    }

    private const string SuccessJson = """
    {
      "retrievalHits": [
        {
          "webUrl": "https://example/doc",
          "extracts": [ { "text": "first" }, { "text": "second" } ],
          "resourceMetadata": { "title": "My Doc" }
        }
      ]
    }
    """;

    [Fact]
    public async Task SearchAsync_OnSuccess_ParsesHitsIntoRetrievedContent()
    {
        var handler = new StubHttpMessageHandler().EnqueueJson(HttpStatusCode.OK, SuccessJson);
        var service = CreateService(handler);

        var results = await service.SearchAsync("what is spe?");

        var item = Assert.Single(results);
        Assert.Equal("My Doc", item.Title);
        Assert.Equal("first\nsecond", item.Content);
        Assert.Equal("https://example/doc", item.Url);
        Assert.Equal("SharePoint Embedded", item.Source);
    }

    [Fact]
    public async Task SearchAsync_SendsSpeScopedRequestBody()
    {
        var handler = new StubHttpMessageHandler().EnqueueJson(HttpStatusCode.OK, SuccessJson);
        var service = CreateService(handler);

        await service.SearchAsync("query text");

        var body = Assert.Single(handler.RequestBodies);
        Assert.Contains("\"queryString\":\"query text\"", body);
        Assert.Contains("SharePointEmbedded", body);
        Assert.Contains(ContainerTypeId, body);

        var request = Assert.Single(handler.Requests);
        Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
        Assert.Equal("fake-token", request.Headers.Authorization?.Parameter);
    }

    [Fact]
    public async Task SearchAsync_WhenContainerTypeIdMissing_Throws_WithoutCallingGraph()
    {
        var handler = new StubHttpMessageHandler().EnqueueJson(HttpStatusCode.OK, SuccessJson);
        var service = CreateService(handler, containerTypeId: "");

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SearchAsync("q"));
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task SearchAsync_RetriesOnThrottling_ThenSucceeds()
    {
        var handler = new StubHttpMessageHandler()
            .EnqueueJson(HttpStatusCode.TooManyRequests, "{\"error\":{\"code\":\"429\"}}", retryAfter: TimeSpan.FromMilliseconds(1))
            .EnqueueJson(HttpStatusCode.OK, SuccessJson);
        var service = CreateService(handler);

        var results = await service.SearchAsync("q");

        Assert.Single(results);
        Assert.Equal(2, handler.Requests.Count);
    }

    [Fact]
    public async Task SearchAsync_WhenThrottlingPersists_Throws_AfterMaxAttempts()
    {
        var handler = new StubHttpMessageHandler();
        for (var i = 0; i < 4; i++)
        {
            handler.EnqueueJson(HttpStatusCode.TooManyRequests, "throttled", retryAfter: TimeSpan.FromMilliseconds(1));
        }
        var service = CreateService(handler);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SearchAsync("q"));
        Assert.Equal(4, handler.Requests.Count); // maxAttempts
    }

    [Fact]
    public async Task SearchAsync_OnNonThrottlingError_Throws_WithoutRetry()
    {
        var handler = new StubHttpMessageHandler().EnqueueJson(HttpStatusCode.BadRequest, "bad request");
        var service = CreateService(handler);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SearchAsync("q"));
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task SearchAsync_OnUnauthorized_Throws()
    {
        var handler = new StubHttpMessageHandler().EnqueueJson(HttpStatusCode.Unauthorized, "unauthorized");
        var service = CreateService(handler);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SearchAsync("q"));
        Assert.Single(handler.Requests);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, "", true)]
    [InlineData(HttpStatusCode.InternalServerError, "{\"code\":\"429\"}", true)]
    [InlineData(HttpStatusCode.InternalServerError, "{\"code\":429}", true)]
    [InlineData(HttpStatusCode.InternalServerError, "some other error", false)]
    [InlineData(HttpStatusCode.BadGateway, "{\"error\":{\"code\":\"429\"}}", true)]
    [InlineData(HttpStatusCode.BadRequest, "{\"code\":\"429\"}", false)] // 4xx mentioning 429 must not retry
    [InlineData(HttpStatusCode.Unauthorized, "429 somewhere", false)]
    [InlineData(HttpStatusCode.BadRequest, "", false)]
    public void IsThrottling_DetectsThrottleSignals(HttpStatusCode status, string body, bool expected)
    {
        using var response = new HttpResponseMessage(status);
        Assert.Equal(expected, CopilotRetrievalService.IsThrottling(response, body));
    }

    [Fact]
    public void GetRetryDelay_PrefersRetryAfterHeader()
    {
        using var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests);
        response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(7));

        Assert.Equal(TimeSpan.FromSeconds(7), CopilotRetrievalService.GetRetryDelay(response, attempt: 1));
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 4)]
    [InlineData(3, 8)]
    public void GetRetryDelay_FallsBackToExponentialBackoff(int attempt, int expectedSeconds)
    {
        using var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests);

        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), CopilotRetrievalService.GetRetryDelay(response, attempt));
    }
}
