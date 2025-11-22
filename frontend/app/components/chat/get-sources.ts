import type { UIMessage as MessageAISDK } from "@ai-sdk/react"

type SourceUrlPart = Extract<
  NonNullable<MessageAISDK["parts"]>[number],
  { type: "source-url" }
>

type SourceDocumentPart = Extract<
  NonNullable<MessageAISDK["parts"]>[number],
  { type: "source-document" }
>

type Source = {
  id: string
  url: string
  title?: string
}

export function getSources(parts: MessageAISDK["parts"] | undefined): Source[] {
  if (!parts) return []

  const sources = parts
    .filter(
      (part): part is SourceUrlPart | SourceDocumentPart =>
        part.type === "source-url" || part.type === "source-document"
    )
    .map((part): Source | null => {
      if (part.type === "source-url") {
        return {
          id: part.sourceId,
          url: part.url,
          title: part.title,
        }
      }
      if (part.type === "source-document") {
        return {
          id: part.sourceId,
          url: "", // source-document doesn't have a URL
          title: part.title,
        }
      }
      return null
    })
    .filter((source): source is Source => source !== null && source.url !== "")

  return sources
}
