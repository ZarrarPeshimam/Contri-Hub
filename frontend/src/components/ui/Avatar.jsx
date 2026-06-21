/**
 * Avatar
 *
 * Shows avatarUrl when available.
 * Falls back to initials with a deterministic background color hashed from username.
 *
 * Props:
 *   avatarUrl   – string | null
 *   displayName – string
 *   username    – string (used for color hash)
 *   size        – "sm" | "md" | "lg" | "xl"  (default "md")
 *   className   – extra classes
 */

const PALETTE = [
  ["#B45309", "#FEF3C7"], // amber
  ["#C2410C", "#FFEDD5"], // orange
  ["#92400E", "#FDE68A"], // dark amber
  ["#9A3412", "#FED7AA"], // burnt orange
  ["#78350F", "#FCD34D"], // bronze
  ["#A16207", "#FEF08A"], // golden amber
  ["#7C2D12", "#FDBA74"], // copper
  ["#854D0E", "#FDE68A"], // warm gold
];

function hashUsername(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

function getInitials(displayName = "", username = "") {
  const source = displayName.trim() || username.trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const SIZE_MAP = {
  sm: { outer: "w-8 h-8",   text: "text-xs"  },
  md: { outer: "w-10 h-10", text: "text-sm"  },
  lg: { outer: "w-16 h-16", text: "text-xl"  },
  xl: { outer: "w-24 h-24", text: "text-3xl" },
};

export default function Avatar({
  avatarUrl,
  displayName = "",
  username = "",
  size = "md",
  className = "",
}) {
  const { outer, text } = SIZE_MAP[size] ?? SIZE_MAP.md;
  const initials = getInitials(displayName, username);
  const [bg, fg] = PALETTE[hashUsername(username)];

  const base = `${outer} rounded-full shrink-0 overflow-hidden ring-2 ring-white/10 ${className}`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || username}
        className={`${base} object-cover`}
        onError={(e) => {
          // If the image fails to load, hide it and let the parent re-render
          // a fallback. Simplest approach: replace src with empty.
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <span
      className={`${base} inline-flex items-center justify-center font-semibold select-none ${text}`}
      style={{ backgroundColor: bg, color: fg }}
      aria-label={`Avatar for ${displayName || username}`}
    >
      {initials}
    </span>
  );
}
