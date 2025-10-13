"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cosmos = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const cosmos_1 = require("@azure/cosmos");
class Cosmos {
    constructor() {
        this.description = {
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
                            description: 'Insert a new document',
                            action: 'Insert a document',
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
                    displayName: 'Document',
                    name: 'document',
                    type: 'json',
                    default: '{}',
                    required: true,
                    placeholder: '{"id": "1", "name": "Example"}',
                    description: 'The document to insert as JSON',
                    displayOptions: {
                        show: {
                            operation: ['insert'],
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('cosmosDb');
        const endpoint = credentials.endpoint;
        const key = credentials.key;
        const client = new cosmos_1.CosmosClient({ endpoint, key });
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                const databaseName = this.getNodeParameter('databaseName', itemIndex);
                const containerName = this.getNodeParameter('containerName', itemIndex);
                const database = client.database(databaseName);
                const container = database.container(containerName);
                if (operation === 'select') {
                    const sqlQuery = this.getNodeParameter('sqlQuery', itemIndex);
                    const options = this.getNodeParameter('options', itemIndex, {});
                    const { resources } = await container.items.query(sqlQuery).fetchAll();
                    for (const resource of resources) {
                        let processedResource = resource;
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
                }
                else if (operation === 'insert') {
                    const documentJson = this.getNodeParameter('document', itemIndex);
                    const document = typeof documentJson === 'string' ? JSON.parse(documentJson) : documentJson;
                    const { resource } = await container.items.create(document);
                    returnData.push({
                        json: resource,
                        pairedItem: itemIndex,
                    });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: itemIndex,
                    });
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, {
                        itemIndex,
                    });
                }
            }
        }
        return [returnData];
    }
}
exports.Cosmos = Cosmos;
//# sourceMappingURL=Cosmos.node.js.map