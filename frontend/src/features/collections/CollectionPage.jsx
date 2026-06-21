import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Github, GitPullRequest } from "lucide-react";
import AddContributionModal from "../../components/cards/AddContributionModal";
import AddGitHubPRModal from "../../components/cards/AddGitHubPRModal";
import Timeline from "../../components/collections/Timeline";
import TimelineItem from "../../components/collections/TimelineItem";
import PRCard from "../../components/collections/PRCard";
import FabMenu from "../../components/ui/FabMenu";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

/**
 * CollectionPage
 *
 * Identity header intentionally removed — it lives in the global Navbar now.
 * This page shows only: collection title + description, sync controls, contributions.
 */
export default function CollectionPage() {
  const { username, slug } = useParams();
  const { user, loading: authLoading } = useAuth();

  const isSelf = !authLoading && user?.username === username;

  const [collection, setCollection] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openGitHub, setOpenGitHub] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const contribRes = await api.get(
          `/api/users/${username}/collections/${slug}/contributions`
        );

        if (!cancelled) {
          setCollection(contribRes.data.collection);
          setContributions(contribRes.data.contributions || []);
        }
      } catch (err) {
        console.error("Failed to fetch collection:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [username, slug]);

  const handleUpdated = (updatedPr) => {
    setContributions((prev) =>
      prev.map((c) => (c._id === updatedPr._id ? updatedPr : c))
    );
  };

  const handleDeleted = (deletedId) => {
    setContributions((prev) => prev.filter((c) => c._id !== deletedId));
    if (openCardId === deletedId) setOpenCardId(null);
  };

  const handleSyncIssues = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post(`/api/collections/${slug}/sync-issues`);
      setSyncResult(res.data);

      const contribRes = await api.get(
        `/api/users/${username}/collections/${slug}/contributions`
      );
      setContributions(contribRes.data.contributions || []);

      setTimeout(() => setSyncResult(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">

      {/* Collection header row */}
      {collection ? (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-widest text-gray-500">
              @{username}
            </p>
            <h1 className="text-3xl font-bold text-white">{collection.title}</h1>
            {collection.description && (
              <p className="text-gray-400 text-sm leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>

          {isSelf && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSyncIssues}
                disabled={syncing}
                title="Re-scan all PR titles and descriptions for issue references"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/[0.06]"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Issues"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-800 rounded w-20" />
          <div className="h-8 bg-gray-800 rounded w-56" />
        </div>
      )}

      {/* Sync result banner */}
      {syncResult && (
        <div className="rounded-xl bg-violet-900/30 border border-violet-500/30 px-5 py-3 text-sm text-violet-200 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span>
            Sync complete —{" "}
            <strong>{syncResult.updated}</strong> updated,{" "}
            <strong>{syncResult.skipped}</strong> already up to date
            {syncResult.total > 0 &&
              ` (${syncResult.total} total contributions)`}
          </span>
        </div>
      )}

      {/* Contributions */}
      <div className="space-y-4 md:space-y-8">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && contributions.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
            <p className="text-gray-500 text-sm">No contributions yet.</p>
            {isSelf && (
              <p className="text-gray-600 text-xs mt-1">
                Use "Add PR" or "Fetch GitHub PRs" to get started.
              </p>
            )}
          </div>
        )}

        {!loading && contributions.length > 0 && (
          <>
            {/* Mobile */}
            <div className="md:hidden space-y-4">
              {contributions.map((c) => (
                <PRCard
                  key={c._id}
                  pr={c}
                  collectionSlug={collection?.slug}
                  isSelf={isSelf}
                  isOpen={openCardId === c._id}
                  onToggle={() =>
                    setOpenCardId(openCardId === c._id ? null : c._id)
                  }
                  onUpdated={handleUpdated}
                  onDeleted={isSelf ? handleDeleted : undefined}
                />
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <Timeline>
                {contributions.map((c, index) => (
                  <TimelineItem key={c._id} index={index}>
                    <PRCard
                      pr={c}
                      collectionSlug={collection?.slug}
                      isSelf={isSelf}
                      isOpen={openCardId === c._id}
                      onToggle={() =>
                        setOpenCardId(openCardId === c._id ? null : c._id)
                      }
                      onUpdated={handleUpdated}
                      onDeleted={isSelf ? handleDeleted : undefined}
                    />
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
          </>
        )}
      </div>

      {/* Owner-only modals */}
      {isSelf && open && (
        <AddContributionModal
          collectionSlug={collection?.slug}
          onClose={() => setOpen(false)}
          onCreated={(newContribution) => {
            setContributions((prev) => [newContribution, ...prev]);
            setOpen(false);
          }}
        />
      )}

      {isSelf && openGitHub && (
        <AddGitHubPRModal
          collectionSlug={collection?.slug}
          onClose={() => setOpenGitHub(false)}
          onFetched={(newContributions) => {
            setContributions((prev) => [...newContributions, ...prev]);
            setOpenGitHub(false);
          }}
        />
      )}

      {/* Owner-only FAB menu */}
      {isSelf && (
        <FabMenu
          actions={[
            {
              label: "Fetch GitHub PRs",
              icon: <Github className="w-5 h-5" />,
              onClick: () => setOpenGitHub(true),
            },
            {
              label: "Add PR",
              icon: <GitPullRequest className="w-5 h-5" />,
              onClick: () => setOpen(true),
            },
          ]}
        />
      )}
    </div>
  );
}