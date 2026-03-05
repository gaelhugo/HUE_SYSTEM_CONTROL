export class Particle {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.hue = 0;
    this.impulse = 0;
    this.impulseVx = 0;
    this.impulseVy = 0;
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  applyForce(fx, fy) {
    this.vx += fx;
    this.vy += fy;
  }

  applyFriction(friction) {
    this.vx *= friction;
    this.vy *= friction;
  }

  limitSpeed(maxSpeed) {
    const speed = this.getSpeed();
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  updatePosition() {
    this.x += this.vx;
    this.y += this.vy;
  }

  handleBoundaries(canvas, mode) {
    const margin = 10;

    switch (mode) {
      case "wrap":
        if (this.x < -margin) this.x = canvas.width + margin;
        if (this.x > canvas.width + margin) this.x = -margin;
        if (this.y < -margin) this.y = canvas.height + margin;
        if (this.y > canvas.height + margin) this.y = -margin;
        break;

      case "bounce":
        if (this.x < margin || this.x > canvas.width - margin) {
          this.vx *= -1;
          this.x = Math.max(margin, Math.min(canvas.width - margin, this.x));
        }
        if (this.y < margin || this.y > canvas.height - margin) {
          this.vy *= -1;
          this.y = Math.max(margin, Math.min(canvas.height - margin, this.y));
        }
        break;

      case "clamp":
        this.x = Math.max(margin, Math.min(canvas.width - margin, this.x));
        this.y = Math.max(margin, Math.min(canvas.height - margin, this.y));
        break;
    }
  }
}
