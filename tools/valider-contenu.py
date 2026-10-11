#!/usr/bin/env python3
"""Validation statique du contenu (sans navigateur) : à lancer après CHAQUE modification de content/.
Vérifie la structure des JSON, les identifiants (uniques, stables), le parcours, les champs obligatoires
de chaque type d'exercice, les liens vers les fiches. Code de sortie 1 en cas d'erreur ; les ⚠ sont à relire.
Le test complet (exécution réelle des solutions et des erreurs typiques) est tools/tester-exercices.py.

--fiches : affiche aussi les fiches de chaque unité (id et titre), pour s'y relier sans relire les unités.
--exemple php : valide l'unité d'exemple tools/exemples/php/ (test d'un langage dans le modèle)."""
import json, re, sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
erreurs, avert = [], []
E = erreurs.append
W = avert.append

TYPES = {
    "qcm": ["question", "choix", "bonne"], "methode": ["question", "choix", "bonne"], "vf": ["question", "bonne"],
    "ordre": ["question", "items"], "parsons": ["question", "lignes"], "assoc": ["question", "paires"], "erreurs": ["question", "paires"],
    "tri": ["question", "categories", "items"], "pointer-code": ["question", "code"], "pointer-tableau": ["question", "tableau", "bonnes"],
    "bug": ["question", "code", "ligne", "choix", "bonne"], "predire": ["question", "code"], "reduce-pas": ["question", "tableau", "fonction"],
    "filtre-visuel": ["question", "tableau", "condition"], "map-visuel": ["question", "tableau", "fonction"],
    "objet": ["question", "cles", "etiquettes", "bonnes"], "fisher-yates": ["question", "tableau", "tirages"],
    "types-chaine": ["question", "depart", "maillons"], "selecteur": ["question", "dom", "attendu"],
    "trous": ["question", "code", "tests", "solution"], "corriger": ["question", "depart", "tests", "solution"],
    "ecrire": ["question", "tests", "solution"], "boss": ["titre", "enonce", "tests", "solution", "indices"],
}
CODE = {"trous", "corriger", "ecrire", "boss"}
# langages (js/langages.js) et le module qui exécute chacun (None : coloration et exercices sans exécution)
LANGAGES = {"js": "code-js", "php": "code-php", "java": None, "python": None, "c": None, "cpp": None, "csharp": None, "sql": None, "bash": None}
MODULES_CONNUS = {"code-js", "dom", "code-php"}
# types qui évaluent du JavaScript (quel que soit le langage du cours) : module « code-js » ; les pages web : module « dom »
TYPES_JS_SEUL = {"reduce-pas", "filtre-visuel", "map-visuel", "types-chaine", "fisher-yates", "pointer-tableau", "objet"}
TYPES_CODE_JS = CODE | TYPES_JS_SEUL
# champs permis dans un cas de test PHP (js/php.js)
CHAMPS_CAS_PHP = {"titre", "requete", "code", "fonction", "args", "attendu", "sortie", "contient", "neContientPas", "redirection", "cookies", "dureeCookies",
                  "session", "sessionVide", "statut", "variables", "donnees", "siEchec", "appel"}
lignes = lambda c: "\n".join(c) if isinstance(c, list) else str(c or "")

try:
    config = json.loads((RACINE / "content/config.json").read_text(encoding="utf-8"))
except Exception as e:
    print("✖ content/config.json illisible :", e); sys.exit(1)
# --exemple NOM : valider l'unité d'exemple tools/exemples/NOM/ (langage, modules) au lieu du contenu
if "--exemple" in sys.argv:
    nom = sys.argv[sys.argv.index("--exemple") + 1]
    reglages = json.loads((RACINE / f"tools/exemples/{nom}/config.json").read_text(encoding="utf-8"))
    config["app"] = {**config["app"], **reglages.get("app", {})}
    config["unites"], config["aVenir"] = [f"tools/exemples/{nom}/unite.json"], []
    config.pop("projet", None)
    config["badges"] = [b for b in config["badges"] if b["id"] != "memoire"]
for k in ["app", "seuilValidation", "unites", "rangs", "badges"]:
    if k not in config: E(f"config.json : champ « {k} » manquant")
APP = config.get("app", {})
for k in ["nom", "cle", "description"]:
    if not APP.get(k): E(f"config.json : app.{k} manquant")
