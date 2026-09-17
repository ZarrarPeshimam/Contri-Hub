import { useNavigate } from "react-router-dom";

/**
 * CollectionSubNav
 *
 * Tab row shown at the top of the collection page: Overview, Highlights.
 * Both tabs are views of the SAME CollectionPage — "Highlights" is not a
 * separate route, it's `?tab=highlights` on the collection's own URL, so
 * switching tabs never leaves the collection page (refresh/back both
 * behave like a normal query-param tab).
 */
export default function CollectionSubNav({ username, slug, active }) {
  const navigate = useNavigate();

  const TABS = [
    { id: "overview", label: "Overview", to: `/${username}/${slug}` },
    { id: "highlights", label: "Highlights", to: `/${username}/${slug}?tab=highlights` },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-white/[0.08]">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.to)}
            className={`relative pb-3 pt-1 text-sm font-medium transition-colors outline-none cursor-pointer ${
              isActive ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}