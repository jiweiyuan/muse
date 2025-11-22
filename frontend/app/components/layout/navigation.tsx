"use client"

import {
  Home,
  Image,
  Video,
  LayoutGrid
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "@/components/ui/toast"

const navItems = [
  {
    href: "/",
    label: "Go to home",
    name: "Home",
    icon: Home,
    comingSoon: false
  },
  {
    href: "/image",
    label: "Open Image",
    name: "Image",
    icon: Image,
    comingSoon: true
  },
  {
    href: "/video",
    label: "Open Video",
    name: "Video",
    icon: Video,
    comingSoon: true
  },
  {
    href: "/apps",
    label: "Open Apps",
    name: "Apps",
    icon: LayoutGrid,
    comingSoon: true
  }
]

export function Navigation() {
  const pathname = usePathname()

  const handleComingSoonClick = (itemName: string) => {
    toast({
      title: "Coming Soon",
      description: `${itemName} feature is coming soon!`,
      status: "info"
    })
  }

  return (
    <nav className="pointer-events-auto">
      <ul className="m-0 flex list-none gap-1.5 rounded-xl bg-muted/50 p-1.5 border border-border/50">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.comingSoon) {
            return (
              <li key={item.href}>
                <button
                  onClick={() => handleComingSoonClick(item.name)}
                  aria-label={item.label}
                  className={`group relative block h-10 w-10 transition-all duration-200 ease-out text-muted-foreground hover:text-foreground cursor-pointer`}
                >
                  <div className="relative z-20 flex h-full w-full items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <Icon size={18} />
                  </div>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-12 left-1/2 z-30 block origin-top -translate-x-1/2 scale-90 rounded-lg bg-popover px-2 py-1.5 text-xs font-medium leading-none text-popover-foreground opacity-0 shadow-md transition-[transform,opacity] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap border border-border/50"
                  >
                    {item.name}
                  </span>
                </button>
              </li>
            )
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`group relative block h-10 w-10 transition-all duration-200 ease-out ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative z-20 flex h-full w-full items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <Icon size={18} />
                </div>
                <div
                  className={`absolute inset-0 z-10 rounded-lg bg-background shadow-sm transition-all duration-200 ${
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-12 left-1/2 z-30 block origin-top -translate-x-1/2 scale-90 rounded-lg bg-popover px-2 py-1.5 text-xs font-medium leading-none text-popover-foreground opacity-0 shadow-md transition-[transform,opacity] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap border border-border/50"
                >
                  {item.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
