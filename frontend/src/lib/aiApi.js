/**
 * aiApi.js
 *
 * Thin wrapper for all AI-related API calls.
 * Keeps AI-specific request logic out of component files.
 *
 * The frontend never sends PR body content — only the URL.
 * All GitHub fetching happens on the backend.
 */

import api from "./api";

/**
 * Calls POST /api/ai/pr-summary.
 *
 * @param {object} params
 * @param {string}  params.prUrl         - GitHub PR URL
 * @param {boolean} params.includeIssues - whether to fetch linked issue context
 * @param {string}  params.provider      - "system" | "personal"
 * @param {string}  [params.userApiKey]  - required when provider="personal"
 *
 * @returns {Promise<{ summary: string, skills: string[], impact: string }>}
 * @throws  axios error with err.response.data.message for user-facing display
 */
export async function generatePRSummary({ prUrl, includeIssues, provider, userApiKey = "" }) {
  const res = await api.post("/api/ai/pr-summary", {
    prUrl,
    includeIssues,
    provider,
    userApiKey: provider === "personal" ? userApiKey : "",
  });
  return res.data;
}
