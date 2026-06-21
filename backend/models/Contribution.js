import mongoose from "mongoose";

const linkedIssueSchema = new mongoose.Schema(
  {
    issueNumber: { type: Number, required: true },
    issueUrl:    { type: String, required: true },
    source: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },
  },
  { _id: false }
);

const contributionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },

    title:       { type: String, required: true },

    /**
     * originalDescription — the raw PR body as fetched from GitHub.
     * Never overwritten by AI. Used as the guaranteed fallback for
     * future re-generation and for the "reset description" action.
     */
    originalDescription: { type: String, default: "" },

    /**
     * aiDescription — the AI-generated polished summary.
     * Only written when autoAISummary is enabled or the user
     * manually applies a summary from the AI Summarizer modal.
     * null = no AI summary has been generated yet.
     */
    aiDescription: { type: String, default: null },

    /**
     * description — the active display description.
     * Computed as: aiDescription || originalDescription.
     * This is what the frontend reads and what manual edits write to.
     * Keeping it as an explicit stored field means zero query-time
     * computation and backward compatibility with all existing API consumers.
     */
    description: { type: String },

    repo:      { type: String, required: true },
    prNumber:  { type: Number, required: true },
    url:       { type: String, required: true },

    status: {
      type: String,
      enum: ["open", "merged", "closed"],
      required: true,
    },

    createdAtGithub: { type: Date, required: true },
    mergedAtGithub:  { type: Date },

    linkedIssues: {
      type: [linkedIssueSchema],
      default: [],
    },

    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

contributionSchema.index({ repo: 1, prNumber: 1 }, { unique: true });

export default mongoose.model("Contribution", contributionSchema);
