namespace SPEAgentWithRetrieval.Core.Models;

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
}

public class ChatResponse
{
    public string Response { get; set; } = string.Empty;
    public List<RetrievedContent> Sources { get; set; } = new();
    public DateTime Timestamp { get; set; }
}

public class RetrievedContent
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
}
