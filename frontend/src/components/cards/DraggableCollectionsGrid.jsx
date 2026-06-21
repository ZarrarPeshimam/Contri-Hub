import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { LayoutGroup } from "framer-motion";
import SortableCollectionCard from "../cards/SortableCollectionCard";
import DragOverlayCard from "../cards/DragOverlayCard";

/**
 * DraggableCollectionsGrid
 *
 * Owner-only sortable grid with full visual polish:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  While dragging                                             │
 * │  ─────────────                                             │
 * │  • activeId state tracks which card is being dragged        │
 * │  • That card's slot shows a dashed amber placeholder        │
 * │  • All other cards dim slightly (opacity 0.55)              │
 * │  • A floating DragOverlay copy follows the cursor:          │
 * │    rotated 1.5°, scaled 1.04, strong shadow + amber glow   │
 * │  • Neighboring cards slide smoothly via framer-motion layout│
 * │                                                             │
 * │  On drop                                                    │
 * │  ───────                                                    │
 * │  • DragOverlay snaps back (defaultDropAnimation)            │
 * │  • activeId cleared → all cards restore to full opacity     │
 * │  • onReorder called with new array → optimistic persist     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Sensors:
 *  PointerSensor  – 5px move threshold prevents accidental drags on click
 *  TouchSensor    – 200ms press delay avoids conflicts with page scroll
 *  KeyboardSensor – arrow-key sorting for accessibility
 */
export default function DraggableCollectionsGrid({ collections, username, onReorder }) {
  const [activeId, setActiveId] = useState(null);

  const activeCollection = activeId
    ? collections.find((c) => c._id === activeId) ?? null
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIndex = collections.findIndex((c) => c._id === active.id);
      const newIndex = collections.findIndex((c) => c._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...collections];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorder(reordered);
    },
    [collections, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={collections.map((c) => c._id)}
        strategy={rectSortingStrategy}
      >
        {/*
          LayoutGroup lets framer-motion coordinate layout animations
          across all sibling cards so they slide in sync, not independently.
        */}
        <LayoutGroup>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {collections.map((c) => (
              <SortableCollectionCard
                key={c._id}
                collection={c}
                username={username}
                activeId={activeId}
              />
            ))}
          </div>
        </LayoutGroup>
      </SortableContext>

      {/*
        DragOverlay renders the floating "picked-up" card in a portal
        on top of everything. dropAnimation smoothly snaps it back on release.
      */}
      <DragOverlay
        dropAnimation={{
          duration: 220,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeCollection && (
          <DragOverlayCard collection={activeCollection} />
        )}
      </DragOverlay>
    </DndContext>
  );
}