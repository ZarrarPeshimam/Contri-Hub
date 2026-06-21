import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings, LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Avatar from "../ui/Avatar";

/**
 * Navbar — persistent top bar for all authenticated pages.
 *
 * Left:  app logo / wordmark
 * Right: settings icon · avatar (opens dropdown with profile link + logout)
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to={`/${user.username}`}
          className="flex items-center gap-2 group"
        >
          <span className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm select-none">
            C
          </span>
          <span className="font-semibold text-white tracking-tight hidden sm:block">
            ContriHub
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <Link
            to="/settings"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="ml-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
              aria-label="Account menu"
              aria-expanded={open}
            >
              <Avatar
                avatarUrl={user.avatarUrl}
                displayName={user.displayName}
                username={user.username}
                size="sm"
              />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-gray-900 shadow-xl shadow-black/40 py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                {/* Identity mini-header */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                </div>

                <Link
                  to={`/${user.username}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <User className="w-4 h-4 shrink-0" />
                  View profile
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Settings
                </Link>

                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
