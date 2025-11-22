"use client"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useUser } from "@/lib/user-store/provider"
import { SignOut } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useContext } from "react"
import { MessagesContext } from "@/lib/chat-store/messages/provider"

export function AccountManagement() {
  const { signOut } = useUser()
  const { resetChats } = useChats()
  const messagesContext = useContext(MessagesContext)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      // Only reset messages if we're in a messages context (e.g., chat page)
      if (messagesContext) {
        await messagesContext.resetMessages()
      }
      await resetChats()
      await signOut()
      router.push("/")
    } catch (e) {
      console.error("Sign out failed:", e)
      toast({ title: "Failed to sign out", status: "error" })
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium">Account</h3>
        <p className="text-muted-foreground text-xs">Log out on this device</p>
      </div>
      <Button
        variant="default"
        size="sm"
        className="flex items-center gap-2"
        onClick={handleSignOut}
      >
        <SignOut className="size-4" />
        <span>Sign out</span>
      </Button>
    </div>
  )
}
