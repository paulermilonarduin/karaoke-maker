<script setup lang="ts">
import { useI18n } from '../i18n'

defineProps<{
  accept: string
  label: string
  value?: string
}>()

const emit = defineEmits<{
  change: [file: File]
}>()

const { t } = useI18n()

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
    <span class="file-field__value">{{ value || t('file.empty') }}</span>
    <input class="file-field__input" type="file" :accept="accept" @change="onChange" />
  </label>
</template>
