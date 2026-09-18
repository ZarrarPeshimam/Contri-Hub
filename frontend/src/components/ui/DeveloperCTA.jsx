import { Link, useLocation, matchPath } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Avatar from "./Avatar";

/**
 * DeveloperCTA
 *
 * Small persistent floating pill that lets visitors jump to the
 * developer's main profile. Fixed to the bottom-right of the viewport
 * on most pages; raised slightly above the bottom-right on `/:username`
 * profile pages specifically (see getCTAPlacement) so it doesn't sit
 * flush against the edge there — notably, ProfilePage.jsx renders its
 * own fixed "+ Add Collection" FAB at that exact same bottom-6 right-6
 * spot for the profile owner's Collections tab, and this keeps the two
 * from stacking on top of each other.
 *
 * Destination is intentionally a simple hardcoded constant — no dynamic
 * lookup, no backend/data changes. Update this single value later to
 * point at the real profile.
 */
const DEVELOPER_PROFILE_URL = "/zapdark";

/**
 * Visibility/placement is decided purely by ROUTE, never by auth state
 * — a logged-out visitor and a logged-in visitor see the exact same
 * thing on the exact same URL, so `useAuth` is intentionally not
 * consulted here.
 *
 * Matched against the app's actual route SHAPES via `matchPath` — never
 * by counting URL segments or checking for a username substring. That
 * distinction matters specifically because a collection route
 * (`/:username/:slug`) and the profile's own Highlights route
 * (`/:username/highlights`) are both syntactically "two segments", so
 * naive segment-counting can't tell them apart; only matching the real
 * route patterns (in the same priority order they're checked in
 * App.jsx's own <Routes>) can.
 *
 * Route -> placement:
 *
 *   1. HIDDEN_EXACT_ROUTES — an explicit, small set of exact app routes
 *      where the CTA doesn't make sense at all:
 *        - `/zapdark`      — the destination itself; the visitor is
 *                             already there. This is the ONLY profile
 *                             URL that stays fully hidden rather than
 *                             getting the new "raised" treatment below.
 *        - `/settings`     — account management, not "discover the
 *                             developer" content
 *        - `/oauth/callback`, `/signup/github` — transient OAuth
 *                             handoff pages, not real content
 *      => hidden entirely. Unchanged from before.
 *
 *   2. `/login`, `/signup` — structurally single-segment but explicitly
 *      NOT a `/:username` profile.
 *      => shown, default bottom-right position. Unchanged.
 *
 *   3. `/:username/highlights` — the profile's overall-highlights view.
 *      Also two segments, but it is NOT a collection page, so (checked
 *      before the generic two-segment pattern below, since it would
 *      otherwise also match `/:username/:slug`) it keeps the previous
 *      default treatment.
 *      => shown, default bottom-right position. Unchanged.
 *
 *   4. `/:username/:slug` — a collection page.
 *      => hidden entirely. NEW behavior: collection pages must show no
 *         "Meet the developer" button at all.
 *
 *   5. `/:username` — exactly one dynamic path segment: a profile page.
 *      Applies uniformly whether it's the visitor's own profile, a
 *      public/logged-out view, or anyone else's — except `/zapdark`
 *      above, which is excluded earlier.
 *      => shown, RAISED above the usual bottom-right spot. NEW
 *         behavior, replacing the old "hide entirely on any single-
 *         segment route" rule.
 *
 *   6. Anything else (routes not covered above).
 *      => shown, default bottom-right position. Unchanged fallback.
 */
const HIDDEN_EXACT_ROUTES = new Set([
  DEVELOPER_PROFILE_URL,
  "/settings",
  "/oauth/callback",
  "/signup/github",
]);

// Single-segment app routes that are NOT a `/:username` profile.
const NON_PROFILE_SINGLE_SEGMENT_ROUTES = new Set(["/login", "/signup"]);

function getCTAPlacement(pathname) {
  if (HIDDEN_EXACT_ROUTES.has(pathname)) {
    return { show: false, raised: false };
  }

  if (NON_PROFILE_SINGLE_SEGMENT_ROUTES.has(pathname)) {
    return { show: true, raised: false };
  }

  // Checked BEFORE the generic collection pattern below — otherwise
  // `/:username/:slug` would also match `/someuser/highlights`.
  if (matchPath({ path: "/:username/highlights", end: true }, pathname)) {
    return { show: true, raised: false };
  }

  if (matchPath({ path: "/:username/:slug", end: true }, pathname)) {
    // Collection page — no CTA at all.
    return { show: false, raised: false };
  }

  if (matchPath({ path: "/:username", end: true }, pathname)) {
    // A profile page — show, raised above the usual position.
    return { show: true, raised: true };
  }

  return { show: true, raised: false };
}

export default function DeveloperCTA() {
  const location = useLocation();
  const { show, raised } = getCTAPlacement(location.pathname);

  if (!show) return null;

  return (
    <Link
      to={DEVELOPER_PROFILE_URL}
      aria-label="Meet the developer"
      className={`
        group fixed z-50
        ${raised ? "bottom-20 right-4 sm:bottom-24 sm:right-6" : "bottom-4 right-4 sm:bottom-6 sm:right-6"}
        flex items-center gap-2
        pl-1.5 pr-3 py-1.5
        rounded-full
        bg-gray-900 border border-white/10
        shadow-lg shadow-black/30
        text-sm font-medium text-gray-100
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-black/40
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
      `}
    >
      <Avatar username="dev" displayName="ZP" size="sm" />
      <span className="whitespace-nowrap">Meet the developer</span>
      <ArrowUpRight
        className="w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
      />
    </Link>
  );
}