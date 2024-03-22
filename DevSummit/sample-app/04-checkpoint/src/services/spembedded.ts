import {
  Providers,
  ProviderState
} from '@microsoft/mgt-element';
import * as Msal from '@azure/msal-browser';
import * as Config from '../common/config';
import * as Scopes from '../common/scopes';
import {
  IContainer,
  IContainerPermission,
  IContainerProperty
} from '../common/IContainer';

export default class SpEmbedded {

  async getApiAccessToken() {
    const msalConfig: Msal.Configuration = {
      auth: {
        clientId: Config.CLIENT_ENTRA_APP_CLIENT_ID,
        authority: Config.CLIENT_ENTRA_APP_AUTHORITY,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
      }
    };

    const scopes: Msal.SilentRequest = {
      scopes: [`api://${Config.CLIENT_ENTRA_APP_CLIENT_ID}/${Scopes.SPE_CONTAINER_MANAGE}`],
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
    const api_endpoint = `${Config.API_SERVER_URL}/api/listContainers`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const requestOptions = {
        method: 'GET',
        headers: requestHeaders
      };
      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        const containerResponse = await response.json();
        return (containerResponse.value)
          ? (containerResponse.value) as IContainer[]
          : undefined;
      } else {
        console.error(`Unable to list containers: ${JSON.stringify(response)}`);
        return undefined;
      }
    }
  };

  async createContainer(containerName: string, containerDescription: string = ''): Promise<IContainer | undefined> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/createContainer`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const requestData = {
        displayName: containerName,
        description: containerDescription
      };
      const requestOptions = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestData)
      };

      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        const containerResponse = await response.json();
        return containerResponse as IContainer;
      } else {
        console.error(`Unable to create container: ${JSON.stringify(response)}`);
        return undefined;
      }
    }
  };

  async listContainerPermissions(containerId: string): Promise<IContainerPermission[] | undefined> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/listContainerPermissions/${containerId}`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const requestOptions = {
        method: 'GET',
        headers: requestHeaders
      };
      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        const containerResponse = await response.json();
        return (containerResponse.value)
          ? containerResponse.value.map((permission: any) => {
            return {
              id: permission.id,
              roles: permission.roles,
              user: {
                displayName: permission.grantedToV2.user.displayName,
                email: permission.grantedToV2.user.email,
                userPrincipalName: permission.grantedToV2.user.userPrincipalName
              }
            }
          }) as IContainerPermission[]
          : undefined;
      } else {
        console.error(`Unable to list container permissions: ${JSON.stringify(response)}`);
        return undefined;
      }
    }
  };

  async createContainerPermission(containerId: string, role: string, userPrincipalName: string): Promise<IContainerPermission | undefined> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/createContainerPermission/${containerId}`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const requestData = { role, userPrincipalName };
      const requestOptions = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestData)
      };
      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        const containerResponse = await response.json();
        return {
          id: containerResponse.id,
          roles: containerResponse.roles,
          user: {
            displayName: containerResponse.grantedToV2.user.displayName,
            email: containerResponse.grantedToV2.user.email,
            userPrincipalName: containerResponse.grantedToV2.user.userPrincipalName
          }
        }
      } else {
        console.error(`Unable to create container permission: ${JSON.stringify(response)}`);
        return undefined;
      }
    }
  };

  async deleteContainerPermission(containerId: string, permissionId: string): Promise<void> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/deleteContainerPermission/${containerId}`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const requestData = { permissionId };
      const requestOptions = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestData)
      };
      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        return;
      } else {
        console.error(`Unable to delete container permission: ${JSON.stringify(response)}`);
        return;
      }
    }
  };

  async listContainerProperties(containerId: string): Promise<IContainerProperty[] | undefined> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/listContainerProperties/${containerId}`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const requestOptions = {
        method: 'GET',
        headers: requestHeaders
      };

      const response = await fetch(api_endpoint, requestOptions);
      if (response.ok) {
        const containerResponse = await response.json();
        const containerProperties: IContainerProperty[] = [];
        Object.entries(containerResponse).forEach(([key, value]) => {
          if (key !== '@odata.context')
            containerProperties.push({
              propertyName: key,
              propertyValue: containerResponse[key].value,
              isSearchable: containerResponse[key].isSearchable
            });
        });
        return containerProperties;
      } else {
        console.error(`Unable to list container properties: ${JSON.stringify(response)}`);
        return undefined;
      }
    }
  };

  async createContainerProperty(containerId: string, propertyName: string, propertyValue: string, isSearchable: boolean): Promise<void> {
    const api_endpoint = `${Config.API_SERVER_URL}/api/createContainerProperty/${containerId}`;

    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const requestData = { propertyName, propertyValue, isSearchable };
      const requestOptions = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestData)
      };
      const response = await fetch(api_endpoint, requestOptions);

      if (response.ok) {
        return;
      } else {
        console.error(`Unable to create container property: ${JSON.stringify(response)}`);
        return;
      }
    }
  };

}
