// Audio utilities for recording and playback

// Audio output controls
async function startAudioOut() {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    
    // Use the correct path for the audio worklet
    const workletPath = window.SERVER_URL ? `${window.SERVER_URL}/public/audio-out-worklet.js` : 'public/audio-out-worklet.js';
    await ctx.audioWorklet.addModule(workletPath);
    const worklet = new AudioWorkletNode(ctx, "audio-out-worklet");
    worklet.connect(gainNode);
    
    return {
        enqueueAudioChunk: (chunk) => worklet.port.postMessage({ buffer: chunk }),
        audioContext: ctx,
        stop: () => {
            worklet.disconnect();
            gainNode.disconnect();
            ctx.close();
        },
    };
}

// Audio recording with 48kHz sample rate for Synthflow
async function startRecording(onAudioChunk, onRecordingStarted) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new window.AudioContext({ sampleRate: 48000 });
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(8192, 1, 1);
    
    let hasRecordingStarted = false;
    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        if (!hasRecordingStarted) {
            hasRecordingStarted = true;
            onRecordingStarted();
        }
        const floatData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const int16Data = float32ToInt16(floatData);
        const byteBuffer = new Uint8Array(int16Data.buffer);
        onAudioChunk(byteBuffer);
    };
    
    sourceNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    
    return {
        stop: () => {
            scriptProcessor.disconnect();
            scriptProcessor.onaudioprocess = null;
            sourceNode.disconnect();
            audioContext.close();
            stream.getTracks().forEach((track) => track.stop());
        },
    };
}

// Convert float32 audio to int16
function float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

// Audio buffer for streaming
class AudioStreamBuffer {
    constructor() {
        this.chunks = [];
        this.sampleRate = 16000; // Synthflow returns 16kHz audio
    }

    addChunk(audioData) {
        this.chunks.push(audioData);
    }

    getCompleteAudio() {
        if (this.chunks.length === 0) return null;
        
        // Combine all chunks
        const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Int16Array(totalLength);
        let offset = 0;
        
        for (const chunk of this.chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }
        
        return combined;
    }

    clear() {
        this.chunks = [];
    }
}

// Export functions
window.audioUtils = {
    startAudioOut,
    startRecording,
    float32ToInt16,
    AudioStreamBuffer
};
