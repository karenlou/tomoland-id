// Shared card dimensions — single source for radius + scale math
export const CARD_W = 683
export const CARD_H = 433
/** Matches --radius-card; scales down in thumbnails */
export const CARD_BORDER_RADIUS = 12

export function cardRadiusAtScale(scale: number): number {
  return Math.round(CARD_BORDER_RADIUS * scale)
}

/** Subtle card edge + layered depth */
export const CARD_BORDER = '1px solid rgba(44, 37, 17, 0.12)'
export const CARD_SHADOW =
  'inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 1px 2px rgba(44, 37, 17, 0.08), 0 4px 10px rgba(44, 37, 17, 0.1), 0 10px 22px rgba(44, 37, 17, 0.08)'

/** Spotlight + sleeve layout (matches IdSleeve padding) */
export const SPOTLIGHT_W = 400
export const SPOTLIGHT_SCALE = SPOTLIGHT_W / CARD_W
export const SLEEVE_PAD_X = 26
export const SPOTLIGHT_SLEEVE_W = SPOTLIGHT_W + SLEEVE_PAD_X * 2

/** Party kiosk print-ready export size (1350x850 per brief — slightly wider
 * aspect ratio than the card's native 683x433, so scaling to fill the width
 * leaves a few px of vertical overflow that gets clipped, same as elsewhere. */
export const PARTY_CARD_W = 1350
export const PARTY_CARD_H = 850
export const PARTY_CARD_SCALE = PARTY_CARD_W / CARD_W