if APP.get("cle") and not re.fullmatch(r"[a-z0-9-]+", APP["cle"]): E("config.json : app.cle en minuscules, chiffres et tirets (elle nomme la sauvegarde : ne plus la changer ensuite)")
# mascotte : une forme du catalogue (MASCOTTES dans js/base.js), un accessoire (ACCESSOIRES), ou un dessin libre (fichier)
FORMES = {"oeuf", "elephant", "chouette", "renard", "goutte", "livre"}
ACCESSOIRES = {"lunettes", "mortier", "toque", "beret", "casque", "noeud"}
MASC = APP.get("mascotte", {})
if MASC.get("fichier"):
    if not (RACINE / MASC["fichier"]).exists(): E(f"config.json : mascotte.fichier introuvable ({MASC['fichier']})")
    elif 'id="humeur-' not in (RACINE / MASC["fichier"]).read_text(encoding="utf-8"): W("config.json : mascotte.fichier sans groupes id=\"humeur-happy\" / \"humeur-sad\" / \"humeur-wow\" (une seule humeur)")
else:
    if MASC.get("forme", "oeuf") not in FORMES: E(f"config.json : mascotte.forme inconnue « {MASC.get('forme')} » (connues : {', '.join(sorted(FORMES))})")
    if MASC.get("accessoire") and MASC["accessoire"] not in ACCESSOIRES: E(f"config.json : mascotte.accessoire inconnu « {MASC['accessoire']} » (connus : {', '.join(sorted(ACCESSOIRES))})")
    for k in ["nom", "corps", "bord"]:
        if not MASC.get(k): E(f"config.json : mascotte.{k} manquant")
MODULES = set(APP.get("modules", []))
for m in MODULES - MODULES_CONNUS: E(f"config.json : module inconnu « {m} » (connus : {', '.join(sorted(MODULES_CONNUS))})")
LANGAGE = APP.get("langage") or ("php" if "code-php" in MODULES else "js")
if LANGAGE not in LANGAGES: E(f"config.json : langage inconnu « {LANGAGE} » (connus : {', '.join(LANGAGES)} ; en ajouter un : docs/modules.md)")
if "code-php" in MODULES and "code-js" in MODULES: E("config.json : un cours exécute UN langage : « code-php » ou « code-js », pas les deux")
EXEC = LANGAGES.get(LANGAGE) in MODULES   # le code du cours est-il exécuté ?
if LANGAGES.get(LANGAGE) and not EXEC: W(f"config.json : langage « {LANGAGE} » sans son module « {LANGAGES[LANGAGE]} » : le code ne sera pas exécuté")

unites, ids_q, ids_fiche, ids_unite, ids_badge = [], {}, {}, set(), set()
for b in config.get("badges", []):
    if b["id"] in ids_badge: E(f"badge en double : {b['id']}")
    ids_badge.add(b["id"])
    if b.get("module") and b["module"] not in MODULES_CONNUS: E(f"badge {b['id']} : module inconnu « {b['module']} »")
for chemin in config.get("unites", []):
    f = RACINE / chemin
    if not f.exists(): E(f"{chemin} : fichier introuvable"); continue
    try: u = json.loads(f.read_text(encoding="utf-8"))
    except Exception as e: E(f"{chemin} : JSON invalide ({e})"); continue
    unites.append((chemin, u))
    if u.get("id") in ids_unite: E(f"{chemin} : id d'unité en double {u.get('id')}")
    ids_unite.add(u.get("id"))
    for f2 in u.get("fiches", []):
        if f2["id"] in ids_fiche: E(f"fiche en double : {f2['id']} ({chemin} et {ids_fiche[f2['id']]})")
        ids_fiche[f2["id"]] = chemin
        if not re.fullmatch(r"[a-z][a-z0-9-]*", f2["id"]): E(f"fiche {f2['id']} : id invalide (minuscules, chiffres, tirets)")

