import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, Github, GitPullRequest, Pencil } from "lucide-react";
import AddContributionModal from "../../components/cards/AddContributionModal";
import AddGitHubPRModal from "../../components/cards/AddGitHubPRModal";
import EditCollectionModal from "../../components/collections/EditCollectionModal";
import Timeline from "../../components/collections/Timeline";
import TimelineItem from "../../components/collections/TimelineItem";
import PRCard from "../../components/collections/PRCard";
import CollectionSubNav from "../../components/collections/CollectionSubNav";
import HighlightsNav from "../../components/highlights/HighlightsNav";
import HighlightsEmptyState from "../../components/highlights/HighlightsEmptyState";
import FabMenu from "../../components/ui/FabMenu";
import BackLink from "../../components/ui/BackLink";
import { useToast, ToastContainer } from "../../components/ui/Toast";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import PageTransition from "../../components/layout/PageTransition";

/**
 * CollectionPage
 *
 * Owns BOTH tabs of a collection — Overview and Highlights — as views of
 * this single page, switched via `?tab=highlights` on the collection's
 * own URL (`/:username/:slug`). There is intentionally no separate
 * "CollectionHighlightsPage" route: Highlights is just another tab here,
 * exactly like Overview, so refresh/back/forward all behave like a
 * normal query-param tab and navigating in from Overall Highlights lands
 * squarely on this page with the Highlights tab pre-selected.
 *
 * Identity header intentionally removed — it lives in the global Navbar now.
 */
