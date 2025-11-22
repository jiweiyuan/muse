/**
 * LineHeight TipTap Extension
 *
 * Adds line-height support to TipTap text editor.
 * Applied at the paragraph level (not inline text).
 *
 * Commands:
 * - setLineHeight(lineHeight: string): Apply line height to paragraph (e.g., '1.5', '2')
 * - unsetLineHeight(): Remove line height from paragraph
 *
 * Usage:
 * editor.commands.setLineHeight('1.5')
 * editor.commands.setLineHeight('2.0')
 */

import '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

export interface LineHeightOptions {
  /**
   * A list of node names where the line height can be applied.
   * @default ['paragraph']
   * @example ['heading', 'paragraph']
   */
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height
       * @param lineHeight The line height value (e.g., '1.5', '2')
       * @example editor.commands.setLineHeight('1.5')
       */
      setLineHeight(lineHeight: string): ReturnType
      /**
       * Unset the line height
       * @example editor.commands.unsetLineHeight()
       */
      unsetLineHeight(): ReturnType
    }
  }
}

/**
 * This extension allows you to set line height for text.
 */
export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

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
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {}
              }

              return {
                style: `line-height: ${attributes.lineHeight}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) => {
          return commands.updateAttributes('paragraph', { lineHeight })
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return commands.resetAttributes('paragraph', 'lineHeight')
        },
    }
  },
})
