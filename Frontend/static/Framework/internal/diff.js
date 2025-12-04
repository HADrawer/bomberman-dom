import { render } from "./render.js";

export function diff(vOldNode, vNewNode) {
  if (vNewNode === undefined) {
    return ($node) => {
      $node.remove();
      return undefined;
    };
  }

  if (vOldNode === undefined) {
    return ($node) => {
      return undefined;
    };
  }

  if (typeof vOldNode === "string" || typeof vNewNode === "string") {
    if (vOldNode !== vNewNode) {
      return ($node) => {
        const $newNode = render(vNewNode);
        $node.replaceWith($newNode);
        return $newNode;
      };
    } else {
      return ($node) => undefined;
    }
  }

  if (vOldNode.tagName !== vNewNode.tagName) {
    return ($node) => {
      const $newNode = render(vNewNode);
      $node.replaceWith($newNode);
      return $newNode;
    };
  }

  const patchAttrs = diffAttrs(vOldNode.attrs, vNewNode.attrs);

  let patchChildren;
  if (vNewNode.attrs && vNewNode.attrs['data-ignore']) {
    patchChildren = ($node) => $node;
  } else {
    patchChildren = diffChildren(vOldNode.children, vNewNode.children);
  }

  return ($node) => {
    patchAttrs($node);
    patchChildren($node);
    return $node;
  };
}

function diffAttrs(oldAttrs, newAttrs) {
  const patches = [];

  for (const [k, v] of Object.entries(newAttrs)) {
    patches.push(($node) => {
      if ($node && $node.setAttribute) {
        $node.setAttribute(k, v);
      }
      return $node;
    });
  }

  for (const k in oldAttrs) {
    if (!(k in newAttrs)) {
      patches.push(($node) => {
        if ($node && $node.removeAttribute) {
          $node.removeAttribute(k);
        }
        return $node;
      });
    }
  }

  return ($node) => {
    if (!$node) return $node;
    for (const patch of patches) {
      patch($node);
    }
    return $node;
  };
}

function diffChildren(oldChildren, newChildren) {
  const childPatches = [];

  for (const [oldChild, newChild] of zip(oldChildren, newChildren)) {
    childPatches.push(diff(oldChild, newChild));
  }

  const additionalPatches = [];
  for (const additionalChild of newChildren.slice(oldChildren.length)) {
    additionalPatches.push(($node) => {
      $node.append(render(additionalChild));
      return $node;
    });
  }

  return ($parent) => {
    if (!$parent || !$parent.childNodes) return $parent;

    for (const [patch, child] of zip(childPatches, $parent.childNodes)) {
      if (!patch && child) {
        child.remove();
        continue;
      }
      if (patch && child) {
        patch(child);
      }
    }

    for (const patch of additionalPatches) {
      if ($parent) {
        patch($parent);
      }
    }

    return $parent;
  };
}

function zip(xs, ys) {
  const zipped = [];
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    zipped.push([xs[i], ys[i]]);
  }
  return zipped;
}
