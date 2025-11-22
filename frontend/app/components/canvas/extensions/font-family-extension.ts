/**
 * FontFamily TipTap Extension
 *
 * Adds font-family support to TipTap text editor.
 * Used in canvas text shapes to allow custom font selection.
 *
 * Commands:
 * - setFontFamily(fontFamily: string): Apply font family to selected text
 * - unsetFontFamily(): Remove font family from selected text
 *
 * Usage:
 * editor.commands.setFontFamily('Inter')
 * editor.commands.setFontFamily('Arial, Helvetica, sans-serif')
 */

import { Extension } from '@tiptap/core'

export interface FontFamilyOptions {
    types: string[]
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontFamily: {
            setFontFamily(fontFamily: string): ReturnType
            unsetFontFamily(): ReturnType
        }
    }
}

export const FontFamily = Extension.create<FontFamilyOptions>({
    name: 'fontFamily',

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
                    fontFamily: {
                        default: null,
                        parseHTML: (element) => element.style.fontFamily?.replace(/['"]+/g, ''),
                        renderHTML: (attributes) => {
                            if (!attributes.fontFamily) {
                                return {}
                            }

                            return {
                                style: `font-family: ${attributes.fontFamily}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontFamily:
                (fontFamily) =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontFamily }).run()
                },
            unsetFontFamily:
                () =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontFamily: null }).run()
                },
        }
    },
})
