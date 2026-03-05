import "./style.css";
import { HandsTracking } from "./HandsTracking.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { particleConfig } from "./particleConfig.js";

class App {
  constructor() {
    this.canvas = null;
    this.video = null;
    this.handsTracking = null;
    this.particleSystem = null;
    this.isRunning = false;
  }

  async init() {
    this.setupCanvas();
    this.setupVideo();

    this.handsTracking = new HandsTracking(this.video, this.canvas);
    this.particleSystem = new ParticleSystem(this.canvas, particleConfig);

    this.handsTracking.onHandsDetected = (hands, handVelocities) => {
      this.particleSystem.updateHands(hands, handVelocities);
    };

    try {
      await this.handsTracking.initialize();
      this.isRunning = true;
      this.animate();
    } catch (error) {
      document.body.innerHTML += `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
    }

    this.setupEventListeners();
  }

  setupCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "mainCanvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.zIndex = "1";

    document.body.appendChild(this.canvas);
    this.resizeCanvas();

    // Initial clear
    const ctx = this.canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setupVideo() {
    this.video = document.createElement("video");
    this.video.style.display = "none";
    this.video.autoplay = true;
    this.video.playsInline = true;
    document.body.appendChild(this.video);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    if (this.particleSystem) {
      this.particleSystem.resize(this.canvas.width, this.canvas.height);
    }
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.resizeCanvas());

    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "r":
          this.particleSystem.updateConfig({ interactionMode: "repulsion" });
          break;
        case "a":
          this.particleSystem.updateConfig({ interactionMode: "attraction" });
          break;
        case "b":
          this.particleSystem.updateConfig({ interactionMode: "both" });
          break;
        case "c":
          const modes = ["velocity", "noise", "distance", "static"];
          const currentIndex = modes.indexOf(
            this.particleSystem.config.colorMode,
          );
          const nextMode = modes[(currentIndex + 1) % modes.length];
          this.particleSystem.updateConfig({ colorMode: nextMode });
          break;
        case "h":
          this.showHelp();
          break;
      }
    });

    this.showHelp();
  }

  showHelp() {
    console.log(`
🎮 Controls:
  R - Repulsion mode
  A - Attraction mode
  B - Both modes
  C - Cycle color modes
  H - Show this help
    `);
  }

  animate() {
    if (!this.isRunning) return;

    // Update and draw particles first
    this.particleSystem.update();
    this.particleSystem.draw();

    // Draw hands on top so they're visible
    // this.handsTracking.drawHands();

    requestAnimationFrame(() => this.animate());
  }
}

const app = new App();
app.init();
