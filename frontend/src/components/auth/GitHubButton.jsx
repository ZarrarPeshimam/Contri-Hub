import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * "Continue with GitHub" — kicks off the OAuth flow by navigating the
 * whole browser (not an axios call) to the backend's /api/auth/github
 * route, which immediately redirects to GitHub's consent screen.
 *
 * `loading` is local and brief (there's a full-page navigation right
 * after), but it still prevents a double-click from opening two GitHub
 * consent tabs' worth of confusion before the redirect fires.
 */
export default function GitHubButton({ label = "Continue with GitHub" }) {
  const [loading, setLoading] = useState(false);

  const startGitHubAuth = () => {
    setLoading(true);
    const base = import.meta.env.VITE_API_BASE_URL;
    window.location.href = `${base}/api/auth/github`;
  };

  return (
    <button
      type="button"
      onClick={startGitHubAuth}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <GitHubIcon className="w-4 h-4" />
      )}
      {loading ? "Redirecting…" : label}
    </button>
  );
}

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.89-.39.98.01 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.44-2.69 5.42-5.26 5.7.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.21.66.8.55A10.51 10.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}
