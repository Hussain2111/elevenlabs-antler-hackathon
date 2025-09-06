const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@deepgram/sdk');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Serve static files
app.use('/src', express.static(path.join(__dirname, '../src')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Synthflow session endpoint
app.get('/api/synthflow/session/:assistantId', async (req, res) => {
    try {
        const { assistantId } = req.params;
        const synthflowApiKey = process.env.SYNTHFLOW_API_KEY;
        
        if (!synthflowApiKey) {
            return res.status(500).json({ error: 'Synthflow API key not configured' });
        }
        
        // Request session token from Synthflow
        const response = await axios.get(
            `https://widget.synthflow.ai/websocket/token/${assistantId}`,
            {
                headers: {
                    'Authorization': `Bearer ${synthflowApiKey}`
                }
            }
        );
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Error getting Synthflow session:', error);
        res.status(500).json({ error: 'Failed to get session token' });
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

// WebSocket server for downstream connections
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Downstream client connected');
    
    // Connection established, ready to receive real data
    
    ws.on('message', (message) => {
        // Handle messages from the main app if needed
        try {
            const data = JSON.parse(message.toString());
            // Only log transcript messages, not audio chunks
            if (data.type === 'transcript') {
                console.log('Received transcript from downstream:', data.data.text);
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
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
            client.send(JSON.stringify(data));
        }
    });
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

// Configuration endpoint (for frontend to get non-sensitive config)
app.get('/api/config', (req, res) => {
    res.json({
        synthflowAssistantId: process.env.SYNTHFLOW_ASSISTANT_ID || '',
        downstreamWebSocketUrl: `ws://localhost:8080`
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Downstream WebSocket server running on ws://localhost:8080`);
    console.log('\nConfiguration status:');
    console.log(`- Synthflow API Key: ${process.env.SYNTHFLOW_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`- Synthflow Assistant ID: ${process.env.SYNTHFLOW_ASSISTANT_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`- Deepgram API Key: ${process.env.DEEPGRAM_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('\nPlease ensure all API keys are configured in the .env file');
});

// Export for testing
module.exports = { app, broadcastToDownstream };
