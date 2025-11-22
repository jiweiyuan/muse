import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { env } from "../config/env.js"

const ALGORITHM = "aes-256-gcm"

const key = Buffer.from(env.ENCRYPTION_KEY, "base64")

if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a 32-byte base64 string")
}

export function encryptKey(plaintext: string): {
  encrypted: string
  iv: string
} {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()
  const encryptedWithTag = `${encrypted}:${authTag.toString("hex")}`

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedData: string, ivHex: string): string {
  const [encrypted, authTagHex] = encryptedData.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export function maskKey(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length)
  }
  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`
}
