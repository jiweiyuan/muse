"use client"

import XIcon from "@/components/icons/x"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/toast"
import { useUser } from "@/lib/user-store/provider"
import { MessagesContext } from "@/lib/chat-store/messages/provider"
import { SignOut } from "@phosphor-icons/react"
import { Home, LayoutGrid } from "lucide-react"
import { useState, useContext } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { SettingsTrigger } from "./settings/settings-trigger"
import { ThemeSelector } from "./theme-selector"

export function UserMenu() {
  const { user, isLoading, signOut } = useUser()
  const messagesContext = useContext(MessagesContext)
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [isSettingsOpen, setSettingsOpen] = useState(false)

  // Show loading skeleton instead of hiding completely to prevent flicker
  if (!user) {
    return (
      <Avatar className="bg-gray-300 dark:bg-gray-700 shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)]">
        <AvatarFallback>...</AvatarFallback>
      </Avatar>
    )
  }

  const isHomePage = pathname === "/"
  const isProjectsPage = pathname === "/projects"

  const handleSettingsOpenChange = (isOpen: boolean) => {
    setSettingsOpen(isOpen)
    if (!isOpen) {
      setMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Only reset messages if we're in a messages context (e.g., chat page)
      if (messagesContext) {
        await messagesContext.resetMessages()
      }
      await signOut()
      router.push("/")
    } catch (e) {
      console.error("Sign out failed:", e)
      toast({ title: "Failed to sign out", status: "error" })
    }
  }

  return (
    // fix shadcn/ui / radix bug when dialog into dropdown menu
    <DropdownMenu open={isMenuOpen} onOpenChange={setMenuOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger>
            <Avatar className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)]">
              <AvatarImage src={user?.profile_image ?? undefined} />
              <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Profile</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        className="w-56"
        align="start"
        forceMount
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (isSettingsOpen) {
            e.preventDefault()
            return
          }
          setMenuOpen(false)
        }}
      >
        <DropdownMenuItem className="flex flex-col items-start gap-0 no-underline hover:bg-transparent focus:bg-transparent">
          <span>{user?.display_name}</span>
          <span className="text-muted-foreground max-w-full truncate">
            {user?.email}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!isHomePage && (
          <DropdownMenuItem asChild>
            <Link
              href="/"
              className="flex items-center gap-2"
            >
              <Home className="size-4" />
              <span>Home</span>
            </Link>
          </DropdownMenuItem>
        )}
        {!isProjectsPage && (
          <DropdownMenuItem asChild>
            <Link
              href="/projects"
              className="flex items-center gap-2"
            >
              <LayoutGrid className="size-4" />
              <span>Projects</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />

        <ThemeSelector />
        <SettingsTrigger onOpenChange={handleSettingsOpenChange} />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="https://x.com/musedotcom"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <XIcon className="size-4 p-0.5" />
            <span>@musedotcom</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <SignOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
