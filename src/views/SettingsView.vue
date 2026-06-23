<script setup lang="ts">
import KaraokeLogo from '../components/KaraokeLogo.vue'
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
const { t } = useI18n()

function onColorInput(event: Event) {
  emit('update', (event.target as HTMLInputElement).value)
}

function onLocaleChange(event: Event) {
  emit('localeupdate', (event.target as HTMLSelectElement).value as Locale)
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

        <label class="language-picker">
          <span>
            <strong>{{ t('settings.languageTitle') }}</strong>
            <small>{{ t('settings.languageDescription') }}</small>
          </span>
          <select :value="locale" @change="onLocaleChange">
            <option
              v-for="option in localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

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
        <KaraokeLogo size="medium" :progress="65" />
        <p>{{ t('settings.previewDescription') }}</p>
        <button class="button button--primary" type="button">{{ t('settings.previewButton') }}</button>
      </article>
    </div>
  </section>
</template>
