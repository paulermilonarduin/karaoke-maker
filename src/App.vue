<script setup lang="ts">
import { computed, ref } from 'vue'
import CatalogView from './views/CatalogView.vue'
import GeneratorView from './views/GeneratorView.vue'

type AppView = 'generator' | 'catalog'

const activeView = ref<AppView>('generator')

const currentView = computed(() => (activeView.value === 'generator' ? GeneratorView : CatalogView))
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Karaoke Maker</p>
        <h1>Créer et jouer des karaokés synchronisés</h1>
      </div>

      <nav class="view-switcher" aria-label="Navigation principale">
        <button
          type="button"
          :class="{ 'view-switcher__button--active': activeView === 'generator' }"
          class="view-switcher__button"
          @click="activeView = 'generator'"
        >
          Génération
        </button>
        <button
          type="button"
          :class="{ 'view-switcher__button--active': activeView === 'catalog' }"
          class="view-switcher__button"
          @click="activeView = 'catalog'"
        >
          Catalogue
        </button>
      </nav>
    </header>

    <component :is="currentView" />
  </main>
</template>
