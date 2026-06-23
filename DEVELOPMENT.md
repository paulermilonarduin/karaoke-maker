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

## Lancer l'application desktop Electron

```powershell
npm run electron:dev
```

Cette commande compile le process Electron, lance Vite en local, puis ouvre l'application dans une fenêtre desktop.

## Tester l'application desktop packagée localement

```powershell
npm run electron:preview
```

Cette commande génère le build web, compile Electron, puis ouvre la version desktop sur les fichiers de production.

## Générer un installeur Windows

```powershell
npm run package:win
```

Le résultat est généré dans `release/`.

## Déboguer

- Ouvrir l'application dans Chrome ou Edge avec les DevTools.
- Installer Vue Devtools dans le navigateur pour inspecter les composants.
- Surveiller la console navigateur pour les erreurs de chargement de fichiers, de validation JSON ou de lecture audio.
- Utiliser `npm run typecheck` quand une erreur Vue ou TypeScript n'est pas claire.
- Utiliser `npm run typecheck:electron` pour vérifier uniquement le code Electron.

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
electron/
  main.ts
  preload.ts
```
