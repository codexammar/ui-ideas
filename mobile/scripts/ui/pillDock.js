// Simple floating vertical pill dock that can anchor near left or right edge.
// Not glued to the edge: we keep a small inset so it feels "floating".

const INSET = 12; // px from safe-area edge
const SIDE_LEFT = "left";
const SIDE_RIGHT = "right";

export class PillDock {
  constructor(node) {
    this.node = node;
    this.side = SIDE_LEFT;
    // Start offscreen-ish to avoid layout shift; main.js will .ready() it.
    this.applySide(SIDE_LEFT);
  }

  applySide(side) {
    this.side = side;
    if (side === SIDE_RIGHT) {
      this.node.style.right = `calc(${INSET}px + env(safe-area-inset-right))`;
      this.node.style.left = "auto";
    } else {
      this.node.style.left = `calc(${INSET}px + env(safe-area-inset-left))`;
      this.node.style.right = "auto";
    }
  }

  ready() {
    // Make it interactable/visible once positioned
    this.node.classList.add("ready");
  }
}
