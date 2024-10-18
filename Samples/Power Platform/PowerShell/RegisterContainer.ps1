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
    This script generates a JWT token and accesses a token from a consumer tenant for registering a container type.

.DESCRIPTION
    This script is used to generate a JWT token using a private key certificate and then use that token to access an access token from a consumer tenant.
    It then registers the container type in the consumer tenant using the obtained access token.

.PARAMETER ClientId
    Specifies the Entra ID application client Id.

.PARAMETER ContainerTypeId
    Specifies the SharePoint Embedded Container Type Id to register.

.PARAMETER PemCertificationFilePath
    Specifies the path to the PEM certification file.

.PARAMETER ConsumerTenantId
    Specifies the ID of the consumer tenant.

.PARAMETER ConsumerTenantUrl
    Specifies the URL of the consumer tenant.

.PARAMETER Thumbprint
    Specifies the thumbprint of the certificate taken from the Entra ID application.

.EXAMPLE
    
.\RegisterContainer.ps1 -ClientId "<ClientID>" -ContainerTypeId "<ContainerTypeID>" -PemCertificationFilePath "./certs/<FileName>.key" -ConsumerTenantId "<ConsumerTenantId" -ConsumerTenantUrl "https://<Domain>.sharepoint.com" -Thumbprint "<ThumbprintFromCertInAzure>"
#>

param(
    [Parameter(Mandatory=$true)]
    [String] $ClientId,
    [Parameter(Mandatory=$true)]
    [String] $ContainerTypeId,
    [Parameter(Mandatory=$true)]
    [String] $PemCertificationFilePath,
    [Parameter(Mandatory=$true)]
    [String] $ConsumerTenantId,
    [Parameter(Mandatory=$true)]
    [String] $ConsumerTenantUrl,
    [Parameter(Mandatory=$true)]
    [String] $Thumbprint
)

<#
Here's a list of the steps performed by the script:

1. Build the JWT token to retrieve the consumer tenant access token
    1. Transform the thumbprint provided to base64 format
    2. Build the JWT header
    3. Build the JWT payload
    4. Build the JWT signature
    5. Combine the JWT header, payload, and signature to create the JWT token.
    6. Get the access token from the consumer tenant.
2. Register the container type in the consumer tenant.
#>
function Convert-HexToByteArray {
    param (
        [string]$hex
    )

    # Convert hex string to byte array
    $bytes = for ($i = 0; $i -lt $hex.Length; $i += 2) {
        [Convert]::ToByte($hex.Substring($i, 2), 16)
    }
    return $bytes
}
Try {

    Add-Type -AssemblyName "System.Security.Cryptography.X509Certificates"
    # Transformation of the thumbprint from hex to base64
    Write-Host "Transforming the thumbprint provided to base64 format..."
    $HexThumbprint = $Thumbprint
    #$RawThumbprint = [System.Convert]::FromHexString($HexThumbprint)
    $RawThumbprint =  Convert-HexToByteArray -hex $HexThumbprint
    $Base64Thumbprint = [System.Convert]::ToBase64String($RawThumbprint)
    $SafeThumbprintt = $Base64Thumbprint -replace '\+', '-' -replace '/','_' -replace '='


    # JWT Header
    Write-Host "Building the JWT header..."
    $AlgorithmClaim = "RS256"
    $TokenTypeClaim = "JWT"
    $X5TClaim = $SafeThumbprintt

    $Header = @{
        alg = $AlgorithmClaim
        typ = $TokenTypeClaim
        x5t = $X5TClaim
    } | ConvertTo-Json -Compress

    $Base64Header = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Header))
    $SafeHeader = $Base64Header -replace '\+', '-' -replace '/','_' -replace '='


    # JWT Payload
    Write-Host "Building the JWT payload..."
    $Now = [DateTime]::UtcNow
    $Expiration = [DateTime]::UtcNow.AddMinutes(20)

    $AudienceClaim = "https://login.microsoftonline.com/$ConsumerTenantId/oauth2/v2.0/token"
# Define the necessary variables
$Expiration = [DateTime]::UtcNow.AddHours(1)  # Example expiration time
$Now = [DateTime]::UtcNow

