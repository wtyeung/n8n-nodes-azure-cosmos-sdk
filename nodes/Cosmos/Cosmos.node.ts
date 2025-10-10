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
				name: 'cosmosDb',
				required: true,
			},
		],
		properties: [
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
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
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
		const credentials = await this.getCredentials('cosmosDb');
		const endpoint = credentials.endpoint as string;
		const key = credentials.key as string;

		const client = new CosmosClient({ endpoint, key });

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const databaseName = this.getNodeParameter('databaseName', itemIndex) as string;
				const containerName = this.getNodeParameter('containerName', itemIndex) as string;
				const sqlQuery = this.getNodeParameter('sqlQuery', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as {
					excludeVectorFields?: boolean;
					vectorFieldNames?: string;
				};

				const database = client.database(databaseName);
				const container = database.container(containerName);

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
