---
name: ecrire-unite
description: Écrit (ou complète) UNE unité d'un cours déjà planifié dans docs/programme.md : fiches, leçons, jeu, quiz, boss, puis la teste. À utiliser quand l'élève tape « /ecrire-unite u05 », ou quand /nouveau-cours ou /ajouter-supports confie une unité à un sous-agent.
---

# Écrire une unité

Tu écris **une seule** unité, `uNN` (donnée en argument), d'un cours dont le programme est validé. Tu travailles dans un contexte court : ne lis que ce qui est listé ici.

## À lire (et rien d'autre)

1. `CLAUDE.md` : les « Exigences pédagogiques » et la section « Ce cours » (analogies, modules).
2. `docs/format-memo.md` : le format. Pour un cas rare (test DOM, `verifie`, `melange`, un diagnostic précis), cherche la ligne dans `docs/format-contenu.md` avec `grep`, sans tout lire.
3. Dans `docs/programme.md` : la section `## uNN`, plus les analogies et les difficultés en tête du fichier.
4. Les fichiers de `docs/cours/` cités dans « Supports » de cette section.
5. Les fiches déjà écrites, pour s'y relier sans doublon : `python3 tools/valider-contenu.py --fiches`.
6. Le squelette `content/unites/uNN-*.json` (s'il n'existe pas : `python3 tools/nouvelle-unite.py uNN "Titre"`).

## Écrire

- Les fiches prévues dans le programme, avec **ces ids exactement**. Puis 3 à 5 leçons : 4 à 6 cartes, 5 à 8 exercices de types variés (une notion à la fois, puis mélange avec les notions précédentes), avec **d'autres données** que celles du cours. Un jeu de 10 à 20 questions rapides. Un quiz de 15 à 18 questions, dont 2 ou 3 sur les unités précédentes.
- Les **boss** : l'énoncé du prof tel quel (`enonce`), sa `source`, les `regles` du cours ; tests avec les données du cours **et** d'autres données ; 3 indices progressifs ; `solution` (jamais affichée) ; `erreursTypiques` avec le diagnostic attendu. Pour un cours sans code : une étude de cas (scénario + 4 à 8 questions qui reproduisent ce qu'on attend dans le travail noté). Jamais de boss sur l'organisation d'un projet.
- Chaque question : un `id` stable (`uNN-l2-e3`…), des `notions`, une `explication`. Les analogies du cours, toujours les mêmes.
- Rien d'inventé : un énoncé, une définition ou une consigne qui manque dans les supports se signale dans ton compte rendu, ne s'invente pas.
- N'écris **que** `content/unites/uNN-*.json`. Pas de changement dans `js/`, `config.json` ou les autres unités : un besoin (nouveau diagnostic, nouveau type) se signale dans le compte rendu.
- Pour compléter une unité existante (`/ajouter-supports`) : ajoute des leçons, des questions ou des boss avec de **nouveaux** ids ; ne renomme ni ne supprime jamais un id existant (la progression de l'élève en dépend). Si l'unité a un `parcours`, ajoute-y les nouvelles étapes.

## Tester

Avec le port donné (sinon 8765) :

```bash
python3 tools/valider-contenu.py
PORT=8771 python3 tools/tester-exercices.py --unite uNN
```

Corrige jusqu'au vert, sans avertissement sur ton unité. Pour les sorties longues, ne garde que les lignes en échec (`| grep -v "✓"`).

## Compte rendu (10 lignes au plus)

Fiches, leçons, nombre de questions, boss (avec leur source) ; avertissements restants ; ce qui manque dans les supports ; besoins pour le moteur. Pas de contenu recopié.

Si tu as été lancé directement par l'élève (`/ecrire-unite`, pas en sous-agent) : passe aussi l'« État » de l'unité à « écrite » dans `docs/programme.md`, relance `python3 tools/configurer.py --sans-icones` (README) et commite.
