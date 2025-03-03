> [!NOTE]  
> March 3 2025 - Updates are underway that may cause current instructions not to work. Will update when resolved.

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
            containerId={container.id}
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

### 1. Install the SDK into your React repo

```bash
# Install the SDK with npm

npm install "https://download.microsoft.com/download/27d10531-b158-40c9-a146-af376c0e7f2a/microsoft-sharepointembedded-copilotchat-react-1.0.7.tgz"
```


#### If you want to verify checksums

In MacOS/Linux

```bash
version="1.0.7";

url="https://download.microsoft.com/download/27d10531-b158-40c9-a146-af376c0e7f2a/microsoft-sharepointembedded-copilotchat-react-1.0.7.tgz"; 

expected_checksum="A87FF410E8684A3C16456B2092564422BF80DA9FAFF3A684821DACEAEEA23D22"; 

package_path="microsoft-sharepointembedded-copilotchat-react-$version.tgz"; 

curl -o $package_path $url && [ "$(sha256sum $package_path | awk '{ print $1 }')" == "$expected_checksum" ] && npm install $package_path || { echo "Checksum does not match. Aborting installation."; rm $package_path; }
```

In Windows:
```powershell
$version = "1.0.7"
$url = "https://download.microsoft.com/download/27d10531-b158-40c9-a146-af376c0e7f2a/microsoft-sharepointembedded-copilotchat-react-1.0.7.tgz"
$expected_checksum = "A87FF410E8684A3C16456B2092564422BF80DA9FAFF3A684821DACEAEEA23D22"
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
      containerId={container.id}
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
  locale: "en",
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
      containerId={container.id}
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

## Setting Locale
The Copilot iframe dynamically loads localization settings to ensure that the chat interface is displayed in the appropriate language. These settings are derived from SharePoint, which provides a comprehensive set of localization options. 

When the Copilot iframe is initialized, it retrieves the current localization settings from SharePoint. These settings dictate the language and regional preferences for the chat interface, ensuring that all UI elements, messages, and interactions are presented in the user's preferred language. This seamless integration with SharePoint's localization framework allows Copilot to provide a consistent an

You can have this localized by setting your language options in the SharePoint account settings: [Change your personal language and region settings - Microsoft Support](https://support.microsoft.com/en-us/office/change-your-personal-language-and-region-settings-caa1fccc-bcdb-42f3-9e5b-45957647ffd7) note, if your M365 setting is different from your Sharepoint account langauge settings it will take precedence, you can change your M365 language settings here: [Change your display language in Microsoft 365](https://support.microsoft.com/en-us/topic/change-your-display-language-and-time-zone-in-microsoft-365-for-business-6f238bff-5252-441e-b32b-655d5d85d15b)

An additional locale option can be passed in through the `ChatLaunchConfig` to further set the language the Copilot will respond in:
```typescript
 const [chatConfig] = React.useState<ChatLaunchConfig>({
        header: ChatController.instance.header,
        theme: ChatController.instance.theme,
        zeroQueryPrompts: ChatController.instance.zeroQueryPrompts,
        suggestedPrompts: ChatController.instance.suggestedPrompts,
        instruction: ChatController.instance.pirateMetaPrompt,
        locale: "en",
    });
```
#### Locale Options
Here are some examples of locale options you can use:

| Locale Code  | Common Name                              |
|--------------|------------------------------------------|
| af           | Afrikaans                                |
| en-gb        | English (UK)                             |
| he           | Hebrew                                   |
| kok          | Konkani                                  |
| nn-no        | Norwegian (Nynorsk)                      |
| sr-latn-rs   | Serbian (Latin, Serbia)                  |
| am-et        | Amharic                                  |
| es           | Spanish                                  |
| hi           | Hindi                                    |
| lb-lu        | Luxembourgish                            |
| or-in        | Odia (India)                             |
| sv           | Swedish                                  |
| ar           | Arabic                                   |
| es-mx        | Spanish (Mexico)                         |
| hr           | Croatian                                 |
| lo           | Lao                                      |
| pa           | Punjabi                                  |
| ta           | Tamil                                    |
| as-in        | Assamese                                 |
| et           | Estonian                                 |
| hu           | Hungarian                                |
| lt           | Lithuanian                               |
| pl           | Polish                                   |
| te           | Telugu                                   |
| az-latn-az   | Azerbaijani (Latin, Azerbaijan)          |
| eu           | Basque                                   |
| hy           | Armenian                                 |
| lv           | Latvian                                  |
| pt-br        | Portuguese (Brazil)                      |
| th           | Thai                                     |
| bg           | Bulgarian                                |
| fa           | Persian                                  |
| id           | Indonesian                               |
| mi-nz        | Maori (New Zealand)                      |
| pt-pt        | Portuguese (Portugal)                    |
| tr           | Turkish                                  |
| bs-latn-ba   | Bosnian (Latin, Bosnia and Herzegovina)  |
| fi           | Finnish                                  |
| is           | Icelandic                                |
| mk           | Macedonian                               |
| quz-pe       | Quechua (Peru)                           |
| tt           | Tatar                                    |
| ca-es-valencia | Catalan (Valencian)                    |
| fil-ph       | Filipino (Philippines)                   |
| it           | Italian                                  |
| ml           | Malayalam                                |
| ro           | Romanian                                 |
| ug           | Uyghur                                   |
| ca           | Catalan                                  |
| fr-ca        | French (Canada)                          |
| ja           | Japanese                                 |
| mr           | Marathi                                  |
| ru           | Russian                                  |
| uk           | Ukrainian                                |
| cs           | Czech                                    |
| fr           | French                                   |
| ka           | Georgian                                 |
| ms           | Malay                                    |
| sk           | Slovak                                   |
| ur           | Urdu                                     |
| cy-gb        | Welsh (UK)                               |
| ga-ie        | Irish (Ireland)                          |
| kk           | Kazakh                                   |
| mt-mt        | Maltese (Malta)                          |
| sl           | Slovenian                                |
| uz-latn-uz   | Uzbek (Latin, Uzbekistan)                |
| da           | Danish                                   |
| gd           | Scottish Gaelic                          |
| km-kh        | Khmer (Cambodia)                         |
| nb-no        | Norwegian (Bokmål)                       |
| sq           | Albanian                                 |
| vi           | Vietnamese                               |
| de           | German                                   |
| gl           | Galician                                 |
| kn           | Kannada                                  |
| ne-np        | Nepali (Nepal)                           |
| sr-cyrl-ba   | Serbian (Cyrillic, Bosnia and Herzegovina)|
| zh-cn        | Chinese (Simplified)                     |
| el           | Greek                                    |
| gu           | Gujarati                                 |
| ko           | Korean                                   |
| nl           | Dutch                                    |
| sr-cyrl-rs   | Serbian (Cyrillic, Serbia)               |
| zh-tw        | Chinese (Traditional)                    |
