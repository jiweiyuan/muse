type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface ContentPart {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: Json
  result?: Json
  toolInvocation?: {
    state: string
    step: number
    toolCallId: string
    toolName: string
    args?: Json
    result?: Json
  }
  reasoning?: string
  details?: Json[]
}

export interface MessagePayload {
  role: "user" | "assistant" | "system" | "data" | "tool" | "tool-call"
  content: string | null | ContentPart[]
  reasoning?: string
}
