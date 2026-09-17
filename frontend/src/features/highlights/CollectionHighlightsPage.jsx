import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Timeline from "../../components/collections/Timeline";
import TimelineItem from "../../components/collections/TimelineItem";
import PRCard from "../../components/collections/PRCard";
import HighlightsNav from "../../components/highlights/HighlightsNav";
import HighlightsEmptyState from "../../components/highlights/HighlightsEmptyState";
import CollectionSubNav from "../../components/collections/CollectionSubNav";
import BackLink from "../../components/ui/BackLink";

/**
 * CollectionHighlightsPage
 *
 * Collection → Highlights always lands here for THAT collection. Shows
 * contributions belonging to this collection where highlightScope is
 * "collection" OR "overall" (an overall highlight automatically shows
 * up in its own collection's showcase too), newest first, filtered
 * server-side.
 *
 * Same PRCard + Timeline used on the normal Contributions view, rendered
 * in `mode="showcase"` so it behaves exactly like that page's cards minus
 * owner-only editing actions — Star (Manage Highlight) stays available.
 * No collection badge here since the current collection is already known.
 */
export default function CollectionHighlightsPage() {
  const { username, slug } = useParams();
  const { user, loading: authLoading } = useAuth();

  const isSelf = !authLoading && user?.username === username;

  const [collection, setCollection] = useState(null);
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
          api.get(`/api/users/${username}/collections/${slug}/highlights`),
          api.get(`/api/users/${username}/collections`),
        ]);

        if (!cancelled) {
          setCollection(highlightsRes.data.collection);
          setContributions(highlightsRes.data.contributions || []);
          setCollections(collectionsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch collection highlights:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [username, slug]);

  /**
   * If the Star control changes a contribution back to "none" (or to a
   * scope that no longer belongs here — it can't for a collection page,
   * but this stays generically correct), drop it from the list.
   */
  const handleUpdated = (updatedPr) => {
    setContributions((prev) => {
      const stillQualifies = ["collection", "overall"].includes(updatedPr.highlightScope);
      if (!stillQualifies) {
        if (openCardId === updatedPr._id) setOpenCardId(null);
        return prev.filter((c) => c._id !== updatedPr._id);
      }
      return prev.map((c) => (c._id === updatedPr._id ? { ...c, ...updatedPr } : c));
    });
  };

  if (authLoading) return null;

  return (
    <div className="collection-theme mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/*
        Back goes to THIS collection, not the profile — the existing
        HighlightsNav below already provides a "‹ Overall" breadcrumb for
        the Profile → Overall Highlights → Collection Highlights flow, so
        this link stays scoped to the Collection → Collection Highlights
        flow instead of duplicating/overriding that navigation.
      */}
      <BackLink to={`/${username}/${slug}`} label="Back to Collection" />

      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-gray-500">@{username}</p>
        <h1 className="text-3xl font-bold text-white">
          {collection ? `${collection.title} Highlights` : "Highlights"}
        </h1>
      </div>

      <CollectionSubNav username={username} slug={slug} active="highlights" />

      <HighlightsNav
        mode="collection"
        username={username}
        currentCollection={collection}
        collections={collections}
      />

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
                  collectionSlug={collection?.slug}
                  isSelf={isSelf}
                  mode="showcase"
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
                      collectionSlug={collection?.slug}
                      isSelf={isSelf}
                      mode="showcase"
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
    </div>
  );
}