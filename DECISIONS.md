# DECISIONS.md — Architectural Decision Log

## [DECISION-001] Tech Stack Selection
- **Decision:** Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + SQLite (via Drizzle ORM)
- **Alternatives considered:**
  - React + Express + PostgreSQL (more complex, slower to prototype)
  - Remix (less familiar ecosystem)
  - Plain React + Supabase (adds external dependency for prototype)
- **Reasoning:** Next.js 15 App Router provides Server Components for fast initial load, API routes in one codebase, and streamlined development. SQLite is sufficient for prototype (single user, local development). Tailwind for rapid UI development.
- **Tradeoff:** SQLite doesn't scale for multi-tenant production, but acceptable for prototype scope.

## [DECISION-002] AI Provider — Google Gemini
- **Decision:** Use Google Gemini (gemini-3-flash-preview) via Vercel AI SDK for all AI features
- **Alternatives considered:**
  - OpenAI GPT-4 (more expensive, similar capabilities)
  - Anthropic Claude (excellent but requires separate SDK setup)
  - No AI / pure rule-based (functional but less compelling)
- **Reasoning:** Gemini offers fast inference, good reasoning capabilities, and generous free tier for prototyping. Vercel AI SDK provides unified interface with streaming support.
- **Tradeoff:** Gemini is newer with less community examples, but SDK abstracts most complexity.

## [DECISION-003] Matching Architecture — Hybrid Rule + AI
- **Decision:** Two-layer matching: (1) Rule-based scoring on grant fields, (2) AI enhancement for natural language explanations
- **Alternatives considered:**
  - Pure rule-based (no AI) — fast but can't explain fit naturally
  - Pure AI (send all grants to LLM) — expensive, slow, unnecessary
  - Vector similarity search — overkill for prototype, adds embedding complexity
- **Reasoning:** Rule-based handles 90% of scoring cheaply and deterministically. AI adds the "magic" — explaining WHY a grant fits and identifying non-obvious gaps. Customer has no time to read grants; needs quick answers.
- **Tradeoff:** AI calls add latency (~1-2s). Mitigated by caching match results.

## [DECISION-004] UX Priority — Dashboard First, Not Search
- **Decision:** Default view is a dashboard showing top matched grants and pipeline status, not a search interface
- **Alternatives considered:**
  - Search-first UI (like Grants.gov itself)
  - List view with filters
- **Reasoning:** Target user is CFO with "10 minutes a week" — no time to actively search. Product value is PASSIVE discovery: surface matches immediately, let user act on them.
- **Tradeoff:** Less "power user" control. Acceptable because target user is time-constrained executive, not grants researcher.

## [DECISION-005] Match Analysis — Show Both Sides
- **Decision:** Display both "What Matches" and "Gaps / Not Matching" in grant analysis
- **Alternatives considered:**
  - Only show positives (what matches)
  - Only show score without breakdown
- **Reasoning:** CFO needs complete picture to make quick go/no-go decisions. Showing gaps builds trust and saves time investigating poor fits.
- **Tradeoff:** More complex UI, but worth it for decision quality.

## [DECISION-006] AI Chat — Contextual Assistant
- **Decision:** Include AI chat on grant detail page with full context about grant + organization profile
- **Alternatives considered:**
  - No chat (just static analysis)
  - Global chat without grant context
- **Reasoning:** CFO will have specific questions about eligibility, deadlines, requirements. Pre-loading context means instant relevant answers without re-explaining.
- **Tradeoff:** More API usage, but streaming makes it feel responsive.
