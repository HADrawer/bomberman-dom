import { socket } from "../ws.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  // 🌟 Step 1: Lobby Screen
  function showLobbyScreen() {
    app.innerHTML = `
      <div class="container">
        <h1 class="bomberman">Bomberman</h1>
        <div id="lobbyStartBtn" class="start-text"><span class="arrow">></span> Start</div>
      </div>
    `;

    // Click or Enter to continue
    document.getElementById("lobbyStartBtn").addEventListener("click", showNameScreen);
    document.addEventListener("keydown", (e) => {
     // if (e.key === "Enter") showNameScreen();
    });
  }

  // 🧍 Step 2: Name + Skin Selection
  function showNameScreen() {
    app.innerHTML = `
      <div class="container">
        <h1 class="heading-text">Enter Your Name:</h1>
        <input type="text" id="playerName" placeholder="Your name here" />
        <br><br>

        <label for="skinSelect"><strong>Select Character Skin:</strong></label>
        <select id="skinSelect">
          <option value="character1">🧍 Character 1</option>
          <option value="character2">🧍‍♂️ Character 2</option>
          <option value="character3">🧍‍♂️ Character 3</option>
          <option value="character4">🧍‍♂️ Character 4</option>
        </select>
        <br><br>

        <div id="startBtn" class="start-text"><span class="arrow">></span> Join</div>
      </div>
    `;

    function submitName() {
      const name = document.getElementById("playerName").value.trim();
      const skin = document.getElementById("skinSelect").value;

      if (!name) return alert("Name required!");

      // Save player info
      localStorage.setItem("playerName", name);
      localStorage.setItem("playerSkin", skin);

      // Notify backend
      socket.send(JSON.stringify({ type: "set_name", name, skin }));

      // Move to waiting room
      loadWaitingRoom();
    }

    document.getElementById("startBtn").addEventListener("click", submitName);
    document.getElementById("playerName").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitName();
    });
  }

  // 🕓 Step 3: Waiting Room
  function loadWaitingRoom() {
    import("./waiting.js").then((module) => {
      module.showWaitingRoom();
    });
  }

  // Start at Lobby
  showLobbyScreen();
});
