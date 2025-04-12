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

import { BasicPitch } from '@spotify/basic-pitch';

let basicPitchModel = null;

async function initializeModel() {
  if (!basicPitchModel) {
    try {
      basicPitchModel = new BasicPitch('https://audio-visualizer-zongs.s3.us-east-2.amazonaws.com/model/model.json');
    } catch (error) {
      throw new Error('Failed to load Basic Pitch model: ' + error.message);
    }
  }
}

const SAMPLE_RATE = 22050;
const HOP_LENGTH = 256;
const FRAME_DURATION = HOP_LENGTH / SAMPLE_RATE;

function buildNotes(frames, onsets, contours, onsetThreshold, frameThreshold, minDurationSec) {
  const notes = [];
  const activeNotes = new Map();

  function isSafari() {
    let isSafariBrowser =
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
      navigator.vendor === 'Apple Computer, Inc.' &&
      !window.chrome;
    return isSafariBrowser;
  }
  let offset = 0;
  try {
    if (isSafari()) {
      offset = 0.7;
    }
  } catch (e) {
    console.error(e);
  }

  for (let i = 0; i < frames.length; i++) {
    for (let pitch = 0; pitch < frames[i].length; pitch++) {
      const frameValue = frames[i][pitch];
      const onsetValue = onsets[i][pitch];

      if (onsetValue > onsetThreshold && !activeNotes.has(pitch)) {
        activeNotes.set(pitch, i);
      }

      if (frameValue < frameThreshold && activeNotes.has(pitch)) {
        const startFrame = activeNotes.get(pitch);
        const startSec = startFrame * FRAME_DURATION + offset;
        const endSec = i * FRAME_DURATION + offset;
        const durationSec = endSec - startSec;

        if (durationSec >= minDurationSec) {
          notes.push({
            noteNumber: pitch + 21,
            startSec,
            durationSec,
          });
        }
        activeNotes.delete(pitch);
      }
    }
  }

  // Handle any remaining active notes
  activeNotes.forEach((startFrame, pitch) => {
    const startSec = startFrame * FRAME_DURATION;
    const endSec = frames.length * FRAME_DURATION;
    const durationSec = endSec - startSec;

    if (durationSec >= minDurationSec) {
      notes.push({
        noteNumber: pitch + 21,
        startSec,
        durationSec,
      });
    }
  });

  return notes;
}

async function resampleAudio(audioBuffer, targetSampleRate = 22050) {
  const sourceSampleRate = audioBuffer.sampleRate;
  const length = Math.round(audioBuffer.length * (targetSampleRate / sourceSampleRate));
  const offlineContext = new OfflineAudioContext(1, length, targetSampleRate);
  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineContext.destination);
  bufferSource.start();
  return await offlineContext.startRendering();
}

function convertToMono(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) return audioBuffer;
  const monoBuffer = new AudioBuffer({
    length: audioBuffer.length,
    numberOfChannels: 1,
    sampleRate: audioBuffer.sampleRate,
  });
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  const monoData = monoBuffer.getChannelData(0);
  for (let i = 0; i < audioBuffer.length; i++) {
    monoData[i] = (left[i] + right[i]) / 2;
  }
  return monoBuffer;
}

export async function convertAudioToMidi(mp3File, progressCallback, onsetThreshold, frameThreshold, minDurationSec) {
  await initializeModel();
  const arrayBuffer = await mp3File.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const monoBuffer = convertToMono(audioBuffer);
  const resampledBuffer = await resampleAudio(monoBuffer);

  if (resampledBuffer.sampleRate !== SAMPLE_RATE) {
    throw new Error(`Resampled to wrong rate: ${resampledBuffer.sampleRate}Hz`);
  }

  const frames = [];
  const onsets = [];
  const contours = [];

  await basicPitchModel.evaluateModel(
    resampledBuffer,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => progressCallback(p * 100)
  );

  return buildNotes(frames, onsets, contours, onsetThreshold, frameThreshold, minDurationSec);
}
