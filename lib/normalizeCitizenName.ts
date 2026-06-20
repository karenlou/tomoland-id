/** Capitalizes each segment around an apostrophe — "o'brien" -> "O'Brien" —
 * except a trailing possessive 's, which stays lowercase: "will's" -> "Will's" */
function capitalizeApostrophed(part: string): string {
  const segs = part.split("'")
  return segs
    .map((seg, i) => {
      if (i > 0 && i === segs.length - 1 && seg.toLowerCase() === 's') {
        return seg.toLowerCase()
      }
      return seg ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : seg
    })
    .join("'")
}

/** Capitalizes each side of a hyphen — "melas-kyriazi" -> "Melas-Kyriazi" */
function titleCaseWord(word: string): string {
  return word.split('-').map(capitalizeApostrophed).join('-')
}

export function normalizeCitizenName(name: string): string {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ')
}
