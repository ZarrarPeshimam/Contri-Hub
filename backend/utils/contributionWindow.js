import Contribution from "../models/Contribution.js";

/**
 * getContributionYears
 *
 * All distinct calendar years (UTC) a user has at least one contribution
 * in, newest first. Shared by the year selector, the heatmap, and the
 * activity graph so "what years exist" is computed in exactly one place.
 */
export async function getContributionYears(userId) {
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

/**
 * getContributionWindow
 *
 * Single source of truth for "which date range does the selected year
 * mean" — used by BOTH the heatmap and the trend graph so the two views
 * can never drift apart:
 *
 *   - No year requested, or the requested year is the newest year that
 *     actually has data: rolling 365-day window ending "now" (real
 *     today, not year-end). This is what makes the current/newest year
 *     behave like a live trailing window instead of stopping at Dec 31.
 *   - Any other (older, completed) year: the full calendar year,
 *     Jan 1 00:00:00 UTC → Dec 31 23:59:59.999 UTC.
 *
 * Returns { year, startDate, endDate } where startDate/endDate are Date
 * objects (UTC) ready to drop straight into a Mongo $match.
 */
export async function getContributionWindow(userId, requestedYear) {
  const years = await getContributionYears(userId);
  const newestYear = years[0] ?? null;

  const year = Number.isInteger(requestedYear) ? requestedYear : newestYear;

  let startDate, endDate;

  if (!year || year === newestYear) {
    endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 364);
    startDate.setUTCHours(0, 0, 0, 0);
  } else {
    startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  return { year, startDate, endDate };
}
