import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    contributionsCount: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ✅ Enforce unique collection per year per user */
collectionSchema.index(
  { user: 1, slug: 1 },
  { unique: true }
);

export default mongoose.model("Collection", collectionSchema);