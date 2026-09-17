import { useState, useEffect } from "react";
import { X, Star, StarOff, Pencil } from "lucide-react";
import api from "../../lib/api";

const SCOPE_OPTIONS = [
  {
    value: "overall",
    label: "Overall Highlight",
    description: "Feature this contribution in your overall highlights.",
  },
  {
    value: "collection",
    label: "Collection Highlight",
    description: "Feature it only in this collection's highlights.",
  },
];

const SCOPE_LABEL = {
  overall: "Overall",
  collection: "this collection",
};

/**
 * ManageHighlightModal
 *
 * Two internal views:
 *  - "manage": shown when the contribution is already highlighted
 *              (highlightScope === "overall" | "collection"). Lets the
 *              user Remove or Change the highlight.
 *  - "select": shown when the contribution is not highlighted yet, or
 *              when the user chose "Change Highlight" from the manage
 *              view. Offers only Overall / Collection (never "none").
 *
 * Reuses the existing highlight endpoint/API for every mutation.
 */
export default function ManageHighlightModal({
  pr,
  collectionSlug,
  onClose,
  onUpdated,
  showToast,
}) {
  const currentScope =
    pr.highlightScope === "overall" || pr.highlightScope === "collection"
      ? pr.highlightScope
      : "none";
  const isCurrentlyHighlighted = currentScope !== "none";

  const [view, setView] = useState(isCurrentlyHighlighted ? "manage" : "select");
  const [selected, setSelected] = useState(
    isCurrentlyHighlighted ? currentScope : null
  );
  const [saving, setSaving] = useState(false);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const persistScope = async (scope) => {
    const res = await api.put(
      `/api/collections/${collectionSlug}/contributions/${pr._id}/highlight`,
      { highlightScope: scope }
    );
    onUpdated?.(res.data.contribution || res.data);
    return res;
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await persistScope(selected);
      showToast?.("Highlight updated", "success");
      onClose();
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to update highlight", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await persistScope("none");
      showToast?.("Highlight removed", "success");
      onClose();
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to remove highlight", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════ MANAGE VIEW ═══════════════════════ */
  if (view === "manage") {
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-md rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#6A1B2E]/20">
                <Star className="w-4 h-4 text-[#C48A97] fill-[#C48A97]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Highlighted</h2>
                <p className="text-xs text-gray-500 truncate max-w-[260px]">{pr.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body: status + actions ── */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              This contribution is currently highlighted in{" "}
              <span className="text-white font-medium">{SCOPE_LABEL[currentScope]}</span>.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleRemove}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-900/60 disabled:opacity-60 py-2.5 rounded-xl font-medium text-gray-200 hover:text-white text-sm transition-colors border border-gray-700 hover:border-red-800"
              >
                <StarOff className="w-4 h-4" />
                {saving ? "Removing…" : "Remove Highlight"}
              </button>
              <button
                onClick={() => {
                  setSelected(currentScope);
                  setView("select");
                }}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-[#6A1B2E]/20 hover:bg-[#6A1B2E]/40 disabled:opacity-60 py-2.5 rounded-xl font-medium text-[#D9AAB4] hover:text-white text-sm transition-colors border border-[#6A1B2E]/40 hover:border-[#93304A]/70"
              >
                <Pencil className="w-3.5 h-3.5" />
                Change Highlight
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ SELECT VIEW ═══════════════════════ */
  const isChanging = isCurrentlyHighlighted;
  const title = isChanging ? "Change Highlight" : "Add to Highlights";

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#6A1B2E]/20">
              <Star className="w-4 h-4 text-[#C48A97]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="text-xs text-gray-500 truncate max-w-[260px]">{pr.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body: radio options ── */}
        <div className="overflow-y-auto maroon-scroll flex-1 px-6 py-5">
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Highlight scope</legend>
            {SCOPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`
                  flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors
                  ${selected === opt.value
                    ? "border-[#93304A] bg-[#6A1B2E]/20"
                    : "border-gray-700 bg-gray-900 hover:bg-gray-800"
                  }
                `}
              >
                <input
                  type="radio"
                  name="highlightScope"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="mt-1 w-4 h-4 accent-[#6A1B2E] shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </fieldset>
        </div>

        {/* ── Footer: Save / Cancel (or Back, when changing) ── */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 py-2.5 rounded-xl text-gray-200 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}