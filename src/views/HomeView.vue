<script setup lang="ts">
import { useI18n } from '../i18n'

const emit = defineEmits<{
  openGenerator: []
  openCatalog: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="home-view" :aria-labelledby="'home-title'">
    <div class="home-view__intro">
      <p class="eyebrow">{{ t('home.eyebrow') }}</p>
      <h2 id="home-title">{{ t('home.title') }}</h2>
      <p>{{ t('home.description') }}</p>
    </div>

    <div class="home-actions">
      <button class="home-action" type="button" @click="emit('openGenerator')">
        <span class="home-action__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3v12.2a4 4 0 1 1-2-3.46V6.5l9-2V13.2a4 4 0 1 1-2-3.46V3.52L12 4.63V3Z" />
          </svg>
        </span>
        <span class="home-action__content">
          <strong>{{ t('home.createTitle') }}</strong>
          <span>{{ t('home.createDescription') }}</span>
        </span>
        <span class="home-action__arrow" aria-hidden="true">→</span>
      </button>

      <button class="home-action" type="button" @click="emit('openCatalog')">
        <span class="home-action__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 3v10l8-5-8-5Z" />
          </svg>
        </span>
        <span class="home-action__content">
          <strong>{{ t('home.catalogTitle') }}</strong>
          <span>{{ t('home.catalogDescription') }}</span>
        </span>
        <span class="home-action__arrow" aria-hidden="true">→</span>
      </button>
    </div>
  </section>
</template>
