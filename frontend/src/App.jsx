import { Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Layout from "./components/layout/Layout";
import ProfilePage from "./pages/ProfilePage";
import CollectionPage from "./features/collections/CollectionPage";
import OverallHighlightsPage from "./features/highlights/OverallHighlightsPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import OAuthCallback from "./pages/OAuthCallback";
import GitHubOnboarding from "./pages/GitHubOnboarding";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import ScrollToTop from "./components/routing/ScrollToTop";
import DeveloperCTA from "./components/ui/DeveloperCTA";

export default function App() {
  return (
    // reducedMotion="user" makes every framer-motion animation in the
    // app (page-entry transitions, tab underline/tab-switch animations)
    // automatically no-op for prefers-reduced-motion users, in one place.
    <MotionConfig reducedMotion="user">
      {/* Route-aware scroll reset: lives once at the root so every route
          change (profile <-> highlights, and beyond) starts at the top
          instead of inheriting the previous route's scroll position. */}
      <ScrollToTop />

      {/* Floating "Meet the developer" CTA — mounted once at the app
          root (not inside Layout) so it can appear on Login/Signup too,
          which render outside the Layout shell entirely. It decides its
          own visibility per-route internally, independent of where it's
          mounted. */}
      <DeveloperCTA />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth pages — no shell */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          }
        />

        {/* GitHub OAuth — no shell, not gated by GuestRoute since these
            pages manage the not-yet-authenticated -> authenticated
            transition themselves. */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/signup/github" element={<GitHubOnboarding />} />

        {/* App pages — wrapped in Layout */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/:username"
          element={
            <Layout>
              <ProfilePage />
            </Layout>
          }
        />

        <Route
          path="/:username/highlights"
          element={
            <Layout>
              <OverallHighlightsPage />
            </Layout>
          }
        />

        <Route
          path="/:username/:slug"
          element={
            <Layout>
              <CollectionPage />
            </Layout>
          }
        />
      </Routes>
    </MotionConfig>
  );
}