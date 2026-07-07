using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SPEAgentWithRetrieval.Core.Models;
using SPEAgentWithRetrieval.Core.Services;
using Xunit;

namespace SPEAgentWithRetrieval.Tests;

public class ChatServiceTests
{
    private static ChatService CreateService(
        Mock<IRetrievalService> retrieval,
        Mock<IFoundryService> foundry)
        => new(retrieval.Object, foundry.Object, NullLogger<ChatService>.Instance);

    [Fact]
    public async Task ProcessChatAsync_ComposesResponse_FromRetrievalAndFoundry()
    {
        var sources = new List<RetrievedContent>
        {
            new() { Title = "Doc A", Content = "content a", Url = "https://example/a", Source = "SharePoint Embedded" }
        };

        var retrieval = new Mock<IRetrievalService>();
        retrieval.Setup(r => r.SearchAsync("hello", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(sources);

        var foundry = new Mock<IFoundryService>();
        foundry.Setup(f => f.GenerateResponseAsync("hello", sources, It.IsAny<CancellationToken>()))
               .ReturnsAsync("the answer");

        var service = CreateService(retrieval, foundry);

        var result = await service.ProcessChatAsync(new ChatRequest { Message = "hello" });

        Assert.Equal("the answer", result.Response);
        Assert.Same(sources, result.Sources);
        Assert.NotEqual(default, result.Timestamp);
    }

    [Fact]
    public async Task ProcessChatAsync_PassesRetrievedContext_ToFoundry()
    {
        var sources = new List<RetrievedContent> { new() { Title = "T", Content = "C" } };

        var retrieval = new Mock<IRetrievalService>();
        retrieval.Setup(r => r.SearchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(sources);

        var foundry = new Mock<IFoundryService>();
        foundry.Setup(f => f.GenerateResponseAsync(It.IsAny<string>(), It.IsAny<List<RetrievedContent>>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync("ok");

        var service = CreateService(retrieval, foundry);

        await service.ProcessChatAsync(new ChatRequest { Message = "q" });

        foundry.Verify(f => f.GenerateResponseAsync("q", sources, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessChatAsync_WhenRetrievalThrows_ReturnsFriendlyError_AndNoSources()
    {
        var retrieval = new Mock<IRetrievalService>();
        retrieval.Setup(r => r.SearchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ThrowsAsync(new InvalidOperationException("boom"));

        var foundry = new Mock<IFoundryService>();

        var service = CreateService(retrieval, foundry);

        var result = await service.ProcessChatAsync(new ChatRequest { Message = "q" });

        Assert.Contains("error", result.Response, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(result.Sources);
        foundry.Verify(f => f.GenerateResponseAsync(It.IsAny<string>(), It.IsAny<List<RetrievedContent>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ProcessChatAsync_WhenFoundryThrows_ReturnsFriendlyError()
    {
        var retrieval = new Mock<IRetrievalService>();
        retrieval.Setup(r => r.SearchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<RetrievedContent>());

        var foundry = new Mock<IFoundryService>();
        foundry.Setup(f => f.GenerateResponseAsync(It.IsAny<string>(), It.IsAny<List<RetrievedContent>>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new Exception("model down"));

        var service = CreateService(retrieval, foundry);

        var result = await service.ProcessChatAsync(new ChatRequest { Message = "q" });

        Assert.Contains("error", result.Response, StringComparison.OrdinalIgnoreCase);
    }
}
