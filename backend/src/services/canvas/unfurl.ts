import _unfurl from "unfurl.js"

/**
 * Bookmark Unfurling Service
 * Extracts metadata from URLs for the bookmark shape
 */

export interface UnfurlResult {
  title: string
  description: string
  image: string
  favicon: string
}

/**
 * Unfurl a URL to extract metadata
 */
export async function unfurlUrl(url: string): Promise<UnfurlResult> {
  try {
    const result = await _unfurl.unfurl(url)

    const { title, description, open_graph, twitter_card, favicon } = result

    // Prefer Open Graph or Twitter Card images
    const image =
      open_graph?.images?.[0]?.url || twitter_card?.images?.[0]?.url || ""

    return {
      title: title || "",
      description: description || "",
      image,
      favicon: favicon || "",
    }
  } catch (error) {
    console.error(`[Canvas] Failed to unfurl URL: ${url}`, error)

    // Return basic result on error
    return {
      title: url,
      description: "",
      image: "",
      favicon: "",
    }
  }
}

/**
 * Validate that a URL is safe to unfurl
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}
