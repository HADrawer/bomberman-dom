import { socket } from "../ws.js";

export function startGame(grid, players) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h1>🚀 اللعبة بدأت!</h1>
      <div id="gameArea" class="grid"></div>
    </div>
    <div id="chat"></div>
  `;

  const gameArea = document.getElementById("gameArea");

  // 1. Draw grid
  grid.cells.forEach((row, r) => {
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    row.forEach((cell, c) => {
      const cellEl = document.createElement("div");
      cellEl.className = `cell ${cell.type}`;
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;
      rowEl.appendChild(cellEl);
    });
    gameArea.appendChild(rowEl);
  });

  // 2. Draw all players
players.forEach(p => {
  const playerEl = document.createElement("div");
  playerEl.className = "player";
  playerEl.id = p.id;
  // remove any textContent! your CSS handles the PNG avatar
  placePlayerInCell(playerEl, p.y, p.x);
});


  // 3. Listen for all movement updates (server should broadcast all moves)
socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "player_joined") {
    const p = msg.player;
    const playerEl = document.createElement("div");
    playerEl.className = "player";
    playerEl.id = p.ID;  // use ID exactly
    placePlayerInCell(playerEl, p.Y, p.X); // spawn in correct cell
  }

  if (msg.type === "player_moved") {
    const playerEl = document.getElementById(msg.id);
    if (playerEl) placePlayerInCell(playerEl, msg.y, msg.x);
  }
});


  // 4. Handle your player movement
  const myPlayer = players.find(p => p.name === localStorage.getItem("playerName"));
  if (myPlayer) {
    document.addEventListener("keydown", (e) => {
      let dir;
      if (e.key === "ArrowUp" || e.key === "w") dir = "up";
      if (e.key === "ArrowDown" || e.key === "s") dir = "down";
      if (e.key === "ArrowLeft" || e.key === "a") dir = "left";
      if (e.key === "ArrowRight" || e.key === "d") dir = "right";

      if (dir) {
        socket.send(JSON.stringify({
          type: "move",
          id: myPlayer.id,
          direction: dir
        }));
      }
    });
  }

  // Load chat
  import("../chat/app.js").then(chat => {
    chat.buildApp(); 
  });
}

// Insert player into a cell
// Insert player into a cell
function placePlayerInCell(playerEl, row, col) {
  const cellEl = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
  if (cellEl) {
    // Remove from previous parent if any
    if (playerEl.parentElement) playerEl.parentElement.removeChild(playerEl);
    cellEl.appendChild(playerEl);
  }
}
