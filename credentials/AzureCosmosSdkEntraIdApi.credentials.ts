import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AzureCosmosSdkEntraIdApi implements ICredentialType {
	name = 'azureCosmosSdkEntraIdApi';
	displayName = 'Azure Cosmos DB SDK (Entra ID) API';
	documentationUrl = 'https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac';
	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://your-account.documents.azure.com:443/',
			description: 'The Cosmos DB account endpoint URL',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			description: 'The Application (client) ID from Azure App Registration',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The client secret from Azure App Registration',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			description: 'The Directory (tenant) ID from Azure App Registration',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				grant_type: 'client_credentials',
				client_id: '={{$credentials.clientId}}',
				client_secret: '={{$credentials.clientSecret}}',
				scope: 'offline_access https://cosmos.azure.com/.default',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://login.microsoftonline.com/={{$credentials.tenantId}}/oauth2/v2.0/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: {
				grant_type: 'client_credentials',
				client_id: '={{$credentials.clientId}}',
				client_secret: '={{$credentials.clientSecret}}',
				scope: 'https://cosmos.azure.com/.default',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'access_token',
					value: '.*',
					message: 'Successfully authenticated with Microsoft Entra ID',
				},
			},
		],
	};
}
