/**
 * github.js — frontend mirror of backend parsing utilities.
 *
 * Kept intentionally minimal: only the functions the UI actually needs.
 * The backend is the source of truth for all DB writes; these are for
 * live preview during editing only (no API call required).
 */

/**
 * Extracts issue numbers from free text.
 * Mirrors the backend extractIssueNumbers() exactly so preview matches storage.
 *
 * Supported: closes/close/closed #N, fixes/fix/fixed #N,
 *            resolves/resolve/resolved #N, issue #N, #N (bare)
 */
export function extractIssueNumbers(text) {
  if (!text || typeof text !== "string") return [];

  const pattern =
    /(?:clos(?:es?|ed)|fix(?:es|ed)?|resolv(?:es?|ed)|issue)\s+#(\d+)|#(\d+)/gi;

  const numbers = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] ?? match[2];
    const n = Number(raw);
    if (n > 0) numbers.add(n);
  }
  return [...numbers];
}

/**
 * Builds the canonical GitHub issue URL.
 * @param {string} repo  - "owner/repo"
 * @param {number} n     - issue number
 */
export function buildIssueUrl(repo, n) {
  return `https://github.com/${repo}/issues/${n}`;
}

/**
 * Given a repo + text (title + description combined), returns
 * the linkedIssues array shape the backend stores.
 */
export function extractLinkedIssues(repo, text) {
  return extractIssueNumbers(text).map((n) => ({
    issueNumber: n,
    issueUrl: buildIssueUrl(repo, n),
    source: "auto",
  }));
}

/**
 * Strips markdown syntax for clean display inside PR cards.
 */
export function cleanMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+>]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
