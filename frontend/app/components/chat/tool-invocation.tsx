"use client"

import { cn } from "@/lib/utils"
import type { UIMessage } from "@ai-sdk/react"
import {
  CaretDown,
  CheckCircle,
  Link,
  Spinner,
  Wrench,
} from "@phosphor-icons/react"
import type { Transition } from "framer-motion"
import { AnimatePresence, motion } from "framer-motion"
import { useMemo, useState } from "react"

// Tool parts in AI SDK 5.0 have types like "tool-{toolName}" or "dynamic-tool"
type ToolPart = Extract<
  NonNullable<UIMessage["parts"]>[number],
  { type: `tool-${string}` } | { type: "dynamic-tool" }
>

interface ToolInvocationProps {
  toolInvocations: ToolPart[]
  className?: string
  defaultOpen?: boolean
  isStreaming?: boolean
}

const TRANSITION = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
} satisfies Transition

export function ToolInvocation({
  toolInvocations,
  defaultOpen = false,
  isStreaming = false,
}: ToolInvocationProps) {
  const toolInvocationsData = Array.isArray(toolInvocations)
    ? toolInvocations
    : [toolInvocations]

  // If streaming but no tools, show loading indicator without tool name
  if (isStreaming && toolInvocationsData.length === 0) {
    return (
      <div className="mb-10 space-y-4">
        <AnimatePresence>
          <LoadingIndicator />
        </AnimatePresence>
      </div>
    )
  }

  // Group tool invocations by toolCallId
  const groupedTools = toolInvocationsData.reduce(
    (acc, item) => {
      const toolCallId = item.toolCallId
      if (!acc[toolCallId]) {
        acc[toolCallId] = []
      }
      acc[toolCallId].push(item)
      return acc
    },
    {} as Record<string, ToolPart[]>
  )

  const uniqueToolIds = Object.keys(groupedTools)

  // Get tool info for each tool
  const toolsInfo = uniqueToolIds.map((toolId) => {
    const toolInvocationsForId = groupedTools[toolId]
    const tool = toolInvocationsForId?.[0]
    const toolName = tool?.type === "dynamic-tool"
      ? tool.toolName
      : tool?.type.replace(/^tool-/, "") || ""
    const isLoading = tool?.state === "input-streaming" || tool?.state === "input-available"

    return { toolId, toolInvocationsForId, toolName, isLoading }
  })

  // Always show individual tool cards with loading indicators between them
  return (
    <div className="mb-10 space-y-4">
      {toolsInfo.map((toolInfo) => {
        const { toolId, toolInvocationsForId, toolName, isLoading } = toolInfo

        if (!toolInvocationsForId?.length) return null

        return (
          <div key={toolId}>
            {isLoading && (
              <AnimatePresence>
                <LoadingIndicator toolName={toolName} />
              </AnimatePresence>
            )}
            <SingleToolView
              toolInvocations={toolInvocationsForId}
              allToolInvocations={toolInvocationsData}
              defaultOpen={defaultOpen}
            />
          </div>
        )
      })}
    </div>
  )
}

type SingleToolViewProps = {
  toolInvocations: ToolPart[]
  allToolInvocations?: ToolPart[]
  defaultOpen?: boolean
  className?: string
}

