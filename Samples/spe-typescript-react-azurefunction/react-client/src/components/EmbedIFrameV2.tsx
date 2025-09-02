import * as React from 'react';
import { hostTheme } from '../common/theme';
import { useEffect } from 'react';


import { createHost, ISuccessResult, IErrorResult, ICommand } from '@ms/utilities-cross-window';
import { TokenType } from '../common/interface';
import { channelId } from './ContainerBrowser';

type IErrorNotification = {
  notification: 'error';
} & Pick<IErrorResult, Exclude<keyof IErrorResult, 'result'>>;

type ISuccessNotification = {
  notification: 'success';
} & Pick<ISuccessResult, Exclude<keyof ISuccessResult, 'result'>>;

type ITokenCommand = {
  command: string;
  tokenType?: TokenType;
};

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

interface IEmbedIFrameProps {
  actionUrl: string; // URL to send the POST request
  context: string; // Data to send in the POST request
  authToken?: string; // Auth token for the request
}

const EmbedIFrameV2: React.FC<IEmbedIFrameProps> = ({ actionUrl, context, authToken }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const hostRef = React.useRef<any>(null);

  // Not needed on real implementation. It's just mock requesting the embed page.
  useEffect(() => {
    if (iframeRef.current && formRef.current) {
      // Submit the form once the component is mounted
      formRef.current.submit();
    }
  }, []);

  useEffect(() => {
    // Construct a host that attaches to the current window and listens for communication from the embedded viewer.
    const host = createHost({
      // Important for message channel initialization! ChannelId assigned to embed page.
      // This channelId must be equal to the value in the embed page url.
      channelId: channelId,
      // Important! Origin of the embed page, ex: https://microsoft.sharepoint-df.com
      origin: 'https://a830edad9050849aljordace5.sharepoint.com',
      onCommand: (command: ICommand): Promise<IErrorResult | ISuccessResult> => {
        console.log('getToken command', command);

        switch (command.command) {
          case 'getContext':
            console.log('getContext command', command);
            // Provide additional configuration options that would not fit well in the URL.
            return Promise.resolve({
              result: 'success',
              context: {
                theme: hostTheme,
                useHostDownload: true
              }
            });
          // **** Respond embed with token  ***
          case 'getToken':
            let token;
            let expires = new Date(Date.now() + 3600 * 1000).toISOString();
            let tokenCommand = command as ITokenCommand;
            switch (tokenCommand?.tokenType) {
              case TokenType.SHAREPOINT:
                token = authToken; // assign the SharePoint token
                break;
              case TokenType.MS_GRAPH:
                token = 'MS_GRAPH_TOKEN';
                break;
              case TokenType.OFFICE_OCPS:
                token = 'OFFICE_OCPS_TOKEN';
                break;
              case TokenType.AZ_RMS:
                token = authToken; // assign the AZ_RMS_TOKEN
                break;
            }

            if (token) {
              return Promise.resolve({
                result: 'success',
                token: token,
                expires: expires
              });
            } else {
              return Promise.resolve({
                result: 'error',
                isExpected: false,
                error: {
                  code: '####',
                  message: '####'
                }
              });
            }
          default:
            return Promise.resolve({
              result: 'error',
              isExpected: false,
              error: {
                code: 'UNHANDLED_COMMAND',
                message: `The command '${command.command}' is not recognized.`
              }
            });
        }
      },
      onNotification: (notification: { notification: string }): void => {
        switch (notification.notification) {
          case 'success':
            // The embedded viewer successfully rendered the file
            console.log('Success notification!');
            // The host can send message to embed page after successfully rendered.
            host
              .sendCommand({
                command: 'setTheme',
                theme: hostTheme
              })
              .then((result: ISuccessResult | IErrorResult) => {
                console.log('(1) setTheme result', result);
              });
            return;
          case 'error':
            // The embedded viewer failed to render the file
            const errorNotification = notification as IErrorNotification;
            console.error(
              'Error',
              errorNotification.error.code,
              `(${errorNotification.isExpected ? 'expected' : 'unexpected'}): `,
              errorNotification.error.message
            );
            return;
          case 'performance':
            // The embedded viewer loading perf
            const perfNotification = notification as IPerformanceNotification;
            console.log('Embed loading perf: ', perfNotification.data);
            return;
        }
      },
      initTimeoutMs: 60000
    });

    // Send a notification (a fire-and-forget message that does not expect a result)
    host.sendNotification({
      notification: 'connected'
    });

    // Not required in real implementation.
    hostRef.current = host;
  }, []);

  // No need on real implementation. Helper function to print messages from the iframe to the host.
  useEffect(() => {
    const onMessage = function (event: MessageEvent) {
      if (event.data.source && event.data.source.indexOf('react-devtools') !== -1) {
        return;
      }

      console.log('host receive', new Date().toISOString() + JSON.stringify(event.data));
    };

    window.addEventListener('message', onMessage, false);
    return () => {
      window.removeEventListener('message', onMessage, false);
    };
  }, []);

  // No need on real implementation. Test post message to embed view on demand.
  const postMessageToIframe = () => {
    // Issue a command (an instruction that expects a result)
    hostRef.current
      .sendCommand({
        command: 'setTheme',
        theme: hostTheme
      })
      .then((result: ISuccessResult | IErrorResult) => {
        console.log('(2) setTheme result through button', result);
      });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
      {/* Invisible form targeting the iframe */}
      <form ref={formRef} action={actionUrl} method='POST' target='iframe-target' style={{ display: 'none' }}>
        <input key='context' type='hidden' name='context' value={context} />
        {/* <input key='access_token' type='hidden' name='access_token' value={authToken} /> */}
      </form>
      {/* Iframe that will display the POST result */}
      <iframe
        ref={iframeRef}
        name='iframe-target'
        style={{ width: '100%', height: '100%', border: '1px solid #ccc', maxWidth: '900px', maxHeight: '90%' }}
        title='Iframe with POST'
      />
    </div>
  );
};

export default EmbedIFrameV2;
