export default class KeyHandler {
  constructor(calibration) {
    this.calibration = calibration;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  handleKeyPress(e) {
    // Command+Enter (Mac) or Ctrl+Enter (Windows/Linux) to toggle canvas
    if (e.key.toLowerCase() === "enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (document.getElementById("canvas").style.display == "none") {
        document.getElementById("canvas").style.display = "block";
        document.getElementById("dom_overlay").style.display = "none";
      } else {
        document.getElementById("canvas").style.display = "none";
        document.getElementById("dom_overlay").style.display = "block";
      }
      return;
    }
    if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      console.log("Full recalibration...");
      document.getElementById("canvas").style.display = "block";
      document.getElementById("dom_overlay").style.display = "none";
      this.calibration.start();
    }

    // switch (
    //   e.key.toLowerCase()
    // case "c":
    //   console.log("Full recalibration...");
    //   this.calibration.start();
    //   break;

    // case " ":
    //   e.preventDefault();
    //   this.calibration.startRecenter();
    //   break;

    // case "s":
    //   e.preventDefault();
    //   this.saveCalibration();
    //   break;

    // case "d":
    //   console.log("d");
    //   break;
    // ) {
    // }
  }

  saveCalibration() {
    if (
      !this.calibration.calibrationComplete ||
      this.calibration.recordedData.length < 5
    ) {
      console.warn("No calibration data to save");
      return;
    }

    const calibrationData = {
      timestamp: new Date().toISOString(),
      points: this.calibration.recordedData.map((record) => ({
        name: record.point.name,
        screenPosition: {
          x: record.point.x,
          y: record.point.y,
        },
        irisPosition: {
          x: record.iris.x,
          y: record.iris.y,
        },
      })),
    };

    const dataStr = JSON.stringify(calibrationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "calibration.json";
    link.click();

    URL.revokeObjectURL(url);
    console.log("Calibration saved to calibration.json");
  }
}
