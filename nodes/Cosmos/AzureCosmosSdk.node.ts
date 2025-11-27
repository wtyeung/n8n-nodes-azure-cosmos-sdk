import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { CosmosClient } from '@azure/cosmos';
import type { TokenCredential } from '@azure/cosmos';

export class AzureCosmosSdk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmos DB (SDK)',
		name: 'azureCosmosSdk',
		icon: 'fa:cloud',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		description: 'Interact with Azure Cosmos DB using the official SDK (supports vector search and hybrid queries)',
		defaults: {
			name: 'Azure Cosmos DB (SDK)',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'azureCosmosSdkApi',
				required: true,
				displayOptions: {
					show: {
						authenticationType: ['masterKey'],
					},
				},
			},
			{
				name: 'azureCosmosSdkEntraIdApi',
				required: true,
				displayOptions: {
					show: {
						authenticationType: ['entraId'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication Type',
				name: 'authenticationType',
				type: 'options',
				options: [
					{
						name: 'Master Key',
						value: 'masterKey',
						description: 'Authenticate using Cosmos DB master key',
					},
					{
						name: 'Microsoft Entra ID',
						value: 'entraId',
						description: 'Authenticate using Microsoft Entra ID (Azure AD) OAuth2',
					},
				],
				default: 'masterKey',
				description: 'The authentication method to use',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Select',
						value: 'select',
						description: 'Query documents using SQL',
						action: 'Query documents',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert a new document (fails if ID exists)',
						action: 'Insert a document',
					},
					{
						name: 'Create or Update',
						value: 'upsert',
						description: 'Create a new record, or update the current one if it already exists (upsert)',
						action: 'Upsert a document',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete documents matching a SQL query',
						action: 'Delete documents',
					},
				],
				default: 'select',
			},
			{
				displayName: 'Database Name',
				name: 'databaseName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'my-database',
				description: 'The name of the Cosmos DB database',
			},
			{
				displayName: 'Container Name',
				name: 'containerName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'my-container',
				description: 'The name of the Cosmos DB container',
			},
			{
				displayName: 'SQL Query',
				name: 'sqlQuery',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: 'SELECT * FROM c',
				required: true,
				placeholder: 'SELECT * FROM c WHERE c.status = "active"',
				description: 'The SQL query to execute against the container',
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
			},
			{
				displayName: 'Delete Mode',
				name: 'deleteMode',
				type: 'options',
				options: [
					{
						name: 'By ID and Partition Key',
						value: 'byId',
						description: 'Delete a specific document by ID and partition key value',
					},
					{
						name: 'By Query',
						value: 'byQuery',
						description: 'Delete multiple documents matching a SQL query',
					},
				],
				default: 'byId',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				default: '',
				required: true,
				placeholder: '123456',
				description: 'The ID of the document to delete',
				displayOptions: {
					show: {
						operation: ['delete'],
						deleteMode: ['byId'],
					},
				},
			},
			{
				displayName: 'Partition Key Value',
				name: 'partitionKeyValue',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'electronics',
				description: 'The partition key value of the document to delete',
				displayOptions: {
					show: {
						operation: ['delete'],
						deleteMode: ['byId'],
					},
				},
			},
			{
				displayName: 'Delete Query',
				name: 'deleteQuery',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: 'SELECT * FROM c WHERE c.status = "inactive"',
				required: true,
				placeholder: 'SELECT * FROM c WHERE c.createdAt < "2024-01-01"',
				description: 'SQL query to select documents to delete. Use SELECT * to include all fields needed for deletion (ID and partition key).',
				displayOptions: {
					show: {
						operation: ['delete'],
						deleteMode: ['byQuery'],
					},
				},
			},
			{
				displayName: 'Document',
				name: 'document',
				type: 'json',
				default: '{}',
				required: true,
				placeholder: '{"ID": "123", "name": "Example"}',
				description: 'The document to insert as JSON. Must include an ID field.',
				displayOptions: {
					show: {
						operation: ['insert', 'upsert'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
				options: [
					{
						displayName: 'Exclude Vector Fields',
						name: 'excludeVectorFields',
						type: 'boolean',
						default: false,
						description: 'Whether to exclude vector fields from the results to reduce payload size',
					},
					{
						displayName: 'Vector Field Names',
						name: 'vectorFieldNames',
						type: 'string',
						default: 'vector,embedding,embeddings',
						placeholder: 'vector,embedding,embeddings',
						description: 'Comma-separated list of field names to treat as vector fields',
						displayOptions: {
							show: {
								excludeVectorFields: [true],
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get authentication type from the first item
		const authenticationType = this.getNodeParameter('authenticationType', 0) as string;
		let client: CosmosClient;
		
		if (authenticationType === 'entraId') {
			// Use Entra ID authentication with Microsoft OAuth2
			const entraIdCredentials = await this.getCredentials('azureCosmosSdkEntraIdApi');
			const endpoint = entraIdCredentials.endpoint as string;
			const oauthTokenData = entraIdCredentials.oauthTokenData as any;

			// Create a custom TokenCredential using the delegated OAuth token
			const tokenCredential: TokenCredential = {
				async getToken() {
					// Use the access token from Microsoft OAuth2 credential
					// n8n handles token refresh automatically via the microsoftOAuth2Api credential
					return {
						token: oauthTokenData.access_token,
						expiresOnTimestamp: oauthTokenData.expires_in 
							? Date.now() + (oauthTokenData.expires_in * 1000)
							: Date.now() + (3600 * 1000), // Default 1 hour if not provided
					};
				},
			};

			client = new CosmosClient({ endpoint, aadCredentials: tokenCredential });
		} else {
			// Use master key authentication
			const credentials = await this.getCredentials('azureCosmosSdkApi');
			const endpoint = credentials.endpoint as string;
			const key = credentials.key as string;
			client = new CosmosClient({ endpoint, key });
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const databaseName = this.getNodeParameter('databaseName', itemIndex) as string;
				const containerName = this.getNodeParameter('containerName', itemIndex) as string;

				const database = client.database(databaseName);
				const container = database.container(containerName);

				if (operation === 'select') {
					// SELECT operation
					const sqlQuery = this.getNodeParameter('sqlQuery', itemIndex) as string;
					const options = this.getNodeParameter('options', itemIndex, {}) as {
						excludeVectorFields?: boolean;
						vectorFieldNames?: string;
					};

					// Execute the SQL query
					const { resources } = await container.items.query(sqlQuery).fetchAll();

					// Add each result as a separate item
					for (const resource of resources) {
						let processedResource = resource;

						// Remove vector fields if requested
						if (options.excludeVectorFields) {
							const vectorFields = (options.vectorFieldNames || 'vector,embedding,embeddings')
								.split(',')
								.map(f => f.trim())
								.filter(f => f.length > 0);

							processedResource = { ...resource };
							for (const field of vectorFields) {
								delete processedResource[field];
							}
						}

						returnData.push({
							json: processedResource,
							pairedItem: itemIndex,
						});
					}
				} else if (operation === 'insert') {
					// INSERT operation
					const documentJson = this.getNodeParameter('document', itemIndex) as string;
					const document = typeof documentJson === 'string' ? JSON.parse(documentJson) : documentJson;

					if (!document.id) {
						throw new NodeOperationError(this.getNode(), 'Document must include an ID field', {
							itemIndex,
						});
					}

					// Get container properties to determine partition key path
					const containerDef = await container.read();
					const partitionKeyPath = containerDef.resource?.partitionKey?.paths?.[0]?.replace('/', '') || 'id';

					// Validate partition key field exists
					if (!Object.prototype.hasOwnProperty.call(document, partitionKeyPath)) {
						throw new NodeOperationError(this.getNode(),
							`Document must include the partition key field '${partitionKeyPath}'. Add this field to your document.`,
							{ itemIndex }
						);
					}

					try {
						// Insert the document
						const { resource } = await container.items.create(document);

						if (!resource) {
							throw new NodeOperationError(this.getNode(), 'Insert operation did not return a resource', {
								itemIndex,
							});
						}

						returnData.push({
							json: resource,
							pairedItem: itemIndex,
						});
					} catch (error) {
						const cosmosError = error as { code?: number };
						if (cosmosError.code === 409) {
							throw new NodeOperationError(this.getNode(), `Document with ID '${document.id}' already exists. Use Create or Update operation to update existing documents.`, {
								itemIndex,
							});
						}
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex,
						});
					}
				} else if (operation === 'upsert') {
					// UPSERT operation
					const documentJson = this.getNodeParameter('document', itemIndex) as string;
					const document = typeof documentJson === 'string' ? JSON.parse(documentJson) : documentJson;

					if (!document.id) {
						throw new NodeOperationError(this.getNode(), 'Document must include an ID field', {
							itemIndex,
						});
					}

					// Get container properties to determine partition key path
					const containerDef = await container.read();
					const partitionKeyPath = containerDef.resource?.partitionKey?.paths?.[0]?.replace('/', '') || 'id';

					// Validate partition key field exists
					if (!Object.prototype.hasOwnProperty.call(document, partitionKeyPath)) {
						throw new NodeOperationError(this.getNode(),
							`Document must include the partition key field '${partitionKeyPath}'. Add this field to your document.`,
							{ itemIndex }
						);
					}

					// Upsert the document (create or replace)
					const { resource } = await container.items.upsert(document);

					returnData.push({
						json: resource || document,
						pairedItem: itemIndex,
					});
				} else if (operation === 'delete') {
					// DELETE operation
					const deleteMode = this.getNodeParameter('deleteMode', itemIndex) as string;

					if (deleteMode === 'byId') {
						// Delete by ID and partition key
						const documentId = this.getNodeParameter('documentId', itemIndex) as string;
						const partitionKeyValue = this.getNodeParameter('partitionKeyValue', itemIndex) as string;

						try {
							await container.item(documentId, partitionKeyValue).delete();
							
							returnData.push({
								json: {
									success: true,
									deletedCount: 1,
									deletedId: documentId,
									partitionKeyValue,
									message: `Successfully deleted document ${documentId}`,
								},
								pairedItem: itemIndex,
							});
						} catch (error) {
							const cosmosError = error as { code?: number };
							if (cosmosError.code === 404) {
								throw new NodeOperationError(this.getNode(), `Document with ID '${documentId}' and partition key '${partitionKeyValue}' not found`, {
									itemIndex,
								});
							}
							throw new NodeOperationError(this.getNode(), error as Error, {
								itemIndex,
							});
						}
					} else {
						// Delete by query
						const deleteQuery = this.getNodeParameter('deleteQuery', itemIndex) as string;

						// Execute the query to get documents to delete
						const { resources } = await container.items.query(deleteQuery).fetchAll();

						let deletedCount = 0;
						const deletedIds: string[] = [];
						const errors: Array<{id: string, error: string}> = [];

						// Get container properties to determine partition key path
						const containerDef = await container.read();
						const partitionKeyPath = containerDef.resource?.partitionKey?.paths?.[0]?.replace('/', '') || 'id';

						// Check if query includes partition key field
						if (resources.length > 0 && !Object.prototype.hasOwnProperty.call(resources[0], partitionKeyPath)) {
							throw new NodeOperationError(this.getNode(),
								`Query must include the partition key field '${partitionKeyPath}'. ` +
								`Use: SELECT * FROM c WHERE ... or SELECT c.id, c.${partitionKeyPath} FROM c WHERE ...`,
								{ itemIndex }
							);
						}

						// Delete each document
						for (const resource of resources) {
							if (!resource.id) {
								errors.push({ id: 'unknown', error: 'Document missing id field' });
								continue;
							}

							// Get the partition key value from the document
							const partitionKeyValue = resource[partitionKeyPath];
							
							if (partitionKeyValue === undefined) {
								errors.push({ 
									id: resource.id, 
									error: `Missing partition key field '${partitionKeyPath}' in query results. Use SELECT * or include c.${partitionKeyPath} in SELECT clause.`
								});
								continue;
							}

							try {
								await container.item(resource.id, partitionKeyValue).delete();
								deletedCount++;
								deletedIds.push(resource.id);
							} catch (error) {
								const err = error as Error;
								errors.push({
									id: resource.id,
									error: err.message || String(error)
								});
							}
						}

						returnData.push({
							json: {
								success: errors.length === 0,
								deletedCount,
								totalQueried: resources.length,
								deletedIds,
								errors: errors.length > 0 ? errors : undefined,
								message: `Successfully deleted ${deletedCount} of ${resources.length} document(s)`,
							},
							pairedItem: itemIndex,
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: itemIndex,
					});
				} else {
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
