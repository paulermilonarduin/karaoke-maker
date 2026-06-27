<script setup lang="ts">
import KaraokeLogo from '../components/KaraokeLogo.vue'
import ShortcutEditor from '../components/ShortcutEditor.vue'
import { useGeneratorShortcutSettings } from '../generator/shortcuts'
import { localeOptions, useI18n, type Locale } from '../i18n'
import { defaultAccentColor } from '../theme/appearance'

const props = defineProps<{
  accentColor: string
  locale: Locale
}>()

const emit = defineEmits<{
  localeupdate: [locale: Locale]
  reset: []
  update: [color: string]
}>()

const presetColors = ['#7bd2bd', '#73a9ff', '#b794f4', '#ff7eb6', '#f0c77c']
const {
  actions: shortcutActions,
  hasCustomShortcuts,
  resetShortcuts,
  setShortcut,
} = useGeneratorShortcutSettings()
const { t } = useI18n()

function onColorInput(event: Event) {
  emit('update', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="settings-view">
    <div class="settings-view__header">
      <div>
        <p class="eyebrow">{{ t('settings.eyebrow') }}</p>
        <h2>{{ t('settings.appearance') }}</h2>
      </div>
      <p class="settings-view__summary">{{ t('settings.summary') }}</p>
    </div>

    <div class="settings-layout">
      <article class="settings-card">
        <div>
          <p class="eyebrow">{{ t('settings.theme') }}</p>
          <h3>{{ t('settings.accentTitle') }}</h3>
          <p class="settings-card__description">
            {{ t('settings.accentDescription') }}
          </p>
        </div>

        <label class="color-picker">
          <span class="color-picker__swatch" :style="{ backgroundColor: accentColor }"></span>
          <span>
            <strong>{{ t('settings.accentCustom') }}</strong>
            <code>{{ accentColor.toUpperCase() }}</code>
          </span>
          <input
            type="color"
            :aria-label="t('settings.accentColorAria')"
            :value="accentColor"
            @input="onColorInput"
          />
        </label>

        <div class="color-presets" :aria-label="t('settings.presetsAria')">
          <button
            v-for="color in presetColors"
            :key="color"
            class="color-preset"
            :class="{ 'is-active': accentColor.toLowerCase() === color }"
            type="button"
            :style="{ '--preset-color': color }"
            :aria-label="t('settings.chooseColor', { color })"
            @click="emit('update', color)"
          ></button>
        </div>

        <div class="language-picker">
          <div>
            <strong>{{ t('settings.languageTitle') }}</strong>
            <small>{{ t('settings.languageDescription') }}</small>
          </div>

          <div class="language-picker__options" :aria-label="t('settings.languageAria')">
            <button
              v-for="option in localeOptions"
              :key="option.value"
              class="language-option"
              :class="{ 'is-active': locale === option.value }"
              type="button"
              :aria-pressed="locale === option.value"
              :aria-label="
                t('settings.chooseLanguage', {
                  language: option.label,
                  country: option.countryLabel[locale],
                })
              "
              @click="emit('localeupdate', option.value)"
            >
              <span class="language-option__flag" aria-hidden="true">{{ option.flag }}</span>
              <span>
                <strong>{{ option.label }}</strong>
                <small>{{ option.countryLabel[locale] }}</small>
              </span>
            </button>
          </div>
        </div>

        <button
          class="button"
          type="button"
          :disabled="accentColor.toLowerCase() === defaultAccentColor"
          @click="emit('reset')"
        >
          {{ t('settings.resetColor') }}
        </button>
      </article>

      <article class="settings-preview">
        <p class="eyebrow">{{ t('settings.preview') }}</p>
        <KaraokeLogo animated size="medium" :progress="0" />
        <p>{{ t('settings.previewDescription') }}</p>
        <button class="button button--primary" type="button">{{ t('settings.previewButton') }}</button>
      </article>

      <ShortcutEditor
        class="settings-shortcuts"
        :actions="shortcutActions"
        :has-custom-shortcuts="hasCustomShortcuts"
        @reset="resetShortcuts"
        @update="setShortcut"
      />
    </div>
  </section>
</template>
