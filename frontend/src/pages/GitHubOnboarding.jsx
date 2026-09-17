import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AtSign, Loader2, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";

/**
 * GitHubOnboarding
 *
 * The only screen a new GitHub signup sees before landing on their
 * dashboard. By design it asks for exactly one thing — a username —
 * because everything else (githubId, githubUsername, avatarUrl, email)
 * already came from GitHub via the pending token issued by
 * POST /api/auth/github/callback.
 *
 * The pendingToken is opaque to the frontend: we don't decode or trust
 * anything in it client-side beyond what the backend already reflected
 * back in router state. The backend re-verifies it on submit.
 */
export default function GitHubOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const pendingToken = location.state?.pendingToken;
  const suggestedUsername = location.state?.githubUsername || "";
  const avatarUrl = location.state?.avatarUrl || "";

  const [username, setUsername] = useState(suggestedUsername);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Refresh or direct navigation with no pending token — nothing to
  // onboard, send them back to start the GitHub flow properly.
  if (!pendingToken) {
    return (
      <AuthLayout title="Session expired" subtitle="Let's start over.">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <p className="text-sm text-gray-400">
            We couldn&apos;t find your GitHub session. Please try connecting again.
          </p>
          <Link
            to="/signup"
            className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Back to signup
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/github/complete-signup", {
        pendingToken,
        username: username.trim(),
      });
      login(res.data.token, res.data.user);
      navigate(`/${res.data.user.username}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create your account");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Complete your account"
      subtitle={`GitHub: @${suggestedUsername || "..."}`}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-950/20 px-4 py-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full border border-white/10 shrink-0"
            />
          ) : (
            <span className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              @{suggestedUsername}
            </p>
            <p className="text-xs text-gray-500">Connected via GitHub</p>
          </div>
        </div>

        <AuthInput
          id="username"
          label="Username"
          icon={AtSign}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="octocat"
          autoComplete="username"
          helperText="This becomes your profile URL. Prefilled from GitHub — feel free to change it."
          required
        />

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm shadow-lg shadow-amber-500/20 transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}
