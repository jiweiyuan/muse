"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CollapseChatIcon } from "@/components/icons/collapse-chat"
import { NewChatIcon } from "@/components/icons/new-chat"
import { ChatHistoryIcon } from "@/components/icons/chat-history"
import { TrashIcon } from "@/components/icons/trash"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"

interface ChatItem {
  id: string
  title: string
  updatedAt?: string
}

interface ConversationChatHeaderProps {
  title?: string
  onCollapse?: () => void
  onNewChat: () => void
  chatHistory: ChatItem[]
  activeChatId: string | null
  onChatSelect: (chatId: string) => void
  onChatDelete?: (chatId: string) => void
  isLoadingChats?: boolean
  isNewChat?: boolean
}

export function ConversationChatHeader({
  title = "New Chat",
  onCollapse,
  onNewChat,
  chatHistory,
  activeChatId,
  onChatSelect,
  onChatDelete,
  isLoadingChats = false,
  isNewChat = false,
}: ConversationChatHeaderProps) {
  const [deletePopoverOpen, setDeletePopoverOpen] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleConfirmDelete = (chatId: string) => {
    if (onChatDelete) {
      onChatDelete(chatId)
    }
    setDeletePopoverOpen(null)
  }

  return (
    <div className="sticky top-0 z-20 w-full flex items-center justify-between bg-background/80 backdrop-blur-sm px-3 py-2 border-b border-border">
      <h2 className="text-xs font-medium text-foreground truncate flex-1 mr-2">
        {title}
      </h2>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* New Chat Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNewChat}
              disabled={isNewChat}
              className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
              aria-label="New chat"
            >
              <NewChatIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>

        {/* Chat History Dropdown */}
        <DropdownMenu modal={false} open={historyOpen} onOpenChange={setHistoryOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                  aria-label="Chat history"
                >
                  <ChatHistoryIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Chat History</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>Chat History</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingChats ? (
              <div className="px-2 py-4 text-xs text-center text-muted-foreground">
                Loading...
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="px-2 py-4 text-xs text-center text-muted-foreground">
                No chat history
              </div>
            ) : (
              chatHistory.map((chat) => {
                const isActive = chat.id === activeChatId
                const timeAgo = chat.updatedAt
                  ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })
                  : "Just now"

                return (
                  <div key={chat.id} className="px-2">
                    <div
                      onClick={() => {
                        setDeletePopoverOpen(null)
                        setHistoryOpen(false)
                        onChatSelect(chat.id)
                      }}
                      className={`group flex items-center gap-2 w-full cursor-pointer px-2 py-2 rounded-md mb-1 hover:bg-accent ${
                        isActive ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {chat.title || "New Chat"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {timeAgo}
                        </div>
                      </div>
                      {onChatDelete && (
                        <Popover
                          open={deletePopoverOpen === chat.id}
                          onOpenChange={(open) => {
                            if (!open) setDeletePopoverOpen(null)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletePopoverOpen(chat.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-accent rounded transition-all"
                              aria-label="Delete chat"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-64 p-3"
                            align="end"
                            side="left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Confirm deletion?</p>
                              <p className="text-xs text-muted-foreground">
                                Deleted chat can not be recovered. Generated images will remain on the canvas.
                              </p>
                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletePopoverOpen(null)
                                  }}
                                  className="px-3 py-1.5 text-xs rounded-md hover:bg-accent cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConfirmDelete(chat.id)
                                  }}
                                  className="px-3 py-1.5 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse Button */}
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCollapse}
                className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                aria-label="Collapse chat"
              >
                <CollapseChatIcon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Collapse Chat</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
