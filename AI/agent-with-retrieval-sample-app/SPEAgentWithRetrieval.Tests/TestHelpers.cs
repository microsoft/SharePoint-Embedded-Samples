using Microsoft.Extensions.Options;

namespace SPEAgentWithRetrieval.Tests;

internal static class TestHelpers
{
    public static IOptions<T> Options<T>(T value) where T : class => Microsoft.Extensions.Options.Options.Create(value);
}

/// <summary>
/// A minimal <see cref="HttpMessageHandler"/> that returns a queued sequence of responses
/// (or repeats the last one), and records every request it received. Used to unit-test
/// <c>CopilotRetrievalService</c> without hitting the network.
/// </summary>
internal sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Queue<Func<HttpRequestMessage, HttpResponseMessage>> _responses = new();
    private Func<HttpRequestMessage, HttpResponseMessage>? _last;

    public List<HttpRequestMessage> Requests { get; } = new();
    public List<string> RequestBodies { get; } = new();

    public StubHttpMessageHandler EnqueueResponse(Func<HttpRequestMessage, HttpResponseMessage> factory)
    {
        _responses.Enqueue(factory);
        return this;
    }

    public StubHttpMessageHandler EnqueueJson(System.Net.HttpStatusCode statusCode, string json, TimeSpan? retryAfter = null)
    {
        return EnqueueResponse(_ =>
        {
            var response = new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
            };
            if (retryAfter.HasValue)
            {
                response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(retryAfter.Value);
            }
            return response;
        });
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests.Add(request);
        RequestBodies.Add(request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken));

        var factory = _responses.Count > 0 ? _responses.Dequeue() : _last;
        _last = factory;

        if (factory is null)
        {
            throw new InvalidOperationException("No response was configured on the StubHttpMessageHandler.");
        }

        return factory(request);
    }
}
