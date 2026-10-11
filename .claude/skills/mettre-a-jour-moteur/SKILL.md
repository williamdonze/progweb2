---
name: mettre-a-jour-moteur
description: Récupère dans l'appli d'un cours la dernière version du moteur du modèle cours-duolingo-template (corrections, nouvelles fonctions, compétences), sans toucher au contenu du cours. À utiliser quand l'élève tape « /mettre-a-jour-moteur » ou demande de récupérer les améliorations du modèle.
---

# Mettre à jour le moteur d'un cours

Le dépôt d'un cours est une copie du modèle à une date donnée ; ce qui a été amélioré depuis dans le modèle n'y est pas. `tools/mettre-a-jour-moteur.py` recopie le moteur (`js/`, `css/`, `tools/`, compétences, docs du format, `CLAUDE.md` sauf « Ce cours ») ; le contenu (`content/`, `docs/cours/`, `docs/programme.md`) n'est jamais touché.

Si ce dépôt n'a pas encore l'outil (cours créé avant lui), récupère-le d'abord : `curl -sL https://raw.githubusercontent.com/williamdonze/cours-duolingo-template/main/tools/mettre-a-jour-moteur.py -o tools/mettre-a-jour-moteur.py` (ou copie-le depuis un clone du modèle).

## 1. Préparer

- `git status` doit être propre (sinon : commiter ou mettre de côté d'abord).
- Repère les **modifications propres au cours** dans les fichiers communs, qui seraient écrasées : `git log --oneline -- js css tools index.html` (les commits après le premier). Exemples : un module ajouté (`js/php.js` et ses branchements dans `js/base.js`, `js/questions.js`), une mascotte dessinée dans `js/base.js`, un diagnostic dans `js/banc.js`.
- `python3 tools/mettre-a-jour-moteur.py --essai` : liste des fichiers nouveaux, mis à jour, et propres au cours (gardés).

## 2. Décider avec l'élève

S'il y a des modifications propres au cours dans des fichiers communs, explique-les en une phrase chacune et propose, dans l'ordre :
1. **les reporter dans le modèle** (le mieux : tous les cours en profitent, et la prochaine mise à jour ne les écrasera plus) — c'est un travail dans le dépôt du modèle, à faire avant ;
2. sinon, **les réappliquer** après la mise à jour (à refaire à chaque fois) ;
3. ou **ne pas mettre à jour** ces fichiers-là.

Si le modèle sait déjà faire la même chose autrement (par exemple une mascotte du catalogue au lieu d'un dessin dans `js/base.js`), propose de passer à sa façon de faire : un champ dans `config.json` au lieu de code.

## 3. Mettre à jour

```bash
python3 tools/mettre-a-jour-moteur.py
python3 tools/configurer.py          # identité du cours dans index.html, manifeste, cache, icônes, README
git diff --stat && git diff js/      # ce qui a changé ; les lignes « - » propres au cours sont à réappliquer (étape 2)
python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py
```

Si le validateur signale des erreurs nouvelles (un champ devenu obligatoire, un format qui a changé), corrige le contenu en suivant `docs/format-contenu.md`, sans changer aucun `id`.

## 4. Terminer

Commite (« Moteur mis à jour depuis le modèle, version … » : la version est dans `docs/version-moteur.txt`), pousse, et résume à l'élève les nouveautés visibles dans l'appli.
