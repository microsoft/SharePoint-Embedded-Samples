import React from 'react';
import ChatEmbeddedAPI, {IChatEmbeddedApiAuthProvider, ChatLaunchConfig} from './ChatEmbeddedAPI';

interface ChatEmbeddedProps {
    authProvider: IChatEmbeddedApiAuthProvider,
    onApiReady: (api: ChatEmbeddedAPI) => void;
    onNotification?: (data: any) => void;
    onChatClose?: (data: any) => void;
}

export type { IChatEmbeddedApiAuthProvider, ChatLaunchConfig};
export { ChatEmbeddedAPI };

export default function ChatEmbedded(props: ChatEmbeddedProps) {
    const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI | undefined>();

    const {authProvider, onApiReady, onNotification} = props;

    const onIFrameRef = React.useCallback((iframeElement: any) => {
        if (iframeElement && iframeElement.contentWindow) {
            if (!chatApi) {
                const newApi = new ChatEmbeddedAPI({
                    contentWindow: iframeElement.contentWindow,
                    onNotification,
                    authProvider,
                });
                setChatApi(newApi);
                onApiReady(newApi);
            }
        }
    }, [authProvider, onApiReady, onNotification, chatApi]);

    return (
        <iframe title="copilot" style={{ width: 'calc(100% - 4px)', height: 'calc(100vh - 8px)' }} ref={onIFrameRef} />
    );
}