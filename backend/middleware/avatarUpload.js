import multer from "multer";

/**
 * avatarUpload
 *
 * Multer instance dedicated to the profile-picture upload endpoint.
 *
 * - memoryStorage: the file only ever lives in a Buffer in process
 *   memory, long enough to validate + stream it to Cloudinary. It is
 *   never written to the backend's local filesystem.
 * - fileFilter: a first-pass check on the browser-reported MIME type,
 *   purely to reject obviously-wrong uploads early. This is NOT the
 *   authoritative check — the route handler additionally sniffs the
 *   actual file bytes (see services/avatarUploadService.js) before
 *   trusting the type, since fileFilter's `file.mimetype` is
 *   client-supplied and can be spoofed.
 * - limits.fileSize: hard cap enforced by multer itself; oversized
 *   uploads are rejected before the full body is even buffered.
 */
export const ACCEPTED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
  },
});

export default avatarUpload;
