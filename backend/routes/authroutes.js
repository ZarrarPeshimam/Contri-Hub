import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import avatarUpload from "../middleware/avatarUpload.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubProfile,
} from "../services/githubOAuthService.js";
import {
  detectImageMimeType,
  uploadAvatarBuffer,
} from "../services/avatarUploadService.js";

const router = express.Router();

/** Shared helper — safe user shape sent to the frontend */
const publicUser = (user) => ({
  _id:            user._id,
  username:       user.username,
  displayName:    user.displayName || user.username,
  email:          user.email,
  bio:            user.bio,
  avatarUrl:      user.avatarUrl,
  githubUsername: user.githubUsername,
  linkedinUrl:    user.linkedinUrl,
  portfolioUrl:   user.portfolioUrl,
  settings:       user.settings,
  // UI-facing hints only — see the pre-validate hook on the User model
  // for the actual "can this user log in with X" invariant.
  authProviders:  user.authProviders?.length ? user.authProviders : ["local"],
  githubLinked:   !!user.githubId,
});

/** Shared helper — issues the app's own JWT (same shape as local login) */
const signAppToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

/**
 * GET /api/auth/me
 * Rehydrate auth state on startup.
 */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/auth/me/profile
 * Update identity fields for the logged-in user.
 * username is intentionally excluded — it is immutable after signup.
 */
router.patch("/me/profile", auth, async (req, res) => {
  const ALLOWED = ["displayName", "bio", "avatarUrl", "githubUsername", "linkedinUrl", "portfolioUrl"];
  const updates = {};

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Basic URL validation for link fields
  const URL_FIELDS = ["linkedinUrl", "portfolioUrl", "avatarUrl"];
  for (const field of URL_FIELDS) {
    if (updates[field] && !/^https?:\/\/.+/.test(updates[field])) {
      return res.status(400).json({ message: `${field} must be a valid URL` });
    }
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch (err) {
    res.status(400).json({ message: err.message || "Update failed" });
  }
});

/**
 * PUT /api/auth/me/avatar
 * Uploads a new profile picture for the logged-in user.
 *
 * multipart/form-data, single file field named "avatar". Ownership is
 * enforced entirely server-side via req.userId (populated by the auth
 * middleware from the JWT) — nothing in the request body/params can
 * target another user's account.
 *
 * Validation happens in two layers before anything touches Cloudinary
 * or Mongo:
 *   1. multer (avatarUpload) — rejects unsupported client-reported
 *      MIME types and anything over 5MB before the request is even
 *      fully buffered.
 *   2. detectImageMimeType — sniffs the actual file bytes, since the
 *      client-reported MIME type and filename extension are both
 *      spoofable and are not treated as trustworthy on their own.
 *
 * If validation, the Cloudinary upload, or the DB write fails, the
 * user's existing avatarUrl is left completely untouched — we only
 * write to Mongo after Cloudinary has confirmed the upload succeeded.
 */
router.put("/me/avatar", auth, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be 5MB or smaller" });
      }
      if (err.message === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({ message: "Only JPG, PNG, and WEBP images are supported" });
      }
      return res.status(400).json({ message: "Invalid upload" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const realType = detectImageMimeType(req.file.buffer);
    if (!realType) {
      return res.status(400).json({ message: "File is not a valid JPG, PNG, or WEBP image" });
    }

    try {
      const result = await uploadAvatarBuffer(req.file.buffer, req.userId);

      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: { avatarUrl: result.secure_url } },
        { new: true }
      ).select("-password");

      if (!user) return res.status(404).json({ message: "User not found" });

      res.json(publicUser(user));
    } catch (uploadErr) {
      console.error("Avatar upload failed:", {
        http_code: uploadErr.http_code,
        message: uploadErr.message,
        userId: req.userId,
      });
      res.status(502).json({ message: "Failed to upload image. Please try again." });
    }
  });
});

/* SIGNUP */
router.post("/signup", async (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    username,
    email,
    password: hashed,
    // Optional — falls back to the model's own default ("") when omitted,
    // matching the existing behavior for everyone who doesn't send it.
    displayName: displayName?.trim() || "",
  });

  res.status(201).json({ message: "User created" });
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.password) {
    return res.status(400).json({
      message: "This account signs in with GitHub. Use \"Continue with GitHub\" instead.",
    });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: publicUser(user) });
});

/* ------------------------------------------------------------------ */
/* GitHub OAuth                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET /api/auth/github
 * Entry point for "Continue with GitHub" on both Login and Signup.
 * Redirects the browser straight to GitHub's consent screen.
 *
 * `state` is a short-lived, server-signed JWT (not app session state —
 * we keep this whole flow stateless). GitHub echoes it back unchanged
 * on the callback, which lets us confirm the callback really followed
 * a redirect we issued, and that it hasn't gone stale.
 */
