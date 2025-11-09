import { VNode } from "../../Framework/over-react.js";
import { makeChatApp } from "./chatApp.js";
import { socket } from "../../ws.js";

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

  // ✅ Unified message send function
  function sendMessage() {
    const inputEl = document.getElementById("chat-input");
    if (!inputEl) return;
    const value = inputEl.value.trim();
    if (!value) return;

    socket.send(JSON.stringify({ type: "message", text: value }));
    app.state.messages.push({ author: "Me", text: value });
    inputEl.value = "";

    // 🔑 Trigger UI re-render
    app.vApp = makeChatApp(app);
    app.update();

    // ✅ Keep focus so user can type continuously
    inputEl.focus();
  }

  // 🧠 Listen for Enter key press
  input.listenEvent("onkeydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // 🖱️ Send button click
  button.listenEvent("onclick", sendMessage);

  // 🧩 One-time WebSocket listener
  if (!app._socketListening) {
    // Define listener as a named function so it can be removed later
    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message" && data.from && data.text) {
          app.state.messages.push({ author: data.from, text: data.text });
          app.vApp = makeChatApp(app);
          app.update();
        } else if (data.type === "start_game") {
          // ✅ Correct removal
          socket.removeEventListener("message", onMessage);
          console.log("🧹 Message listener removed after start_game");
        }
      } catch (err) {
        console.error("Invalid message from server:", err);
      }
    };

    socket.addEventListener("message", onMessage);
    app._socketListening = true;
  }

  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}
