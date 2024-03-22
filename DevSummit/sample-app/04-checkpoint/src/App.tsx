import React from "react";
import './App.css';
import {
  FluentProvider,
  Text,
  webLightTheme
} from "@fluentui/react-components"
import { Containers } from "./components/Containers";

import { useIsSignedIn } from "./components/useIsSignedIn";
import { Login } from "@microsoft/mgt-react";
import {
  InteractionRequiredAuthError,
  PublicClientApplication
} from "@azure/msal-browser";
import * as Config from "./common/config"
import * as Scopes from "./common/scopes";

function App() {

  const isSignedIn = useIsSignedIn();

  const promptForContainerConsent = async (event: CustomEvent<undefined>): Promise<void> => {
    const tokenRequest = {
      scopes: [Scopes.SPE_FILESTORAGECONTAINER_SELECTED],
      redirectUri: `${window.location.protocol}://${window.location.hostname}${(window.location.port === '80' || window.location.port === '443') ? '' : ':' + window.location.port}`
    };

    const msalInstance = new PublicClientApplication({
      auth: {
        clientId: Config.CLIENT_ENTRA_APP_CLIENT_ID,
        authority: Config.CLIENT_ENTRA_APP_AUTHORITY
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    });

    msalInstance.acquireTokenSilent(tokenRequest)
      .then(response => {
        console.log('tokenResponse', JSON.stringify(response));
      })
      .catch(async (error) => {
        if (error instanceof InteractionRequiredAuthError) {
          return msalInstance.acquireTokenPopup(tokenRequest);
        }
      });
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="App">
        <Text size={900} weight='bold'>SharePoint Embedded App</Text>
        <Login loginCompleted={promptForContainerConsent} />
        {isSignedIn && (<Containers />)}
      </div>
    </FluentProvider>
  );
}

export default App;
