// Synthflow WebSocket integration

const MESSAGE_TYPE_STATUS_AGENT_READY = "status_agent_ready";
const MESSAGE_TYPE_STATUS_CLIENT_READY = "status_client_ready";

class SynthflowClient {
    constructor(onStatusUpdate, onTranscriptUpdate) {
        this.websocket = null;
        this.onStatusUpdate = onStatusUpdate;
        this.onTranscriptUpdate = onTranscriptUpdate;
        this.audioOutControls = null;
        this.recordingControls = null;
        this.sessionActive = false;
        this.audioBuffer = new window.audioUtils.AudioStreamBuffer();
    }

    async getSessionToken(assistantId) {
        try {
            const serverUrl = window.SERVER_URL || 'http://localhost:3000';
            const response = await fetch(`${serverUrl}/api/synthflow/session/${assistantId}`);
            if (!response.ok) {
                throw new Error('Failed to get session token');
            }
            const data = await response.json();
            return data.sessionURL;
        } catch (error) {
            console.error('Error getting session token:', error);
            throw error;
        }
    }

    async connect(assistantId) {
        try {
            this.onStatusUpdate('connecting', 'Connecting to AI assistant...');
            
            // Get session URL from backend
            const sessionURL = await this.getSessionToken(assistantId);
            
            // Initialize audio output
            this.audioOutControls = await window.audioUtils.startAudioOut();
            
            // Create WebSocket connection
            this.websocket = new WebSocket(sessionURL);
            this.websocket.binaryType = "arraybuffer";
            
            this.setupWebSocketHandlers();
            
            // Start recording after WebSocket is ready
            await this.startRecording();
            
            this.sessionActive = true;
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.onStatusUpdate('error', 'Failed to connect to assistant');
            throw error;
        }
    }

    setupWebSocketHandlers() {
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.websocket.onmessage = async (event) => {
            // Handle audio from agent
            if (event.data instanceof ArrayBuffer) {
                const arrayBuffer = event.data;
                const pcmSamples = new Int16Array(arrayBuffer);
                
                // Play audio
                this.audioOutControls.enqueueAudioChunk(pcmSamples);
                
                // Store audio for streaming
                this.audioBuffer.addChunk(pcmSamples);
                
                // Send audio to downstream app via WebSocket or API
                this.streamAudioToApp(pcmSamples);
                
                // Send assistant audio to Deepgram for transcription
                this.sendToDeepgram(pcmSamples.buffer, 'assistant');
                
            } else {
                // Handle JSON messages
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case MESSAGE_TYPE_STATUS_AGENT_READY:
                        this.onStatusUpdate('active', 'Connected to assistant');
                        console.log("Agent is ready");
                        break;
                    default:
                        console.log("Received message:", data);
                        break;
                }
            }
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.onStatusUpdate('error', 'Connection error');
        };

        this.websocket.onclose = () => {
            console.log('WebSocket closed');
            this.onStatusUpdate('ended', 'Call ended');
            this.cleanup();
        };
    }

    async startRecording() {
        this.recordingControls = await window.audioUtils.startRecording(
            (audioChunk) => {
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(audioChunk);
                    // Also send user audio to Deepgram
                    this.sendToDeepgram(audioChunk, 'user');
                }
            },
            async () => {
                // Send client ready message when recording starts
                this.sendWhenReady(JSON.stringify({ type: MESSAGE_TYPE_STATUS_CLIENT_READY }));
                console.log("Sent client ready message");
            }
        );
    }

    sendWhenReady(message) {
        if (this.websocket.readyState === WebSocket.CLOSED) {
            console.log("WebSocket is closed, not sending message");
            return;
        } else if (this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(message);
        } else {
            setTimeout(() => this.sendWhenReady(message), 50);
        }
    }

    sendToDeepgram(audioData, speaker) {
        // This will be handled by the Deepgram integration
        if (window.deepgramClient) {
            // Send audio to Deepgram for transcription
            window.deepgramClient.processAudio(audioData, speaker);
        } else {
            console.warn('Deepgram client not available');
        }
    }

    streamAudioToApp(audioData) {
        // Stream audio to downstream React app
        // This could be via WebSocket, Server-Sent Events, or API calls
        if (window.downstreamConnection) {
            window.downstreamConnection.sendAudio(audioData);
        }
    }

    disconnect() {
        this.sessionActive = false;
        if (this.websocket) {
            this.websocket.close();
        }
        this.cleanup();
    }

    cleanup() {
        if (this.recordingControls) {
            this.recordingControls.stop();
            this.recordingControls = null;
        }
        if (this.audioOutControls) {
            this.audioOutControls.stop();
            this.audioOutControls = null;
        }
        this.websocket = null;
        this.sessionActive = false;
    }

    isActive() {
        return this.sessionActive;
    }
}

// Export to window
window.SynthflowClient = SynthflowClient;
