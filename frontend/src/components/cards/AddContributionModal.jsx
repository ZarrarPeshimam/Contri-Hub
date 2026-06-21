import { useState } from "react";
import api from "../../lib/api";

export default function AddContributionModal({
  collectionSlug,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState({
    title: "",
    url: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post(
        `/api/collections/${collectionSlug}/contributions`,
        {
          title: form.title,
          url: form.url,
          description: form.description,
        }
      );

      onCreated?.(res.data);
      onClose();

      // reset
      setForm({ title: "", url: "", description: "" });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to add contribution"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="
          w-full max-w-md
          rounded-2xl
          bg-gray-900
          border border-gray-800
          shadow-2xl
          p-6
        "
      >
        <h2 className="text-lg font-semibold mb-4">
          Add Contribution
        </h2>

        <form onSubmit={submit} className="space-y-4">
          {/* Title */}
          <input
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            placeholder="PR / Contribution title"
            className="
              w-full h-11 px-3
              rounded-lg
              bg-gray-950
              border border-gray-700
              text-white
              placeholder-gray-400
              focus:outline-none
              focus:ring-2 focus:ring-violet-500
            "
            required
          />

          {/* Repo / Link */}
          <input
            value={form.url}
            onChange={(e) =>
              setForm({ ...form, url: e.target.value })
            }
            placeholder="Repo or PR link (optional)"
            className="
              w-full h-11 px-3
              rounded-lg
              bg-gray-950
              border border-gray-700
              text-white
              placeholder-gray-400
              focus:outline-none
              focus:ring-2 focus:ring-violet-500
            "
          />

          {/* Description */}
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="What did you work on?"
            rows={3}
            className="
              w-full px-3 py-2
              rounded-lg
              bg-gray-950
              border border-gray-700
              text-white
              placeholder-gray-400
              resize-none
              focus:outline-none
              focus:ring-2 focus:ring-violet-500
            "
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700/50"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="
                px-4 py-2
                rounded-lg
                bg-violet-600 hover:bg-violet-500
                text-black
                disabled:opacity-60
              "
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
