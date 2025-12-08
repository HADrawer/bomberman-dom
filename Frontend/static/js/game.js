import { socket } from "../ws.js";
import { VNode, App } from "../Framework/over-react.js";

export let localPlayer = { id: null, x: 0, y: 0, speed: 1 };
let grid = null;
let powerups = {};
let app = null;

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

export function startGame(serverGrid, players, mountPoint) {
  grid = serverGrid;

  const appContainer = mountPoint || document.getElementById("app");

  // Create VNodes manually
  const gamePage = new VNode("div", {
    attrs: { class: "game-page", id: "game-page" }
  });

  // LEFT COLUMN
  const gameLeft = new VNode("div", {
    attrs: { class: "game-left", id: "game-left" }
  });

  const instructions = new VNode("p", {
    attrs: { style: "text-align:center; margin-top:5px;" },
    children: ["Use Arrow Keys • Press X to place bomb"]
  });

  const gameAreaVNode = new VNode("div", {
    attrs: { id: "gameArea", class: "grid", tabindex: "0" }
  });

  gameLeft.append(instructions, gameAreaVNode);

  // RIGHT COLUMN
  const gameRight = new VNode("div", {
    attrs: { class: "game-right", id: "game-right" }
  });

  const chatTitle = new VNode("h3", {
    attrs: { class: "game-chat-title" },
    children: ["Chat"]
  });

  const chatBox = new VNode("div", {
    attrs: { id: "chat" }
  });

  gameRight.append(chatTitle, chatBox);

  gamePage.append(gameLeft, gameRight);

  app = new App(gamePage, appContainer, {});

  const gameArea = app.getVNodeById("gameArea");

  // 1. Draw grid
  grid.cells.forEach((row, r) => {
    const rowEl = new VNode("div", {
      attrs: { class: "row", id: `row-${r}` }
    }, app);

    row.forEach((cell, c) => {
      const cellEl = new VNode("div", {
        attrs: {
          class: `cell ${cell.type}`,
          'data-row': r.toString(),
          'data-col': c.toString(),
          id: `cell-${r}-${c}`
        }
      }, app);
      rowEl.append(cellEl);

      // If a powerup exists in this cell, draw it
      if (cell.powerUp && cell.powerUp !== "") {
        const p = document.createElement("div");
        p.classList.add("powerup", `powerup-${cell.powerUp}`);
        p.style.left = `${c * 42}px`;
        p.style.top = `${r * 42}px`;
        p.style.position = "absolute";
        p.style.imageRendering = "pixelated";

        // Append to actual DOM gameArea after app.update()
        setTimeout(() => {
          const domGameArea = document.getElementById("gameArea");
          if (domGameArea) domGameArea.appendChild(p);
        }, 0);
      }
    });

    gameArea.append(rowEl);
  });

  // 2. Draw all players
  players.forEach(p => {
    const playerEl = new VNode("div", {
      attrs: {
        class: "player down",
        'data-skin': p.skin || localStorage.getItem("playerSkin") || "character1",
        id: p.id
      }
    }, app);

    placePlayerInCell(playerEl, p.y, p.x);
    updateHearts(playerEl, p.lives ?? 3);

    if (!localPlayer.id && p.session === localStorage.getItem("sessionId")) {
      localPlayer.id = p.id;
      localPlayer.x = p.x;
      localPlayer.y = p.y;
      localPlayer.speed = p.speed || 1;
    }
  });

  app.update();

  // Focus handling
  const domGameArea = document.getElementById("gameArea");
  if (domGameArea) {
    domGameArea.addEventListener("click", () => domGameArea.focus());
  }
// === Prevent walking into bombs ===
function canMoveClient(x, y) {
  const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
  if (!cell) return false;

  const bomb = cell.querySelector(".bomb");
  if (!bomb) return true;

  // If it's your bomb AND you are standing on it → allow walking off it
  if (bomb.dataset.owner === localPlayer.id &&
      x === localPlayer.x &&
      y === localPlayer.y) {
    return true;
  }

  return false;
}

// Predict next tile BEFORE sending to server
function predictNewPosition(dir) {
  let x = localPlayer.x;
  let y = localPlayer.y;

  if (dir === "up") y--;
  if (dir === "down") y++;
  if (dir === "left") x--;
  if (dir === "right") x++;

  return { x, y };
}

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

// Predict next tile
const nextPos = predictNewPosition(dir);

// If tile blocked by bomb → DO NOT SEND
if (!canMoveClient(nextPos.x, nextPos.y)) return;

// Safe → send move to server
socket.send(JSON.stringify({ 
    type: "move",
    id: localPlayer.id,
    direction: currentDirection 
}));

    // Then continue moving at the current speed interval while key is held
    moveInterval = setInterval(() => {
      socket.send(JSON.stringify({ type: "move", id: localPlayer.id, direction: currentDirection }
        
      )
    )
     // Recalculate next tile every frame
  const next = predictNewPosition(currentDirection);

  // If next tile has a bomb → STOP further movement
  if (!canMoveClient(next.x, next.y)) return;

  // Safe → send move
  socket.send(JSON.stringify({
    type: "move",
    id: localPlayer.id,
    direction: currentDirection
  }));
    }, getMoveInterval());
  }

  function stopMoving() {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    currentDirection = null;
  }

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
  const cellEl = app.getVNodeById(`cell-${row}-${col}`);
  if (!cellEl) return;

  // Remove from previous parent if any
  if (playerEl.parent) {
    playerEl.parent.children = playerEl.parent.children.filter(c => c !== playerEl);
  }

  cellEl.append(playerEl);
}

