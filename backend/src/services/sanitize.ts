import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window as any)

export function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input)
}
