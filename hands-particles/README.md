# Hands Particles

An interactive particle system that reacts to hand movements using MediaPipe hand tracking and toxiclibjs physics. Create visual effects by moving your hands in front of the camera.

## Features

- **Hand Tracking**: Real-time hand detection using MediaPipe Vision (up to 2 hands)
- **Particle System**: Physics-based particle system with Perlin noise for organic movement
- **Interactive**: Particles react to hand movements with repulsion/attraction forces
- **Configurable**: Extensive configuration options for customization
- **Mirror Mode**: Video feed is flipped for natural interaction
- **Multiple Color Modes**: Dynamic coloring based on velocity, noise, distance, or static
- **Hand Visualization**: Real-time hand skeleton overlay on particle canvas

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

## Controls

- **R** - Switch to repulsion mode only
- **A** - Switch to attraction mode only
- **B** - Switch to both repulsion and attraction (default)
- **C** - Cycle through color modes (velocity, noise, distance, static)
- **H** - Show help in console

## Configuration

Edit `src/particleConfig.js` to customize the particle system:

### Particle Settings

- `particleCount`: Number of particles (default: 500)
- `particleSize`: Size of each particle (default: 2)

### Movement

- `speed`: Base movement speed (default: 1.0)
- `maxSpeed`: Maximum particle velocity (default: 3.0)
- `friction`: Particle friction/drag (default: 0.98)

### Hand Interaction

- `repulsionRadius`: Distance for repulsion effect (default: 150)
- `repulsionStrength`: Strength of repulsion (default: 0.8)
- `attractionRadius`: Distance for attraction effect (default: 200)
- `attractionStrength`: Strength of attraction (default: 0.3)
- `interactionMode`: 'repulsion', 'attraction', or 'both'

### Perlin Noise

- `noiseScale`: Scale of noise field (default: 0.003)
- `noiseStrength`: Influence of noise on movement (default: 0.5)
- `noiseSpeed`: Speed of noise evolution (default: 0.0005)
- `amplitude`: Amplitude of noise-based movement (default: 100)

### Visual

- `trail`: Trail effect (0 = full trail, 1 = no trail) (default: 0.1)
- `colorMode`: Color calculation method
  - `velocity`: Color based on particle speed
  - `noise`: Color based on Perlin noise
  - `distance`: Color based on distance from hand
  - `static`: Single color
- `hueRange`: HSL hue range [min, max] (default: [180, 280])
- `saturation`: Color saturation % (default: 70)
- `lightness`: Color lightness % (default: 60)
- `alpha`: Particle opacity (default: 0.8)

### Boundaries

- `boundaryMode`: How particles behave at edges
  - `wrap`: Particles wrap around edges
  - `bounce`: Particles bounce off edges
  - `clamp`: Particles stop at edges

## Architecture

### HandsTracking.js

Handles MediaPipe hand detection:

- Initializes MediaPipe HandLandmarker
- Manages camera feed (hidden, mirrored)
- Detects hand landmarks in real-time
- Draws hand skeleton on canvas
- Provides hand data to particle system

### ParticleSystem.js

Manages the physics-based particle system:

- Uses toxiclibjs for physics simulation
- Implements Perlin noise for organic movement
- Handles hand-particle interactions (repulsion/attraction)
- Manages particle rendering with trails
- Supports multiple color modes

### particleConfig.js

Central configuration file for all particle system parameters.

### main.js

Application entry point:

- Creates fullscreen canvas
- Initializes both systems
- Manages animation loop
- Handles keyboard controls
- Manages window resize events

## Dependencies

- **@mediapipe/tasks-vision**: Hand tracking
- **toxiclibsjs**: Physics simulation
- **Vite**: Build tool and dev server

## Browser Requirements

- Modern browser with WebGL support
- Camera access
- Recommended: Chrome or Edge for best MediaPipe performance
