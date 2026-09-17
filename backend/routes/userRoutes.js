import express from "express";
import User from "../models/User.js";
import Collection from "../models/Collection.js";
import Contribution from "../models/Contribution.js";
import { getContributionYears, getContributionWindow } from "../utils/contributionWindow.js";

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

    const parsedYear = parseInt(req.query.year, 10);
    const requestedYear = Number.isInteger(parsedYear) ? parsedYear : null;

    const { year, startDate, endDate } = await getContributionWindow(user._id, requestedYear);

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
 * Computes the stat-card figures for the Activity dashboard in a single
 * round trip: Total Contributions, Total Collections, Active Days, and
 * Longest Streak. Uses one $facet aggregation (indexed on `user`)
 * instead of separate queries, and only walks distinct active-day
 * strings in JS for the streak calculation — never raw contribution
 * documents.
 */
async function getActivityStats(userId) {
  const [totalCollections, facetResult] = await Promise.all([
    Collection.countDocuments({ user: userId }),
    Contribution.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          // One doc per distinct active day (ascending) — this is the
          // only place we touch the raw collection, and it's already
          // reduced to at most ~one entry per calendar day.
          activeDates: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAtGithub",
                    timezone: "UTC",
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),
  ]);

  const facet = facetResult[0] ?? {};
  const totalContributions = facet.total?.[0]?.count ?? 0;
  const activeDates = (facet.activeDates ?? []).map((d) => d._id);
  const activeDays = activeDates.length;

  // Longest streak: longest run of calendar-consecutive active days.
  let longestStreak = 0;
  let running = 0;
  let prevDate = null;

  for (const dateStr of activeDates) {
    const current = new Date(`${dateStr}T00:00:00Z`);
    const diffDays = prevDate ? Math.round((current - prevDate) / 86400000) : null;
    running = diffDays === 1 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    prevDate = current;
  }

  return {
    totalContributions,
    totalCollections,
    activeDays,
    longestStreak,
  };
}

router.get("/:username/activity-stats", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const stats = await getActivityStats(user._id);
    res.json(stats);
  } catch (err) {
    console.error("Activity stats error:", err);
    res.status(500).json({ message: "Failed to load activity stats" });
  }
});

/**
 * GET /api/users/:username/activity-graph
 *
 * Time-series (not a calendar grid) of contribution counts per day —
 * feeds the trend line chart below the heatmap. Uses the exact same
 * date window as the heatmap (see getContributionWindow): a rolling
 * 365-day window ending "now" for the newest year with data, or a full
 * Jan 1–Dec 31 calendar year for any older, completed year. The `year`
 * query param selects which window, mirroring activity-heatmap so the
 * two views can never drift out of sync when the year selector changes.
 *
 * Only dates with count > 0 are returned — inactive days are NOT
 * zero-filled. This is intentional: with sparse activity, stitching in
 * artificial 0-value points between real contributions produced a
 * noisy, spiky chart (1 → 0 → 0 → 2 → 0 → 1) that visually emphasized
 * inactivity over the contributions themselves. The chart instead plots
 * contribution *events* and connects them directly (1 → 2 → 1), the way
 * Codeforces/LeetCode rating-history graphs plot only actual matches
 * rather than every calendar day in between.
 *
 * The series is naturally trimmed to [first active date, last active
 * date] within the window — since only active-day buckets are ever
 * returned (sorted ascending), the first and last bucket already ARE
 * the first/last contribution, with no trailing empty space even when
 * the window itself extends further (e.g. a rolling window that runs
 * past the last contribution, or a calendar year with no activity in
 * its final months).
 *
 * Exactly ONE synthetic point is added on top of that: a `count: 0`
 * entry for the day immediately before the first active date (clamped
 * to the window start, and skipped entirely if that would collide with
 * the first active date itself). This gives the chart breathing room on
 * the left edge without reintroducing the flat zero-filled stretches
 * everywhere else. If the user has no contributions in the window, an
 * empty array is returned.
 */
router.get("/:username/activity-graph", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const parsedYear = parseInt(req.query.year, 10);
    const requestedYear = Number.isInteger(parsedYear) ? parsedYear : null;

    const { year, startDate: windowStart, endDate: windowEnd } =
      await getContributionWindow(user._id, requestedYear);

    const buckets = await Contribution.aggregate([
      {
        $match: {
          user: user._id,
          createdAtGithub: { $gte: windowStart, $lte: windowEnd },
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
      { $sort: { _id: 1 } },
    ]);

    if (!buckets.length) {
      return res.json({ year, series: [] });
    }

    // Each bucket is already exactly one entry per active day — no
    // zero-count filling, no artificial gap points. Just reshape.
    // The list is already trimmed to [first active, last active]
    // simply by virtue of being the actual matched buckets.
    const series = buckets.map((b) => ({ date: b._id, count: b.count }));

    // Single 1-day padding point before the first active date, clamped
    // to the window start so it never reaches earlier than requested.
    const firstActiveStr = series[0].date;
    const paddingDate = new Date(`${firstActiveStr}T00:00:00Z`);
    paddingDate.setUTCDate(paddingDate.getUTCDate() - 1);
    if (paddingDate < windowStart) paddingDate.setTime(windowStart.getTime());

    const paddingIso = paddingDate.toISOString().slice(0, 10);
    if (paddingIso !== firstActiveStr) {
      series.unshift({ date: paddingIso, count: 0 });
    }

    res.json({ year, series });
  } catch (err) {
    console.error("Activity graph error:", err);
    res.status(500).json({ message: "Failed to load activity graph" });
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

/**
 * GET /api/users/:username/highlights
 *
 * Overall Highlights — contributions with highlightScope === "overall",
 * across every collection owned by the user. Since these span multiple
 * collections, each contribution's collectionId is populated with just
 * enough data (title, slug) to render a collection badge on the card.
 * Filtering happens in the DB query, not in React.
 */
router.get("/:username/highlights", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const contributions = await Contribution.find({
      user: user._id,
      highlightScope: "overall",
    })
      .sort({ createdAtGithub: -1 })
      .populate("collectionId", "title slug");

    res.json({ contributions });
  } catch (err) {
    console.error("Overall highlights error:", err);
    res.status(500).json({ message: "Failed to fetch highlights" });
  }
});

/**
 * GET /api/users/:username/collections/:slug/highlights
 *
 * Collection Highlights — contributions belonging to THIS collection
 * whose highlightScope is "collection" OR "overall". Overall-highlighted
 * contributions surface here too, since a global highlight should
 * automatically appear in its own collection's showcase as well.
 * Contributions from other collections are never included.
 */
router.get("/:username/collections/:slug/highlights", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const collection = await Collection.findOne({
      user: user._id,
      slug: req.params.slug,
    });
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });

    const contributions = await Contribution.find({
      collectionId: collection._id,
      highlightScope: { $in: ["collection", "overall"] },
    }).sort({ createdAtGithub: -1 });

    res.json({ collection, contributions });
  } catch (err) {
    console.error("Collection highlights error:", err);
    res.status(500).json({ message: "Failed to fetch collection highlights" });
  }
});

export default router;