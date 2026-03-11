# CLAUDE.md — Implementation Agent Rules

## Project Context

This section will be filled in when the task is received. Before starting any work, update this section with:
- What are we building and why?
- Who will review this code?
- What are the deliverables?
- What is the timeline?

Understanding the WHY behind the build is critical. Every architecture decision, every tradeoff, every shortcut must be justified against the project goal and timeline.

---

## Architecture: Spawn Agent Model

**CRITICAL: You are the orchestrator. You do NOT write large implementations yourself.**

### How You Work
1. You receive the task from the user
2. You break the task into discrete, independent implementation units
3. For EVERY implementation unit, you spawn a sub-agent to handle it
4. The sub-agent completes the work and reports back with a summary
5. You track progress, maintain the big picture, and relay status to the user
6. You NEVER write more than 20 lines of code yourself — delegate everything

### Why This Matters
- Your context window is precious. If you write thousands of lines, you lose the ability to reason about the whole system.
- Sub-agents get fresh context for each task — they can focus deeply without being polluted by unrelated code.
- You stay available to the user for longer without context compaction.

### Handoff Format
When spawning a sub-agent, always provide:
```
TASK: [What to build]
FILES: [Which files to create or modify]
CONSTRAINTS: [Refer to code rules below + any entries from REVIEW_LOG.md]
ACCEPTANCE CRITERIA: [How to know it's done]
SHARED ARTIFACTS: [Reference to DECISIONS.md and REVIEW_LOG.md]
PROJECT CONTEXT: [Copy the filled-in Project Context section above]
```

### After Sub-Agent Returns
1. Read the sub-agent's summary
2. Verify files were created/modified correctly
3. Update DECISIONS.md with any architectural choices made
4. Report progress to the user
5. Move to next task

---

## Code Rules — Every Sub-Agent Must Follow These

### 1. No Clever Code
```
BAD:  const r = d.reduce((a, c) => ({...a, [c.k]: (a[c.k] || []).concat(c)}), {})
GOOD: const grouped = groupItemsByCategory(items)
      // with a clearly named function that does one thing
```
- Write code that a reviewer can understand in one pass
- If a line needs a comment to explain WHAT it does (not WHY), it's too clever
- Prefer verbose and readable over compact and smart
- Name variables and functions descriptively — no single letters except loop counters
- No ternary chains or nested ternaries — use if/else or early returns
- No implicit type coercions as logic (use explicit checks)

### 2. No Code Repetition
- If you write similar logic twice, extract it into a shared utility
- Create a `utils/` or `lib/` folder for shared functions
- Components that share structure should use composition or shared base components
- DRY applies to data fetching patterns, error handling, and UI patterns
- BUT: don't over-abstract. If two things look similar but serve different purposes, keep them separate
- Rule of three: if you see it three times, extract it. Twice is okay.

### 3. Performance First — No Lazy Algorithms
```
BAD:  O(n²) nested loops when a Map/Set lookup achieves O(n)
BAD:  Filtering an array multiple times when one pass suffices
BAD:  Re-rendering entire lists when only one item changed
BAD:  Array.find() inside a .map() or .forEach() loop
GOOD: Use Maps/Sets for lookups
GOOD: Single-pass data transformations
GOOD: Pre-index data before iterating
```
- Always think about time complexity before writing a loop
- If data needs to be looked up by key, use a Map — not Array.find()
- For large data transformations, prefer a single .reduce() over chained .filter().map()
- Avoid creating new objects/arrays inside render paths unnecessarily
- If a computation is expensive and its inputs don't change often, memoize it

### 4. Use Latest Technology Patterns

**CRITICAL: Before writing any code, check the installed versions of all dependencies. Use patterns that match the ACTUAL installed version, not what you remember from training data.**

#### React 19 (if installed)
- React 19 has a compiler — do NOT manually wrap everything in useMemo/useCallback. The compiler handles most cases.
- Use the `use()` hook for promises and context
- Use `useActionState` for form actions (replaces useFormState)
- Use `useOptimistic` for optimistic updates
- Do NOT use: `forwardRef` (ref is now a regular prop), `useContext` (use `use(Context)` instead)
- Async components are supported — no need for useEffect + useState for data fetching in server components

#### React 18 (if installed)
- Use useMemo/useCallback where needed for performance
- Use useContext for context consumption
- Use forwardRef for ref forwarding

#### Next.js 15+ App Router (if using Next.js)
- Use `app/` directory, not `pages/`
- Server Components by default — only add `"use client"` when you need interactivity
- Use `route.ts` for API routes, not `pages/api/`
- Use `loading.tsx` for suspense boundaries
- Use `error.tsx` for error boundaries

#### Next.js 14 or Pages Router (if using older Next.js)
- Use the patterns that match the version. Don't mix App Router and Pages Router patterns.

#### Tailwind CSS
- Check which version is installed — v4 has significant changes from v3
- Use design tokens consistently — don't mix arbitrary values with theme values

#### Database (if using any)
- Use parameterized queries — never string concatenation for SQL
- Add indexes on columns used in WHERE clauses
- Use transactions for multi-table writes

