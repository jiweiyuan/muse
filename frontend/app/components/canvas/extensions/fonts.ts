/**
 * Font Loading Configuration for tldraw
 *
 * This file defines which fonts should be loaded by tldraw's FontManager.
 *
 * IMPORTANT RULES:
 * 1. Only register fonts that need to be loaded from external URLs (e.g., Google Fonts)
 * 2. DO NOT register system fonts (Arial, Helvetica, Georgia, etc.) here
 * 3. System fonts work automatically via CSS fallbacks without registration
 * 4. Attempting to load system fonts with empty/invalid data URIs causes network errors
 *
 * Current loaded fonts:
 * - Inter: Loaded from Google Fonts (normal and bold weights, regular and italic styles)
 *
 * Available system fonts (no registration needed):
 * - Arial, Helvetica, sans-serif
 * - Georgia, Times New Roman, serif
 * - Verdana, Trebuchet MS
 * - Comic Sans MS, cursive
 * - monospace
 *
 * To add a new web font:
 * 1. Add it to this file with proper URL, weight, and style
 * 2. Add it to CUSTOM_FONT_OPTIONS in shared-font-constants.ts
 * 3. Ensure the font supports your target character sets
 */

import { TLDefaultFont, TLFontFace } from 'tldraw'

export const extensionFontFamilies: {
    [key: string]: { [key: string]: { [key: string]: TLFontFace } }
} = {
    Inter: {
        normal: {
            normal: {
                family: 'Inter',
                src: {
                    url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2',
                    format: 'woff2',
                },
                weight: '500',
                style: 'normal',
            },
            bold: {
                family: 'Inter',
                src: {
                    url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2',
                    format: 'woff2',
                },
                weight: '700',
                style: 'normal',
            },
        },
        italic: {
            normal: {
                family: 'Inter',
                src: {
                    url: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc69tRipWFsevceSGM.woff2',
                    format: 'woff2',
                },
                weight: '500',
                style: 'normal',
            },
            bold: {
                family: 'Inter',
                src: {
                    url: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxRipWFsevceSGM.woff2',
                    format: 'woff2',
                },
                weight: '700',
                style: 'normal',
            },
        },
    },
} satisfies Record<string, TLDefaultFont>
