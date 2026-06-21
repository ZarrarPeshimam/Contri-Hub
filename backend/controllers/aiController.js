import { parseGitHubPR } from "../utils/github.js";
import { fetchPRDetail, fetchLinkedIssueBodies } from "../services/githubAIService.js";
import { generateSummary } from "../services/groqService.js";

export async function prSummary(req, res) {
  const { prUrl, includeIssues = false, provider = "system", userApiKey = "" } = req.body;

  /* ── Input validation ── */
  if (!prUrl || typeof prUrl !== "string") {
    return res.status(400).json({ message: "prUrl is required" });
  }

  const parsed = parseGitHubPR(prUrl.trim());
  if (!parsed) {
    return res
      .status(400)
      .json({ message: "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123" });
  }

  if (!["system", "personal"].includes(provider)) {
    return res.status(400).json({ message: "provider must be 'system' or 'personal'" });
  }

  if (provider === "personal" && !userApiKey.trim()) {
    return res.status(400).json({ message: "userApiKey is required when using personal provider" });
  }

  if (provider === "system" && !process.env.GROQ_API_KEY) {
    return res.status(503).json({
      message: "System API is not configured on this server. Use a personal API key instead.",
    });
  }

  /* ── GitHub fetch ── */
  let prDetail;
  try {
    prDetail = await fetchPRDetail(prUrl.trim());
  } catch (err) {
    return res.status(422).json({ message: err.message });
  }

  /* ── Linked issue fetch (optional, non-fatal) ── */
  let linkedIssues = [];
  try {
    linkedIssues = await fetchLinkedIssueBodies(
      prDetail.repo,
      prDetail.title,
      prDetail.body,
      Boolean(includeIssues)
    );
  } catch {
    // Issue fetching failures are non-fatal — we proceed without issue context
    linkedIssues = [];
  }

  /* ── AI generation ── */
  try {
    const result = await generateSummary({
      prTitle: prDetail.title,
      prBody: prDetail.body,
      linkedIssues,
      apiKey: provider === "personal" ? userApiKey.trim() : undefined,
    });

    return res.json(result);
  } catch (err) {
    // Distinguish invalid API key (400) from other errors (502)
    const isKeyError =
      err.message.includes("Invalid") || err.message.includes("API key");
    return res.status(isKeyError ? 400 : 502).json({ message: err.message });
  }
}
