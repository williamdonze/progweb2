# Format du contenu

Tout le contenu pédagogique est dans `content/`. Le moteur (`js/`) ne contient **aucun** texte de cours : ajouter une unité, une leçon ou un exercice ne demande **jamais** de toucher au code.

```
content/
  config.json            Sommaire des unités (ordre du parcours), rangs, badges, seuil de validation, unités « bientôt »
  unites/
    u01-bases.json       Une unité = un fichier
    u02-operateurs.json
    …
```

Après chaque modification : `python3 tools/valider-contenu.py` (rapide, sans navigateur), puis `python3 tools/tester-exercices.py` (exécute réellement chaque solution et chaque erreur typique).

---

## 1. Le sommaire : `content/config.json`

```jsonc
{
  "seuilValidation": 0.8,                       // 80 % au quiz pour ouvrir l'unité suivante
  "unites": ["content/unites/u01-bases.json", …], // ordre du parcours ; GitHub Pages ne sait pas lister un dossier, d'où cette liste
  "aVenir": [{ "titre": "…", "resume": "…", "icone": "…" }],   // cartes « Bientôt » en bas de l'accueil
  "rangs": [{ "xp": 0, "nom": "Débutant" }, …],
  "badges": [{ "id": "…", "nom": "…", "desc": "…", "icone": "etoile" }]   // icônes : etoile, flamme, medaille, trophee, boss, oeuf, livre, cible, accolades, porte, bug, terminal, melange
}
```

Les badges « unité validée » et « boss vaincus » sont **générés automatiquement** pour chaque unité : rien à ajouter.

**Ne jamais perdre la progression** : la sauvegarde est indexée par les identifiants (`id`) des unités, leçons, questions et boss, jamais par leur position. On peut ajouter, déplacer, insérer des unités sans risque. En revanche, **ne change jamais l'`id` d'un élément existant**. Une unité déjà ouverte par l'élève le reste, même si une unité est insérée avant elle.

---

## 2. Une unité : `content/unites/uNN-nom.json`

```jsonc
{
  "id": "u05",                                   // unique, stable
  "titre": "Parcourir et transformer",
  "sousTitre": "TP 2 : Tableaux · forEach, map, filter",
  "objectif": "Une phrase : ce que l'élève saura faire.",
  "icone": "map",                                // texte court affiché dans le bandeau (police de code)
  "fiches":  [ … ],                              // fiches de théorie (§ 3)
  "lecons":  [ … ],                              // leçons (§ 4)
  "jeux":    [ … ],                              // jeux (§ 5), facultatif
  "quiz":    { "titre": "…", "questions": [ … ] },   // 15 à 18 questions, seuil 80 %
  "boss":    [ … ],                              // exercices du cours (§ 7)
  "parcours": ["u05-l1", "u05-l2", "jeu:u05-x", "u05-l3", "quiz", "boss:u05-b1"]   // facultatif
}
```

Sans `parcours`, l'ordre est : toutes les leçons, puis les jeux, le quiz, les boss. Chaque nœud s'ouvre quand le précédent est fait ; l'unité suivante s'ouvre quand le quiz est validé.

---

## 3. Les fiches de théorie

Une fiche par **notion**. Son `id` sert aussi à la répétition espacée : chaque question déclare ses `notions` (des ids de fiches).

```jsonc
{
  "id": "map",                        // minuscules, chiffres, tirets ; unique dans TOUT le contenu
  "titre": "map : transformer chaque élément",
  "icone": "map",
  "resume": "Une phrase. Texte enrichi autorisé.",
  "analogie": "La machine à transformer les œufs…",       // encadré « Pour s'en souvenir »
  "texte": "Paragraphes…",
  "exemples": [ { "titre": "facultatif", "code": ["ligne 1", "ligne 2"], "note": "facultatif" } ],   // exécutables
  "pieges": ["Piège classique 1", "…"]
}
```

Un exemple qui doit planter exprès : `"titre"` contenant « erreur » (ex. « … (erreur voulue) »).

**Texte enrichi** (partout) : `**gras**`, `` `code` ``, `[[id-de-fiche]]` ou `[[id-de-fiche|texte affiché]]` (lien vers une fiche), `\n\n` paragraphe, `\n` retour à la ligne, lignes commençant par `- ` : liste.

**Code** : toujours un tableau de lignes (`["const a = 1;", "console.log(a);"]`) ou une chaîne avec `\n`.

---

## 4. Les leçons

