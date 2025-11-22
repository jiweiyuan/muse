# Muse

AI-powered music generation platform with conversational interface. Generate complete songs from natural language prompts.

## Architecture

Full-stack TypeScript application built for London AI Hackathon 2025.

**Stack**:
- Frontend: Next.js 15 (App Router) + React 19 + tldraw
- Backend: Fastify + PostgreSQL + Redis
- AI: Vercel AI SDK + MiniMax v2 (fal.ai) + multi-provider LLM support

**Key Design Decisions**:
- Vercel AI SDK for unified LLM interface and streaming
- tldraw for canvas-based creative workspace with real-time sync
- Fastify over Express for better TypeScript support and performance
- Drizzle ORM for type-safe database queries
- Better Auth for simple OAuth implementation
- Monorepo with shared TypeScript schemas

## Stack Details

### Frontend
```
next@15.5.4              # App Router, Turbopack, Server Components
react@19.2.0             # Concurrent features, Server Components
tldraw@3.15.5            # Canvas SDK with real-time sync
@ai-sdk/react@2.0.68     # useChat hook, streaming responses
@tiptap/core@3.8.0       # Rich text editor for chat input
zustand@5.0.8            # Client state (chat drafts, pending messages)
@tanstack/react-query    # Server state caching
framer-motion@12.23.24   # Animations
tailwindcss@4.1.14       # Styling
```

### Backend
```
fastify@5.6.1            # HTTP server
drizzle-orm@0.44.6       # ORM with TypeScript inference
pg@8.16.3                # PostgreSQL client
ioredis@5.8.2            # Redis for sessions/cache
better-auth@1.3.27       # Authentication
ai@5.0.63                # Vercel AI SDK core
@fal-ai/client@1.7.2     # MiniMax v2 music generation
@tldraw/sync-core        # Canvas real-time sync
ws@8.18.0                # WebSocket server
```

### AI Providers
```
@ai-sdk/openai           # GPT-4, GPT-4o
@ai-sdk/anthropic        # Claude 3.5 Sonnet
@ai-sdk/google           # Gemini Pro
@ai-sdk/mistral          # Mistral Large
@openrouter/ai-sdk-provider  # Multi-provider fallback
replicate                # Image/video models
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Env validation (Zod)
│   │   │   └── constants.ts
│   │   ├── routes/
│   │   │   └── v1/
│   │   │       ├── project-chats.ts    # Chat CRUD
│   │   │       ├── project.ts          # Project management
│   │   │       └── index.ts            # Route registration
│   │   ├── services/
│   │   │   ├── messages.ts         # Message handling + AI streaming
│   │   │   ├── title-generator.ts  # Auto-generate chat titles
│   │   │   └── music-generation/
│   │   │       ├── minimax.ts      # MiniMax v2 integration
│   │   │       ├── lyrics.ts       # Lyric generation
│   │   │       ├── cover.ts        # Album art (fal.ai)
│   │   │       └── content-fetcher.ts
│   │   └── server.ts               # Fastify setup + plugins
│   └── migrations/                 # SQL migrations
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── shapes/         # Custom tldraw shapes
│   │   │   │   │   └── audio-shape/    # Audio player shape
│   │   │   │   ├── audio-generator.tsx
│   │   │   │   ├── image-generator.tsx
│   │   │   │   └── canvas-container.tsx
│   │   │   ├── chat/
│   │   │   │   ├── conversation-chat.tsx   # Chat UI
│   │   │   │   ├── use-model.ts           # Model selection hook
│   │   │   │   └── tool-invocation.tsx    # Render AI tool calls
│   │   │   └── chat-input/
│   │   ├── hooks/
│   │   │   ├── use-chat-submit.ts
│   │   │   └── use-message-handlers.ts
│   │   └── (routes)/
│   └── lib/
│       ├── chat-store/         # Zustand stores
│       ├── canvas-store/
│       └── project-store/
└── shared-schemas/             # Shared TS types
```

## Music Generation Flow

