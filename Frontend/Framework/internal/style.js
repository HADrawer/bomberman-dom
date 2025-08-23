export function addStyle(vNode, key, value) {
  if (typeof value === "number") {
    value = value + "px";
  }

  if (vNode.attrs.hasOwnProperty("style")) {
    const regex = new RegExp(`${key}:[^;]*;?`, "g");
    if (regex.test(vNode.attrs.style)) {
      vNode.attrs.style = vNode.attrs.style.replace(regex, `${key}:${value};`);
    } else {
      vNode.attrs.style += ` ${key}:${value};`;
      vNode.attrs.style = vNode.attrs.style.trim();
    }
  } else {
    vNode.attrs.style = `${key}:${value};`;
  }
}

export function removeStyle(vNode, key) {
  if (vNode.attrs.hasOwnProperty("style")) {
    const regex = new RegExp(`${key}:[^;]*;?`, "g");
    vNode.attrs.style = vNode.attrs.style.replace(regex, "").trim();
  }
  if (vNode.attrs.style === "") {
    delete vNode.attrs.style;
  }
}
