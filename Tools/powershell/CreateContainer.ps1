<#

 Microsoft provides programming examples for illustration only, without warranty either expressed or
 implied, including, but not limited to, the implied warranties of merchantability and/or fitness 
 for a particular purpose. 
 
 This sample assumes that you are familiar with the programming language being demonstrated and the 
 tools used to create and debug procedures. Microsoft support professionals can help explain the 
 functionality of a particular procedure, but they will not modify these examples to provide added 
 functionality or construct procedures to meet your specific needs. if you have limited programming 
 experience, you may want to contact a Microsoft Certified Partner or the Microsoft fee-based consulting 
 line at (800) 936-5200. 


==============================================================#>
<#
.SYNOPSIS
    This script will create a new SharePoint Embedded Container and activate it by assigning owner permissions to the user specified..

.TenantId
    Specifies the tenant ID where the container will be created.

.PARAMETER ClientId
    Specifies the Entra ID application client Id.

.PARAMETER ClientSecret
    Specifies the Application Registration secret.

.PARAMETER ConsumerTenantId
    Specifies the ID of the consumer tenant.

.PARAMETER DisaplayName
    The name that will be displayed for the container in the SharePoint Admin Center

.PARAMETER UserPrincipalName
    The user principal name (UPN) of the user to assign permissions to (user@domain.com).

.EXAMPLE
 ./CreateContainer.ps1 -TenantId "<TenantID>" -ClientId "<ClientID>" -ClientSecret "<ClientSecret>" -ContainerTypeId "<ContainerTypeId>" -DisplayName "<ContainerName>" -UserPrincipalName "<UserPrincipalName>" -Role "owner"
    

#>



param (
    [Parameter(Mandatory = $true)]
    [string]$TenantId,

    [Parameter(Mandatory = $true)]
    [string]$ClientId,

    [Parameter(Mandatory = $true)]
    [string]$ClientSecret,

    [Parameter(Mandatory = $true)]
    [string]$ContainerTypeId,

    [Parameter(Mandatory = $true)]
    [string]$DisplayName,

    [Parameter(Mandatory = $false)]
    [string]$Description = "Created via PowerShell",

    [Parameter(Mandatory = $true)]
    [string]$UserPrincipalName,

    [Parameter(Mandatory = $false)]
    [string]$Role = "write"

)


# Get access token
$body = @{
    grant_type    = "client_credentials"
    scope         = "https://graph.microsoft.com/.default"
    client_id     = $ClientId
    client_secret = $ClientSecret
}

$tokenResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" -Body $body
$accessToken = $tokenResponse.access_token

# Create the container
$containerPayload = @{
    displayName     = $DisplayName
    description     = $Description
    containerTypeId = $ContainerTypeId
} | ConvertTo-Json -Depth 3

$createResponse = Invoke-RestMethod -Method Post -Uri "https://graph.microsoft.com/v1.0/storage/fileStorage/containers" -Headers @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
} -Body $containerPayload

$containerId = $createResponse.id
Write-Host "Container created with ID: $containerId"

# Assign permissions to activate the container
$permissionPayload = @{
    grantedToV2 = @{
        user = @{
            userPrincipalName = $UserPrincipalName
        }
    }
    roles = @($Role)
} | ConvertTo-Json -Depth 3

$permissionUri = "https://graph.microsoft.com/v1.0/storage/fileStorage/containers/$containerId/permissions"

$permissionResponse = Invoke-RestMethod -Method Post -Uri $permissionUri -Headers @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
} -Body $permissionPayload

Write-Host "Permission assigned. Container is now active."
Write-Host "Permission Response: $($permissionResponse | ConvertTo-Json -Depth 3)"