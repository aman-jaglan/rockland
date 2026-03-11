# Rockland

Grant Discovery & Pipeline Management Tool for FQHC CFOs

## Overview

Rockland helps Federally Qualified Health Center (FQHC) CFOs discover relevant grants and manage their funding pipeline. It surfaces matching opportunities automatically, so busy finance teams can focus on applications rather than manual database searches.

## Features

- **Grant Discovery**: Real-time search of Grants.gov opportunities filtered for FQHC relevance
- **AI Matching**: Automatic scoring and explanation of grant fit against your organization profile
- **Pipeline Tracker**: Kanban board to manage grants through discovery -> submission -> awarded
- **Organization Profile**: Configure your FQHC's services and demographics for personalized matching

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/aman-jaglan/rockland.git
cd rockland
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Variables:
- `ANTHROPIC_API_KEY` (optional) - Enables AI-powered matching with Claude
- `OPENAI_API_KEY` (optional) - Fallback AI matching with OpenAI
- `DATABASE_URL` (optional) - Defaults to local SQLite file

Note: The tool works without AI keys using rule-based matching.

### Running Locally

```bash
npm run dev
```

Open http://localhost:3000

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM + SQLite
- Grants.gov API (real data)

## Architecture

- **Server Components** for data fetching - grants and pipeline data load on the server for fast initial render
- **API routes** for data mutations - pipeline updates and profile changes go through `/api` endpoints
- **Hybrid AI + rule-based matching** - rule-based pre-filtering handles 90% of work cheaply; AI adds natural language fit explanations

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard route group
│   └── api/               # API routes
├── components/
│   ├── ui/                # Reusable primitives
│   └── features/          # Feature components
├── lib/
│   ├── api/               # API clients
│   ├── db/                # Database schema
│   ├── types/             # TypeScript types
│   └── utils/             # Pure utility functions
├── hooks/                 # Custom React hooks
└── constants/             # App-wide constants
```

## Key Decisions

See [DECISIONS.md](./DECISIONS.md) for architectural choices and tradeoffs.

## Deployment

This project is configured for Vercel deployment:

```bash
npm run build
```

Or connect your GitHub repository to Vercel for automatic deployments.

## License

MIT
