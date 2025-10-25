# Text-to-Speech Reader

A Chrome extension that enables text-to-speech functionality on any webpage. Click on any text to have it read aloud with visual highlighting.

## Features

- **Click to Read**: Click on any text element to start TTS
- **Visual Highlighting**: Current word and line are highlighted during playback
- **Playback Controls**: Play, pause, stop, and speed adjustment
- **Floating Widget**: Easy-to-use control panel that follows your reading
- **Smart Text Selection**: Automatically handles text extraction from various elements

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this folder
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any webpage
2. Click on any text element to start reading
3. Use the floating control panel to manage playback
4. Click the extension icon to toggle the widget on/off

## Controls

- **Play/Pause**: Toggle playback
- **Stop**: Stop and reset
- **Speed**: Adjust reading speed (0.5x to 3x)
- **Close**: Hide the widget

## Permissions

- `activeTab`: Access to the current tab for text reading
- `scripting`: Inject content scripts for TTS functionality
