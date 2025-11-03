import { VNode } from "../../Framework/over-react.js";
import { makeChatApp } from "./chatApp.js";
import { socket } from "../../ws.js";

export function makeInputBox(app) {
  const input = new VNode("input", {
    attrs: { id: "chat-input", placeholder: "Type a message...", class: "chat-input" }
  }, app);

  const button = new VNode("button", {
    attrs: { id: "send-btn", class: "chat-send" },
    children: ["Send"]
  }, app);

  button.listenEvent("onclick", () => {
    const inputEl = document.getElementById("chat-input");
    const value = inputEl.value.trim();
    if (!value) return;
    socket.send((JSON.stringify({ type: "message", text: value })));
    app.state.messages.push({ author: "Me", text: value });
    inputEl.value = "";

    // 🔑 Trigger UI re-render
    app.vApp = makeChatApp(app);
    app.update();
  });

if (!app._socketListening) {
    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message" && data.from && data.text) {
          app.state.messages.push({ author: data.from, text: data.text });

          app.vApp = makeChatApp(app);
          app.update();
        }
      } catch (err) {
        console.error("Invalid message from server:", err);
      }
    });

    app._socketListening = true;
  }




  
  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}