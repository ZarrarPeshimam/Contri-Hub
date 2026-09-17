import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/auth/AuthLayout";

/**
 * OAuthCallback
 *
 * Lands here after backend/routes/authroutes.js's GET /github/callback
 * redirects the browser back to the SPA. Two possible query shapes:
 *
 *  - ?token=<jwt>
 *      GitHub account was already linked, or matched an existing user's
 *      email and got linked just now. We're logged in — fetch the user
 *      and go to their dashboard.
 *
 *  - ?signup=1&pendingToken=<jwt>
 *      No existing user found. Hand the pending token off to the
 *      onboarding screen, which is the only place a real account gets
 *      created from GitHub data.
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    // Effects can double-fire in dev (StrictMode); this is a one-shot
    // navigation step so guard against running the exchange twice.
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get("token");
    const isSignup = searchParams.get("signup") === "1";
    const pendingToken = searchParams.get("pendingToken");
    const githubUsername = searchParams.get("githubUsername") || "";
    const avatarUrl = searchParams.get("avatarUrl") || "";

    if (isSignup && pendingToken) {
      navigate("/signup/github", {
        replace: true,
        state: { pendingToken, githubUsername, avatarUrl },
      });
      return;
    }

    if (!token) {
      setError("Something went wrong connecting your GitHub account.");
      return;
    }

    (async () => {
      try {
        // /api/auth/me reads the token via api.js's request interceptor,
        // so it needs to be in localStorage before we call it.
        localStorage.setItem("token", token);
        const res = await api.get("/api/auth/me");
        login(token, res.data);
        navigate(`/${res.data.username}`, { replace: true });
      } catch {
        localStorage.removeItem("token");
        setError("Something went wrong connecting your GitHub account.");
      }
    })();
  }, [searchParams, navigate, login]);

  return (
    <AuthLayout title="Connecting to GitHub" subtitle="Just a moment…">
      {error ? (
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 w-full">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Back to login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          <p className="text-sm text-gray-400">Signing you in…</p>
        </div>
      )}
    </AuthLayout>
  );
}
