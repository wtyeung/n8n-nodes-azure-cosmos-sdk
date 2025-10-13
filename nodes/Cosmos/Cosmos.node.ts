import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { CosmosClient } from '@azure/cosmos';

export class Cosmos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HKU Cosmos DB',
		name: 'cosmos',
		icon: 'fa:cloud',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		description: 'Query Azure Cosmos DB using SQL',
		defaults: {
			name: 'HKU Cosmos DB',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'cosmosDbApi',
				required: true,
			},
		],
		properties: [
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
						name: 'Upsert',
						value: 'upsert',
						description: 'Insert or update a document (creates if not exists, replaces if exists)',
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
				description: 'SQL query to select documents to delete. Use SELECT * to include all fields needed for deletion (id and partition key).',
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
				placeholder: '{"id": "123", "name": "Example"}',
				description: 'The document to insert as JSON. Must include an "id" field.',
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

		// Get credentials
		const credentials = await this.getCredentials('cosmosDbApi');
		const endpoint = credentials.endpoint as string;
		const key = credentials.key as string;

		const client = new CosmosClient({ endpoint, key });

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
						throw new Error('Document must include an "id" field');
					}

					try {
						// Insert the document
						const { resource } = await container.items.create(document);

						returnData.push({
							json: resource,
							pairedItem: itemIndex,
						});
					} catch (error: any) {
						if (error.code === 409) {
							throw new Error(`Document with ID '${document.id}' already exists. Use Upsert operation to update existing documents.`);
						}
						throw error;
					}
				} else if (operation === 'upsert') {
					// UPSERT operation
					const documentJson = this.getNodeParameter('document', itemIndex) as string;
					const document = typeof documentJson === 'string' ? JSON.parse(documentJson) : documentJson;

					if (!document.id) {
						throw new Error('Document must include an "id" field');
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
						} catch (error: any) {
							if (error.code === 404) {
								throw new Error(`Document with ID '${documentId}' and partition key '${partitionKeyValue}' not found`);
							}
							throw error;
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
						if (resources.length > 0 && !resources[0].hasOwnProperty(partitionKeyPath)) {
							throw new Error(
								`Query must include the partition key field '${partitionKeyPath}'. ` +
								`Use: SELECT * FROM c WHERE ... or SELECT c.id, c.${partitionKeyPath} FROM c WHERE ...`
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
							} catch (error: any) {
								errors.push({
									id: resource.id,
									error: error.message || String(error)
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
