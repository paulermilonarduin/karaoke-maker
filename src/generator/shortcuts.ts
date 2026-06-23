import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Locale, TranslationKey } from '../i18n'

export type GeneratorActionId =
  | 'player.toggle'
  | 'marker.create'
  | 'marker.bridge'
  | 'marker.undo'
  | 'player.seekBackward'
  | 'player.seekForward'
  | 'marker.nudgeBackward'
  | 'marker.nudgeForward'
  | 'player.slower'
  | 'player.faster'

export type ShortcutBinding = {
  code?: string
  key?: string
  control?: boolean
  alt?: boolean
  shift?: boolean
}

export type GeneratorActionDefinition = {
  id: GeneratorActionId
  labelKey: TranslationKey
  shortcut: ShortcutBinding
  repeat?: boolean
}

export const generatorActions: GeneratorActionDefinition[] = [
  {
    id: 'player.toggle',
    labelKey: 'shortcut.action.playerToggle',
    shortcut: { code: 'Space' },
  },
  {
    id: 'marker.create',
    labelKey: 'shortcut.action.markerCreate',
    shortcut: { code: 'Enter' },
  },
  {
    id: 'marker.bridge',
    labelKey: 'shortcut.action.markerBridge',
    shortcut: { key: 'b' },
  },
  {
    id: 'marker.undo',
    labelKey: 'shortcut.action.markerUndo',
    shortcut: { key: 'z', control: true },
  },
  {
    id: 'player.seekBackward',
    labelKey: 'shortcut.action.playerSeekBackward',
    shortcut: { code: 'ArrowLeft' },
    repeat: true,
  },
  {
    id: 'player.seekForward',
    labelKey: 'shortcut.action.playerSeekForward',
    shortcut: { code: 'ArrowRight' },
    repeat: true,
  },
  {
    id: 'marker.nudgeBackward',
    labelKey: 'shortcut.action.markerNudgeBackward',
    shortcut: { code: 'ArrowLeft', shift: true },
    repeat: true,
  },
  {
    id: 'marker.nudgeForward',
    labelKey: 'shortcut.action.markerNudgeForward',
    shortcut: { code: 'ArrowRight', shift: true },
    repeat: true,
  },
  {
    id: 'player.slower',
    labelKey: 'shortcut.action.playerSlower',
    shortcut: { key: '-' },
  },
  {
    id: 'player.faster',
    labelKey: 'shortcut.action.playerFaster',
    shortcut: { key: '+' },
  },
]

const shortcutStorageKey = 'karaoke-maker.generator-shortcuts.v1'

const keyLabels: Record<Locale, Record<string, string>> = {
  fr: {
    '-': '−',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    Backspace: 'Retour arrière',
    Delete: 'Suppr',
    End: 'Fin',
    Enter: 'Entrée',
    Escape: 'Échap',
    Home: 'Début',
    Space: 'Espace',
    Tab: 'Tab',
  },
  'en-US': {
    '-': '−',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    Backspace: 'Backspace',
    Delete: 'Delete',
    End: 'End',
    Enter: 'Enter',
    Escape: 'Escape',
    Home: 'Home',
    Space: 'Space',
    Tab: 'Tab',
  },
}

export function formatShortcut(binding: ShortcutBinding, locale: Locale = 'fr'): string[] {
  const keys: string[] = []

  if (binding.control) keys.push('Ctrl')
  if (binding.alt) keys.push('Alt')
  if (binding.shift) keys.push(locale === 'fr' ? 'Maj' : 'Shift')

  const mainKey = binding.key ?? binding.code ?? ''

  const fallbackLabel = mainKey
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Numpad/, locale === 'fr' ? 'Pavé ' : 'Numpad ')

  keys.push(
    keyLabels[locale][mainKey] ?? (/^[a-z]$/.test(mainKey) ? mainKey.toUpperCase() : fallbackLabel),
  )

  return keys
}

export function shortcutFromKeyboardEvent(
  event: KeyboardEvent,
): ShortcutBinding | undefined {
  if (['Alt', 'Control', 'Meta', 'Shift'].includes(event.key) || event.metaKey) {
    return undefined
  }

  const useProducedCharacter = event.key.length === 1 && event.code !== 'Space'
  const producedKey = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.key
  const shiftIsModifier = /^[a-z]$/i.test(event.key) && event.shiftKey

  return {
    ...(useProducedCharacter ? { key: producedKey } : { code: event.code }),
    ...(event.ctrlKey ? { control: true } : {}),
    ...(event.altKey ? { alt: true } : {}),
    ...((!useProducedCharacter && event.shiftKey) || shiftIsModifier ? { shift: true } : {}),
  }
}

