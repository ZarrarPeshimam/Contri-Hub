import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "contri-hub",
    });

    console.log("Mongo connected");

    /**
     * Sync MongoDB's actual indexes to match the current schema.
     *
     * This is the step that actually fixes the duplicate-detection bug —
     * editing the `unique` index definition in models/Contribution.js
     * only changes what Mongoose will create in a FRESH database.
     * Mongoose's default index handling only ADDS indexes that are
     * missing; it never drops an index that's no longer declared in the
     * schema. So an already-running database would keep enforcing the
     * old GLOBAL unique index on { repo, prNumber } forever, silently
     * blocking every user but the first from adding a given PR, no
     * matter what the schema file says.
     *
     * Contribution.syncIndexes() reconciles this: it drops indexes that
     * are no longer in the schema (the old global one) and builds any
     * that are missing (the new per-user { user, repo, prNumber } one).
     * Non-fatal on failure so a transient index issue can't take the
     * whole API down.
     */
    try {
      await Contribution.syncIndexes();
      console.log("Contribution indexes synced");
    } catch (indexErr) {
      console.error("Failed to sync Contribution indexes:", indexErr.message);
    }
  } catch (err) {
    console.error(err);
  }
}