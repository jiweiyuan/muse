/**
 * FontSize TipTap Extension
 *
 * Adds font-size support to TipTap text editor.
 * Used in canvas text shapes to allow custom font sizing.
 *
 * Commands:
 * - setFontSize(fontSize: string): Apply font size to selected text (e.g., '16px', '24px')
 * - unsetFontSize(): Remove font size from selected text
 *
 * Usage:
 * editor.commands.setFontSize('16px')
 * editor.commands.setFontSize('24px')
 */

import '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

export interface FontSizeOptions {
    /**
     * A list of node names where the font size can be applied.
     * @default ['textStyle']
     * @example ['heading', 'paragraph']
     */
    types: string[]
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            /**
             * Set the font size
             * @param fontSize The font size
             * @example editor.commands.setFontSize('32px')
             */
            setFontSize(fontSize: string): ReturnType
            /**
             * Unset the font size
             * @example editor.commands.unsetFontSize()
             */
            unsetFontSize(): ReturnType
        }
    }
}

/**
 * This extension allows you to set a font size for text.
 */
export const FontSize = Extension.create<FontSizeOptions>({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {}
                            }

                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontSize:
                (fontSize) =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize }).run()
                },
            unsetFontSize:
                () =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
                },
        }
    },
})
