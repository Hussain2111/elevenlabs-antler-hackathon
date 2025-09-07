# WebSocket Debugging Guide

## Current Flow
1. Main app (`index.html`) loads config from `/api/config`
2. Gets WebSocket URL from config
3. Creates DownstreamConnection on widget initialization
4. When transcript received, sends to server
5. Server broadcasts to all other connected clients

## Debug Steps

### 1. Deploy with Debug Logging
```bash
./update-azure.sh
```

### 2. Check Production Logs
```bash
az containerapp logs show --name gp-surgery-app --resource-group axi --follow
```

### 3. Test the Flow
1. Open main app: `https://your-app.azurecontainer.io`
2. Open test client: `https://your-app.azurecontainer.io/test-react-client.html`
3. Click "Connect" in test client
4. Start a call in main app
5. Watch logs for:
   - "Downstream client connected" (should see 2 connections)
   - "Received transcript from downstream"  
   - "Broadcasting transcript to X clients"
   - "Total connected clients: X, Sent to: Y"

### 4. Expected Log Output
```
Downstream client connected  # Main app connects
Downstream client connected  # Test client connects
Received transcript from downstream: Hello...
Broadcasting transcript to 1 clients: "Hello..."
Total connected clients: 2, Sent to: 1
```

### 5. If Still Not Working
The issue might be that the main app and test client are connecting to different WebSocket URLs due to the `/api/config` endpoint returning different URLs.

Check the WebSocket URL in both:
- Main app console: `localStorage.getItem('downstreamWebSocketUrl')`
- Test client: Check the connection URL in JavaScript