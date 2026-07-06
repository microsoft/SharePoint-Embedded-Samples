using Microsoft.Extensions.Logging;
using SPEAgentWithRetrieval.Core.Models;

namespace SPEAgentWithRetrieval.Core.Services;

public class ChatService : IChatService
{
    private readonly IRetrievalService _retrievalService;
    private readonly IFoundryService _foundryService;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IRetrievalService retrievalService,
        IFoundryService foundryService,
        ILogger<ChatService> logger)
    {
        _retrievalService = retrievalService;
        _foundryService = foundryService;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessChatAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Processing chat request: {Message}", request.Message);

            // Step 1: Retrieve relevant content from Microsoft 365
            var retrievedContent = await _retrievalService.SearchAsync(request.Message, cancellationToken);
            _logger.LogInformation("Retrieved {Count} content items", retrievedContent.Count);

            // Step 2: Generate response using Azure AI Foundry with retrieved content as context
            var response = await _foundryService.GenerateResponseAsync(request.Message, retrievedContent, cancellationToken);

            // Step 3: Return the complete chat response
            return new ChatResponse
            {
                Response = response,
                Sources = retrievedContent,
                Timestamp = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            return new ChatResponse
            {
                Response = "I apologize, but I encountered an error while processing your request. Please try again.",
                Sources = new List<RetrievedContent>(),
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
