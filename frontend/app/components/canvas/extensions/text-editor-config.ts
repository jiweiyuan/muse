/**
 * TipTap Text Editor Configuration for tldraw
 *
 * This file configures the rich text editor used in canvas text shapes.
 * It combines tldraw's default extensions with custom typography extensions.
 *
 * Extensions included:
 * 1. tldraw defaults: Basic formatting (bold, italic, underline, etc.)
 * 2. TextStyle: Required base for custom text styling
 * 3. FontFamily: Custom font selection
 * 4. FontSize: Custom font sizing
 * 5. LineHeight: Paragraph line spacing
 * 6. LetterSpacing: Character spacing
 *
 * Extension types:
 * - textStyle: Applied to inline text (font-family, font-size)
 * - paragraph: Applied to blocks (line-height, letter-spacing)
 */

import { tipTapDefaultExtensions } from 'tldraw'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from './font-family-extension'
import { FontSize } from './FontSizeExtension'
import { LineHeight } from './LineHeightExtension'
import { LetterSpacing } from './LetterSpacingExtension'
import { extensionFontFamilies } from './fonts'
import type { Extension } from '@tiptap/core'

export const textOptions = {
    tipTapConfig: {
        extensions: [
            ...tipTapDefaultExtensions,
            TextStyle, // Required base extension for custom text styling
            FontFamily.configure({
                types: ['textStyle'], // Apply to inline text
            }),
            FontSize.configure({
                types: ['textStyle'], // Apply to inline text
            }),
            LineHeight.configure({
                types: ['paragraph'], // Apply to block-level elements
            }),
            LetterSpacing.configure({
                types: ['paragraph'], // Apply to block-level elements
            }),
        ] as Extension[],
    },
}

export { extensionFontFamilies }
