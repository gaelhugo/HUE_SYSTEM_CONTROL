import "./style.css";
import { HueBridge } from "./HueBridge.js";
import { LLMFunctionCaller } from "./LLMFunctionCaller.js";
import FaceTracker from "./FaceTracker.js";

class HueControlApp {
  constructor() {
    this.hueBridge = null;
    this.functionCaller = null;
    this.isConnected = false;
    this.faceTracker = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.currentRotationState = "center"; // Track current state: "left", "right", or "center"
    this.currentGazeState = "center"; // Track current gaze state: "left", "right", or "center"

    this.initElements();
    this.bindEvents();
    this.log("Application initialized. Enter bridge IP and click Connect.");
  }

  initElements() {
    this.bridgeIpInput = document.getElementById("bridge-ip");
    this.connectBtn = document.getElementById("connect-btn");
    this.connectionStatus = document.getElementById("connection-status");
    this.lightsList = document.getElementById("lights-list");
    this.activateBtn = document.getElementById("activate-btn");
    this.attentionStatus = document.getElementById("attention-status");
    this.canvas = document.getElementById("attention-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.rotationLog = document.getElementById("face-rotation-log");
    this.irisDetectionCheckbox = document.getElementById(
      "iris-detection-checkbox",
    );
    this.userInput = document.getElementById("user-input");
    this.sendBtn = document.getElementById("send-btn");
    this.rawOutput = document.getElementById("raw-output");
    this.resultOutput = document.getElementById("result-output");
    this.logBox = document.getElementById("log");

    this.lightsList.innerHTML =
      '<div class="empty-state">Connect to bridge to discover lights</div>';
    this.rawOutput.textContent = "Raw LLM output will appear here...";
    this.resultOutput.textContent = "Result will appear here...";
  }

  bindEvents() {
    this.connectBtn.addEventListener("click", () => this.connect());
    this.activateBtn.addEventListener("click", () => this.activateAttention());
    this.sendBtn.addEventListener("click", () => this.sendCommand());
    this.userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendCommand();
    });
  }

  async connect() {
    const bridgeIp = this.bridgeIpInput.value.trim();
    if (!bridgeIp) {
      this.showStatus("Please enter a bridge IP address", "error");
      return;
    }

    this.showStatus("Connecting to bridge...", "info");
    this.connectBtn.disabled = true;

    try {
      this.hueBridge = new HueBridge(bridgeIp);
      await this.hueBridge.connect();

      this.functionCaller = new LLMFunctionCaller(this.hueBridge);
      this.isConnected = true;

      this.showStatus(
        `Connected! Found ${this.hueBridge.lights.length} lights.`,
        "success",
      );
      this.log(`Connected to bridge at ${bridgeIp}`);
      this.renderLights();
    } catch (error) {
      this.showStatus(error.message, "error");
      this.log(`Connection failed: ${error.message}`, "error");
    } finally {
      this.connectBtn.disabled = false;
    }
  }

  renderLights() {
    if (!this.hueBridge || this.hueBridge.lights.length === 0) {
      this.lightsList.innerHTML =
        '<div class="empty-state">No lights found</div>';
      return;
    }

    this.lightsList.innerHTML = this.hueBridge.lights
      .map(
        (light) => `
      <div class="light-card ${light.on ? "on" : ""}">
        <div class="light-header">
          <span class="light-name">${light.name}</span>
          <span class="light-id">#${light.light_id}</span>
        </div>
        <div class="light-type">${light.type}</div>
        <span class="light-status ${light.on ? "on" : "off"}">
          ${light.on ? "ON" : "OFF"}
        </span>
      </div>
    `,
      )
      .join("");
  }

  async sendCommand() {
    if (!this.isConnected) {
      this.showStatus("Please connect to a bridge first", "error");
      return;
    }

    const input = this.userInput.value.trim();
    if (!input) {
      return;
    }

    this.sendBtn.disabled = true;
    this.rawOutput.textContent = "Processing...";
    this.resultOutput.textContent = "Waiting for response...";
    this.log(`User: ${input}`);

    try {
      const { rawOutput, result } =
        await this.functionCaller.processUserInput(input);

      this.rawOutput.textContent = rawOutput || "No raw output";
      this.resultOutput.textContent = result;
      this.log(`Result: ${result}`, "success");

      // Refresh lights state after command
      await this.hueBridge.refreshLights();
      this.renderLights();
    } catch (error) {
      this.rawOutput.textContent = "Error";
      this.resultOutput.textContent = error.message;
      this.log(`Error: ${error.message}`, "error");
    } finally {
      this.sendBtn.disabled = false;
      this.userInput.value = "";
      this.userInput.focus();
    }
  }

  showStatus(message, type = "info") {
    this.connectionStatus.textContent = message;
    this.connectionStatus.className = `status ${type}`;
  }

  async activateAttention() {
    if (this.animationId) {
      // Stop tracking
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.showAttentionStatus("Attention Controller stopped", "info");
      this.log("Attention Controller stopped");
      this.activateBtn.textContent = "Activate";

      // Clear canvas
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      return;
    }

    try {
      this.showAttentionStatus("Initializing face tracker...", "info");
      this.log("Initializing face tracker...");
      this.activateBtn.disabled = true;

      // Initialize FaceTracker
      this.faceTracker = new FaceTracker();

      // Initialize event listeners with state tracking
      this.faceTracker.addEventListener("rotationLeft", (yaw) => {
        if (this.currentRotationState !== "left") {
          this.currentRotationState = "left";
          this.log(`Rotation left: ${yaw.toFixed(2)}°`);
          if (this.hueBridge) {
            this.hueBridge.turnOnLight(2);
          }
        }
      });

      this.faceTracker.addEventListener("rotationRight", (yaw) => {
        if (this.currentRotationState !== "right") {
          this.currentRotationState = "right";
          this.log(`Rotation right: ${yaw.toFixed(2)}°`);
          if (this.hueBridge) {
            this.hueBridge.turnOnLight(2);
          }
        }
      });

      this.faceTracker.addEventListener("noRotation", (yaw) => {
        if (this.currentRotationState !== "center") {
          this.currentRotationState = "center";
          this.log(`Face centered: ${yaw.toFixed(2)}°`);
          if (this.hueBridge && this.hueBridge.anyLightOn()) {
            this.hueBridge.turnOffAllLights();
          }
        }
      });

      // Gaze event listeners (only active when iris detection checkbox is checked)
      this.faceTracker.addEventListener("gazeLeft", (avgX) => {
        if (this.irisDetectionCheckbox && this.irisDetectionCheckbox.checked) {
          if (this.currentGazeState !== "left") {
            this.currentGazeState = "left";
            this.log(`Gaze left: ${avgX.toFixed(4)}`);
            if (this.hueBridge) {
              this.hueBridge.turnOnLight(2);
            }
          }
        }
      });

      this.faceTracker.addEventListener("gazeRight", (avgX) => {
        if (this.irisDetectionCheckbox && this.irisDetectionCheckbox.checked) {
          if (this.currentGazeState !== "right") {
            this.currentGazeState = "right";
            this.log(`Gaze right: ${avgX.toFixed(4)}`);
            // Add light control here if needed
            if (this.hueBridge) {
              this.hueBridge.turnOnLight(5);
            }
          }
        }
      });

      this.faceTracker.addEventListener("gazeCenter", (avgX) => {
        if (this.irisDetectionCheckbox && this.irisDetectionCheckbox.checked) {
          if (this.currentGazeState !== "center") {
            this.currentGazeState = "center";
            this.log(`Gaze center: ${avgX.toFixed(4)}`);
            if (this.hueBridge && this.hueBridge.anyLightOn()) {
              this.hueBridge.turnOffAllLights();
            }
          }
        }
      });

      // Load model
      this.showAttentionStatus("Loading MediaPipe model...", "info");
      await this.faceTracker.loadModel();

      // Start webcam
      this.showAttentionStatus("Starting webcam...", "info");
      await this.faceTracker.startWebcam();

      // Wait for video metadata to load
      await new Promise((resolve) => {
        if (this.faceTracker.video.readyState >= 2) {
          resolve();
        } else {
          this.faceTracker.video.addEventListener("loadedmetadata", resolve, {
            once: true,
          });
        }
      });

      // Set canvas size to match video dimensions
      if (this.canvas) {
        this.canvas.width = this.faceTracker.video.videoWidth;
        this.canvas.height = this.faceTracker.video.videoHeight;
      }

      this.showAttentionStatus("Face tracking active!", "success");
      this.log("Face tracking started", "success");
      this.activateBtn.textContent = "Stop";
      this.activateBtn.disabled = false;

      // Start animation loop
      this.startFaceTracking();
    } catch (error) {
      this.showAttentionStatus(`Error: ${error.message}`, "error");
      this.log(`Face tracker error: ${error.message}`, "error");
      this.activateBtn.disabled = false;
    }
  }

  startFaceTracking() {
    const animate = () => {
      if (this.faceTracker && this.canvas && this.ctx) {
        try {
          this.faceTracker.draw(this.canvas, this.ctx, this.rotationLog);
        } catch (error) {
          console.error("Drawing error:", error);
        }
      }
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  showAttentionStatus(message, type = "info") {
    this.attentionStatus.textContent = message;
    this.attentionStatus.className = `status ${type}`;
  }

  log(message, type = "") {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
      <span class="timestamp">[${timestamp}]</span>
      <span class="message">${message}</span>
    `;
    this.logBox.insertBefore(entry, this.logBox.firstChild);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new HueControlApp();
});
