#!/usr/bin/env python3
"""Teste TOUT le contenu dans un vrai navigateur, avec le vrai bac à sable (Web Worker) :
- chaque exercice de code : la solution de référence passe les tests ;
- chaque erreur typique (liste « Mes difficultés réelles ») échoue, avec le diagnostic annoncé ;
- chaque question « prédire » : la bonne réponse est bien ce que le code affiche ;
- chaque exemple de carte ou de fiche s'exécute sans erreur.

Usage : python3 tools/tester-exercices.py [--unite u05] [--avertissements] [--exemple php]
Code de sortie 1 s'il y a une erreur.
"""
import argparse, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from outils import serveur, navigateur, exemple, URL, RACINE

ap = argparse.ArgumentParser()
ap.add_argument("--unite", help="ne tester qu'une unité (ex. u05)")
ap.add_argument("--avertissements", action="store_true", help="afficher aussi les avertissements")
ap.add_argument("--exemple", help="tester une unité d'exemple de tools/exemples/ (php, java…) au lieu du contenu")
args = ap.parse_args()

proc = serveur()
try:
    with sync_playwright() as p:
        b = navigateur(p)
        pg = b.new_page()
        erreurs_page = []
        pg.on("pageerror", lambda e: erreurs_page.append(str(e)))
        exemple(pg, args.exemple)
        pg.goto(URL + "?test")
        pg.wait_for_function("typeof D !== 'undefined' && D.unites.length > 0 && document.querySelector('.node, h2')", timeout=15000)
        pg.add_script_tag(path=str(RACINE / "tools" / "tester-dans-la-page.js"))
        rapport = pg.evaluate("(u) => testerTout(u)", args.unite)
        b.close()
finally:
    if proc:
        proc.terminate()

s = rapport["stats"]
print(f"{s['questions']} questions · {s['solutions']} solutions de code · {s['erreursTypiques']} erreurs typiques · {s['predictions']} prédictions · {s['exemples']} exemples exécutés")
for e in erreurs_page:
    print("ERREUR DE PAGE :", e)
if args.avertissements:
    for a in rapport["avertissements"]:
        print("⚠", a)
elif rapport["avertissements"]:
    print(f"⚠ {len(rapport['avertissements'])} avertissements (--avertissements pour les voir)")
for e in rapport["erreurs"]:
    print("✖", e)
if rapport["erreurs"] or erreurs_page:
    print(f"\n{len(rapport['erreurs'])} erreur(s).")
    sys.exit(1)
print("\nTout est vert : chaque solution passe, chaque erreur typique est bien détectée.")
