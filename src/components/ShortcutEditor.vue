<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  formatShortcut,
  shortcutFromKeyboardEvent,
  shortcutsEqual,
  type GeneratorActionDefinition,
  type GeneratorActionId,
  type ShortcutBinding,
} from '../generator/shortcuts'

const props = defineProps<{
  actions: GeneratorActionDefinition[]
  hasCustomShortcuts: boolean
}>()

const emit = defineEmits<{
  capturechange: [isCapturing: boolean]
  reset: []
  update: [actionId: GeneratorActionId, shortcut: ShortcutBinding]
}>()

const capturedActionId = ref<GeneratorActionId>()
const captureError = ref<string>()

function stopCapture() {
  capturedActionId.value = undefined
  captureError.value = undefined
  emit('capturechange', false)
}

function startCapture(actionId: GeneratorActionId) {
  capturedActionId.value = actionId
  captureError.value = undefined
  emit('capturechange', true)
}

function onKeyDown(event: KeyboardEvent) {
  const actionId = capturedActionId.value

  if (!actionId) {
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  if (event.key === 'Escape') {
    stopCapture()
    return
  }

  const shortcut = shortcutFromKeyboardEvent(event)

  if (!shortcut) {
    captureError.value = event.metaKey
      ? 'La touche Windows ne peut pas être utilisée.'
      : 'Ajoutez une touche autre que Ctrl, Alt ou Maj.'
    return
  }

  const conflictingAction = props.actions.find(
    (action) => action.id !== actionId && shortcutsEqual(action.shortcut, shortcut),
  )

  if (conflictingAction) {
    captureError.value = `Déjà utilisé pour « ${conflictingAction.label} ».`
    return
  }

  emit('update', actionId, shortcut)
  stopCapture()

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown, true))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  emit('capturechange', false)
})
</script>

<template>
  <aside class="shortcut-panel" aria-label="Raccourcis du générateur">
    <div class="shortcut-panel__header">
      <div>
        <p class="eyebrow">Raccourcis</p>
        <p class="shortcut-panel__description">
          Cliquez sur Modifier puis saisissez la nouvelle combinaison.
        </p>
      </div>
      <button
        class="shortcut-panel__reset"
        type="button"
        :disabled="!hasCustomShortcuts"
        @click="emit('reset')"
      >
        Réinitialiser
      </button>
    </div>

    <dl class="shortcut-list">
      <div
        v-for="action in actions"
        :key="action.id"
        class="shortcut-list__item"
        :class="{ 'is-capturing': capturedActionId === action.id }"
      >
        <dt>{{ action.label }}</dt>
        <dd>
          <span class="shortcut-list__keys">
            <template v-for="(key, index) in formatShortcut(action.shortcut)" :key="key">
              <span v-if="index > 0" aria-hidden="true">+</span>
              <kbd>{{ key }}</kbd>
            </template>
          </span>
          <button
            class="shortcut-list__edit"
            type="button"
            :aria-label="`Modifier le raccourci : ${action.label}`"
            @click="
              capturedActionId === action.id ? stopCapture() : startCapture(action.id)
            "
          >
            {{ capturedActionId === action.id ? 'Annuler' : 'Modifier' }}
          </button>
        </dd>
      </div>
    </dl>

    <p v-if="capturedActionId" class="shortcut-panel__capture" role="status">
      Appuyez sur la combinaison souhaitée · Échap pour annuler
    </p>
    <p v-if="captureError" class="shortcut-panel__error" role="alert">
      {{ captureError }}
    </p>
  </aside>
</template>
