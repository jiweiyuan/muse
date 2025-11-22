import { db } from "../infra/db/index.js"
import { projects, canvases } from "../infra/db/schema.js"
import { eq, and, desc } from "drizzle-orm"
import { createCanvas, getCanvasSnapshot } from "./canvas.js"
import { createChat } from "./chats.js"

export interface Project {
  id: string
  userId: string
  name: string
  coverUrl: string | null
  lastEditAt: Date
  createdAt: Date
  updatedAt: Date
  canvasId?: string | null
  chatId?: string | null
}

/**
 * Create a new project with an associated canvas and default chat
 */
export async function createProject(
  userId: string,
  name: string = "Untitled Project"
): Promise<Project> {
  // Create the project first
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name,
      lastEditAt: new Date(),
    })
    .returning()

  // Create associated canvas
  const canvas = await createCanvas(project.id)

  // Create default chat for the project
  const chat = await createChat({
    userId,
    projectId: project.id,
    title: "New Chat",
  })

  // Return project with canvas and chat references
  return {
    ...project,
    canvasId: canvas.id,
    chatId: chat.id,
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(
  projectId: string,
  userId: string
): Promise<Project | null> {
  const [project] = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      coverUrl: projects.coverUrl,
      lastEditAt: projects.lastEditAt,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      canvasId: canvases.id,
    })
    .from(projects)
    .leftJoin(canvases, eq(canvases.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  return project || null
}

/**
 * List all projects for a user, sorted by last edit time
 */
export async function listUserProjects(
  userId: string,
  limit: number = 50
): Promise<Project[]> {
  const results = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      coverUrl: projects.coverUrl,
      lastEditAt: projects.lastEditAt,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      canvasId: canvases.id,
    })
    .from(projects)
    .leftJoin(canvases, eq(canvases.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.lastEditAt))
    .limit(limit)

  return results
}

/**
 * Update project name
 */
export async function updateProjectName(
  projectId: string,
  userId: string,
  name: string
): Promise<Project | null> {
  const [updated] = await db
    .update(projects)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  if (!updated) return null

  // Get full project with canvas
  return getProject(projectId, userId)
}

/**
 * Update project cover URL
 */
