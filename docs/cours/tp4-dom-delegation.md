<!-- Copie de la page du cours (chabloz.eu/progweb), enregistrée par l'élève le 13 octobre 2026 : référence pour les boss. -->

# Exercice JS - DOM et délégation d'événements

Objectif: Manipuler des éléments du DOM, factoriser les opérations courantes et utiliser la délégation d'événements pour gérer des éléments créés dynamiquement.

## Ressources

- querySelector et querySelectorAll

- addEventListener

- submit et preventDefault

- template et content et cloneNode

- textContent, append et remove

- confirm

- target, currentTarget et closest

- dataset et contains

- previousElementSibling et nextElementSibling

## Mise en place

Nous allons créer une tier list pour classer les éléments de votre choix : films, jeux, livres… Chaque élément appartient à une catégorie, de S à D, et possède une position dans cette catégorie. Les éléments préférés viennent en premier.

- 
Télécharger tier_list.html et tier_list.css, puis les placer dans un même dossier.

- 
Créer un fichier tier_list.js et le charger depuis le <head> du HTML :

```
<script src="tier_list.js" type="module"></script>

```

- 
Lancer un serveur HTTP depuis ce dossier :

```
php -S 127.0.0.1:8080

```

Ouvrir http://127.0.0.1:8080/tier_list.html. Utiliser la console et l'inspecteur pour tester votre code. Arrêter le serveur avec Ctrl+C.

Utiliser la mini-bibliothèque dom.js fournie pour les sélections, les événements et les échanges d'éléments. La placer dans le même dossier que tier_list.js, puis importer ses fonctions au début de ce fichier :

```
import { getNode, getNodes, forEach, on, delegateOn, swapNodes } from './dom.js';

```

## Créer les éléments

Au démarrage du script, préparer une constante tmplItem en clonant l'élément article.item contenu dans le template #item-template :

```
const tmplItem = getNode('article.item', getNode('#item-template').content).cloneNode(true);

```

Conserver ce modèle intact pour créer les cartes suivantes.

1) À la soumission du formulaire #add-item-form, créer une nouvelle carte à partir du modèle tmplItem, lui donner le nom saisi par l'utilisateur et l'ajouter à la fin de #tier-s.

Vérifier que le bouton Add et la touche Entrée dans le champ permettent tous deux de créer un élément.

## Programmer les actions

Utiliser delegateOn pour installer un seul écouteur click sur #tiers, ciblant les boutons qui possèdent l'attribut data-action. Les boutons contiennent des éléments span : un clic sur leur texte ou leur symbole doit être traité comme un clic sur le bouton.

2) Programmer le bouton de suppression (delete) : demander confirmation avec confirm, puis retirer la carte avec remove uniquement si l'utilisateur confirme. Vérifier qu'une annulation conserve la carte.

3) Programmer les changements de catégorie :

- Tier ▲ (up) : déplacer la carte dans la catégorie précédente, vers S.

- Tier ▼ (down) : déplacer la carte dans la catégorie suivante, vers D.

Définir l'ordre des catégories dans une constante :

```
const TIERS = ['S', 'A', 'B', 'C', 'D'];

```

Retrouver la section .tier de la carte et lire son attribut data-tier avec dataset. Utiliser TIERS pour déterminer la catégorie de destination, puis sélectionner celle-ci par son attribut data-tier. Ajouter la carte à la fin de son conteneur .items.

En S, monter ne fait rien. En D, descendre ne fait rien.

4) Utiliser swapNodes pour les changements d'ordre dans une catégorie :

- Order + (previous) : donner plus d'importance à la carte en l'échangeant avec la carte précédente.

- Order − (next) : diminuer l'importance de la carte en l'échangeant avec la carte suivante.

Utiliser previousElementSibling et nextElementSibling sur la carte. Si le voisin demandé n'existe pas, ne rien faire.

5) Tester votre tier list avec plusieurs éléments :

- Ajouter, déplacer, réordonner et supprimer des cartes dans différentes catégories.

- Cliquer directement sur les symboles à l'intérieur des boutons.

- Vérifier les limites : première et dernière position, catégories S et D.

## Fichiers fournis

### dom.js (https://chabloz.eu/progweb/markdown_codes/dom.js, récupéré le 13 octobre 2026)

```js
export function getNode(selector, dom = document) {
  return dom.querySelector(selector);
}

export function getNodes(selector, dom = document) {
  return dom.querySelectorAll(selector);
}

export function forEach(selector, callback, dom = document) {
  for (const node of getNodes(selector, dom)) callback(node);
}

export function on(selector, event, callback, options, dom = document) {
  forEach(selector, node => node.addEventListener(event, evt => callback(node, evt), options), dom);
}

export function delegateOn(selector, childSelector, event, callback, options, dom = document) {
  forEach(selector, node => node.addEventListener(event, evt => {
    const closest = evt.target.closest(childSelector);
    if (!closest || !node.contains(closest)) return;
    callback(closest, evt.currentTarget, evt);
  }, options), dom);
}

export function swapNodes(el1, el2) {
  const placeholder = document.createComment('swap');

  el1.replaceWith(placeholder);
  el2.replaceWith(el1);
  placeholder.replaceWith(el2);
}
```

### tier_list.html

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tier list — DOM</title>
    <link rel="stylesheet" href="tier_list.css">
</head>
<body>
    <main>
        <h1>My tier list</h1>
        <p>Add your items and rank them from S to D. Within each tier, arrange them in order of preference, with your favorites first.</p>

        <form id="add-item-form">
            <label for="item-name">Item name</label>
            <div class="form-controls">
                <input id="item-name" name="name" type="text" placeholder="A movie, a game, a food…" required maxlength="80">
                <button>Add</button>
            </div>
        </form>

            <section class="tiers-panel">
                <h2>Tier list</h2>
                <p>New items start in S. Change their tier or order, and use 🗑️ to delete them.</p>
                <div id="tiers">
                    <section class="tier" data-tier="S">
                        <h3>S</h3>
                        <div id="tier-s" class="items"></div>
                    </section>
                    <section class="tier" data-tier="A">
                        <h3>A</h3>
                        <div id="tier-a" class="items"></div>
                    </section>
                    <section class="tier" data-tier="B">
                        <h3>B</h3>
                        <div id="tier-b" class="items"></div>
                    </section>
                    <section class="tier" data-tier="C">
                        <h3>C</h3>
                        <div id="tier-c" class="items"></div>
                    </section>
                    <section class="tier" data-tier="D">
                        <h3>D</h3>
                        <div id="tier-d" class="items"></div>
                    </section>
                </div>
            </section>
    </main>

    <template id="item-template">
        <article class="item">
            <button data-action="delete" title="Delete this item"><span>🗑️</span></button>
            <p class="item-name"></p>
            <div class="item-controls">
                <button data-action="up" title="Move to a higher tier">Tier <span>▲</span></button>
                <button data-action="down" title="Move to a lower tier">Tier <span>▼</span></button>
                <button data-action="previous" title="Move earlier within this tier">Order <span>+</span></button>
                <button data-action="next" title="Move later within this tier">Order <span>−</span></button>
            </div>
        </article>
    </template>
</body>
</html>
```

`tier_list.css` : voir `supports/tp4-dom-delegation/tier_list.css`.
