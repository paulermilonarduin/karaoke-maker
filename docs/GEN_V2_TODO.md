# TODO Générateur V2

## À implémenter maintenant

1. Renommer les actions internes `marker.*` en `timeline.*`.
2. Ajouter undo/redo complet.
3. Ajouter suppression et fusion de segments.
4. Ajouter une tête de lecture verticale sur la timeline.
5. Améliorer le zoom et le scroll horizontal de la timeline.
6. Rendre les blancs entre segments visibles et compréhensibles.
7. Importer et éditer un fichier JSON existant.
8. Ajouter un offset global pour adapter un JSON à un MP3 local.
9. Ajouter des tests unitaires sur le parseur JSON et les contraintes timeline.
10. Ajouter des tests e2e simples pour catalogue, paramètres, recherche et génération.

## Améliorations second temps

- Extraire la logique timeline hors de `GeneratorView.vue`.
- Créer des composables `useTimelineEditor`, `useTimelineUndo`, `useGeneratorFiles`.
- Ajouter une preview plus fidèle du rendu karaoké pendant la génération.
