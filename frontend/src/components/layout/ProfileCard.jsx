import { Link } from "react-router-dom";
import { Github, Linkedin, Globe, Pencil } from "lucide-react";
import Avatar from "../ui/Avatar";

/**
 * ProfileCard
 *
 * GitHub/LinkedIn-style identity header with avatar on the right.
 *
 * Props:
 *   profile  – user object (displayName, username, bio, avatarUrl, socialLinks…)
 *   isSelf   – bool — shows Edit Profile button when true
 */
export default function ProfileCard({ profile, isSelf }) {
  if (!profile) return <ProfileCardSkeleton />;

  const displayName = profile.displayName || profile.username;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-orange-900/10 backdrop-blur-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row-reverse sm:items-start gap-6 sm:gap-8">
        
        {/* Avatar section - right side on sm+ */}
        <div className="flex flex-col items-center sm:items-end gap-3.5 shrink-0 self-center sm:self-start sm:mr-9">
          <Avatar
            avatarUrl={profile.avatarUrl}
            displayName={displayName}
            username={profile.username}
            size="xl"
            className="w-24 h-24 sm:w-32 sm:h-32" // slightly smaller
          />
          
          {/* Edit button moved below avatar */}
          {isSelf && (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-gray-300 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit profile
            </Link>
          )}
        </div>

        {/* Identity block - left side */}
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {displayName}
            </h1>
            <p className="text-amber-400/80 font-medium mt-0.5">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
              {profile.bio}
            </p>
          )}

          {/* Social chips */}
          <SocialLinks profile={profile} />
        </div>
      </div>
    </div>
  );
}

function SocialLinks({ profile }) {
  const links = [
    profile.githubUsername && {
      href: `https://github.com/${profile.githubUsername}`,
      label: profile.githubUsername,
      icon: Github,
      color: "hover:bg-gray-700/60 hover:text-white",
    },
    profile.linkedinUrl && {
      href: profile.linkedinUrl,
      label: "LinkedIn",
      icon: Linkedin,
      color: "hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20",
    },
    profile.portfolioUrl && {
      href: profile.portfolioUrl,
      label: "Portfolio",
      icon: Globe,
      color: "hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/20",
    },
  ].filter(Boolean);

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {links.map(({ href, label, icon: Icon, color }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-400 text-xs font-medium transition-colors ${color}`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </a>
      ))}
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gray-900/60 p-6 sm:p-8 animate-pulse">
      <div className="flex flex-col sm:flex-row-reverse gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-32 h-32 rounded-full bg-gray-800" />
          <div className="h-9 w-28 bg-gray-800 rounded-lg" />
        </div>
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-7 bg-gray-800 rounded-lg w-48" />
          <div className="h-4 bg-gray-800 rounded w-24" />
          <div className="h-4 bg-gray-800 rounded w-full max-w-sm" />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-800 rounded-full w-28" />
            <div className="h-7 bg-gray-800 rounded-full w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}