export async function updateProjectCover(
  projectId: string,
  userId: string,
  coverUrl: string | null
): Promise<Project | null> {
  const [updated] = await db
    .update(projects)
    .set({
      coverUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  if (!updated) return null

  return getProject(projectId, userId)
}

/**
 * Update project's last edit timestamp
 */
export async function touchProject(
  projectId: string,
  userId: string
): Promise<void> {
  await db
    .update(projects)
    .set({
      lastEditAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
}

/**
 * Delete a project (cascades to chats and canvas)
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  return result.length > 0
}

export interface ProjectAsset {
  id: string
  type: "image" | "video" | "audio"
  url: string
  name?: string
  width: number
  height: number
  x: number
  y: number
}

/**
 * Get all assets from a project's canvas
 * Extracts images, videos, and other media from the canvas snapshot
 */
export async function getProjectAssets(
  projectId: string,
  userId: string
): Promise<ProjectAsset[]> {
  try {
    // Get the project with canvas
    const project = await getProject(projectId, userId)
    if (!project || !project.canvasId) {
      console.log(
        `[getProjectAssets] No canvas found for project ${projectId}`
      )
      return []
    }

    // Get the canvas snapshot
    const snapshot = await getCanvasSnapshot(project.canvasId)
    if (!snapshot || !snapshot.documents) {
      console.log(
        `[getProjectAssets] No snapshot or documents found for canvas ${project.canvasId}`
      )
      return []
    }

    const assets: ProjectAsset[] = []

    // tldraw snapshot structure:
    // - documents is an ARRAY of document objects
    // - Each document has { state: { id, type, typeName, props, ... }, lastChangedClock }
    // - Asset documents: state.typeName = "asset", state.id = "asset:xxx", state.props.src = URL
    // - Shape documents: state.typeName = "shape", state.type = "image", state.props.assetId = "asset:xxx"

    const documents = snapshot.documents as any[]
    if (!Array.isArray(documents)) {
      console.warn(
        `[getProjectAssets] Documents is not an array for canvas ${project.canvasId}`
      )
      return []
    }

    // Step 1: Build a map of assetId -> asset for quick lookup
    const assetMap = new Map<string, any>()
    for (const doc of documents) {
      if (doc?.state?.typeName === "asset" && doc.state.id) {
        assetMap.set(doc.state.id, doc.state)
      }
    }

    console.log(
      `[getProjectAssets] Found ${assetMap.size} assets in snapshot for project ${projectId}`
    )

    // Step 2: Find all media shapes (image, video, audio) and extract their asset data
    for (const doc of documents) {
      try {
        const state = doc?.state
        if (!state) continue

        // Check if it's an image shape
        if (state.typeName === "shape" && state.type === "image") {
          const { id, x, y, props } = state

          // Validate required properties
          if (!props?.assetId || !props?.w || !props?.h) {
            console.warn(
              `[getProjectAssets] Image shape ${id} missing required props (assetId, w, or h)`
            )
            continue
          }

          // Look up the asset by its assetId reference
          const asset = assetMap.get(props.assetId)

          if (!asset) {
            console.warn(
              `[getProjectAssets] Asset not found for assetId ${props.assetId} (shape ${id})`
            )
            continue
          }

          // Validate asset structure and extract URL
          if (
            asset.type === "image" &&
            asset.props?.src &&
            typeof asset.props.src === "string"
          ) {
            // Extract asset name from props.name, meta.title, or fallback to "Untitled"
            const assetName = asset.props.name || asset.meta?.title || "Untitled Image"

            assets.push({
              id: id,
              type: "image",
              url: asset.props.src,
              name: assetName,
              width: props.w,
              height: props.h,
              x: x,
              y: y,
            })
          } else {
            console.warn(
              `[getProjectAssets] Asset ${props.assetId} has invalid structure or missing src`
            )
          }
        }
        // Check if it's a video shape
        else if (state.typeName === "shape" && state.type === "video") {
          const { id, x, y, props } = state

          // Validate required properties
          if (!props?.assetId || !props?.w || !props?.h) {
            console.warn(
              `[getProjectAssets] Video shape ${id} missing required props (assetId, w, or h)`
            )
            continue
          }

          // Look up the asset by its assetId reference
          const asset = assetMap.get(props.assetId)

          if (!asset) {
            console.warn(
              `[getProjectAssets] Asset not found for assetId ${props.assetId} (shape ${id})`
            )
            continue
          }

          // Validate asset structure and extract URL
          if (
            asset.type === "video" &&
            asset.props?.src &&
            typeof asset.props.src === "string"
          ) {
            // Extract asset name from props.name, meta.title, or fallback to "Untitled"
            const assetName = asset.props.name || asset.meta?.title || "Untitled Video"

            assets.push({
              id: id,
              type: "video",
              url: asset.props.src,
              name: assetName,
              width: props.w,
              height: props.h,
              x: x,
              y: y,
            })
          } else {
            console.warn(
              `[getProjectAssets] Asset ${props.assetId} has invalid structure or missing src`
            )
          }
        }
        // Check if it's an audio shape
        else if (state.typeName === "shape" && state.type === "audio") {
          const { id, x, y, props } = state

          // Validate required properties
          if (!props?.assetId || !props?.w || !props?.h) {
            console.warn(
              `[getProjectAssets] Audio shape ${id} missing required props (assetId, w, or h)`
            )
            continue
          }

          // Look up the asset by its assetId reference
          const asset = assetMap.get(props.assetId)

          if (!asset) {
            console.warn(
              `[getProjectAssets] Asset not found for assetId ${props.assetId} (shape ${id})`
            )
            continue
          }

          // Validate asset structure and extract URL
          // Audio assets might not have explicit type, so we check for src
          if (asset.props?.src && typeof asset.props.src === "string") {
            // Extract asset name from props.name, meta.title, or fallback to "Untitled"
            const assetName = asset.props.name || asset.meta?.title || "Untitled Audio"

            assets.push({
              id: id,
              type: "audio",
              url: asset.props.src,
              name: assetName,
              width: props.w,
              height: props.h,
              x: x,
              y: y,
            })
          } else {
            console.warn(
              `[getProjectAssets] Asset ${props.assetId} has invalid structure or missing src`
            )
          }
        }
      } catch (docError) {
        console.error(
          `[getProjectAssets] Error processing document:`,
          docError
        )
        // Continue processing other documents
        continue
      }
    }

    console.log(
      `[getProjectAssets] Successfully extracted ${assets.length} assets from project ${projectId}`
    )

    // Return assets sorted by position (top to bottom, left to right)
    return assets.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) {
        return a.y - b.y // Sort by y position first
      }
      return a.x - b.x // Then by x position
    })
  } catch (error) {
    console.error(`[getProjectAssets] Error for project ${projectId}:`, error)
    // Return empty array instead of throwing to prevent API errors
    return []
  }
}
