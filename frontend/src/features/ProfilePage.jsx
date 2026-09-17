import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProfileCard from "../components/layout/ProfileCard";
import CollectionsGrid from "./collections/CollectionsGrid";
import AddCollectionModal from "../components/cards/AddCollectionModal";
import { useToast, ToastContainer } from "../components/ui/Toast";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ProfileTabs from "./profile/ProfileTabs";
import ActivityTab from "./profile/ActivityTab";
import PageTransition from "../components/layout/PageTransition";

// Logical left-to-right order of all three tabs (Highlights included, even
// though it's a routed page — see handleTabChange below) so the direction
// of travel between any two of them is well-defined: 0 = Collections,
// 1 = Activity, 2 = Highlights.
const TAB_ORDER = ["collections", "activity", "highlights"];

// Direction-aware slide+fade variants for the tab content panel.
// `direction` is +1 when moving to a tab further right in TAB_ORDER
// (e.g. Collections -> Activity) and -1 when moving left
// (e.g. Activity -> Collections):
//   direction > 0: outgoing content exits LEFT, incoming enters from the RIGHT
//   direction < 0: outgoing content exits RIGHT, incoming enters from the LEFT
const tabVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
  }),
};

export default function ProfilePage({ username }) {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  const isSelf = !authLoading && user?.username === username;

  const [profileUser, setProfileUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toasts, showToast, dismiss } = useToast();

  // Active profile tab. Collections is always the default — on first
  // visit, on refresh, and on every return to this page — by design.
  // This is plain component state on purpose: it is never written to
  // localStorage, sessionStorage, the URL, or a cookie, so it always
  // resets when the component remounts.
  const [activeTab, setActiveTab] = useState("collections");

  // Tracks travel direction for the tab-content slide animation: +1 when
  // the most recent tab change moved right in TAB_ORDER, -1 when it moved
  // left. Read by the AnimatePresence/motion.div below via `custom`.
  const [tabDirection, setTabDirection] = useState(0);

  // Only true while a tab-switch slide is actually in flight. Card
  // borders/shadows in CollectionsGrid extend slightly past the panel's
  // own box, so clipping (overflow-hidden) must be OFF at rest — otherwise
  // it permanently cuts off card borders/glow along the container edges.
  // It only needs to be ON for the ~220ms the panel is sliding, so the
  // ±24px horizontal travel doesn't create a scrollbar or poke past the
  // layout edge.
  const [isTabAnimating, setIsTabAnimating] = useState(false);

  const lastSavedOrder = useRef([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, colRes] = await Promise.all([
          api.get(`/api/users/${username}`),
          api.get(`/api/users/${username}/collections`),
        ]);

        if (!cancelled) {
          setProfileUser(userRes.data);
          setCollections(colRes.data);
          lastSavedOrder.current = colRes.data;
        }
      } catch (err) {
        if (!cancelled && err.response?.status === 404) {
          navigate("/404", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [username]);

  const handleReorder = useCallback(async (reorderedCollections) => {
    const previousOrder = lastSavedOrder.current;
    setCollections(reorderedCollections);

    try {
      await api.put("/api/collections/reorder", {
        orderedIds: reorderedCollections.map((c) => c._id),
      });
      lastSavedOrder.current = reorderedCollections;
    } catch {
      setCollections(previousOrder);
      showToast("Failed to save order. Changes reverted.", "error");
    }
  }, []);

  // Called by ProfileCard/AvatarUpload after a successful profile-picture
  // upload. Updates the profile shown on this page immediately (no reload)
  // and keeps the auth context (e.g. Navbar) in sync too.
  const handleAvatarUpdated = useCallback((avatarUrl, updatedUser) => {
    setProfileUser((prev) => (prev ? { ...prev, avatarUrl } : prev));
    showToast("Profile picture updated", "success");

    const token = localStorage.getItem("token");
    if (token) login(token, updatedUser);
  }, [login, showToast]);

  const handleAvatarError = useCallback((message) => {
    showToast(message || "Failed to upload profile picture", "error");
  }, [showToast]);

  // Highlights stays a dedicated route (`/:username/highlights`), not
  // inline tab content — clicking it navigates away exactly as before.
  // Collections/Activity are the only two tabs that ever become
  // `activeTab`, so this only ever computes a direction between those
  // two in practice, but it's written against the full TAB_ORDER so the
  // left/right logic stays correct regardless of which tab is involved.
  const handleTabChange = useCallback((tabId) => {
    if (tabId === "highlights") {
      navigate(`/${username}/highlights`);
      return;
    }

    setTabDirection((prevDirection) => {
      const fromIndex = TAB_ORDER.indexOf(activeTab);
      const toIndex = TAB_ORDER.indexOf(tabId);
      return toIndex > fromIndex ? 1 : toIndex < fromIndex ? -1 : prevDirection;
    });
    setIsTabAnimating(true);
    setActiveTab(tabId);
  }, [activeTab, navigate, username]);

  if (authLoading) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/*
        Page-entry transition + tab content lives inside PageTransition
        (a plain motion.div). The fixed-position FAB button, the add-
        collection modal overlay, and the toast container are kept as
        SIBLINGS below, outside of it: an ancestor with an in-progress
        `transform` (the page-entry animation animates translateY)
        briefly becomes the containing block for any `position: fixed`
        descendant, which would make those overlays jump/misposition for
        the ~180ms the transition is running. Keeping them outside avoids
        that entirely.
      */}
      <PageTransition className="space-y-8">
        <ProfileCard
          profile={profileUser}
          isSelf={isSelf}
          onAvatarUpdated={handleAvatarUpdated}
          onAvatarError={handleAvatarError}
        />

        <div className="space-y-6">
          <ProfileTabs active={activeTab} onChange={handleTabChange} />

          {/*
            overflow-hidden is only applied WHILE isTabAnimating is true —
            i.e. only for the ~220ms the panel is actually sliding ±24px.
            At rest it's off, so CollectionsGrid's card borders/glow (which
            extend slightly past the panel's own box) render exactly as
            designed instead of getting permanently clipped along the
            container edges.
          */}
          <div className={isTabAnimating ? "overflow-hidden" : undefined}>
            <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
              <motion.div
                key={activeTab}
                custom={tabDirection}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                onAnimationComplete={(definition) => {
                  // Fires once the incoming panel reaches "center" — safe
                  // to stop clipping again at that point (the outgoing
                  // panel's exit has already fully finished by then,
                  // since mode="wait" sequences exit before enter).
                  if (definition === "center") setIsTabAnimating(false);
                }}
              >
                {activeTab === "collections" ? (
                  <CollectionsGrid
                    loading={loading}
                    collections={collections}
                    username={username}
                    isSelf={isSelf}
                    onReorder={isSelf ? handleReorder : undefined}
                  />
                ) : (
                  <ActivityTab username={username} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </PageTransition>

      {isSelf && open && (
        <AddCollectionModal
          onClose={() => setOpen(false)}
          onCreated={(newCollection) => {
            setCollections((prev) => [newCollection, ...prev]);
            lastSavedOrder.current = [newCollection, ...lastSavedOrder.current];
            setOpen(false);
          }}
        />
      )}

      {isSelf && activeTab === "collections" && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-amber-800 hover:bg-amber-400 text-white p-4 shadow-lg transition"
        >
          + Add Collection
        </button>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}