export default function CollectionPage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "highlights" ? "highlights" : "overview";

  const { user, loading: authLoading } = useAuth();
  const isSelf = !authLoading && user?.username === username;

  // Overview tab state
  const [collection, setCollection] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openGitHub, setOpenGitHub] = useState(false);
  const [openEditCollection, setOpenEditCollection] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const { toasts, showToast, dismiss } = useToast();

  // Highlights tab state — fetched lazily (only once the tab is opened),
  // kept separate from the Overview contributions list.
  const [highlightContributions, setHighlightContributions] = useState([]);
  const [highlightCollections, setHighlightCollections] = useState([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlightsLoaded, setHighlightsLoaded] = useState(false);
  const [highlightOpenCardId, setHighlightOpenCardId] = useState(null);

  // Collection header + Overview contributions.
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

  // Reset the Highlights tab's "already loaded" flag whenever the
  // collection itself changes (e.g. switching Gssoc → SWoC while already
  // on a Highlights tab), so the new collection's highlights get fetched.
  useEffect(() => {
    setHighlightsLoaded(false);
  }, [username, slug]);

  // Fetch Highlights tab data the first time it's opened for this collection.
  useEffect(() => {
    if (activeTab !== "highlights" || highlightsLoaded) return;
    let cancelled = false;

    const fetchHighlights = async () => {
      setHighlightsLoading(true);
      try {
        const [highlightsRes, collectionsRes] = await Promise.all([
          api.get(`/api/users/${username}/collections/${slug}/highlights`),
          api.get(`/api/users/${username}/collections`),
        ]);

        if (!cancelled) {
          setHighlightContributions(highlightsRes.data.contributions || []);
          setHighlightCollections(collectionsRes.data || []);
          setHighlightsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch collection highlights:", err);
      } finally {
        if (!cancelled) setHighlightsLoading(false);
      }
    };

    fetchHighlights();
    return () => { cancelled = true; };
  }, [activeTab, username, slug, highlightsLoaded]);

  const handleUpdated = (updatedPr) => {
    setContributions((prev) =>
      prev.map((c) => (c._id === updatedPr._id ? updatedPr : c))
    );
  };

  /**
   * A contribution can be un-highlighted directly from the Star control
   * on the card (via the existing Manage Highlight dialog). If it no
   * longer qualifies for this collection's showcase, drop it; otherwise
   * merge the updated fields in place.
   */
  const handleHighlightUpdated = (updatedPr) => {
    setHighlightContributions((prev) => {
      const stillQualifies = ["collection", "overall"].includes(updatedPr.highlightScope);
      if (!stillQualifies) {
        if (highlightOpenCardId === updatedPr._id) setHighlightOpenCardId(null);
        return prev.filter((c) => c._id !== updatedPr._id);
      }
      return prev.map((c) => (c._id === updatedPr._id ? { ...c, ...updatedPr } : c));
    });
  };

  const handleDeleted = (deletedId) => {
    setContributions((prev) => prev.filter((c) => c._id !== deletedId));
    if (openCardId === deletedId) setOpenCardId(null);
  };

  const handleCollectionUpdated = (updatedCollection) => {
    setCollection((prev) => (prev ? { ...prev, ...updatedCollection } : updatedCollection));
  };

  /**
   * Collection + all its contributions have already been deleted on the
   * server (cascade handled backend-side). Nothing left to render here —
   * just get the owner off this page and back to their collections.
   */
  const handleCollectionDeleted = () => {
    navigate(`/${username}`);
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
    <div className="collection-theme mx-auto max-w-6xl px-6 py-8">
      {/*
        Page-entry transition wraps the actual page content only. The
        fixed-position FabMenu and the two owner-only modals are kept as
        SIBLINGS below, outside of it — an ancestor with an in-progress
        `transform` (the page-entry animation animates translateY)
        briefly becomes the containing block for `position: fixed`
        descendants, which would make those overlays jump/misposition for
        the ~180ms the transition runs. Keeping them outside avoids that.
      */}
      <PageTransition className="space-y-8">

      {/* Back to the owning profile */}
      <BackLink to={`/${username}`} label="Back to Profile" />

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

          {isSelf && activeTab === "overview" && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setOpenEditCollection(true)}
                title="Edit collection description, or delete this collection"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors border border-white/[0.06]"
              >
                <Pencil className="w-4 h-4" />
                Edit Collection
              </button>
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

      {/* Overview | Highlights — both are views of THIS page */}
      {collection && (
        <CollectionSubNav username={username} slug={slug} active={activeTab} />
      )}

      {activeTab === "overview" ? (
        <>
          {/* Sync result banner */}
          {syncResult && (
            <div className="rounded-xl bg-[#45101D]/40 border border-[#6A1B2E]/40 px-5 py-3 text-sm text-[#D9AAB4] flex items-center gap-3">
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
        </>
      ) : (
        <>
          <HighlightsNav
            mode="collection"
            username={username}
            currentCollection={collection}
            collections={highlightCollections}
          />

          <div className="space-y-4 md:space-y-8">
            {highlightsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-800/60 animate-pulse" />
                ))}
              </div>
            )}

            {!highlightsLoading && highlightContributions.length === 0 && (
              <HighlightsEmptyState />
            )}

            {!highlightsLoading && highlightContributions.length > 0 && (
              <>
                {/* Mobile */}
                <div className="md:hidden space-y-4">
                  {highlightContributions.map((c) => (
                    <PRCard
                      key={c._id}
                      pr={c}
                      collectionSlug={collection?.slug}
                      isSelf={isSelf}
                      mode="showcase"
                      isOpen={highlightOpenCardId === c._id}
                      onToggle={() =>
                        setHighlightOpenCardId(
                          highlightOpenCardId === c._id ? null : c._id
                        )
                      }
                      onUpdated={handleHighlightUpdated}
                    />
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden md:block">
                  <Timeline>
                    {highlightContributions.map((c, index) => (
                      <TimelineItem key={c._id} index={index}>
                        <PRCard
                          pr={c}
                          collectionSlug={collection?.slug}
                          isSelf={isSelf}
                          mode="showcase"
                          isOpen={highlightOpenCardId === c._id}
                          onToggle={() =>
                            setHighlightOpenCardId(
                              highlightOpenCardId === c._id ? null : c._id
                            )
                          }
                          onUpdated={handleHighlightUpdated}
                        />
                      </TimelineItem>
                    ))}
                  </Timeline>
                </div>
              </>
            )}
          </div>
        </>
      )}

      </PageTransition>

      {/* Owner-only modals — Overview tab actions only */}
      {isSelf && activeTab === "overview" && open && (
        <AddContributionModal
          collectionSlug={collection?.slug}
          onClose={() => setOpen(false)}
          onCreated={(newContribution) => {
            setContributions((prev) => [newContribution, ...prev]);
            setOpen(false);
          }}
        />
      )}

      {isSelf && activeTab === "overview" && openGitHub && (
        <AddGitHubPRModal
          collectionSlug={collection?.slug}
          onClose={() => setOpenGitHub(false)}
          onFetched={(newContributions) => {
            setContributions((prev) => [...newContributions, ...prev]);
            setOpenGitHub(false);
            const n = newContributions.length;
            showToast(
              `${n} contribution${n === 1 ? "" : "s"} added`,
              "success"
            );
          }}
        />
      )}

      {isSelf && activeTab === "overview" && openEditCollection && collection && (
        <EditCollectionModal
          collection={collection}
          onClose={() => setOpenEditCollection(false)}
          onUpdated={handleCollectionUpdated}
          onDeleted={handleCollectionDeleted}
          showToast={showToast}
        />
      )}

      {/* Owner-only FAB menu — Overview tab only (Add/Fetch PR actions) */}
      {isSelf && activeTab === "overview" && (
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

      <ToastContainer toasts={toasts} dismiss={dismiss} position="bottom-right" />
    </div>
  );
}