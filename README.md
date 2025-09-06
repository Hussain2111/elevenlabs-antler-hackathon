# Antler GP Surgery - AI Voice Assistant Demo

A modern GP surgery website with an integrated AI voice assistant powered by Synthflow and Deepgram. This demo replicates the Francis Grove Surgery website design and adds a sophisticated voice call widget for patient interactions.

## Features

- 🏥 **GP Surgery Website**: Clean, NHS-styled interface mimicking Francis Grove Surgery
- 🎙️ **Voice AI Assistant**: Real-time voice interaction with Synthflow AI
- 📝 **Live Transcription**: Real-time transcription using Deepgram with duplicate detection
- 🔊 **Audio Streaming**: Streams audio and transcripts to downstream applications
- 💬 **Interactive Call Widget**: Beautiful, animated call interface with clean single-circle design
- ⏱️ **Call Timer**: Tracks call duration with proper cleanup
- 📊 **Status Indicators**: Visual feedback for connection status
- 🎵 **Audio Visualization**: Real-time audio waveform visualization in test client
- 🛑 **Proper Call Cleanup**: Audio streams stop correctly when calls end
- 🚀 **Production Ready**: Includes deployment guides and optimizations

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Synthflow account and API key
- Deepgram account and API key
- Modern web browser with microphone access

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd /Users/mbp/Code/elevenlabs-antler-hackathon
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Synthflow Configuration
SYNTHFLOW_API_KEY=your_synthflow_api_key_here
SYNTHFLOW_ASSISTANT_ID=your_assistant_id_here

# Deepgram Configuration  
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Set Up Synthflow

1. Log in to your Synthflow dashboard
2. Create a new widget-type agent
3. Configure your agent with appropriate prompts for a GP receptionist
4. Copy the Assistant ID and add it to your `.env` file

### 4. Set Up Deepgram

1. Sign up for a Deepgram account
2. Generate an API key
3. Add the API key to your `.env` file

### 5. Start the Server

```bash
npm start
```

The application will be available at:
- Main website: `http://localhost:3000`
- Test React Client: `http://localhost:3000/test-react-client.html`
- Downstream WebSocket: `ws://localhost:8080`

## Usage

### Using the Voice Assistant

1. Open the main website at `http://localhost:3000`
2. Click the blue call button in the bottom-right corner
3. The call widget will expand with avatar and controls
4. Click the call button to begin speaking with the AI assistant
5. Grant microphone permissions when prompted
6. Speak naturally - the AI will respond in real-time
7. Click the red end call button to stop the conversation

### Testing with React Client

1. Open the test client at `http://localhost:3000/test-react-client.html`
2. Click "Connect" to start receiving audio and transcript streams
3. Start a call on the main website to see real-time data flow
4. Audio visualization will show live waveforms
5. Transcripts appear with speaker labels and timestamps
6. Call end signals properly stop audio streaming

### Downstream Integration

The system streams real-time audio and transcripts via WebSocket on port 8080. Your React app can connect to receive:

```javascript
// Connect to downstream WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'audio') {
        // Handle audio data (Int16Array)
        console.log('Received audio chunk:', data.data);
    } else if (data.type === 'transcript') {
        // Handle transcript
        console.log('Received transcript:', data.data);
    }
};
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│                 │────▶│              │────▶│              │
│   Browser UI    │     │   Synthflow  │     │   Deepgram   │
│   (index.html)  │◀────│   WebSocket  │     │   WebSocket  │
│                 │     │              │     │              │
└─────────────────┘     └──────────────┘     └──────────────┘
         │                                            │
         │                                            │
         ▼                                            ▼
┌─────────────────┐                          ┌──────────────┐
│                 │                          │              │
│  Express Server │                          │  Transcripts │
│   (server.js)   │                          │              │
│                 │                          └──────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│                 │
│  Downstream App │
│   (WebSocket)   │
│                 │
└─────────────────┘
```

## File Structure

