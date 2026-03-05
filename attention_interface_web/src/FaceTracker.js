import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import EventEmitter from "@onemorestudio/eventemitterjs";
export default class FaceTracker extends EventEmitter {
  constructor() {
    super();
    this.video = document.createElement("video");
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.faceLandmarker = null;
    this.drawingUtils = null;
  }

  async startWebcam() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();
    //if (this.statusEl) this.statusEl.textContent = "Webcam: OK";
  }

  async loadModel() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm",
    );
    this.faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      },
    );
  }

  detect() {
    if (!this.faceLandmarker) {
      throw new Error("Face landmarker not loaded");
    }
    const timestamp = performance.now();
    const results = this.faceLandmarker.detectForVideo(this.video, timestamp);
    return results;
  }

  /**
   * Calculate iris delta from central position for both eyes
   * @param {object} landmarks - Face landmarks from detection results
   * @returns {object} Object containing left and right iris deltas {leftIris: {x, y}, rightIris: {x, y}}
   */
  calculateIrisDelta(landmarks) {
    if (!landmarks || landmarks.length < 478) {
      return null;
    }

    // MediaPipe iris landmark indices
    // Left eye center: 468, Right eye center: 473
    // Left eye landmarks: 33, 133, 160, 159, 158, 144, 145, 153
    // Right eye landmarks: 362, 263, 385, 386, 387, 380, 374, 373

    // Get iris centers
    const leftIrisCenter = landmarks[468]; // Left iris center
    const rightIrisCenter = landmarks[473]; // Right iris center

    // Calculate eye centers from eye corner landmarks
    // Left eye: inner corner (133), outer corner (33)
    const leftEyeInner = landmarks[133];
    const leftEyeOuter = landmarks[33];
    const leftEyeCenter = {
      x: (leftEyeInner.x + leftEyeOuter.x) / 2,
      y: (leftEyeInner.y + leftEyeOuter.y) / 2,
    };

    // Right eye: inner corner (362), outer corner (263)
    const rightEyeInner = landmarks[362];
    const rightEyeOuter = landmarks[263];
    const rightEyeCenter = {
      x: (rightEyeInner.x + rightEyeOuter.x) / 2,
      y: (rightEyeInner.y + rightEyeOuter.y) / 2,
    };

    // Calculate deltas (normalized between -1 and 1)
    const leftIrisDelta = {
      x: (leftIrisCenter.x - leftEyeCenter.x) * 10, // Multiplied for sensitivity
      y: (leftIrisCenter.y - leftEyeCenter.y) * 10,
    };

    const rightIrisDelta = {
      x: (rightIrisCenter.x - rightEyeCenter.x) * 10,
      y: (rightIrisCenter.y - rightEyeCenter.y) * 10,
    };

    return {
      leftIris: leftIrisDelta,
      rightIris: rightIrisDelta,
      average: {
        x: (leftIrisDelta.x + rightIrisDelta.x) / 2,
        y: (leftIrisDelta.y + rightIrisDelta.y) / 2,
      },
    };
  }

  draw(canvas, ctx, rotationLogElement) {
    if (!canvas || !ctx) return;

    // Initialize DrawingUtils if not already done
    if (!this.drawingUtils) {
      this.drawingUtils = new DrawingUtils(ctx);
    }

    // Save context and apply mirror transformation
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // Clear canvas (black background)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Detect face
    const results = this.detect();

    if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
      // Calculate Y-axis rotation from transformation matrix
      if (
        results.facialTransformationMatrixes &&
        results.facialTransformationMatrixes.length > 0
      ) {
        const matrix = results.facialTransformationMatrixes[0].data;
        // Extract rotation angles from transformation matrix
        // Y-axis rotation (yaw) can be calculated from matrix elements
        const yaw = Math.atan2(matrix[2], matrix[10]) * (180 / Math.PI);

        if (rotationLogElement) {
          rotationLogElement.innerHTML = `
            <strong>Face Y-Axis Rotation (Yaw):</strong> ${yaw.toFixed(2)}°<br>
            <small>Turn left: negative values | Turn right: positive values</small>
          `;
        }

        //emit rotation left if yaw is more than -30
        if (yaw < -30) {
          this.emit("rotationLeft", [yaw]);
        } else if (yaw > 30) {
          this.emit("rotationRight", [yaw]);
        } else {
          this.emit("noRotation", [yaw]);
        }
      }
      // Use DrawingUtils to draw face mesh with connectors
      for (const landmarks of results.faceLandmarks) {
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#FFFFFF33", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FFFFFF", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#FFFFFF", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#FFFFFF", lineWidth: 2 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LIPS,
          { color: "#FFFFFF", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FFFFFF", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#FFFFFF", lineWidth: 0.5 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#66b4f0", lineWidth: 2 },
        );
        this.drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#66b4f0", lineWidth: 2 },
        );
      }

      // Get iris delta and determine gaze direction
      const irisDelta = this.calculateIrisDelta(results.faceLandmarks[0]);

      if (irisDelta) {
        const avgX = -irisDelta.average.x;
        let gazeDirection = "center";

        // Adjusted thresholds for more sensitive detection
        if (avgX < -0.03) {
          gazeDirection = "left";
        } else if (avgX > 0.03) {
          gazeDirection = "right";
        }

        // console.log(`Gaze: ${gazeDirection.toUpperCase()} `);

        // Emit gaze direction events
        if (gazeDirection === "left") {
          this.emit("gazeLeft", [avgX]);
        } else if (gazeDirection === "right") {
          this.emit("gazeRight", [avgX]);
        } else {
          this.emit("gazeCenter", [avgX]);
        }
      }
    } else {
      // Debug: Show message if no face detected
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText("No face detected", 10, 30);
    }

    // Restore context
    ctx.restore();
  }
}
