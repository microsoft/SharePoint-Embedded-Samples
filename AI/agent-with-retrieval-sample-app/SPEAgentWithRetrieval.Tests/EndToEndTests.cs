using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SPEAgentWithRetrieval.Core.Models;
using SPEAgentWithRetrieval.Core.Services;
using Xunit;

namespace SPEAgentWithRetrieval.Tests;

/// <summary>
/// End-to-end test that drives the full retrieval + generation pipeline against the live
/// Microsoft Graph Copilot Retrieval API and Azure AI Foundry.
///
/// It is skipped unless <c>SPE_RUN_E2E=1</c> is set, because it requires:
///   - a signed-in user with a Microsoft 365 Copilot license and access to the container(s),
///   - Azure credentials for the Foundry project (e.g. `az login`),
///   - valid configuration (see below).
///
/// Configuration is read from environment variables, and optionally from a JSON file whose
/// path is given by <c>SPE_E2E_APPSETTINGS</c> (typically the app's appsettings.json).
///
/// Example (PowerShell):
///   $env:SPE_RUN_E2E = "1"
///   $env:SPE_E2E_APPSETTINGS = "..\appsettings.json"
///   dotnet test --filter Category=E2E
/// </summary>
[Trait("Category", "E2E")]
public class EndToEndTests
{
    [SkippableFact]
    public async Task ChatPipeline_ReturnsGroundedAnswer_AgainstLiveServices()
    {
        Skip.IfNot(
            string.Equals(Environment.GetEnvironmentVariable("SPE_RUN_E2E"), "1", StringComparison.Ordinal),
            "Set SPE_RUN_E2E=1 (plus valid config) to run the live end-to-end test.");

        var configuration = BuildConfiguration();

        var foundry = configuration.GetSection(AzureAIFoundryOptions.SectionName).Get<AzureAIFoundryOptions>() ?? new();
        var m365 = configuration.GetSection(Microsoft365Options.SectionName).Get<Microsoft365Options>() ?? new();

        Skip.If(string.IsNullOrWhiteSpace(foundry.ProjectEndpoint), "AzureAIFoundry:ProjectEndpoint is not configured.");
        Skip.If(string.IsNullOrWhiteSpace(foundry.ModelName), "AzureAIFoundry:ModelName is not configured.");
        Skip.If(string.IsNullOrWhiteSpace(m365.TenantId), "Microsoft365:TenantId is not configured.");
        Skip.If(string.IsNullOrWhiteSpace(m365.ClientId), "Microsoft365:ClientId is not configured.");
        Skip.If(string.IsNullOrWhiteSpace(m365.ContainerTypeId), "Microsoft365:ContainerTypeId is not configured.");

        using var provider = BuildServiceProvider(configuration);
        var chatService = provider.GetRequiredService<IChatService>();

        var query = Environment.GetEnvironmentVariable("SPE_E2E_QUERY") ?? "Summarize the documents available to me.";

        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
        var response = await chatService.ProcessChatAsync(new ChatRequest { Message = query }, cts.Token);

        Assert.NotNull(response);
        Assert.False(string.IsNullOrWhiteSpace(response.Response), "Expected a non-empty answer from the pipeline.");
        Assert.DoesNotContain("I apologize, but I encountered an error", response.Response);
        Assert.DoesNotContain("I apologize, but an error occurred", response.Response);
    }

    private static IConfiguration BuildConfiguration()
    {
        var builder = new ConfigurationBuilder();

        var appSettingsPath = Environment.GetEnvironmentVariable("SPE_E2E_APPSETTINGS");
        if (!string.IsNullOrWhiteSpace(appSettingsPath) && File.Exists(appSettingsPath))
        {
            builder.AddJsonFile(Path.GetFullPath(appSettingsPath), optional: false, reloadOnChange: false);
        }

        builder.AddEnvironmentVariables();
        return builder.Build();
    }

    private static ServiceProvider BuildServiceProvider(IConfiguration configuration)
    {
        var services = new ServiceCollection();

        services.Configure<AzureAIFoundryOptions>(configuration.GetSection(AzureAIFoundryOptions.SectionName));
        services.Configure<Microsoft365Options>(configuration.GetSection(Microsoft365Options.SectionName));
        services.Configure<ChatSettingsOptions>(configuration.GetSection(ChatSettingsOptions.SectionName));

        services.AddSingleton<ITokenProvider, TokenProvider>();
        services.AddSingleton<IRetrievalService, CopilotRetrievalService>();
        services.AddSingleton<IFoundryService, FoundryService>();
        services.AddSingleton<IChatService, ChatService>();

        services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Information));

        return services.BuildServiceProvider();
    }
}
