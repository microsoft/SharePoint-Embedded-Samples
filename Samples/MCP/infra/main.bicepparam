using './main.bicep'

param appName = 'spe-mcp'
param location = 'eastus'

// Fill these in before deploying — or pass via --parameters on the CLI
param tenantId = ''
param appId = ''
param clientSecret = ''
param containerTypeId = ''