function SingleToolView({
  toolInvocations,
  allToolInvocations,
  defaultOpen = false,
  className,
}: SingleToolViewProps) {
  // Group by toolCallId and pick the most informative state
  const groupedTools = toolInvocations.reduce(
    (acc, item) => {
      const toolCallId = item.toolCallId
      if (!acc[toolCallId]) {
        acc[toolCallId] = []
      }
      acc[toolCallId].push(item)
      return acc
    },
    {} as Record<string, ToolPart[]>
  )

  // For each toolCallId, get the most informative state (result > call > requested)
  const toolsToDisplay = Object.values(groupedTools)
    .map((group) => {
      const resultTool = group.find(
        (item) => item.state === "output-available"
      )
      const callTool = group.find(
        (item) => item.state === "input-available"
      )
      const partialCallTool = group.find(
        (item) => item.state === "input-streaming"
      )

      // Return the most informative one
      return resultTool || callTool || partialCallTool
    })
    .filter(Boolean) as ToolPart[]

  if (toolsToDisplay.length === 0) return null

  // If there's only one tool, display it directly
  if (toolsToDisplay.length === 1) {
    return (
      <SingleToolCard
        toolData={toolsToDisplay[0]}
        allToolInvocations={allToolInvocations}
        defaultOpen={defaultOpen}
        className={className}
      />
    )
  }

  // If there are multiple tools, show them in a list
  return (
    <div className={className}>
      <div className="space-y-4">
        {toolsToDisplay.map((tool) => (
          <SingleToolCard
            key={tool.toolCallId}
            toolData={tool}
            allToolInvocations={allToolInvocations}
            defaultOpen={defaultOpen}
          />
        ))}
      </div>
    </div>
  )
}