def verifier_question(q, ou):
    t = q.get("type")
    if t not in TYPES: E(f"{ou} : type inconnu « {t} »"); return
    if t in TYPES_JS_SEUL and ("code-js" not in MODULES or LANGAGE != "js"):
        E(f"{ou} : le type « {t} » évalue du JavaScript : il demande un cours de JavaScript avec le module « code-js »")
    if t in CODE and not EXEC:
        E(f"{ou} : le type « {t} » exécute du code, et ce cours n'exécute pas le langage « {LANGAGE} » : utilise les exercices sans exécution (predire avec reponse ou choix, bug, parsons, pointer-code, qcm), voir docs/modules.md")
    if t == "predire" and q.get("reponse") is None and not q.get("choix") and not EXEC:
        E(f"{ou} : « predire » sans réponse écrite exécute le code : donne « reponse » (ou « choix »), ce cours n'exécute pas le langage « {LANGAGE} »")
    if LANGAGE == "php" and t in CODE:
        for c in q.get("tests", {}).get("cas", []):
            for k in c:
                if k not in CHAMPS_CAS_PHP: E(f"{ou} : champ de cas PHP inconnu « {k} » (connus : {', '.join(sorted(CHAMPS_CAS_PHP))})")
            if not any(k in c for k in ("attendu", "sortie", "contient", "neContientPas", "redirection", "cookies", "session", "sessionVide", "statut", "variables")):
                W(f"{ou} : un cas de test ne vérifie rien ({c.get('titre', '?')})")
    if (t == "selecteur" or q.get("dom")) and "dom" not in MODULES: E(f"{ou} : page web (dom) : il faut le module « dom »")
    qid = q.get("id")
    if not qid: E(f"{ou} : pas d'id (obligatoire : il sert à la sauvegarde)")
    elif qid in ids_q: E(f"{ou} : id « {qid} » déjà utilisé ({ids_q[qid]})")
    else: ids_q[qid] = ou
    ou = f"{ou} · {qid}"
    for champ in TYPES[t]:
        if champ not in q: E(f"{ou} : champ « {champ} » manquant pour le type {t}")
    if t != "boss" and not q.get("explication"): W(f"{ou} : pas d'explication")
    if not q.get("notions"): W(f"{ou} : aucune notion (la répétition espacée ne le reverra pas)")
    for n in q.get("notions", []):
        if n not in ids_fiche: E(f"{ou} : notion « {n} » sans fiche")
    if "choix" in q and "bonne" in q and not (0 <= q["bonne"] < len(q["choix"])): E(f"{ou} : « bonne » hors des choix")
    if t == "bug" and not (1 <= q.get("ligne", 0) <= len(lignes(q.get("code")).split("\n"))): E(f"{ou} : ligne du bug hors du code")
    if t == "pointer-code" and "⟦" not in lignes(q.get("code")): E(f"{ou} : aucune cible ⟦…⟧")
    if t == "pointer-tableau" and any(i < 0 or i >= len(q["tableau"]) for i in q.get("bonnes", [])): E(f"{ou} : case cible hors du tableau")
    if t == "tri" and any(c < 0 or c >= len(q["categories"]) for _, c in q.get("items", [])): E(f"{ou} : catégorie inexistante")
    if t == "trous":
        n = len(re.findall(r"_{3,}", lignes(q.get("code"))))
        if n != len(q.get("solution", [])): E(f"{ou} : {n} trous mais {len(q.get('solution', []))} valeurs de solution")
    if t in CODE:
        cas = q.get("tests", {}).get("cas") or q.get("tests", {}).get("etapes", [])
        if not cas: E(f"{ou} : aucun cas de test")
        if t != "trous" and len(cas) < 2 and t == "boss": W(f"{ou} : un boss devrait tester plusieurs jeux de données")
        if len(q.get("indices", [])) < (3 if t == "boss" else 1): W(f"{ou} : indices progressifs insuffisants")
        if not q.get("erreursTypiques"): W(f"{ou} : aucune erreur typique (tools/tester-exercices.py ne vérifie pas les diagnostics)")
        for et in q.get("erreursTypiques", []):
            if et.get("attendu") not in ("erreur", "echec", "conseil"): E(f"{ou} : erreur typique sans « attendu » valide (erreur | echec | conseil)")
    if t == "boss" and not q.get("source"): W(f"{ou} : boss sans « source » (quel exercice du cours ?)")

