import { Star } from "lucide-react";

/**
 * HighlightsEmptyState
 *
 * Matches the dashed-border empty state used elsewhere in the app
 * (e.g. "No contributions yet." in CollectionPage).
 */
export default function HighlightsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
      <Star className="w-6 h-6 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">No highlighted contributions yet.</p>
      <p className="text-gray-600 text-xs mt-1">
        Use "Manage Highlight" on a contribution to feature it here.
      </p>
    </div>
  );
}