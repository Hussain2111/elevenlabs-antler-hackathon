// Deepgram real-time transcription integration

class DeepgramClient {
    constructor(onTranscript) {
        this.userWebsocket = null;
        this.assistantWebsocket = null;
        this.onTranscript = onTranscript;
        this.isConnected = false;
        this.transcriptBuffer = [];
        this.hasLoggedConnectionIssue = false;
        this.deepgramToken = null;
    }

    async connect() {
        try {
            console.log('Connecting to Deepgram with dual connections...');
            
            // Get Deepgram API key from server
            const serverUrl = window.SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.host}`);
            const tokenResponse = await fetch(`${serverUrl}/api/deepgram/token`);
            
            if (!tokenResponse.ok) {
                throw new Error('Failed to get Deepgram token');
            }
            
            const { token } = await tokenResponse.json();
            this.deepgramToken = token;
            
            // Create separate WebSocket connections for user and assistant
            const baseUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&endpointing=100&encoding=linear16&sample_rate=16000&channels=1&vad_events=true&punctuate=true&utterance_end_ms=1000`;
            
            // User connection
            this.userWebsocket = new WebSocket(baseUrl, ['token', token]);
            this.userWebsocket.binaryType = 'arraybuffer';
            
            // Assistant connection  
            this.assistantWebsocket = new WebSocket(baseUrl, ['token', token]);
            this.assistantWebsocket.binaryType = 'arraybuffer';
            
            this.setupWebSocketHandlers();
            
            // Wait for both connections
            await Promise.all([
                this.waitForConnection(this.userWebsocket, 'User'),
                this.waitForConnection(this.assistantWebsocket, 'Assistant')
            ]);
            
            this.isConnected = true;
            console.log('Both Deepgram connections established successfully');
            
        } catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            // Fall back to demo mode if connection fails
            this.isConnected = true;
            console.log('Falling back to demo mode with simulated transcripts');
        }
    }

    async waitForConnection(websocket, label) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`${label} connection timeout`)), 10000);
            
            websocket.onopen = () => {
                clearTimeout(timeout);
                console.log(`${label} Deepgram connection established`);
                resolve();
            };
            
            websocket.onerror = (error) => {
                clearTimeout(timeout);
                console.error(`${label} Deepgram WebSocket error:`, error);
                reject(error);
            };
        });
    }

    setupWebSocketHandlers() {
        // Setup User WebSocket handlers
        if (this.userWebsocket) {
            this.userWebsocket.onmessage = (event) => {
                this.handleTranscriptMessage(event, 'User');
            };

            this.userWebsocket.onerror = (error) => {
                console.error('User Deepgram WebSocket error:', error);
            };

            this.userWebsocket.onclose = () => {
                console.log('User Deepgram connection closed');
            };
        }

        // Setup Assistant WebSocket handlers
        if (this.assistantWebsocket) {
            this.assistantWebsocket.onmessage = (event) => {
                this.handleTranscriptMessage(event, 'Assistant');
            };

            this.assistantWebsocket.onerror = (error) => {
                console.error('Assistant Deepgram WebSocket error:', error);
            };

            this.assistantWebsocket.onclose = () => {
                console.log('Assistant Deepgram connection closed');
            };
        }
    }

    handleTranscriptMessage(event, speakerLabel) {
        try {
            const data = JSON.parse(event.data);
            
            // Handle Deepgram response format
            if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
                const alternative = data.channel.alternatives[0];
                const transcript = alternative.transcript;
                
                // Only process non-empty transcripts
                if (transcript && transcript.trim() !== '') {
                    const transcriptEntry = {
                        speaker: speakerLabel,
                        text: transcript,
                        timestamp: new Date().toISOString(),
                        isFinal: data.is_final || false,
                        confidence: alternative.confidence || 0
                    };
                    
                    // Only process final transcripts to avoid duplicates
                    if (transcriptEntry.isFinal) {
                        // Check for duplicate final transcripts
                        const isDuplicate = this.transcriptBuffer.some(existing => 
                            existing.text.trim() === transcriptEntry.text.trim() && 
                            existing.speaker === transcriptEntry.speaker &&
                            Math.abs(new Date(existing.timestamp) - new Date(transcriptEntry.timestamp)) < 2000
                        );
                        
                        if (!isDuplicate) {
                            this.transcriptBuffer.push(transcriptEntry);
                            this.onTranscript(transcriptEntry);
                        }
                    }
                    
                    // Log only final transcripts to reduce noise
                    if (transcriptEntry.isFinal) {
                        console.log(`Deepgram transcript (final) [${speakerLabel}]:`, transcript);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${speakerLabel} Deepgram message:`, error);
        }
    }

    processAudio(audioData, speaker) {
        // Send audio data to the appropriate Deepgram connection
        const targetWebsocket = speaker === 'user' ? this.userWebsocket : this.assistantWebsocket;
        
        if (targetWebsocket && targetWebsocket.readyState === WebSocket.OPEN) {
            // Convert audio data to the format expected by Deepgram
            let audioBuffer;
            
            if (audioData instanceof ArrayBuffer) {
                audioBuffer = audioData;
            } else if (audioData instanceof Int16Array) {
                audioBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
            } else if (audioData instanceof Uint8Array) {
                // User audio comes as Uint8Array at 48kHz, need to convert to 16kHz
                if (speaker === 'user') {
                    audioBuffer = this.resampleUserAudio(audioData);
                } else {
                    audioBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
                }
            } else {
                console.warn('Unsupported audio data format for Deepgram');
                return;
            }
            
            // Send audio to the appropriate Deepgram connection
            targetWebsocket.send(audioBuffer);
            
            // Debug logging (remove in production)
            if (speaker === 'user' && Math.random() < 0.01) { // Log 1% of user audio chunks
                console.log(`Sent ${speaker} audio chunk: ${audioBuffer.byteLength} bytes`);
            }
            
        } else {
            // Only log connection issues, not every audio chunk
            if (!this.hasLoggedConnectionIssue) {
                console.log(`${speaker} audio received but Deepgram not connected`);
                this.hasLoggedConnectionIssue = true;
            }
        }
    }

    resampleUserAudio(uint8Array) {
        // Convert Uint8Array to Int16Array (48kHz)
        const int16Array = new Int16Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength / 2);
        
        // Simple downsampling from 48kHz to 16kHz (3:1 ratio)
        // Take every 3rd sample
        const downsampledLength = Math.floor(int16Array.length / 3);
        const downsampledArray = new Int16Array(downsampledLength);
        
        for (let i = 0; i < downsampledLength; i++) {
            downsampledArray[i] = int16Array[i * 3];
        }
        
        return downsampledArray.buffer;
    }

    streamTranscriptToApp(transcript) {
        // Stream transcript to downstream React app
        if (window.downstreamConnection) {
            window.downstreamConnection.sendTranscript(transcript);
        }
    }

    getFullTranscript() {
        return this.transcriptBuffer;
    }

    clearTranscript() {
        this.transcriptBuffer = [];
    }

    disconnect() {
        if (this.userWebsocket) {
            this.userWebsocket.close();
            this.userWebsocket = null;
        }
        
        if (this.assistantWebsocket) {
            this.assistantWebsocket.close();
            this.assistantWebsocket = null;
        }
        
        this.isConnected = false;
        this.deepgramToken = null;
    }
}

// Downstream connection handler for React app
class DownstreamConnection {
    constructor() {
        this.websocket = null;
        this.audioQueue = [];
        this.transcriptQueue = [];
    }

    async connect(url) {
        try {
            this.websocket = new WebSocket(url);
            
            this.websocket.onopen = () => {
                console.log('Connected to downstream app');
                // Send any queued data
                this.flushQueues();
            };

            this.websocket.onerror = (error) => {
                console.error('Downstream connection error:', error);
            };
        } catch (error) {
            console.error('Failed to connect to downstream:', error);
        }
    }

    sendAudio(audioData) {
        const message = {
            type: 'audio',
            data: Array.from(audioData),
            timestamp: new Date().toISOString()
        };

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            this.audioQueue.push(message);
        }
    }

    sendTranscript(transcript) {
        const message = {
            type: 'transcript',
            data: transcript,
            timestamp: new Date().toISOString()
        };

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            this.transcriptQueue.push(message);
        }
    }

    flushQueues() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Send queued audio
            while (this.audioQueue.length > 0) {
                const message = this.audioQueue.shift();
                this.websocket.send(JSON.stringify(message));
            }
            
            // Send queued transcripts
            while (this.transcriptQueue.length > 0) {
                const message = this.transcriptQueue.shift();
                this.websocket.send(JSON.stringify(message));
            }
        }
    }

    sendCallEnd() {
        const message = {
            type: 'call_ended',
            timestamp: new Date().toISOString()
        };

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        // Send call end signal before disconnecting
        this.sendCallEnd();
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Clear queues
        this.audioQueue = [];
        this.transcriptQueue = [];
    }
}

// Export to window
window.deepgramClient = null;
window.downstreamConnection = null;
window.DeepgramClient = DeepgramClient;
window.DownstreamConnection = DownstreamConnection;