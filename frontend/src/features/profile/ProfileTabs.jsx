import { motion } from "framer-motion";

/**
 * ProfileTabs
 *
 * Modern underline tab navigation (GitHub/Linear/Vercel-style) for the
 * profile page — Collections vs Activity.
 *
 * Tab selection lives entirely in parent React state (see ProfilePage).
 * It is intentionally NOT persisted anywhere (no localStorage,
 * sessionStorage, URL, or cookies) — Collections must always be the
 * default tab on first visit, refresh, and re-navigation.
 */
const TABS = [
  { id: "collections", label: "Collections" },
  { id: "activity", label: "Activity" },
];

export default function ProfileTabs({ active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="flex items-center gap-6 border-b border-white/[0.08]"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative pb-3 pt-1 text-sm font-medium transition-colors outline-none cursor-pointer ${
              isActive ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}

            {isActive && (
              <motion.div
                layoutId="profile-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-amber-400"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}