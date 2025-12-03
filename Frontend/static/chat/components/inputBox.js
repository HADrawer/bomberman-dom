import { VNode } from "../../Framework/over-react.js";
import { makeChatApp } from "./chatApp.js";
import { socket } from "../../ws.js";

// Ensure global chat state exists
if (!window._chatState) {
  window._chatState = {
    messages: [
      { author: "System", text: "Welcome to Bomber Man chat!" }
    ]
  };
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

  // ✅ Unified message send function
  function sendMessage() {
    const inputEl = document.getElementById("chat-input");
    if (!inputEl) return;
    const value = inputEl.value.trim();
    if (!value) return;

    socket.send(JSON.stringify({ type: "message", text: value }));
    // Use global state to ensure messages persist across app instances
    window._chatState.messages.push({ author: "Me", text: value });
    console.log("Message sent, state now has", window._chatState.messages.length, "messages");
    inputEl.value = "";

    // Directly update DOM instead of using app.update() to avoid conflicts
    const messagesContainer = document.querySelector(".chat-messages");
    if (messagesContainer) {
      const messageEl = document.createElement("div");
      messageEl.className = "chat-message";

      const authorEl = document.createElement("span");
      authorEl.className = "author";
      authorEl.textContent = "Me: ";

      const textEl = document.createElement("span");
      textEl.className = "text";
      textEl.textContent = value;

      messageEl.appendChild(authorEl);
      messageEl.appendChild(textEl);
      messagesContainer.appendChild(messageEl);

      // Auto-scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

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

  // 🧩 One-time WebSocket listener setup
  if (!window._chatSocketListening) {
    // Define listener as a named function
    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message" && data.from && data.text) {
          // Add message to global state to ensure persistence
          window._chatState.messages.push({ author: data.from, text: data.text });
          console.log("Message received, state now has", window._chatState.messages.length, "messages");

          // Directly update DOM instead of using app.update() to avoid conflicts
          const messagesContainer = document.querySelector(".chat-messages");
          if (messagesContainer) {
            const messageEl = document.createElement("div");
            messageEl.className = "chat-message";

            const authorEl = document.createElement("span");
            authorEl.className = "author";
            authorEl.textContent = data.from + ": ";

            const textEl = document.createElement("span");
            textEl.className = "text";
            textEl.textContent = data.text;

            messageEl.appendChild(authorEl);
            messageEl.appendChild(textEl);
            messagesContainer.appendChild(messageEl);

            // Auto-scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
        // Don't remove listener when game starts - chat should work during game too
      } catch (err) {
        console.error("Invalid message from server:", err);
      }
    };

    socket.addEventListener("message", onMessage);
    window._chatSocketListening = true;
  }

  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}
