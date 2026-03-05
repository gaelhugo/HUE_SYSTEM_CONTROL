import { particleConfig } from "./particleConfig.js";
import { FlowField } from "./FlowField.js";
import { Particle } from "./Particle.js";
import { FlockingBehavior } from "./FlockingBehavior.js";

export class ParticleSystem {
  constructor(canvasElement, config = particleConfig) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.config = { ...config };

    this.particles = [];
    this.hands = [];
    this.handVelocities = [];

    // Initialize subsystems
    this.flowField = new FlowField(this.canvas, this.config);
    this.flocking = new FlockingBehavior();

    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.config.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.config.speed;

      const particle = new Particle(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      );

      this.particles.push(particle);
    }
  }

  updateHands(hands, handVelocities) {
    this.hands = hands || [];
    this.handVelocities = handVelocities || [];
  }

  update() {
    // Update the global flow field
    this.flowField.update();

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
        const flow = this.flowField.getFlowAt(particle.x, particle.y);

        // Apply flow force
        particle.applyForce(
          Math.cos(flow.angle) * flow.magnitude,
          Math.sin(flow.angle) * flow.magnitude,
        );

        // Apply steering behaviors for flocking
        const steering = this.flocking.calculateSteering(
          particle,
          this.particles,
        );
        particle.applyForce(steering.x, steering.y);

        // Apply friction for smooth motion (less friction for faster flying)
        particle.applyFriction(0.99);
      }

      // Hand interaction (can trigger impulse)
      if (this.hands.length > 0) {
        this.applyHandForces(particle);
      }

      // Apply speed limits (allow higher speed when thrown)
      particle.limitSpeed(this.config.maxSpeed * 2);

      // Update position
      particle.updatePosition();

      // Handle boundaries
      particle.handleBoundaries(this.canvas, this.config.boundaryMode);

      // Calculate color based on mode
      const speed = particle.getSpeed();
      particle.hue = this.calculateHue(particle, speed);
    });
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

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.flowField.resize(width, height);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
