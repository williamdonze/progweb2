# Langages et modules

Le moteur est commun à tous les cours. Ce qui est propre à une **matière** se range en deux couches :

- le **langage** du code (`config.app.langage`, défini dans `js/langages.js`) : coloration, barre de symboles de l'éditeur, indentation, textes (« Pour voir un résultat : `console.log(…)` »), données du cours écrites dans ce langage ;
- le **module** qui l'**exécute**, s'il existe (`config.app.modules`) : le bac à sable, les tests, les erreurs traduites, les diagnostics.

Un langage sans module marche déjà : c'est le mode **code sans exécution**.

## Les langages

| `langage` | module qui l'exécute | fichiers |
|---|---|---|
| `js` (défaut) | `code-js` | `js/banc.js` (banc d'essai, analyse, diagnostics), `js/worker.js` (Web Worker, 2 s max), `executerJs()` dans `js/base.js` |
| `php` | `code-php` | `js/php.js` (harnais, requête HTTP simulée, tests, erreurs traduites, diagnostics, coloration) ; `js/vendor/php-wasm/` (PHP 8.3 en WebAssembly, `@php-wasm/web` 3.1.57, licence GPL, 18 Mo ; reconstruit par `tools/php-wasm/construire.sh`) |
| `java`, `python`, `c`, `cpp`, `csharp`, `sql`, `bash` | aucun pour l'instant | leur définition dans `js/langages.js` (coloration, symboles) |

Sans `langage` dans la config : `php` si le module `code-php` est actif, sinon `js`. Un cours exécute **un** langage.

## Le mode « code sans exécution »

Pour un cours dans un langage qu'aucun module n'exécute (Java, C, Python…), ou quand l'exécution ne vaut pas sa peine : `"langage": "java"`, `"modules": []`. Le code est coloré et l'éditeur a la barre du langage, mais rien ne s'exécute : pas de bouton « Exécuter », pas d'onglet Console. On utilise les exercices qui n'exécutent pas le code :

- `predire` avec `reponse` (saisie libre, `accepte` pour les variantes) ou `choix` ;
- `bug` (la ligne fautive, puis l'explication), `parsons` (remettre les lignes dans l'ordre, avec des distracteurs), `pointer-code` (toucher une partie du code), `ordre`, `assoc` (code ↔ effet), `qcm` et `vf` avec `code` et `mono` ;
- les boss sont des **études de cas** : un programme du cours, puis des questions sur lui.

Le validateur refuse alors les types qui exécutent (`trous`, `corriger`, `ecrire`, boss de code) et les `predire` sans réponse écrite. Exemple complet : `tools/exemples/java/`.

## Les autres modules

| module | fichiers | ce qu'il fait |
|---|---|---|
| `dom` | `js/dom.js`, `js/dom-harnais.js`, `content/pages/` | exécute le JavaScript sur une vraie page web, dans une `<iframe sandbox="allow-scripts">`, et joue des étapes de test (clics, comptages) |

Les fichiers d'un module restent chargés même s'il est désactivé (ils sont petits ; le moteur PHP de 18 Mo, lui, n'est téléchargé qu'au premier exercice de code d'un cours de PHP, puis gardé en cache par `sw.js`). Le module ne fait qu'**autoriser** ses types d'exercices (validateur) et **afficher** ses éléments d'interface (`aCode()`, `aModule("dom")`).

## Ajouter un langage (coloration seulement)

Dans `js/langages.js`, une ligne avec `jetonsSimples({ commentaires, chaines?, variables?, annotations?, motsCles, litteraux, casse? })`, ses `symboles`, son `indent`, `afficher` et `reAffichage`. Ajouter son nom à `LANGAGES` dans `tools/valider-contenu.py`.

## Faire exécuter un langage (nouveau module : Python, SQL, Java…)

Le module `code-php` a été construit ainsi : s'en inspirer (`js/php.js`).

1. **Le moteur d'exécution, côté navigateur, sans serveur** (le site est statique, sur GitHub Pages) : Python → Pyodide ; SQL → SQLite en WebAssembly (`sql.js`) ; Java → un JVM en WebAssembly (lourd : CheerpJ, TeaVM…) ; terminal Unix → un **simulateur** en JavaScript (fichiers en mémoire, `ls`, `cd`, `chmod`…). Les fichiers vont dans `js/vendor/<moteur>/` (pas de CDN : l'appli marche hors connexion), avec un script pour les reconstruire dans `tools/`.
2. **Le banc d'essai** : un fichier `js/<langage>.js` qui exécute le code, capture la sortie, lance les cas de test (`tests.cas` : `args` / `attendu`, `sortie`, `variables`, `siEchec`…) et renvoie **le même format** que `executerTout` : `{ ok, console, erreur, cas, diagnostics, conseils, page? }`. La feuille de correction, les indices, les brouillons et « Passer » marchent alors sans rien changer.
3. **Les erreurs traduites** en français et les **diagnostics** des erreurs typiques de la matière, chacun avec un `id` documenté dans `docs/format-contenu.md`.
4. **L'enregistrement** : à la fin du fichier, compléter la définition du langage : `langage("python", { …, module:"code-python", executer, precharger?, champs?, demo })` (contrat en tête de `js/langages.js`). Charger le fichier dans `index.html` (après `js/dom.js`), ajouter le module à `MODULES_CONNUS` et à `LANGAGES` dans `tools/valider-contenu.py`, et à `VENDOR` dans `tools/mettre-a-jour-moteur.py` s'il a un moteur lourd.
5. **Tester** : une unité d'exemple `tools/exemples/<langage>/` (`config.json` + `unite.json` : un exemple de chaque type de code, des erreurs typiques avec leur diagnostic), puis `python3 tools/tester-exercices.py --exemple <langage>` et `python3 tools/test-parcours.py --exemple <langage>` ; l'ajouter à la boucle de `.github/workflows/tests.yml`.
6. **Documenter** : ce fichier, `docs/format-contenu.md` (champs, diagnostics), le CLAUDE.md du modèle.

## Nouveau type d'exercice (sans nouveau langage)

Un type = une fonction `Q.monType = (q, onChange) => ({ el, ready(), check(), resoudre() })` dans `js/questions.js` (contrat détaillé dans CLAUDE.md). Puis : son libellé dans `KIND_NAME`, ses champs dans `TYPES` de `tools/valider-contenu.py`, sa ligne dans `docs/format-contenu.md` § 6, un exemple dans l'unité catalogue. Idées utiles pour des cours sans code : cartes à retourner (terme ↔ définition), toucher une zone d'une image (une capture d'écran, un schéma), compléter un schéma.

## Faire profiter tous les cours d'une amélioration

Une amélioration du moteur faite dans le dépôt d'un cours (nouveau module, nouveau diagnostic, correction d'affichage) se reporte ici, dans le modèle : copier les fichiers de `js/`, `css/`, `tools/` concernés, relancer les tests du modèle (avec `--exemple` pour les langages), documenter. Les autres cours la récupèrent avec `/mettre-a-jour-moteur` (`tools/mettre-a-jour-moteur.py` : leur `content/` ne change pas). Ce qui est propre à **un** cours (sa mascotte, son projet) se décrit dans `content/config.json`, jamais en code dans `js/`.
