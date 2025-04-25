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

import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import path from 'path';
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

let pythonProcess = null;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('org.audiovisualizer');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Get resource path
  ipcMain.on('get-resource-path', (event, resource) => {
    let resourcePath;
    const isProduction = app.isPackaged;

    if (isProduction) {
      // In packaged app, resources are in the extraResources directory at the app root
      const extraResourcesPath = path.join(process.resourcesPath, resource);
      resourcePath = extraResourcesPath;
    } else {
      // In development, resources are in the public directory
      resourcePath = path.join(app.getAppPath(), 'public', resource);
    }

    // Convert to file:// URL for renderer
    event.returnValue = `file://${resourcePath.replace(/\\/g, '/')}`;

    // Log for debugging
    console.log(`Resource request: ${resource}, resolved to: ${resourcePath}`);
  });

  ipcMain.on('process-python-data-async', (event, data) => {
    const sender = event.sender;

    if (data.type === 'init' && !pythonProcess) {
      let pythonExecutable, scriptPath, basePath;

      pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
      scriptPath = path.join(app.getAppPath(), 'resources', 'script.py');

      try {
        const versionOutput = execSync(`"${pythonExecutable}" --version`).toString();
        if (!versionOutput.includes('Python 3.9')) {
          const errorMsg = `Python 3.9 is required, but found: ${versionOutput.trim()}. Set PYTHON_EXECUTABLE to the path of a Python 3.9 executable.`;
          console.error(errorMsg);
          if (!sender.isDestroyed()) {
            sender.send('python-data-result', { error: errorMsg });
          }
          return;
        }
      } catch (err) {
        const errorMsg = `Failed to verify Python version. Ensure ${pythonExecutable} is a valid Python 3.9 executable or set PYTHON_EXECUTABLE. Error: ${err.message}`;
        console.error(errorMsg);
        if (!sender.isDestroyed()) {
          sender.send('python-data-result', { error: errorMsg });
        }
        return;
      }

      if (!fs.existsSync(scriptPath)) {
        console.error(`Python script not found at: ${scriptPath}`);
        if (!sender.isDestroyed()) {
          sender.send('python-data-result', {
            error: `Python script not found at ${scriptPath}`,
          });
        }
        return;
      }

      const env = { ...process.env };

      console.log(`Spawning Python process: ${pythonExecutable} ${scriptPath}`);

      pythonProcess = spawn(pythonExecutable, [scriptPath], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const lines = output.split('\n');
        output = lines.pop();
        for (const line of lines) {
          if (line.trim() && !sender.isDestroyed()) {
            try {
              const result = JSON.parse(line);
              sender.send('python-data-result', result);
            } catch (e) {
              sender.send('python-data-result', {
                error: 'Invalid JSON from Python',
                output: line,
              });
            }
          }
        }
      });

      pythonProcess.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString();
        console.error('Python stderr:', chunk.toString());
      });

      pythonProcess.on('close', (code) => {
        if (!sender.isDestroyed()) {
          sender.send('python-data-result', {
            error: `Python process exited with code ${code}`,
            errorOutput,
          });
        }
        pythonProcess = null;
      });

      pythonProcess.on('error', (err) => {
        if (!sender.isDestroyed()) {
          sender.send('python-data-result', {
            error: `Failed to spawn Python process: ${err.message}`,
          });
        }
        console.error('Python process error:', err);
        pythonProcess = null;
      });
    } else if (pythonProcess && data.type == 'audioChunk') {
      try {
        if (data.data.samples instanceof Float32Array) {
          data.data.samples = Array.from(data.data.samples);
        }
        const tempFilePath = path.join(os.tmpdir(), `audio_data_${Date.now()}.json`);
        fs.writeFileSync(tempFilePath, JSON.stringify(data.data));
        const message = { filePath: tempFilePath };
        pythonProcess.stdin.write(JSON.stringify(message) + '\n');
      } catch (err) {
        if (!sender.isDestroyed()) {
          sender.send('python-data-result', { error: `Failed to write to Python stdin: ${err.message}` });
        }
      }
    } else if (!pythonProcess && data.type !== 'init') {
      if (!sender.isDestroyed()) {
        sender.send('python-data-result', {
          error: 'Python process not initialized',
        });
      }
    }
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
