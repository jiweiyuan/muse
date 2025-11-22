import { eq } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { assets } from "../../infra/db/schema.js"
import type { Readable } from "stream"
import type { R2Storage } from "../../infra/r2-storage.js"

/**
 * R2-based Asset Storage Service
 * Handles storing and retrieving binary assets (images, videos, etc.) in Cloudflare R2
 * Database now only stores metadata, actual files are in R2
 * General-purpose - supports canvases, temp files, and other use cases
 */

const MAX_ASSET_SIZE = 256 * 1024 * 1024 // 256MB limit

/**
 * Generate R2 key for an asset
 * Uses hierarchical structure: assets/{userId}/{assetId}
 */
function getAssetKey(userId: string, assetId: string): string {
  return `assets/${userId}/${assetId}`
}

/**
 * Store an asset from a stream
 */
export async function storeAsset(
  storage: R2Storage,
  assetId: string,
  userId: string,
  stream: Readable | Buffer,
  contentType: string,
  originalFilename?: string
): Promise<void> {
  // Convert stream to buffer
  const buffer = await streamToBuffer(stream)

  // Validate size
  if (buffer.length > MAX_ASSET_SIZE) {
    throw new Error(
      `Asset size exceeds maximum allowed size of ${MAX_ASSET_SIZE} bytes`
    )
  }

  // Upload to R2 with user-specific path
  const key = getAssetKey(userId, assetId)
  const uploadedAt = new Date()

  const { etag } = await storage.upload(key, buffer, contentType, {
    userId,
    assetId,
    uploadedAt: uploadedAt.toISOString(),
  })

  // Store metadata in database (OSS provider-agnostic)
  await db
    .insert(assets)
    .values({
      assetId,
      userId,
      ossProvider: "cloudflare",
      ossBucket: storage.getBucketName(),
      ossKey: key,
      ossEtag: etag,
      contentType,
      fileSize: buffer.length,
      originalFilename,
      uploadedAt,
    })
    .onConflictDoUpdate({
      target: [assets.assetId],
      set: {
        contentType,
        fileSize: buffer.length,
        userId,
        ossBucket: storage.getBucketName(),
        ossKey: key,
        ossEtag: etag,
        originalFilename,
        uploadedAt,
      },
    })
}

/**
 * Load an asset
 * @param userId - Optional userId for authorization check. If provided, will verify asset belongs to user
 */
export async function loadAsset(
  storage: R2Storage,
  assetId: string,
  userId?: string
): Promise<{
  data: Buffer
  contentType: string
  fileSize: number
} | null> {
  // Get metadata from database
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.assetId, assetId))

  if (!asset) {
    return null
  }

  // Authorization check: verify asset belongs to user
  if (userId && asset.userId !== userId) {
    throw new Error("Unauthorized: Asset does not belong to user")
  }

  // Download from R2 using the stored OSS key
  try {
    const result = await storage.download(asset.ossKey)

    return {
      data: Buffer.from(result.data),
      contentType: result.contentType,
      fileSize: result.data.length,
    }
  } catch (error) {
    console.error(`Failed to load asset ${assetId} from R2:`, error)
    throw error
  }
}

/**
 * Delete an asset
 * @param userId - Optional userId for authorization check. If provided, will verify asset belongs to user
 */
export async function deleteAsset(
  storage: R2Storage,
  assetId: string,
  userId?: string
): Promise<void> {
  // Get asset info to find the OSS key
  const [asset] = await db
    .select({ ossKey: assets.ossKey, userId: assets.userId })
    .from(assets)
    .where(eq(assets.assetId, assetId))

  if (!asset) {
    return // Asset doesn't exist, nothing to delete
  }

  // Authorization check: verify asset belongs to user
  if (userId && asset.userId !== userId) {
    throw new Error("Unauthorized: Asset does not belong to user")
  }

  // Delete from R2 using stored OSS key
  try {
    await storage.delete(asset.ossKey)
  } catch (error) {
    console.error(`Failed to delete asset ${assetId} from R2:`, error)
    // Continue to delete from database even if R2 delete fails
  }

  // Delete from database
  await db.delete(assets).where(eq(assets.assetId, assetId))
}

/**
 * Delete multiple assets by their IDs
 * @param userId - Optional userId for authorization check. If provided, will verify all assets belong to user
 */
