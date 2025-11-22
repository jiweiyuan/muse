/**
 * Muse Shared Schemas
 * TypeScript schemas and validators shared between frontend and backend
 */

// Common schemas
export * from "./common.schema.js";

// Core domain schemas
export * from "./user.schema.js";
export * from "./project.schema.js";
export * from "./chat.schema.js";
export * from "./canvas.schema.js";
export * from "./asset.schema.js";
export * from "./model.schema.js";
export * from "./image-models.schema.js";
export * from "./video-models.schema.js";
export * from "./audio-models.schema.js";

// TLDraw schema
export * from "./tldraw-schema.js";

// API request/response schemas
export * from "./user-api.schema.js";
export * from "./project-api.schema.js";
export * from "./chat-api.schema.js";
export * from "./canvas-api.schema.js";
export * from "./asset-api.schema.js";
export * from "./model-api.schema.js";
export * from "./tool-api.schema.js";
export * from "./preference-api.schema.js";
export * from "./task-api.schema.js";
