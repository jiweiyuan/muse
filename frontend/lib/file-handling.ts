import { toast } from "@/components/ui/toast"
import * as fileType from "file-type"
import { DAILY_FILE_UPLOAD_LIMIT } from "./config"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  const buffer = await file.arrayBuffer()
  const type = await fileType.fileTypeFromBuffer(
    Buffer.from(buffer.slice(0, 4100))
  )

  if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
    return {
      isValid: false,
      error: "File type not supported or doesn't match its extension",
    }
  }

  return { isValid: true }
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  void chatId
  void userId

  const attachments: Attachment[] = []

  for (const file of files) {
    try {
      // Validate file
      const validation = await validateFile(file)
      if (!validation.isValid) {
        toast({
          title: "File validation failed",
          description: validation.error,
          status: "error",
        })
        continue
      }

      // Convert file to data URL for client-side storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      attachments.push({
        name: file.name,
        contentType: file.type,
        url: dataUrl,
      })
    } catch (error) {
      console.error("Failed to process file:", error)
      toast({
        title: "File processing failed",
        description: `Could not process ${file.name}`,
        status: "error",
      })
    }
  }

  if (attachments.length > 0) {
    toast({
      title: "Files added",
      description: `${attachments.length} file${attachments.length === 1 ? "" : "s"} ready to send`,
      status: "success",
    })
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message = `Daily file upload limit of ${DAILY_FILE_UPLOAD_LIMIT} files reached`) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(userId: string): Promise<void> {
  void userId
}
