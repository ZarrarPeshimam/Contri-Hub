import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

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
});

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

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: publicUser(user) });
});

export default router;