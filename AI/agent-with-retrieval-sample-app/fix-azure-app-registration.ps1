# PowerShell script to fix Azure AD app registration for console application
# Run this script with an account that has permissions to modify app registrations

param(
    [Parameter(Mandatory=$true)]
    [string]$ClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$TenantId
)

# Install required module if not present
if (!(Get-Module -ListAvailable -Name Microsoft.Graph)) {
    Write-Host "Installing Microsoft.Graph module..."
    Install-Module Microsoft.Graph -Scope CurrentUser -Force
}

# Connect to Microsoft Graph
Write-Host "Connecting to Microsoft Graph..."
Connect-MgGraph -TenantId $TenantId -Scopes "Application.ReadWrite.All"

try {
    # Get the current app registration
    Write-Host "Getting app registration: $ClientId"
    $app = Get-MgApplication -Filter "appId eq '$ClientId'"
    
    if (!$app) {
        Write-Error "App registration not found with Client ID: $ClientId"
        exit 1
    }
    
    Write-Host "Found app: $($app.DisplayName)"
    
    # Update the app registration to support public client flows
    Write-Host "Updating app registration to support public client flows..."
    
    # Set public client to true and configure redirect URIs for mobile/desktop
    $publicClientRedirectUris = @("http://localhost")
    
    $updateParams = @{
        ApplicationId = $app.Id
        IsFallbackPublicClient = $true
        PublicClient = @{
            RedirectUris = $publicClientRedirectUris
        }
        Web = @{
            RedirectUris = @()  # Remove web redirect URIs
        }
        Spa = @{
            RedirectUris = @()  # Remove SPA redirect URIs
        }
    }
    
    Update-MgApplication @updateParams
    
    Write-Host "✅ Successfully updated app registration!"
    Write-Host "✅ Enabled public client flows"
    Write-Host "✅ Set mobile/desktop redirect URI to: http://localhost"
    Write-Host "✅ Removed SPA and web redirect URIs"
    
    # Display current configuration
    $updatedApp = Get-MgApplication -ApplicationId $app.Id
    Write-Host "`nCurrent configuration:"
    Write-Host "- Public Client Enabled: $($updatedApp.IsFallbackPublicClient)"
    Write-Host "- Mobile/Desktop Redirect URIs: $($updatedApp.PublicClient.RedirectUris -join ', ')"
    Write-Host "- Web Redirect URIs: $($updatedApp.Web.RedirectUris -join ', ')"
    Write-Host "- SPA Redirect URIs: $($updatedApp.Spa.RedirectUris -join ', ')"
    
    Write-Host "`n🎉 App registration is now configured correctly for console applications!"
    
} catch {
    Write-Error "Failed to update app registration: $($_.Exception.Message)"
    exit 1
} finally {
    # Disconnect from Microsoft Graph
    Disconnect-MgGraph
}
