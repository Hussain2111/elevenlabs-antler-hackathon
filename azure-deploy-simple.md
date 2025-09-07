# Simple Azure Deployment Guide

## Prerequisites

1. Install Azure CLI: `brew install azure-cli` (Mac) or download from Microsoft
2. Login: `az login`
3. Ensure Docker is running locally

## Option 1: Quick Deploy (Recommended)

Run the automated script:
```bash
./deploy-azure.sh
```

## Option 2: Step by Step

### 1. Create Resource Group
```bash
az group create --name gp-surgery-rg --location eastus
```

### 2. Create Container Apps Environment
```bash
az containerapp env create \
  --name gp-surgery-env \
  --resource-group gp-surgery-rg \
  --location eastus
```

### 3. Deploy from GitHub (No Docker registry needed)
```bash
az containerapp create \
  --name gp-surgery-app \
  --resource-group gp-surgery-rg \
  --environment gp-surgery-env \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    SYNTHFLOW_API_KEY="qx-WSupk11oOofscMT8QCWjxUO-bJbADnSIfZftF0hA" \
    SYNTHFLOW_ASSISTANT_ID="3c3e2946-100f-4b14-8ad1-fc3e0d70caac" \
    DEEPGRAM_API_KEY="e4cf69978274c920eb3fdb00b1204a33f592ab40" \
    NODE_ENV="production"
```

### 4. Get Your URL
```bash
az containerapp show \
  --name gp-surgery-app \
  --resource-group gp-surgery-rg \
  --query properties.configuration.ingress.fqdn
```

## Troubleshooting

- **WebSocket issues**: Azure Container Apps automatically handles WebSocket upgrades
- **Environment variables**: Use Azure Portal to verify they're set correctly
- **Logs**: `az containerapp logs show --name gp-surgery-app --resource-group gp-surgery-rg`