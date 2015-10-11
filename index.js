/**
 * Module exports.
 */

module.exports = normalize;

/**
 * "Normalizes" the DOM Range instance, such that slight variations in the start
 * and end containers end up being normalized to the same "base" representation.
 * The aim is to always have `startContainer` and `endContainer` pointing to
 * TextNode instances.
 *
 * Pseudo-logic is as follows:
 *
 * - Expand the boundaries if they fall between siblings.
 * - Narrow the boundaries until they point at leaf nodes.
 * - Is the start container excluded by its offset?
 *   - Move it to the next leaf Node, but not past the end container.
 *   - Is the start container a leaf Node but not a TextNode?
 *     - Set the start boundary to be before the Node.
 * - Is the end container excluded by its offset?
 *   - Move it to the previous leaf Node, but not past the start container.
 *   - Is the end container a leaf Node but not a TextNode?
 *     - Set the end boundary to be after the Node.
 *
 * @param {Range} range - DOM Range instance to "normalize"
 * @return {Range} returns `range`, after being "normalized"
 */

function normalize (range) {
  var sc = range.startContainer;
  var so = range.startOffset;
  var ec = range.endContainer;
  var eo = range.endOffset;

  // Move the start container to the last leaf before any sibling boundary.
  if (sc.childNodes.length && so > 0) {
    sc = lastLeaf(sc.childNodes[so-1]);
    so = sc.length || 0;
  }

  // Move the end container to the first leaf after any sibling boundary.
  if (eo < ec.childNodes.length) {
    ec = firstLeaf(ec.childNodes[eo]);
    eo = 0;
  }

  // Move each container inward until it reaches a leaf Node.
  var start = firstLeaf(sc);
  var end = lastLeaf(ec);

  // Define a predicate to check if a Node is a leaf Node inside the Range.
  function isLeafNodeInRange (node) {
    if (node.childNodes.length) return false;
    var length = node.length || 0;
    if (node === sc && so === length) return false;
    if (node === ec && eo === 0) return false;
    return true;
  }

  // Move the start container until it is included or collapses to the end.
  while (start && !isLeafNodeInRange(start) && start !== end) {
    start = documentForward(start);
  }

  if (start === sc) {
    range.setStart(sc, so);
  } else if (start.nodeType === 3) {
    range.setStart(start, 0);
  } else {
    range.setStartBefore(start);
  }

  // Move the end container until it is included or collapses to the start.
  while (end && !isLeafNodeInRange(end) && end !== start) {
    end = documentReverse(end);
  }

  if (end === ec) {
    range.setEnd(ec, eo);
  } else if (end.nodeType === 3) {
    range.setEnd(end, end.length);
  } else {
    range.setEndAfter(end);
  }

  return range;
}


/**
 * Return the next Node in a document order traversal.
 * This order is equivalent to a classic pre-order.
 */
function documentForward (node) {
  if (node.firstChild) return node.firstChild;

  while (!node.nextSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.nextSibling;
}


/**
 * Return the next Node in a reverse document order traversal.
 * This order is equivalent to pre-order with the child order reversed.
 */
function documentReverse (node) {
  if (node.lastChild) return node.lastChild;

  while (!node.previousSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.previousSibling;
}


/* Find the first leaf node. */
function firstLeaf (node) {
  while (node.firstChild) node = node.firstChild;
  return node
}


/* Find the last leaf node. */
function lastLeaf (node) {
  while (node.lastChild) node = node.lastChild;
  return node;
}
