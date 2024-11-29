let player;
let isPlaying = true;
let focusData = [];
let focusInterval;
let graphUpdateInterval = 10000; // 10 seconds

const videoElement = document.getElementById('video');
const statusElement = document.getElementById('status');
const focusGraph = document.getElementById('focusGraph');
const graphCtx = focusGraph.getContext('2d');

let gazeCounter = { left: 0, right: 0, center: 0 };
let currentGaze = 'Looking center';
const thresholdFrames = 3;

// Initialize the focus graph
let chart = new Chart(graphCtx, {
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

// Start collecting focus data
function startFocusInterval() {
  focusInterval = setInterval(() => {
    focusData.push(isPlaying ? 1 : 0);
    updateGraph();
  }, graphUpdateInterval);
}

// Update the focus graph
function updateGraph() {
  const labels = focusData.map((_, index) => `${index * 10}-${(index + 1) * 10}s`);
  chart.data.labels = labels;
  chart.data.datasets[0].data = focusData;
  chart.data.datasets[0].backgroundColor = focusData.map(value => value ? '#00ff00' : '#ff0000');
  chart.update();
}

// Load the YouTube IFrame Player API
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '315',
    width: '560',
    videoId: '',
    events: {
      'onReady': onPlayerReady
    }
  });
}

// Player ready callback
function onPlayerReady(event) {
  console.log("Player is ready.");
}

// Function to play the video
function playVideo() {
  if (player && typeof player.playVideo === 'function') {
    player.playVideo();
    isPlaying = true;
    console.log("Video resumed.");
  }
}

// Function to pause the video
function pauseVideo() {
  if (player && typeof player.pauseVideo === 'function') {
    player.pauseVideo();
    isPlaying = false;
    console.log("Video paused.");
  }
}

// Load video based on input
document.getElementById('loadVideo').addEventListener('click', () => {
  const videoInput = document.getElementById('videoInput').value;
  const videoId = extractVideoID(videoInput);
  if (videoId) {
    player.loadVideoById(videoId);
    isPlaying = true;
    focusData = [];
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  } else {
    alert('Invalid YouTube URL or Video ID.');
  }
});

// Load sample videos on click
document.querySelectorAll('.sampleVideo').forEach(item => {
  item.addEventListener('click', () => {
    const videoId = item.getAttribute('data-videoid');
    player.loadVideoById(videoId);
    isPlaying = true;
    focusData = [];
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  });
});

// Function to extract Video ID from URL or ID
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

// Access the webcam
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

camera.start();

// Start collecting focus data
startFocusInterval();

// Handle results from FaceMesh
function onResults(results) {
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

// Function to estimate gaze direction
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

// Function to handle video playback
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