// New component to handle individual tool cards
function SingleToolCard({
  toolData,
  allToolInvocations,
  defaultOpen = false,
  className,
}: {
  toolData: ToolPart
  allToolInvocations?: ToolPart[]
  defaultOpen?: boolean
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)
  const { state } = toolData

  // Extract tool name from type (e.g., "tool-search" -> "search")
  const toolName = toolData.type === "dynamic-tool"
    ? toolData.toolName
    : toolData.type.replace(/^tool-/, "")

  const isLoading = state === "input-streaming" || state === "input-available"
  const isCompleted = state === "output-available"
  const result = isCompleted && "output" in toolData ? toolData.output : undefined

  // Helper function to find MV cover data from all tool invocations
  const findMVCoverData = useMemo(() => {
    if (!allToolInvocations) return null

    // Find generateMVCover tool result
    const coverTool = allToolInvocations.find((tool) => {
      const name = tool.type === "dynamic-tool" ? tool.toolName : tool.type.replace(/^tool-/, "")
      return name === "generateMVCover" && tool.state === "output-available"
    })

    if (!coverTool || !("output" in coverTool)) return null

    try {
      const coverResult = coverTool.output

      if (
        typeof coverResult === "object" &&
        coverResult !== null &&
        "content" in coverResult &&
        Array.isArray(coverResult.content)
      ) {
        const textContent = coverResult.content.find(
          (item: { type: string; text?: string }) => item.type === "text"
        )
        if (textContent?.text) {
          const parsed = JSON.parse(textContent.text)
          if (typeof parsed.imageUrl === "string") {
            return parsed as { imageUrl: string; description?: string; width?: number; height?: number }
          }
        }
      }
    } catch {
      // Failed to parse cover data
    }

    return null
  }, [allToolInvocations])

  // Parse the result JSON if available
  const { parsedResult, parseError } = useMemo(() => {
    if (!isCompleted || !result) return { parsedResult: null, parseError: null }

    try {
      if (Array.isArray(result))
        return { parsedResult: result, parseError: null }

      if (
        typeof result === "object" &&
        result !== null &&
        "content" in result &&
        Array.isArray(result.content)
      ) {
        const textContent = result.content.find(
          (item: { type: string; text?: string }) => item.type === "text"
        )
        if (!textContent?.text) return { parsedResult: null, parseError: null }

        try {
          return {
            parsedResult: JSON.parse(textContent.text),
            parseError: null,
          }
        } catch {
          return { parsedResult: textContent.text, parseError: null }
        }
      }

      return { parsedResult: result, parseError: null }
    } catch {
      return { parsedResult: null, parseError: "Failed to parse result" }
    }
  }, [isCompleted, result])

  // Render generic results based on their structure
  const renderResults = () => {
    if (!parsedResult) return "No result data available"

    // Custom renderer for generateMVCover tool - show cover image
    if (toolName === "generateMVCover" && typeof parsedResult === "object" && parsedResult !== null) {
      const coverResult = parsedResult as Record<string, unknown>
      if (typeof coverResult.imageUrl === "string") {
        return (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={coverResult.imageUrl}
                alt="MV Cover"
                className="w-full h-auto object-cover"
                style={{ maxHeight: "400px" }}
              />
            </div>
            {typeof coverResult.description === "string" && coverResult.description && (
              <p className="text-xs text-muted-foreground italic">{coverResult.description}</p>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground">
              {typeof coverResult.width === "number" && typeof coverResult.height === "number" && (
                <span>{coverResult.width} × {coverResult.height}</span>
              )}
            </div>
          </div>
        )
      }
    }

    // Custom renderer for generateMusic tool - show audio player with enhanced design
    if (toolName === "generateMusic" && typeof parsedResult === "object" && parsedResult !== null) {
      const musicResult = parsedResult as Record<string, unknown>
      if (typeof musicResult.audioUrl === "string") {
        // Extract MV name from metadata (genre + mood)
        const metadata = musicResult.metadata as Record<string, unknown> | undefined
        const genre = typeof metadata?.genre === "string" ? metadata.genre : ""
        const mood = typeof metadata?.mood === "string" ? metadata.mood : ""
        const mvName = mood ? `${genre} / ${mood}` : genre || "Music"

        return (
          <div className="space-y-4">
            {/* MV Cover Image (if available) */}
            {findMVCoverData && (
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/20">
                <img
                  src={findMVCoverData.imageUrl}
                  alt="MV Cover"
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: "400px" }}
                />
                {/* MV Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg">{mvName}</h3>
                </div>
              </div>
            )}

            {/* Audio Player */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4">
              <audio controls src={musicResult.audioUrl} className="w-full" />
            </div>

            {/* Description */}
            {typeof musicResult.description === "string" && (
              <p className="text-sm leading-relaxed">{musicResult.description}</p>
            )}

            {/* Metadata Tags */}
            {musicResult.metadata && typeof musicResult.metadata === "object" ? (
              <div className="flex flex-wrap gap-2">
                {typeof (musicResult.metadata as Record<string, unknown>).genre === "string" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {(musicResult.metadata as Record<string, unknown>).genre as string}
                  </span>
                )}
                {typeof (musicResult.metadata as Record<string, unknown>).mood === "string" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {(musicResult.metadata as Record<string, unknown>).mood as string}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )
      }
    }

    // Custom renderer for writeLyrics tool - format lyrics nicely
    if (toolName === "writeLyrics" && typeof parsedResult === "object" && parsedResult !== null) {
      const lyricsResult = parsedResult as Record<string, unknown>
      if (typeof lyricsResult.lyrics === "string") {
        return (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-3 rounded">
              {lyricsResult.lyrics}
            </pre>
            {lyricsResult.metadata && typeof lyricsResult.metadata === "object" ? (
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                {Object.entries(lyricsResult.metadata as Record<string, unknown>).map(([key, value]) => (
                  <span key={key} className="bg-secondary px-2 py-1 rounded">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    }

    // Custom renderer for fetchWebsiteContent tool - show structured content
    if (toolName === "fetchWebsiteContent" && typeof parsedResult === "object" && parsedResult !== null) {
      const contentResult = parsedResult as Record<string, unknown>
      return (
        <div className="space-y-2">
          {typeof contentResult.title === "string" && (
            <h4 className="font-semibold">{contentResult.title}</h4>
          )}
          {typeof contentResult.description === "string" && (
            <p className="text-sm text-muted-foreground">{contentResult.description}</p>
          )}
          {typeof contentResult.url === "string" && (
            <a
              href={contentResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs font-mono hover:underline flex items-center gap-1"
            >
              {contentResult.url}
              <Link className="h-3 w-3" />
            </a>
          )}
          {typeof contentResult.sourceType === "string" && (
            <div className="text-xs text-muted-foreground">
              Source: {contentResult.sourceType}
            </div>
          )}
          {typeof contentResult.content === "string" && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show full content
              </summary>
              <div className="mt-2 max-h-60 overflow-auto bg-muted p-3 rounded whitespace-pre-wrap">
                {contentResult.content}
              </div>
            </details>
          )}
        </div>
      )
    }

    // Handle array of items with url, title, and snippet (like search results)
    if (Array.isArray(parsedResult) && parsedResult.length > 0) {
      // Check if items look like search results
      if (
        parsedResult[0] &&
        typeof parsedResult[0] === "object" &&
        "url" in parsedResult[0] &&
        "title" in parsedResult[0]
      ) {
        return (
          <div className="space-y-3">
            {parsedResult.map(
              (
                item: { url: string; title: string; snippet?: string },
                index: number
              ) => (
                <div
                  key={index}
                  className="border-border border-b pb-3 last:border-0 last:pb-0"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary group flex items-center gap-1 font-medium hover:underline"
                  >
                    {item.title}
                    <Link className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
                  </a>
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {item.url}
                  </div>
                  {item.snippet && (
                    <div className="mt-1 line-clamp-2 text-sm">
                      {item.snippet}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )
      }

      // Generic array display
      return (
        <div className="font-mono text-xs">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(parsedResult, null, 2)}
          </pre>
        </div>
      )
    }

    // Handle object results
    if (typeof parsedResult === "object" && parsedResult !== null) {
      const resultObj = parsedResult as Record<string, unknown>
      const title = typeof resultObj.title === "string" ? resultObj.title : null
      const htmlUrl =
        typeof resultObj.html_url === "string" ? resultObj.html_url : null

      return (
        <div>
          {title && <div className="mb-2 font-medium">{title}</div>}
          {htmlUrl && (
            <div className="mb-2">
              <a
                href={htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                <span className="font-mono">{htmlUrl}</span>
                <Link className="h-3 w-3 opacity-70" />
              </a>
            </div>
          )}
          <div className="font-mono text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(parsedResult, null, 2)}
            </pre>
          </div>
        </div>
      )
    }

    // Handle string results
    if (typeof parsedResult === "string") {
      return <div className="whitespace-pre-wrap">{parsedResult}</div>
    }

    // Fallback
    return "No result data available"
  }

  return (
    <div
      className={cn(
        "border-border flex flex-col gap-0 overflow-hidden rounded-md border",
        className
      )}
    >
      <button
        onClick={(e) => {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }}
        type="button"
        className="hover:bg-accent flex w-full flex-row items-center rounded-t-md px-3 py-2 transition-colors"
      >
        <div className="flex flex-1 flex-row items-center gap-2 text-left text-base">
          <Wrench className="text-muted-foreground size-4" />
          <span className="font-mono text-sm">{toolName}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.15 }}
                key="loading"
              >
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                  <Spinner className="mr-1 h-3 w-3 animate-spin" />
                  Running
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.15 }}
                key="completed"
              >
                <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <CaretDown
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded ? "rotate-180 transform" : ""
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION}
            className="overflow-hidden"
          >
            <div className="px-3 pt-3 pb-3">
              {isCompleted && (
                <div>
                  <div className="bg-background overflow-auto rounded text-sm">
                    {parseError ? (
                      <div className="text-red-500">{parseError}</div>
                    ) : (
                      renderResults()
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Separate loading indicator component
function LoadingIndicator({
  toolName,
}: {
  toolName?: string
}) {
  const getMessage = () => {
    if (!toolName) return null

    switch (toolName) {
      case "generateMusic":
        return "Generating your music"
      case "generateMVCover":
        return "Creating cover image"
      case "writeLyrics":
        return "Writing lyrics"
      case "fetchWebsiteContent":
        return "Fetching content"
      default:
        return "Processing"
    }
  }

  const message = getMessage()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-start gap-3 py-4 my-2"
    >
      {/* Muse icon on the left */}
      <img
        alt="Muse"
        width="24"
        height="24"
        src="/muse-icon.svg"
        className="object-contain flex-shrink-0"
      />

      {/* Three dots wave animation */}
      <div className="flex items-center gap-1">
        <motion.div
          className="size-2 bg-primary/60 rounded-full"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0,
          }}
        />
        <motion.div
          className="size-2 bg-primary/60 rounded-full"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <motion.div
          className="size-2 bg-primary/60 rounded-full"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
      </div>

      {/* Text on the right - only show if there's a message */}
      {message && (
        <span className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </motion.div>
  )
}
