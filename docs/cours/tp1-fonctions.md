<!-- Copie de la page du cours (chabloz.eu/progweb), enregistrée le 10 octobre 2026 : référence pour les boss. -->

# Exercice JS - Fonctions

Objectif: Se familiariser avec la syntaxe JavaScript et reviser les bases de l'algo prog

1) Ecrire une fonction qui retourne la plus grande valeur parmi les trois nombres fournis en paramètre.

2) Ecrire une fonction qui retourne un nombre entier pseudo-aléatoire entre une borne inférieure et une borne supérieure (bornes entières et comprises dans l'intervalle).

3) Ecrire deux fonctions compareA et compareB qui retournent les mêmes résultats que dans les exemples suivant:

```
compareA(4, '4'); // true 
compareA(4.0, '4'); // true
compareA(4, 'quatre'); // false

compareB(8, '8'); // false
compareB(8, 'huit'); // false

```

4) En fonction d'un nombre n (ou n > 0) donné en paramètre, écrire une fonction qui affiche dans la console :

- Les nombres entiers pairs compris entre 0 et n.

- Les nombres entiers pairs et multiples de 7 compris entre 0 et n.

- Les nombres entiers pairs et multiples de 3, ainsi que les nombres entiers multiple de 7 compris entre 0 et n.

- Les nombres entiers pairs et multiples de 3, mais non multiples de 7 compris entre 0 et n.

5) Ecrire deux fonctions retournant réciproquement:

- le nombre de piles obtenus sur un lancé de n pièces de monnaies simulées par l'utilisation du générateur de nombre aléatoire.

- le nombre de piles et de faces obtenus sur un lancé de n pièces de monnaies simulées par l'utilisation du générateur de nombre aléatoire.

6) Ecrire une fonction qui indique si un nombre entier est un nombre premier ou non. Tester la fonction avec les valeurs suivantes: 0, 1, 2, 3, 4, 9, 11, 26, 87178291197, 87178291199.

7) Ecrire une fonction nommée cl qui affiche dans la console, ligne après ligne, toutes les données fournies en paramètre. Exemple d'appel:

```
cl(1, 2 ,"a", [3.1, 4, 159]);

```

8) Écrire deux fonctions :

- double, qui retourne le double du nombre reçu ;

- square, qui retourne le carré du nombre reçu.

Écrire ensuite une fonction transform qui reçoit un nombre et une fonction en paramètres. Elle doit appliquer la fonction reçue au nombre, puis retourner le résultat.

```
transform(5, double); // Returns 10
transform(5, square); // Returns 25

```

9) Écrire une fonction repeatTransform qui reçoit un nombre, une fonction et un nombre de répétitions en paramètres. Elle doit appliquer la fonction au nombre, puis appliquer à nouveau cette même fonction au résultat obtenu, autant de fois que demandé. Elle retourne le résultat final.

```
repeatTransform(2, double, 3); // Returns 16: 2 → 4 → 8 → 16
repeatTransform(2, square, 2); // Returns 16: 2 → 4 → 16

```

10) Écrire une fonction createGreeting qui reçoit une formule de salutation et retourne une nouvelle fonction. La fonction retournée reçoit un prénom et retourne le message complet.

```
const sayHello = createGreeting('Hello');
const sayWelcome = createGreeting('Welcome');

sayHello('Ada');     // Returns "Hello Ada !"
sayWelcome('Linus'); // Returns "Welcome Linus !"

```
