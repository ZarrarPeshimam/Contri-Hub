import express from "express";
import Collection from "../models/Collection.js";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import auth from "../middleware/auth.js";
import {
  parseGitHubPR,
  extractLinkedIssues,
  buildIssueUrl,
} from "../utils/github.js";
import { fetchGitHubPRs } from "../services/githubService.js";
import { fetchPRDetail, fetchLinkedIssueBodies } from "../services/githubAIService.js";
import { generateSummary } from "../services/groqService.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   HELPER
   Resolves the active description from the two
   stored fields. Used in every write path.
───────────────────────────────────────────── */
function resolveDescription(original, ai) {
  return ai || original || "";
}

/* ─────────────────────────────────────────────
   HELPER
   Given an array of Collection documents, fetches
   the real contribution count for each collection
   from the Contribution collection in a single
   aggregation (no N+1), then returns plain objects
   with contributionsCount overwritten by the live value.

   Strategy: $group on collectionId to produce a
   { _id, count } map, then merge into each collection.
   Collections with zero contributions won't appear in
   the aggregation result — they get count 0 via the
   Map default.
───────────────────────────────────────────── */
async function withLiveCounts(collections) {
  if (!collections.length) return [];

  const ids = collections.map((c) => c._id);

  const counts = await Contribution.aggregate([
    { $match: { collectionId: { $in: ids } } },
    { $group: { _id: "$collectionId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((r) => [r._id.toString(), r.count]));

  return collections.map((col) => {
    const doc = col.toObject ? col.toObject() : { ...col };
    const actualCount = countMap.get(doc._id.toString()) ?? 0;

    // Debug log — remove once verified in production
    console.log({
      collection: doc.title,
      storedCount: doc.contributionsCount,
      actualCount,
    });

    doc.contributionsCount = actualCount;
    return doc;
  });
}

/* =========================
   CREATE COLLECTION
   POST /api/collections
========================= */
router.post("/", auth, async (req, res) => {
  try {
    const { title, year, description } = req.body;
    if (!title || !year)
      return res.status(400).json({ message: "Title and year required" });

    const slug = `${title}-${year}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const collection = await Collection.create({
      title, year, description, slug,
      contributionsCount: 0,
      user: req.userId,
    });

    res.status(201).json(collection);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Collection already exists for this year" });
    console.error("Create collection error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET MY COLLECTIONS
   GET /api/collections/me
========================= */
router.get("/me", auth, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.userId }).sort({ order: 1, createdAt: -1 });
    const result = await withLiveCounts(collections);
    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch collections" });
  }
});

/* =========================
   GET / UPDATE USER SETTINGS
   GET  /api/collections/settings
   PUT  /api/collections/settings
   (declared before /:slug routes to avoid "settings" being matched as a slug)
========================= */
router.get("/settings", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("settings");
    res.json(user.settings ?? {});
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.put("/settings", auth, async (req, res) => {
  try {
    const { autoDetectIssues, autoRefreshMetadata, autoAISummary } = req.body;
    const update = {};

    if (typeof autoDetectIssues    === "boolean") update["settings.autoDetectIssues"]    = autoDetectIssues;
    if (typeof autoRefreshMetadata  === "boolean") update["settings.autoRefreshMetadata"]  = autoRefreshMetadata;
    if (typeof autoAISummary        === "boolean") update["settings.autoAISummary"]        = autoAISummary;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, select: "settings" }
    );

    res.json(user.settings);
  } catch {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

/* =========================
   REORDER COLLECTIONS
   PUT /api/collections/reorder
   Body: [{ id: "...", order: 0 }, ...]
   Auth: owner only — server verifies each collection belongs to req.userId
========================= */
router.put("/reorder", auth, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0)
      return res.status(400).json({ message: "orderedIds array is required" });

    const collections = await Collection.find({
      _id: { $in: orderedIds },
      user: req.userId,
    }).select("_id");

    const ownedIds = new Set(collections.map((c) => c._id.toString()));
    const allOwned = orderedIds.every((id) => ownedIds.has(id));
    if (!allOwned)
      return res.status(403).json({ message: "Unauthorized: one or more collections do not belong to you" });

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, user: req.userId },
        update: { $set: { order: index } },
      },
    }));

    await Collection.bulkWrite(bulkOps);
    res.json({ message: "Order saved" });
  } catch (err) {
    console.error("Reorder error:", err);
    res.status(500).json({ message: "Failed to save order" });
  }
});

/* =========================
   ADD CONTRIBUTION
   POST /api/collections/:slug/contributions
========================= */
router.post("/:slug/contributions", auth, async (req, res) => {
  try {
    const { title, description, url } = req.body;

    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const parsed = parseGitHubPR(url);
    if (!parsed) return res.status(400).json({ message: "Invalid GitHub PR URL" });

    const dbUser = await User.findById(req.userId).select("settings");
    const shouldDetect = dbUser?.settings?.autoDetectIssues !== false;

    const linkedIssues = shouldDetect
      ? extractLinkedIssues(parsed.repo, title, description || "")
      : [];

    const originalDescription = description || "";

    const contribution = await Contribution.create({
      title,
      originalDescription,
      aiDescription: null,
      description: originalDescription,
      url,
      repo: parsed.repo,
      prNumber: parsed.prNumber,
      status: "merged",
      createdAtGithub: new Date(),
      user: req.userId,
      collectionId: collection._id,
      linkedIssues,
      lastSyncedAt: shouldDetect ? new Date() : null,
    });

    res.status(201).json(contribution);
  } catch (err) {
    console.error("Add contribution error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET MY COLLECTION CONTRIBUTIONS
   GET /api/collections/me/:slug/contributions
========================= */
router.get("/me/:slug/contributions", auth, async (req, res) => {
  try {
    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const contributions = await Contribution.find({ collectionId: collection._id })
      .sort({ createdAtGithub: 1 });

    res.json({ collection, contributions });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   FETCH GITHUB PRS (preview only — no DB write)
   POST /api/collections/:slug/fetch-github-prs
========================= */
router.post("/:slug/fetch-github-prs", auth, async (req, res) => {
  const { tags } = req.body;

  if (!tags || !Array.isArray(tags) || tags.length === 0)
    return res.status(400).json({ message: "At least one tag is required" });

  const dbUser = await User.findById(req.userId);
  if (!dbUser?.githubUsername)
    return res.status(400).json({ message: "GitHub username not set" });

  try {
    const prs = await fetchGitHubPRs(dbUser.githubUsername, tags);
    return res.json({ fetchedCount: prs.length, prs });
  } catch (err) {
    console.error("GitHub fetch error:", err.message);
    return res.status(500).json({ message: "GitHub fetch failed" });
  }
});

/* =========================
   ADD FROM GITHUB (writes to DB)
   POST /api/collections/:slug/add-from-github

   Auto AI pipeline (when autoAISummary=true):
     1. Fetch linked issue bodies in parallel (non-blocking)
     2. Call generateSummary() with PR + issue context
     3. On ANY failure: log + fall back to originalDescription
     4. Contribution is ALWAYS created regardless of AI outcome
========================= */
router.post("/:slug/add-from-github", auth, async (req, res) => {
  const { tags, prs } = req.body;

  const dbUser = await User.findById(req.userId);
  if (!dbUser?.githubUsername)
    return res.status(400).json({ message: "GitHub username not set" });

  const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
  if (!collection) return res.status(404).json({ message: "Collection not found" });

  let finalPRs = [];

  try {
    if (prs && prs.length > 0) {
      finalPRs = prs;
    } else if (tags && tags.length > 0) {
      finalPRs = await fetchGitHubPRs(dbUser.githubUsername, tags);
    } else {
      return res.status(400).json({ message: "Provide either prs or tags" });
    }

    const shouldDetect = dbUser?.settings?.autoDetectIssues !== false;
    const shouldAI     = dbUser?.settings?.autoAISummary     === true;
    const created = [];

    for (const pr of finalPRs) {
      try {
        const parsed = parseGitHubPR(pr.url);
        if (!parsed) continue;

        const linkedIssues = shouldDetect
          ? (pr.linkedIssues?.length
              ? pr.linkedIssues
              : extractLinkedIssues(parsed.repo, pr.title, pr.description || ""))
          : [];

        const originalDescription = pr.description || "";
        let aiDescription = null;

        if (shouldAI) {
          try {
            const linkedIssueBodies = await fetchLinkedIssueBodies(
              parsed.repo, pr.title, originalDescription, true
            );
            const aiResult = await generateSummary({
              prTitle: pr.title,
              prBody:  originalDescription,
              linkedIssues: linkedIssueBodies,
            });
            aiDescription = aiResult.summary;
          } catch (aiErr) {
            console.error(`[AutoAI] Failed for PR ${pr.url}:`, aiErr.message);
          }
        }

        const newContribution = await Contribution.create({
          title: pr.title,
          originalDescription,
          aiDescription,
          description: resolveDescription(originalDescription, aiDescription),
          url: pr.url,
          repo: parsed.repo,
          prNumber: parsed.prNumber,
          status: pr.mergedAt ? "merged" : "open",
          createdAtGithub: pr.createdAt,
          mergedAtGithub:  pr.mergedAt || undefined,
          user: req.userId,
          collectionId: collection._id,
          linkedIssues,
          lastSyncedAt: shouldDetect ? new Date() : null,
        });

        created.push(newContribution);
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
    }

    res.status(201).json({ added: created.length, contributions: created });
  } catch (err) {
    console.error("Add PRs error:", err.message);
    res.status(500).json({ message: "Failed to add PRs" });
  }
});

/* =========================
   EDIT CONTRIBUTION
   PUT /api/collections/:slug/contributions/:contributionId/edit

   Manual edits write to `description` only.
   originalDescription and aiDescription are never touched here.
========================= */
router.put("/:slug/contributions/:contributionId/edit", auth, async (req, res) => {
  const { title, description, url, linkedIssues } = req.body;

  try {
    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const updateData = {};
    if (title       !== undefined) updateData.title       = title;
    if (description !== undefined) updateData.description = description;
    if (url         !== undefined) updateData.url         = url;

    if (Array.isArray(linkedIssues)) {
      updateData.linkedIssues = linkedIssues.map((issue) => ({
        issueNumber: Number(issue.issueNumber),
        issueUrl: issue.issueUrl || buildIssueUrl(issue.repo || "", issue.issueNumber),
        source: "manual",
      }));
    }

    const contribution = await Contribution.findOneAndUpdate(
      { _id: req.params.contributionId, user: req.userId, collectionId: collection._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!contribution)
      return res.status(404).json({ message: "Contribution not found or unauthorized" });

    res.json({ message: "Contribution updated successfully", contribution });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update contribution" });
  }
});

/* =========================
   DELETE CONTRIBUTION
   DELETE /api/collections/:slug/contributions/:contributionId/delete
========================= */
router.delete("/:slug/contributions/:contributionId/delete", auth, async (req, res) => {
  try {
    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const contribution = await Contribution.findOneAndDelete({
      _id: req.params.contributionId,
      user: req.userId,
      collectionId: collection._id,
    });

    if (!contribution)
      return res.status(404).json({ message: "Contribution not found or unauthorized" });

    res.json({ message: "Contribution deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete contribution" });
  }
});

router.post("/:slug/contributions/:contributionId/sync-issues", auth, async (req, res) => {
  try {
    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const contrib = await Contribution.findOne({
      _id: req.params.contributionId,
      user: req.userId,
      collectionId: collection._id,
    });

    if (!contrib)
      return res.status(404).json({ message: "Contribution not found or unauthorized" });

    // Always try GitHub first — it is the canonical source
    let scanTitle = contrib.title;
    let scanBody  = contrib.originalDescription || contrib.description || "";

    try {
      const prDetail = await fetchPRDetail(contrib.url);
      scanTitle = prDetail.title;
      scanBody  = prDetail.body;
    } catch (ghErr) {
      // Non-fatal: fall back to stored text so the sync still does something useful
      console.warn(
        `[SyncIssues] GitHub fetch failed for ${contrib.url}, scanning stored text instead: ${ghErr.message}`
      );
    }

    const freshIssues = extractLinkedIssues(contrib.repo, scanTitle, scanBody);

    // Preserve manual issues; overlay fresh auto-detected ones
    const manualIssues  = contrib.linkedIssues.filter((i) => i.source === "manual");
    const manualNumbers = new Set(manualIssues.map((i) => i.issueNumber));
    const newAutoIssues = freshIssues
      .filter((i) => !manualNumbers.has(i.issueNumber))
      .map((i) => ({ ...i, source: "auto" }));

    const merged = [...manualIssues, ...newAutoIssues];

    const updated = await Contribution.findByIdAndUpdate(
      contrib._id,
      { linkedIssues: merged, lastSyncedAt: new Date() },
      { new: true }
    );

    res.json({ message: "Issues synced", contribution: updated });
  } catch (err) {
    console.error("Per-contribution sync error:", err);
    res.status(500).json({ message: "Failed to sync issues" });
  }
});

router.post("/:slug/sync-issues", auth, async (req, res) => {
  try {
    const collection = await Collection.findOne({ user: req.userId, slug: req.params.slug });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    const contributions = await Contribution.find({ collectionId: collection._id });

    let updated = 0;
    let skipped = 0;

    for (const contrib of contributions) {
      // Collection-wide sync uses stored text (no per-PR GitHub call to avoid rate limits)
      const freshIssues = extractLinkedIssues(
        contrib.repo,
        contrib.title,
        contrib.originalDescription || contrib.description || ""
      );

      const manualIssues  = contrib.linkedIssues.filter((i) => i.source === "manual");
      const manualNumbers = new Set(manualIssues.map((i) => i.issueNumber));
      const newAutoIssues = freshIssues
        .filter((i) => !manualNumbers.has(i.issueNumber))
        .map((i) => ({ ...i, source: "auto" }));

      const merged = [...manualIssues, ...newAutoIssues];

      const existingKeys = contrib.linkedIssues.map((i) => `${i.issueNumber}:${i.source}`).sort().join(",");
      const mergedKeys   = merged.map((i) => `${i.issueNumber}:${i.source}`).sort().join(",");

      if (existingKeys === mergedKeys && contrib.lastSyncedAt) {
        skipped++;
        continue;
      }

      await Contribution.findByIdAndUpdate(contrib._id, {
        linkedIssues: merged,
        lastSyncedAt: new Date(),
      });
      updated++;
    }

    res.json({ message: "Sync complete", total: contributions.length, updated, skipped });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ message: "Failed to sync issues" });
  }
});

export default router;