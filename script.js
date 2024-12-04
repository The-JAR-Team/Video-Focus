// script.js
let player;
let isPlaying = true;
let focusData = [];
let focusInterval;
const graphUpdateInterval = 3000; // 10 seconds

// Gaze Tracking Variables
let gazeCounter = { left: 0, right: 0, center: 0 };
let currentGaze = 'Looking center';
const thresholdFrames = 3;

// Chart Variable
let chart;

// Flag to check if the player is ready
let isPlayerReady = false;

// Make onYouTubeIframeAPIReady globally accessible
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '315',
    width: '560',
    videoId: '', // Start with no video
    events: {
      'onReady': onPlayerReady
    }
  });
}

// Assign the function to the global window object
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Player Ready Callback
function onPlayerReady(event) {
  console.log("Player is ready.");
  isPlayerReady = true;

  // Enable the 'Load Video' button
  const loadVideoButton = document.getElementById('loadVideo');
  if (loadVideoButton) loadVideoButton.disabled = false;

  // Enable all 'Sample Video' buttons
  const sampleVideos = document.querySelectorAll('.sampleVideo');
  sampleVideos.forEach(item => {
    item.disabled = false;
  });
}

// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM Elements
  const videoElement = document.getElementById('video');
  const statusElement = document.getElementById('status');
  const focusGraph = document.getElementById('focusGraph');
  const graphCtx = focusGraph.getContext('2d');

  // Initialize the focus graph
  chart = new Chart(graphCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Focus',
        data: [],
        backgroundColor: []
      }]
    },
    options: {
      scales: {
        x: { display: true },
        y: {
          display: true,
          suggestedMin: 0,
          suggestedMax: 1
        }
      }
    }
  });

  // Initially disable 'Load Video' and 'Sample Video' buttons
  const loadVideoButton = document.getElementById('loadVideo');
  if (loadVideoButton) loadVideoButton.disabled = true;

  const sampleVideos = document.querySelectorAll('.sampleVideo');
  sampleVideos.forEach(item => {
    item.disabled = true;
  });

  // Event Listener for 'Load Video' Button
  if (loadVideoButton) {
    loadVideoButton.addEventListener('click', () => {
      const videoInput = document.getElementById('videoInput').value;
      const videoId = extractVideoID(videoInput);
      if (videoId) {
        loadVideoWithRetry(videoId);
      } else {
        alert('Invalid YouTube URL or Video ID.');
      }
    });
  }

  // Event Listeners for 'Sample Video' Buttons
  sampleVideos.forEach(item => {
    item.addEventListener('click', () => {
      const videoId = item.getAttribute('data-videoid');
      if (videoId) {
        loadVideoWithRetry(videoId);
      }
    });
  });

  // Initialize MediaPipe FaceMesh
  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(onResults);

  // Initialize Camera and Start Processing Frames
  if (videoElement) {
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    camera.start();
  } else {
    console.error('Webcam video element not found.');
  }

  // Start Collecting Focus Data
  startFocusInterval();
});

// Function to Load Video with Retry Mechanism
function loadVideoWithRetry(videoId, retries = 5, delay = 1000) {
  if (isPlayerReady && player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId);
    isPlaying = true;
    focusData = [];
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    console.log(`Video loaded: ${videoId}`);
  } else if (retries > 0) {
    console.log(`Player not ready, retrying in ${delay}ms... (${retries} retries left)`);
    setTimeout(() => {
      loadVideoWithRetry(videoId, retries - 1, delay);
    }, delay);
  } else {
    alert('Failed to load video. Please try again later.');
  }
}

// Start Collecting Focus Data at Intervals
function startFocusInterval() {
  focusInterval = setInterval(() => {
    focusData.push(isPlaying ? 1 : 0);
    updateGraph();
  }, graphUpdateInterval);
}

function updateGraph() {
  if (!chart) return; // Ensure chart is initialized
  const labels = focusData.map((_, index) => `${index * 3}-${(index + 1) * 3}s`);
  chart.data.labels = labels;
  chart.data.datasets[0].data = focusData;
  chart.data.datasets[0].backgroundColor = focusData.map(value => value ? '#00ff00' : '#ff0000');
  chart.update();
}

// Function to Extract Video ID from URL or Direct ID
function extractVideoID(input) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;
  const match = input.match(urlRegex);
  if (match && match[1].length === 11) {
    return match[1];
  } else if (input.length === 11) {
    return input;
  } else {
    return null;
  }
}

// Function to Play the Video
function playVideo() {
  if (player && typeof player.playVideo === 'function') {
    player.playVideo();
    isPlaying = true;
    console.log("Video resumed.");
  }
}

// Function to Pause the Video
function pauseVideo() {
  if (player && typeof player.pauseVideo === 'function') {
    player.pauseVideo();
    isPlaying = false;
    console.log("Video paused.");
  }
}

// Handle Results from FaceMesh
function onResults(results) {
  const statusElement = document.getElementById('status');
  if (!statusElement) return;

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    const gaze = estimateGaze(landmarks);
    handleVideoPlayback(gaze);
    statusElement.textContent = `Status: ${gaze}`;
  } else {
    statusElement.textContent = 'Status: Face not detected.';
    handleVideoPlayback('Face not detected');
  }
}

// Function to Estimate Gaze Direction
function estimateGaze(landmarks) {
  const leftEye = {
    outer: landmarks[33],
    inner: landmarks[133],
    center: landmarks[468]
  };

  const rightEye = {
    outer: landmarks[362],
    inner: landmarks[263],
    center: landmarks[473]
  };

  const leftGazeRatio = (leftEye.center.x - leftEye.outer.x) / (leftEye.inner.x - leftEye.outer.x);
  const rightGazeRatio = (rightEye.center.x - rightEye.outer.x) / (rightEye.inner.x - rightEye.outer.x);

  const avgGazeRatio = (leftGazeRatio + rightGazeRatio) / 2;

  if (avgGazeRatio < 0.45) {
    gazeCounter.left++;
    gazeCounter.right = 0;
    gazeCounter.center = 0;
  } else if (avgGazeRatio > 0.55) {
    gazeCounter.right++;
    gazeCounter.left = 0;
    gazeCounter.center = 0;
  } else {
    gazeCounter.center++;
    gazeCounter.left = 0;
    gazeCounter.right = 0;
  }

  if (gazeCounter.left >= thresholdFrames && currentGaze !== 'Looking left') {
    currentGaze = 'Looking left';
  } else if (gazeCounter.right >= thresholdFrames && currentGaze !== 'Looking right') {
    currentGaze = 'Looking right';
  } else if (gazeCounter.center >= thresholdFrames && currentGaze !== 'Looking center') {
    currentGaze = 'Looking center';
  }

  return currentGaze;
}

// Function to Handle Video Playback Based on Gaze
function handleVideoPlayback(gaze) {
  if (gaze === 'Looking center') {
    if (!isPlaying) {
      playVideo();
    }
  } else {
    if (isPlaying) {
      pauseVideo();
    }
  }
}