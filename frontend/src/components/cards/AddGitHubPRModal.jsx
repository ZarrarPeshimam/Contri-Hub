import { useState } from "react";
import api from "../../lib/api";

export default function AddGitHubPRModal({ collectionSlug, onClose, onFetched }) {
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const getAllTags = () => {
    const currentInput = tagInput.trim();
    if (currentInput && !tags.includes(currentInput)) {
      return [...tags, currentInput];
    }
    return tags;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    const finalTags = getAllTags();
    if (finalTags.length === 0) {
      return setError("Add at least one tag");
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post(`/api/collections/${collectionSlug}/add-from-github`, {
        tags: finalTags
      });

      onFetched(res.data.contributions);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch PRs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Fetch GitHub PRs</h2>

        <form onSubmit={submit} className="space-y-4">
          {/* Tag Input */}
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag (press Enter to add)"
              className="flex-1 h-11 px-4 rounded-xl bg-gray-950 border border-gray-700 
                         text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-violet-500 focus:border-violet-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 
                         text-white font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {/* Purple Tag Capsules - Improved Design */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="group flex items-center gap-1.5 bg-violet-900/90 
                             text-white px-4 py-1.5 rounded-2xl text-sm font-medium 
                             transition-all duration-200 shadow-sm"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-white/70 hover:text-white text-xl leading-none 
                               font-bold hover:scale-110 transition-transform"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 
                         text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={loading || (tags.length === 0 && !tagInput.trim())}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 
                         disabled:bg-violet-600/50 text-white font-medium 
                         transition-all disabled:cursor-not-allowed"
            >
              {loading ? "Fetching PRs..." : "Fetch PRs"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}