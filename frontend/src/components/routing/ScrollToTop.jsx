import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop
 *
 * Route-aware scroll reset. Mounted once near the root (see App.jsx) so
 * every route change in the app resets the window scroll position to the
 * top — this is what makes navigations like:
 *
 *   /:username            (scrolled down on Collections/Activity)
 *     -> /:username/highlights
 *
 * and back again start from the top instead of inheriting whatever
 * scroll position the previous route was left at.
 *
 * Two things happen here:
 *
 * 1. On mount, browser scroll restoration is switched from "auto" to
 *    "manual". Some browsers try to restore the previous scroll offset
 *    for a URL on back/forward navigation *before* React re-renders,
 *    which can cause a visible flash of the old scroll position. Turning
 *    this off hands scroll position entirely to us.
 *
 * 2. On every pathname change (covers clicks, back/forward, and any
 *    programmatic navigate()), scroll is reset to (0, 0) synchronously
 *    and instantly — no smooth/animated scrolling. The goal is that the
 *    next route is simply rendered at the top; the user should never see
 *    a slow scroll-up.
 *
 * Intentionally keyed on pathname only (not search/hash) so unrelated
 * query-string updates on the same page don't yank the scroll position.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}