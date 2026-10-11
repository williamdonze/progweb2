#!/usr/bin/env python3
"""Crée le squelette d'une unité (content/unites/uNN-nom.json) et l'ajoute au sommaire (config.json) :
Claude n'a plus qu'à écrire le contenu pédagogique, sans recopier la structure. Retire l'unité de « aVenir » si elle y était
(même titre). Refuse d'écraser une unité existante.

Usage : python3 tools/nouvelle-unite.py u05 "Parcourir et transformer" [--nom tableaux] [--apres u04]
                                         [--lecons 4] [--sous-titre "TP 2 : …"] [--objectif "…"] [--icone "[ ]"]"""
import argparse, json, re, sys, unicodedata
from outils import RACINE

ap = argparse.ArgumentParser()
ap.add_argument("id", help="id de l'unité : u + deux chiffres (u05)")
ap.add_argument("titre")
ap.add_argument("--nom", help="fin du nom de fichier (par défaut : tiré du titre)")
ap.add_argument("--apres", help="placer l'unité après celle-ci dans le sommaire (par défaut : à la fin)")
ap.add_argument("--lecons", type=int, default=4, help="nombre de leçons à préparer (défaut : 4)")
ap.add_argument("--sous-titre", default="")
ap.add_argument("--objectif", default="")
ap.add_argument("--icone", default="")
args = ap.parse_args()

if not re.fullmatch(r"u\d{2,3}", args.id):
    sys.exit("id d'unité attendu : u + deux chiffres (u05)")
slug = args.nom or re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", args.titre).encode("ascii", "ignore").decode().lower()).strip("-")
slug = "-".join(slug.split("-")[:3])
chemin = f"content/unites/{args.id}-{slug}.json"
pc = RACINE / "content/config.json"
texte = pc.read_text(encoding="utf-8")
config = json.loads(texte)
for c in config["unites"]:
    if re.search(rf"/{args.id}-", c):
        sys.exit(f"l'unité {args.id} existe déjà : {c}")
if (RACINE / chemin).exists():
    sys.exit(f"{chemin} existe déjà")

u = args.id
unite = {
    "id": u,
    "titre": args.titre,
    "sousTitre": args.sous_titre,
    "objectif": args.objectif,
    "icone": args.icone,
    "fiches": [],
    "lecons": [{"id": f"{u}-l{k}", "titre": "", "duree": 5, "notions": [], "cartes": [], "exercices": []} for k in range(1, args.lecons + 1)],
    "jeux": [],
    "quiz": {"titre": f"Quiz : {args.titre}", "questions": []},
    "boss": [],
}
(RACINE / chemin).write_text(json.dumps(unite, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# sommaire : édition du texte (on garde la mise en forme de config.json)
liste = config["unites"]
pos = len(liste)
if args.apres:
    trouve = [i for i, c in enumerate(liste) if re.search(rf"/{args.apres}-", c)]
    if not trouve:
        sys.exit(f"--apres : unité {args.apres} introuvable dans config.json")
    pos = trouve[0] + 1
liste.insert(pos, chemin)
bloc = '"unites": [\n' + ",\n".join(f'    "{c}"' for c in liste) + "\n  ]"
texte, n = re.subn(r'"unites"\s*:\s*\[[^\]]*\]', bloc, texte, count=1)
if not n:
    sys.exit("config.json : liste « unites » introuvable")
# l'unité sort de « Bientôt » si elle y était annoncée sous le même titre
avant = config.get("aVenir", [])
reste = [a for a in avant if a.get("titre", "").strip().lower() != args.titre.strip().lower()]
if len(reste) != len(avant):
    rendu = "[]" if not reste else "[\n" + ",\n".join("    " + json.dumps(a, ensure_ascii=False) for a in reste) + "\n  ]"
    texte = re.sub(r'"aVenir"\s*:\s*\[.*?\n?\s*\](?=,\n)', '"aVenir": ' + rendu, texte, count=1, flags=re.S)
json.loads(texte)   # garde-fou : le sommaire reste du JSON valide
pc.write_text(texte, encoding="utf-8")
print(f"✓ {chemin} ({args.lecons} leçons vides : {u}-l1 … {u}-l{args.lecons})")
print(f"✓ content/config.json : unité ajoutée en position {pos + 1}" + (" ; retirée de « Bientôt »" if len(reste) != len(avant) else ""))
print("Ensuite : écrire fiches, leçons, jeu, quiz, boss (docs/format-memo.md), puis "
      f"python3 tools/valider-contenu.py && python3 tools/tester-exercices.py --unite {u}")
