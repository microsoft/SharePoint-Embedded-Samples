# Azure AI Chat Agent with SharePoint Embedded RAG

This project implements a chat agent using Azure AI Foundry SDK that retrieves and grounds responses on SharePoint Embedded content through Microsoft 365 Copilot Retrieval API.

This agent uses Azure AI Foundry and Retrieval API to enable contract managers to reason with their documents.

## Features

- **Azure AI Foundry Integration**: Uses Azure AI SDK for chat completions with configurable models
- **SharePoint Embedded Content Retrieval**: Leverages the Microsoft 365 Copilot Retrieval API to ground responses on container content
- **User Authentication**: Device-code / interactive browser authentication with token caching
- **Container-scoped Grounding**: Retrieval is scoped to a SharePoint Embedded container type
- **RAG Implementation**: Retrieval-augmented generation with proper source attribution

## Prerequisites

- .NET 8.0 SDK
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) for creating the app registration
- An **Azure AI Foundry resource with a deployed chat model** — note its endpoint and the model/deployment name for `appsettings.json`
- An **existing SharePoint Embedded container type** with one or more containers that already hold the documents you want to query (see the [SharePoint Embedded documentation](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview) if you need to create these)
- A user with a **Microsoft 365 Copilot license** who has access to the container(s) (required by the Retrieval API to return grounded results)

## Setup (Console Application)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd SharePoint-Embedded-Samples/AI/agent-with-retrieval-sample-app
```

### 2. Create the App Registration (Public Client)

Create a public-client app registration with the single delegated permission this app needs, `FileStorageContainer.Selected`, and grant admin consent:

```bash
APP_ID=$(az ad app create --display-name "SPE Agent Console" \
  --is-fallback-public-client true \
  --public-client-redirect-uris http://localhost \
  --query appId -o tsv)

# FileStorageContainer.Selected (delegated) = 085ca537-6565-41c2-aca7-db852babc212
az ad app permission add --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 085ca537-6565-41c2-aca7-db852babc212=Scope

az ad sp create --id $APP_ID
az ad app permission admin-consent --id $APP_ID

echo "ClientId  = $APP_ID"
echo "TenantId  = $(az account show --query tenantId -o tsv)"
```

> **Portal alternative**: Register the app, then under **Authentication** remove any **Single-page application** platform and add a **Mobile and desktop applications** platform with redirect URI `http://localhost`. Under **API permissions**, add the **Microsoft Graph → Delegated → `FileStorageContainer.Selected`** permission and click **Grant admin consent**.

> This app targets **SharePoint Embedded containers only**. `FileStorageContainer.Selected` is the *only* Graph permission required.

### 3. SharePoint Embedded Container (Prerequisite)

This app assumes you **already have** a SharePoint Embedded container type, one or more containers, and documents uploaded to them. You only need to gather:

- The **ContainerTypeId** of the container type you want to query (for `appsettings.json`).
- A user with a **Microsoft 365 Copilot license** who has access to the container(s).

If you don't have these yet, see the [SharePoint Embedded documentation](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview) for how to create container types, containers, and upload content.

> The Retrieval API only returns content the signed-in user can see, and requires that user to hold a **Microsoft 365 Copilot license**.

### 4. Configure Application Settings

1. Copy the example configuration:
   ```bash
   cp appsettings.example.json appsettings.json
   ```

2. Update `appsettings.json` with your values:
   ```json
   {
     "AzureAIFoundry": {
       "ProjectEndpoint": "https://your-foundry-resource.services.ai.azure.com",
       "ModelName": "gpt-5-mini" //or your deployed model name
     },
     "Microsoft365": {
       "TenantId": "your-tenant-id-guid",
       "ClientId": "your-client-id-guid",
       "ContainerTypeId": "your-sharepoint-embedded-container-type-id-guid", //the SPE container type to query
       "Scopes": [ "https://graph.microsoft.com/FileStorageContainer.Selected" ]
     }
   }
   ```

   > The agent grounds on the SharePoint Embedded container type identified by `ContainerTypeId`. Setting the container type is sufficient to scope retrieval — no path/filter expression is required.

### 5. Install Dependencies

```bash
dotnet restore
```

### 6. Build and Run

```bash
dotnet build
dotnet run
```

## Usage

1. **First Run**: The app prints a device-code URL and code (or opens a browser if `UseDeviceCodeAuth` is `false`). Sign in as the **Copilot-licensed** user with access to the container.
2. **Subsequent Runs**: Tokens are cached, no re-authentication needed
3. **Ask Questions**: Type questions about your container's content
4. **View Sources**: Responses include source document citations

## Testing

The solution includes an xUnit test project (`SPEAgentWithRetrieval.Tests`) with fast, offline unit tests plus an opt-in live end-to-end test.

### Unit tests

Run all unit tests (the live E2E test is skipped automatically):

```bash
dotnet test
```

Coverage includes:
- **`ChatService`** – orchestration of retrieval + synthesis, and graceful error handling.
- **`CopilotRetrievalService`** – request shaping, response parsing, `401`/error handling, and throttling retry/backoff (using a stubbed `HttpMessageHandler`, no network calls).
- **`FoundryService`** – reasoning-model detection and the prompt-injection defenses (untrusted content is wrapped in `<reference_document>` tags and metadata is sanitized).
- **`TokenProvider`** – external-token short-circuit.

### End-to-end test

`EndToEndTests` drives the full pipeline against the **live** Copilot Retrieval API and Azure AI Foundry. It is skipped unless `SPE_RUN_E2E=1` is set, because it requires a Copilot-licensed signed-in user, Azure credentials (e.g. `az login`), and valid configuration.

