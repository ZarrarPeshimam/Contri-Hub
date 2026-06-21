import { useState, useEffect, useRef } from "react";
import { X, Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { generatePRSummary } from "../../lib/aiApi";
import { loadAIPreferences, saveAIPreferences } from "../../lib/aiPreferences";

export default function AISummarizerModal({
  pr,
  collectionSlug,
  onClose,
  onUpdated,
  showToast,
}) {
  /* ── Preferences (restored from localStorage) ── */
  const [provider, setProvider] = useState("system");
  const [includeIssues, setIncludeIssues] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  /* ── Generation state ── */
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { summary, skills, impact }
  const [showSkills, setShowSkills] = useState(false);

  /* ── Save-back state ── */
  const [saving, setSaving] = useState(false);

  /* ── Prevent double-fire ── */
  const generatingRef = useRef(false);

  /* ── Restore preferences on mount ── */
  useEffect(() => {
    const prefs = loadAIPreferences();
    setProvider(prefs.provider);
    setIncludeIssues(prefs.includeIssues);
    setRememberKey(prefs.rememberKey);
    setApiKey(prefs.apiKey);
  }, []);

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Generate handler ── */
  const handleGenerate = async () => {
    if (generatingRef.current) return; // prevent double-fire
    generatingRef.current = true;
    setGenerating(true);
    setResult(null);

    // Persist preferences before the call
    saveAIPreferences({ provider, includeIssues, rememberKey, apiKey });

    try {
      const data = await generatePRSummary({
        prUrl: pr.url,
        includeIssues,
        provider,
        userApiKey: apiKey,
      });

      setResult(data);
      showToast("Summary generated!", "success");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Generation failed";
      showToast(msg, "error");
    } finally {
      setGenerating(false);
      generatingRef.current = false;
    }
  };

  /* ── Save-back: replace or append ── */
  const handleApply = async () => {
    if (!result?.summary) return;

    setSaving(true);

    try {
      const res = await api.put(
        `/api/collections/${collectionSlug}/contributions/${pr._id}/edit`,
        { description: result.summary }
      );

      onUpdated?.(res.data.contribution || res.data);

      showToast("Description updated.", "success");

      onClose();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to save",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-600/20">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Summarizer</h2>
              <p className="text-xs text-gray-500 truncate max-w-[300px]">{pr.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto custom-scroll flex-1 px-6 py-5 space-y-5">

          {/* Provider selector */}
          <fieldset>
            <legend className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5">
              API Provider
            </legend>
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
              {["system", "personal"].map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`
                    flex-1 py-2.5 text-sm font-medium transition-colors
                    ${provider === p
                      ? "bg-violet-600 text-white"
                      : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
                    }
                  `}
                >
                  {p === "system" ? "System API" : "Personal API"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {provider === "system"
                ? "Uses the server's Groq API key. No key needed from you."
                : "Uses your own Groq API key from groq.com."}
            </p>
          </fieldset>

          {/* Personal API key input — only shown when provider = "personal" */}
          {provider === "personal" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Groq API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full h-10 px-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />

              {/* Remember API key checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="w-4 h-4 accent-violet-500 rounded"
                />
                <span className="text-xs text-gray-400">
                  Remember API key in this browser
                </span>
              </label>
            </div>
          )}

          {/* Include linked issues toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-gray-200 font-medium">
                Include linked GitHub issues
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Adds issue context to help the AI understand the motivation
              </p>
            </div>
            <button
              onClick={() => setIncludeIssues((v) => !v)}
              className={`
                relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200
                ${includeIssues ? "bg-violet-600" : "bg-gray-700"}
              `}
              role="switch"
              aria-checked={includeIssues}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow
                  transition-transform duration-200
                  ${includeIssues ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>

          {/* ── Result preview ── */}
          {result && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-medium text-violet-400 uppercase tracking-wide">
                  Generated Description
                </span>
              </div>

              <p className="text-sm text-gray-200 leading-relaxed">
                {result.summary}
              </p>

              {/* Skills — collapsible */}
              {result.skills?.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowSkills((v) => !v)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Detected skills
                    {showSkills
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                    }
                  </button>
                  {showSkills && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {result.skills.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-violet-900/50 border border-violet-500/30 text-violet-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Apply actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApply}
                  disabled={saving}
                  className="
                    flex-1 py-2 rounded-xl
                    bg-violet-600 hover:bg-violet-500
                    disabled:opacity-60
                    text-white text-sm font-medium transition-colors
                  "
                >
                  {saving ? "Saving…" : "Use Description"}
                </button>
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="
                    flex-1 py-2 rounded-xl
                    bg-gray-800 hover:bg-gray-700
                    disabled:opacity-60
                    text-gray-200 text-sm font-medium transition-colors
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer: Generate button ── */}
        {!result && (
          <div className="px-6 py-4 border-t border-gray-800 shrink-0">
            <button
              onClick={handleGenerate}
              disabled={generating || (provider === "personal" && !apiKey.trim())}
              className="
                w-full py-3 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-violet-600 to-purple-600
                hover:from-violet-500 hover:to-purple-500
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white shadow-lg shadow-violet-900/40
                transition-all flex items-center justify-center gap-2
              "
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </>
              )}
            </button>

            {provider === "personal" && !apiKey.trim() && (
              <p className="text-xs text-center text-gray-500 mt-2">
                Enter your Groq API key to generate
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
