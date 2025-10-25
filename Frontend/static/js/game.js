import { socket } from "../ws.js";

export function startGame(grid, players) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h1>Game Started</h1>
      <div id="gameArea" class="grid"></div>
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
});

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


function placePlayerInCell(playerEl, row, col) {
  const cellEl = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
  if (cellEl) {
    // Remove from previous parent if any
    if (playerEl.parentElement) playerEl.parentElement.removeChild(playerEl);
    cellEl.appendChild(playerEl);
  }
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
