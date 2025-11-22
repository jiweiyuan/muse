import { eq, and, sql, inArray } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import {
  generativeAiTasks,
  canvases,
  type taskTypeEnum,
  type taskStatusEnum,
} from "../infra/db/schema.js"

// Type definitions
export type TaskType = typeof taskTypeEnum.enumValues[number]
export type TaskStatus = typeof taskStatusEnum.enumValues[number]

export interface TaskBody {
  // Common fields
  storageAssetId?: string

  // For generate_image and generate_video
  prompt?: string
  aspectRatio?: string

  // For generate_image only
  outputFormat?: string

  // For generate_video only
  duration?: number

  // For image_upscale and image_remove_background
  sourceAssetId?: string
  factor?: number

  // Additional parameters
  [key: string]: any
}

export interface TaskResult {
  // Success result
  assetId?: string
  assetUrl?: string
  metadata?: {
    width?: number
    height?: number
    fileSize?: number
    processingTime?: number
    [key: string]: any
  }

  // Error result
  errorMessage?: string
  errorCode?: string
  errorDetails?: {
    attempts?: number
    lastError?: string
    [key: string]: any
  }
}

export interface Task {
  id: string
  taskType: TaskType
  userId: string
  projectId: string
  shapeId: string | null
  body: TaskBody
  status: TaskStatus
  result: TaskResult | null
  retryCount: number
  maxRetries: number
  workerId: string | null
  claimedAt: Date | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date
}

export interface CreateTaskParams {
  taskType: TaskType
  userId: string
  projectId: string
  shapeId?: string | null
  body: TaskBody
  maxRetries?: number
}

export interface UpdateTaskParams {
  status?: TaskStatus
  result?: TaskResult
  retryCount?: number
  workerId?: string | null
  claimedAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
}

export interface ListTasksParams {
  projectId: string
  userId: string
  taskType?: TaskType
  status?: TaskStatus | TaskStatus[]
  limit?: number
  offset?: number
}

/**
 * Create a new task in the queue
 */
export async function createTask(params: CreateTaskParams): Promise<Task> {
  const {
    taskType,
    userId,
    projectId,
    shapeId = null,
    body,
    maxRetries = 3,
  } = params

  const [task] = await db
    .insert(generativeAiTasks)
    .values({
      taskType,
      userId,
      projectId,
      shapeId,
      body,
      maxRetries,
      status: "pending",
      retryCount: 0,
    })
    .returning()

  return mapTaskFromDb(task)
}

/**
 * Get task by ID
 */
export async function getTaskById(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const [task] = await db
    .select()
    .from(generativeAiTasks)
    .where(
      and(eq(generativeAiTasks.id, taskId), eq(generativeAiTasks.userId, userId))
    )

  return task ? mapTaskFromDb(task) : null
}

/**
 * List tasks with filters
 */
export async function listTasks(params: ListTasksParams): Promise<Task[]> {
  const {
    projectId,
    userId,
    taskType,
    status,
    limit = 50,
    offset = 0,
  } = params

  // Add optional filters
  const conditions = [
    eq(generativeAiTasks.projectId, projectId),
    eq(generativeAiTasks.userId, userId),
  ]

  if (taskType) {
    conditions.push(eq(generativeAiTasks.taskType, taskType))
  }

  if (status) {
    if (Array.isArray(status)) {
      conditions.push(inArray(generativeAiTasks.status, status))
    } else {
      conditions.push(eq(generativeAiTasks.status, status))
    }
  }

  const tasks = await db
    .select()
    .from(generativeAiTasks)
    .where(and(...conditions))
    .orderBy(sql`${generativeAiTasks.createdAt} DESC`)
    .limit(limit)
    .offset(offset)

  return tasks.map(mapTaskFromDb)
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskParams
): Promise<Task | null> {
  const updateData: any = {
    ...updates,
    updatedAt: new Date(),
  }

  const [task] = await db
    .update(generativeAiTasks)
    .set(updateData)
    .where(eq(generativeAiTasks.id, taskId))
    .returning()

  return task ? mapTaskFromDb(task) : null
}

