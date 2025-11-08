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
// 2. Draw all players
// players.forEach(p => {
//   const playerEl = document.createElement("div");

//   // 🧭 Default direction when spawning
//   playerEl.className = "player down";
//   playerEl.id = p.id;

//   placePlayerInCell(playerEl, p.y, p.x);

//   if (!localPlayer.id && p.name === localStorage.getItem("playerName")) {
//     localPlayer.id = p.id;
//     localPlayer.x = p.x;
//     localPlayer.y = p.y;
//   }
// });
players.forEach(p => {
  const playerEl = document.createElement("div");

  // 🧭 Default direction
  playerEl.classList.add("player", "down");

  // 🧍 Use player skin from server if available
  playerEl.dataset.skin = p.skin || localStorage.getItem("playerSkin") || "character1";

  playerEl.id = p.id;

  placePlayerInCell(playerEl, p.y, p.x);
  updateHearts(playerEl, p.lives ?? 3);
  if (!localPlayer.id && p.name === localStorage.getItem("playerName")) {
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
// ✅ Add key listener for placing bombs
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "x") {
    placeBomb();
  }
});





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

function createHeartsEl(lives) {
  const container = document.createElement('div');
  container.className = 'hearts';
  for (let i = 0; i < 3; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.textContent = '♥';
      if (i >= lives) h.classList.add('empty');
      container.appendChild(h);
    }
  return container;
}

function updateHearts(playerEl, lives){
  if (!playerEl) return;
  let hearts = playerEl.querySelector('.hearts');
  if (!hearts){
    hearts = createHeartsEl(lives);
    playerEl.appendChild(hearts);
    return
  }
  const heartEls = hearts.children;
  for (let i = 0; i < 3; i++){
    if (i < lives) {
      heartEls[i].classList.remove('emtpy');
      heartEls[i].textContent = "♥";

    }else {
      heartEls[i].classList.add('empty');
      heartEls[i].textContent = '♡';
    }
  }
}

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
   case "player_joined": {
  const p = msg.player;
  if (!document.getElementById(p.id)) {
    const playerEl = document.createElement("div");
    playerEl.className = "player down"; // default facing
    playerEl.id = p.id;

    // Assign the skin sent from server (or default)
    playerEl.dataset.skin = msg.skin || "character1";

    placePlayerInCell(playerEl, p.y, p.x);
  }
  break;
}


case "player_moved": {
  const { id, x, y, direction } = msg;
  if (id === localPlayer.id) return;

  const playerEl = document.getElementById(id);
  if (playerEl) {
    // Update direction sprite class
    playerEl.classList.remove("up", "down", "left", "right");
    if (direction) playerEl.classList.add(direction);

    placePlayerInCell(playerEl, y, x);
  }
  break;
}



case "player_left": {
      const playerEl = document.getElementById(msg.id);
      if (playerEl) playerEl.remove();
      break;
    }

case "player_damaged": {
  const {id, lives} = msg;
  const playerEl = document.getElementById(id);
  if (playerEl) updateHearts(playerEl, lives);
  break;
}

case "player_dead": {
  const { id } = msg; 
  const playerEl = document.getElementById(id);
  if(playerEl) {
    playerEl.style.opacity = '0.4';
    updateHearts(playerEl, 0);
  }
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

  // 🧭 Update sprite direction before moving
  playerEl.classList.remove("up", "down", "left", "right");
  playerEl.classList.add(direction);

  // Move the player visually
  placePlayerInCell(playerEl, newY, newX);

  // Update local position
  localPlayer.x = newX;
  localPlayer.y = newY;

  // Notify the server
  socket.send(JSON.stringify({ type: "move", id: localPlayer.id, direction }));
}
function placeBomb() {
  console.log("💣 Placing bomb at", localPlayer.x, localPlayer.y);

  const cellEl = document.querySelector(
    `.cell[data-row='${localPlayer.y}'][data-col='${localPlayer.x}']`
  );

  if (!cellEl) {
    console.warn("⚠️ Could not find cell to place bomb.");
    return;
  }

  // Avoid placing multiple bombs in one cell
  if (cellEl.querySelector(".bomb")) {
    console.log("⛔ A bomb is already here.");
    return;
  }

  // Create bomb
  const bombEl = document.createElement("div");
  bombEl.classList.add("bomb");

  // Append to current cell
  cellEl.appendChild(bombEl);

  // Simulate fuse countdown (3 seconds)
  setTimeout(() => {
    explodeBomb(bombEl, localPlayer.x, localPlayer.y);
  }, 3000);
}

// 💥 Simulate explosion (remove bomb + show animation)
function explodeBomb(bombEl, x, y) {
  const cellEl = document.querySelector(
    `.cell[data-row='${y}'][data-col='${x}']`
  );

  if (!cellEl) return;

  // Remove the bomb
  bombEl.remove();

  // Create explosion effect
  const explosionEl = document.createElement("div");
  explosionEl.classList.add("explosion");
  cellEl.appendChild(explosionEl);

  // Remove explosion after animation
  setTimeout(() => explosionEl.remove(), 500);
}


