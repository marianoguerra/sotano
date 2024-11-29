// based on https://github.com/jorgebucaran/superfine
const SSR_NODE = 1,
  TEXT_NODE = 3,
  EMPTY_OBJ = {},
  EMPTY_ARR = [],
  SVG_NS = "http://www.w3.org/2000/svg";

function getKey(vdom) {
  return vdom?.key;
}

function patchProperty(node, key, _oldValue, newValue, isSvg) {
  if (key === "key") {
    // do nothing
  } else if (!isSvg && key !== "list" && key !== "form" && key in node) {
    node[key] = newValue ?? "";
  } else if (newValue == null || newValue === false) {
    node.removeAttribute(key);
  } else {
    node.setAttribute(key, newValue);
  }
}

function createNode(vdom, isSvg0) {
  const { props, type, tag, children } = vdom,
    isSvg = isSvg0 || tag === "svg",
    node =
      type === TEXT_NODE
        ? document.createTextNode(tag)
        : isSvg
          ? document.createElementNS(SVG_NS, tag, { is: props.is })
          : document.createElement(tag, { is: props.is });

  for (const k in props) {
    patchProperty(node, k, null, props[k], isSvg);
  }

  for (let i = 0; i < children.length; i += 1) {
    const child = vdomify(children[i]);
    children[i] = child;
    node.appendChild(createNode(child, isSvg));
  }

  vdom.node = node;
  return node;
}

function _patchProps(node, isSvg, oldProps, newProps, props) {
  for (let k in props) {
    const curProp =
      k === "value" || k === "selected" || k === "checked"
        ? node[k]
        : oldProps[k];
    if (curProp !== newProps[k]) {
      patchProperty(node, k, oldProps[k], newProps[k], isSvg);
    }
  }
}

function _patchNodeInLoop(oldVKids, newVKids, node, isSvg, oldI, newI) {
  const oldVKid = oldVKids[oldI],
    oldKey = getKey(oldVKid),
    newVKid = newVKids[newI];

  if (oldKey == null || oldKey !== getKey(newVKid)) {
    return true;
  }

  const newVKidVDom = vdomify(newVKid);
  patchNode(node, oldVKid.node, oldVKid, newVKidVDom, isSvg);

  newVKids[newI] = newVKidVDom;
  return false;
}

