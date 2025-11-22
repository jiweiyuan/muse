"use client"

import { UserMenu } from "@/app/components/layout/user-menu"
import { MuseIcon } from "@/components/icons/muse"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { useUser } from "@/lib/user-store/provider"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Header({}: { hasSidebar: boolean }) {
  const pathname = usePathname()
  const { user } = useUser()
  const isLoggedIn = !!user
  const isHomePage = pathname === "/"

  return (
    <header className="h-app-header pointer-events-none sticky top-0 z-50 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
      <div className="relative mx-auto flex h-full max-w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-2">
          {isLoggedIn && (
            <Link
              href="/"
              className="pointer-events-auto inline-flex items-center text-xl font-medium tracking-tight leading-none"
            >
              <MuseIcon width={24} height={24} className="mr-1.5" />
              {APP_NAME}
            </Link>
          )}

          {!isLoggedIn && (
            <>
              {!isHomePage && (
                <Link
                  href="/"
                  className="pointer-events-auto"
                  aria-label="Back to home"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                  >
                    <ArrowLeft size={18} />
                  </Button>
                </Link>
              )}
              <Link
                href="/"
                className="pointer-events-auto inline-flex items-center text-xl font-medium tracking-tight"
              >
                <MuseIcon width={24} height={24} className="mr-1.5" />
                {APP_NAME}
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          {!isLoggedIn ? (
            <div className="pointer-events-auto flex items-center gap-3">
              <Link href="/auth">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </Link>
              <Link href="/auth?mode=signUp">
                <Button variant="default" size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  Sign up
                </Button>
              </Link>
            </div>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2">
              <UserMenu />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
