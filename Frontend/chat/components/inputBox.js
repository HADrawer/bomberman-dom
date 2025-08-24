import { VNode } from "../../Framework/over-react.js";

export function makeInputBox(app) {
  const input = new VNode("input", {
    attrs: { id: "chat-input", placeholder: "Type a message...", class: "chat-input" }
  }, app);

  const button = new VNode("button", {
    attrs: { id: "send-btn", class: "chat-send" },
    children: ["Send"]
  }, app);

  button.listenEvent("onclick", () => {
    const value = document.getElementById("chat-input").value.trim();
    if (!value) return;

    app.state.messages.push({ author: "Me", text: value });
    document.getElementById("chat-input").value = "";
  });

  return new VNode("div", {
    attrs: { class: "chat-input-box" },
    children: [input, button]
  });
}
