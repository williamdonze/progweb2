---
name: ajouter-supports
description: Ajoute à l'appli d'un cours déjà créé les nouveaux supports reçus en cours d'année (slides, énoncés de TP, PDF, page de TP, consignes de projet) : repère ce qui est nouveau, propose les unités ou compléments, puis les écrit et les teste. À utiliser quand l'élève tape « /ajouter-supports », dépose des fichiers dans supports/, ou dit « voici la nouvelle page de TP / le nouveau chapitre ».
---

# Ajouter des supports à un cours existant

Le cours existe déjà (`docs/programme.md`, `content/unites/`). L'élève a reçu la suite : tu l'intègres **sans casser sa progression**. Français, tutoiement. Rien d'inventé.

## 1. Repérer ce qui est nouveau

- Les fichiers de `supports/` absents du registre `docs/cours/index.md`, plus ce que l'élève a envoyé dans la conversation (zip, lien, page).
- Un site bloqué par le réseau : demander à l'élève d'autoriser le domaine dans les réglages réseau, ou d'enregistrer la page et de la déposer dans `supports/`. Ne pas confondre la page d'accueil (liste des TP) et les TP.
- Recopie le texte utile dans `docs/cours/` (énoncés mot pour mot ; PDF : `pdftotext -layout`), ajoute les lignes au registre.

## 2. Comparer avec le cours existant

Sans relire les unités entières :
- les notions déjà couvertes : `python3 tools/valider-contenu.py --fiches` et les sections de `docs/programme.md` ;
- les unités annoncées dans « Bientôt » (`config.json` → `aVenir`) ;
- le projet (`config.json` → `projet`), si les nouveaux supports en précisent les critères.

Classe chaque nouveauté : **nouvelle unité** (nouvelle notion), **complément** d'une unité existante (un exercice de plus sur une notion vue → un boss, une leçon), **projet** (nouveaux critères), **correction** (le prof a précisé une consigne).

## 3. Proposer, puis attendre l'accord

Un court tableau : nouveauté → ce que tu en fais (unité `uNN` « titre », boss dans `u05`, critère de projet…), avec les fiches prévues. Si les supports contiennent un projet qui n'était pas encore là, pose la question du projet de `/nouveau-cours` (de côté, fil rouge, boss pour les parties qui s'exercent). Attends la validation.

## 4. Écrire

1. `docs/programme.md` : une section `## uNN` par nouvelle unité (même forme que les autres : objectif, supports, fiches avec leurs ids, leçons, boss, état), et les compléments dans les sections existantes.
2. Nouvelles unités : `python3 tools/nouvelle-unite.py uNN "Titre" [--apres uMM]` (retire l'unité de « Bientôt » si elle y était), puis un sous-agent par unité avec la compétence `ecrire-unite` (un port de test chacun : 8771, 8772…), comme à l'étape 6 de `/nouveau-cours`. Sans outil Agent : écris-les toi-même, une par une, en suivant `ecrire-unite`.
3. Compléments : même compétence, sur l'unité existante, avec la consigne « compléter : … ». Nouveaux ids seulement, jamais de renommage.
4. Projet : critères ajoutés à `config.json` → `projet.criteres` (nouveaux ids).

## 5. Terminer

1. `python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py`.
2. « Ce cours » dans `CLAUDE.md` (unités, état, date des supports), registre `docs/cours/index.md` (état : traité), `python3 tools/configurer.py --sans-icones` (README à jour).
3. Commite, pousse, et dis à l'élève ce qui a été ajouté (quelles unités, quels boss) : sa progression est conservée, les nouvelles unités s'ouvrent dans l'ordre du parcours.
