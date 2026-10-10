#!/usr/bin/env python3
"""Validation statique du contenu (sans navigateur) : à lancer après CHAQUE modification de content/.
Vérifie la structure des JSON, les identifiants (uniques, stables), le parcours, les champs obligatoires
de chaque type d'exercice, les liens vers les fiches. Code de sortie 1 en cas d'erreur ; les ⚠ sont à relire.
Le test complet (exécution réelle des solutions et des erreurs typiques) est tools/tester-exercices.py."""
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
    "types-chaine": ["question", "depart", "maillons"],
    "trous": ["question", "code", "tests", "solution"], "corriger": ["question", "depart", "tests", "solution"],
    "ecrire": ["question", "tests", "solution"], "boss": ["titre", "enonce", "tests", "solution", "indices"],
}
CODE = {"trous", "corriger", "ecrire", "boss"}
lignes = lambda c: "\n".join(c) if isinstance(c, list) else str(c or "")

try:
    config = json.loads((RACINE / "content/config.json").read_text(encoding="utf-8"))
except Exception as e:
    print("✖ content/config.json illisible :", e); sys.exit(1)
for k in ["seuilValidation", "unites", "rangs", "badges"]:
    if k not in config: E(f"config.json : champ « {k} » manquant")

unites, ids_q, ids_fiche, ids_unite, ids_badge = [], {}, {}, set(), set()
for b in config.get("badges", []):
    if b["id"] in ids_badge: E(f"badge en double : {b['id']}")
    ids_badge.add(b["id"])
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
        cas = q.get("tests", {}).get("cas", [])
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
    for b in u.get("boss", []): verifier_question({**b, "type": "boss"}, f"{nom} · boss")
    connus = ids_l | {f"jeu:{g['id']}" for g in u.get("jeux", [])} | {"quiz"} | {f"boss:{b['id']}" for b in u.get("boss", [])}
    for step in u.get("parcours", []):
        if step not in connus: E(f"{nom} : étape de parcours inconnue « {step} »")
    for step in connus:
        if u.get("parcours") and step not in u["parcours"]: W(f"{nom} : « {step} » n'est pas dans le parcours")
    texte = json.dumps(u, ensure_ascii=False)
    for m in re.finditer(r"\[\[([a-z][a-z0-9-]*)(?:\|[^\]]+)?\]\]", texte):
        if m.group(1) not in ids_fiche: E(f"{nom} : lien vers une fiche inconnue [[{m.group(1)}]]")

total = len(ids_q)
print(f"{len(unites)} unités · {len(ids_fiche)} fiches · {total} questions")
for a in avert: print("⚠", a)
for e in erreurs: print("✖", e)
if erreurs:
    print(f"\n{len(erreurs)} erreur(s)."); sys.exit(1)
print("Contenu valide." + (f" ({len(avert)} avertissement(s) à relire)" if avert else ""))
