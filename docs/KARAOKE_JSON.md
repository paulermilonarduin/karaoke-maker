# Format Karaoke JSON

Le fichier `*.karaoke.json` est la source de vérité utilisée par le lecteur.

Le MP3 reste externe au JSON. Le fichier JSON décrit le morceau, les métadonnées utiles, les éventuels assets visuels et surtout les lignes synchronisées.

## Structure cible

```json
{
  "schemaVersion": 2,
  "song": {
    "title": "Minecraft UDSS",
    "artist": "Robert LaFondue",
    "durationMs": 96012
  },
  "audio": {
    "fileName": "Short_Minecraft.mp3"
  },
  "assets": {
    "cover": null,
    "background": null
  },
  "display": {
    "accentColor": null,
    "backgroundColor": null
  },
  "lines": []
}
```

## Champs principaux

- `schemaVersion` : version du format interne
- `song.title` : titre affiché dans le catalogue et le lecteur
- `song.artist` : artiste affiché sous le titre
- `song.durationMs` : durée de la version audio ciblée, en millisecondes
- `audio.fileName` : nom du fichier audio attendu localement
- `assets.cover` : pochette optionnelle pour le catalogue
- `assets.background` : image de fond optionnelle pour le lecteur
- `display` : préférences visuelles optionnelles propres au morceau
- `lines` : contenu synchronisé lu par le lecteur

## Lignes

Une ligne de paroles utilise `kind: "lyrics"`.

```json
{
  "id": "line:0",
  "kind": "lyrics",
  "startMs": 20081,
  "endMs": 22588,
  "text": "Le serveur Minecraft c'est une bonne idée",
  "segments": [
    {
      "id": "line:0:segment:0",
      "text": "Le ",
      "startMs": 20081,
      "endMs": 20282
    }
  ]
}
```

Un passage sans paroles utilise uniquement `kind: "interlude"`.

```json
{
  "id": "interlude:intro",
  "kind": "interlude",
  "text": "",
  "startMs": 0,
  "endMs": 20081
}
```

Les fichiers `.txt` importés dans le générateur sont traités comme du texte brut. Les interludes sont ajoutés dans l’interface de synchronisation, pas via des balises dans le `.txt`.

## Extensions prévues

Les blocs `assets` et `display` sont optionnels et pensés pour éviter de casser le format quand on ajoutera :

- Une pochette de catalogue
- Une image de fond du lecteur
- Une couleur principale par morceau
- Des stems audio séparés, par exemple `vocals` et `accompaniment`
- Une empreinte audio pour matcher le JSON avec un MP3 local

Les fichiers lourds ne doivent pas être encodés en base64 dans le JSON. Le JSON doit référencer des fichiers externes.
