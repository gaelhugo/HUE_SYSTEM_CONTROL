import "./style.css";
import FaceTracker from "./FaceTracker.js";
import Pointer from "./Pointer.js";
import Calibration from "./Calibration.js";
import KeyHandler from "./KeyHandler.js";
import ScreenQuadrant from "./ScreenQuadrant.js";
import InputHandler from "./InputHandler.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const faceTracker = new FaceTracker();
let pointer = null;
let calibration = null;
let keyHandler = null;
let screenQuadrant = null;
let inputHandler = null;

function resizeCanvas() {
  const video = faceTracker.video;

  if (video && video.videoWidth && video.videoHeight) {
    const videoAspect = video.videoWidth / video.videoHeight;
    const windowAspect = window.innerWidth / window.innerHeight;

    if (windowAspect > videoAspect) {
      canvas.height = window.innerHeight;
      canvas.width = window.innerHeight * videoAspect;
    } else {
      canvas.width = window.innerWidth;
      canvas.height = window.innerWidth / videoAspect;
    }
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

async function init() {
  try {
    await faceTracker.startWebcam();
    await faceTracker.loadModel();

    resizeCanvas();
    pointer = new Pointer(canvas, ctx);
    calibration = new Calibration(canvas, ctx);
    keyHandler = new KeyHandler(calibration);
    screenQuadrant = new ScreenQuadrant(canvas);
    inputHandler = new InputHandler();

    window.addEventListener("resize", () => {
      resizeCanvas();
      if (pointer) {
        pointer.canvas = canvas;
        pointer.setPosition(canvas.width / 2, canvas.height / 2);
      }
      if (calibration) {
        calibration.canvas = canvas;
      }
      if (screenQuadrant) {
        screenQuadrant.canvas = canvas;
      }
    });

    const loaded = await calibration.loadFromFile();
    if (!loaded) {
      calibration.start();
    }

    function animate() {
      const results = faceTracker.detect();

      if (
        results &&
        results.faceLandmarks &&
        results.faceLandmarks.length > 0
      ) {
        const irisDelta = faceTracker.calculateIrisDelta(
          results.faceLandmarks[0],
        );

        if (irisDelta) {
          if (calibration.isCalibrating) {
            calibration.recordIrisPosition(irisDelta);
          } else if (calibration.calibrationComplete && pointer) {
            const position = calibration.mapIrisToScreen(irisDelta);
            pointer.setPosition(position.x, position.y);
          }
        }
      }

      faceTracker.draw(canvas, ctx);

      if (calibration.isCalibrating) {
        calibration.draw();
      }

      if (pointer && !calibration.isCalibrating) {
        pointer.draw();

        if (screenQuadrant && calibration.calibrationComplete) {
          screenQuadrant.update(pointer.x, pointer.y);
        }
      }

      requestAnimationFrame(animate);
    }

    animate();
  } catch (error) {
    console.error("Error initializing face tracker:", error);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Error: " + error.message, 20, 40);
  }
}

init();
