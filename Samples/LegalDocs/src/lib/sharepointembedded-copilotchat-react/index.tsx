/**
 * Local shim for @microsoft/sharepointembedded-copilotchat-react SDK
 * 
 * This module provides the same interface as the official Microsoft SDK.
 * The ChatEmbedded component renders an iframe that loads Microsoft's
 * SharePoint Embedded Copilot experience.
 * 
 * The actual SDK is distributed as a private preview tgz which cannot
 * be installed via npm/bun in this environment.
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ==================== Type Definitions ====================

export interface IChatEmbeddedApiAuthProvider {
  hostname: string;
  getToken(): Promise<string>;
}

export interface ChatEmbeddedAPI {
  openChat(config: ChatLaunchConfig): Promise<void>;
}

export interface PromptSuggestion {
  suggestionText: string;
}

export interface ZeroQueryPrompts {
  headerText?: string;
  promptSuggestionList?: PromptSuggestion[];
}

export interface ChatLaunchConfig {
  header?: string;
  instruction?: string;
  locale?: string;
  suggestedPrompts?: string[];
  zeroQueryPrompts?: ZeroQueryPrompts;
  chatInputPlaceholder?: string;
}

// ==================== ChatEmbedded Component ====================

interface ChatEmbeddedProps {
  authProvider: IChatEmbeddedApiAuthProvider;
  containerId: string;
  onApiReady?: (api: ChatEmbeddedAPI) => void;
  style?: React.CSSProperties;
}

/**
 * ChatEmbedded component - renders the SharePoint Embedded Copilot chat iframe.
 * 
 * This component loads the Copilot experience from SharePoint's servers
 * using the provided auth provider and container ID.
 */
export const ChatEmbedded: React.FC<ChatEmbeddedProps> = ({
  authProvider,
  containerId,
  onApiReady,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const initializedRef = useRef(false);
  const chatConfigRef = useRef<ChatLaunchConfig | null>(null);

  // Build the Copilot iframe URL
  const getCopilotUrl = useCallback(() => {
    const hostname = authProvider.hostname.replace(/\/$/, '');
    // The SDK uses this endpoint pattern for the embedded Copilot chat
    return `${hostname}/_layouts/15/copilotchat.aspx?containerId=${encodeURIComponent(containerId)}&embedded=true`;
  }, [authProvider.hostname, containerId]);

  // Handle messages from the Copilot iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our SharePoint hostname
      const hostname = authProvider.hostname.replace(/\/$/, '');
      try {
        const expectedOrigin = new URL(hostname).origin;
        if (event.origin !== expectedOrigin) {
          return;
        }
      } catch {
        // Fallback: simple string comparison
        if (!event.origin.includes(hostname.replace(/^https?:\/\//, ''))) {
          return;
        }
      }

      // Handle both string (JSON) and object message formats
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          console.log('ChatEmbedded: Ignoring non-JSON string message from iframe');
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      // Handle token requests from the iframe
      if (data.type === 'getToken' || data.messageType === 'getToken') {
        authProvider.getToken().then(token => {
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            type: 'tokenResponse',
            messageType: 'tokenResponse',
            token,
          }), hostname);
        }).catch(err => {
          console.error('ChatEmbedded: Failed to get token for iframe:', err);
        });
      }

      // Handle ready state
      if (data.type === 'ready' || data.messageType === 'ready') {
        console.log('ChatEmbedded: iframe ready');
        // If we have a pending config, send it
        if (chatConfigRef.current) {
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            type: 'openChat',
            messageType: 'openChat',
            config: chatConfigRef.current,
          }), hostname);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authProvider]);

  // Create and manage the iframe
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    const copilotUrl = getCopilotUrl();
    console.log('ChatEmbedded: Loading Copilot iframe from:', copilotUrl);

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = copilotUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
    
    iframeRef.current = iframe;
    containerRef.current.appendChild(iframe);

    // Create the API object
    const api: ChatEmbeddedAPI = {
      openChat: async (config: ChatLaunchConfig) => {
        chatConfigRef.current = config;
        const hostname = authProvider.hostname.replace(/\/$/, '');
        
        // Get auth token first
        try {
          const token = await authProvider.getToken();
          
          // Send config and token to iframe
          iframe.contentWindow?.postMessage(JSON.stringify({
            type: 'openChat',
            messageType: 'openChat',
            config,
            token,
          }), hostname);
          
          console.log('ChatEmbedded: openChat config sent to iframe');
        } catch (err) {
          console.error('ChatEmbedded: Failed to get token for openChat:', err);
          throw err;
        }
      },
    };

    // Notify parent that API is ready once iframe loads
    iframe.addEventListener('load', () => {
      console.log('ChatEmbedded: iframe loaded, firing onApiReady');
      onApiReady?.(api);
    });

    // Also fire onApiReady after a timeout in case load event doesn't fire
    const timeout = setTimeout(() => {
      if (!iframe.contentWindow) return;
      console.log('ChatEmbedded: Timeout reached, firing onApiReady');
      onApiReady?.(api);
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [getCopilotUrl, authProvider, onApiReady]);

  // Reset when containerId changes
  useEffect(() => {
    return () => {
      initializedRef.current = false;
      if (iframeRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(iframeRef.current);
        } catch {
          // ignore
        }
        iframeRef.current = null;
      }
    };
  }, [containerId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
};

export default ChatEmbedded;
