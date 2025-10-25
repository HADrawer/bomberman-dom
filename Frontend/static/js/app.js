import { socket } from "../ws.js"; 

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function showNameScreen() {
    app.innerHTML = `
       <div class="container">
        <h1>Enter Your Name:</h1>
        <input type="text" id="playerName" placeholder="Your name here" />
        <br>
        <button id="startBtn">Join</button>
      </div>
    `;

    document.getElementById("startBtn").addEventListener("click", () => {
      const name = document.getElementById("playerName").value.trim();
      if (!name) return alert("Name required!");

      localStorage.setItem("playerName", name);
      socket.send(JSON.stringify({ type: "set_name", name }));

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
