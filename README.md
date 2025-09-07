# GP Surgery AI Voice Assistant

A production-ready GP surgery website with an integrated AI voice assistant. Features real-time voice calls with Synthflow AI, live transcription via Deepgram, and WebSocket streaming for downstream applications.

## ✨ Key Features

- 🎙️ **Real-time Voice Calls** with AI assistant
- 📝 **Live Transcription** with duplicate detection  
- 🔊 **Audio/Transcript Streaming** to external applications
- 💬 **Clean Call Widget** with proper state management
- 🚀 **Production Deployed** on Azure Container Apps
- 📱 **Responsive Design** works on all devices

## 🚀 Quick Start

### 1. Local Development
```bash
# Clone and install
git clone <your-repo>
cd elevenlabs-antler-hackathon
npm install

# Create .env file
SYNTHFLOW_API_KEY=your_api_key
SYNTHFLOW_ASSISTANT_ID=your_assistant_id  
DEEPGRAM_API_KEY=your_deepgram_key

# Start locally
npm start
```

**Local URLs:**
- Main app: `http://localhost:3000`
- Test client: `http://localhost:3000/test-react-client.html`

### 2. Deploy to Azure
```bash
# Login to Azure
az login

# Deploy (uses your .env file)
./deploy-simple.sh
```

**Production URLs:**
- Main app: `https://your-app.azurecontainer.io`
- Test client: `https://your-app.azurecontainer.io/test-react-client.html`

## 📱 How to Use

1. **Start a call**: Click the blue call button (bottom-right)
2. **Grant permissions**: Allow microphone access  
3. **Talk naturally**: AI responds in real-time
4. **End call**: Click red button to stop

## 🔌 Integrate with Your React App

### WebSocket Connection
Connect to the WebSocket endpoint to receive real-time audio and transcripts:

```javascript
// Production
const wsUrl = 'wss://your-app.azurecontainer.io';

// Local development  
const wsUrl = 'ws://localhost:8080';

const ws = new WebSocket(wsUrl);
```

### Message Types You'll Receive

#### 1. Audio Data
```javascript
{
  type: "audio",
  data: [1234, 5678, ...], // Int16Array as regular array
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 2. Transcript Data
```javascript  
{
  type: "transcript", 
  data: {
    speaker: "User" | "Assistant",
    text: "Hello, how can I help you?",
    timestamp: "2024-01-01T12:00:00.000Z",
    isFinal: true,
    confidence: 0.95
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 3. Call Status
```javascript
{
  type: "call_ended",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### Integration Example

```javascript
const ws = new WebSocket('wss://your-app.azurecontainer.io');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'audio':
      // Convert back to Int16Array for audio processing
      const audioData = new Int16Array(message.data);
      handleAudioChunk(audioData);
      break;
      
    case 'transcript':
      // Display transcript in your UI
      addTranscriptToChat(message.data);
      break;
      
    case 'call_ended':
      // Clean up your audio visualization/UI
      handleCallEnd();
      break;
  }
};

function handleAudioChunk(audioData) {
  // Process audio for visualization or storage
  // audioData is Int16Array with 16kHz sample rate
}

function addTranscriptToChat(transcript) {
  // Add to your chat UI
  const isUser = transcript.speaker === 'User';
  displayMessage(transcript.text, isUser, transcript.timestamp);
}
```

### Audio Processing Notes
- **Sample Rate**: 16kHz  
- **Format**: Int16Array (signed 16-bit integers)
- **Channels**: Mono (1 channel)
- **Range**: -32768 to 32767

## 🏗️ How It Works

```
User ──► GP Website ──► Synthflow AI ──► Audio Response
                │              │
                ▼              ▼
          Deepgram API ──► Live Transcripts
                │
                ▼
         Your React App (via WebSocket)
```

## 📁 Key Files

- `index.html` - Main GP surgery website
- `test-react-client.html` - Example integration 
- `server/server.js` - Express server + WebSocket
- `src/components/CallWidget.js` - Call interface
- `deploy-simple.sh` - Azure deployment script

## 🔧 API Endpoints

- `GET /api/config` - WebSocket URL for frontend
- `GET /api/synthflow/session/:id` - Get voice session
- `GET /api/deepgram/token` - Get transcription auth

## 🐛 Troubleshooting

**No audio/transcripts in production?**
- Check browser console for WebSocket connection errors
- Verify environment variables are set in Azure

**Microphone not working?**
- Enable microphone permissions in browser  
- Use HTTPS in production (required for mic access)

## 🚢 Alternative Deployments

### Vercel (Serverless)
```bash
npm i -g vercel
vercel --prod
# Add env vars in Vercel dashboard
```

### Heroku
```bash  
heroku create your-app-name
heroku config:set SYNTHFLOW_API_KEY=your_key
git push heroku main
```

### Docker
```bash
docker build -t gp-surgery-ai .
docker run -p 3000:3000 --env-file .env gp-surgery-ai
```

## 📋 Production Checklist

- ✅ HTTPS enabled (required for microphone access)
- ✅ Environment variables configured  
- ✅ WebSocket connections tested
- ✅ Audio/transcript streaming verified
- ✅ Cross-browser compatibility checked

## 📞 Need Help?

- **Synthflow**: [docs.synthflow.ai](https://docs.synthflow.ai)  
- **Deepgram**: [developers.deepgram.com](https://developers.deepgram.com)
- **This project**: Create a GitHub issue