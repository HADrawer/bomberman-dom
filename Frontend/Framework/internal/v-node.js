import { addStyle, removeStyle } from "./style.js";
import { VNodeToHTML } from "./v-node-to-html.js";

export class VNode {
  tagName;
  attrs;
  children;
  eventRegister;

  constructor(tagName, { attrs = {}, children = [] } = {}, app = null) {
    if (typeof tagName !== "string") {
      throw new Error("tagName must be a string");
    }

    if (typeof attrs !== "object") {
      throw new Error("attrs must be an object");
    }

    if (!Array.isArray(children)) {
      throw new Error("children must be an array");
    }

    this.tagName = tagName;
    this.attrs = attrs;
    this.children = children;

    this.eventRegister = app ? app.eventRegister : null;
  }

  toHTML() {
    return VNodeToHTML(this);
  }

  append(...children) {
    this.children.push(...children);
    return this;
  }

  removeChild(childToRemove) {
    if (this.children.indexOf(childToRemove) === -1) {
      throw new Error("Child not found");
    }
    this.children = this.children.filter((child) => child !== childToRemove);
    return this;
  }

  addAttribute(attribute, value) {
    if (attribute.startsWith("on")) {
      if (this.eventRegister.handlers.has(attribute)) {
        this.root.eventRegister.handlers
          .get(attribute)
          .set(this.attrs.id, value);
      } else {
        this.eventRegister.handlers.set(
          attribute,
          new Map([[this.attrs.id, value]])
        );
      }
    } else {
      this.attrs[attribute] = value;
    }
    return this;
  }

  removeAttribute(attribute) {
    if (attribute.startsWith("on")) {
      if (
        this.eventRegister.handlers.has(attribute) &&
        this.eventRegister.handlers.get(attribute).has(this.attrs.id)
      ) {
        this.eventRegister.unlistenEvent(this, attribute);
        return this;
      } else {
        console.log("No event handler found for", attribute, this);
        return this;
      }
    }
    if (this.attrs[attribute] === undefined) {
      console.log("No attribute found for", attribute, this);
      return this;
    }
    delete this.attrs[attribute];
    return this;
  }

  addClass(className) {
    if (this.attrs.class) {
      this.attrs.class += ` ${className}`;
    } else {
      this.attrs.class = className;
    }
    return this;
  }

  removeClass(className) {
    if (this.attrs.class) {
      this.attrs.class = this.attrs.class.replace(className, "").trim();
    }
    return this;
  }

  hasClass(className) {
    if (this.attrs.class) {
      return this.attrs.class.includes(className);
    }
    return false;
  }

  listenEvent(onevent, handler) {
    if (!this.eventRegister) {
      throw new Error("Event register not set");
    }
    this.eventRegister.listenEvent(this, onevent, handler);
    return this;
  }

  unlistenEvent(onevent) {
    if (!this.eventRegister) {
      throw new Error("Event register not set");
    }
    this.eventRegister.unlistenEvent(this, onevent);
    return this;
  }

  clearEvents() {
    if (!this.eventRegister) {
      throw new Error("Event register not set");
    }
    this.eventRegister.clearEventHandlers(this);
    return this;
  }

  hide() {
    addStyle(this, "display", "none");
    return this;
  }

  show() {
    removeStyle(this, "display", "none");
    return this;
  }

  addStyle(key, value) {
    addStyle(this, key, value);
    return this;
  }

  removeStyle(key) {
    removeStyle(this, key);
    return this;
  }
}
