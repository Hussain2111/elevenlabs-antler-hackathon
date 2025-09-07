#!/bin/bash

# Azure Container Apps deployment script for GP Surgery AI
# Run this script after logging in with 'az login'

set -e

# Configuration
RESOURCE_GROUP="axi"
LOCATION="uksouth"
ENVIRONMENT="axi-env"
APP_NAME="gp-surgery-app"

echo "🚀 Deploying GP Surgery AI to Azure Container Apps..."

# Create resource group
echo "📦 Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output table

# Create Container Apps environment
echo "🏗️  Creating Container Apps environment..."
az containerapp env create \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output table

# Build and push container (using Azure Container Registry)
echo "🐳 Building container..."
# ACR names must be alphanumeric only, no dashes
ACR_NAME="gpsurgeryacr$(date +%s)"
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true \
  --output table

# Get ACR login server
ACR_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)

# Build and push image
echo "📤 Pushing image to registry..."
IMAGE_NAME="gpsurgeryapp"
az acr build \
  --registry $ACR_NAME \
  --image $IMAGE_NAME:latest \
  .

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query passwords[0].value --output tsv)

# Deploy Container App
echo "🚀 Deploying Container App..."
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image $ACR_SERVER/$IMAGE_NAME:latest \
  --registry-server $ACR_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
  --output table

# Set environment variables (you'll need to fill these in)
echo "⚙️  Setting environment variables..."
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    SYNTHFLOW_API_KEY="qx-WSupk11oOofscMT8QCWjxUO-bJbADnSIfZftF0hA" \
    SYNTHFLOW_ASSISTANT_ID="3c3e2946-100f-4b14-8ad1-fc3e0d70caac" \
    DEEPGRAM_API_KEY="e4cf69978274c920eb3fdb00b1204a33f592ab40" \
    NODE_ENV="production" \
  --output table

# Get the app URL
echo "🎉 Deployment complete!"
APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)
echo "Your app is available at: https://$APP_URL"
echo "Test client at: https://$APP_URL/test-react-client.html"