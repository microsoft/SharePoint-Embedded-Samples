import React, { useState, useEffect } from 'react';
import { Providers, ProviderState } from '@microsoft/mgt-element';
import { Login } from '@microsoft/mgt-react';
import { Stack, Text } from '@fluentui/react';
import './App.css';
import Containers from './components/containers';
import { InteractionRequiredAuthError } from '@azure/msal-browser'

const msal = require('@azure/msal-browser');

function useIsSignedIn() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const updateState = async () => {
      const provider = Providers.globalProvider;
      setIsSignedIn(provider && provider.state === ProviderState.SignedIn);
    };

    Providers.onProviderUpdated(updateState);
    updateState();

    return () => {
      Providers.removeProviderUpdatedListener(updateState);
    }
  }, []);

  return isSignedIn;
}

const mainContainerStackStyles = {
  root: {
    display: 'flex',
    width: '100%',
    padding: "0px",
    margin: "0px",
    'background-color': 'white',
  },
};

function App() {

  const isSignedIn = useIsSignedIn();

  /**
 * Asynchronously prompts the user for consent to manage RaaS containers.
 */
  async function promptForContainerConsent(event) {
    const msalConfig = {
      auth: {
        clientId: process.env.REACT_APP_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}/`,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    };

    const containerScopes = {
      scopes: ['FileStorageContainer.Selected'],
      redirectUri: '/'
    };

    const pca = new msal.PublicClientApplication(msalConfig);
    let containerTokenResponse;

    // Consent FileStorageContainer.Selected scope
    try {
      // attempt silent acquisition first
      containerTokenResponse = await pca.acquireTokenSilent(containerScopes);
      console.log(containerTokenResponse);
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        containerTokenResponse = await pca.acquireTokenPopup(containerScopes);
        console.log(containerTokenResponse);
      }
      else {
        console.log(error);
      }
    }
  }

  return (
    <div className="App">
      <Stack
        horizontalAlign="center"
        verticalAlign="start"
        styles={mainContainerStackStyles}
      >
        <Stack.Item align="stretch">
          <Stack.Item>
            <br />
            <Text variant="xLarge">Sample SharePoint Embedded App</Text>
            <br />
            <Text>Built with &#128151; using React, FluentUI, Microsoft Graph Toolkit, and <b>SharePoint Embedded!</b></Text>
            <br />
            <Login loginCompleted={promptForContainerConsent} />
          </Stack.Item>
        </Stack.Item>
        <Stack horizontalAlign="center" verticalAlign="start">
          <Stack.Item horizontalAlign="center" verticalAlign="start">
            <div>
              {isSignedIn && (
                <Containers />
              )}
            </div>
          </Stack.Item>
        </Stack>
      </Stack>
    </div>
  );
}

export default App;
