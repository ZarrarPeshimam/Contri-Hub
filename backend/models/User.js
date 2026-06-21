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

    email:          { type: String, required: true, unique: true },
    password:       { type: String, required: true },

    bio:            { type: String, default: "", maxlength: 300 },
    avatarUrl:      { type: String, default: "" },

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

export default mongoose.model("User", userSchema);
