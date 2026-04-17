// SharePoint Embedded MCP Server — Azure Container Apps deployment
// Usage: az deployment group create --resource-group <rg> --template-file main.bicep --parameters main.bicepparam

@description('Base name used for all resources (e.g. "spe-mcp")')
param appName string = 'spe-mcp'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Azure Entra ID Tenant ID')
param tenantId string

@description('App Registration (Client) ID')
param appId string

@description('App Registration Client Secret')
@secure()
param clientSecret string

@description('SharePoint Embedded Container Type ID')
param containerTypeId string

// ── Log Analytics Workspace ──────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ── Container Registry ───────────────────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('${appName}acr', '-', '')
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

// ── Container Apps Environment ───────────────────────────────────────────────
resource env 'Microsoft.App/managedEnvironments@2023-11-02-preview' = {
  name: '${appName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── User-Assigned Managed Identity ───────────────────────────────────────────
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${appName}-id'
  location: location
}

// Grant the managed identity AcrPull on the registry
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, identity.id, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Container App ────────────────────────────────────────────────────────────
resource containerApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    environmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: identity.id
        }
      ]
      secrets: [
        {
          name: 'client-secret'
          value: clientSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'spe-mcp-server'
          // Placeholder image for initial deployment — deploy.sh updates this with the real image after push
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'TENANT_ID'
              value: tenantId
            }
            {
              name: 'APP_ID'
              value: appId
            }
            {
              name: 'CLIENT_SECRET'
              secretRef: 'client-secret'
            }
            {
              name: 'CONTAINER_TYPE_ID'
              value: containerTypeId
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1  // Keep at least 1 to avoid cold-start SSE connection failures
        maxReplicas: 3
      }
    }
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────
@description('Public URL of the deployed MCP server')
output mcpServerUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'

@description('Streamable HTTP endpoint for Lovable MCP connector')
output mcpEndpoint string = 'https://${containerApp.properties.configuration.ingress.fqdn}/mcp'

@description('SSE endpoint (legacy fallback)')
output sseEndpoint string = 'https://${containerApp.properties.configuration.ingress.fqdn}/sse'

@description('Container Registry login server')
output acrLoginServer string = acr.properties.loginServer
