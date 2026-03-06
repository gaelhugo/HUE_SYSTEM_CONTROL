# Philips Hue Control Demo

A web-based control interface for Philips Hue smart lights featuring face tracking attention detection and natural language control via local LLM.

## Features

- **Hue Bridge Connection**: Direct connection to Philips Hue bridge on local network
- **Light Discovery**: Automatic detection and display of all connected lights
- **Face Tracking**: Real-time face rotation and gaze detection using MediaPipe
- **Attention Controller**: Control lights based on head rotation and eye gaze direction
- **Natural Language Control**: Control lights using plain English via local LLM
- **Live Monitoring**: Real-time activity log and light status display

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Philips Hue Bridge

- Ensure your Philips Hue bridge is connected to the same network
- Find your bridge IP address (check your router or use the Hue app)
- Have physical access to press the link button on the bridge

### 3. Set Up Local LLM (Optional)

For natural language control, you need a local LLM server:

1. Install [LM Studio](https://lmstudio.ai/) or similar
2. Load a compatible model (e.g., Llama, Mistral)
3. Start the local server on `http://localhost:1234`

### 4. Run the Application

```bash
npm run dev
```

## Usage

### Connecting to Hue Bridge

1. Enter your bridge IP address (e.g., `192.168.2.4`)
2. Click **Connect**
3. If prompted, press the **link button** on your Hue bridge
4. Click **Connect** again

Once connected, all discovered lights will be displayed with their current status.

### Attention Controller

The Attention Controller uses face tracking to control lights based on your attention:

1. Click **Activate** to start face tracking
2. Allow camera access when prompted
3. The system will track:
   - **Head Rotation**: Turn left/right to trigger lights
   - **Gaze Direction**: Enable "Iris detection" checkbox for eye gaze tracking

#### Attention Modes

**Head Rotation Mode** (default):
- Turn head **left** (< -30°): Turns on light #2
- Turn head **right** (> 30°): Turns on light #2
- Face **center**: Turns off all lights

**Iris Detection Mode** (checkbox enabled):
- Look **left**: Turns on light #2
- Look **right**: Turns on light #5
- Look **center**: Turns off all lights

### Natural Language Control

Control your lights using plain English:

**Examples:**
- "Turn on light 1"
- "Turn off all lights"
- "Set light 2 to blue"
- "Change all lights to red"
- "Turn on all lights"

**Available Colors:**
- red, green, blue, yellow, purple, orange, pink, white, cyan

The system uses a local LLM to parse your commands and execute the appropriate functions.

## Architecture

### HueBridge.js

Manages Philips Hue bridge communication:
- **Connection**: Handles bridge registration and authentication
- **Light Control**: Turn lights on/off, set colors
- **State Management**: Tracks light states and refreshes from bridge
- **Color Mapping**: Converts color names to CIE xy color space
- **Persistence**: Stores bridge credentials in localStorage

#### Available Methods:
- `connect()`: Connect to bridge
- `turnOnLight(lightId)`: Turn on specific light
- `turnOffLight(lightId)`: Turn off specific light
- `setColor(lightId, color)`: Set light color
- `setAllColors(color)`: Set all lights to same color
- `turnOnAllLights()`: Turn on all lights
- `turnOffAllLights()`: Turn off all lights
- `refreshLights()`: Update light states from bridge

### FaceTracker.js

Real-time face and iris tracking:
- **Face Detection**: Uses MediaPipe Face Landmarker
- **Rotation Detection**: Calculates yaw (Y-axis rotation) from transformation matrix
- **Iris Tracking**: Detects iris position relative to eye center
- **Event System**: Emits events for rotation and gaze changes
- **Visualization**: Draws face mesh and landmarks on canvas

#### Events:
- `rotationLeft`: Head turned left (yaw < -30°)
- `rotationRight`: Head turned right (yaw > 30°)
- `noRotation`: Head centered
- `gazeLeft`: Eyes looking left
- `gazeRight`: Eyes looking right
- `gazeCenter`: Eyes centered

### LLMFunctionCaller.js

Natural language processing for light control:
- **LLM Integration**: Connects to local LLM server (LM Studio compatible)
- **Function Calling**: Maps natural language to Hue bridge functions
- **JSON Parsing**: Extracts function calls from LLM responses
- **Argument Mapping**: Handles various parameter formats
- **Error Handling**: Graceful fallbacks for parsing errors

#### Supported Functions:
- `turn_on_light`: Turn on specific light
- `turn_off_light`: Turn off specific light
- `turn_on_all_lights`: Turn on all lights
- `turn_off_all_lights`: Turn off all lights
- `set_color`: Set specific light color
- `set_all_colors`: Set all lights to same color

### HueControlApp (main.js)

Main application controller:
- Coordinates all components
- Manages UI state and updates
- Handles user interactions
- Maintains activity log
- Implements state tracking to prevent duplicate commands

## Configuration

### Bridge IP

Default IP is set to `192.168.2.4`. Update in `index.html`:
```html
<input type="text" id="bridge-ip" value="192.168.2.4" />
```

### LLM Server

Default server is `http://localhost:1234`. Update in `LLMFunctionCaller.js`:
```javascript
this.baseUrl = "http://localhost:1234/v1";
```

### Face Tracking Thresholds

In `FaceTracker.js`:
```javascript
// Rotation thresholds
if (yaw < -30) { /* left */ }
else if (yaw > 30) { /* right */ }

// Gaze thresholds
if (avgX < -0.03) { /* left */ }
else if (avgX > 0.03) { /* right */ }
```

### Light Mappings

In `main.js`, customize which lights respond to attention events:
```javascript
// Rotation left/right
this.hueBridge.turnOnLight(2);

// Gaze right
this.hueBridge.turnOnLight(5);
```

## Dependencies

- **@mediapipe/tasks-vision**: Face and iris tracking
- **@onemorestudio/eventemitterjs**: Event system
- **Vite**: Build tool and dev server

## Browser Requirements

- Modern browser with WebGL support
- Camera access for face tracking
- Same local network as Philips Hue bridge
- Recommended: Chrome or Edge for best MediaPipe performance

## Troubleshooting

### Bridge Connection Issues
- Verify bridge IP address
- Ensure bridge and computer are on same network
- Press the link button when prompted
- Check browser console for error messages

### Face Tracking Issues
- Ensure good lighting
- Allow camera permissions
- Keep face visible to camera
- Check canvas displays video feed

### LLM Control Issues
- Verify LM Studio or LLM server is running on port 1234
- Check server endpoint in browser console
- Ensure model is loaded and responding
- Try simpler commands first

## Security Notes

- Bridge credentials are stored in browser localStorage
- All communication is over local network HTTP
- No external servers are contacted (except for MediaPipe CDN)
- LLM runs locally on your machine
