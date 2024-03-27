import { Providers, ProviderState } from '@microsoft/mgt-element';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { remoteFunctionHost, localFunctionHost } from '../utils/constants';
const msal = require('@azure/msal-browser');


export default class RaaS {

  /*
  Asynchronous function that creates a container by making a POST request to a specified API endpoint with the provided display name and description.
  It also uses an API access token for authentication and returns the container object if the request is successful. 
  */
  async createContainer(displayName, description) {
    const apiUrl = `${localFunctionHost}/api/CreateContainer`;
    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const containerRequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + token
      };
      const containerRequestData = {
        displayName: displayName,
        description: description,
      };
      const containerRequestOptions = {
        method: 'POST',
        headers: containerRequestHeaders,
        body: JSON.stringify(containerRequestData),
      };
      console.log("Creating Container with options: " + JSON.stringify(containerRequestOptions));
      const res = await fetch(apiUrl, containerRequestOptions);
      if (res.ok) {
        const container = await res.json();
        return container;
      } else {
        console.error(`Unable to create container ${res}`);
        return null;
      }
    }
  }

  async listContainers() {
    const apiUrl = `${localFunctionHost}/api/ListContainers`;
    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const containerRequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + token
      };
      const containerRequestOptions = {
        method: 'GET',
        headers: containerRequestHeaders
      };
      const res = await fetch(apiUrl, containerRequestOptions);
      if (res.ok) {
        const containers = await res.json();
        return containers;
      } else {
        console.error(`Unable to get containers ${res}`);
        return null;
      }
    }
  }


    /*
  Asynchronous function that list permissions listed on a container 
  It also uses an API access token for authentication and returns the permissions object if the request is successful. 
  */
  async listContainerPermissions(container) {
    const apiUrl = `${localFunctionHost}/api/GetContainerPermissions`;
    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const containerRequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + token,
        'ContainerId': container.id
      };
      const containerRequestOptions = {
        method: 'GET',
        headers: containerRequestHeaders
      };
      const res = await fetch(apiUrl, containerRequestOptions);
      if (res.ok) {
        const permissions = await res.json();
        return permissions;
      } else {
        console.error(`Unable to get container permissions ${res}`);
        return null;
      }
    }
  }

      /*
  Asynchronous function that 
  It also uses an API access token for authentication and returns the permissions object if the request is successful. 
  */
  async deleteContainerPermissionById(container, permissionId) {
    const apiUrl = `${localFunctionHost}/api/DeleteContainerPermissionById`;
    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const containerRequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + token,
        'ContainerId': container.id,
        'PermissionId': permissionId
      };
      const containerRequestOptions = {
        method: 'DELETE',
        headers: containerRequestHeaders
      };
      const res = await fetch(apiUrl, containerRequestOptions);
      if (res.ok) {
        console.log("Permission deleted!")
      } else {
        console.error(`Unable to get container permissions ${res}`);
        return null;
      }
    }
  }

        /*
  Asynchronous function that 
  It also uses an API access token for authentication and returns the permissions object if the request is successful. 
  */
  async addContainerPermission(container, userPrincipalName, role) {
    const apiUrl = `${localFunctionHost}/api/AddContainerPermission`;
    if (Providers.globalProvider.state === ProviderState.SignedIn) {
      const token = await this.getApiAccessToken();
      const containerRequestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + token,
        'ContainerId': container.id,
        'UserPrincipalName': userPrincipalName,
        'Role': role
      }
      const containerRequestOptions = {
        method: 'POST',
        headers: containerRequestHeaders
      };
      const res = await fetch(apiUrl, containerRequestOptions);
      if (res.ok) {
        const permissions = await res.json();
        return permissions;
      } else {
        console.error(`Unable to get container permissions ${res}`);
        return null;
      }
    }
  }

  /*
  Asynchronous function that is used to get an API access token by using the MSAL library, it uses the client id and tenant authority from environment variables,
  and it attempts to acquire the token silently first but if it fails it will use an interactive method to acquire the token. 
  Returns the access token if it is successful, otherwise returns null.
  */
  async getApiAccessToken() {
    const msalConfig = {
      auth: {
        clientId: process.env.REACT_APP_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}/`
      },
      cache: {
        cacheLocation: "localStorage", // This configures where  cache will be stored
        storeAuthStateInCookie: false
      }
    }
    const scopes = {
      scopes: [
        `api://${process.env.REACT_APP_CLIENT_ID}/Container.Manage`
      ],
      prompt: "select_account",
      redirectUri: "/"
    }

    const pca = new msal.PublicClientApplication(msalConfig);
    let tokenResponse;

    try {
      // attempt silent acquisition first
      tokenResponse = await pca.acquireTokenSilent(scopes);
      console.log(tokenResponse);
      return tokenResponse.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        tokenResponse = await pca.acquireTokenPopup(scopes);
        console.log(tokenResponse);
        return tokenResponse.accessToken;
      }
      console.log(error);
      return null;
    }
  }
}
