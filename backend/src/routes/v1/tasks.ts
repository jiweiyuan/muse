import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { ZodError } from "zod"
import {
  createTaskRequestSchema,
  listTasksQuerySchema,
  createTaskResponseSchema,
  getTaskResponseSchema,
  listTasksResponseSchema,
} from "@muse/shared-schemas"
import {
  createTask,
  getTaskById,
  listTasks,
  cancelTask,
  type CreateTaskParams,
} from "../../services/tasks.js"
import { getProject } from "../../services/projects.js"
import { resolveSessionUser } from "../../services/identity.js"

export const registerTaskRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    // Add authentication hook for all routes in this plugin
    app.addHook("preHandler", async (request, reply) => {
      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return reply.send({ error: "Unauthorized" })
      }
      // Store user ID on request for easy access
      ;(request as any).userId = sessionUser.id
    })
    /**
     * POST /v1/tasks
     * Create a new async task (image generation, upscale, remove background)
     */
    app.post("/", async (request, reply) => {
      try {
        // Validate request body
        const validated = createTaskRequestSchema.parse(request.body)

        // Get user ID from authentication hook
        const userId = (request as any).userId

        // Verify user owns the project
        const project = await getProject(validated.projectId, userId)
        if (!project) {
          reply.status(404)
          return { error: "Project not found" }
        }

        if (project.userId !== userId) {
          reply.status(403)
          return { error: "Forbidden: You do not own this project" }
        }

        // Create task
        const taskParams: CreateTaskParams = {
          taskType: validated.taskType,
          userId,
          projectId: validated.projectId,
          shapeId: validated.shapeId || null,
          body: validated.body,
        }

        const task = await createTask(taskParams)

        // Return immediate response with taskId
        reply.status(202) // 202 Accepted

        return createTaskResponseSchema.parse({
          taskId: task.id,
          taskType: task.taskType,
          status: task.status,
          createdAt: task.createdAt.toISOString(),
        })
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        console.error("Error creating task:", error)
        reply.status(500)
        return { error: "Failed to create task" }
      }
    })

    /**
     * GET /v1/tasks
     * List tasks for a project
     */
    app.get("/", async (request, reply) => {
      try {
        // Validate query parameters
        const validated = listTasksQuerySchema.parse(request.query)

        // Get user ID from authentication hook
        const userId = (request as any).userId

        // Verify user owns the project
        const project = await getProject(validated.projectId, userId)
        if (!project) {
          reply.status(404)
          return { error: "Project not found" }
        }

        if (project.userId !== userId) {
          reply.status(403)
          return { error: "Forbidden" }
        }

        // Parse status filter
        let statusFilter: any = undefined
        if (validated.status) {
          if (typeof validated.status === "string") {
            statusFilter = validated.status.includes(",")
              ? validated.status.split(",")
              : validated.status
          } else {
            statusFilter = validated.status
          }
        }

        // List tasks
        const tasks = await listTasks({
          projectId: validated.projectId,
          userId,
          taskType: validated.taskType,
          status: statusFilter,
          limit: validated.limit,
          offset: validated.offset,
        })

        return listTasksResponseSchema.parse({
          tasks: tasks.map((task) => ({
            id: task.id,
            taskType: task.taskType,
            userId: task.userId,
            projectId: task.projectId,
            shapeId: task.shapeId,
            body: task.body,
            status: task.status,
            result: task.result,
            retryCount: task.retryCount,
            maxRetries: task.maxRetries,
            workerId: task.workerId,
            claimedAt: task.claimedAt?.toISOString() || null,
            createdAt: task.createdAt.toISOString(),
            startedAt: task.startedAt?.toISOString() || null,
            completedAt: task.completedAt?.toISOString() || null,
            updatedAt: task.updatedAt.toISOString(),
          })),
        })
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        console.error("Error listing tasks:", error)
        reply.status(500)
        return { error: "Failed to list tasks" }
      }
    })

    /**
     * GET /v1/tasks/:taskId
     * Get task status and result
     */
    app.get("/:taskId", async (request, reply) => {
      try {
        const { taskId } = request.params as { taskId: string }

        // Get user ID from authentication hook
        const userId = (request as any).userId

        // Get task (with user authorization)
        const task = await getTaskById(taskId, userId)

        if (!task) {
          reply.status(404)
          return { error: "Task not found" }
        }

        return getTaskResponseSchema.parse({
          id: task.id,
          taskType: task.taskType,
          userId: task.userId,
          projectId: task.projectId,
          shapeId: task.shapeId,
          body: task.body,
          status: task.status,
          result: task.result,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          workerId: task.workerId,
          claimedAt: task.claimedAt?.toISOString() || null,
          createdAt: task.createdAt.toISOString(),
          startedAt: task.startedAt?.toISOString() || null,
          completedAt: task.completedAt?.toISOString() || null,
          updatedAt: task.updatedAt.toISOString(),
        })
      } catch (error) {
        console.error("Error getting task:", error)
        reply.status(500)
        return { error: "Failed to get task" }
      }
    })

    /**
     * DELETE /v1/tasks/:taskId
     * Cancel a pending or processing task
     */
    app.delete("/:taskId", async (request, reply) => {
      try {
        const { taskId } = request.params as { taskId: string }

        // Get user ID from authentication hook
        const userId = (request as any).userId

        // Cancel task (with user authorization)
        const success = await cancelTask(taskId, userId)

        if (!success) {
          reply.status(400)
          return {
            error:
              "Task not found or cannot be cancelled (already completed/failed)",
          }
        }

        reply.status(204) // 204 No Content
        return
      } catch (error) {
        console.error("Error cancelling task:", error)
        reply.status(500)
        return { error: "Failed to cancel task" }
      }
    })
  },
  { encapsulate: true }
)
