.\RegisterContainer.ps1 -ClientId "24b1ea32-7f20-4e29-9faa-589cb3f63718" -ContainerTypeId "1b3f277b-9aee-4209-8df1-01ea04b8a2eb" -PemCertificationFilePath "./certs/SPEDemo.key" -ConsumerTenantId "fc14a141-120b-4368-b125-571da82b7865" -ConsumerTenantUrl "https://pucelikdemo.sharepoint.com" -Thumbprint "ebf2f02580e1db8fe0b7885eec98175b9edd633b"


Install-Package -Name System.Security.Cryptography -Source https://www.nuget.org/api/v2
Add-Type -AssemblyName System.Security.Cryptography