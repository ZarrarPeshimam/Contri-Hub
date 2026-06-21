import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProfilePage from "./pages/ProfilePage";
import CollectionPage from "./features/collections/CollectionPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";

export default function App() {
  return (
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
        path="/:username/:slug"
        element={
          <Layout>
            <CollectionPage />
          </Layout>
        }
      />
    </Routes>
  );
}
