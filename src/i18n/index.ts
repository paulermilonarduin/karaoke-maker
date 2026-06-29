import { ref } from 'vue'

const frMessages = {
  'app.navigation': 'Navigation principale',
  'app.backHome': 'Retourner à l’accueil',
  'app.closeSettings': 'Fermer les paramètres',
  'app.openSettings': 'Ouvrir les paramètres',
  'nav.catalog': 'Catalogue',
  'nav.generator': 'Génération',
  'nav.settings': 'Paramètres',

  'home.eyebrow': 'Karaoke Maker',
  'home.title': 'Que voulez-vous faire ?',
  'home.description': 'Créez un nouveau karaoké ou lancez un titre de votre catalogue.',
  'home.createTitle': 'Créer un karaoké',
  'home.createDescription': 'Importez un morceau, ajoutez les paroles et synchronisez-les.',
  'home.catalogTitle': 'Ouvrir le catalogue',
  'home.catalogDescription': 'Retrouvez vos titres préparés et lancez la lecture.',

  'wizard.eyebrow': 'Création',
  'wizard.startTitle': 'Démarrer un projet',
  'wizard.startDescription': 'Reprenez un projet sauvegardé ou commencez une nouvelle synchronisation.',
  'wizard.newProject': 'Nouveau projet',
  'wizard.newProjectDescription': 'Partir d’un MP3 et de ses paroles.',
  'wizard.openProject': 'Ouvrir un projet',
  'wizard.openProjectDescription': 'Continuer un projet sauvegardé précédemment.',
  'wizard.progress': 'Étapes de création',
  'wizard.stepProject': 'Projet',
  'wizard.stepAudio': 'Musique',
  'wizard.stepLyrics': 'Paroles',
  'wizard.stepSync': 'Synchronisation',
  'wizard.stepEditor': 'Édition',
  'wizard.openTitle': 'Choisissez un projet',
  'wizard.openDescription': 'Les projets sauvegardés conservent le MP3, les paroles et la timeline.',
  'wizard.importJsonTitle': 'Importer un ancien fichier',
  'wizard.importJsonDescription':
    'Vous pouvez aussi ouvrir un JSON karaoké, puis sélectionner le MP3 correspondant.',
  'wizard.back': 'Retour',
  'wizard.audioTitle': 'Sélectionnez la musique',
  'wizard.audioDescription':
    'Choisissez le MP3 à synchroniser. Il sera conservé dans la sauvegarde du projet.',
  'wizard.audioReady': 'Musique prête',
  'wizard.confirmAndContinue': 'Confirmer et continuer',
  'wizard.lyricsTitle': 'Ajoutez les paroles',
  'wizard.lyricsDescription':
    'Collez les paroles, importez un fichier texte ou utilisez la recherche en ligne.',
  'wizard.songTitle': 'Titre',
  'wizard.artist': 'Artiste',
  'wizard.pasteLyrics': 'Paroles',
  'wizard.pasteLyricsPlaceholder': 'Une ligne de paroles par ligne…',
  'wizard.lyricsReady': 'Paroles prêtes',
  'wizard.lyricsLineCount': '{count} lignes seront ajoutées à la timeline.',
  'wizard.syncTitle': 'Synchronisez les paroles',
  'wizard.syncDescription':
    'Lancez la synchronisation assistée ou continuez directement vers l’édition manuelle.',
  'wizard.syncDoneDescription':
    'Le résultat est prêt. Vous pourrez toujours ajuster chaque bloc dans l’éditeur.',
  'wizard.syncUnavailableTitle': 'Synchronisation assistée indisponible',
  'wizard.syncUnavailableDescription':
    'Cette fonctionnalité nécessite l’application Electron lancée avec le module d’alignement. Vous pouvez continuer manuellement.',
  'wizard.continueManually': 'Continuer manuellement',
  'wizard.openEditor': 'Ouvrir l’éditeur',
  'wizard.editSetup': 'Modifier les sources',
  'wizard.audioRequired': 'Sélectionnez un MP3 avant de continuer.',
  'wizard.lyricsRequired': 'Ajoutez des paroles avant de continuer.',
  'wizard.confirmDiscardSetup':
    'Quitter cette étape ? Les fichiers sélectionnés pour ce nouveau projet seront retirés.',
  'wizard.confirmReplaceAudio':
    'Remplacer le MP3 actuel ? La timeline pourra devoir être ajustée à la nouvelle durée.',
  'wizard.confirmReplaceLyrics':
    'Remplacer les paroles actuelles ? Les découpes et timings associés seront réinitialisés.',
  'wizard.confirmBackFromEditor':
    'Revenir aux paroles ? Les timings restent conservés tant que vous ne modifiez pas le texte.',
  'wizard.confirmBackToAudioFromEditor':
    'Revenir au choix du MP3 ? Le projet actuel reste conservé tant que vous ne remplacez pas le fichier.',

  'project.loading': 'Chargement des projets…',
  'project.empty': 'Aucun projet sauvegardé pour le moment.',
  'project.save': 'Sauvegarder le projet',
  'project.saving': 'Sauvegarde…',
  'project.saved': 'Projet sauvegardé',
  'project.retrySave': 'Réessayer la sauvegarde',
  'project.error.list': 'Impossible de charger les projets sauvegardés.',
  'project.error.open': 'Impossible d’ouvrir ce projet.',
  'project.error.save': 'Impossible de sauvegarder ce projet.',
  'project.error.missingAudio': 'Le MP3 est nécessaire pour sauvegarder le projet.',

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

  'align.progress.aligningWords': 'Alignement des mots…',
  'align.progress.asrSegments': '{count} segments repérés par transcription.',
  'align.progress.done': 'Synchronisation terminée.',
  'align.progress.loadingAlignmentModel': 'Chargement du modèle d’alignement ({model})…',
  'align.progress.loadingAudio': 'Chargement de l’audio…',
  'align.progress.loadingDefaultAlignmentModel':
    'Chargement du modèle d’alignement par défaut ({language})…',
  'align.progress.separatingVocals': 'Séparation des voix avec Demucs ({model})…',
  'align.progress.transcribing': 'Analyse vocale pour créer des repères ({model}, {device})…',
  'align.progress.vocalsIsolated': 'Voix isolées.',
  'align.progress.wordCountMismatch':
    'Nombre de mots différent ({expected} attendus, {aligned} alignés), recalage par similarité.',
  'align.progress.wrote': 'Résultat écrit dans {path}.',

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
  'generator.addInterludeAfter': 'Interlude après',
  'generator.addInterludeBefore': 'Interlude avant',
  'generator.addToCatalog': 'Ajouter au catalogue',
  'generator.autoApplied': 'Synchronisation assistée appliquée — ajustez ou exportez.',
  'generator.autoError': 'La synchronisation assistée a échoué : {message}',
  'generator.autoFailed': 'La synchronisation assistée a échoué.',
  'generator.autoHide': 'Terminé',
  'generator.autoHint': 'Vous pourrez ajuster le résultat sur la timeline avant l’export.',
  'generator.autoLanguage': 'Langue des paroles',
  'generator.autoNo': 'Non, à la main',
  'generator.autoNoWords': 'Chargez des paroles avant de lancer la synchronisation assistée.',
  'generator.autoQuestion': 'Synchroniser les paroles automatiquement à partir de l’audio ?',
  'generator.autoRedo': 'Relancer la synchronisation',
  'generator.autoRetry': 'Réessayer',
  'generator.autoStarting': 'Préparation de la synchronisation assistée…',
  'generator.autoTitle': 'Synchronisation assistée',
  'generator.autoYes': 'Oui, synchroniser',
  'generator.centerPlayhead': 'Centrer lecture',
  'generator.deleteSegmentSplit': 'Supprimer la découpe',
  'generator.interludeBlock': 'Interlude',
  'generator.error.export': 'Impossible de générer le fichier.',
  'generator.error.importJson': 'Impossible de charger le fichier karaoké.',
  'generator.error.missingAudio': 'Chargez une piste audio avant de modifier la timeline.',
  'generator.exportBlockedFirstLineStart':
    'Ajoutez une interlude au début ou replacez le premier bloc à 00:00.000.',
  'generator.exportBlockedIncompleteTiming':
    'Certains blocs ne sont pas entièrement synchronisés.',
  'generator.exportBlockedLastLineEnd':
    'Le dernier bloc doit aller jusqu’à la fin du morceau.',
  'generator.exportBlockedLineGap':
    'Il y a un trou entre deux blocs. Ajoutez une interlude ou rapprochez les blocs.',
  'generator.exportBlockedLineOutOfDuration':
    'Un bloc dépasse les limites du morceau.',
  'generator.exportBlockedMissingAudio':
    'Chargez un MP3 pour connaître la durée du morceau.',
  'generator.exportBlockedNoTimeline':
    'Chargez des paroles ou un JSON pour créer la timeline.',
  'generator.exportBlockedSegmentOutOfLine':
    'Un segment dépasse les limites de sa ligne.',
  'generator.exportBlockedSegmentOverlap':
    'Deux segments se chevauchent dans une ligne.',
  'generator.exportBlockedSegmentTextMismatch':
    'Les segments ne reconstituent pas exactement le texte de la ligne.',
  'generator.exportBlockedSummary': 'Export impossible : {count} élément(s) à corriger.',
  'generator.exportIssueFirstLineStart': 'Le premier bloc {line} ne commence pas à 00:00.000.',
  'generator.exportIssueLastLineEnd': 'Le dernier bloc {line} ne va pas jusqu’à la fin du morceau.',
  'generator.exportIssueLineGap': 'Il y a un trou avant le bloc {line}.',
  'generator.exportIssueLineOutOfDuration': 'Le bloc {line} est incomplet ou hors durée.',
  'generator.exportIssueSegmentOutOfLine':
    'Le segment {segment} de la ligne {line} dépasse les limites de sa ligne.',
  'generator.exportIssueSegmentOverlap':
    'Le segment {segment} chevauche le segment précédent dans la ligne {line}.',
  'generator.exportIssueSegmentTextMismatch':
    'Les segments de la ligne {line} ne reconstituent pas exactement son texte.',
  'generator.exportIssueUnknownBlock': 'Bloc inconnu',
  'generator.exportIssueUnknownSegment': 'Segment inconnu',
  'generator.exportJson': 'Exporter',
  'generator.exportedToCatalog': 'Ajouté au catalogue : {id}',
  'generator.lyricsLabel': 'Paroles brutes',
  'generator.lyricsSearchButton': 'Rechercher',
  'generator.lyricsSearchChoose': '— Choisir un résultat —',
  'generator.lyricsSearchEmpty': 'Aucun résultat trouvé.',
  'generator.lyricsSearchError': 'Recherche impossible : {message}',
  'generator.lyricsSearchLabel': 'Rechercher les paroles en ligne (LRCLIB)',
  'generator.lyricsSearchNoText': 'Ce résultat ne contient pas de paroles.',
  'generator.lyricsSearchPlaceholder': 'Titre, artiste…',
  'generator.lyricsSearching': 'Recherche…',
  'generator.karaokeJsonLabel': 'Karaoké JSON',
  'generator.mergeNextSegment': 'Fusionner après',
  'generator.mergePreviousSegment': 'Fusionner avant',
  'generator.newProjectTitle': 'Nouveau karaoké',
  'generator.offsetHelp':
    'Décale la lecture des paroles sans modifier les timings source.',
  'generator.offsetMs': 'Offset',
  'generator.offsetReset': 'Reset',
  'generator.offsetTitle': 'Offset global',
  'generator.redo': 'Rétablir',
  'generator.playhead': 'Tête de lecture',
  'generator.segmentGap': 'Pause de {duration}',
  'generator.selectedBlock': 'Bloc sélectionné',
  'generator.splitSegment': 'Segmenter au curseur',
  'generator.timelineEmpty': 'Chargez un MP3 et des paroles pour générer la timeline.',
  'generator.timelineHelp':
    'Cliquez un bloc pour le focus, déplacez-le ou redimensionnez ses bords. Maintenez Alt pendant le redimensionnement pour ajuster le bloc voisin.',
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
  'settings.appearance': 'Préférences',
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
  'settings.summary': 'Couleurs, langue et raccourcis de l’application.',
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
  'app.backHome': 'Return to home',
  'app.closeSettings': 'Close settings',
  'app.openSettings': 'Open settings',
  'nav.catalog': 'Catalog',
  'nav.generator': 'Generator',
  'nav.settings': 'Settings',

  'home.eyebrow': 'Karaoke Maker',
  'home.title': 'What would you like to do?',
  'home.description': 'Create a new karaoke or play a track from your catalog.',
  'home.createTitle': 'Create a karaoke',
  'home.createDescription': 'Import a song, add lyrics, and synchronize them.',
  'home.catalogTitle': 'Open the catalog',
  'home.catalogDescription': 'Browse your prepared tracks and start playback.',

  'wizard.eyebrow': 'Creation',
  'wizard.startTitle': 'Start a project',
  'wizard.startDescription': 'Resume a saved project or start a new synchronization.',
  'wizard.newProject': 'New project',
  'wizard.newProjectDescription': 'Start with an MP3 and its lyrics.',
  'wizard.openProject': 'Open a project',
  'wizard.openProjectDescription': 'Continue a previously saved project.',
  'wizard.progress': 'Creation steps',
  'wizard.stepProject': 'Project',
  'wizard.stepAudio': 'Music',
  'wizard.stepLyrics': 'Lyrics',
  'wizard.stepSync': 'Synchronization',
  'wizard.stepEditor': 'Editing',
  'wizard.openTitle': 'Choose a project',
  'wizard.openDescription': 'Saved projects keep the MP3, lyrics, and timeline together.',
  'wizard.importJsonTitle': 'Import a legacy file',
  'wizard.importJsonDescription':
    'You can also open a karaoke JSON file, then select its matching MP3.',
  'wizard.back': 'Back',
  'wizard.audioTitle': 'Select the music',
  'wizard.audioDescription':
    'Choose the MP3 to synchronize. It will be included in the saved project.',
  'wizard.audioReady': 'Music ready',
  'wizard.confirmAndContinue': 'Confirm and continue',
  'wizard.lyricsTitle': 'Add the lyrics',
  'wizard.lyricsDescription':
    'Paste the lyrics, import a text file, or use the online search.',
  'wizard.songTitle': 'Title',
  'wizard.artist': 'Artist',
  'wizard.pasteLyrics': 'Lyrics',
  'wizard.pasteLyricsPlaceholder': 'One lyric line per line…',
  'wizard.lyricsReady': 'Lyrics ready',
  'wizard.lyricsLineCount': '{count} lines will be added to the timeline.',
  'wizard.syncTitle': 'Synchronize the lyrics',
  'wizard.syncDescription':
    'Run assisted synchronization or continue directly to manual editing.',
  'wizard.syncDoneDescription':
    'The result is ready. You can still fine-tune every block in the editor.',
  'wizard.syncUnavailableTitle': 'Assisted synchronization unavailable',
  'wizard.syncUnavailableDescription':
    'This feature requires the Electron app running with the alignment module. You can continue manually.',
  'wizard.continueManually': 'Continue manually',
  'wizard.openEditor': 'Open editor',
  'wizard.editSetup': 'Edit sources',
  'wizard.audioRequired': 'Select an MP3 before continuing.',
  'wizard.lyricsRequired': 'Add lyrics before continuing.',
  'wizard.confirmDiscardSetup':
    'Leave this step? Files selected for this new project will be removed.',
  'wizard.confirmReplaceAudio':
    'Replace the current MP3? The timeline may need adjustment for the new duration.',
  'wizard.confirmReplaceLyrics':
    'Replace the current lyrics? Their splits and timing will be reset.',
  'wizard.confirmBackFromEditor':
    'Return to lyrics? Timing stays intact as long as you do not edit the text.',
  'wizard.confirmBackToAudioFromEditor':
    'Return to MP3 selection? The current project stays intact unless you replace the file.',

  'project.loading': 'Loading projects…',
  'project.empty': 'No saved project yet.',
  'project.save': 'Save project',
  'project.saving': 'Saving…',
  'project.saved': 'Project saved',
  'project.retrySave': 'Retry save',
  'project.error.list': 'Unable to load saved projects.',
  'project.error.open': 'Unable to open this project.',
  'project.error.save': 'Unable to save this project.',
  'project.error.missingAudio': 'The MP3 is required to save the project.',

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

  'align.progress.aligningWords': 'Aligning words…',
  'align.progress.asrSegments': '{count} segments detected by transcription.',
  'align.progress.done': 'Synchronization complete.',
  'align.progress.loadingAlignmentModel': 'Loading alignment model ({model})…',
  'align.progress.loadingAudio': 'Loading audio…',
  'align.progress.loadingDefaultAlignmentModel': 'Loading default alignment model ({language})…',
  'align.progress.separatingVocals': 'Separating vocals with Demucs ({model})…',
  'align.progress.transcribing': 'Analyzing vocals for timing anchors ({model}, {device})…',
  'align.progress.vocalsIsolated': 'Vocals isolated.',
  'align.progress.wordCountMismatch':
    'Word count mismatch ({expected} expected, {aligned} aligned), matching by similarity.',
  'align.progress.wrote': 'Result written to {path}.',

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
  'generator.addInterludeAfter': 'Interlude after',
  'generator.addInterludeBefore': 'Interlude before',
  'generator.addToCatalog': 'Add to catalog',
  'generator.autoApplied': 'Assisted sync applied — adjust or export.',
  'generator.autoError': 'Assisted sync failed: {message}',
  'generator.autoFailed': 'Assisted sync failed.',
  'generator.autoHide': 'Done',
  'generator.autoHint': 'You can fine-tune the result on the timeline before exporting.',
  'generator.autoLanguage': 'Lyrics language',
  'generator.autoNo': 'No, do it manually',
  'generator.autoNoWords': 'Load lyrics before running assisted sync.',
  'generator.autoQuestion': 'Synchronize lyrics automatically from the audio?',
  'generator.autoRedo': 'Run sync again',
  'generator.autoRetry': 'Try again',
  'generator.autoStarting': 'Preparing assisted sync…',
  'generator.autoTitle': 'Assisted sync',
  'generator.autoYes': 'Yes, synchronize',
  'generator.centerPlayhead': 'Center playback',
  'generator.deleteSegmentSplit': 'Remove split',
  'generator.interludeBlock': 'Interlude',
  'generator.error.export': 'Unable to generate the file.',
  'generator.error.importJson': 'Unable to load the karaoke file.',
  'generator.error.missingAudio': 'Load an audio track before editing the timeline.',
  'generator.exportBlockedFirstLineStart':
    'Add an interlude at the beginning or move the first block back to 00:00.000.',
  'generator.exportBlockedIncompleteTiming':
    'Some blocks are not fully synchronized.',
  'generator.exportBlockedLastLineEnd':
    'The last block must reach the end of the track.',
  'generator.exportBlockedLineGap':
    'There is a gap between two blocks. Add an interlude or close the gap.',
  'generator.exportBlockedLineOutOfDuration':
    'A block is outside the track duration.',
  'generator.exportBlockedMissingAudio':
    'Load an MP3 so the track duration is known.',
  'generator.exportBlockedNoTimeline':
    'Load lyrics or a JSON file to create the timeline.',
  'generator.exportBlockedSegmentOutOfLine':
    'A segment is outside its line.',
  'generator.exportBlockedSegmentOverlap':
    'Two segments overlap inside a line.',
  'generator.exportBlockedSegmentTextMismatch':
    'The segments do not rebuild the line text exactly.',
  'generator.exportBlockedSummary': 'Export unavailable: {count} item(s) to fix.',
  'generator.exportIssueFirstLineStart': 'The first block {line} does not start at 00:00.000.',
  'generator.exportIssueLastLineEnd': 'The last block {line} does not reach the end of the track.',
  'generator.exportIssueLineGap': 'There is a gap before block {line}.',
  'generator.exportIssueLineOutOfDuration': 'Block {line} is incomplete or outside the track duration.',
  'generator.exportIssueSegmentOutOfLine': 'Segment {segment} from line {line} is outside its line.',
  'generator.exportIssueSegmentOverlap':
    'Segment {segment} overlaps the previous segment in line {line}.',
  'generator.exportIssueSegmentTextMismatch':
    'The segments from line {line} do not rebuild its text exactly.',
  'generator.exportIssueUnknownBlock': 'Unknown block',
  'generator.exportIssueUnknownSegment': 'Unknown segment',
  'generator.exportJson': 'Export',
  'generator.exportedToCatalog': 'Added to the catalog: {id}',
  'generator.lyricsLabel': 'Raw lyrics',
  'generator.lyricsSearchButton': 'Search',
  'generator.lyricsSearchChoose': '— Choose a result —',
  'generator.lyricsSearchEmpty': 'No results found.',
  'generator.lyricsSearchError': 'Search failed: {message}',
  'generator.lyricsSearchLabel': 'Search lyrics online (LRCLIB)',
  'generator.lyricsSearchNoText': 'This result has no lyrics.',
  'generator.lyricsSearchPlaceholder': 'Title, artist…',
  'generator.lyricsSearching': 'Searching…',
  'generator.karaokeJsonLabel': 'Karaoke JSON',
  'generator.mergeNextSegment': 'Merge next',
  'generator.mergePreviousSegment': 'Merge previous',
  'generator.newProjectTitle': 'New karaoke',
  'generator.offsetHelp':
    'Shifts lyric playback without changing the source timings.',
  'generator.offsetMs': 'Offset',
  'generator.offsetReset': 'Reset',
  'generator.offsetTitle': 'Global offset',
  'generator.redo': 'Redo',
  'generator.playhead': 'Playhead',
  'generator.segmentGap': '{duration} pause',
  'generator.selectedBlock': 'Selected block',
  'generator.splitSegment': 'Split at cursor',
  'generator.timelineEmpty': 'Load an MP3 and lyrics to generate the timeline.',
  'generator.timelineHelp':
    'Click a block to focus it, then move it or resize its edges. Hold Alt while resizing to adjust the adjacent block.',
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
  'settings.appearance': 'Preferences',
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
  'settings.summary': 'Application colors, language, and shortcuts.',
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
