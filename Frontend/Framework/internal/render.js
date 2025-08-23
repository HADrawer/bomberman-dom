export function render(vNode) {
  if (typeof vNode === "string") {
    return document.createTextNode(vNode);
  }
  return renderElement(vNode);
}

function renderElement(vNode) {
  const { tagName, attrs, children } = vNode;
  const $node = document.createElement(tagName);

  for (const [k, v] of Object.entries(attrs)) {
    if (!k.startsWith("on")) {
      $node.setAttribute(k, v);
    }
  }

  for (const child of children) {
    $node.append(render(child));
  }

  return $node;
}
