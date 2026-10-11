"use strict";
/* =====================================================================
   Moteur de cours — moteur d'exercices.
   Contrat d'un type (repris de Pampre) :
     Q.monType = (q, onChange) => ({ el, ready(), check(), key?, cleanup?, reouvrir?, resoudre? })
   - check() verrouille, marque juste/faux et renvoie { ok, answer?, detail?, retry? } (ou une promesse pour le code) ;
     retry = true : exercice de code raté, l'élève corrige et revérifie (jamais de solution affichée).
   - resoudre() : remplit la bonne réponse (utilisé par les tests automatiques tools/test-parcours.py).
   ===================================================================== */
const Q = {};
const KIND_NAME = {
  qcm:"Choix multiple", vf:"Vrai ou faux", methode:"Choisis la méthode", ordre:"Remets dans l'ordre", assoc:"Associe", tri:"Classe",
  "pointer-code":"Pointe dans le code", "pointer-tableau":"Pointe dans le tableau", bug:"Trouve le bug", predire:"Prédis le résultat",
  parsons:"Reconstitue le programme", "reduce-pas":"reduce pas à pas", "filtre-visuel":"Filtre visuel", "map-visuel":"Transformation map",
  objet:"Construis l'objet", "fisher-yates":"Mélange de Fisher–Yates", "types-chaine":"Suis les types", erreurs:"Traducteur d'erreurs",
  trous:"Code à trous", corriger:"Corrige le code", ecrire:"Écris le code", boss:"Boss", selecteur:"Sélecteur CSS"
};
const TYPES_CODE = new Set(["trous", "corriger", "ecrire", "boss"]);
/* évalue une expression du CONTENU (jamais du code de l'élève) : condition d'un filtre, fonction d'un map… */
const evalContenu = src => new Function(`"use strict"; return (${src});`)();
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const melanger = (q, arr) => q.ordreFixe ? arr.slice() : shuffle(arr);

/* ---------------- choix ---------------- */
Q.qcm = (q, onChange) => {
  const correct = q.choix[q.bonne];
  const ordre = melanger(q, q.choix.map((c, i) => i));
  const mono = q.mono || q.type === "methode";
  const el = h(`<div>${q.code ? codeHTML(lignes(q.code)) : ""}<div class="choices ${q.type === "methode" ? "grille" : ""}">${ordre.map((i, k) => `<button type="button" class="choice ${mono ? "c" : ""}" aria-pressed="false" data-i="${i}">${q.type === "methode" ? "" : `<span class="k">${k + 1}</span>`}<span class="ct">${mono ? esc(q.choix[i]) : richInline(q.choix[i])}</span></button>`).join("")}</div></div>`);
  let sel = null;
  el.addEventListener("click", e => { const b = e.target.closest(".choice"); if (!b || b.disabled) return; el.querySelectorAll(".choice").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); sel = +b.dataset.i; onChange(); });
  return { el, ready:() => sel !== null, key:k => el.querySelectorAll(".choice")[k]?.click(),
    resoudre(){ el.querySelector(`[data-i="${q.bonne}"]`).click(); },
    check(){ const ok = sel === q.bonne; el.querySelectorAll(".choice").forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === q.bonne) b.classList.add("ok"); else if (i === sel) b.classList.add("ko"); }); return { ok, answer: correct }; } };
};
Q.methode = Q.qcm;
Q.vf = (q, onChange) => {
  const el = h(`<div>${q.code ? codeHTML(lignes(q.code)) : ""}<div class="choices vf"><button type="button" class="choice" aria-pressed="false" data-v="1">Vrai</button><button type="button" class="choice" aria-pressed="false" data-v="0">Faux</button></div></div>`);
  let sel = null;
  el.addEventListener("click", e => { const b = e.target.closest(".choice"); if (!b || b.disabled) return; el.querySelectorAll(".choice").forEach(x => x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); sel = b.dataset.v === "1"; onChange(); });
  return { el, ready:() => sel !== null, key:i => el.querySelectorAll(".choice")[i]?.click(),
    resoudre(){ el.querySelector(`[data-v="${q.bonne ? 1 : 0}"]`).click(); },
    check(){ const ok = sel === q.bonne; el.querySelectorAll(".choice").forEach(b => { b.disabled = true; const v = b.dataset.v === "1"; if (v === q.bonne) b.classList.add("ok"); else if (v === sel) b.classList.add("ko"); }); return { ok, answer: q.bonne ? "Vrai" : "Faux" }; } };
};

/* ---------------- remettre dans l'ordre / reconstituer un programme (Parsons) ---------------- */
function ordonner(q, onChange, items, opts){
  let pool = shuffle(items.map((t, i) => ({ t, i })));
  if (pool.length > 1 && pool.every((p, k) => p.i === k)) pool.reverse();
  const picked = [];
  const el = h(`<div class="${opts.parsons ? "parsons" : ""}"><div class="slots ${opts.mono ? "c" : ""}" data-vide="${esc(opts.vide)}"></div><div class="pool ${opts.mono ? "c" : ""}"></div></div>`);
  const slots = el.querySelector(".slots"), poolEl = el.querySelector(".pool");
  let locked = false;
  const draw = () => {
    slots.innerHTML = picked.map((p, k) => `<button type="button" class="chip" data-out="${k}" aria-label="Retirer : ${esc(p.t)}"><span class="n">${k + 1}</span>${esc(p.t)}</button>`).join("");
    poolEl.innerHTML = pool.map((p, k) => `<button type="button" class="chip ${picked.includes(p) ? "used" : ""}" data-in="${k}">${esc(p.t)}</button>`).join("");
  };
  el.addEventListener("click", e => { if (locked) return; const b = e.target.closest(".chip"); if (!b) return; if (b.dataset.in !== undefined) { const p = pool[+b.dataset.in]; if (!picked.includes(p)) picked.push(p); } else if (b.dataset.out !== undefined) picked.splice(+b.dataset.out, 1); draw(); onChange(); });
  draw();
  return { el, picked, pool, draw, lock(){ locked = true; } };
}
Q.ordre = (q, onChange) => {
  const o = ordonner(q, onChange, q.items, { vide:"Touche les étapes dans le bon ordre", mono:q.mono });
  return { el:o.el, ready:() => o.picked.length === q.items.length,
    resoudre(){ o.picked.splice(0, o.picked.length, ...q.items.map((t, i) => o.pool.find(p => p.i === i))); o.draw(); onChange(); },
    check(){ o.lock(); const ok = o.picked.every((p, k) => p.t === q.items[k]); o.el.querySelectorAll(".slots .chip").forEach((b, k) => b.classList.add(o.picked[k].t === q.items[k] ? "ok" : "ko")); return { ok, answer: q.items.map((t, k) => `${k + 1}. ${t}`).join(" · ") }; } };
};
Q.parsons = (q, onChange) => {
  const items = [...q.lignes, ...(q.distracteurs || [])];
  const o = ordonner(q, onChange, items, { vide:"Touche les lignes dans l'ordre pour écrire le programme", mono:true, parsons:true });
  if (q.distracteurs?.length) o.el.appendChild(h(`<p class="note">Attention : ${pluriel(q.distracteurs.length, "ligne est un piège", "lignes sont des pièges")}, à ne pas utiliser.</p>`));
  return { el:o.el, ready:() => q.distracteurs?.length ? o.picked.length > 0 : o.picked.length === items.length,
    resoudre(){ o.picked.splice(0, o.picked.length, ...q.lignes.map((t, i) => o.pool.find(p => p.i === i))); o.draw(); onChange(); },
    check(){
      o.lock();
      const ok = o.picked.length === q.lignes.length && o.picked.every((p, k) => p.t === q.lignes[k]);
      o.el.querySelectorAll(".slots .chip").forEach((b, k) => b.classList.add(o.picked[k].t === q.lignes[k] ? "ok" : "ko"));
      return { ok, answerHTML: codeHTML(q.lignes.join("\n")) };
    } };
};

