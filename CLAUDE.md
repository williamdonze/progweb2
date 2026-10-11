# ProgWeb 2 — apprendre le JavaScript en jouant

Ce dépôt est un **modèle** : un moteur d'apprentissage façon **Duolingo** (leçons courtes, exercices interactifs, XP, séries, badges, défi du jour, répétition espacée), sans aucun cours dedans, sauf deux unités d'exemple. On crée l'appli d'un cours avec **« Use this template »** sur GitHub, puis la compétence **`/nouveau-cours`** (`.claude/skills/nouveau-cours/SKILL.md`) la remplit à partir des supports du cours ; **`/ajouter-supports`** intègre la suite du cours, **`/mettre-a-jour-moteur`** récupère les améliorations du modèle.

Il descend de **Pampre** (le « Duolingo du vin », https://github.com/williamdonze/pampre) et de **ProgWeb 2** (JavaScript, https://github.com/williamdonze/progweb2), d'où viennent le moteur, le bac à sable de code et l'unité « catalogue ». Public : l'élève, francophone. Langue du site, du contenu et des commentaires : **français**, tutoiement.

## Ce cours

**ProgWeb 2** : apprendre le JavaScript **de zéro** jusqu'à faire **seul** les exercices du cours *Prog. Web* (HEIG-VD, Nicolas Chabloz, https://chabloz.eu/progweb/). Premier cours construit sur le modèle de **Pampre** ; le modèle `cours-duolingo-template` en est issu. Public : l'élève, débutant complet. Choix de l'élève : nom « ProgWeb 2 », **pas de vies**.

- **Identité** : `config.app` → nom « ProgWeb 2 », mascotte Coco (un œuf entre accolades), **clé de sauvegarde `progweb2` : ne jamais la changer** (les élèves perdraient leur progression), modules `code-js` et `dom`.
- **Programme complet** : 15 unités, 64 leçons, 75 fiches, 15 jeux, 15 quiz, 46 boss, 757 questions. **Tous les exercices des trois TP** (Fonctions ; Tableaux : nombres, chaînes, jeu de cartes ; DOM) sont des boss. Correspondance unités ↔ exercices et difficultés de l'élève : `docs/programme.md`.
- **Supports** : pages du cours enregistrées le 10 octobre 2026, copiées dans `docs/cours/` (tp1-fonctions, tp2-tableaux, tp3-dom). Les boss reprennent les énoncés tels quels. `content/pages/cards.html` et `cards.css` sont les fichiers du prof (TP DOM) ; `cards.html` ne garde que le contenu du `<body>`.
- **Analogies récurrentes** : tableau = **boîte d'œufs** (élément = œuf, nom au singulier) ; `reduce` = **porte-monnaie** ; `return` / `console.log` = **cuisinier** qui tend le plat / le montre par la fenêtre ; spread `...` = **sortir les œufs de la boîte** ; fonction = **recette** ; portée = **pièces** d'une maison ; comparateur = **arbitre** ; Fisher–Yates = **chapeau**.
- **Contraintes du cours vérifiées par les tests** : tableau d'origine gelé (toute mutation plante), méthodes mutantes interdites (`interdit`), méthode de l'unité obligatoire (`obligatoire`), solutions testées avec d'autres données (« vos solutions se doivent de rester fonctionnelles même si le tableau initial diffère »).
- **Nouvelle page de TP** : `chabloz.eu` est souvent bloqué dans les environnements cloud (demander d'autoriser le domaine ou d'envoyer la page enregistrée, pas seulement la page d'accueil des TP). Les énoncés de `Chabloz/im` sur GitHub (version 2024) **diffèrent** de la version actuelle : ne pas s'y fier.
- **Particularités** : `test-parcours.py` dure environ 6 minutes (mélanges de Fisher–Yates testés sur des dizaines de milliers d'essais, pages DOM). Les boss ne bloquent pas l'unité suivante (choix discuté avec l'élève, gardé tel quel).

## Lancer

```bash
python3 -m http.server 8765      # puis http://localhost:8765/
```

Aucune dépendance, aucun build. `fetch()` et les Web Workers exigent un serveur HTTP (pas de `file://`). Seule ressource externe : Google Fonts (Baloo 2, Nunito, JetBrains Mono), avec polices de repli.

## Arborescence

```
index.html                 Coquille : charge css/app.css et les scripts js/ dans l'ordre (titre et icône écrits par tools/configurer.py)
css/app.css                Tout le style ; jetons de couleur dans :root, redéfinis en sombre (2 blocs) ; config.app.couleurs les surcharge
js/base.js                 APP (identité, depuis config.app), utilitaires, icônes, mascottes (catalogue, accessoires), sauvegarde, progression, répétition espacée,
                           toasts, modale, appli sur l'écran d'accueil (iOS / Android), affichage du code, executer() (worker, 2 s), texte enrichi, fiches, illustrations
js/questions.js            Moteur d'exercices : Q[type] pour les 23 types
js/app.js                  runSession, leçons / jeux / quiz / boss (code ou étude de cas), défi du jour, vues, démarrage
js/langages.js             Les langages du code (JS, PHP, Java, Python, C, C++, C#, SQL, Bash) : coloration, symboles, textes, exécution
js/banc.js, js/worker.js   Module code-js : banc d'essai JavaScript (tests, diagnostics, erreurs traduites), Web Worker
js/editeur.js              L'éditeur de code (barre de symboles et indentation du langage du cours)
js/php.js, js/vendor/php-wasm/   Module code-php : PHP 8.3 en WebAssembly, requête simulée, tests, erreurs traduites (tools/php-wasm/ le reconstruit)
js/dom.js, js/dom-harnais.js                Module dom : page web dans une iframe isolée, harnais de test
content/config.json        app (nom, clé, mascotte, couleurs, modules), sommaire des unités, projet (facultatif), rangs, badges
content/unites/uNN-*.json  Une unité par fichier : fiches, leçons, jeux, quiz, boss
content/pages/             Pages web des exercices DOM (module dom)
tools/                     Tests et outils (voir « Tests »), configurer.py, build-icones.py, generer-readme.py, apercu-mascottes.py,
                           nouvelle-unite.py (squelette d'unité), mettre-a-jour-moteur.py (moteur du modèle → cours),
                           exemples/ (une unité de test par langage : php, java ; modèle seulement)
supports/                  Les supports bruts déposés par l'élève (slides, PDF, énoncés) ; registre dans docs/cours/index.md
docs/format-contenu.md     LA référence du format du contenu (config, tous les types, tests, diagnostics, boss)
docs/format-memo.md        Le mémo court du format : de quoi écrire une unité sans lire la référence entière
docs/modules.md            Les modules, et comment en ajouter un (PHP, terminal…)
docs/feuille-de-route.md   Les améliorations prévues du modèle, par lots (à cocher)
.claude/skills/            nouveau-cours (créer l'appli d'un cours), ecrire-unite (une unité, dans son propre contexte),
                           ajouter-supports (la suite du cours), mettre-a-jour-moteur (récupérer les améliorations du modèle)
manifest.webmanifest, sw.js, icones/   Appli installable, hors connexion (configurer.py change le nom du cache)
```

**Règle d'or : contenu ≠ code.** Ajouter une unité, une leçon, un exercice = éditer du JSON. Ne toucher `js/` que pour une nouvelle mécanique (nouveau type, nouveau module, nouveau diagnostic, nouvelle vue), et la reporter alors dans ce modèle.

## Architecture

- Scripts classiques (pas de modules ES), qui partagent leurs déclarations globales, chargés dans l'ordre : `langages.js`, `banc.js`, `base.js`, `editeur.js`, `dom.js`, `php.js`, `questions.js`, `app.js`.
- **Langage du code** (`config.app.langage`, `js/langages.js`) : `LANG` porte tout ce qui change d'un langage à l'autre (jetons de coloration, symboles, indentation, textes, données du cours, `executer`). `aCode()` dit si le cours exécute son code (le module du langage est actif) ; sinon c'est le mode **code sans exécution** (onglet Console et boutons « Exécuter » masqués, seulement des exercices qui n'exécutent pas). Ne jamais écrire « console.log » ou supposer du JavaScript ailleurs que dans la définition du langage.
- **Identité** : au démarrage, `boot()` lit `content/config.json` puis `appliquerApp(config.app)` remplit `APP` (nom, clé, mascotte, textes, modules), la clé de sauvegarde (`<cle>-sauvegarde-v1`), les couleurs (balise `<style id="couleurs-app">`) et le logo. `aModule("code-js")` dit si un module est actif (onglet Console, boutons « Exécuter »).
- **Contrat d'un type d'exercice** (repris de Pampre) : `Q.monType = (q, onChange) => ({ el, ready(), check(), key?, cleanup?, reouvrir?, resoudre? })`.
  - `check()` verrouille, marque juste / faux, renvoie `{ ok, answer?, answerHTML?, detailHTML?, retry? }`, ou une **promesse** (exercices de code).
  - `retry: true` : exercice de code raté ; « Corriger mon code », puis « Passer » après 3 essais. **Jamais de solution affichée.**
  - `resoudre()` : remplit la bonne réponse ; utilisé par `tools/test-parcours.py` (mode `?test`, `window.__q`).
  - Ajouter le libellé dans `KIND_NAME`, les champs dans `TYPES` de `tools/valider-contenu.py`, la doc dans `docs/format-contenu.md`, un exemple dans `u02-catalogue`.
- **Boss** : un boss de code (type `boss`, module `code-js`) ou une **étude de cas** (`questions` : scénario + questions de tout type, réussie au seuil de validation, `startEtude`).
- **Projet** (facultatif, `config.projet`) : le projet noté du cours en fil rouge, vue « Projet » ouverte depuis l'accueil ; ses critères officiels en liste à cocher (`ST.projet`), reliés aux fiches et aux unités. Jamais de quiz ni de boss sur l'organisation d'un projet.
- **Bac à sable de code** : `executer({ code, donnees, prelude, tests, contexte, …champsExec(q) })` appelle l'exécution du langage du cours. JavaScript (module `code-js`) : `executerJs` crée un Worker neuf, tué après 2 s ; `executerTout` (banc.js) exécute, teste chaque cas avec des arguments gelés, analyse le code (interdit, obligatoire, conseils), diagnostique le premier cas raté. PHP (module `code-php`, `js/php.js`) : un Worker gardé vivant, PHP en WebAssembly téléchargé au premier exercice de code puis gardé en cache, chaque exécution étant une requête HTTP simulée neuve. Détails dans `docs/format-contenu.md` et `docs/modules.md`.
- **Bac à sable DOM** (module `dom`) : iframe `sandbox="allow-scripts"` (sans accès à l'appli ni à la sauvegarde), code de l'élève importé comme module, `tests.etapes` (clics, scripts, comptages).
- **Progression** : unité ouverte si première, déjà ouverte (`ST.ouvertes`) ou quiz précédent validé (seuil 80 %). Les boss ne bloquent pas la suite. Identifiants explicites partout : ajouter du contenu ne casse jamais une sauvegarde. Ne **jamais** changer l'`id` d'un élément existant, ni `app.cle` une fois publié.
- **Répétition espacée** : `noterNotions(q, ok)` après chaque question ; boîtes 1 à 5, intervalles 1, 2, 4, 8, 16 jours ; une erreur ramène à la boîte 1. Le défi du jour prend d'abord les notions dues, puis les erreurs récentes, puis des révisions.

## Exigences pédagogiques (valables pour tous les cours)

- **Ne jamais donner la solution** d'un exercice. À la place : 3 indices progressifs (léger → précis → squelette à trous). Le champ `solution` ne sert qu'aux tests automatiques.
- **Ne jamais inventer** un énoncé ou une consigne du prof : tout vient des supports (copiés dans `docs/cours/`) ; ce qui manque se demande.
- **Analogies** concrètes et récurrentes, propres à chaque cours (3 à 6, listées dans « Ce cours »), toujours les mêmes d'une leçon à l'autre.
- Leçons courtes (4 à 6 cartes, 5 à 8 exercices) : une notion à la fois, exercices variés, puis mélange avec les notions précédentes.
- Exemples avec **d'autres données** que celles du cours ; les **boss** reprennent les exercices du cours tels quels **et** testent d'autres cas.
- Chaque question a une `explication` ; chaque exercice de code a des `erreursTypiques` avec le diagnostic attendu ; les difficultés propres de l'élève sont listées dans `docs/programme.md` avec l'endroit où chacune est travaillée.
- Ton : chaleureux, encourageant, jamais condescendant. Tutoiement.

## Procédures

- **Nouveau cours** : `/nouveau-cours` (supports → toutes les questions en une fois → identité → programme validé par l'élève → modules → une unité par sous-agent avec `/ecrire-unite` → tests → README → publication).
- **Suite du cours** (nouveaux supports, nouvelle page de TP) : `/ajouter-supports` (registre `docs/cours/index.md`, proposition validée par l'élève, nouvelles unités ou compléments sans changer un seul `id`).
- **Une unité à la fois** (reprendre, étaler le travail sur plusieurs sessions) : `/ecrire-unite uNN`.
- **Récupérer les améliorations du modèle** dans un cours : `/mettre-a-jour-moteur`.
- **Nouveau module** (PHP, SQL, terminal…) : `docs/modules.md`.
- **Amélioration du moteur** faite dans un cours : la reporter ici (mêmes fichiers `js/`, `css/`, `tools/`), relancer les tests du modèle. Ce qui est propre à un cours va dans `content/` (données), jamais dans les fichiers communs : sinon `/mettre-a-jour-moteur` l'écrase.
- **Améliorations prévues** : `docs/feuille-de-route.md` (par lots, à cocher).

## Tests

Installation (une fois) : `pip install playwright && playwright install chromium` (sinon les outils utilisent un Chromium déjà présent : variable `CHROMIUM` ou `/opt/pw-browsers`). Port : 8765 (`PORT=8790` pour en changer ; les outils refusent un port occupé par un autre site).

```bash
python3 tools/valider-contenu.py        # structure du contenu, ids, champs, liens, modules (sans navigateur, < 1 s)
python3 tools/tester-exercices.py       # dans Chromium : chaque solution passe, chaque erreur typique échoue avec le bon diagnostic,
                                        # chaque « prédire » est juste, chaque exemple tourne (--unite u02, --avertissements)
python3 tools/test-parcours.py          # tout le parcours par l'interface, défi du jour, vues, sauvegarde (--captures)
# dans le modèle, chaque langage a son unité d'exemple : --exemple php (PHP exécuté), --exemple java (sans exécution)
for x in php java; do python3 tools/valider-contenu.py --exemple $x && python3 tools/tester-exercices.py --exemple $x && python3 tools/test-parcours.py --exemple $x; done
python3 tools/configurer.py             # après un changement de config.app : index.html, manifest, sw.js, icônes, README (--sans-icones)
python3 tools/valider-contenu.py --fiches   # + la liste des fiches par unité (pour s'y relier)
python3 tools/apercu-mascottes.py --catalogue   # docs/mascottes.png ; avec un JSON de propositions : l'aperçu à montrer à l'élève
```

GitHub Actions (`.github/workflows/tests.yml`) lance les trois tests à chaque push.

## Design

- Mode Duolingo de Pampre : boutons « 3D », nœuds ronds en zigzag, feuille de correction verte / rouge qui monte du bas, mascotte du cours : une forme du catalogue (`MASCOTTES` dans `js/base.js` : œuf, éléphant, chouette, renard, goutte, livre), un accessoire (`ACCESSOIRES`), un « cadre » pour les cours de code, ou un dessin libre (`mascotte.fichier`). Catalogue en image : `docs/mascottes.png`. Ce qui est propre à un cours se décrit dans `config.json`, jamais en code dans `js/base.js`.
- Jetons CSS dans `:root`, redéfinis pour le sombre dans `@media (prefers-color-scheme: dark)` **et** `:root[data-theme="dark"]` : toute nouvelle couleur doit exister dans les trois blocs (et `config.app.couleurs` a un bloc `clair` et un bloc `sombre`).
- Appli installable : sur téléphone (jamais sur ordinateur ni en `?test`), une fenêtre propose l'ajout à l'écran d'accueil après la première leçon (invite native sur Android, mode d'emploi selon le navigateur sur iOS), puis 14 jours après chaque « plus tard » ; toujours accessible dans Profil.
- Accueil : un clic sur la bannière d'une unité la replie (`ST.repliees` ; sans choix de l'élève, une unité terminée est repliée), et le bouton flottant « Reprendre » apparaît quand l'étape en cours est hors de l'écran (il y ramène et déplie son unité).
- Mobile d'abord (colonne de 680 px), zones tactiles ≥ 44 px, police de code à 16 px dans l'éditeur au doigt, pas de ligatures dans le code.

## Limites connues

- Deux langages exécutés (JavaScript, PHP) ; Java, Python, C, C++, C#, SQL et Bash sont colorés mais pas exécutés (mode « code sans exécution ») ; un module d'exécution s'ajoute en suivant `docs/modules.md`.
- Les exercices à réponse libre (rédiger un persona, une argumentation) ne sont pas corrigés automatiquement : les transformer en choix, classements, repérages d'erreurs, ou en grille d'auto-évaluation.
- Un cours exécute un seul langage. Les types qui évaluent du JavaScript (`reduce-pas`, `filtre-visuel`, `map-visuel`, `types-chaine`, `fisher-yates`, `pointer-tableau`, `objet`) n'existent que pour les cours de JavaScript.
