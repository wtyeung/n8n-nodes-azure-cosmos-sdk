# Deployment Guide

This guide explains how to deploy `@hku/n8n-nodes-cosmos` as a private node.

## Option 1: Local Development (Current Setup)

Already configured! The `postbuild` script automatically installs to your local n8n:

```bash
npm run build
# Automatically installs to ~/.n8n-node-cli/.n8n/nodes
# Restart n8n if needed
```

## Option 2: Self-Hosted n8n (Direct Install)

Install directly from the local directory:

```bash
# Navigate to your n8n installation
cd /path/to/your/n8n

# Install the node
npm install /Users/timyeung/Documents/repo/n8n-nodes-hku-cosmos/@hku/n8n-nodes-cosmos

# Restart n8n
```

Or use environment variable:

```bash
export N8N_CUSTOM_EXTENSIONS="/Users/timyeung/Documents/repo/n8n-nodes-hku-cosmos/@hku/n8n-nodes-cosmos"
n8n start
```

## Option 3: Private npm Registry (Recommended for Teams)

### A. GitHub Packages (Private Repository)

1. **Update `package.json`** with repository info:

```json
{
  "name": "@hku/n8n-nodes-cosmos",
  "repository": {
    "type": "git",
    "url": "https://github.com/hku/n8n-nodes-cosmos.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. **Create `.npmrc` in the package root**:

```
@hku:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

3. **Publish to GitHub Packages**:

```bash
# Build the package
npm run build

# Login to GitHub Packages
npm login --registry=https://npm.pkg.github.com

# Publish
npm publish
```

4. **Install in n8n**:

```bash
# In n8n installation
npm install @hku/n8n-nodes-cosmos
```

### B. Private Git Repository

1. **Push to private Git repo** (GitHub/GitLab/Bitbucket)

2. **Install in n8n using Git URL**:

```bash
# SSH
npm install git+ssh://git@github.com:hku/n8n-nodes-cosmos.git

# HTTPS (with token)
npm install git+https://github.com/hku/n8n-nodes-cosmos.git
```

3. **Or add to n8n's `package.json`**:

```json
{
  "dependencies": {
    "@hku/n8n-nodes-cosmos": "git+ssh://git@github.com:hku/n8n-nodes-cosmos.git#main"
  }
}
```

### C. Verdaccio (Private npm Registry)

For organizations wanting their own npm registry:

1. **Set up Verdaccio** (one-time):

```bash
npm install -g verdaccio
verdaccio
# Runs on http://localhost:4873
```

2. **Configure npm to use Verdaccio**:

```bash
npm set registry http://localhost:4873
npm adduser --registry http://localhost:4873
```

3. **Publish**:

```bash
npm publish --registry http://localhost:4873
```

4. **Install in n8n**:

```bash
npm install @hku/n8n-nodes-cosmos --registry http://localhost:4873
```

## Option 4: Docker (Self-Hosted n8n)

### Using Custom Image

Create a `Dockerfile`:

```dockerfile
FROM n8nio/n8n:latest

USER root

# Copy the node package
COPY --chown=node:node . /tmp/n8n-nodes-cosmos

# Install the node
RUN cd /tmp/n8n-nodes-cosmos && \
    npm install && \
    npm run build && \
    cd /usr/local/lib/node_modules/n8n && \
    npm install /tmp/n8n-nodes-cosmos && \
    rm -rf /tmp/n8n-nodes-cosmos

USER node
```

Build and run:

```bash
docker build -t n8n-with-cosmos .
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8n-with-cosmos
```

### Using Volume Mount

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -v /Users/timyeung/Documents/repo/n8n-nodes-hku-cosmos/@hku/n8n-nodes-cosmos:/data/custom-nodes/@hku/n8n-nodes-cosmos \
  -e N8N_CUSTOM_EXTENSIONS="/data/custom-nodes/@hku/n8n-nodes-cosmos" \
  n8nio/n8n
```

## Option 5: n8n Cloud (Community Nodes)

If using n8n Cloud, install via the UI:

1. Go to **Settings** → **Community Nodes**
2. Click **Install a community node**
3. Enter the package name or Git URL
4. Click **Install**

**Note**: For private packages, you'll need to use a public npm registry or Git URL with authentication.

## Recommended Approach for HKU

For an organization like HKU, I recommend:

1. **Development**: Use Option 1 (current setup)
2. **Team Sharing**: Use Option 3B (Private Git Repository)
3. **Production**: Use Option 4 (Docker) with private Git install

### Quick Setup for Team

1. **Push to HKU private GitHub repo**
2. **Team members install via**:

```bash
# In their n8n installation
npm install git+ssh://git@github.com:hku/n8n-nodes-cosmos.git
```

3. **For Docker deployments**, use the Dockerfile approach above

## Updating the Node

After making changes:

```bash
# Build
npm run build

# Bump version in package.json
npm version patch  # or minor, major

# Republish (depending on method chosen)
npm publish  # or git push with new tag
```

Then users update with:

```bash
npm update @hku/n8n-nodes-cosmos
# or
npm install git+ssh://git@github.com:hku/n8n-nodes-cosmos.git
```
