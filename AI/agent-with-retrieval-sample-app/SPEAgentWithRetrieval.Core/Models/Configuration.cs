namespace SPEAgentWithRetrieval.Core.Models;

public class AzureAIFoundryOptions
{
    public const string SectionName = "AzureAIFoundry";
    
    public string ProjectEndpoint { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
}

public class Microsoft365Options
{
    public const string SectionName = "Microsoft365";
    
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ContainerTypeId { get; set; } = string.Empty;
    public bool UseUserAuthentication { get; set; } = true;
    public bool UseDeviceCodeAuth { get; set; } = false;
    public string[] Scopes { get; set; } = { "https://graph.microsoft.com/FileStorageContainer.Selected" };
}

public class ChatSettingsOptions
{
    public const string SectionName = "ChatSettings";
    
    public int MaxTokens { get; set; } = 1000;
    public float Temperature { get; set; } = 0.7f;
    public int TopK { get; set; } = 5;
}
