"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureCosmosSdkEntraIdApi = void 0;
class AzureCosmosSdkEntraIdApi {
    constructor() {
        this.name = 'azureCosmosSdkEntraIdApi';
        this.displayName = 'Azure Cosmos DB SDK (Entra ID) API';
        this.documentationUrl = 'https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac';
        this.extends = ['microsoftOAuth2Api'];
        this.properties = [
            {
                displayName: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'https://your-account.documents.azure.com:443/',
                description: 'The Cosmos DB account endpoint URL',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.oauthTokenData.access_token}}',
                },
            },
        };
    }
}
exports.AzureCosmosSdkEntraIdApi = AzureCosmosSdkEntraIdApi;
//# sourceMappingURL=AzureCosmosSdkEntraIdApi.credentials.js.map