#!/usr/bin/env python3
"""Régénère icones/ (Coco, l'œuf entre accolades, sur fond crème) via Chromium : 192, 512, maskable 512, apple-touch 180."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from outils import navigateur, RACINE

SVG = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
<path d='M22 18c-9 0-12 5-12 12v18c0 6-3 10-8 12 5 2 8 6 8 12v18c0 7 3 12 12 12' stroke='#5B3FD9' stroke-width='7' fill='none' stroke-linecap='round'/>
<path d='M98 18c9 0 12 5 12 12v18c0 6 3 10 8 12-5 2-8 6-8 12v18c0 7-3 12-12 12' stroke='#5B3FD9' stroke-width='7' fill='none' stroke-linecap='round'/>
<path d='M60 12c17 0 30 30 30 56a30 30 0 0 1-60 0c0-26 13-56 30-56z' fill='#FFF6E4' stroke='#E3C98F' stroke-width='3'/>
<ellipse cx='48' cy='36' rx='6' ry='9' fill='#fff' opacity='.9'/>
<circle cx='49' cy='64' r='7' fill='#fff' stroke='#2a2340' stroke-width='1.5'/><circle cx='71' cy='64' r='7' fill='#fff' stroke='#2a2340' stroke-width='1.5'/>
<circle cx='50.5' cy='65' r='3.6' fill='#2a2340'/><circle cx='72.5' cy='65' r='3.6' fill='#2a2340'/>
<circle cx='40' cy='76' r='5' fill='#ff9fb4' opacity='.6'/><circle cx='80' cy='76' r='5' fill='#ff9fb4' opacity='.6'/>
<path d='M49 79q11 11 22 0' stroke='#2a2340' stroke-width='3.5' fill='#fff' stroke-linecap='round'/></svg>"""

def page(taille, marge):
    return f"""<html><body style='margin:0;background:#FAF7F0;width:{taille}px;height:{taille}px;display:grid;place-items:center'>
    <img src="data:image/svg+xml;utf8,{SVG.replace('#', '%23')}" style='width:{taille - 2 * marge}px;height:{taille - 2 * marge}px'></body></html>"""

sortie = RACINE / "icones"; sortie.mkdir(exist_ok=True)
with sync_playwright() as p:
    b = navigateur(p)
    for nom, taille, marge in [("icone-192.png", 192, 14), ("icone-512.png", 512, 36), ("icone-maskable-512.png", 512, 96), ("apple-touch-icon.png", 180, 16)]:
        pg = b.new_page(viewport={"width": taille, "height": taille})
        pg.set_content(page(taille, marge)); pg.wait_for_timeout(100)
        pg.screenshot(path=str(sortie / nom)); pg.close()
        print("✓", nom)
    b.close()
