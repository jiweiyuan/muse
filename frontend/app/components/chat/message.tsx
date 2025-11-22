import { UIMessage as MessageType } from "@ai-sdk/react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type FileAttachment = Extract<
  NonNullable<MessageType["parts"]>[number],
  { type: "file" }
>

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: FileAttachment[]
  isLast?: boolean
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
}

export function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  onEdit,
  onReload,
  hasScrollAnchor,
  parts,
  status,
  className,
}: MessageProps) {
  if (variant === "user") {
    return (
      <MessageUser
        onReload={onReload}
        onEdit={onEdit}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        className={className}
      >
        {children}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
        className={className}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
}
