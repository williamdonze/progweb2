#!/usr/bin/env python3
"""Reprend le moteur de la dernière version du modèle dans le dépôt d'un cours, sans toucher au contenu.

Copié depuis le modèle : js/, css/, tools/, .claude/skills/, docs/format-contenu.md, docs/format-memo.md, docs/modules.md,
supports/README.md, .github/workflows/, index.html, sw.js, manifest.webmanifest (puis tools/configurer.py y remet l'identité du cours),
et CLAUDE.md (sauf la section « Ce cours », gardée telle quelle).
Jamais touché : content/, docs/cours/, docs/programme.md, README.md (régénéré), icones/ (régénérées).
Les fichiers propres au cours (un module ajouté, une compétence en plus) sont gardés.

Rien n'est commité : après coup, `git diff` montre tout ce qui a changé. Si un fichier commun avait été modifié dans le cours
(une mascotte dessinée dans js/base.js, un module branché dans js/questions.js…), ces modifications apparaissent comme
supprimées dans le diff : les reporter dans le modèle (le mieux) ou les rétablir, avant de commiter.

Usage : python3 tools/mettre-a-jour-moteur.py [--essai] [--source URL_OU_DOSSIER]"""
import argparse, filecmp, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from outils import RACINE

MODELE = "https://github.com/williamdonze/cours-duolingo-template.git"
DOSSIERS = ["js", "css", "tools", ".claude/skills", ".github/workflows"]
FICHIERS = ["index.html", "sw.js", "manifest.webmanifest", "docs/format-contenu.md", "docs/format-memo.md", "docs/modules.md", "supports/README.md"]
IGNORES = {"__pycache__", "captures"}
# moteurs lourds (js/vendor/…) : copiés seulement si le cours active le module qui s'en sert
VENDOR = {"js/vendor/php-wasm": "code-php"}

ap = argparse.ArgumentParser()
ap.add_argument("--essai", action="store_true", help="montrer ce qui changerait, sans rien écrire")
ap.add_argument("--source", default=MODELE, help="dépôt ou dossier du modèle (défaut : le modèle sur GitHub)")
args = ap.parse_args()

if (RACINE / "content/config.json").read_text(encoding="utf-8").find('"cle": "mon-cours"') >= 0:
    sys.exit("Ce dépôt est le modèle lui-même : rien à mettre à jour.")

tmp = None
if Path(args.source).is_dir():
    src = Path(args.source).resolve()
else:
    tmp = tempfile.mkdtemp(prefix="modele-")
    r = subprocess.run(["git", "clone", "-q", "--depth", "1", args.source, tmp], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Impossible de récupérer le modèle ({args.source}) : {r.stderr.strip()}\n"
                 "Si le réseau bloque GitHub, autorise github.com dans les réglages réseau, ou passe un dossier avec --source.")
    src = Path(tmp)
version = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=src, capture_output=True, text=True).stdout.strip() or "?"

# la liste des fichiers du modèle à reprendre
a_copier = []
for d in DOSSIERS:
    for f in sorted((src / d).rglob("*")) if (src / d).exists() else []:
        if f.is_file() and not (set(f.relative_to(src).parts) & IGNORES) and not str(f.relative_to(src)).startswith("tools/exemples/"):
            a_copier.append(f.relative_to(src))
a_copier += [Path(f) for f in FICHIERS if (src / f).exists()]
import json
modules = set(json.loads((RACINE / "content/config.json").read_text(encoding="utf-8")).get("app", {}).get("modules", []))
inutiles = [d for d, m in VENDOR.items() if m not in modules]
a_copier = [f for f in a_copier if not any(str(f).startswith(d + "/") for d in inutiles)]

nouveaux, modifies = [], []
for rel in a_copier:
    cible = RACINE / rel
    if not cible.exists(): nouveaux.append(rel)
    elif not filecmp.cmp(src / rel, cible, shallow=False): modifies.append(rel)
propres = sorted(f.relative_to(RACINE) for d in DOSSIERS if (RACINE / d).exists() for f in (RACINE / d).rglob("*")
                 if f.is_file() and not (set(f.relative_to(RACINE).parts) & IGNORES) and not (src / f.relative_to(RACINE)).exists()
                 and not any(str(f.relative_to(RACINE)).startswith(d + "/") for d in VENDOR))

print(f"Modèle : {args.source} (version {version})")
for titre, liste in [("nouveaux", nouveaux), ("mis à jour", modifies), ("propres au cours, gardés", propres)]:
    print(f"\n{titre} ({len(liste)}) :")
    for f in liste: print("  ", f)

# CLAUDE.md : la version du modèle, avec la section « Ce cours » du cours
def fusion_claude():
    cours, modele = (RACINE / "CLAUDE.md").read_text(encoding="utf-8"), (src / "CLAUDE.md").read_text(encoding="utf-8")
    sect = lambda t: re.search(r"^## Ce cours\n.*?(?=^## )", t, flags=re.S | re.M)
    a, b = sect(cours), sect(modele)
    if not (a and b): return None
    titre = re.match(r"# .*\n", cours)
    resultat = modele[:b.start()] + a.group(0) + modele[b.end():]
    return (titre.group(0) + resultat[re.match(r"# .*\n", resultat).end():]) if titre else resultat
claude = fusion_claude()
print("\nCLAUDE.md :", "mis à jour (section « Ce cours » gardée)" if claude else "non fusionné (section « Ce cours » introuvable) : à faire à la main")

if args.essai:
    print("\n(essai : rien n'a été écrit)")
else:
    sw = RACINE / "sw.js"
    ancien_cache = re.search(r'const CACHE = "[^"]*";', sw.read_text(encoding="utf-8")) if sw.exists() else None
    for rel in nouveaux + modifies:
        (RACINE / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src / rel, RACINE / rel)
    if ancien_cache:   # garder la numérotation du cache du cours (configurer.py l'incrémente)
        t = sw.read_text(encoding="utf-8")
        sw.write_text(re.sub(r'const CACHE = "[^"]*";', ancien_cache.group(0), t, count=1), encoding="utf-8")
    if claude: (RACINE / "CLAUDE.md").write_text(claude, encoding="utf-8")
    (RACINE / "docs").mkdir(exist_ok=True)
    (RACINE / "docs/version-moteur.txt").write_text(f"{args.source} {version}\n", encoding="utf-8")
    print("\n✓ moteur copié. Ensuite :")
    print("  python3 tools/configurer.py      (identité du cours dans index.html, manifeste, cache, icônes, README)")
    print("  git diff                          (repérer les modifications propres au cours qui auraient été écrasées)")
    print("  python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py")
if tmp:
    shutil.rmtree(tmp, ignore_errors=True)
