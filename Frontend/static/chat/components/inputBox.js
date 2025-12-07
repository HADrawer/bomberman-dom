import { VNode } from "../../Framework/over-react.js";
import { socket } from "../../ws.js";

function addSystemMsg(text) {
  // add to global state
  window._chatState.messages.push({
    author: "System",
    text
  });

  // append to DOM manually
  const container = document.querySelector(".chat-messages");
  if (!container) return;

  const msgEl = document.createElement("div");
  msgEl.className = "chat-message system-msg";

  const textEl = document.createElement("span");
  textEl.className = "text";
  textEl.textContent = text;

  msgEl.appendChild(textEl);
  container.appendChild(msgEl);

  container.scrollTop = container.scrollHeight;
}

export function makeInputBox(app) {
  const input = new VNode("input", {
    attrs: {
      id: "chat-input",
      placeholder: "Type a message...",
      class: "chat-input"
    }
  }, app);

  const button = new VNode("button", {
    attrs: { id: "send-btn", class: "chat-send" },
    children: ["Send"]
  }, app);

  function sendMessage() {
    const inputEl = document.getElementById("chat-input");
    if (!inputEl) return;
    const value = inputEl.value.trim();
    if (!value) return;

    socket.send(JSON.stringify({ type: "message", text: value }));

    window._chatState.messages.push({ author: "Me", text: value });

    const container = document.querySelector(".chat-messages");
    if (container) {
      const msgEl = document.createElement("div");
      msgEl.className = "chat-message";

      const authorEl = document.createElement("span");
      authorEl.className = "author";
      authorEl.textContent = "Me: ";

      const textEl = document.createElement("span");
      textEl.className = "text";
      textEl.textContent = value;

      msgEl.appendChild(authorEl);
      msgEl.appendChild(textEl);
      container.appendChild(msgEl);

      container.scrollTop = container.scrollHeight;
    }

    inputEl.value = "";
    inputEl.focus();
  }

  input.listenEvent("onkeydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  button.listenEvent("onclick", sendMessage);

  // Add system and chat WebSocket handler ONCE
  if (!window._chatSocketListening) {

    socket.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error("Invalid WS data:", err);
        return;
      }

      //  JOIN
      if (data.type === "user_joined") {
        addSystemMsg(`${data.name} joined the game`);
        return;
      }

      //  LEAVE
      if (data.type === "user_left") {
        addSystemMsg(`${data.name} left the game`);
        return;
      }

      //  DEATH
      if (data.type === "player_dead") {
        addSystemMsg(`${data.name} died 💀`);
        return;
      }

      //  SYSTEM
      if (data.type === "system") {
        addSystemMsg(data.text);
        return;
      }

      //  NORMAL CHAT MESSAGE
      if (data.type === "message" && data.from && data.text) {
        window._chatState.messages.push({
          author: data.from,
          text: data.text
        });

        const container = document.querySelector(".chat-messages");
        if (container) {
          const msgEl = document.createElement("div");
          msgEl.className = "chat-message";

          const authorEl = document.createElement("span");
          authorEl.className = "author";
          authorEl.textContent = data.from + ": ";

          const textEl = document.createElement("span");
          textEl.className = "text";
          textEl.textContent = data.text;

          msgEl.appendChild(authorEl);
          msgEl.appendChild(textEl);
          container.appendChild(msgEl);

          container.scrollTop = container.scrollHeight;
        }
      }
    });

    window._chatSocketListening = true;
  }

  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}
