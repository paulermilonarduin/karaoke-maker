import { ref } from 'vue'

const frMessages = {
  'app.navigation': 'Navigation principale',
  'app.openSettings': 'Ouvrir les paramètres',
  'nav.catalog': 'Catalogue',
  'nav.generator': 'Génération',
  'nav.settings': 'Paramètres',

  'audioPlayer.empty': 'Aucun MP3 chargé',
  'audioPlayer.pause': 'Mettre en pause',
  'audioPlayer.play': 'Lancer la lecture',
  'audioPlayer.seek': 'Position de lecture',
  'audioPlayer.volume': 'Volume',

  'audioWaveform.ariaLabel': 'Éditeur de waveform',
  'audioWaveform.empty': 'Chargez un MP3 pour afficher sa waveform.',
  'audioWaveform.loading': 'Analyse de la piste audio…',
  'audioWaveform.pause': 'Pause',
  'audioWaveform.play': 'Lecture',
  'audioWaveform.playbackError': 'Impossible de lancer la lecture.',
  'audioWaveform.playbackRate': 'Vitesse de lecture',
  'audioWaveform.seekBackward': '−1 s',
  'audioWaveform.seekForward': '+1 s',
  'audioWaveform.zoom': 'Zoom',

  'catalog.availableTracks': 'Titres disponibles',
  'catalog.count': '{count} titre(s)',
  'catalog.emptySearch': 'Aucun titre ne correspond à cette recherche.',
  'catalog.eyebrow': 'Catalogue',
  'catalog.format': 'MP3 + JSON',
  'catalog.playback': 'Lecture',
  'catalog.placeholder': 'Lancez la lecture pour démarrer le karaoké.',
  'catalog.searchLabel': 'Rechercher un titre',
  'catalog.searchPlaceholder': 'Rechercher…',
  'catalog.searchResults': '{count} / {total} titre(s)',
  'catalog.title': 'Musiques préparées',

  'file.empty': 'Aucun fichier sélectionné',

  'generator.audioLabel': 'Musique MP3',
  'generator.addBridge': 'Interlude',
  'generator.bridgeBlock': 'Interlude',
  'generator.complete': 'Toutes les paroles sont synchronisées.',
  'generator.error.export': 'Impossible de générer le fichier.',
  'generator.error.lineBounds': 'Le marqueur doit rester dans les limites de la ligne.',
  'generator.error.lineOrder':
    'Le marqueur doit être placé après celui de la ligne précédente.',
  'generator.error.missingAudio': 'Chargez une piste audio avant de placer des marqueurs.',
  'generator.error.wordOrder': 'Le marqueur doit être placé après celui du mot précédent.',
  'generator.exportJson': 'Exporter',
  'generator.lyricsLabel': 'Paroles brutes',
  'generator.mark': 'Marquer',
  'generator.markLine': 'Marquer la ligne',
  'generator.markBridge': 'Marquer l’interlude',
  'generator.markWord': 'Marquer le mot',
  'generator.newProjectTitle': 'Nouveau karaoké',
  'generator.nextWord': 'Prochain mot :',
  'generator.phaseLines': 'Synchronisation des lignes',
  'generator.phaseWords': 'Synchronisation des mots',
  'generator.progressBlocks': '{current} / {total} blocs',
  'generator.progressLines': '{current} / {total} lignes',
  'generator.progressWords': '{current} / {total} mots',
  'generator.undo': 'Annuler',

  'lyricsDisplay.ariaLabel': 'Aperçu karaoké',
  'lyricsDisplay.bridgeLabel': 'Interlude',
  'lyricsDisplay.enterFullscreen': 'Passer le lecteur en plein écran',
  'lyricsDisplay.exitFullscreen': 'Quitter le plein écran',
  'lyricsDisplay.placeholder': 'Chargez un MP3 et des paroles brutes pour démarrer.',

  'settings.accentColorAria': 'Couleur principale',
  'settings.accentCustom': 'Couleur personnalisée',
  'settings.accentDescription':
    'Utilisée pour le highlight, les contours, les contrôles actifs et la waveform.',
  'settings.accentTitle': 'Couleur principale',
  'settings.appearance': 'Apparence',
  'settings.chooseColor': 'Choisir la couleur {color}',
  'settings.chooseLanguage': 'Choisir {language} ({country})',
  'settings.eyebrow': 'Paramètres',
  'settings.languageAria': 'Langues disponibles',
  'settings.languageDescription': 'Change les libellés de l’interface.',
  'settings.languageTitle': 'Langue',
  'settings.preview': 'Aperçu',
  'settings.previewButton': 'Couleur principale',
  'settings.previewDescription':
    'Le changement est appliqué immédiatement dans toute l’application.',
  'settings.presetsAria': 'Couleurs suggérées',
  'settings.resetColor': 'Restaurer la couleur par défaut',
  'settings.summary': 'Une couleur pilote toute l’interface.',
  'settings.theme': 'Thème',

  'shortcut.action.markerCreate': 'Marquer la ligne ou le mot',
  'shortcut.action.markerBridge': 'Ajouter un interlude',
  'shortcut.action.markerNudgeBackward': 'Décaler le marqueur de -10 ms',
  'shortcut.action.markerNudgeForward': 'Décaler le marqueur de +10 ms',
  'shortcut.action.markerUndo': 'Annuler le dernier marqueur',
  'shortcut.action.playerFaster': 'Accélérer',
  'shortcut.action.playerSeekBackward': 'Reculer de 100 ms',
  'shortcut.action.playerSeekForward': 'Avancer de 100 ms',
  'shortcut.action.playerSlower': 'Ralentir',
  'shortcut.action.playerToggle': 'Lecture / pause',
  'shortcut.cancel': 'Annuler',
  'shortcut.captureHelp': 'Appuyez sur la combinaison souhaitée · Échap pour annuler',
  'shortcut.configure': 'Configurer',
  'shortcut.conflict': 'Déjà utilisé pour « {label} ».',
  'shortcut.configuredActions': '{count} actions configurées',
  'shortcut.descriptionExpanded':
    'Cliquez sur Modifier puis saisissez la nouvelle combinaison.',
  'shortcut.edit': 'Modifier',
  'shortcut.editAria': 'Modifier le raccourci : {label}',
  'shortcut.generatorAria': 'Raccourcis du générateur',
  'shortcut.hide': 'Masquer',
  'shortcut.metaUnsupported': 'La touche Windows ne peut pas être utilisée.',
  'shortcut.modifierOnly': 'Ajoutez une touche autre que Ctrl, Alt ou Maj.',
  'shortcut.reset': 'Réinitialiser',
  'shortcut.title': 'Raccourcis',
} as const

