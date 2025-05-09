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

import React, { useState, useEffect } from 'react';
import './App.css';
import Cookies from 'js-cookie';
import KeyboardSVG from './components/KeyboardSVG.jsx';
import { useAudio } from './hooks/useAudio.js';
import ColorSettingsModal from './components/ColorSettingsModal.jsx';
import SongSelector from './components/SongSelector.jsx';
import FileUploader from './components/FileUploader.jsx';
import VisualizationToggles from './components/VisualizationToggles.jsx';
import PlaybackControls from './components/PlaybackControls.jsx';
import VisualizersContainer from './components/VisualizersContainer.jsx';
import SongInfo from './components/SongInfo.jsx';
import Footer from './components/Footer.jsx';
import BasicPitchSettings from './components/BasicPitchSettings.jsx';
import MidiSelector from './components/MidiSelector.jsx';
import CharacterAnimation from './components/visualizers/CharacterAnimation.jsx';

export default function CoreApp() {
  useEffect(() => {
    window.electron.ipcRenderer.send('process-python-data-async', {
      type: 'init',
    });
  }, []);

  const defaultNoteHues = [0, 25, 45, 75, 110, 166, 190, 210, 240, 270, 300, 330];

  const synthesizerPresets = {
    None: {
      synthesisMode: 'additive',
      oscillatorType: 'custom',
      harmonicAmplitudes: {
        1: 1.0,
        2: 0.0,
        3: 0.0,
        4: 0.0,
        5: 0.0,
        6: 0.0,
        7: 0.0,
        8: 0.0,
      },
      attackTime: 0.01,
      decayTime: 0.3,
      sustainLevel: 0.2,
      releaseTime: 0.5,
      vibratoDepth: 0,
      vibratoRate: 0,
      tremoloDepth: 0,
      tremoloRate: 0,
    },
    Piano: {
      synthesisMode: 'additive',
      oscillatorType: 'custom',
      harmonicAmplitudes: {
        1: 1.0,
        2: 0.5,
        3: 0.2,
        4: 0.1,
        5: 0.05,
        6: 0.01,
        7: 0.005,
        8: 0.001,
      },
      attackTime: 0.01,
      decayTime: 0.3,
      sustainLevel: 0.2,
      releaseTime: 0.5,
      vibratoDepth: 0,
      vibratoRate: 0,
      tremoloDepth: 0,
      tremoloRate: 0,
    },
    Violin: {
      synthesisMode: 'additive',
      oscillatorType: 'custom',
      harmonicAmplitudes: {
        1: 1.0,
        2: 0.7,
        3: 0.4,
        4: 0.3,
        5: 0.15,
        6: 0.07,
        7: 0.03,
        8: 0.01,
      },
      attackTime: 1.3,
      decayTime: 1.0,
      sustainLevel: 0.6,
      releaseTime: 0.5,
      vibratoDepth: 0,
      vibratoRate: 0,
      tremoloDepth: 0,
      tremoloRate: 0,
    },
  };

  const [noteHues, setNoteHues] = useState(defaultNoteHues);
  const [showColorSettings, setShowColorSettings] = useState(false);

  const [mp3File, setMp3File] = useState(null);
  const [midiFile, setMidiFile] = useState(null);
  const [useMic, setUseMic] = useState(false);

  const [bins, setBins] = useState(32768);
  const [smoothing, setSmoothing] = useState(0.01);
  const [minDecibels, setMinDecibels] = useState(-120);
  const [maxDecibels, setMaxDecibels] = useState(-30);
  const [meydaBufferSize, setMeydaBufferSize] = useState(4096);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSongName, setCurrentSongName] = useState('');

  const [showLabels, setShowLabels] = useState(true);
  const [showScroll, setShowScroll] = useState(true);
  const [pianoEnabled, setPianoEnabled] = useState(true);
  const [bpmAndKey, setBpmAndKey] = useState(true);
  const [showWaveform, setShowWaveform] = useState(true);
  const [showSpectrograph, setShowSpectrograph] = useState(true);
  const [showWaterfallSpectrograph, setShowWaterfallSpectrograph] = useState(false);
  const [chromaCircle, setChromaCircle] = useState(false);
  const [chromaLine, setChromaLine] = useState(false);
  const [chromaBar, setChromaBar] = useState(true);
  const [rms, setRms] = useState(false);
  const [loudness, setLoudness] = useState(true);
  const [spectralSpreadGraph, setSpectralSpreadGraph] = useState(false);

  const [generateBrowserMIDI, setGenerateBrowserMIDI] = useState(false);
  const [onsetThreshold, setOnsetThreshold] = useState(0.3);
  const [frameThreshold, setFrameThreshold] = useState(0.3);
  const [minDurationSec, setMinDurationSec] = useState(0.1);

  const [selectedMidiFileName, setSelectedMidiFileName] = useState('');
  const [selectedSongFileName, setSelectedSongFileName] = useState('');
  const [fetchingSong, setFetchingSong] = useState(false);

  const [synthesizerSettings, setSynthesizerSettings] = useState(synthesizerPresets.None);
  const [selectedPreset, setSelectedPreset] = useState('None');

  const [meydaFeaturesToExtract, setMeydaFeaturesToExtract] = useState([]);

  const [warning, setWarning] = useState('');

  const audio = useAudio(
    mp3File,
    midiFile,
    useMic,
    bins,
    smoothing,
    isPlaying,
    minDecibels,
    maxDecibels,
    pianoEnabled,
    synthesizerSettings,
    meydaBufferSize,
    bpmAndKey,
    generateBrowserMIDI,
    onsetThreshold,
    frameThreshold,
    minDurationSec,
    meydaFeaturesToExtract,
    setWarning
  );

  const {
    bpm,
    scaleKey,
    essentiaIsProcessingWholeFile,
    isConverting,
    conversionComplete,
    progress,
    midiNotes,
    essentiaFeatures,
    dataFromPython,
  } = audio;

  const handleSongSelect = async (selectedFileName, file, songName) => {
    setSelectedSongFileName(selectedFileName);
    setSelectedMidiFileName('');
    setCurrentSongName(songName);
    setFetchingSong(false);
    setMp3File(file);
    setMidiFile(null);
  };

  const handleMidiSelect = (selectedFileName, file, midiName) => {
    setSelectedMidiFileName(selectedFileName);
    setSelectedSongFileName('');
    setCurrentSongName(midiName);
    setFetchingSong(false);
    setMidiFile(file);
    setMp3File(null);
    setPianoEnabled(true);
  };

  function handleStartStop() {
    if (isPlaying) {
      location.reload();
    } else {
      setIsPlaying(true);
    }
  }

  function handlePauseResume() {
    if (isPaused) {
      setIsPaused(false);
      audio.play();
    } else {
      setIsPaused(true);
      audio.pause();
    }
  }

  function handleStartStopWithMic() {
    handleStartStop();
  }

  // Load saved color settings from cookies
  useEffect(() => {
    const COOKIE_NAME = 'note-hues-settings';
    const savedHues = Cookies.get(COOKIE_NAME);
    if (savedHues) {
      try {
        const parsedHues = JSON.parse(savedHues);
        if (Array.isArray(parsedHues) && parsedHues.length === 12) {
          setNoteHues(parsedHues);
        }
      } catch (error) {
        console.error('Error parsing saved color settings:', error);
      }
    }
  }, []);

  // Update synthesizer settings when preset changes
  useEffect(() => {
    if (synthesizerPresets[selectedPreset]) {
      setSynthesizerSettings(synthesizerPresets[selectedPreset]);
    }
  }, [selectedPreset]);

  // Update currentTime when playing
  useEffect(() => {
    let interval;
    if (isPlaying && !isPaused && audio.duration) {
      interval = setInterval(() => {
        setCurrentTime(audio.getCurrentTime());
      }, 500); // Update every 500ms
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isPaused, audio.duration, audio.getCurrentTime]);

  return (
    <div className="App">
      <div className="main-container">
        {showColorSettings && (
          <ColorSettingsModal
            noteHues={noteHues}
            setNoteHues={setNoteHues}
            setShowColorSettings={setShowColorSettings}
            defaultNoteHues={defaultNoteHues}
          />
        )}

        {!isPlaying && (
          <div>
            <div className="song-selector-container" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <FileUploader
                setCurrentSongName={setCurrentSongName}
                setMidiFile={setMidiFile}
                setMp3File={setMp3File}
                setPianoEnabled={setPianoEnabled}
                setSelectedSongFileName={setSelectedSongFileName}
              />

              <SongSelector
                onSongSelect={handleSongSelect}
                selectedSongFileName={selectedSongFileName}
                setWarning={setWarning}
                setCurrentSongName={setCurrentSongName}
                setFetchingSong={setFetchingSong}
              />

              <MidiSelector
                onMidiSelect={handleMidiSelect}
                selectedMidiFileName={selectedMidiFileName}
                setWarning={setWarning}
                setCurrentSongName={setCurrentSongName}
                setFetchingMidi={setFetchingSong}
              />
            </div>

            <BasicPitchSettings
              generateBrowserMIDI={generateBrowserMIDI}
              setGenerateBrowserMIDI={setGenerateBrowserMIDI}
              onsetThreshold={onsetThreshold}
              setOnsetThreshold={setOnsetThreshold}
              frameThreshold={frameThreshold}
              setFrameThreshold={setFrameThreshold}
              minDurationSec={minDurationSec}
              setMinDurationSec={setMinDurationSec}
            />
          </div>
        )}

        <div className="responsive-controls-container">
          <div className="controls-panel">
            <VisualizationToggles
              bpmAndKey={bpmAndKey}
              setBpmAndKey={setBpmAndKey}
              showWaveform={showWaveform}
              setShowWaveform={setShowWaveform}
              showSpectrograph={showSpectrograph}
              setShowSpectrograph={setShowSpectrograph}
              showWaterfallSpectrograph={showWaterfallSpectrograph}
              setShowWaterfallSpectrograph={setShowWaterfallSpectrograph}
              pianoEnabled={pianoEnabled}
              setPianoEnabled={setPianoEnabled}
              chromaCircle={chromaCircle}
              setChromaCircle={setChromaCircle}
              chromaLine={chromaLine}
              setChromaLine={setChromaLine}
              chromaBar={chromaBar}
              setChromaBar={setChromaBar}
              rms={rms}
              setRms={setRms}
              loudness={loudness}
              setLoudness={setLoudness}
              spectralSpreadGraph={spectralSpreadGraph}
              setSpectralSpreadGraph={setSpectralSpreadGraph}
              isPlaying={isPlaying}
              meydaBufferSize={meydaBufferSize}
              setMeydaBufferSize={setMeydaBufferSize}
              meydaFeaturesToExtract={meydaFeaturesToExtract}
              setMeydaFeaturesToExtract={setMeydaFeaturesToExtract}
            />

            <button className="control-button" onClick={() => setShowColorSettings(true)}>
              Color Settings
            </button>
          </div>
          <div className="keyboard-panel">
            {pianoEnabled && (
              <div className="keyboard-container">
                <KeyboardSVG noteHues={noteHues} />
              </div>
            )}
          </div>
        </div>

        <PlaybackControls
          isPlaying={isPlaying}
          isPaused={isPaused}
          handleStartStop={handleStartStop}
          handlePauseResume={handlePauseResume}
          currentTime={currentTime}
          duration={audio.duration}
          seek={audio.seek}
          conversionComplete={conversionComplete}
          fetchingSong={fetchingSong}
          progress={progress}
          isConverting={isConverting}
          useMic={useMic}
          setUseMic={setUseMic}
          setMp3File={setMp3File}
          setMidiFile={setMidiFile}
          handleStartStopWithMic={handleStartStopWithMic}
          essentiaIsProcessingWholeFile={essentiaIsProcessingWholeFile}
        />

        {warning && <div>{warning}</div>}

        <div className="info-animation-container">
          <SongInfo
            currentSongName={currentSongName}
            essentiaIsProcessingWholeFile={essentiaIsProcessingWholeFile}
            bpm={bpm}
            scaleKey={scaleKey}
            essentiaFeatures={essentiaFeatures}
            mp3File={mp3File}
            dataFromPython={dataFromPython}
            isPlaying={isPlaying}
          />
          <CharacterAnimation isPlaying={isPlaying} dataFromPython={dataFromPython} />
        </div>
      </div>

      <VisualizersContainer
        isPlaying={isPlaying}
        showSpectrograph={showSpectrograph}
        showWaterfallSpectrograph={showWaterfallSpectrograph}
        showWaveform={showWaveform}
        bins={bins}
        setBins={setBins}
        minDecibels={minDecibels}
        setMinDecibels={setMinDecibels}
        maxDecibels={maxDecibels}
        setMaxDecibels={setMaxDecibels}
        smoothing={smoothing}
        setSmoothing={setSmoothing}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        showScroll={showScroll}
        setShowScroll={setShowScroll}
        audio={audio}
        noteHues={noteHues}
        pianoEnabled={pianoEnabled}
        midiFile={midiFile}
        midiNotes={midiNotes}
        synthesizerSettings={synthesizerSettings}
        setSynthesizerSettings={setSynthesizerSettings}
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        presets={synthesizerPresets}
        chromaCircle={chromaCircle}
        spectralSpreadGraph={spectralSpreadGraph}
        chromaLine={chromaLine}
        chromaBar={chromaBar}
        rms={rms}
        loudness={loudness}
        meydaBufferSize={meydaBufferSize}
      />
      <Footer />
    </div>
  );
}
