<!-- Copie de la page du cours (chabloz.eu/progweb), enregistrée le 10 octobre 2026 : référence pour les boss. -->

# Exercice JS - DOM

Objectif: Se familiariser avec la sélection d'éléments dans le DOM, les événements et la manipulation des classes CSS.

## Ressources

- querySelector

- querySelectorAll

- addEventListener

- classList

- cloneNode

- replaceChildren

- removeAttribute

- Sélecteurs CSS

## Mise en place

Nous allons reprendre le jeu de 52 cartes du TP précédent, cette fois sous forme d'éléments HTML. Les cartes sont déjà dessinées et les boutons sont présents : à vous de les faire fonctionner !

Télécharger les fichiers cards.html et cards.css, puis les placer dans un même dossier.

Créer un fichier cards.js dans ce dossier.

Ajouter la ligne suivante dans le <head> du fichier HTML pour charger votre JavaScript une fois le document HTML analysé :

```
<script src="cards.js" type="module"></script>

```

Ouvrir cards.html dans un navigateur via un serveur HTTP local (et non directement avec une URL file://). Utiliser la console et l'inspecteur des outils de développement pour tester votre code.

Pour lancer simplement un serveur HTTP avec PHP, exécuter cette commande dans le dossier contenant vos fichiers :

```
php -S 127.0.0.1:8080

```

Ouvrir ensuite http://127.0.0.1:8080/cards.html dans le navigateur. Pour arrêter le serveur, utiliser Ctrl+C dans le terminal.

## Le jeu de cartes

Chaque carte est représentée par un custom element <playing-card>. Son identifiant combine sa couleur et son rang, par exemple HEART-2 ou SPADE-ACE. Ses classes indiquent également son rang et sa couleur : heart, spade, club ou diamond.

```
<playing-card id="SPADE-ACE" class="rank-ace spade">
    <span class="rank">A</span>
    <span class="suit">♠</span>
</playing-card>

```

L'attribut data-face-card est présent, sans valeur, sur les figures (face cards en anglais) : valets, dames et rois. Il est absent pour les autres cartes, y compris les as.

## Sélection des cartes

Toutes les sélections de cette partie doivent être limitées aux cartes du paquet d'origine, dans .deck, afin de ne pas sélectionner les cartes de la main que nous ajouterons ensuite. Vous pouvez sélectionner le conteneur, puis appeler querySelector et querySelectorAll sur celui-ci plutôt que sur document.

1) Écrire une fonction clearSelection qui sélectionne toutes les cartes du paquet d'origine avec querySelectorAll, les parcourt et retire la classe selected de chacune avec classList.

2) Programmer les six boutons ci-dessous. Pour chaque bouton :

- Sélectionner le bouton avec querySelector et lui associer un écouteur de l'événement click avec addEventListener.

- Lors du clic, appeler clearSelection pour retirer la sélection précédente.

- Sélectionner les cartes demandées, puis leur ajouter la classe selected avec classList.

Utiliser querySelector lorsqu'une seule carte est attendue, et querySelectorAll pour une collection de cartes. Pour chaque bouton, la sélection des cartes doit reposer sur un seul sélecteur CSS : ne pas filtrer les cartes en JavaScript.

- A) Ace of spades (select-ace-spade) : sélectionner l'as de pique par son identifiant.

- B) Hearts (select-hearts) : sélectionner toutes les cartes de cœur par leur classe.

- C) Red cards (select-red) : sélectionner les cœurs et les carreaux. Chercher comment exprimer un OU entre deux sélecteurs CSS.

- D) Face cards (select-face-cards) : sélectionner les valets, dames et rois à l'aide de l'attribut data-face-card.

- E) Red face cards (select-red-face-cards) : sélectionner uniquement les figures de cœur ou de carreau, en combinant classes et attribut.

- F) All except spades (select-not-spades) : sélectionner toutes les cartes qui ne sont pas des piques à l'aide de la pseudo-classe :not(). Veiller à sélectionner les cartes elles-mêmes, pas leurs éléments enfants.

3) Tester les boutons dans différents ordres. Chaque clic doit remplacer la sélection précédente, et non la compléter. Vérifier que les boutons A à F sélectionnent respectivement 1, 13, 26, 12, 6 et 39 cartes.

## Tirer une main

Le bouton Draw a hand (draw-hand) et le conteneur vide #hand sont déjà présents dans le HTML. Nous allons y afficher cinq cartes aléatoires, sans déplacer ni modifier celles du paquet d'origine.

4) Au démarrage du script, récupérer les 52 éléments <playing-card> du paquet d'origine et les convertir en un tableau nommé deck. Cette récupération doit être effectuée une seule et unique fois, avant les clics sur les boutons. L'opérateur de décomposition ... permet de convertir la collection retournée par querySelectorAll en tableau.

5) Reprendre la fonction shuffleInPlace du TP sur les tableaux. Associer un écouteur de l'événement click au bouton Draw a hand. À chaque clic :

- Créer une copie du tableau deck, puis mélanger cette copie avec shuffleInPlace.

- Prendre les cinq premiers éléments du tableau mélangé.

- Cloner chacune de ces cartes avec cloneNode(true) pour copier également ses éléments enfants.

- Retirer l'attribut id du clone avec removeAttribute pour ne pas créer d'identifiants en double, puis retirer sa classe selected.

- Stocker les cinq clones dans un tableau nommé handCards.

- Remplacer le contenu du conteneur #hand en une seule opération avec replaceChildren(...handCards).

6) Tirer plusieurs mains et vérifier que chaque tirage remplace les cinq cartes précédentes. Tester aussi les boutons A à F après un tirage : ils doivent toujours sélectionner uniquement les cartes du paquet d'origine, jamais celles de la main.
