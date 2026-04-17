import React, {
    useState, useEffect
} from "react";
import {
    Providers,
    ProviderState
} from "@microsoft/mgt-element";
import { Login } from "@microsoft/mgt-react";
import {
    FluentProvider,
    Text,
    webLightTheme
} from "@fluentui/react-components"
import {
    InteractionRequiredAuthError,
    PublicClientApplication
} from "@azure/msal-browser";
import * as Scopes from "./common/scopes";
import * as Constants from "./common/constants";
import Containers from "./components/containers";

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

function App() {

    const isSignedIn = useIsSignedIn();

    const promptForContainerConsent = async (event: CustomEvent<undefined>): Promise<void> => {
        const containerScopes = {
            scopes: [Scopes.SPEMBEDDED_FILESTORAGECONTAINER_SELECTED],
            redirectUri: `${window.location.protocol}://${window.location.hostname}${(window.location.port === '80' || window.location.port === '443') ? '' : ':' + window.location.port}`
        };

        const msalInstance = new PublicClientApplication({
            auth: {
                clientId: Constants.CLIENT_ENTRA_APP_CLIENT_ID,
                authority: Constants.CLIENT_ENTRA_APP_AUTHORITY,
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false,
            },
        });

        msalInstance.acquireTokenSilent(containerScopes)
            .then(response => {
                console.log('tokenResponse', JSON.stringify(response));
            })
            .catch(async (error) => {
                if (error instanceof InteractionRequiredAuthError) {
                    return msalInstance.acquireTokenPopup(containerScopes);
                }
            });
    }

    return (
        <FluentProvider theme={webLightTheme}>
            <div className="App">
                <Text size={900} weight='bold'>Sample SPA SharePoint Embedded App</Text>
                <Login loginCompleted={promptForContainerConsent} />
                <div>
                    {isSignedIn && (<Containers />)}
                </div>
            </div>
        </FluentProvider>
    );
}

export default App;
