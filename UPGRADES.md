# Upgrades techniques

## Accessibilité

Objectif : garder l’accessibilité en tête à chaque évolution de l’application, pas uniquement comme un chantier final.

État actuel :

- Les écrans simples sont globalement corrects pour un POC : boutons natifs, labels, champs de formulaire, messages d’erreur et navigation de base.
- Le lecteur est plutôt bien parti : bouton plein écran labellisé, barre d’interlude exposée comme progression, contrôles audio identifiables.
- Le point faible principal est le générateur, surtout la timeline : beaucoup d’actions reposent sur la souris, le drag et les poignées visuelles.

Points à améliorer en priorité :

- Ajouter un vrai modèle clavier pour la timeline : sélectionner, déplacer, redimensionner, fusionner, supprimer et nudger sans souris.
- Donner des labels ARIA utiles aux blocs et segments : texte, type, début, fin, durée et état sélectionné.
- Rendre les poignées de resize accessibles ou proposer une alternative clavier équivalente.
- Ajouter des retours dynamiques cohérents avec `aria-live` pour les messages importants : calage, export impossible, erreurs et actions timeline.
- Éviter que l’information essentielle repose uniquement sur la couleur, le glow ou l’animation.
- Étendre la prise en compte de `prefers-reduced-motion` aux animations importantes du lecteur et du générateur.
- Ajouter des tests d’accessibilité automatisés dans les tests e2e, par exemple avec axe sur catalogue, settings, lecteur et générateur.

Principe de collaboration :

- Remonter les incohérences produit ou techniques avant d’implémenter.
- Proposer une alternative quand une demande risque de rendre l’application fragile, confuse ou difficile à maintenir.
- Ne pas traiter l’accessibilité comme une contrainte secondaire si elle change la structure d’un composant.
- Privilégier des composants utilisables au clavier avant d’ajouter des interactions avancées uniquement à la souris.

## Internationalisation

L’i18n actuelle est volontairement légère et interne au projet :

- dictionnaires `fr` / `en` dans `src/i18n/index.ts` ;
- fonction `t('clé', { paramètre })` ;
- locale persistée dans `localStorage` ;
- pas de dépendance externe.

Cette approche est suffisante pour le POC, mais elle devra évoluer si l’application grossit.

Améliorations à prévoir :

- gérer proprement les pluriels (`1 titre`, `2 titres`, `0 titres`) au lieu de libellés comme `titre(s)` ;
- ajouter une fonction de pluralisation, par exemple `tc('catalog.count', count, params)` ;
- s’appuyer sur `Intl.PluralRules` ou définir des règles métier explicites par langue ;
- envisager une migration vers `vue-i18n` si on ajoute beaucoup de textes, de langues, de formats ou de règles.

Cas prioritaires à corriger :

- compteur du catalogue : `1 titre` / `{count} titres` ;
- résultats de recherche : par exemple `1 résultat sur 12` / `{count} résultats sur {total}` ;
- raccourcis : `1 action configurée` / `{count} actions configurées`.

## Générateur V2

Amélioration à prévoir après le refactor des composables :

- Ajouter une preview plus fidèle du rendu karaoké directement dans le générateur.
