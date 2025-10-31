import { socket } from "../ws.js";

export let localPlayer = { id: null, x: 0, y: 0 };
let grid = null;

export function startGame(serverGrid, players) {
    grid = serverGrid;

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h1>Game Started</h1>
      <div id="gameArea" class="grid" tabindex="0"></div>
    </div>
    <p>Click on the grid and use WASD / Arrow keys to move.</p>
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
  placePlayerInCell(playerEl, p.y, p.x);
  
  // const myPlayer = players.find(p => p.name === localStorage.getItem("playerName"));
  if(!localPlayer.id && p.name === localStorage.getItem("playerName")){
    localPlayer.id = p.id;
    localPlayer.x = p.x;
    localPlayer.y = p.y;
  }
});

// if (myPlayer) {
  gameArea.addEventListener("click", () => gameArea.focus());

  document.addEventListener("keydown", (e) => {
    let dir = null;
    switch (e.key.toLowerCase()) {
      case "w": case "arrowup": dir = "up"; break;
      case "s": case "arrowdown": dir = "down"; break;
      case "a": case "arrowleft": dir = "left"; break;
      case "d": case "arrowright": dir = "right"; break;
    }

    if (dir) {
     movePlayerLocally(dir);
    }
  });
// }




  // Load chat
  import("../chat/app.js").then(chat => {
    chat.buildApp(); 
  });
}


function placePlayerInCell(playerEl, row, col) {
  const cellEl = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
  if (!cellEl) return;
    // Remove from previous parent if any
    if (playerEl.parentElement) playerEl.parentElement.removeChild(playerEl);
    cellEl.appendChild(playerEl);
  
}

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "player_joined": {
      const p = msg.player;
      if (!document.getElementById(p.id)) {
        const playerEl = document.createElement("div");
        playerEl.className = "player";
        playerEl.id = p.id;
        placePlayerInCell(playerEl, p.y, p.x);
      }
      break;
    }

    case "player_moved": {
       console.log("Received move:", msg);
      const playerEl = document.getElementById(msg.id);
      if (playerEl)
        { 
          placePlayerInCell(playerEl,msg.y,msg.x);
        }else {
           const newPlayer = document.createElement("div");
        newPlayer.className = "player";
        newPlayer.id = msg.id;
        placePlayerInCell(newPlayer, msg.y, msg.x);
        }
          break;
    }

    case "player_left": {
      const playerEl = document.getElementById(msg.id);
      if (playerEl) playerEl.remove();
      break;
    }

    default:
      console.log("Unknown message:", msg);
  }
}

function movePlayerLocally(direction) {
  let newX = localPlayer.x;
  let newY = localPlayer.y;

    switch (direction) {
    case "up": newY--; break;
    case "down": newY++; break;
    case "left": newX--; break;
    case "right": newX++; break;
  }
   if (!grid || !grid.cells[newY] || typeof newX !== "number" || typeof newY !== "number") {
    console.warn("[Game] Invalid move coordinates:", newX, newY);
    return;
  }
  if (newX < 0 || newX >= grid.cols || newY < 0 || newY >= grid.rows) return;

const targetCell = grid.cells[newY][newX];
  if (targetCell.type !== "sand" && targetCell.type !== "start-zone") return;

  const playerEl = document.getElementById(localPlayer.id);
  placePlayerInCell(playerEl, newY, newX);

  localPlayer.x = newX;
  localPlayer.y = newY;

  socket.send(JSON.stringify({ type: "move", id: localPlayer.id, direction }));

}
