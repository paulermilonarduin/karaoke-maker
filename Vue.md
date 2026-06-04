# Vue

Commandes utiles pour développer et déboguer Karaoke Maker.

## Installation

```powershell
npm install
```

## Lancer le projet

```powershell
npm run dev
```

Vite affiche une URL locale, généralement `http://localhost:5173`.

Pour forcer un port :

```powershell
npm run dev -- --port 5173
```

Pour exposer le serveur sur le réseau local :

```powershell
npm run dev -- --host 0.0.0.0
```

## Vérifier le typage

```powershell
npm run typecheck
```

## Builder

```powershell
npm run build
```

Cette commande lance `vue-tsc` puis génère le build Vite dans `dist/`.

## Prévisualiser le build

```powershell
npm run preview
```

## Déboguer

- Ouvrir l'application dans Chrome ou Edge avec les DevTools.
- Installer Vue Devtools dans le navigateur pour inspecter les composants.
- Surveiller la console navigateur pour les erreurs de chargement de fichiers, de parsing LRC ou de lecture audio.
- Utiliser `npm run typecheck` quand une erreur Vue ou TypeScript n'est pas claire.

## Structure initiale

```text
src/
  components/
    AudioPlayer.vue
    FileDropField.vue
    LyricsDisplay.vue
  domain/
    lyrics.ts
  views/
    CatalogView.vue
    GeneratorView.vue
  App.vue
  main.ts
```
