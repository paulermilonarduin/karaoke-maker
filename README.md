# Karaoke Maker

Karaoke Maker est une interface web permettant de créer et de jouer des karaokés à partir de fichiers simples :

- un fichier MP3 contenant la musique ;
- un fichier de paroles ;
- des marqueurs temporels permettant de synchroniser les paroles avec l'audio.

L'objectif est de rendre la création d'un karaoké simple, rapide et accessible, sans obliger l'utilisateur à manipuler directement des formats techniques.

## Vision produit

L'application sera organisée autour de deux grandes parties.

### Génération

La partie génération proposera une interface simple et épurée pour importer une musique, charger ou saisir les paroles, puis créer un fichier de paroles synchronisé.

L'utilisateur devra pouvoir associer facilement les paroles aux bons moments de la musique, puis exporter le résultat dans un format exploitable par le lecteur karaoké.

### Catalogue et lecture

La partie catalogue permettra de retrouver les musiques déjà préparées et de les jouer directement dans l'application.

Elle servira de bibliothèque de karaokés disponibles, avec un lecteur capable d'afficher les paroles au bon moment pendant la lecture audio.

## POC actuel

Une première version fonctionnelle peut rester volontairement simple :

- importer ou référencer un MP3 ;
- synchroniser les lignes puis les mots en deux passes ;
- ajuster les marqueurs directement sur la waveform ;
- ralentir ou accélérer la lecture en conservant la tonalité ;
- lire la musique dans un lecteur web ;
- afficher et surligner progressivement les paroles au niveau des mots.

Cette V1 doit surtout valider le flux principal : créer une synchronisation minimale, la sauvegarder, puis la rejouer correctement.

## Format des paroles

Karaoke Maker utilise un format JSON interne versionné (`*.karaoke.json`). Il représente :

- une ligne de paroles complète ;
- plusieurs segments temporels à l'intérieur d'une même ligne ;
- un début et une fin explicites en millisecondes pour chaque mot ou syllabe ;
- les informations audio nécessaires pour valider et rejouer la synchronisation.

## Direction technique initiale

La priorité est de construire un POC utilisable avant d'optimiser le format final.

L'approche retenue consiste à :

1. synchroniser d'abord le début des lignes ;
2. effectuer une seconde passe pour synchroniser les mots ;
3. générer un fichier JSON utilisé directement par le lecteur ;
4. conserver les timestamps sous forme d'entiers en millisecondes.

## Stack technique

Le projet partira sur une application web en Vue 3 avec TypeScript et Vite.

Cette stack permet de rester simple pour le POC tout en utilisant directement les APIs natives du navigateur :

- `HTMLAudioElement` pour lire les MP3 et récupérer le temps courant de lecture ;
- `requestAnimationFrame` pour synchroniser l'affichage des paroles avec l'audio ;
- la File API pour charger localement un MP3 et un fichier de paroles ;
- IndexedDB si un catalogue local est nécessaire dans une première version.

Nuxt n'est pas nécessaire au démarrage : le POC n'a pas besoin de rendu serveur ni de backend intégré.

## Application desktop

Le projet peut aussi être lancé comme application desktop avec Electron.

Cette cible permet de distribuer Karaoke Maker comme une application Windows tout en conservant la même interface Vue/Vite. Elle sera utile si le projet doit gérer plus confortablement des fichiers locaux, un catalogue sur le poste utilisateur ou un export de fichiers karaoke.

Commandes principales :

```powershell
npm run electron:dev
npm run electron:preview
npm run package:win
```

Les détails de lancement et de debug sont disponibles dans `Vue.md`.

## Édition audio

La partie génération utilise `wavesurfer.js` pour afficher la forme d'onde du MP3, naviguer précisément dans la musique et placer des marqueurs temporels.

La librairie est surtout utile pour l'édition :

- affichage de la waveform ;
- timeline avec repères de temps ;
- création et déplacement de zones ou marqueurs ;
- relecture de passages courts pour ajuster la synchronisation.

Les commandes du générateur passent par un registre d'actions central. Les raccourcis peuvent être modifiés directement dans l'interface, les conflits sont détectés et les préférences sont conservées localement dans le navigateur.

Le lecteur karaoké n'a pas besoin de dépendre de `wavesurfer.js`. Pour jouer une musique et afficher les paroles au bon moment, un lecteur audio natif et une boucle de synchronisation suffisent.

## Format interne cible

Le JSON est la source de vérité unique. Chaque segment conserve son texte exact, espaces compris, afin que leur concaténation reconstitue la ligne.

```json
{
  "schemaVersion": 1,
  "title": "Song title",
  "audio": {
    "fileName": "song.mp3",
    "durationMs": 180000
  },
  "lines": [
    {
      "id": "line:0",
      "startMs": 12400,
      "endMs": 16800,
      "text": "Bonjour tout le monde",
      "segments": [
        { "id": "line:0:segment:0", "text": "Bonjour ", "startMs": 12400, "endMs": 13600 },
        { "id": "line:0:segment:1", "text": "tout ", "startMs": 13800, "endMs": 14500 },
        { "id": "line:0:segment:2", "text": "le ", "startMs": 14600, "endMs": 14900 },
        { "id": "line:0:segment:3", "text": "monde", "startMs": 15000, "endMs": 16800 }
      ]
    }
  ]
}
```

## Architecture pressentie

Une structure possible après initialisation du projet Vue :

```text
src/
  components/
    AudioPlayer.vue
    LyricsDisplay.vue
    WaveformEditor.vue
  views/
    GeneratorView.vue
    CatalogView.vue
    PlayerView.vue
  domain/
    lyrics.ts
    sync.ts
```

La logique de parsing et de synchronisation doit rester autant que possible hors des composants Vue, afin de pouvoir la tester facilement.

## Objectif

Le projet vise à fournir un outil web capable de transformer facilement une musique et ses paroles en karaoké jouable, avec une première version centrée sur la synchronisation simple, puis une évolution vers des animations plus précises et plus naturelles.
