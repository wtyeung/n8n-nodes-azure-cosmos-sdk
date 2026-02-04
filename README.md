# n8n-nodes-azure-cosmos-sdk

This is an n8n community node for Azure Cosmos DB. It provides **complete SQL query freedom** using the official **Azure Cosmos DB SDK**, enabling advanced features like **hybrid search**, **vector similarity search**, and **Microsoft Entra ID authentication**.

## Why Use This Node?

Unlike the native n8n Cosmos DB node (which uses REST API), this implementation:

- ✅ **Uses Azure Cosmos DB SDK** (not REST API) for full feature support
- ✅ **Complete query freedom** - write any SQL query including hybrid search
- ✅ **Vector similarity search** - supports `VectorDistance()` and hybrid search queries
- ✅ **Vector field exclusion** - optionally exclude large embedding fields to reduce payload
- ✅ **Role-Based Access Control (RBAC)** - supports Microsoft Entra ID authentication with granular permissions
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

This node supports comprehensive operations for Azure Cosmos DB databases and containers:

### Database Operations

#### Create Database

Create a new Cosmos DB database:

- **Database Name**: Unique identifier for the database
- **Throughput (RU/s)**: Optional provisioned throughput (minimum 400 RU/s, or 0 for serverless)
- **Idempotent**: Returns existing database if already exists (status code 200 vs 201)

#### Delete Database

Delete a database and all its containers:

- **Database Selection**: Choose from list or enter name/ID manually
- **Dynamic Loading**: Select from existing databases dropdown
- **Error Handling**: Returns 404 if database not found

### Container Operations

#### Create Container

Create a new container with advanced indexing:

- **Database Selection**: Choose from list or enter name/ID manually
- **Container Name**: Unique identifier for the container
- **Partition Key**: Required path (e.g., `/category`, `/userId`)
- **Throughput (RU/s)**: Optional container-level throughput
- **Vector Index**: Optional vector similarity search configuration
  - Vector path, type (float32/int8/uint8), dimensions
  - Distance function (cosine, dotproduct, euclidean)
  - Index type (quantizedFlat, diskANN, flat)
- **Full-Text Index**: Optional full-text search on specified paths
- **Idempotent**: Returns existing container if already exists

#### Delete Container

Delete a container from a database:

- **Database Selection**: Choose from list or enter name/ID manually
- **Container Selection**: Choose from list or enter name/ID manually
- **Dynamic Loading**: Container list updates based on selected database
- **Error Handling**: Returns 404 if container not found

### Document Operations

#### Select (Query Documents)

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

#### Insert (Create Document)

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

#### Create or Update (Upsert)

Create a new document or update if it already exists:

- **Idempotent**: Safe to run multiple times
- **Automatic Merge**: Updates existing documents with new data

#### Delete

Delete documents from a container:

- **By ID**: Delete a specific document by ID and partition key
- **By Query**: Delete multiple documents matching a SQL query

## Credentials

This node supports two authentication methods:

### Option 1: Master Key Authentication (Default)

1. **Azure Cosmos DB Account**: Sign up at [Azure Portal](https://portal.azure.com/)
2. **Endpoint URL**: Your Cosmos DB account endpoint (e.g., `https://your-account.documents.azure.com:443/`)
3. **Access Key**: Primary or secondary key from Azure Portal → Your Cosmos DB Account → Keys

The credential test uses **HMAC-SHA256 signature authentication** with master keys to verify your connection by listing databases.

### Option 2: Microsoft Entra ID (Azure AD) Authentication with RBAC

For enhanced security using OAuth2 user delegation and **Role-Based Access Control (RBAC)**:

This credential **extends n8n's Microsoft OAuth2 API** credential, which handles the OAuth2 authorization code flow and automatic token refresh.

**RBAC Benefits:**
- ✅ **Granular permissions** - Assign specific roles (Data Reader, Data Contributor, etc.) instead of full access
- ✅ **Auditable** - All operations are tied to the authenticated user's identity
- ✅ **Revocable** - Remove access without changing master keys
- ✅ **Secure** - No need to share master keys across teams

**Setup Steps:**
1. Create an App Registration in Azure Portal → Microsoft Entra ID
2. Add redirect URI: `https://your-n8n-instance/rest/oauth2-credential/callback`
3. Under "API permissions", add delegated permission: `Azure Cosmos DB` → `user_impersonation`
4. Grant admin consent for the permission
5. **Assign Cosmos DB RBAC roles** to users in Azure Portal → Cosmos DB Account → Access Control (IAM):
   - **Cosmos DB Built-in Data Reader** - Read-only access to data
   - **Cosmos DB Built-in Data Contributor** - Read and write access to data
   - Custom roles for fine-grained control
6. In n8n, create a "Microsoft OAuth2 API" credential with:
   - **Scope**: `https://cosmos.azure.com/user_impersonation offline_access`
   - Your app's Client ID and Client Secret
7. Create "Azure Cosmos DB SDK (Entra ID) API" credential:
   - Select your Microsoft OAuth2 credential
   - Enter your Cosmos DB endpoint URL
   - Configure token refresh buffer (optional, default: 900 seconds)

**Scopes Used:** `https://cosmos.azure.com/user_impersonation` with `offline_access` for token refresh

The node uses **user delegation** (on-behalf-of the authenticated user) with the Azure Cosmos DB SDK. Access is controlled by the RBAC roles assigned to the user.

## Compatibility

- **Minimum n8n version**: 1.0.0
- **Node.js version**: >=20.0.0
- **Azure Cosmos DB SDK**: @azure/cosmos ^4.2.1

## Usage

### Create Database

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials
3. Choose **Create Database** operation
4. Enter:
   - **Database Name**: Unique name for your database
   - **Throughput (RU/s)**: Set to 0 for serverless, or minimum 400 for provisioned

### Create Container with Vector Search

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials
3. Choose **Create Container** operation
4. Select or enter **Database** name
5. Enter **Container Name** and **Partition Key Path** (e.g., `/category`)
6. Enable **Vector Index** and configure:
   - **Vector Path**: `/embedding` or `/vector`
   - **Dimensions**: 1536 (for OpenAI embeddings) or your model's dimension
   - **Distance Function**: `cosine` (recommended for most use cases)
   - **Index Type**: `quantizedFlat` (balanced) or `diskANN` (high performance)
7. Optionally enable **Full-Text Index** with paths like `/text,/content`

### Select Operation

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials
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

### Delete Database or Container

1. Add the **Azure Cosmos DB (SDK)** node to your workflow
2. Select or create credentials
3. Choose **Delete Database** or **Delete Container** operation
4. Select the resource from the dropdown or enter manually
5. For containers, select the database first, then the container list will load automatically

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Azure Cosmos DB documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Cosmos DB SQL query reference](https://docs.microsoft.com/en-us/azure/cosmos-db/sql-query-getting-started)
- [Vector search in Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/vector-search)
- [Azure Cosmos DB SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/cosmosdb/cosmos)
