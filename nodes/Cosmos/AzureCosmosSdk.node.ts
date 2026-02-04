import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
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
					{
						name: 'Create Database',
						value: 'createDatabase',
						description: 'Create a new Cosmos DB database',
						action: 'Create a database',
					},
					{
						name: 'Create Container',
						value: 'createContainer',
						description: 'Create a new container with partition key, vector index, and full-text index support',
						action: 'Create a container',
					},
					{
						name: 'Delete Database',
						value: 'deleteDatabase',
						description: 'Delete a database and all its containers',
						action: 'Delete a database',
					},
					{
						name: 'Delete Container',
						value: 'deleteContainer',
						description: 'Delete a container from a database',
						action: 'Delete a container',
					},
				],
				default: 'select',
			},
			{
				displayName: 'Database',
				name: 'databaseName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The database to use',
				displayOptions: {
					hide: {
						operation: ['createDatabase', 'createContainer', 'deleteDatabase', 'deleteContainer'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a database...',
						typeOptions: {
							searchListMethod: 'getDatabases',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-database',
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-database',
					},
				],
			},
			{
				displayName: 'Container',
				name: 'containerName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The container to use',
				displayOptions: {
					hide: {
						operation: ['createDatabase', 'createContainer', 'deleteDatabase', 'deleteContainer'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a container...',
						typeOptions: {
							searchListMethod: 'getContainersForDocOps',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-container',
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-container',
					},
				],
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
				displayName: 'New Database Name',
				name: 'newDatabaseName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'my-new-database',
				description: 'The name of the database to create',
				displayOptions: {
					show: {
						operation: ['createDatabase'],
					},
				},
			},
			{
				displayName: 'Database Throughput (RU/s)',
				name: 'databaseThroughput',
				type: 'number',
				default: 0,
				placeholder: '400',
				description: 'Provisioned throughput in Request Units per second (minimum 400). Set to 0 for serverless accounts or container-level throughput.',
				displayOptions: {
					show: {
						operation: ['createDatabase'],
					},
				},
			},
			{
				displayName: 'Database',
				name: 'database',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The database where the container will be created',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a database...',
						typeOptions: {
							searchListMethod: 'getDatabases',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-database',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9_-]+$',
									errorMessage: 'Database name can only contain letters, numbers, hyphens, and underscores',
								},
							},
						],
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-database',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9_-]+$',
									errorMessage: 'Database ID can only contain letters, numbers, hyphens, and underscores',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'New Container Name',
				name: 'newContainerName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'my-new-container',
				description: 'The name of the container to create',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
			},
			{
				displayName: 'Partition Key Path',
				name: 'partitionKeyPath',
				type: 'string',
				default: '/category',
				required: true,
				placeholder: '/category',
				description: 'The partition key path (e.g., /category, /userId). Must start with /',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
			},
			{
				displayName: 'Container Throughput (RU/s)',
				name: 'containerThroughput',
				type: 'number',
				default: 0,
				placeholder: '400',
				description: 'Provisioned throughput in Request Units per second. Leave as 0 to inherit from database or use serverless.',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
			},
			{
				displayName: 'Enable Vector Index',
				name: 'enableVectorIndex',
				type: 'boolean',
				default: false,
				description: 'Whether to enable vector indexing for similarity search',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
			},
			{
				displayName: 'Vector Index Configuration',
				name: 'vectorIndexConfig',
				type: 'collection',
				placeholder: 'Add Vector Index Settings',
				default: {},
				displayOptions: {
					show: {
						operation: ['createContainer'],
						enableVectorIndex: [true],
					},
				},
				options: [
					{
						displayName: 'Vector Path',
						name: 'vectorPath',
						type: 'string',
						default: '/vector',
						placeholder: '/embedding',
						description: 'The path to the vector field (e.g., /vector, /embedding)',
					},
					{
						displayName: 'Vector Type',
						name: 'vectorType',
						type: 'options',
						options: [
							{ name: 'Float32', value: 'float32' },
							{ name: 'Int8', value: 'int8' },
							{ name: 'UInt8', value: 'uint8' },
						],
						default: 'float32',
						description: 'The data type of the vector elements',
					},
					{
						displayName: 'Dimensions',
						name: 'dimensions',
						type: 'number',
						default: 1536,
						placeholder: '1536',
						description: 'The number of dimensions in the vector (e.g., 1536 for OpenAI embeddings)',
					},
					{
						displayName: 'Distance Function',
						name: 'distanceFunction',
						type: 'options',
						options: [
							{ name: 'Cosine', value: 'cosine' },
							{ name: 'Euclidean', value: 'euclidean' },
							{ name: 'Dot Product', value: 'dotproduct' },
						],
						default: 'cosine',
						description: 'The distance function to use for similarity calculations',
					},
					{
						displayName: 'Index Type',
						name: 'indexType',
						type: 'options',
						options: [
							{ name: 'Flat', value: 'flat' },
							{ name: 'Quantized Flat', value: 'quantizedFlat' },
							{ name: 'Disk ANN', value: 'diskANN' },
						],
						default: 'quantizedFlat',
						description: 'The type of vector index to use',
					},
				],
			},
			{
				displayName: 'Enable Full-Text Index',
				name: 'enableFullTextIndex',
				type: 'boolean',
				default: false,
				description: 'Whether to enable full-text search indexing',
				displayOptions: {
					show: {
						operation: ['createContainer'],
					},
				},
			},
			{
				displayName: 'Full-Text Index Paths',
				name: 'fullTextIndexPaths',
				type: 'string',
				default: '/text',
				placeholder: '/text,/content,/title',
				description: 'Comma-separated list of paths to index for full-text search (e.g., /text,/content,/title). You can specify multiple paths.',
				displayOptions: {
					show: {
						operation: ['createContainer'],
						enableFullTextIndex: [true],
					},
				},
			},
			{
				displayName: 'Database to Delete',
				name: 'databaseToDelete',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The database to delete',
				displayOptions: {
					show: {
						operation: ['deleteDatabase'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a database...',
						typeOptions: {
							searchListMethod: 'getDatabases',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-database',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9_-]+$',
									errorMessage: 'Database name can only contain letters, numbers, hyphens, and underscores',
								},
							},
						],
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-database',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9_-]+$',
									errorMessage: 'Database ID can only contain letters, numbers, hyphens, and underscores',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Database',
				name: 'databaseForContainerDelete',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The database containing the container to delete',
				displayOptions: {
					show: {
						operation: ['deleteContainer'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a database...',
						typeOptions: {
							searchListMethod: 'getDatabases',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-database',
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-database',
					},
				],
			},
			{
				displayName: 'Container',
				name: 'containerToDelete',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The container to delete',
				displayOptions: {
					show: {
						operation: ['deleteContainer'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a container...',
						typeOptions: {
							searchListMethod: 'getContainers',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'my-container',
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-container',
					},
				],
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
			const refreshBeforeExpirySeconds = (entraIdCredentials.refreshBeforeExpirySeconds as number) || 900;

			// Check if token needs refresh based on buffer
			const expiresAt = oauthTokenData.expires_at ? new Date(oauthTokenData.expires_at).getTime() : 0;
			const now = Date.now();
			const timeUntilExpiry = (expiresAt - now) / 1000; // seconds

			if (timeUntilExpiry < refreshBeforeExpirySeconds) {
				// Token will expire soon, trigger refresh by making a lightweight API call
				// This will cause n8n's OAuth2 mechanism to refresh the token if it's expired
				this.logger.info(`Token expires in ${Math.floor(timeUntilExpiry / 60)} minutes, refreshing...`);
				try {
					// Use Cosmos DB REST API to list databases (lightweight operation)
					// This endpoint will return 401 if token is expired, triggering n8n's auto-refresh
					await this.helpers.httpRequestWithAuthentication.call(
						this,
						'azureCosmosSdkEntraIdApi',
						{
							method: 'GET',
							url: `${endpoint.replace(/\/$/, '')}/dbs`,
							headers: {
								'x-ms-version': '2018-12-31',
							},
						},
					);
					this.logger.info('✅ Token refreshed successfully via Cosmos DB API call');
				} catch (error) {
					this.logger.warn('Token refresh attempt failed, continuing with existing token');
				}
			} else {
				this.logger.info(`✓ Token still valid, expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
			}

			// Create a custom TokenCredential using the delegated OAuth token
			const tokenCredential: TokenCredential = {
				async getToken() {
					// Use the access token from Microsoft OAuth2 credential
					// n8n handles token refresh automatically via the microsoftOAuth2Api credential
					return {
						token: oauthTokenData.access_token,
						expiresOnTimestamp: expiresAt || Date.now() + (3600 * 1000),
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

				if (operation === 'createDatabase' || operation === 'createContainer' || operation === 'deleteDatabase' || operation === 'deleteContainer') {
					// These operations handle their own database/container access
					// Continue to operation-specific logic below
				} else {
					// For all other operations, get database and container from resourceLocators
					const databaseName = this.getNodeParameter('databaseName', itemIndex, '', { extractValue: true }) as string;
					const containerName = this.getNodeParameter('containerName', itemIndex, '', { extractValue: true }) as string;

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

						// Handle case where no documents match the query
						if (!resources || resources.length === 0) {
							returnData.push({
								json: {
									success: true,
									deletedCount: 0,
									totalQueried: 0,
									deletedIds: [],
									message: 'No documents matched the query',
								},
								pairedItem: itemIndex,
							});
							continue;
						}

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
			}

				if (operation === 'createDatabase') {
					// CREATE DATABASE operation
					const newDatabaseName = this.getNodeParameter('newDatabaseName', itemIndex) as string;
					const databaseThroughput = this.getNodeParameter('databaseThroughput', itemIndex) as number;

					try {
						const dbOptions: any = { id: newDatabaseName };
						
						// Add throughput if specified (minimum 400 RU/s)
						if (databaseThroughput && databaseThroughput >= 400) {
							dbOptions.throughput = databaseThroughput;
						}

						const { statusCode, database } = await (client as any).databases.createIfNotExists(dbOptions);

						returnData.push({
							json: {
								success: true,
								statusCode,
								databaseId: database.id,
								throughput: databaseThroughput || 'serverless/container-level',
								message: statusCode === 201 
									? `Database '${newDatabaseName}' created successfully`
									: `Database '${newDatabaseName}' already exists`,
							},
							pairedItem: itemIndex,
						});
					} catch (error) {
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex,
						});
					}
				} else if (operation === 'createContainer') {
					// CREATE CONTAINER operation
					const database = this.getNodeParameter('database', itemIndex, '', { extractValue: true }) as string;
					const dbName = database;
					const newContainerName = this.getNodeParameter('newContainerName', itemIndex) as string;
					const partitionKeyPath = this.getNodeParameter('partitionKeyPath', itemIndex) as string;
					const containerThroughput = this.getNodeParameter('containerThroughput', itemIndex) as number;
					const enableVectorIndex = this.getNodeParameter('enableVectorIndex', itemIndex) as boolean;
					const enableFullTextIndex = this.getNodeParameter('enableFullTextIndex', itemIndex) as boolean;

					try {
						const database = client.database(dbName);
						
						// Build container definition
						const containerDef: any = {
							id: newContainerName,
							partitionKey: {
								paths: [partitionKeyPath],
								kind: 'Hash',
							},
						};

						// Build indexing policy
						const indexingPolicy: any = {
							automatic: true,
							indexingMode: 'consistent',
							includedPaths: [{ path: '/*' }],
							excludedPaths: [{ path: '/"_etag"/?' }],
						};

						// Add vector index configuration
						if (enableVectorIndex) {
							const vectorConfig = this.getNodeParameter('vectorIndexConfig', itemIndex, {}) as {
								vectorPath?: string;
								vectorType?: string;
								dimensions?: number;
								distanceFunction?: string;
								indexType?: string;
							};

							const vectorPath = vectorConfig.vectorPath || '/vector';
							const vectorType = vectorConfig.vectorType || 'float32';
							const dimensions = vectorConfig.dimensions || 1536;
							const distanceFunction = vectorConfig.distanceFunction || 'cosine';
							const indexType = vectorConfig.indexType || 'quantizedFlat';

							// Add vector embedding policy
							containerDef.vectorEmbeddingPolicy = {
								vectorEmbeddings: [
									{
										path: vectorPath,
										dataType: vectorType,
										dimensions: dimensions,
										distanceFunction: distanceFunction,
									},
								],
							};

							// Add vector index to indexing policy
							if (!indexingPolicy.vectorIndexes) {
								indexingPolicy.vectorIndexes = [];
							}
							indexingPolicy.vectorIndexes.push({
								path: vectorPath,
								type: indexType,
							});

							// Exclude vector path from regular indexing to save RU/s
							indexingPolicy.excludedPaths.push({ path: `${vectorPath}/*` });
						}

						// Add full-text index configuration
						if (enableFullTextIndex) {
							const fullTextPaths = this.getNodeParameter('fullTextIndexPaths', itemIndex) as string;
							const paths = fullTextPaths
								.split(',')
								.map(p => p.trim())
								.filter(p => p.length > 0);

							// Add full-text policy at container level
							containerDef.fullTextPolicy = {
								defaultLanguage: 'en-US',
								fullTextPaths: paths.map(path => ({
									path: path,
									language: 'en-US',
								})),
							};

							// Add full-text indexes to indexing policy
							if (!indexingPolicy.fullTextIndexes) {
								indexingPolicy.fullTextIndexes = [];
							}

							for (const path of paths) {
								indexingPolicy.fullTextIndexes.push({
									path: path,
								});
							}
						}

						containerDef.indexingPolicy = indexingPolicy;

						// Add throughput if specified
						const createOptions: any = {};
						if (containerThroughput && containerThroughput >= 400) {
							createOptions.throughput = containerThroughput;
						}

						const { statusCode, container: newContainer } = await database.containers.createIfNotExists(
							containerDef,
							createOptions,
						);

						const responseData: any = {
							success: true,
							statusCode,
							containerId: newContainer.id,
							databaseId: dbName,
							partitionKey: partitionKeyPath,
							throughput: containerThroughput || 'inherited/serverless',
						};

						if (enableVectorIndex) {
							const vectorConfig = this.getNodeParameter('vectorIndexConfig', itemIndex, {}) as any;
							responseData.vectorIndex = {
								enabled: true,
								path: vectorConfig.vectorPath || '/vector',
								type: vectorConfig.indexType || 'quantizedFlat',
								dimensions: vectorConfig.dimensions || 1536,
								distanceFunction: vectorConfig.distanceFunction || 'cosine',
							};
						}

						if (enableFullTextIndex) {
							const fullTextPaths = this.getNodeParameter('fullTextIndexPaths', itemIndex) as string;
							responseData.fullTextIndex = {
								enabled: true,
								paths: fullTextPaths.split(',').map(p => p.trim()),
							};
						}

						responseData.message = statusCode === 201
							? `Container '${newContainerName}' created successfully in database '${dbName}'`
							: `Container '${newContainerName}' already exists in database '${dbName}'`;

						returnData.push({
							json: responseData,
							pairedItem: itemIndex,
						});
					} catch (error) {
						const cosmosError = error as { code?: number };
						if (cosmosError.code === 409) {
							throw new NodeOperationError(this.getNode(), `Container '${newContainerName}' already exists in database '${dbName}'`, {
								itemIndex,
							});
						}
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex,
						});
					}
				}

				if (operation === 'deleteDatabase') {
					// DELETE DATABASE operation
					const databaseToDelete = this.getNodeParameter('databaseToDelete', itemIndex, '', { extractValue: true }) as string;

					try {
						const database = client.database(databaseToDelete);
						await database.delete();

						returnData.push({
							json: {
								success: true,
								databaseId: databaseToDelete,
								message: `Database '${databaseToDelete}' deleted successfully`,
							},
							pairedItem: itemIndex,
						});
					} catch (error) {
						const cosmosError = error as { code?: number };
						if (cosmosError.code === 404) {
							throw new NodeOperationError(this.getNode(), `Database '${databaseToDelete}' not found`, {
								itemIndex,
							});
						}
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex,
						});
					}
				}

				if (operation === 'deleteContainer') {
					// DELETE CONTAINER operation
					const databaseName = this.getNodeParameter('databaseForContainerDelete', itemIndex, '', { extractValue: true }) as string;
					const containerToDelete = this.getNodeParameter('containerToDelete', itemIndex, '', { extractValue: true }) as string;

					try {
						const database = client.database(databaseName);
						const container = database.container(containerToDelete);
						await container.delete();

						returnData.push({
							json: {
								success: true,
								containerId: containerToDelete,
								databaseId: databaseName,
								message: `Container '${containerToDelete}' deleted successfully from database '${databaseName}'`,
							},
							pairedItem: itemIndex,
						});
					} catch (error) {
						const cosmosError = error as { code?: number };
						if (cosmosError.code === 404) {
							throw new NodeOperationError(this.getNode(), `Container '${containerToDelete}' not found in database '${databaseName}'`, {
								itemIndex,
							});
						}
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex,
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

	methods = {
		listSearch: {
			async getDatabases(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const authenticationType = this.getNodeParameter('authenticationType', 0) as string;
				let client: CosmosClient;

				try {
					if (authenticationType === 'entraId') {
						// Use Entra ID authentication
						const credentials = await this.getCredentials('azureCosmosSdkEntraIdApi');
						const endpoint = credentials.endpoint as string;
						const oauthTokenData = credentials.oauthTokenData as any;

						if (!oauthTokenData?.access_token) {
							throw new Error('No valid access token available. Please re-authenticate.');
						}

						const tokenCredential: TokenCredential = {
							getToken: async () => ({
								token: oauthTokenData.access_token,
								expiresOnTimestamp: oauthTokenData.expires_at 
									? new Date(oauthTokenData.expires_at).getTime() 
									: Date.now() + 3600000,
							}),
						};

						client = new CosmosClient({
							endpoint,
							aadCredentials: tokenCredential,
						});
					} else {
						// Use master key authentication
						const credentials = await this.getCredentials('azureCosmosSdkApi');
						const endpoint = credentials.endpoint as string;
						const key = credentials.key as string;
						client = new CosmosClient({ endpoint, key });
					}

					// Fetch databases using the SDK
					const { resources: databases } = await (client as any).databases.readAll().fetchAll();

					// Map databases to options format
					let results: INodePropertyOptions[] = databases.map((db: any) => ({
						name: db.id,
						value: db.id,
					}));

					// Apply filter if provided
					if (filter) {
						const filterLower = filter.toLowerCase();
						results = results.filter((db) => db.name.toLowerCase().includes(filterLower));
					}

					return {
						results: results.sort((a, b) => a.name.localeCompare(b.name)),
					};
				} catch (error) {
					throw new Error(`Failed to load databases: ${error.message}`);
				}
			},
			async getContainers(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const authenticationType = this.getNodeParameter('authenticationType', 0) as string;
				let client: CosmosClient;

				try {
					if (authenticationType === 'entraId') {
						// Use Entra ID authentication
						const credentials = await this.getCredentials('azureCosmosSdkEntraIdApi');
						const endpoint = credentials.endpoint as string;
						const oauthTokenData = credentials.oauthTokenData as any;

						if (!oauthTokenData?.access_token) {
							throw new Error('No valid access token available. Please re-authenticate.');
						}

						const tokenCredential: TokenCredential = {
							getToken: async () => ({
								token: oauthTokenData.access_token,
								expiresOnTimestamp: oauthTokenData.expires_at 
									? new Date(oauthTokenData.expires_at).getTime() 
									: Date.now() + 3600000,
							}),
						};

						client = new CosmosClient({
							endpoint,
							aadCredentials: tokenCredential,
						});
					} else {
						// Use master key authentication
						const credentials = await this.getCredentials('azureCosmosSdkApi');
						const endpoint = credentials.endpoint as string;
						const key = credentials.key as string;
						client = new CosmosClient({ endpoint, key });
					}

					// Get the selected database name
					const databaseParam = this.getNodeParameter('databaseForContainerDelete', 0) as any;
					const databaseName = typeof databaseParam === 'string' ? databaseParam : (databaseParam?.value || '');
					
					if (!databaseName) {
						return { results: [] };
					}

					const database = client.database(databaseName);

					// Fetch containers using the SDK
					const { resources: containers } = await database.containers.readAll().fetchAll();

					// Map containers to options format
					let results: INodePropertyOptions[] = containers.map((container: any) => ({
						name: container.id,
						value: container.id,
					}));

					// Apply filter if provided
					if (filter) {
						const filterLower = filter.toLowerCase();
						results = results.filter((c) => c.name.toLowerCase().includes(filterLower));
					}

					return {
						results: results.sort((a, b) => a.name.localeCompare(b.name)),
					};
				} catch (error) {
					throw new Error(`Failed to load containers: ${error.message}`);
				}
			},
			async getContainersForDocOps(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const authenticationType = this.getNodeParameter('authenticationType', 0) as string;
				let client: CosmosClient;

				try {
					if (authenticationType === 'entraId') {
						// Use Entra ID authentication
						const credentials = await this.getCredentials('azureCosmosSdkEntraIdApi');
						const endpoint = credentials.endpoint as string;
						const oauthTokenData = credentials.oauthTokenData as any;

						if (!oauthTokenData?.access_token) {
							throw new Error('No valid access token available. Please re-authenticate.');
						}

						const tokenCredential: TokenCredential = {
							getToken: async () => ({
								token: oauthTokenData.access_token,
								expiresOnTimestamp: oauthTokenData.expires_at 
									? new Date(oauthTokenData.expires_at).getTime() 
									: Date.now() + 3600000,
							}),
						};

						client = new CosmosClient({
							endpoint,
							aadCredentials: tokenCredential,
						});
					} else {
						// Use master key authentication
						const credentials = await this.getCredentials('azureCosmosSdkApi');
						const endpoint = credentials.endpoint as string;
						const key = credentials.key as string;
						client = new CosmosClient({ endpoint, key });
					}

					// Get the selected database name for document operations
					const databaseParam = this.getNodeParameter('databaseName', 0) as any;
					const databaseName = typeof databaseParam === 'string' ? databaseParam : (databaseParam?.value || '');
					
					if (!databaseName) {
						return { results: [] };
					}

					const database = client.database(databaseName);

					// Fetch containers using the SDK
					const { resources: containers } = await database.containers.readAll().fetchAll();

					// Map containers to options format
					let results: INodePropertyOptions[] = containers.map((container: any) => ({
						name: container.id,
						value: container.id,
					}));

					// Apply filter if provided
					if (filter) {
						const filterLower = filter.toLowerCase();
						results = results.filter((c) => c.name.toLowerCase().includes(filterLower));
					}

					return {
						results: results.sort((a, b) => a.name.localeCompare(b.name)),
					};
				} catch (error) {
					throw new Error(`Failed to load containers: ${error.message}`);
				}
			},
		},
	};
}