function createHeartsEl(lives) {
  const container = new VNode('div', {
    attrs: { class: 'hearts' }
  }, app);

  for (let i = 0; i < 3; i++) {
    const h = new VNode('div', {
      attrs: { class: 'heart' },
      children: ['♥']
    }, app);

    if (i >= lives) h.addClass('empty');
    container.append(h);
  }

  return container;
}

function updateHearts(playerEl, lives) {
  if (!playerEl) return;

  let hearts = playerEl.children.find(c => c.attrs && c.attrs.class === 'hearts');

  if (!hearts) {
    hearts = createHeartsEl(lives);
    playerEl.append(hearts);
    return;
  }

  const heartEls = hearts.children;
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      heartEls[i].removeClass('empty');
      heartEls[i].children = ["♥"];
    } else {
      heartEls[i].addClass('empty');
      heartEls[i].children = ['♡'];
    }
  }
}

// DOM version for runtime updates
function updateHeartsDOM(playerEl, lives) {
  if (!playerEl) return;

  let hearts = playerEl.querySelector('.hearts');
  if (!hearts) {
    hearts = document.createElement('div');
    hearts.className = 'hearts';
    for (let i = 0; i < 3; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.textContent = i < lives ? '♥' : '♡';
      if (i >= lives) h.classList.add('empty');
      hearts.appendChild(h);
    }
    playerEl.appendChild(hearts);
    return;
  }

  const heartEls = hearts.children;
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      heartEls[i].classList.remove('empty');
      heartEls[i].textContent = '♥';
    } else {
      heartEls[i].classList.add('empty');
      heartEls[i].textContent = '♡';
    }
  }
}

// Use addEventListener instead of onmessage to not override chat's listener
socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  // Ignore chat messages - let the chat handler deal with them
  if (msg.type === "message") {
    return;
  }

  switch (msg.type) {
    case "player_joined": {
      const p = msg.player;
      // Check if player element already exists in DOM
      if (!document.getElementById(p.id)) {
        const playerEl = document.createElement("div");
        playerEl.className = "player down";
        playerEl.dataset.skin = msg.skin || "character1";
        playerEl.id = p.id;

        const cellEl = document.querySelector(`.cell[data-row='${p.y}'][data-col='${p.x}']`);
        if (cellEl) cellEl.appendChild(playerEl);
      }
      break;
    }

    case "player_moved": {
      const { id, x, y, direction } = msg;
      if (id === localPlayer.id) {
        localPlayer.x = x;
        localPlayer.y = y;
      }

      const playerEl = document.getElementById(id);
      if (playerEl) {
        // Update direction sprite class
        playerEl.classList.remove("up", "down", "left", "right");
        if (direction) playerEl.classList.add(direction);

        // Move player to new cell
        const cellEl = document.querySelector(`.cell[data-row='${y}'][data-col='${x}']`);
        if (cellEl) {
          if (playerEl.parentElement) playerEl.parentElement.removeChild(playerEl);
          cellEl.appendChild(playerEl);
        }
      }
      break;
    }

    case "player_left": {
      const playerEl = document.getElementById(msg.id);
      if (playerEl) {
        playerEl.remove();
      }
      break;
    }

    case "player_damaged": {
      const { id, lives } = msg;
      const playerEl = document.getElementById(id);
      if (playerEl) {
        updateHeartsDOM(playerEl, lives);
      }
      break;
    }

    case "player_dead": {
      const { id } = msg;
      const playerEl = document.getElementById(id);
      if (playerEl) {
        playerEl.style.opacity = '0.4';
        updateHeartsDOM(playerEl, 0);
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
      const key = msg.x + "," + msg.y;
      delete powerups[key];
      renderBoard();
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
});

function cleanupPowerups() {
  const now = Date.now();
  for (let k in powerups) {
    if (powerups[k].timeout <= now) {
      delete powerups[k];
    }
  }
}

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

setInterval(() => {
  cleanupPowerups();
  renderBoard();
}, 200);
