# Multi-Step Music Generation Agent Implementation

## Overview

This document describes how to implement a multi-step AI agent that can write lyrics and generate music in a sequential workflow. The agent uses the AI SDK's multi-step tool calling capability to chain together two dependent operations:

1. **Write Lyrics** - Generate song lyrics based on user's prompt
2. **Generate Music** - Create music from the generated lyrics

## Architecture

### Two Workflows

**Workflow 1: Direct Creation**
```
User Request → AI Agent → Step 1: writeLyrics → Step 2: generateMusic → Final Response
```

**Workflow 2: URL-Based Creation**
```
User Drops URL → AI Agent → Step 1: fetchWebsiteContent → Step 2: writeLyrics → Step 3: generateMusic → Final Response
```

The AI model intelligently determines when to call each tool and can make multiple tool calls in sequence within a single generation to accomplish complex tasks. When a URL is detected, it will first fetch the content, analyze it, then create lyrics and music based on the website's content.

## Prerequisites

Before implementing, make sure you have:

1. **Node.js** 18+ installed
2. **API Keys**:
   - OpenAI API key (for chat and lyrics generation)
   - FAL-AI API key (for music generation)

### Installation

Install required dependencies:

```bash
# Core dependencies
pnpm add ai @ai-sdk/react @ai-sdk/openai @fal-ai/client zod

# If using Next.js (recommended)
pnpm add next react react-dom

# Optional: For URL validation
pnpm add validator
```

## Implementation

### 1. Client-Side Implementation

Create a React component that handles the chat interface and displays tool execution results.

```tsx
// app/page.tsx or app/components/music-chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import type { ChatMessage } from './api/chat/route';

export default function MusicGeneratorChat() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, isLoading } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Messages Display */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div key={`${message.id}-text-${i}`} className="prose">
                      {part.text}
                    </div>
                  );

                case 'tool-fetchWebsiteContent':
                  return (
                    <div
                      key={`${message.id}-fetch-${i}`}
                      className="border-l-4 border-blue-500 pl-4 my-2"
                    >
                      <h4 className="font-semibold text-blue-700 mb-2">
                        🌐 Fetching Website Content
                      </h4>
                      {part.result && (
                        <div className="bg-white p-3 rounded">
                          {typeof part.result === 'object' && 'title' in part.result ? (
                            <div className="space-y-2">
                              <p className="font-medium">{part.result.title as string}</p>
                              <p className="text-sm text-gray-600">
                                {part.result.description as string}
                              </p>
                              <p className="text-xs text-gray-500">
                                Source: {part.result.source_type as string}
                              </p>
                            </div>
                          ) : (
                            <pre className="text-sm">
                              {JSON.stringify(part.result, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );

                case 'tool-writeLyrics':
                  return (
                    <div
                      key={`${message.id}-lyrics-${i}`}
                      className="border-l-4 border-purple-500 pl-4 my-2"
                    >
                      <h4 className="font-semibold text-purple-700 mb-2">
                        🎵 Writing Lyrics
                      </h4>
                      {part.result && (
                        <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded">
                          {typeof part.result === 'string'
                            ? part.result
                            : JSON.stringify(part.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  );

                case 'tool-generateMusic':
                  return (
                    <div
                      key={`${message.id}-music-${i}`}
                      className="border-l-4 border-green-500 pl-4 my-2"
                    >
                      <h4 className="font-semibold text-green-700 mb-2">
                        🎼 Generating Music
                      </h4>
                      {part.result && (
                        <div className="bg-white p-3 rounded">
                          {typeof part.result === 'object' &&
                          'audioUrl' in part.result ? (
                            <div>
                              <audio
                                controls
                                src={part.result.audioUrl as string}
                                className="w-full"
                              />
                              <p className="text-sm text-gray-600 mt-2">
                                {part.result.description as string}
                              </p>
                            </div>
                          ) : (
                            <pre className="text-sm">
                              {JSON.stringify(part.result, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        ))}

        {isLoading && (
          <div className="text-gray-500 italic">Agent is thinking...</div>
        )}
      </div>

      {/* Input Field */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the song you want to create..."
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={async event => {
              if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
                event.preventDefault();
                if (input.trim()) {
                  sendMessage({ text: input });
                  setInput('');
                }
              }
            }}
            disabled={isLoading}
          />
          <button
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            onClick={() => {
              if (input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Example: "Create a happy pop song about summer vacation"
        </p>
      </div>
    </div>
  );
}
```

### 2. Server-Side API Route

