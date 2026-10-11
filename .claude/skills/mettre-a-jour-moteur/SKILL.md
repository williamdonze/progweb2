---
name: mettre-a-jour-moteur
description: Met à jour le moteur d'une appli de cours (js/, css/, tools/…) avec la dernière version du modèle cours-duolingo-template, sans toucher au contenu ni à la progression des élèves. À utiliser quand l'élève dit « /mettre-a-jour-moteur », « mets à jour le moteur », ou veut récupérer dans un cours une amélioration faite dans le modèle ou dans un autre cours.
---

# Mettre à jour le moteur

Le moteur vit dans le modèle `williamdonze/cours-duolingo-template` ; chaque cours en a une copie. Cette procédure recopie le moteur du modèle dans le cours. Le **contenu** du cours (`content/`, `docs/programme.md`, `docs/cours/`, CLAUDE.md, README) ne change pas.

## Étapes

1. **Le modèle sur la machine** : s'il n'est pas déjà cloné, ajoute le dépôt `williamdonze/cours-duolingo-template` à la session et clone-le (par exemple dans `/home/user/cours-duolingo-template`). Mets-le à jour (`git pull`).
2. **Une amélioration faite dans ce cours ?** Si `js/`, `css/` ou `tools/` du cours contiennent des changements absents du modèle (comparer avec `diff -r`), reporte-les d'abord dans le modèle (avec un exemple dans l'unité catalogue, la doc, et les tests du modèle au vert), sinon la mise à jour les effacerait. En cas de doute, demande à l'élève.
3. **La section `app`** : `content/config.json` du cours doit avoir une section `app` (docs/format-contenu.md § 1). Si elle manque (cours créé avant le modèle), ajoute-la. **La `cle` doit reprendre l'ancienne clé de sauvegarde** (dans l'ancien `js/base.js` : `SAVE_KEY = "xxx-sauvegarde-v1"` → `"cle": "xxx"`), sinon l'élève perd sa progression. Reprends aussi le nom, la mascotte, les textes propres au cours, et active les modules qu'il utilise (`code-js`, `dom`…).
4. **Voir ce qui va changer** : depuis le dossier du modèle, `python3 tools/mettre-a-jour-moteur.py /chemin/du/cours --essai`.
5. **Mettre à jour** : la même commande sans `--essai`. Elle copie `js/`, `css/`, `tools/`, `index.html`, `docs/format-contenu.md`, `docs/modules.md`, le workflow des tests et les compétences ; elle garde le nom de cache de `sw.js`.
6. **Configurer** : dans le dossier du cours, `python3 tools/configurer.py` (titre, appli installée, nouveau nom de cache pour que les téléphones prennent la nouvelle version, icônes).
7. **Tester** : les trois tests du cours, tous verts. Un échec vient souvent d'un contenu qui utilisait une ancienne forme : corrige le contenu (ou le moteur, puis reporte la correction dans le modèle).
8. **Vérifier à l'œil** l'accueil et un exercice (nom, mascotte, couleurs, onglets), puis commiter et pousser le cours. Mets à jour la section « Ce cours » de son CLAUDE.md si l'architecture décrite a changé.
