import * as React from 'react';
import { useEffect } from 'react';
import { useMessagePort } from './../utils/useMessagePort';
import { IMockData, TokenType } from '../common/interface';

interface IEmbedIFrameProps {
  actionUrl: string; // URL to send the POST request
  mockData: IMockData; // Mock data
  context?: string; // Data to send in the POST request
  authToken?: string; // Auth token for the request
}

type IPerformanceNotification = {
  notification: 'performance';
} & {
  data: {
    FMP: number;
    FCI: number;
    AbsoluteFMP: number;
    AbsoluteFCI: number;
    startTiming: number;
  };
};

const EmbedIFrameV2Next: React.FC<IEmbedIFrameProps> = ({
  actionUrl,
  context,
  mockData
}: IEmbedIFrameProps) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const messagePort = useMessagePort(
    mockData.channelId!,
    mockData.embedPageOrigin!,
    iframeRef.current?.contentWindow
  );

  useEffect(() => {
    if (iframeRef.current && formRef.current) {
      // Submit the form once the component is mounted
      formRef.current.submit();
    }
  }, []);

  useEffect(() => {
    const sendAcknowledge = (event: MessageEvent): void => {
      if (messagePort) {
        messagePort.postMessage({
          type: 'acknowledge',
          id: event.data.id
        });
      }
    };

    if (messagePort) {
      messagePort.onmessage = (event: MessageEvent) => {
        const { data } = event;
        const { type, data: payload } = data;

        switch (type) {
          case 'command':
            sendAcknowledge(event);

            switch (payload.command) {
              case 'getToken':
                const tokenType: TokenType = payload.tokenType;
                let token: string | undefined;
                switch (tokenType) {
                  case TokenType.SHAREPOINT:
                    token = mockData.accessToken;
                    break;
                  case TokenType.AZ_RMS:
                    token = mockData.accessToken;
                    break;
                  // Add other token types as needed
                }

                if (token) {
                  console.log('post token');
                  messagePort.postMessage({
                    type: 'result',
                    id: data.id,
                    data: {
                      result: 'success',
                      token: token,
                      expires: mockData.tokenExpires
                    }
                  });
                }
              // Add other command types as needed
            }
            break;
          case 'notification':
            switch (payload.notification) {
              case 'success':
                console.log('notification from iframe: PDF rendered successfully in iframe.');
                break;
              case 'error':
                console.error('notification from iframe: Error rendering PDF in iframe:', payload.message);
                break;
              case 'performance':
                const perfNotification = payload as IPerformanceNotification;
                console.log('notification from iframe: Embed loading perf: ', perfNotification.data);
                break;
              default:
                console.warn('notification from iframe: Unknown notification event:', payload.notification);
            }
        }
      };
    }
  }, [messagePort]);

  return (
    <div>
      {/* Invisible form targeting the iframe */}
      <form ref={formRef} action={actionUrl} method='POST' target='iframe-target' style={{ display: 'none' }}>
        <input key='context' type='hidden' name='context' value={context} />
        {/* <input key='access_token' type='hidden' name='access_token' value={authToken} /> */}
      </form>
      {/* Iframe that will display the POST result */}
      <iframe
        ref={iframeRef}
        name='iframe-target'
        style={{ width: '600px', height: '700px', border: '1px solid #ccc', display: 'block' }}
        title='Iframe with POST'
      />
    </div>
  );
};

export default EmbedIFrameV2Next;
