#!/bin/bash

# Simple Azure deployment without ACR
set -e

# Configuration (updated to match your settings)
RESOURCE_GROUP="axi"
LOCATION="uksouth"
ENVIRONMENT="axi-env"
APP_NAME="gp-surgery-app"

echo "🚀 Simple deployment to Azure Container Apps..."

# Since you already have the environment, let's just deploy the app
echo "🚀 Deploying Container App from GitHub..."

# Deploy directly from GitHub (no registry needed)
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --source . \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    SYNTHFLOW_API_KEY="qx-WSupk11oOofscMT8QCWjxUO-bJbADnSIfZftF0hA" \
    SYNTHFLOW_ASSISTANT_ID="3c3e2946-100f-4b14-8ad1-fc3e0d70caac" \
    DEEPGRAM_API_KEY="e4cf69978274c920eb3fdb00b1204a33f592ab40" \
  --output table

# Get the app URL
echo "🎉 Deployment complete!"
APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)
echo "Your app is available at: https://$APP_URL"
echo "Test client at: https://$APP_URL/test-react-client.html"