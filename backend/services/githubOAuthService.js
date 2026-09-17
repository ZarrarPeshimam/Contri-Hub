import axios from "axios";

/**
 * githubOAuthService.js — GitHub OAuth ("Continue with GitHub") helpers.
 *
 * Deliberately separate from services/githubService.js, which talks to the
 * GitHub API on behalf of the app (via GITHUB_TOKEN) to pull PR data.
 * This file talks to GitHub on behalf of a *user* during the OAuth
 * authorization-code flow — different credentials, different purpose.
 */

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_USER_URL = "https://api.github.com/user";
const GITHUB_API_EMAILS_URL = "https://api.github.com/user/emails";

/**
 * Builds the URL we send the user's browser to in order to kick off
 * GitHub's OAuth consent screen.
 *
 * @param {string} state - opaque, server-signed anti-CSRF token
 */
export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchanges a one-time authorization `code` for a GitHub access token.
 * Throws if GitHub rejects the exchange (bad/expired code, mismatched
 * redirect_uri, etc).
 */
export async function exchangeCodeForToken(code) {
  const res = await axios.post(
    GITHUB_TOKEN_URL,
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
    },
    { headers: { Accept: "application/json" } }
  );

  if (!res.data?.access_token) {
    throw new Error(res.data?.error_description || "GitHub token exchange failed");
  }

  return res.data.access_token;
}

/**
 * Fetches the authenticated GitHub user's public profile, and — if their
 * primary email isn't public on the profile itself — falls back to the
 * /user/emails endpoint (requires the user:email scope) to find their
 * verified primary email.
 *
 * Returns a normalized shape; `email` may be null if the user has no
 * verified email or has hidden it entirely, which the caller must handle
 * (GitHub-only accounts are allowed to have no email at all).
 */
export async function fetchGitHubProfile(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github.v3+json",
  };

  const { data: profile } = await axios.get(GITHUB_API_USER_URL, { headers });

  let email = profile.email || null;

  if (!email) {
    try {
      const { data: emails } = await axios.get(GITHUB_API_EMAILS_URL, { headers });
      const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
      email = primary?.email || null;
    } catch {
      // user:email scope missing or request failed — proceed without email.
      email = null;
    }
  }

  const resolved = {
    githubId: String(profile.id),
    githubUsername: profile.login,
    avatarUrl: profile.avatar_url || "",
    email,
  };

  // Temporary diagnostic log — safe to remove once account linking is
  // confirmed working end to end. Logs no tokens/secrets, just the
  // public-ish profile fields used for matching/onboarding.
  console.log("[github-oauth] resolved profile:", resolved);

  return resolved;
}