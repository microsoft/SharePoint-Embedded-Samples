#!/usr/bin/env bash
# deploy.sh — Build, push, and deploy the SPE MCP Server to Azure Container Apps
# Usage: ./deploy.sh <resource-group> [image-tag]
#
# Prerequisites:
#   - Azure CLI logged in (az login)
#   - Docker running locally
#   - Resource group already created: az group create -n <rg> -l eastus

set -euo pipefail

RESOURCE_GROUP="${1:?Usage: ./deploy.sh <resource-group> [image-tag]}"
IMAGE_TAG="${2:-latest}"
APP_NAME="spe-mcp"

echo "==> Deploying SPE MCP Server"
echo "    Resource Group : $RESOURCE_GROUP"
echo "    Image Tag      : $IMAGE_TAG"
echo ""

# ── Step 1: Deploy infrastructure (creates ACR if it doesn't exist) ──────────
echo "==> Deploying Azure infrastructure..."
DEPLOY_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep \
  --parameters \
    appName="$APP_NAME" \
    tenantId="${TENANT_ID:?Set TENANT_ID env var}" \
    appId="${APP_ID:?Set APP_ID env var}" \
    clientSecret="${CLIENT_SECRET:?Set CLIENT_SECRET env var}" \
    containerTypeId="${CONTAINER_TYPE_ID:?Set CONTAINER_TYPE_ID env var}" \
  --query "properties.outputs" \
  --output json)

ACR_SERVER=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['acrLoginServer']['value'])")
MCP_ENDPOINT=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['mcpEndpoint']['value'])")

echo "    ACR Server     : $ACR_SERVER"
echo "    MCP Endpoint   : $MCP_ENDPOINT"
echo ""

# ── Step 2: Build image in Azure (no local Docker required) ─────────────────
ACR_NAME=$(echo "$ACR_SERVER" | cut -d'.' -f1)   # strip .azurecr.io
IMAGE_NAME="$ACR_SERVER/$APP_NAME:$IMAGE_TAG"

echo "==> Building image in Azure Container Registry (no local Docker needed)..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${APP_NAME}:${IMAGE_TAG}" \
  .

# ── Step 3: Update Container App with new image ──────────────────────────────
echo "==> Updating Container App with new image..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_NAME" \
  --output none

echo ""
echo "==> Deployment complete!"
echo ""
echo "    MCP Endpoint (Streamable HTTP) : $MCP_ENDPOINT"
echo "    SSE Endpoint (legacy)          : ${MCP_ENDPOINT%/mcp}/sse"
echo "    Health check                   : ${MCP_ENDPOINT%/mcp}/health"
echo ""
echo "==> Add this URL to Lovable as an MCP connector: $MCP_ENDPOINT"