for chemin, u in unites:
    nom = u.get("id", chemin)
    for champ in ["id", "titre", "lecons", "quiz"]:
        if champ not in u: E(f"{nom} : champ « {champ} » manquant")
    ids_l = set()
    for l in u.get("lecons", []):
        if l["id"] in ids_l: E(f"{nom} : leçon en double {l['id']}")
        ids_l.add(l["id"])
        if not l.get("cartes"): W(f"{nom} · {l['id']} : aucune carte de leçon")
        for k, c in enumerate(l.get("cartes", [])):
            if c.get("fiche") and c["fiche"] not in ids_fiche: E(f"{nom} · {l['id']} carte {k+1} : fiche inconnue {c['fiche']}")
            if c.get("illu") and c["illu"] not in ("boite", "porte", "cuisinier", "variables", "types", "fleche", "portee", "spread"): E(f"{nom} · {l['id']} carte {k+1} : illustration inconnue {c['illu']}")
        if len(l.get("exercices", [])) < 3: W(f"{nom} · {l['id']} : moins de 3 exercices")
        for q in l.get("exercices", []): verifier_question(q, f"{nom} · {l['id']}")
    for g in u.get("jeux", []):
        if g.get("badge") and g["badge"] not in ids_badge: E(f"{nom} · jeu {g['id']} : badge inconnu {g['badge']}")
        if g.get("tours", 0) > len(g.get("questions", [])): E(f"{nom} · jeu {g['id']} : plus de tours que de questions")
        for q in g.get("questions", []): verifier_question(q, f"{nom} · jeu {g['id']}")
    qs = u.get("quiz", {}).get("questions", [])
    if not 12 <= len(qs) <= 20: W(f"{nom} : quiz de {len(qs)} questions (15 à 18 conseillé)")
    for q in qs: verifier_question(q, f"{nom} · quiz")
    for b in u.get("boss", []):
        if "questions" in b:   # étude de cas (cours sans code) : un scénario puis des questions de n'importe quel type
            ou = f"{nom} · boss {b.get('id')}"
            if not b.get("id") or not b.get("titre"): E(f"{ou} : un boss a besoin d'un id et d'un titre")
            if not b.get("enonce") and not b.get("cartes"): E(f"{ou} : étude de cas sans énoncé (enonce ou cartes)")
            if len(b["questions"]) < 4: W(f"{ou} : étude de cas de moins de 4 questions")
            if not b.get("source"): W(f"{ou} : boss sans « source » (quel exercice ou quel attendu du cours ?)")
            for q in b["questions"]: verifier_question(q, ou)
        else:
            verifier_question({**b, "type": "boss"}, f"{nom} · boss")
    connus = ids_l | {f"jeu:{g['id']}" for g in u.get("jeux", [])} | {"quiz"} | {f"boss:{b['id']}" for b in u.get("boss", [])}
    for step in u.get("parcours", []):
        if step not in connus: E(f"{nom} : étape de parcours inconnue « {step} »")
    for step in connus:
        if u.get("parcours") and step not in u["parcours"]: W(f"{nom} : « {step} » n'est pas dans le parcours")
    texte = json.dumps(u, ensure_ascii=False)
    for m in re.finditer(r"\[\[([a-z][a-z0-9-]*)(?:\|[^\]]+)?\]\]", texte):
        if m.group(1) not in ids_fiche: E(f"{nom} : lien vers une fiche inconnue [[{m.group(1)}]]")

# projet du cours en fil rouge (facultatif) : critères à cocher, reliés aux fiches et aux unités
pj = config.get("projet")
if pj is not None:
    if not pj.get("titre"): E("config.json : projet sans titre")
    if not pj.get("criteres"): E("config.json : projet sans critères")
    ids_c = set()
    for c in pj.get("criteres", []):
        if not c.get("id") or not c.get("texte"): E("config.json : chaque critère du projet a un id et un texte"); continue
        if c["id"] in ids_c: E(f"config.json : critère de projet en double {c['id']}")
        ids_c.add(c["id"])
        for f in c.get("fiches", []):
            if f not in ids_fiche: E(f"config.json : critère {c['id']} : fiche inconnue {f}")
        if c.get("unite") and c["unite"] not in ids_unite: E(f"config.json : critère {c['id']} : unité inconnue {c['unite']}")
        if not c.get("fiches") and not c.get("unite"): W(f"config.json : critère {c['id']} relié à aucune fiche ni unité")

if "--fiches" in sys.argv:
    for chemin, u in unites:
        print(f"{u.get('id')} · {u.get('titre')}")
        for f2 in u.get("fiches", []): print(f"   {f2['id']} : {f2.get('titre', '')}")

total = len(ids_q)
print(f"{len(unites)} unités · {len(ids_fiche)} fiches · {total} questions")
for a in avert: print("⚠", a)
for e in erreurs: print("✖", e)
if erreurs:
    print(f"\n{len(erreurs)} erreur(s)."); sys.exit(1)
print("Contenu valide." + (f" ({len(avert)} avertissement(s) à relire)" if avert else ""))
