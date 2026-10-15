targetScope = 'resourceGroup'

@description('Globally unique App Service name; lowercase letters, digits, and hyphens.')
@minLength(3)
@maxLength(45)
param appName string

param location string = resourceGroup().location

@secure()
@minLength(10)
param hostPassword string

@secure()
@minLength(32)
param sessionSecret string

var storageName = 'quiz${uniqueString(resourceGroup().id, appName)}'
var blobContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
  }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: { enabled: true, days: 7 }
  }
}
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'quiz'
  properties: { publicAccess: 'None' }
}
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  sku: { name: 'B1', tier: 'Basic', capacity: 1 }
  properties: { reserved: true }
}
resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'npm start'
      alwaysOn: true
      webSocketsEnabled: true
      numberOfWorkers: 1
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'HOST_PASSWORD', value: hostPassword }
        { name: 'SESSION_SECRET', value: sessionSecret }
        { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storage.properties.primaryEndpoints.blob }
        { name: 'AZURE_STORAGE_CONTAINER', value: container.name }
        { name: 'PUBLIC_ORIGIN', value: 'https://${appName}.azurewebsites.net' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'NPM_CONFIG_OMIT', value: 'dev' }
      ]
    }
  }
}
resource storageAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, web.id, blobContributor)
  scope: storage
  properties: {
    roleDefinitionId: blobContributor
    principalId: web.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output appUrl string = 'https://${web.properties.defaultHostName}'
output storageAccountName string = storage.name
output appServiceName string = web.name
