import { Fragment, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Timeline from "./Timeline";
import TimelineItem from "./TimelineItem";
import {
  CardMouseSensor,
  CardTouchSensor,
  closestCenterY,
  timelineKeyboardCoordinates,
} from "../../lib/contributionDnd";

/**
 * DraggableContributions
 *
 * Drag-and-drop ordering for PR cards, added AROUND the existing timeline —
 * not instead of it.
 *
 *   ordered contributions → existing <Timeline>/<TimelineItem> → left/right layout
 *
 * `Timeline` and `TimelineItem` are used exactly as before and keep deciding
 * left/right placement from each card's index, the centre line and the
 * nodes. All this file does is (1) make each card sortable and (2) hand the
 * re-ordered array back through `onReorder`; the parent re-renders the same
 * timeline with the new order.
 *
 * Non-owners (`enabled={false}`) get the original markup byte-for-byte:
 * no DnD context, no wrappers, no listeners, no drag affordance.
 *
 * While dragging, the picked-up card stays in its slot as a faint ghost
 * (so nothing reflows / jumps) and a floating copy follows the pointer —
 * the same pick-up / overlay / drop-animation pattern as the Collections grid.
 *
 * Props
 *   items      ordered array of contributions ({ _id, title, … })
 *   enabled    owner-only; false → plain, non-draggable rendering
 *   onReorder  (reorderedItems, previousItems) => void
 *   renderCard (contribution) => <PRCard … />   (page-specific props)
 */

const DROP_ANIMATION = {
  duration: 220,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

/**
 * Sortable wrapper around ONE card. It is a plain block div with no styling
 * of its own, so the card lays out exactly as it did without it.
 *
 * - transform/transition are only present while cards are shifting during
 *   a drag; at rest the wrapper adds no transform context.
 * - The grip is purely visual (no pointer events), fades in on hover in the
 *   card's otherwise-empty left padding — the top-right hover buttons stay
 *   untouched — and never appears for non-owners.
 */
function SortableCard({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // The wrapper is both the sortable node and the keyboard activator, so
  // Space/Enter on a nested button or link (star, GitHub link…) is never
  // mistaken for "lift this card".
  const setRefs = useCallback(
    (node) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setNodeRef, setActivatorNodeRef]
  );

  const style = {};
  if (transform) style.transform = CSS.Translate.toString(transform);
  if (transition) style.transition = transition;
  if (isDragging) {
    style.opacity = 0.4;
    style.outline = "2px dashed rgba(147, 48, 74, 0.6)";
  }

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className="group/drag relative rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93304A]/70"
    >
      {children}

      {!isDragging && (
        <div
          aria-hidden="true"
          className="absolute left-2 top-9 z-10 rounded-md p-1 text-[#D9AAB4]/70 pointer-events-none opacity-0 group-hover/drag:opacity-100 transition-opacity duration-150"
        >
          <GripVertical size={16} />
        </div>
      )}
    </div>
  );
}

/** DnD context, sortable context, floating overlay and screen-reader text. */
function SortableShell({ items, onReorder, renderCard, children }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(CardMouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(CardTouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: timelineKeyboardCoordinates })
  );

  const itemIds = useMemo(() => items.map((c) => c._id), [items]);
  const activeItem = activeId ? items.find((c) => c._id === activeId) ?? null : null;

  const handleDragStart = useCallback(({ active }) => setActiveId(active.id), []);
  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIndex = itemIds.indexOf(active.id);
      const newIndex = itemIds.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(items, oldIndex, newIndex), items);
    },
    [items, itemIds, onReorder]
  );

  // Default announcements would read out raw database ids.
  const accessibility = useMemo(() => {
    const titleOf = (id) => items.find((c) => c._id === id)?.title ?? "card";
    const position = (id) => `${itemIds.indexOf(id) + 1} of ${items.length}`;
    return {
      // Keep dnd-kit's hidden helper nodes out of the page layout entirely.
      container: document.body,
      screenReaderInstructions: {
        draggable:
          "To move a card, focus it and press Space or Enter. Use the Up and Down arrow keys to move it, Home or End to jump to the first or last position, Space or Enter to drop, and Escape to cancel.",
      },
      announcements: {
        onDragStart: ({ active }) =>
          `Picked up "${titleOf(active.id)}", position ${position(active.id)}.`,
        onDragOver: ({ active, over }) =>
          over ? `"${titleOf(active.id)}" is over position ${position(over.id)}.` : undefined,
        onDragEnd: ({ active, over }) =>
          over
            ? `Dropped "${titleOf(active.id)}" at position ${position(over.id)}.`
            : `Dropped "${titleOf(active.id)}".`,
        onDragCancel: ({ active }) =>
          `Move cancelled. "${titleOf(active.id)}" is back at position ${position(active.id)}.`,
      },
    };
  }, [items, itemIds]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenterY}
      accessibility={accessibility}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      {/* Portalled to <body> so no ancestor transform (e.g. the page-entry
          animation) can offset the floating card. */}
      {createPortal(
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeItem ? (
            <div
              className="rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-[#93304A]/50"
              style={{
                transform: "rotate(1.5deg) scale(1.02)",
                transformOrigin: "center center",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {renderCard(activeItem)}
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

/**
 * Desktop timeline. Wrap-in-place replacement for
 *   <Timeline>{items.map((c, i) => <TimelineItem index={i}>…</TimelineItem>)}</Timeline>
 */
export function DraggableTimeline({ items, enabled = false, onReorder, renderCard }) {
  if (!enabled) {
    return (
      <Timeline>
        {items.map((c, index) => (
          <TimelineItem key={c._id} index={index}>
            {renderCard(c)}
          </TimelineItem>
        ))}
      </Timeline>
    );
  }

  return (
    <SortableShell items={items} onReorder={onReorder} renderCard={renderCard}>
      <Timeline>
        {items.map((c, index) => (
          <TimelineItem key={c._id} index={index}>
            <SortableCard id={c._id}>{renderCard(c)}</SortableCard>
          </TimelineItem>
        ))}
      </Timeline>
    </SortableShell>
  );
}

/**
 * Mobile stack (the page's existing `md:hidden` list). `className` is the
 * page's original container class, so the layout is unchanged.
 */
export function DraggableCardList({
  items,
  enabled = false,
  onReorder,
  renderCard,
  className,
}) {
  if (!enabled) {
    return (
      <div className={className}>
        {items.map((c) => (
          <Fragment key={c._id}>{renderCard(c)}</Fragment>
        ))}
      </div>
    );
  }

  return (
    <SortableShell items={items} onReorder={onReorder} renderCard={renderCard}>
      <div className={className}>
        {items.map((c) => (
          <SortableCard key={c._id} id={c._id}>
            {renderCard(c)}
          </SortableCard>
        ))}
      </div>
    </SortableShell>
  );
}
