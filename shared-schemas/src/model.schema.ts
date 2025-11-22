import { z } from "zod";

/**
 * AI Model Schema Definitions
 * AI model configuration and metadata schemas
 */

// Model speed enum
export const modelSpeedSchema = z.enum(["Fast", "Medium", "Slow"]);

// Model intelligence enum
export const modelIntelligenceSchema = z.enum(["Low", "Medium", "High"]);

// Model configuration schema
export const modelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  providerId: z.string().min(1),
  modelFamily: z.string().optional(),
  baseProviderId: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contextWindow: z.number().int().positive().optional(),
  inputCost: z.number().nonnegative().optional(),
  outputCost: z.number().nonnegative().optional(),
  priceUnit: z.string().optional(),
  vision: z.boolean().optional(),
  tools: z.boolean().optional(),
  audio: z.boolean().optional(),
  reasoningText: z.boolean().optional(),
  webSearch: z.boolean().optional(),
  openSource: z.boolean().optional(),
  speed: modelSpeedSchema.optional(),
  intelligence: modelIntelligenceSchema.optional(),
  website: z.string().url().optional(),
  apiDocs: z.string().url().optional(),
  modelPage: z.string().url().optional(),
  releasedAt: z.string().optional(),
  icon: z.string().optional(),
  accessible: z.boolean().optional(),
});

// Type exports
export type ModelSpeedSchema = z.infer<typeof modelSpeedSchema>;
export type ModelIntelligenceSchema = z.infer<typeof modelIntelligenceSchema>;
export type ModelConfigSchema = z.infer<typeof modelConfigSchema>;