Create the API route that handles the multi-step tool execution.

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import {
  type InferUITools,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

// Define the tools
const tools = {
  fetchWebsiteContent: tool({
    description:
      'Fetch and extract clean, structured content from a website URL. Use this when the user provides a URL to create music about a product, news article, or discussion.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe('The URL to fetch content from (must start with http:// or https://)'),
      extractType: z
        .enum(['summary', 'full'])
        .optional()
        .default('summary')
        .describe('Type of extraction: "summary" for key points, "full" for complete content'),
    }),
    execute: async ({ url, extractType }) => {
      try {
        console.log('Fetching website content from:', url);

        // Call Valyu Contents API
        const response = await fetch('https://api.valyu.ai/v1/contents', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.VALYU_API_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urls: [url],
            response_length: extractType === 'summary' ? 'short' : 'medium',
            extract_effort: 'auto',
            summary: extractType === 'summary'
              ? 'Summarize the key points, main topic, and overall theme in 2-3 paragraphs'
              : false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch content');
        }

        const data = await response.json();

        if (!data.success || data.urls_processed === 0) {
          throw new Error(data.error || 'Failed to process URL');
        }

        const result = data.results[0];

        console.log('Content fetched successfully:', {
          title: result.title,
          length: result.length,
          cost: result.price,
        });

        return {
          title: result.title,
          content: result.content,
          description: result.description,
          url: result.url,
          sourceType: result.source_type,
          publicationDate: result.publication_date,
          summary: extractType === 'summary' && result.summary_success,
          metadata: {
            length: result.length,
            dataType: result.data_type,
            cost: result.price,
          },
        };
      } catch (error) {
        console.error('Error fetching website content:', error);
        throw new Error(
          `Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
  }),

  writeLyrics: tool({
    description:
      'Write song lyrics based on a theme, genre, or description. This should be called first before generating music.',
    inputSchema: z.object({
      theme: z
        .string()
        .describe('The theme or topic of the song (e.g., summer, love, adventure)'),
      genre: z
        .string()
        .describe('The music genre (e.g., pop, rock, jazz, hip-hop)'),
      mood: z
        .string()
        .describe('The mood or emotion (e.g., happy, sad, energetic, calm)'),
      structure: z
        .string()
        .optional()
        .describe('Song structure like "verse-chorus-verse" (optional)'),
    }),
    execute: async ({ theme, genre, mood, structure }) => {
      // TODO: Implement actual lyrics generation
      // This could call an LLM API, your own service, or use a dedicated lyrics generation model

      const lyrics = `[Verse 1]
${theme} fills the air tonight
${mood} feelings shining bright
Every moment feels so right
Dancing in the ${genre} light

[Chorus]
This is our ${theme} song
Where we all belong
${mood} hearts beating strong
Singing all night long

[Verse 2]
Melodies that touch the soul
${genre} rhythms make us whole
Let the music take control
Together we achieve our goal

[Chorus]
This is our ${theme} song
Where we all belong
${mood} hearts beating strong
Singing all night long

[Bridge]
${mood} forever, ${theme} together
${genre} sounds that we remember

[Outro]
${theme} dreams will never fade away
${mood} memories are here to stay`;

      return {
        lyrics,
        metadata: {
          theme,
          genre,
          mood,
          structure: structure || 'verse-chorus-verse-chorus-bridge-outro',
        },
      };
    },
  }),

  generateMusic: tool({
    description:
      'Generate music from lyrics using MiniMax Music 2.0. This should be called after lyrics have been written.',
    inputSchema: z.object({
      lyrics: z
        .string()
        .min(10)
        .max(3000)
        .describe('The song lyrics to generate music for. Use \\n to separate lines. May include structure tags like [Intro], [Verse], [Chorus], [Bridge], [Outro].'),
      genre: z
        .string()
        .describe('The music genre and style description (e.g., "Indie folk, melancholic, introspective")'),
      mood: z
        .string()
        .optional()
        .describe('Additional mood or scenario descriptors'),
    }),
    execute: async ({ lyrics, genre, mood }) => {
      try {
        // Import fal client dynamically
        const { fal } = await import('@fal-ai/client');

        // Configure fal client with API key
        fal.config({
          credentials: process.env.FAL_KEY,
        });

        // Construct the prompt combining genre and mood
        const prompt = mood ? `${genre}, ${mood}` : genre;

        console.log('Generating music with MiniMax v2:', {
          prompt,
          lyricsLength: lyrics.length,
        });

        // Call fal-ai/minimax-music/v2
        const result = await fal.subscribe('fal-ai/minimax-music/v2', {
          input: {
            prompt: prompt,
            lyrics_prompt: lyrics,
            audio_setting: {
              sample_rate: '44100',
              bitrate: '256000',
              format: 'mp3',
            },
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              update.logs?.map((log) => log.message).forEach(console.log);
            }
          },
        });

        console.log('Music generation completed:', result.requestId);

        // Return the result
        return {
          audioUrl: result.data.audio.url,
          format: 'mp3',
          metadata: {
            genre,
            mood,
            sampleRate: 44100,
            bitrate: 256000,
            generatedAt: new Date().toISOString(),
            requestId: result.requestId,
          },
          description: `Generated ${genre} music from lyrics`,
        };
      } catch (error) {
        console.error('Error generating music:', error);
        throw new Error(
          `Failed to generate music: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
  }),
} satisfies ToolSet;

// Export types for client-side usage
export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are a helpful music creation assistant. Your job is to help users create songs in two ways:

**Direct Creation:**
1. Understand what kind of song they want
2. Use writeLyrics to generate appropriate lyrics
3. Use generateMusic to create music from those lyrics

**URL-Based Creation (when user provides a website link):**
1. Use fetchWebsiteContent to extract content from the URL
2. Analyze the content (product, news, discussion, etc.)
3. Use writeLyrics to create lyrics based on the website content
4. Use generateMusic to create music from those lyrics

When a user provides a URL:
- First fetch the content using fetchWebsiteContent
- Identify the main theme, tone, and subject
- Create lyrics that capture the essence of the content
- Generate music that matches the mood

Always be creative and match the desired theme, genre, and mood. For URL-based creation, transform the website content into an engaging musical story.`,
    messages: convertToModelMessages(messages),

    // Allow up to 7 steps for multi-step tool calling
    // This ensures the AI can: fetchWebsiteContent → writeLyrics → generateMusic + final response
    stopWhen: stepCountIs(7),

    tools,

    // Optional: Control maximum number of tool calls per step
    maxSteps: 7,
  });

  return result.toUIMessageStreamResponse();
}
```

### 3. FAL-AI MiniMax Music v2 Integration

#### Installation

First, install the FAL-AI client:

```bash
pnpm add @fal-ai/client
```

#### Configuration

The integration uses the `fal-ai/minimax-music/v2` model which provides:
- High-quality music generation from lyrics
- Advanced AI techniques for diverse compositions
- Support for multiple audio formats and quality settings
- Structure tags support ([Intro], [Verse], [Chorus], [Bridge], [Outro])

#### Music Generation Service Module

Create a dedicated module for music generation:

```ts
// lib/music-generation/minimax.ts
import { fal } from '@fal-ai/client';

export interface MusicGenerationParams {
  lyrics: string;
  genre: string;
  mood?: string;
  audioSettings?: {
    sampleRate?: '8000' | '16000' | '22050' | '24000' | '32000' | '44100';
    bitrate?: '32000' | '64000' | '128000' | '256000';
    format?: 'mp3' | 'pcm' | 'flac';
  };
}

export interface MusicGenerationResult {
  audioUrl: string;
  format: string;
  metadata: {
    genre: string;
    mood?: string;
    sampleRate: number;
    bitrate: number;
    generatedAt: string;
    requestId: string;
  };
  description: string;
}

/**
 * Generate music from lyrics using MiniMax Music 2.0
 */
export async function generateMusicWithMiniMax(
  params: MusicGenerationParams
): Promise<MusicGenerationResult> {
  // Configure fal client
  fal.config({
    credentials: process.env.FAL_KEY,
  });

  // Construct the prompt
  const prompt = params.mood ? `${params.genre}, ${params.mood}` : params.genre;

  console.log('Generating music with MiniMax v2:', {
    prompt,
    lyricsLength: params.lyrics.length,
  });

  // Call fal-ai/minimax-music/v2
  const result = await fal.subscribe('fal-ai/minimax-music/v2', {
    input: {
      prompt: prompt,
      lyrics_prompt: params.lyrics,
      audio_setting: {
        sample_rate: params.audioSettings?.sampleRate || '44100',
        bitrate: params.audioSettings?.bitrate || '256000',
        format: params.audioSettings?.format || 'mp3',
      },
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        update.logs?.map((log) => log.message).forEach(console.log);
      }
    },
  });

  return {
    audioUrl: result.data.audio.url,
    format: params.audioSettings?.format || 'mp3',
    metadata: {
      genre: params.genre,
      mood: params.mood,
      sampleRate: parseInt(params.audioSettings?.sampleRate || '44100'),
      bitrate: parseInt(params.audioSettings?.bitrate || '256000'),
      generatedAt: new Date().toISOString(),
      requestId: result.requestId,
    },
    description: `Generated ${params.genre} music from lyrics`,
  };
}

/**
 * Check the status of a music generation request
 */
export async function checkMusicGenerationStatus(requestId: string) {
  const status = await fal.queue.status('fal-ai/minimax-music/v2', {
    requestId,
    logs: true,
  });

  return status;
}

/**
 * Get the result of a completed music generation request
 */
export async function getMusicGenerationResult(requestId: string) {
  const result = await fal.queue.result('fal-ai/minimax-music/v2', {
    requestId,
  });

  return result;
}
```

#### Advanced Usage: Queue Management

For better user experience with long-running requests, use the queue API:

```ts
// lib/music-generation/queue.ts
import { fal } from '@fal-ai/client';

export async function submitMusicGeneration(params: {
  lyrics: string;
  genre: string;
  mood?: string;
  webhookUrl?: string;
}) {
  const prompt = params.mood ? `${params.genre}, ${params.mood}` : params.genre;

  // Submit to queue
  const { request_id } = await fal.queue.submit('fal-ai/minimax-music/v2', {
    input: {
      prompt,
      lyrics_prompt: params.lyrics,
      audio_setting: {
        sample_rate: '44100',
        bitrate: '256000',
        format: 'mp3',
      },
    },
    webhookUrl: params.webhookUrl, // Optional webhook for completion notification
  });

  return request_id;
}

export async function pollMusicStatus(requestId: string) {
  const status = await fal.queue.status('fal-ai/minimax-music/v2', {
    requestId,
    logs: true,
  });

  return {
    status: status.status,
    logs: status.logs,
  };
}

export async function getMusicResult(requestId: string) {
  const result = await fal.queue.result('fal-ai/minimax-music/v2', {
    requestId,
  });

  return {
    audioUrl: result.data.audio.url,
    requestId: result.requestId,
  };
}
```

#### Best Practices

1. **Lyrics Format**: Use proper structure tags for better results:
   ```
   [Intro]
   ...
   [Verse]
   ...
   [Chorus]
   ...
   [Bridge]
   ...
   [Outro]
   ...
   ```

2. **Prompt Engineering**: Combine genre, mood, and style for better results:
   ```
   "Indie folk, melancholic, introspective, longing, solitary walk"
   ```

3. **Audio Quality Settings**:
   - For production: `sample_rate: "44100"`, `bitrate: "256000"`, `format: "mp3"`
   - For previews: `sample_rate: "22050"`, `bitrate: "128000"`, `format: "mp3"`
   - For highest quality: `format: "flac"`

4. **Error Handling**: Always wrap API calls in try-catch blocks

5. **Cost Optimization**:
   - Cache results for identical requests
   - Use webhooks for async processing
   - Implement rate limiting

### 4. Environment Variables

Create a `.env.local` file with necessary API keys:

```env
# AI Model for chat and lyrics generation
OPENAI_API_KEY=your_openai_api_key

# FAL-AI for music generation (MiniMax Music v2)
FAL_KEY=your_fal_api_key

# Valyu AI for website content extraction
VALYU_API_KEY=your_valyu_api_key
```

**Get your API keys:**
- OpenAI: https://platform.openai.com/api-keys
- FAL-AI: https://fal.ai/dashboard/keys
- Valyu: https://platform.valyu.ai

**Important**: Never expose these API keys on the client-side. Always use them in server-side code only.

### 5. Key Features

#### Multi-Step Execution Flow

**Direct Creation:**
1. **User sends request**: "Create a happy pop song about summer"
2. **AI analyzes request** and determines it needs to:
   - Call `writeLyrics` with appropriate parameters
   - Wait for lyrics result
   - Call `generateMusic` with the generated lyrics
   - Provide final response to user

**URL-Based Creation:**
1. **User sends URL**: "https://techcrunch.com/2024/01/15/ai-breakthrough"
2. **AI analyzes request** and determines it needs to:
   - Call `fetchWebsiteContent` to extract content from the URL
   - Analyze the extracted content (article about AI breakthrough)
   - Call `writeLyrics` based on the article's theme and content
   - Call `generateMusic` with the generated lyrics
   - Provide final response with the complete song

#### Step Control with `stepCountIs()`

The `stepCountIs(7)` parameter allows the model to make up to 7 sequential steps:
- Step 1: Initial analysis (detect URL or direct request)
- Step 2: Call `fetchWebsiteContent` (if URL detected)
- Step 3: Process content and extract theme
- Step 4: Call `writeLyrics`
- Step 5: Process lyrics result
- Step 6: Call `generateMusic`
- Step 7: Final response

#### Tool Dependency Management

The AI model understands that:
- **For URL-based creation**: `fetchWebsiteContent` → `writeLyrics` → `generateMusic`
- **For direct creation**: `writeLyrics` → `generateMusic`
- Each tool depends on the previous one's output
- The tools must execute in sequence

### 6. Testing Examples

#### Example 1: Direct Creation

```typescript
// Test direct song creation
const testMessages = [
  {
    role: 'user',
    content: 'Create an upbeat rock song about adventure and freedom',
  },
];

// Expected flow:
// 1. AI calls writeLyrics({ theme: "adventure and freedom", genre: "rock", mood: "upbeat" })
// 2. AI receives lyrics
// 3. AI calls generateMusic({ lyrics: "...", genre: "rock", mood: "upbeat" })
// 4. AI receives music URL
// 5. AI responds with final message including both lyrics and music
```

#### Example 2: URL-Based Creation

```typescript
// Test URL-based song creation
const testMessages = [
  {
    role: 'user',
    content: 'Create a song about this article: https://techcrunch.com/2024/01/15/ai-breakthrough',
  },
];

// Expected flow:
// 1. AI calls fetchWebsiteContent({ url: "https://techcrunch.com/...", extractType: "summary" })
// 2. AI receives: {
//      title: "AI Breakthrough in Natural Language Processing",
//      content: "This article discusses recent breakthroughs...",
//      description: "Latest AI developments in NLP technology",
//      sourceType: "website"
//    }
// 3. AI analyzes content and determines theme: "technology", "innovation", "AI"
// 4. AI calls writeLyrics({
//      theme: "AI breakthrough and innovation",
//      genre: "electronic pop",
//      mood: "futuristic, exciting"
//    })
// 5. AI receives lyrics about AI innovation
// 6. AI calls generateMusic({
//      lyrics: "...",
//      genre: "electronic pop",
//      mood: "futuristic, exciting"
//    })
// 7. AI receives music URL
// 8. AI responds with complete song about the article
```

#### Example 3: Product Page to Song

```typescript
// Test creating music from a product page
const testMessages = [
  {
    role: 'user',
    content: 'Make a song about this product: https://www.apple.com/iphone-15-pro',
  },
];

// Expected flow:
// 1. Fetch product page content
// 2. Extract product features (titanium design, A17 Pro chip, ProMotion display)
// 3. Create lyrics celebrating the product's innovation and design
// 4. Generate upbeat, modern music matching the brand's premium feel
```

### 7. Error Handling

```ts
// Add error handling to tools
execute: async (params) => {
  try {
    // Tool execution logic
    const result = await generateLyrics(params);
    return result;
  } catch (error) {
    console.error('Error in writeLyrics:', error);
    return {
      error: true,
      message: 'Failed to generate lyrics. Please try again.',
    };
  }
}
```

### 8. Performance Optimization

- **Caching**: Cache generated lyrics and music for similar requests
- **Streaming**: Use streaming responses to show progress
- **Parallel Processing**: Pre-process music generation while AI is still responding
- **Rate Limiting**: Implement rate limits for expensive music generation calls

### 9. Complete Working Examples

#### Example A: Direct Creation

```typescript
// Example 1: Direct music generation

// 1. User sends a message
const userMessage = "Create a melancholic indie folk song about loneliness and coffee shops";

// 2. AI processes and calls writeLyrics
const lyricsResult = {
  lyrics: `[Verse]
Streetlights flicker, the night breeze sighs
Shadows stretch as I walk alone
An old coat wraps my silent sorrow
Wandering, longing, where should I go

[Chorus]
Pushing the wooden door, the aroma spreads
In a familiar corner, a stranger gazes
Coffee cups spin lonely tales
Memories float in the steam

[Verse]
Rain taps the window, a melancholic tune
I sit in silence, thinking of you
The city sleeps, I'm still awake
Lost in this café of broken dreams

[Outro]
The night grows deeper, the coffee grows cold
But I remain, alone but whole`,
  metadata: {
    theme: "loneliness and coffee shops",
    genre: "indie folk",
    mood: "melancholic",
    structure: "verse-chorus-verse-outro"
  }
};

// 3. AI calls generateMusic with the lyrics
const musicResult = await fal.subscribe("fal-ai/minimax-music/v2", {
  input: {
    prompt: "Indie folk, melancholic, introspective, longing, solitary walk, coffee shop",
    lyrics_prompt: lyricsResult.lyrics,
    audio_setting: {
      sample_rate: "44100",
      bitrate: "256000",
      format: "mp3"
    }
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      console.log("Music generation progress:", update.logs);
    }
  }
});

// 4. Result is returned to user
console.log("Music URL:", musicResult.data.audio.url);
console.log("Request ID:", musicResult.requestId);
```

#### Example B: URL-Based Creation

```typescript
// Example 2: Create music from a news article

// 1. User sends a URL
const userMessage = "Create a song about this: https://techcrunch.com/2024/01/15/ai-breakthrough";

// 2. AI calls fetchWebsiteContent
const contentResponse = await fetch('https://api.valyu.ai/v1/contents', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.VALYU_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    urls: ['https://techcrunch.com/2024/01/15/ai-breakthrough'],
    response_length: 'short',
    extract_effort: 'auto',
    summary: 'Summarize the key points, main topic, and overall theme in 2-3 paragraphs'
  }),
});

const contentData = await contentResponse.json();
const websiteContent = {
  title: "AI Breakthrough in Natural Language Processing",
  content: "This article discusses recent breakthroughs in natural language processing, including advances in large language models...",
  description: "Latest AI developments in NLP technology",
  sourceType: "website"
};

// 3. AI analyzes content and calls writeLyrics
const lyricsResult = {
  lyrics: `[Intro]
The future's calling, can you hear the sound?
Innovation rising from the ground

[Verse]
Lines of code are dancing in the light
Breaking barriers through the night
Language models learning how to see
Unlocking doors to what could be

[Chorus]
Breakthrough, breakthrough
Watch the future come alive
AI rising, revolutionize
The world is changing right before our eyes
Breakthrough, breakthrough tonight

[Verse]
Natural language, flowing like a stream
Turning data into human dreams
Processing thoughts at lightning speed
Giving voice to what we need

[Bridge]
Every word, every phrase
Building bridges, finding ways
Technology and humanity
Dancing in perfect harmony

[Outro]
The breakthrough's here, the time is now
We're writing history, show us how`,
  metadata: {
    theme: "AI innovation and breakthrough",
    genre: "electronic pop",
    mood: "futuristic, exciting, optimistic",
    source: "techcrunch.com article"
  }
};

// 4. AI calls generateMusic
const musicResult = await fal.subscribe("fal-ai/minimax-music/v2", {
  input: {
    prompt: "Electronic pop, futuristic, exciting, optimistic, technology, innovation",
    lyrics_prompt: lyricsResult.lyrics,
    audio_setting: {
      sample_rate: "44100",
      bitrate: "256000",
      format: "mp3"
    }
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      console.log("Music generation progress:", update.logs);
    }
  }
});

// 5. Result is returned to user
console.log("Article:", websiteContent.title);
console.log("Song created about:", websiteContent.description);
console.log("Music URL:", musicResult.data.audio.url);
console.log("Genre:", "Electronic Pop with futuristic vibes");
```

### 10. Canvas Integration - Inserting Generated Music

After the `generateMusic` tool completes, the audio should be automatically inserted into the canvas. The canvas uses **tldraw** and has built-in support for audio shapes.

#### Architecture Overview

**Complete Workflow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ User Request: "Create a happy pop song about summer"               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: AI Agent → writeLyrics()                                   │
│ • Generate lyrics based on theme, genre, mood                      │
│ • Returns: { lyrics, metadata }                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: AI Agent → generateMusic(lyrics, genre, mood)              │
│ • Call FAL-AI MiniMax Music v2                                     │
│ • Returns: { audioUrl, format, metadata }                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Canvas Integration (NEW!)                                  │
│                                                                     │
│ 3a. Create Audio Asset                                             │
│     editor.createAssets([{                                          │
│       id: assetId,                                                  │
│       type: 'audio',                                                │
│       props: { src: audioUrl, ... }                                 │
│     }])                                                             │
│                                                                     │
│ 3b. Create Audio Shape                                             │
│     editor.createShape({                                            │
│       type: 'audio',                                                │
│       x: position.x,                                                │
│       y: position.y,                                                │
│       props: { assetId, w: 320, h: 160 }                            │
│     })                                                              │
│                                                                     │
│ 3c. Pan & Zoom to Audio                                            │
│     panAndZoomToImage(editor, x, y, w, h)                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ Result: Audio appears on canvas with playback controls          │
│    User can play, move, resize, delete the audio shape             │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
Chat Component → generateMusic Tool → audioUrl → useInsertMusic Hook → tldraw Editor → Canvas
```

#### Implementation Steps

**Step 1: Understand the Canvas Audio Component**

The canvas already has an `AudioGenerator` component (see `frontend/app/components/canvas/audio-generator.tsx`) that demonstrates the pattern for inserting audio:

```typescript
// From audio-generator.tsx lines 140-161
editor.createShape({
  id: placeholderShapeId,
  type: "audio",
  x: position.x,
  y: position.y,
  props: {
    w: audioWidth,      // 320px
    h: audioHeight,     // 160px
    assetId: AssetRecordType.createId(),
  },
  opacity: 1,
  meta: {
    isProcessing: true,
    operation: "generate-audio",
    startTime: Date.now(),
    prompt: userPrompt,
    modelId: selectedModelId,
    audioType: activeTab,
  },
})
```

**Step 2: Modify the `generateMusic` Tool to Insert Audio**

Add canvas integration to the `generateMusic` tool execution:

```typescript
// In app/api/chat/route.ts - generateMusic tool
generateMusic: tool({
  description: 'Generate music from lyrics and automatically insert it into the canvas',
  inputSchema: z.object({
    lyrics: z.string().min(10).max(3000),
    genre: z.string(),
    mood: z.string().optional(),
    // Add canvas integration parameters
    insertToCanvas: z.boolean().optional().default(true),
    canvasId: z.string().optional(),
  }),
  execute: async ({ lyrics, genre, mood, insertToCanvas, canvasId }) => {
    try {
      const { fal } = await import('@fal-ai/client');
      fal.config({ credentials: process.env.FAL_KEY });

      const prompt = mood ? `${genre}, ${mood}` : genre;

      // Generate music
      const result = await fal.subscribe('fal-ai/minimax-music/v2', {
        input: {
          prompt: prompt,
          lyrics_prompt: lyrics,
          audio_setting: {
            sample_rate: '44100',
            bitrate: '256000',
            format: 'mp3',
          },
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map((log) => log.message).forEach(console.log);
          }
        },
      });

      const audioUrl = result.data.audio.url;

      // If canvas integration is enabled, insert the audio
      if (insertToCanvas && canvasId) {
        // Call canvas API to insert audio
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/canvas/${canvasId}/insert-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl,
            metadata: {
              genre,
              mood,
              lyrics,
              generatedAt: new Date().toISOString(),
            },
          }),
        });
      }

      return {
        audioUrl,
        format: 'mp3',
        canvasInserted: insertToCanvas,
        metadata: {
          genre,
          mood,
          sampleRate: 44100,
          bitrate: 256000,
          generatedAt: new Date().toISOString(),
          requestId: result.requestId,
        },
        description: `Generated ${genre} music and inserted into canvas`,
      };
    } catch (error) {
      console.error('Error generating music:', error);
      throw new Error(`Failed to generate music: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}),
