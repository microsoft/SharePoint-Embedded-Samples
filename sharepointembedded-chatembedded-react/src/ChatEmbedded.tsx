/**
 * MIT License
 *
 * Copyright (c) Microsoft Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE
 */
import React from 'react';
import ChatEmbeddedAPI, {IChatEmbeddedApiAuthProvider, ChatLaunchConfig, getSafeTheme} from './ChatEmbeddedAPI';
import { ITheme } from '@fluentui/react';

interface ChatEmbeddedProps {
    authProvider: IChatEmbeddedApiAuthProvider,
    onApiReady: (api: ChatEmbeddedAPI) => void;
    onNotification?: (data: any) => void;
    onChatClose?: (data: any) => void;
    style?: React.CSSProperties;
    themeV8?: ITheme;
    containerTypeId: string;
}

export type { IChatEmbeddedApiAuthProvider, ChatLaunchConfig};
export { ChatEmbeddedAPI };

export default function ChatEmbedded(props: ChatEmbeddedProps) {
    const [chatApi, setChatApi] = React.useState<ChatEmbeddedAPI | undefined>();

    const {authProvider, onApiReady, onNotification, style, themeV8, containerTypeId} = props;

    const safeThemeV8 = getSafeTheme(themeV8);
    const onIFrameRef = React.useCallback((iframeElement: any) => {
        if (iframeElement && iframeElement.contentWindow) {
            if (!chatApi) {
                const newApi = new ChatEmbeddedAPI({
                    contentWindow: iframeElement.contentWindow,
                    onNotification,
                    authProvider,
                    themeV8: safeThemeV8,
                    containerTypeId

                });
                setChatApi(newApi);
                onApiReady(newApi);
            }
        }
    }, [authProvider, onApiReady, onNotification, chatApi]);

    return (
        <iframe title="sharepoint-embedded-chat" id="sharepoint-embedded-chat" style={style} ref={onIFrameRef} />
    );
}