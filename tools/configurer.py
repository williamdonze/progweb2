#!/usr/bin/env python3
"""Applique la section "app" de content/config.json aux fichiers statiques, que le navigateur lit AVANT le JavaScript :
index.html (titre, description, icône de l'onglet), manifest.webmanifest (nom de l'appli installée), sw.js (nom du cache),
et régénère icones/ à partir de la mascotte. À lancer après chaque changement de la section "app".

Usage : python3 tools/configurer.py [--sans-icones]"""
import argparse, json, re, sys, urllib.parse
from outils import RACINE

ap = argparse.ArgumentParser()
ap.add_argument("--sans-icones", action="store_true", help="ne pas régénérer icones/ (pas besoin de Chromium)")
args = ap.parse_args()

config = json.loads((RACINE / "content/config.json").read_text(encoding="utf-8"))
app = config.get("app") or sys.exit("content/config.json : section « app » manquante")
for k in ["nom", "cle", "description"]:
    if not app.get(k):
        sys.exit(f"content/config.json : app.{k} manquant")
esc = lambda t: t.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def remplacer(chemin, motif, remplacement, texte):
    nouveau, n = re.subn(motif, remplacement, texte, count=1, flags=re.S)
    if not n:
        sys.exit(f"{chemin} : motif introuvable ({motif})")
    return nouveau


# 1. icônes (et le dessin de la mascotte pour l'onglet)
svg = None
if not args.sans_icones:
    import importlib
    svg = importlib.import_module("build-icones").generer()["svg"]

# 2. index.html
p = RACINE / "index.html"; t = p.read_text(encoding="utf-8")
t = remplacer(p, r"<title>.*?</title>", f"<title>{esc(app['nom'])}</title>", t)
t = remplacer(p, r'<meta name="description" content=".*?">', f'<meta name="description" content="{esc(app["description"])}">', t)
t = remplacer(p, r'<meta name="apple-mobile-web-app-title" content=".*?">', f'<meta name="apple-mobile-web-app-title" content="{esc(app["nom"])}">', t)
t = remplacer(p, r'<html lang=".*?">', f'<html lang="{app.get("langue", "fr")}">', t)
t = remplacer(p, r"<noscript>.*?</noscript>", f'<noscript><p style="padding:20px">{esc(app["nom"])} a besoin de JavaScript pour fonctionner.</p></noscript>', t)
if svg:
    t = remplacer(p, r'<link rel="icon" href=".*?">', f'<link rel="icon" href="data:image/svg+xml,{urllib.parse.quote(svg, safe=" =:/,")}">', t)
p.write_text(t, encoding="utf-8"); print("✓ index.html")

# 3. manifest.webmanifest
p = RACINE / "manifest.webmanifest"; m = json.loads(p.read_text(encoding="utf-8"))
m.update({"name": app.get("nomLong", app["nom"]), "short_name": app["nom"], "description": app["description"], "lang": app.get("langue", "fr")})
p.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"); print("✓ manifest.webmanifest")

# 4. sw.js : nouveau nom de cache (les appareils des élèves jettent les vieilles copies)
p = RACINE / "sw.js"; t = p.read_text(encoding="utf-8")
v = re.search(r'const CACHE = "[^"]*-v(\d+)";', t)
t = remplacer(p, r'const CACHE = "[^"]*";', f'const CACHE = "{app["cle"]}-v{int(v.group(1)) + 1 if v else 1}";', t)
p.write_text(t, encoding="utf-8"); print("✓ sw.js")
