import toxi from "toxiclibsjs";
import { particleConfig } from "./particleConfig.js";

export class ParticleSystem {
  constructor(canvasElement, config = particleConfig) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.config = { ...config };

    this.particles = [];

    try {
      this.physics = new toxi.physics2d.VerletPhysics2D();
      this.physics.setDrag(1 - this.config.friction);
    } catch (error) {
      this.physics = null;
    }

    this.hands = [];
    this.handVelocities = [];
    this.noiseOffset = 0;

    // Create flow field grid
    this.flowFieldResolution = 30; // Grid cell size in pixels (larger = fewer cells)
    this.flowField = [];
    this.flowFieldUpdateCounter = 0;
    this.flowFieldUpdateInterval = 4; // Update every N frames
    this.initFlowField();

    this.initParticles();
  }

  initFlowField() {
    const cols = Math.ceil(this.canvas.width / this.flowFieldResolution);
    const rows = Math.ceil(this.canvas.height / this.flowFieldResolution);

    this.flowField = [];
    for (let y = 0; y < rows; y++) {
      this.flowField[y] = [];
      for (let x = 0; x < cols; x++) {
        this.flowField[y][x] = { angle: 0, magnitude: 0 };
      }
    }
  }

  updateFlowField() {
    const cols = this.flowField[0].length;
    const rows = this.flowField.length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const noiseVal = this.noise(
          x * this.config.noiseScale + this.noiseOffset,
          y * this.config.noiseScale,
          0,
        );

        // Convert noise to angle (0 to 2π)
        const angle = noiseVal * Math.PI * 2;
        const magnitude = this.config.noiseStrength;

        this.flowField[y][x] = { angle, magnitude };
      }
    }

    this.noiseOffset += this.config.noiseSpeed;
  }

  getFlowAtPosition(x, y) {
    const col = Math.floor(x / this.flowFieldResolution);
    const row = Math.floor(y / this.flowFieldResolution);

    if (
      row >= 0 &&
      row < this.flowField.length &&
      col >= 0 &&
      col < this.flowField[0].length
    ) {
      return this.flowField[row][col];
    }

    return { angle: 0, magnitude: 0 };
  }

  initParticles() {
    for (let i = 0; i < this.config.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.config.speed;

      const particle = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: 0,
        impulse: 0, // Tracks if particle is being thrown
        impulseVx: 0,
        impulseVy: 0,
      };

      this.particles.push(particle);
    }
  }

  updateHands(hands, handVelocities) {
    this.hands = hands || [];
    this.handVelocities = handVelocities || [];
  }

  update() {
    // Update the global flow field every N frames for better performance
    this.flowFieldUpdateCounter++;
    if (this.flowFieldUpdateCounter >= this.flowFieldUpdateInterval) {
      this.updateFlowField();
      this.flowFieldUpdateCounter = 0;
    }

    this.particles.forEach((particle) => {
      // Check if particle has impulse (is being thrown)
      if (particle.impulse > 0) {
        // Particle is in "thrown" state - apply impulse velocity with decay
        particle.vx += particle.impulseVx * particle.impulse;
        particle.vy += particle.impulseVy * particle.impulse;

        // Decay the impulse over time (deceleration phase)
        particle.impulse *= this.config.impulseDecayRate;

        // Apply stronger drag to thrown particles (water resistance)
        particle.vx *= this.config.impulseDrag;
        particle.vy *= this.config.impulseDrag;

        // When impulse is very small, return to normal behavior
        if (particle.impulse < 0.01) {
          particle.impulse = 0;
          particle.impulseVx = 0;
          particle.impulseVy = 0;
        }
      } else {
        // Sample from global flow field
        const flow = this.getFlowAtPosition(particle.x, particle.y);

        // Apply flow force
        particle.vx += Math.cos(flow.angle) * flow.magnitude;
        particle.vy += Math.sin(flow.angle) * flow.magnitude;

        // Very gentle separation to prevent clustering (only 20% of particles for performance)
        if (Math.random() < 0.2) {
          const separationForce = this.separate(particle);
          particle.vx += separationForce.x * 0.05;
          particle.vy += separationForce.y * 0.05;
        }

        // Apply friction (reduced for more responsive movement)
        const effectiveFriction = 0.98;
        particle.vx *= effectiveFriction;
        particle.vy *= effectiveFriction;
      }

      // Hand interaction (can trigger impulse)
      if (this.hands.length > 0) {
        this.applyHandForces(particle);
      }

      // Apply speed limits
      const speed = Math.sqrt(
        particle.vx * particle.vx + particle.vy * particle.vy,
      );
      if (speed > this.config.maxSpeed * 2) {
        // Allow higher speed when thrown
        const scale = (this.config.maxSpeed * 2) / speed;
        particle.vx *= scale;
        particle.vy *= scale;
      }

      // Maintain minimum speed for flocking
      // Apply even during impulse decay to prevent particles from stopping
      if (speed < this.config.speed && speed > 0.1) {
        const scale = this.config.speed / speed;
        particle.vx *= scale;
        particle.vy *= scale;
      } else if (speed <= 0.1) {
        // If particle is nearly stopped, give it a random direction
        const angle = Math.random() * Math.PI * 2;
        particle.vx = Math.cos(angle) * this.config.speed;
        particle.vy = Math.sin(angle) * this.config.speed;
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Handle boundaries
      this.handleBoundaries(particle);

      // Calculate color based on mode
      particle.hue = this.calculateHue(particle, speed);
    });
  }

  flock(particle) {
    const separation = this.separate(particle);
    const alignment = this.align(particle);
    const cohesion = this.cohere(particle);

    // Weight the forces
    separation.x *= this.config.separationStrength;
    separation.y *= this.config.separationStrength;
    alignment.x *= this.config.alignmentStrength;
    alignment.y *= this.config.alignmentStrength;
    cohesion.x *= this.config.cohesionStrength;
    cohesion.y *= this.config.cohesionStrength;

    // Combine forces
    return {
      x: separation.x + alignment.x + cohesion.x,
      y: separation.y + alignment.y + cohesion.y,
    };
  }

  separate(particle) {
    const steer = { x: 0, y: 0 };
    let count = 0;
    const maxNeighbors = 6; // Limit neighbors checked for performance
    const radiusSquared =
      this.config.separationRadius * this.config.separationRadius;

    for (const other of this.particles) {
      if (count >= maxNeighbors) break; // Early exit for performance

      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared > 0 && distSquared < radiusSquared) {
        const distance = Math.sqrt(distSquared);
        const diffX = dx / distance;
        const diffY = dy / distance;
        steer.x += diffX / distance;
        steer.y += diffY / distance;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;
    }

    return this.limitForce(steer);
  }

  align(particle) {
    const steer = { x: 0, y: 0 };
    let count = 0;

    for (const other of this.particles) {
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < this.config.perceptionRadius) {
        steer.x += other.vx;
        steer.y += other.vy;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;

      // Subtract current velocity to get steering force
      steer.x -= particle.vx;
      steer.y -= particle.vy;
    }

    return this.limitForce(steer);
  }

  cohere(particle) {
    const steer = { x: 0, y: 0 };
    let count = 0;

    for (const other of this.particles) {
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < this.config.perceptionRadius) {
        steer.x += other.x;
        steer.y += other.y;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;

      // Steer towards average position
      steer.x -= particle.x;
      steer.y -= particle.y;
    }

    return this.limitForce(steer);
  }

  limitForce(force) {
    const magnitude = Math.sqrt(force.x * force.x + force.y * force.y);
    if (magnitude > this.config.maxForce) {
      force.x = (force.x / magnitude) * this.config.maxForce;
      force.y = (force.y / magnitude) * this.config.maxForce;
    }
    return force;
  }

  applyHandForces(particle) {
    this.hands.forEach((hand, handIndex) => {
      const fingertips = this.handVelocities[handIndex] || [];

      // React to each fingertip
      fingertips.forEach((fingertip) => {
        const tipX = (1 - fingertip.x) * this.canvas.width; // Flipped for mirror
        const tipY = fingertip.y * this.canvas.height;

        const px = particle.x || 0;
        const py = particle.y || 0;

        const dx = px - tipX;
        const dy = py - tipY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const handSpeed = Math.sqrt(
          fingertip.vx * fingertip.vx + fingertip.vy * fingertip.vy,
        );

        // IMPULSE: When fingertip is moving fast and close, throw the particle
        if (handSpeed > 2.0 && distance < this.config.impulseRadius) {
          const impulseStrength =
            (1 - distance / this.config.impulseRadius) *
            this.config.impulseStrength;

          // Set impulse state (acceleration phase)
          particle.impulse = 1.0; // Full impulse

          // Direction is combination of fingertip motion and away from fingertip
          const awayAngle = Math.atan2(dy, dx);
          const motionAngle = Math.atan2(fingertip.vy, -fingertip.vx); // Flipped for mirror

          // Blend the two directions (70% motion direction, 30% away)
          const blendedAngle = motionAngle * 0.7 + awayAngle * 0.3;

          particle.impulseVx = Math.cos(blendedAngle) * impulseStrength;
          particle.impulseVy = Math.sin(blendedAngle) * impulseStrength;
        }
        // Gentle attraction when moving slowly (like water surface tension)
        else if (
          handSpeed < 1.0 &&
          distance < this.config.attractionRadius &&
          particle.impulse === 0
        ) {
          if (
            this.config.interactionMode === "attraction" ||
            this.config.interactionMode === "both"
          ) {
            if (distance > this.config.repulsionRadius) {
              const force =
                (1 - distance / this.config.attractionRadius) *
                this.config.attractionStrength *
                0.3;
              const angle = Math.atan2(dy, dx);
              particle.vx -= Math.cos(angle) * force;
              particle.vy -= Math.sin(angle) * force;
            }
          }
        }
        // Gentle repulsion when very close (surface tension)
        else if (
          distance < this.config.repulsionRadius &&
          particle.impulse === 0
        ) {
          if (
            this.config.interactionMode === "repulsion" ||
            this.config.interactionMode === "both"
          ) {
            const force =
              (1 - distance / this.config.repulsionRadius) *
              this.config.repulsionStrength *
              0.5;
            const angle = Math.atan2(dy, dx);
            particle.vx += Math.cos(angle) * force;
            particle.vy += Math.sin(angle) * force;
          }
        }
      });
    });
  }

  handleBoundaries(particle) {
    const margin = 10;

    switch (this.config.boundaryMode) {
      case "wrap":
        if (particle.x < -margin) particle.x = this.canvas.width + margin;
        if (particle.x > this.canvas.width + margin) particle.x = -margin;
        if (particle.y < -margin) particle.y = this.canvas.height + margin;
        if (particle.y > this.canvas.height + margin) particle.y = -margin;
        break;

      case "bounce":
        if (particle.x < 0 || particle.x > this.canvas.width) {
          particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
          particle.vx *= -0.8;
        }
        if (particle.y < 0 || particle.y > this.canvas.height) {
          particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
          particle.vy *= -0.8;
        }
        break;

      case "clamp":
        particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
        if (particle.x === 0 || particle.x === this.canvas.width)
          particle.vx = 0;
        if (particle.y === 0 || particle.y === this.canvas.height)
          particle.vy = 0;
        break;
    }
  }

  calculateHue(particle, speed) {
    const [minHue, maxHue] = this.config.hueRange;

    switch (this.config.colorMode) {
      case "velocity":
        return minHue + (speed / this.config.maxSpeed) * (maxHue - minHue);

      case "noise":
        const noiseVal =
          Math.sin(particle.x * 0.01 + particle.y * 0.01) * 0.5 + 0.5;
        return minHue + noiseVal * (maxHue - minHue);

      case "distance":
        if (this.hands.length > 0) {
          const hand = this.hands[0];
          const palmX = (1 - hand[0].x) * this.canvas.width;
          const palmY = hand[0].y * this.canvas.height;
          const dx = particle.x - palmX;
          const dy = particle.y - palmY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(
            this.canvas.width ** 2 + this.canvas.height ** 2,
          );
          return minHue + (distance / maxDist) * (maxHue - minHue);
        }
        return minHue;

      case "static":
      default:
        return (minHue + maxHue) / 2;
    }
  }

  draw() {
    // Apply trail effect
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.config.trail})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((particle) => {
      const hue = particle.hue;
      this.ctx.fillStyle = `hsla(${hue}, ${this.config.saturation}%, ${this.config.lightness}%, ${this.config.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(
        particle.x,
        particle.y,
        this.config.particleSize,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    });
  }

  // Simple Perlin-like noise function
  noise(x, y, z = 0) {
    // Using a simple pseudo-random noise based on sine
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.physics.setDrag(1 - this.config.friction);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
