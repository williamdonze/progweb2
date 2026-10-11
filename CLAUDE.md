# ProgWeb 2 — apprendre le JavaScript en jouant

Site pédagogique façon **Duolingo** pour apprendre le JavaScript **de zéro** jusqu'à pouvoir faire **seul** les exercices du cours *Prog. Web* (HEIG-VD, Nicolas Chabloz, https://chabloz.eu/progweb/). Construit sur le modèle de **Pampre** (https://github.com/williamdonze/pampre, le « Duolingo du vin ») : même architecture, même moteur de questions, même gamification. Public : l'élève, débutant complet, francophone. Langue du site, du contenu et des commentaires : **français**, tutoiement.

## État actuel

- **Programme complet** : 15 unités, 64 leçons, 75 fiches de théorie, 15 jeux, 15 quiz, 46 boss (exercices du cours), 757 questions. **Tous les exercices des trois TP** (Fonctions, Tableaux : nombres, chaînes, jeu de cartes ; DOM) sont des boss. Détail et correspondance avec les TP : `docs/programme.md`.
- `content/pages/cards.html` et `cards.css` sont les fichiers du prof (TP DOM). `cards.html` ne garde que le contenu du `<body>` : `js/dom.js` fournit le `<head>` et injecte le CSS.
- Source des énoncés : pages du cours enregistrées le 10 octobre 2026, copiées dans `docs/cours/` (tp1-fonctions, tp2-tableaux, tp3-dom). Les boss reprennent les énoncés tels quels.
- 23 types d'exercices (dont 4 avec du code exécuté et testé), éditeur de code mobile, deux bacs à sable (Web Worker pour le JavaScript, iframe isolée avec la page du TP pour le DOM), console qui comprend les couleurs ANSI, tests automatiques, diagnostics et erreurs JavaScript traduits en français.
- **Moteur** : celui du modèle `williamdonze/cours-duolingo-template` (mis à jour le 11 octobre 2026). L'identité de l'appli est dans `content/config.json` → `app` ; sa `cle` (`progweb2`) nomme la sauvegarde des élèves : **ne jamais la changer**. Pour récupérer une nouvelle version du moteur : `/mettre-a-jour-moteur` ; une amélioration du moteur faite ici se reporte d'abord dans le modèle (`docs/modules.md`).
- Gamification de Pampre : XP, 7 rangs, badges, série de jours, défi du jour, graphique 7 jours. **Pas de vies**, volontairement (choix de l'élève).
- Répétition espacée **par notion** (boîtes de Leitner), fiches de théorie consultables partout, console libre.
- Sauvegarde `localStorage` (`progweb2-sauvegarde-v1`), export / import par code, thème clair / sombre, appli installable (PWA, hors connexion).

## Lancer

```bash
python3 -m http.server 8765      # puis http://localhost:8765/
```

Aucune dépendance, aucun build. `fetch()` et les Web Workers exigent un serveur HTTP (pas de `file://`). Seule ressource externe : Google Fonts (Baloo 2, Nunito, JetBrains Mono), avec polices de repli.

## Arborescence

```
index.html                 Coquille : charge css/app.css et les scripts js/ dans l'ordre
css/app.css                Tout le style ; jetons de couleur dans :root, redéfinis en sombre (2 blocs)
js/banc.js                 Banc d'essai (page ET worker) : jetons / coloration, affichage des valeurs, comparaison,
                           traduction des erreurs, analyse statique, diagnostics, executerTout()
js/worker.js               Web Worker : importe banc.js, exécute le code de l'élève et ses tests
js/base.js                 Utilitaires, icônes, mascotte Coco, sauvegarde, progression, répétition espacée, toasts,
                           modale, affichage du code, executer() (lance le worker, timeout 2 s), texte enrichi, fiches, illustrations
js/editeur.js              Éditeur de code maison (textarea transparente sur un <pre> coloré) + barre de symboles
js/dom.js                  Bac à sable DOM : page du TP dans une <iframe sandbox="allow-scripts">, executerDom(), apercuDom()
js/dom-harnais.js          Chargé DANS l'iframe (après banc.js) : exécute le code de l'élève comme module, joue les étapes des tests
js/questions.js            Moteur d'exercices : Q[type] pour les 23 types
js/app.js                  runSession, lancement des leçons / jeux / quiz / boss, défi du jour, vues, démarrage
content/config.json        app (nom, clé de sauvegarde, mascotte, modules code-js et dom), sommaire des unités, rangs, badges
content/unites/uNN-*.json  Une unité par fichier : fiches, leçons, jeux, quiz, boss
content/pages/             Pages web des exercices DOM (cards.html = contenu du <body>, cards.css)
tools/                     Tests et outils (voir « Tests »)
docs/format-contenu.md     LA référence du format du contenu (tous les types, les tests, les diagnostics)
docs/programme.md          Programme, correspondance unités ↔ exercices du cours, difficultés ciblées
docs/plan.md               Plan initial validé par l'élève
docs/modules.md            Les modules du moteur (code-js, dom) et comment en ajouter
.claude/skills/            /nouveau-cours, /mettre-a-jour-moteur (venues du modèle)
manifest.webmanifest, sw.js, icones/   Appli installable, hors connexion (changer CACHE dans sw.js pour vider les copies)
```

**Règle d'or : contenu ≠ code.** Ajouter une unité, une leçon, un exercice = éditer du JSON. Ne toucher `js/` que pour une nouvelle mécanique (nouveau type d'exercice, nouveau diagnostic, nouvelle vue).

