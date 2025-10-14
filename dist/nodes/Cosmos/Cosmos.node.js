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
    }
    async execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('cosmosDbApi');
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
                    if (!document.id) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Document must include an ID field', {
                            itemIndex,
                        });
                    }
                    const containerDef = await container.read();
                    const partitionKeyPath = ((_d = (_c = (_b = (_a = containerDef.resource) === null || _a === void 0 ? void 0 : _a.partitionKey) === null || _b === void 0 ? void 0 : _b.paths) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.replace('/', '')) || 'id';
                    if (!Object.prototype.hasOwnProperty.call(document, partitionKeyPath)) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Document must include the partition key field '${partitionKeyPath}'. Add this field to your document.`, { itemIndex });
                    }
                    try {
                        const { resource } = await container.items.create(document);
                        if (!resource) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Insert operation did not return a resource', {
                                itemIndex,
                            });
                        }
                        returnData.push({
                            json: resource,
                            pairedItem: itemIndex,
                        });
                    }
                    catch (error) {
                        const cosmosError = error;
                        if (cosmosError.code === 409) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Document with ID '${document.id}' already exists. Use Create or Update operation to update existing documents.`, {
                                itemIndex,
                            });
                        }
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, {
                            itemIndex,
                        });
                    }
                }
                else if (operation === 'upsert') {
                    const documentJson = this.getNodeParameter('document', itemIndex);
                    const document = typeof documentJson === 'string' ? JSON.parse(documentJson) : documentJson;
                    if (!document.id) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Document must include an ID field', {
                            itemIndex,
                        });
                    }
                    const containerDef = await container.read();
                    const partitionKeyPath = ((_h = (_g = (_f = (_e = containerDef.resource) === null || _e === void 0 ? void 0 : _e.partitionKey) === null || _f === void 0 ? void 0 : _f.paths) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.replace('/', '')) || 'id';
                    if (!Object.prototype.hasOwnProperty.call(document, partitionKeyPath)) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Document must include the partition key field '${partitionKeyPath}'. Add this field to your document.`, { itemIndex });
                    }
                    const { resource } = await container.items.upsert(document);
                    returnData.push({
                        json: resource || document,
                        pairedItem: itemIndex,
                    });
                }
                else if (operation === 'delete') {
                    const deleteMode = this.getNodeParameter('deleteMode', itemIndex);
                    if (deleteMode === 'byId') {
                        const documentId = this.getNodeParameter('documentId', itemIndex);
                        const partitionKeyValue = this.getNodeParameter('partitionKeyValue', itemIndex);
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
                        }
                        catch (error) {
                            const cosmosError = error;
                            if (cosmosError.code === 404) {
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Document with ID '${documentId}' and partition key '${partitionKeyValue}' not found`, {
                                    itemIndex,
                                });
                            }
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, {
                                itemIndex,
                            });
                        }
                    }
                    else {
                        const deleteQuery = this.getNodeParameter('deleteQuery', itemIndex);
                        const { resources } = await container.items.query(deleteQuery).fetchAll();
                        let deletedCount = 0;
                        const deletedIds = [];
                        const errors = [];
                        const containerDef = await container.read();
                        const partitionKeyPath = ((_m = (_l = (_k = (_j = containerDef.resource) === null || _j === void 0 ? void 0 : _j.partitionKey) === null || _k === void 0 ? void 0 : _k.paths) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.replace('/', '')) || 'id';
                        if (resources.length > 0 && !Object.prototype.hasOwnProperty.call(resources[0], partitionKeyPath)) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Query must include the partition key field '${partitionKeyPath}'. ` +
                                `Use: SELECT * FROM c WHERE ... or SELECT c.id, c.${partitionKeyPath} FROM c WHERE ...`, { itemIndex });
                        }
                        for (const resource of resources) {
                            if (!resource.id) {
                                errors.push({ id: 'unknown', error: 'Document missing id field' });
                                continue;
                            }
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
                            }
                            catch (error) {
                                const err = error;
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