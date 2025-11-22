# Guide: Simplify Multi-Model Architecture to Single GPT-5 Model

This guide explains how to remove complex model abstraction layers and simplify the codebase to use only GPT-5 directly with the AI SDK.

## Overview

**Goal**: Replace complex model configuration system with direct `openai.chat('gpt-5')` calls

**Benefits**:
- Simpler codebase (remove ~1000+ lines of configuration)
- Direct OpenAI API usage with prompt caching support
- Easier to maintain and debug
- No abstraction overhead

---

## Backend Changes

### 1. Update Model Configuration Constants

**File**: `backend/src/config/constants.ts`

**Before**:
```typescript
export const FREE_MODELS_IDS = [
  "openrouter:deepseek/deepseek-r1:free",
  "gpt-4.1-nano",
] as const
export const MODEL_DEFAULT = "gpt-4o"
```

**After**:
```typescript
// Simplified: Only using GPT-5
export const MODEL_DEFAULT = "gpt-5"
```

---

### 2. Replace Model Usage in Routes

**File**: `backend/src/routes/v1/project-chats.ts` (or similar chat routes)

**Remove these imports**:
```typescript
import { getAllModels } from "../../domain/models/index.js"
import { getProviderForModel } from "../../domain/openproviders/provider-map.js"
```

**Add these imports**:
```typescript
import { openai, createOpenAI } from "@ai-sdk/openai"
```

**Before** (complex model lookup):
```typescript
const allModels = await getAllModels()
const modelConfig = allModels.find((m) => m.id === model)

if (!modelConfig || !modelConfig.apiSdk) {
  reply.status(404)
  return { error: `Model ${model} not found` }
}

const provider = getProviderForModel(model as SupportedModel)
const apiKey = await getEffectiveApiKey(userId, provider)

const result = streamText({
  model: modelConfig.apiSdk(apiKey || undefined, { enableSearch }),
  // ... rest of config
})
```

**After** (direct GPT-5 usage):
```typescript
const apiKey = await getEffectiveApiKey(userId, "openai")

// Use openai.chat() directly for GPT-5
const aiModel = apiKey
  ? createOpenAI({ apiKey }).chat("gpt-5")
  : openai.chat("gpt-5")

const result = streamText({
  model: aiModel,
  // ... rest of config
})
```

---

### 3. Update Service Files

**File**: `backend/src/services/title-generator.ts` (or similar services)

**Before**:
```typescript
const openai = createOpenAI({
  apiKey: apiKey || process.env.OPENAI_API_KEY,
})

const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "...",
})
```

**After**:
```typescript
const aiModel = apiKey
  ? createOpenAI({ apiKey }).chat("gpt-5")
  : openai.chat("gpt-5")

const { text } = await generateText({
  model: aiModel,
  prompt: "...",
})
```

---

### 4. Remove Dead Code - Backend

Delete these directories and files:
```bash
rm -rf backend/src/domain/models
rm -rf backend/src/domain/openproviders
rm -rf backend/src/domain  # If now empty
rm -f backend/src/routes/v1/models.ts
```

**Update route registration** in `backend/src/routes/v1/index.ts`:

**Remove**:
```typescript
import { registerModelRoutes } from "./models.js"
// ...
await app.register(registerModelRoutes, { prefix: "/v1/models" })
```

---

## Frontend Changes

### 1. Update Frontend Constants

**File**: `frontend/lib/config.ts`

**Before**:
```typescript
export const FREE_MODELS_IDS = [
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:meta-llama/llama-3.3-8b-instruct:free",
  "gpt-4.1-nano",
]

export const MODEL_DEFAULT = "gpt-4o"
```

**After**:
```typescript
// Simplified to use only GPT-5
export const MODEL_DEFAULT = "gpt-5"
```

---

### 2. Simplify useModel Hook

**File**: `frontend/app/components/chat/use-model.ts`

**Before** (complex model selection logic):
```typescript
import { Chat } from "@/lib/chat-store/chats/types"
import { User } from "@/lib/user-store/types"
import { useEffect, useState } from "react"

export function useModel({
  currentChat,
  user,
  chatId,
}: {
  currentChat: Chat | null | undefined
  user: User | null
  chatId: string | null
}) {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (!chatId) {
      return user?.default_model || MODEL_DEFAULT
    }
    if (currentChat?.model) {
      return currentChat.model
    }
    return MODEL_DEFAULT
  })

  useEffect(() => {
    // ... complex sync logic
  }, [chatId, currentChat?.model, user?.default_model])

  return { selectedModel, setSelectedModel }
}
```

