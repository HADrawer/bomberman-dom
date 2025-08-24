import { VNode } from "../../Framework/over-react.js";
import { makeChatApp } from "./chatApp.js";
import { socket, Socket } from "../../static/ws.js";
import { text } from "stream/consumers";

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
    socket.send((JSON.stringify({ type: "get_users", text: value })));
    app.state.messages.push({ author: "Me", text: value });
    inputEl.value = "";

    // 🔑 Trigger UI re-render
    app.vApp = makeChatApp(app);
    app.update();
  });

  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}