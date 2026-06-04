<script setup lang="ts">
defineProps<{
  accept: string
  label: string
  value?: string
}>()

const emit = defineEmits<{
  change: [file: File]
}>()

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    emit('change', file)
  }
}
</script>

<template>
  <label class="file-field">
    <span class="file-field__label">{{ label }}</span>
    <span class="file-field__value">{{ value || 'Aucun fichier sélectionné' }}</span>
    <input class="file-field__input" type="file" :accept="accept" @change="onChange" />
  </label>
</template>