/* ---------------- associer, classer (repris de Pampre) ---------------- */
const PAIR_COLORS = ["#5B3FD9","#0E7C86","#B04F08","#2A8F45","#B5475E","#7A5C00"];
Q.assoc = (q, onChange) => {
  const left = q.paires.map((p, i) => ({ t:p[0], i }));
  const right = shuffle(q.paires.map((p, i) => ({ t:p[1], i })));
  const pairOf = {};
  let selL = null, locked = false;
  const mono = q.mono ? "c" : "";
  const el = h(`<div class="assoc"><div class="col l"></div><div class="col r"></div></div>`);
  const draw = () => {
    const usedR = Object.entries(pairOf);
    el.querySelector(".l").innerHTML = left.map((p, k) => { const c = pairOf[k] !== undefined ? PAIR_COLORS[k % PAIR_COLORS.length] : null; return `<button type="button" class="chip ${q.monoGauche || q.mono ? "c" : ""} ${selL === k ? "picked" : ""}" data-l="${k}" ${c ? `data-pair style="background:${c}"` : ""}>${esc(p.t)}</button>`; }).join("");
    el.querySelector(".r").innerHTML = right.map((p, k) => { const owner = usedR.find(([, r]) => r === k); const c = owner ? PAIR_COLORS[+owner[0] % PAIR_COLORS.length] : null; return `<button type="button" class="chip ${mono}" data-r="${k}" ${c ? `data-pair style="background:${c}"` : ""}>${esc(p.t)}</button>`; }).join("");
  };
  el.addEventListener("click", e => {
    if (locked) return; const b = e.target.closest(".chip"); if (!b) return;
    if (b.dataset.l !== undefined) { const k = +b.dataset.l; if (pairOf[k] !== undefined) delete pairOf[k]; selL = k; }
    else if (b.dataset.r !== undefined) { const r = +b.dataset.r; const owner = Object.keys(pairOf).find(k => pairOf[k] === r); if (owner !== undefined) delete pairOf[owner]; if (selL !== null) { pairOf[selL] = r; selL = left.findIndex((_, k) => pairOf[k] === undefined); if (selL < 0) selL = null; } }
    draw(); onChange();
  });
  selL = 0; draw();
  return { el, ready:() => Object.keys(pairOf).length === left.length,
    resoudre(){ left.forEach((p, k) => pairOf[k] = right.findIndex(r => r.i === p.i)); draw(); onChange(); },
    check(){ locked = true; let ok = true; el.querySelectorAll(".l .chip").forEach((b, k) => { const good = right[pairOf[k]].i === left[k].i; if (!good) ok = false; b.removeAttribute("style"); b.removeAttribute("data-pair"); b.classList.add(good ? "ok" : "ko"); b.textContent = `${left[k].t} → ${right[pairOf[k]].t}`; }); el.querySelector(".r").remove(); el.style.gridTemplateColumns = "1fr"; return { ok, answer: q.paires.map(p => `${p[0]} → ${p[1]}`).join(" · ") }; } };
};
/* traducteur d'erreurs : une association message d'erreur ↔ cause, messages en police de code */
Q.erreurs = (q, onChange) => Q.assoc({ ...q, monoGauche:true }, onChange);
Q.tri = (q, onChange) => {
  const items = shuffle(q.items.map(([t, c], i) => ({ t, c, i })));
  const place = {}; let sel = null, locked = false;
  const mono = q.mono ? "c" : "";
  const el = h(`<div><div class="cats">${q.categories.map((c, k) => `<div class="cat" data-cat="${k}" tabindex="0" role="button" aria-label="Ranger dans « ${esc(c)} »"><b>${esc(c)}</b></div>`).join("")}</div><div class="pool"></div><p class="note">Glisse chaque étiquette dans sa colonne, ou touche-la puis touche la colonne.</p></div>`);
  const poolEl = el.querySelector(".pool");
  const draw = () => {
    el.querySelectorAll(".cat").forEach(c => { c.querySelectorAll(".chip").forEach(x => x.remove()); });
    items.forEach((it, k) => { if (place[k] !== undefined) el.querySelector(`.cat[data-cat="${place[k]}"]`).insertAdjacentHTML("beforeend", `<button type="button" class="chip ${mono}" data-it="${k}">${esc(it.t)}</button>`); });
    poolEl.innerHTML = items.map((it, k) => place[k] === undefined ? `<button type="button" class="chip ${mono} ${sel === k ? "picked" : ""}" aria-pressed="${sel === k}" data-it="${k}">${esc(it.t)}</button>` : "").join("");
  };
  const tap = (k, clavier) => {
    if (place[k] !== undefined) drop(k, null); else { sel = sel === k ? null : k; draw(); }
    if (clavier) (sel !== null ? el.querySelector(".cat") : el.querySelector(".pool .chip"))?.focus();
  };
  const drop = (k, cat) => { if (cat === null) delete place[k]; else place[k] = cat; sel = null; draw(); onChange(); };
  let drag = null, onMove, onUp;
  el.addEventListener("pointerdown", e => { if (locked) return; const b = e.target.closest(".chip"); if (!b) return; drag = { k:+b.dataset.it, x:e.clientX, y:e.clientY, src:b, ghost:null }; });
  window.addEventListener("pointermove", onMove = e => { if (!drag) return; if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) { drag.ghost = drag.src.cloneNode(true); drag.ghost.classList.add("drag-ghost","picked"); document.body.appendChild(drag.ghost); drag.src.style.opacity = ".3"; } if (drag.ghost) { e.preventDefault(); drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px"; el.querySelectorAll(".cat").forEach(c => c.classList.remove("hot")); document.elementFromPoint(e.clientX, e.clientY)?.closest(".cat")?.classList.add("hot"); } }, { passive:false });
  window.addEventListener("pointerup", onUp = e => { if (!drag) return; const d = drag; drag = null; if (d.ghost) { d.ghost.remove(); el.querySelectorAll(".cat").forEach(c => c.classList.remove("hot")); const cat = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cat"); if (cat && el.contains(cat)) drop(d.k, +cat.dataset.cat); else d.src.style.opacity = ""; } else tap(d.k); });
  el.addEventListener("click", e => {
    if (locked) return;
    const chip = e.target.closest(".chip");
    if (chip) { if (e.detail === 0) tap(+chip.dataset.it, true); return; }
    const cat = e.target.closest(".cat"); if (cat && sel !== null) drop(sel, +cat.dataset.cat);
  });
  el.addEventListener("keydown", e => {
    const cat = e.target.closest?.(".cat"); if (!cat || e.target !== cat || locked || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault(); e.stopPropagation();
    if (sel !== null) { drop(sel, +cat.dataset.cat); el.querySelector(".pool .chip")?.focus(); }
  });
  draw();
  return { el, ready:() => Object.keys(place).length === items.length,
    cleanup(){ window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); },
    resoudre(){ items.forEach((it, k) => place[k] = it.c); draw(); onChange(); },
    check(){ locked = true; let ok = true; el.querySelectorAll(".cat .chip").forEach(b => { const it = items[+b.dataset.it]; const good = place[+b.dataset.it] === it.c; if (!good) { ok = false; b.textContent = `${it.t} → ${q.categories[it.c]}`; } b.classList.add(good ? "ok" : "ko"); }); return { ok, answer: q.categories.map((c, k) => `${c} : ${q.items.filter(x => x[1] === k).map(x => x[0]).join(", ")}`).join(" · ") }; } };
};

/* ---------------- pointer dans le code (l'étiquette de Pampre) ---------------- */
/* Le code marque la cible entre ⟦ et ⟧ (une ou plusieurs ; "multi": true pour toutes les toucher). Chaque autre morceau est touchable. */
function zonesDuCode(code){
  const zones = []; let html = "";
  const L = code.split("\n");
  L.forEach((ligne, li) => {
    let rest = ligne, out = "";
    const morceaux = [];
    while (rest.length) {
      const a = rest.indexOf("⟦");
      if (a < 0) { morceaux.push({ t:rest, cible:false }); break; }
      if (a > 0) morceaux.push({ t:rest.slice(0, a), cible:false });
      const b = rest.indexOf("⟧", a);
      morceaux.push({ t:rest.slice(a + 1, b), cible:true }); rest = rest.slice(b + 1);
    }
    for (const m of morceaux) {
      if (m.cible) { const id = zones.length; zones.push({ texte:m.t, cible:true }); out += `<span class="z" data-z="${id}" role="button" tabindex="0">${jetons(m.t).map(spanJeton).join("")}</span>`; }
      else for (const j of jetons(m.t)) {
        if (j.t === "ws") { out += esc(j.v); continue; }
        const id = zones.length; zones.push({ texte:j.v, cible:false });
        out += `<span class="z" data-z="${id}" role="button" tabindex="0">${spanJeton(j)}</span>`;
      }
    }
    html += `<div class="l"><span class="n">${li + 1}</span><span>${out || " "}</span></div>`;
  });
  return { zones, html:`<div class="code" translate="no">${html}</div>` };
}
Q["pointer-code"] = (q, onChange) => {
  const { zones, html } = zonesDuCode(lignes(q.code));
  const cibles = zones.map((z, i) => z.cible ? i : -1).filter(i => i >= 0);
  const multi = q.multi || false;
  const el = h(`<div class="pointer">${html}${multi ? `<p class="note">Touche toutes les bonnes réponses (${cibles.length}).</p>` : ""}</div>`);
  let sel = []; let locked = false;
  const draw = () => el.querySelectorAll(".z").forEach(z => { const on = sel.includes(+z.dataset.z); z.classList.toggle("sel", on); z.setAttribute("aria-pressed", on); });
  const toucher = z => { if (locked) return; const i = +z.dataset.z; if (multi) sel = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]; else sel = [i]; draw(); onChange(); };
  el.addEventListener("click", e => { const z = e.target.closest(".z"); if (z) toucher(z); });
  el.addEventListener("keydown", e => { const z = e.target.closest(".z"); if (z && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); toucher(z); } });
  return { el, ready:() => sel.length > 0,
    resoudre(){ sel = cibles.slice(); draw(); onChange(); },
    check(){
      locked = true;
      // une zone non marquée mais identique au texte d'une cible compte aussi (ex. le même nom ailleurs sur la ligne)
      const vaut = i => zones[i].cible;
      const ok = multi ? sameSet(sel, cibles) : vaut(sel[0]);
      el.querySelectorAll(".z").forEach(z => { const i = +z.dataset.z; z.classList.remove("sel"); z.removeAttribute("tabindex"); if (zones[i].cible) z.classList.add("right"); else if (sel.includes(i)) z.classList.add("wrong"); });
      return { ok, answer: cibles.map(i => zones[i].texte).join(" · ") };
    } };
};

/* ---------------- pointer dans un tableau (la carte de Pampre) ---------------- */
Q["pointer-tableau"] = (q, onChange) => {
  const multi = q.multi ?? q.bonnes.length > 1;
  const el = h(`<div>${q.code ? codeHTML(lignes(q.code)) : ""}${boiteHTML(q.tableau, { nom:q.nom, negatifs:q.negatifs, tap:true, sansIndices:q.sansIndices })}${multi ? `<p class="note">Touche toutes les cases concernées.</p>` : ""}</div>`);
  let sel = []; let locked = false;
  const draw = () => el.querySelectorAll(".case").forEach(c => { const on = sel.includes(+c.dataset.i); c.classList.toggle("sel", on); c.querySelector(".oeuf").setAttribute("aria-pressed", on); });
  el.addEventListener("click", e => { if (locked) return; const c = e.target.closest(".case"); if (!c) return; const i = +c.dataset.i; sel = multi ? (sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]) : [i]; draw(); onChange(); });
  return { el, ready:() => sel.length > 0 || (multi && q.bonnes.length === 0),
    resoudre(){ sel = q.bonnes.slice(); draw(); onChange(); },
    check(){
      locked = true;
      const ok = sameSet(sel, q.bonnes);
      el.querySelectorAll(".case").forEach(c => { const i = +c.dataset.i; c.classList.remove("sel"); c.querySelector(".oeuf").disabled = true; if (q.bonnes.includes(i)) c.classList.add(sel.includes(i) ? "right" : "missed"); else if (sel.includes(i)) c.classList.add("wrong"); });
      return { ok, answer: q.bonnes.length ? q.bonnes.map(i => `${enCode(q.tableau[i])} (indice ${i})`).join(", ") : "aucune case" };
    } };
};

/* ---------------- trouver le bug : la ligne, puis l'explication ---------------- */
Q.bug = (q, onChange) => {
  const el = h(`<div class="bug">${codeHTML(lignes(q.code))}<p class="consigne" style="margin:4px 0 10px">1. Touche la ligne fautive. 2. Choisis l'explication.</p><div class="qc"></div></div>`);
  let ligne = null; let locked = false;
  const qc = Q.qcm({ ...q, code:null }, onChange); el.querySelector(".qc").appendChild(qc.el);
  el.querySelectorAll(".code .l").forEach(l => { l.tabIndex = 0; l.setAttribute("role", "button"); });
  const choisir = l => { if (locked) return; ligne = +l.dataset.l; el.querySelectorAll(".code .l").forEach(x => x.classList.toggle("sel", x === l)); onChange(); };
  el.querySelector(".code").addEventListener("click", e => { const l = e.target.closest(".l"); if (l) choisir(l); });
  el.querySelector(".code").addEventListener("keydown", e => { const l = e.target.closest(".l"); if (l && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); choisir(l); } });
  return { el, ready:() => ligne !== null && qc.ready(), key:qc.key,
    resoudre(){ choisir(el.querySelector(`.code .l[data-l="${q.ligne}"]`)); qc.resoudre(); },
    check(){
      locked = true;
      const r = qc.check();
      const bonneLigne = ligne === q.ligne;
      el.querySelectorAll(".code .l").forEach(x => { x.classList.remove("sel"); x.removeAttribute("tabindex"); const n = +x.dataset.l; if (n === q.ligne) x.classList.add("right"); else if (n === ligne) x.classList.add("wrong"); });
      if (r.ok && bonneLigne) ST.stats.bugs++;
      return { ok: r.ok && bonneLigne, answer: `ligne ${q.ligne} : ${q.choix[q.bonne]}` };
    } };
};

/* ---------------- prédire ce qui s'affiche ---------------- */
/* QCM (choix + bonne) ou saisie libre : la bonne réponse est "reponse", ou, si elle manque, la sortie réelle du code (exécuté dans le bac à sable) */
Q.predire = (q, onChange) => {
  if (q.choix) {
    const inner = Q.qcm(q, onChange);
    return inner;
  }
  // toujours une zone de texte : on ne sait pas d'avance combien de lignes la console affichera (appels répétés, boucles)
  const nbLog = (lignes(q.code).match(/console\.log\(/g) || []).length;
  const rows = q.lignesReponse || Math.min(6, Math.max(1, nbLog, (q.reponse || "").split("\n").length));
  const el = h(`<div>${codeHTML(lignes(q.code))}<label class="eyebrow" for="pred">Ce qui s'affiche${rows > 1 ? " (une ligne par affichage)" : ""}</label><textarea id="pred" class="saisie" rows="${rows}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea><p class="note">${q.aide ? richInline(q.aide) : "Écris exactement ce que la console afficherait, une ligne par affichage. Les espaces autour des virgules ne comptent pas."}</p></div>`);
  const inp = el.querySelector(".saisie");
  inp.addEventListener("input", onChange);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") e.stopPropagation(); });
  const attendu = async () => {
    if (q.reponse !== undefined) return [q.reponse, ...(q.accepte || [])];
    const r = await executer({ code: lignes(q.code) });
    return [r.console.join("\n"), ...(q.accepte || [])];
  };
  return { el, ready:() => inp.value.trim() !== "",
    async resoudre(){ inp.value = (await attendu())[0]; onChange(); },
    async check(){
      inp.readOnly = true;
      const bonnes = await attendu();
      const norm = s => s.split("\n").map(normaliserSaisie).filter(Boolean).join("\n");
      const ok = bonnes.some(b => norm(b) === norm(inp.value));
      inp.classList.add(ok ? "ok" : "ko");
      return { ok, answerHTML: consoleHTML(bonnes[0].split("\n"), { titre:false }) };
    } };
};

/* ---------------- reduce pas à pas ---------------- */
function etapesReduce(q){
  const f = evalContenu(q.fonction);
  const arr = q.tableau, avecDepart = "depart" in q;
  let acc = avecDepart ? q.depart : arr[0];
  const out = [];
  for (let i = avecDepart ? 0 : 1; i < arr.length; i++) { const ret = f(acc, arr[i]); out.push({ acc, el:arr[i], i, ret }); acc = ret; }
  return out;
}
const saisieEgale = (s, v) => { const n = normaliserSaisie(s); return n === normaliserSaisie(enCode(v)) || (typeof v === "string" && n === normaliserSaisie(v)) || (typeof v === "number" && Number(s.trim().replace(",", ".")) === v && s.trim() !== ""); };
Q["reduce-pas"] = (q, onChange) => {
  const et = etapesReduce(q);
  const nom = q.nom || "tab";
  const ligne = q.code ? lignes(q.code) : `const resultat = ${nom}.reduce(${q.fonction}${"depart" in q ? `, ${enCode(q.depart)}` : ""});`;
  const el = h(`<div>${boiteHTML(q.tableau, { nom })}${codeHTML(ligne)}
    <div class="porte">${I.wallet}${"depart" in q ? `Le porte-monnaie (acc) commence à <code>${esc(enCode(q.depart))}</code>.` : `Sans valeur de départ : acc commence avec le premier élément, <code>${esc(enCode(q.tableau[0]))}</code>, et on part du deuxième.`}</div>
    <div style="overflow-x:auto"><table class="reduce"><thead><tr><th>Tour</th><th>acc reçu</th><th>élément</th><th>retourne</th></tr></thead><tbody>${et.map((s, k) => `<tr><td>${k + 1}</td><td class="acc" data-acc="${k}">${k === 0 ? esc(enCode(s.acc)) : "?"}</td><td>${esc(enCode(s.el))}</td><td><input data-k="${k}" aria-label="Tour ${k + 1} : valeur retournée" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="${typeof s.ret === "number" ? "decimal" : "text"}"></td></tr>`).join("")}</tbody></table></div>
    <p class="note">La valeur retournée devient le acc du tour suivant. Le résultat final est celle du dernier tour.</p></div>`);
  const ins = [...el.querySelectorAll("input")];
  const maj = () => { ins.forEach((inp, k) => { const cell = el.querySelector(`[data-acc="${k + 1}"]`); if (cell) cell.textContent = inp.value.trim() || "?"; }); onChange(); };
  ins.forEach(inp => { inp.addEventListener("input", maj); inp.addEventListener("keydown", e => { if (e.key === "Enter") { const n = ins[ins.indexOf(inp) + 1]; if (n) { e.preventDefault(); e.stopPropagation(); n.focus(); } } }); });
  return { el, ready:() => ins.every(i => i.value.trim() !== ""),
    resoudre(){ ins.forEach((inp, k) => inp.value = enCode(et[k].ret)); maj(); },
    check(){
      let ok = true;
      ins.forEach((inp, k) => { inp.readOnly = true; const good = saisieEgale(inp.value, et[k].ret); if (!good) ok = false; inp.classList.add(good ? "ok" : "ko"); });
      return { ok, answer: et.map((s, k) => `tour ${k + 1} : ${enCode(s.ret)}`).join(" · ") + ` → résultat ${enCode(et.length ? et[et.length - 1].ret : q.depart)}` };
    } };
};

/* ---------------- filtre visuel : quelles cases filter garde-t-il ? ---------------- */
Q["filtre-visuel"] = (q, onChange) => {
  const cond = evalContenu(q.condition);
  const bonnes = q.tableau.map((v, i) => cond(v) ? i : -1).filter(i => i >= 0);
  const nom = q.nom || "tab";
  const ligne = q.code ? lignes(q.code) : `const gardes = ${nom}.filter(${q.condition});`;
  const sub = Q["pointer-tableau"]({ ...q, code:ligne, bonnes, multi:true }, onChange);
  sub.el.querySelector(".note").textContent = "Touche les cases que filter garde (celles pour lesquelles la fonction retourne true).";
  const check = sub.check;
  sub.ready = () => true;
  sub.check = () => { const r = check(); r.answer = `${enCode(bonnes.map(i => q.tableau[i]))}`; return r; };
  return sub;
};

/* ---------------- transformation map : prédire chaque nouvelle case ---------------- */
Q["map-visuel"] = (q, onChange) => {
  const f = evalContenu(q.fonction);
  const res = q.tableau.map(v => f(v));
  const nom = q.nom || "tab";
  const ligne = q.code ? lignes(q.code) : `const nouveau = ${nom}.map(${q.fonction});`;
  const el = h(`<div>${boiteHTML(q.tableau, { nom })}${codeHTML(ligne)}<div class="fleche-map" aria-hidden="true">↓ map ↓</div>
    <div class="boite"><div class="nom">nouveau</div>${q.tableau.map((v, i) => `<div class="case"><input data-i="${i}" aria-label="Case ${i} du nouveau tableau" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="idx">${i}</div></div>`).join("")}</div>
    <p class="note">${q.aide ? richInline(q.aide) : "Une case par élément : map garde toujours la même longueur. Écris le texte entre guillemets si c'est une chaîne."}</p></div>`);
  const ins = [...el.querySelectorAll("input")];
  ins.forEach(inp => { inp.addEventListener("input", onChange); inp.addEventListener("keydown", e => { if (e.key === "Enter") { const n = ins[ins.indexOf(inp) + 1]; if (n) { e.preventDefault(); e.stopPropagation(); n.focus(); } } }); });
  return { el, ready:() => ins.every(i => i.value.trim() !== ""),
    resoudre(){ ins.forEach((inp, i) => inp.value = enCode(res[i])); onChange(); },
    check(){
      let ok = true;
      ins.forEach((inp, i) => { inp.readOnly = true; const v = res[i]; const n = normaliserSaisie(inp.value); const good = typeof v === "string" ? n === normaliserSaisie(enCode(v)) || (q.guillemetsFacultatifs && n === normaliserSaisie(v)) : saisieEgale(inp.value, v); if (!good) ok = false; inp.classList.add(good ? "ok" : "ko"); });
      return { ok, answer: enCode(res) };
    } };
};

/* ---------------- construire un objet ---------------- */
/* "cles": ["rank", "suit"], "etiquettes": ["13", "\"13\"", "KING", ...], "bonnes": { "rank": ["13", "KING"], "suit": ["\"hearts\""] } */
Q.objet = (q, onChange) => {
  const chips = shuffle(q.etiquettes.map((t, i) => ({ t, i })));
  const place = {}; let slotSel = q.cles[0]; let locked = false;
  const el = h(`<div>${q.code ? codeHTML(lignes(q.code)) : ""}<div class="objet" translate="no">${q.nom ? `<span class="t-kw">const</span> ${esc(q.nom)} = ` : ""}{${q.cles.map(k => `<div class="cle"><span class="t-prop">${esc(k)}</span>: <button type="button" class="slot" data-k="${esc(k)}" aria-label="Valeur de ${esc(k)}">…</button>,</div>`).join("")}}${q.nom ? ";" : ""}</div><div class="pool c"></div><p class="note">Touche une case de l'objet, puis l'étiquette qui va dedans.</p></div>`);
  const poolEl = el.querySelector(".pool");
  const draw = () => {
    el.querySelectorAll(".slot").forEach(s => { const c = place[s.dataset.k]; s.textContent = c ? c.t : "…"; s.classList.toggle("sel", s.dataset.k === slotSel); });
    const pris = Object.values(place);
    poolEl.innerHTML = chips.map((c, k) => `<button type="button" class="chip c ${pris.includes(c) ? "used" : ""}" data-c="${k}">${esc(c.t)}</button>`).join("");
  };
  el.addEventListener("click", e => {
    if (locked) return;
    const s = e.target.closest(".slot");
    if (s) { if (place[s.dataset.k]) delete place[s.dataset.k]; slotSel = s.dataset.k; draw(); onChange(); return; }
    const c = e.target.closest(".chip[data-c]");
    if (c && slotSel) { place[slotSel] = chips[+c.dataset.c]; slotSel = q.cles.find(k => !place[k]) || null; draw(); onChange(); }
  });
  draw();
  return { el, ready:() => q.cles.every(k => place[k]),
    resoudre(){ q.cles.forEach(k => place[k] = chips.find(c => c.t === q.bonnes[k][0])); draw(); onChange(); },
    check(){
      locked = true; let ok = true;
      el.querySelectorAll(".slot").forEach(s => { s.disabled = true; const good = q.bonnes[s.dataset.k].includes(place[s.dataset.k].t); if (!good) ok = false; s.classList.remove("sel"); s.classList.add(good ? "ok" : "ko"); });
      return { ok, answer: `{ ${q.cles.map(k => `${k}: ${q.bonnes[k][0]}`).join(", ")} }` };
    } };
};

/* ---------------- simulateur de Fisher–Yates ---------------- */
/* "tableau": [...], "tirages": [j pour i = n-1, n-2, …, 1] */
Q["fisher-yates"] = (q, onChange) => {
  const arr = q.tableau.slice(); const n = arr.length;
  let etape = 0, choix = [], erreurs = 0, fini = false;
  const el = h(`<div>${codeHTML(["for (let i = tab.length - 1; i >= 1; i--) {", "  const j = Math.floor(Math.random() * (i + 1));", "  [tab[i], tab[j]] = [tab[j], tab[i]];", "}"].join("\n"))}<div class="fy-etat consigne" aria-live="polite"></div><div class="fy-boite"></div><div class="row-btns fy-act"></div></div>`);
  const etat = el.querySelector(".fy-etat"), boite = el.querySelector(".fy-boite"), act = el.querySelector(".fy-act");
  const draw = (swap = []) => {
    const i = n - 1 - etape;
    boite.innerHTML = boiteHTML(arr, { nom:"tab", tap:!fini });
    boite.querySelectorAll(".case").forEach(c => { const k = +c.dataset.i; if (!fini && k > i) c.classList.add("out"); if (choix.includes(k)) c.classList.add("sel"); if (swap.includes(k)) c.classList.add("swap"); });
    if (fini) { etat.innerHTML = `Mélange terminé${erreurs ? ` (${pluriel(erreurs, "échange raté")}, corrigé${erreurs > 1 ? "s" : ""} au passage)` : " sans erreur"}.`; act.innerHTML = ""; return; }
    const j = q.tirages[etape];
    etat.innerHTML = `Tour ${etape + 1} : <code>i = ${i}</code>, le tirage donne <code>j = ${j}</code>. Touche les deux cases à échanger.`;
    act.innerHTML = `<button type="button" class="btn small ghost" data-same>Une seule case : j = i</button>`;
  };
  const jouer = (a, b) => {
    const i = n - 1 - etape, j = q.tirages[etape];
    const bon = (a === i && b === j) || (a === j && b === i);
    if (!bon) { erreurs++; toast(I.cross, "Pas ces cases-là", `On échange tab[${i}] (i) et tab[${j}] (j).`); }
    [arr[i], arr[j]] = [arr[j], arr[i]];
    etape++; choix = [];
    if (etape >= n - 1) fini = true;
    draw([i, j]); onChange();
  };
  el.addEventListener("click", e => {
    if (fini) return;
    if (e.target.closest("[data-same]")) { const i = n - 1 - etape; jouer(i, i === q.tirages[etape] ? i : -1); return; }
    const c = e.target.closest(".case"); if (!c || c.classList.contains("out")) return;
    choix.push(+c.dataset.i); draw();
    if (choix.length === 2) jouer(choix[0], choix[1]);
  });
  draw();
  return { el, ready:() => fini,
    resoudre(){ while (!fini) { const i = n - 1 - etape; jouer(i, q.tirages[etape]); } },
    check(){ return { ok: erreurs === 0, answer: `ordre final : ${enCode(arr)}` }; } };
};

/* ---------------- suivre les types dans un enchaînement ---------------- */
const TYPE_LIB = { string:"chaîne", number:"nombre", boolean:"booléen", array:"tableau", object:"objet", undefined:"undefined" };
const typeDe = v => Array.isArray(v) ? "array" : v === null ? "object" : typeof v;
Q["types-chaine"] = (q, onChange) => {
  const choixT = q.choix || ["chaîne", "tableau", "nombre", "booléen"];
  const valeurs = q.maillons.map((m, k) => evalContenu(q.depart + q.maillons.slice(0, k + 1).join("")));
  const types = valeurs.map(v => TYPE_LIB[typeDe(v)]);
  const sel = q.maillons.map(() => null);
  const el = h(`<div class="chaine"><div class="maillon"><code>${colorer(q.depart)}</code><span class="val">${TYPE_LIB[typeDe(evalContenu(q.depart))]} au départ</span></div>${q.maillons.map((m, k) => `<div class="maillon" data-k="${k}"><code>${colorer(m)}</code><div class="seg" role="group" aria-label="Type après ${esc(m)}">${choixT.map(t => `<button type="button" data-t="${t}" aria-pressed="false">${t}</button>`).join("")}</div><span class="val" hidden></span></div>`).join("")}</div>`);
  el.addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b || b.disabled) return; const m = b.closest(".maillon"); const k = +m.dataset.k; sel[k] = b.dataset.t; m.querySelectorAll("[data-t]").forEach(x => x.setAttribute("aria-pressed", x === b)); onChange(); });
  return { el, ready:() => sel.every(Boolean),
    resoudre(){ types.forEach((t, k) => el.querySelector(`.maillon[data-k="${k}"] [data-t="${t}"]`).click()); },
    check(){
      let ok = true;
      el.querySelectorAll(".maillon[data-k]").forEach(m => { const k = +m.dataset.k; const good = sel[k] === types[k]; if (!good) ok = false; m.classList.add(good ? "ok" : "ko"); m.querySelectorAll("[data-t]").forEach(b => { b.disabled = true; if (b.dataset.t === types[k]) b.classList.add("ok"); else if (b.dataset.t === sel[k]) b.classList.add("ko"); }); const v = m.querySelector(".val"); v.hidden = false; v.textContent = `→ ${enCode(valeurs[k])}`; });
      return { ok, answer: q.maillons.map((m, k) => `${m} → ${types[k]}`).join(" · ") };
    } };
};

