import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";

/**
 * SettingsPage
 *
 * Two sections:
 * 1. Profile — identity fields (displayName, bio, social links, avatarUrl)
 * 2. Behavior — existing toggle settings
 *
 * Back navigation is handled by the Navbar (logo click → profile).
 */
export default function SettingsPage() {
  const { user, login } = useAuth();

  // --- Behavior settings ---
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // --- Profile ---
  const [profile, setProfile] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    githubUsername: "",
    linkedinUrl: "",
    portfolioUrl: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Seed profile form from auth context once loaded
  useEffect(() => {
    if (user) {
      setProfile({
        displayName:    user.displayName    || "",
        bio:            user.bio            || "",
        avatarUrl:      user.avatarUrl      || "",
        githubUsername: user.githubUsername || "",
        linkedinUrl:    user.linkedinUrl    || "",
        portfolioUrl:   user.portfolioUrl   || "",
      });
    }
  }, [user]);

  useEffect(() => {
    api
      .get("/api/collections/settings")
      .then((res) => setSettings(res.data))
      .catch(() => setSettingsError("Failed to load settings"))
      .finally(() => setLoadingSettings(false));
  }, []);

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedSettings(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSavedSettings(false);
    setSettingsError("");
    try {
      const res = await api.put("/api/collections/settings", settings);
      setSettings(res.data);
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 3000);
    } catch {
      setSettingsError("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setSavedProfile(false);
    setProfileError("");
    try {
      const res = await api.patch("/api/auth/me/profile", profile);
      // Update auth context so navbar reflects the new displayName/avatar immediately
      const token = localStorage.getItem("token");
      login(token, res.data);
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">

      {/* Page header */}
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* ── Profile Section ── */}
      <section className="space-y-4">
        <SectionLabel>Profile</SectionLabel>

        <div className="rounded-xl border border-amber-500/15 bg-amber-950/20 divide-y divide-white/[0.06] shadow-[0_0_30px_rgba(245,158,11,0.08)]">
          <ProfileField
            label="Display name"
            description="Shown in place of your username throughout the UI."
            value={profile.displayName}
            onChange={(v) => setProfile((p) => ({ ...p, displayName: v }))}
            placeholder={user?.username}
          />
          <ProfileField
            label="Bio"
            description="A short description shown on your profile card."
            value={profile.bio}
            onChange={(v) => setProfile((p) => ({ ...p, bio: v }))}
            placeholder="e.g. Full-stack engineer · open source enthusiast"
            multiline
          />
          <ProfileField
            label="Avatar URL"
            description="Direct link to a profile image. Leave blank to use initials."
            value={profile.avatarUrl}
            onChange={(v) => setProfile((p) => ({ ...p, avatarUrl: v }))}
            placeholder="https://example.com/avatar.jpg"
          />
          <ProfileField
            label="GitHub username"
            description="Your GitHub handle (without @). Used to build your GitHub profile link."
            value={profile.githubUsername}
            onChange={(v) => setProfile((p) => ({ ...p, githubUsername: v }))}
            placeholder="octocat"
          />
          <ProfileField
            label="LinkedIn URL"
            description="Your full LinkedIn profile URL."
            value={profile.linkedinUrl}
            onChange={(v) => setProfile((p) => ({ ...p, linkedinUrl: v }))}
            placeholder="https://linkedin.com/in/yourname"
          />
          <ProfileField
            label="Portfolio URL"
            description="Link to your personal site or portfolio."
            value={profile.portfolioUrl}
            onChange={(v) => setProfile((p) => ({ ...p, portfolioUrl: v }))}
            placeholder="https://yoursite.com"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white font-medium transition-all text-sm shadow-lg shadow-amber-500/20"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
          {savedProfile && <span className="text-sm text-amber-400">Profile saved ✓</span>}
          {profileError && <span className="text-sm text-red-400">{profileError}</span>}
        </div>
      </section>

      {/* ── Behavior Section ── */}
      <section className="space-y-4">
        <SectionLabel>Behavior</SectionLabel>

        {loadingSettings ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-amber-950/20" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/15 bg-amber-950/20 divide-y divide-white/[0.06] shadow-[0_0_30px_rgba(245,158,11,0.08)]">
              <div className="px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  GitHub Integration
                </p>
              </div>

              <SettingRow
                label="Auto-detect linked issues"
                description="Automatically extract issue numbers from PR titles and descriptions when adding or fetching PRs. Patterns like 'closes #50' and 'fixes #12' are supported."
                value={settings?.autoDetectIssues ?? true}
                onToggle={() => toggleSetting("autoDetectIssues")}
              />
              <SettingRow
                label="Auto-refresh PR metadata"
                description="Periodically refresh PR status and merge dates from GitHub."
                value={settings?.autoRefreshMetadata ?? false}
                onToggle={() => toggleSetting("autoRefreshMetadata")}
                badge="Coming soon"
                disabled={true}
              />
            </div>

            <div className="rounded-xl border border-amber-500/15 bg-amber-950/20 divide-y divide-white/[0.06] shadow-[0_0_30px_rgba(245,158,11,0.08)]">
              <div className="px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  AI
                </p>
              </div>
              <SettingRow
                label="Auto AI summaries"
                description="Automatically generate a polished contribution description for each PR during GitHub sync. If generation fails, the original GitHub description is used as fallback."
                value={settings?.autoAISummary ?? false}
                onToggle={() => toggleSetting("autoAISummary")}
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white font-medium transition-all text-sm shadow-lg shadow-amber-500/20"
              >
                {savingSettings ? "Saving…" : "Save settings"}
              </button>
              {savedSettings && <span className="text-sm text-amber-400">Settings saved ✓</span>}
              {settingsError && <span className="text-sm text-red-400">{settingsError}</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">
      {children}
    </h2>
  );
}

function ProfileField({ label, description, value, onChange, placeholder, multiline }) {
  return (
    <div className="px-5 py-4 space-y-1.5">
      <label className="text-sm font-medium text-white block">{label}</label>
      {description && (
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full mt-1 rounded-lg bg-zinc-900 border border-amber-500/20 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/40 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-1 rounded-lg bg-zinc-900 border border-amber-500/20 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/40"
        />
      )}
    </div>
  );
}

function SettingRow({ label, description, value, onToggle, badge, disabled }) {
  return (
    <div className={`flex items-start justify-between gap-6 px-5 py-4 transition-opacity duration-200 ${disabled ? "opacity-40" : ""}`}>
      <div className="space-y-0.5 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{label}</p>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400/80 font-medium border border-amber-500/10">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>

      <button
        disabled={disabled}
        onClick={disabled ? undefined : onToggle}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 
          ${disabled ? "pointer-events-none cursor-not-allowed" : ""} 
          ${value ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-zinc-800 border border-white/10"}`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}