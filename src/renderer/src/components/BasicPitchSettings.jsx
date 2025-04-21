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

import React from 'react';

export default function BasicPitchSettings({
  generateBrowserMIDI,
  setGenerateBrowserMIDI,
  onsetThreshold,
  setOnsetThreshold,
  frameThreshold,
  setFrameThreshold,
  minDurationSec,
  setMinDurationSec,
}) {
  return (
    <div>
      <div className="control-label">
        <input
          className="control-checkbox"
          type="checkbox"
          checked={generateBrowserMIDI}
          onChange={() => setGenerateBrowserMIDI(!generateBrowserMIDI)}
        />
        <label style={{ pointerEvents: 'none', cursor: 'default' }}>Generate MIDI</label>
      </div>
      {generateBrowserMIDI && (
        <>
          <label className="control-label">
            Onset Threshold
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={onsetThreshold}
              onChange={(e) => setOnsetThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </label>
          <label className="control-label">
            Frame Threshold
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={frameThreshold}
              onChange={(e) => setFrameThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </label>
          <label className="control-label">
            Min Duration (sec)
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minDurationSec}
              onChange={(e) => setMinDurationSec(parseFloat(e.target.value))}
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </label>
        </>
      )}
    </div>
  );
}