```
elevenlabs-antler-hackathon/
├── index.html                  # Main HTML page
├── test-react-client.html      # Test client for downstream integration
├── package.json               # Node dependencies
├── server/
│   └── server.js             # Express server with WebSocket
├── public/
│   └── audio-out-worklet.js  # Audio processing worklet
├── src/
│   ├── components/
│   │   └── CallWidget.js     # Call widget logic
│   ├── styles/
│   │   └── main.css         # All styles (responsive design)
│   └── utils/
│       ├── audio.js         # Audio utilities
│       ├── synthflow.js     # Synthflow integration
│       └── deepgram.js      # Deepgram integration with deduplication
└── README.md                # This file
```

## API Endpoints

- `GET /` - Serves the main website
- `GET /api/health` - Health check endpoint
- `GET /api/config` - Get frontend configuration
- `GET /api/synthflow/session/:assistantId` - Get Synthflow session token
- `GET /api/deepgram/token` - Get Deepgram authentication token

## WebSocket Connections

- **Synthflow**: Handles voice AI interactions
- **Deepgram**: Provides real-time transcription
- **Downstream** (port 8080): Streams audio and transcripts to external apps

## Troubleshooting

### Microphone Access Issues
- Ensure your browser has microphone permissions
- Check that no other application is using the microphone
- Try using HTTPS (required for production)

### Connection Errors
- Verify all API keys are correctly set in `.env`
- Check that the Synthflow assistant ID is valid
- Ensure Deepgram API key has proper permissions

### Audio Issues
- Check browser console for errors
- Verify sample rates match (48kHz for input, 16kHz for output)
- Ensure audio worklet is loading correctly

## Security Notes

- Never commit `.env` file to version control
- Use HTTPS in production
- Implement proper authentication for production use
- Consider rate limiting for API endpoints
- Validate and sanitize all inputs

## Deployment

### Production Environment Setup

#### 1. Environment Variables for Production
```env
# Synthflow Configuration
SYNTHFLOW_API_KEY=your_production_synthflow_api_key
SYNTHFLOW_ASSISTANT_ID=your_production_assistant_id

# Deepgram Configuration  
DEEPGRAM_API_KEY=your_production_deepgram_api_key

# Server Configuration
PORT=3000
NODE_ENV=production
```

#### 2. Deploy to Cloud Platform

**Vercel Deployment:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

**Heroku Deployment:**
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set SYNTHFLOW_API_KEY=your_key
heroku config:set SYNTHFLOW_ASSISTANT_ID=your_id
heroku config:set DEEPGRAM_API_KEY=your_key

# Deploy
git push heroku main
```

**Docker Deployment:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t gp-surgery-ai .
docker run -p 3000:3000 --env-file .env gp-surgery-ai
```

#### 3. Production Considerations

- **HTTPS Required**: Voice features require HTTPS in production
- **Domain Setup**: Update CORS settings for your domain
- **WebSocket URLs**: Update WebSocket URLs in production:
  ```javascript
  const downstreamUrl = `wss://your-domain.com:8080`;
  ```
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Monitoring**: Set up logging and error monitoring
- **CDN**: Consider using a CDN for static assets

#### 4. SSL Certificate Setup

For HTTPS, you'll need to:
1. Obtain SSL certificate (Let's Encrypt, CloudFlare, etc.)
2. Update server configuration:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

#### 5. Environment-Specific Configuration

Update `server/server.js` for production:
```javascript
// Production WebSocket URL
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://${process.env.DOMAIN}:8080`
  : 'ws://localhost:8080';
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires user interaction to start audio
- Mobile browsers: May have limited WebRTC support

## Performance Optimization

- Audio chunks are processed in real-time
- Console logging is minimal in production
- WebSocket connections are properly cleaned up on disconnect
- Duplicate transcript detection prevents data redundancy

## License

MIT

## Support

For issues related to:
- Synthflow: Check their documentation at docs.synthflow.ai
- Deepgram: Visit developers.deepgram.com
- This implementation: Create an issue in the repository
