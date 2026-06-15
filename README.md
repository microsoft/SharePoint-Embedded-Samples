# SharePoint Embedded Samples

A collection of samples, tools, and resources for building applications with [SharePoint Embedded](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview) — a document storage API built on Microsoft 365.

## Custom Apps

Runnable applications demonstrating SharePoint Embedded integration patterns.

| Sample | Stack | Description |
|--------|-------|-------------|
| [boilerplate-react-azurefunction](./Custom%20Apps/boilerplate-react-azurefunction) | React + Azure Functions | Reference boilerplate: SPA with an Azure Functions OBO proxy |
| [boilerplate-aspnet-webservice](./Custom%20Apps/boilerplate-aspnet-webservice) | C# / ASP.NET Core | Reference boilerplate: server-side MVC app with tenant onboarding |
| [boilerplate-typescript-react](./Custom%20Apps/boilerplate-typescript-react) | TypeScript + React + Azure Functions | TypeScript variant of the React boilerplate |
| [legal-docs](./Custom%20Apps/legal-docs) | React + Fluent UI | Legal case management sample |
| [project-management](./Custom%20Apps/project-management) | React + Vite + Tailwind + shadcn-ui | Project collaboration app |
| [webhook](./Custom%20Apps/webhook) | Node.js | Minimal Graph API change notification listener |

See [docker.md](./Custom%20Apps/docker.md) for instructions on running the boilerplate apps in VS Code dev containers.

## AI

Samples and assets for integrating SharePoint Embedded with AI tools and services.

| Folder | Description |
|--------|-------------|
| [mcp-server](./AI/mcp-server) | MCP server exposing 60+ SharePoint Embedded tools to AI coding tools (Claude, Cursor, GitHub Copilot) |
| [ocr](./AI/ocr) | Webhook-triggered document processing using Azure Document Intelligence |
| [copilot](./AI/copilot) | Microsoft Copilot extensibility assets |
| [prompts](./AI/prompts) | Prompt templates |
| [foundry](./AI/foundry) | Azure AI Foundry assets |

## Power Platform

| Folder | Description |
|--------|-------------|
| [Canvas Apps](./Power%20Platform/Canvas%20Apps) | Power Apps canvas app starter kit |
| [Copilot Studio](./Power%20Platform/Copilot%20Studio) | Copilot Studio assets |
| [Power Automate](./Power%20Platform/Power%20Automate) | Power Automate flow templates |

## Tools

Utilities and API clients for working with SharePoint Embedded.

| Tool | Description |
|------|-------------|
| [api-clients](./Tools/api-clients) | Postman and Bruno collections for testing Graph API endpoints |
| [migrate-from-blob-storage](./Tools/migrate-from-blob-storage) | Console app to migrate files from Azure Blob Storage to SharePoint Embedded |
| [powershell](./Tools/powershell) | Admin scripts for container type registration and provisioning |

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA). For details, visit https://cla.opensource.microsoft.com.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com).

## Trademarks

Authorized use of Microsoft trademarks or logos must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
