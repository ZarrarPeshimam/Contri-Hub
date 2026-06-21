import axios from "axios";
import { parseGitHubPR, extractIssueNumbers } from "../utils/github.js";

const githubHeaders = () => ({
  Accept: "application/vnd.github.v3+json",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
});

export async function fetchPRDetail(prUrl) {
  const parsed = parseGitHubPR(prUrl);
  if (!parsed) throw new Error("Invalid GitHub PR URL");

  const { repo, prNumber } = parsed;

  try {
    const res = await axios.get(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}`,
      { headers: githubHeaders() }
    );

    return {
      title: res.data.title || "",
      body: res.data.body || "",
      repo,
      prNumber,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(
        `PR not found: ${repo}#${prNumber}. Check the URL and make sure the repo is public.`
      );
    }
    if (err.response?.status === 403) {
      throw new Error("GitHub API rate limit reached. Try again later.");
    }
    throw new Error(`GitHub API error: ${err.response?.status ?? err.message}`);
  }
}

async function fetchIssueDetail(repo, issueNumber) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
      { headers: githubHeaders() }
    );

    const title = (res.data.title || "").trim();
    const body  = (res.data.body  || "").trim();

    // Only return if there's at least a title to work with
    if (!title && !body) return null;

    return { issueNumber, title, body };
  } catch {
    // Non-fatal: issue may be private, deleted, or a mis-parsed PR number
    return null;
  }
}

export async function fetchLinkedIssueBodies(repo, prTitle, prBody, includeIssues) {
  if (!includeIssues) return [];

  const issueNumbers = extractIssueNumbers(`${prTitle}\n${prBody}`);
  if (!issueNumbers.length) return [];

  const results = await Promise.all(
    issueNumbers.map((n) => fetchIssueDetail(repo, n))
  );

  // Filter out nulls (failed/empty fetches)
  return results.filter(Boolean);
}