import { useState, useEffect } from "react";
import { X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import api from "../../lib/api";

/**
 * EditCollectionModal
 *
 * Owner-only modal opened from the "Edit Collection" button on the
 * collection page. Two internal views, mirroring the pattern used by
 * ManageHighlightModal:
 *
 *  - "edit"          default view. Lets the owner add/update the
 *                     collection's description (the only field this
 *                     modal edits — collections can currently be
 *                     created without one). Also hosts the entry point
 *                     into the danger zone.
 *  - "confirmDelete"  a second, explicit step before anything
 *                     destructive happens. Spells out that deleting the
 *                     collection also deletes every contribution in it,
 *                     and that GitHub itself is never touched.
 *
 * Reuses the existing collection update/delete endpoints — no new
 * client-side state is introduced beyond this modal's own form/loading
 * state.
 */
export default function EditCollectionModal({
  collection,
  onClose,
  onUpdated,
  onDeleted,
  showToast,
}) {
  const [view, setView] = useState("edit");
  const [description, setDescription] = useState(collection?.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  /* ── Close on Escape (not while a request is in flight) ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving && !deleting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, saving, deleting]);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await api.put(`/api/collections/${collection.slug}`, {
        description,
      });
      onUpdated?.(res.data);
      showToast?.("Collection updated", "success");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      await api.delete(`/api/collections/${collection.slug}`);
      onDeleted?.(collection._id);
      // No onClose()/toast here — the caller navigates away immediately,
      // unmounting this modal along with the rest of the page.
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete collection");
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  /* ═══════════════════════ CONFIRM DELETE VIEW ═══════════════════════ */
  if (view === "confirmDelete") {
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      >
        <div className="w-full max-w-md rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-950/60">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Delete Collection</h2>
                <p className="text-xs text-gray-500 truncate max-w-[260px]">
                  {collection?.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              This will permanently delete{" "}
              <span className="text-white font-medium">{collection?.title}</span> and{" "}
              <span className="text-white font-medium">
                all {collection?.contributionsCount ?? "its"} contribution
                {collection?.contributionsCount === 1 ? "" : "s"}
              </span>{" "}
              in it from ContriHub, including any that are highlighted within this
              collection. Contributions highlighted overall are removed along with
              them, since a deleted contribution can't remain in your overall
              showcase either.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your pull requests on GitHub are not affected — this only removes the
              corresponding ContriHub records.
            </p>
            <p className="text-sm text-red-400 font-medium">This action cannot be undone.</p>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          {/* ── Footer ── */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting…" : "Delete Collection"}
            </button>
            <button
              onClick={() => setView("edit")}
              disabled={busy}
              className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 py-2.5 rounded-xl text-gray-200 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ EDIT VIEW ═══════════════════════ */
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#6A1B2E]/20">
              <Pencil className="w-4 h-4 text-[#C48A97]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Edit Collection</h2>
              <p className="text-xs text-gray-500 truncate max-w-[260px]">
                {collection?.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto maroon-scroll flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description for this collection…"
              rows={4}
              maxLength={500}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-[#93304A] disabled:opacity-60"
            />
            <p className="text-xs text-gray-600 mt-1 text-right">
              {description.length}/500
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* ── Footer: Save | Delete (icon) | Cancel ── */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setView("confirmDelete")}
            disabled={busy}
            title="Delete Collection"
            aria-label="Delete Collection"
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-60 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 py-2.5 rounded-xl text-gray-200 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}