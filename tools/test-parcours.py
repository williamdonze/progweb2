#!/usr/bin/env python3
"""Parcours complet dans un vrai navigateur, comme un élève qui ne se tromperait jamais :
chaque leçon, jeu, quiz et boss de chaque unité, dans l'ordre du parcours (le nœud « Commencer / Continuer »).
Chaque question est remplie par son resoudre() (la bonne réponse calculée par le moteur), puis vérifiée par le
vrai bouton « Vérifier » : une feuille rouge signale une incohérence entre une question et son corrigé.

Vérifie aussi (langage exécuté : JavaScript, PHP…) : le parcours « faux puis corrigé » d'un exercice de code (feuille rouge, Corriger, puis vert) ;
la sauvegarde (XP, unités validées, boss), le défi du jour, les vues Théorie, Console et Profil.

Usage : python3 tools/test-parcours.py [--captures] [--largeur 390] [--exemple php]
"""
import argparse, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from outils import serveur, navigateur, exemple, URL, RACINE

ap = argparse.ArgumentParser()
ap.add_argument("--captures", action="store_true", help="enregistrer une capture par type de question dans tools/captures/")
ap.add_argument("--largeur", type=int, default=390)
ap.add_argument("--exemple", help="jouer une unité d'exemple de tools/exemples/ (php, java…) au lieu du contenu")
args = ap.parse_args()
CAP = RACINE / "tools" / "captures"
if args.captures:
    CAP.mkdir(exist_ok=True)

problemes, vus = [], set()
proc = serveur()


def jouer_session(pg, titre):
    """Joue la session ouverte jusqu'à l'écran de fin. Renvoie le nombre de questions."""
    n = 0
    for _ in range(400):
        pg.wait_for_selector(".lcard, [data-check], .endcard, .sheet", timeout=10000)
        if pg.query_selector(".endcard"):
            pg.click("[data-done]")
            return n
        if pg.query_selector(".sheet"):
            raise RuntimeError("feuille inattendue")
        if pg.query_selector(".lcard") and pg.query_selector("[data-next]"):
            pg.click("[data-next]")
            continue
        info = pg.evaluate("() => ({ type: document.querySelector('.qkind')?.textContent, titre: document.querySelector('.qtitle')?.textContent })")
        kind = (info["type"] or "").split("·")[0].strip()
        if args.captures and kind not in vus:
            vus.add(kind)
            pg.screenshot(path=str(CAP / f"q-{len(vus):02d}-{kind.replace(' ', '_').replace('/', '-')}.png"), full_page=False)
        pg.evaluate("async () => { await window.__q.resoudre(); }")
        pg.wait_for_selector("[data-check]:not([disabled])", timeout=5000)
        pg.click("[data-check]")
        pg.wait_for_selector(".sheet", timeout=30000)
        if pg.query_selector(".sheet.ko"):
            detail = pg.inner_text(".sheet .expl")[:300]
            problemes.append(f"{titre} · {kind} · « {info['titre']} » : faux alors que résolu → {detail}")
            if pg.query_selector("[data-fix]"):
                # exercice de code : on passe après avoir enregistré le problème
                for _ in range(3):
                    pg.click("[data-fix]"); pg.evaluate("async () => { await window.__q.resoudre(); }")
                    pg.click("[data-check]"); pg.wait_for_selector(".sheet", timeout=30000)
                    if pg.query_selector("[data-cont]"): break
                if pg.query_selector("[data-skip]"): pg.click("[data-skip]")
        n += 1
        pg.click("[data-cont]")
    raise RuntimeError("session sans fin")


