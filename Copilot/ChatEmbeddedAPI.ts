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
import { ICustomPrompts, ICustomTheme, IHeader, IThemeOptions, IDataSourcesProps, IZeroQueryPrompts } from "./types";

export interface IChatEmbeddedConfig {
    contentWindow: Window;
    authProvider: IChatEmbeddedApiAuthProvider;
    onChatReady?: () => void;
    onChatClose?: (data: object) => void;
    onNotification?: (data: object) => void;
}

export interface IChatEmbeddedApiAuthProvider {
    hostname: string;
    getToken(): Promise<string>;
}

export interface ChatLaunchConfig {
    header?: string;
    theme?: IThemeOptions;
    zeroQueryPrompts?: IZeroQueryPrompts;
    suggestedPrompts?: string[];
    instruction?: string;
}

class ChatEmbeddedAPI {
    private port: Window | null = null;
    private _channelId: string;

    private _customPrompts: ICustomPrompts = {};
    private _theme: ICustomTheme = {};

    private _header: IHeader;
    private _contentWindow: Window;
    private _instruction?: string;
    private _dataSources?: IDataSourcesProps[];

    private _heartbeatInterval?: NodeJS.Timeout;
    private _messageListener: (event: MessageEvent) => void;
    private readonly authProvider: IChatEmbeddedApiAuthProvider;

    // Notifications:
    private _onChatClose?: (data: object) => void;
    private _onNotification?: (data: object) => void;

    constructor(config: IChatEmbeddedConfig) {
        this._channelId = `ChatEmbedded-${new Date().getTime()}`;
        this._contentWindow = config.contentWindow;
        this.authProvider = config.authProvider;
        this._onChatClose = config.onChatClose;
        this._onNotification = config.onNotification;

        this._messageListener = this._onWindowMessage.bind(this);
        this._header = this._defaultHeader;
    }

    public get channelId() {
        return this._channelId;
    }

    public get instruction() {
        return this._instruction;
    }

    private get _baseConfig() {
        return {
            sdk: "1.0.0",
            authentication: {
                enabled: true,
                claimsChallenge: { enabled: false },
                tokens: { augloop: true },
            },
            messaging: {
                origin: window.location.origin,
                channelId: this.channelId,
                identifyParent: true,
                waitForConfiguration: true,
            },
            loadConversationHistory: true,
        };
    }

    private readonly _path: string = "/_layouts/15/chatembedded.aspx";
    private readonly _defaultHeader: IHeader = {
        title: "SharePoint Embedded Chat",
        hideIcon: true,
        showCloseButton: false,
    };

    private get _url(): string {
        const url = new URL(this.authProvider.hostname);
        url.pathname = this._path;
        // url.searchParams.append("disableFeatures", "61170");
        url.searchParams.append("chatodsp", JSON.stringify(this._baseConfig));
        url.searchParams.append("app", "sharepointembedded");
        return url.toString();
    }

    public setHeader(headerText: string)
    {
        this._header.title = headerText;
    }

    /**
     * This message listener will wait for the "initialize" event
     * from the frame which is expected to contain the "port" we need to use in the
     * "replyTo" property. This port is how the host communicates with the chat frame.
     * @param {MessageEvent} event
     */
    private _onWindowMessage(event: MessageEvent) {
        if (event.data.type === 'initialize' && event.data.channelId === this._channelId) {
            if (!event.data.replyTo) {
                return;
            }
            this.port = event.data.replyTo;
            (this.port as any).start();
            this.port!.onmessage = this._onChatWindowMessage.bind(this);
            this.port!.postMessage({ type: 'activate' });
            this._configure();

            clearInterval(this._heartbeatInterval!);
            window.removeEventListener('message', this._messageListener);
        }
    }

    private _onChatWindowMessage(event: MessageEvent) {
        if (!this.port || !event || !event.data || !event.data.type) {
            return;
        }

        switch (event.data.type) {
            case 'notification': {
                if (event.data.data.notification === 'open-successful') {
                    console.log('---------- NOTIFICATION ----------');
                    console.log(event.data);
                    this._onNotification?.(event.data);
                } else {
                    // TODO: Decide how to handle other notifications:
                    // console.log(event.data.data.notification);
                }
                break;
            }
            case 'command': {
                // console.log('---------- COMMAND ----------');
                // console.log(event.data);
                this.port.postMessage({ type: 'acknowledge', id: event.data.id });
                if (!event.data.data || !event.data.data.command) {
                    return;
                }
                switch (event.data.data.command) {
                    case 'preProcessQuery':
                        // console.info('---------- PRE PROCESS QUERY ----------');
                        this.port.postMessage({ type: 'result', id: event.data.id, result: 'success', data: {
                            preProcessedQuery: event.data.data.query
                        }});
                        break;
                    case 'generateQueryContext':
                        // console.info('---------- GENERATE QUERY CONTEXT ----------');
                        this.port.postMessage({ type: 'result', id: event.data.id, result: 'success', data: {
                            queryContext: ''
                        }});
                        break;
                    case 'close':
                        console.info('---------- CLOSE ----------');
                        this._onChatClose?.(event.data);
                        break;
                    default:
                        // console.info('---------- UNHANDLED COMMAND ----------');
                        // console.info(event.data);
                        break;
                }
                break;
            }
            case 'acknowledge': {
                console.info(`Acknowledged command with id: ${event.data.id}`);
                break;
            }
            case 'result': {
                console.info('---------- RESULT ----------');
                console.info(event.data);
                break;
            }
            default: {
                console.info('---------- OTHER ----------');
                console.info(event.data);
                break;
            }
        }
    }

