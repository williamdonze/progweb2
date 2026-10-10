# Programme

Objectif : faire **seul et sans aide** tous les exercices du cours *Prog. Web* (HEIG-VD, Nicolas Chabloz), en partant de zéro.
Chaque unité prépare des exercices précis des TP ; ses **boss** sont ces exercices, avec tests et indices, sans jamais afficher la solution.

Source : les pages du cours enregistrées le 10 octobre 2026 : **Exercice JS - Fonctions** (10 exercices), **Exercice JS - Tableaux** (10 exercices sur les nombres, 8 sur les chaînes, 8 sur le jeu de cartes), **Exercice JS - DOM** (6 exercices sur le jeu de cartes en HTML).

## Unités faites

| # | Unité | Notions | Boss |
|---|---|---|---|
| 1 | Les bases | console.log, const / let, types, `"13"` ≠ `13`, `KING` ≠ `"KING"`, chaînes, typeof, ordre d'exécution | La carte d'étudiant (préparation) |
| 2 | Les opérateurs | calculs, Math.floor, Math.random, modulo (négatifs !), `===` / `==`, `&&` / `||`, ternaire | Le contrôleur de nombres (préparation : impairs, multiples de 9) |
| 3 | Les fonctions | déclarer, appeler, paramètres, **return vs console.log**, portée, fléchées, `(x) => ({ … })`, fonction en paramètre, fonction qui retourne une fonction | **TP Fonctions** ex. 1 (getMax), 2 (getRandomInt), 3 (compareA / compareB), 8 (double, square, transform), 10 (createGreeting) |
| 4 | Les boucles | for, pas et sens (à l'envers), if dans la boucle, compteurs, return dans une boucle, racine carrée, for…of, paramètre du reste `...` | **TP Fonctions** ex. 4 (pairs, multiples…), 5 (pile ou face), 6 (nombre premier), 7 (cl), 9 (repeatTransform) |
| 5 | Les tableaux | boîte d'œufs, indices, `at(-1)`, **length vs dernier indice**, milieu, Object.freeze, méthodes mutantes, `===` entre tableaux | Premier, dernier, milieu (préparation au mot du milieu) |
| 6 | Parcourir et transformer | **nom du paramètre**, forEach, map, filter, **forEach vs map**, **map vs filter**, condition booléenne, enchaînements | **TP Tableaux** nombres : 1 (afficher), 2 (doublées), 3 (impaires) |
| 7 | Réduire | reduce, le porte-monnaie, valeur de départ (0, `""`, 1, aucune), maximum, concaténation, chaîne filter / map / reduce | **TP Tableaux** nombres : 6 (somme), 7 (plus grand) ; chaînes : 6 (concaténation) |

**TP Fonctions : complet** (10 exercices sur 10).

## Unités à venir

| # | Unité | Exercices du cours visés |
|---|---|---|
| 8 | Tester : some, every | nombres 8 (au moins un multiple de 9), 9 (que des positifs) ; chaînes 2 (tous les mots font 5 lettres) |
| 9 | Extraire et assembler : slice, spread, with | nombres 4 (sans le premier), 5 (sans le dernier), 10 (les pairs puis les impairs, ordre relatif conservé) ; chaînes 3 (« Lorem » au début), 4 (« Ipsum » à la fin), 5 (le mot du milieu → « radar ») |
| 10 | Trier : toSorted, comparateurs, localeCompare | chaînes 7 (le premier mot dans l'ordre alphabétique, sans modifier le tableau) |
| 11 | Chaînes : includes, toLowerCase, split, join, toReversed | chaînes 1 (les mots contenant un r), 8 (concaténer, minuscules, palindrome) |
| 12 | Objets : le jeu de cartes | cartes 1 (structure d'une carte et du paquet), 2 (`buildBaseDeck` : map imbriqués / flatMap), 5 (`compareRank`), 6 (`getHighestCard`), 7 (`displayRank`, `showCard` avec les couleurs du terminal) |
| 13 | Mélanger et tirer | cartes 3 (`shuffleInPlace`, Fisher–Yates), 4 (`drawCards` : copier, mélanger, prendre n cartes) ; simulateur Fisher–Yates déjà prêt dans le moteur |
| 14 | DOM : sélectionner | TP DOM 1 à 3 : `querySelector`, `querySelectorAll`, `classList`, sélecteurs CSS (id, classe, `,` pour OU, attribut `[data-face-card]`, combinaisons, `:not()`), sélection limitée à `.deck` |
| 15 | DOM : événements et clones | TP DOM 4 à 6 : `addEventListener`, convertir une NodeList en tableau avec `...`, `cloneNode(true)`, `removeAttribute`, `replaceChildren(...cartes)`, tirer une main |

### À prévoir dans le moteur

- **Couleurs du terminal** (cartes 7, `showCard`) : la console de l'appli devra interpréter les codes `\x1b[31;47m` (rouge sur blanc), `\x1b[30;47m`, `\x1b[0m`.
- **Bac à sable DOM** (unités 14-15) : le Web Worker n'a pas de DOM. Il faudra un second bac à sable, une `<iframe sandbox="allow-scripts">` contenant une copie de `cards.html` / `cards.css` (52 `<playing-card>`, boutons A à F, `#hand`), où le code de l'élève s'exécute ; les tests cliqueront sur les boutons et compteront les cartes `.selected` (1, 13, 26, 12, 6, 39 attendues) et les enfants de `#hand`.

## Les difficultés ciblées

| Difficulté | Où elle est travaillée |
|---|---|
| 1. Nom du paramètre d'une fléchée | u05 (boîte / œuf), u06 l1 (« le nom est à toi »), conseil automatique `param-nom-tableau` |
| 2. console.log au lieu de return | u01 (console = carnet), u03 l3 (le cuisinier), diagnostic `return-vs-log`, boss u03 à u07 |
| 3. Afficher la fonction au lieu de son résultat | u03 l1, conseil `fonction-affichee` |
| 4. `"13"` vs `13`, `"KING"` vs `KING` | u01 l3, diagnostic `texte-vs-nombre` |
| 5. forEach vs map | u06 l3, diagnostic `foreach-rien` |
| 6. map vs filter | u06 l5, diagnostics `map-condition`, `map-longueur` |
| 7. if dans une fléchée, la comparaison est déjà un booléen | u02 l3 et l5, u06 l4 |
| 8. reduce, accumulateur, valeur de départ | u07 entière (porte-monnaie, simulateur pas à pas), diagnostics `depart-zero`, `depart-texte` |
| 9. `&&` / `||`, `==` / `===` | u02 l3 et l4, u04 l3, conseil `egal-souple` |
| 10. Oublier le spread | u05 l4 (avant-goût), u04 l6 (les `...` du paramètre du reste), diagnostic `oublie-spread` (unité 9 à venir) |
| 11. length vs dernier indice, milieu | u05 l3, boss u05 |
| 12. Comparateur de toSorted | conseil `tosorted-imbrique` (unité 10 à venir) |
| 13. Comparer deux tableaux avec === | u05 l5, conseil `egalite-tableaux` |
| 14. Objets, `(x) => ({ … })` | u03 l5 (« Construis l'objet »), u04 l4 (retourner `{ tails, heads }`), conseil `objet-sans-parentheses` |
| 15. map imbriqués, flatMap | unité 12 à venir (buildBaseDeck) |
| 16. for à l'envers, Math.random et ses bornes | u02 l1, boss getRandomInt (u03), u04 l2 (à l'envers), boss pile ou face (u04), simulateur Fisher–Yates |
| 17. Portée des variables, ordre de déclaration | u01 l2, u03 l4, u04 l4 (compteur déclaré avant la boucle) |
| 18. Enchaînements de méthodes et types | u06 l5 et u07 l5 (exercice « Suis les types ») |
