# SharePoint Embedded copilot

This SDK provides a React component that allows you to add copilot experience to your SharePoint Embedded React application.

_Caveat:_ This SDK and the custom copilot chat experience is in private preview. It is unmaintained and unsupported. Do not use for production workloads.

## Prerequisites
1. A Copilot license enabled for your user in your tenant
2. A working React SharePoint Embedded application, written in TypeScript.
    - If you are not using TypeScript, please see the Appendix below for steps to take to get this running in your app.
    - To get started with SharePoint Embedded, visit https://aka.ms/start-spe
    - Then, if you want get started with a sample React SPE app, visit [spe-azurefunction](https://github.com/microsoft/SharePoint-Embedded-Samples/tree/main/Samples/spa-azurefunction)
3. Your Container Type configuration for `DiscoverabilityDisabled` must be set to `false`
    - Visit [Configuring Container Types](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/concepts/app-concepts/containertypes#configuring-container-types) to learn how to set this configuration

## Getting Started

### 1. Clone this repository and copy SDK files into your React repo

```
git clone -b feature/copilot https://github.com/microsoft/SharePoint-Embedded-Samples
```

Folder structure should look like:

- your project
  - package.json (you likely have this file)
  - src/ (your application code likely lives into this folder)
    - **sdk/**
      - ChatEmbedded.tsx
      - ChatEmbeddedAPI.ts
      - README.md
      - types.ts

### 2. Create an `authProvider` object.

This is an object that matches this interface:

```typescript
export interface IChatEmbeddedApiAuthProvider {
    // The hostname for your tenant. Example: https://m365x10735106.sharepoint.com
    hostname: string;
    // This function will be called when an SPO token is required
    // Scope needed: ${hostname}/Container.Selected
    getToken(): Promise<string>;
}
```

Example usage in app:

```typescript

// In your app:
import { IChatEmbeddedApiAuthProvider } from './sdk/ChatEmbedded';

const authProvider: IChatEmbeddedApiAuthProvider = {
    hostname: 'https://m365x10735106.sharepoint.com',
    getToken: requestSPOAccessToken,
};
```

Example implementation of `getToken` (you need to customize it):

```typescript
  /**
   * Acquires a token
   */
  async function requestSPOAccessToken() {
    // Use your app's actual msalConfig
    const msalConfig = {
      auth: {
        clientId: "{Your Entra client ID}", // this can likely point to process.env.REACT_APP_CLIENT_ID if you have set it in your .env file
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    };

    const containerScopes = {
      scopes: [`${authProvider.hostname}/Container.Selected`],
      redirectUri: '/'
    };

    const pca = new msal.PublicClientApplication(msalConfig);
    let containerTokenResponse;

    // Consent FileStorageContainer.Selected scope
    try {
      // attempt silent acquisition first
      containerTokenResponse = await pca.acquireTokenSilent(containerScopes);
      return containerTokenResponse.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        containerTokenResponse = await pca.acquireTokenPopup(containerScopes);
        return containerTokenResponse.accessToken;
      }
      else {
        console.log(error);
      }
    }
  }
```

### 3. Create a react state to store your `chatApi` in:
```typescript
const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI|null>(null);
```

Example:

```typescript
import React from 'react';
import ChatEmbedded, { ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from './sdk/ChatEmbedded';

//...
async function requestSPOAccessToken() {
  //...
}

const authProvider: IChatEmbeddedApiAuthProvider = {
  hostname: 'https://m365x10735106.sharepoint.com',
  getToken: requestSPOAccessToken,
};

function App() {
  const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI|null>(null);

  return (
    //...
  );
}
```


### 4. Add the `ChatEmbedded` component into your react app. Example:

```typescript
import React from 'react';
import ChatEmbedded, { ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from './sdk/ChatEmbedded';

//...
async function requestSPOAccessToken() {
  //...
}

const authProvider: IChatEmbeddedApiAuthProvider = {
  hostname: 'https://m365x10735106.sharepoint.com',
  getToken: requestSPOAccessToken,
};

function App() {
  const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI|null>(null);

  return (
    //...
    <ChatEmbedded
      onApiReady={setChatApi}
      authProvider={authProvider}
    />
    //...
  );
}
```

### 5. Use the `chatApi` object in your state to open the chat and run it. In the example above, call it this way to open the chat:
```typescript
await chatApi.openChat();
```

You may choose to pass in launch configurations
```typescript
import { IconName, IconStyle } from './sdk/types';

//...
const zeroQueryPrompts = {
  headerText: "This is my Starter Prompt",
  promptSuggestionList: [{
    suggestionText: 'Hello',
    iconRegular: { name: IconName.ChatBubblesQuestion, style: IconStyle.Regular },
    iconHover: { name: IconName.ChatBubblesQuestion, style: IconStyle.Filled },
  }]
};

const launchConfig: ChatLaunchConfig = {
  header: 'My Awesome Chat',
  zeroQueryPrompts,
  suggestedPrompts: ["What are my files?",],
  instruction: "Response must be in the tone of a pirate",
};

await chatApi.openChat(launchConfig);
```

Full example:
```typescript
import React from 'react';
import ChatEmbedded, { ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from './sdk/ChatEmbedded';

//...
async function requestSPOAccessToken() {
  //...
}

const authProvider: IChatEmbeddedApiAuthProvider = {
  hostname: 'https://m365x10735106.sharepoint.com',
  getToken: requestSPOAccessToken,
};

function App() {
  const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI|null>(null);

  React.useEffect(async () => {
    if (!chatApi) {
      return;
    }

    await chatApi.openChat();
  }, [chatApi]);


  return (
    //...
    <ChatEmbedded
      onApiReady={(api) => setChatApi(api)}
      authProvider={authProvider}
    />
    //...
  );
}
```

### 6. Your AI chat should be loaded successfully!

# Appendix

## Steps to take for non-TypeScript app
```bash
// at the root of the react app (where package.json lives)
npm i typescript
npx tsc --init
// change tsconfig.json to set outDir to "./dist"
```