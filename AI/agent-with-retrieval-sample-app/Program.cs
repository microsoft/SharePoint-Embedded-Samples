using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SPEAgentWithRetrieval.Core.Models;
using SPEAgentWithRetrieval.Core.Services;

namespace SPEAgentWithRetrieval;

class Program
{
    static async Task Main(string[] args)
    {
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        // Build host with dependency injection
        var host = Host.CreateDefaultBuilder(args)
            .ConfigureServices((context, services) =>
            {
                // Configure options
                services.Configure<AzureAIFoundryOptions>(configuration.GetSection("AzureAIFoundry"));
                services.Configure<Microsoft365Options>(configuration.GetSection("Microsoft365"));
                services.Configure<ChatSettingsOptions>(configuration.GetSection("ChatSettings"));

                // Register services
                services.AddScoped<ITokenProvider, TokenProvider>();
                services.AddScoped<IRetrievalService, CopilotRetrievalService>();
                services.AddScoped<IFoundryService, FoundryService>();
                services.AddScoped<IChatService, ChatService>();

                // Add logging
                services.AddLogging(builder =>
                {
                    builder.AddConsole();
                    builder.SetMinimumLevel(LogLevel.Information);
                });
            })
            .Build();

        // Get the chat service and logger
        var chatService = host.Services.GetRequiredService<IChatService>();
        var logger = host.Services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("Azure AI Chat Agent with SharePoint RAG started");
        
        System.Console.WriteLine("=== Azure AI Chat Agent with SharePoint RAG ===");
        System.Console.WriteLine("Ask questions about your Microsoft 365 content!");
        System.Console.WriteLine("Type 'exit' or 'quit' to end the conversation.");
        System.Console.WriteLine("Type 'clear' to clear the console.");
        System.Console.WriteLine();

        // Main chat loop
        while (true)
        {
            System.Console.Write("You: ");
            var userInput = System.Console.ReadLine();

            if (string.IsNullOrWhiteSpace(userInput))
                continue;

            // Handle special commands
            if (userInput.Equals("exit", StringComparison.OrdinalIgnoreCase) || 
                userInput.Equals("quit", StringComparison.OrdinalIgnoreCase))
            {
                System.Console.WriteLine("Goodbye!");
                break;
            }

            if (userInput.Equals("clear", StringComparison.OrdinalIgnoreCase))
            {
                System.Console.Clear();
                System.Console.WriteLine("=== Azure AI Chat Agent with SharePoint RAG ===");
                continue;
            }

            try
            {
                // Process the chat request
                var chatRequest = new ChatRequest { Message = userInput };
                var response = await chatService.ProcessChatAsync(chatRequest);

                System.Console.WriteLine($"Assistant: {response.Response}");
                
                // Show sources if available
                if (response.Sources.Any())
                {
                    System.Console.WriteLine();
                    System.Console.WriteLine("Sources:");
                    foreach (var source in response.Sources.Take(3)) // Show top 3 sources
                    {
                        System.Console.WriteLine($"  • {source.Title}");
                        if (!string.IsNullOrEmpty(source.Url))
                        {
                            System.Console.WriteLine($"    {source.Url}");
                        }
                    }
                }
                
                System.Console.WriteLine();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in chat loop");
                System.Console.WriteLine("Sorry, I encountered an error. Please try again.");
                System.Console.WriteLine();
            }
        }

        await host.StopAsync();
    }
}
