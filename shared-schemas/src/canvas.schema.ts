import { z } from "zod";
import { uuidSchema, isoDateTimeSchema } from "./common.schema.js";

/**
 * Canvas Schema Definitions
 * Canvas and canvas related schemas
 */

// Canvas snapshot (stored as JSONB)
export const canvasSnapshotSchema = z.unknown(); // TLdraw specific schema

// Canvas schema
export const canvasSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  snapshot: canvasSnapshotSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// Type exports
export type CanvasSnapshotSchema = z.infer<typeof canvasSnapshotSchema>;
export type CanvasSchema = z.infer<typeof canvasSchema>;
