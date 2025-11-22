# @muse/shared-schemas

Shared TypeScript schemas and validators for Muse frontend and backend.

## Overview

This package provides a single source of truth for data structures and API contracts used across the Muse application. It uses [Zod](https://github.com/colinhacks/zod) for runtime validation and TypeScript type inference.

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Development

Watch mode for automatic rebuilding:

```bash
pnpm dev
```

## Package Structure

```
src/
├── index.ts                      # Barrel export (main entry point)
├── common.schema.ts              # Common utilities (UUID, email, pagination, etc.)
├── user.schema.ts                # User domain entities
├── user-api.schema.ts            # User API request/response schemas
├── project.schema.ts             # Project domain entities
├── project-api.schema.ts         # Project API request/response schemas
├── chat.schema.ts                # Chat and message entities
├── chat-api.schema.ts            # Chat API request/response schemas
├── canvas.schema.ts          # Canvas entities
├── canvas-api.schema.ts      # Canvas API request/response schemas
├── asset.schema.ts               # Asset/file storage entities
├── asset-api.schema.ts           # Asset API request/response schemas
├── video-editor.schema.ts        # Video composition entities
├── video-editor-api.schema.ts    # Video editor API request/response schemas
└── model.schema.ts               # AI model configuration
```

## Usage

### In Backend (Fastify/Node.js)

```typescript
import {
  createProjectRequestSchema,
  type CreateProjectRequestSchema,
  type CreateProjectResponseSchema,
  projectSchema,
} from "@muse/shared-schemas";

// Validate request data
app.post("/v1/projects", async (request, reply) => {
  const validatedData = createProjectRequestSchema.parse(request.body);

  // Your logic here
  const project = await createProject(validatedData);

  return { project };
});
```

### In Frontend (React/Next.js)

```typescript
import {
  type ProjectSchema,
  type ChatSchema,
  createChatRequestSchema,
} from "@muse/shared-schemas";

// Use as TypeScript types
interface ProjectListProps {
  projects: ProjectSchema[];
}

// Validate API responses
const response = await fetch("/api/projects");
const data = await response.json();
const validatedProject = projectSchema.parse(data.project);
```

### Validation Examples

```typescript
import { emailSchema, uuidSchema, paginationRequestSchema } from "@muse/shared-schemas";

// Validate individual fields
const email = emailSchema.parse("user@example.com"); // ✓ valid
const uuid = uuidSchema.parse("123e4567-e89b-12d3-a456-426614174000"); // ✓ valid

// Validate complex objects
const pagination = paginationRequestSchema.parse({
  limit: 20,
  offset: 0,
}); // ✓ valid

// Safe parsing (doesn't throw)
const result = emailSchema.safeParse("invalid");
if (!result.success) {
  console.error(result.error); // Validation errors
}
```

## Design Principles

1. **Single Source of Truth**: All validation logic lives in schemas
2. **Type Safety**: Every Zod schema exports an inferred TypeScript type
3. **Composition**: Complex schemas are built from atomic ones
4. **Separation of Concerns**: Core domain schemas separate from API schemas
5. **Two-File Pattern**: Each domain has a core schema file and an API schema file

## Schema Naming Conventions

- **Zod schemas**: `camelCase` + `Schema` suffix (e.g., `userSchema`, `createUserRequestSchema`)
- **TypeScript types**: PascalCase with `Schema` suffix (e.g., `UserSchema`, `CreateUserRequestSchema`)
- **Files**: `domain.schema.ts` for core, `domain-api.schema.ts` for API contracts

## Benefits

- **Runtime Validation**: Catch invalid data at runtime with Zod
- **Type Safety**: Full TypeScript support with inferred types
- **API Contracts**: Clear, validated request/response schemas
- **Code Reuse**: Share types between frontend and backend
- **Single Source of Truth**: No more duplicate type definitions
- **Better DX**: IDE autocomplete and type checking

## Contributing

When adding new schemas:

1. Create core domain schemas in `{domain}.schema.ts`
2. Create API schemas in `{domain}-api.schema.ts`
3. Export both the Zod schema and the inferred TypeScript type
4. Add exports to `src/index.ts`
5. Run `pnpm build` to compile
6. Update this README if needed

## License

MIT
