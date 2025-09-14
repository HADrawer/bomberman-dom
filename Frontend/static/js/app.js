import { socket } from "../ws.js";  
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function showNameScreen() {
    app.innerHTML = `
      <div class="container">
        <h1>ادخل اسمك</h1>
        <input type="text" id="playerName" placeholder="اسمك هنا" />
        <br>
        <button id="startBtn">دخول</button>
      </div>
    `;

    document.getElementById("startBtn").addEventListener("click", () => {
      const name = document.getElementById("playerName").value.trim();
      if (!name) {
        alert("الاسم مطلوب!");
        return;
      }

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
