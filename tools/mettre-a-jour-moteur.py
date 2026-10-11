#!/usr/bin/env python3
"""Met à jour le MOTEUR d'une appli de cours avec celui de ce modèle, sans toucher à son contenu.

Copie depuis le modèle : js/, css/, tools/ (scripts), index.html, docs/format-contenu.md, docs/modules.md,
.github/workflows/tests.yml et les compétences de .claude/skills/ du modèle.
Ne touche jamais : content/ (unités, config, pages), CLAUDE.md, README.md, docs/programme.md, docs/cours/,
icones/, manifest.webmanifest. Garde le nom du cache de sw.js (configurer.py l'incrémente ensuite).

Usage (depuis le dossier du modèle) : python3 tools/mettre-a-jour-moteur.py /chemin/du/cours [--essai]
Ensuite, dans le dossier du cours : python3 tools/configurer.py, puis les trois tests."""
import argparse, json, re, shutil, sys
from pathlib import Path

MODELE = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("cours", help="dossier de l'appli du cours à mettre à jour")
ap.add_argument("--essai", action="store_true", help="afficher ce qui changerait, sans rien copier")
args = ap.parse_args()
cours = Path(args.cours).resolve()

if cours == MODELE:
    sys.exit("C'est le dossier du modèle lui-même : donne le dossier du cours.")
cfg = cours / "content/config.json"
if not cfg.exists():
    sys.exit(f"{cfg} introuvable : est-ce bien une appli de cours ?")
app = json.loads(cfg.read_text(encoding="utf-8")).get("app")
if not app or not app.get("cle"):
    sys.exit("content/config.json n'a pas de section « app » avec une « cle » : ajoute-la d'abord (docs/format-contenu.md § 1).\n"
             "La clé DOIT reprendre celle de l'ancienne sauvegarde (ex. « progweb2 » si l'ancienne clé était « progweb2-sauvegarde-v1 »),\n"
             "sinon les élèves perdent leur progression.")

FICHIERS = ["index.html", "docs/format-contenu.md", "docs/modules.md", ".github/workflows/tests.yml"]
DOSSIERS = ["js", "css", "tools"]
a_copier = [Path(f) for f in FICHIERS]
for d in DOSSIERS:
    a_copier += [p.relative_to(MODELE) for p in (MODELE / d).rglob("*") if p.is_file() and "__pycache__" not in p.parts and "captures" not in p.parts]
a_copier += [p.relative_to(MODELE) for p in (MODELE / ".claude/skills").rglob("*") if p.is_file()]

changes = []
for rel in sorted(set(a_copier)):
    src, dst = MODELE / rel, cours / rel
    if not dst.exists():
        changes.append(("nouveau", rel))
    elif src.read_bytes() != dst.read_bytes():
        changes.append(("modifié", rel))
for etat, rel in changes:
    print(f"{etat:8} {rel}")
if not changes:
    print("Le moteur est déjà à jour.")
if args.essai or not changes:
    sys.exit(0)

for _, rel in changes:
    (cours / rel).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(MODELE / rel, cours / rel)

# sw.js : le code du modèle, mais le nom de cache du cours (configurer.py l'incrémente)
sw_cours = cours / "sw.js"
ancien = re.search(r'const CACHE = "[^"]*";', sw_cours.read_text(encoding="utf-8")) if sw_cours.exists() else None
t = (MODELE / "sw.js").read_text(encoding="utf-8")
if ancien:
    t = re.sub(r'const CACHE = "[^"]*";', ancien.group(0), t, count=1)
sw_cours.write_text(t, encoding="utf-8")

print(f"\n✓ {len(changes)} fichier(s) mis à jour dans {cours}")
print("Ensuite, dans le dossier du cours : python3 tools/configurer.py, puis\n"
      "python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py")
