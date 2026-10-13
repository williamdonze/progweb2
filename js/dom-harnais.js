/* =====================================================================
   Moteur de cours — harnais du bac à sable DOM. Exécuté DANS l'iframe isolée (sandbox="allow-scripts allow-forms", sans
   allow-same-origin : la page de l'appli et la sauvegarde sont hors d'atteinte), après banc.js.
   Reçoit { type:"lancer", code, tests } de la page parente, exécute le code de l'élève comme un module,
   joue les étapes des tests (clics, scripts), vérifie le DOM et renvoie le résultat.
   ===================================================================== */
(() => {
  const envoyer = m => parent.postMessage(m, "*");
  const logs = [];
  const ecrire = genre => (...a) => {
    const t = a.length ? a.map(x => formater(x, 0)).join(" ") : "";
    if (logs.length < 400) logs.push(t);
    envoyer({ type:"log", texte:t, genre });
  };
  console.log = ecrire("log"); console.info = ecrire("log"); console.warn = ecrire("warn"); console.error = ecrire("error"); console.table = ecrire("log");
  const erreurs = [];
  window.addEventListener("error", e => { erreurs.push(e.error || { name:"Error", message:e.message }); e.preventDefault(); });
  window.addEventListener("unhandledrejection", e => { erreurs.push(e.reason); e.preventDefault(); });
  let codeEleve = "";
  const decrire = err => {
    if (err && err.traduit) return err.traduit;
    const d = decrireErreur(err, codeEleve, null);
    const m = String(err && err.stack || "").match(/(?:blob:|eleve\.js)[^\n]*?:(\d+):(\d+)/);
    if (m && err.name !== "SyntaxError") d.ligne = +m[1];
    return d;
  };
  const elements = sel => { try { return [...document.querySelectorAll(sel)]; } catch(e) { return []; } };
  // formulaires : un envoi que le code de l'élève n'a pas empêché rechargerait la page (tout serait perdu) ; on l'empêche et on le compte
  let envoisNonEmpeches = 0;
  window.addEventListener("submit", e => {
    if (e.defaultPrevented) return;
    e.preventDefault(); envoisNonEmpeches++;
    console.warn("⚠ Formulaire envoyé sans preventDefault() : dans un vrai navigateur, la page se rechargerait et tout serait perdu.");
  });
  // confirm() pendant les tests : la réponse vient des étapes ({ "confirm": false } = « Annuler » au prochain confirm), « OK » sinon
  const reponsesConfirm = [];
  const simulerConfirm = () => { window.__confirms = []; window.confirm = msg => { window.__confirms.push(String(msg ?? "")); return reponsesConfirm.length ? reponsesConfirm.shift() : true; }; };
  const element = sel => { const el = document.querySelector(sel); if (!el) throw new Error(`élément ${sel} introuvable dans la page`); return el; };

  window.addEventListener("message", async e => {
    if (!e.data || e.data.type !== "lancer") return;
    const { code, tests, fichiers = {} } = e.data;
    codeEleve = code;
    if (tests) simulerConfirm();
    const res = { ok:false, console:logs, erreur:null, cas:[], diagnostics:[], conseils:[] };
    // le code de l'élève, chargé comme un module (comme <script type="module" src="cards.js">)
    // "exposer": ["clearSelection"] : les fonctions du module, rendues visibles aux scripts des tests (window.__pw.clearSelection())
    const noms = (tests && tests.exposer) || [];
    const expo = noms.length ? `\n;window.__pw = { ${noms.map(n => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };` : "";
    // les modules fournis (dom.fichiers) : import … from './dom.js' pointe vers leur copie (même nombre de lignes : les erreurs gardent leur ligne) ;
    // sans « ./ » ('dom.js'), le navigateur refuse l'import, comme dans un vrai projet : l'élève voit la même erreur que chez lui
    let source = code;
    for (const [nom, texte] of Object.entries(fichiers)) {
      const u = URL.createObjectURL(new Blob([texte + `\n//# sourceURL=${nom}`], { type:"text/javascript" }));
      const n = nom.replace(/^\.\//, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      source = source.replace(new RegExp(`(\\bfrom\\s*|\\bimport\\s*\\(?\\s*)(['"\`])\\.\\/${n}\\2`, "g"), `$1"${u}"`);
    }
    const url = URL.createObjectURL(new Blob([source + expo + "\n//# sourceURL=eleve.js"], { type:"text/javascript" }));
    try { await import(url); } catch(err) {
      const m = String(err && err.message || "").match(/(?:resolve module specifier|Failed to fetch dynamically imported module)[^"']*["']?([^"'\s]*)/);
      if (m && err.name === "TypeError") {
        const dispo = Object.keys(fichiers);
        erreurs.push({ name:"Error", message:"", traduit: { titre:"Fichier à importer introuvable", message:`Ton code importe un fichier qui n'existe pas ici.${dispo.length ? ` Le fichier fourni s'appelle ${dispo.map(d => `'./${d.replace(/^\.\//, "")}'`).join(", ")} : vérifie le nom et le « ./ » devant.` : " Cet exercice n'a pas de fichier à importer : retire la ligne import."}` } });
      } else erreurs.push(err);
    }
    await new Promise(r => setTimeout(r, 0));
    if (erreurs.length) { res.erreur = decrire(erreurs[0]); envoyer({ type:"resultat", res }); return; }
    if (!tests) { res.ok = true; envoyer({ type:"resultat", res }); return; }
    const absente = noms.find(n => typeof (window.__pw || {})[n] !== "function");
    if (absente) {
      const proche = (code.match(/[A-Za-z_$][\w$]*/g) || []).find(m => m !== absente && m.toLowerCase() === absente.toLowerCase());
      res.erreur = { titre:"Fonction introuvable", message:`Je ne trouve pas de fonction nommée ${absente}.${proche ? ` Tu l'as écrite ${proche} : les majuscules comptent.` : " Garde exactement ce nom : les tests l'appellent."}` };
      envoyer({ type:"resultat", res }); return;
    }
    for (const [k, etape] of (tests.etapes || []).entries()) {
      const r = { titre: etape.titre || `Étape ${k + 1}`, ok:true, details:[] };
      const avant = erreurs.length, envoisAvant = envoisNonEmpeches;
      try {
        for (const a of etape.actions || []) {
          if (a.clic) element(a.clic).click();
          if (a.saisir) { const [sel, valeur] = a.saisir; const el = element(sel); el.focus(); el.value = valeur; el.dispatchEvent(new Event("input", { bubbles:true })); el.dispatchEvent(new Event("change", { bubbles:true })); }
          if (a.entree) {   // la touche Entrée dans un champ : envoie son formulaire (comme le navigateur)
            const el = element(a.entree); el.focus();
            const ok = el.dispatchEvent(new KeyboardEvent("keydown", { key:"Enter", code:"Enter", bubbles:true, cancelable:true }));
            if (ok && el.form) el.form.requestSubmit();
          }
          if (a.soumettre) { const el = element(a.soumettre); (el.form || el.closest("form") || el).requestSubmit(); }
          if (a.confirm !== undefined) reponsesConfirm.push(!!a.confirm);
          if (a.script) new Function(a.script)();
        }
      } catch(err) { erreurs.push(err); }
      await new Promise(r2 => setTimeout(r2, 0));
      if (erreurs.length > avant) { r.ok = false; r.erreur = decrire(erreurs[avant]); res.cas.push(r); continue; }
      if (envoisNonEmpeches > envoisAvant) { r.ok = false; r.details.push("Le formulaire a été envoyé sans `preventDefault()` : dans un vrai navigateur, la page se serait rechargée et tout aurait été perdu. Dans l'écouteur de submit, appelle `event.preventDefault()`."); }
      for (const v of etape.verifier || []) {
        if (v.compter !== undefined) {
          const n = elements(v.compter).length;
          if (n !== v.egal) { r.ok = false; r.details.push(`${v.libelle || `Éléments « ${v.compter} »`} : ${n} au lieu de ${v.egal}.`); }
        }
        if (v.identique) {
          const [a, b] = v.identique.map(elements);
          const memes = a.length === b.length && a.every(x => b.includes(x));
          if (!memes) { r.ok = false; r.details.push(v.message || `Ce ne sont pas les bons éléments : ${a.length} sélectionnés, ${b.length} attendus.`); }
        }
        if (v.sortie) {   // ce que la console a affiché depuis le début (lignes exactes)
          const obtenu = logs.map(l => l.trimEnd());
          if (obtenu.length !== v.sortie.length || obtenu.some((l, i) => l !== v.sortie[i])) { r.ok = false; r.sortieAttendue = v.sortie; r.sortieObtenue = obtenu.slice(); if (v.message) r.details.push(v.message); }
        }
        if (v.vrai) {
          let bon = false; try { bon = new Function(`return (${v.vrai});`)(); } catch(err) {}
          if (!bon) { r.ok = false; r.details.push(v.message || `Vérification ratée : ${v.vrai}`); }
        }
      }
      if (!r.ok && etape.siEchec) r.siEchec = etape.siEchec;
      res.cas.push(r);
    }
    const rate = res.cas.find(c => !c.ok && c.siEchec);
    if (rate) res.diagnostics.push({ id:"contenu", message: rate.siEchec });
    res.ok = res.cas.every(c => c.ok);
    envoyer({ type:"resultat", res });
  });
  envoyer({ type:"pret" });
})();
