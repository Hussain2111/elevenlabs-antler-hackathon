# GitHub Actions Auto-Deploy Setup

## Overview
This sets up automatic deployment to Azure Container Apps whenever code is pushed to the `main` branch, regardless of who pushes.

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### 1. Azure Container Registry Password
```bash
# Get the ACR password
az acr credential show --name gpsurgeryregistry --query "passwords[0].value" -o tsv
```
- **Secret Name**: `REGISTRY_PASSWORD`
- **Value**: The password from the command above

### 2. Azure Service Principal Credentials
```bash
# Create a service principal for GitHub Actions
az ad sp create-for-rbac --name "github-actions-gp-surgery" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/axi \
  --sdk-auth
```
- **Secret Name**: `AZURE_CREDENTIALS`
- **Value**: The entire JSON output from the command above

### 3. API Keys (Environment Variables)
- **Secret Name**: `SYNTHFLOW_API_KEY`
- **Value**: Your Synthflow API key

- **Secret Name**: `SYNTHFLOW_ASSISTANT_ID` 
- **Value**: Your Synthflow Assistant ID

- **Secret Name**: `DEEPGRAM_API_KEY`
- **Value**: Your Deepgram API key

## How to Add GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Go to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact names above

## How It Works

1. **Trigger**: Any push to `main` branch (from any contributor)
2. **Build**: Creates Docker image with unique tag (git SHA)
3. **Push**: Uploads image to Azure Container Registry
4. **Deploy**: Updates Azure Container App with new image
5. **Environment**: Automatically sets production environment variables

## Features

- ✅ **Auto-deploy on every main push** (any contributor)
- ✅ **Docker layer caching** for faster builds
- ✅ **Unique image tags** using git commit SHA
- ✅ **Secure secrets management** via GitHub
- ✅ **Production environment variables** auto-configured
- ✅ **Zero-downtime deployments**

## First Time Setup

After adding all secrets, push this workflow to trigger the first deployment:

```bash
git add .github/workflows/deploy.yml github-actions-setup.md
git commit -m "Add GitHub Actions auto-deploy workflow"
git push origin main
```

The deployment will start automatically and you can monitor it in the **Actions** tab of your GitHub repository.