import { z } from "zod";
import { canvasSchema } from "./canvas.schema.js";
import { uuidSchema, userIdSchema } from "./common.schema.js";

/**
 * Canvas API Schema Definitions
 * API request/response schemas for canvas-related endpoints
 */

// POST /v1/canvases
export const createCanvasRequestSchema = z.object({
  projectId: uuidSchema,
  userId: userIdSchema,
  snapshot: z.unknown().optional(),
});

export const createCanvasResponseSchema = z.object({
  canvas: canvasSchema,
});

// GET /v1/canvases/:canvasId
export const getCanvasRequestSchema = z.object({
  canvasId: uuidSchema,
  userId: userIdSchema,
});

export const getCanvasResponseSchema = z.object({
  canvas: canvasSchema.nullable(),
});

// PATCH /v1/canvases/:canvasId
export const updateCanvasRequestSchema = z.object({
  canvasId: uuidSchema,
  userId: userIdSchema,
  snapshot: z.unknown(),
});

export const updateCanvasResponseSchema = z.object({
  canvas: canvasSchema,
});

// DELETE /v1/canvases/:canvasId
export const deleteCanvasRequestSchema = z.object({
  canvasId: uuidSchema,
  userId: userIdSchema,
});

export const deleteCanvasResponseSchema = z.object({
  deleted: z.boolean(),
});

// Type exports
export type CreateCanvasRequestSchema = z.infer<typeof createCanvasRequestSchema>;
export type CreateCanvasResponseSchema = z.infer<typeof createCanvasResponseSchema>;
export type GetCanvasRequestSchema = z.infer<typeof getCanvasRequestSchema>;
export type GetCanvasResponseSchema = z.infer<typeof getCanvasResponseSchema>;
export type UpdateCanvasRequestSchema = z.infer<typeof updateCanvasRequestSchema>;
export type UpdateCanvasResponseSchema = z.infer<typeof updateCanvasResponseSchema>;
export type DeleteCanvasRequestSchema = z.infer<typeof deleteCanvasRequestSchema>;
export type DeleteCanvasResponseSchema = z.infer<typeof deleteCanvasResponseSchema>;
