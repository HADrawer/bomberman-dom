import { VNode } from "./internal/v-node.js";
import { App } from "./internal/app.js";
import { HTMLToVNode } from "./internal/html-to-v-node.js";
import { VNodeToHTML } from "./internal/v-node-to-html.js";

export { VNode, App, HTMLToVNode, VNodeToHTML };

export const overReact = {
  VNode,
  App,
  HTMLToVNode,
  VNodeToHTML,
};
