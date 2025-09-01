import { VNode } from "../Framework/internal/v-node.js";

function createGrid(rows, cols) {
  const grid = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      let type = "empty";

      // Outer walls (first and last row/column)
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        type = "wall-outer";
      }
      // Inner indestructible pillars (only inside, leaving 1 empty cell from outer wall)
      else if (r % 2 === 0 && c % 2 === 0) {
        type = "wall-inner";
      }
      // Cowboy decorations (random)
      else {
        const rand = Math.random();
        if (rand < 0.05) type = "cactus";      
        else if (rand < 0.08) type = "skull";  
        else if (rand < 0.10) type = "barrel"; 
        else if (rand < 0.11) type = "gold";   
        else if (rand < 0.115) type = "fire";  
      }

      row.push({ r, c, type });
    }
    grid.push(row);
  }
  return grid;
}

function GridComponent({ rows, cols }) {
  const gridData = createGrid(rows, cols);

  return new VNode("div", {
    attrs: { class: "grid" },
    children: gridData.map(row =>
      new VNode("div", {
        attrs: { class: "row" },
        children: row.map(cell =>
          new VNode("div", { attrs: { class: `cell ${cell.type}` }, children: [] })
        )
      })
    )
  });
}

export { GridComponent };
