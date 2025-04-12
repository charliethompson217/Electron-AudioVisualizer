# Audio Visualizer and Synthesizer Application

An Electron application with React

This application provides advanced audio visualization and synthesis.

## Table of Contents

- [Features and Usage](#features-and-usage)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Install Node.js and npm](#1-install-nodejs-and-npm)
    - [Windows](#windows)
    - [macOS](#macos)
    - [Linux](#linux)
  - [2. Clone the Repository](#2-clone-the-repository)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Run the applicaton](#4-run-the-applicaton)
- [License](#license)

## Features and Usage

Once you click "Play", the application will start visualizing the audio input based on the selected parameters.
The visualization displays frequency content with musical note correspondence.
You can interact with the visualization:
Hover over frequencies to see exact values and corresponding notes.
Adjust parameters in real-time.

- **Audio Input Options**:

  - **Use Mic**: Click “Use Mic” to visualize audio from your microphone (data from the microphone never leaves your device).
  - **Audio Files**: Upload local `mp3`, `wav`, or `ogg` files.
  - **MIDI Files**: Play `midi` files through the synthesizer.

- **Real-time Audio Analysis**: Uses [Meyda](https://github.com/meyda/meyda) and the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) to visualize audio input (MP3, WAV, OGG, Microphone) in real-time.

  - **FFT Analysis**: Adjustable FFT bin sizes, smoothing factors, and frequency range.
  - **Wavform Display**: Adjustable scaling factors.
  - **RMS**: Monitors overall amplitude.
  - **Chroma Circle & Line Graphs**: Show pitch classes in multiple visual forms.
  - **Spectral Centroid**: Detects the frequency “center of mass”.

- **Synthesizer**: Uses [Tone.js](https://github.com/Tonejs/Tone.js)

  - **Oscilator Types**: Offers multiple oscillator types (sine, square, sawtooth, triangle, custom) Adjust amplitudes of harmonics for custom oscillator.
  - **ADSR Sliders**: Modify the Attack, Decay, Sustain, and Release parameters.
  - **Virtual Piano & MIDI Support**: Play notes via your computer keyboard or load MIDI files to drive the synthesizer.

- **Piano Roll**: Visualize MIDI notes in realtime on a piano roll

- **Audio-to-MIDI Conversion**: Allows conversion of MP3 or other audio formats to MIDI with [Spotify’s Basic Pitch](https://github.com/spotify/basic-pitch.git) for realtime visualization through the piano roll.

- **BPM and Key detection**: Allows for detection of BPM and key using [essentia.js](https://github.com/MTG/essentia.js)

### Virtual Piano Keyboard

- **Enable Piano**: Check the "Piano" checkbox to enable the virtual piano.
- **Play Notes**: Use your computer keyboard to play notes.
  - **Keys**:
    - `s`, `d`, `g`, `h`, `j`: Sharp notes.
    - `z`, `x`, `c`, `v`, `b`, `n`, `m`: Natural notes.
  - **Octave Control**:
    - `Arrow Right`: Increase octave.
    - `Arrow Left`: Decrease octave.
  - **Volume Control**:
    - `Arrow Up`: Increase volume.
    - `Arrow Down`: Decrease volume.
  - **Stop All Notes**:
    - `Space`: Stop all notes instantly.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js and npm**: You need to have Node.js and npm (Node Package Manager) installed on your machine.

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Installation

Follow these steps to set up and run the project on your local machine.

### 1. Install Node.js and npm:

Node.js is a JavaScript runtime that allows you to run JavaScript on the server side. npm is the default package manager for Node.js.

#### Windows

1. **Download the Installer**:

   - Visit the [Node.js official website](https://nodejs.org/en/download/) and download the Windows installer (.msi) for the LTS (Long Term Support) version.

2. **Run the Installer**:

   - Double-click the downloaded `.msi` file.
   - Follow the prompts in the installer, accepting the license agreement and choosing the default installation settings.

3. **Verify Installation**:

   - Open Command Prompt (`cmd`) or PowerShell.
   - Run the following commands to verify that Node.js and npm are installed:

     ```
     node -v
     npm -v
     ```

   - You should see the version numbers of Node.js and npm.

#### macOS

1. **Download the Installer**:

   - Visit the [Node.js official website](https://nodejs.org/en/download/) and download the macOS installer (.pkg) for the LTS version.

2. **Run the Installer**:

   - Double-click the downloaded `.pkg` file.
   - Follow the installation prompts.

3. **Verify Installation**:

   - Open Terminal.
   - Run the following commands:

     ```
     node -v
     npm -v
     ```

   - Version numbers should be displayed.

Alternatively, you can use Homebrew to install Node.js:

The script explains what it will do and then pauses before it does it. Read about other [installation options](https://docs.brew.sh/Installation).

1. **Install Homebrew**:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. **Install Node.js**:

```
brew update
brew install node
```

#### Linux

1. **Update Package Index:**:

```
sudo apt update
```

2. **Install Node.js and npm**:

```
sudo apt install nodejs npm
```

4. **Verify Installation**:

```
node -v
npm -v
```

### 2. Clone the Repository:

You need to clone the project repository from GitHub to your local machine.

1. **Install Git** (if not already installed):
   - **Windows**: Download and install Git from [git-scm.com](https://git-scm.com/download/win).
   - **macOS**: Install via Homebrew:
     ```
     brew install git
     ```
   - **Debian/Ubuntu**:
     ```
     sudo apt install git
     ```
2. **Clone the Repository**:
   Open your terminal (Command Prompt or PowerShell on Windows) and run:
   ```
   git clone https://github.com/charliethompson217/Electron-AudioVisualizer.git
   ```
3. **Navigate to the Project Directory**

```
cd Electron-AudioVisualizer
```

### 3. Install Dependencies:

Install the required Node.js packages using npm.

```
npm install
```

This command reads the package.json file and installs all listed dependencies into a node_modules folder.

### 4. Run the applicaton:

Start the application in development mode.

### Development

```bash
$ npm run dev
```

This will start the application in a new window

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

This outputs a production build to the dist directory

## License

This project is licensed under the [GNU AFFERO GENERAL PUBLIC LICENSE](LICENSE).