## Architecture

- Scripts classiques (pas de modules), qui partagent leurs déclarations globales, chargés dans l'ordre : `banc.js`, `base.js`, `editeur.js`, `dom.js`, `questions.js`, `app.js`.
- **Contrat d'un type d'exercice** (repris de Pampre) : `Q.monType = (q, onChange) => ({ el, ready(), check(), key?, cleanup?, reouvrir?, resoudre? })`.
  - `check()` verrouille, marque juste / faux, renvoie `{ ok, answer?, answerHTML?, detailHTML?, retry? }`, ou une **promesse** (exercices de code, prédictions sans réponse écrite).
  - `retry: true` : exercice de code raté ; la feuille rouge propose « Corriger mon code » (`reouvrir()`), puis « Passer » après 3 essais. **Jamais de solution affichée.**
  - `resoudre()` : remplit la bonne réponse ; utilisé par `tools/test-parcours.py` (accessible en mode `?test` par `window.__q`).
  - Ajouter le libellé dans `KIND_NAME`, les champs dans `TYPES` de `tools/valider-contenu.py`, et la doc dans `docs/format-contenu.md`.
- **Bac à sable** : `executer({ code, donnees, tests, contexte })` (base.js) crée un Worker neuf, le tue après 2 s (boucle infinie). Dans le worker, `executerTout` (banc.js) :
  1. exécute le code une fois (« libre ») : console capturée, erreur traduite avec sa ligne ;
  2. pour chaque cas de test, relance le code (données éventuellement différentes), appelle la fonction avec des arguments **gelés** (Object.freeze profond), compare (`egal`, profonde, tolérance 1e-9 sur les nombres, types stricts) ;
  3. analyse statique (`analyseStatique`) : méthodes interdites / obligatoires, conseils (nom du paramètre, `==`, `===` entre tableaux, accolades sans return, objet sans parenthèses…) ;
  4. diagnostics (`diagnostiquer`) sur le premier cas raté : return vs console.log, forEach, texte vs nombre, spread oublié, map / filter, départ de reduce, données en dur…
  - Le code de l'élève tourne dans `new Function("console", "__donnees", "use strict" + entête + prélude + code + ";return (__n) => eval(__n);")` : la fonction retournée lit n'importe quel nom du programme (fonction à tester, variables). Décalage de lignes = 3 + nombre de données + lignes du prélude (vérifié dans Chromium).
  - Tests au hasard : `repetitions` (bornes, toutes les valeurs), `verifie` (propriété du résultat), `melange` (Fisher–Yates : compte les ordres sur des dizaines de milliers d'essais ; 3 éléments × 24 000 ou 4 × 96 000, sinon le hasard seul fait échouer une bonne solution).
- **Bac à sable DOM** (champ `dom` d'un exercice, d'une carte ou d'un exemple) : `executerDom` (dom.js) crée une iframe cachée `sandbox="allow-scripts"` (sans `allow-same-origin` : ni l'appli ni la sauvegarde ne sont accessibles) avec la page, `banc.js` et `dom-harnais.js` ; le harnais importe le code de l'élève comme module (blob), capture la console, joue `tests.etapes` (clics, scripts) et vérifie le DOM (`compter`, `identique`, `vrai`, `sortie`), puis renvoie un résultat au même format que `executerTout`. L'analyse statique (interdit, obligatoire, conseils) est la même. Délai : 4 s. « Exécuter » affiche la même page, visible et cliquable (`apercuDom`).
- **Progression** : unité ouverte si première, ou déjà ouverte (`ST.ouvertes`), ou quiz précédent validé (80 %). Nœuds du parcours ouverts l'un après l'autre. Identifiants explicites partout : ajouter du contenu ne casse jamais une sauvegarde. Ne **jamais** changer l'`id` d'un élément existant.
- **Répétition espacée** : `noterNotions(q, ok)` après chaque question (ok seulement si réussi au premier essai sans indice) ; boîtes 1 à 5, intervalles 1, 2, 4, 8, 16 jours ; une erreur ramène à la boîte 1, due aujourd'hui. Le défi du jour prend d'abord une question par notion due, puis les erreurs récentes (`ST.erreurs`), puis des révisions (1 exercice de code au plus).

## Exigences pédagogiques (importantes)

- **Ne jamais donner la solution** d'un exercice de code. À la place : 3 indices progressifs (léger → précis → squelette à trous), débloqués par l'élève. Le champ `solution` ne sert qu'aux tests automatiques.
- Analogies concrètes, toujours les mêmes : tableau = **boîte d'œufs** (élément = œuf, nom au singulier) ; `reduce` = **porte-monnaie** ; `return` / `console.log` = **cuisinier** qui tend le plat / le montre par la fenêtre ; spread `...` = **sortir les œufs de la boîte** ; fonction = **recette** ; portée = **pièces** d'une maison.
- Leçons courtes (4 à 6 cartes, 5 à 8 exercices) : une notion à la fois, exercices variés, puis mélange avec les notions précédentes.
- Exemples avec **d'autres données** que celles du cours (fruits, prix, élèves, notes, t-shirts) ; les boss reprennent les données du cours **et** testent d'autres données (tableau vide, négatifs, longueur paire…), comme l'exige le cours (« vos solutions se doivent de rester fonctionnelles même si le tableau initial diffère »).
- Contraintes du cours vérifiées : tableau d'origine gelé (toute mutation plante), méthodes mutantes interdites (`interdit`), méthode de l'unité obligatoire (`obligatoire`).
- Chaque question a une `explication` ; chaque exercice de code a des `erreursTypiques` (les vraies erreurs de l'élève, liste dans `docs/programme.md`) avec le diagnostic attendu.
- Ton : chaleureux, encourageant, jamais condescendant. Tutoiement.

## Procédure : « voici la nouvelle page de TP »

Quand l'élève donne le lien (ou le contenu) d'une nouvelle page de TP :

1. **Lire la page et lister les exercices.** Le domaine `chabloz.eu` est souvent bloqué dans les environnements cloud : demander alors à l'élève d'autoriser `chabloz.eu` dans les réglages réseau de l'environnement, ou d'enregistrer **la page du TP elle-même** (pas seulement la liste des TP) et de l'envoyer (zip). Attention : les énoncés de `Chabloz/im` sur GitHub (version 2024) **diffèrent** de la version actuelle (exercices 8 à 10 des fonctions, jeu de cartes au lieu des cercles) : ne pas s'y fier. **Ne jamais inventer un énoncé** : signaler ce qui manque.
   Si de nouveaux exercices s'insèrent au milieu du programme, on peut insérer une unité : la progression est indexée par identifiant (une unité déjà ouverte le reste).
2. **Repérer les nouvelles notions** par rapport aux fiches existantes (`grep '"id"' content/unites/*.json`, `docs/programme.md`).
3. **Créer les leçons et les fiches** de ces notions (une unité `content/unites/uNN-nom.json`, ou plusieurs), avec plusieurs types d'exercices par leçon, des analogies, d'autres données que celles du cours, et des révisions des notions précédentes (questions de leçon, quiz : 2 à 3 révisions).
4. **Créer les boss** à partir des exercices du prof : énoncé tel quel (`enonce`), `source`, `regles` du cours, `donnees` du cours, tests avec d'autres données et cas limites, 3 indices, `solution` (jamais affichée), `erreursTypiques` avec diagnostics.
5. **Intégrer et vérifier** : ajouter le fichier dans `content/config.json` (`unites`), retirer l'entrée correspondante de `aVenir`, mettre à jour `docs/programme.md` et l'état ci-dessus, puis lancer les trois tests (tous verts) :
   `python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py`
   Si un diagnostic manque pour une erreur typique nouvelle, l'ajouter dans `js/banc.js` (`diagnostiquer` ou `analyseStatique`) plutôt que de s'en passer, et le documenter dans `docs/format-contenu.md`.

## Tests

Installation (une fois) : `pip install playwright && playwright install chromium` (sinon les outils utilisent un Chromium déjà présent : variable `CHROMIUM` ou `/opt/pw-browsers`).

```bash
python3 tools/valider-contenu.py        # structure du contenu, ids, champs, liens (sans navigateur, < 1 s)
python3 tools/tester-exercices.py       # dans Chromium, avec le vrai bac à sable : chaque solution passe, chaque erreur
                                        # typique échoue avec le bon diagnostic, chaque « prédire » est juste, chaque exemple tourne
                                        # (--unite u05 pour une seule unité, --avertissements pour tout voir)
python3 tools/test-parcours.py          # parcours complet : toutes les leçons, jeux, quiz et boss, dans l'ordre, par l'interface ;
                                        # code faux puis corrigé, Fisher–Yates en vrais clics, défi du jour, vues, sauvegarde
                                        # (--captures : une capture par type d'exercice dans tools/captures/, non versionné)
python3 tools/configurer.py             # après un changement de config.app : index.html, manifest, sw.js, icônes
```

GitHub Actions (`.github/workflows/tests.yml`) lance les trois tests à chaque push.

## Design

- Mode Duolingo de Pampre : boutons « 3D », nœuds ronds en zigzag, feuille de correction verte / rouge qui monte du bas, mascotte (Coco, un œuf entre deux accolades).
- Jetons CSS dans `:root`, redéfinis pour le sombre dans `@media (prefers-color-scheme: dark)` **et** `:root[data-theme="dark"]` : toute nouvelle couleur doit exister dans les trois blocs. Texte : jetons « ink » (`--prim-ink`, `--ok-ink`…). Coloration syntaxique : `--sy-*`.
- Mobile d'abord (colonne de 680 px), zones tactiles ≥ 44 px, police de code à 16 px dans l'éditeur au doigt (sinon iOS zoome), pas de ligatures dans le code (`=>` doit se lire comme on le tape).

## Limites connues

- Une seule exécution à la fois par exercice ; timeout fixe de 2 s.
- Les erreurs de syntaxe n'ont pas de numéro de ligne dans Chromium : il est déduit d'une analyse des parenthèses et des mots sans guillemets (`verifierParentheses`, `texteSansGuillemets`).
- Le harnais DOM ne voit pas les variables du module de l'élève : pour appeler une de ses fonctions dans un test, la déclarer dans `tests.exposer`.
- `test-parcours.py` joue tout le parcours (environ 6 minutes, surtout les mélanges et les pages DOM).
