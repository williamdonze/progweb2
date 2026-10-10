# Plan : ProgWeb 2, le Pampre du JavaScript

Statut : **validé par l'élève le 10 octobre 2026, version 1 réalisée** (unités 1 à 6). Décisions : nom **ProgWeb 2** (au lieu d'« Accolade »), pas de vies, comme Pampre. L'état à jour est dans `CLAUDE.md` et `docs/programme.md`. Mise à jour du 10 octobre 2026 avec les vraies pages des TP : ajout de l'unité « Les boucles » (TP Fonctions 4 à 7 et 9), programme des unités à venir refait d'après le jeu de cartes et le TP DOM ; les tableaux ci-dessous (§ 7) sont dépassés.

## 1. Ce que je reprends de Pampre

| Pampre | Ce que je garde | Ce qui change |
|---|---|---|
| Site statique, JS vanilla, aucun build, GitHub Pages, PWA hors connexion (`sw.js`) | Tout | — |
| `content/*.json` chargés par `fetch()`, « règle d'or » contenu ≠ code | Tout | Une unité = un fichier `content/unites/uNN-*.json`, listé dans `content/unites.json` (GitHub Pages ne peut pas lister un dossier, d'où ce sommaire d'une ligne par unité) |
| Parcours en zigzag, nœuds leçon → jeu → quiz, déblocage à 80 % | Tout | Le dernier nœud d'une unité est un **Boss** (exercice du cours) |
| XP, rangs, badges, série de jours, défi du jour, graphique 7 jours | Tout | Rangs et badges sur le thème du code |
| Contrat `Q[type] = (q, onChange) => ({ el, ready, check, key?, cleanup? })` et `runSession` (barre, bouton Vérifier, feuille verte/rouge qui monte, écran de fin) | Tout : chaque nouveau type d'exercice respecte le même contrat | Le résultat de `check()` peut contenir une **explication calculée** (message d'erreur traduit, test qui échoue) |
| `explication` obligatoire après chaque réponse | Oui | + `indices[3]` sur chaque exercice de code |
| Pile d'erreurs (60 ids) | Remplacée | **Répétition espacée par notion** (boîtes de Leitner, voir § 5) |
| Sauvegarde `localStorage` + `normaliser()` + export/import par code | Tout | Clé `accolade-sauvegarde-v1`, progression indexée par **ids stables** (jamais par position) pour ne jamais rien perdre quand du contenu est ajouté |
| Glossaire en panneau latéral, termes cliquables `[[terme]]` | Oui | Devient les **fiches de théorie** (une par notion, consultables à tout moment, avec exemples exécutables) |
| `tools/valider-contenu.py`, `tools/test-parcours.py` (Playwright) | Oui | + `tools/tester-exercices.js` : exécute **chaque** solution de référence et **chaque** erreur typique contre les tests (voir § 6) |
| Thème clair/sombre, jetons CSS dans les 3 blocs, contraste AA, zones tactiles ≥ 44 px, mobile d'abord | Tout | Nouvelle palette (ci-dessous) |
| `index.html` monolithique (220 Ko) | Non | Découpé en quelques fichiers sans build : `css/app.css`, `js/moteur.js`, `js/questions.js`, `js/editeur.js`, `js/execution.js`, `js/worker.js` |

## 2. Identité

