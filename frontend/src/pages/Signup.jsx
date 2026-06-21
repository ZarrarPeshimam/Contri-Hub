import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, AtSign, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../lib/api";
import AuthLayout from "../components/auth/AuthLayout";
import AuthInput from "../components/auth/AuthInput";

/**
 * Signup
 *
 * Collects only what's needed to create a useful account:
 * display name, username, email, password.
 *
 * Bio, avatar, GitHub username, LinkedIn, and portfolio links all exist on
 * the User model but are intentionally left out here — they're completed
 * later from Settings, once there's actually an account to attach them to.
 */
export default function Signup() {
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/api/auth/signup", form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building your open-source portfolio."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Log in
          </Link>
        </>
      }
    >
      {success ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <span className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-amber-400" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Account created</p>
            <p className="text-xs text-gray-500">Taking you to the login page…</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <AuthInput
            id="displayName"
            label="Display name"
            icon={User}
            value={form.displayName}
            onChange={update("displayName")}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />

          <AuthInput
            id="username"
            label="Username"
            icon={AtSign}
            value={form.username}
            onChange={update("username")}
            placeholder="adalovelace"
            autoComplete="username"
            helperText="This becomes your profile URL and can't be changed later."
            required
          />

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
            autoComplete="new-password"
            minLength={6}
            helperText="At least 6 characters."
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
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-[11px] text-gray-600 text-center leading-relaxed">
            You can add a bio, social links, and avatar later from your profile settings.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}