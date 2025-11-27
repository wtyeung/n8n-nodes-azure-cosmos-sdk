# n8n-nodes-azure-cosmos-sdk

This is an n8n community node for Azure Cosmos DB. It provides **complete SQL query freedom** using the official **Azure Cosmos DB SDK**, enabling advanced features like **hybrid search**, **vector similarity search**, and **Microsoft Entra ID authentication**.

## Why Use This Node?

Unlike the native n8n Cosmos DB node (which uses REST API), this implementation:

- ✅ **Uses Azure Cosmos DB SDK** (not REST API) for full feature support
- ✅ **Complete query freedom** - write any SQL query including hybrid search
- ✅ **Vector similarity search** - supports `VectorDistance()` and hybrid search queries
- ✅ **Vector field exclusion** - optionally exclude large embedding fields to reduce payload
- ✅ **Modern SDK features** - access to latest Cosmos DB capabilities

> **Note:** Hybrid search and vector similarity features (`VectorDistance()`, `RRF()`, etc.) are **only available through the SDK**. The NoSQL REST API does not support these advanced query capabilities. This is why this node uses the official Azure Cosmos DB SDK instead of REST API.

Azure Cosmos DB is a fully managed NoSQL and relational database for modern app development with vector database support.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Development

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Run in development mode
npm run dev
```

## Operations

This node supports multiple operations against Azure Cosmos DB containers:

### Select (Query Documents)

Execute **full SQL queries** with complete freedom:

- **Any SQL Query**: Write any Cosmos DB SQL query
- **Hybrid Search**: Combine vector similarity search with traditional filters
- **Vector Similarity**: Use `VectorDistance()` function for semantic search
- **Vector Field Exclusion**: Option to exclude vector/embedding fields from results to reduce payload size

**Example Queries:**

Basic Query:
```sql
SELECT * FROM c WHERE c.status = "active"
```

Vector Similarity Search:
```sql
SELECT TOP 10 c.id, c.title, VectorDistance(c.embedding, [0.1, 0.2, ...]) AS similarity
FROM c
ORDER BY VectorDistance(c.embedding, [0.1, 0.2, ...])
```

Hybrid Search (Vector + Filters):
```sql
SELECT TOP 10 c.id, c.title, VectorDistance(c.embedding, [0.1, 0.2, ...]) AS similarity
FROM c
WHERE c.category = "research" AND c.year >= 2023
ORDER BY VectorDistance(c.embedding, [0.1, 0.2, ...])
```

### Insert (Create Document)

Insert new documents into a container:

- **JSON Input**: Provide document as JSON
- **Auto-generated Metadata**: Returns document with Cosmos DB metadata (`_rid`, `_self`, `_etag`, etc.)
- **Partition Key Support**: Automatically handles partition keys

**Example:**
```json
{
  "id": "unique-id-123",
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active"
}
```

## Credentials

This node supports two authentication methods:

### Option 1: Master Key Authentication (Default)

1. **Azure Cosmos DB Account**: Sign up at [Azure Portal](https://portal.azure.com/)
2. **Endpoint URL**: Your Cosmos DB account endpoint (e.g., `https://your-account.documents.azure.com:443/`)
3. **Access Key**: Primary or secondary key from Azure Portal → Your Cosmos DB Account → Keys

The credential test uses **HMAC-SHA256 signature authentication** with master keys to verify your connection by listing databases.

### Option 2: Microsoft Entra ID (Azure AD) Authentication

For enhanced security using OAuth2 user delegation and role-based access control (RBAC):

This credential **extends n8n's Microsoft OAuth2 API** credential, which handles the OAuth2 authorization code flow and automatic token refresh.

**Setup Steps:**
1. Create an App Registration in Azure Portal → Microsoft Entra ID
2. Add redirect URI: `https://your-n8n-instance/rest/oauth2-credential/callback`
3. Under "API permissions", add delegated permission: `Azure Cosmos DB` → `user_impersonation`
4. Grant admin consent for the permission
5. Assign the user appropriate Cosmos DB RBAC roles (e.g., "Cosmos DB Built-in Data Contributor")
6. In n8n, create a "Microsoft OAuth2 API" credential with:
   - **Scope**: `https://cosmos.azure.com/user_impersonation offline_access`
   - Your app's Client ID and Client Secret
7. Create "Azure Cosmos DB SDK (Entra ID) API" credential:
   - Select your Microsoft OAuth2 credential
   - Enter your Cosmos DB endpoint URL

**Scopes Used:** `https://cosmos.azure.com/user_impersonation` with `offline_access` for token refresh

The node uses **user delegation** (on-behalf-of the authenticated user) with the Azure Cosmos DB SDK.

## Compatibility

- **Minimum n8n version**: 1.0.0
- **Node.js version**: >=20.0.0
- **Azure Cosmos DB SDK**: @azure/cosmos ^4.2.1

## Usage

### Select Operation

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials with your Cosmos DB endpoint and access key
3. Choose **Select** operation
4. Enter:
   - **Database Name**: Your Cosmos DB database name
   - **Container Name**: Your container name
   - **SQL Query**: Your SQL query (e.g., `SELECT * FROM c WHERE c.status = "active"`)

**Excluding Vector Fields:**

When working with vector embeddings, you can reduce payload size:

1. Expand the **Options** section
2. Enable **Exclude Vector Fields**
3. Optionally customize **Vector Field Names** (default: `vector,embedding,embeddings`)

This is useful when vector data isn't needed in downstream nodes.

### Insert Operation

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials
3. Choose **Insert** operation
4. Enter:
   - **Database Name**: Your Cosmos DB database name
   - **Container Name**: Your container name
   - **Document**: JSON document to insert

**Tips:**
- The `id` field is required and must be unique
- Partition key must be included if your container uses one
- You can use expressions to dynamically generate documents from previous nodes

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Azure Cosmos DB documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Cosmos DB SQL query reference](https://docs.microsoft.com/en-us/azure/cosmos-db/sql-query-getting-started)
- [Vector search in Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/vector-search)
- [Azure Cosmos DB SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/cosmosdb/cosmos)
