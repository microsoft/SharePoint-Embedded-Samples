
# Using certificates in the application

## Using a certificate for local tests
To make your application use certificates instead of a secret, you need to

* [Create a local self signed certificate](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-self-signed-certificate)
* Upload your certificate to Azure portal
* Update your `appsettings.json` file, as follows

Change this line
```js
"ClientSecret": "[addIfUsingSecret]",
```
With the information from your local certificate. E.g:
```js
"ClientCertificates": [
    {
    "SourceType": "StoreWithDistinguishedName",
    "CertificateStorePath": "CurrentUser/My",
    "CertificateDistinguishedName": "CN=ACertificate"
    }
],
```
## Using certificates in a published application

Publishing an application with certificates is a more involved process, since it includes many different options,
from using free generated certificates, purchasing them, using a key-vault, etc.

The actual code changes are minimal, but there are many options to consider. You can start with these
links: 
* <https://aka.ms/ms-id-web-certificates>
* <https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate>