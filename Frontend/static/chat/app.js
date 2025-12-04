import { App, VNode } from "../Framework/over-react.js";

import { makeChatApp } from "./components/chatApp.js";

// Global state to preserve messages across page transitions
if (!window._chatState) {
  window._chatState = {
    messages: [
      { author: "System", text: "Welcome to Bomber Man chat!" }
    ]
  };
}

export function buildApp() {
  // 1. Start with a placeholder root node
  const placeholder = new VNode("div", { attrs: { id: "root-placeholder" } });

  // 2. Mount the placeholder into #chat
  const $target = document.querySelector("#chat");
  console.log("Chat buildApp - target element found:", !!$target, "element:", $target);

  if (!$target) {
    console.error("Chat target #chat not found in DOM!");
    return null;
  }

  const app = new App(placeholder, $target, window._chatState);

  // 3. Now rebuild the actual chat UI with the real app reference
  app.vApp = makeChatApp(app);
  app.update();

  // 4. After initial render, add all existing messages to DOM
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const messagesContainer = document.querySelector(".chat-messages");
      console.log("Chat rebuild - container found:", !!messagesContainer, "messages count:", window._chatState.messages.length);

      if (messagesContainer && window._chatState.messages) {
        // Clear container first
        messagesContainer.innerHTML = '';

        // Re-add all messages from state
        window._chatState.messages.forEach(msg => {
          const messageEl = document.createElement("div");
          messageEl.className = "chat-message";

          const authorEl = document.createElement("span");
          authorEl.className = "author";
          authorEl.textContent = msg.author + ": ";

          const textEl = document.createElement("span");
          textEl.className = "text";
          textEl.textContent = msg.text;

          messageEl.appendChild(authorEl);
          messageEl.appendChild(textEl);
          messagesContainer.appendChild(messageEl);
        });

        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });

  return app;
}
