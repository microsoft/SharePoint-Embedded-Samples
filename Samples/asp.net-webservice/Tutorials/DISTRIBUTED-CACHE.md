# Switching to a distributed cache

The application works with an in-memory token cache, which is easier to work with with. However, the tokens
disappear when the application is restarted, which sometimes may cause some synchronization problems with the
cookies that may still be active in the browser.

You can read the details of token cache serialization [here](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-net-token-cache-serialization?tabs=aspnetcore).

In this guide you'll find information on how to move the application to use a local SQL server token cache.

You'll need to follow two steps:
1. [Create the local cache DB and table](#create-a-local-db-and-table)
1. [Modify the code to use the local DB](#update-the-code)

For your production application, you could use your own DB, or Redis, but I hope you find this guide informative.



# Create a local DB and table
In a command line, you may need to run one or more of the following commands depending on your local settings and
the configuration you desire. For example, you may choose to use the same DB for the application and the cache. 
In that case, you'll only need to [create the cache table](#create-the-cache-table)

## Create your local DB
### List your local instances (the default is MSSQLLocalDB)
```
SqlLocalDB info
```
### Create a local instance, only if you don't want to use MSSQLLocalDB
```
SqlLocalDB create "InstanceName"
```
### Start a local instance
```
SqlLocalDB start "InstanceName"
```
### Create a DataBase in your instance
```
#start sqlcmd
sqlcmd -S "(localDB)\InstanceName"

#On sqlcmd, execute
1> CREATE DATABASE DataBaseName;
2> go
1> exit
```
## Create the cache table
You can use dotnet to create the cache table, or you can create it manually (see [Creating server tables](#creating-server-tables)).
```
dotnet tool install --global dotnet-sql-cache
dotnet sql-cache create "Data Source=(localdb)\MSSQLLocalDB;Initial Catalog=YOUR_DB_NAME;Integrated Security=True;" dbo TokenCache
```
Note that the connection string string is the same that you must use in appsettings.json


# Update the code

## Update the config file
Add the token cache connection string string in the `appconfig.json` to look similar to this one, modifying it with your own settings:
```
  "ConnectionStrings": {
    "RaaSAppConnStr": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=RaaSDemoAppDb;Integrated Security=True;Connect Timeout=30;",
    "TokenCacheConnStr": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=RaaSDemoAppTokenCache;Integrated Security=True;Connect Timeout=30;"
  }
```
## Update Startup.cs
Locate this part of the code
```
.AddInMemoryTokenCaches()
```
And change it with 
```
.AddDistributedTokenCaches();
```
Finally, add the Sql Server cache to the services, like this:
```
services.AddDistributedSqlServerCache(options =>
{
    options.ConnectionString = Configuration.GetConnectionString("TokenCacheConnStr");
    options.SchemaName = "dbo";
    options.TableName = "TokenCache";

    options.DefaultSlidingExpiration = TimeSpan.FromMinutes(90);
});
```

# Reference

## Creating server tables
The following code is provided as reference, in case you want to create your tables in a different DB 
(for example, while publishing)
```
-- To create the tables used by the application
CREATE TABLE [dbo].[Containers] (
    [Id]         NVARCHAR (450) NOT NULL,
    [Name]       NVARCHAR (MAX) NULL,
    [WebUrl]     NVARCHAR (MAX) NULL,
    [TenantName] NVARCHAR (MAX) NULL,
    [IsAppOnly]  BIT            DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_Containers] PRIMARY KEY CLUSTERED ([Id] ASC)
);

CREATE TABLE [dbo].[TenantSites] (
    [Id]       UNIQUEIDENTIFIER NOT NULL,
    [TenantId] UNIQUEIDENTIFIER NOT NULL,
    [Name]     NVARCHAR (MAX)   NULL,
    [Url]      NVARCHAR (MAX)   NULL,
    CONSTRAINT [PK_TenantSites] PRIMARY KEY CLUSTERED ([Id] ASC)
);

-- To create a token cache table named TokenCache
CREATE TABLE [dbo].[TokenCache] (
    [Id]                         NVARCHAR (449)     COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL,
    [Value]                      VARBINARY (MAX)    NOT NULL,
    [ExpiresAtTime]              DATETIMEOFFSET (7) NOT NULL,
    [SlidingExpirationInSeconds] BIGINT             NULL,
    [AbsoluteExpiration]         DATETIMEOFFSET (7) NULL,
    PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE NONCLUSTERED INDEX [Index_ExpiresAtTime]
    ON [dbo].[TokenCache]([ExpiresAtTime] ASC);
```