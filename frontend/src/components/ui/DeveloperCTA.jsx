import { Link, useLocation, matchPath } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Avatar from "./Avatar";

/**
 * DeveloperCTA
 *
 * Small persistent floating pill, fixed to the bottom-right of the
 * viewport, that lets visitors jump to the developer's main profile.
 *
 * Destination is intentionally a simple hardcoded constant — no dynamic
 * lookup, no backend/data changes. Update this single value later to
 * point at the real profile.
 */
const DEVELOPER_PROFILE_URL = "/zapdark";

/**
 * Visibility is decided purely by ROUTE, never by auth state — a
 * logged-out visitor and a logged-in visitor see the exact same thing on
 * the exact same URL, so `useAuth` is intentionally not consulted here.
 *
 * The CTA is meant for "landing page"-style, single-segment routes —
 * someone's profile (`/:username`), plus the login and signup screens,
 * which are structurally the same shape (`/login`, `/signup`). Deeper,
 * multi-segment routes (a collection at `/:username/:slug`, highlights at
 * `/:username/highlights`, the OAuth handoff pages) are excluded because
 * the CTA would be a distraction from more specific in-progress content
 * there. Two single-segment routes are excluded as explicit exceptions:
 *
 *   - `/zapdark` — the destination itself; the visitor is already there
 *   - `/settings` — account management, not "discover the developer"
 *     content
 *
 * Matched with `matchPath` (not a mounting-location assumption) so this
 * stays correct no matter where the component ends up mounted.
 */
const HIDDEN_EXACT_ROUTES = new Set([DEVELOPER_PROFILE_URL, "/settings"]);

function shouldShowCTA(pathname) {
  if (HIDDEN_EXACT_ROUTES.has(pathname)) return false;
  // Exactly one path segment, e.g. /:username, /login, /signup —
  // multi-segment routes (collections, highlights, OAuth pages) don't
  // match and stay hidden.
  return !!matchPath({ path: "/:slug", end: true }, pathname);
}

export default function DeveloperCTA() {
  const location = useLocation();

  if (!shouldShowCTA(location.pathname)) return null;

  return (
    <Link
      to={DEVELOPER_PROFILE_URL}
      aria-label="Meet the developer"
      className="
        group fixed z-50
        bottom-4 right-4 sm:bottom-6 sm:right-6
        flex items-center gap-2
        pl-1.5 pr-3 py-1.5
        rounded-full
        bg-gray-900 border border-white/10
        shadow-lg shadow-black/30
        text-sm font-medium text-gray-100
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-black/40
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
      "
    >
      <Avatar username="dev" displayName="ZP" size="sm" />
      <span className="whitespace-nowrap">Meet the developer</span>
      <ArrowUpRight
        className="w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
      />
    </Link>
  );
}