```

**Step 3: Create Backend API Endpoint for Canvas Insertion**

Create a new API endpoint to handle canvas audio insertion:

```typescript
// backend/api/routes/canvas.ts (or similar)
import { AssetRecordType, createShapeId, uniqueId } from 'tldraw';

interface InsertAudioRequest {
  audioUrl: string;
  metadata: {
    genre: string;
    mood?: string;
    lyrics: string;
    generatedAt: string;
  };
}

export async function insertAudioToCanvas(
  canvasId: string,
  data: InsertAudioRequest
) {
  const { audioUrl, metadata } = data;

  // Audio shape dimensions (matching AudioGenerator)
  const audioWidth = 320;
  const audioHeight = 160;

  // Generate unique IDs
  const shapeId = createShapeId();
  const assetId = AssetRecordType.createId();

  // Create audio asset record
  const audioAsset = {
    id: assetId,
    type: 'audio',
    props: {
      src: audioUrl,
      name: `${metadata.genre}-music-${Date.now()}.mp3`,
      isAnimated: false,
      mimeType: 'audio/mpeg',
    },
    meta: {
      genre: metadata.genre,
      mood: metadata.mood,
      lyrics: metadata.lyrics,
      generatedAt: metadata.generatedAt,
    },
  };

  // Return shape creation data
  // The frontend will use this to create the shape via the editor
  return {
    shapeId,
    assetId,
    audioAsset,
    shapeConfig: {
      type: 'audio',
      x: 0, // Will be calculated by findNewAssetPosition
      y: 0,
      props: {
        w: audioWidth,
        h: audioHeight,
        assetId,
      },
    },
  };
}
```

**Step 4: Client-Side Integration via React Hook**

Create a custom hook to handle audio insertion from the chat:

```typescript
// frontend/hooks/use-insert-music.ts
import { useCanvasStore } from '@/lib/canvas-store/provider';
import { AssetRecordType, createShapeId } from 'tldraw';
import { findNewAssetPosition, panAndZoomToImage } from '@/lib/canvas-utils';

