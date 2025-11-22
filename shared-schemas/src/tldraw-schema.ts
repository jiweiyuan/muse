import {
  createTLSchema,
  defaultShapeSchemas,
  type TLBaseShape,
  assetIdValidator,
  type TLAssetId
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

/**
 * Audio shape prop validators
 * These define the validation schema for audio shape properties
 */
export const audioShapeProps = {
  w: T.number,
  h: T.number,
  assetId: assetIdValidator.nullable(),
} as const

/**
 * Audio shape type definition
 * Represents an audio player shape on the canvas
 */
export type AudioShape = TLBaseShape<
  'audio',
  {
    w: number
    h: number
    assetId: TLAssetId | null
  }
>

/**
 * Audio shape props type (extracted from shape type)
 */
export type AudioShapeProps = AudioShape['props']

/**
 * Custom TLDraw schema with audio shape support
 * This schema must be used on both client and server for proper sync
 *
 * IMPORTANT: We must include ALL default shapes plus our custom audio shape
 * Otherwise migration dependencies will fail (e.g., arrow bindings depend on arrow shapes)
 */
export const customTLSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    audio: {
      props: audioShapeProps,
    },
  },
})
