export default class Calibration {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.isCalibrating = false;
    this.currentStep = 0;
    this.calibrationPoints = [
      { x: 0.05, y: 0.05, name: "top-left" },
      { x: 0.5, y: 0.05, name: "top-center" },
      { x: 0.95, y: 0.05, name: "top-right" },
      { x: 0.05, y: 0.5, name: "middle-left" },
      { x: 0.5, y: 0.5, name: "center" },
      { x: 0.95, y: 0.5, name: "middle-right" },
      { x: 0.05, y: 0.95, name: "bottom-left" },
      { x: 0.5, y: 0.95, name: "bottom-center" },
      { x: 0.95, y: 0.95, name: "bottom-right" },
    ];
    this.recordedData = [];
    this.calibrationComplete = false;
    this.crossSize = 30;
    this.recordingFrames = 0;
    this.framesToRecord = 60;
    this.tempIrisData = [];
    this.countdownStartTime = null;
    this.countdownDuration = 3000;
    this.isCountingDown = false;
    this.driftCorrection = false;
    this.recentPositions = [];
    this.maxRecentPositions = 60;
    this.isRecentering = false;
    this.recenterFrames = 0;
    this.recenterData = [];
    this.irisBuffer = [];
    this.bufferSize = 9;
  }

  start() {
    this.isCalibrating = true;
    this.currentStep = 0;
    this.recordedData = [];
    this.calibrationComplete = false;
    this.countdownStartTime = Date.now();
    this.isCountingDown = true;
  }

  startRecenter() {
    if (!this.calibrationComplete) return;
    this.isRecentering = true;
    this.recenterFrames = 0;
    this.recenterData = [];
    console.log("Recentering... look at the center of the screen");
  }

  async loadFromFile(filePath = "/json/calibration.json") {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error("Calibration file not found");
      }

      const data = await response.json();

      if (!data.points || data.points.length < 1) {
        throw new Error("Invalid calibration data");
      }

      this.recordedData = data.points.map((point) => ({
        point: {
          x: point.screenPosition.x,
          y: point.screenPosition.y,
          name: point.name,
        },
        iris: {
          x: point.irisPosition.x,
          y: point.irisPosition.y,
        },
      }));

      this.calibrationComplete = true;
      console.log("Calibration loaded from file:", filePath);
      return true;
    } catch (error) {
      console.log("Could not load calibration file:", error.message);
      return false;
    }
  }

  getCurrentPoint() {
    if (this.currentStep >= this.calibrationPoints.length) {
      return null;
    }
    const point = this.calibrationPoints[this.currentStep];
    return {
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height,
      name: point.name,
    };
  }

  recordIrisPosition(irisDelta) {
    if (!irisDelta) return;

    if (this.isRecentering) {
      this.recenterData.push({
        x: irisDelta.average.x,
        y: irisDelta.average.y,
      });
      this.recenterFrames++;

      if (this.recenterFrames >= 60) {
        const avgX =
          this.recenterData.reduce((sum, d) => sum + d.x, 0) /
          this.recenterData.length;
        const avgY =
          this.recenterData.reduce((sum, d) => sum + d.y, 0) /
          this.recenterData.length;

        const centerIndex = this.calibrationPoints.findIndex(
          (p) => p.name === "center",
        );
        if (centerIndex !== -1) {
          this.recordedData[centerIndex].iris.x = avgX;
          this.recordedData[centerIndex].iris.y = avgY;
        }

        this.isRecentering = false;
        console.log("Recenter complete!");
      }
      return;
    }

    if (!this.isCalibrating) return;

    if (this.isCountingDown) {
      const elapsed = Date.now() - this.countdownStartTime;
      if (elapsed >= this.countdownDuration) {
        this.isCountingDown = false;
      }
      return;
    }

    this.tempIrisData.push({
      x: irisDelta.average.x,
      y: irisDelta.average.y,
    });

    this.recordingFrames++;

    if (this.recordingFrames >= this.framesToRecord) {
      const xValues = this.tempIrisData.map((d) => d.x).sort((a, b) => a - b);
      const yValues = this.tempIrisData.map((d) => d.y).sort((a, b) => a - b);

      const q1Index = Math.floor(this.tempIrisData.length * 0.25);
      const q3Index = Math.floor(this.tempIrisData.length * 0.75);

      const xQ1 = xValues[q1Index];
      const xQ3 = xValues[q3Index];
      const yQ1 = yValues[q1Index];
      const yQ3 = yValues[q3Index];

      const xIQR = xQ3 - xQ1;
      const yIQR = yQ3 - yQ1;

      const filteredData = this.tempIrisData.filter((d) => {
        const xInRange = d.x >= xQ1 - 1.5 * xIQR && d.x <= xQ3 + 1.5 * xIQR;
        const yInRange = d.y >= yQ1 - 1.5 * yIQR && d.y <= yQ3 + 1.5 * yIQR;
        return xInRange && yInRange;
      });

      const avgX =
        filteredData.reduce((sum, d) => sum + d.x, 0) / filteredData.length;
      const avgY =
        filteredData.reduce((sum, d) => sum + d.y, 0) / filteredData.length;

      this.recordedData.push({
        point: this.calibrationPoints[this.currentStep],
        iris: { x: avgX, y: avgY },
      });

      this.currentStep++;
      this.recordingFrames = 0;
      this.tempIrisData = [];
      this.countdownStartTime = Date.now();
      this.isCountingDown = true;

      if (this.currentStep >= this.calibrationPoints.length) {
        this.isCalibrating = false;
        this.calibrationComplete = true;
        console.log("Calibration complete! All points:", this.recordedData);
      }
    }
  }

  mapIrisToScreen(irisDelta) {
    if (!this.calibrationComplete || this.recordedData.length < 5) {
      return { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    }

    this.irisBuffer.push({
      x: irisDelta.average.x,
      y: irisDelta.average.y,
    });

    if (this.irisBuffer.length > this.bufferSize) {
      this.irisBuffer.shift();
    }

    const sortedX = [...this.irisBuffer].map((p) => p.x).sort((a, b) => a - b);
    const sortedY = [...this.irisBuffer].map((p) => p.y).sort((a, b) => a - b);
    const medianIndex = Math.floor(this.irisBuffer.length / 2);

    const currentX = sortedX[medianIndex];
    const currentY = sortedY[medianIndex];

    if (this.driftCorrection) {
      this.recentPositions.push({ x: currentX, y: currentY });
      if (this.recentPositions.length > this.maxRecentPositions) {
        this.recentPositions.shift();
      }

      if (this.recentPositions.length >= 30) {
        const avgRecentX =
          this.recentPositions.reduce((sum, p) => sum + p.x, 0) /
          this.recentPositions.length;
        const avgRecentY =
          this.recentPositions.reduce((sum, p) => sum + p.y, 0) /
          this.recentPositions.length;

        const driftX = avgRecentX - this.recordedData[2].iris.x;
        const driftY = avgRecentY - this.recordedData[2].iris.y;

        const correctionFactor = 0.05;

        for (let i = 0; i < this.recordedData.length; i++) {
          this.recordedData[i].iris.x += driftX * correctionFactor;
          this.recordedData[i].iris.y += driftY * correctionFactor;
        }
      }
    }

    const topLeft = this.recordedData[0].iris;
    const topRight = this.recordedData[1].iris;
    const center = this.recordedData[2].iris;
    const bottomLeft = this.recordedData[3].iris;
    const bottomRight = this.recordedData[4].iris;

    const minX = Math.min(
      topLeft.x,
      bottomLeft.x,
      topRight.x,
      bottomRight.x,
      center.x,
    );
    const maxX = Math.max(
      topLeft.x,
      bottomLeft.x,
      topRight.x,
      bottomRight.x,
      center.x,
    );
    const minY = Math.min(
      topLeft.y,
      bottomLeft.y,
      topRight.y,
      bottomRight.y,
      center.y,
    );
    const maxY = Math.max(
      topLeft.y,
      bottomLeft.y,
      topRight.y,
      bottomRight.y,
      center.y,
    );

    let normalizedX = 0.5;
    let normalizedY = 0.5;

    const xRange = maxX - minX;
    const yRange = maxY - minY;

    if (xRange > 0.001) {
      normalizedX = 1 - (currentX - minX) / xRange;
    }

    if (yRange > 0.001) {
      normalizedY = (currentY - minY) / yRange;
    }

    normalizedX = Math.max(0, Math.min(1, normalizedX));
    normalizedY = Math.max(0, Math.min(1, normalizedY));

    return {
      x: normalizedX * this.canvas.width,
      y: normalizedY * this.canvas.height,
    };
  }

  draw() {
    if (this.isRecentering) {
      this.ctx.save();

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      this.ctx.strokeStyle = "#00FF00";
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = "round";

      this.ctx.beginPath();
      this.ctx.moveTo(centerX - 30, centerY);
      this.ctx.lineTo(centerX + 30, centerY);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY - 30);
      this.ctx.lineTo(centerX, centerY + 30);
      this.ctx.stroke();

      const progress = Math.floor((this.recenterFrames / 60) * 100);

      this.ctx.fillStyle = "#000000";
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(`${progress}%`, centerX, centerY);

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "20px Arial";
      this.ctx.textBaseline = "alphabetic";
      this.ctx.fillText("Look at center", centerX, centerY - 60);

      this.ctx.restore();
      return;
    }

    if (!this.isCalibrating) return;

    const point = this.getCurrentPoint();
    if (!point) return;

    this.ctx.save();

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "#00FF00";
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = "round";

    this.ctx.beginPath();
    this.ctx.moveTo(point.x - this.crossSize, point.y);
    this.ctx.lineTo(point.x + this.crossSize, point.y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y - this.crossSize);
    this.ctx.lineTo(point.x, point.y + this.crossSize);
    this.ctx.stroke();

    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `Look at the cross (${point.name})`,
      this.canvas.width / 2,
      50,
    );

    if (this.isCountingDown) {
      const elapsed = Date.now() - this.countdownStartTime;
      const remaining = Math.max(0, this.countdownDuration - elapsed);
      const countdown = Math.ceil(remaining / 1000);

      this.ctx.fillStyle = "#000000";
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "24px Arial";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(countdown, point.x, point.y);
      this.ctx.textBaseline = "alphabetic";
    } else {
      const progress = Math.floor(
        (this.recordingFrames / this.framesToRecord) * 100,
      );

      this.ctx.fillStyle = "#000000";
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "16px Arial";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(`${progress}%`, point.x, point.y);
      this.ctx.textBaseline = "alphabetic";
    }

    this.ctx.restore();
  }
}
