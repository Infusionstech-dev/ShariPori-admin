const withoutNode = (nodes, id) =>
  nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: withoutNode(node.children, id) }));

const insertInto = (nodes, parentId, place, node) => {
  if (parentId === null) {
    return place(nodes, node);
  }
  return nodes.map((item) => ({
    ...item,
    children:
      item.id === parentId
        ? place(item.children, node)
        : insertInto(item.children, parentId, place, node),
  }));
};

export const findNode = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
};

const contains = (node, id) =>
  node.id === id || node.children.some((child) => contains(child, id));

const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.children)]);

export const allIds = (nodes) => flatten(nodes).map((node) => node.id);

// Renumbers every list so sort order matches what the admin sees.
const renumber = (nodes, parentId = null) =>
  nodes.map((node, index) => ({
    ...node,
    parentId,
    sortOrder: index + 1,
    children: renumber(node.children, node.id),
  }));

// position: 'inside' makes it the target's first child; 'before' and 'after' make it a sibling.
// Returns null when the move is impossible, such as into its own descendant.
export const moveCategory = (tree, dragId, targetId, position) => {
  const dragged = findNode(tree, dragId);
  const target = findNode(tree, targetId);
  if (!dragged || !target || dragId === targetId || contains(dragged, targetId)) {
    return null;
  }

  const remaining = withoutNode(tree, dragId);
  let moved;
  if (position === 'inside') {
    moved = insertInto(remaining, targetId, (list, node) => [node, ...list], dragged);
  } else {
    const placeNextToTarget = (list, node) => {
      const index = list.findIndex((item) => item.id === targetId);
      const at = position === 'before' ? index : index + 1;
      return [...list.slice(0, at), node, ...list.slice(at)];
    };
    moved = insertInto(remaining, target.parentId, placeNextToTarget, dragged);
  }

  const nextTree = renumber(moved);
  const before = new Map(flatten(tree).map((node) => [node.id, node]));
  const items = flatten(nextTree)
    .filter(
      (node) =>
        before.get(node.id).parentId !== node.parentId ||
        before.get(node.id).sortOrder !== node.sortOrder
    )
    .map(({ id, parentId, sortOrder }) => ({ id, parentId, sortOrder }));

  return { nextTree, items };
};

// Options for the parent picker. A category and its descendants cannot be its own parent.
export const toParentOptions = (nodes, excludedId) =>
  nodes
    .filter((node) => node.id !== excludedId)
    .map((node) => ({
      value: node.id,
      title: node.nameEn,
      children: toParentOptions(node.children, excludedId),
    }));
