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

    /**
     * highlightScope — the single highlight state for this contribution.
     * "none"       — not highlighted (default)
     * "collection" — highlighted within its own collection only
     * "overall"    — highlighted globally (higher priority than "collection";
     *                drives visibility on the overall showcase page)
     */
    highlightScope: {
      type: String,
      enum: ["none", "collection", "overall"],
      default: "none",
      index: true,
    },

    /**
     * Manual card ordering — one field per ordering context, so that
     * dragging a card in one place can never move it in another:
     *
     *   collectionOrder          position inside its own collection's timeline
     *   overallHighlightOrder    position in the user's Overall Highlights
     *   collectionHighlightOrder position in its collection's Highlights tab
     *
     * `null` = never manually arranged. Those cards fall back to the
     * original default ordering (see utils/contributionOrder.js), so
     * documents created before this feature keep working untouched.
     * Values are only ever compared relative to each other; gaps are fine.
     */
    collectionOrder:          { type: Number, default: null },
    overallHighlightOrder:    { type: Number, default: null },
    collectionHighlightOrder: { type: Number, default: null },
  },
  { timestamps: true }
);

/**
 * Uniqueness is scoped to the user: the same GitHub PR can legitimately
 * be added by different ContriHub accounts (e.g. two contributors
 * cross-referencing the same open-source PR in their own portfolios).
 * What must never happen is the SAME user adding the SAME PR twice.
 *
 * Previously this was { repo: 1, prNumber: 1 } with no `user` — a
 * GLOBAL unique constraint that blocked a second user from ever adding
 * a PR another user had already added, causing every fetch to be
 * silently skipped as a "duplicate" for anyone but the first person
 * who added it.
 */
contributionSchema.index({ user: 1, repo: 1, prNumber: 1 }, { unique: true });

export default mongoose.model("Contribution", contributionSchema);