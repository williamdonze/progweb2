# Mémo du format (à lire pour écrire une unité)

Version courte de `docs/format-contenu.md` : assez pour écrire 95 % d'une unité. La référence complète sert pour les cas rares (tests DOM, `melange`, `verifie`, diagnostics, illustrations). Squelette d'une nouvelle unité : `python3 tools/nouvelle-unite.py uNN "Titre"`.

## Règles qui cassent si on les oublie

- Tout élément a un `id` **unique et stable** (jamais renommé ensuite) : unité `u05`, leçon `u05-l2`, exercice `u05-l2-e3`, jeu `u05-jeu`, quiz `u05-quiz-q4`, boss `u05-b1` (et ses questions `u05-b1-q2`). Fiche : `minuscules-tirets`, unique dans **tout** le contenu.
- `notions` = des ids de fiches (existantes, de cette unité ou d'avant). Chaque question en a au moins une et a une `explication`.
- Texte enrichi : `**gras**`, `` `code` ``, `[[id-fiche]]` ou `[[id-fiche|texte]]`, `\n\n` paragraphe, `- ` liste. Code : tableau de lignes.
- Le code est celui de `config.app.langage` (js, php, java…). Les exercices qui **exécutent** (`trous`, `corriger`, `ecrire`, boss de code, `predire` sans réponse écrite) demandent le module du langage (`code-js`, `code-php`) ; sans module, seulement les types « sans code » et « code non exécuté ». En PHP : champs `requete`, `fichiers`, `fichier` et cas `contient`, `redirection`, `cookies`, `session`… (`docs/format-contenu.md`, « Exercices en PHP »).
- Jamais la solution affichée : `solution` ne sert qu'aux tests ; à la place, 1 à 3 `indices` (3 pour un boss : léger → précis → squelette à trous).

## L'unité

```json
{ "id": "u05", "titre": "…", "sousTitre": "TP 2 : …", "objectif": "Ce que l'élève saura faire.", "icone": "[ ]",
  "fiches": [], "lecons": [], "jeux": [], "quiz": { "titre": "…", "questions": [] }, "boss": [] }
```
Taille : 3 à 5 fiches, 3 à 5 leçons (4 à 6 cartes, 5 à 8 exercices variés), 1 jeu (10 à 20 questions rapides), quiz de 15 à 18 questions dont 2 ou 3 sur les unités précédentes, boss = les exercices du cours.

## Fiche, leçon, carte, jeu

```json
{ "id": "map", "titre": "map : transformer chaque élément", "icone": "map", "resume": "Une phrase.",
  "analogie": "L'image récurrente du cours…", "texte": "…", "exemples": [{ "code": ["…"], "note": "…" }], "pieges": ["…"] }

{ "id": "u05-l2", "titre": "…", "duree": 5, "notions": ["map"], "cartes": [ … ], "exercices": [ … ] }

{ "titre": "…", "texte": "…", "code": ["…"], "apres": "…", "analogie": "…", "astuce": "…", "piege": "…", "fiche": "map" }
   // code : bouton « Exécuter » avec code-js ; "executable": false sinon ; "erreurVoulue": true s'il plante exprès

{ "id": "u05-jeu", "titre": "…", "description": "…", "tours": 10, "questions": [ … ] }   // "badge" + "seuilBadge" facultatifs
```

## Types sans code (tout cours)

```json
{ "id": "…", "type": "qcm", "question": "…", "choix": ["a", "b", "c"], "bonne": 1, "notions": ["…"], "explication": "…" }
{ "type": "vf", "question": "…", "bonne": true }
{ "type": "ordre", "question": "Remets dans l'ordre", "items": ["1er", "2e", "3e"] }               // donné dans le bon ordre
{ "type": "tri", "question": "…", "categories": ["A", "B"], "items": [["texte", 0], ["texte", 1]] }
{ "type": "assoc", "question": "…", "paires": [["terme", "définition"], ["…", "…"]] }           // "erreurs" : même format
{ "type": "methode", "question": "…", "choix": ["map", "filter", "reduce"], "bonne": 0 }
```
Avec du code affiché mais non exécuté (tout langage) :
```json
{ "type": "predire", "question": "Qu'affiche ce code ?", "code": ["…"], "choix": ["…", "…"], "bonne": 0 }   // ou "reponse": "…" (+ "accepte": [])
{ "type": "pointer-code", "question": "Touche le paramètre", "code": ["function f(⟦x⟧) {", "}"] }        // "multi": true : plusieurs ⟦ ⟧
{ "type": "bug", "question": "…", "code": ["…", "…"], "ligne": 2, "choix": ["explication 1", "…"], "bonne": 0 }
{ "type": "parsons", "question": "…", "lignes": ["function f() {", "  return 1;", "}"], "distracteurs": ["  return;"] }
```
`mono: true` met les choix en police de code ; `ordreFixe: true` empêche de mélanger un QCM.

## Exercices de code (exécutés : module du langage ; exemple en JavaScript)

```json
{ "id": "…", "type": "ecrire", "question": "…", "depart": ["function f(nums) {", "  ", "}"],
  "donnees": { "nums": [3, 14] }, "prelude": ["const MAX = 10;"],
  "tests": { "fonction": "f",
             "cas": [ { "titre": "Données du cours", "args": [[3, 14]], "attendu": [6, 28] },
                      { "titre": "Tableau vide", "args": [[]], "attendu": [] } ],
             "interdit": ["for"], "obligatoire": ["map"] },
  "indices": ["léger", "précis", { "texte": "presque", "code": "return nums.map((___) => ___);" }],
  "solution": ["function f(nums) {", "  return nums.map((n) => n * 2);", "}"],
  "erreursTypiques": [ { "code": "…", "attendu": "echec", "diagnostic": "sans-return" } ],
  "explication": "…" }
```
- `trous` : `code` avec `___`, `solution` = valeurs des trous ; `corriger` : `depart` buggé, `solution` corrigée.
- Mode script (sans `fonction`) : cas avec `"sortie": ["ligne attendue"]` ou `"variables": { "total": 7 }`.
- `attendu` d'une erreur typique : `echec`, `erreur` ou `conseil` ; `diagnostic` : un id de la liste de `docs/format-contenu.md` § 6.
- Toujours un cas avec **d'autres données** que le cours, et un cas limite (vide, négatif…).

## Boss

```json
{ "id": "u05-b1", "titre": "…", "source": "TP 2, exercice 3", "notions": ["…"], "enonce": "L'énoncé du prof, tel quel.",
  "regles": ["contrainte du cours"], … champs d'un exercice « ecrire » (3 indices) … }

{ "id": "u05-b2", "titre": "…", "source": "…", "notions": ["…"], "enonce": "Le scénario.",
  "questions": [ 4 à 8 questions de tout type ], "seuil": 0.8 }      // étude de cas : cours sans code
```
Un boss reprend un exercice **qui s'exerce** (pas l'organisation d'un projet : le projet se met dans `config.json` → `projet`).

## Tester

```bash
python3 tools/valider-contenu.py                      # après chaque fichier
python3 tools/tester-exercices.py --unite u05         # chaque solution passe, chaque erreur typique échoue comme prévu
```
