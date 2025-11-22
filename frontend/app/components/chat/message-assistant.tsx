import {
  Message,
  MessageContent,
} from "@/components/prompt-kit/message"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import type { UIMessage as MessageAISDK } from "@ai-sdk/react"
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  parts?: MessageAISDK["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
}

export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  parts,
  status,
  className,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const sources = getSources(parts)
  // AI SDK 5.0: Tool parts are now represented differently
  // Filter for tool parts with type starting with "tool-" or "dynamic-tool"
  const toolInvocationParts = parts?.filter(
    (part): part is Extract<
      typeof part,
      { type: `tool-${string}` } | { type: "dynamic-tool" }
    > => part.type.startsWith("tool-") || part.type === "dynamic-tool"
  )
  const reasoningParts = parts?.find((part) => part.type === "reasoning")
  const contentNullOrEmpty = children === null || children === ""
  // AI SDK 5.0: Tool invocations have changed structure
  // For now, disable image search results until migration is complete
  const searchImageResults: never[] = []

  return (
    <Message
      className={cn(
        "group flex w-full flex-1 items-start gap-4 px-4 py-4",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      <div
        className={cn(
          "relative flex min-w-full flex-col gap-2",
          isLast && "pb-8"
        )}
      >
        {reasoningParts && "text" in reasoningParts && reasoningParts.text && (
          <Reasoning
            reasoning={reasoningParts.text}
            isStreaming={status === "streaming"}
          />
        )}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations && (
            <ToolInvocation toolInvocations={toolInvocationParts} />
          )}

        {searchImageResults.length > 0 && (
          <SearchImages results={searchImageResults} />
        )}

        {contentNullOrEmpty ? null : (
          <MessageContent
            className={cn(
              "prose dark:prose-invert relative min-w-full bg-transparent p-0 font-inter text-sm font-medium",
              "prose-p:leading-relaxed prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto"
            )}
            markdown={true}
          >
            {children}
          </MessageContent>
        )}

        {sources && sources.length > 0 && <SourcesList sources={sources} />}
      </div>
    </Message>
  );
}
