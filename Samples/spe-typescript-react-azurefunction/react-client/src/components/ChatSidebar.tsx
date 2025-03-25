
import React from "react";
import { ChatAuthProvider } from "../providers/ChatAuthProvider";
import { ChatController } from "../providers/ChatController";
import { ChatEmbedded, ChatEmbeddedAPI, ChatLaunchConfig } from '@microsoft/sharepointembedded-copilotchat-react';
import { IContainer } from '../../../common/schemas/ContainerSchemas';

interface ChatSidebarProps {
    container: IContainer;
}

export const ChatSidebar: React.FunctionComponent<ChatSidebarProps> = ({ container }) => {
    const [chatAuthProvider, setChatAuthProvider] = React.useState<ChatAuthProvider | undefined>();
    
    const [chatConfig] = React.useState<ChatLaunchConfig>({
        header: "Contoso Audit Assistant",
        theme: ChatController.instance.theme,
        zeroQueryPrompts: ChatController.instance.getPrompts(container),
        instruction: "You are a helpful assistant that auditors use to find and summarize information related to auditing cases",
        locale: ChatController.instance.locale,
    });

    
    const onApiReady = async (api: ChatEmbeddedAPI) => {
        await api.openChat(chatConfig);
        ChatController.instance.addDataSourceSubscriber(dataSources => {
            api.setDataSources(dataSources);
        });
    }

    ChatAuthProvider.getInstance().then(setChatAuthProvider).catch(console.error);

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
