import { useState } from "react";
import api from "../../lib/api";
import { Edit2, Trash2, ExternalLink, GitBranch, Sparkles, Link2, Loader2 } from "lucide-react";
import { cleanMarkdown } from "../../lib/github";
import LinkedIssuesEditor from "./LinkedIssuesEditor";
import AISummarizerModal from "./AISummarizerModal";
import { useToast, ToastContainer } from "../ui/Toast";

export default function PRCard({
  pr,
  isOpen,
  onToggle,
  onUpdated,
  onDeleted,
  collectionSlug,
}) {
  /* ── Edit mode ── */
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title:        pr.title        || "",
    description:  pr.description  || "",
    url:          pr.url          || "",
    linkedIssues: pr.linkedIssues || [],
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Per-contribution issue sync ── */
  const [syncing, setSyncing] = useState(false);

  /* ── AI modal ── */
  const [aiOpen, setAiOpen] = useState(false);

  /* ── Local toasts ── */
  const { toasts, showToast, dismiss } = useToast();

  const isOwner = Boolean(onDeleted);

  /* ── Handlers ── */

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(
        `/api/collections/${collectionSlug}/contributions/${pr._id}/edit`,
        {
          title:        formData.title,
          description:  formData.description,
          url:          formData.url,
          linkedIssues: formData.linkedIssues,
        }
      );
      onUpdated?.(res.data.contribution || res.data);
      setIsEditing(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contribution?")) return;
    setDeleting(true);
    try {
      await api.delete(
        `/api/collections/${collectionSlug}/contributions/${pr._id}/delete`
      );
      onDeleted?.(pr._id);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      title:        pr.title        || "",
      description:  pr.description  || "",
      url:          pr.url          || "",
      linkedIssues: pr.linkedIssues || [],
    });
  };

  /**
   * Per-contribution issue sync.
   * Calls POST /api/collections/:slug/contributions/:id/sync-issues.
   * On success, notifies the parent (onUpdated) so the card rerenders
   * with fresh linkedIssues without a full page reload.
   */
  const handleSyncIssues = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      const res = await api.post(
        `/api/collections/${collectionSlug}/contributions/${pr._id}/sync-issues`
      );
      onUpdated?.(res.data.contribution);
      showToast("Issues synced", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  /* ── Derived ── */
  const displayedIssues = isEditing ? formData.linkedIssues : pr.linkedIssues || [];
  const hasIssues = displayedIssues.length > 0;

  return (
    <>
      <div
        className="group relative w-full max-w-2xl overflow-hidden rounded-2xl bg-purple-950 border border-gray-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer"
        onClick={() => !isEditing && onToggle()}
      >

        {/* ── Owner hover buttons: Edit | Sync Issues | Delete ── */}
        {isOwner && (
          <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-2 bg-gray-900/90 hover:bg-violet-600 rounded-lg text-white transition-colors"
              title="Edit contribution"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Sync Issues */}
            <button
              onClick={handleSyncIssues}
              disabled={syncing}
              className="p-2 bg-gray-900/90 hover:bg-cyan-600 rounded-lg text-white transition-colors disabled:opacity-50"
              title="Re-scan PR for linked issue references"
            >
              {syncing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Link2 className="w-4 h-4" />
              }
            </button>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting}
              className="p-2 bg-gray-900/90 hover:bg-red-600 rounded-lg text-white transition-colors disabled:opacity-50"
              title="Delete contribution"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Top section (always visible) ── */}
        <div className="bg-gradient-to-b from-purple-950 to-purple-900 px-8 pt-7 pb-6">
          {isEditing ? (
            <>
              <input
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="w-full bg-transparent text-2xl font-semibold text-white border-b border-violet-500 focus:outline-none mb-3"
                placeholder="PR title"
              />
              <input
                value={formData.url}
                onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                className="w-full bg-transparent text-purple-400 text-base border-b border-violet-500 focus:outline-none"
                placeholder="https://github.com/user/repo/pull/123"
              />
            </>
          ) : (
            <>
              <h3 className="font-semibold text-2xl leading-tight text-white line-clamp-2">
                {pr.title}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                <a
                  href={pr.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-white text-base inline-flex items-center gap-1.5 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {pr.repo}
                  <ExternalLink className="w-5 h-5 flex-shrink-0" />
                </a>

                {/* Issue pills — collapsed view */}
                {hasIssues && !isOpen && (
                  <div className="flex flex-wrap gap-1.5">
                    {displayedIssues.map((issue) => (
                      <a
                        key={issue.issueNumber}
                        href={issue.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-900/60 border border-violet-500/30 text-violet-300 hover:text-white hover:border-violet-400 transition-colors font-mono"
                      >
                        <GitBranch className="w-2.5 h-2.5" />
                        #{issue.issueNumber}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Expandable bottom section ── */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-out bg-gradient-to-b from-purple-950 to-purple-900 border-t border-purple-800
            ${isOpen || isEditing ? "max-h-[620px]" : "max-h-0"}`}
        >
          <div className="px-8 py-6 max-h-[540px] overflow-y-auto custom-scroll space-y-5">
            {isEditing ? (
              /* ── Edit mode ── */
              <>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Add description..."
                  className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-300 resize-y text-sm"
                />

                <div onClick={(e) => e.stopPropagation()}>
                  <LinkedIssuesEditor
                    repo={pr.repo}
                    issues={formData.linkedIssues}
                    onChange={(updated) =>
                      setFormData((p) => ({ ...p, linkedIssues: updated }))
                    }
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 py-3 rounded-xl font-medium text-white transition-colors"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* ── Read mode ── */
              <>
                {pr.description ? (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {cleanMarkdown(pr.description)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No description available.</p>
                )}

                {/* Linked issues — expanded view */}
                {hasIssues && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      <GitBranch className="w-3.5 h-3.5" />
                      Linked Issues
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {displayedIssues.map((issue) => (
                        <a
                          key={issue.issueNumber}
                          href={issue.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-900/60 border border-violet-500/30 text-violet-300 hover:text-white hover:border-violet-400 transition-colors"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono">#{issue.issueNumber}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {pr.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pr.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-full bg-black/30 text-purple-200 border border-purple-500/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Owner: AI Summarizer footer button ── */}
                {isOwner && (
                  <div className="pt-1 border-t border-purple-800/60">
                    <button
                      onClick={(e) => { e.stopPropagation(); setAiOpen(true); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 hover:border-violet-400/60 text-violet-300 hover:text-white text-sm font-medium transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Summarizer
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Summarizer Modal ── */}
      {aiOpen && (
        <AISummarizerModal
          pr={pr}
          collectionSlug={collectionSlug}
          onClose={() => setAiOpen(false)}
          onUpdated={onUpdated}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  );
}
