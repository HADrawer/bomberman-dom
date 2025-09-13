export function startGame() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="container">
      <h1>🚀 اللعبة بدأت!</h1>
    </div>
    <div id="chat"></div>
  `;

  import("../chat/app.js").then(chat => {
    chat.buildApp(); 
  });
}
