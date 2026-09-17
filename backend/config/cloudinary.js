import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary client configuration.
 *
 * Credentials are read from environment variables ONLY — never hardcoded,
 * never sent to the frontend. See backend/.env.example for the variable
 * names this expects.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Startup diagnostic — logged once, at boot, so a misconfigured
 * CLOUDINARY_* value is obvious immediately instead of surfacing later
 * as an opaque "Server returned unexpected status code - 403" on the
 * first upload attempt.
 *
 * Safe to log:
 *   - cloud_name is NOT a secret (it's part of every public delivery
 *     URL Cloudinary generates), so it's printed in full — this is the
 *     single most useful line for catching "still the .env.example
 *     placeholder" or "pasted the wrong value" mistakes.
 *   - api_key is printed partially masked (Cloudinary API keys are
 *     numeric IDs, not secrets on their own, but no reason to show it
 *     in full in logs).
 *   - api_secret is NEVER printed, not even masked/partial — only
 *     whether it's present.
 */
const cfg = cloudinary.config();
const maskKey = (k) => (k ? `${k.slice(0, 4)}${"*".repeat(Math.max(k.length - 4, 0))}` : "(missing)");

console.log("[cloudinary] config loaded:", {
  cloud_name: cfg.cloud_name || "(missing)",
  api_key: maskKey(cfg.api_key),
  api_secret: cfg.api_secret ? "(set)" : "(missing)",
});

if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
  console.warn(
    "[cloudinary] WARNING: one or more CLOUDINARY_* env vars are missing. " +
      "Avatar uploads will fail. Check backend/.env against backend/.env.example."
  );
} else if (cfg.cloud_name === "your-cloud-name" || cfg.api_key === "xxxxxxxxxxxxxxx") {
  console.warn(
    "[cloudinary] WARNING: CLOUDINARY_CLOUD_NAME/API_KEY still look like the " +
      "placeholder values from .env.example — replace them with your real " +
      "Cloudinary dashboard values."
  );
}

export default cloudinary;