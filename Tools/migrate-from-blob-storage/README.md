# Migrate Azure Blob Storage Container To SharePoint Embedded Container Tutorial

The application is a console application that migrates content from Azure Blob Storage to SharePoint Embedded. It uses the ABS SDK download the blob and uses Graph SDK and and upload to the SPE container.

# Table of Contents
1. [Requirements](#requirements)
1. [Quick setup](#quick-setup)

# Requirements
* An Azure Blob Storage account with a container and its container level SAS URL
* An [Azure account](https://portal.azure.com)
* A SharePoint Tenant where you will create your containers and its Tenant Id
* An onboarded application id (sometimes called client id) and its corresponding ContainerTypeId
* Create new App Registration in [Azure's App Registration portal](https://portal.azure.com).
* In the App Registration, add a new Mobile & Console application platform in [Azure's App Registration Authenticate portal](https://portal.azure.com)
* A ContainerType
* A Container
* Having the application registered in the consuming tenant (even if the owner of the application is the same as the consuming)
* Having the containerType registered in the consuming tenant (even if the owner of the CT is the same as the consuming)

# Quick setup

## 1. Clone the repository
Clone the repository if you haven't done so and navigate to this application.
```
git clone https://github.com/microsoft/SharePoint-Embedded-Samples.git
cd SharePoint-Embedded-Samples\samples\migrate-abs-to-spe
```

## 2. Build and run
### From Visual Studio
Build and start debugging your application.

This will automatically build the project

### From a terminal
If you use [dotnet command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet), from the project's directory, type
```
# from samples\migrate-abs-to-spe
dotnet build

# Parameters
# --sasurl : container-level SAS URL - a azure blob container level SAS url.
# --tenantid : SPE tenant id - the tenant id that we are authenticating against.
# --clientid : SPE client id - the client id that we are authenticating against.
# --containerid : SPE container id - the container id that we are migrating content to
# --blobfile : (optional) File name with full path that contains the blob list. If it is not provided, the application will download all blobs in the container.
# --outputfile : (optional) File name with full path where to output failed blobs.
dotnet run Program.cs -- --sasurl "{containerLevelSASUrl}" --clientid "{clientId}" --containerid "{containerId}" [--blobfile "{outputFile}" --outputfile "{newOutputFile}"]"
```
