import { App } from "./Framework/internal/app.js";
import { GridComponent } from "./game/grid.js";

const root = document.getElementById("root");

// Start the app with grid
const app = new App(
  GridComponent({ rows: 11, cols: 13 }),
  root,
  {}
);
