import { socket } from "../ws.js";

export async function showWaitingRoom() {
  const app = document.getElementById("app");
  const playerName = localStorage.getItem("playerName");
  const playerSkin = localStorage.getItem("playerSkin") || "character1";
  const playerSession = localStorage.getItem("sessionId");

  const playerListFromServer = await getPlayerList();
  // Store players as objects with name and skin
  const connectedPlayers = new Map();

  // Add players from server
  playerListFromServer.forEach(player => {
    
      // New format with skin
      connectedPlayers.set(player.session, { session: player.session, name: player.name, skin: player.skin || "character1" });
    
  });

  // Add current player
  connectedPlayers.set(playerSession, { session: playerSession, name: playerName, skin: playerSkin });

  app.innerHTML = `
  <div class="waiting-page">
    
    <!-- LEFT FRAME: Waiting Room Info -->
    <div class="waiting-left">
      <h1 class="waiting-title">Waiting Room</h1>
      <p class="waiting-welcome">Welcome <strong>${playerName}</strong> 👋</p>
      <p class="waiting-status">Waiting for other players...</p>
      <p id="timer" class="waiting-timer">⏳ Waiting...</p>

      <div class="waiting-players">
        <h3 class="players-title">Connected Players:</h3>
        <div class="players-list" id="player-list">
          ${Array.from(connectedPlayers.values()).map(player => `
            <div class="player-item">
              <div class="player-avatar" data-skin="${player.skin}"></div>
              <span class="player-name">${player.name} ${player.session === playerSession ? '<span class="you">(You)</span>' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- RIGHT FRAME: Chat Box -->
    <div class="waiting-right">
      <h3 class="chat-title"> Bomber Man Chat
</h3>
      <div id="chat" class="chat-box"></div>
    </div>

  </div>
`;


  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("startGameBtn");
  //   const debugDiv = document.getElementById("debug");
  const playerList = document.getElementById("player-list");



 



  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "user_joined") {
        if (!connectedPlayers.has(msg.session)) {
          connectedPlayers.set(msg.session, {
            name: msg.name,
            skin: msg.skin || "character1"
          });
          updatePlayersList();
        }
      }
      else if (msg.type === "player_list") {
        // This is the most important part!
        connectedPlayers.clear();
        msg.players.forEach(player => {
          
            connectedPlayers.set(player.session, {
              session: player.session,
              name: player.name,
              skin: player.skin || "character1"
            });
          
        });
        // Re-add current player with their skin
        connectedPlayers.set(playerSession, { session: playerSession, name: playerName, skin: playerSkin });
        updatePlayersList();
      }
      else if (msg.type === "user_left") {
        connectedPlayers.delete(msg.session);
        updatePlayersList();
      }
      else if (msg.type === "timer") {
        timerEl.textContent = `⏳ ${msg.time_left} second left...`
      }
      else if (msg.type === "waiting") {
        timerEl.textContent = msg.message
      }
      else if (msg.type === "start_game") {
        timerEl.textContent = "🚀 Game started!";
        import("./game.js").then(module => {
          module.startGame(msg.grid, msg.players);
        });
      }

    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  function updatePlayersList() {
    const playerList = document.getElementById('player-list');
    if (!playerList) return;

    playerList.innerHTML = '';

    connectedPlayers.forEach(player => {
      const isCurrentUser = player.session === playerSession;
      const playerEl = document.createElement("div");
      playerEl.className = 'player-item';

      // Create avatar div
      const avatarDiv = document.createElement("div");
      avatarDiv.className = 'player-avatar';
      avatarDiv.dataset.skin = player.skin || "character1";

      // Create name span
      const nameSpan = document.createElement("span");
      nameSpan.className = 'player-name';
      nameSpan.innerHTML = `${player.name} ${isCurrentUser ? '<span class="you">(You)</span>' : ''}`;

      playerEl.appendChild(avatarDiv);
      playerEl.appendChild(nameSpan);

      if (isCurrentUser) {
        playerEl.style.borderColor = '#00ff88';
        playerEl.style.boxShadow = '0 0 0 2px #000, 0 0 10px #00ff88';
      }

      playerList.appendChild(playerEl);
    });
  }

  async function getPlayerList() {
    return new Promise((resolve) => {
      // Send request to get player list
      socket.send(JSON.stringify({ type: "get_players" }));

      // Set up a one-time listener for the response
      const handlePlayerList = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "player_list") {
            socket.removeEventListener('message', handlePlayerList);
            resolve(msg.players || []);
          }
        } catch (error) {
          console.error('Error parsing player list:', error);
          resolve([]);
        }
      };

      socket.addEventListener('message', handlePlayerList);

      // Timeout after 3 seconds
      setTimeout(() => {
        socket.removeEventListener('message', handlePlayerList);
        resolve([]);
      }, 3000);
    });
  }


  import("../chat/app.js").then(chat => {
    chat.buildApp();
  });

}
