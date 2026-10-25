/**
 * Multi-Level Category Tree Utility (Supports up to 5+ nested levels)
 */

export function buildCategoryTree(categories = [], maxDepth = 5) {
  if (!Array.isArray(categories)) return [];

  const itemMap = new Map();
  const roots = [];

  // 1. Create normalized nodes
  categories.forEach(cat => {
    if (!cat || !cat.id) return;
    itemMap.set(cat.id, {
      ...cat,
      children: [],
      depth: 1,
      path: [cat.id],
      namesAr: [cat.name_ar || ''],
      namesEn: [cat.name_en || '']
    });
  });

  // 2. Build parent-child relationships
  itemMap.forEach(node => {
    const parentId = node.parent_id && node.parent_id !== 'null' ? parseInt(node.parent_id) : null;
    if (parentId && itemMap.has(parentId) && parentId !== node.id) {
      const parentNode = itemMap.get(parentId);
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 3. Assign depths, paths, and sort children recursively
  function traverse(node, currentDepth, parentPath = [], parentNamesAr = [], parentNamesEn = []) {
    node.depth = Math.min(currentDepth, maxDepth);
    node.path = [...parentPath, node.id];
    node.namesAr = [...parentNamesAr, node.name_ar || ''];
    node.namesEn = [...parentNamesEn, node.name_en || ''];
    node.fullPathAr = node.namesAr.join(' > ');
    node.fullPathEn = node.namesEn.join(' > ');

    // Sort children by sort_order, then id
    node.children.sort((a, b) => {
      const orderA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999;
      const orderB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999;
      if (orderA !== orderB) return orderA - orderB;
      return Number(a.id) - Number(b.id);
    });

    node.children.forEach(child => {
      traverse(child, currentDepth + 1, node.path, node.namesAr, node.namesEn);
    });
  }

  // Sort roots by sort_order
  roots.sort((a, b) => {
    const orderA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999;
    const orderB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999;
    if (orderA !== orderB) return orderA - orderB;
    return Number(a.id) - Number(b.id);
  });

  roots.forEach(root => traverse(root, 1));

  return roots;
}

/**
 * Flattens tree nodes in visual depth-first order
 */
export function flattenCategoryTree(tree = []) {
  const result = [];
  function traverse(nodes, depth = 0) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      if (!node) return;
      // Ensure node is compatible with both direct access and destructuring: { category: c, depth }
      node.category = node;
      node.depth = depth;
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  }
  traverse(tree, 0);
  return result;
}

/**
 * Returns all descendant IDs for a category (inclusive of categoryId)
 */
export function getCategoryDescendantIds(categoryId, categories = []) {
  const targetId = parseInt(categoryId);
  if (isNaN(targetId)) return [];

  const descendantIds = new Set([targetId]);
  let currentParents = [targetId];

  for (let level = 0; level < 6; level++) {
    if (currentParents.length === 0) break;
    const nextParents = [];
    categories.forEach(cat => {
      const pid = cat.parent_id ? parseInt(cat.parent_id) : null;
      if (pid && currentParents.includes(pid) && !descendantIds.has(cat.id)) {
        descendantIds.add(cat.id);
        nextParents.push(cat.id);
      }
    });
    currentParents = nextParents;
  }

  return Array.from(descendantIds);
}

/**
 * Returns ancestors array from root to the category
 */
export function getCategoryAncestors(categoryId, categories = []) {
  const targetId = parseInt(categoryId);
  if (isNaN(targetId)) return [];

  const catMap = new Map(categories.map(c => [parseInt(c.id), c]));
  const ancestors = [];
  let curr = catMap.get(targetId);
  const visited = new Set();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    ancestors.unshift(curr);
    const pid = curr.parent_id ? parseInt(curr.parent_id) : null;
    curr = pid ? catMap.get(pid) : null;
  }

  return ancestors;
}

/**
 * Helper to get visual prefix according to depth
 */
export function getCategoryDepthPrefix(depth = 1, lang = 'ar') {
  if (depth <= 1) return '';
  const spaces = '　'.repeat(depth - 1);
  return `${spaces}└─ `;
}
