#!/usr/bin/env python3
"""Dessine des mascottes en une image PNG, pour les montrer à l'élève avant de choisir (étape « identité » de /nouveau-cours).

  python3 tools/apercu-mascottes.py --catalogue                      # toutes les formes et tous les accessoires → docs/mascottes.png
  python3 tools/apercu-mascottes.py propositions.json --sortie a.png  # des propositions : une ligne chacune (3 humeurs + clair/sombre)

propositions.json : [{ "titre": "1. Elly", "nom": "Elly", "forme": "elephant", "accessoire": "lunettes", "cadre": ["<?", "?>"],
                       "corps": "#B3B8E3", "bord": "#5F64A8", "accent": "#9EA4D6", "prim": "#5F64A8" }, …]
("prim" : la couleur principale envisagée pour l'appli, utilisée pour le cadre et les accessoires.)"""
import argparse, json
from playwright.sync_api import sync_playwright
from outils import navigateur, serveur, RACINE, URL

ap = argparse.ArgumentParser()
ap.add_argument("propositions", nargs="?", help="fichier JSON des propositions")
ap.add_argument("--catalogue", action="store_true", help="toutes les formes et tous les accessoires")
ap.add_argument("--sortie", help="image PNG (défaut : docs/mascottes.png pour le catalogue, apercu-mascottes.png sinon)")
args = ap.parse_args()
if not args.catalogue and not args.propositions:
    ap.error("donne un fichier de propositions, ou --catalogue")
sortie = args.sortie or str(RACINE / ("docs/mascottes.png" if args.catalogue else "apercu-mascottes.png"))

SCRIPT = """(o) => {
  const base = { ...APP.mascotte };
  const css = getComputedStyle(document.documentElement);
  const dessiner = (m, mood, prim) => { APP.mascotte = { ...base, cadre: [], accessoire: undefined, ...m }; return mascot(mood, prim || css.getPropertyValue('--prim').trim()); };
  let lignes = [];
  if (o.catalogue) {
    const couleurs = { oeuf: ['#FFF6E4', '#E3C98F'], elephant: ['#B3B8E3', '#5F64A8', '#9EA4D6'], chouette: ['#C9A27A', '#7A5534', '#8E6544'],
                       renard: ['#F08A3C', '#B5541A', '#fff'], goutte: ['#9FD8F5', '#3B8DBF'], livre: ['#E86A5C', '#9C3A30', '#7E2C24'] };
    const col = f => ({ corps: couleurs[f][0], bord: couleurs[f][1], accent: couleurs[f][2] });
    lignes.push({ titre: 'Formes (champ « forme »)', cases: Object.keys(MASCOTTES).map(f => [f, dessiner({ forme: f, ...col(f) }, 'happy')]) });
    lignes.push({ titre: 'Humeurs (happy, sad, wow) et cadres de code (« cadre »)', cases: [
      ['happy', dessiner({ forme: 'oeuf', ...col('oeuf') }, 'happy')], ['sad', dessiner({ forme: 'oeuf', ...col('oeuf') }, 'sad')], ['wow', dessiner({ forme: 'oeuf', ...col('oeuf') }, 'wow')],
      ['{ }', dessiner({ forme: 'oeuf', ...col('oeuf'), cadre: ['{', '}'] }, 'happy')], ['<? ?>', dessiner({ forme: 'elephant', ...col('elephant'), cadre: ['<?', '?>'] }, 'happy')], ['$ _', dessiner({ forme: 'goutte', ...col('goutte'), cadre: ['$', '_'] }, 'happy')]] });
    const formes = Object.keys(MASCOTTES);
    lignes.push({ titre: 'Accessoires (champ « accessoire »)', cases: Object.keys(ACCESSOIRES).map((a, i) => { const f = formes[i % formes.length]; return [`${a}`, dessiner({ forme: f, ...col(f), accessoire: a }, 'happy')]; }) });
  } else {
    lignes = o.propositions.map(p => ({ titre: p.titre || p.nom || p.forme, cases: [
      ['happy', dessiner(p, 'happy', p.prim)], ['sad', dessiner(p, 'sad', p.prim)], ['wow', dessiner(p, 'wow', p.prim)], ['sombre', dessiner(p, 'happy', p.prim), true]] }));
  }
  APP.mascotte = base;
  document.body.innerHTML = `<div id="planche" style="padding:20px 24px;background:#FAF7F0;font-family:Nunito,system-ui,sans-serif;color:#2a2340;width:max-content">${lignes.map(l =>
    `<h2 style="font:800 18px Baloo\\\\ 2,system-ui;margin:10px 0 6px">${l.titre}</h2><div style="display:flex;gap:14px">${l.cases.map(([t, svg, sombre]) =>
      `<figure style="margin:0;width:120px;text-align:center;background:${sombre ? '#13121C' : '#fff'};border:2px solid #E8E2D6;border-radius:16px;padding:8px 0 6px">${svg.replace('class="mascot"', 'style="width:96px;height:96px"')}<figcaption style="font-size:13px;font-weight:800;color:${sombre ? '#cfc9e6' : '#6b6580'}">${esc(t)}</figcaption></figure>`).join('')}</div>`).join('')}</div>`;
}"""

proc = serveur()
try:
    with sync_playwright() as p:
        b = navigateur(p)
        pg = b.new_page(device_scale_factor=2)
        pg.goto(URL + "?test")
        pg.wait_for_function("() => typeof MASCOTTES !== 'undefined' && D.config && D.config.app")
        props = json.loads(open(args.propositions, encoding="utf-8").read()) if args.propositions else None
        pg.evaluate(SCRIPT, {"catalogue": args.catalogue, "propositions": props})
        pg.locator("#planche").screenshot(path=sortie)
        b.close()
finally:
    if proc:
        proc.terminate()
print("✓", sortie)