```jsonc
{
  "id": "u05-l2",
  "titre": "map : transformer chaque œuf",
  "duree": 6,                                     // minutes
  "notions": ["map", "callback-param"],           // entrent dans la répétition espacée à la fin de la leçon
  "cartes": [ … ],                                // 4 à 6 cartes de cours
  "exercices": [ … ]                              // 5 à 8 exercices, types variés ; les ratés reviennent une fois en fin de leçon
}
```

**Carte de cours** :

```jsonc
{
  "titre": "La machine à transformer",
  "texte": "…",
  "code": ["…"],                 // facultatif : affiché avec un bouton « Exécuter »
  "executable": false,           // facultatif : pas de bouton Exécuter
  "erreurVoulue": true,          // facultatif : le code plante exprès (le testeur ne le signale pas)
  "donnees": { "numbers": [3, 14] },   // facultatif : variables déjà déclarées pour l'exemple
  "apres": "texte sous le code",
  "analogie": "…",               // encadré jaune « L'image à retenir »
  "astuce": "…",                 // encadré « Bon à savoir »
  "piege": "…",                  // encadré rouge « Attention, piège »
  "fiche": "map",                // lien vers la fiche de théorie
  "illu": "boite", "tableau": ["pomme", "kiwi"], "nom": "fruits", "negatifs": true   // illustration (voir ci-dessous)
}
```

Illustrations (`illu`) : `boite` (tableau en boîte d'œufs, avec `tableau`, `nom`, `negatifs`), `porte` (le porte-monnaie de reduce), `cuisinier` (return / console.log), `variables` (étiquettes, avec `"variables": [["nom", "valeur"]]`), `types`, `fleche` (anatomie d'une fléchée), `portee`, `spread`.

---

## 5. Les jeux

```jsonc
{ "id": "u05-aiguillage", "titre": "…", "description": "…", "tours": 10, "badge": "aiguilleur", "seuilBadge": 8, "questions": [ … ] }
```

`tours` questions sont tirées au hasard à chaque partie. Le badge (déclaré dans `config.json`) est gagné à partir de `seuilBadge` bonnes réponses.

---

## 6. Les types d'exercices

Champs communs : `id` (**obligatoire**, unique, stable), `type`, `question` (texte enrichi), `notions`, `explication` (affichée après la réponse), `consigne` (facultatif, sous la question).

### Sans écrire de code

