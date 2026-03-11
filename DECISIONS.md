# DECISIONS.md — Architectural Decision Log

## [DECISION-001] Tech Stack Selection
- **Decision:** Next.js 15 + TypeScript + Tailwind CSS + SQLite (via Drizzle ORM) + Vercel deployment
- **Alternatives considered:**
  - React + Express + PostgreSQL (more complex, slower to deploy)
  - Remix (less familiar, harder to find deployment patterns quickly)
  - Plain React + Supabase (adds external dependency)
- **Reasoning:** Next.js 15 App Router gives us Server Components for fast initial load, API routes in one codebase, and one-click Vercel deployment. SQLite is sufficient for prototype (synthetic data, single user). Tailwind for rapid UI development.
- **Tradeoff:** SQLite doesn't scale for multi-tenant, but that's fine for a 2-3 hour prototype. Can swap to PostgreSQL later.

## [DECISION-002] Matching Architecture — Hybrid Rule + AI
- **Decision:** Two-layer matching: (1) Rule-based pre-filtering on Grants.gov fields, (2) AI scoring via Claude/OpenAI API for fit explanation
- **Alternatives considered:**
  - Pure rule-based (no AI) — fast but can't explain fit in natural language
  - Pure AI (send all grants to LLM) — expensive, slow, unnecessary
  - Vector similarity search — overkill for prototype, adds complexity
- **Reasoning:** Rule-based handles 90% of filtering cheaply. AI adds the "magic" that justifies the product — explaining WHY a grant fits the FQHC profile. Customer transcript shows CFO has no time to read through grants; she needs answers.
- **Tradeoff:** AI calls add latency and cost. Mitigated by pre-filtering and caching scores.

## [DECISION-003] UX Priority — Dashboard First, Not Search
- **Decision:** Default view is a dashboard showing top matched grants and pipeline status, not a search interface
- **Alternatives considered:**
  - Search-first UI (like Grants.gov itself)
  - List view with filters
- **Reasoning:** Customer transcript: "10 minutes a week" + "working until 10pm" = no time to search. PR FAQ says discovery, but customer needs PASSIVE discovery. Surface matches immediately; let her act on them.
- **Tradeoff:** Less "power user" control. Acceptable because target user is time-constrained CFO, not grants researcher.
