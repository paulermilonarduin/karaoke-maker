import { onBeforeUnmount, onMounted } from 'vue'

export type GeneratorActionId =
  | 'player.toggle'
  | 'marker.create'
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
  label: string
  shortcut: ShortcutBinding
  repeat?: boolean
}

export const generatorActions: GeneratorActionDefinition[] = [
  {
    id: 'player.toggle',
    label: 'Lecture / pause',
    shortcut: { code: 'Space' },
  },
  {
    id: 'marker.create',
    label: 'Marquer la ligne ou le mot',
    shortcut: { code: 'Enter' },
  },
  {
    id: 'marker.undo',
    label: 'Annuler le dernier marqueur',
    shortcut: { code: 'KeyZ', control: true },
  },
  {
    id: 'player.seekBackward',
    label: 'Reculer de 100 ms',
    shortcut: { code: 'ArrowLeft' },
    repeat: true,
  },
  {
    id: 'player.seekForward',
    label: 'Avancer de 100 ms',
    shortcut: { code: 'ArrowRight' },
    repeat: true,
  },
  {
    id: 'marker.nudgeBackward',
    label: 'Décaler le marqueur de -10 ms',
    shortcut: { code: 'ArrowLeft', shift: true },
    repeat: true,
  },
  {
    id: 'marker.nudgeForward',
    label: 'Décaler le marqueur de +10 ms',
    shortcut: { code: 'ArrowRight', shift: true },
    repeat: true,
  },
  {
    id: 'player.slower',
    label: 'Ralentir',
    shortcut: { key: '-' },
  },
  {
    id: 'player.faster',
    label: 'Accélérer',
    shortcut: { key: '+' },
  },
]

const keyLabels: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: 'Entrée',
  Equal: '+',
  Minus: '−',
  Space: 'Espace',
}

export function formatShortcut(binding: ShortcutBinding): string[] {
  const keys: string[] = []

  if (binding.control) keys.push('Ctrl')
  if (binding.alt) keys.push('Alt')
  if (binding.shift) keys.push('Maj')

  const mainKey = binding.key ?? binding.code ?? ''

  keys.push(keyLabels[mainKey] ?? mainKey.replace(/^Key/, ''))

  return keys
}

function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutBinding): boolean {
  const mainKeyMatches = shortcut.key
    ? event.key === shortcut.key
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
) {
  function onKeyDown(event: KeyboardEvent) {
    if (!enabled() || isEditableTarget(event.target)) {
      return
    }

    const action = generatorActions.find((candidate) =>
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
