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

export default function ProfilePage({ username }) {
  const { user, loading: authLoading } = useAuth();
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

  if (authLoading) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <ProfileCard profile={profileUser} isSelf={isSelf} />

      <div className="space-y-6">
        <ProfileTabs active={activeTab} onChange={setActiveTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
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