# HKU Cosmos DB Node - Development Plan

This document contains the detailed specification and roadmap for the HKU Cosmos DB n8n node. Use this as context for AI-assisted coding sessions.

## Project Overview

**Package Name**: `@hku/n8n-nodes-cosmos`  
**Repository**: https://github.com/hku-official/n8n-nodes-cosmos-db  
**Purpose**: n8n community node for Azure Cosmos DB with full SDK support, hybrid search, and vector similarity capabilities

## Current Implementation Status

### ✅ Completed Features

#### Credentials
- **File**: `credentials/CosmosDb.credentials.ts`
- HMAC-SHA256 authentication for Cosmos DB REST API
- Credential test endpoint (lists databases)
- Fields: Endpoint URL, Access Key

#### Operations
1. **Select (Query Documents)**
   - Full SQL query support
   - Vector field exclusion option
   - Hybrid search support with `VectorDistance()`
   - Returns multiple documents as separate items

2. **Insert (Create Document)**
   - JSON document input
   - Returns created document with Cosmos DB metadata
   - Partition key support

#### Infrastructure
- GitHub Actions CI/CD workflow
- Automated deployment to Azure File Share
- TypeScript build pipeline
- Linting and code quality checks

### 🚧 Planned Features (Priority Order)

#### High Priority

1. **Update Operation**
   - Update existing documents by ID
   - Support for partial updates (patch)
   - Option to upsert (create if not exists)
   - Return updated document

2. **Delete Operation**
   - Delete documents by ID
   - Bulk delete support
   - Return deletion confirmation

3. **Upsert Operation**
   - Create or replace document
   - Atomic operation
   - Return created/updated document

#### Medium Priority

4. **Batch Operations**
   - Bulk insert multiple documents
   - Transactional batch support
   - Error handling for partial failures

5. **Advanced Query Options**
   - Pagination support (continuation token)
   - Max item count limit
   - Enable cross-partition queries option
   - Query metrics and diagnostics

6. **Stored Procedures**
   - Execute stored procedures
   - Pass parameters
   - Handle return values

#### Low Priority

7. **Container Management**
   - Create container
   - Delete container
   - Get container properties
   - Update container settings

8. **Database Management**
   - Create database
   - Delete database
   - List databases

9. **Performance Optimizations**
   - Connection pooling
   - Query result caching
   - Retry logic with exponential backoff

## Technical Architecture

### File Structure

```
@hku/n8n-nodes-cosmos/
├── credentials/
│   └── CosmosDb.credentials.ts      # Authentication & credential test
├── nodes/
│   └── Cosmos/
│       ├── Cosmos.node.ts           # Main node implementation
│       ├── Cosmos.node.json         # Node metadata
│       ├── cosmos.svg               # Light mode icon
│       └── cosmos.dark.svg          # Dark mode icon
├── dist/                            # Built JavaScript files
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI/CD pipeline
├── package.json
├── tsconfig.json
├── README.md
├── DEPLOYMENT.md
└── PLAN.md                          # This file
```

### Key Dependencies

- `@azure/cosmos`: ^4.2.1 - Official Azure Cosmos DB SDK
- `n8n-workflow`: * - n8n workflow types and utilities
- TypeScript: 5.9.2
- Node.js: >=20.0.0

### Design Patterns

1. **Operation-based routing**: Single node with operation selector
2. **SDK-first approach**: Use `@azure/cosmos` SDK, not REST API
3. **Error handling**: Continue-on-fail support with error objects
4. **Paired items**: Maintain input-output relationships

## Implementation Guidelines for AI Assistants

### Adding New Operations

When adding a new operation (e.g., Update, Delete):

1. **Update the operation selector** in `properties`:
   ```typescript
   {
     displayName: 'Operation',
     name: 'operation',
     type: 'options',
     options: [
       // ... existing operations
       {
         name: 'Update',
         value: 'update',
         description: 'Update an existing document',
         action: 'Update a document',
       },
     ],
   }
   ```

2. **Add operation-specific fields** with `displayOptions`:
   ```typescript
   {
     displayName: 'Document ID',
     name: 'documentId',
     type: 'string',
     required: true,
     displayOptions: {
       show: {
         operation: ['update'],
       },
     },
   }
   ```

