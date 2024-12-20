# YouTube Video Player with Gaze Detection

## Overview
Simple Demo!!!
This project integrates a YouTube video player with gaze detection to monitor user focus. When the user's gaze deviates from the screen, the video playback pauses automatically. Focus data is visualized using a real-time graph.

## Try Now!
[Click here now to try our app](https://the-jar-team.github.io/Video-Focus/)


## Features
- Play and pause YouTube videos based on gaze direction.
- Monitor user focus and display it in a bar graph.
- Load videos via URL, ID, or pre-defined sample links.
- Responsive and accessible design.

## File Structure
- `index.html`: HTML structure for the app.
- `script.js`: Main JavaScript logic, including YouTube API, MediaPipe FaceMesh, and focus graph updates.
- `styles.css`: Styling for a clean, dark-mode interface.

## Getting Started
1. Open `index.html` in your browser.
2. Enter a YouTube URL or video ID to load a video.
3. Gaze detection requires camera access. Grant permission when prompted.

## Requirements
- A modern browser with JavaScript enabled.
- Internet connection for loading APIs:
  - YouTube IFrame API
  - MediaPipe FaceMesh
  - Chart.js

## How It Works
1. **Gaze Detection**:
   - Tracks face landmarks using MediaPipe FaceMesh.
   - Estimates gaze direction and pauses the video if the user looks away.
2. **Focus Graph**:
   - Updates every 3 seconds with focus data (1 = focused, 0 = distracted).
   - Visualized using Chart.js.
3. **Video Playback**:
   - Integrates with YouTube IFrame Player API for seamless playback.
