"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useProjectStore } from "@/lib/project-store"
import { cn } from "@/lib/utils"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

type HistoryTriggerProps = {
  hasSidebar: boolean
  classNameTrigger?: string
  icon?: React.ReactNode
  label?: React.ReactNode | string
  hasPopover?: boolean
}

export function HistoryTrigger({
  classNameTrigger,
  icon,
  label,
  hasPopover = true,
}: HistoryTriggerProps) {
  const isMobile = useBreakpoint(768)
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const [isOpen, setIsOpen] = useState(false)
  const { activeChatId: chatId, activeProjectId } = useProjectStore()

  const handleSaveEdit = async (id: string, newTitle: string) => {
    if (!activeProjectId) return
    await updateTitle(activeProjectId, id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    if (!activeProjectId) return
    if (id === chatId) {
      setIsOpen(false)
    }
    // Navigate to project page if we have a project, otherwise home
    const redirectPath = activeProjectId ? `/project/${activeProjectId}` : "/"
    await deleteChat(activeProjectId, id, chatId!, () => router.push(redirectPath))
  }

  const defaultTrigger = (
    <button
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted bg-background pointer-events-auto rounded-full p-1.5 transition-colors",
        "block",
        classNameTrigger
      )}
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label="Search"
      tabIndex={isMobile ? -1 : 0}
    >
      {icon || <ListMagnifyingGlass size={24} />}
      {label}
    </button>
  )

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        trigger={defaultTrigger}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
      trigger={defaultTrigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onOpenChange={setIsOpen}
      hasPopover={hasPopover}
    />
  )
}
