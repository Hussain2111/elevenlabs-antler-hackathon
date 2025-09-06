// Deepgram real-time transcription integration

class DeepgramClient {
    constructor(onTranscript) {
        this.websocket = null;
        this.onTranscript = onTranscript;
        this.isConnected = false;
        this.transcriptBuffer = [];
        this.currentSpeaker = 'Speaker';
        this.hasLoggedConnectionIssue = false;
    }

    async connect() {
        try {
            console.log('Connecting to Deepgram...');
            
            // Get Deepgram API key from server
            const serverUrl = window.SERVER_URL || 'http://localhost:3000';
            const tokenResponse = await fetch(`${serverUrl}/api/deepgram/token`);
            
            if (!tokenResponse.ok) {
                throw new Error('Failed to get Deepgram token');
            }
            
            const { token } = await tokenResponse.json();
            
            // Create WebSocket connection to Deepgram
            const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=1`;
            
            this.websocket = new WebSocket(deepgramUrl, ['token', token]);
            
            this.setupWebSocketHandlers();
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                
                this.websocket.onopen = () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    console.log('Connected to Deepgram');
                    
                    console.log('Deepgram transcription service connected and ready');
                    
                    resolve();
                };
                
                this.websocket.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('Deepgram WebSocket error:', error);
                    reject(error);
                };
            });
            
        } catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            // Fall back to demo mode if connection fails
            this.isConnected = true;
            console.log('Falling back to demo mode with simulated transcripts');
            
            console.log('Deepgram connection failed, no transcription available');
        }
    }

    setupWebSocketHandlers() {
        if (!this.websocket) return;
        
        this.websocket.onopen = () => {
            console.log('Connected to Deepgram');
            this.isConnected = true;
        };

        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle Deepgram response format
                if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
                    const alternative = data.channel.alternatives[0];
                    const transcript = alternative.transcript;
                    
                    // Only process non-empty transcripts
                    if (transcript && transcript.trim() !== '') {
                        // Determine speaker based on context or use generic labels
                        const speakerLabel = this.currentSpeaker || 'Speaker';
                        
                        const transcriptEntry = {
                            speaker: speakerLabel,
                            text: transcript,
                            timestamp: new Date().toISOString(),
                            isFinal: data.is_final || false,
                            confidence: alternative.confidence || 0
                        };
                        
                        // Only process and stream final transcripts to avoid duplicates
                        if (transcriptEntry.isFinal) {
                            // Check for duplicate transcripts in buffer
                            const isDuplicate = this.transcriptBuffer.some(existing => 
                                existing.text.trim() === transcriptEntry.text.trim() && 
                                Math.abs(new Date(existing.timestamp) - new Date(transcriptEntry.timestamp)) < 2000
                            );
                            
                            if (!isDuplicate) {
                                this.transcriptBuffer.push(transcriptEntry);
                                this.onTranscript(transcriptEntry);
                            }
                        }
                        
                        // Log only final transcripts to reduce noise
                        if (transcriptEntry.isFinal) {
                            console.log(`Deepgram transcript (final):`, transcript);
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing Deepgram message:', error);
            }
        };

        this.websocket.onerror = (error) => {
            console.error('Deepgram WebSocket error:', error);
            this.isConnected = false;
        };

        this.websocket.onclose = () => {
            console.log('Disconnected from Deepgram');
            this.isConnected = false;
        };
    }

    processAudio(audioData, speaker) {
        // Send real audio data to Deepgram if connected
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Track current speaker for transcript labeling
            this.currentSpeaker = speaker === 'user' ? 'User' : 'Assistant';
            
            // Convert audio data to the format expected by Deepgram
            let audioBuffer;
            
            if (audioData instanceof ArrayBuffer) {
                audioBuffer = audioData;
            } else if (audioData instanceof Int16Array) {
                audioBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
            } else {
                console.warn('Unsupported audio data format for Deepgram');
                return;
            }
            
            // Send audio to Deepgram
            this.websocket.send(audioBuffer);
            
            // Audio sent to Deepgram for real-time transcription
        } else {
            // Only log connection issues, not every audio chunk
            if (!this.hasLoggedConnectionIssue) {
                console.log(`Audio data received but Deepgram not connected`);
                this.hasLoggedConnectionIssue = true;
            }
        }
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
        if (this.websocket) {
            this.websocket.close();
        }
        this.isConnected = false;
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