    private _configure() {
        // Satisfies the `waitForConfiguration` option in the chatodsp configuration.
        this.port?.postMessage({
            type: 'command',
            id: new Date().getTime(),
            data: {
                command: 'configure',
                options: {
                    chatConfig: {
                        header: this._header,
                        customPrompts: this._customPrompts,
                        instruction: this._instruction,
                        dataSources: this._dataSources,
                    },
                    theme: this._theme,
                },
            }
        });
    }

    /* APIs for working with the chat */
    async openChat(launchConfig?: ChatLaunchConfig) {
        if (launchConfig) {
            this._header.title = launchConfig.header || this._defaultHeader.title;
            if (launchConfig.theme) {
                this.setTheme(launchConfig.theme);
            }
            if (launchConfig.zeroQueryPrompts) {
                this._customPrompts.zeroQueryPrompts = launchConfig.zeroQueryPrompts;
            }
            if (launchConfig.suggestedPrompts) {
                this._customPrompts.suggestedPrompts = launchConfig.suggestedPrompts;
            }

            this._instruction = launchConfig.instruction;
        }

        const accessToken = await this.authProvider.getToken();
        const contentWindow = this._contentWindow;
        const form = contentWindow.document.createElement("form");
        form.method = "POST";
        form.action = this._url;

        const idTokenInput = contentWindow.document.createElement("input");
        idTokenInput.setAttribute("type", "hidden");
        idTokenInput.setAttribute("name", "access_token");
        idTokenInput.setAttribute("value", accessToken);
        form.appendChild(idTokenInput);

        contentWindow.document.body.appendChild(form);

        this._heartbeatInterval = setInterval(() => {
            contentWindow.postMessage(
                {
                    type: 'identify-parent',
                    channelId: this._channelId,
                },
                '*'
            );
        }, 100);
        window.addEventListener('message', this._messageListener);

        form.submit();
    }

    setInstruction(instruction: string) {
        this._instruction = instruction;

        if (this.port) {
            this.port.postMessage({
                type: "command",
                id: new Date().getTime(),
                data: {
                    command: "updateInstruction",
                    instruction,
                },
            });
        }
    }

    setPrompt(prompt: string) {
        this.port?.postMessage({
            type: "command",
            id: new Date().getTime(),
            data: {
                command: "setPrompt",
                prompt,
            },
        });
    }

    setDataSources(dataSources: IDataSourcesProps[] | null) {
        console.info(">> Updating Data Sources", {
            command: "updateDataSources",
            dataSources,
        });

        this._dataSources = dataSources === null ? undefined : dataSources;

        if (this.port) {
            this.port.postMessage({
                type: "command",
                id: new Date().getTime(),
                data: {
                    command: "updateDataSources",
                    dataSources,
                },
            });
        }
    }

    /**
     * Defines the requirements for how your response must look like
     * examples:
     * - "Response must be less than 100 words"
     * - "Response must be in Spanish"
     * @param metaPrompt - the meta prompt defining requirements
     */
    setMetaPrompt(metaPrompt: string) {
        // console.info(">> Updating Meta Prompt", {
        //     command: "updateScopeContext",
        //     scopeContext: {
        //         metaPrompt,
        //     },
        // });

        // this.scopeContext.metaPrompt = metaPrompt;

        // this.port?.postMessage({
        //     type: "command",
        //     id: new Date().getTime(),
        //     data: {
        //         command: "updateScopeContext",
        //         scopeContext: this.scopeContext,
        //     },
        // });
    }

    setZeroQueryPrompts(prompt: IZeroQueryPrompts | null) {
        if (prompt) {
            this._customPrompts.zeroQueryPrompts = prompt;
        } else {
            delete this._customPrompts.zeroQueryPrompts;
        }
    }

    setSuggestedPrompts(prompts: string[] | null) {
        if (prompts) {
            this._customPrompts.suggestedPrompts = prompts;
        }  else {
            delete this._customPrompts.suggestedPrompts;
        }
    }

    setTheme(themeOptions: IThemeOptions) {
        let theme: ICustomTheme = {};

        if (themeOptions.useDarkMode) {
            theme.isDarkModeEnabled = true;
        }

        this._theme = {
            ...theme,
            ...themeOptions.customTheme,
        };
    }
}

export default ChatEmbeddedAPI;
