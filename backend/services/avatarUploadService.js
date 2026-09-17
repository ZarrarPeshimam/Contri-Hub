import cloudinary from "../config/cloudinary.js";

/**
 * detectImageMimeType
 *
 * Sniffs the first bytes of a file buffer to determine its REAL image
 * type — independent of the filename extension and independent of the
 * Content-Type the browser attached to the multipart part (both of
 * which the client fully controls and can spoof). Only the four
 * formats this feature supports are recognized; anything else
 * (including a renamed non-image file) returns null.
 */
export function detectImageMimeType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG — starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG — 8-byte signature 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP — RIFF container: "RIFF" + 4-byte size + "WEBP"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * uploadAvatarBuffer
 *
 * Streams an in-memory image buffer straight to Cloudinary — no
 * intermediate temp file on the backend's disk. Resolves with
 * Cloudinary's upload result (we only use `secure_url`, but the full
 * result is returned in case callers need it later).
 *
 * public_id includes the user id + timestamp so concurrent/repeat
 * uploads from the same user never collide.
 */
export function uploadAvatarBuffer(buffer, userId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "contri-hub/avatars",
        public_id: `user_${userId}_${Date.now()}`,
        resource_type: "image",
        overwrite: true,
      },
      (err, result) => {
        if (err) {
          // Cloudinary's SDK error shape varies by failure type:
          //   - API-level errors (bad request, invalid transformation, etc.)
          //     come back as { message, http_code } with a real JSON body.
          //   - Gateway/auth-level rejections (wrong cloud_name, revoked
          //     key, disabled account, WAF block) often come back as a
          //     non-JSON body, which the SDK turns into the generic
          //     "Server returned unexpected status code - <code>" message
          //     with no further detail — that's almost always a
          //     credentials/account problem, not a bug in this upload code.
          console.error("[cloudinary] upload_stream error:", {
            http_code: err.http_code,
            name: err.name,
            message: err.message,
          });
          return reject(err);
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}