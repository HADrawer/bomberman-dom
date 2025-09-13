import { VNode } from "../Framework/internal/v-node.js";

export function createGrid() {
  const rows = 11;
  const cols = 15;

  return new VNode("div", {
    attrs: { class: "grid" },
    children: Array.from({ length: rows }, (_, r) => {
      return new VNode("div", {
        attrs: { class: "row" },
        children: Array.from({ length: cols }, (_, c) => {
          let cellType;

          // Outer walls
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
            cellType = "wall";
          } 
          // Player start zones (single cell)
          else if (
            (r === 1 && (c === 1 || c === cols - 2)) ||
            (r === rows - 2 && (c === 1 || c === cols - 2))
          ) {
            cellType = "start-zone";
          }
          // Inner walls (checkerboard pattern)
          else if (r % 2 === 0 && c % 2 === 0) {
            cellType = "inner-wall";
          } 
          // Sand / empty space
          else {
            cellType = "sand";

            // Random destructible stone on sand (not in start zone)
            if (Math.random() < 0.2) {
              cellType = "stone";
            }
          }

          return new VNode("div", {
            attrs: { class: `cell ${cellType}` },
            children: []
          });
        })
      });
    })
  });
}
