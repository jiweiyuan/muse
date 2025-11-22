import { z } from "zod";
import { projectSchema, projectWithChatsSchema } from "./project.schema.js";
import { uuidSchema, userIdSchema, paginationRequestSchema } from "./common.schema.js";

/**
 * Project API Schema Definitions
 * API request/response schemas for project-related endpoints
 */

// POST /v1/projects
export const createProjectRequestSchema = z.object({
  userId: userIdSchema,
  name: z.string().min(1).max(200).optional(),
});

export const createProjectResponseSchema = z.object({
  project: projectSchema,
});

// GET /v1/projects
export const listProjectsRequestSchema = paginationRequestSchema.extend({
  userId: userIdSchema,
});

export const listProjectsResponseSchema = z.object({
  projects: z.array(projectSchema),
});

// GET /v1/projects/:projectId
export const getProjectRequestSchema = z.object({
  projectId: uuidSchema,
  userId: userIdSchema,
});

export const getProjectResponseSchema = z.object({
  project: projectWithChatsSchema.nullable(),
});

// PATCH /v1/projects/:projectId
export const updateProjectRequestSchema = z.object({
  projectId: uuidSchema,
  userId: userIdSchema,
  name: z.string().min(1).max(200).optional(),
  coverUrl: z.string().url().optional(),
});

export const updateProjectResponseSchema = z.object({
  project: projectSchema,
});

// DELETE /v1/projects/:projectId
export const deleteProjectRequestSchema = z.object({
  projectId: uuidSchema,
  userId: userIdSchema,
});

export const deleteProjectResponseSchema = z.object({
  deleted: z.boolean(),
});

// GET /v1/projects/:projectId/assets
export const getProjectAssetsRequestSchema = z.object({
  projectId: uuidSchema,
  userId: userIdSchema,
});

export const getProjectAssetsResponseSchema = z.object({
  assets: z.array(z.any()), // Will use asset schema when imported
});

// Type exports
export type CreateProjectRequestSchema = z.infer<typeof createProjectRequestSchema>;
export type CreateProjectResponseSchema = z.infer<typeof createProjectResponseSchema>;
export type ListProjectsRequestSchema = z.infer<typeof listProjectsRequestSchema>;
export type ListProjectsResponseSchema = z.infer<typeof listProjectsResponseSchema>;
export type GetProjectRequestSchema = z.infer<typeof getProjectRequestSchema>;
export type GetProjectResponseSchema = z.infer<typeof getProjectResponseSchema>;
export type UpdateProjectRequestSchema = z.infer<typeof updateProjectRequestSchema>;
export type UpdateProjectResponseSchema = z.infer<typeof updateProjectResponseSchema>;
export type DeleteProjectRequestSchema = z.infer<typeof deleteProjectRequestSchema>;
export type DeleteProjectResponseSchema = z.infer<typeof deleteProjectResponseSchema>;
export type GetProjectAssetsRequestSchema = z.infer<typeof getProjectAssetsRequestSchema>;
export type GetProjectAssetsResponseSchema = z.infer<typeof getProjectAssetsResponseSchema>;
