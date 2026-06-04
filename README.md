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

## V1 POC

Une première version fonctionnelle peut rester volontairement simple :

- importer ou référencer un MP3 ;
- charger un fichier de paroles synchronisées ;
- lire la musique dans un lecteur web ;
- afficher le bon bloc de texte au bon moment ;
- ne pas encore gérer le surlignage progressif des mots ou syllabes.

Cette V1 doit surtout valider le flux principal : créer une synchronisation minimale, la sauvegarder, puis la rejouer correctement.

## Format des paroles

Il existe déjà des formats adaptés à la synchronisation de paroles, comme LRC ou Enhanced LRC. Ils peuvent servir de base pour une première itération.

À terme, l'application devra probablement gérer un format plus précis. Les paroles d'une musique ne défilent pas toujours de manière linéaire : certains passages accélèrent, certaines syllabes sont allongées, plusieurs chanteurs peuvent se répondre, et le rythme réel ne correspond pas toujours à une simple ligne affichée pendant un intervalle fixe.

Le format cible devra donc pouvoir représenter :

- une ligne de paroles complète ;
- plusieurs marqueurs temporels à l'intérieur d'une même ligne ;
- une synchronisation plus fine par mot ou par syllabe ;
- les informations nécessaires pour animer les paroles au bon rythme pendant la lecture.

## Direction technique initiale

La priorité est de construire un POC utilisable avant d'optimiser le format final.

Une approche pragmatique consiste à :

1. démarrer avec un format simple basé sur des blocs temporels ;
2. supporter ensuite un format plus fin, inspiré des formats existants ;
3. conserver une séparation claire entre la musique, les paroles brutes et les données de synchronisation ;
4. prévoir un export/import stable pour que les karaokés créés restent réutilisables.

## Stack technique

Le projet partira sur une application web en Vue 3 avec TypeScript et Vite.

Cette stack permet de rester simple pour le POC tout en utilisant directement les APIs natives du navigateur :

- `HTMLAudioElement` pour lire les MP3 et récupérer le temps courant de lecture ;
- `requestAnimationFrame` pour synchroniser l'affichage des paroles avec l'audio ;
- la File API pour charger localement un MP3 et un fichier de paroles ;
- IndexedDB si un catalogue local est nécessaire dans une première version.

Nuxt n'est pas nécessaire au démarrage : le POC n'a pas besoin de rendu serveur ni de backend intégré.

## Édition audio

La partie génération pourra utiliser `wavesurfer.js` pour afficher la forme d'onde du MP3, naviguer précisément dans la musique et placer des marqueurs temporels.

La librairie est surtout utile pour l'édition :

- affichage de la waveform ;
- timeline avec repères de temps ;
- création et déplacement de zones ou marqueurs ;
- relecture de passages courts pour ajuster la synchronisation.

Le lecteur karaoké n'a pas besoin de dépendre de `wavesurfer.js`. Pour jouer une musique et afficher les paroles au bon moment, un lecteur audio natif et une boucle de synchronisation suffisent.

## Format interne cible

La V1 peut importer ou exporter des formats existants comme LRC, Enhanced LRC ou WebVTT.

Pour gérer ensuite une synchronisation plus précise, le projet pourra utiliser un format JSON interne capable de représenter des lignes, des mots ou des syllabes avec leurs propres marqueurs temporels.

Exemple de direction :

```json
{
  "title": "Song title",
  "audio": "song.mp3",
  "lines": [
    {
      "start": 12.4,
      "end": 16.8,
      "text": "Bonjour tout le monde",
      "tokens": [
        { "text": "Bonjour", "start": 12.4, "end": 13.6 },
        { "text": "tout", "start": 13.8, "end": 14.5 },
        { "text": "le", "start": 14.6, "end": 14.9 },
        { "text": "monde", "start": 15.0, "end": 16.8 }
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
    formats/
      lrc.ts
      vtt.ts
      karaoke-json.ts
```

La logique de parsing et de synchronisation doit rester autant que possible hors des composants Vue, afin de pouvoir la tester facilement.

## Objectif

Le projet vise à fournir un outil web capable de transformer facilement une musique et ses paroles en karaoké jouable, avec une première version centrée sur la synchronisation simple, puis une évolution vers des animations plus précises et plus naturelles.
