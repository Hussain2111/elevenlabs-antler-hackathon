// Call Widget Component - ElevenLabs Style

let callState = {
    isActive: false,
    isWidgetOpen: false,
    synthflowClient: null,
    deepgramClient: null,
    downstreamConnection: null,
    callTimer: null,
    callStartTime: null
};

// Initialize the widget
function initializeCallWidget() {
    // Check if widget is already initialized
    const widget = document.getElementById('call-widget');
    const toggleBtn = document.getElementById('widget-toggle');
    
    if (!widget) {
        console.error('Call widget element not found');
        return;
    }
    
    // Show the widget initially
    widget.classList.add('active');
    callState.isWidgetOpen = true;
    
    // Hide the separate toggle button since widget is always visible
    if (toggleBtn) {
        toggleBtn.style.display = 'none';
    }
    
    // Initialize downstream connection if URL is provided
    const downstreamUrl = localStorage.getItem('downstreamWebSocketUrl');
    if (downstreamUrl) {
        callState.downstreamConnection = new window.DownstreamConnection();
        callState.downstreamConnection.connect(downstreamUrl);
        window.downstreamConnection = callState.downstreamConnection;
    }
}

// Toggle widget visibility (not used in ElevenLabs style)
function toggleWidget() {
    // Widget is always visible in ElevenLabs style
    return;
}

// Toggle call state
async function toggleCall() {
    if (callState.isActive) {
        endCall();
    } else {
        await startCall();
    }
}

// Start call
async function startCall() {
    try {
        updateCallUI('connecting');
        
        // Get assistant ID from environment or use default
        const assistantId = window.SYNTHFLOW_ASSISTANT_ID || 'your_assistant_id';
        
        // Initialize Synthflow client
        callState.synthflowClient = new window.SynthflowClient(
            (status, message) => updateCallStatus(status, message),
            (transcript) => handleTranscript(transcript)
        );
        
        // Initialize Deepgram client
        callState.deepgramClient = new window.DeepgramClient(
            (transcript) => handleTranscript(transcript)
        );
        window.deepgramClient = callState.deepgramClient;
        
        // Connect to Deepgram (simplified for demo)
        try {
            await callState.deepgramClient.connect();
        } catch (error) {
            console.warn('Deepgram connection failed, continuing without transcription:', error);
        }
        
        // Connect to Synthflow
        await callState.synthflowClient.connect(assistantId);
        
        // Start call timer
        startCallTimer();
        
        callState.isActive = true;
        updateCallUI('active');
        
    } catch (error) {
        console.error('Failed to start call:', error);
        updateCallStatus('error', 'Connection failed');
        updateCallUI('error');
    }
}

// End call
function endCall() {
    if (callState.synthflowClient) {
        callState.synthflowClient.disconnect();
    }
    
    if (callState.deepgramClient) {
        callState.deepgramClient.disconnect();
    }
    
    // Signal call end to downstream connection
    if (callState.downstreamConnection) {
        callState.downstreamConnection.sendCallEnd();
    }
    
    stopCallTimer();
    callState.isActive = false;
    updateCallUI('ended');
}

// Update call UI based on state
function updateCallUI(state) {
    const widget = document.getElementById('call-widget');
    const button = document.getElementById('call-button');
    const phoneIcon = document.getElementById('phone-icon');
    const endIcon = document.getElementById('end-icon');
    const statusText = document.getElementById('status-text');
    const timer = document.getElementById('call-timer');
    const avatarCircle = document.getElementById('avatar-circle');
    
    switch (state) {
        case 'connecting':
            widget.classList.add('expanded');
            widget.classList.add('calling');
            button.classList.remove('active');
            phoneIcon.style.display = 'block';
            endIcon.style.display = 'none';
            statusText.textContent = 'Connecting...';
            timer.style.display = 'none';
            if (avatarCircle) {
                avatarCircle.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
            }
            break;
            
        case 'active':
            widget.classList.add('expanded');
            widget.classList.add('calling');
            button.classList.add('active');
            phoneIcon.style.display = 'none';
            endIcon.style.display = 'block';
            statusText.textContent = 'Call in progress';
            timer.style.display = 'block';
            if (avatarCircle) {
                avatarCircle.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            }
            break;
            
        case 'ended':
            widget.classList.remove('expanded');
            widget.classList.remove('calling');
            button.classList.remove('active');
            phoneIcon.style.display = 'block';
            endIcon.style.display = 'none';
            statusText.textContent = 'AI Assistant';
            timer.style.display = 'none';
            if (avatarCircle) {
                avatarCircle.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
            break;
            
        case 'error':
            widget.classList.remove('expanded');
            widget.classList.remove('calling');
            button.classList.remove('active');
            phoneIcon.style.display = 'block';
            endIcon.style.display = 'none';
            statusText.textContent = 'Connection error';
            timer.style.display = 'none';
            if (avatarCircle) {
                avatarCircle.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            }
            setTimeout(() => {
                statusText.textContent = 'AI Assistant';
                if (avatarCircle) {
                    avatarCircle.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }
            }, 3000);
            break;
    }
}

// Update call status
function updateCallStatus(status, message) {
    const statusText = document.getElementById('status-text');
    
    if (statusText) {
        statusText.textContent = message;
    }
    
    // Update UI based on status
    switch (status) {
        case 'connecting':
            // Already handled in updateCallUI
            break;
        case 'active':
            statusText.textContent = 'Connected';
            setTimeout(() => {
                statusText.textContent = 'Call in progress';
            }, 1000);
            break;
        case 'ended':
            // Already handled in updateCallUI
            break;
        case 'error':
            // Already handled in updateCallUI
            break;
    }
}

// Handle transcript (send to downstream but don't display)
function handleTranscript(transcriptData) {
    // Send transcript to downstream connection
    if (callState.downstreamConnection) {
        callState.downstreamConnection.sendTranscript(transcriptData);
    }
    
    // Log only important transcript events
    if (transcriptData.isFinal) {
        console.log('Final transcript:', transcriptData.speaker, ':', transcriptData.text);
    }
}

// Call timer functions
function startCallTimer() {
    callState.callStartTime = Date.now();
    callState.callTimer = setInterval(updateTimer, 1000);
}

function stopCallTimer() {
    if (callState.callTimer) {
        clearInterval(callState.callTimer);
        callState.callTimer = null;
    }
    callState.callStartTime = null;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = '00:00';
    }
}

function updateTimer() {
    if (!callState.callStartTime) return;
    
    const elapsed = Math.floor((Date.now() - callState.callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeCallWidget);

// Export functions to window for HTML onclick handlers
window.toggleWidget = toggleWidget;
window.toggleCall = toggleCall;