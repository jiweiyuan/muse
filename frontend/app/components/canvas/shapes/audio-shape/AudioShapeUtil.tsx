"use client"

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
} from "tldraw"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { AudioShape } from "@muse/shared-schemas"
import { audioShapeProps } from "@muse/shared-schemas"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

/**
 * Audio player component with custom UI
 */
function AudioPlayer({ shape, editor }: { shape: AudioShape; editor: any }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)

  // Get asset URL from editor
  const assetId = shape.props.assetId
  const asset = assetId ? editor.getAsset(assetId) : null
  const audioUrl = asset?.props?.src || null
  const audioTitle =
    (asset?.type === 'video' ? asset.props.name : undefined) ||
    asset?.meta?.title ||
    "Audio"

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
      audio.muted = false
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = value[0]
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const stopEventPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="flex flex-col bg-gray-100 dark:bg-gray-900 p-4 pointer-events-auto border border-gray-200 dark:border-gray-800"
      style={{
        width: shape.props.w,
        height: shape.props.h,
      }}
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {/* Title - Can be used as drag handle */}
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 overflow-hidden text-ellipsis whitespace-nowrap">
        {audioTitle}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <Slider
          value={[currentTime]}
          max={duration || 0}
          step={0.1}
          onValueChange={handleSeek}
          onPointerDown={stopEventPropagation}
          onPointerUp={stopEventPropagation}
          onPointerMove={stopEventPropagation}
          onClick={stopEventPropagation}
          className="cursor-pointer"
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          onClick={(e) => {
            stopEventPropagation(e)
            togglePlay()
          }}
          onPointerDown={stopEventPropagation}
          onPointerUp={stopEventPropagation}
          onPointerMove={stopEventPropagation}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Volume controls */}
        <div className="flex items-center gap-2 flex-1">
          <Button
            onClick={(e) => {
              stopEventPropagation(e)
              toggleMute()
            }}
            onPointerDown={stopEventPropagation}
            onPointerUp={stopEventPropagation}
            onPointerMove={stopEventPropagation}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shrink-0"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            onPointerDown={stopEventPropagation}
            onPointerUp={stopEventPropagation}
            onPointerMove={stopEventPropagation}
            onClick={stopEventPropagation}
            className="flex-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Audio shape utility class
 * Manages audio player shapes on the canvas
 */
export class AudioShapeUtil extends BaseBoxShapeUtil<AudioShape> {
  static override type = "audio" as const

  // Props validation schema - critical for tldraw data integrity
  static override props = audioShapeProps

  /**
   * Default properties for new audio shapes
   */
  getDefaultProps(): AudioShape["props"] {
    return {
      w: 320,
      h: 160,
      assetId: null,
    }
  }

  /**
   * Audio shapes can be resized
   */
  override canResize = () => true as const

  /**
   * Audio shapes cannot be edited (no text editing)
   */
  override canEdit = () => false

  /**
   * Audio shapes are not aspect ratio locked
   */
  override isAspectRatioLocked = () => false

  /**
   * Define the geometry for hit testing and selection
   */
  getGeometry(shape: AudioShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  /**
   * Render the audio player component
   */
  component(shape: AudioShape) {
    return (
      <HTMLContainer>
        <AudioPlayer shape={shape} editor={this.editor} />
      </HTMLContainer>
    )
  }

  /**
   * Selection indicator
   */
  indicator(shape: AudioShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }

  /**
   * Handle resizing
   */
  override onResize = (shape: AudioShape, info: any) => {
    return resizeBox(shape, info)
  }
}
