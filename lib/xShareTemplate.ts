export const X_SHARE_TEMPLATE_TEXT =
  'Just became the newest resident of @tomo land 💛'

export function xShareIntentUrl(): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(X_SHARE_TEMPLATE_TEXT)}`
}
