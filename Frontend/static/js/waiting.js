import { socket } from "../ws.js";
import { VNode, App } from "../Framework/over-react.js";

let app = null;

export async function showWaitingRoom(mountPoint) {
  const appContainer = mountPoint || document.getElementById("app");
  const playerName = localStorage.getItem("playerName");
  const playerSkin = localStorage.getItem("playerSkin") || "character1";
  const playerSession = localStorage.getItem("sessionId");
  const playerListFromServer = await getPlayerList();
  const connectedPlayers = new Map();

  playerListFromServer.forEach(player => {
    
      connectedPlayers.set(player.session, { name: player.name, skin: player.skin || "character1" });
    
  });

  connectedPlayers.set(playerSession, { session: playerSession, name: playerName, skin: playerSkin });

  const waitingPage = new VNode("div", {
    attrs: { class: "waiting-page", id: "waiting-page" }
  });
  const waitingLeft = new VNode("div", {
    attrs: { class: "waiting-left", id: "waiting-left" }
  });

  const title = new VNode("h1", {
    attrs: { class: "waiting-title" },
    children: ["Waiting Room"]
  });

  const welcome = new VNode("p", {
    attrs: { class: "waiting-welcome" },
    children: ["Welcome ", new VNode("strong", { children: [playerName] }), " 👋"]
  });

  const status = new VNode("p", {
    attrs: { class: "waiting-status" },
    children: ["Waiting for other players..."]
  });

  const timer = new VNode("p", {
    attrs: { id: "timer", class: "waiting-timer" },
    children: ["⏳ Waiting..."]
  });

  const waitingPlayers = new VNode("div", {
    attrs: { class: "waiting-players", id: "waiting-players" }
  });

  const playersTitle = new VNode("h3", {
    attrs: { class: "players-title" },
    children: ["Connected Players:"]
  });

  const playerList = new VNode("div", {
    attrs: { class: "players-list", id: "player-list" }
  });

  // Initial player list population
  connectedPlayers.forEach(player => {
    const isCurrentUser = player.session === playerSession;

    const playerItem = new VNode("div", {
      attrs: {
        class: 'player-item',
        id: `player-${player.name}`,
        style: isCurrentUser ? 'border-color: #00ff88; box-shadow: 0 0 0 2px #000, 0 0 10px #00ff88;' : ''
      }
    });

    const avatarDiv = new VNode("div", {
      attrs: {
        class: 'player-avatar',
        'data-skin': player.skin || "character1"
      }
    });

    const youSpan = isCurrentUser ? new VNode("span", { attrs: { class: "you" }, children: ["(You)"] }) : "";
    const nameSpan = new VNode("span", {
      attrs: { class: 'player-name' },
      children: [player.name, " ", youSpan]
    });

    playerItem.append(avatarDiv, nameSpan);
    playerList.append(playerItem);
  });

  waitingPlayers.append(playersTitle, playerList);
  waitingLeft.append(title, welcome, status, timer, waitingPlayers);

  const waitingRight = new VNode("div", {
    attrs: { class: "waiting-right", id: "waiting-right" }
  });

  const chatTitle = new VNode("h3", {
    attrs: { class: "chat-title" },
    children: ["Chat"]
  });

  const chatBox = new VNode("div", {
    attrs: { id: "chat", class: "chat-box", "data-ignore": "true" }
  });

  waitingRight.append(chatTitle, chatBox);

  waitingPage.append(waitingLeft, waitingRight);

  app = new App(waitingPage, appContainer, {});

  const timerEl = app.getVNodeById("timer");

  function updatePlayersList() {
    const playerListVNode = app.getVNodeById('player-list');
    if (!playerListVNode) return;

    playerListVNode.children = [];

    connectedPlayers.forEach(player => {
      const isCurrentUser = player.session === playerSession;

      const playerItem = new VNode("div", {
        attrs: {
          class: 'player-item',
          id: `player-${player.name}`,
          style: isCurrentUser ? 'border-color: #00ff88; box-shadow: 0 0 0 2px #000, 0 0 10px #00ff88;' : ''
        }
      }, app);

      const avatarDiv = new VNode("div", {
        attrs: {
          class: 'player-avatar',
          'data-skin': player.skin || "character1"
        }
      }, app);

      const youSpan = isCurrentUser ? new VNode("span", { attrs: { class: "you" }, children: ["(You)"] }, app) : "";
      const nameSpan = new VNode("span", {
        attrs: { class: 'player-name' },
        children: [player.name, " ", youSpan]
      }, app);

      playerItem.append(avatarDiv, nameSpan);
      playerListVNode.append(playerItem);
    });

    app.update();
  }

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
        connectedPlayers.clear();
        msg.players.forEach(player => {
          
            connectedPlayers.set(player.session, {
              session: player.session,
              name: player.name,
              skin: player.skin || "character1"
            });
          
        });
        connectedPlayers.set(playerSession, {session: playerSession,  name: playerName, skin: playerSkin });
        updatePlayersList();
      }
      else if (msg.type === "user_left") {
        connectedPlayers.delete(msg.session);
        updatePlayersList();
      }
      else if (msg.type === "timer") {
        const secondText = msg.time_left === 1 ? "second" : "seconds";
        timerEl.children = [`⏳ ${msg.time_left} ${secondText} left...`];
        app.update();
      }
      else if (msg.type === "waiting") {
        timerEl.children = [msg.message];
        app.update();
      }
      else if (msg.type === "start_game") {
        timerEl.children = ["🚀 Game started!"];
        app.update();
        import("./game.js").then(module => {
          module.startGame(msg.grid, msg.players, app.$app);
        });
      }

    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  app.update();

  // Load chat after DOM is painted
  requestAnimationFrame(() => {
    import("../chat/app.js").then(chat => {
      chat.buildApp();
    });
  });

  async function getPlayerList() {
    return new Promise((resolve) => {
      socket.send(JSON.stringify({ type: "get_players" }));

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

      setTimeout(() => {
        socket.removeEventListener('message', handlePlayerList);
        resolve([]);
      }, 3000);
    });
  }

}
