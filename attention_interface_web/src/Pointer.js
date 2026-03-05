export default class Pointer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.size = 20;
    this.color = "#FF0000";
    this.lineWidth = 2;
    this.lerpFactor = 0.05;
  }

  setPosition(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  update() {
    this.x = this.lerp(this.x, this.targetX, this.lerpFactor);
    this.y = this.lerp(this.y, this.targetY, this.lerpFactor);
  }

  setSize(size) {
    this.size = size;
  }

  setColor(color) {
    this.color = color;
  }

  draw() {
    this.update();

    this.ctx.save();

    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";

    this.ctx.beginPath();
    this.ctx.moveTo(this.x - this.size, this.y);
    this.ctx.lineTo(this.x + this.size, this.y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y - this.size);
    this.ctx.lineTo(this.x, this.y + this.size);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
