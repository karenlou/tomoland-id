const DEVICE_TOKEN_KEY = 'tomoland_device_token'
const CITIZEN_ID_KEY = 'tomoland_my_citizen_id'
const COOKIE_DAYS = 400

function cookieSuffix(): string {
  if (typeof location === 'undefined') return ''
  return location.protocol === 'https:' ? '; Secure' : ''
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + COOKIE_DAYS * 86_400_000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax${cookieSuffix()}`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${cookieSuffix()}`
}

export function getOrCreateDeviceToken(): string {
  if (typeof window === 'undefined') return ''

  try {
    const fromStorage = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (fromStorage) {
      setCookie(DEVICE_TOKEN_KEY, fromStorage)
      return fromStorage
    }

    const fromCookie = getCookie(DEVICE_TOKEN_KEY)
    if (fromCookie) {
      localStorage.setItem(DEVICE_TOKEN_KEY, fromCookie)
      return fromCookie
    }

    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    localStorage.setItem(DEVICE_TOKEN_KEY, token)
    setCookie(DEVICE_TOKEN_KEY, token)
    return token
  } catch {
    const fromCookie = getCookie(DEVICE_TOKEN_KEY)
    return fromCookie ?? ''
  }
}

export function getStoredMyCitizenId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const fromStorage = localStorage.getItem(CITIZEN_ID_KEY)
    if (fromStorage) return fromStorage
  } catch {
    // fall through to cookie
  }
  return getCookie(CITIZEN_ID_KEY)
}

export function setMyCitizen(citizenId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CITIZEN_ID_KEY, citizenId)
  } catch {
    // localStorage may be blocked — cookie still works
  }
  setCookie(CITIZEN_ID_KEY, citizenId)
}

export function clearMyCitizen(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CITIZEN_ID_KEY)
  } catch {
    // ignore
  }
  clearCookie(CITIZEN_ID_KEY)
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
