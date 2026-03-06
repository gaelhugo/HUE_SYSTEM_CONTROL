# Attention Interface Web

An eye-tracking interface that uses face and iris detection to control a cursor and interact with a document editor through gaze-based quadrant selection.

## Features

- **Eye Tracking**: Real-time iris tracking using MediaPipe Face Landmarker
- **Calibration System**: 9-point calibration for accurate gaze mapping
- **Gaze-Based Cursor**: Control an on-screen pointer with your eyes
- **Quadrant Input System**: Screen divided into 4 quadrants for different text styles
- **Document Editor**: Central document with gaze-controlled text formatting
- **Drift Correction**: Optional automatic calibration drift correction

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser and allow camera access when prompted

## How It Works

### Calibration Process

On first launch, the app will start a calibration sequence:

1. **9-Point Calibration**: Look at each green cross as it appears on screen
2. **Countdown**: 3-second countdown before recording starts at each point
3. **Recording**: Hold your gaze steady for 2 seconds per point
4. **Completion**: Calibration data is saved and gaze tracking begins

### Quadrant System

The screen is divided into 4 input quadrants:

- **Top Left**: Regular text (A)
- **Top Right**: Bold text (B)
- **Bottom Left**: Italic text (I)
- **Bottom Right**: Underlined text (U)

Look at a quadrant to activate its input field, then type to add formatted text to the central document.

### Keyboard Controls

- **C** - Start calibration
- **R** - Start recenter (recalibrate center point only)

## Architecture

### Core Components

#### FaceTracker.js
Handles MediaPipe face and iris detection:
- Initializes MediaPipe Face Landmarker with GPU acceleration
- Manages webcam feed
- Detects 478 facial landmarks including iris positions
- Calculates iris delta from eye center for gaze direction
- Provides real-time face mesh visualization

#### Calibration.js
Manages the calibration and gaze mapping system:
- **9-point calibration**: Records iris positions at known screen locations
- **Median filtering**: Smooths iris position data using a buffer
- **IQR outlier removal**: Filters out blinks and rapid movements
- **Gaze mapping**: Maps iris position to screen coordinates using calibration data
- **Drift correction**: Optional automatic recalibration over time
- **Recenter function**: Quick center-point recalibration
- **Persistence**: Loads/saves calibration from JSON file

#### Pointer.js
Visual cursor controlled by gaze:
- Smooth position updates
- Visual feedback for gaze position

#### ScreenQuadrant.js
Manages quadrant detection and activation:
- Detects which quadrant the gaze cursor is in
- Triggers input field activation based on gaze dwell time

#### InputHandler.js
Handles text input and document formatting:
- Manages input fields for each quadrant
- Applies appropriate text styling
- Updates central document content

#### KeyHandler.js
Keyboard event management:
- Triggers calibration and recenter functions
- Provides keyboard shortcuts

## Configuration

### Calibration Points

Edit `Calibration.js` to modify calibration points:
```javascript
this.calibrationPoints = [
  { x: 0.05, y: 0.05, name: "top-left" },
  { x: 0.5, y: 0.05, name: "top-center" },
  // ... more points
];
```

### Calibration Settings

- `framesToRecord`: Number of frames to record per point (default: 60)
- `countdownDuration`: Countdown before recording (default: 3000ms)
- `bufferSize`: Median filter buffer size (default: 9)
- `driftCorrection`: Enable/disable automatic drift correction

### Face Tracking Settings

In `FaceTracker.js`:
- `numFaces`: Number of faces to detect (default: 1)
- `minFaceDetectionConfidence`: Detection threshold (default: 0.5)
- `minTrackingConfidence`: Tracking threshold (default: 0.5)

## Calibration File Format

Calibration data is saved to `/public/json/calibration.json`:

```json
{
  "points": [
    {
      "name": "top-left",
      "screenPosition": { "x": 0.05, "y": 0.05 },
      "irisPosition": { "x": -0.123, "y": 0.045 }
    }
  ]
}
```

## Dependencies

- **@mediapipe/tasks-vision**: Face and iris tracking
- **@onemorestudio/eventemitterjs**: Event system
- **Vite**: Build tool and dev server

## Browser Requirements

- Modern browser with WebGL support
- Camera access
- Recommended: Chrome or Edge for best MediaPipe performance
- Good lighting conditions for accurate iris tracking

## Tips for Best Results

1. **Lighting**: Ensure good, even lighting on your face
2. **Distance**: Sit 50-70cm from the screen
3. **Stability**: Keep your head relatively still during use
4. **Calibration**: Recalibrate if accuracy decreases
5. **Recenter**: Use the recenter function (R key) if center drift occurs
