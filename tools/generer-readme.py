#!/usr/bin/env python3
"""Écrit le README.md d'un cours à partir de content/ : la mascotte et le nom en « hero », la description, le lien du site,
le tableau des unités, le projet, les unités à venir, l'installation sur téléphone, l'ajout de supports, et la mention du modèle.
Lancé par tools/configurer.py ; à relancer après chaque ajout d'unité (aucune écriture à la main : le README reste à jour).

Dans le dépôt du modèle lui-même (app.cle = "mon-cours"), le README du modèle est conservé, sauf avec --forcer.

Usage : python3 tools/generer-readme.py [--forcer] [--sortie FICHIER]"""
import argparse, json, re, subprocess, sys
from outils import RACINE

MODELE = "https://github.com/williamdonze/cours-duolingo-template"
AUTEUR = "https://github.com/williamdonze"

ap = argparse.ArgumentParser()
ap.add_argument("--forcer", action="store_true", help="écrire le README même dans le dépôt du modèle")
ap.add_argument("--sortie", default=str(RACINE / "README.md"))
args = ap.parse_args()

config = json.loads((RACINE / "content/config.json").read_text(encoding="utf-8"))
app = config["app"]
if app.get("cle") == "mon-cours" and not args.forcer:
    print("· README.md : dépôt du modèle, README conservé (--forcer pour l'écrire quand même)")
    sys.exit(0)
unites = [json.loads((RACINE / c).read_text(encoding="utf-8")) for c in config["unites"]]
cellule = lambda t: re.sub(r"\s+", " ", str(t or "")).replace("|", "\\|").strip()
sans_balises = lambda t: re.sub(r"\[\[[^\]|]+\|([^\]]+)\]\]|\[\[([^\]]+)\]\]", lambda m: m.group(1) or m.group(2), str(t or ""))


def site():
    """Adresse GitHub Pages : app.site si elle est donnée, sinon déduite du dépôt (remote origin)."""
    if app.get("site"):
        return app["site"]
    try:
        url = subprocess.run(["git", "remote", "get-url", "origin"], cwd=RACINE, capture_output=True, text=True).stdout.strip()
    except Exception:
        return None
    m = re.search(r"([\w.-]+)/([\w.-]+?)(?:\.git)?/?$", url)
    return f"https://{m.group(1).lower()}.github.io/{m.group(2)}/" if m else None


lien = site()
nb_lecons = sum(len(u.get("lecons", [])) for u in unites)
nb_q = sum(len(l.get("exercices", [])) for u in unites for l in u.get("lecons", [])) \
    + sum(len(g.get("questions", [])) for u in unites for g in u.get("jeux", [])) \
    + sum(len(u.get("quiz", {}).get("questions", [])) for u in unites)
nb_boss = sum(len(u.get("boss", [])) for u in unites)
nb_fiches = sum(len(u.get("fiches", [])) for u in unites)
mascotte = app.get("mascotte", {}).get("nom", "la mascotte")

L = []
L.append(f'<p align="center"><img src="icones/mascotte.svg" width="150" alt="{mascotte}, la mascotte de {app["nom"]}"></p>')
L.append(f'<h1 align="center">{app["nom"]}</h1>')
L.append(f'<p align="center"><b>{app["description"]}</b></p>')
if app.get("cours"):
    L.append(f'<p align="center">{app["cours"]}</p>')
if lien:
    L.append(f'<p align="center"><a href="{lien}"><b>Ouvrir l\'appli →</b></a></p>')
L.append("")
L.append(f"Une appli façon Duolingo pour réviser le cours : leçons de cinq minutes, exercices interactifs, XP, séries de jours, badges, "
         f"défi du jour et révisions espacées (les notions ratées reviennent vite, les autres de plus en plus rarement). "
         f"Elle s'installe sur le téléphone et marche hors connexion ; la progression reste dans le navigateur.")
L.append("")
L.append(f"**{len(unites)} unités · {nb_lecons} leçons · {nb_q} questions · {nb_fiches} fiches de théorie · {nb_boss} boss** (les exercices du cours).")
L.append("")
L.append("## Les unités")
L.append("")
L.append("| | Unité | Ce que tu sauras faire | Boss |")
L.append("|---|---|---|---|")
for i, u in enumerate(unites, 1):
    titre = f"**{cellule(u['titre'])}**" + (f"<br><sub>{cellule(u['sousTitre'])}</sub>" if u.get("sousTitre") else "")
    boss = "<br>".join(cellule(b.get("source") or b.get("titre")) for b in u.get("boss", [])) or "—"
    L.append(f"| {i} | {titre} | {cellule(sans_balises(u.get('objectif')))} | {boss} |")
L.append("")
if config.get("projet"):
    pj = config["projet"]
    L.append(f"## Le projet : {pj['titre']}")
    L.append("")
    if pj.get("description"):
        L.append(sans_balises(pj["description"]))
        L.append("")
    L.append("Dans l'appli, ses critères sont une liste à cocher ; chacun renvoie aux leçons qui l'enseignent :")
    L.append("")
    for c in pj["criteres"]:
        L.append(f"- {sans_balises(c['texte'])}")
    L.append("")
if config.get("aVenir"):
    L.append("## Bientôt")
    L.append("")
    for a in config["aVenir"]:
        L.append(f"- **{a['titre']}**" + (f" : {a['resume']}" if a.get("resume") else ""))
    L.append("")
L.append("## Sur ton téléphone")
L.append("")
appli = f"[l'appli]({lien})" if lien else "l'appli"
L.append(f"Ouvre {appli} sur ton téléphone : après la première leçon, {mascotte} te montre comment l'ajouter à l'écran d'accueil "
         "(iPhone : Partager → « Sur l'écran d'accueil » ; Android : « Installer »). Le mode d'emploi est aussi dans Profil.")
L.append("")
L.append("## Compléter le cours")
L.append("")
L.append("- **Nouveaux supports** (slides, énoncés, PDF) : dépose-les dans `supports/` (sur GitHub : *Add file → Upload files*), "
         "puis, dans une session Claude Code sur ce dépôt, tape **`/ajouter-supports`**. Claude propose les nouvelles unités, tu valides, il les écrit et les teste.")
L.append("- **Améliorations du moteur** : **`/mettre-a-jour-moteur`** reprend la dernière version du modèle sans toucher au contenu.")
L.append("")
L.append("## Pour développer")
L.append("")
L.append("```bash")
L.append("python3 -m http.server 8765        # puis http://localhost:8765/")
L.append("python3 tools/valider-contenu.py && python3 tools/tester-exercices.py && python3 tools/test-parcours.py")
L.append("```")
L.append("")
L.append("Le contenu est en JSON dans `content/` (une unité par fichier), le format dans `docs/format-contenu.md`, le programme dans `docs/programme.md`.")
L.append("")
L.append("---")
L.append("")
L.append(f'<p align="center"><sub>Créé à partir du <a href="{MODELE}">modèle de cours façon Duolingo</a> de <a href="{AUTEUR}">William Donzé</a>.</sub></p>')

open(args.sortie, "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"✓ {args.sortie if args.sortie != str(RACINE / 'README.md') else 'README.md'}")
