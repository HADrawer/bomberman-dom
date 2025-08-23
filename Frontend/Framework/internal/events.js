export class EventRegister {
  #types = new Set();
  handlers = new Map();
  $root;

  constructor($root) {
    this.$root = $root;
    this.centralEventHandler = this.centralEventHandler.bind(this);
  }

  #updateListenersOnRootNode() {
    // Add new event listeners and update rootEventTypes
    this.handlers.forEach((handlers, eventType) => {
      if (!this.#types.has(eventType)) {
        this.$root.addEventListener(
          eventType.slice(2),
          this.centralEventHandler,
          true
        );
        this.#types.add(eventType);
      }
    });

    // Remove old event listeners
    this.#types.forEach((eventType) => {
      if (!this.handlers.has(eventType)) {
        $root.removeEventListener(eventType.slice(2), this.centralEventHandler);
        this.#types.delete(eventType);
      }
    });
  }

  #removeEventListenersKeyIfNone(eventType) {
    if (
      this.handlers.has(eventType) &&
      this.handlers.get(eventType).size === 0
    ) {
      this.handlers.delete(eventType);
    }
  }

  listenEvent(vNode, eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }
    vNode.attrs[eventType] = handler;
    this.handlers.get(eventType).set(vNode.attrs.id, handler);
    this.#updateListenersOnRootNode();
  }

  unlistenEvent(vNode, eventType) {
    if (!vNode.attrs) {
      console.log("No attributes found for vNode", vNode);
      return;
    }
    delete vNode.attrs[eventType];
    this.handlers.get(eventType).delete(vNode.attrs.id);
    this.#removeEventListenersKeyIfNone(eventType);
    this.#updateListenersOnRootNode();
  }

  clearEventHandlers(vNode) {
    for (const [k, v] of Object.entries(vNode.attrs)) {
      if (k.startsWith("on")) {
        this.handlers.get(k).delete(vNode.attrs.id);
        this.#removeEventListenersKeyIfNone(k);
      }
    }
    this.#updateListenersOnRootNode();
  }

  centralEventHandler(event) {
    const eventType = "on" + event.type;
    const handlersForType = this.handlers.get(eventType);
    if (handlersForType && handlersForType.has(event.target.id)) {
      const handler = handlersForType.get(event.target.id);
      if (typeof handler === "function") {
        handler(event);
      }
    }
  }
}
