





# Quick Checklist: Simplify to Single GPT-5 Model

## Step-by-Step Instructions

### 1️⃣ Backend Constants (5 min)
- [ ] Open `backend/src/config/constants.ts`
- [ ] Replace with: `export const MODEL_DEFAULT = "gpt-5"`
- [ ] Remove `FREE_MODELS_IDS`

### 2️⃣ Backend Routes (15 min)
- [ ] Open `backend/src/routes/v1/project-chats.ts` (or main chat route)
- [ ] Add import: `import { openai, createOpenAI } from "@ai-sdk/openai"`
- [ ] Remove imports: `getAllModels`, `getProviderForModel`
- [ ] Replace model lookup with:
```typescript
const apiKey = await getEffectiveApiKey(userId, "openai")
const aiModel = apiKey
  ? createOpenAI({ apiKey }).chat("gpt-5")
  : openai.chat("gpt-5")
```
- [ ] Use `model: aiModel` in `streamText()`

### 3️⃣ Backend Services (10 min)
- [ ] Open `backend/src/services/title-generator.ts`
- [ ] Replace model creation with:
```typescript
const aiModel = apiKey
  ? createOpenAI({ apiKey }).chat("gpt-5")
  : openai.chat("gpt-5")
```

### 4️⃣ Remove Backend Dead Code (5 min)
```bash
rm -rf backend/src/domain/models
rm -rf backend/src/domain/openproviders
rm -rf backend/src/domain
rm -f backend/src/routes/v1/models.ts
```

- [ ] Open `backend/src/routes/v1/index.ts`
- [ ] Remove: `import { registerModelRoutes } from "./models.js"`
- [ ] Remove: `await app.register(registerModelRoutes, { prefix: "/v1/models" })`

### 5️⃣ Frontend Constants (5 min)
- [ ] Open `frontend/lib/config.ts`
- [ ] Replace with: `export const MODEL_DEFAULT = "gpt-5"`
- [ ] Remove `FREE_MODELS_IDS`

### 6️⃣ Simplify useModel Hook (10 min)
- [ ] Open `frontend/app/components/chat/use-model.ts`
- [ ] Replace entire file with:
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

### 7️⃣ Update useModel Calls (10 min)
- [ ] Find: `useModel({ currentChat, user, chatId })`
- [ ] Replace: `useModel()`
- [ ] Files to update:
  - `frontend/app/components/chat/home-chat.tsx`
  - `frontend/app/components/chat/conversation-chat.tsx`

### 8️⃣ Remove Model Info Lookups (10 min)
- [ ] In chat components, remove: `import { getModelInfo } from "@/lib/models"`
- [ ] Replace: `hasSearchSupport: Boolean(getModelInfo(selectedModel)?.webSearch)`
- [ ] With: `hasSearchSupport: false, // Simplified: GPT-5`

### 9️⃣ Remove Frontend Dead Code (5 min)
```bash
rm -rf frontend/lib/models
rm -rf frontend/components/common/model-selector
rm -rf frontend/components/common/multi-model-selector
rm -rf frontend/lib/model-store
rm -rf frontend/app/components/layout/settings/models
rm -f frontend/app/components/canvas/model-selector-modal.tsx
```

### 🔟 Test & Verify (10 min)
- [ ] Verify nested route registration has `await` in `backend/src/routes/v1/project.ts:226`
- [ ] Backend builds: `cd backend && npm run build`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Start dev servers and test chat
- [ ] Verify API calls use `model: "gpt-5"`
- [ ] Ensure no 404 errors on `/v1/projects/:projectId/chats/:chatId/stream`

---

## Total Time Estimate: ~90 minutes

## Git Commands

```bash
# Create a branch for changes
git checkout -b simplify-to-gpt5

# After making changes
git add .
git commit -m "Simplify to single GPT-5 model, remove abstraction layers"

# If issues occur, rollback
git reset --hard HEAD
```

---

## Quick Search Commands

Find remaining references:
```bash
# Backend
grep -r "getAllModels\|getProviderForModel\|openproviders" backend/src --include="*.ts"

# Frontend
grep -r "getModelInfo\|@/lib/models" frontend --include="*.ts" --include="*.tsx"
```

Should return no results if cleanup is complete!