export function useInsertMusic() {
  const { editor, canvasId } = useCanvasStore();

  const insertMusicToCanvas = async (audioUrl: string, metadata: {
    genre: string;
    mood?: string;
    lyrics?: string;
  }) => {
    if (!editor || !canvasId) {
      console.warn('Editor or canvasId not available');
      return;
    }

    try {
      // Audio dimensions
      const audioWidth = 320;
      const audioHeight = 160;

      // Find optimal position
      const position = findNewAssetPosition(editor, audioWidth, audioHeight);

      // Create asset ID
      const assetId = AssetRecordType.createId();

      // Create audio asset in tldraw's asset store
      editor.createAssets([{
        id: assetId,
        type: 'audio',
        props: {
          src: audioUrl,
          name: `${metadata.genre}-music-${Date.now()}.mp3`,
          isAnimated: false,
          mimeType: 'audio/mpeg',
        },
        meta: {
          genre: metadata.genre,
          mood: metadata.mood,
          lyrics: metadata.lyrics,
          generatedAt: new Date().toISOString(),
        },
      }]);

      // Create audio shape
      const shapeId = createShapeId();
      editor.createShape({
        id: shapeId,
        type: 'audio',
        x: position.x,
        y: position.y,
        props: {
          w: audioWidth,
          h: audioHeight,
          assetId,
        },
        meta: {
          source: 'ai-generated',
          operation: 'music-generation',
          ...metadata,
        },
      });

      // Pan and zoom to the new audio
      panAndZoomToImage(editor, position.x, position.y, audioWidth, audioHeight);

      console.log('Music inserted into canvas:', shapeId);
      return shapeId;
    } catch (error) {
      console.error('Failed to insert music to canvas:', error);
      throw error;
    }
  };

  return { insertMusicToCanvas };
}
```

**Step 5: Update Chat Component to Use the Hook**

Modify your chat component to automatically insert music when generation completes:

```tsx
// In your chat component (e.g., app/components/music-chat.tsx)
import { useInsertMusic } from '@/hooks/use-insert-music';

