import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    autoDetectIssues:   { type: Boolean, default: true },
    autoRefreshMetadata: { type: Boolean, default: false },
    autoAISummary:      { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Immutable handle — used in URLs, never changes
    username:       { type: String, required: true, unique: true, trim: true },

    // Shown in UI instead of username wherever possible
    displayName:    { type: String, trim: true, default: "" },

    // Optional now — GitHub-only users may not expose a public email.
    // sparse index so multiple docs can omit it without violating uniqueness.
    email:          { type: String, unique: true, sparse: true, default: undefined },

    // Optional now — OAuth-only users never set a local password.
    // Presence of `password` is what makes local login possible for a
    // user; see the pre-validate hook below for the invariant enforced.
    password:       { type: String, default: undefined },

    bio:            { type: String, default: "", maxlength: 300 },
    avatarUrl:      { type: String, default: "" },

    // Which method(s) a user can authenticate with. Existing documents
    // written before this field existed simply won't have it — that's
    // fine, their local login keeps working off `password` alone (see
    // authroutes.js). This field is informational/UI-facing, not the
    // source of truth for "can this user log in with X".
    authProviders:  { type: [String], enum: ["local", "github"], default: ["local"] },

    // GitHub identity link. Unique + sparse so it's only enforced when
    // set, and one GitHub account can only ever link to one user here.
    githubId:       { type: String, unique: true, sparse: true, default: undefined },

    // Social / identity links
    githubUsername: { type: String, default: "" },
    linkedinUrl:    {
      type: String,
      default: "",
      validate: {
        validator: (v) => !v || /^https?:\/\/.+/.test(v),
        message: "linkedinUrl must be a valid URL",
      },
    },
    portfolioUrl:   {
      type: String,
      default: "",
      validate: {
        validator: (v) => !v || /^https?:\/\/.+/.test(v),
        message: "portfolioUrl must be a valid URL",
      },
    },

    settings:       { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Invariant: every user must be able to authenticate somehow — either a
// local password or a linked GitHub account. This is the actual guard
// (not `authProviders`, which is just a display hint). Existing users
// created before OAuth support all have `password` set, so this hook
// is a no-op for them and never breaks pre-existing accounts.
//
// NOTE: Mongoose 7+ removed callback-style (`next`) middleware — hooks
// must be synchronous (throw to fail) or async (reject to fail).
userSchema.pre("validate", function () {
  if (!this.password && !this.githubId) {
    throw new Error("User must have either a password or a linked GitHub account");
  }
});

export default mongoose.model("User", userSchema);
