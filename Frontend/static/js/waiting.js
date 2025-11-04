import { socket } from "../ws.js";

export async function showWaitingRoom() {
  const app = document.getElementById("app");
  const playerName = localStorage.getItem("playerName");

   const playerListFromServer = await getPlayerList();
  const connectedPlayers = new Set(playerListFromServer);

  connectedPlayers.add(playerName);

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
        <div class="players-list">
          ${Array.from(connectedPlayers).map(player => `
            <div class="player-item">
              👤 ${player} ${player === playerName ? '<span class="you">(You)</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- RIGHT FRAME: Chat Box -->
    <div class="waiting-right">
      <h3 class="chat-title"> Chat</h3>
      <div id="chat" class="chat-box"></div>
    </div>

  </div>
`;


  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("startGameBtn");
//   const debugDiv = document.getElementById("debug");
  const playerList = document.getElementById("player-list");

  

//   const connectedPlayers = new Set([playerName]);

//   function logDebug(message) {
//     const p = document.createElement("p");
//     p.style.color = 'blue';
//     p.textContent = `DEBUG: ${message}`;
//     debugDiv.appendChild(p);
//     console.log(message);
//   }

//     logDebug(`Waiting room loaded for: ${playerName}`);




 

socket.addEventListener("message", (event) => {
     try {
        const msg = JSON.parse(event.data);

        if (msg.type === "user_joined") {
            if (!connectedPlayers.has(msg.name)) {
                connectedPlayers.add(msg.name);
                updatePlayersList();
            }
        }
        else if (msg.type === "player_list") {
            // This is the most important part!
            connectedPlayers.clear();
            msg.players.forEach(player => {
                connectedPlayers.add(player);
            });
            updatePlayersList();
        }
        else if (msg.type === "user_left") {
            connectedPlayers.delete(msg.name);
            updatePlayersList();
        }
        else if (msg.type === "timer"){
            timerEl.textContent = `⏳ ${msg.time_left} second left...`
        }
        else if (msg.type === "waiting") {
            timerEl.textContent = msg.message   
        }
        else if (msg.type === "start_game"){
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
     playerList.innerHTML = '';
    
    connectedPlayers.forEach(player => {
        const isCurrentUser = player === playerName;
        const playerEl = document.createElement("div");
        playerEl.className = 'player-item';
        playerEl.textContent = `👤 ${player} ${isCurrentUser ? '(You)' : ''}`;
        playerEl.style.color = isCurrentUser ? 'green' : 'black';
        playerEl.style.margin = '5px 0';
        playerEl.style.padding = '5px';
        playerEl.style.backgroundColor = '#f0f0f0';
        playerEl.style.borderRadius = '4px';
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
