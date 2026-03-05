export const particleConfig = {
  // Particle count
  particleCount: 6000,

  // Movement
  speed: 3.0,
  maxSpeed: 8.0,

  // Physics
  friction: 0.98,
  springStrength: 0.01,

  // Hand interaction
  repulsionRadius: 200,
  repulsionStrength: 5.0,
  attractionRadius: 300,
  attractionStrength: 2.0,
  interactionMode: "both", // 'repulsion', 'attraction', or 'both'

  // Impulse physics (water-like throwing)
  impulseRadius: 100,
  impulseStrength: 15.0,
  impulseDrag: 0.96, // How quickly thrown particles slow down
  impulseDecayRate: 0.93, // How quickly impulse effect fades

  // Fluid flow (Perlin noise)
  noiseScale: 0.002,
  noiseStrength: 0.3,
  noiseSpeed: 0.001,

  // Flocking behavior
  perceptionRadius: 100,
  separationRadius: 80,
  cohesionStrength: 0.0,
  alignmentStrength: 0.0,
  separationStrength: 0.2,
  maxForce: 0.5,

  // Visual
  particleSize: 10,
  trail: 1, // 0 = full trail, 1 = no trail (lower = less fading)
  colorMode: "velocity", // 'velocity', 'noise', 'distance', 'static'

  // Color ranges (HSL)
  hueRange: [180, 280],
  saturation: 70,
  lightness: 60,
  alpha: 0.8,

  // Amplitude
  amplitude: 100,

  // Boundaries
  boundaryMode: "bounce", // 'wrap', 'bounce', 'clamp'
};