/* =====================================================================
   Exercices de code : trous, corriger, écrire, boss.
   Données du cours en entête (lecture seule), éditeur, bouton Exécuter (console seule),
   Vérifier (tests sur plusieurs jeux de données), 3 indices progressifs. Jamais de solution affichée.
   ===================================================================== */
const enteteAffichee = d => d ? Object.entries(d).map(([k, v]) => `const ${k} = ${v && typeof v === "object" ? `Object.freeze(${enCode(v)})` : enCode(v)};`).join("\n") : "";
const TROU = /_{3,}/g;
function indicesHTML(q){
  if (!q.indices?.length) return null;
  const el = h(`<div><div class="indices"></div><div class="btn-indice"><button type="button" class="btn small ghost" data-indice>${I.bulb.replace("<svg", '<svg style="color:var(--gold-deep)"')}Indice 1 sur ${q.indices.length}</button><span class="note" style="margin:0">Chaque indice réduit un peu le bonus. Aucun ne donne la solution.</span></div></div>`);
  let n = 0;
  const btn = el.querySelector("[data-indice]");
  const montrer = () => {
    const ind = q.indices[n]; const t = typeof ind === "string" ? { texte:ind } : ind;
    el.querySelector(".indices").appendChild(h(`<div class="indice"><span class="n">${n + 1}</span><div>${t.texte ? `<div class="rich">${rich(t.texte)}</div>` : ""}${t.code ? `<pre translate="no">${colorer(lignes(t.code))}</pre>` : ""}</div></div>`));
    n++;
    if (n >= q.indices.length) btn.parentElement.remove(); else btn.lastChild.textContent = `Indice ${n + 1} sur ${q.indices.length}`;
  };
  btn.onclick = montrer;
  return { el, vus:() => n, montrer };
}
function resultatHTML(r){
  const el = h(`<div class="resultat"></div>`);
  if (r.erreur) {
    el.appendChild(h(`<div class="diag"><b>${esc(r.erreur.titre)}${r.erreur.ligne ? ` · ligne ${r.erreur.ligne}` : ""}</b>${richInline(r.erreur.message)}${r.erreur.original && r.erreur.original !== r.erreur.message ? `<div class="note" style="margin-top:6px">Message original : <code>${esc(r.erreur.original)}</code></div>` : ""}</div>`));
  }
  for (const d of r.diagnostics || []) el.appendChild(h(`<div class="diag"><b>Ce qui coince</b>${richInline(d.message)}</div>`));
  const conseils = (r.conseils || []).filter(c => !(r.diagnostics || []).some(d => d.id === c.id));
  for (const c of conseils) el.appendChild(h(`<div class="diag conseil"><b>Conseil</b>${richInline(c.message)}</div>`));
  if (r.cas?.length) {
    el.appendChild(h(`<div class="tests">${r.cas.map(c => `<div class="test ${c.ok ? "ok" : "ko"}">${c.ok ? I.check : I.cross}<div><b>${esc(c.titre)}</b>${c.appel ? ` · <code>${esc(c.appel)}</code>` : ""}</div>${
      c.erreur ? `<div class="det">${richInline(c.erreur.message)}</div>`
      : !c.ok ? `<div class="det">${"attendu" in c && c.attendu !== c.obtenu ? `On attend <code>${esc(c.attendu)}</code>, tu retournes <code>${esc(c.obtenu)}</code>.` : ""}${c.sortieAttendue && !egal(c.sortieAttendue, c.sortieObtenue) ? ` Affichage attendu : <code>${ansiHTML(c.sortieAttendue.join(" ⏎ "))}</code>, obtenu : <code>${(c.sortieObtenue || []).length ? ansiHTML(c.sortieObtenue.join(" ⏎ ")) : "rien"}</code>.` : ""}${(c.details || []).map(d => " " + richInline(d)).join("")}</div>` : ""}</div>`).join("")}</div>`));
  }
  return el;
}
function exerciceCode(q, onChange){
  const trous = q.type === "trous";
  const depart = lignes(q.depart ?? (trous ? q.code : ""));
  const entete = [enteteAffichee(q.donnees), lignes(q.prelude || "")].filter(Boolean).join("\n");
  const el = h(`<div class="ex-code">${q.enonce ? `<div class="rich" style="margin-bottom:8px">${rich(q.enonce)}</div>` : ""}${q.regles?.length ? `<div class="aside tip" style="margin-top:0">${I.warn.replace("<svg", '<svg style="color:var(--teal)"')}<div><b class="t">Règles du cours</b><div class="rich">${rich(q.regles.map(r => "- " + r).join("\n"))}</div></div></div>` : ""}<div class="zone-code"></div><div class="ed-actions"><button type="button" class="btn small ghost" data-run>${I.play}Exécuter</button>${trous ? "" : `<button type="button" class="btn small ghost" data-reset>${I.reset}Recommencer</button>`}</div><div class="sortie"></div><div class="zone-indices"></div></div>`);
  let ed = null, champs = [];
  const zone = el.querySelector(".zone-code");
  if (trous) {
    // code affiché avec des champs à la place des ___
    const parts = depart.split(TROU);
    let html = "";
    parts.forEach((p, i) => { html += colorer(p); if (i < parts.length - 1) html += `<input class="trou" data-t="${i}" aria-label="Trou ${i + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" size="${Math.max(4, (q.tailles?.[i]) || 6)}">`; });
    zone.appendChild(h(`<div><div class="code sans-n" translate="no" style="white-space:pre">${entete ? `<div class="entete" style="padding:0 14px">${colorer(entete)}</div>` : ""}<div style="padding:0 14px">${html}</div></div></div>`));
    champs = [...zone.querySelectorAll("input.trou")];
    const brouillon = ST.brouillons[q.id];
    if (Array.isArray(brouillon) && brouillon.length === champs.length) champs.forEach((c, i) => c.value = brouillon[i]);
    champs.forEach(c => { c.addEventListener("input", () => { c.size = Math.max(4, c.value.length + 1); ST.brouillons[q.id] = champs.map(x => x.value); save(); onChange(); }); c.addEventListener("keydown", e => { if (e.key === "Enter") { const n = champs[champs.indexOf(c) + 1]; if (n) { e.preventDefault(); e.stopPropagation(); n.focus(); } } }); c.size = Math.max(4, c.value.length + 1); });
  } else {
    const brouillon = typeof ST.brouillons[q.id] === "string" ? ST.brouillons[q.id] : null;
    let t = null;
    ed = Editeur({ code: brouillon ?? depart, entete, onChange: v => { onChange(); clearTimeout(t); t = setTimeout(() => { if (v === depart) delete ST.brouillons[q.id]; else ST.brouillons[q.id] = v; save(); }, 400); } });
    zone.appendChild(ed.el);
    if (brouillon && brouillon !== depart) zone.appendChild(h(`<p class="note">Ton brouillon a été gardé. « Recommencer » remet le code de départ.</p>`));
  }
  const codeActuel = () => trous ? depart.split(TROU).map((p, i, a) => p + (i < a.length - 1 ? (champs[i].value || "") : "")).join("") : ed.valeur();
  const ind = indicesHTML(q); if (ind) el.querySelector(".zone-indices").appendChild(ind.el);
  const sortie = el.querySelector(".sortie");
  const tableaux = q.donnees ? Object.entries(q.donnees).filter(([, v]) => Array.isArray(v)).map(([k]) => k) : [];
  let essais = 0, verrou = false;
  el.querySelector("[data-run]").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    if (q.dom) {   // DOM : la page s'affiche, avec ton code ; tu cliques toi-même, la console se remplit
      sortie.innerHTML = "";
      const zonePage = h(`<div></div>`), cons = h(consoleHTML([], { vide:"Rien n'a été affiché pour l'instant." }));
      sortie.append(h(`<p class="apercu-note">La page de l'exercice, avec ton code. Clique sur ses boutons pour essayer.</p>`), zonePage, cons);
      const r = await apercuDom(zonePage, { code: codeActuel(), dom: q.dom, surLog: (t, g) => { cons.querySelector(".vide")?.remove(); const l = h(`<div class="cl ${g === "error" ? "err" : ""}"></div>`); l.innerHTML = ansiHTML(t); cons.appendChild(l); } });
      b.disabled = false;
      if (r.erreur) { sortie.appendChild(resultatHTML({ erreur:r.erreur })); ed?.marquer(r.erreur.ligne); }
      return;
    }
    const r = await executer({ code: codeActuel(), donnees: q.donnees || null, prelude: q.prelude ? lignes(q.prelude) : "" });
    b.disabled = false;
    sortie.innerHTML = "";
    sortie.appendChild(h(consoleHTML(r.console, { vide:"Rien n'a été affiché. Pour voir un résultat : console.log(…)." })));
    if (r.erreur) { sortie.appendChild(resultatHTML({ erreur:r.erreur })); ed?.marquer(r.erreur.ligne); }
    else if (r.conseils?.length) sortie.appendChild(resultatHTML({ conseils:r.conseils }));
  };
  el.querySelector("[data-reset]")?.addEventListener("click", () => confirmBox("Recommencer ?", "Ton code actuel sera remplacé par le code de départ.", "Recommencer", () => { ed.definir(depart); delete ST.brouillons[q.id]; save(); sortie.innerHTML = ""; onChange(); }, false));
  return {
    el, code:true,
    ready:() => !verrou && (trous ? champs.every(c => c.value.trim() !== "") : ed.valeur().trim() !== "" && ed.valeur() !== depart),
    indicesVus:() => ind ? ind.vus() : 0,
    essais:() => essais,
    resoudre(){
      if (trous) { champs.forEach((c, i) => c.value = q.solution[i]); }
      else ed.definir(lignes(q.solution));
      onChange();
    },
    reouvrir(){ verrou = false; ed?.lectureSeule(false); champs.forEach(c => c.readOnly = false); onChange(); },
    async check(){
      verrou = true; ed?.lectureSeule(true); champs.forEach(c => c.readOnly = true);
      essais++;
      const r = q.dom ? await executerDom({ code: codeActuel(), dom: q.dom, tests: q.tests, contexte:{ tableaux } })
        : await executer({ code: codeActuel(), donnees: q.donnees || null, prelude: q.prelude ? lignes(q.prelude) : "", tests: q.tests, contexte:{ tableaux } });
      if (r.timeout && q.tests?.siTropLong) r.erreur.message += " " + q.tests.siTropLong;
      sortie.innerHTML = "";
      sortie.appendChild(h(consoleHTML(r.console, { vide:"Rien n'a été affiché." })));
      sortie.appendChild(resultatHTML(r));
      ed?.marquer(r.erreur?.ligne || r.cas?.find(c => c.erreur?.ligne)?.erreur.ligne || (r.diagnostics || []).find(d => d.ligne)?.ligne || null);
      if (r.ok) { ST.stats.codes++; if (essais === 1) ST.stats.premierCoup++; delete ST.brouillons[q.id]; save(); }
      const premier = r.erreur || (r.diagnostics || [])[0] || r.cas.find(c => !c.ok)?.erreur;
      const rate = r.cas?.filter(c => !c.ok).length || 0;
      return {
        ok: r.ok, retry: !r.ok, essais,
        detailHTML: r.ok ? `<p><b>Tous les tests passent${r.cas.length > 1 && !q.dom ? `, y compris avec d'autres données` : ""}.</b>${essais === 1 ? " Du premier coup !" : ""}</p>${(r.conseils || []).map(c => `<p>${richInline("Conseil : " + c.message)}</p>`).join("")}`
          : `${premier ? `<p>${richInline(premier.message)}</p>` : ""}${rate ? `<p>${pluriel(rate, "test échoue", "tests échouent")} sur ${r.cas.length}. Le détail est sous ton code.</p>` : ""}`
      };
    }
  };
}
/* ---------------- écrire un sélecteur CSS (TP DOM) : la page surligne en direct ce qu'il sélectionne ---------------- */
/* "dom": { "page": "cards" } ou { "html": [...] }, "attendu": "le sélecteur de référence" (comparé par les éléments sélectionnés, pas par le texte) */
Q.selecteur = (q, onChange) => {
  const el = h(`<div class="selecteur-zone"><iframe class="selecteur-page" title="Page de l'exercice"></iframe><label class="eyebrow" for="sel-css">Ton sélecteur CSS</label><input id="sel-css" class="saisie" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="ex. .deck .heart"><div class="selecteur-compte" aria-live="polite">Écris un sélecteur : les éléments trouvés s'entourent dans la page.</div></div>`);
  const f = el.querySelector("iframe"), inp = el.querySelector("input"), compte = el.querySelector(".selecteur-compte");
  let doc = null, locked = false;
  documentDom(q.dom, false).then(html => { f.srcdoc = html.replace("</head>", "<style>.pw-trouve{outline:3px dashed #5B3FD9 !important;outline-offset:2px;background:#ECE8FC !important}</style></head>"); });
  f.addEventListener("load", () => { doc = f.contentDocument; maj(); });
  const trouver = sel => { try { return [...doc.querySelectorAll(sel)]; } catch(e) { return null; } };
  const maj = () => {
    if (!doc || locked) return;
    doc.querySelectorAll(".pw-trouve").forEach(x => x.classList.remove("pw-trouve"));
    const v = inp.value.trim();
    if (!v) { compte.textContent = "Écris un sélecteur : les éléments trouvés s'entourent dans la page."; compte.classList.remove("ko"); onChange(); return; }
    const els = trouver(v);
    if (!els) { compte.textContent = "Sélecteur invalide (vérifie la syntaxe : . pour une classe, # pour un id, [ ] pour un attribut)."; compte.classList.add("ko"); onChange(); return; }
    els.forEach(x => x.classList.add("pw-trouve"));
    const vue = els.find(x => x.localName === "playing-card") || els[0];   // amène le premier élément trouvé dans la vue (sans faire défiler l'appli)
    if (vue && doc.scrollingElement) doc.scrollingElement.scrollTop = Math.max(0, vue.getBoundingClientRect().top + doc.scrollingElement.scrollTop - 12);
    const cartes = els.filter(x => x.localName === "playing-card").length;
    compte.classList.remove("ko");
    compte.textContent = `${pluriel(els.length, "élément trouvé", "éléments trouvés")}${els.length !== cartes && cartes ? ` (dont ${cartes} carte${cartes > 1 ? "s" : ""} : les autres sont des éléments à l'intérieur des cartes ou ailleurs)` : ""}.`;
    onChange();
  };
  inp.addEventListener("input", maj);
  return { el, ready:() => !!doc && inp.value.trim() !== "" && !!trouver(inp.value.trim()),
    resoudre(){ inp.value = q.attendu; maj(); },
    check(){
      locked = true; inp.readOnly = true;
      const a = trouver(inp.value.trim()) || [], b = trouver(q.attendu);
      const ok = a.length === b.length && a.every(x => b.includes(x));
      inp.classList.add(ok ? "ok" : "ko");
      return { ok, answer: `${q.attendu} (${pluriel(b.length, "élément")})` };
    } };
};

Q.trous = exerciceCode; Q.corriger = exerciceCode; Q.ecrire = exerciceCode; Q.boss = exerciceCode;
