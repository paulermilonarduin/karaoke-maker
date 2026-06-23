<p align="center">
  <img src="docs/assets/karaoke-maker-logo.svg" alt="Karaoke Maker" width="520">
</p>

Karaoke Maker est une interface web permettant de créer et de jouer des karaokés à partir de fichiers simples :

- Un fichier MP3 contenant la musique
- Un fichier de paroles
- Des marqueurs temporels permettant de synchroniser les paroles avec l'audio

L'objectif est de rendre la création d'un karaoké simple, rapide et accessible, sans obliger l'utilisateur à manipuler directement des formats techniques.

## Vision produit

L'application sera organisée autour de deux grandes parties.

### Génération

La partie génération proposera une interface simple et épurée pour importer une musique, charger ou saisir les paroles, puis créer un fichier de paroles synchronisé.

L'utilisateur devra pouvoir associer facilement les paroles aux bons moments de la musique, puis exporter le résultat dans un format exploitable par le lecteur karaoké.

### Catalogue et lecture

La partie catalogue permettra de retrouver les musiques déjà préparées et de les jouer directement dans l'application.

Elle servira de bibliothèque de karaokés disponibles, avec un lecteur capable d'afficher les paroles au bon moment pendant la lecture audio.

### Vision communautaire et API

À terme, Karaoke Maker aura probablement besoin d'une API pour partager les fichiers de synchronisation, mais pas les fichiers audio.

L'objectif est de permettre aux utilisateurs de publier et de récupérer des fichiers `*.karaoke.json` synchronisés, sans distribuer les MP3 associés. Chaque utilisateur garde ses musiques localement et peut associer un fichier karaoke téléchargé à son propre fichier audio.

Le découpage cible est donc :

```text
API publique
  - Comptes utilisateurs
  - Recherche par titre, artiste, langue ou version
  - Upload/download de fichiers karaoke JSON
  - Versions, notes, signalements et validation communautaire

Client local
  - Catalogue de musiques présentes sur la machine
  - Association d'un fichier karaoke JSON avec un MP3 local
  - Lecture et synchronisation hors distribution audio
  - Ajustement d'offset ou resynchronisation si la version audio diffère
```

Cette séparation limite les problèmes de droits : le serveur stocke des métadonnées et des timings, pas les morceaux eux-mêmes.

Le point technique important sera le matching entre un fichier karaoke et un fichier audio local. Une première version peut comparer la durée attendue avec la durée réelle et afficher un avertissement si l'écart est trop grand. Une version plus robuste pourra ajouter une empreinte audio locale, par exemple via Chromaprint/AcoustID ou un mécanisme équivalent, pour détecter les versions compatibles d'un même morceau.

Le traitement audio avancé, comme la séparation voix/instrumental, doit rester local ou privé dans un premier temps. Le flux recommandé est de traiter le MP3 au moment de l'import, générer des stems séparés (`vocals` et `instrumental`), puis laisser le lecteur mixer ces pistes avec des volumes indépendants. Le serveur public ne devrait pas recevoir de MP3 commerciaux pour cette fonctionnalité.

## POC actuel

Une première version fonctionnelle peut rester volontairement simple :

- Importer ou référencer un MP3
- Synchroniser les lignes puis les mots en deux passes
- Ajouter des blocs d’interlude pour les passages sans paroles
- Ajuster les marqueurs directement sur la waveform
- Ralentir ou accélérer la lecture en conservant la tonalité
- Personnaliser la couleur principale depuis les paramètres
- Changer la langue de l’interface depuis les paramètres
- Lire la musique dans un lecteur web
- Afficher et surligner progressivement les paroles au niveau des mots

Cette V1 doit surtout valider le flux principal : créer une synchronisation minimale, la sauvegarder, puis la rejouer correctement.

## Format des paroles

Karaoke Maker utilise un format JSON interne versionné (`*.karaoke.json`). Il représente :

- Une ligne de paroles complète
- Plusieurs segments temporels à l'intérieur d'une même ligne
- Des blocs d’interlude (`kind: "bridge"`) pour les passages instrumentaux ou sans paroles
- Un début et une fin explicites en millisecondes pour chaque mot ou syllabe
- Les informations audio nécessaires pour valider et rejouer la synchronisation

Dans un fichier de paroles brut, une ligne `[bridge]`, `[instrumental]`, `[break]` ou `[pause]` crée un bloc sans paroles. Le générateur permet aussi d’ajouter un interlude à l’instant courant pendant la synchronisation.

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

- `HTMLAudioElement` pour lire les MP3 et récupérer le temps courant de lecture
- `requestAnimationFrame` pour synchroniser l'affichage des paroles avec l'audio
- La File API pour charger localement un MP3 et un fichier de paroles
- IndexedDB si un catalogue local est nécessaire dans une première version

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

Les détails de lancement et de debug sont disponibles dans `DEVELOPMENT.md`.

## Édition audio

La partie génération utilise `wavesurfer.js` pour afficher la forme d'onde du MP3, naviguer précisément dans la musique et placer des marqueurs temporels.

La librairie est surtout utile pour l'édition :

- Affichage de la waveform
- Timeline avec repères de temps
- Création et déplacement de zones ou marqueurs
- Relecture de passages courts pour ajuster la synchronisation

Les commandes du générateur passent par un registre d'actions central. Les raccourcis peuvent être modifiés directement dans l'interface, les conflits sont détectés et les préférences sont conservées localement dans le navigateur.

Le lecteur karaoké n'a pas besoin de dépendre de `wavesurfer.js`. Pour jouer une musique et afficher les paroles au bon moment, un lecteur audio natif et une boucle de synchronisation suffisent.

## Internationalisation

L’interface utilise une i18n légère côté client, sans dépendance externe pour le moment.

- Les textes d’interface sont centralisés dans `src/i18n/index.ts`
- La locale active est conservée dans `localStorage` sous la clé `karaoke-maker.locale.v1`
- Les composants utilisent `t('clé')` ou `t('clé', { paramètre })` pour afficher les libellés
- Le choix de langue est disponible dans les paramètres

Cette approche suffit pour le POC et permet de migrer facilement vers une librairie dédiée plus tard si le besoin apparaît.

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
      "id": "bridge:intro",
      "kind": "bridge",
      "text": "",
      "startMs": 0,
      "endMs": 12400
    },
    {
      "id": "line:0",
      "kind": "lyrics",
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
