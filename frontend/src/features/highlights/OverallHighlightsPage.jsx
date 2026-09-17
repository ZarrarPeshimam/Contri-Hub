import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Timeline from "../../components/collections/Timeline";
import TimelineItem from "../../components/collections/TimelineItem";
import PRCard from "../../components/collections/PRCard";
import HighlightsNav from "../../components/highlights/HighlightsNav";
import HighlightsEmptyState from "../../components/highlights/HighlightsEmptyState";
import BackLink from "../../components/ui/BackLink";
import PageTransition from "../../components/layout/PageTransition";

/**
 * OverallHighlightsPage
 *
 * Profile → Highlights always lands here. Shows every contribution across
 * all of this user's collections where highlightScope === "overall",
 * newest first (filtered server-side).
 *
 * Presentation is intentionally the SAME contribution card/timeline used
 * on the Collection page (PRCard + Timeline) — not a bespoke showcase
 * card — rendered in `mode="showcase"` so owner-only editing actions
 * (Edit / Sync / Delete / AI Summarizer) are hidden while the Star
 * (Manage Highlight) control stays available to the owner.
 *
 * Since contributions here can come from any collection, each card gets
 * a `collectionBadge` so the source collection stays visible.
 */
export default function OverallHighlightsPage() {
  const { username } = useParams();
  const { user, loading: authLoading } = useAuth();

  const isSelf = !authLoading && user?.username === username;

  const [contributions, setContributions] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCardId, setOpenCardId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [highlightsRes, collectionsRes] = await Promise.all([
          api.get(`/api/users/${username}/highlights`),
          api.get(`/api/users/${username}/collections`),
        ]);

        if (!cancelled) {
          setContributions(highlightsRes.data.contributions || []);
          setCollections(collectionsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch overall highlights:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [username]);

  /**
   * A contribution can be un-highlighted directly from the Star control
   * on the card (via the existing Manage Highlight dialog). If it no
   * longer qualifies as "overall", drop it from this list; otherwise
   * just merge the updated fields in place.
   */
  const handleUpdated = (updatedPr) => {
    setContributions((prev) => {
      if (updatedPr.highlightScope !== "overall") {
        if (openCardId === updatedPr._id) setOpenCardId(null);
        return prev.filter((c) => c._id !== updatedPr._id);
      }
      return prev.map((c) => (c._id === updatedPr._id ? { ...c, ...updatedPr } : c));
    });
  };

  if (authLoading) return null;

  return (
    <PageTransition className="collection-theme mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/* Back to the profile this Highlights page belongs to */}
      <BackLink to={`/${username}`} label="Back to Profile" />

      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-gray-500">@{username}</p>
        <h1 className="text-3xl font-bold text-white">Highlights</h1>
      </div>

      <HighlightsNav mode="overall" username={username} collections={collections} />

      <div className="space-y-4 md:space-y-8">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && contributions.length === 0 && <HighlightsEmptyState />}

        {!loading && contributions.length > 0 && (
          <>
            {/* Mobile */}
            <div className="md:hidden space-y-4">
              {contributions.map((c) => (
                <PRCard
                  key={c._id}
                  pr={c}
                  collectionSlug={c.collectionId?.slug}
                  isSelf={isSelf}
                  mode="showcase"
                  collectionBadge={c.collectionId?.title}
                  isOpen={openCardId === c._id}
                  onToggle={() =>
                    setOpenCardId(openCardId === c._id ? null : c._id)
                  }
                  onUpdated={handleUpdated}
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
                      collectionSlug={c.collectionId?.slug}
                      isSelf={isSelf}
                      mode="showcase"
                      collectionBadge={c.collectionId?.title}
                      isOpen={openCardId === c._id}
                      onToggle={() =>
                        setOpenCardId(openCardId === c._id ? null : c._id)
                      }
                      onUpdated={handleUpdated}
                    />
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}