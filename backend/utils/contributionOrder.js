/**
 * contributionOrder
 *
 * Server-side ordering for contribution cards. There are THREE independent
 * ordering contexts, each backed by its own field on the Contribution
 * document so that reordering in one context can never move a card in
 * another:
 *
 *   collection           → collectionOrder           (user + collection)
 *   overallHighlight     → overallHighlightOrder     (user + overall highlights)
 *   collectionHighlight  → collectionHighlightOrder  (user + collection + highlights)
 *
 * Every order field is nullable. `null` / missing means "never manually
 * arranged" and falls back to the ordering the app used before manual
 * ordering existed (see ORDER_CONTEXTS[...].fallback), so legacy data keeps
 * rendering exactly as it always did.
 */
import Contribution from "../models/Contribution.js";

export const ORDER_CONTEXTS = Object.freeze({
  collection: { field: "collectionOrder", fallbackDirection: 1 }, // oldest → newest
  overallHighlight: { field: "overallHighlightOrder", fallbackDirection: -1 }, // newest → oldest
  collectionHighlight: { field: "collectionHighlightOrder", fallbackDirection: -1 }, // newest → oldest
});

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const MAX_IDS = 5000;

const hasOrder = (value) => typeof value === "number" && Number.isFinite(value);

const timeOf = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Sorts contributions for a context. Manually ordered cards come first
 * (ascending by their order value); anything without an order value follows
 * in the context's legacy default order. `_id` is the final tie-break so the
 * result is fully deterministic. Returns a new array.
 */
export function sortContributions(list, contextKey) {
  const { field, fallbackDirection } = ORDER_CONTEXTS[contextKey];

  return [...list].sort((a, b) => {
    const aHas = hasOrder(a[field]);
    const bHas = hasOrder(b[field]);

    if (aHas && bHas && a[field] !== b[field]) return a[field] - b[field];
    if (aHas !== bHas) return aHas ? -1 : 1;

    const dt = timeOf(a.createdAtGithub) - timeOf(b.createdAtGithub);
    if (dt !== 0) return dt * fallbackDirection;

    const aId = String(a._id);
    const bId = String(b._id);
    if (aId === bId) return 0;
    return (aId < bId ? -1 : 1) * fallbackDirection;
  });
}

/**
 * Order value a contribution should receive when it JOINS a list.
 *
 * - If nobody in the list has been manually arranged yet, returns `null`
 *   so the list keeps its legacy default ordering untouched.
 * - Otherwise returns (highest existing order + 1), i.e. "append to the
 *   end" — existing arranged cards never move.
 *
 * `filter` must describe the list's members (and may exclude the joining
 * document itself).
 */
export async function getNextOrder(filter, field) {
  const top = await Contribution.findOne({ ...filter, [field]: { $ne: null } })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  return top && hasOrder(top[field]) ? top[field] + 1 : null;
}

const fail = (status, message) => ({ ok: false, status, message });

/**
 * Persists a manual order for one context.
 *
 * `filter` is the authoritative definition of the list (always includes the
 * authenticated user, plus collection / highlight scope where relevant).
 * Every id in `orderedIds` must be a member of that list — anything else is
 * rejected, so a caller can never touch another user's, another
 * collection's, or another context's contributions.
 *
 * Members of the list that are missing from `orderedIds` (e.g. the client
 * was stale and a card was added elsewhere) are kept, appended after the
 * requested ones in their current relative order — nothing is dropped and
 * nothing is reset. Only the context's own field is written.
 */
export async function saveOrder({ filter, contextKey, orderedIds }) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return fail(400, "orderedIds array is required");
  if (orderedIds.length > MAX_IDS) return fail(400, "Too many ids");
  if (!orderedIds.every((id) => typeof id === "string" && OBJECT_ID_RE.test(id)))
    return fail(400, "orderedIds must contain valid contribution ids");

  const ids = orderedIds.map((id) => id.toLowerCase());
  if (new Set(ids).size !== ids.length) return fail(400, "orderedIds must not contain duplicates");

  const { field } = ORDER_CONTEXTS[contextKey];

  const docs = await Contribution.find(filter).select(`createdAtGithub ${field}`).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  if (!ids.every((id) => byId.has(id)))
    return fail(403, "Unauthorized: one or more contributions do not belong to this list");

  const requested = new Set(ids);
  const leftovers = sortContributions(
    docs.filter((d) => !requested.has(String(d._id))),
    contextKey
  ).map((d) => String(d._id));

  const ops = [];
  [...ids, ...leftovers].forEach((id, index) => {
    if (byId.get(id)[field] === index) return; // already there — skip the write
    ops.push({
      updateOne: {
        filter: { ...filter, _id: id },
        update: { $set: { [field]: index } },
      },
    });
  });

  // Reordering isn't a content edit — don't bump `updatedAt`.
  if (ops.length) await Contribution.bulkWrite(ops, { timestamps: false });

  return { ok: true };
}
