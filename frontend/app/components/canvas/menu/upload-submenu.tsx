"use client"

import { useEditor } from "tldraw"
import { triggerImageUpload, triggerVideoUpload, triggerAudioUpload } from "../canvas-custom-ui"
import { Image, Video, Music } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ReactNode } from "react"

interface UploadSubmenuProps {
  trigger: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Upload submenu with image, video, and audio upload options
 */
export const UploadSubmenu = ({ trigger, open, onOpenChange }: UploadSubmenuProps) => {
  const editor = useEditor()

  const handleImageUpload = () => {
    triggerImageUpload(editor)
    onOpenChange?.(false)
  }

  const handleVideoUpload = () => {
    triggerVideoUpload(editor)
    onOpenChange?.(false)
  }

  const handleAudioUpload = () => {
    triggerAudioUpload(editor)
    onOpenChange?.(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={16}
        className="w-auto p-2 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] border-none rounded-xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px]"
      >
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-2 h-9 px-3 bg-transparent border-none rounded-lg text-[#1a1a1a] dark:text-[#e5e5e5] cursor-pointer transition-all duration-[120ms] outline-none font-medium text-[13px] text-left whitespace-nowrap hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.08] dark:active:bg-white/[0.12] active:scale-[0.98]"
            onClick={handleImageUpload}
            title="Upload Image"
          >
            <Image size={16} />
            <span>Upload Image</span>
          </button>

          <button
            className="flex items-center gap-2 h-9 px-3 bg-transparent border-none rounded-lg text-[#1a1a1a] dark:text-[#e5e5e5] cursor-pointer transition-all duration-[120ms] outline-none font-medium text-[13px] text-left whitespace-nowrap hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.08] dark:active:bg-white/[0.12] active:scale-[0.98]"
            onClick={handleVideoUpload}
            title="Upload Video"
          >
            <Video size={16} />
            <span>Upload Video</span>
          </button>

          <button
            className="flex items-center gap-2 h-9 px-3 bg-transparent border-none rounded-lg text-[#1a1a1a] dark:text-[#e5e5e5] cursor-pointer transition-all duration-[120ms] outline-none font-medium text-[13px] text-left whitespace-nowrap hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.08] dark:active:bg-white/[0.12] active:scale-[0.98]"
            onClick={handleAudioUpload}
            title="Upload Audio"
          >
            <Music size={16} />
            <span>Upload Audio</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
