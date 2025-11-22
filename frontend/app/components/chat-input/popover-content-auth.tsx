"use client"

import { Button } from "@/components/ui/button"
import { PopoverContent } from "@/components/ui/popover"
import { APP_NAME } from "@/lib/config"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function PopoverContentAuth() {
  const router = useRouter()

  return (
    <PopoverContent
      className="w-[300px] overflow-hidden rounded-xl p-0"
      side="top"
      align="start"
    >
      <Image
        src="/banner_forest.jpg"
        alt={`calm paint generate by ${APP_NAME}`}
        width={300}
        height={128}
        className="h-32 w-full object-cover"
      />
      <div className="p-3">
        <p className="text-primary mb-1 text-base font-medium">
          Sign in to unlock all features
        </p>
        <p className="text-muted-foreground mb-5 text-base">
          Add files, use more models, BYOK, and more.
        </p>
        <Button
          variant="default"
          className="w-full text-base"
          size="lg"
          onClick={() => router.push("/auth")}
        >
          Sign in
        </Button>
      </div>
    </PopoverContent>
  )
}
