import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
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
  clientId: import.meta.env.VITE_CLIENT_ID,
  authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
  scopes: ["openid", "profile", "offline_access", "User.Read.All", "Files.ReadWrite.All", "Sites.Read.All", "FileStorageContainer.Selected"]
  
});
createRoot(document.getElementById('root')).render(<App />);


