# LegalDocs Sample

This sample is a React + TypeScript web app that demonstrates a legal-workflow experience built on SharePoint Embedded. It includes:

- Azure AD authentication with MSAL
- Legal case containers and folder navigation
- Document-centric workspace views
- Copilot-style chat integration using the SharePoint Embedded Copilot Chat React SDK

## Project Overview

The app provides a Contoso legal dashboard where users can:

- Sign in with Microsoft Entra ID
- View existing legal case containers
- Create new case containers
- Browse case folders and documents
- Use assistant panels for summaries, tools, reports, and Copilot interactions

Key technologies:

- React 18 + TypeScript
- Vite
- MSAL Browser + MSAL React
- Fluent UI + Tailwind CSS
- Microsoft Graph APIs for SharePoint Embedded operations

## Requirements

Before you run the sample, make sure you have:

- Node.js 18+ (or current LTS)
- npm (comes with Node.js)
- A Microsoft 365 tenant with SharePoint Embedded enabled
- An Azure AD app registration for SPA sign-in
- A valid SharePoint Embedded container type

## Setup

1. Install dependencies from the LegalDocs folder:

```bash
npm install
```

2. Configure tenant and app values in `src/config/appConfig.ts`:

- `clientId`: Azure AD application (client) ID
- `tenantId`: Microsoft Entra tenant ID
- `containerTypeId`: SharePoint Embedded container type ID
- `sharePointHostname`: SharePoint hostname for your tenant (for example: `https://contoso.sharepoint.com`)

3. Verify API permissions and scopes in your app registration:

- Microsoft Graph scopes used by the app include:
  - `Files.Read.All`
  - `Sites.Read.All`
  - `FileStorageContainer.Selected`
- SharePoint scope format used by the app:
  - `{sharePointHostname}/Container.Selected`

4. Ensure the local SDK package is available at:

- `lib/microsoft-sharepointembedded-copilotchat-react-1.0.9.tgz`

## Run the App

Start the development server:

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal (usually `http://localhost:5173`).

## Build and Preview

Create a production build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## License

This project is licensed under the MIT License. See the root license file for details:

- `../../LICENSE`
