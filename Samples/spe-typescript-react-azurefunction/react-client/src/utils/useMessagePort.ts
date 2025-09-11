import * as React from 'react';

/**
 * Custom hook to manage a MessagePort for communication between windows.
 * @param channelId - Unique identifier provided by the host to verify the source of messages.
 * @param origin - Origin of the client window (embed page).
 * @param source - Window from which the initialize message will be sent, e.g. iframe.contentWindow. If not specified, will not be validated.
 * @returns The MessagePort for communication, or undefined if not available.
 */
export function useMessagePort(
  channelId: string,
  origin: string,
  source: Window | undefined | null,
  initTimeoutMs = 10000
): MessagePort | undefined {
  const [messagePort, setMessagePort] = React.useState<MessagePort>();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!messagePort) {
        console.warn(`Message port initialization timed out after ${initTimeoutMs}ms`);
      }
    }, initTimeoutMs);
    return () => clearTimeout(timer);
  }, [initTimeoutMs, messagePort]);

  React.useEffect(() => {
    function messageListener(event: MessageEvent): void {
      if (equalsCaseInsensitive(event.origin, origin) && (!source || event.source === source)) {
        const data = event.data;
        if (data.type === 'initialize' && data.channelId === channelId) {
          const port = data.replyTo;

          if (port) {
            port.postMessage({
              type: 'activate'
            });

            setMessagePort(port);
          }
        }
      }
    }

    window.addEventListener('message', messageListener);

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [source, origin, channelId]);

  return messagePort;
}

function equalsCaseInsensitive(a: string, b: string): boolean {
  if (a && b) {
    return a.toUpperCase() === b.toUpperCase();
  }
  return a === b;
}