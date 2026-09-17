import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";
import GitHubButton from "../components/auth/GitHubButton";

const GITHUB_ERROR_MESSAGES = {
  access_denied: "GitHub sign-in was cancelled.",
  invalid_state: "Your GitHub session expired. Please try again.",
  oauth_failed: "Something went wrong connecting your GitHub account.",
};

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const githubError = new URLSearchParams(location.search).get("github_error");
  const [error, setError] = useState(
    githubError ? GITHUB_ERROR_MESSAGES[githubError] || "GitHub sign-in failed." : ""
  );
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", form);
      login(res.data.token, res.data.user);

      // Redirect to the page the user originally tried to access,
      // or fall back to their profile.
      const from = location.state?.from?.pathname || `/${res.data.user.username}`;
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep building your portfolio."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Sign up
          </Link>
        </>
      }
    >
      <div className="space-y-4 mb-5">
        <GitHubButton label="Continue with GitHub" />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthInput
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <AuthInput
          id="password"
          label="Password"
          icon={Lock}
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="••••••••"
          autoComplete="current-password"
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
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm shadow-lg shadow-amber-500/20 transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}