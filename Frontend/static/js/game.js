import { render } from "../Framework/internal/render.js";
import { createGrid } from "./grid.js";

export function startGame() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h1>🚀 اللعبة بدأت!</h1>
      <div id="gameArea"></div>
    </div>
    <div id="chat"></div>
  `;


  const gridVNode = createGrid(11, 15); 
  const gameArea = document.getElementById("gameArea");
  gameArea.appendChild(render(gridVNode));

  // Load chat
  import("../chat/app.js").then(chat => {
    chat.buildApp(); 
  });
}
