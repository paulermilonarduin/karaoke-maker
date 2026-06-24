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
  'generator.addInterlude': 'Interlude',
  'generator.centerPlayhead': 'Centrer lecture',
  'generator.deleteSegmentSplit': 'Supprimer la découpe',
  'generator.interludeBlock': 'Interlude',
  'generator.error.export': 'Impossible de générer le fichier.',
  'generator.error.missingAudio': 'Chargez une piste audio avant de modifier la timeline.',
  'generator.exportJson': 'Exporter',
  'generator.lyricsLabel': 'Paroles brutes',
  'generator.mergeNextSegment': 'Fusionner après',
  'generator.mergePreviousSegment': 'Fusionner avant',
  'generator.newProjectTitle': 'Nouveau karaoké',
  'generator.redo': 'Rétablir',
  'generator.playhead': 'Tête de lecture',
  'generator.segmentGap': 'Pause de {duration}',
  'generator.selectedBlock': 'Bloc sélectionné',
  'generator.splitSegment': 'Segmenter au curseur',
  'generator.timelineEmpty': 'Chargez un MP3 et des paroles pour générer la timeline.',
  'generator.timelineHelp':
    'Cliquez un bloc pour le focus, déplacez-le ou redimensionnez ses bords. Les segments se découpent au curseur.',
  'generator.timelineNoLineSelected': 'Sélectionnez une ligne avant de segmenter.',
  'generator.timelineSplitBoundary': 'Placez le curseur à l’intérieur d’un segment.',
  'generator.timelineSplitText': 'Texte de la ligne sélectionnée',
  'generator.timelineSplitTooShort': 'Le segment est trop court pour être découpé.',
  'generator.timelineSummary': '{count} blocs · {duration}',
  'generator.timelineTitle': 'Timeline des lignes',
  'generator.timelineZoom': 'Zoom timeline',
  'generator.undo': 'Annuler',
  'generator.zoomIn': '+',
  'generator.zoomOut': '−',

  'lyricsDisplay.ariaLabel': 'Aperçu karaoké',
  'lyricsDisplay.interludeLabel': 'Interlude',
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

  'shortcut.action.playerFaster': 'Accélérer',
  'shortcut.action.playerSeekBackward': 'Reculer de 100 ms',
  'shortcut.action.playerSeekForward': 'Avancer de 100 ms',
  'shortcut.action.playerSlower': 'Ralentir',
  'shortcut.action.playerToggle': 'Lecture / pause',
  'shortcut.action.timelineAddInterlude': 'Ajouter un interlude',
  'shortcut.action.timelineNudgeBackward': 'Décaler le bloc de -100 ms',
  'shortcut.action.timelineNudgeForward': 'Décaler le bloc de +100 ms',
  'shortcut.action.timelineRedo': 'Rétablir la dernière action',
  'shortcut.action.timelineSplitSegment': 'Segmenter au curseur',
  'shortcut.action.timelineUndo': 'Annuler la dernière action',
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
  'generator.addInterlude': 'Interlude',
  'generator.centerPlayhead': 'Center playback',
  'generator.deleteSegmentSplit': 'Remove split',
  'generator.interludeBlock': 'Interlude',
  'generator.error.export': 'Unable to generate the file.',
  'generator.error.missingAudio': 'Load an audio track before editing the timeline.',
  'generator.exportJson': 'Export',
  'generator.lyricsLabel': 'Raw lyrics',
  'generator.mergeNextSegment': 'Merge next',
  'generator.mergePreviousSegment': 'Merge previous',
  'generator.newProjectTitle': 'New karaoke',
  'generator.redo': 'Redo',
  'generator.playhead': 'Playhead',
  'generator.segmentGap': '{duration} pause',
  'generator.selectedBlock': 'Selected block',
  'generator.splitSegment': 'Split at cursor',
  'generator.timelineEmpty': 'Load an MP3 and lyrics to generate the timeline.',
  'generator.timelineHelp':
    'Click a block to focus it, then move it or resize its edges. Split segments at the cursor.',
  'generator.timelineNoLineSelected': 'Select a line before splitting.',
  'generator.timelineSplitBoundary': 'Place the cursor inside a segment.',
  'generator.timelineSplitText': 'Selected line text',
  'generator.timelineSplitTooShort': 'This segment is too short to split.',
  'generator.timelineSummary': '{count} blocks · {duration}',
  'generator.timelineTitle': 'Line timeline',
  'generator.timelineZoom': 'Timeline zoom',
  'generator.undo': 'Undo',
  'generator.zoomIn': '+',
  'generator.zoomOut': '−',

  'lyricsDisplay.ariaLabel': 'Karaoke preview',
  'lyricsDisplay.interludeLabel': 'Interlude',
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

  'shortcut.action.playerFaster': 'Speed up',
  'shortcut.action.playerSeekBackward': 'Seek back 100 ms',
  'shortcut.action.playerSeekForward': 'Seek forward 100 ms',
  'shortcut.action.playerSlower': 'Slow down',
  'shortcut.action.playerToggle': 'Play / pause',
  'shortcut.action.timelineAddInterlude': 'Add interlude',
  'shortcut.action.timelineNudgeBackward': 'Nudge block by -100 ms',
  'shortcut.action.timelineNudgeForward': 'Nudge block by +100 ms',
  'shortcut.action.timelineRedo': 'Redo last action',
  'shortcut.action.timelineSplitSegment': 'Split at cursor',
  'shortcut.action.timelineUndo': 'Undo last action',
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

function loadLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const storedLocale = window.localStorage.getItem(localeStorageKey)

  return isLocale(storedLocale) ? storedLocale : defaultLocale
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
