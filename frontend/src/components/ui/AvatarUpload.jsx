import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import Avatar from "./Avatar";
import api from "../../lib/api";

/**
 * AvatarUpload
 *
 * Wraps <Avatar> with the click-to-upload interaction for the
 * authenticated user's OWN profile. Renders as a completely normal,
 * non-interactive <Avatar> when `editable` is false — used for every
 * public-profile view.
 *
 * Owner view:  avatar → hover shows a dark overlay + camera icon →
 *              click opens the native file picker → uploads →
 *              onUploaded(newAvatarUrl, user) fires on success.
 * Public view: identical to plain <Avatar>, no interaction at all.
 *
 * Client-side validation (type + size) mirrors the backend so bad
 * files are rejected instantly, without a round trip — the backend
 * still independently re-validates (including sniffing real file
 * bytes), since client checks are never trustworthy on their own.
 *
 * Props:
 *   avatarUrl, displayName, username, size, className — passed straight
 *     through to <Avatar>, same as before.
 *   editable   – bool, true only on the owner's own profile.
 *   onUploaded – (avatarUrl, user) => void, called after a successful upload.
 *   onError    – (message) => void, called with a human-readable error.
 */
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function AvatarUpload({
  avatarUrl,
  displayName,
  username,
  size = "xl",
  className = "",
  editable = false,
  onUploaded,
  onError,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange next time.
    e.target.value = "";

    // User closed the file picker without choosing anything — do nothing.
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError?.("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError?.("Image must be 5MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await api.put("/api/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onUploaded?.(res.data.avatarUrl, res.data);
    } catch (err) {
      onError?.(err.response?.data?.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`relative inline-block shrink-0 ${editable ? "cursor-pointer group" : ""}`}
      onClick={handleClick}
    >
      <Avatar
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={username}
        size={size}
        className={className}
      />

      {editable && (
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity duration-200 ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      )}

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      )}
    </div>
  );
}
