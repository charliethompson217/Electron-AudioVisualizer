// Buffer to store incoming audio chunks
let audioChunks = [];
let sampleRate = 44100;
let sampleCount = 0;
let secondsToAccumulate = 3;

async function accumulateAudioChunk(audioData) {
  audioChunks.push(audioData);
  sampleCount += audioData.length;

  const requiredSamples = secondsToAccumulate * sampleRate;

  if (sampleCount >= requiredSamples) {
    const concatenated = new Float32Array(sampleCount);
    let offset = 0;

    for (const chunk of audioChunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    audioChunks = [];
    sampleCount = 0;

    return concatenated;
  }

  return null;
}

self.onmessage = async (event) => {
  if (event.data.type === 'init') {
    sampleRate = event.data.sampleRate || 44100;
    console.log('Worker: Initialized with sample rate:', sampleRate);
  } else if (event.data.type === 'audioChunk') {
    const fullSegment = await accumulateAudioChunk(event.data.data);

    if (fullSegment) {
      console.log(`Worker: Sending ${fullSegment.length} samples to main thread`);
      try {
        self.postMessage({
          type: 'sendToPython',
          data: {
            samples: fullSegment,
            sampleRate: sampleRate,
            totalSamples: fullSegment.length,
          },
        });
        console.log('Worker: Message sent successfully');
      } catch (error) {
        console.error('Worker: Error sending message:', error);
      }
    }
  }
};
