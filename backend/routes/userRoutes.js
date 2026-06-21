import express from "express";
import User from "../models/User.js";
import Collection from "../models/Collection.js";
import Contribution from "../models/Contribution.js";

const router = express.Router();

const publicFields = "-password -email -settings";

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

router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select(publicFields);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      _id:            user._id,
      username:       user.username,
      displayName:    user.displayName || user.username,
      bio:            user.bio,
      avatarUrl:      user.avatarUrl,
      githubUsername: user.githubUsername,
      linkedinUrl:    user.linkedinUrl,
      portfolioUrl:   user.portfolioUrl,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:username/collections", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const collections = await Collection.find({ user: user._id }).sort({
      order: 1,
      createdAt: -1,
    });

    const result = await withLiveCounts(collections);
    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch collections" });
  }
});

async function getContributionYears(userId) {
  const years = await Contribution.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: { $year: { date: "$createdAtGithub", timezone: "UTC" } },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return years.map((y) => y._id);
}

router.get("/:username/contribution-years", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const years = await getContributionYears(user._id);
    res.json({ years });
  } catch (err) {
    console.error("Contribution years error:", err);
    res.status(500).json({ message: "Failed to load contribution years" });
  }
});

router.get("/:username/activity-heatmap", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const years = await getContributionYears(user._id);
    const newestYear = years[0] ?? null;

    const parsedYear = parseInt(req.query.year, 10);
    const year = Number.isInteger(parsedYear) ? parsedYear : newestYear;

    let startDate, endDate;

    if (!year || year === newestYear) {
      // No contributions yet, or the newest available year: rolling
      // 365-day window ending today (real "today", not year-end).
      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);

      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 364);
      startDate.setUTCHours(0, 0, 0, 0);
    } else {
      // A completed, older year: full calendar year for a clean
      // portfolio/history view.
      startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    }

    const buckets = await Contribution.aggregate([
      {
        $match: {
          user: user._id,
          createdAtGithub: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAtGithub",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    for (const bucket of buckets) counts[bucket._id] = bucket.count;

    res.json({
      year,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      counts,
    });
  } catch (err) {
    console.error("Activity heatmap error:", err);
    res.status(500).json({ message: "Failed to load activity heatmap" });
  }
});

/**
 * GET /api/users/:username/collections/:slug/contributions
 */
router.get("/:username/collections/:slug/contributions", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const collection = await Collection.findOne({
      user: user._id,
      slug: req.params.slug,
    });
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });

    const contributions = await Contribution.find({
      collectionId: collection._id,
    }).sort({ createdAtGithub: 1 });

    res.json({ collection, contributions });
  } catch {
    res.status(500).json({ message: "Failed to fetch contributions" });
  }
});

export default router;