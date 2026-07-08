using SPEAgentWithRetrieval.Core.Models;

namespace SPEAgentWithRetrieval.Core.Services;

public interface IRetrievalService
{
    Task<List<RetrievedContent>> SearchAsync(string query, CancellationToken cancellationToken = default);
}
