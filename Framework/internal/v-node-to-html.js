const VOID_TAGS = [
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

export function VNodeToHTML(vNode) {
  // Base case: if the vnode is a string, return it
  if (typeof vNode === "string") {
    return vNode;
  }

  // Create the opening tag with attributes
  let html = `<${vNode.tagName}`;
  for (let attr in vNode.attrs) {
    html += ` ${attr}="${vNode.attrs[attr]}"`;
  }

  // Check if the tag is a void tag
  if (VOID_TAGS.includes(vNode.tagName)) {
    html += "/>";
  } else {
    html += ">";

    // Add the children
    for (let child of vNode.children) {
      html += VNodeToHTML(child);
    }

    // Add the closing tag
    html += `</${vNode.tagName}>`;
  }

  return html;
}

//   // Usage:
//   const html = VNodeToHTML(vNode);
//   console.log(html);
