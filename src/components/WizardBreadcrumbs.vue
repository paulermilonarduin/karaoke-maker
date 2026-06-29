<script setup lang="ts">
import { useI18n } from '../i18n'

export type WizardProgressStep = 'audio' | 'lyrics' | 'sync' | 'editor'

const props = defineProps<{
  current: WizardProgressStep
  locked?: boolean
}>()

const emit = defineEmits<{
  navigate: [step: WizardProgressStep]
}>()

const { t } = useI18n()
const steps: Array<{ id: WizardProgressStep; labelKey: 'wizard.stepAudio' | 'wizard.stepLyrics' | 'wizard.stepSync' | 'wizard.stepEditor' }> = [
  { id: 'audio', labelKey: 'wizard.stepAudio' },
  { id: 'lyrics', labelKey: 'wizard.stepLyrics' },
  { id: 'sync', labelKey: 'wizard.stepSync' },
  { id: 'editor', labelKey: 'wizard.stepEditor' },
]

function stepIndex(step: WizardProgressStep): number {
  return steps.findIndex((candidate) => candidate.id === step)
}

function canNavigate(step: WizardProgressStep): boolean {
  return !props.locked && stepIndex(step) < stepIndex(props.current)
}
</script>

<template>
  <nav :aria-label="t('wizard.progress')">
    <ol class="wizard-steps">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="wizard-steps__item"
        :class="{
          'wizard-steps__item--active': step.id === current,
          'wizard-steps__item--done': stepIndex(step.id) < stepIndex(current),
        }"
        :aria-current="step.id === current ? 'step' : undefined"
      >
        <button
          v-if="canNavigate(step.id)"
          type="button"
          @click="emit('navigate', step.id)"
        >
          <span aria-hidden="true">✓</span>
          {{ t(step.labelKey) }}
        </button>
        <span v-else class="wizard-steps__label">
          <span aria-hidden="true">{{ stepIndex(step.id) < stepIndex(current) ? '✓' : index + 1 }}</span>
          {{ t(step.labelKey) }}
        </span>
      </li>
    </ol>
  </nav>
</template>
