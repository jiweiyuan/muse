/**
 * LetterSpacing TipTap Extension
 *
 * Adds letter-spacing support to TipTap text editor.
 * Applied at the paragraph level (not inline text).
 *
 * Commands:
 * - setLetterSpacing(letterSpacing: string): Apply letter spacing to paragraph (e.g., '0%', '10%', '20%')
 * - unsetLetterSpacing(): Remove letter spacing from paragraph
 *
 * Usage:
 * editor.commands.setLetterSpacing('5%')
 * editor.commands.setLetterSpacing('0%')
 */

import '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

export interface LetterSpacingOptions {
  /**
   * A list of node names where the letter spacing can be applied.
   * @default ['paragraph']
   * @example ['heading', 'paragraph']
   */
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    letterSpacing: {
      /**
       * Set the letter spacing
       * @param letterSpacing The letter spacing value (e.g., '0%', '10%', '20%')
       * @example editor.commands.setLetterSpacing('10%')
       */
      setLetterSpacing(letterSpacing: string): ReturnType
      /**
       * Unset the letter spacing
       * @example editor.commands.unsetLetterSpacing()
       */
      unsetLetterSpacing(): ReturnType
    }
  }
}

/**
 * This extension allows you to set letter spacing for text.
 */
export const LetterSpacing = Extension.create<LetterSpacingOptions>({
  name: 'letterSpacing',

  addOptions() {
    return {
      types: ['paragraph'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) {
                return {}
              }

              return {
                style: `letter-spacing: ${attributes.letterSpacing}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { letterSpacing })
        },
      unsetLetterSpacing:
        () =>
        ({ commands }) => {
          return commands.resetAttributes('paragraph', 'letterSpacing')
        },
    }
  },
})
