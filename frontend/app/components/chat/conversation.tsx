import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { UIMessage as MessageType } from "@ai-sdk/react"
import { useRef } from "react"
import { Message } from "./message"
import { MessageSkeleton } from "./message-skeleton"

// Extract text from message parts
const getTextFromParts = (parts: MessageType["parts"]) =>
  parts?.filter(p => p.type === "text").map(p => "text" in p ? p.text : "").join("") || ""

// Extract file attachments from message parts
const getAttachmentsFromParts = (parts: MessageType["parts"]) => {
  const files = parts?.filter((p): p is Extract<typeof p, { type: "file" }> => p.type === "file")
  return files?.length ? files : undefined
}

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  isLoading?: boolean
}

export function Conversation({
  messages,
  status = "ready",
  onEdit,
  onReload,
  isLoading = false,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)

  // Show skeleton during initial load - full screen, simple, no scrollbar
  if (isLoading && !messages?.length) {
    return <MessageSkeleton />
  }

  if (!messages?.length) return <div className="h-full w-full" />

  return (
    <div className="relative flex h-full w-full flex-col items-start overflow-x-hidden overflow-y-auto">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex w-full flex-col justify-center">
        <div className="h-app-header bg-background flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-background flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ChatContainerContent
          className="flex w-full flex-col items-start pt-4 pb-4"
          style={{
            scrollbarWidth: "none",
          }}
        >
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1 && status !== "submitted"
            const hasScrollAnchor = isLast && messages.length > initialMessageCount.current

            return (
              <Message
                key={message.id}
                id={message.id}
                variant={message.role}
                attachments={getAttachmentsFromParts(message.parts)}
                isLast={isLast}
                onEdit={onEdit}
                onReload={onReload}
                hasScrollAnchor={hasScrollAnchor}
                parts={message.parts}
                status={status}
              >
                {getTextFromParts(message.parts)}
              </Message>
            )
          })}
          {status === "submitted" && messages.length > 0 && messages[messages.length - 1].role === "user" && (
              <div className="group min-h-scroll-anchor flex w-full flex-col items-start gap-2 px-4 pb-2">
                <Loader />
              </div>
            )}
          <div className="absolute bottom-0 flex w-full flex-1 items-end justify-end gap-4 px-4 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  );
}
