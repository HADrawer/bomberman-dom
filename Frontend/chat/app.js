import { App,VNode } from "../Framework/over-react.js";
import { makeChatApp } from "./components/chatApp.js";

const state = {
  messages: [
    { author: "System", text: "Welcome to overReact chat!" }
  ]
};

export function buildApp() {
  // 1. Start with a placeholder root node
  const placeholder = new VNode("div", { attrs: { id: "root-placeholder" } });

  // 2. Mount the placeholder into #app
  const $target = document.querySelector("#app");
  const app = new App(placeholder, $target, state);

  // 3. Now rebuild the actual chat UI with the real app reference
  app.vApp = makeChatApp(app);
  app.update();

  return app;
}
