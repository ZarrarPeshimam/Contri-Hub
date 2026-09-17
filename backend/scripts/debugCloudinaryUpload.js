import "../config/loadEnv.js";
import crypto from "crypto";

/**
 * debugCloudinaryUpload.js
 *
 * WHY THIS EXISTS:
 * The `cloudinary` npm SDK only parses/reads the response body for a
 * hardcoded whitelist of status codes: 200, 400, 401, 404, 420, 500
 * (see node_modules/cloudinary/lib/uploader.js, `handle_response`).
 * For any OTHER status code — including 403 — it discards whatever
 * Cloudinary actually sent back and replaces it with the generic
 * "Server returned unexpected status code - 403" message you're
 * seeing. Cloudinary is very likely sending a real, specific reason
 * in that response body; the SDK is just throwing it away.
 *
 * This script bypasses the SDK entirely and POSTs a signed upload
 * directly to Cloudinary's REST API using Node's built-in fetch, then
 * prints the raw status + body no matter what it is.
 *
 * USAGE:
 *   cd backend
 *   node scripts/debugCloudinaryUpload.js
 *
 * It uploads a tiny 1x1 PNG (embedded below, no test file needed) to
 * the same folder your app uses, so the result should match your
 * app's real behavior exactly.
 */

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing CLOUDINARY_* env vars — check backend/.env");
  process.exit(1);
}

// Tiny 1x1 transparent PNG, base64-encoded — no external file needed.
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function buildSignature(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

async function main() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signParams = {
    folder: "contri-hub/avatars",
    overwrite: "true",
    public_id: `debug_${timestamp}`,
    timestamp: String(timestamp),
  };
  const signature = buildSignature(signParams, CLOUDINARY_API_SECRET);

  const form = new FormData();
  form.append("file", `data:image/png;base64,${TEST_PNG_BASE64}`);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", signParams.timestamp);
  form.append("folder", signParams.folder);
  form.append("overwrite", signParams.overwrite);
  form.append("public_id", signParams.public_id);
  form.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  console.log("POSTing to:", url);

  const res = await fetch(url, { method: "POST", body: form });
  const rawBody = await res.text();

  console.log("\n=== RAW CLOUDINARY RESPONSE ===");
  console.log("status:", res.status, res.statusText);
  console.log("headers:", Object.fromEntries(res.headers.entries()));
  console.log("body:", rawBody);
  console.log("================================\n");

  if (res.ok) {
    console.log("✅ Upload succeeded — the credentials/account are fine.");
    console.log("   If your app still 403s, the bug is elsewhere (e.g. a");
    console.log("   stale/cached build, or a different .env being loaded).");
  } else {
    console.log("❌ Upload failed — the message/error field above from");
    console.log("   Cloudinary itself is the real reason (account status,");
    console.log("   IP restriction, plan limit, etc.) — not a code bug.");
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});