const enMessages: Record<keyof typeof frMessages, string> = {
  'app.navigation': 'Primary navigation',
  'app.openSettings': 'Open settings',
  'nav.catalog': 'Catalog',
  'nav.generator': 'Generator',
  'nav.settings': 'Settings',

  'audioPlayer.empty': 'No MP3 loaded',
  'audioPlayer.pause': 'Pause playback',
  'audioPlayer.play': 'Start playback',
  'audioPlayer.seek': 'Playback position',
  'audioPlayer.volume': 'Volume',

  'audioWaveform.ariaLabel': 'Waveform editor',
  'audioWaveform.empty': 'Load an MP3 to display its waveform.',
  'audioWaveform.loading': 'Analyzing the audio track…',
  'audioWaveform.pause': 'Pause',
  'audioWaveform.play': 'Play',
  'audioWaveform.playbackError': 'Unable to start playback.',
  'audioWaveform.playbackRate': 'Playback speed',
  'audioWaveform.seekBackward': '−1 s',
  'audioWaveform.seekForward': '+1 s',
  'audioWaveform.zoom': 'Zoom',

  'catalog.availableTracks': 'Available tracks',
  'catalog.count': '{count} track(s)',
  'catalog.emptySearch': 'No track matches this search.',
  'catalog.eyebrow': 'Catalog',
  'catalog.format': 'MP3 + JSON',
  'catalog.playback': 'Playback',
  'catalog.placeholder': 'Start playback to begin the karaoke.',
  'catalog.searchLabel': 'Search tracks',
  'catalog.searchPlaceholder': 'Search…',
  'catalog.searchResults': '{count} / {total} track(s)',
  'catalog.title': 'Prepared songs',

  'file.empty': 'No file selected',

  'generator.audioLabel': 'MP3 music',
  'generator.addBridge': 'Bridge',
  'generator.bridgeBlock': 'Bridge',
  'generator.complete': 'All lyrics are synchronized.',
  'generator.error.export': 'Unable to generate the file.',
  'generator.error.lineBounds': 'The marker must stay within the line bounds.',
  'generator.error.lineOrder': 'The marker must be placed after the previous line marker.',
  'generator.error.missingAudio': 'Load an audio track before placing markers.',
  'generator.error.wordOrder': 'The marker must be placed after the previous word marker.',
  'generator.exportJson': 'Export',
  'generator.lyricsLabel': 'Raw lyrics',
  'generator.mark': 'Mark',
  'generator.markLine': 'Mark line',
  'generator.markBridge': 'Mark bridge',
  'generator.markWord': 'Mark word',
  'generator.newProjectTitle': 'New karaoke',
  'generator.nextWord': 'Next word:',
  'generator.phaseLines': 'Line synchronization',
  'generator.phaseWords': 'Word synchronization',
  'generator.progressBlocks': '{current} / {total} blocks',
  'generator.progressLines': '{current} / {total} lines',
  'generator.progressWords': '{current} / {total} words',
  'generator.undo': 'Undo',

  'lyricsDisplay.ariaLabel': 'Karaoke preview',
  'lyricsDisplay.bridgeLabel': 'Bridge',
  'lyricsDisplay.enterFullscreen': 'Enter player fullscreen',
  'lyricsDisplay.exitFullscreen': 'Exit fullscreen',
  'lyricsDisplay.placeholder': 'Load an MP3 and raw lyrics to get started.',

  'settings.accentColorAria': 'Primary color',
  'settings.accentCustom': 'Custom color',
  'settings.accentDescription':
    'Used for highlight, borders, active controls, and the waveform.',
  'settings.accentTitle': 'Primary color',
  'settings.appearance': 'Appearance',
  'settings.chooseColor': 'Choose color {color}',
  'settings.chooseLanguage': 'Choose {language} ({country})',
  'settings.eyebrow': 'Settings',
  'settings.languageAria': 'Available languages',
  'settings.languageDescription': 'Changes the interface labels.',
  'settings.languageTitle': 'Language',
  'settings.preview': 'Preview',
  'settings.previewButton': 'Primary color',
  'settings.previewDescription': 'Changes are applied immediately across the app.',
  'settings.presetsAria': 'Suggested colors',
  'settings.resetColor': 'Restore default color',
  'settings.summary': 'One color drives the whole interface.',
  'settings.theme': 'Theme',

  'shortcut.action.markerCreate': 'Mark line or word',
  'shortcut.action.markerBridge': 'Add bridge',
  'shortcut.action.markerNudgeBackward': 'Nudge marker by -10 ms',
  'shortcut.action.markerNudgeForward': 'Nudge marker by +10 ms',
  'shortcut.action.markerUndo': 'Undo last marker',
  'shortcut.action.playerFaster': 'Speed up',
  'shortcut.action.playerSeekBackward': 'Seek back 100 ms',
  'shortcut.action.playerSeekForward': 'Seek forward 100 ms',
  'shortcut.action.playerSlower': 'Slow down',
  'shortcut.action.playerToggle': 'Play / pause',
  'shortcut.cancel': 'Cancel',
  'shortcut.captureHelp': 'Press the desired combination · Escape to cancel',
  'shortcut.configure': 'Configure',
  'shortcut.conflict': 'Already used for “{label}”.',
  'shortcut.configuredActions': '{count} configured actions',
  'shortcut.descriptionExpanded': 'Click Edit, then press the new combination.',
  'shortcut.edit': 'Edit',
  'shortcut.editAria': 'Edit shortcut: {label}',
  'shortcut.generatorAria': 'Generator shortcuts',
  'shortcut.hide': 'Hide',
  'shortcut.metaUnsupported': 'The Windows key cannot be used.',
  'shortcut.modifierOnly': 'Add a key other than Ctrl, Alt, or Shift.',
  'shortcut.reset': 'Reset',
  'shortcut.title': 'Shortcuts',
}

