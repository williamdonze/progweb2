"use strict";
/* =====================================================================
   Moteur de cours façon Duolingo — sessions, parcours, défi du jour, théorie, console, profil, démarrage.
   ===================================================================== */

/* ---------------- runner de session ---------------- */
/* steps : [{kind:"carte", carte}, {kind:"q", q}] ; opts : {title, requeue, onEnd(result)} */
let nettoyerSession = null;
const MODE_TEST = /[?&]test\b/.test(location.search);
const BRAVO = ["Bien joué !", "Excellent !", "Parfait !", "Bravo !", "Ça compile dans ta tête !", "Impeccable !"];
function runSession(steps, opts){
  closeSession();
  const ses = h(`<div class="session" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
    <div class="s-top"><div class="wrap"><button class="iconbtn" data-quit aria-label="Quitter">${I.x}</button><div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><span class="s-count"></span></div></div>
    <div class="s-body"><div class="wrap" id="s-main"></div></div>
    <div class="s-foot"><div class="wrap"></div></div></div>`);
  document.body.appendChild(ses); document.body.style.overflow = "hidden"; document.body.classList.add("en-session"); majCalques();
  const main = ses.querySelector("#s-main"), foot = ses.querySelector(".s-foot .wrap"), bar = ses.querySelector(".pbar i"), count = ses.querySelector(".s-count");
  const queue = steps.slice(); const total = steps.length;
  let tGarde = -1e9;
  const garde = fn => e => {   // un double toucher ne valide pas deux écrans d'affilée
    if (e?.detail > 1) return;
    if (e?.pointerType === "touch") { const t = performance.now(); if (t - tGarde < 350) return; tGarde = t; }
    fn();
  };
  let idx = 0, answered = 0, correct = 0, bonus = 0, current = null, sheet = null, sheetObs = null, retried = new Set(), results = [], occupe = false;
  const qTotal = steps.filter(s => s.kind === "q").length;
  nettoyerSession = () => { current?.cleanup?.(); current = null; sheetObs?.disconnect(); };
  ses.querySelector("[data-quit]").onclick = () => confirmBox("Quitter la session ?", "Les XP de cette session seront perdus. Ton travail en cours reste gardé en brouillon.", "Quitter", () => { closeSession(); render(); });

  let pMax = 0;
  function progress(fait = 0){ pMax = Math.max(pMax, Math.min(1, (idx + fait) / Math.max(total, queue.length))); bar.style.width = (pMax * 100) + "%"; count.textContent = !qTotal ? "" : queue[idx]?.retry ? "reprise" : `${Math.min(answered, qTotal)}/${qTotal}`; }
  function retirerFeuille(){ sheet?.remove(); sheet = null; sheetObs?.disconnect(); sheetObs = null; ses.querySelector(".s-body").style.paddingBottom = ""; }
  function show(){
    current?.cleanup?.(); retirerFeuille();
    if (idx >= queue.length) return finish();
    progress();
    const st = queue[idx];
    main.innerHTML = ""; ses.querySelector(".s-body").scrollTop = 0;
    if (st.kind === "carte") {
      const c = st.carte;
      const art = h(`<article class="lcard">${c.illu ? `<div class="illu">${illu(c.illu, c)}</div>` : ""}<h2>${richInline(c.titre)}</h2><div class="rich">${rich(c.texte || "")}</div></article>`);
      if (c.code) art.appendChild(c.executable === false || !aModule("code-js") ? h(`<div>${codeHTML(lignes(c.code))}</div>`) : blocExecutable(lignes(c.code), { donnees:c.donnees, dom:c.dom }));
      if (c.apres) art.appendChild(h(`<div class="rich">${rich(c.apres)}</div>`));
      if (c.analogie) art.appendChild(h(`<div class="aside analogie">${I.egg.replace("<svg", '<svg style="color:var(--gold-deep)"')}<div><b class="t">L'image à retenir</b><div class="rich">${rich(c.analogie)}</div></div></div>`));
      if (c.astuce) art.appendChild(h(`<div class="aside tip">${I.bulb.replace("<svg", '<svg style="color:var(--teal)"')}<div><b class="t">Bon à savoir</b><div class="rich">${rich(c.astuce)}</div></div></div>`));
      if (c.piege) art.appendChild(h(`<div class="aside piege">${I.warn.replace("<svg", '<svg style="color:var(--ko)"')}<div><b class="t">Attention, piège</b><div class="rich">${rich(c.piege)}</div></div></div>`));
      if (c.fiche && FICHES[c.fiche]) art.appendChild(h(`<p class="note">Fiche de théorie : <button type="button" class="fl" data-fiche="${esc(c.fiche)}">${esc(FICHES[c.fiche].titre)}</button></p>`));
      main.appendChild(art);
      foot.innerHTML = `${idx > 0 && queue[idx-1].kind === "carte" ? `<button class="btn ghost" data-prev aria-label="Carte précédente">←</button>` : ""}<button class="btn" data-next>Continuer</button>`;
      foot.querySelector("[data-next]").onclick = garde(() => { idx++; show(); });
      foot.querySelector("[data-prev]")?.addEventListener("click", garde(() => { idx--; show(); }));
      current = null; foot.querySelector("[data-next]").focus({preventScroll:true});
      return;
    }
    const q = st.q;
    const titre = q.question || q.titre || "";
    const box = h(`<div><div class="qkind">${esc(KIND_NAME[q.type] || "")}${q.source ? `<span class="qsource">· ${esc(q.source)}</span>` : ""}${st.retry ? " · nouvelle chance" : ""}</div>${titre ? `<h2 class="qtitle">${richInline(titre)}</h2>` : ""}${q.consigne ? `<p class="consigne">${richInline(q.consigne)}</p>` : ""}</div>`);
    main.appendChild(box);
    foot.innerHTML = `<button class="btn ok" data-check disabled>Vérifier</button>`;
    const btn = foot.querySelector("[data-check]");
    current = Q[q.type](q, () => { btn.disabled = occupe || !current?.ready(); });
    if (MODE_TEST) window.__q = current;   // tests automatiques : accès à la question affichée
    box.appendChild(current.el);
    btn.disabled = !current.ready();
    btn.onclick = garde(() => verify(q, st));
  }
  function feuille(ok, titre, corps, boutons){
    retirerFeuille();
    sheet = h(`<div class="sheet ${ok ? "ok" : "ko"}" role="status"><div class="wrap"><h3>${ok ? I.check : I.cross}${esc(titre)}</h3><div class="expl">${corps}</div><div class="row-btns">${boutons}</div></div></div>`);
    foot.innerHTML = ""; ses.appendChild(sheet);
    const body = ses.querySelector(".s-body"), reserve = () => { if (sheet) body.style.paddingBottom = sheet.offsetHeight + "px"; };
    reserve(); try { sheetObs = new ResizeObserver(reserve); sheetObs.observe(sheet); } catch(e) {}
    return sheet;
  }
  async function verify(q, st){
    if (occupe) return;
    occupe = true;
    const btn = foot.querySelector("[data-check]"); if (btn) { btn.disabled = true; btn.textContent = current.code ? "Tests en cours…" : "Vérification…"; }
    let r;
    try { r = await current.check(); } finally { occupe = false; }
    if (r.retry) {
      // exercice de code raté : l'élève corrige et revérifie ; « Passer » au bout de 3 essais
      const s = feuille(false, r.essais >= 3 ? "Toujours pas…" : "Pas encore", r.detailHTML || "", `<button class="btn ko" data-fix style="flex:1">Corriger mon code</button>${r.essais >= 3 ? `<button class="btn ghost" data-skip>Passer</button>` : ""}`);
      s.querySelector("[data-fix]").onclick = garde(() => { retirerFeuille(); current.reouvrir(); foot.innerHTML = `<button class="btn ok" data-check>Vérifier</button>`; const b = foot.querySelector("[data-check]"); b.disabled = !current.ready(); b.onclick = garde(() => verify(q, st)); current.el.querySelector("textarea, input")?.focus({ preventScroll:true }); });
      s.querySelector("[data-skip]")?.addEventListener("click", garde(() => conclure(q, st, { ok:false, passe:true }, current)));
      s.querySelector("[data-fix]").focus({ preventScroll:true });
      return;
    }
    conclure(q, st, r, current);
  }
  function conclure(q, st, r, cur){
    if (!st.retry) answered++;
    progress(1);
    const essais = cur?.essais?.() || 1, indices = cur?.indicesVus?.() || 0;
    if (r.ok) { correct += st.retry ? 0 : 1; bonus += r.bonus || 0; }
    results.push({ q, ok:r.ok, retry:!!st.retry, essais, indices, passe:!!r.passe });
    noterNotions(q, r.ok && essais === 1 && !indices);
    if (q.id && q.type !== "boss") { const i = ST.erreurs.indexOf(q.id); if (r.ok && essais === 1 && i >= 0) ST.erreurs.splice(i, 1); if ((!r.ok || essais > 1) && i < 0) ST.erreurs.push(q.id); if (ST.erreurs.length > 80) ST.erreurs.shift(); }
    save();
    if (!r.ok && !cur?.code && opts.requeue && !retried.has(q)) { retried.add(q); queue.push({ kind:"q", q, retry:true }); }
    const corps = `${!r.ok && r.answer ? `<p class="answer">Bonne réponse : ${richInline(r.answer)}</p>` : ""}${!r.ok && r.answerHTML ? `<p class="answer">Bonne réponse :</p>${r.answerHTML}` : ""}${r.detailHTML && r.ok ? r.detailHTML : ""}${r.passe ? `<p>Pas de souci : cet exercice reviendra dans ton défi du jour. Relis la fiche de la notion avant.</p>` : ""}${q.explication && (r.ok || !cur?.code) ? `<div class="rich">${rich(q.explication)}</div>` : ""}${!r.ok && q.notions?.length ? `<p class="note" style="margin-top:6px">Revoir : ${q.notions.filter(n => FICHES[n]).map(n => `<button type="button" class="fl" data-fiche="${esc(n)}">${esc(FICHES[n].titre)}</button>`).join(", ")}</p>` : ""}`;
    const s = feuille(r.ok, r.ok ? (essais > 1 ? "Ça y est !" : pick(BRAVO)) : r.passe ? "On passe pour l'instant" : "Pas tout à fait", corps, `<button class="btn ${r.ok ? "ok" : "ko"} block" data-cont>Continuer</button>`);
    s.querySelector("[data-cont]").onclick = garde(() => { idx++; show(); });
    s.querySelector("[data-cont]").focus({ preventScroll:true });
  }
  function finish(){
    bar.style.width = "100%";
    count.textContent = qTotal ? `${qTotal}/${qTotal}` : "";
    current?.cleanup?.(); current = null;
    const res = { correct, total:qTotal, bonus, results };
    const out = opts.onEnd(res) || {};
    ses.querySelector("[data-quit]").onclick = () => { closeSession(); render(); };
    main.innerHTML = ""; foot.innerHTML = "";
    const pct = qTotal ? Math.round(correct / qTotal * 100) : 100;
    main.appendChild(h(`<div class="endcard">${mascot(out.mood || "happy")}<h2>${esc(out.title || "Session terminée !")}</h2>${out.text ? `<p style="max-width:46ch">${esc(out.text)}</p>` : ""}
      <div class="end-stats"><div class="es" style="--c:var(--gold);--on:var(--on-gold);--t:var(--gold-ink)"><b>XP gagnés</b><span>+${out.xp || 0}</span></div><div class="es" style="--c:var(--ok-btn);--on:var(--on-ok);--t:var(--ok-ink)"><b>Réussite</b><span>${qTotal ? pct + " %" : "100 %"}</span></div><div class="es" style="--c:var(--prim-btn);--on:var(--on-prim);--t:var(--prim-ink)"><b>${qTotal ? "Bonnes rép." : "Cartes"}</b><span>${qTotal ? `${correct}/${qTotal}` : total}</span></div></div></div>`));
    foot.innerHTML = `${out.retry ? `<button class="btn ghost" data-retry>Réessayer</button>` : ""}<button class="btn" data-done>Continuer</button>`;
    foot.querySelector("[data-done]").onclick = () => { closeSession(); render(); };
    foot.querySelector("[data-retry]")?.addEventListener("click", out.retry);
    if (out.confetti) confetti();
  }
  ses.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.defaultPrevented) { const b = (sheet && sheet.querySelector("[data-cont],[data-fix]")) || foot.querySelector("[data-next]:not(:disabled),[data-check]:not(:disabled),[data-done]"); if (b && !["BUTTON","TEXTAREA","INPUT"].includes(document.activeElement?.tagName)) { e.preventDefault(); b.click(); } }
    if (/^[1-4]$/.test(e.key) && current?.key && !sheet && !["TEXTAREA","INPUT"].includes(document.activeElement?.tagName)) current.key(+e.key - 1);
  });
  ses.tabIndex = -1; ses.focus();
  show();
  return { ses };
}
function closeSession(){ nettoyerSession?.(); nettoyerSession = null; document.querySelectorAll(".session,.sheet,.drag-ghost,.confetti").forEach(x => x.remove()); document.body.style.overflow = ""; document.body.classList.remove("en-session"); majCalques(); }

