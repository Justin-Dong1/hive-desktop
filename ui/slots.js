'use strict';
// Keep surviving items in their cells; reuse holes before growing the hive.
function updateSlots(previous, ids) {
  const live = new Set(ids);
  const next = previous.map(id => live.has(id) ? id : null);
  const assigned = new Set(next.filter(Boolean));
  for (const id of ids) {
    if (assigned.has(id)) continue;
    const hole = next.indexOf(null);
    if (hole < 0) next.push(id); else next[hole] = id;
    assigned.add(id);
  }
  while (next.length && next[next.length - 1] === null) next.pop();
  return next;
}
function hiveCapacity(lastSlot) {
  let occupiedRadius = 0;
  while (1 + 3 * occupiedRadius * (occupiedRadius + 1) < lastSlot) occupiedRadius++;
  const outerRadius = Math.max(2, occupiedRadius + 1);
  return 1 + 3 * outerRadius * (outerRadius + 1);
}
if (typeof module !== 'undefined') module.exports = { updateSlots, hiveCapacity };
