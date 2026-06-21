import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Settings } from "lucide-react";

/**
 * ProfileHeader
 *
 * Displays user info.
 * Owner controls: Settings link, Logout button.
 * Public view: read-only.
 */
export default function ProfileHeader({ profile, isSelf, username }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Skeleton while profile data is loading
  if (!profile) {
    return (
      <div className="border-b border-gray-800 pb-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-48 mb-3" />
        <div className="h-4 bg-gray-800 rounded w-72" />
      </div>
    );
  }

  return (
    <div className="border-b border-gray-800 pb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{profile.username}</h1>

        {profile.githubUsername && (
          <p className="text-gray-400 mt-1 text-sm">
            GitHub:{" "}
            <a
              href={`https://github.com/${profile.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              @{profile.githubUsername}
            </a>
          </p>
        )}
      </div>

      {isSelf && (
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/settings"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
