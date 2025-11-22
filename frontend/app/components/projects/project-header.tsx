"use client"

import { UserMenu } from "@/app/components/layout/user-menu"
import { MuseIcon } from "@/components/icons"
import { APP_NAME } from "@/lib/config"
import Link from "next/link"

export function ProjectHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-12 pointer-events-none">
      <div className="h-full w-full flex items-center justify-between px-6">
        {/* Left: Muse Icon */}
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        >
          <MuseIcon width={24} height={24} />
        </Link>

        {/* Right: Profile Icon */}
        <div className="flex items-center justify-end gap-3 pointer-events-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