export async function deleteAssetsByIds(
  storage: R2Storage,
  assetIds: string[],
  userId?: string
): Promise<void> {
  if (assetIds.length === 0) {
    return
  }

  // Get all OSS keys for these assets
  const assetRecords = await db
    .select({
      ossKey: assets.ossKey,
      userId: assets.userId,
      assetId: assets.assetId,
    })
    .from(assets)
    .where(
      eq(
        assets.assetId,
        assetIds[0] // Drizzle doesn't support `in` operator directly, we'll filter in memory
      )
    )

  // Filter to match the requested IDs
  const matchedAssets = assetRecords.filter((a) => assetIds.includes(a.assetId))

  if (matchedAssets.length === 0) {
    return
  }

  // Authorization check: verify all assets belong to user
  if (userId) {
    const unauthorizedAsset = matchedAssets.find((a) => a.userId !== userId)
    if (unauthorizedAsset) {
      throw new Error("Unauthorized: One or more assets do not belong to user")
    }
  }

  // Delete all from R2 using stored OSS keys
  try {
    const keys = matchedAssets.map((asset) => asset.ossKey)
    await storage.deleteMultiple(keys)
  } catch (error) {
    console.error(`Failed to delete assets from R2:`, error)
    // Continue to delete from database even if R2 delete fails
  }

  // Delete from database
  for (const assetId of assetIds) {
    await db.delete(assets).where(eq(assets.assetId, assetId))
  }
}

/**
 * Delete all assets for a user
 * With the new hierarchical structure (assets/{userId}/*), all user files
 * are organized under a common prefix for easier management
 */
export async function deleteUserAssets(
  storage: R2Storage,
  userId: string
): Promise<void> {
  // Get all OSS keys for this user
  const assetRecords = await db
    .select({ ossKey: assets.ossKey })
    .from(assets)
    .where(eq(assets.userId, userId))

  if (assetRecords.length > 0) {
    // Delete all from R2 using stored OSS keys
    // All files are under assets/{userId}/ prefix for easy identification
    try {
      const keys = assetRecords.map((asset) => asset.ossKey)
      await storage.deleteMultiple(keys)
    } catch (error) {
      console.error(
        `Failed to delete assets for user ${userId} from R2:`,
        error
      )
      // Continue to delete from database even if R2 delete fails
    }
  }

  // Delete from database
  await db.delete(assets).where(eq(assets.userId, userId))
}

/**
 * Check if an asset exists
 * @param userId - Optional userId for authorization check. If provided, will verify asset belongs to user
 */
export async function assetExists(
  assetId: string,
  userId?: string
): Promise<boolean> {
  const [asset] = await db
    .select({ id: assets.id, userId: assets.userId })
    .from(assets)
    .where(eq(assets.assetId, assetId))

  if (!asset) {
    return false
  }

  // Authorization check: verify asset belongs to user
  if (userId && asset.userId !== userId) {
    return false
  }

  return true
}

/**
 * Get asset info without loading the data
 * @param userId - Optional userId for authorization check. If provided, will verify asset belongs to user
 */
export async function getAssetInfo(
  assetId: string,
  userId?: string
): Promise<{
  contentType: string
  fileSize: number
  userId: string
  ossKey: string
  ossProvider: string
  ossBucket: string
  ossEtag: string | null
  originalFilename: string | null
} | null> {
  const [asset] = await db
    .select({
      contentType: assets.contentType,
      fileSize: assets.fileSize,
      userId: assets.userId,
      ossKey: assets.ossKey,
      ossProvider: assets.ossProvider,
      ossBucket: assets.ossBucket,
      ossEtag: assets.ossEtag,
      originalFilename: assets.originalFilename,
    })
    .from(assets)
    .where(eq(assets.assetId, assetId))

  if (!asset) {
    return null
  }

  // Authorization check: verify asset belongs to user
  if (userId && asset.userId !== userId) {
    throw new Error("Unauthorized: Asset does not belong to user")
  }

  return asset
}

/**
 * Get a signed URL for direct access to an asset
 * This allows the frontend to download directly from R2 without proxying through the backend
 * @param userId - Optional userId for authorization check. If provided, will verify asset belongs to user
 */
export async function getAssetSignedUrl(
  storage: R2Storage,
  assetId: string,
  expiresIn: number = 3600,
  userId?: string
): Promise<string | null> {
  const info = await getAssetInfo(assetId, userId)
  if (!info) {
    return null
  }

  // Use the stored OSS key
  return await storage.getSignedUrl(info.ossKey, expiresIn)
}

/**
 * Helper function to convert stream/buffer to buffer
 */
async function streamToBuffer(stream: Readable | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) {
    return stream
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on("error", (err) => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}

/**
 * Validate content type (images, videos, audio)
 */
export function isValidContentType(contentType: string): boolean {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/x-m4a",
    "audio/mp4", // M4A files often use audio/mp4
  ]

  return allowedTypes.includes(contentType.toLowerCase())
}
