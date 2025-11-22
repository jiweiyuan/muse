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

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with Turbopack
- **UI**: React 19, TypeScript, Tailwind CSS
- **Components**: Radix UI, Framer Motion, Lucide Icons
- **Canvas**: tldraw for interactive visual workspace
- **Rich Text**: TipTap editor with markdown support
- **AI Integration**: Vercel AI SDK for streaming responses
- **State Management**: Zustand, TanStack Query
- **Syntax Highlighting**: Shiki
- **Video**: Remotion for programmatic video generation

### Backend
- **Server**: Fastify with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis (ioredis)
- **Authentication**: Better Auth with Google OAuth
- **Storage**: AWS S3 / Cloudflare R2
- **Real-time**: WebSocket with tldraw sync
- **API Documentation**: Fastify Swagger

### AI & Media Generation
- **LLM Providers**:
  - OpenAI (GPT models)
  - Anthropic (Claude)
  - Google (Gemini)
  - Mistral
  - OpenRouter (multi-provider access)
- **Music Generation**: MiniMax v2 via fal.ai
- **Image Generation**: fal.ai, Replicate
- **Search**: Valyu AI for RAG capabilities

## Key Features

### 🎵 AI Music Generation
- **Text-to-Music**: Transform lyrics and descriptions into complete songs
- **MiniMax v2 Integration**: High-quality music generation via fal.ai
- **Genre & Mood Control**: Customize musical style and emotional tone
- **Configurable Audio**: Adjust sample rate, bitrate, and format (MP3, FLAC, PCM)

### 🎨 Creative Workflow
- **Interactive Canvas**: Visual workspace powered by tldraw
- **Multi-Modal Generation**: Create audio, images, and videos
- **Album Cover Generation**: AI-generated artwork for your music
- **Lyrics Generation**: AI-powered lyric writing assistance
- **Content Fetching**: Import inspiration from web sources

### 💬 Conversational AI Interface
- **Multi-Model Support**: Switch between different AI models
- **Streaming Responses**: Real-time AI message generation
- **Tool Invocations**: AI can trigger music/image generation
- **File Uploads**: Attach images, audio, and documents
- **Project-Based Organization**: Manage multiple creative projects
- **Chat History**: Persistent conversation storage

### 🎯 Advanced Capabilities
- **Real-time Collaboration**: Shared canvas with WebSocket sync
- **Search Integration**: Valyu AI for enhanced context retrieval
- **Asset Management**: Organize generated media in project drawers
- **Responsive Design**: Works across desktop and mobile devices

## Project Structure

```
muse/
├── frontend/               # Next.js application
│   ├── app/
│   │   ├── components/
│   │   │   ├── canvas/    # tldraw canvas components
│   │   │   ├── chat/      # Conversation UI
│   │   │   └── chat-input/
│   │   ├── hooks/         # React hooks
│   │   └── layout.tsx
│   └── lib/
│       ├── chat-store/    # Chat state management
│       ├── canvas-store/  # Canvas state
│       └── project-store/ # Project organization
├── backend/               # Fastify server
│   ├── src/
│   │   ├── config/       # Environment & constants
│   │   ├── routes/       # API endpoints
│   │   ├── services/
│   │   │   └── music-generation/
│   │   │       ├── minimax.ts    # MiniMax integration
│   │   │       ├── lyrics.ts     # Lyric generation
│   │   │       ├── cover.ts      # Album art
│   │   │       └── content-fetcher.ts
│   │   └── server.ts
│   └── migrations/       # Database migrations
└── shared-schemas/       # Shared TypeScript types
```

## Music Generation Pipeline

1. **User Input**: Describe song concept via chat interface
2. **AI Processing**: LLM interprets request and generates lyrics
3. **Music Synthesis**: MiniMax v2 creates audio from lyrics + genre/mood
4. **Cover Art**: fal.ai generates matching album artwork
5. **Canvas Integration**: All assets appear in interactive workspace

## Setup & Installation

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis
- pnpm

### Environment Variables

**Backend** (`.env`):
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/muse
REDIS_URL=redis://localhost:6379

# Authentication
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Providers (use at least 3 for hackathon)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
FAL_KEY=...                    # For music generation
VALYU_API_KEY=...              # For search

# Optional
REPLICATE_API_TOKEN=...
OPENROUTER_API_KEY=...

# Storage (optional)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

# Server
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000
ENCRYPTION_KEY=your-encryption-key
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/muse.git
cd muse
```

2. **Install dependencies**:
```bash
pnpm install
```

3. **Set up database**:
```bash
cd backend
pnpm migrate:up
```

4. **Start development servers**:

Terminal 1 (Backend):
```bash
cd backend
pnpm dev
```

Terminal 2 (Frontend):
```bash
cd frontend
pnpm dev
```

5. **Open application**:
Navigate to `http://localhost:3000`

## Hackathon Integration

### Technologies Used (3+ Required)
1. ✅ **OpenAI** - Primary LLM for chat interface
2. ✅ **fal.ai** - MiniMax v2 music generation
3. ✅ **Valyu AI** - Search and RAG capabilities
4. ✅ **ElevenLabs** - Potential voice integration
5. ✅ **Anthropic** - Claude models for enhanced reasoning

### Submission Details
- **Track**: Open Innovation
- **Video Demo**: [Link to Loom]
- **Live Demo**: [Deployment URL]

## API Endpoints

### Music Generation
- `POST /api/v1/music/generate` - Generate music from lyrics
- `GET /api/v1/music/status/:id` - Check generation status
- `GET /api/v1/music/result/:id` - Retrieve generated audio

### Chat
- `POST /api/v1/chat` - Streaming chat completion
- `GET /api/v1/chats/:projectId` - List project chats
- `POST /api/v1/chats` - Create new chat

### Projects
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create new project
- `DELETE /api/v1/projects/:id` - Delete project

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