router.get("/github", (req, res) => {
  const state = jwt.sign(
    { purpose: "github_oauth_state", nonce: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  res.redirect(buildAuthorizeUrl(state));
});

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after the user approves (or denies) access.
 *
 * Three possible outcomes, each ending in a redirect back to the SPA's
 * /oauth/callback route (never a JSON response — this request comes
 * from the browser's top-level navigation, not our frontend's axios):
 *
 *  1. GitHub account already linked to a user       -> app JWT issued
 *  2. GitHub email matches an existing local account -> accounts linked,
 *     app JWT issued (all existing data preserved)
 *  3. No match found                                 -> short-lived
 *     "pending signup" token issued; frontend collects a username and
 *     completes the account via POST /github/complete-signup
 */
router.get("/github/callback", async (req, res) => {
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${CLIENT_ORIGIN}/login?github_error=access_denied`);
  }

  try {
    jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    return res.redirect(`${CLIENT_ORIGIN}/login?github_error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${CLIENT_ORIGIN}/login?github_error=missing_code`);
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const { githubId, githubUsername, avatarUrl, email } = await fetchGitHubProfile(accessToken);

    // 1. Already linked — straightforward login.
    let user = await User.findOne({ githubId });

    // 2. Not linked yet, but GitHub's email matches an existing local
    //    account — link them instead of creating a duplicate. All of the
    //    user's existing collections/contributions/profile are untouched.
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.githubId = githubId;
        user.githubUsername = user.githubUsername || githubUsername;
        user.avatarUrl = user.avatarUrl || avatarUrl;
        if (!user.authProviders?.includes("github")) {
          user.authProviders = [...(user.authProviders?.length ? user.authProviders : ["local"]), "github"];
        }
        await user.save();
      }
    }

    // Temporary diagnostic log — shows which of the three branches this
    // request took, and what email (if any) GitHub gave us. Useful for
    // tracking down "why did this create a new account instead of
    // linking" — compare the logged email against the existing user's
    // stored email in Mongo.
    console.log("[github-oauth] callback result:", {
      githubId,
      githubUsername,
      emailFromGitHub: email,
      matchedExistingUser: !!user,
    });

    if (user) {
      const token = signAppToken(user._id);
      return res.redirect(`${CLIENT_ORIGIN}/oauth/callback?token=${token}`);
    }

    // 3. Genuinely new person — don't create the account yet. Hand the
    //    frontend a signed token carrying the GitHub data so it can
    //    render the "pick a username" onboarding step, then complete
    //    the signup via /github/complete-signup below.
    const pendingToken = jwt.sign(
      { purpose: "github_signup", githubId, githubUsername, avatarUrl, email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    // githubUsername/avatarUrl are also passed as plain query params
    // (not just inside the pendingToken) purely so the frontend can
    // prefill the onboarding form without needing to decode the JWT.
    // Neither is sensitive — both are public GitHub profile fields.
    const params = new URLSearchParams({
      signup: "1",
      pendingToken,
      githubUsername,
      avatarUrl: avatarUrl || "",
    });
    return res.redirect(`${CLIENT_ORIGIN}/oauth/callback?${params.toString()}`);
  } catch (err) {
    console.error("GitHub OAuth callback failed:", err.message);
    return res.redirect(`${CLIENT_ORIGIN}/login?github_error=oauth_failed`);
  }
});

/**
 * POST /api/auth/github/complete-signup
 * Final step of GitHub signup. Body: { pendingToken, username }.
 *
 * `username` is intentionally the ONLY field this endpoint accepts from
 * the client for account creation — email/password/bio are never asked
 * for during GitHub onboarding, matching the local-signup default of
 * leaving optional profile fields for Settings later.
 */
router.post("/github/complete-signup", async (req, res) => {
  const { pendingToken, username } = req.body;

  if (!pendingToken || !username) {
    return res.status(400).json({ message: "Username is required" });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters" });
  }

  let payload;
  try {
    payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    if (payload.purpose !== "github_signup") throw new Error("wrong token purpose");
  } catch {
    return res.status(400).json({ message: "Your GitHub session expired. Please try again." });
  }

  const { githubId, githubUsername, avatarUrl, email } = payload;

  try {
    // Race-safety: someone may have completed this same signup (double
    // submit, two tabs) or linked this GitHub account via another path
    // in the last few minutes.
    const alreadyLinked = await User.findOne({ githubId });
    if (alreadyLinked) {
      const token = signAppToken(alreadyLinked._id);
      return res.json({ token, user: publicUser(alreadyLinked) });
    }

    if (email) {
      const emailMatch = await User.findOne({ email });
      if (emailMatch) {
        emailMatch.githubId = githubId;
        emailMatch.githubUsername = emailMatch.githubUsername || githubUsername;
        emailMatch.avatarUrl = emailMatch.avatarUrl || avatarUrl;
        if (!emailMatch.authProviders?.includes("github")) {
          emailMatch.authProviders = [...(emailMatch.authProviders?.length ? emailMatch.authProviders : ["local"]), "github"];
        }
        await emailMatch.save();
        const token = signAppToken(emailMatch._id);
        return res.json({ token, user: publicUser(emailMatch) });
      }
    }

    const usernameTaken = await User.findOne({ username: trimmedUsername });
    if (usernameTaken) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const user = await User.create({
      username: trimmedUsername,
      githubId,
      githubUsername,
      avatarUrl: avatarUrl || "",
      email: email || undefined,
      authProviders: ["github"],
    });

    const token = signAppToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Username is already taken" });
    }
    res.status(400).json({ message: err.message || "Signup failed" });
  }
});

export default router;