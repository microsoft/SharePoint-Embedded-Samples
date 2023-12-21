# Server Side Sample App Tutorial


Welcome to building a server-side Sample App with C# and .NET.

This application demonstrates the basic flow to work with SharePoint Embedded containers using 
[MS Graph](https://developer.microsoft.com/en-us/graph)

> **_NOTE:_** Some endpoints, only exist in Graph Beta and are subject to changes.


# Table of Contents
1. [Requirements](#requirements)
1. [Quick setup](#quick-setup)
1. [Application overview](#application-overview)
1. [Authentication and Authorization](#authentication-and-authorization)
1. [Troubleshoot](#troubleshoot)
1. [References](#references)



# Requirements
* A SharePoint Tenant where you will create your containers and its Tenant Id
* An onboarded application id (sometimes called client id) and its corresponding ContainerTypeId
* The application client secret, or a client certificate if you want to create application owned containers.
 These can be generated/uploaded in [Azure's Active Directory (AzureAD or AAD) portal](https://portal.azure.com).
* Visual Studio and/or .Net Framework installed (.NET 6.0 SDK is needed).
* A ContainerType
* Having the application registered in the consuming tenant (even if the owner of the application is the same as the consuming)
* Having the containerType registered in the consuming tenant (even if the owner of the CT is the same as the consuming)

# Quick setup

## 1. Clone the repository
Clone the repository if you haven't done so and navigate to this application
```
git clone https://github.com/microsoft/SharePoint-Embedded-Samples.git
cd SharePoint-Embedded-Samples\samples\asp.net-webservice
```

## 2. Configure the application
Copy `appsetings.baseline.json` to a new file named `appsettings.json` 
and fill the appropriate sections (app Id/client Id, secret and container type id )


## 3. Build and run
### From Visual Studio
Build and start debugging your application. 

This will automatically build the project and start the browser.

### From a terminal
If you use [dotnet command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet), from the project's directory, type
```
# from samples\asp.net-webservice
dotnet build
dotnet run
```
You should see the initial logs from the application. Open your browser and paste the following address
```
https://localhost:57750
```

## 3. Using the app
The home screen presents a list of all the tenants that have been onboarded.

If the list is empty or you want to add a new tenant, click on onboard my tenant. Use an admin account 
to approve the application in the host tenant (the tenant where you will create an interact with your 
containers).

Once the tenant has been onboarded, you should see it in your home screen. Click on your tenant and
start creating containers and interacting with them.




# Application Overview

Conceptually, the application can be split in two: the front end, which is built using Razor, and
the back end, which contains most of the business logic, which follows a typical MVC architecture, 
and uses Microsoft Identity Framework to handle the auth.

The application uses a small database to store all the onboarded tenants.


## Project Structure
```
./
  Controllers/
  Data/                            <-- Classes used to interact with the DB
  Exceptions/
  Models/                          <-- Classes of objects returned by container mgmnt endpoints
  Services/
  Tutorials/                       <-- Documentation for specific items
  Utils/
  Views/                           <-- Razor cshtml pages
  wwwroot/                         <-- CSS and static html files
  Program.cs                       <-- The entry point of the program
  Startup.cs                       <-- Where the app and most services are configured
  appsettings.json                 <-- Configuration Values for the app

```

## Execution Flow

The back end, for the most part:
1. Takes requests from the client in the Controllers
1. Gets a token (see [authentication and authorization](#authentication-and-authorization) for more information)
1. Calls a service that is connectd to either Graph or SharePoint API endpoints

### Startup.cs
Most of the application's configuration is done here, so it is worth explaining some snippets.

The Configuration object is loaded with the contents of appsettings.json, although this can be 
changed
```cs
public Startup(IConfiguration configuration)
{
    Configuration = configuration;
}
```

For authentication, we use MicrosoftIdentityWebApp, configured with the values from the AzureAd section in
the appsettings.json.
```cs
services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(options =>
    {
        Configuration.Bind("AzureAd", options);
    }
    )
```
Token acquisition uses mostly the same options, so we use the AzureAd section as well
```cs
    .EnableTokenAcquisitionToCallDownstreamApi(options =>
    {
        Configuration.Bind("AzureAd", options);
    },
    GraphScope.InitialPermissions
```


# Graph Endpoints
Most of the interaction done with files and folders in the application is done through Graph endpoints.

The [Graph API doumentation](https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0) is pretty useful
as has snippets for most of the endpoints in different languages. You can also try the
[Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) to get a feeling of the API, and even
get code snippets.

The important thing to keep in mind is that most of the examples use "me/drive", but with containers, the endpoint must 
be `drives/{driveId}`. E.g.

```cs
//Get all children
GET /drives/{drive-id}/items/{item-id}/children

//using the C# Graph Framework
IDriveItemChildrenCollectionPage driveItems = await graphServiceClient.Drives[driveId].Items[itemId].Children
    .Request()
    .GetAsync();
```
**You can find the code for all MS Graph calls in MSGraphService.cs.**

> **_NOTE:_** Since some of the endpoints have not yet been introduced to the C# Graph framework, 
those are called directly using an Http client.


# Authentication and Authorization
Authentication and Authorization is a topic far too large to discuss here. Here are some topics specific to this sample.

## Secret or Certificate
In appsettings.json, we can either use ClientSecret or ClientCertificates to configure our confidential application.
The Microsoft Identity Framework will use whichever you provide.

The sample is configured to use secrets, but you could [use a certificate instead](Tutorials/USING-CERTIFICATES.md).

**Bear in mind that app-only containers can only be created if we use certificates.**

If you want to test app-owned containers, once we you added a certificate to your app, uncomment the following code in 
`Views/Containers/index.cshtml` to call the CreateAppOnly endpoint

```
<button asp-action="CreateAppOnly" method="get" type="submit" class="btn btn-primary">Create tenant-owned container</button>
```


## Obtaining tokens
### Graph Scopes
Operations with DriveItems, Permissions, etc. documented in Graph currently use Graph scopes, such as:
 "Files.Read.All", "Files.ReadWrite.All", etc. In addition to those scopes, containers also need to use
 **"FileStorageContainer.Selected"**

 To obtain these scopes, the application uses the 
 [AuthorizeForScopes](https://docs.microsoft.com/en-us/azure/active-directory/develop/web-app-quickstart?pivots=devlang-aspnet-core#protect-a-controller-or-a-controllers-method) 
 attribute. E.g.:
```cs
[AuthorizeForScopes(Scopes = new string[] { "Files.Read.All" })]
```
The way this attribute works is by catching the MSAL exception when the tokens are not found in the local 
cache, and *challenging* for new tokens, which can be obtained from a user flow, or directly from the 
browser if the user is already signed.



# Troubleshoot
- **Q: The port can not be used due local restrictions**
- A: You can change the port used to open the application in appsettings.json, or if running from command
line, you can specify the url like this: `dotnet run --urls "https://localhost:57750"`

- **Q: The redirect URI 'https:xxxxxx' does not match the redirect URI configured for the application**
- A: The application must have the redirect used by the application configured properly. Go to the Azure Portal
  and look into the application's redirect, and ensure that you have at least these two redirects in the **Web** section. If you changed
  the port or published the app,  verify that the urls match the redirects'.
   - https://localhost:57750/signin-oidc
   - https://localhost:57750/Onboarding/ProcessCode
   - And also add https://localhost:57750/signout-oidc for logout.

- **Q: Visual Studio doesn't open a browser when I debug the application**
- A: Check that the port in appsettings.json matches the configuration in Properties/launchSettings.json




# References

- [Switching to a distributed cache](Tutorials/DISTRIBUTED-CACHE.md)
- [Razor Pages in this app](Tutorials/RAZOR-PAGES.md)
- [Using certificates](Tutorials/USING-CERTIFICATES.md)
