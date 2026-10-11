---
name: nouveau-cours
description: Crée une appli d'apprentissage façon Duolingo pour un nouveau cours, à partir de ce modèle et des supports du cours (pages d'exercices, slides, PDF, site). À utiliser quand l'élève dit « /nouveau-cours », « crée l'appli de mon cours de … », ou envoie les supports d'un cours dans un dépôt créé depuis ce modèle.
---

# Nouveau cours

Tu transformes ce dépôt (créé avec « Use this template » depuis `cours-duolingo-template`) en appli d'apprentissage pour **un** cours. Le moteur ne se réécrit pas : tu écris du **contenu** (JSON), tu configures, et tu n'ajoutes un module que si la matière l'exige.

Français, tutoiement, l'élève comme seul public. **Ne jamais inventer un énoncé, une définition ou une consigne du prof** : tout vient des supports ; ce qui manque, tu le demandes.

## Économiser le temps et le quota (à respecter tout du long)

Créer un cours coûte cher surtout parce que le contexte grossit : supports entiers, unités entières, sorties de tests. Donc :
- Lis `CLAUDE.md` et `docs/format-memo.md`, **pas** `docs/format-contenu.md` en entier (seulement la section utile, au besoin, avec `grep`).
- Lis chaque support **une fois**, pour le recopier dans `docs/cours/` ; ensuite, ne relis que les fichiers d'une unité, au moment de l'écrire.
- Écris les unités dans des **contextes séparés** (étape 6), pas toutes dans cette conversation.
- Pose toutes les questions **en une fois** (étape 2), pas au fil de l'eau.
- Teste unité par unité (`--unite`), le parcours complet une seule fois à la fin ; ne colle pas des sorties de test entières, seulement les lignes en échec.
- Commite après chaque étape et chaque unité : si la session s'arrête, la suivante reprend là où on en était (`docs/programme.md` dit ce qui est fait).

## 1. Rassembler les supports