export default function MusicGeneratorChat() {
  const { insertMusicToCanvas } = useInsertMusic();

  const { messages, sendMessage, isLoading } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // Handle tool results
    onToolCall: async (toolCall) => {
      if (toolCall.toolName === 'generateMusic' && toolCall.result) {
        const { audioUrl, metadata } = toolCall.result;

        // Automatically insert to canvas
        await insertMusicToCanvas(audioUrl, {
          genre: metadata.genre,
          mood: metadata.mood,
          lyrics: toolCall.args.lyrics,
        });
      }
    },
  });

  // ... rest of component
}
```

**Step 6: Alternative Approach - Direct Integration in UI**

You can also add a button in the chat UI to manually insert music:

```tsx
// In the music generation result display
case 'tool-generateMusic':
  return (
    <div key={`${message.id}-music-${i}`} className="border-l-4 border-green-500 pl-4 my-2">
      <h4 className="font-semibold text-green-700 mb-2">🎼 Generated Music</h4>
      {part.result && (
        <div className="bg-white p-3 rounded space-y-3">
          {typeof part.result === 'object' && 'audioUrl' in part.result ? (
            <>
              <audio controls src={part.result.audioUrl as string} className="w-full" />
              <p className="text-sm text-gray-600">{part.result.description as string}</p>

              {/* Insert to Canvas Button */}
              <button
                onClick={async () => {
                  await insertMusicToCanvas(
                    part.result.audioUrl as string,
                    {
                      genre: part.result.metadata?.genre,
                      mood: part.result.metadata?.mood,
                    }
                  );
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                📌 Insert to Canvas
              </button>
            </>
          ) : (
            <pre className="text-sm">{JSON.stringify(part.result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
```

#### Key Implementation Notes

1. **Asset Creation**: Always create the audio asset in tldraw's asset store before creating the shape
2. **Position Calculation**: Use `findNewAssetPosition()` to avoid overlapping with existing shapes
3. **Auto-focus**: Use `panAndZoomToImage()` to automatically pan and zoom to the newly created audio
4. **Metadata Preservation**: Store generation metadata (lyrics, genre, mood) in the shape's meta field
5. **Error Handling**: Wrap canvas operations in try-catch blocks
6. **Canvas Availability**: Always check if `editor` is available before operations

#### Testing the Integration

```typescript
// Test the complete workflow
const testWorkflow = async () => {
  // 1. User sends request
  sendMessage({ text: "Create a happy pop song about summer" });

  // 2. AI calls writeLyrics
  // 3. AI calls generateMusic
  // 4. Music is generated and audioUrl is returned
  // 5. useInsertMusic hook automatically inserts to canvas
  // 6. User sees audio shape appear on canvas with auto-pan/zoom
};
```

#### Quick Implementation Checklist

**Files to Create:**
- [ ] `frontend/hooks/use-insert-music.ts` - Hook for inserting audio to canvas
- [ ] `backend/api/routes/canvas.ts` - Optional backend API for canvas operations

**Files to Modify:**
- [ ] `app/api/chat/route.ts` - Add canvas integration to `generateMusic` tool
- [ ] `app/components/music-chat.tsx` - Add `onToolCall` handler to insert music
- [ ] Update UI to show "Insert to Canvas" button in music generation results

**Dependencies (Already Available):**
- ✅ `tldraw` - Canvas library with audio shape support
- ✅ `@/lib/canvas-utils` - Helper functions for positioning (lines 89-131, 261-280 in canvas-utils.ts)
- ✅ `@/lib/canvas-store/provider` - Canvas store with editor instance
- ✅ `AudioGenerator` component - Reference implementation (audio-generator.tsx:142-161)

**Key APIs to Use:**
1. `editor.createAssets([...])` - Create audio asset in tldraw store
2. `editor.createShape({...})` - Create audio shape on canvas
3. `findNewAssetPosition(editor, width, height)` - Find optimal position
4. `panAndZoomToImage(editor, x, y, w, h)` - Auto-focus on new audio

**Reference Implementation:**
- See `frontend/app/components/canvas/audio-generator.tsx:122-217` for the complete audio generation and insertion workflow
- Audio shape dimensions: 320px × 160px (as defined in audio-generator.tsx:133-134)
- Asset positioning: Uses `findNewAssetPosition()` from canvas-utils.ts:89-131

### 11. Next Steps & Enhancements

#### Phase 1: Core Functionality
1. ✅ Set up multi-step tool calling with AI SDK
2. ✅ Integrate FAL-AI MiniMax Music v2
3. ✅ Integrate Valyu Contents API for URL extraction
4. ✅ Implement lyrics generation
5. ✅ Support URL-based music creation
6. ✅ Canvas integration for generated music
7. 🔲 Add proper error handling and retry logic
8. 🔲 Implement loading states and progress indicators

#### Phase 2: User Experience
1. 🔲 Add audio player with playback controls
2. 🔲 Show real-time generation progress for all three steps
3. 🔲 Display extracted website content preview
4. 🔲 Allow users to regenerate with different parameters
5. 🔲 Add download functionality for generated music
6. 🔲 Implement history/playlist of generated songs
7. 🔲 Add URL validation and preview before processing

#### Phase 3: URL & Content Features
1. 🔲 Support batch URL processing (multiple products/articles → album)
2. 🔲 Add URL category detection (product, news, blog, discussion)
3. 🔲 Implement smart genre matching based on content type
4. 🔲 Support PDF and document URLs
5. 🔲 Add image analysis from website screenshots
6. 🔲 Enable social media post to song conversion (Twitter, Reddit)
7. 🔲 Add YouTube video to song (from transcript)

#### Phase 4: Advanced Features
1. 🔲 Support multiple language lyrics (Chinese, Spanish, etc.)
2. 🔲 Add music style customization (tempo, instruments)
3. 🔲 Implement music editing capabilities
4. 🔲 Add reference audio upload for style matching
5. 🔲 Support collaborative song creation
6. 🔲 Generate music videos from website images
7. 🔲 Add voice synthesis for vocals

#### Phase 5: Production Ready
1. 🔲 Implement user authentication
2. 🔲 Add rate limiting and quota management
3. 🔲 Set up audio file CDN storage
4. 🔲 Implement caching for generated content and fetched URLs
5. 🔲 Add analytics and monitoring
6. 🔲 Content moderation for lyrics
7. 🔲 Add cost tracking per user
8. 🔲 Implement webhook support for async processing

### 11. URL-Based Music Generation Use Cases

This feature opens up creative possibilities for various industries:

#### Marketing & Advertising
- **Product Launches**: Create theme songs for new products from their landing pages
- **Brand Stories**: Transform company "About Us" pages into brand anthems
- **Campaign Songs**: Generate music from marketing campaign content

#### Content Creation
- **News to Music**: Turn news articles into musical commentaries
- **Blog Posts to Songs**: Convert blog content into audio experiences
- **Documentation Songs**: Make technical docs more engaging with musical summaries

#### E-commerce
- **Product Jingles**: Auto-generate catchy jingles from product descriptions
- **Collection Themes**: Create music for product collections
- **Seasonal Campaigns**: Generate holiday-themed songs from sale pages

#### Education
- **Learning Songs**: Convert educational content into memorable songs
- **Historical Events**: Turn Wikipedia articles into historical ballads
- **Science Communication**: Make complex topics accessible through music

#### Social Media
- **Tweet Threads to Songs**: Convert viral threads into music
- **Reddit Posts**: Transform popular discussions into songs
- **GitHub Projects**: Create theme songs for open-source projects

#### Entertainment
- **Movie Reviews**: Turn film reviews into musical critiques
- **Recipe Songs**: Convert cooking recipes into fun musical instructions
- **Travel Guides**: Transform destination guides into travel anthems

**Example Workflow:**
```
User drops URL → AI extracts content → Identifies type (product/news/blog)
→ Creates thematic lyrics → Matches genre to content → Generates music
```

## Security Considerations

### General Security
- Validate all user inputs and sanitize data
- Store API keys securely in environment variables (never expose on client)
- Implement user authentication before allowing music generation
- Use HTTPS for all API communications

### URL-Specific Security
- **URL Validation**: Verify URLs are valid and use http/https only
- **Domain Allowlisting**: Consider allowlisting trusted domains for production
- **SSRF Protection**: Prevent Server-Side Request Forgery attacks by blocking internal IPs
- **Content Size Limits**: Limit the size of fetched content to prevent memory issues
- **Timeout Controls**: Set appropriate timeouts for URL fetching (30s max)
- **URL Sanitization**: Remove tracking parameters and validate URL format

```typescript
// Example URL validation
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Block localhost and internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') || hostname === '127.0.0.1') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

### API & Rate Limiting
- Implement rate limiting for expensive API calls (Valyu, FAL-AI)
- Set maximum cost limits per user/request
- Monitor API usage and costs in real-time
- Implement circuit breakers for failing services

### Content Security
- Sanitize extracted content to prevent XSS attacks
- Implement content moderation for generated lyrics
- Filter inappropriate content from fetched websites
- Validate content before processing
- Use signed URLs for audio file access

## Cost Optimization

### Caching Strategies
- **URL Content Cache**: Cache fetched website content (24 hours) to avoid re-fetching
- **Lyrics Cache**: Store generated lyrics for similar themes/prompts
- **Music Cache**: Cache generated music for identical lyrics
- **Result Deduplication**: Detect and reuse identical requests
- Use Redis or similar for distributed caching

```typescript
// Example caching key structure
const cacheKey = {
  url: 'url:sha256(url)',
  lyrics: 'lyrics:sha256(theme+genre+mood)',
  music: 'music:sha256(lyrics+genre)',
};
```

### Cost Management
- Implement tiered pricing for different quality levels:
  - Preview: low bitrate (128kbps), summary extraction
  - Standard: medium bitrate (256kbps), full extraction
  - Premium: high quality FLAC, enhanced extraction
- Set maximum cost limits per user/request
- Use lower-quality settings for previews
- Implement quota management per user tier
- Monitor and alert on unusual spending patterns

### Optimization Tips
- **Batch Processing**: Process multiple URLs in one Valyu API call (up to 10)
- **Lazy Loading**: Only generate music when user explicitly requests it
- **Progressive Enhancement**: Start with summary, upgrade to full if needed
- **Smart Retries**: Implement exponential backoff for failed requests
- **Cost Estimation**: Show estimated cost before processing
- **Queue Management**: Use webhooks for long-running tasks to avoid timeouts

---

This implementation provides a solid foundation for a multi-step music generation agent. Customize the tool implementations based on your chosen music generation service and specific requirements.
