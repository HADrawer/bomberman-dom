import { VNode } from "../../Framework/over-react.js";
import { makeChatApp } from "./chatApp.js";
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