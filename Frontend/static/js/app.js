
import { socket } from "../ws.js"; 

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function showNameScreen() {
    app.innerHTML = `
       <div class="container">
        <h1>Enter Your Name:</h1>
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

        <button id="startBtn">Join</button>
      </div>
    `;

    document.getElementById("startBtn").addEventListener("click", () => {
      const name = document.getElementById("playerName").value.trim();
      const skin = document.getElementById("skinSelect").value;

      if (!name) return alert("Name required!");

      // Save player info
      localStorage.setItem("playerName", name);
      localStorage.setItem("playerSkin", skin);

      // Tell the server your name
socket.send(JSON.stringify({ type: "set_name", name, skin }));

      // Move to waiting room
      loadWaitingRoom();
    });
  }

  function loadWaitingRoom() {
    import("./waiting.js").then(module => {
      module.showWaitingRoom();
    });
  }

  showNameScreen();
});