- Les supports sont dans `supports/` (déposés par l'élève, voir `supports/README.md`), ou envoyés dans la conversation (zip, PDF, liens). Le plus utile : **les énoncés exacts des exercices et des travaux notés**, car ils deviennent les boss.
- Si un site est bloqué par le réseau de l'environnement, demande à l'élève soit d'autoriser le domaine dans les réglages réseau, soit d'enregistrer les pages et de les déposer dans `supports/`. Ne confonds pas la page d'accueil (liste des TP) avec les TP eux-mêmes.
- Recopie le texte utile dans `docs/cours/` : un fichier Markdown par chapitre ou TP (`02-tableaux-exercices.md`), sans la mise en page, avec les énoncés **mot pour mot**. PDF : `pdftotext -layout`. Slides : le texte et les schémas décrits en une phrase.
- Tiens le registre `docs/cours/index.md` :

  | support (dans `supports/` ou lien) | reçu le | copie dans `docs/cours/` | unités | état |
  |---|---|---|---|---|

  Il sert à `/ajouter-supports` (savoir ce qui est déjà traité) et aux unités (savoir quoi lire).

## 2. Toutes les questions, en une fois

Après une première lecture des supports, pose **en un seul message** (outil de questions, plusieurs questions par appel) ce qui décide de la suite, avec une proposition par défaut :

1. **Profil du cours** (voir le tableau plus bas) : code, par cœur, méthodes et études de cas, langue, ou un mélange.
2. **Projet** — *seulement si les supports en contiennent un* (projet noté, travail de groupe à rendre) :
   - **le laisser de côté** : l'appli ne couvre que la théorie et les exercices ;
   - **en fil rouge** : ses critères officiels en liste à cocher dans l'appli (`config.json` → `projet`, voir `docs/format-contenu.md`), reliés aux leçons qui les enseignent ;
   - **boss pour les parties qui s'exercent** : par exemple « écrire la requête préparée du formulaire », dans l'unité qui l'enseigne.

   Les deux dernières options se combinent. Dans tous les cas, **jamais** de question sur l'organisation du projet (« que faut-il faire en premier ? ») : ça n'apprend rien.
3. **Évaluation** : un examen (format : papier, QCM, sur machine) ? une unité « examen blanc » à la fin (questions de toutes les unités, au format de l'examen, sans indice) ?
4. **Point de départ et difficultés** : ce que l'élève sait déjà (faut-il des unités de prérequis ?) et ce qui lui pose problème.
5. **Identité** : 2 ou 3 propositions de **nom**, de **mascotte** et de **couleur** principale. La **clé** de sauvegarde se déduit du nom (minuscules et tirets, définitive une fois publiée).
   - Mascotte : une forme du catalogue (`docs/mascottes.png` : œuf, éléphant, chouette, renard, goutte, livre) et un accessoire facultatif (lunettes, mortier, toque, béret, casque, nœud), adaptés à la matière. Le **cadre** (`{ }`, `<? ?>`, `$ _`) est réservé aux cours de code. Un dessin libre est possible (`mascotte.fichier`, voir `docs/format-contenu.md`).
   - Montre les propositions **en image** : écris-les dans un JSON et lance `python3 tools/apercu-mascottes.py propositions.json --sortie apercu-mascottes.png`, puis envoie l'image à l'élève (ou dis-lui de l'ouvrir) avant qu'il choisisse.

### Profils de cours

| profil | modules | ce qu'on met en avant |
|---|---|---|
| code JavaScript | `code-js` (+ `dom` s'il y a des pages web) | exercices exécutés (`trous`, `corriger`, `ecrire`), `predire`, `bug`, `parsons` ; boss de code ; badges de code |
| code PHP | `"langage": "php"`, module `code-php` | comme JavaScript : PHP 8.3 exécuté, requête HTTP simulée (formulaires, cookies, session, PDO) |
| code (autre langage : Java, Python, C, C++, C#, SQL, Bash) | `"langage": "java"` (etc.), aucun module : **code sans exécution** (`docs/modules.md`) | lire et comprendre le code avant de l'écrire : `predire` (avec `reponse` ou `choix`), `bug`, `parsons`, `pointer-code`, `qcm` en police de code ; boss « étude de cas » sur un programme du cours. Proposer d'ajouter l'exécution plus tard (un module) si l'élève y tient |
| par cœur (définitions, dates, auteurs, vocabulaire) | aucun | `assoc`, `qcm`, `vf`, `tri`, beaucoup de petites questions dans les jeux, que la répétition espacée fera revenir ; rangs et badges dans le vocabulaire du cours |
| méthodes, études de cas (UX, gestion, droit…) | aucun | `ordre`, `tri`, `qcm` sur des situations ; boss « étude de cas » ; ce qui serait une rédaction libre devient un choix, un classement ou une grille d'auto-évaluation |
| langue | aucun | `assoc`, `qcm`, `ordre` (remettre une phrase dans l'ordre), `predire` en saisie libre avec `reponse` et `accepte` (traduction courte) |

## 3. Identité de l'appli

Remplis `config.app` (nom, `nomLong`, description, `cours`, clé, accroche, mascotte, couleurs en clair **et** en sombre, `langage`, modules), puis les `rangs` et les `badges` dans le vocabulaire du cours (garde les `id` des badges du moteur). Retire l'exemple `projet` de `config.json`, ou remplace-le par celui du cours (réponse 2). Lance `python3 tools/configurer.py`. Commite.

## 4. Le programme (à faire valider AVANT d'écrire les unités)

Écris `docs/programme.md`. Il doit suffire, avec `docs/format-memo.md`, pour écrire chaque unité **sans relire le reste** :
- la liste des exercices et travaux du cours, numérotés comme dans les supports ;
- les **analogies** récurrentes du cours (3 à 6, toujours les mêmes : elles vont aussi dans « Ce cours » de `CLAUDE.md`) ;
- les **difficultés** de l'élève, et où chacune est travaillée ;
- puis **une section par unité**, toujours de la même forme :

  ```markdown
  ## u05 — Parcourir et transformer
  - Objectif : …
  - Supports : docs/cours/03-tableaux-theorie.md, docs/cours/03-tableaux-exercices.md (exercices 1 à 4)
  - Fiches : map (map : transformer chaque élément), filter (…), …     ← ids définis ICI, une seule fois pour tout le cours
  - Notions des unités précédentes à revoir : variables, fonction-flechee
  - Leçons : 1. … 2. … 3. …
  - Boss : exercice 2 du TP 2 (code) ; …
  - État : à écrire
  ```

  Les ids de fiches sont fixés dans le programme : ainsi plusieurs unités peuvent s'écrire en parallèle, en se renvoyant les unes aux autres sans conflit.

Présente le plan à l'élève (en résumé, avec le tableau des unités) et **attends sa validation**. Commite.

## 5. Les modules manquants

Si la matière demande un module d'exécution qui n'existe pas encore (Python, SQL, terminal…) et que l'élève veut du code exécuté, construis-le d'abord en suivant `docs/modules.md`, avec son unité d'exemple `tools/exemples/<langage>/` et ses tests. Propose ensuite de le reporter dans le dépôt du modèle (les cours suivants en profiteront). Sinon, le mode code sans exécution suffit (profil « code, autre langage ») : rien à construire.

## 6. Écrire les unités, chacune dans son propre contexte

1. Retire les unités d'exemple (`u01-apprendre`, `u02-catalogue`) de `config.json` et supprime leurs fichiers, ainsi que les pages inutiles de `content/pages/`. Supprime aussi `tools/exemples/` (les unités de test des langages, utiles au seul modèle) et, si le cours n'est pas en PHP, `js/vendor/php-wasm/` (18 Mo inutiles ; `/mettre-a-jour-moteur` ne remet ni l'un ni l'autre).
2. Crée tous les squelettes : `python3 tools/nouvelle-unite.py u01 "Titre"` (puis u02, u03…). Le sommaire est alors complet ; chaque unité n'a plus qu'à être remplie.
3. Pour chaque unité, lance un **sous-agent** (outil Agent) avec la compétence `ecrire-unite`, par exemple :

   > Utilise la compétence ecrire-unite pour l'unité u05 (port de test 8771). Réponds en 10 lignes au plus : ce qui est écrit, les avertissements restants, ce qui manque dans les supports.

   - Jusqu'à 3 sous-agents à la fois, chacun avec **son port** (`PORT=8771`, `8772`…), pour que leurs serveurs de test ne se gênent pas.
   - Ils n'écrivent que le fichier de leur unité. Toi, tu relis leur résumé (pas le fichier entier), tu mets à jour l'« État » dans `docs/programme.md`, et tu commites.
   - Si l'outil Agent n'est pas disponible ou si l'élève préfère étaler le travail : une unité par session, avec `/ecrire-unite u05`.
4. Si une unité signale une erreur typique sans diagnostic : ajoute le diagnostic dans le banc d'essai (`js/banc.js`), documente-le, et propose de le reporter dans le modèle.

## 7. Terminer

1. Les trois tests, tous verts : `python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py`.
2. Mets à jour la section « Ce cours » de `CLAUDE.md` (nom, source des supports et date, modules, unités, analogies, état) et relance `python3 tools/configurer.py` (il régénère `README.md` : hero avec la mascotte, unités, projet, mention du modèle).
3. Vérifie l'appli à l'œil (`python3 tools/test-parcours.py --captures`) : accueil, une leçon, un boss, en clair et en sombre.
4. Commite, pousse, et explique à l'élève comment publier : **Settings → Pages → Deploy from a branch → `main` / root** ; l'adresse sera `https://<compte>.github.io/<dépôt>/`.

Pour la suite du cours (nouveaux supports) : `/ajouter-supports`. Pour récupérer les améliorations du modèle : `/mettre-a-jour-moteur`.
