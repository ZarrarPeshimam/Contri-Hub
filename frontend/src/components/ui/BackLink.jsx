import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * BackLink
 *
 * Plain, standard-web-style "back" navigation link — not a button, not a
 * pill. Muted text with an ArrowLeft icon that brightens on hover/focus.
 * Used near the top of child pages (Collection, Overall Highlights,
 * Collection Highlights) to point back at the correct parent page via a
 * real route, never `navigate(-1)`/browser history.
 */
export default function BackLink({ to, label = "Back" }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#93304A] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}