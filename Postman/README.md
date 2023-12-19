# Getting Started With Postman for SharePoint Embedded

[Microsoft Graph](https://docs.microsoft.com/graph/overview) is the gateway to data and intelligence in Microsoft 365. It provides a unified programmability model that you can use to access the tremendous amount of data in Microsoft 365, Windows 10, and Enterprise Mobility + Security. Use the wealth of data in Microsoft Graph to build apps for organizations and consumers that interact with millions of users.

For those not familiar, Postman is an open source application that allows developers to test APIs. Postman simplifies each step of the API lifecycle and streamlines collaboration so that you can create better APIs faster. Postman is especially helpful for testing Graph APIs while developing apps with SharePoint Embedded.

If you have not used Postman before, first create an [account](https://www.postman.com/) and download the Desktop Application for the best experience.

## Set up SharePoint Embedded Postman Collection

Download the [SharePoint Embedded Postman Collection]([https://github.com/microsoft/syntex-repository-services/blob/main/Postman/SyntexRepositoryServices.postman_collection.json](https://github.com/microsoft/SharePoint-Embedded-Samples/blob/main/Postman/SharePoint%20Embedded.postman_collection.json)) located within this directory.

In the top left-hand window, Click ☰, "File", "Import" and "Choose Files" to import the Postman Collection ```.json``` file that was just downloaded.

An import success message should appear after imported.

## Import Postman Enviroment

In the root of this folder, you will find a `template.postman_environment.json` template that needs to be populated with your tenant and application-specific information. Alternatively, if you have an exported environment file from the SharePoint Embedded VS Code Extension, you can use that. To import it, Click ☰, "File", "Import" and "Choose Files" to import the `.postman_environment` file. Make sure to select the imported enivornment file from the drop-down in the top right-hand banner.

In Postman, an environment consists of a key-value pair. It helps to identify each request separately. As we create environments, we can modify key-value pairs and that will produce varied responses from the same request.

The key in the key−value pair in the environment is known as the Environment variable. There can be multiple environments and each of them can also have multiple variables. However, we can work with a single environment at one time.

In short, an environment allows the execution of requests and collections in a varied data set. We can create environments for production, testing and development. Each of these environments will have different parameters like URL, password, and so on.
