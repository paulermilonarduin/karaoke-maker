import { ref } from 'vue'

export const defaultAccentColor = '#7bd2bd'

const storageKey = 'karaoke-maker.appearance.v1'
const hexColorPattern = /^#[0-9a-f]{6}$/i

function loadAccentColor(): string {
  if (typeof window === 'undefined') {
    return defaultAccentColor
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const parsed = storedValue ? (JSON.parse(storedValue) as { accentColor?: unknown }) : undefined

    return typeof parsed?.accentColor === 'string' && hexColorPattern.test(parsed.accentColor)
      ? parsed.accentColor.toLowerCase()
      : defaultAccentColor
  } catch {
    return defaultAccentColor
  }
}

const accentColor = ref(loadAccentColor())

function applyAccentColor(color: string) {
  if (typeof document !== 'undefined') {
    const red = Number.parseInt(color.slice(1, 3), 16)
    const green = Number.parseInt(color.slice(3, 5), 16)
    const blue = Number.parseInt(color.slice(5, 7), 16)
    const luminance = (red * 299 + green * 587 + blue * 114) / 255000

    document.documentElement.style.setProperty('--color-accent', color)
    document.documentElement.style.setProperty(
      '--color-on-accent',
      luminance > 0.56 ? '#101413' : '#fffaf0',
    )
  }
}

applyAccentColor(accentColor.value)

export function useAppearanceSettings() {
  function setAccentColor(color: string) {
    if (!hexColorPattern.test(color)) {
      return
    }

    accentColor.value = color.toLowerCase()
    applyAccentColor(accentColor.value)

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ accentColor: accentColor.value }),
      )
    } catch {
      // The selected color remains active for the current session.
    }
  }

  function resetAccentColor() {
    setAccentColor(defaultAccentColor)

    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // The default color is already restored for the current session.
    }
  }

  return {
    accentColor,
    resetAccentColor,
    setAccentColor,
  }
}
