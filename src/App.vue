<script setup lang="ts">
import { ref } from 'vue'
import KaraokeLogo from './components/KaraokeLogo.vue'
import { useI18n } from './i18n'
import { useAppearanceSettings } from './theme/appearance'
import CatalogView from './views/CatalogView.vue'
import GeneratorView from './views/GeneratorView.vue'
import SettingsView from './views/SettingsView.vue'

type AppView = 'generator' | 'catalog' | 'settings'

const activeView = ref<AppView>('generator')
const { accentColor, resetAccentColor, setAccentColor } = useAppearanceSettings()
const { locale, setLocale, t } = useI18n()
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div class="app-brand">
        <h1 class="app-brand__title">
          <KaraokeLogo size="large" :progress="65" />
        </h1>
      </div>

      <div class="app-header__actions">
        <nav class="view-switcher" :aria-label="t('app.navigation')">
          <button
            type="button"
            :class="{ 'view-switcher__button--active': activeView === 'generator' }"
            class="view-switcher__button"
            @click="activeView = 'generator'"
          >
            {{ t('nav.generator') }}
          </button>
          <button
            type="button"
            :class="{ 'view-switcher__button--active': activeView === 'catalog' }"
            class="view-switcher__button"
            @click="activeView = 'catalog'"
          >
            {{ t('nav.catalog') }}
          </button>
        </nav>

        <button
          class="settings-button"
          :class="{ 'settings-button--active': activeView === 'settings' }"
          type="button"
          :aria-label="t('app.openSettings')"
          :title="t('nav.settings')"
          @click="activeView = 'settings'"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M19.14 12.94a7.6 7.6 0 0 0 .05-.94 7.6 7.6 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.3 7.3 0 0 0-1.62-.94L14.88 3h-3.84l-.36 3.18a7.3 7.3 0 0 0-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58a7.6 7.6 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.39 1.04.7 1.62.94l.36 3.18h3.84l.36-3.18a7.3 7.3 0 0 0 1.62-.94l2.39.96 1.92-3.32-2.03-1.58ZM12.96 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
            />
          </svg>
        </button>
      </div>
    </header>

    <GeneratorView v-if="activeView === 'generator'" :accent-color="accentColor" />
    <CatalogView v-else-if="activeView === 'catalog'" />
    <SettingsView
      v-else
      :accent-color="accentColor"
      :locale="locale"
      @reset="resetAccentColor"
      @localeupdate="setLocale"
      @update="setAccentColor"
    />
  </main>
</template>
