import { socket } from "../ws.js";

export let localPlayer = { id: null, x: 0, y: 0 };
let grid = null;

export function startGame(serverGrid, players) {
  grid = serverGrid;

  const app = document.getElementById("app");
  app.innerHTML = `
  <div class="game-page">

    <!-- LEFT = GAME -->
    <div class="game-left">
      <p style="text-align:center; margin-top:5px;">Use WASD or Arrow Keys • Press X to place bomb</p>
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
      case "arrowup": dir = "up"; break;
      case "arrowdown": dir = "down"; break;
      case "arrowleft": dir = "left"; break;
      case "arrowright": dir = "right"; break;
    }
    if (dir) {
      movePlayerLocally(dir);
    }
  });
  // }
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "x") {
      socket.send(JSON.stringify({
        type: "plant_bomb"
      }));
    return;
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

    case "bomb_planted": {
      spawnBomb(msg.id,msg.x,msg.y);
      break;
    }

    case "bomb_exploded":{
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

    const cellEl = document.querySelector(`.cell[data-row="${newY}"][data-col="${newX}"]`);
  if (!cellEl) return;

  // Allow movement only through sand and start-zone cells
  if (!cellEl.classList.contains("sand") && !cellEl.classList.contains("start-zone")) {
    return;
  }
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


// 💥 Simulate explosion (remove bomb + show animation)


function spawnBomb(id,x,y) {
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

function handleExplosion(cells){
  cells.forEach(([x,y]) => {
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
