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
import { ITheme, useTheme } from '@fluentui/react';

export interface IChatEmbeddedConfig {
    contentWindow: Window;
    authProvider: IChatEmbeddedApiAuthProvider;
    onChatReady?: () => void;
    onChatClose?: (data: object) => void;
    onNotification?: (data: object) => void;
    themeV8: ITheme;
    containerId: string;
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
    locale?: string;
    /**
   * String to be used as placeholder text for chat input
     * @defaultValue 'Ask questions or type / to add people.'
   */
    chatInputPlaceholder?: string;
}

class ChatEmbeddedAPI {
    private port: Window | null = null;
    private _channelId: string;

    private _customPrompts: ICustomPrompts = {};
    private _theme: ICustomTheme = {};
    private _themeV8: ITheme;

    private _header: IHeader;
    private _contentWindow: Window;
    private _instruction?: string;
    private _dataSources?: IDataSourcesProps[];
    private _locale?: string;
    private _chatInputPlaceholder?: string;

    private _heartbeatInterval?: NodeJS.Timeout;
    private _messageListener: (event: MessageEvent) => void;
    private readonly authProvider: IChatEmbeddedApiAuthProvider;

    private _authToken3P?: string;
    private _containerId: string;
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
        this._themeV8 = config.themeV8;
        // Validate the containerId to match the specific format
        const containerIdPattern = /^b![a-zA-Z0-9-_]+$/;
        if (!config.containerId || !containerIdPattern.test(config.containerId)) {
            throw new Error('Invalid containerId format');
        }
        this._containerId = config.containerId;
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
                tokens: { 
                    augloop: true,
                    sharepointEmbedded: true
                 },
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

    private readonly _defaultHeader: IHeader = {
        title: "SharePoint Embedded Chat",
        hideIcon: true,
        showCloseButton: false,
    };

    /*
    Expectation is that we will only be called within a Container context
    The API can only be called from an SPE site context.
    That is, a call to
        https://tenant.sharepoint.com/contentstorage/CSP_xxxxxx/_api/v2.1/private/augloop/setSPEContext
    would work a but a call with the root site
        https://tenant.sharepoint.com/_api/v2.1/private/augloop/setSPEContext
    will not.

    Furthermore, the chatembedded.aspx page should only be loaded within an SPE site context.
    Therefore the document.referrer should be an SPE site of the form
        https://tenant.sharepoint.com/contentstorage/CSP_xxxxxx/_layouts/15/chatembedded.aspx
 
  */
    private async _url(): Promise<string> {
        // Define the interface for the expected response
        interface ISharepointIds {
            listId: string;
            siteId: string;
            siteUrl: string;
            tenantId: string;
            webId: string;
        }

        interface IApiResponse {
            sharepointIds: ISharepointIds;
        }        
        const registerApi = `${this.authProvider.hostname}/_api/v2.1/drives/${this._containerId}?$select=sharePointIds`;
        const response = await fetch(registerApi, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._authToken3P}`
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch site URL: ${response.statusText}`);
        }
        // Extract the siteUrl from the response
        const siteUrlResponse: IApiResponse = await response.json();
        const siteUrl = siteUrlResponse.sharepointIds.siteUrl;
        const url = new URL(siteUrl);  
        // Append additional paths to the URL
        url.pathname = `${url.pathname}/_layouts/15/chatembedded.aspx`;
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
                const command = event.data.data.command;
                switch (command) {
                    case 'fetchAuthToken':
                        console.log('---------- FETCH AUTH TOKEN ----------');
                        const tokenType = event.data.data.type;
                        switch(tokenType) {
                            case 'SharePoint-embedded':
                                console.log('---------- FETCH AUTH TOKEN SHAREPOINT-EMBEDDED----------');
                                this.port.postMessage({ type: 'result', id: event.data.id, result: 'success', data: { 
                                    authToken: this._authToken3P
                                }});
                                break;
                            case 'ms-augloop':
                                console.log('---------- NOT IMPLEMENTED ----------');
                            default:
                                break;
                        }
                        break;
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
                        language: this._locale,
                        header: this._header,
                        customPrompts: this._customPrompts,
                        instruction: this._instruction,
                        dataSources: this._dataSources,
                        chatInput: {
                            placeholder: this._chatInputPlaceholder
                        }
                    },
                    theme: this._theme,
                    themeV8: this._themeV8
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

            this._locale = launchConfig.locale;
            this._chatInputPlaceholder = launchConfig.chatInputPlaceholder ?? 'Ask questions or type / to add people.';
        }

        const accessToken = await this.authProvider.getToken();
        this._authToken3P = accessToken;
        const contentWindow = this._contentWindow;
        const form = contentWindow.document.createElement("form");
        form.method = "POST";
        const url = await this._url();
        form.action = url;

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

export function getSafeTheme(themeOptions?: ITheme): ITheme {
    // The spread operator is used to merge the default theme and the partial theme options,
    // with properties in themeV8Options overriding those in the default themeV8

    const themeV8: ITheme = {
        ...useTheme(),
        ...(themeOptions ?? {}),
      };
    // Remove components from theme to avoid serializing errors
    const {components, ...safeTheme} = themeV8;
    void components;
    return safeTheme;
}

export default ChatEmbeddedAPI;
