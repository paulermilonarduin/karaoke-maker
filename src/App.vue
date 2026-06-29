<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import KaraokeLogo from './components/KaraokeLogo.vue'
import { useI18n } from './i18n'
import { useAppearanceSettings } from './theme/appearance'
import CatalogView from './views/CatalogView.vue'
import GeneratorView from './views/GeneratorView.vue'
import HomeView from './views/HomeView.vue'
import SettingsView from './views/SettingsView.vue'

type AppView = 'home' | 'generator' | 'catalog'

const activeView = ref<AppView>('home')
const settingsOpen = ref(false)
const settingsButton = ref<HTMLButtonElement>()
const settingsCloseButton = ref<HTMLButtonElement>()
const settingsDialog = ref<HTMLElement>()
let previousBodyOverflow = ''
const { accentColor, resetAccentColor, setAccentColor } = useAppearanceSettings()
const { locale, setLocale, t } = useI18n()

function openSettings() {
  settingsOpen.value = true
}

function closeSettings() {
  settingsOpen.value = false
  void nextTick(() => settingsButton.value?.focus())
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!settingsOpen.value) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    closeSettings()
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const focusableElements = Array.from(
    settingsDialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.hasAttribute('hidden'))
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (!firstElement || !lastElement) {
    event.preventDefault()
    return
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

watch(settingsOpen, async (isOpen) => {
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    settingsCloseButton.value?.focus()
    return
  }

  document.body.style.overflow = previousBodyOverflow
})

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <main class="app-shell" :class="`app-shell--${activeView}`">
    <header class="app-header">
      <h1 class="app-brand__title">
        <button
          class="app-brand"
          type="button"
          :aria-label="t('app.backHome')"
          @click="activeView = 'home'"
        >
          <KaraokeLogo size="large" :progress="65" />
        </button>
      </h1>

      <div class="app-header__actions">
        <button
          ref="settingsButton"
          class="settings-button"
          :class="{ 'settings-button--active': settingsOpen }"
          type="button"
          :aria-label="t('app.openSettings')"
          :aria-expanded="settingsOpen"
          :title="t('nav.settings')"
          @click="openSettings"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M19.14 12.94a7.6 7.6 0 0 0 .05-.94 7.6 7.6 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.3 7.3 0 0 0-1.62-.94L14.88 3h-3.84l-.36 3.18a7.3 7.3 0 0 0-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58a7.6 7.6 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.39 1.04.7 1.62.94l.36 3.18h3.84l.36-3.18a7.3 7.3 0 0 0 1.62-.94l2.39.96 1.92-3.32-2.03-1.58ZM12.96 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
            />
          </svg>
        </button>
      </div>
    </header>

    <HomeView
      v-if="activeView === 'home'"
      @open-generator="activeView = 'generator'"
      @open-catalog="activeView = 'catalog'"
    />
    <GeneratorView v-show="activeView === 'generator'" :accent-color="accentColor" />
    <CatalogView v-if="activeView === 'catalog'" />
  </main>

  <Teleport to="body">
    <div v-if="settingsOpen" class="settings-modal" @mousedown.self="closeSettings">
      <section
        ref="settingsDialog"
        class="settings-modal__dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('nav.settings')"
      >
        <button
          ref="settingsCloseButton"
          class="settings-modal__close"
          type="button"
          :aria-label="t('app.closeSettings')"
          @click="closeSettings"
        >
          ×
        </button>
        <SettingsView
          :accent-color="accentColor"
          :locale="locale"
          @reset="resetAccentColor"
          @localeupdate="setLocale"
          @update="setAccentColor"
        />
      </section>
    </div>
  </Teleport>
</template>
