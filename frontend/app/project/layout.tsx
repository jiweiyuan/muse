import { ChatsProvider } from "@/lib/chat-store/chats/provider"

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ChatsProvider>{children}</ChatsProvider>
}
