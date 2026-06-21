/**
 * github.js — shared GitHub parsing utilities
 *
 * All GitHub URL parsing and issue-reference extraction lives here.
 * Nothing else in the codebase should duplicate this logic.
 * Both the service layer and route handlers import from this file.
 */

/**
 * Parses a GitHub PR URL.
 * Returns { repo: "owner/repo", prNumber: 123 } or null on failure.
 */
export function parseGitHubPR(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;

    const parts = u.pathname.split("/").filter(Boolean);
    // Expected shape: owner / repo / pull / 123
    if (parts.length < 4 || parts[2] !== "pull") return null;

    const prNumber = Number(parts[3]);
    if (!Number.isInteger(prNumber) || prNumber <= 0) return null;

    return {
      repo: `${parts[0]}/${parts[1]}`,
      prNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts issue numbers referenced in a PR title or body.
 *
 * Supported patterns (case-insensitive):
 *   closes #50        close #50         closed #50
 *   fixes #50         fix #50           fixed #50
 *   resolves #50      resolve #50       resolved #50
 *   #50               issue #50
 *   Multiple refs in one string: "Fixes #12 and closes #13"
 *
 * Returns a deduplicated array of integer issue numbers, e.g. [12, 13].
 * Returns [] if nothing is found.
 */
export function extractIssueNumbers(text) {
  if (!text || typeof text !== "string") return [];

  // Matches the keywords AND bare #NNN references
  const pattern =
    /(?:clos(?:es?|ed)|fix(?:es|ed)?|resolv(?:es?|ed)|issue)\s+#(\d+)|#(\d+)/gi;

  const numbers = new Set();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Group 1 = keyword-prefixed number, group 2 = bare #NNN
    const raw = match[1] ?? match[2];
    const n = Number(raw);
    if (n > 0) numbers.add(n);
  }

  return [...numbers];
}

/**
 * Builds the canonical GitHub issue URL for a given repo + issue number.
 *
 * @param {string} repo   - "owner/repo"
 * @param {number} issueNumber
 * @returns {string}      - "https://github.com/owner/repo/issues/50"
 */
export function buildIssueUrl(repo, issueNumber) {
  return `https://github.com/${repo}/issues/${issueNumber}`;
}

/**
 * Given a PR's repo, title, and body, returns a ready-to-store
 * linkedIssues array.
 *
 * Each element: { issueNumber: number, issueUrl: string }
 *
 * Deduplication is applied so the same issue referenced in both
 * title and body appears only once.
 */
export function extractLinkedIssues(repo, title = "", body = "") {
  const combined = `${title}\n${body}`;
  const numbers = extractIssueNumbers(combined);

  return numbers.map((n) => ({
    issueNumber: n,
    issueUrl: buildIssueUrl(repo, n),
  }));
}