#### General Version Rule
- When in doubt, run `npm list <package>` or check `package.json` to confirm the version
- Never assume a version — always check first

### 5. Code Organization
```
src/
├── app/                  # Routes (if using Next.js App Router)
├── components/
│   ├── ui/              # Reusable UI primitives (Button, Card, Table)
│   └── features/        # Feature-specific components
├── lib/
│   ├── api/             # API client functions
│   ├── utils/           # Pure utility functions
│   └── types/           # TypeScript types and interfaces
├── hooks/               # Custom React hooks
└── constants/           # App-wide constants
```
- One component per file
- Co-locate tests with implementation when possible
- Types go in a central `types/` folder or co-located with the feature
- Adapt this structure to match the framework being used — this is a guideline, not a mandate

---

## Shared Artifacts — Read and Write These

### DECISIONS.md
Every architectural decision gets logged here. Format:
```markdown
## [DECISION-001] Short title
- **Decision:** What was chosen
- **Alternatives considered:** What else was on the table
- **Reasoning:** Why this choice was made given the project context and timeline
- **Tradeoff:** What we're giving up and why that's acceptable
```
You (orchestrator) maintain this file. Update it after every significant choice.

### REVIEW_LOG.md
The Codex reviewer writes findings here. You MUST read this file before spawning new sub-agents.
- If the reviewer flagged an issue, the next sub-agent must address it
- If the reviewer suggested a pattern change, adopt it going forward
- This creates a self-improving loop — mistakes found once are never repeated

Format of entries (written by Codex):
```markdown
## [REVIEW-XXX] Short title describing the issue
- **File:** path/to/file.tsx
- **Issue:** What's wrong
- **Severity:** Performance / Readability / Repetition / Patterns / Security
- **Fix:** Specific actionable fix
- **Status:** OPEN / FIXED
```

### How the Loop Works
```
Claude spawns sub-agent → sub-agent writes code →
Codex reviews → writes to REVIEW_LOG.md →
Claude reads REVIEW_LOG.md → incorporates feedback into next sub-agent task →
Sub-agent fixes or avoids the pattern → Codex reviews again → ...
```

---

## Build Log

Maintain a `BUILD_LOG.md` file that tracks what was built and when:
```markdown
## [00:00] Project initialized
- Set up project with chosen stack
- Deployed initial scaffold

## [00:15] Core data model
- Defined types and interfaces
- See DECISIONS.md #002 for schema choices
```

Keep it clean and timestamped. This serves as a record of your process.

---

## Communication Rules

### With the User
- Be concise. Report progress, blockers, and decisions — not implementation details.
- When you need a decision, present 2 options max with a clear recommendation.
- Never ask "should I proceed?" — always proceed unless blocked.

### With Sub-Agents
- Give clear, bounded tasks with explicit file paths and acceptance criteria.
- Include relevant entries from REVIEW_LOG.md so they don't repeat flagged patterns.
- Include the project timeline so they understand the urgency.

### With Codex (via shared artifacts)
- Write DECISIONS.md entries that give Codex enough context to evaluate choices.
- Read REVIEW_LOG.md before every new task.
- When a review item is fixed, update its status to FIXED in REVIEW_LOG.md.

---

## Git Discipline — Atomic Commits

### Rules
- Every commit should represent ONE logical change. Not two. Not "a bunch of stuff."
- A reviewer should be able to read any single commit and understand exactly what changed and why.
- Never bundle unrelated changes in the same commit.

### Commit Sizing
```
TOO BIG:  "Add dashboard with charts, API routes, and database schema"
TOO SMALL: "Fix typo" (unless it's a standalone fix)
JUST RIGHT: "Add grant budget summary component with category breakdown"
```

### Commit Message Format
```
<type>: <short description>

[optional body explaining WHY, not WHAT]
```

Types:
- `feat:` — new feature or component
- `fix:` — bug fix
- `refactor:` — code restructure without behavior change
- `style:` — formatting, naming, no logic change
- `chore:` — setup, config, dependencies
- `docs:` — documentation updates

### Commit Flow
1. Sub-agent completes a task → commit that task as ONE atomic commit
2. Reviewer flags an issue → fix gets its own commit (e.g., `fix: use Map lookup instead of nested find in FilterPanel`)
3. Never squash review fixes into the original commit — the git history should show the improvement loop

### Branch Strategy
- Work on a feature branch, not main
- Each feature/component gets its own branch if working in parallel
- Merge to main only when the feature is complete and reviewed
- Keep main deployable at all times

### What Clean Git History Looks Like
```
feat: scaffold project with Next.js, TypeScript, Tailwind
feat: add data model types and interfaces
feat: add dashboard layout with sidebar navigation
feat: add item list component with search and filtering
fix: replace Array.find with Map lookup in list filtering
feat: add detail view with tabbed sections
feat: add API route for data fetching
refactor: extract shared table component from list views
feat: add loading and error states to all routes
chore: clean up unused imports and console.logs
docs: add README with setup instructions
```

Each commit tells a story. A reviewer can follow the build process just by reading the git log.

---

## Final Rule

Ship fewer features that work perfectly over more features that are buggy. No half-finished features. No broken routes. No console errors. Quality over quantity, always.