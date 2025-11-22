import { useRef } from "react"
import { Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  isUserAuthenticated: boolean
}

export function ButtonFileUpload({ onFileUpload, isUserAuthenticated }: ButtonFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileUpload(Array.from(files))
      // Reset input so same file can be selected again
      e.target.value = ""
    }
  }

  if (!isUserAuthenticated) {
    return null
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.csv,.xls,.xlsx"
        onChange={handleFileChange}
        className="hidden"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileClick}
            className="h-8 w-8"
            type="button"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Attach files (images, PDFs, documents)</p>
        </TooltipContent>
      </Tooltip>
    </>
  )
}
