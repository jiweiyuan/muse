# Muse Frontend Setup

## Prerequisites

- Node.js 18+
- npm or pnpm
- A running Muse backend (Fastify + PostgreSQL)

## Environment Variables

Create `frontend/.env.local` and configure:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional model provider keys
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=
OPENROUTER_API_KEY=

# Optional tooling
EXA_API_KEY=
GITHUB_TOKEN=
```

The backend requires its own `.env.local` (see repository root) containing `DATABASE_URL`, `BETTER_AUTH_SECRET`, and related values.

## Install & Run

```bash
cd frontend
npm install
npm run dev
```

By default the frontend expects the backend at `http://localhost:8000`. Adjust the environment variables if you expose the API elsewhere.

## Authentication

Muse now uses [Better Auth](https://better-auth.com) with email/password and anonymous sessions. The frontend talks directly to the backend’s `/auth/*` routes, so no Supabase setup is required.

## Postgres & Migrations

Run the backend migrations against your PostgreSQL database before starting the frontend. The backend repo includes `Dockerfile.migrate` and `drizzle` config for convenience.

## File Uploads & Sharing

File uploads and public sharing are disabled by default until a storage layer is configured. The UI will hide those controls.

## Support

Questions or issues? Open an issue on GitHub.
