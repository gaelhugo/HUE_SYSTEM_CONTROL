export default class ScreenQuadrant {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentQuadrant = null;
    this.inputs = {
      topLeft: document.getElementById("input_top_left"),
      topRight: document.getElementById("input_top_right"),
      bottomLeft: document.getElementById("input_bottom_left"),
      bottomRight: document.getElementById("input_bottom_right"),
    };
    this.centralDoc = document.getElementById("central_doc");
  }

  getQuadrant(x, y) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    if (x < centerX && y < centerY) {
      return "topLeft";
    } else if (x >= centerX && y < centerY) {
      return "topRight";
    } else if (x < centerX && y >= centerY) {
      return "bottomLeft";
    } else {
      return "bottomRight";
    }
  }

  update(pointerX, pointerY) {
    const quadrant = this.getQuadrant(pointerX, pointerY);

    if (quadrant !== this.currentQuadrant) {
      this.clearAllHighlights();
      this.highlightQuadrant(quadrant);
      this.currentQuadrant = quadrant;
    }
  }

  clearAllHighlights() {
    Object.values(this.inputs).forEach((input) => {
      if (input) {
        input.classList.remove("highlighted");
        input.blur();
      }
    });
  }

  highlightQuadrant(quadrant) {
    const input = this.inputs[quadrant];
    if (input) {
      input.classList.add("highlighted");
      input.focus();
    }

    // Reposition central doc based on quadrant
    if (this.centralDoc) {
      this.centralDoc.classList.remove(
        "position-top-left",
        "position-top-right",
        "position-bottom-left",
        "position-bottom-right",
      );

      const positionClass = `position-${quadrant.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      this.centralDoc.classList.add(positionClass);
    }
  }
}
