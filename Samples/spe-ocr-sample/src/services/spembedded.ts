import { Providers, ProviderState } from '@microsoft/mgt-element';
import * as Msal from '@azure/msal-browser';
import * as Constants from './../common/constants';
import * as Scopes from './../common/scopes';
import { IContainer } from './../common/IContainer';

export default class SpEmbedded {

    async getApiAccessToken() {
        const msalConfig: Msal.Configuration = {
          auth: {
            clientId: Constants.CLIENT_ENTRA_APP_CLIENT_ID,
            authority: Constants.CLIENT_ENTRA_APP_AUTHORITY,
          },
          cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false
          }
        };
      
        const scopes: Msal.SilentRequest = {
          scopes: [`api://${Constants.CLIENT_ENTRA_APP_CLIENT_ID}/${Scopes.SPEMBEDDED_CONTAINER_MANAGE}`],
          prompt: 'select_account',
          redirectUri: `${window.location.protocol}//${window.location.hostname}${(window.location.port === '80' || window.location.port === '443') ? '' : ':' + window.location.port}`
        };
      
        const publicClientApplication = new Msal.PublicClientApplication(msalConfig);
        await publicClientApplication.initialize();
      
        let tokenResponse;
        try {
          tokenResponse = await publicClientApplication.acquireTokenSilent(scopes);
          return tokenResponse.accessToken;
        } catch (error) {
          if (error instanceof Msal.InteractionRequiredAuthError) {
            tokenResponse = await publicClientApplication.acquireTokenPopup(scopes);
            return tokenResponse.accessToken;
          }
          console.log(error)
          return null;
        }
      };

      async listContainers(): Promise<IContainer[] | undefined> {
        const api_endpoint = `${Constants.API_SERVER_URL}/api/listContainers`;
      
        if (Providers.globalProvider.state === ProviderState.SignedIn) {
          const token = await this.getApiAccessToken();
          const containerRequestHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };
          const containerRequestOptions = {
            method: 'GET',
            headers: containerRequestHeaders
          };
          const response = await fetch(api_endpoint, containerRequestOptions);
      
          if (response.ok) {
            const containerResponse = await response.json();
            return (containerResponse.value)
              ? (containerResponse.value) as IContainer[]
              : undefined;
          } else {
            console.error(`Unable to list Containers: ${JSON.stringify(response)}`);
            return undefined;
          }
        }
      };

      async createContainer(containerName: string, containerDescription: string = ''): Promise<IContainer | undefined> {
        const api_endpoint = `${Constants.API_SERVER_URL}/api/createContainer`;
      
        if (Providers.globalProvider.state === ProviderState.SignedIn) {
          const token = await this.getApiAccessToken();
          const containerRequestHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };
      
          const containerRequestData = {
            displayName: containerName,
            description: containerDescription
          };
          const containerRequestOptions = {
            method: 'POST',
            headers: containerRequestHeaders,
            body: JSON.stringify(containerRequestData)
          };
      
          const response = await fetch(api_endpoint, containerRequestOptions);
      
          if (response.ok) {
            const containerResponse = await response.json();
            return containerResponse as IContainer;
          } else {
            console.error(`Unable to create container: ${JSON.stringify(response)}`);
            return undefined;
          }
        }
      };
}

