export default class InputHandler {
  constructor() {
    this.inputs = {
      topLeft: document.getElementById("input_top_left"),
      topRight: document.getElementById("input_top_right"),
      bottomLeft: document.getElementById("input_bottom_left"),
      bottomRight: document.getElementById("input_bottom_right"),
    };

    this.docText = document.querySelector(".doc_text");

    this.fontStyles = {
      topLeft: {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        letterSpacing: "normal",
      },
      topRight: {
        fontWeight: "bold",
        fontStyle: "normal",
        textDecoration: "none",
        letterSpacing: "normal",
      },
      bottomLeft: {
        fontWeight: "normal",
        fontStyle: "italic",
        textDecoration: "none",
        letterSpacing: "normal",
      },
      bottomRight: {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "underline",
        letterSpacing: "normal",
      },
    };

    this.previousValues = {
      topLeft: "",
      topRight: "",
      bottomLeft: "",
      bottomRight: "",
    };

    this.setupListeners();
  }

  setupListeners() {
    Object.keys(this.inputs).forEach((key) => {
      const input = this.inputs[key];
      if (input) {
        input.addEventListener("input", (e) => this.handleInput(e, key));
        input.addEventListener("keydown", (e) => this.handleKeydown(e, key));
        input.addEventListener("keypress", (e) => this.handleKeypress(e, key));
        input.addEventListener("focus", (e) => this.handleFocus(e, key));
      }
    });
  }

  handleKeydown(e, inputKey) {
    if (e.key === "Backspace") {
      const input = e.target;
      if (input.value.length === 0) {
        e.preventDefault();
        this.removeLastCharacter();
      }
    }
  }

  handleKeypress(e, inputKey) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.insertLineBreak();
      const input = e.target;
      input.value = "";
      this.previousValues[inputKey] = "";
    }
  }

  handleFocus(e, inputKey) {
    const input = e.target;
    input.value = "";
    this.previousValues[inputKey] = "";
  }

  handleInput(e, inputKey) {
    const input = e.target;
    const currentValue = input.value;
    const previousValue = this.previousValues[inputKey];

    if (currentValue.length > previousValue.length) {
      const newChar = currentValue.slice(-1);
      this.insertCharacter(newChar, inputKey);
    } else if (currentValue.length < previousValue.length) {
      this.removeLastCharacter();
    }

    this.previousValues[inputKey] = currentValue;
  }

  insertCharacter(char, inputKey) {
    const styles = this.fontStyles[inputKey];

    if (this.docText.textContent === "Start typing...") {
      this.docText.textContent = "";
    }

    const span = document.createElement("span");
    span.style.fontWeight = styles.fontWeight;
    span.style.fontStyle = styles.fontStyle;
    span.style.textDecoration = styles.textDecoration;
    span.style.letterSpacing = styles.letterSpacing;
    span.textContent = char;

    this.docText.appendChild(span);
  }

  insertLineBreak() {
    const br = document.createElement("br");
    this.docText.appendChild(br);
  }

  removeLastCharacter() {
    const children = this.docText.childNodes;
    if (children.length > 0) {
      const lastChild = children[children.length - 1];

      if (
        lastChild.nodeType === Node.TEXT_NODE &&
        lastChild.textContent === "Start typing..."
      ) {
        return;
      }

      if (
        lastChild.nodeType === Node.ELEMENT_NODE &&
        lastChild.textContent.length > 0
      ) {
        this.docText.removeChild(lastChild);
      } else if (
        lastChild.nodeType === Node.TEXT_NODE &&
        lastChild.textContent.length > 0
      ) {
        this.docText.removeChild(lastChild);
      } else if (lastChild.nodeName === "BR") {
        this.docText.removeChild(lastChild);
      }
    }
  }
}
