/**
 * Pure helpers for manually-ordered contribution lists.
 * (Server counterpart: backend/utils/contributionOrder.js)
 */

/** True once at least one card in the list has a stored manual position. */
export function isArranged(list, orderField) {
  return list.some((c) => typeof c[orderField] === "number");
}

/**
 * Where a newly created card lands — mirrors what the server persists, so
 * the list looks the same before and after a refresh:
 *  - manually arranged list → appended (nothing existing moves)
 *  - never-arranged list    → unchanged legacy behaviour (newest on top)
 */
export function addNewContributions(list, added, orderField) {
  return isArranged(list, orderField) ? [...list, ...added] : [...added, ...list];
}
