const CLICK_SOUND_SRC = '/kauasilbershlachparodes-chutter-click-494024.mp3'
const SHUTTER_SOUND_SRC = '/irinairinafomicheva-camera-13695.mp3'
const POOL_SIZE = 4
const VOLUME = 0.38
const SHUTTER_VOLUME = 0.5

let pool: HTMLAudioElement[] = []
let shutterAudio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  const available = pool.find((audio) => audio.paused || audio.ended)
  if (available) return available

  if (pool.length < POOL_SIZE) {
    const audio = new Audio(CLICK_SOUND_SRC)
    audio.preload = 'auto'
    audio.volume = VOLUME
    pool.push(audio)
    return audio
  }

  return pool[0]
}

export function playClickSound() {
  if (typeof window === 'undefined') return

  const audio = getAudio()
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

export function playShutterSound() {
  if (typeof window === 'undefined') return

  if (!shutterAudio) {
    shutterAudio = new Audio(SHUTTER_SOUND_SRC)
    shutterAudio.preload = 'auto'
    shutterAudio.volume = SHUTTER_VOLUME
  }

  shutterAudio.currentTime = 0
  void shutterAudio.play().catch(() => {})
}

export function isClickSoundTarget(el: Element | null): boolean {
  if (!el) return false
  if (el.closest('[data-sound-click="off"], [data-sound-shutter]')) return false

  const interactive = el.closest(
    'button, [role="button"], a[href], input[type="submit"], input[type="button"], label[for], [data-sound-click]',
  )
  if (!interactive) return false
  if (interactive instanceof HTMLButtonElement && interactive.disabled) return false
  if (interactive instanceof HTMLInputElement && interactive.disabled) return false
  if (interactive.getAttribute('aria-disabled') === 'true') return false

  return true
}