3. **Implement the operation** in the `execute` method:
   ```typescript
   if (operation === 'update') {
     const documentId = this.getNodeParameter('documentId', itemIndex) as string;
     const updates = this.getNodeParameter('updates', itemIndex);
     
     const { resource } = await container.item(documentId).replace(updates);
     
     returnData.push({
       json: resource,
       pairedItem: itemIndex,
     });
   }
   ```

4. **Handle errors** appropriately:
   ```typescript
   catch (error) {
     if (this.continueOnFail()) {
       returnData.push({
         json: { error: error.message },
         pairedItem: itemIndex,
       });
     } else {
       throw new NodeOperationError(this.getNode(), error, { itemIndex });
     }
   }
   ```

### Code Style Guidelines

- Use TypeScript strict mode
- Follow n8n naming conventions (camelCase for parameters)
- Add descriptive placeholders and descriptions
- Use `displayOptions` to show/hide fields based on operation
- Always handle the `continueOnFail()` case
- Maintain `pairedItem` for input-output tracking

### Testing Checklist

Before committing new features:

1. ✅ Run `npm run lint` - no errors
2. ✅ Run `npm run build` - successful compilation
3. ✅ Test in n8n UI - all operations work
4. ✅ Test error cases - proper error handling
5. ✅ Test with continue-on-fail enabled
6. ✅ Update README.md with new operation examples
7. ✅ Update this PLAN.md with completion status

## Deployment Process

### Development
```bash
npm run build
# Auto-installs to ~/.n8n-node-cli/.n8n/nodes
# Restart n8n dev server
```

### Production (Azure File Share)

1. **Push to GitHub main branch**
2. **GitHub Actions automatically**:
   - Runs lint and build
   - Installs production dependencies
   - Uploads to Azure File Share at `n8nCustom/@hku/n8n-nodes-cosmos/`
3. **n8n Docker container** reads from mounted file share

### Required GitHub Secrets

- `AZURE_STORAGE_ACCOUNT`: Storage account name
- `AZURE_STORAGE_KEY`: Storage account access key
- `AZURE_FILE_SHARE_NAME`: File share name
- `AZURE_DESTINATION_PATH`: Target path (e.g., `n8nCustom/@hku/n8n-nodes-cosmos`)

## Known Issues & Limitations

### Current Limitations

1. **Icon resolution**: Custom SVG icons don't work with `N8N_CUSTOM_EXTENSIONS` path - using Font Awesome icon instead
2. **Partition keys**: Not explicitly handled - relies on SDK auto-detection
3. **Query pagination**: No support for continuation tokens yet
4. **Batch size**: No limit on query results (could cause memory issues)

### Future Improvements

1. Add partition key parameter for operations
2. Implement query pagination with continuation tokens
3. Add query timeout configuration
4. Support for change feed
5. Support for triggers (change feed based)
6. Better error messages with Cosmos DB error codes

## API Reference

### Cosmos DB SDK Methods Used

- `client.database(name)` - Get database reference
- `database.container(name)` - Get container reference
- `container.items.query(sql).fetchAll()` - Execute SQL query
- `container.items.create(document)` - Insert document
- `container.item(id, partitionKey).read()` - Read document (TODO)
- `container.item(id, partitionKey).replace(document)` - Update document (TODO)
- `container.item(id, partitionKey).delete()` - Delete document (TODO)

### Useful SDK Documentation

- [Container.items](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/items)
- [Container.item](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/item)
- [Query operations](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query/getting-started)
- [Batch operations](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/transactional-batch)

## Version History

### v0.1.0 (Current)
- Initial release
- Select (query) operation with hybrid search support
- Insert operation
- Vector field exclusion
- HMAC-SHA256 authentication
- GitHub Actions deployment to Azure File Share

### v0.2.0 (Planned)
- Update operation
- Delete operation
- Upsert operation
- Partition key support

### v0.3.0 (Planned)
- Batch operations
- Query pagination
- Advanced query options

## Contact & Maintenance

**Maintainer**: Tim Yeung (tim.yeung@hku.hk)  
**Organization**: HKU  
**License**: MIT

---

**Last Updated**: 2025-10-13  
**AI Assistant Note**: This document should be updated after each significant change or feature addition.
