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

import { useEffect, useState } from 'react';

const getResourcePath = (resource) => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev) {
    return `/${resource}`;
  } else {
    return window.electron.ipcRenderer.sendSync('get-resource-path', resource);
  }
};

export function usePythonAnalyzer(audioContext, isPlaying, source, bpm, scaleKey, essentiaFeatures) {
  const [dataFromPython, setDataFromPython] = useState();

  useEffect(() => {
    if (!isPlaying || !audioContext || !source) return;

    const workerBaseUrl = getResourcePath('workers');
    const workerUrl = `${workerBaseUrl}/pythonWorker.js`;
    const pythonWorker = new Worker(workerUrl);
    pythonWorker.postMessage({ type: 'init', sampleRate: audioContext.sampleRate });
    console.log('Renderer: Worker initialized with sample rate:', audioContext.sampleRate);
    let workletNode = null;
    let gainNode = null;

    const setupWorklet = async () => {
      try {
        const workletPath = `${workerBaseUrl}/audio-processor.js`;
        const response = await fetch(workletPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio-processor.js: ${response.statusText}`);
        }
        const workletCode = await response.text();

        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const blobURL = URL.createObjectURL(blob);

        await audioContext.audioWorklet.addModule(blobURL);
        workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audioChunk') {
            const data = event.data.data.extractedData ? event.data.data.extractedData[0] : event.data.data;
            pythonWorker.postMessage({ type: 'audioChunk', data }, [data.buffer]);
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
        pythonWorker.terminate();
        throw error;
      }
    };

    setupWorklet().catch((err) => console.error('Setup worklet error:', err));

    pythonWorker.onmessage = (event) => {
      if (event.data.type === 'sendToPython') {
        console.log('Renderer: Sending data to Python for processing');
        if (bpm && scaleKey) {
          event.data.data.bpm = bpm;
          event.data.data.key = scaleKey;
        } else if (essentiaFeatures) {
          event.data.data.bpm = essentiaFeatures.bpm;
          event.data.data.key = essentiaFeatures.scaleKey;
        }
        console.log('Data: ', event.data.data);
        window.electron.ipcRenderer.send('process-python-data-async', { type: 'audioChunk', data: event.data.data });
      }
    };

    return () => {
      pythonWorker.terminate();
      scriptProcessor.disconnect();
    };
  }, [audioContext, source, isPlaying]);

  useEffect(() => {
    const handlePythonResult = (result) => {
      console.log('Renderer: Response from Python processing:', result);
      if (result.error) {
        console.error('Python processing error:', result.error);
      }
      setDataFromPython(result);
    };

    window.electron.ipcRenderer.on('python-data-result', handlePythonResult);

    return () => {
      window.electron.ipcRenderer.removeListener('python-data-result', handlePythonResult);
    };
  }, []);

  return {
    dataFromPython,
  };
}
