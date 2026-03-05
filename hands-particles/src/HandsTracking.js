import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export class HandsTracking {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext("2d");
    this.handLandmarker = null;
    this.drawingUtils = new DrawingUtils(this.canvasCtx);
    this.isRunning = false;
    this.lastVideoTime = -1;
    this.hands = [];
    this.previousHands = [];
    this.handVelocities = [];
    this.onHandsDetected = null;
  }

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    await this.setupCamera();
  }

  async setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    this.videoElement.srcObject = stream;
    this.videoElement.addEventListener("loadeddata", () => {
      this.isRunning = true;
      this.detectHands();
    });
  }

  detectHands() {
    if (!this.isRunning) return;

    const nowInMs = Date.now();

    if (this.videoElement.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.videoElement.currentTime;
      const results = this.handLandmarker.detectForVideo(
        this.videoElement,
        nowInMs,
      );

      this.hands = results.landmarks || [];

      // Calculate fingertip velocities
      // MediaPipe hand landmarks: 4=thumb, 8=index, 12=middle, 16=ring, 20=pinky
      const fingertipIndices = [4, 8, 12, 16, 20];
      this.handVelocities = [];

      if (this.hands.length > 0 && this.previousHands.length > 0) {
        for (
          let i = 0;
          i < Math.min(this.hands.length, this.previousHands.length);
          i++
        ) {
          const handVelocities = [];

          for (const tipIndex of fingertipIndices) {
            const current = this.hands[i][tipIndex];
            const previous = this.previousHands[i][tipIndex];

            if (current && previous) {
              const vx = (current.x - previous.x) * this.canvasElement.width;
              const vy = (current.y - previous.y) * this.canvasElement.height;

              handVelocities.push({
                x: current.x,
                y: current.y,
                vx,
                vy,
              });
            }
          }

          this.handVelocities.push(handVelocities);
        }
      }

      // Store current hands for next frame
      this.previousHands = this.hands.map((hand) =>
        hand.map((landmark) => ({ ...landmark })),
      );

      // Always call callback to update hand data (even when empty)
      if (this.onHandsDetected) {
        this.onHandsDetected(this.hands, this.handVelocities);
      }
    }

    requestAnimationFrame(() => this.detectHands());
  }

  drawHands() {
    if (!this.hands || this.hands.length === 0) return;

    this.canvasCtx.save();

    // Flip horizontally for mirror effect
    this.canvasCtx.translate(this.canvasElement.width, 0);
    this.canvasCtx.scale(-1, 1);

    for (const landmarks of this.hands) {
      this.drawingUtils.drawConnectors(
        landmarks,
        HandLandmarker.HAND_CONNECTIONS,
        { color: "#ffffff", lineWidth: 2 },
      );
      this.drawingUtils.drawLandmarks(landmarks, {
        color: "#ffffff",
        lineWidth: 1,
        radius: 3,
      });
    }

    this.canvasCtx.restore();
  }

  getHands() {
    return this.hands;
  }

  stop() {
    this.isRunning = false;
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach((track) => track.stop());
    }
  }
}
