import { GripVertical } from "lucide-react";

export default function DragOverlayCard({ collection }) {
  if (!collection) return null;

  return (
    <div
      style={{
        transform: "rotate(1.5deg) scale(1.04)",
        transformOrigin: "center center",
        willChange: "transform",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        className="
          relative
          rounded-xl
          border border-amber-400/50
          bg-gradient-to-br from-amber-700/70 via-amber-500/60 to-amber-700/70
          p-6 pb-13
          shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(251,191,36,0.2),0_8px_32px_rgba(251,191,36,0.25)]
          ring-1 ring-amber-400/20
          backdrop-blur-sm
        "
      >
        {/* Drag handle — always visible while floating */}
        <div
          className="
            absolute top-3 right-3
            p-1.5 rounded-lg
            text-amber-400/80
            bg-amber-400/10
          "
        >
          <GripVertical size={16} />
        </div>

        <h3 className="text-xl font-semibold text-white pr-7">{collection.title}</h3>
        <p className="text-sm text-gray-300">{collection.year}</p>
        <p className="text-l py-3 pt-5 text-gray-100">
          {collection.description || "No description provided."}
        </p>
        <div className="mt-4 text-sm font-medium text-amber-300">
          {collection.contributionsCount} contributions →
        </div>
      </div>
    </div>
  );
}