| type | champs | ce que fait l'élève |
|---|---|---|
| `qcm` | `choix[]`, `bonne` (index), `code?`, `mono?` (choix en police de code) | choisit ; l'ordre des choix est mélangé (`"ordreFixe": true` pour l'empêcher) |
| `methode` | `choix[]` (noms de méthodes), `bonne` | choisit la bonne méthode (grille de boutons) |
| `vf` | `bonne` (bool), `code?` | Vrai / Faux |
| `predire` | `code` ; `choix` + `bonne` (QCM) **ou** saisie libre | prédit ce qu'affiche la console. En saisie libre, la bonne réponse est **la vraie sortie du code** (exécuté) ; `reponse` et `accepte[]` facultatifs ; `lignesReponse`, `aide` |
| `pointer-code` | `code` avec la cible entre `⟦` et `⟧`, `multi?` | touche un morceau du code (« le paramètre », « la valeur de départ »…) ; plusieurs cibles avec `"multi": true` |
| `pointer-tableau` | `tableau`, `bonnes[]` (indices), `nom?`, `negatifs?`, `sansIndices?`, `code?`, `multi?` | touche une ou plusieurs cases de la boîte d'œufs |
| `bug` | `code`, `ligne` (1 = première), `choix[]`, `bonne` | touche la ligne fautive, puis choisit l'explication |
| `tri` | `categories[]`, `items[[texte, indexCatégorie]]`, `mono?` | range des étiquettes en colonnes (glisser ou toucher) |
| `ordre` | `items[]` dans le bon ordre, `mono?` | remet des étapes dans l'ordre |
| `parsons` | `lignes[]` dans le bon ordre (indentation comprise), `distracteurs[]?` | reconstitue un programme ; les distracteurs sont des lignes pièges |
| `assoc` | `paires[[gauche, droite]]`, `mono?` | associe deux à deux |
| `erreurs` | comme `assoc` (gauche = message d'erreur) | traducteur d'erreurs |
| `reduce-pas` | `tableau`, `fonction` (ex. `"(acc, n) => acc + n"`), `depart?`, `nom?`, `code?` | remplit le tableau tour par tour (acc reçu, élément, retourne). Sans `depart` : pas de valeur de départ. Les valeurs sont **calculées** par le moteur |
| `filtre-visuel` | `tableau`, `condition` (ex. `"(n) => n % 2 !== 0"`), `nom?`, `code?` | touche les cases que filter garde (calculées) |
| `map-visuel` | `tableau`, `fonction`, `nom?`, `aide?`, `guillemetsFacultatifs?` | écrit chaque nouvelle case (calculée) |
| `types-chaine` | `depart` (expression), `maillons[]`, `choix?` | indique le type après chaque maillon (calculé) |
| `objet` | `cles[]`, `etiquettes[]`, `bonnes{ cle: [étiquettes acceptées] }`, `nom?`, `code?` | remplit un objet `{ … }` avec les bonnes étiquettes |
| `fisher-yates` | `tableau`, `tirages[]` (j pour i = n-1, n-2, …, 1) | touche les deux cases à échanger à chaque tour |

### Avec du code (exécuté et testé dans le bac à sable)

| type | champs propres |
|---|---|
| `trous` | `code` avec des `___` (3 tirets bas ou plus) ; `solution` = tableau des valeurs des trous ; `tailles?` |
| `corriger` | `depart` = le code buggé ; `solution` = le code corrigé |
| `ecrire` | `depart` (souvent `[""]` ou un squelette de fonction) ; `solution` |
| `boss` | dans `boss[]` de l'unité (voir § 7) |

Champs communs aux exercices de code :

```jsonc
{
  "donnees": { "numbers": [3, 14, 15] },   // variables déclarées AVANT le code de l'élève (affichées grisées, gelées par Object.freeze)
  "tests": { … },                          // voir ci-dessous
  "indices": [                             // 1 à 3 indices, débloqués un par un ; JAMAIS la solution complète
    "Léger : une question qui oriente",
    "Précis : la méthode, le piège à éviter",
    { "texte": "Presque : la structure à trous", "code": "return numbers.map((___) => ___);" }
  ],
  "solution": [ … ],                       // JAMAIS affichée : sert uniquement au testeur automatique
  "erreursTypiques": [ … ],                // voir ci-dessous
  "explication": "Affichée après la réussite (pas la solution)."
}
```

### Les tests

```jsonc
"tests": {
  "fonction": "getDoubled",       // fonction à appeler (sinon : mode « script », on lit des variables et la console)
  "cas": [
    { "titre": "Données du cours", "args": [[3, 14, 15]], "attendu": [6, 28, 30] },
    { "titre": "Autres données",   "args": [[-1, 0.5]],   "attendu": [-2, 1] },
    { "titre": "Tableau vide",     "args": [[]],          "attendu": [] }
  ],
  "interdit": ["push", "sort", "for"],    // méthodes ou mots interdits (cherchés hors commentaires et chaînes)
  "obligatoire": ["map"],                 // méthodes ou mots obligatoires ("=>" : fonctions fléchées)
  "sansConseil": ["egal-souple"]          // conseils automatiques à taire pour cet exercice
}
```

Chaque **cas** peut contenir :

| champ | rôle |
|---|---|
| `titre` | nom du cas, affiché à l'élève (« Tableau vide », « Nombres négatifs »…) |
| `fonction` | fonction à appeler pour ce cas (plusieurs fonctions dans un exercice) |
| `args` | arguments (JSON ; les tableaux et objets sont **gelés** : toute modification échoue, comme dans le cours) |
| `argsCode` | arguments écrits en JavaScript, évalués dans le code de l'élève : `"[square, 2]"`, `"[(x) => x + 1, 5]"` |
| `puis` | appel en chaîne : `"args": [2], "puis": [40]` teste `curryAdd(2)(40)` |
| `attendu` | valeur retournée attendue (comparaison profonde, type compris : `"13"` ≠ `13`) |
| `attenduUndefined` | `true` : on attend `undefined` (JSON ne sait pas l'écrire) |
| `sortie` | lignes attendues dans la console (pendant l'appel, ou pour tout le programme en mode script) |
| `variables` | mode script : valeurs attendues de variables du programme `{ "total": 7 }` |
| `donnees` | autres valeurs des `donnees` pour ce cas (mode script : tester avec d'autres données) |
| `repetitions`, `entier`, `min`, `max`, `tous` | fonction au hasard : appelée N fois ; chaque résultat entier dans [min, max] ; `tous` : chaque valeur doit sortir au moins une fois. En mode script : avec `"variable": "nom"` |
| `siEchec` | message affiché si ce cas échoue et qu'aucun diagnostic automatique ne s'applique |

**Toujours tester avec d'autres données que celles du cours**, dont un tableau vide, comme l'exige le cours.

### Les erreurs typiques (vérifiées par `tools/tester-exercices.py`)

```jsonc
"erreursTypiques": [
  { "code": "function getDoubled(numbers) {\n  numbers.forEach((n) => console.log(n * 2));\n}", "attendu": "echec", "diagnostic": "foreach-rien" },
  { "code": "…", "attendu": "erreur" },                    // doit provoquer une erreur JavaScript
  { "code": "…", "attendu": "conseil", "diagnostic": "param-nom-tableau" },   // passe les tests mais déclenche un conseil
  { "trous": ["const", "\"ville\""], "attendu": "echec" }  // pour un exercice à trous
]
```

`attendu` : `echec` (les tests échouent), `erreur` (JavaScript plante), `conseil` (réussit mais un conseil s'affiche). `diagnostic` (facultatif) : l'id du message qui DOIT s'afficher.

**Diagnostics automatiques** (dans `js/banc.js`) :

| id | quand |
|---|---|
| `return-vs-log` | la fonction retourne `undefined` mais affiche le bon résultat (console.log au lieu de return) |
| `sans-return` | la fonction retourne `undefined` |
| `foreach-rien` | forEach utilisé alors qu'un tableau doit être retourné |
| `fleche-sans-return` | map donne un tableau d'`undefined` (accolades sans return) |
| `texte-vs-nombre` | `"13"` au lieu de `13` (ou l'inverse), même dans un tableau |
| `oublie-spread` | un tableau dans le tableau (il manquait `...`) |
| `map-condition` | map avec une condition : tableau de true / false au lieu de filter |
| `map-longueur` / `filter-transforme` | map garde la longueur / filter ne transforme pas |
| `depart-zero` / `depart-texte` | mauvaise valeur de départ de reduce (0 pour un maximum, 0 pour du texte) |
| `donnees-en-dur` | marche avec les données du cours, pas avec d'autres (variable du cours utilisée au lieu du paramètre) |
| `boite-entiere` / `rien-affiche` | tout le tableau affiché d'un coup / rien n'est affiché |
| `fonction-affichee` | `console.log(maFonction)` sans parenthèses |
| `param-nom-tableau` | le paramètre de la fléchée porte le nom d'un tableau (`fruits.forEach((fruits) => …)`) |
| `accolades-sans-return`, `objet-sans-parentheses`, `reduce-un-param`, `tosorted-imbrique`, `egalite-tableaux`, `egal-souple` | conseils de l'analyse du code |
| `interdit` / `obligatoire` | méthode interdite utilisée / méthode attendue absente |
| `tableau-vide` | échoue seulement avec le tableau vide |
| `contenu` | message `siEchec` du cas |

Les erreurs JavaScript sont traduites en français (`x is not defined`, `Cannot read properties of undefined`, `Assignment to constant variable`, tableau gelé, `Reduce of empty array`, erreurs de syntaxe avec la ligne, texte sans guillemets…).

---

## 7. Les boss (exercices du cours)

Un boss est un exercice de code (`ecrire`) avec, en plus :

```jsonc
{
  "id": "u05-b2",
  "titre": "Les valeurs doublées",
  "source": "TP Tableaux · nombres, exercice 2",       // d'où vient l'exercice
  "notions": ["map", "callback-param", "return"],
  "enonce": "L'énoncé du prof, tel quel, puis le nom de fonction choisi.",
  "regles": ["La structure de données initiale ne doit pas être modifiée.", "…"],   // les contraintes du cours
  "donnees": { "numbers": [3, 14, 15, 92, 65, 35, 89, 79, 32, 38] },
  "depart": ["function getDoubled(numbers) {", "  ", "}", "", "console.log(getDoubled(numbers));"],
  "tests": { … },          // données du cours + autres données + cas limites (vide, négatifs, longueur paire…)
  "indices": [3 indices],  // obligatoirement 3, du plus léger au squelette à trous
  "solution": [ … ],       // jamais affichée
  "erreursTypiques": [ … ] // les erreurs réelles de l'élève sur cet exercice
}
```

L'élève peut réessayer autant qu'il veut ; « Passer » apparaît après 3 essais ; la solution n'est **jamais** affichée.
