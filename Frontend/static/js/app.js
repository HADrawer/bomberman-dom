import { socket } from "../ws.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function showLobbyScreen() {
    app.innerHTML = `
      <div class="container">
        <h1 class="bomberman">Bomberman</h1>
        <div id="lobbyStartBtn" class="start-text"><span class="arrow">></span> Start</div>
      </div>
    `;
    document.getElementById("lobbyStartBtn").addEventListener("click", showNameScreen);
  }

  function showNameScreen() {
    app.innerHTML = `
      <div class="container">
        <h1 class="heading-text">Enter Your Name:</h1>
        <input type="text" id="playerName" placeholder="Your name here" />
        <br><br>

        <h2>Select Your Character:</h2>

        <div class="character-select">
          <div class="char-box" data-skin="character1"></div>
          <div class="char-box" data-skin="character2"></div>
          <div class="char-box" data-skin="character3"></div>
          <div class="char-box" data-skin="character4"></div>
        </div>

        <br><br>
        <div id="startBtn" class="start-text"><span class="arrow">></span> Join</div>
      </div>
    `;

    let selectedSkin = null;

    const charBoxes = document.querySelectorAll(".char-box");
    charBoxes.forEach((box) => {
      box.addEventListener("click", () => {
        charBoxes.forEach((b) => b.classList.remove("selected"));
        box.classList.add("selected");
        selectedSkin = box.getAttribute("data-skin");
      });
    });

    function submitName() {
      const name = document.getElementById("playerName").value.trim();
      if (!name) return alert("Name is required!");
      if (!selectedSkin) return alert("Please select a character!");
      
      let sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("sessionId", sessionId);
      }

      localStorage.setItem("playerName", name);
      localStorage.setItem("playerSkin", selectedSkin);

      socket.send(JSON.stringify({ 
        type: "set_name",
        name,
        skin: selectedSkin,
        sessionId : sessionId
       }));
      loadWaitingRoom();
    }

    document.getElementById("startBtn").addEventListener("click", submitName);
    document.getElementById("playerName").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitName();
    });
  }

  function loadWaitingRoom() {
    import("./waiting.js").then((module) => {
      module.showWaitingRoom();
    });
  }

  showLobbyScreen();
});
