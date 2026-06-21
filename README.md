# ContriHub — Open Source Contribution Portfolio

ContriHub is a **full-stack web application** that helps developers **visually showcase their open-source contributions** in a structured, portfolio-friendly format.

Instead of sharing scattered GitHub links, developers can create a **centralized, visual contribution portfolio** — organized into custom collections, displayed as cards and timelines, and shareable via a public profile link — making open-source work easier to present to **recruiters, mentors, and programs like GSoC / SSoC**.

---

## ✨ Features

### 🧑‍💻 User & Profile

* User authentication (register & login) — JWT-based, with hashed passwords (bcrypt)
* Editable profile: display name, bio, avatar URL, GitHub username, LinkedIn URL, portfolio URL
* Public profile page (`/<username>`) — viewable by anyone, with owner-only controls shown when logged in as the profile owner
* Per-user settings: toggle auto issue detection, auto metadata refresh, and auto AI summaries

### 🗂 Collections (Contribution Sections)

* Organize contributions into **custom, year-tagged collections**

  * e.g. GSoC, SSoC, Hacktoberfest, Personal OSS
* Card-based collection gallery on the public profile
* **Drag-and-drop reordering** of collections (pointer, touch, and keyboard support), with order persisted to the database
* Live contribution counts per collection (computed on read, not stored/stale)

### 🔗 Contributions (Pull Requests)

* Manual addition of a contribution via a **GitHub PR URL**
* **Auto-fetch PRs** from GitHub by label/tag for a connected GitHub username, previewed before saving
* **Automatic linked-issue detection** — scans PR titles/descriptions for patterns like `closes #50`, `fixes #12`, `#50`, and links them to the contribution
* **Issue re-sync** — re-fetches the live PR body from GitHub and refreshes auto-detected issue links (per-contribution or for an entire collection), while preserving manually-added links
* Manual editing of a contribution's title, description, URL, and linked issues
* Timeline-style visual layout for displaying contributions within a collection

### 🤖 AI-Powered Contribution Summaries

* Generates a polished, professional contribution description from a PR's title and body using an LLM (**Groq — Llama 3.3 70B**)
* Optionally pulls in linked GitHub issues for extra context on *why* the work was done
* Supports both a **system-provided API key** and a **user-supplied personal API key** (bring-your-own-key)
* Lightweight keyword-based skill detection on the generated summary (e.g. React, Node.js, MongoDB, JWT, etc.)
* Original PR text is always preserved separately from the AI-generated version, so a summary can be regenerated or reset without losing the source

### 📊 Activity Heatmap

* GitHub-style contribution heatmap on the profile's Activity tab
* Computed live from stored contributions via aggregation — no precomputed or cached heatmap data
* Year selector; defaults to a rolling 365-day window for the most recent year, full calendar-year view for past years

### 🔗 GitHub Integration

* Uses the **GitHub REST API** with a personal access token (server-side env variable)
* Fetches PR metadata: title, description, status (open/merged/closed), repository, linked issues
* Manual input always works without any GitHub connection; auto-fetch is an optional enhancement

---

## 🧠 Why ContriHub?

GitHub profiles are powerful but **not presentation-friendly**.

ContriHub focuses on:

* **Storytelling of contributions** — including AI-assisted descriptions
* **Visual clarity** — cards, timelines, and a contribution heatmap
* **Recruiter-friendly presentation** — a clean public profile link
* **Custom organization** beyond GitHub's default UI

This project demonstrates:

* Full-stack engineering (React + Express + MongoDB)
* Third-party API integration (GitHub REST API)
* LLM/AI integration (Groq) with a bring-your-own-key pattern
* Authentication & authorization (JWT, owner-only actions)
* Database/schema design (Mongoose, aggregation pipelines)
* Real-world product thinking (manual-first, auto-fetch as enhancement)

---

## 🛠 Tech Stack

### Frontend

* React 19 (Vite)
* Tailwind CSS v4
* React Router v7
* Axios
* @dnd-kit (core, sortable, utilities) — drag-and-drop
* Framer Motion — layout & drag animations
* Lucide React — icons

### Backend

* Node.js
* Express 5
* JWT Authentication (`jsonwebtoken`)
* bcryptjs — password hashing
* REST APIs
* Axios (server-side GitHub/Groq calls)

### Database

* MongoDB + Mongoose

### External APIs

* GitHub REST API (PR/issue metadata, token-based access)
* Groq API (`llama-3.3-70b-versatile`) — AI contribution summarization

### Deployment (intended targets)

* Frontend: Vercel / Netlify
* Backend: Render
* Database: MongoDB Atlas

> Note: the app is structured to support this deployment model (configurable CORS origin, env-based config), but deployment automation/config files are not yet part of the repo.

---

## 🔒 GitHub API Awareness

* **Unauthenticated:** 60 requests/hour · **Authenticated:** 5000 requests/hour
* ContriHub prioritizes manual input first (always available), with GitHub auto-fetch as an optional enhancement — no scraping, API-compliant only.
* Current implementation reacts to GitHub rate-limit responses (403) with a clear error message; it does not yet proactively throttle or back off.

---

## 🧪 Project Status

🚧 **Actively under development**
Built incrementally with a focus on **learning backend while shipping features**.

---

## 🔭 Future Scope

Planned, but **not yet implemented** in the current codebase:

* **PDF export** of a contribution portfolio (for offline sharing/resumes)
* **OAuth-based GitHub login**, replacing the current server-side personal access token model
* **PostgreSQL migration** (or hybrid model) for more relational data modeling
* **Manual addition of standalone Issues and Repositories** as portfolio items (currently only Pull Requests can be added; issues exist only as links attached to a PR)
* **Persisted GitHub labels** on contributions (labels are fetched during auto-fetch but not currently stored on the contribution record)
* **Proactive GitHub rate-limit handling** (backoff/retry, request budgeting) rather than reactive error handling
* **Automated tests** and CI/CD pipeline
* **Deployment configuration** (e.g. Vercel/Render config files, Dockerfile) to match the intended deployment targets
* Performance optimizations and caching for heavier traffic (e.g. precomputed activity heatmaps, if usage justifies it)

---

## 📄 License

MIT License