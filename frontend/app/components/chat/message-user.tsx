"use client"

import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog"
import {
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UIMessage as MessageType } from "@ai-sdk/react"
import Image from "next/image"
import { useRef, useState } from "react"

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1]
  return base64
}

type FileAttachment = Extract<
  NonNullable<MessageType["parts"]>[number],
  { type: "file" }
>

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  attachments?: FileAttachment[]
  children: string
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  id: string
  className?: string
}

export function MessageUser({
  hasScrollAnchor,
  attachments,
  children,
  onEdit,
  onReload,
  id,
  className,
}: MessageUserProps) {
  const [editInput, setEditInput] = useState(children)
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(children)
  }

  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editInput)
    }
    onReload()
    setIsEditing(false)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full flex-col items-end gap-0.5 px-4 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      {attachments?.map((attachment, index) => (
        <div
          className="flex flex-row gap-2"
          key={`${attachment.filename}-${index}`}
        >
          {attachment.mediaType?.startsWith("image") ? (
            <MorphingDialog
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                mass: 0.3,
              }}
            >
              <MorphingDialogTrigger className="z-10">
                <Image
                  className="mb-1 w-40 rounded-md"
                  key={attachment.filename}
                  src={attachment.url}
                  alt={attachment.filename || "Attachment"}
                  width={160}
                  height={120}
                />
              </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent className="relative rounded-lg">
                  <MorphingDialogImage
                    src={attachment.url}
                    alt={attachment.filename || ""}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                  />
                </MorphingDialogContent>
                <MorphingDialogClose className="text-primary" />
              </MorphingDialogContainer>
            </MorphingDialog>
          ) : attachment.mediaType?.startsWith("text") ? (
            <div className="text-primary mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-xs">
              {getTextFromDataUrl(attachment.url)}
            </div>
          ) : null}
        </div>
      ))}
      {isEditing ? (
        <div
          className="bg-accent relative flex min-w-[180px] flex-col gap-2 rounded-3xl px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
              if (e.key === "Escape") {
                handleEditCancel()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <MessageContent
          className="bg-accent prose dark:prose-invert prose-p:leading-relaxed relative max-w-[70%] rounded-md px-2 py-1 font-inter text-sm font-medium"
          markdown={true}
          ref={contentRef}
          components={{
            code: ({ children }) => <>{children}</>,
            pre: ({ children }) => <>{children}</>,
            h1: ({ children }) => <p>{children}</p>,
            h2: ({ children }) => <p>{children}</p>,
            h3: ({ children }) => <p>{children}</p>,
            h4: ({ children }) => <p>{children}</p>,
            h5: ({ children }) => <p>{children}</p>,
            h6: ({ children }) => <p>{children}</p>,
            p: ({ children }) => <p>{children}</p>,
            li: ({ children }) => <p>- {children}</p>,
            ul: ({ children }) => <>{children}</>,
            ol: ({ children }) => <>{children}</>,
          }}
        >
          {children}
        </MessageContent>
      )}
    </MessageContainer>
  )
}
