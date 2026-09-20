/**
 * dnd-kit building blocks for reordering PR cards.
 *
 * Kept separate from the component so the DnD *layer* stays thin: these
 * only decide WHEN a drag may start, WHICH slot the dragged card is over,
 * and how the keyboard moves it. The timeline's own layout is never
 * involved — it just receives a re-ordered list.
 */
import { MouseSensor, TouchSensor } from "@dnd-kit/core";

/* ─────────────────────────────────────────────────────────────────────────
   When may a drag START?

   The sortable wrapper sits around the whole PRCard fragment, so — unlike
   the collection tiles — pressing on it can also mean "click a link",
   "press a button", "select description text", "type in the edit form", or
   "click inside a modal that PRCard renders inline". None of those may
   start a drag.
───────────────────────────────────────────────────────────────────────── */
const NO_DRAG_SELECTOR =
  "input, textarea, select, button, a, label, [contenteditable=''], [contenteditable='true'], [data-no-dnd]";

export function canStartCardDrag(target) {
  const el = target instanceof Element ? target : target?.parentElement;
  if (!el) return false;

  // Only presses that land on the card itself (not modals rendered next to it).
  if (!el.closest("[data-pr-card]")) return false;

  // Links, buttons, form fields, and regions marked data-no-dnd (the
  // expanded description, so its text stays selectable).
  if (el.closest(NO_DRAG_SELECTOR)) return false;

  // A card is being edited somewhere: re-ordering could remount it and
  // silently discard the unsaved edit, so dragging is paused meanwhile.
  if (document.querySelector('[data-editing="true"]')) return false;

  return true;
}

/*
  Same activation behaviour as the Collections grid (5px move / 200ms hold),
  using the dedicated Mouse + Touch sensors rather than PointerSensor so that
  touch scrolling is never intercepted before the long-press fires.
*/
export class CardMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown",
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.button !== 0 || !canStartCardDrag(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

export class CardTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart",
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.touches.length > 1 || !canStartCardDrag(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────
   Which slot is the dragged card over?

   The timeline alternates left/right, so `closestCenter` (which measures
   in 2-D) would favour same-column cards and skip the neighbouring one.
   The cards are a single ordered vertical sequence though, so only the
   vertical distance matters. Return shape matches dnd-kit's built-ins.
───────────────────────────────────────────────────────────────────────── */
export function closestCenterY({ collisionRect, droppableRects, droppableContainers }) {
  const centerY = collisionRect.top + collisionRect.height / 2;
  const collisions = [];

  for (const droppableContainer of droppableContainers) {
    const rect = droppableRects.get(droppableContainer.id);
    if (!rect) continue;
    const value = Math.abs(centerY - (rect.top + rect.height / 2));
    collisions.push({ id: droppableContainer.id, data: { droppableContainer, value } });
  }

  return collisions.sort((a, b) => a.data.value - b.data.value);
}

/* ─────────────────────────────────────────────────────────────────────────
   Keyboard: Space/Enter lifts the focused card, ↑/↓ moves one position,
   Home/End jump to first/last, Space/Enter drops, Esc cancels.
   (dnd-kit's stock sortable getter is 2-D and can skip cards in the
   alternating layout, so this steps through the cards in order instead.)
───────────────────────────────────────────────────────────────────────── */
export function timelineKeyboardCoordinates(event, { context, currentCoordinates }) {
  const { code } = event;
  if (code !== "ArrowDown" && code !== "ArrowUp" && code !== "Home" && code !== "End") {
    return undefined;
  }

  event.preventDefault(); // don't scroll the page while moving a card

  const { active, collisionRect, droppableRects, droppableContainers, over } = context;
  if (!active || !collisionRect) return undefined;

  const slots = [];
  droppableContainers.getEnabled().forEach((container) => {
    const rect = droppableRects.get(container.id);
    if (rect) slots.push({ id: container.id, rect, container });
  });
  slots.sort((a, b) => a.rect.top - b.rect.top);

  const currentIndex = slots.findIndex((s) => s.id === (over?.id ?? active.id));
  if (currentIndex === -1) return undefined;

  const lastIndex = slots.length - 1;
  const wanted =
    code === "ArrowDown" ? currentIndex + 1
    : code === "ArrowUp" ? currentIndex - 1
    : code === "Home" ? 0
    : lastIndex;
  const targetIndex = Math.max(0, Math.min(lastIndex, wanted));
  if (targetIndex === currentIndex) return undefined;

  const target = slots[targetIndex];

  // Arrow keys are scrolled into view by dnd-kit itself; Home/End are not.
  if (code === "Home" || code === "End") {
    target.container.node.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }

  return {
    x: currentCoordinates.x,
    y: target.rect.top + target.rect.height / 2 - collisionRect.height / 2,
  };
}
