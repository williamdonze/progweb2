# ProgWeb 2

Apprendre le JavaScript en jouant, de zéro jusqu'aux exercices du cours *Prog. Web* : leçons courtes, analogies (la boîte d'œufs, le porte-monnaie, le cuisinier), exercices interactifs, **code exécuté et testé dans le navigateur**, erreurs expliquées en français, défi du jour et répétition espacée. Sur le modèle de [Pampre](https://github.com/williamdonze/pampre).

- **23 types d'exercices** : pointer dans le code, pointer dans un tableau, trouver le bug, prédire l'affichage, choisir la méthode, classer, reconstituer un programme, reduce pas à pas, filtre et map visuels, traducteur d'erreurs, construire un objet, Fisher–Yates, suivre les types, écrire un sélecteur CSS (la page surligne ce qu'il trouve)… et du vrai code : à trous, à corriger, à écrire.
- **Les boss** sont les exercices du cours, testés avec d'autres données (tableau vide, nombres négatifs…), avec 3 indices progressifs et **jamais la solution**.
- Tout le cours est couvert : **TP Fonctions, TP Tableaux (nombres, chaînes, jeu de cartes) et TP DOM**, en 15 unités.
- Ton code tourne dans un bac à sable isolé (Web Worker, ou la vraie page du TP DOM dans une iframe isolée), avec une console qui comprend les couleurs du terminal, un délai maximum contre les boucles infinies, et des messages qui expliquent l'erreur : « Ta fonction montre le plat par la fenêtre (console.log) au lieu de le tendre (return) ».

Programme et correspondance avec les TP (Fonctions, Tableaux, DOM) : [docs/programme.md](docs/programme.md).

## Lancer sur ton ordinateur

```bash
python3 -m http.server 8765
```

Puis ouvre http://localhost:8765/. (Un double-clic sur `index.html` ne suffit pas : le contenu et le bac à sable ont besoin d'un serveur.)

## Mettre en ligne (GitHub Pages)

1. Fusionne la branche de travail dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, choisis `main` et `/ (root)`, puis **Save**.
3. Le site est en ligne après une minute environ à l'adresse `https://williamdonze.github.io/progweb2/`.

Sur téléphone, le site s'ajoute à l'écran d'accueil comme une appli (plein écran, utilisable hors connexion).

## Ajouter des exercices

Tout le contenu est dans `content/` : **une unité = un fichier JSON**, listé dans `content/config.json`. Le moteur n'a jamais besoin d'être modifié pour ajouter du contenu, et ta progression n'est jamais perdue (elle est enregistrée par identifiant).

Exemple complet d'un exercice de code :

```json
{
  "id": "u05-l2-e7",
  "type": "ecrire",
  "notions": ["map"],
  "question": "Écris `getPrixSoldes(prix)` qui **retourne** un nouveau tableau où chaque prix est divisé par 2.",
  "depart": ["function getPrixSoldes(prix) {", "  ", "}", "", "console.log(getPrixSoldes([10, 25, 4]));"],
  "tests": {
    "fonction": "getPrixSoldes",
    "cas": [
      { "args": [[10, 25, 4]], "attendu": [5, 12.5, 2] },
      { "titre": "tableau vide", "args": [[]], "attendu": [] }
    ],
    "obligatoire": ["map"]
  },
  "indices": ["Même longueur, éléments transformés : `map`.", "Le paramètre est un prix : `p`.", { "code": "return prix.map((___) => ___);" }],
  "solution": ["function getPrixSoldes(prix) {", "  return prix.map((p) => p / 2);", "}"],
  "erreursTypiques": [
    { "code": "function getPrixSoldes(prix) {\n  prix.map((p) => p / 2);\n}", "attendu": "echec", "diagnostic": "sans-return" }
  ],
  "explication": "Affichée après la réussite."
}
```

Et un exercice sans code :

```json
{ "id": "u04-l2-e1", "type": "pointer-tableau", "notions": ["indice"], "question": "Touche `fruits[1]`.", "tableau": ["pomme", "kiwi", "mangue"], "nom": "fruits", "bonnes": [1], "explication": "Indice 1 : la deuxième case." }
```

La référence complète (tous les types, les tests, les diagnostics, les fiches, les leçons) : **[docs/format-contenu.md](docs/format-contenu.md)**.

### Quand le prof publie un nouveau TP

Donne simplement le lien (ou le texte de la page) à Claude Code : la marche à suivre est dans [CLAUDE.md](CLAUDE.md) (« Procédure : voici la nouvelle page de TP »). En résumé :

1. lire la page et lister les exercices ;
2. repérer les **nouvelles notions** par rapport aux unités existantes ;
3. créer les leçons et les fiches de théorie de ces notions, avec plusieurs types d'exercices ;
4. créer les **boss** à partir des exercices du prof, avec tests, indices progressifs, jamais la solution ;
5. ajouter l'unité dans `content/config.json` et vérifier que tous les tests passent.

## Tests

```bash
pip install playwright && playwright install chromium   # une fois
python3 tools/valider-contenu.py     # structure du contenu
python3 tools/tester-exercices.py    # chaque solution passe, chaque erreur typique est détectée avec le bon message
python3 tools/test-parcours.py       # toute l'appli, leçon après leçon, comme un élève
```

## Continuer avec Claude Code

Ouvre ce dossier dans Claude Code : `CLAUDE.md` explique tout le projet. Exemple de demande :

> Voici la page du TP suivant : https://chabloz.eu/progweb/… Crée les unités correspondantes en suivant la procédure de CLAUDE.md.
