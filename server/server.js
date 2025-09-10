const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@deepgram/sdk');
const WebSocket = require('ws');
const { auth, requiresAuth } = require('express-openid-connect');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 configuration
console.log('Auth0 Environment Variables:');
console.log('- AUTH0_SECRET:', process.env.AUTH0_SECRET ? 'SET' : 'MISSING');
console.log('- AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID ? 'SET' : 'MISSING');
console.log('- AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN || 'MISSING');
console.log('- BASE_URL:', process.env.BASE_URL || 'MISSING');

const authConfig = {
  authRequired: false, // Don't require auth for API endpoints
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_DOMAIN,
  session: {
    rollingDuration: 24 * 60 * 60, // 24 hours
    absoluteDuration: 7 * 24 * 60 * 60 // 7 days
  },
  routes: {
    login: '/login',
    logout: '/logout',
    callback: '/callback'
  },
  attemptSilentLogin: true
};

console.log('Final Auth0 config baseURL:', authConfig.baseURL);

// Trust proxy (required for Azure Container Apps with custom domains)
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(auth(authConfig));
app.use(express.static(path.join(__dirname, '..')));

// Serve static files
app.use('/src', express.static(path.join(__dirname, '../src')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Synthflow session endpoint
app.get('/api/synthflow/session/:assistantId', async (req, res) => {
    try {
        const { assistantId } = req.params;
        const synthflowApiKey = process.env.SYNTHFLOW_API_KEY;
        
        console.log(`Synthflow session request for assistant: ${assistantId}`);
        console.log(`API key configured: ${synthflowApiKey ? 'Yes' : 'No'}`);
        
        if (!synthflowApiKey) {
            console.error('Synthflow API key is not configured');
            return res.status(500).json({ error: 'Synthflow API key not configured' });
        }
        
        if (!assistantId) {
            console.error('Assistant ID is missing');
            return res.status(400).json({ error: 'Assistant ID is required' });
        }
        
        const url = `https://widget.synthflow.ai/websocket/token/${assistantId}`;
        console.log(`Making request to: ${url}`);
        
        // Request session token from Synthflow
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${synthflowApiKey}`
            }
        });
        
        console.log(`Synthflow response status: ${response.status}`);
        console.log('Session token received successfully');
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Error getting Synthflow session:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        
        // Return more specific error information
        const errorMessage = error.response?.data?.error || error.message || 'Failed to get session token';
        const statusCode = error.response?.status || 500;
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.response?.data || 'Network or authentication error'
        });
    }
});

// Synthflow calls endpoint
app.get('/api/synthflow/calls/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const synthflowApiKey = process.env.SYNTHFLOW_API_KEY;
        
        if (!synthflowApiKey) {
            return res.status(500).json({ error: 'Synthflow API key not configured' });
        }
        
        if (!modelId) {
            return res.status(400).json({ error: 'Model ID is required' });
        }
        
        const response = await axios.get('https://api.synthflow.ai/v2/calls', {
            headers: {
                'Authorization': `Bearer ${synthflowApiKey}`
            },
            params: {
                model_id: modelId,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Error getting Synthflow calls:', error.response?.data || error.message);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to get calls';
        const statusCode = error.response?.status || 500;
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.response?.data || 'Network or authentication error'
        });
    }
});

// Synthflow analytics endpoint
app.get('/api/synthflow/analytics/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        const { from_date, to_date, type_of_call } = req.query;
        const synthflowApiKey = process.env.SYNTHFLOW_API_KEY;
        
        if (!synthflowApiKey) {
            return res.status(500).json({ error: 'Synthflow API key not configured' });
        }
        
        if (!modelId) {
            return res.status(400).json({ error: 'Model ID is required' });
        }
        
        const params = { model_id: modelId };
        if (from_date) params.from_date = from_date;
        if (to_date) params.to_date = to_date;
        if (type_of_call) params.type_of_call = type_of_call;
        
        const response = await axios.get('https://api.synthflow.ai/v2/analytics/', {
            headers: {
                'Authorization': `Bearer ${synthflowApiKey}`,
                'Content-Type': 'application/json'
            },
            params
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Error getting Synthflow analytics:', error.response?.data || error.message);
        
        const errorMessage = error.response?.data?.error || error.message || 'Failed to get analytics';
        const statusCode = error.response?.status || 500;
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.response?.data || 'Network or authentication error'
        });
    }
});


// Deepgram token endpoint
app.get('/api/deepgram/token', (req, res) => {
    try {
        const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
        
        if (!deepgramApiKey) {
            return res.status(500).json({ error: 'Deepgram API key not configured' });
        }
        
        // In production, you might want to generate a temporary token
        // For now, we'll send the API key (ensure HTTPS in production)
        res.json({ token: deepgramApiKey });
        
    } catch (error) {
        console.error('Error getting Deepgram token:', error);
        res.status(500).json({ error: 'Failed to get Deepgram token' });
    }
});

// Detect if we're running in Azure Container Apps or other cloud environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.WEBSITES_ENABLE_APP_SERVICE_STORAGE || 
                    process.env.CONTAINER_APP_NAME ||
                    process.env.PORT;

// Start server first
const httpServer = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Is Production: ${isProduction}`);
    
    if (isProduction) {
        console.log(`WebSocket server running on same port: ${PORT}`);
    } else {
        console.log(`Downstream WebSocket server running on ws://localhost:8080`);
    }
    
    console.log('\nConfiguration status:');
    console.log(`- Synthflow API Key: ${process.env.SYNTHFLOW_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`- Synthflow Assistant ID: ${process.env.SYNTHFLOW_ASSISTANT_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`- Deepgram API Key: ${process.env.DEEPGRAM_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('\nPlease ensure all API keys are configured in the .env file');
});

// WebSocket server for downstream connections
const wss = new WebSocket.Server({ 
    port: isProduction ? undefined : 8080,
    server: isProduction ? httpServer : undefined
});

wss.on('connection', (ws) => {
    console.log('Downstream client connected');
    
    // Connection established, ready to receive real data
    
    ws.on('message', (message) => {
        // Handle messages from the main app if needed
        try {
            const data = JSON.parse(message.toString());
            // Only log transcript messages in development or for long transcripts
            if (data.type === 'transcript' && (!isProduction || data.data.text.length > 50)) {
                console.log('Received transcript from downstream');
            }
            
            // If it's from the main app, broadcast to all other clients
            broadcastToDownstream(data, ws);
        } catch (error) {
            console.log('Received non-JSON message:', message.toString().substring(0, 100));
        }
    });
    
    ws.on('close', () => {
        console.log('Downstream client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast function for sending data to all connected downstream clients
function broadcastToDownstream(data, excludeClient = null) {
    let sentCount = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
            client.send(JSON.stringify(data));
            sentCount++;
        }
    });
    
    // Only log transcript broadcasts in development or important events
    if (data.type === 'transcript' && (!isProduction || data.data.text.length > 50)) {
        console.log(`Broadcasting transcript to ${sentCount} clients`);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            synthflow: !!process.env.SYNTHFLOW_API_KEY,
            deepgram: !!process.env.DEEPGRAM_API_KEY
        }
    });
});

// Debug endpoint to check configuration
app.get('/api/debug/config', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV || 'development',
        synthflow: {
            apiKeyConfigured: !!process.env.SYNTHFLOW_API_KEY,
            apiKeyLength: process.env.SYNTHFLOW_API_KEY ? process.env.SYNTHFLOW_API_KEY.length : 0,
            assistantIdConfigured: !!process.env.SYNTHFLOW_ASSISTANT_ID,
            assistantId: process.env.SYNTHFLOW_ASSISTANT_ID || 'not configured'
        },
        deepgram: {
            apiKeyConfigured: !!process.env.DEEPGRAM_API_KEY,
            apiKeyLength: process.env.DEEPGRAM_API_KEY ? process.env.DEEPGRAM_API_KEY.length : 0
        }
    });
});

// Configuration endpoint (for frontend to get non-sensitive config)
app.get('/api/config', (req, res) => {
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
    
    // In production (Azure), WebSocket runs on same port as HTTP
    const wsUrl = isProduction
        ? `${wsProtocol}://${host}`
        : 'ws://localhost:8080';
    
    res.json({
        synthflowAssistantId: process.env.SYNTHFLOW_ASSISTANT_ID || '',
        synthflowApiKey: process.env.SYNTHFLOW_API_KEY || '',
        downstreamWebSocketUrl: wsUrl
    });
});

// Protected HTML routes (require authentication)
app.get('/', requiresAuth(), (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/clinician-dashboard.html', requiresAuth(), (req, res) => {
    res.sendFile(path.join(__dirname, '../clinician-dashboard.html'));
});

app.get('/test-react-client.html', requiresAuth(), (req, res) => {
    res.sendFile(path.join(__dirname, '../test-react-client.html'));
});

// Debug endpoint to check Auth0 config
app.get('/api/debug/auth0', (req, res) => {
    res.json({
        baseURL: process.env.BASE_URL,
        authDomain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        secretConfigured: !!process.env.AUTH0_SECRET,
        finalBaseURL: authConfig.baseURL,
        isAuthenticated: req.oidc?.isAuthenticated() || false
    });
});

// API endpoint to get user info (protected)
app.get('/api/user', requiresAuth(), (req, res) => {
    res.json({
        user: req.oidc.user,
        isAuthenticated: req.oidc.isAuthenticated()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Server is started above with WebSocket integration

// Export for testing
module.exports = { app, broadcastToDownstream };
