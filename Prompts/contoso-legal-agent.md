
Add the SharePoint Embedded copilot chat control on a expandable panel on the right side of the File List page. 

-----------------------------------------------
0. USER EXPERIENCE
-----------------------------------------------
- Expandable panel should show up only on the File List page by clicking an "AI Assistant" button
- Expandable panel should show inline with the other page content -- it should not overlap it and the other page content should compress to let it fit
- Panel visibility can be toggled and resized
- IMPORTANT: Make sure the height of the chat control fits into the visible device height

-----------------------------------------------
1. REQUIRED CONFIGURATION
-----------------------------------------------
- must install the npm library directly using `npm install "https://download.microsoft.com/download/e2d6b1ec-7168-4787-b8de-4a9862f10744/microsoft-sharepointembedded-copilotchat-react-1.0.8.tgz"`
- IMPORTANT: the chat library is NOT listed in the npm registry, you MUST install it with it's full url from https://download.microsoft.com/download/e2d6b1ec-7168-4787-b8de-4a9862f10744/microsoft-sharepointembedded-copilotchat-react-1.0.8.tgz
- add the following to the central configuration file.

SP_HOST=[url]  


-----------------------------------------------
2. AUTHENTICAION
-----------------------------------------------
Create a new auth function called `requestSPOAccessToken` that will use MSAL to get another access token for the following scope:

`${SP_HOST}/Container.Selected`

IMPORTANT
- DO NOT try to get an access token that has both Graph and SPO scopes -- they must be kept separate
- ONLY use the SPO access token with the chat control. All other requests to Graph APIs need to use the Graph access token

-----------------------------------------------
3. SHOWING THE CHAT CONTROL
-----------------------------------------------
Use the following example TypeScript code to load the SharePoint Embedded chat control as a React component

```typescript
import React from 'react';
import { 
    ChatEmbedded, 
    ChatEmbeddedAPI, 
    ChatLaunchConfig, 
    IChatEmbeddedApiAuthProvider 
} from '@microsoft/sharepointembedded-copilotchat-react';

//...
async function requestSPOAccessToken() {
  //...
}

const authProvider: IChatEmbeddedApiAuthProvider = {
  hostname: $SP_HOST,
  getToken: requestSPOAccessToken,
};

function App() {
    const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI|null>(null);

    const chatTheme: IThemeOptions = {
        useDarkMode: false,
        customTheme: {
            themePrimary: '#4854EE',
            themeSecondary: '#4854EE',
            themeDark: '#4854EE',
            themeDarker: '#4854EE',
            themeTertiary: '#4854EE',
            themeLight: '#dddeef',
            themeDarkAlt: '#4854EE',
            themeLighter: '#dddeef',
            themeLighterAlt: '#dddeef',
            themeDarkAltTransparent: '#4854EE',
            themeLighterTransparent: '#dddeef',
            themeLighterAltTransparent: '#dddeef',
            themeMedium: '#4854EE',
            neutralSecondary: '#4854EE',
            neutralSecondaryAlt: '#4854EE',
            neutralTertiary: '#4854EE',
            neutralTertiaryAlt: '#4854EE',
            neutralQuaternary: '#4854EE',
            neutralQuaternaryAlt: '#4854EE',
            neutralPrimaryAlt: '#4854EE',
            neutralDark: '#4854EE',
            themeBackground: 'white',
        }
    };
    
    const prompts = {
        headerText: `Chat with content in ${container.displayName}`,
        promptSuggestionList: [
            {
                suggestionText: 'Show me recent files',
                iconRegular: { name: IconName.ChatBubblesQuestion, style: IconStyle.Regular },
                iconHover: { name: IconName.ChatBubblesQuestion, style: IconStyle.Filled },
            },
            {
                suggestionText: "Make a table of marketing expenses over the past five years",
                iconRegular: { name: IconName.DocumentCatchUp, style: IconStyle.Regular },
                iconHover: { name: IconName.DocumentCatchUp, style: IconStyle.Filled },
            },
            // Add two more suggested prompts
        ]
    }

    const chatConfig: ChatLaunchConfig = {
        header: `Contoso Audit - ${container.displayName}`,
        theme: chatTheme,
        zeroQueryPrompts: prompts,
        instruction: "You are a helpful assistant that auditors use to find and summarize information related to auditing cases. Make sure you include references to the documents data comes from when possible. ",
        locale: "en",
    };

    React.useEffect(() => {
        const openChat = async () => {
        if (!chatApi) {
            return;
        }

        await chatApi.openChat(chatConfig);
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
-----------------------------------------------
4. CUSTOMIZE THE CHAT CONTROL
-----------------------------------------------
Customize the chat control header, theme, prompts, and instruction to match the Contoso Legal application

- override the default theme colors in the sample code to match the rest of the Contoso Legal app
- set the header, theme, prompts, and instruction to create a useful agent that can help users summarize and ask questions about the content within an legal case (container)

