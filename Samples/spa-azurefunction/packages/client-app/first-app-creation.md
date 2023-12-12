# Creating a RaaS single page application (SPA)

This is a sample application to show how you can build a [Syntex Containers](http://raas) SPA with React and FluentUI.

In order to create a Syntex Containers application, you need an M365 Tenant. If you don't have one, you can get access to a development tenant with the [M365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program).

## Setup and run the project locally

Clone the project to your development machine.
```
> git clone https://github.com/Syntex-Samples/syntex-containers-spa.git
> cd syntex-containers-spa
```

## Configure the project
Run the following PowerShell script to register a new Azure Active Directory (AAD) application and create a new Syntex Container Type for it. If you already have registered an application and/or ContainerType, [follow these instructions instead](http://todo). The script will prompt you for the credentials for an admin user on your M365 Tenant.
```
> ./SetupSyntexApp.ps1
```


## Install required libraries with npm
```
> npm install
```

## Run the application
```
> npm start
```
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