function _patchNodeElse(node, oldVNode, newVNode, isSvg0) {
  const isSvg = isSvg0 || newVNode.tag === "svg",
    oldProps = oldVNode.props,
    newProps = newVNode.props,
    oldVKids = oldVNode.children,
    newVKids = newVNode.children;

  let oldHead = 0,
    newHead = 0,
    oldTail = oldVKids.length - 1,
    newTail = newVKids.length - 1;

  _patchProps(node, isSvg, oldProps, newProps, oldProps);
  _patchProps(node, isSvg, oldProps, newProps, newProps);

  while (newHead <= newTail && oldHead <= oldTail) {
    if (_patchNodeInLoop(oldVKids, newVKids, node, isSvg, oldHead, newHead)) {
      break;
    }
    oldHead += 1;
    newHead += 1;
  }

  while (newHead <= newTail && oldHead <= oldTail) {
    if (_patchNodeInLoop(oldVKids, newVKids, node, isSvg, oldTail, newTail)) {
      break;
    }
    oldTail -= 1;
    newTail -= 1;
  }

  if (oldHead > oldTail) {
    while (newHead <= newTail) {
      const newVKidVDom = vdomify(newVKids[newHead]);
      newVKids[newHead] = newVKidVDom;
      node.insertBefore(
        createNode(newVKidVDom, isSvg),
        oldVKids[oldHead]?.node,
      );
      newHead += 1;
    }
  } else if (newHead > newTail) {
    while (oldHead <= oldTail) {
      node.removeChild(oldVKids[oldHead].node);
      oldHead += 1;
    }
  } else {
    const newKeyed = {},
      keyed = {};
    for (let i = oldHead; i <= oldTail; i += 1) {
      const oldKey = oldVKids[i].key;
      if (oldKey != null) {
        keyed[oldKey] = oldVKids[i];
      }
    }

    while (newHead <= newTail) {
      const oldVKid = oldVKids[oldHead],
        oldKey = getKey(oldVKid),
        newVKid = newVKids[newHead],
        newVKidVDom = vdomify(newVKid),
        newKey = getKey(newVKidVDom);

      newVKids[newHead] = newVKidVDom;

      if (
        newKeyed[oldKey] ||
        (newKey != null && newKey === getKey(oldVKids[oldHead + 1]))
      ) {
        if (oldKey == null) {
          node.removeChild(oldVKid.node);
        }
        oldHead += 1;
        continue;
      }

      if (newKey == null || oldVNode.type === SSR_NODE) {
        if (oldKey == null) {
          patchNode(node, oldVKid?.node, oldVKid, newVKid, isSvg);
          newHead += 1;
        }
        oldHead += 1;
      } else if (oldKey === newKey) {
        patchNode(node, oldVKid.node, oldVKid, newVKid, isSvg);
        newKeyed[newKey] = true;
        oldHead += 1;
        newHead += 1;
      } else {
        const tmpVKid = keyed[newKey];
        if (tmpVKid != null) {
          patchNode(
            node,
            node.insertBefore(tmpVKid.node, oldVKid?.node),
            tmpVKid,
            newVKid,
            isSvg,
          );
          newKeyed[newKey] = true;
        } else {
          patchNode(node, oldVKid?.node, null, newVKid, isSvg);
        }

        newHead += 1;
      }
    }

    while (oldHead <= oldTail) {
      const oldVKid = oldVKids[oldHead];
      oldHead += 1;
      if (getKey(oldVKid) == null) {
        node.removeChild(oldVKid.node);
      }
    }

    for (const k in keyed) {
      if (newKeyed[k] == null) {
        node.removeChild(keyed[k].node);
      }
    }
  }
}

function patchNode(parent, node, oldVNode, newVNode, isSvg) {
  if (oldVNode === newVNode) {
    // do nothing
  } else if (
    oldVNode != null &&
    oldVNode.type === TEXT_NODE &&
    newVNode.type === TEXT_NODE
  ) {
    if (oldVNode.tag !== newVNode.tag) {
      node.nodeValue = newVNode.tag;
    }
  } else if (oldVNode == null || oldVNode.tag !== newVNode.tag) {
    const newVNodeVDom = vdomify(newVNode);
    node = parent.insertBefore(createNode(newVNodeVDom, isSvg), node);
    newVNode = newVNodeVDom;
    if (oldVNode != null) {
      parent.removeChild(oldVNode.node);
    }
  } else {
    _patchNodeElse(node, oldVNode, newVNode, isSvg);
  }

  newVNode.node = node;
  return node;
}

function vdomify(newVNode) {
  return newVNode !== true && newVNode !== false && newVNode
    ? newVNode
    : text("");
}

function recycleNode(node) {
  return node.nodeType === TEXT_NODE
    ? text(node.nodeValue, node)
    : createVNode(
        node.nodeName.toLowerCase(),
        EMPTY_OBJ,
        EMPTY_ARR.map.call(node.childNodes, recycleNode),
        SSR_NODE,
        node,
      );
}

function createVNode(tag, props, children, type, node) {
  return {
    tag,
    props,
    key: props.key,
    children,
    type,
    node,
  };
}

export function text(value, node) {
  return createVNode(value, EMPTY_OBJ, EMPTY_ARR, TEXT_NODE, node);
}

export function h(tag, props, children = EMPTY_ARR) {
  return createVNode(
    tag,
    props,
    Array.isArray(children) ? children : [children],
  );
}

export function patch(node, vdom) {
  const newNode = patchNode(
    node.parentNode,
    node,
    node.vdom || recycleNode(node),
    vdom,
  );
  newNode.vdom = vdom;
  return newNode;
}
