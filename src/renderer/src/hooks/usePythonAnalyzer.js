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

export function usePythonAnalyzer(audioContext, isPlaying, source) {
  const [dataFromPython, setDataFromPython] = useState();

  useEffect(() => {
    if (!isPlaying || !audioContext || !source) return;
    const workerBaseUrl = getResourcePath('workers');
    const workerUrl = `${workerBaseUrl}/pythonWorker.js`;
    const pythonWorker = new Worker(workerUrl);
    pythonWorker.postMessage({ type: 'init', sampleRate: audioContext.sampleRate });
    console.log('Renderer: Worker initialized with sample rate:', audioContext.sampleRate);

    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        outputData.set(inputData);
      }
      const channelData = inputBuffer.getChannelData(0);
      const float32Array = new Float32Array(channelData);
      pythonWorker.postMessage({ type: 'audioChunk', data: float32Array }, [float32Array.buffer]);
    };
    source.connect(scriptProcessor);

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    pythonWorker.onmessage = (event) => {
      if (event.data.type === 'sendToPython') {
        console.log('Renderer: Sending data to Python for processing');
        window.electron.ipcRenderer.send('process-python-data-async', event.data.data);
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