/* ---------------- lancement des activités ---------------- */
const uniteDe = id => D.unites.find(u => u.id === id);
function startStep(u, step){
  if (step === "quiz") return startQuiz(u);
  if (step.startsWith("jeu:")) return startGame(u, step.slice(4));
  if (step.startsWith("boss:")) return startBoss(u, step.slice(5));
  const l = u.lecons.find(x => x.id === step);
  const steps = [...l.cartes.map(c => ({ kind:"carte", carte:c })), ...l.exercices.map(q => ({ kind:"q", q }))];
  runSession(steps, { title:l.titre, requeue:true, onEnd:r => {
    const first = !ST.done[l.id]; ST.done[l.id] = todayStr();
    // les notions de la leçon entrent dans la répétition espacée
    for (const n of l.notions || []) if (!ST.notions[n]) ST.notions[n] = { b:1, due:plusJours(1), vu:0, rate:0 };
    const xp = (first ? 15 : 5) + r.correct * 2; gainXP(xp);
    return { title:"Leçon terminée !", text: first ? `« ${l.titre} » : c'est dans la boîte.` : "Révision faite, ça rentre !", xp, mood: r.correct === r.total ? "wow" : "happy" };
  }});
}
function startGame(u, gid){
  const g = u.jeux.find(x => x.id === gid);
  const qs = shuffle(g.questions).slice(0, g.tours || g.questions.length);
  runSession(qs.map(q => ({ kind:"q", q })), { title:g.titre, onEnd:r => {
    const key = `jeu:${gid}`; const first = !ST.done[key]; ST.done[key] = todayStr();
    ST.games[gid] = Math.max(ST.games[gid] || 0, r.correct);
    const xp = r.correct * 3 + (first ? 15 : 5); gainXP(xp);
    if (g.badge && r.correct >= (g.seuilBadge ?? r.total)) award(g.badge);
    const great = r.correct >= Math.ceil(r.total * .8);
    return { title: great ? "Bien vu !" : "Partie terminée", text: great ? `${r.correct} sur ${r.total} : ${APP.textes.jeuReussi || "tu as l'œil !"}` : `${r.correct} sur ${r.total}. Rejoue autant que tu veux, l'ordre change.`, xp, retry:() => startGame(u, gid), mood: great ? "wow" : "happy" };
  }});
}
function startQuiz(u){
  const seuil = D.config.seuilValidation;
  runSession(u.quiz.questions.map(q => ({ kind:"q", q })), { title:u.quiz.titre || `Quiz : ${u.titre}`, onEnd:r => {
    const pct = r.correct / r.total; const pass = pct >= seuil;
    const prev = ST.quiz[u.id] || { best:0, passed:false };
    const firstPass = pass && !prev.passed;
    ST.quiz[u.id] = { best: Math.max(prev.best, Math.round(pct * 100)), passed: prev.passed || pass };
    const xp = r.correct * 5 + (firstPass ? 40 : 0); gainXP(xp);
    if (pass) award(`unite-${u.id}`); if (pct === 1) award("sans-faute");
    const next = D.unites[D.unites.indexOf(u) + 1];
    if (pass) return { title:"Unité validée !", text: u.boss?.length ? `Le boss de l'unité t'attend. ${next ? `Et l'unité ${next.numero}, « ${next.titre} », est ouverte.` : ""}` : next ? `L'unité ${next.numero}, « ${next.titre} », est ouverte.` : "Tu as validé la dernière unité !", xp, confetti:firstPass, mood:"wow" };
    return { title:"Presque !", text:`Il faut ${Math.round(seuil * 100)} % pour valider. Relis les explications et les fiches, puis retente : les leçons restent ouvertes.`, xp, retry:() => startQuiz(u), mood:"sad" };
  }});
}
function startBoss(u, bid){
  const b = u.boss.find(x => x.id === bid);
  if (b.questions) return startEtude(u, b);
  runSession([{ kind:"q", q:b }], { title:b.titre || "Boss", onEnd:r => {
    const res = r.results[0] || {};
    if (!r.correct) return { title:"Le boss résiste", text:"Pas grave : relis la fiche, refais un exercice de la leçon, puis reviens. Ton brouillon est gardé.", xp:0, retry:() => startBoss(u, bid), mood:"sad" };
    const prev = ST.boss[b.id]; const first = !prev?.fait;
    ST.boss[b.id] = { fait: prev?.fait || todayStr(), essais: Math.min(prev?.essais ?? 99, res.essais || 1), indices: Math.min(prev?.indices ?? 9, res.indices || 0) };
    const xp = first ? Math.max(10, 40 - (res.indices || 0) * 8 + (res.essais === 1 ? 10 : 0)) : 5; gainXP(xp); checkBadges(); save();
    return { title: first ? "Boss vaincu !" : "Boss rejoué", text: `${res.essais === 1 ? "Du premier coup" : `En ${res.essais} essais`}${res.indices ? `, avec ${pluriel(res.indices, "indice")}` : ", sans indice"}. Ce sont les vrais exercices du cours : tu sais les faire seul.`, xp, confetti:first, mood:"wow" };
  }});
}

/* boss « étude de cas » : un scénario (cartes), puis une série de questions ; réussi à partir du seuil de validation */
function startEtude(u, b){
  const cartes = b.cartes || [{ titre: b.titre, texte: b.enonce || "" }];
  const steps = [...cartes.map(c => ({ kind:"carte", carte:c })), ...b.questions.map(q => ({ kind:"q", q }))];
  runSession(steps, { title:b.titre || "Étude de cas", onEnd:r => {
    const seuil = b.seuil ?? D.config.seuilValidation ?? .8;
    const pct = r.total ? r.correct / r.total : 1;
    if (pct < seuil) return { title:"Le boss résiste", text:`${r.correct} sur ${r.total} : il en faut ${Math.ceil(seuil * r.total)}. Relis les fiches, puis retente : les questions sont les mêmes, mais tu les vois autrement maintenant.`, xp:r.correct * 2, retry:() => startEtude(u, b), mood:"sad" };
    const first = !ST.boss[b.id]?.fait;
    ST.boss[b.id] = { fait: ST.boss[b.id]?.fait || todayStr(), essais:1, indices:0, score: Math.max(ST.boss[b.id]?.score || 0, Math.round(pct * 100)) };
    const xp = first ? 30 + r.correct * 3 : 5; gainXP(xp); checkBadges(); save();
    return { title: first ? "Boss vaincu !" : "Boss rejoué", text:`${r.correct} sur ${r.total}. ${b.source ? `C'est le niveau attendu dans le cours (${b.source}).` : "Tu sais l'appliquer à un vrai cas."}`, xp, confetti:first, mood:"wow" };
  }});
}

/* ---------------- défi du jour : notions dues, erreurs récentes, puis révisions ---------------- */
function toutesLesQuestions(){
  const out = [];
  for (const u of D.unites) {
    u.lecons.forEach(l => l.exercices.forEach(q => out.push({ q, u, ouvert:!!ST.done[l.id] })));
    u.jeux.forEach(g => g.questions.forEach(q => out.push({ q, u, ouvert:!!ST.done[`jeu:${g.id}`] })));
    u.quiz.questions.forEach(q => out.push({ q, u, ouvert:!!ST.quiz[u.id] }));
    u.boss.filter(b => b.questions).forEach(b => b.questions.forEach(q => out.push({ q, u, ouvert:!!ST.boss[b.id]?.fait })));
  }
  return out;
}
function buildDaily(){
  const t = todayStr(); const rnd = seeded(APP.cle + "-" + t);
  const tout = toutesLesQuestions();
  const ouvertes = tout.filter(x => x.ouvert).map(x => x.q);
  const byId = Object.fromEntries(tout.map(x => [x.q.id, x.q]));
  const choisies = [];
  const ajouter = q => { if (q && !choisies.includes(q) && choisies.length < 8 && !(TYPES_CODE.has(q.type) && choisies.filter(x => TYPES_CODE.has(x.type)).length >= 1)) choisies.push(q); };
  // 1. notions dues (les plus fragiles d'abord) : une question chacune
  for (const n of notionsDues().slice(0, 4)) ajouter(pick(shuffle(ouvertes.filter(q => q.notions?.includes(n) && q.type !== "boss"), rnd), rnd));
  // 2. erreurs récentes
  for (const id of shuffle(ST.erreurs, rnd).slice(0, 2)) ajouter(byId[id]);
  // 3. révisions au hasard
  let pool = ouvertes.filter(q => q.type !== "boss");
  if (pool.length < 4) pool = pool.concat(D.unites[0].lecons[0].exercices);
  for (const q of shuffle(pool, rnd)) { if (choisies.length >= 6) break; ajouter(q); }
  return choisies;
}
function startDaily(){
  const t = todayStr();
  const qs = buildDaily();
  runSession(qs.map(q => ({ kind:"q", q })), { title:"Défi du jour", onEnd:r => {
    const first = ST.daily[t] === undefined; ST.daily[t] = Math.max(ST.daily[t] || 0, r.correct);
    const xp = r.correct * 4 + (first ? 30 : 0); gainXP(xp); award("defi");
    return { title: first ? "Défi du jour relevé !" : "Défi rejoué", text: first ? "Bonus de 30 XP. Les notions ratées reviendront plus souvent, les autres s'espacent." : "Le bonus quotidien est déjà empoché, mais l'entraînement compte.", xp, mood:"wow", confetti:first && r.correct === r.total };
  }});
}

/* ---------------- coquille ---------------- */
let VIEW = "home";
function go(v){ VIEW = v; render(); window.scrollTo(0, 0); }
function shell(){
  if (document.getElementById("topbar")) return;
  document.body.insertBefore(h(`<header class="topbar" id="topbar"><div class="wrap"><button class="brand" data-go="home" aria-label="${esc(APP.nom)}, accueil">${I.logo}${esc(APP.nom)}</button><div class="stats" id="stats"></div></div></header>`), $app);
  document.body.appendChild(h(`<nav class="tabbar" aria-label="Navigation"><div class="wrap">
    <button class="tab" data-go="home">${I.home}Parcours</button>
    <button class="tab" data-go="defi">${I.star}Défi</button>
    <button class="tab" data-go="theorie">${I.book}Théorie</button>
    ${aModule("code-js") ? `<button class="tab" data-go="console">${I.terminal}Console</button>` : ""}
    <button class="tab" data-go="profil">${I.user}Profil</button></div></nav>`));
  document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });
}
function renderTop(){
  const s = streakNow(); const { cur } = rankOf(ST.xp);
  const el = document.getElementById("stats"); if (!el) return;
  el.innerHTML = `<span class="rank-chip">${esc(cur.nom)}</span><button class="stat flame ${s ? "" : "off"}" data-go="profil" title="Série de jours" aria-label="Série : ${s} jour${s > 1 ? "s" : ""}">${I.flame}${s}</button><button class="stat xp" data-go="profil" title="Points d'expérience" aria-label="${fmt(ST.xp)} points d'expérience">${I.gem}${fmtCourt(ST.xp)}</button>`;
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-current", t.dataset.go === VIEW ? "page" : "false"));
}
function render(){
  shell(); renderTop();
  $app.innerHTML = "";
  const v = { home:viewHome, defi:viewDefi, theorie:viewTheorie, console: aModule("code-js") ? viewConsole : null, profil:viewProfil }[VIEW] || viewHome;
  $app.appendChild(v());
}

/* ---------------- vue : parcours ---------------- */
const COULEURS_UNITE = [["var(--prim-btn)","var(--prim-deep)"],["#0E7C86","#08535A"],["#B04F08","#7A3404"],["#2A8F45","#1B652F"],["#B5475E","#83283E"],["#6B4FA0","#4A3474"],["#8A6A00","#5E4800"],["#2F6FB5","#1F4C7E"]];
function viewHome(){
  const el = h(`<main class="wrap"></main>`);
  const s = streakNow();
  const greet = !ST.xp ? `Salut ! Je suis ${APP.mascotte.nom}. ${APP.accroche} Première leçon : cinq minutes.` : s ? `Série de ${s} jour${s > 1 ? "s" : ""}. On garde le rythme ?` : "Content de te revoir ! Une petite leçon pour relancer la série ?";
  el.appendChild(h(`<div class="home-hero">${mascot("happy")}<div class="bubble">${esc(greet)}</div></div>`));
  const done = ST.daily[todayStr()] !== undefined;
  const dues = notionsDues().filter(n => FICHES[n]);
  const daily = h(`<div class="panel daily ${done ? "done" : ""}"><div class="ico">${done ? I.check : I.star}</div><div class="txt"><h3>Défi du jour</h3><p>${done ? "Relevé ! Reviens demain pour un nouveau défi." : dues.length ? `${pluriel(dues.length, "notion")} à revoir aujourd'hui, en priorité. +30 XP.` : "6 questions de révision sur ce que tu as appris. +30 XP."}</p></div><button class="btn ${done ? "ghost" : "gold"} small" data-daily>${done ? "Rejouer" : "Jouer"}</button></div>`);
  daily.querySelector("[data-daily]").onclick = startDaily;
  el.appendChild(daily);
  let currentFound = false;
  D.unites.forEach((u, ui) => {
    const ouverte = uniteOuverte(u);
    const [c1, c2] = COULEURS_UNITE[ui % COULEURS_UNITE.length];
    const sec = h(`<section class="unit ${ouverte ? "" : "locked"}"><div class="unit-head" ${ouverte ? `style="--u:${c1};--ud:${c2}"` : ""}><div><div class="num">Unité ${u.numero}${u.sousTitre ? ` · ${esc(u.sousTitre)}` : ""}</div><h2>${esc(u.titre)}</h2><p>${esc(u.objectif || "")}</p></div><div class="uico" aria-hidden="true">${ouverte ? esc(u.icone || "{ }") : I.lock}</div></div></section>`);
    if (!ouverte) { sec.appendChild(h(`<p class="unit-note">Valide le quiz de l'unité ${D.unites[ui - 1].numero} pour ouvrir celle-ci.</p>`)); el.appendChild(sec); return; }
    const path = h(`<div class="path"></div>`);
    u.parcours.forEach((step, i) => {
      const fait = noeudFait(u, step);
      const prevFait = i === 0 || noeudFait(u, u.parcours[i - 1]);
      const isCur = !fait && prevFait && !currentFound;
      if (isCur) currentFound = true;
      const open = fait || prevFait;
      const kind = step === "quiz" ? "quiz" : step.startsWith("jeu:") ? "jeu" : step.startsWith("boss:") ? "boss" : "lecon";
      const lecon = kind === "lecon" ? u.lecons.find(l => l.id === step) : null;
      const jeu = kind === "jeu" ? u.jeux.find(g => `jeu:${g.id}` === step) : null;
      const boss = kind === "boss" ? u.boss.find(b => `boss:${b.id}` === step) : null;
      const label = kind === "quiz" ? "Quiz de validation" : lecon?.titre || jeu?.titre || boss?.titre || step;
      const sub = lecon ? `${lecon.duree || 5} min` : kind === "quiz" && ST.quiz[u.id] ? `meilleur : ${ST.quiz[u.id].best} %` : jeu && ST.games[jeu.id] !== undefined ? `record : ${ST.games[jeu.id]}` : boss ? (boss.source || "Exercice du cours") : "";
      const offset = Math.round(Math.sin(i * 1.15) * 70);
      const icon = !open ? I.lock : kind === "quiz" ? I.trophy : kind === "jeu" ? I.game : kind === "boss" ? I.boss : fait ? I.check.replace('fill="currentColor"', 'fill="rgba(0,0,0,.18)"') : I.lesson;
      const w = h(`<div class="node-wrap ${open ? "" : "locked"} ${isCur ? "has-start" : ""}" style="transform:translateX(${offset}px)">
        ${isCur ? `<span class="start">${ST.xp ? "Continuer" : "Commencer"}</span>` : ""}
        <button class="node ${kind === "quiz" ? "quiz" : ""} ${kind === "boss" ? "boss" : ""} ${fait ? "done" : isCur ? "current" : open ? "" : "locked"}" ${open ? "" : "disabled"} aria-label="${esc(label)}${fait ? " (terminé)" : open ? "" : " (verrouillé)"}">${icon}</button>
        <div class="node-label">${esc(label)}${sub ? `<br><small style="color:var(--muted);font-weight:700">${esc(sub)}</small>` : ""}</div></div>`);
      if (open) w.querySelector(".node").onclick = () => startStep(u, step);
      path.appendChild(w);
    });
    sec.appendChild(path); el.appendChild(sec);
  });
  if (D.config.aVenir?.length) el.appendChild(h(`<section class="unit"><h2 style="font-size:22px">Bientôt</h2><p class="muted" style="margin-bottom:10px">Les prochaines unités suivront les TP de ton cours, semaine après semaine.</p>${D.config.aVenir.map(a => `<div class="fiche-lien" style="border-style:dashed"><span class="ic">${esc(a.icone || "…")}</span><div><b>${esc(a.titre)}</b><span>${esc(a.resume || "")}</span></div></div>`).join("")}</section>`));
  return el;
}

/* ---------------- vue : défi ---------------- */
function viewDefi(){
  const el = h(`<main class="wrap"></main>`);
  const t = todayStr(); const done = ST.daily[t] !== undefined;
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = todayStr(d); return { k, xp:ST.days[k] || 0, day:d.toLocaleDateString("fr-FR", { weekday:"short" }).replace(".", "") }; });
  const max = Math.max(30, ...last7.map(x => x.xp));
  const dues = notionsDues().filter(n => FICHES[n]);
  el.appendChild(h(`<div><div class="eyebrow">${new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}</div><h1 style="font-size:32px">Défi du jour</h1><p class="muted" style="margin:4px 0 16px">Chaque jour, un mélange de révisions : d'abord les notions qui reviennent aujourd'hui (celles que tu as ratées reviennent vite, les autres de plus en plus rarement), puis tes erreurs récentes.</p></div>`));
  const card = h(`<div class="panel" style="display:grid;gap:14px;justify-items:center;text-align:center">${mascot(done ? "wow" : "happy")}<h2>${done ? `Relevé avec ${pluriel(ST.daily[t], "bonne réponse", "bonnes réponses")} !` : "Prêt pour le défi ?"}</h2><p class="muted">${dues.length ? `À revoir aujourd'hui : ${dues.slice(0, 6).map(n => `<button type="button" class="fl" data-fiche="${esc(n)}">${esc(FICHES[n].titre)}</button>`).join(", ")}${dues.length > 6 ? "…" : ""}` : ST.erreurs.length ? `${pluriel(ST.erreurs.length, "exercice")} à retravailler.` : "Rien d'urgent : on révise au hasard."}</p><button class="btn ${done ? "ghost" : "gold"} block">${done ? "Rejouer le défi" : "Relever le défi (+30 XP)"}</button></div>`);
  card.querySelector("button.btn").onclick = startDaily;
  el.appendChild(card);
  el.appendChild(h(`<div class="panel" style="margin-top:16px"><div class="eyebrow">XP des 7 derniers jours</div><svg viewBox="0 0 350 150" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="XP gagnés par jour">${last7.map((d, i) => { const hg = Math.round(d.xp / max * 90); const x = 12 + i * 48; return `<rect x="${x}" y="${115 - Math.max(hg, 3)}" width="34" height="${Math.max(hg, 3)}" rx="6" fill="${d.k === t ? "var(--gold)" : d.xp ? "var(--prim)" : "var(--line)"}"/><text x="${x + 17}" y="${108 - Math.max(hg, 3)}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--muted)" font-family="var(--f-body)">${d.xp || ""}</text><text x="${x + 17}" y="134" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)" font-family="var(--f-body)">${esc(d.day)}</text>`; }).join("")}</svg></div>`));
  const jours = Object.keys(ST.daily).length;
  el.appendChild(h(`<div class="kpis" style="margin-top:16px">
    <div class="kpi" style="color:var(--gold-ink)">${I.star}<div><b style="color:var(--ink)">${jours}</b><span>défi${jours > 1 ? "s" : ""} relevé${jours > 1 ? "s" : ""}</span></div></div>
    <div class="kpi" style="color:var(--flame-ink)">${I.flame}<div><b style="color:var(--ink)">${streakNow()}</b><span>jours de série</span></div></div>
    <div class="kpi" style="color:var(--prim-ink)">${I.braces}<div><b style="color:var(--ink)">${Object.values(ST.notions).filter(n => n.b >= 4).length}</b><span>notions solides</span></div></div>
    <div class="kpi" style="color:var(--ko-ink)">${I.bug}<div><b style="color:var(--ink)">${dues.length}</b><span>notions à revoir</span></div></div></div>`));
  return el;
}

/* ---------------- vue : théorie (fiches) ---------------- */
function viewTheorie(){
  const el = h(`<main class="wrap"><h1 style="font-size:32px">Théorie</h1><p class="muted" style="margin:4px 0 14px">Une fiche par notion, avec des exemples à exécuter. Consultable à tout moment, même pendant un exercice (touche un mot souligné).</p><input class="search" type="search" placeholder="Chercher : map, return, slice, ===…" aria-label="Chercher une fiche" autocomplete="off"><div class="liste"></div></main>`);
  const liste = el.querySelector(".liste");
  const dues = new Set(notionsDues());
  const norm = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const draw = (q) => {
    const nq = norm(q.trim());
    liste.innerHTML = "";
    for (const u of D.unites) {
      const fs = (u.fiches || []).filter(f => !nq || norm(`${f.titre} ${f.resume || ""} ${f.id} ${f.texte || ""}`).includes(nq));
      if (!fs.length) continue;
      const bloc = h(`<section class="fiches-unite"><h2>Unité ${u.numero} · ${esc(u.titre)}</h2></section>`);
      for (const f of fs) bloc.appendChild(h(`<button type="button" class="fiche-lien ${dues.has(f.id) ? "revoir" : ""}" data-fiche-ouvre="${esc(f.id)}"><span class="ic">${esc(f.icone || "{ }")}</span><div><b>${esc(f.titre)}</b><span>${richInline(f.resume || "")}</span></div>${dues.has(f.id) ? `<span class="due">à revoir</span>` : ""}</button>`));
      liste.appendChild(bloc);
    }
    if (!liste.children.length) liste.innerHTML = `<p class="muted" style="padding:20px 0">Aucune fiche trouvée. Essaie un autre mot.</p>`;
  };
  el.querySelector(".search").oninput = e => draw(e.target.value);
  el.addEventListener("click", e => { const b = e.target.closest("[data-fiche-ouvre]"); if (b) ouvrirFiche(b.dataset.ficheOuvre); });
  draw("");
  return el;
}

/* ---------------- vue : console libre (bac à sable) ---------------- */
function viewConsole(){
  const el = h(`<main class="wrap"><h1 style="font-size:32px">Console</h1><p class="muted" style="margin:4px 0 6px">Ton bac à sable : écris du JavaScript, exécute, regarde la console. Rien n'est noté. Les erreurs sont expliquées en français.</p><div class="zone"></div><div class="ed-actions"><button type="button" class="btn small" data-run>${I.play}Exécuter</button><button type="button" class="btn small ghost" data-clear>${I.reset}Effacer</button></div><div class="sortie"></div></main>`);
  const depart = ['const fruits = ["pomme", "kiwi", "mangue"];', "", "fruits.forEach((fruit) => console.log(fruit));", ""].join("\n");
  let t = null;
  const ed = Editeur({ code: typeof ST.brouillons.__console === "string" ? ST.brouillons.__console : depart, onChange: v => { clearTimeout(t); t = setTimeout(() => { ST.brouillons.__console = v; save(); }, 400); }, etiquette:"Console libre" });
  el.querySelector(".zone").appendChild(ed.el);
  const sortie = el.querySelector(".sortie");
  el.querySelector("[data-run]").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    const r = await executer({ code: ed.valeur() });
    b.disabled = false; sortie.innerHTML = "";
    sortie.appendChild(h(consoleHTML(r.console, { vide:"Rien n'a été affiché. Utilise console.log(…)." })));
    if (r.erreur || r.conseils?.length) sortie.appendChild(resultatHTML({ erreur:r.erreur, conseils:r.conseils }));
    ed.marquer(r.erreur?.ligne);
  };
  el.querySelector("[data-clear]").onclick = () => confirmBox("Tout effacer ?", "Le code de la console sera effacé.", "Effacer", () => { ed.definir(""); ST.brouillons.__console = ""; save(); sortie.innerHTML = ""; });
  return el;
}

/* ---------------- vue : profil ---------------- */
function viewProfil(){
  const el = h(`<main class="wrap"></main>`);
  const { cur, next } = rankOf(ST.xp);
  const pct = next ? Math.round((ST.xp - cur.xp) / (next.xp - cur.xp) * 100) : 100;
  const lecons = Object.keys(ST.done).filter(k => !k.startsWith("jeu:")).length;
  const bossFaits = Object.values(ST.boss).filter(b => b.fait).length, bossTotal = D.unites.reduce((s, u) => s + (u.boss?.length || 0), 0);
  el.appendChild(h(`<div class="prof-head">${mascot("happy")}<div><div class="eyebrow">Ton rang</div><h1 style="font-size:30px">${esc(cur.nom)}</h1><p class="muted">${fmt(ST.xp)} XP au total</p></div></div>`));
  el.appendChild(h(`<div class="rankbar"><div class="row"><span>${esc(cur.nom)}</span><span class="muted">${next ? `${esc(next.nom)} à ${fmt(next.xp)} XP` : "Rang maximal"}</span></div><div class="meter"><i style="width:${pct}%"></i></div></div>`));
  el.appendChild(h(`<div class="kpis">
    <div class="kpi" style="color:#E8730C">${I.flame}<div><b style="color:var(--ink)">${streakNow()}</b><span>jours de série</span></div></div>
    <div class="kpi">${I.gem}<div><b>${fmt(ST.xp)}</b><span>XP</span></div></div>
    <div class="kpi" style="color:var(--prim-ink)">${I.lesson}<div><b style="color:var(--ink)">${lecons}</b><span>leçons terminées</span></div></div>
    <div class="kpi" style="color:var(--gold-deep)">${I.trophy}<div><b style="color:var(--ink)">${Object.values(ST.quiz).filter(q => q.passed).length}/${D.unites.length}</b><span>unités validées</span></div></div>
    <div class="kpi" style="color:#C2410C">${I.boss}<div><b style="color:var(--ink)">${bossFaits}/${bossTotal}</b><span>boss vaincus</span></div></div>
    <div class="kpi" style="color:var(--ok-ink)">${I.terminal}<div><b style="color:var(--ink)">${ST.stats.codes}</b><span>codes qui passent les tests</span></div></div></div>`));
  const notions = Object.entries(ST.notions).filter(([id]) => FICHES[id]);
  if (notions.length) el.appendChild(h(`<div><h2 class="sec-title">Tes notions</h2><p class="muted" style="font-size:14px">5 cases vertes : la notion est solide (révisée de plus en plus rarement). Une erreur la ramène à 1 case.</p><div class="notions">${notions.sort((a, b) => a[1].b - b[1].b).map(([id, n]) => `<div class="notion"><button type="button" class="fl nm" data-fiche="${esc(id)}" style="text-align:left">${esc(FICHES[id].titre)}</button><span class="bx" aria-label="Niveau ${n.b} sur 5">${[1,2,3,4,5].map(k => `<i class="${k <= n.b ? "on" : ""}"></i>`).join("")}</span></div>`).join("")}</div></div>`));
  const badges = tousLesBadges();
  el.appendChild(h(`<div><h2 class="sec-title">Badges</h2><p class="muted" style="font-size:14px">${Object.keys(ST.badges).filter(k => badges.some(b => b.id === k)).length} sur ${badges.length}</p></div>`));
  el.appendChild(h(`<div class="badges">${badges.map(b => `<div class="badge ${ST.badges[b.id] ? "" : "off"}"><div class="bi">${ICON_BY_NAME[b.icone] || I.medal}</div><b>${esc(b.nom)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div>`));
  const theme = h(`<div style="margin-bottom:26px"><h2 class="sec-title">Apparence</h2><div class="seg" role="group" aria-label="Thème">${[["auto","Auto"],["light","Clair"],["dark","Sombre"]].map(([k, n]) => `<button data-th="${k}" aria-pressed="${(ST.theme || "auto") === k}">${n}</button>`).join("")}</div></div>`);
  theme.onclick = e => { const b = e.target.closest("[data-th]"); if (!b) return; ST.theme = b.dataset.th === "auto" ? null : b.dataset.th; applyTheme(); save(); render(); };
  el.appendChild(theme);
  const sv = h(`<div class="panel"><h2 class="sec-title">Ta sauvegarde</h2><p class="muted" style="font-size:14px">Ta progression est enregistrée dans ce navigateur, sur cet appareil. Pour la transférer (téléphone ↔ ordinateur), copie ce code puis colle-le là-bas dans le champ ci-dessous.</p>
    <textarea class="save" id="save-out" readonly aria-label="Code de sauvegarde"></textarea>
    <div class="row-btns"><button class="btn small" data-a="copy">Copier le code</button></div>
    <label for="save-in" style="display:block;font-weight:800;margin-top:16px">Importer une sauvegarde</label>
    <textarea class="save" id="save-in" placeholder="Colle ici un code de sauvegarde"></textarea>
    <div class="row-btns"><button class="btn small ghost" data-a="import">Importer</button><button class="btn small ko" data-a="reset">Tout effacer</button></div><p id="save-msg" style="font-weight:700;margin-top:8px"></p></div>`);
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(ST))));
  sv.querySelector("#save-out").value = code;
  const msg = sv.querySelector("#save-msg");
  sv.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "copy") { const ta = sv.querySelector("#save-out"); const repli = () => { ta.select(); msg.textContent = "Sélectionné : copie-le avec Ctrl+C ou un appui long."; }; try { navigator.clipboard.writeText(code).then(() => { msg.textContent = "Code copié."; }, repli); } catch(err) { repli(); } }
    if (a === "import") { try { const raw = sv.querySelector("#save-in").value.trim(); const obj = JSON.parse(decodeURIComponent(escape(atob(raw)))); if (!obj || typeof obj.xp !== "number") throw 0; ST = normaliser(obj); save(); applyTheme(); render(); toast(I.check, "Sauvegarde importée", `${fmt(ST.xp)} XP récupérés.`); } catch(err) { msg.textContent = "Ce code n'est pas valide. Vérifie qu'il est complet, sans espace ajouté."; } }
    if (a === "reset") confirmBox("Tout effacer ?", "XP, série, badges, unités validées et brouillons seront perdus sur cet appareil. Pense à copier ton code avant.", "Tout effacer", () => { ST = freshState(); save(); applyTheme(); render(); toast(I.check, "Progression remise à zéro", "Nouveau départ !"); });
  });
  el.appendChild(sv);
  return el;
}
function applyTheme(){ if (ST.theme) document.documentElement.setAttribute("data-theme", ST.theme); else document.documentElement.removeAttribute("data-theme"); }

/* ---------------- démarrage ---------------- */
async function getJSON(u){
  const echec = (raison, detail) => Object.assign(new Error(detail), { fichier:u, raison });
  let r; try { r = await fetch(u, { cache:"no-cache" }); } catch(e) { throw echec("injoignable", e.message); }
  if (!r.ok) throw echec(r.status === 404 ? "introuvable" : `inaccessible (erreur ${r.status})`, `${u} : HTTP ${r.status}`);
  try { return await r.json(); } catch(e) { throw echec("mal formé (JSON invalide)", e.message); }
}
/* prépare une unité chargée : identifiants de secours, code en lignes, liens vers les fiches */
function preparerUnite(u, i){
  u.numero = u.numero ?? i + 1;
  u.lecons = u.lecons || []; u.jeux = u.jeux || []; u.boss = u.boss || []; u.fiches = u.fiches || [];
  u.quiz = u.quiz || { questions:[] };
  u.lecons.forEach(l => { l.cartes = l.cartes || []; l.exercices = l.exercices || []; l.exercices.forEach((q, k) => q.id = q.id || `${l.id}-e${k}`); });
  u.jeux.forEach(g => g.questions.forEach((q, k) => q.id = q.id || `${g.id}-${k}`));
  u.quiz.questions.forEach((q, k) => q.id = q.id || `${u.id}-quiz-${k}`);
  // boss de code (type "boss") ou « étude de cas » : "questions" (cours sans code), précédées d'une carte avec l'énoncé
  u.boss.forEach(b => { if (b.questions) b.questions.forEach((q, k) => q.id = q.id || `${b.id}-${k}`); else b.type = "boss"; });
  for (const f of u.fiches) FICHES[f.id] = { ...f, unite:u };
  if (!u.parcours) u.parcours = [...u.lecons.map(l => l.id), ...u.jeux.map(g => `jeu:${g.id}`), "quiz", ...u.boss.map(b => `boss:${b.id}`)];
}
async function boot(){
  $app.innerHTML = `<main class="wrap" style="text-align:center;padding-top:80px">${mascot("happy")}<p style="font-weight:800;color:var(--muted)">Chargement des unités…</p></main>`;
  try {
    D.config = await getJSON("content/config.json");
    appliquerApp(D.config.app);
    D.unites = await Promise.all(D.config.unites.map(getJSON));
  } catch(err) {
    $app.innerHTML = `<main class="wrap" style="padding-top:60px"><h2>Le contenu n'a pas pu être chargé</h2>
      <p style="margin:8px 0 16px">${err.fichier ? `Le fichier <code>${esc(err.fichier)}</code> est ${esc(err.raison)}.` : "Une erreur est survenue au démarrage."} Vérifie que le dossier <code>content</code> est publié avec la page (et que le site est ouvert par http://, pas en double-cliquant le fichier), puis réessaie.</p>
      <button class="btn" data-retry>Réessayer</button>
      <details style="margin-top:16px;color:var(--muted);font-size:13px"><summary>Détail technique</summary><code>${esc(err.message)}</code></details></main>`;
    $app.querySelector("[data-retry]").onclick = () => location.reload();
    return;
  }
  D.unites.forEach(preparerUnite);
  ST = loadState(); applyTheme();
  try { render(); }
  catch(err) {
    console.error(err);
    $app.innerHTML = `<main class="wrap" style="padding-top:60px"><h2>Ta sauvegarde n'a pas pu être lue</h2><p style="margin:8px 0 16px">Elle est peut-être abîmée. Tu peux repartir de zéro sur cet appareil.</p><button class="btn" data-reset>Repartir de zéro</button></main>`;
    $app.querySelector("[data-reset]").onclick = () => { ST = freshState(); save(); applyTheme(); render(); };
  }
}
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !/[?&]test\b/.test(location.search)) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
boot();
