export function showWaitingRoom() {
  const app = document.getElementById("app");
  const playerName = localStorage.getItem("playerName");

  app.innerHTML = `
    <div class="container">
      <h1>غرفة الانتظار</h1>
      <p>أهلاً <strong>${playerName}</strong> 👋</p>
      <p>بانتظار لاعبين آخرين...</p>
      <p id="timer">⏳ 15 ثانية متبقية...</p>
      <button id="startGameBtn" disabled>ابدأ اللعبة</button>

      <div id="chat"></div>

    </div>
  `;

  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("startGameBtn");

  let timeLeft = 15;

  const countdown = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏳ ${timeLeft} ثانية متبقية...`;

    if (timeLeft <= 0) {
      clearInterval(countdown);
      timerEl.textContent = "✅ يمكنك بدء اللعبة الآن!";
      startBtn.disabled = false;
    }
  }, 1000);

  startBtn.addEventListener("click", () => {
    import("./game.js").then(module => {
      module.startGame();
    });
  });

  import("../chat/app.js").then(chat => {
    chat.buildApp(); 
  });
}
