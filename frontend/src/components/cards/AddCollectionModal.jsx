import { useState } from "react";
import api from "../../lib/api";

export default function AddCollectionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    year: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/collections", {
        title: form.title,
        year: Number(form.year),
        description: form.description,
      });

      onCreated?.(res.data);
      onClose();

      // reset after success
      setForm({ title: "", year: "", description: "" });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create collection"
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
          bg-black
          border border-gray-800
          shadow-2xl
          p-6
        "
      >
        <h2 className="text-lg font-semibold mb-4">
          Add Collection
        </h2>

        <form onSubmit={submit} className="space-y-4">
          {/* Title */}
          <input
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            placeholder="Collection title (e.g. GSoC)"
            className="
              w-full h-11 px-3
              rounded-lg
              bg-gray-950
              border border-gray-700
              text-white
              placeholder-gray-400
              focus:outline-none
              focus:ring-2 focus:ring-amber-500
            "
            required
          />

          {/* Year */}
          <input
            type="number"
            value={form.year}
            onChange={(e) =>
              setForm({ ...form, year: e.target.value })
            }
            placeholder="Year (e.g. 2025)"
            className="
              w-full h-11 px-3
              rounded-lg
              bg-gray-950
              border border-gray-700
              text-white
              placeholder-gray-400
              focus:outline-none
              focus:ring-2 focus:ring-amber-500
            "
            required
          />

          {/* Description */}
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Short description (optional)"
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
              focus:ring-2 focus:ring-amber-500
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
                bg-amber-600 hover:bg-amber-500
                text-black
                disabled:opacity-60
              "
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
