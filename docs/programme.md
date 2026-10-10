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
| 8 | Tester : some, every | some (au moins un), every (tous), tableau vide (`some` → false, `every` → true), find / findIndex / includes, `0` n'est pas positif | **TP Tableaux** nombres : 8 (un multiple de 9), 9 (que des positifs) ; chaînes : 2 (tous les mots font 5 lettres) |
| 9 | Extraire et assembler | slice (copie d'un morceau), spread (sortir les œufs), with (copie avec une case changée), ordre relatif conservé | **TP Tableaux** nombres : 4 (sans le premier), 5 (sans le dernier), 10 (pairs puis impairs) ; chaînes : 3 (Lorem au début), 4 (Ipsum à la fin), 5 (radar au milieu) |
| 10 | Trier | toSorted vs sort, le piège de l'ordre « texte » (10 avant 9), le comparateur (l'arbitre), localeCompare | **TP Tableaux** chaînes : 7 (le premier dans l'ordre alphabétique) |
| 11 | Les chaînes | méthodes des chaînes (includes, toLowerCase…), split / join, renverser une chaîne | **TP Tableaux** chaînes : 1 (les mots avec un r), 8 (le palindrome) |
| 12 | Objets : le jeu de cartes | objet `{ rank, suit }`, raccourci, tableau d'objets, flatMap (map dans map), objet comme dictionnaire (`symbols[card.suit]`), couleurs du terminal (ANSI) | **TP Tableaux** cartes : 1 (structure), 2 (`buildBaseDeck`), 5 (`compareRank`), 6 (`getHighestCard`), 7 (`displayRank`, `showCard`) |
| 13 | Mélanger et tirer | échanger deux cases (déstructuration), indice au hasard de 0 à i, Fisher–Yates (simulateur + test d'équité), sur place ou copie | **TP Tableaux** cartes : 3 (`shuffleInPlace`), 4 (`drawCards`), fin du 5 (annoncer la plus forte), 6 et 7 (la main de cinq cartes, affichée en couleur) |
| 14 | DOM : sélectionner | le DOM, querySelector / querySelectorAll, NodeList, sélecteurs CSS (id, classe, `,` OU, attribut, ET collé, `:not()`), classList, chercher dans `.deck`, addEventListener | **TP DOM** 1 (`clearSelection`), 2 et 3 (les six boutons A à F : 1, 13, 26, 12, 6, 39 cartes) |
| 15 | DOM : tirer une main | `[...NodeList]`, cloneNode(true), removeAttribute, replaceChildren(...cartes) | **TP DOM** 4 à 6 (Draw a hand), puis le TP DOM complet en un seul fichier |

**Les trois TP sont complets** : Fonctions (10 exercices), Tableaux (10 + 8 + 8), DOM (6). Les exercices DOM tournent sur la page du TP (`content/pages/cards.html` et `cards.css`) dans une iframe isolée : les tests cliquent sur les boutons et comptent les cartes.

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
| 10. Oublier le spread | u05 l4 (avant-goût), u04 l6 (les `...` du paramètre du reste), u09 entière, u15 (`replaceChildren(...cartes)`), diagnostic `oublie-spread` |
| 11. length vs dernier indice, milieu | u05 l3, boss u05 |
| 12. Comparateur de toSorted | u10 (l'arbitre), boss compareRank (u12), conseil `tosorted-imbrique` |
| 13. Comparer deux tableaux avec === | u05 l5, conseil `egalite-tableaux` |
| 14. Objets, `(x) => ({ … })` | u03 l5 (« Construis l'objet »), u04 l4 (retourner `{ tails, heads }`), u12 entière (le jeu de cartes), conseil `objet-sans-parentheses` |
| 15. map imbriqués, flatMap | u12 l3, boss buildBaseDeck (u12) |
| 16. for à l'envers, Math.random et ses bornes | u02 l1, boss getRandomInt (u03), u04 l2 (à l'envers), boss pile ou face (u04), u13 (indice de 0 à i, Fisher–Yates, test d'équité) |
| 17. Portée des variables, ordre de déclaration | u01 l2, u03 l4, u04 l4 (compteur déclaré avant la boucle) |
| 18. Enchaînements de méthodes et types | u06 l5 et u07 l5 (exercice « Suis les types ») |
