#!/bin/bash

# Script to fix Azure AD app registration for console application
# This script uses Azure CLI to update the app registration
# You can manually make these changes in the portal in the readme file.
#
# Usage:
#   ./fix-azure-app-registration.sh <CLIENT_ID> <TENANT_ID>
# or set the CLIENT_ID and TENANT_ID environment variables before running.

CLIENT_ID="${1:-$CLIENT_ID}"
TENANT_ID="${2:-$TENANT_ID}"

if [ -z "$CLIENT_ID" ] || [ -z "$TENANT_ID" ]; then
    echo "❌ Missing required arguments."
    echo "Usage: ./fix-azure-app-registration.sh <CLIENT_ID> <TENANT_ID>"
    echo "   or set the CLIENT_ID and TENANT_ID environment variables."
    exit 1
fi

echo "🔧 Fixing Azure AD App Registration for Console Application"
echo "Client ID: $CLIENT_ID"
echo "Tenant ID: $TENANT_ID"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Login to Azure
echo "🔐 Logging in to Azure..."
az login --tenant "$TENANT_ID"

# Get the app registration object ID
echo "📋 Getting app registration details..."
OBJECT_ID=$(az ad app list --filter "appId eq '$CLIENT_ID'" --query "[0].id" -o tsv)

if [ -z "$OBJECT_ID" ]; then
    echo "❌ App registration not found with Client ID: $CLIENT_ID"
    exit 1
fi

echo "✅ Found app registration with Object ID: $OBJECT_ID"

# Update the app registration
echo "🔄 Updating app registration to support public client flows..."

# Remove SPA platform and add mobile/desktop platform
az ad app update --id $OBJECT_ID \
    --public-client-redirect-uris "http://localhost" \
    --web-redirect-uris '[]' \
    --spa-redirect-uris '[]' \
    --is-fallback-public-client true

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated app registration!"
    echo "✅ Enabled public client flows"
    echo "✅ Set mobile/desktop redirect URI to: http://localhost"
    echo "✅ Removed SPA and web redirect URIs"
    echo ""
    echo "🎉 App registration is now configured correctly for console applications!"
    echo ""
    echo "You can now run your console application:"
    echo "dotnet run"
else
    echo "❌ Failed to update app registration"
    exit 1
fi
