# SharePoint Embedded copilot

This SDK provides a React component that allows you to add copilot experience to your SharePoint Embedded React application.

_**Please note**:_ This SDK and the custom copilot chat experience is in private preview with limited support. Please consult us at ContactSPECopilot@microsoft.com before deploying this feature to a production environment.


## SPE Custom Copilot Overview

This copilot chat control offers the following features:
- Reason over documents in Sharepoint Embedded containers and user-accessible content in Sharepoint Online.
- Developers can configure the application code to limit the search scope to file, folder, and containers.
- Developers can customize and configure chat control including starter prompts, suggested prompts, colors and more.

Watch this [demo](https://www.youtube.com/watch?v=30i7q09EtQo) to learn more about how to configure this functionality.

> [!NOTE]  
> -  Ensure that Copilot for Microsoft 365 is available for your organization. You have two ways to get a developer environment for Copilot:
>     - A sandbox Microsoft 365 tenant with Copilot (available in limited preview through [TAP membership](https://developer.microsoft.com/microsoft-365/tap)).
>     - An [eligible Microsoft 365 or Office 365 production environment](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/prerequisites#customers-with-existing-microsoft-365-and-copilot-licenses) with a Copilot for Microsoft 365 license.

## Prerequisites
1. Your M365 tenant is enabled for the private preview functionality. This is the tenant you will register your SPE app with. If it's not enabled already, you can request access to the private preview using this link: https://aka.ms/specopilotpreview. Our team will review the request and if it's approved, we will reach out to you within a week.
2. A Copilot license enabled for at least one user in that tenant. You have two ways to get a developer environment for Copilot:
    - [A sandbox Microsoft 365 tenant](https://developer.microsoft.com/en-us/microsoft-365/tap) with Copilot (available in limited preview through TAP membership). 
    - [An eligible Microsoft 365 or Office 365 production environment](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/prerequisites#customers-with-existing-microsoft-365-and-copilot-licenses) with a Copilot for Microsoft 365 license.

3. A working React SharePoint Embedded application, written in TypeScript.
    - If you are not using TypeScript, please see the Appendix below for steps to take to get this running in your app.
    - To get started with SharePoint Embedded, visit https://aka.ms/start-spe
    - Then, if you want get started with a sample React SPE app, visit [spe-azurefunction](https://github.com/microsoft/SharePoint-Embedded-Samples/tree/main/Samples/spa-azurefunction)
4. Your Container Type configuration for `DiscoverabilityDisabled` must be set to `false`
    - Visit [Configuring Container Types](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/concepts/app-concepts/containertypes#configuring-container-types) to learn how to set this configuration

## Quick Start

### 1. Use the `SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction` Application

Navigate to the `SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction\react-client\src\components\ChatSidebar.tsx` file and adjust the Function Component by replacing the return statement with the code that is commented out in the file. It should look somewhat like this:
```typescript
export const ChatSidebar: React.FunctionComponent = () => {

    const [chatAuthProvider, setChatAuthProvider] = React.useState<ChatAuthProvider | undefined>();
    
    const [chatConfig] = React.useState<ChatLaunchConfig>({
        header: ChatController.instance.header,
        theme: ChatController.instance.theme,
        zeroQueryPrompts: ChatController.instance.zeroQueryPrompts,
        suggestedPrompts: ChatController.instance.suggestedPrompts,
        instruction: ChatController.instance.metaPrompt,
    });

   // ...

   return (<>
    {chatAuthProvider && (
        <ChatEmbedded
            authProvider={chatAuthProvider}
            onApiReady={onApiReady}
        />
    )}
    </>);   
}
```

Then navigate to the `SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction\react-client\src\routes\App.tsx` file and look for this line:

```typescript
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
```
and replace it with this line
```typescript
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
```

Ensure the following files have been setup correctly:
1. `SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction\react-client\.env`
2. `SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction\function-api\local.settings.json`

Run `npm start` in the project directory:
```bash
cd SharePoint-Embedded-Samples\Samples\spe-typescript-react-azurefunction
npm run start
```
## Getting Started

### 1. Clone this repository and install the SDK into your React repo

```bash
git clone -b feature/copilot https://github.com/microsoft/SharePoint-Embedded-Samples

cd SharePoint-Embedded-Samples/Samples/spa-azurefunction

npm install "https://download.microsoft.com/download/1315a30d-fe00-45b3-a149-d3235201f8ce/microsoft-sharepointembedded-copilotchat-react-1.0.2.tgz"
```


#### If you want to verify checksums

In MacOS/Linux

```bash
version="1.0.3";

url="https://download.microsoft.com/download/4d8b9fec-9ae3-44c5-bcc9-f329ee96cbc1/microsoft-sharepointembedded-copilotchat-react-1.0.3.tgz"; 

expected_checksum="B9ABEBF07A597BA6FA5A2838ECBE6F1D53BD5EBD8A0FC5FBC2D21764BFF9C11C"; 

package_path="microsoft-sharepointembedded-copilotchat-react-$version.tgz"; 

curl -o $package_path $url && [ "$(sha256sum $package_path | awk '{ print $1 }')" == "$expected_checksum" ] && npm install $package_path || { echo "Checksum does not match. Aborting installation."; rm $package_path; }
```

In Windows:
```powershell
$version = "1.0.2"
$url = "https://download.microsoft.com/download/4d8b9fec-9ae3-44c5-bcc9-f329ee96cbc1/microsoft-sharepointembedded-copilotchat-react-1.0.3.tgz"
$expected_checksum = "B9ABEBF07A597BA6FA5A2838ECBE6F1D53BD5EBD8A0FC5FBC2D21764BFF9C11C"
$package_path = "microsoft-sharepointembedded-copilotchat-react-$version.tgz"

Invoke-WebRequest -Uri $url -OutFile $package_path

$calculated_checksum = Get-FileHash -Path $package_path -Algorithm SHA256 | Select-Object -ExpandProperty Hash

if ($calculated_checksum -eq $expected_checksum) {
    Write-Output "Checksum matches. Installing the package..."
    npm install $package_path
} else {
    Write-Output "Checksum does not match. Aborting installation."
}
Remove-Item $package_path
```


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
import { IChatEmbeddedApiAuthProvider } from '@microsoft/sharepointembedded-copilotchat-react';

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
import { ChatEmbedded, ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from '@microsoft/sharepointembedded-copilotchat-react';

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
import { ChatEmbedded, ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from '@microsoft/sharepointembedded-copilotchat-react';

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
      style={{ width: 'calc(100% - 4px)', height: 'calc(100vh - 8px)' }}
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
import { ChatEmbedded, ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider } from '@microsoft/sharepointembedded-copilotchat-react';

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

  React.useEffect(() => {
    const openChat = async () => {
      if (!chatApi) {
        return;
      }

      await chatApi.openChat();
    };

    openChat();
  }, [chatApi]);


  return (
    //...
    <ChatEmbedded
      onApiReady={(api) => setChatApi(api)}
      authProvider={authProvider}
      style={{ width: 'calc(100% - 4px)', height: 'calc(100vh - 8px)' }}
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
