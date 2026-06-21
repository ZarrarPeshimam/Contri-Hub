import { useState } from "react";
import { X, Plus, GitBranch } from "lucide-react";
import { buildIssueUrl } from "../../lib/github";

export default function LinkedIssuesEditor({ repo, issues = [], onChange }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const parseInput = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Accept a full GitHub issue URL: https://github.com/owner/repo/issues/50
    const urlMatch = trimmed.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
    if (urlMatch) {
      return { issueNumber: Number(urlMatch[1]), issueUrl: trimmed };
    }

    // Accept "#50" or "50"
    const numMatch = trimmed.match(/^#?(\d+)$/);
    if (numMatch) {
      const n = Number(numMatch[1]);
      return {
        issueNumber: n,
        issueUrl: buildIssueUrl(repo, n),
      };
    }

    return null;
  };

  const addIssue = () => {
    setError("");
    const parsed = parseInput(input);

    if (!parsed) {
      setError("Enter a number like #50 or a full GitHub issue URL");
      return;
    }

    if (issues.some((i) => i.issueNumber === parsed.issueNumber)) {
      setError(`Issue #${parsed.issueNumber} is already linked`);
      return;
    }

    onChange([...issues, { ...parsed, source: "manual" }]);
    setInput("");
  };

  const removeIssue = (issueNumber) => {
    onChange(issues.filter((i) => i.issueNumber !== issueNumber));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIssue();
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <GitBranch className="w-3.5 h-3.5" />
        Linked Issues
      </label>

      {/* Existing issues */}
      {issues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {issues.map((issue) => (
            <span
              key={issue.issueNumber}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-900/60 border border-violet-500/30 text-violet-200"
            >
              <span className="font-mono">#{issue.issueNumber}</span>
              {issue.source === "auto" && (
                <span className="opacity-50 text-[10px]">auto</span>
              )}
              <button
                type="button"
                onClick={() => removeIssue(issue.issueNumber)}
                className="hover:text-red-400 transition-colors leading-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          placeholder="#50 or full issue URL"
          className="flex-1 h-9 px-3 text-sm rounded-lg bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="button"
          onClick={addIssue}
          className="px-3 h-9 rounded-lg bg-violet-700 hover:bg-violet-600 text-white transition-colors flex items-center gap-1 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