try:
    with sync_playwright() as p:
        b = navigateur(p)
        pg = b.new_page(viewport={"width": args.largeur, "height": 844})
        erreurs_js = []
        pg.on("pageerror", lambda e: erreurs_js.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and erreurs_js.append(m.text))
        exemple(pg, args.exemple)
        pg.goto(URL + "?test")
        pg.wait_for_selector(".unit-head")
        if args.captures:
            pg.screenshot(path=str(CAP / "00-accueil.png"))

        # 0. accueil : replier / déplier une unité, et le bouton « Reprendre » qui ramène à l'étape en cours
        pg.click(".unit:not(.locked) .unit-head")
        if not pg.query_selector(".unit.repliee"): problemes.append("accueil : un clic sur la bannière ne replie pas l'unité")
        if pg.evaluate("() => Object.values(ST.repliees).length") != 1: problemes.append("accueil : le repli n'est pas sauvegardé")
        pg.wait_for_selector(".aller-courant:not([hidden])", timeout=3000)
        pg.click(".aller-courant")
        pg.wait_for_timeout(700)
        if pg.query_selector(".unit.repliee .node-wrap.has-start"): problemes.append("« Reprendre » ne déplie pas l'unité en cours")
        if not pg.evaluate("() => { const r = document.querySelector('.node-wrap.has-start').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }"):
            problemes.append("« Reprendre » ne ramène pas à l'étape en cours")
        pg.evaluate("() => { ST.repliees = {}; save(); window.scrollTo(0, 0); }")
        demo = pg.evaluate("() => aCode() ? LANG.demo || null : null")   # langage exécuté (js/langages.js) : son exercice de démonstration
        # 1. exercice de code raté puis corrigé (démonstration, indépendante du contenu ; le moteur peut démarrer : délais larges)
        if demo:
            pg.evaluate("""(d) => runSession([{ kind:'q', q:{ type:'ecrire', id:'demo-code', question:'Affiche Bonjour le monde', depart:[''],
                tests:{ cas:[{ sortie:['Bonjour le monde'] }] }, indices:['…'], solution:[d.juste], explication:'demo' } }], { title:'démo', onEnd:() => ({}) })""", demo)
            pg.wait_for_selector(".editeur textarea")
            pg.fill(".editeur textarea", demo["faux"])
            pg.click("[data-check]")
            pg.wait_for_selector(".sheet.ko [data-fix]", timeout=60000)
            texte = pg.inner_text(".sheet")
            if demo["motAttendu"] not in texte:
                problemes.append(f"code faux : le message n'explique pas « {demo['motAttendu']} » → {texte[:200]}")
            if args.captures:
                pg.screenshot(path=str(CAP / "code-faux-feuille.png"))
            pg.click("[data-fix]")
            pg.fill(".editeur textarea", demo["juste"])
            pg.click("[data-check]")
            pg.wait_for_selector(".sheet.ok", timeout=20000)
            pg.click("[data-cont]"); pg.click("[data-done]")
            pg.wait_for_selector(".unit-head")

        # 2. tout le parcours, nœud après nœud
        sessions = -1
        while pg.query_selector(".node-wrap.has-start .node"):
            label = pg.inner_text(".node-wrap.has-start .node-label").split("\n")[0]
            pg.click(".node-wrap.has-start .node")
            jouer_session(pg, label)
            sessions += 1
            pg.wait_for_selector(".unit-head")
        etat = pg.evaluate("() => ({ xp: ST.xp, unites: D.unites.length, quiz: Object.values(ST.quiz).filter(q => q.passed).length, boss: Object.values(ST.boss).filter(b => b.fait).length, totalBoss: D.unites.reduce((s, u) => s + u.boss.length, 0), notions: Object.keys(ST.notions).length })")
        print(f"{sessions + 1} sessions jouées · {etat['xp']} XP · {etat['quiz']}/{etat['unites']} unités validées · {etat['boss']}/{etat['totalBoss']} boss · {etat['notions']} notions suivies")
        if etat["quiz"] != etat["unites"]: problemes.append("toutes les unités ne sont pas validées")
        if etat["boss"] != etat["totalBoss"]: problemes.append("tous les boss ne sont pas vaincus")

        # 3. défi du jour (après avoir rendu deux notions « dues »)
        pg.evaluate("() => { const ids = Object.keys(ST.notions).slice(0, 2); ids.forEach(i => ST.notions[i].due = todayStr()); save(); render(); }")
        pg.click("[data-daily]")
        nq = jouer_session(pg, "défi du jour")
        if nq < 4: problemes.append(f"défi du jour trop court ({nq} questions)")

        # 3 bis. types d'exercices pas encore utilisés par le contenu : Fisher–Yates, en vrais clics
        pg.evaluate("""() => runSession([{ kind:'q', q:{ type:'fisher-yates', id:'demo-fy', question:'Mélange le paquet', tableau:['A','B','C','D'], tirages:[1, 1, 0], explication:'demo' } },
                                            { kind:'q', q:{ type:'ordre', id:'demo-ordre', question:'Ordre', items:['un','deux','trois'], explication:'demo' } }],
                                           { title:'démo', onEnd:() => ({}) })""")
        for i, j in [(3, 1), (2, 1), (1, 0)]:
            pg.click(f'.fy-boite .case[data-i="{i}"] .oeuf'); pg.click(f'.fy-boite .case[data-i="{j}"] .oeuf')
        pg.wait_for_selector("[data-check]:not([disabled])")
        if args.captures:
            pg.screenshot(path=str(CAP / "q-fisher-yates.png"))
        pg.click("[data-check]"); pg.wait_for_selector(".sheet")
        if not pg.query_selector(".sheet.ok"): problemes.append("Fisher–Yates : les bons échanges sont comptés faux")
        ordre = pg.evaluate("() => [...document.querySelectorAll('.fy-boite .oeuf')].map(e => e.textContent).join('')").replace('"', '')
        if ordre != "CADB": problemes.append(f"Fisher–Yates : ordre final {ordre} au lieu de CADB")
        pg.click("[data-cont]")
        for t in ["un", "deux", "trois"]:
            pg.click(f'.pool .chip:text-is("{t}")')
        pg.click("[data-check]"); pg.wait_for_selector(".sheet")
        if not pg.query_selector(".sheet.ok"): problemes.append("Ordre : la bonne réponse est comptée fausse")
        pg.click("[data-cont]"); pg.click("[data-done]")

        # 4. les autres vues
        for vue in ["theorie"] + (["console"] if demo else []) + ["profil", "defi"]:
            pg.click(f'.tab[data-go="{vue}"]')
            pg.wait_for_timeout(150)
            if args.captures:
                pg.screenshot(path=str(CAP / f"vue-{vue}.png"), full_page=True)
        pg.click('.tab[data-go="theorie"]')
        pg.click(".fiche-lien")
        pg.wait_for_selector(".drawer [data-close]")
        if pg.query_selector(".drawer [data-run]"):
            pg.click(".drawer [data-run]")
            pg.wait_for_selector(".drawer .console")
        if args.captures:
            pg.screenshot(path=str(CAP / "fiche.png"))
        pg.click(".drawer [data-close]")
        if demo:
            pg.click('.tab[data-go="console"]')
            pg.fill(".editeur textarea", demo["console"])
            pg.click("main [data-run]")
            pg.wait_for_selector("main .diag", timeout=20000)
            if demo["consoleAttendu"] not in pg.inner_text("main .resultat"):
                problemes.append("console libre : l'erreur n'est pas expliquée")
        # 4 bis. le projet (s'il y en a un) : cocher un critère, il reste coché
        if pg.evaluate("() => !!D.config.projet"):
            pg.click('.tab[data-go="home"]'); pg.click('.daily.projet [data-go="projet"]')
            pg.click(".critere .coche")
            if args.captures:
                pg.screenshot(path=str(CAP / "vue-projet.png"), full_page=True)
            if pg.evaluate("() => Object.keys(ST.projet).length") != 1: problemes.append("projet : le critère coché n'est pas enregistré")
            pg.click('.tab[data-go="home"]')
        # 5. la sauvegarde survit à un rechargement
        xp = pg.evaluate("() => ST.xp")
        pg.reload(); pg.wait_for_selector(".unit-head")
        if pg.evaluate("() => ST.xp") != xp: problemes.append("la sauvegarde n'a pas survécu au rechargement")
        b.close()
        problemes += [f"erreur JavaScript : {e}" for e in erreurs_js]
finally:
    if proc:
        proc.terminate()

for x in problemes:
    print("✖", x)
if problemes:
    sys.exit(1)
print("Parcours complet sans erreur.")
