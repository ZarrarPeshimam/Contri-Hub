/**
 * aiPreferences.js
 *
 * All localStorage reads/writes for the AI Summarizer modal.
 *
 * Centralised here so:
 *   - Key names are never duplicated across components
 *   - Storage access is easy to mock in tests
 *   - Switching to a different persistence layer (e.g. IndexedDB) is a
 *     one-file change
 *
 * Keys:
 *   ai_provider_preference  — "system" | "personal"
 *   ai_include_issues       — "true" | "false"
 *   ai_remember_key         — "true" | "false"
 *   groq_user_api_key       — raw key string (only stored when rememberKey=true)
 */

const KEYS = {
  provider: "ai_provider_preference",
  includeIssues: "ai_include_issues",
  rememberKey: "ai_remember_key",
  apiKey: "groq_user_api_key",
};

export function loadAIPreferences() {
  return {
    provider: localStorage.getItem(KEYS.provider) || "system",
    includeIssues: localStorage.getItem(KEYS.includeIssues) === "true",
    rememberKey: localStorage.getItem(KEYS.rememberKey) === "true",
    apiKey: localStorage.getItem(KEYS.apiKey) || "",
  };
}

export function saveAIPreferences({ provider, includeIssues, rememberKey, apiKey }) {
  localStorage.setItem(KEYS.provider, provider);
  localStorage.setItem(KEYS.includeIssues, String(includeIssues));
  localStorage.setItem(KEYS.rememberKey, String(rememberKey));

  if (rememberKey && apiKey) {
    localStorage.setItem(KEYS.apiKey, apiKey);
  } else {
    // Always clear the stored key when rememberKey is disabled
    localStorage.removeItem(KEYS.apiKey);
  }
}
