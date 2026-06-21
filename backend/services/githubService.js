import axios from "axios";
import { extractLinkedIssues } from "../utils/github.js";

/**
 * Headers built as a function so process.env is read at call time,
 * not at module load time (which is before dotenv has populated env).
 * The previous static object caused GITHUB_TOKEN to always be undefined.
 */
const githubHeaders = () => ({
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
});

/**
 * Fetches PRs from GitHub matching the given labels authored by the user.
 *
 * Returns a normalized array where each item already has linkedIssues
 * populated — no second pass needed in the route handler.
 *
 * @param {string}   githubUsername
 * @param {string[]} tags  - GitHub label names to search for
 * @returns {Promise<NormalizedPR[]>}
 */
export const fetchGitHubPRs = async (githubUsername, tags) => {
  const labelQuery = tags.map((t) => `label:"${t.trim()}"`).join(" OR ");
  const searchQuery = `author:${githubUsername}+is:pr+(${labelQuery})`;

  const githubRes = await axios.get(
    `https://api.github.com/search/issues?q=${searchQuery}&advanced_search=true`,
    { headers: githubHeaders() }
  );

  return githubRes.data.items.map((pr) => normalizePR(pr));
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
    title,
    url: pr.html_url,
    description: body,
    state: pr.state,
    labels: pr.labels.map((l) => l.name),
    repo,
    createdAt: pr.created_at,
    mergedAt: pr.pull_request?.merged_at ?? null,
    linkedIssues: extractLinkedIssues(repo, title, body),
  };
}