# Programme

Objectif : faire **seul et sans aide** tous les exercices du cours *Prog. Web* (HEIG-VD, Nicolas Chabloz), en partant de zéro.
Chaque unité prépare des exercices précis des TP ; ses **boss** sont ces exercices, avec tests et indices, sans jamais afficher la solution.

Les TP du cours (page « Travaux pratiques » du 10 octobre 2026) : **Initiation aux fonctions**, **Tableaux et programmation fonctionnelle**, **Manipulation du DOM**.

## Unités faites (version 1)

| # | Unité | Notions | Boss |
|---|---|---|---|
| 1 | Les bases | console.log, const / let, types, `"13"` ≠ `13`, `KING` ≠ `"KING"`, chaînes, typeof, ordre d'exécution | La carte d'étudiant (préparation) |
| 2 | Les opérateurs | calculs, Math.floor, Math.random, modulo (négatifs !), `===` / `==`, `&&` / `||`, ternaire | Le contrôleur de nombres (préparation : impairs, multiples de 9) |
| 3 | Les fonctions | déclarer, appeler, paramètres, **return vs console.log**, portée, fléchées, `(x) => ({ … })`, fonction en paramètre | **TP Fonctions** : ex. 1 (getMax), 2 (getRandomInt), 3 (compareA / compareB), 8-9 (sum, curryAdd), 10-12 (square, twice en fléchées) |
| 4 | Les tableaux | boîte d'œufs, indices, `at(-1)`, **length vs dernier indice**, milieu, Object.freeze, méthodes mutantes, `===` entre tableaux | Premier, dernier, milieu (préparation au mot du milieu) |
| 5 | Parcourir et transformer | **nom du paramètre**, forEach, map, filter, **forEach vs map**, **map vs filter**, condition booléenne, enchaînements | **TP Tableaux** nombres : ex. 1 (afficher), 2 (doublées), 3 (impaires) |
| 6 | Réduire | reduce, le porte-monnaie, valeur de départ (0, `""`, 1, aucune), maximum, concaténation, chaîne filter / map / reduce | **TP Tableaux** nombres : ex. 6 (somme), 7 (plus grand) ; chaînes : ex. 6 (concaténation) |

## Unités à venir

| # | Unité | Exercices du cours visés |
|---|---|---|
| 7 | Tester : some, every | nombres 8 (au moins un multiple de 9), 9 (que des positifs) ; chaînes 2 (tous les mots font 5 lettres) |
| 8 | Extraire et assembler : slice, spread, with | nombres 4 (sans le premier), 5 (sans le dernier), 10 (pairs puis impairs) ; chaînes 3 (mot en début), 4 (mot en fin), 5 (mot du milieu → « radar ») ; fonctions 7 (`cl`, paramètre du reste) |
| 9 | Trier : toSorted, comparateurs, localeCompare | chaînes 7 (premier mot dans l'ordre alphabétique) |
| 10 | Chaînes : includes, toLowerCase, split, join, toReversed | chaînes 1 (mots avec un r), 8 (palindrome) |
| 11 | Objets | cercles : aires, rouges, centres, translation |
| 12 | Combiner : map imbriqués, flatMap | construire le jeu de 52 cartes (`RANKS` × `SUITS`) |
| 13 | Boucles et hasard : for, Math.random, échange par déstructuration | fonctions 4 (pairs entre 0 et n…), 5 (pile ou face), 6 (nombre premier) ; mélange de Fisher–Yates |
| 14 | Boss final : le jeu de cartes | le jeu de cartes complet du cours |
| 15+ | Manipulation du DOM | TP 3 (à ajouter quand la page sera fournie) |

Les numéros d'exercices suivent la version du TP publiée sur GitHub (`Chabloz/im`, `progweb/js_array.md` et `js_function.md`). La page actuelle du cours contient aussi un **jeu de cartes** (rangs, couleurs, `KING`, mélange) : ses énoncés exacts sont à récupérer avant d'écrire les unités 12 à 14.

## Les difficultés ciblées

| Difficulté | Où elle est travaillée |
|---|---|
| 1. Nom du paramètre d'une fléchée | u04 (boîte / œuf), u05 l1 (« le nom est à toi »), conseil automatique `param-nom-tableau` |
| 2. console.log au lieu de return | u01 (console = carnet), u03 l3 (le cuisinier), diagnostic `return-vs-log`, boss u03 à u06 |
| 3. Afficher la fonction au lieu de son résultat | u03 l1, conseil `fonction-affichee` |
| 4. `"13"` vs `13`, `"KING"` vs `KING` | u01 l3, diagnostic `texte-vs-nombre` |
| 5. forEach vs map | u05 l3, diagnostic `foreach-rien` |
| 6. map vs filter | u05 l5, diagnostics `map-condition`, `map-longueur` |
| 7. if dans une fléchée, la comparaison est déjà un booléen | u02 l3 et l5, u05 l4 |
| 8. reduce, accumulateur, valeur de départ | u06 entière (porte-monnaie, simulateur pas à pas), diagnostics `depart-zero`, `depart-texte` |
| 9. `&&` / `||`, `==` / `===` | u02 l3 et l4, conseil `egal-souple` |
| 10. Oublier le spread | u04 l4 (avant-goût), diagnostic `oublie-spread` (unité 8 à venir) |
| 11. length vs dernier indice, milieu | u04 l3, boss u04 |
| 12. Comparateur de toSorted | conseil `tosorted-imbrique` (unité 9 à venir) |
| 13. Comparer deux tableaux avec === | u04 l5, conseil `egalite-tableaux` |
| 14. Objets, `(x) => ({ … })` | u03 l5 (exercice « Construis l'objet »), conseil `objet-sans-parentheses` (unité 11 à venir) |
| 15. map imbriqués, flatMap | unité 12 à venir |
| 16. for à l'envers, Math.random et ses bornes | u02 l1, boss getRandomInt (u03), simulateur Fisher–Yates (prêt dans le moteur) |
| 17. Portée des variables, ordre de déclaration | u01 l2, u03 l4 |
| 18. Enchaînements de méthodes et types | u05 l5 et u06 l5 (exercice « Suis les types ») |
