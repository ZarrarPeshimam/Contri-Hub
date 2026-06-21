/**
 * groqService.js
 *
 * Thin wrapper around the Groq REST API.
 * If we ever swap providers, only this file changes.
 *
 * Calls the REST API directly with axios — no SDK needed.
 * Caller passes an optional apiKey; if absent, falls back to
 * process.env.GROQ_API_KEY (system key).
 */

import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/**
 * Builds the prompt sent to the LLM.
 *
 * Each linked issue is formatted as:
 *   Issue #N — <title>
 *   <body (capped at 600 chars)>
 *
 * The title is the most signal-dense part of an issue — it gives the AI
 * the concise "why" even when the body is long or vague.
 * The body adds deeper problem context when available.
 *
 * @param {{ prTitle, prBody, linkedIssues: { issueNumber, title, body }[] }} params
 */
function buildPrompt({ prTitle, prBody, linkedIssues }) {
  const issueSection =
    linkedIssues.length > 0
      ? `\n\nRELATED ISSUE CONTEXT (use to understand motivation — do not describe the issues themselves):\n` +
        linkedIssues
          .map((i) => {
            const heading = `Issue #${i.issueNumber}${i.title ? ` — ${i.title}` : ""}`;
            const body = i.body ? `\n${i.body.slice(0, 600)}` : "";
            return heading + body;
          })
          .join("\n\n")
      : "";

  return `You are writing a contribution description for a developer portfolio.

Your job is to write a concise, professional description of what a developer implemented in the following GitHub pull request.

RULES:
- Write approximately 4 to 8 sentences
- Focus on what was implemented, improved, refactored, or fixed
- Explain the contribution clearly enough that another developer or recruiter can understand the work
- Mention relevant technologies, architecture decisions, APIs, UI improvements, backend logic, or performance improvements when evident
- Include implementation details if available in the PR description
- Use professional but natural language
- Use past tense (e.g. "Implemented", "Added", "Refactored")
- Do NOT use markdown formatting, bullet points, or headers
- Do NOT start with "This PR" or "This pull request"
- Do NOT mention issue numbers or PR numbers
- Avoid sounding robotic or overly AI-generated
- The output should feel like a polished contribution/project description written by a skilled developer

PR TITLE: ${prTitle}

PR DESCRIPTION:
${prBody ? prBody.slice(0, 3000) : "(no description provided)"}${issueSection}

Write only the contribution description. No preamble, no labels, no extra formatting.`;
}

/**
 * Lightweight skill extractor — scans generated text for known tech keywords.
 * Good enough for v1 without a second AI call.
 */
function extractSkills(summary) {
  const knownSkills = [
    "React", "Vue", "Angular", "Next.js", "Nuxt",
    "Node.js", "Express", "Fastify", "Koa",
    "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java",
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "Prisma",
    "GraphQL", "REST", "tRPC",
    "JWT", "OAuth", "Auth",
    "Docker", "Kubernetes", "CI/CD", "GitHub Actions",
    "Tailwind", "CSS", "SCSS",
    "WebSocket", "Socket.io",
    "Axios", "Fetch",
    "Jest", "Vitest", "Testing",
  ];

  return knownSkills.filter((skill) =>
    new RegExp(`\\b${skill}\\b`, "i").test(summary)
  );
}

/**
 * Calls Groq and returns a structured result.
 *
 * @param {{ prTitle, prBody, linkedIssues, apiKey? }} params
 * @returns {{ summary: string, skills: string[], impact: string }}
 */
export async function generateSummary({ prTitle, prBody, linkedIssues, apiKey }) {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error(
      "No API key available. Set GROQ_API_KEY in your environment or use a personal API key."
    );
  }

  const prompt = buildPrompt({ prTitle, prBody, linkedIssues });

  let response;
  try {
    response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 400, // bumped slightly to accommodate 4-8 sentence output
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("Invalid Groq API key. Check your key and try again.");
    }
    if (err.response?.status === 429) {
      throw new Error("Groq API rate limit reached. Try again in a moment.");
    }
    if (err.code === "ECONNABORTED") {
      throw new Error("Groq API timed out. Try again.");
    }
    throw new Error(`Groq API error: ${err.response?.data?.error?.message ?? err.message}`);
  }

  const summary = response.data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!summary) {
    throw new Error("Groq returned an empty response. Try again.");
  }

  return {
    summary,
    skills: extractSkills(summary),
    impact: summary.split(".")[0].trim() + ".",
  };
}