import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { Readable } from "stream"

/**
 * Cloudflare R2 Storage Interface
 * Uses S3-compatible API to interact with Cloudflare R2
 */

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export class R2Storage {
  private client: S3Client
  private bucketName: string

  constructor(config: R2Config) {
    // Cloudflare R2 endpoint format
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`

    this.client = new S3Client({
      region: "auto", // R2 uses 'auto' as the region
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })

    this.bucketName = config.bucketName
  }

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName
  }

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: Buffer | Uint8Array | Readable,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ etag?: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      Metadata: metadata,
    })

    const response = await this.client.send(command)
    return { etag: response.ETag }
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<{
    data: Uint8Array
    contentType: string
    metadata?: Record<string, string>
  }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.client.send(command)

    if (!response.Body) {
      throw new Error("No data returned from R2")
    }

    // Convert stream to buffer
    const data = await this.streamToBuffer(response.Body as Readable)

    return {
      data,
      contentType: response.ContentType || "application/octet-stream",
      metadata: response.Metadata,
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.client.send(command)
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.client.send(command)
      return true
    } catch (error) {
      if ((error as any).name === "NotFound") {
        return false
      }
      throw error
    }
  }

  /**
   * Get file metadata without downloading the content
   */
  async getMetadata(key: string): Promise<{
    contentType: string
    contentLength: number
    metadata?: Record<string, string>
    lastModified?: Date
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.client.send(command)

    return {
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength || 0,
      metadata: response.Metadata,
      lastModified: response.LastModified,
    }
  }

  /**
   * Generate a signed URL for temporary access
   * Useful for providing direct access to files without proxying through your server
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  /**
   * Batch delete multiple files
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)))
  }

  /**
   * Helper function to convert stream to buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
      stream.on("error", (err) => reject(err))
      stream.on("end", () => resolve(Buffer.concat(chunks)))
    })
  }
}
