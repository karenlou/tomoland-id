/**
 * Party kiosk ID card layout — locked to Figma (TOMOSAPIEN ID CARD ALL GUESTS, node 77:15869).
 * Native artboard: 683×433 (CARD_W × CARD_H). Export scales via PARTY_CARD_SCALE in cardConstants.
 * Do not tweak without re-checking the Figma mockup.
 */
import { CARD_H, CARD_W } from '@/lib/cardConstants'

export const PARTY_CARD_NATIVE_W = CARD_W
export const PARTY_CARD_NATIVE_H = CARD_H

export const CONTENT_LEFT = 36
export const CONTENT_RIGHT = 36
export const CONTENT_W = PARTY_CARD_NATIVE_W - CONTENT_LEFT - CONTENT_RIGHT

export const PHOTO_TOP = 107
export const PHOTO_W = 240
/** Bottom inset matches left content margin (36px) */
export const PHOTO_H = PARTY_CARD_NATIVE_H - CONTENT_LEFT - PHOTO_TOP
export const PHOTO_GAP = 24

/** Tomo mascot sticker — natural SVG aspect (145 × 212), clipped in photo frame */
export const MASCOT_W = 134
export const MASCOT_H = Math.round((211.587 / 145.147) * MASCOT_W)
export const MASCOT_LEFT = 139
export const MASCOT_TOP = 173
export const MASCOT_ROTATE = -6.31

export const TITLE_SIZE = 64
export const TITLE_TOP = 25

/** Slightly smaller than cap height, vertically centered with TOMOSAPIEN */
export const HEART_H = 54
export const HEART_W = Math.round((57 / 48) * HEART_H)
export const HEART_TOP = TITLE_TOP + (TITLE_SIZE - HEART_H) / 2

/** Badge, field rows, and contact share one size */
export const INFO_LABEL_SIZE = 14
export const NAME_SIZE = 24
export const BLURB_SIZE = 10
export const INFO_LABEL_LINE = 1.15
export const INFO_NAME_LINE = 1.15
export const INFO_BLURB_LINE = 1.25

export const FRONT_MTN_BG = '/front%20mtn%20layer.png'

export const PARTY_CARD_BLURB =
  'This card certifies that the holder is a TOMOSAPIEN, permitted to live, build, & do things purely for the love of the game. Authorized to pursue all main & side quests.'

export const PARTY_CARD_DOTS = '.'.repeat(42)
