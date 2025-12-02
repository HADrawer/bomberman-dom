import { socket } from "../ws.js";

export let localPlayer = { id: null, x: 0, y: 0, speed: 1 };
let grid = null;
let powerups = {};

function renderBoard() {
  const gameArea = document.getElementById("gameArea");
  if (!gameArea) return;

  // Remove old powerups
  document.querySelectorAll(".powerup").forEach(p => p.remove());

  // Draw active powerups
  for (let k in powerups) {
    const p = powerups[k];
    const el = document.createElement("div");
    el.classList.add("powerup", `powerup-${p.type}`);
    el.style.position = "absolute";
    el.style.left = (p.x * 42) + "px";  // 40px cell + 2px gap
    el.style.top = (p.y * 42) + "px";   // 40px cell + 2px gap
    gameArea.appendChild(el);
  }
}

export function startGame(serverGrid, players) {
  grid = serverGrid;

  const app = document.getElementById("app");
  app.innerHTML = `
  <div class="game-page">

    <!-- LEFT = GAME -->
    <div class="game-left">
      <p style="text-align:center; margin-top:5px;">Use Arrow Keys • Press X to place bomb</p>
      <div id="gameArea" class="grid" tabindex="0"></div>
    </div>

    <!-- RIGHT = CHAT -->
    <div class="game-right">
      <h3 class="game-chat-title">Chat</h3>
      <div id="chat"></div>
    </div>

  </div>
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


      // If a powerup exists in this cell, draw it
      if (cell.powerUp && cell.powerUp !== "") {
        const p = document.createElement("div");
        p.classList.add("powerup", `powerup-${cell.powerUp}`);
        p.style.left = `${c * 42}px`;  // 40px cell + 2px gap
        p.style.top = `${r * 42}px`;   // 40px cell + 2px gap
        p.style.position = "absolute";
        p.style.imageRendering = "pixelated";

        gameArea.appendChild(p);
      }
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
    if (!localPlayer.id && p.session === localStorage.getItem("sessionId")) {
      localPlayer.id = p.id;
      localPlayer.x = p.x;
      localPlayer.y = p.y;
      localPlayer.speed = p.speed || 1;
    }
  });


  // if (myPlayer) {
  gameArea.addEventListener("click", () => gameArea.focus());

  // Movement interval settings
  const BASE_MOVE_INTERVAL_MS = 500;  // Normal speed: 500ms (half second)
  const FAST_MOVE_INTERVAL_MS = 250;  // With speed power-up: 250ms (quarter second)
  let currentDirection = null;
  let moveInterval = null;

  function getMoveInterval() {
    // Speed 1 = 500ms, Speed 2 = 250ms
    return localPlayer.speed >= 2 ? FAST_MOVE_INTERVAL_MS : BASE_MOVE_INTERVAL_MS;
  }

  function getDirectionFromKey(key) {
    switch (key) {
      case "arrowup": return "up";
      case "arrowdown": return "down";
      case "arrowleft": return "left";
      case "arrowright": return "right";
      default: return null;
    }
  }

  function startMoving(dir) {
    if (currentDirection === dir) return; // Already moving in this direction

    stopMoving(); // Clear any existing movement
    currentDirection = dir;

    socket.send(JSON.stringify({ type: "move", id: localPlayer.id, direction: currentDirection }));

    // Then continue moving at the current speed interval while key is held
    moveInterval = setInterval(() => {
      socket.send(JSON.stringify({ type: "move", id: localPlayer.id, direction: currentDirection }));
    }, getMoveInterval());
  }

  function stopMoving() {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    currentDirection = null;
  }

  // Update movement interval when speed changes (called when picking up speed power-up)
 

  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const dir = getDirectionFromKey(key);

    if (dir) {
      e.preventDefault(); // Prevent scrolling with arrow keys
      startMoving(dir);
    }
  });

  document.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    const dir = getDirectionFromKey(key);

    // Only stop if the released key matches the current direction
    if (dir && dir === currentDirection) {
      stopMoving();
    }
  });

  // Bomb placement (X key)
  let bombKeyHeld = false;

  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "x" && !bombKeyHeld) {
      bombKeyHeld = true;
      socket.send(JSON.stringify({
        type: "plant_bomb",
        x: localPlayer.x,
        y: localPlayer.y
      }));
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === "x") {
      bombKeyHeld = false;
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

function updateHearts(playerEl, lives) {
  if (!playerEl) return;
  let hearts = playerEl.querySelector('.hearts');
  if (!hearts) {
    hearts = createHeartsEl(lives);
    playerEl.appendChild(hearts);
    return
  }
  const heartEls = hearts.children;
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      heartEls[i].classList.remove('emtpy');
      heartEls[i].textContent = "♥";

    } else {
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
      if (id === localPlayer.id) {
        if (id === localPlayer.id) {
          localPlayer.x = x;
          localPlayer.y = y;
  }
      }

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
      const { id, lives } = msg;
      const playerEl = document.getElementById(id);
      if (playerEl) updateHearts(playerEl, lives);
      break;
    }

    case "player_dead": {
      const { id } = msg;
      const playerEl = document.getElementById(id);
      if (playerEl) {
        playerEl.style.opacity = '0.4';
        updateHearts(playerEl, 0);
      }
      break;
    }
    case "spawn_powerup": {
      const key = msg.x + "," + msg.y;

      powerups[key] = {
        type: msg.powerup,
        x: msg.x,
        y: msg.y,
        timeout: Date.now() + 15000
      };

      renderBoard();
      break;
    }

    case "powerup_picked": {
      // Remove the power-up from ALL clients when any player picks it up
      const key = msg.x + "," + msg.y;
      delete powerups[key];
      renderBoard();

      // Update local player's speed if they picked up the power-up
      if (msg.playerID === localPlayer.id && msg.powerup === "speed") {
        if (localPlayer.speed < 2) {
          localPlayer.speed = 2;
          console.log(`Speed increased! New speed: ${localPlayer.speed}`);
        } else {
          console.log(`Speed power-up picked but already at max speed: ${localPlayer.speed}`);
        }
      }
      break;
    }

    case "bomb_planted": {
      spawnBomb(msg.id, msg.x, msg.y);
      break;
    }

    case "bomb_exploded": {
      handleExplosion(msg.cells);
      removeBomb(msg.id);
      break;
    }
    case "game_winner": {
      showGameOverlay(`${msg.name} wins the game! 🎉`);
      break;
    }
    case "game_draw": {
      showGameOverlay("It's a draw! 🤝");
      break;
    }

    default:
      console.log("Unknown message:", msg);
  }
}
function cleanupPowerups() {
  const now = Date.now();
  for (let k in powerups) {
    if (powerups[k].timeout <= now) {
      delete powerups[k];
    }
  }
}


// function movePlayerLocally(direction) {
//   const playerEl = document.getElementById(localPlayer.id);

//   // Update sprite direction before moving
//   playerEl.classList.remove("up", "down", "left", "right");
//   playerEl.classList.add(direction);

//   // Move based on speed (default 1, increases by 2 with speed power-up)
//   const speed = localPlayer.speed || 1;

//   for (let step = 0; step < speed; step++) {
//     let newX = localPlayer.x;
//     let newY = localPlayer.y;

//     switch (direction) {
//       case "up": newY--; break;
//       case "down": newY++; break;
//       case "left": newX--; break;
//       case "right": newX++; break;
//     }

//     if (!grid || !grid.cells[newY] || typeof newX !== "number" || typeof newY !== "number") {
//       console.warn("[Game] Invalid move coordinates:", newX, newY);
//       break;
//     }
//     if (newX < 0 || newX >= grid.cols || newY < 0 || newY >= grid.rows) break;

//     const cellEl = document.querySelector(`.cell[data-row="${newY}"][data-col="${newX}"]`);
//     if (!cellEl) break;

//     // Allow movement only through sand and start-zone cells
//     if (!cellEl.classList.contains("sand") && !cellEl.classList.contains("start-zone")) {
//       break;
//     }

//     // Update local position
//     localPlayer.x = newX;
//     localPlayer.y = newY;

//     // Move the player visually
//     placePlayerInCell(playerEl, newY, newX);

//     // Pickup powerup if exists
//     const key = newX + "," + newY;
//     if (powerups[key]) {
//       socket.send(JSON.stringify({
//         type: "pickup_powerup",
//         id: localPlayer.id,
//         powerup: powerups[key].type,
//         x: newX,
//         y: newY
//       }));
//       delete powerups[key];
//     }
//   }
// }


//  Simulate explosion (remove bomb + show animation)


function spawnBomb(id, x, y) {
  const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
  if (!cell) return;


  const old = cell.querySelector(".bomb");
  if (old) old.remove();

  const bomb = document.createElement("div");
  bomb.className = "bomb";
  bomb.dataset.id = id;

  cell.appendChild(bomb);
}

function removeBomb(bombID) {
  const bombEl = document.querySelector(`.bomb[data-id="${bombID}"]`);
  if (bombEl) bombEl.remove();
}

function handleExplosion(cells) {
  cells.forEach(([x, y]) => {
    const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
    if (!cell) return;

    if (cell.classList.contains("stone")) {
      cell.classList.remove("stone");
      cell.classList.add("sand");
    }

    const flame = document.createElement("div");
    flame.className = "flame";
    cell.appendChild(flame);
    setTimeout(() => flame.remove(), 300);
  });
}


function showGameOverlay(text) {

  let overlay = document.getElementById("winnerOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "winnerOverlay";
    overlay.className = "winner-overlay";

    const winnerText = document.createElement("h1");
    winnerText.id = "winnerText";
    overlay.appendChild(winnerText);

    const restartBtn = document.createElement("button");
    restartBtn.id = "restartBtn";
    restartBtn.textContent = "Restart Game";
    restartBtn.onclick = () => window.location.href = "/";
    overlay.appendChild(restartBtn);

    document.body.appendChild(overlay);
  }

  document.getElementById("winnerText").textContent = text;
  overlay.style.display = "flex";
}
//  Cleanup expired powerups every 200ms and redraw
setInterval(() => {
  cleanupPowerups();
  renderBoard();
}, 200);
