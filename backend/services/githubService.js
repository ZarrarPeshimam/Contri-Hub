import axios from "axios";
import { extractLinkedIssues } from "../utils/github.js";

const GITHUB_SEARCH_URL = "https://api.github.com/search/issues";
const PER_PAGE = 100;
const MAX_RESULTS = 1000; // hard cap the GitHub Search API enforces regardless of pagination

/**
 * Headers built as a function so process.env is read at call time,
 * not at module load time (which is before dotenv has populated env).
 * The previous static object caused GITHUB_TOKEN to always be undefined.
 *
 * NOTE: never log the return value of this function — it contains the
 * live GITHUB_TOKEN in the Authorization header.
 */
const githubHeaders = () => ({
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
});

/**
 * Builds the `label:` qualifier for one or more labels.
 *
 * GitHub's search grammar supports ANY-of-these-labels matching natively
 * via a comma-separated list of quoted values on a SINGLE `label:`
 * qualifier — e.g. label:"a","b","c" — see:
 * https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests
 * ("To filter issues using logical OR, use the comma syntax: label:"bug","wip"")
 *
 * This is the documented, stable mechanism for label OR-matching and:
 *   - works on the standard REST API with NO extra flags
 *   - does NOT require advanced_search=true
 *   - does NOT need `(label:"a" OR label:"b")` grouping, which is only
 *     parsed correctly when advanced_search=true is set, and which in
 *     practice produced `422 The search query contains invalid syntax`
 *     for this app's exact query shape.
 *   - collapses naturally to a single request for a single tag too
 *     (`label:"a"`), so there's no special-casing needed for the
 *     "only one tag supplied" case.
 *
 * Double quotes inside a label value are escaped defensively (GitHub
 * label names can't normally contain them, but this keeps a malformed
 * value from ever breaking the query grammar). A literal apostrophe,
 * e.g. gssoc'25, needs no escaping at all inside a double-quoted value.
 */
function buildLabelClause(tags) {
  const values = tags
    .map((t) => `"${String(t).trim().replace(/"/g, '\\"')}"`)
    .join(",");
  return `label:${values}`;
}

/**
 * Builds the full search query for "closed PRs authored by this user
 * that have ANY of the given labels".
 */
function buildSearchQuery(githubUsername, tags) {
  return [
    `author:${githubUsername}`,
    "is:pr",
    "state:closed",
    "archived:false",
    buildLabelClause(tags),
  ].join(" ");
}

/**
 * Fetches PRs from GitHub matching ANY of the given labels, authored
 * by the given user. This is always a SINGLE logical search (one query,
 * possibly paginated) — not one request per label — because the
 * comma-OR label syntax lets GitHub do the OR-matching server-side.
 *
 * Paginates internally (100 per page) up to GitHub's 1000-result search
 * cap so callers get every matching PR, not just the first page.
 *
 * Returns a normalized, de-duplicated array where each item already has
 * linkedIssues populated — no second pass needed in the route handler.
 *
 * @param {string}   githubUsername
 * @param {string[]} tags  - GitHub label names to search for (ANY match)
 * @returns {Promise<NormalizedPR[]>}
 */
export const fetchGitHubPRs = async (githubUsername, tags) => {
  const cleanTags = (tags || []).map((t) => String(t).trim()).filter(Boolean);
  if (cleanTags.length === 0) return [];

  const q = buildSearchQuery(githubUsername, cleanTags);

  console.log("[fetchGitHubPRs] username:", githubUsername);
  console.log("[fetchGitHubPRs] tags:", cleanTags);
  console.log("[fetchGitHubPRs] query:", q);

  const items = [];
  let page = 1;

  while (items.length < MAX_RESULTS) {
    let res;
    try {
      res = await axios.get(GITHUB_SEARCH_URL, {
        params: { q, per_page: PER_PAGE, page },
        headers: githubHeaders(),
      });
    } catch (err) {
      console.error("[fetchGitHubPRs] GitHub API request failed");
      console.error("[fetchGitHubPRs] status:", err.response?.status);
      console.error("[fetchGitHubPRs] github message:", err.response?.data?.message);
      console.error("[fetchGitHubPRs] github errors:", err.response?.data?.errors);
      throw err;
    }

    const { data, status } = res;
    console.log(
      `[fetchGitHubPRs] page ${page} -> status ${status}, total_count ${data.total_count}, ` +
      `items ${data.items.length}, incomplete_results ${data.incomplete_results}`
    );

    items.push(...data.items);

    const gotEverything =
      items.length >= data.total_count || data.items.length < PER_PAGE;
    if (gotEverything) break;

    page += 1;
  }

  // Defensive de-dupe by GitHub's own item id. The comma-OR query can't
  // itself return the same PR twice, but this guards against any future
  // change back to per-label requests (which WOULD produce duplicates
  // for PRs carrying more than one of the searched labels).
  const seen = new Set();
  const unique = items.filter((pr) => {
    if (seen.has(pr.id)) return false;
    seen.add(pr.id);
    return true;
  });

  console.log(`[fetchGitHubPRs] unique PRs fetched: ${unique.length}`);

  return unique.map((pr) => normalizePR(pr));
};

/**
 * Normalizes a raw GitHub API PR item into the shape our DB expects.
 * Issue extraction happens here — single source of truth.
 *
 * @param {object} pr - Raw item from GitHub search/issues API
 * @returns {NormalizedPR}
 */
export function normalizePR(pr) {
  const repo = pr.repository_url.split("/").slice(-2).join("/");
  const body = pr.body || "";
  const title = pr.title || "";

  return {
    githubId: pr.id,
    title,
    url: pr.html_url,
    description: body,
    state: pr.state, // "open" | "closed" (issue-level state, from GitHub)
    labels: pr.labels.map((l) => l.name),
    repo,
    createdAt: pr.created_at,
    mergedAt: pr.pull_request?.merged_at ?? null,
    linkedIssues: extractLinkedIssues(repo, title, body),
  };
}