# Rockland

**Grant Discovery & Pipeline Management Tool for FQHC CFOs**

A prototype tool that helps Federally Qualified Health Center (FQHC) CFOs discover relevant federal grants and manage their funding pipeline. Built for busy finance teams who have ~10 minutes per week to review grant opportunities.

## Features

- **Smart Grant Discovery** - Real-time search of Grants.gov API with health-focused filtering (HRSA, HHS, CDC, SAMHSA, NIH)
- **AI-Powered Matching** - Google Gemini analyzes grant fit against your organization profile with explanations
- **Match Analysis** - See what matches AND what doesn't match for each grant opportunity
- **AI Chat Assistant** - Ask questions about specific grants, eligibility, and application requirements
- **Pipeline Tracker** - Visual board to manage grants: Interested → Evaluating → Applying → Submitted → Awarded
- **Organization Profile** - Configure your FQHC's services, demographics, and active grants for personalized matching

## Screenshots

| Dashboard | Grant Detail with AI Chat |
|-----------|---------------------------|
| Top matching grants at a glance | Full analysis + AI assistant |

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/aman-jaglan/rockland.git
cd rockland
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Add your Google AI API key to `.env.local`:

```
GOOGLE_API_KEY=your_google_ai_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

> **Note:** The app works without an API key using rule-based matching. AI features (chat, smart explanations) require the Google API key.

### Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 | App Router, Server Components |
| React 19 | UI framework |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| Vercel AI SDK | AI integration |
| Google Gemini | AI model (gemini-3-flash-preview) |
| Drizzle ORM | Database (SQLite for local dev) |
| Grants.gov API | Real federal grant data |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Dashboard  │  │   Pipeline  │  │  Grant Detail + AI  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│  /api/grants  │  /api/match  │  /api/chat  │  /api/pipeline │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│      Grants.gov API          │        Google Gemini AI       │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

- **Server Components** - Grants and pipeline data load server-side for fast initial render
- **Hybrid Matching** - Rule-based pre-filtering (fast, free) + AI scoring (smart explanations)
- **Dashboard-First UX** - CFOs need passive discovery, not active search
- **Streaming Chat** - AI responses stream in real-time for better UX

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Dashboard pages (/, /discover, /pipeline, /profile)
│   ├── grants/[id]/        # Grant detail page with AI chat
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Reusable UI components (Button, Card, Badge, etc.)
│   └── features/           # Feature-specific components
├── lib/
│   ├── api/                # API clients (grants-gov, ai-matching, ai-chat)
│   ├── data/               # Synthetic profile for demo
│   ├── db/                 # Database schema and cache
│   └── types/              # TypeScript type definitions
```

## How Matching Works

1. **Fetch Grants** - Pull opportunities from Grants.gov API filtered for health agencies
2. **Rule-Based Scoring** - Check agency relevance, service alignment, demographics, location
3. **AI Enhancement** - Gemini provides natural language explanations and identifies gaps
4. **Present Results** - Show what matches, what doesn't, and any concerns

Match scores range from 1-10:
- **8-10**: Strong match - prioritize this grant
- **5-7**: Moderate match - worth reviewing
- **1-4**: Limited match - likely not a fit

## Key Decisions

See [DECISIONS.md](./DECISIONS.md) for architectural choices and tradeoffs.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Demo Mode

The app includes a synthetic FQHC profile (Bay Area Community Health Center) for demonstration. You can edit this profile at `/profile` to match your organization.

## License

MIT
