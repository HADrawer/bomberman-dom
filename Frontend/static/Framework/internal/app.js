import { EventRegister } from "./events.js";
import { render } from "./render.js";
import { diff } from "./diff.js";

export class App {
  vApp;
  vAppOld;
  $app;
  eventRegister;
  router;
  state;
  #batch;

  constructor(vApp, $target, state) {
    this.vApp = vApp;
    this.vAppOld = this.#cloneVNode(vApp);
    this.$app = render(vApp);
    $target.replaceWith(this.$app);
    this.eventRegister = new EventRegister(this.$app);

    this.state = new Proxy(state, {
      set: (state, key, value) => {
        if (state[key] === value) {
          console.log("No change");
          return true;
        }
        state[key] = value;
        console.log("Setting", key, "to", value);

        // `requestAnimationFrame` ensures `update` is called before the repaint that it triggers. Otherwise `update` may be called after the repaint and the changes will not be visible until repaint has been triggered again by the next update.
        if (this.#batch) {
          // By canceling any previous `requestAnimationFrame`, we make sure that only one `update` is called per frame, thus batching interactions with the DOM, and preventing multiple updates in response to a single event.
          cancelAnimationFrame(this.#batch);
        }
        this.#batch = requestAnimationFrame(() => this.update());

        return true;
      },
    });

    this.#setEventRegisterOnVNodes();
  }

  #setEventRegisterOnVNodes() {
    this.traverse(this.vApp, (vNode) => {
      if (typeof vNode === "string" || !vNode || typeof vNode !== "object") {
        return;
      }
      vNode.eventRegister = this.eventRegister;
    });
  }

  #cloneVNode(vNode) {
    if (typeof vNode === "string") {
      return vNode;
    }
    if (!vNode || typeof vNode !== "object") {
      return vNode;
    }

    // Clone VNode without parent and eventRegister to avoid circular references
    return {
      tagName: vNode.tagName,
      attrs: { ...vNode.attrs },
      children: vNode.children ? vNode.children.map(child => this.#cloneVNode(child)) : []
    };
  }

  setRoutes(routes) {
    const router = () => {
      const path = window.location.hash.slice(2);
      if (routes[path]) {
        routes[path]();
        this.update();
      } else {
        console.log(`Route ${path} not found`);
      }
    };

    window.addEventListener("hashchange", router);
    this.router = router;
    this.router();
  }

  update() {
    console.log("Updating");

    let checked = document.querySelectorAll(".toggle");
    let checkedIds = [];
    checked.forEach((checkbox) => {
      if (checkbox.checked) {
        checkedIds.push(checkbox.id);
      }
    });

    // Set event register on newly created VNodes
    this.#setEventRegisterOnVNodes();

    const patch = diff(this.vAppOld, this.vApp);
    this.$app = patch(this.$app);
    this.vAppOld = this.#cloneVNode(this.vApp);

    checked = document.querySelectorAll(".toggle");
    checked.forEach((checkbox) => {
      if (checkedIds.includes(checkbox.id)) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    });
  }

  traverse(vNode, callback) {
    callback(vNode);
    if (vNode.children) {
      vNode.children.forEach((child) => this.traverse(child, callback));
    }
  }

  remove(vNodeToRemove) {
    this.traverse(this.vApp, (vCurr) => {
      if (!vCurr.children || vCurr.children.length === 0) {
        return;
      }
      for (let i = 0; i < vCurr.children.length; i++) {
        const child = vCurr.children[i];
        if (!child) {
          console.log("Undefined child", child);
          continue;
        }
        if (
          (typeof vNodeToRemove === "string" &&
            typeof child === "string" &&
            vNodeToRemove === child) ||
          (child.attrs &&
            vNodeToRemove.attrs &&
            child.attrs.id === vNodeToRemove.attrs.id)
        ) {
          vCurr.children = vCurr.children
            .slice(0, i)
            .concat(vCurr.children.slice(i + 1));
          break;
        }
      }
    });
  }

  getVNodeById(id) {
    let q = [this.vApp];
    while (q.length > 0) {
      let vNode = q.shift();
      if (typeof vNode === "string") {
        if (vNode === id) {
          return vNode;
        }
        continue;
      }
      if (vNode.attrs.id === id) {
        return vNode;
      }
      if (vNode.children) {
        q = q.concat(vNode.children);
      }
    }
    console.log("No vNode with id,", id, "found");
    return null;
  }
}
