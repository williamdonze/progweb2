# Les modules : ajouter une mécanique propre à une matière

Le moteur est commun à tous les cours. Ce qui est propre à une **matière** (exécuter du JavaScript, afficher une page web…) est un **module**, activé dans `content/config.json` → `app.modules`. Un cours sans code n'active aucun module.

## Les modules existants

| module | fichiers | ce qu'il fait |
|---|---|---|
| `code-js` | `js/banc.js`, `js/worker.js`, `js/editeur.js` ; types de code dans `js/questions.js` (`exerciceCode`), `executer()` dans `js/base.js`, vue Console dans `js/app.js` | exécute le code de l'élève dans un Web Worker (2 s max), le teste sur plusieurs jeux de données, traduit les erreurs, diagnostique les erreurs typiques |
| `dom` | `js/dom.js`, `js/dom-harnais.js`, `content/pages/` | exécute le code sur une vraie page web, dans une `<iframe sandbox="allow-scripts">`, et joue des étapes de test (clics, comptages) |

Les fichiers d'un module restent chargés même s'il est désactivé (ils sont petits) : le module ne fait qu'**autoriser** ses types d'exercices (validateur) et **afficher** ses éléments d'interface (`aModule("code-js")` dans le code).

## Ajouter un module (exemple : PHP)

1. **Choisir le moteur d'exécution, côté navigateur, sans serveur** (le site est statique, sur GitHub Pages) :
   - PHP : PHP compilé en WebAssembly (`@php-wasm/web`, celui de WordPress Playground), à charger dans un Web Worker ;
   - SQL : SQLite en WebAssembly (`sql.js`) ;
   - Python : Pyodide ;
   - terminal Unix : un **simulateur** en JavaScript (système de fichiers en mémoire, commandes `ls`, `cd`, `mkdir`, `chmod`, `cat`…), plutôt qu'une vraie machine virtuelle (lourde).
   Copier les fichiers dans le dépôt (pas de CDN) : l'appli doit marcher hors connexion.
2. **Écrire le banc d'essai** sur le modèle de `js/banc.js` : exécuter le code, capturer la sortie, lancer les cas de test (`tests.cas` : `args` / `attendu`, `sortie`, `siEchec`), et renvoyer **le même format de résultat** que `executerTout` : `{ ok, console, erreur, cas, diagnostics, conseils }`. Ainsi la feuille de correction, les indices, les brouillons et « Passer » marchent sans rien changer.
3. **Traduire les erreurs** du langage en français et écrire les **diagnostics** des erreurs typiques de la matière (PHP : `echo` au lieu de `return`, `$` oublié, `.` pour concaténer, `;` manquant, `==` et `===`…). Chaque diagnostic a un `id`, documenté dans `docs/format-contenu.md`.
4. **Brancher le module** : dans `exerciceCode` (`js/questions.js`), choisir le banc selon un champ de l'exercice (par exemple `"langage": "php"`, ou le module du cours) ; ajouter le nom du module à `MODULES_CONNUS` et ses types à la vérification de `tools/valider-contenu.py` ; la coloration du code (`colorer`, `jetons` dans `banc.js`) peut rester celle du JavaScript au début.
5. **Tester** : un exemple de chaque nouveau type dans une unité, `tools/tester-exercices.py` doit exécuter les solutions et les erreurs typiques avec le nouveau banc (adapter `lancerQ` dans `tools/tester-dans-la-page.js`), puis `tools/test-parcours.py`.
6. **Documenter** : ce fichier (tableau des modules), `docs/format-contenu.md` (champs, diagnostics), et le CLAUDE.md du modèle.

## Nouveau type d'exercice (sans nouveau langage)

Un type = une fonction `Q.monType = (q, onChange) => ({ el, ready(), check(), resoudre() })` dans `js/questions.js` (contrat détaillé dans CLAUDE.md). Puis : son libellé dans `KIND_NAME`, ses champs dans `TYPES` de `tools/valider-contenu.py`, sa ligne dans `docs/format-contenu.md` § 6, un exemple dans l'unité catalogue. Idées utiles pour des cours sans code : cartes à retourner (terme ↔ définition), toucher une zone d'une image (une capture d'écran, un schéma), compléter un schéma.

## Faire profiter tous les cours d'une amélioration

Une amélioration du moteur faite dans le dépôt d'un cours (nouveau module, correction d'affichage) se reporte ici, dans le modèle : copier les fichiers de `js/`, `css/`, `tools/` concernés, relancer les trois tests, documenter. Les autres cours la récupèrent en copiant à leur tour ces fichiers (leur `content/` ne change pas).
