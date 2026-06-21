import CollectionCard from "../../components/cards/CollectionCard";
import DraggableCollectionsGrid from "../../components/cards/DraggableCollectionsGrid";

/**
 * CollectionsGrid
 *
 * Renders the collection grid for both owner and public visitor.
 *
 * When isSelf=true  → uses DraggableCollectionsGrid (dnd-kit sortable, drag handles, animations)
 * When isSelf=false → uses plain static grid (CollectionCard), zero drag affordances
 *
 * Public visitors see no drag handles, no grab cursors, no drag-related hover states.
 */
export default function CollectionsGrid({
  loading,
  collections,
  username,
  isSelf = false,
  onReorder,
}) {
  if (loading) {
    return (
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 rounded-xl bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!collections.length) {
    return (
      <p className="text-gray-500">
        No collections yet.
      </p>
    );
  }

  // Owner dashboard — drag-and-drop enabled
  if (isSelf && onReorder) {
    return (
      <DraggableCollectionsGrid
        collections={collections}
        username={username}
        onReorder={onReorder}
      />
    );
  }

  // Public visitor — static, no drag affordances whatsoever
  return (
    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
      {collections.map((c) => (
        <CollectionCard key={c._id} collection={c} username={username} />
      ))}
    </div>
  );
}