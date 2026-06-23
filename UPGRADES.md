# Upgrades techniques

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
