import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { ZodError } from "zod"
import {
  createProjectRequestSchema,
  listProjectsRequestSchema,
} from "@muse/shared-schemas"
import { validateUserIdentity } from "../../services/identity.js"
import {
  createProject,
  getProject,
  listUserProjects,
  updateProjectName,
  updateProjectCover,
  deleteProject,
  getProjectAssets,
} from "../../services/projects.js"
import { listProjectChats } from "../../services/chats.js"
import { registerProjectChatRoutes } from "./project-chats.js"

export const registerProjectRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    /**
     * POST /v1/projects
     * Create a new project (with canvas)
     */
    app.post("/", async (request, reply) => {
      try {
        // Validate request body using shared schema
        const validated = createProjectRequestSchema.parse(request.body)

        await validateUserIdentity(request, { userId: validated.userId })

        const project = await createProject(validated.userId, validated.name)
        return { project }
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        console.error("Error creating project:", error)
        reply.status(500)
        return { error: "Failed to create project" }
      }
    })

    /**
     * GET /v1/projects
     * List user's projects
     */
    app.get("/", async (request, reply) => {
      try {
        // Validate query parameters using shared schema
        const validated = listProjectsRequestSchema.parse({
          userId: (request.query as any).userId,
          limit: (request.query as any).limit
            ? parseInt((request.query as any).limit)
            : undefined,
        })

        await validateUserIdentity(request, { userId: validated.userId })

        const projects = await listUserProjects(
          validated.userId,
          validated.limit
        )
        return { projects }
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        console.error("Error listing projects:", error)
        reply.status(500)
        return { error: "Failed to list projects" }
      }
    })

    /**
     * GET /v1/projects/:projectId
     * Get project details with associated chats
     */
    app.get("/:projectId", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }
      const { userId } = request.query as { userId: string }

      if (!userId) {
        reply.status(400)
        return { error: "Missing userId" }
      }

      await validateUserIdentity(request, { userId })

      try {
        const project = await getProject(projectId, userId)

        if (!project) {
          reply.status(404)
          return { error: "Project not found" }
        }

        // Get chats for this project
        const chats = await listProjectChats(projectId, userId)

        return {
          project: {
            ...project,
            chats,
          },
        }
      } catch (error) {
        console.error("Error getting project:", error)
        reply.status(500)
        return { error: "Failed to get project" }
      }
    })

    /**
     * PATCH /v1/projects/:projectId
     * Update project name or cover
     */
    app.patch("/:projectId", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }
      const { userId, name, coverUrl } = request.body as {
        userId: string
        name?: string
        coverUrl?: string
      }

      if (!userId) {
        reply.status(400)
        return { error: "Missing userId" }
      }

      await validateUserIdentity(request, { userId })

      try {
        let project
        if (name !== undefined) {
          project = await updateProjectName(projectId, userId, name)
        } else if (coverUrl !== undefined) {
          project = await updateProjectCover(projectId, userId, coverUrl)
        } else {
          reply.status(400)
          return { error: "No update fields provided" }
        }

        if (!project) {
          reply.status(404)
          return { error: "Project not found" }
        }

        return { project }
      } catch (error) {
        console.error("Error updating project:", error)
        reply.status(500)
        return { error: "Failed to update project" }
      }
    })

    /**
     * DELETE /v1/projects/:projectId
     * Delete project (cascades to chats and canvas)
     */
    app.delete("/:projectId", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }
      const { userId } = request.body as { userId: string }

      if (!userId) {
        reply.status(400)
        return { error: "Missing userId" }
      }

      await validateUserIdentity(request, { userId })

      try {
        const deleted = await deleteProject(projectId, userId)

        if (!deleted) {
          reply.status(404)
          return { error: "Project not found" }
        }

        return { deleted: true }
      } catch (error) {
        console.error("Error deleting project:", error)
        reply.status(500)
        return { error: "Failed to delete project" }
      }
    })

    /**
     * GET /v1/projects/:projectId/assets
     * Get all assets (images, videos) from project's canvas
     */
    app.get("/:projectId/assets", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }
      const { userId } = request.query as { userId: string }

      if (!userId) {
        reply.status(400)
        return { error: "Missing userId" }
      }

      await validateUserIdentity(request, { userId })

      try {
        const assets = await getProjectAssets(projectId, userId)
        return { assets }
      } catch (error) {
        console.error("Error getting project assets:", error)
        reply.status(500)
        return { error: "Failed to get project assets" }
      }
    })

    /**
     * Register nested chat routes under /v1/projects/:projectId/chats
     */
    app.register(registerProjectChatRoutes, { prefix: "/:projectId/chats" })
  },
  { encapsulate: true }
)
