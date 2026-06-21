import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SortableCollectionCard({ collection, username, activeId }) {
  const navigate = useNavigate();
  const isBeingDragged  = activeId === collection._id;
  const somethingActive = activeId !== null && !isBeingDragged;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
  };

  // ── Ghost / drop-placeholder slot ────────────────────────────────────────
  if (isDragging) {
    return (
      <motion.div ref={setNodeRef} style={style} layout initial={false}>
        <div className="
          rounded-xl
          border-2 border-dashed border-amber-400/40
          bg-amber-400/[0.04]
          min-h-[160px]
          flex items-center justify-center
        ">
          <span className="text-amber-400/35 text-sm font-medium select-none tracking-wide">
            Drop here
          </span>
        </div>
      </motion.div>
    );
  }

  // ── Normal card ───────────────────────────────────────────────────────────
  // listeners on the WRAPPER → entire card surface is draggable.
  // The handle icon is purely visual (no listeners of its own).
  // onClick on the card body navigates; we stopPropagation on mousedown
  // inside the card body so a drag-start doesn't also fire navigation.
  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, cursor: "grab" }}
      layout
      initial={false}
      animate={{ opacity: somethingActive ? 0.5 : 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="relative group"
      {...attributes}
      {...listeners}
    >
      {/* Grip icon — purely visual, fades in on hover, no pointer events */}
      {!somethingActive && (
        <div
          className="
            absolute top-3 right-3 z-10
            p-1.5 rounded-lg
            text-white/70
            pointer-events-none
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
          "
          aria-hidden="true"
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Card body — identical hover classes to CollectionCard (public view).
          onClick fires navigation but only if the pointer didn't move enough
          to trigger a dnd-kit drag (dnd-kit swallows the click on drag). */}
      <div
        onClick={() => navigate(`/${username}/${collection.slug}`)}
        className="
          rounded-xl
          border border-white/10
          bg-gradient-to-br from-amber-700/50 via-amber-500/50 to-amber-700/50
          p-6 pb-13
          cursor-grab
          select-none
          transition-all duration-200 ease-out
          hover:bg-none
          hover:scale-[1.04]
          hover:border-amber-400/40
          hover:bg-amber-400/10
          hover:shadow-[0_8px_30px_rgba(251,191,36,0.2)]
        "
      >
        <h3 className="text-xl font-semibold text-white pr-7">{collection.title}</h3>
        <p className="text-sm text-gray-400">{collection.year}</p>
        <p className="text-l py-3 pt-5 text-gray-200">
          {collection.description || "No description provided."}
        </p>
        <div className="mt-4 text-sm font-medium text-amber-400">
          {collection.contributionsCount} contributions →
        </div>
      </div>
    </motion.div>
  );
}