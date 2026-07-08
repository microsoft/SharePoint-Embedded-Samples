using SPEAgentWithRetrieval.Core.Models;

namespace SPEAgentWithRetrieval.Core.Services;

public interface IFoundryService
{
    Task<string> GenerateResponseAsync(string userMessage, List<RetrievedContent> context, CancellationToken cancellationToken = default);
}