**After** (simplified):
```typescript
// Simplified: Always use GPT-5
import { MODEL_DEFAULT } from "@/lib/config"

export function useModel() {
  return {
    selectedModel: MODEL_DEFAULT,
    handleModelChange: () => {}, // No-op: model is fixed
  }
}
```

**Update all usages**:
```typescript
// Before
const { selectedModel } = useModel({ currentChat, user, chatId })

// After
const { selectedModel } = useModel()
```

---

### 3. Remove Model Info Lookups

**Files**: `frontend/app/components/chat/*.tsx`

**Remove imports**:
```typescript
import { getModelInfo } from "@/lib/models"
```

**Replace**:
```typescript
// Before
hasSearchSupport: Boolean(getModelInfo(selectedModel)?.webSearch)

// After
hasSearchSupport: false, // Simplified: GPT-5
```

---

### 4. Remove Dead Code - Frontend

Delete these directories and files:
```bash
rm -rf frontend/lib/models
rm -rf frontend/components/common/model-selector
rm -rf frontend/components/common/multi-model-selector
rm -rf frontend/lib/model-store
rm -rf frontend/app/components/layout/settings/models
rm -f frontend/app/components/canvas/model-selector-modal.tsx
```

---

## Verification Checklist

After making changes, verify:

### Backend
- [ ] No imports from `domain/models` or `domain/openproviders`
- [ ] All `streamText` and `generateText` calls use `openai.chat('gpt-5')`
- [ ] No references to `getAllModels`, `getModelInfo`, `openproviders`
- [ ] Backend compiles without errors: `npm run build`
- [ ] Chat streaming works with GPT-5

### Frontend
- [ ] No imports from `@/lib/models`
- [ ] `useModel` hook simplified and accepts no parameters
- [ ] `MODEL_DEFAULT` is "gpt-5" in config
- [ ] No model selector UI components
- [ ] Frontend compiles without errors: `npm run build`

---

## Testing

1. **Test chat functionality**:
   ```bash
   # Start backend
   cd backend && npm run dev

   # Start frontend
   cd frontend && npm run dev
   ```

2. **Verify API calls**:
   - Open browser DevTools → Network tab
   - Send a chat message
   - Verify request uses `model: "gpt-5"`

3. **Test with custom API key**:
   - Add OpenAI API key to `.env`
   - Verify chat works with custom key

---

## Common Issues

### Issue: 404 error on `/v1/projects/:projectId/chats/:chatId/stream`
**Root Cause**: Missing `await` keyword when registering nested chat routes in `backend/src/routes/v1/project.ts`

**Solution**: Ensure the nested route registration uses `await`:
```typescript
// ❌ WRONG - Missing await
app.register(registerProjectChatRoutes, { prefix: "/:projectId/chats" })

// ✅ CORRECT - With await
await app.register(registerProjectChatRoutes, { prefix: "/:projectId/chats" })
```

**Why this matters**: Without `await`, Fastify may not complete route registration before the server starts accepting requests, causing 404 errors.

### Issue: "Model gpt-5 not found"
**Solution**: Check OpenAI API key has access to GPT-5. Use `gpt-4o` as fallback if needed.

### Issue: TypeScript errors about missing types
**Solution**: Remove all imports from deleted `@/lib/models` or `domain/models`

### Issue: Frontend crashes on model selection
**Solution**: Ensure `useModel()` is called without parameters and returns `{ selectedModel, handleModelChange }`

---

## Rollback Plan

If issues occur, restore from git:
```bash
git checkout HEAD -- backend/src/domain
git checkout HEAD -- frontend/lib/models
git checkout HEAD -- backend/src/config/constants.ts
git checkout HEAD -- frontend/lib/config.ts
```

---

## Additional Notes

### Prompt Caching Support

GPT-5 supports prompt caching with this pattern:

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text, usage, providerMetadata } = await generateText({
  model: openai.chat('gpt-5'),
  prompt: `A 1024-token or longer prompt...`,
  providerOptions: {
    openai: {
      promptCacheKey: 'my-custom-cache-key-123',
    },
  },
});

console.log('Cached tokens:', providerMetadata?.openai?.cachedPromptTokens);
```

### Why Remove Abstraction?

The previous architecture supported multiple models (OpenAI, Anthropic, OpenRouter). If you only need one model:
- Abstraction adds complexity with no benefit
- Direct API calls are easier to debug
- OpenAI SDK already provides excellent abstractions
- Simpler code = fewer bugs

---

## Questions?

If the intern encounters issues:
1. Check the git diff to see exact changes made
2. Review AI SDK documentation: https://sdk.vercel.ai/docs
3. Verify OpenAI API key permissions
4. Test with a simple script first before full integration