# Calculate the claims
$UnixEpoch = [DateTime]::Parse("1970-01-01T00:00:00Z")

$ExpirationTimeClaim = [Math]::Round(($Expiration - $UnixEpoch).TotalSeconds)
Write-Host "Expiration Claim: $ExpirationTimeClaim"
$IssuerClaim = $ClientId
$JWTIdClaim = [Guid]::NewGuid()
$NotBeforeClaim = [Math]::Round(($Now - $UnixEpoch).TotalSeconds)
$currentDateTime = Get-Date

$SubjectClaim = $ClientId
$IssuedAtClaim = [Math]::Round(($Now - $UnixEpoch).TotalSeconds)
$IssuedAtClaim = [Math]::Round(($currentDateTime - $UnixEpoch).TotalSeconds)

    $Payload = @{
        aud = $AudienceClaim
        exp = $ExpirationTimeClaim
        iss = $IssuerClaim
        jti = $JWTIdClaim
        nbf = $currentDateTime
        sub = $SubjectClaim
        iat = $IssuedAtClaim
    } | ConvertTo-Json -Compress

    $Base64Payload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Payload))
    $SafePayload = $Base64Payload -replace '\+', '-' -replace '/','_' -replace '='


    # JWT Signature
    Write-Host "Building the JWT signature..."
    $UnsignedToken = "$SafeHeader.$SafePayload"

    
    $PemKey = Get-Content -Path $PemCertificationFilePath -Raw
    

    $rsa = [System.Security.Cryptography.RSA]::Create()
    $rsa.ImportFromPem($PemKey)

    Write-Host "Pem file imported..."
    $Hash = [System.Security.Cryptography.HashAlgorithmName]::SHA256
    $Padding = [System.Security.Cryptography.RSASignaturePadding]::Pkcs1

    #$Signature = $RsaProvider.SignData([Text.Encoding]::UTF8.GetBytes($UnsignedToken), $Hash, $Padding)
    $Signature = $rsa.SignData([Text.Encoding]::UTF8.GetBytes($UnsignedToken), $Hash, $Padding)

    $Base64Signature = [Convert]::ToBase64String($signature)
    $SafeSignature = $Base64Signature -replace '\+', '-' -replace '/','_' -replace '='


    # Combine the JWT and signature
    Write-Host "Combined the JWT header, payload, and signature to create the JWT token."
    $SignedToken= "$UnsignedToken.$SafeSignature"


    # Getting the Access Token
    Write-Host "Getting the access token from the consumer tenant..."
    $Body = @{
        "client_assertion_type" = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
        "client_assertion" = $SignedToken
        "client_id" = $ClientId
        "scope" = "$ConsumerTenantUrl/.default"
        "grant_type" = "client_credentials"
    }

    $AccessTokenResponse = Invoke-RestMethod   -Uri "https://login.microsoftonline.com/$ConsumerTenantId/oauth2/v2.0/token" `
                                    -Method Post `
                                    -ContentType "application/x-www-form-urlencoded" `
                                    -Body $Body `
                                    -UseBasicParsing

    $AccessToken = $AccessTokenResponse.access_token
    $SecureAccessToken = $AccessToken | ConvertTo-SecureString -AsPlainText -Force


    # Registering the Consumer Tenant
    Write-Host "Registering the container type in the consumer tenant..."

    $Body = @{
        value = @(
            @{
                "appId" = $ClientId
                "delegated" = @("full")
                "appOnly" =  @("full")
            }
        )
    } 

    $RegistrationResponse = Invoke-RestMethod   -Uri "$ConsumerTenantUrl/_api/v2.1/storageContainerTypes/$ContainerTypeId/applicationPermissions" `
                                    -Method Put `
                                    -Authentication Bearer `
                                    -Token $SecureAccessToken `
                                    -ContentType "application/json" `
                                    -Body ($Body | ConvertTo-Json -Depth 3)
    Write-Host "Registration completed."
    $RegistrationResponse
}
Catch {
    Write-Host "Error occurred: $_"
    Exit 1
}