```powershell
$env:SPE_RUN_E2E = "1"
$env:SPE_E2E_APPSETTINGS = "..\appsettings.json"   # optional: reuse the app's settings file
$env:SPE_E2E_QUERY = "Summarize the documents available to me."  # optional
dotnet test --filter Category=E2E
```

The test asserts the pipeline returns a non-empty answer without falling back to an error message. Configuration may be supplied via the JSON file above and/or environment variables (e.g. `Microsoft365__ContainerTypeId`).

## Architecture

### Overview
The application is structured around the following components:

#### 1. Retrieval Layer
- **Purpose**: Retrieves grounding content from a SharePoint Embedded container.
- **Key Component**: `CopilotRetrievalService.cs`
  - Calls the Microsoft 365 Copilot Retrieval API (`POST /v1.0/copilot/retrieval`) with the `SharePointEmbedded` data source, scoped by `ContainerTypeId`.
  - Retries transient throttling responses (HTTP 429).
  - Authenticates with a delegated `FileStorageContainer.Selected` token.

#### 2. Synthesis Layer
- **Purpose**: Generates responses using Azure AI Foundry SDK.
- **Key Component**: `FoundryService.cs`
  - Synthesizes responses based on retrieved content.
  - Implements chat completions and content generation patterns.
  - Uses Azure AI SDK for .NET.

#### 3. Orchestration Layer
- **Purpose**: Coordinates retrieval and synthesis processes.
- **Key Component**: `ChatService.cs`
  - Sequentially orchestrates retrieval and synthesis.
  - Implements async/await patterns for I/O operations.
  - Handles error management and logging.

#### 4. Presentation Layer
- **Purpose**: Displays synthesized responses and sources to the user.
- **Key Component**: `Program.cs`
  - Manages user input and output.
  - Displays top sources and synthesized responses.

#### 5. Configuration and Logging
- **Purpose**: Manages application settings and logs.
- **Key Components**:
  - `appsettings.json`: Stores configuration settings.
  - `ILogger`: Implements structured logging for debugging and monitoring.

#### 6. Authentication
- **Purpose**: Ensures secure access to APIs.
- **Key Component**: `TokenProvider.cs` — device-code or interactive browser sign-in with token caching.

### Architecture Diagram

```
+---------------------+
|   Presentation      |
|      Layer          |
|   (Program.cs)      |
+---------------------+
          |
          v
+---------------------+
|   Orchestration     |
|      Layer          |
|   (ChatService.cs)  |
+---------------------+
          |
          v
+---------------------+       +---------------------+
|   Retrieval Layer   |       |   Synthesis Layer   |
| (CopilotRetrieval   |       |   (FoundryService)  |
|    Service.cs)      |       |                     |
+---------------------+       +---------------------+
          |                           |
          v                           v
+---------------------+       +---------------------+
| Copilot Retrieval   |       | Azure AI Foundry    |
| API (SharePoint     |       |   (chat model)      |
|  Embedded)          |       |                     |
+---------------------+       +---------------------+
```

## Security

- **No Secrets in Code**: All sensitive configuration in `appsettings.json` (git-ignored)
- **Delegated Permissions**: Respects user's SharePoint access rights
- **Token Security**: Uses Azure Identity SDK for secure token handling

## Troubleshooting

### Authentication Issues

#### Error: `AADSTS9002327` - "Tokens issued for the 'Single-Page Application' client-type..."
**Cause**: App registration is configured as SPA instead of Public Client  
**Solution**: 
1. Go to Azure Portal → App registrations → Your app → Authentication
2. Remove all **Single-page application** platforms
3. Keep only **Mobile and desktop applications** with `http://localhost` redirect URI
4. Ensure **Allow public client flows** is **Enabled**

#### Error: `AADSTS7000218` - "The request body must contain the following parameter: 'client_assertion' or 'client_secret'"
**Cause**: App registration is configured as Confidential Client instead of Public Client  
**Solution**:
1. Go to Azure Portal → App registrations → Your app → Authentication
2. Set **Allow public client flows** to **Yes**
3. Use **Mobile and desktop applications** platform (not Web or SPA)

#### General Authentication Troubleshooting
- Verify app registration has "Allow public client flows" enabled
- Ensure delegated permissions are granted with admin consent
- Check that redirect URI `http://localhost` is configured
- Remove any SPA or Web platform configurations that might conflict

### SharePoint Embedded Access
- Verify the user has access to the container (owner, member, or reader on the SharePoint Embedded container)
- Check the `ContainerTypeId` matches the container type you want to query
- Ensure the `FileStorageContainer.Selected` delegated permission is granted with admin consent

### Azure AI Foundry
- Verify the project endpoint URL is correct
- Ensure the model name matches your deployment
- Check Azure AI Foundry resource permissions

## Quick Fix Scripts

For convenience, this repository includes automation scripts to fix common Azure AD app registration issues:

### Bash Script (macOS/Linux)

Pass your app registration's client ID and tenant ID as arguments:

```bash
./fix-azure-app-registration.sh <CLIENT_ID> <TENANT_ID>
```

### PowerShell Script (Windows/Cross-platform)

Pass your app registration's client ID and tenant ID explicitly:

```powershell
./fix-azure-app-registration.ps1 -ClientId <CLIENT_ID> -TenantId <TENANT_ID>
```

These scripts will automatically:
- Remove SPA platform configurations
- Add Mobile/Desktop platform with correct redirect URI
- Enable public client flows
- Display current configuration for verification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure `appsettings.json` is not committed
5. Submit a pull request

## License

This project is licensed under the MIT License.
