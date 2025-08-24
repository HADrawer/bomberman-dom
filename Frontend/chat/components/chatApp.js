import { VNode } from "../../Framework/over-react.js";
import { makeHeader } from "./header.js";
import { makeMessageList } from "./messageList.js";
import { makeInputBox } from "./inputBox.js";

export function makeChatApp(app) {
  return new VNode("div", {
    attrs: { class: "chat-container" },
    children: [
      makeHeader(),
      makeMessageList(app),
      makeInputBox(app)
    ]
  });
}