```typescript
// 1. User sends message via chat
POST /api/v1/chat
{
  messages: [...],
  model: "gpt-4o",
  tools: [generateMusicTool, generateLyricsTool]
}

// 2. LLM decides to call music generation tool
// Backend parses tool call -> invokes MiniMax v2

// src/services/music-generation/minimax.ts
const result = await fal.subscribe("fal-ai/minimax-music/v2", {
  input: {
    prompt: `${genre}, ${mood}`,
    lyrics: generatedLyrics,
    sample_rate: 44100,
    bitrate: 256000,
    format: "mp3"
  }
})

// 3. fal.ai returns audio URL
// 4. Backend streams tool result to frontend
// 5. Frontend creates audio shape on canvas
```

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- pnpm 9+

### Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://localhost:5432/muse
REDIS_URL=redis://localhost:6379

BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:8000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI providers (need ≥3 for hackathon)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
FAL_KEY=                    # Required for music generation
VALYU_API_KEY=              # Required for search

# Storage (optional, falls back to local)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

ENCRYPTION_KEY=<random-string>
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000
```

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Setup database
cd backend
pnpm migrate:up

# Terminal 1: Backend (http://localhost:8000)
cd backend
pnpm dev

# Terminal 2: Frontend (http://localhost:3000)
cd frontend
pnpm dev
```

## Key Implementation Details

### AI Streaming with Vercel AI SDK

```typescript
// backend/src/services/messages.ts
import { streamText } from 'ai'

export async function handleChatMessage(messages, model) {
  const result = streamText({
    model: getModel(model),
    messages,
    tools: {
      generateMusic: {
        description: 'Generate music from lyrics',
        parameters: z.object({
          lyrics: z.string(),
          genre: z.string(),
          mood: z.string().optional()
        }),
        execute: async ({ lyrics, genre, mood }) => {
          return await generateMusicWithMiniMax({ lyrics, genre, mood })
        }
      }
    }
  })

  return result.toDataStreamResponse()
}
```

### Canvas Sync with tldraw

```typescript
// frontend/app/components/canvas/canvas-container.tsx
import { Tldraw, TLStore } from 'tldraw'
import { useSync } from '@tldraw/sync'

const store = useSync({
  uri: `ws://localhost:8000/sync/${projectId}`,
  // Real-time collaboration via WebSocket
})

<Tldraw store={store} />
```

### Custom Audio Shape

```typescript
// frontend/app/components/canvas/shapes/audio-shape/AudioShapeUtil.tsx
export class AudioShapeUtil extends BaseBoxShapeUtil<AudioShape> {
  static type = 'audio' as const

  component(shape: AudioShape) {
    return <AudioPlayer src={shape.props.url} />
  }

  indicator(shape: AudioShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

## API Endpoints

```
POST   /api/v1/chat                 # Streaming chat completion
GET    /api/v1/chats/:projectId     # List chats
POST   /api/v1/chats                # Create chat
DELETE /api/v1/chats/:id            # Delete chat

GET    /api/v1/projects             # List projects
POST   /api/v1/projects             # Create project
DELETE /api/v1/projects/:id         # Delete project

POST   /api/v1/music/generate       # Generate music (internal)
GET    /api/v1/music/status/:id     # Check status
GET    /api/v1/music/result/:id     # Get result

WS     /sync/:projectId             # tldraw sync WebSocket
```

## Database Schema

```sql
-- migrations/001_initial.sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chats (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chats_project_id ON chats(project_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
```

## Development

### Code Quality
```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# Format code
pnpm format
```

### Database Migrations
```bash
# Create migration
pnpm migrate:create migration_name

# Run migrations
pnpm migrate:up

# Rollback
pnpm migrate:down
```

## Deployment

### Frontend (Vercel)
```bash
cd frontend
pnpm build
```

### Backend (Docker/Railway/Fly.io)
```bash
cd backend
pnpm build
pnpm start
```

## Contributing

This project was built for the London AI Hackathon 2025. Contributions, issues, and feature requests are welcome!

## License

MIT

## Acknowledgments

- **London AI Hackathon 2025** - Event organizers
- **fal.ai** - Generative music models
- **valyu.ai** - Search integration
- **OpenAI** - LLM providers

---

**Built with 💜 for the London AI Hackathon 2025**
