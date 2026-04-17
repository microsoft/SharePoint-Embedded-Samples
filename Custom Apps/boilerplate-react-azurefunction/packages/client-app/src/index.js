import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GRAPH_SCOPE_FILES_READ_WRITE_ALL, GRAPH_SCOPE_USER_READ  } from './utils/constants';

import { Providers } from '@microsoft/mgt-element';
import { Msal2Provider } from '@microsoft/mgt-msal2-provider';
import { initializeFileTypeIcons } from '@fluentui/react-file-type-icons';
import { initializeIcons } from '@fluentui/react/lib/Icons';
initializeFileTypeIcons(/* optional base url */);
initializeIcons(/* optional base url */);

/*
Set required Microsoft Graph scopes in global provider
*/

Providers.globalProvider = new Msal2Provider({
  clientId: process.env.REACT_APP_CLIENT_ID,
  authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`,
  scopes: ["openid", "profile", "offline_access", "User.Read.All", "Files.ReadWrite.All", "Sites.Read.All", "FileStorageContainer.Selected"]
  
});
ReactDOM.render(<App />, document.getElementById('root'));

reportWebVitals();
