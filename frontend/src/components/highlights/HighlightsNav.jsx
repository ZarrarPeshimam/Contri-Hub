import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, Star } from "lucide-react";

/**
 * HighlightsNav
 *
 * Shared top bar used on the Overall Highlights page and on the
 * Highlights tab of CollectionPage, so switching between the Overall
 * Highlights showcase and any collection's Highlights tab never requires
 * a trip back through Profile/Collection Overview.
 *
 * mode="overall"    → "Overall ▾"          (current page, dropdown lists collections)
 * mode="collection" → "‹ Overall  |  <Collection title> ▾"  (renders inside
 *                      CollectionPage when its Highlights tab is active)
 *
 * `collections` is the flat list of the profile owner's collections
 * (from GET /api/users/:username/collections), used to populate the
 * dropdown. Selecting an entry navigates straight to that page.
 */
export default function HighlightsNav({ mode, username, currentCollection, collections = [] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const goOverall = () => navigate(`/${username}/highlights`);
  const goCollection = (slug) => navigate(`/${username}/${slug}?tab=highlights`);

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Back-to-overall breadcrumb — only on a collection's Highlights page */}
      {mode === "collection" && (
        <>
          <button
            onClick={goOverall}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Overall
          </button>
          <span className="text-gray-600">/</span>
        </>
      )}

      {/* Current label + dropdown trigger */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-white font-semibold hover:text-[#C48A97] transition-colors"
        >
          <Star className="w-4 h-4 text-[#C48A97]" />
          {mode === "overall" ? "Overall" : currentCollection?.title || "Collection"}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-gray-950 border border-gray-800 shadow-2xl py-1.5 z-30 max-h-80 overflow-y-auto maroon-scroll">
            <button
              onClick={() => { setOpen(false); goOverall(); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                mode === "overall"
                  ? "text-white bg-[#6A1B2E]/30"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              Overall
            </button>

            {collections.length > 0 && (
              <div className="my-1 border-t border-gray-800" />
            )}

            {collections.map((c) => (
              <button
                key={c._id}
                onClick={() => { setOpen(false); goCollection(c.slug); }}
                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${
                  mode === "collection" && currentCollection?.slug === c.slug
                    ? "text-white bg-[#6A1B2E]/30"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}