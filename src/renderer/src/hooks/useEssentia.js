/*
A free online tool to visualize audio files with spectrogram, waveform, MIDI conversion and more.
Copyright (C) 2024 Charles Thompson

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { useState, useEffect } from 'react';

const getResourcePath = (resource) => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev) {
    return `/${resource}`;
  } else {
    return window.electron.ipcRenderer.sendSync('get-resource-path', resource);
  }
};

export function useEssentia(audioContext, isPlaying, mp3File, bpmAndKey = true, source, setWarning) {
  const [bpm, setBpm] = useState(null);
  const [scaleKey, setScaleKey] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [essentiaFeatures, setEssentiaFeatures] = useState(null);

  useEffect(() => {
    if (!mp3File || !bpmAndKey) return;
    let worker;

    const analyzeAudio = async () => {
      try {
        setIsProcessing(true);
        worker = new Worker(`${getResourcePath('workers')}/essentiaWorker.js`);
        const arrayBuffer = await mp3File.arrayBuffer();
        const tempAudioContext = new AudioContext();
        let audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);
        worker.postMessage({ type: 'init', sampleRate: tempAudioContext.sampleRate });
        tempAudioContext.close();

        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const extractedData = [];

        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          extractedData.push(new Float32Array(channelData));
        }

        worker.postMessage({
          type: 'audioFile',
          data: {
            extractedData,
            numberOfChannels,
            length,
          },
        });

        worker.onmessage = (event) => {
          if (event.data.type === 'fileFeatures') {
            setBpm(event.data.data.bpm);
            setScaleKey(event.data.data.scaleKey);
            setIsProcessing(false);
          }
        };
      } catch (error) {
        if (error.message.includes('Decoding')) {
          setWarning('Failed to decode audio. File size may be too large.');
        } else {
          setWarning(`Failed to analyze audio: ${error.message}`);
        }
        setIsProcessing(false);
        if (worker) worker.terminate();
      }
    };

    analyzeAudio();

    return () => {
      if (worker) worker.terminate();
    };
  }, [mp3File, bpmAndKey, setWarning]);

  useEffect(() => {
    if (!isPlaying || !audioContext || !source) return;

    const worker = new Worker(`${getResourcePath('workers')}/essentiaWorker.js`);
    worker.postMessage({ type: 'init', sampleRate: audioContext.sampleRate });

    let workletNode = null;
    let gainNode = null;

    const setupWorklet = async () => {
      try {
        const workletPath = `${getResourcePath('workers')}/audio-processor.js`;
        console.log('Fetching worklet from:', workletPath);
        const response = await fetch(workletPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio-processor.js: ${response.statusText}`);
        }
        const workletCode = await response.text();

        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const blobURL = URL.createObjectURL(blob);
        console.log('Loading worklet from Blob URL:', blobURL);

        await audioContext.audioWorklet.addModule(blobURL);
        workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audioChunk') {
            worker.postMessage({
              type: 'audioChunk',
              data: event.data.data,
            });
          }
        };

        gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        source.connect(workletNode);
        workletNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        URL.revokeObjectURL(blobURL);
      } catch (error) {
        console.error('Worklet setup failed:', error.name, error.message, error.stack);
        setWarning(`Failed to set up AudioWorklet: ${error.message}`);
        worker.terminate();
        throw error;
      }
    };

    setupWorklet().catch((err) => console.error('Setup worklet error:', err));

    worker.onmessage = (event) => {
      if (event.data.type === 'chunkFeature') {
        setEssentiaFeatures(event.data.data);
      }
    };

    return () => {
      worker.terminate();
      if (workletNode) workletNode.disconnect();
      if (gainNode) gainNode.disconnect();
    };
  }, [audioContext, source, isPlaying, setEssentiaFeatures, setWarning]);

  return {
    bpm,
    scaleKey,
    isProcessing,
    essentiaFeatures,
  };
}
