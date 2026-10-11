---
name: nouveau-cours
description: Crée une appli d'apprentissage façon Duolingo pour un nouveau cours, à partir de ce modèle et des supports du cours (pages d'exercices, slides, PDF, site). À utiliser quand l'élève dit « /nouveau-cours », « crée l'appli de mon cours de … », ou envoie les supports d'un cours dans un dépôt créé depuis ce modèle.
---

# Nouveau cours

Tu transformes ce dépôt (créé avec « Use this template » depuis `cours-duolingo-template`) en appli d'apprentissage pour **un** cours. Lis d'abord `CLAUDE.md` (architecture, exigences pédagogiques), `docs/format-contenu.md` (format du contenu) et `docs/modules.md` (modules). Le moteur ne se réécrit pas : tu écris du **contenu** (JSON), tu configures, et tu n'ajoutes un module que si la matière l'exige.

Travaille en français, tutoiement, avec l'élève comme seul public. **Ne jamais inventer un énoncé, une définition ou une consigne du prof** : tout vient des supports ; ce qui manque, tu le demandes.

## 1. Rassembler les supports

- Demande ce qui existe : pages d'exercices / TP, slides de théorie, consignes des travaux, examens blancs, site du cours. Le plus utile : **les énoncés exacts des exercices et des travaux notés**, car ils deviennent les boss.
- Si un site est bloqué par le réseau de l'environnement, demande à l'élève soit d'autoriser le domaine dans les réglages réseau, soit d'enregistrer les pages (« Enregistrer sous… → Page web complète », ou un zip) et de les envoyer. Attention à ne pas confondre la page d'accueil (liste des TP) avec les TP eux-mêmes.
- Copie le texte utile des supports dans `docs/cours/` (un fichier Markdown par TP ou chapitre, avec la date) : c'est la référence des boss.

## 2. Identité de l'appli

Demande (ou propose, et fais valider) : le **nom** de l'appli, une **mascotte** (nom et cadre : `["{", "}"]` pour du code, `["<?", "?>"]` pour du PHP, `["$", "_"]` pour un terminal, `[]` sinon), une **couleur** principale, et la **clé** de sauvegarde (minuscules et tirets, définitive une fois publiée). Choisis les **modules** :

| matière | modules |
|---|---|
| JavaScript | `code-js` (+ `dom` s'il y a des pages web) |
| autre langage (PHP, SQL, Python…) | un nouveau module, voir `docs/modules.md` (étape 4) |
| ligne de commande, serveurs | types sans code + configuration à trous ; un terminal simulé est un nouveau module |
| théorie, méthodes, par cœur (UX, droit, gestion…) | aucun : types sans code et boss « étude de cas » |

Remplis `config.app` (et les `rangs` et `badges` dans le vocabulaire du cours), puis lance `python3 tools/configurer.py`.

## 3. Le programme (à faire valider AVANT d'écrire les unités)

Écris `docs/programme.md` :
- la liste des exercices / travaux du cours, numérotés comme dans les supports ;
- les **unités** : chacune enseigne une notion cohérente (leçons de 5 minutes), dans l'ordre où les notions s'apprennent, avec des unités de **prérequis** si l'élève part de zéro ;
- pour chaque unité, ses **boss** = les exercices du cours qu'elle permet de faire seul ;
- les **difficultés** à cibler (demande à l'élève ce qui lui pose problème) et où chacune est travaillée ;
- les **analogies** récurrentes du cours (3 à 6, toujours les mêmes : elles vont aussi dans CLAUDE.md).

Présente ce plan à l'élève (en résumé, avec le tableau des unités) et **attends sa validation**.

## 4. Les modules manquants

Si la matière demande un module qui n'existe pas encore (PHP, terminal…), construis-le d'abord en suivant `docs/modules.md`, avec ses tests, avant d'écrire les unités qui l'utilisent. Propose ensuite de reporter ce module dans le dépôt du modèle.

## 5. Écrire les unités

- Retire les unités d'exemple (`u01-apprendre`, `u02-catalogue`) de `config.json` et supprime leurs fichiers (l'unité catalogue reste consultable dans le dépôt du modèle). Retire de `content/pages/` les pages qui ne servent pas.
- Une unité à la fois : `content/unites/uNN-nom.json`, ajoutée à `config.json`, puis `python3 tools/valider-contenu.py` et `python3 tools/tester-exercices.py --unite uNN` jusqu'au vert, avant de passer à la suivante.
- Pour chaque unité : 3 à 5 fiches, 3 à 5 leçons (4 à 6 cartes, 5 à 8 exercices de types variés, d'autres données que celles du cours), un jeu, un quiz de 15 à 18 questions (dont 2 ou 3 révisions des unités précédentes), et ses boss.
- **Boss** : l'énoncé du prof tel quel (`enonce`), sa `source`, les `regles` du cours, et selon la matière :
  - exercice de code : tests avec les données du cours **et** d'autres données (vide, négatifs, cas limites), 3 indices progressifs, `solution` (jamais affichée), `erreursTypiques` avec le diagnostic attendu ;
  - cours sans code : **étude de cas** (scénario + 4 à 8 questions qui reproduisent ce qu'on attend dans le travail noté).
- Pour du par cœur (définitions, auteurs, listes à connaître) : des QCM, des associations, du classement, et beaucoup de petites questions dans les jeux, que la répétition espacée fera revenir.
- Si une erreur typique de l'élève n'a pas de diagnostic, ajoute-le dans le banc d'essai plutôt que de t'en passer, et documente-le.

## 6. Terminer

1. Les trois tests, tous verts : `python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py`.
2. Mets à jour `CLAUDE.md` (section « Ce cours » : nom, source des supports, unités, analogies, état) et `README.md` (nom, description, lien du site).
3. Vérifie l'appli à l'œil (captures avec `tools/test-parcours.py --captures`) : accueil, une leçon, un boss, en clair et en sombre.
4. Commite, pousse, et explique à l'élève comment publier : **Settings → Pages → Deploy from a branch → `main` / root** ; l'adresse sera `https://<compte>.github.io/<dépôt>/`.

Quand l'élève enverra plus tard un nouveau TP, suis la procédure « nouvelle page de TP » de `CLAUDE.md`.
