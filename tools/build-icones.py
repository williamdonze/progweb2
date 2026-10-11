#!/usr/bin/env python3
"""Régénère icones/ (192, 512, maskable 512, apple-touch 180) à partir de la mascotte définie dans
content/config.json (section "app") : on ouvre l'appli, on lui demande son dessin, on le photographie.
Renvoie aussi le SVG (utilisé par tools/configurer.py pour l'icône de l'onglet)."""
import urllib.parse
from playwright.sync_api import sync_playwright
from outils import navigateur, serveur, RACINE, URL


def dessin(pg):
    """SVG autonome de la mascotte + couleur de fond de l'appli, lus dans l'appli elle-même."""
    pg.goto(URL + "?test")
    pg.wait_for_function("() => typeof APP !== 'undefined' && D.config && D.config.app")
    return pg.evaluate("""() => {
        const css = getComputedStyle(document.documentElement);
        const svg = mascot('happy', css.getPropertyValue('--prim').trim()).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
        return { svg, fond: css.getPropertyValue('--bg').trim() || '#FAF7F0' };
    }""")


def generer():
    proc = serveur()
    try:
        with sync_playwright() as p:
            b = navigateur(p)
            d = dessin(b.new_page())
            uri = "data:image/svg+xml;utf8," + urllib.parse.quote(d["svg"])
            sortie = RACINE / "icones"; sortie.mkdir(exist_ok=True)
            for nom, taille, marge in [("icone-192.png", 192, 14), ("icone-512.png", 512, 36), ("icone-maskable-512.png", 512, 96), ("apple-touch-icon.png", 180, 16)]:
                pg = b.new_page(viewport={"width": taille, "height": taille})
                pg.set_content(f"""<html><body style="margin:0;background:{d['fond']};width:{taille}px;height:{taille}px;display:grid;place-items:center">
                    <img src="{uri}" style="width:{taille - 2 * marge}px;height:{taille - 2 * marge}px"></body></html>""")
                pg.wait_for_timeout(150)
                pg.screenshot(path=str(sortie / nom)); pg.close()
                print("✓ icones/" + nom)
            b.close()
            return d
    finally:
        if proc:
            proc.terminate()


if __name__ == "__main__":
    generer()
