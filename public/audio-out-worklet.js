// Audio worklet processor for audio output
// This runs in a separate thread for better performance
class Processor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.buffer = getAudioBuffer();
        this.port.onmessage = (ev) => {
            const int16Array = new Int16Array(ev.data.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                const int16 = int16Array[i];
                const float32 = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
                float32Array[i] = float32;
            }
            this.buffer.pushArray(float32Array);
        };
    }

    process(_inputs, outputs, _parameters) {
        const output = outputs[0];
        const channel = output[0];
        for (let i = 0; i < channel.length; i++) {
            const sample = this.buffer.pullSample();
            if (sample === undefined) {
                channel[i] = 0;
            } else {
                channel[i] = sample;
            }
        }
        return true;
    }
}

function getAudioBuffer() {
    const arrays = [];
    let samplePointer = 0;
    let currentArray = undefined;
    return {
        pullSample: () => {
            if (currentArray === undefined || samplePointer >= currentArray.length) {
                currentArray = arrays.shift();
                samplePointer = 0;
            }
            if (currentArray === undefined) {
                return undefined;
            }
            const sample = currentArray[samplePointer];
            samplePointer++;
            return sample;
        },
        pushArray: (array) => {
            arrays.push(array);
        },
    };
}

registerProcessor("audio-out-worklet", Processor);