- **Nom proposé : Accolade** (les `{ }` qu'on ouvre et qu'on ferme, et une accolade, c'est aussi un geste d'encouragement). Autres pistes : *Fléchette* (les `=>`), *Coquille* (la boîte d'œufs).
- **Mascotte : Coco**, un œuf entre deux accolades `{🥚}`, qui fait le lien avec l'analogie de la boîte d'œufs (`happy` / `wow` / `sad`, comme Pépin).
- **Palette** : fond crème clair `#FAF7F0` / nuit `#14161F` ; violet « éditeur » `#5B3FD9` (rôle de `--grape`) ; jaune JS `#F2C230` (rôle de `--gold`) ; vert `#2E9E5B` juste ; rouge `#D9483B` faux ; coloration syntaxique avec ses propres jetons (mots-clés, chaînes, nombres, commentaires), lisible dans les deux thèmes.
- **Polices** : Baloo 2 (titres) et Nunito (texte) comme Pampre ; **JetBrains Mono** pour le code (repli `ui-monospace`).

## 3. L'exécution du code

**Éditeur maison** (zéro dépendance, fiable sur mobile) : `<textarea>` transparente posée sur un `<pre>` coloré (technique de l'« éditeur à calque »), numéros de ligne, indentation automatique, fermeture des parenthèses.
**Barre de symboles** au-dessus du clavier : `( ) { } [ ] => ; . , " ' ... === !== && || % +` et Tab, en gros boutons, avec insertion au curseur (`=>` insère `() => `).

**Bac à sable** : un **Web Worker** créé à la demande (Blob) ; aucune page, aucun `localStorage`, aucun DOM accessibles.
- `console.log` remplacé : les valeurs sont sérialisées avec un affichage proche de la console du navigateur (`[ 3, 14 ]`, `"texte"` entre guillemets, `[Function: double]`), puis montrées dans une **fausse console**.
- **Timeout 2 s** : le worker est tué (`terminate()`), message : « Ton code tourne en rond (boucle infinie ?). Vérifie la condition de ta boucle. »
- Code exécuté en mode strict, données du cours passées **gelées en profondeur** (`Object.freeze` récursif).

**Tests** (décrits dans le JSON, exécutés dans le worker) :
- `appels` : la fonction est appelée avec **plusieurs jeux de données** (celles du cours, d'autres, un tableau vide, un seul élément), résultat comparé en profondeur.
- `immuable` : le tableau reçu ne doit pas avoir changé après l'appel (double contrôle : gel + comparaison avec une copie).
- `interdit` / `obligatoire` : méthodes interdites (`sort`, `push`, `reverse`, `splice`…) ou attendues (`map`, `reduce`…) ; recherche sur le code **sans commentaires ni chaînes**.
- `sortie` : ce que la console doit afficher (pour « Afficher tous les nombres »).

**Diagnostics ciblés sur tes difficultés** (avant le message générique) :

| Symptôme détecté | Message |
|---|---|
| La fonction renvoie `undefined` **et** la console affiche la bonne valeur | « Ta fonction **montre** le plat par la fenêtre (`console.log`) au lieu de te le **tendre** (`return`). » |
| La console affiche `[Function: …]` | « Tu affiches la recette, pas le plat : il manque les parenthèses `maFonction()`. » |
| Résultat `"13"` au lieu de `13` (ou l'inverse) | « Tu as du **texte** `"13"`, on attend un **nombre** `13`. Enlève les guillemets. » |
| Résultat = tableau de tableaux alors qu'on attend un tableau plat | « Les œufs sont restés dans leur boîte : il manque le spread `...` (ou `flatMap`). » |
| Longueur différente avec `map` attendu / identique avec `filter` attendu | Rappel « `map` garde toujours la même longueur ». |
| `forEach` utilisé quand un tableau doit être retourné | « `forEach` parcourt mais ne fabrique rien : il retourne toujours `undefined`. » |
| Paramètre de la fléchée identique au nom du tableau (`numbers.map((numbers) => …)`) | « Le tableau, c'est la boîte ; le paramètre, c'est **un œuf**. Donne-lui un nom au singulier. » |
| `==` / `!=` dans le code | Avertissement (non bloquant) : « Préfère `===` / `!==`. » |
| `a === [..]` entre deux tableaux | « Deux boîtes différentes ne sont jamais `===`, même avec les mêmes œufs. » |
| `toSorted` dans le comparateur | Message dédié. |
| Erreurs JS | Traduction : `x is not defined`, `x is not a function`, `Cannot read properties of undefined`, `Assignment to constant variable`, `Cannot add property … object is not extensible` (= tableau gelé modifié), `Unexpected token`, `missing ) after argument list`, `Maximum call stack size exceeded`, `Cannot access 'x' before initialization`… chaque fois avec la ligne fautive surlignée. |

## 4. Les 19 types d'exercices

Chacun est un `Q[type]` au contrat de Pampre. Entre parenthèses : le type Pampre qu'il transpose.

| # | `type` | Exemple |
|---|---|---|
| 1 | `pointer-code` (étiquette) | Ligne de code découpée en jetons ; « Touche le paramètre de la fléchée » |
| 2 | `pointer-tableau` (carte) | Cases + indices ; « Touche ce que garde `slice(1, 3)` » (une ou plusieurs cases) |
| 3 | `bug` | Toucher la ligne ou le jeton fautif, puis choisir l'explication (2 étapes) |
| 4 | `predire` | « Qu'affiche ce `console.log` ? », QCM ou saisie libre (comparaison tolérante aux espaces) |
| 5 | `methode` | Consigne → choisir parmi des boutons de méthodes |
| 6 | `tri` (repris tel quel) | Mutantes / non mutantes ; retourne tableau / nombre / booléen / rien |
| 7 | `parsons` (ordre) | Glisser des lignes mélangées ; l'indentation fait partie de la réponse |
| 8 | `reduce-pas` | Tableau tour par tour : acc reçu, élément, valeur retournée |
| 9 | `filtre-visuel` | Toucher les cases que `filter` garde |
| 10 | `map-visuel` | Prédire chaque case transformée |
| 11 | `assoc` (repris) | Message d'erreur ↔ cause |
| 12 | `objet` | Assembler `{ rank, suit }` en glissant des étiquettes ; pièges `"13"`, `ranks`, `KING` / `"KING"` |
| 13 | `fisher-yates` | On tire `j`, on touche les deux cases à échanger, on voit le mélange |
| 14 | `types-chaine` | Pour chaque maillon d'un enchaînement : chaîne, tableau, nombre ou booléen |
| 15 | `trous` | Code à trous exécuté et testé |
| 16 | `corriger` | Code buggé à réparer |
| 17 | `ecrire` | Éditeur vide + tests |
| 18 | (variantes) | Pas un type : chaque notion a des exercices sur d'autres données (fruits, prix, élèves, t-shirts) |
| 19 | `boss` | `ecrire` en mode cours : énoncé du prof, tests sur plusieurs tableaux, 3 indices, **aucune solution affichée**, jamais |

Plus `qcm` et `vf` repris de Pampre pour les questions rapides.

**Indices progressifs** (types 15 à 19) : 3 boutons qui se débloquent l'un après l'autre (léger → précis → squelette à trous `numbers.___((___) => ___)`). Chaque indice réduit le bonus XP mais ne bloque jamais la réussite. Le corrigé n'est **jamais** affiché ; après réussite seulement, la fiche de la notion propose « une autre façon de l'écrire ».

## 5. Progression et répétition espacée

- Chaque exercice porte des `notions` (ex. `["map", "fleche-param"]`).
- `ST.notions[id] = { boite: 1..5, prochaine: date }` : une erreur renvoie la notion en boîte 1 (revue demain), une réussite la fait monter (1, 2, 4, 8, 16 jours).
- Le **défi du jour** pioche d'abord dans les notions dues, puis dans les exercices ratés, puis au hasard dans les unités terminées.
- Chaque leçon finit par 1 à 2 exercices de **mélange** avec des notions des unités précédentes ; chaque boss est précédé d'un quiz de révision.
- Ajout de contenu : les ids sont explicites dans le JSON (`"id": "u05-map-03"`), la sauvegarde ne dépend pas de l'ordre ; une unité ajoutée en fin de parcours se débloque si la précédente est validée. Une unité insérée au milieu ne reverrouille jamais ce qui était déjà ouvert.

## 6. Format des données (exemple)

```jsonc
// content/unites/u05-parcourir.json
{
  "id": "u05", "titre": "Parcourir et transformer", "icone": "fleche",
  "fiches": [{ "id": "map", "titre": "map : transformer chaque œuf", "texte": "…", "exemples": ["const prix = [2, 5];\nconst ttc = prix.map((p) => p * 1.2);"] }],
  "parcours": ["u05-l1", "u05-l2", "jeu:u05-filtre", "u05-l3", "quiz", "boss:u05-b1"],
  "lecons": [{ "id": "u05-l1", "titre": "…", "cartes": [ … ], "exercices": [ … ] }],
  "boss": [{
    "id": "u05-b1", "type": "boss", "notions": ["map"],
    "enonce": "Retourner un tableau avec les valeurs doublées.",
    "depart": "const numbers = Object.freeze([3, 14, 15, 92, 65, 35, 89, 79, 32, 38]);\n\nfunction doubleValues(numbers) {\n  \n}\n",
    "tests": {
      "fonction": "doubleValues",
      "appels": [
        { "args": [[3, 14, 15]], "attendu": [6, 28, 30] },
        { "args": [[]], "attendu": [] },
        { "args": [[-1, 0.5]], "attendu": [-2, 1] }
      ],
      "immuable": true,
      "interdit": ["push", "for"]
    },
    "indices": ["Quelle méthode fabrique un nouveau tableau de la même longueur ?", "`map` : pour chaque œuf `n`, que doit-on retourner ?", "return numbers.map((___) => ___ * 2);"],
    "solution": "return numbers.map((n) => n * 2);",   // jamais affichée : sert au testeur automatique
    "erreursTypiques": [                              // le testeur vérifie que chacune échoue AVEC le bon diagnostic
      { "code": "numbers.forEach((n) => console.log(n * 2));", "diagnostic": "return-vs-log" },
      { "code": "return numbers.map((numbers) => numbers * 2);", "diagnostic": null, "avertissement": "param-nom-tableau" }
    ]
  }]
}
```

`tools/tester-exercices.js` (Node, sans dépendance) charge toutes les unités, exécute chaque `solution` (doit passer) et chaque `erreursTypiques` (doit échouer avec le diagnostic annoncé). Lancé avant chaque commit, avec `valider-contenu`.

## 7. Programme des unités

Ordre proposé = le tien, légèrement réordonné pour que chaque boss soit faisable avec ce qui précède. Les boss reprennent les exercices du cours (numérotation de la version GitHub du TP, **à confirmer** avec la page actuelle, voir § 8).

| # | Unité | Boss (exercices du cours) |
|---|---|---|
| 1 | Les bases : `const`/`let`, types, guillemets, `console.log`, `typeof` | Mini-boss maison (« le bon type ») |
| 2 | Opérateurs : `%`, `Math.floor`, `===`, `&&`/`||`, ternaire | Mini-boss : pair / impair, multiple de 9 |
| 3 | Fonctions : `return` vs `console.log`, appel, portée, fléchées, `(x) => ({…})` | Série « fonctions » du prof (`getMax`, `transform`, `double`) |
| 4 | Tableaux : indices, `length`, dernier indice, milieu, `Object.freeze` | Accès au premier / dernier / milieu |
| 5 | Parcourir et transformer : `forEach`, `map`, `filter` | Nombres 1, 2, 3 ; Chaînes 1 |
| 6 | Réduire : `reduce` (somme, max, concaténation) | Nombres 6, 7 ; Chaînes 6 |
| 7 | Tester : `some`, `every` | Nombres 8, 9 ; Chaînes 2 |
| 8 | Extraire et assembler : `slice`, spread, `with` | Nombres 4, 5, 10 ; Chaînes 3, 4, 5 (mot du milieu → `"radar"`) |
| 9 | Trier : `toSorted`, comparateurs, `localeCompare` | Chaînes 7 |
| 10 | Chaînes : `includes`, `toLowerCase`, `split`, `join`, `toReversed`, enchaînements | Chaînes 8 (palindrome) |
| 11 | Objets : création, propriétés, tableau d'objets | Cercles 1 à 4 (aires, rouges, centres, translation) |
| 12 | Combiner : `map` imbriqués, `flatMap` | Construire le jeu de 52 cartes (`RANKS` × `SUITS`) |
| 13 | Boucles et hasard : `for` à l'envers, `Math.random`, échange par déstructuration | Mélange de Fisher–Yates |
| 14 | Boss final : le jeu de cartes complet | Tous les exercices « cartes » du cours, dans l'ordre |

**Première version livrée** : unités 1 à 6 complètes (4 à 5 leçons chacune, 8 à 12 types d'exercices différents par unité, un quiz et un boss), plus le moteur complet (les 19 types), les fiches de théorie, le testeur automatique, le README et le `CLAUDE.md` avec la procédure « nouvelle page de TP ».

## 8. Points à trancher

1. **La page du cours est inaccessible depuis cet environnement** (`chabloz.eu` bloqué par la politique réseau). J'ai trouvé la version 2024 du TP sur GitHub (`Chabloz/im/progweb/js_array.md` : 10 exercices nombres, 8 chaînes, 4 cercles) et le code « live » 2026 du prof (`Chabloz/IM54_2_ProgWeb_Live` : jeu de cartes, `KING`, Fisher–Yates). La version actuelle de la page (cartes, `toSorted`, `with`, `flatMap`) n'y est pas en entier. Il faut soit autoriser `chabloz.eu` dans les réglages réseau de l'environnement, soit me coller le texte de la page.
2. Le nom (**Accolade** ?) et la palette.
3. Vies (cœurs) ou pas ? Pampre n'en a pas ; je propose de ne pas en mettre (les indices remplacent la punition).