export type Locale = 'fr' | 'en-US'
export type TranslationKey = keyof typeof frMessages

export const localeOptions: {
  value: Locale
  label: string
  flag: string
  countryLabel: Record<Locale, string>
}[] = [
  {
    value: 'fr',
    label: 'Français',
    flag: '🇫🇷',
    countryLabel: {
      fr: 'France',
      'en-US': 'France',
    },
  },
  {
    value: 'en-US',
    label: 'English',
    flag: '🇺🇸',
    countryLabel: {
      fr: 'États-Unis',
      'en-US': 'United States',
    },
  },
]

const localeStorageKey = 'karaoke-maker.locale.v1'
const defaultLocale: Locale = 'fr'
const messages: Record<Locale, Record<TranslationKey, string>> = {
  fr: frMessages,
  'en-US': enMessages,
}

function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en-US'
}

function normalizeStoredLocale(value: unknown): Locale | undefined {
  if (value === 'en') {
    return 'en-US'
  }

  return isLocale(value) ? value : undefined
}

function loadLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const storedLocale = window.localStorage.getItem(localeStorageKey)

  return normalizeStoredLocale(storedLocale) ?? defaultLocale
}

function applyDocumentLocale(value: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = value
  }
}

const locale = ref<Locale>(loadLocale())
applyDocumentLocale(locale.value)

export function setLocale(value: Locale) {
  locale.value = value
  applyDocumentLocale(value)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(localeStorageKey, value)
  }
}

export function t(
  key: TranslationKey,
  params: Record<string, string | number> = {},
): string {
  const template = messages[locale.value][key] ?? messages[defaultLocale][key] ?? key

  return template.replace(/\{(\w+)\}/g, (match, paramKey) =>
    params[paramKey] === undefined ? match : String(params[paramKey]),
  )
}

export function useI18n() {
  return {
    locale,
    localeOptions,
    setLocale,
    t,
  }
}
