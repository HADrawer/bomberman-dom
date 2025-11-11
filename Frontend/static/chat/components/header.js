import { VNode } from "../../Framework/over-react.js";

export function makeHeader() {
  return new VNode("div", {
    attrs: { class: "chat-header" },
    children: [
      new VNode("h2", { children: [""] })
    ]
  });
}