/**
 * Claim tasks atomically using FOR UPDATE SKIP LOCKED
 * This ensures multiple workers don't claim the same task
 */
export async function claimTasks(
  workerId: string,
  limit: number
): Promise<Task[]> {
  // Use raw SQL for FOR UPDATE SKIP LOCKED
  const tasks = await db.execute(sql`
    WITH claimed AS (
      SELECT id
      FROM generative_ai_tasks
      WHERE status = 'pending'
        AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE generative_ai_tasks
    SET
      status = 'processing',
      worker_id = ${workerId},
      claimed_at = NOW(),
      started_at = NOW(),
      updated_at = NOW()
    FROM claimed
    WHERE generative_ai_tasks.id = claimed.id
    RETURNING generative_ai_tasks.*
  `)

  return (tasks.rows as any[]).map(mapTaskFromDb)
}

/**
 * Cancel a pending task
 */
export async function cancelTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(generativeAiTasks)
    .where(
      and(
        eq(generativeAiTasks.id, taskId),
        eq(generativeAiTasks.userId, userId),
        inArray(generativeAiTasks.status, ["pending", "processing"])
      )
    )
    .returning()

  return result.length > 0
}

/**
 * Get canvas ID by project ID (1:1 relationship)
 */
export async function getCanvasIdByProjectId(
  projectId: string
): Promise<string | null> {
  const [canvas] = await db
    .select({ id: canvases.id })
    .from(canvases)
    .where(eq(canvases.projectId, projectId))

  return canvas?.id || null
}

/**
 * Cleanup stale tasks (processing >5 minutes)
 * Should be run periodically via cron
 */
export async function cleanupStaleTasks(): Promise<number> {
  const result = await db
    .update(generativeAiTasks)
    .set({
      status: "pending",
      workerId: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(generativeAiTasks.status, "processing"),
        sql`${generativeAiTasks.claimedAt} < NOW() - INTERVAL '5 minutes'`
      )
    )
    .returning()

  return result.length
}

/**
 * Archive old completed/failed tasks (>7 days)
 * Should be run periodically via cron
 */
export async function archiveOldTasks(): Promise<number> {
  const result = await db
    .delete(generativeAiTasks)
    .where(
      and(
        inArray(generativeAiTasks.status, ["completed", "failed"]),
        sql`${generativeAiTasks.completedAt} < NOW() - INTERVAL '7 days'`
      )
    )
    .returning()

  return result.length
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const stats = await db.execute(sql`
    SELECT
      status,
      COUNT(*)::int as count
    FROM generative_ai_tasks
    GROUP BY status
  `)

  const result: Record<TaskStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  }

  for (const row of stats.rows as any[]) {
    result[row.status as TaskStatus] = row.count
  }

  return result
}

/**
 * Map database row to Task interface
 */
function mapTaskFromDb(dbTask: any): Task {
  return {
    id: dbTask.id,
    taskType: dbTask.taskType || dbTask.task_type,
    userId: dbTask.userId || dbTask.user_id,
    projectId: dbTask.projectId || dbTask.project_id,
    shapeId: dbTask.shapeId || dbTask.shape_id,
    body: dbTask.body || {},
    status: dbTask.status,
    result: dbTask.result || null,
    retryCount: dbTask.retryCount ?? dbTask.retry_count ?? 0,
    maxRetries: dbTask.maxRetries ?? dbTask.max_retries ?? 3,
    workerId: dbTask.workerId || dbTask.worker_id || null,
    claimedAt: dbTask.claimedAt || dbTask.claimed_at || null,
    createdAt: dbTask.createdAt || dbTask.created_at,
    startedAt: dbTask.startedAt || dbTask.started_at || null,
    completedAt: dbTask.completedAt || dbTask.completed_at || null,
    updatedAt: dbTask.updatedAt || dbTask.updated_at,
  }
}
