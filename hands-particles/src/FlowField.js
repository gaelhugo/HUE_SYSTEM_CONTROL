export class FlowField {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.resolution = 35; // Grid cell size in pixels
    this.field = [];
    this.noiseOffset = 0;
    this.updateCounter = 0;
    this.updateInterval = 1; // Update every frame
    
    this.init();
  }

  init() {
    const cols = Math.ceil(this.canvas.width / this.resolution);
    const rows = Math.ceil(this.canvas.height / this.resolution);

    this.field = [];
    for (let y = 0; y < rows; y++) {
      this.field[y] = [];
      for (let x = 0; x < cols; x++) {
        this.field[y][x] = { angle: 0, magnitude: 0 };
      }
    }
  }

  update() {
    this.updateCounter++;
    if (this.updateCounter >= this.updateInterval) {
      this.updateField();
      this.updateCounter = 0;
    }
  }

  updateField() {
    const cols = this.field[0].length;
    const rows = this.field.length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Use actual pixel position for proper noise scale
        const xPos = x * this.resolution;
        const yPos = y * this.resolution;
        
        const noiseVal = this.noise(
          xPos * this.config.noiseScale + this.noiseOffset,
          yPos * this.config.noiseScale,
          0,
        );

        // Convert noise to angle (0 to 2π)
        const angle = noiseVal * Math.PI * 2;
        const magnitude = this.config.noiseStrength;

        this.field[y][x] = { angle, magnitude };
      }
    }

    this.noiseOffset += this.config.noiseSpeed;
  }

  getFlowAt(x, y) {
    const col = Math.floor(x / this.resolution);
    const row = Math.floor(y / this.resolution);

    if (
      row >= 0 &&
      row < this.field.length &&
      col >= 0 &&
      col < this.field[0].length
    ) {
      return this.field[row][col];
    }

    return { angle: 0, magnitude: 0 };
  }

  // Simple Perlin-like noise function
  noise(x, y, z = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.init();
  }
}
