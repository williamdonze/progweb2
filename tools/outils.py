"""Outils communs aux scripts de test : serveur HTTP local et lancement de Chromium (Playwright)."""
import os, socket, subprocess, sys, time
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("PORT", "8765"))
URL = f"http://localhost:{PORT}/"


def serveur():
    """Lance `python3 -m http.server` sur PORT s'il ne tourne pas déjà. Renvoie le processus (ou None)."""
    with socket.socket() as s:
        occupe = s.connect_ex(("localhost", PORT)) == 0
    if occupe:   # un serveur tourne déjà : est-ce bien celui de CE cours ? (plusieurs cours peuvent utiliser le même port)
        import urllib.request
        try: distant = urllib.request.urlopen(URL + "content/config.json", timeout=3).read()
        except Exception: distant = b""
        if distant != (RACINE / "content/config.json").read_bytes():
            raise RuntimeError(f"le port {PORT} est occupé par un autre site : arrête-le, ou lance avec PORT=8790 python3 tools/…")
        return None
    proc = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=RACINE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        with socket.socket() as s:
            if s.connect_ex(("localhost", PORT)) == 0:
                return proc
        time.sleep(0.1)
    raise RuntimeError("le serveur HTTP ne démarre pas")


def navigateur(p):
    """Chromium de Playwright ; à défaut, un Chromium déjà installé (variable CHROMIUM ou /opt/pw-browsers)."""
    try:
        return p.chromium.launch()
    except Exception:
        candidats = [os.environ.get("CHROMIUM")] + sorted(Path("/opt/pw-browsers").glob("chromium-*/chrome-linux/chrome"), reverse=True)
        for c in candidats:
            if c and Path(c).exists():
                return p.chromium.launch(executable_path=str(c))
        raise


def exemple(page, nom):
    """--exemple NOM : la page charge l'unité d'exemple tools/exemples/NOM/ (unite.json) au lieu du contenu, avec les
    réglages de tools/exemples/NOM/config.json (langage, modules) : de quoi tester un langage ou un module dans le modèle."""
    import json
    if not nom:
        return
    dossier = RACINE / "tools" / "exemples" / nom
    if not dossier.is_dir():
        raise SystemExit(f"--exemple : dossier introuvable ({dossier}) ; exemples : {', '.join(d.name for d in (RACINE / 'tools/exemples').iterdir())}")
    config = json.loads((RACINE / "content/config.json").read_text(encoding="utf-8"))
    reglages = json.loads((dossier / "config.json").read_text(encoding="utf-8"))
    config["app"] = {**config["app"], **reglages.get("app", {})}
    config["unites"] = [f"tools/exemples/{nom}/unite.json"]
    config["aVenir"] = []
    config.pop("projet", None)
    config["badges"] = [b for b in config["badges"] if b["id"] != "memoire"]
    corps = json.dumps(config, ensure_ascii=False)
    page.route("**/content/config.json", lambda r: r.fulfill(body=corps, content_type="application/json"))
