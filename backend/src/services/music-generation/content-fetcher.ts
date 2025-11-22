import { env } from "../../config/env.js"

export interface ContentFetchParams {
  url: string
  extractType?: "summary" | "full"
}

export interface ContentFetchResult {
  title: string
  content: string
  description: string
  url: string
  sourceType: string
  publicationDate?: string
  summary?: boolean
  metadata: {
    length: number
    dataType: string
    cost: number
  }
}

export async function fetchWebsiteContent(
  params: ContentFetchParams
): Promise<ContentFetchResult> {
  if (!env.VALYU_API_KEY) {
    throw new Error("VALYU_API_KEY environment variable is not set")
  }

  const { url, extractType = "summary" } = params

  console.log("Fetching website content from:", url)

  try {
    const response = await fetch("https://api.valyu.ai/v1/contents", {
      method: "POST",
      headers: {
        "x-api-key": env.VALYU_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: [url],
        response_length: extractType === "summary" ? "short" : "medium",
        extract_effort: "auto",
        summary:
          extractType === "summary"
            ? "Summarize the key points, main topic, and overall theme in 2-3 paragraphs"
            : false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to fetch content")
    }

    const data = await response.json()

    if (!data.success || data.urls_processed === 0) {
      throw new Error(data.error || "Failed to process URL")
    }

    const result = data.results[0]

    console.log("Content fetched successfully:", {
      title: result.title,
      length: result.length,
      cost: result.price,
    })

    return {
      title: result.title,
      content: result.content,
      description: result.description,
      url: result.url,
      sourceType: result.source_type,
      publicationDate: result.publication_date,
      summary: extractType === "summary" && result.summary_success,
      metadata: {
        length: result.length,
        dataType: result.data_type,
        cost: result.price,
      },
    }
  } catch (error) {
    console.error("Error fetching website content:", error)
    throw new Error(
      `Failed to fetch content from URL: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
