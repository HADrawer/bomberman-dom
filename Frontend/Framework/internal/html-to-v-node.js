export function HTMLToVNode(strings, ...values) {
  // Combine the strings and values to create the HTML string
  const htmlString = strings.reduce((result, string, i) => {
    return result + string + (values[i] || "");
  }, "");

  // Split the HTML string into tags and text nodes
  const parts = htmlString.split(/(<[^>]+>)/g).filter(Boolean);

  // Create a stack to keep track of the current parent node
  const stack = [];
  let rootNode = null;

  // Process each part
  for (let part of parts) {
    if (part.startsWith("<")) {
      // This part is a tag
      const isClosingTag = part.startsWith("</");
      const isSelfClosingTag = part.endsWith("/>");
      const tagName = part.match(/<\/?(\w+)/)[1];

      if (isClosingTag) {
        stack.pop();
      } else {
        // This part is an opening tag, so create a new node
        const node = { tagName, attrs: {}, children: [] };

        // Parse attributes
        const attrString = part.match(/<\w+([^>]*)>/)[1];
        const attrArray = attrString.match(
          /(\w+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g
        );
        if (attrArray) {
          for (let attr of attrArray) {
            const [name, value] = attr.split("=");
            node.attrs[name] = value.replace(/["']/g, "");
          }
        }

        if (stack.length > 0) {
          // If there's a parent node, add this node to its children
          const parentNode = stack[stack.length - 1];
          parentNode.children.push(node);
        } else {
          rootNode = node;
        }

        if (!isSelfClosingTag) {
          // Add this node to the stack
          stack.push(node);
        }
      }
    } else {
      // This part is a text node, so add it to the current node's children
      const parentNode = stack[stack.length - 1];
      if (parentNode) {
        parentNode.children.push(part.trim());
      }
    }
  }

  return rootNode;
}
