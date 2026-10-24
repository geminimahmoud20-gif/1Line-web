// Moves one item to another position, shifting the rest; returns a new array.
// Out-of-range moves return the list unchanged. Unit-tested in tests/unit/list-order.test.mjs.
export function moveItem(list = [], from, to) {
  const n = list.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= n || to >= n || from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