export function shortcutsEqual(
  left: ShortcutBinding,
  right: ShortcutBinding,
): boolean {
  return (
    left.code === right.code &&
    left.key === right.key &&
    Boolean(left.control) === Boolean(right.control) &&
    Boolean(left.alt) === Boolean(right.alt) &&
    Boolean(left.shift) === Boolean(right.shift)
  )
}

function isShortcutBinding(value: unknown): value is ShortcutBinding {
  if (!value || typeof value !== 'object') {
    return false
  }

  const binding = value as Record<string, unknown>
  const hasCode = typeof binding.code === 'string' && binding.code.length > 0
  const hasKey = typeof binding.key === 'string' && binding.key.length > 0
  const optionalBooleansAreValid = ['control', 'alt', 'shift'].every(
    (property) => binding[property] === undefined || typeof binding[property] === 'boolean',
  )

  return hasCode !== hasKey && optionalBooleansAreValid
}

function normalizeShortcutBinding(binding: ShortcutBinding): ShortcutBinding {
  if (binding.key !== ' ') {
    return binding
  }

  const { key: _key, ...modifiers } = binding

  return { ...modifiers, code: 'Space' }
}

function loadCustomShortcuts(): Partial<Record<GeneratorActionId, ShortcutBinding>> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const storedValue = window.localStorage.getItem(shortcutStorageKey)

    if (!storedValue) {
      return {}
    }

    const parsed = JSON.parse(storedValue) as {
      version?: unknown
      bindings?: Record<string, unknown>
    }

    if (parsed.version !== 1 || !parsed.bindings || typeof parsed.bindings !== 'object') {
      return {}
    }

    const customShortcuts: Partial<Record<GeneratorActionId, ShortcutBinding>> = {}

    generatorActions.forEach((action) => {
      const storedBinding = parsed.bindings?.[action.id]

      if (isShortcutBinding(storedBinding)) {
        const normalizedBinding = normalizeShortcutBinding(storedBinding)

        if (!shortcutsEqual(normalizedBinding, action.shortcut)) {
          customShortcuts[action.id] = normalizedBinding
        }
      }
    })

    return customShortcuts
  } catch {
    return {}
  }
}

export function useGeneratorShortcutSettings() {
  const customShortcuts = ref<Partial<Record<GeneratorActionId, ShortcutBinding>>>(
    loadCustomShortcuts(),
  )
  const actions = computed<GeneratorActionDefinition[]>(() =>
    generatorActions.map((action) => ({
      ...action,
      shortcut: customShortcuts.value[action.id] ?? action.shortcut,
    })),
  )
  const hasCustomShortcuts = computed(
    () => Object.keys(customShortcuts.value).length > 0,
  )

  function persist() {
    try {
      window.localStorage.setItem(
        shortcutStorageKey,
        JSON.stringify({ version: 1, bindings: customShortcuts.value }),
      )
    } catch {
      // The shortcut remains active for the current session if storage is unavailable.
    }
  }

  function setShortcut(actionId: GeneratorActionId, shortcut: ShortcutBinding) {
    const nextShortcuts = { ...customShortcuts.value }
    const defaultShortcut = generatorActions.find((action) => action.id === actionId)?.shortcut

    if (defaultShortcut && shortcutsEqual(defaultShortcut, shortcut)) {
      delete nextShortcuts[actionId]
    } else {
      nextShortcuts[actionId] = shortcut
    }

    customShortcuts.value = nextShortcuts
    persist()
  }

  function resetShortcuts() {
    customShortcuts.value = {}

    try {
      window.localStorage.removeItem(shortcutStorageKey)
    } catch {
      // Nothing else to do: defaults are already restored for this session.
    }
  }

  return {
    actions,
    hasCustomShortcuts,
    resetShortcuts,
    setShortcut,
  }
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutBinding): boolean {
  const eventKey = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.key
  const mainKeyMatches = shortcut.key
    ? eventKey === shortcut.key
    : event.code === shortcut.code
  const shiftMatches = shortcut.key
    ? shortcut.shift === undefined || event.shiftKey === shortcut.shift
    : event.shiftKey === Boolean(shortcut.shift)

  return (
    mainKeyMatches &&
    event.ctrlKey === Boolean(shortcut.control) &&
    event.altKey === Boolean(shortcut.alt) &&
    shiftMatches &&
    !event.metaKey
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
  )
}

export function useGeneratorShortcuts(
  handlers: Partial<Record<GeneratorActionId, () => void>>,
  enabled: () => boolean = () => true,
  actions: () => GeneratorActionDefinition[] = () => generatorActions,
) {
  function onKeyDown(event: KeyboardEvent) {
    if (!enabled() || isEditableTarget(event.target)) {
      return
    }

    const action = actions().find((candidate) =>
      matchesShortcut(event, candidate.shortcut),
    )

    if (!action || (event.repeat && !action.repeat)) {
      return
    }

    const handler = handlers[action.id]

    if (!handler) {
      return
    }

    event.preventDefault()
    handler()
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
}
