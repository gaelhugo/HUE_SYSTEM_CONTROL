export class FlockingBehavior {
  constructor() {
    this.perceptionRadius = 120;
    this.separationRadius = 60;
    this.alignmentStrength = 0.15;
    this.separationStrength = 0.2;
  }

  calculateSteering(particle, allParticles) {
    let alignmentX = 0, alignmentY = 0;
    let separationX = 0, separationY = 0;
    let alignCount = 0, separateCount = 0;

    for (const other of allParticles) {
      if (other === particle) continue;

      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Alignment - steer towards average heading of neighbors
      if (dist > 0 && dist < this.perceptionRadius) {
        alignmentX += other.vx;
        alignmentY += other.vy;
        alignCount++;
      }

      // Separation - steer away from nearby particles
      if (dist > 0 && dist < this.separationRadius) {
        const force = (this.separationRadius - dist) / this.separationRadius;
        separationX += (dx / dist) * force;
        separationY += (dy / dist) * force;
        separateCount++;
      }

      // Early exit for performance
      if (alignCount + separateCount > 15) break;
    }

    let steerX = 0, steerY = 0;

    // Apply alignment
    if (alignCount > 0) {
      alignmentX /= alignCount;
      alignmentY /= alignCount;

      // Steering = desired - current (stronger for bird-like coordination)
      steerX += (alignmentX - particle.vx) * this.alignmentStrength;
      steerY += (alignmentY - particle.vy) * this.alignmentStrength;
    }

    // Apply separation
    if (separateCount > 0) {
      separationX /= separateCount;
      separationY /= separateCount;

      steerX += separationX * this.separationStrength;
      steerY += separationY * this.separationStrength;
    }

    return { x: steerX, y: steerY };
  }
}
