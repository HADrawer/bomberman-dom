import { VNode } from "../../Framework/over-react.js";

export function makeMessageList(app) {
  const state = app.state;

  const children = state.messages.map((msg, idx) =>
    new VNode("div", {
      attrs: { class: "chat-message", id: `msg-${idx}` },
      children: [
        new VNode("span", { attrs: { class: "author" }, children: [msg.author + ": "] }),
        new VNode("span", { attrs: { class: "text" }, children: [msg.text] })
      ]
    })
  );

  return new VNode("div", {
    attrs: { class: "chat-messages" },
    children
  });
}
