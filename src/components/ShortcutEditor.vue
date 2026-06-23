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
import { useI18n } from '../i18n'

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
const isExpanded = ref(false)
const { locale, t } = useI18n()

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

function toggleExpanded() {
  if (isExpanded.value) {
    stopCapture()
  }

  isExpanded.value = !isExpanded.value
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
      ? t('shortcut.metaUnsupported')
      : t('shortcut.modifierOnly')
    return
  }

  const conflictingAction = props.actions.find(
    (action) => action.id !== actionId && shortcutsEqual(action.shortcut, shortcut),
  )

  if (conflictingAction) {
    captureError.value = t('shortcut.conflict', {
      label: t(conflictingAction.labelKey),
    })
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
  <aside class="shortcut-panel" :aria-label="t('shortcut.generatorAria')">
    <div class="shortcut-panel__header">
      <div>
        <p class="eyebrow">{{ t('shortcut.title') }}</p>
        <p class="shortcut-panel__description">
          {{
            isExpanded
              ? t('shortcut.descriptionExpanded')
              : t('shortcut.configuredActions', { count: actions.length })
          }}
        </p>
      </div>
      <div class="shortcut-panel__actions">
        <button
          v-if="isExpanded"
          class="shortcut-panel__reset"
          type="button"
          :disabled="!hasCustomShortcuts"
          @click="emit('reset')"
        >
          {{ t('shortcut.reset') }}
        </button>
        <button
          class="shortcut-panel__toggle"
          type="button"
          :aria-expanded="isExpanded"
          @click="toggleExpanded"
        >
          {{ isExpanded ? t('shortcut.hide') : t('shortcut.configure') }}
        </button>
      </div>
    </div>

    <dl v-if="isExpanded" class="shortcut-list">
      <div
        v-for="action in actions"
        :key="action.id"
        class="shortcut-list__item"
        :class="{ 'is-capturing': capturedActionId === action.id }"
      >
        <dt>{{ t(action.labelKey) }}</dt>
        <dd>
          <span class="shortcut-list__keys">
            <template
              v-for="(key, index) in formatShortcut(action.shortcut, locale)"
              :key="key"
            >
              <span v-if="index > 0" aria-hidden="true">+</span>
              <kbd>{{ key }}</kbd>
            </template>
          </span>
          <button
            class="shortcut-list__edit"
            type="button"
            :aria-label="t('shortcut.editAria', { label: t(action.labelKey) })"
            @click="
              capturedActionId === action.id ? stopCapture() : startCapture(action.id)
            "
          >
            {{ capturedActionId === action.id ? t('shortcut.cancel') : t('shortcut.edit') }}
          </button>
        </dd>
      </div>
    </dl>

    <p v-if="isExpanded && capturedActionId" class="shortcut-panel__capture" role="status">
      {{ t('shortcut.captureHelp') }}
    </p>
    <p v-if="isExpanded && captureError" class="shortcut-panel__error" role="alert">
      {{ captureError }}
    </p>
  </aside>
</template>
