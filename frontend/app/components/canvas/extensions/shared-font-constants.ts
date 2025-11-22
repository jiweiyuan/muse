/**
 * Shared Font Constants for Canvas Text Editing
 *
 * This file contains all font-related configuration options used across
 * canvas text editing components (TipTap extensions and UI menus).
 *
 * Font Loading Strategy:
 * - Web fonts (Inter): Loaded via tldraw's FontManager (see fonts.ts)
 * - System fonts: Work automatically via CSS font-family fallbacks
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface FontOption {
  id: string
  label: string
  value: string // CSS font-family value
}

export interface FontSizeOption {
  label: string
  value: number // Font size in pixels
}

export interface LineHeightOption {
  label: string
  value: number // Line height multiplier
}

export interface LetterSpacingOption {
  label: string
  value: number // Letter spacing in pixels
}

// ============================================================================
// Font Family Options
// ============================================================================

/**
 * Available font families for text editing
 *
 * Categories:
 * 1. Web fonts: Inter (loaded from Google Fonts)
 * 2. System sans-serif: Arial, Helvetica, Verdana, Trebuchet MS
 * 3. System serif: Georgia, Times New Roman
 * 4. Novelty: Comic Sans MS
 * 5. Generic: serif, monospace
 */
export const CUSTOM_FONT_OPTIONS: FontOption[] = [
  { id: "inter", label: "Inter", value: "Inter" },
  { id: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { id: "helvetica", label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { id: "georgia", label: "Georgia", value: "Georgia, serif" },
  { id: "times", label: "Times New Roman", value: "Times New Roman, Times, serif" },
  { id: "verdana", label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet MS", value: "Trebuchet MS, Helvetica, sans-serif" },
  { id: "comic-sans", label: "Comic Sans MS", value: "Comic Sans MS, cursive, sans-serif" },
  { id: "serif", label: "Serif", value: "serif" },
  { id: "monospace", label: "Monospace", value: "monospace" },
]

// ============================================================================
// Font Size Options
// ============================================================================

/**
 * Font size presets (in pixels)
 * Range: 12px (Small) to 32px (Huge)
 */
export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { label: "Small", value: 12 },
  { label: "Normal", value: 16 },
  { label: "Large", value: 20 },
  { label: "X-Large", value: 24 },
  { label: "XX-Large", value: 28 },
  { label: "Huge", value: 32 },
]

// ============================================================================
// Line Height Options
// ============================================================================

/**
 * Line height presets (multipliers)
 * Range: 1.0 (Tight) to 2.5 (Extra Loose)
 * Applied as multiplier of font size (e.g., 1.5 = 150% line height)
 */
export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  { label: "Tight", value: 1.0 },
  { label: "Snug", value: 1.25 },
  { label: "Normal", value: 1.5 },
  { label: "Relaxed", value: 1.75 },
  { label: "Loose", value: 2.0 },
  { label: "Extra Loose", value: 2.5 },
]

// ============================================================================
// Letter Spacing Options
// ============================================================================

/**
 * Letter spacing presets (in pixels)
 * Range: -5px (Tight) to 20px (Widest)
 * Negative values bring letters closer together
 */
export const LETTER_SPACING_OPTIONS: LetterSpacingOption[] = [
  { label: "Tight", value: -5 },
  { label: "Normal", value: 0 },
  { label: "Wide", value: 5 },
  { label: "Wider", value: 10 },
  { label: "Widest", value: 20 },
]
