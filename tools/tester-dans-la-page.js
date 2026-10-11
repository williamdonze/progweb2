/* Exécuté DANS la page (par tools/tester-exercices.py) : vérifie tout le contenu avec le vrai bac à sable.
   - chaque exercice de code : la solution passe les tests ; chaque erreur typique échoue (avec le diagnostic annoncé) ;
   - chaque « prédire » : la réponse attendue (choix ou saisie) est bien ce que le code affiche ;
   - chaque exemple de carte et de fiche s'exécute sans erreur (sauf "erreurVoulue": true) ;
   - filtre / map / reduce / types : les expressions du contenu s'évaluent.
   Renvoie { erreurs:[…], avertissements:[…], stats:{…} }. */
async function testerTout(filtreUnite){
  const erreurs = [], avert = [], stats = { solutions:0, erreursTypiques:0, predictions:0, exemples:0, questions:0 };
  const TROU = /_{3,}/g;
  const assembler = (depart, trous) => lignes(depart).split(TROU).map((p, i, a) => p + (i < a.length - 1 ? (trous[i] ?? "") : "")).join("");
  const norm = s => String(s).split("\n").map(normaliserSaisie).filter(Boolean).join("\n");
  const ids = new Set();
  for (const u of D.unites) {
    if (filtreUnite && u.id !== filtreUnite) continue;
    const ou = (q, lieu) => `${u.id} · ${lieu} · ${q.id || "?"}`;
    const questions = [];
    u.lecons.forEach(l => l.exercices.forEach(q => questions.push([q, l.id])));
    u.jeux.forEach(g => g.questions.forEach(q => questions.push([q, g.id])));
    u.quiz.questions.forEach(q => questions.push([q, "quiz"]));
    u.boss.forEach(b => b.questions ? b.questions.forEach(q => questions.push([q, b.id])) : questions.push([b, "boss"]));   // étude de cas : ses questions
    for (const [q, lieu] of questions) {
      stats.questions++;
      const o = ou(q, lieu);
      if (ids.has(q.id)) erreurs.push(`${o} : identifiant en double`); ids.add(q.id);
      try {
        if (TYPES_CODE.has(q.type)) {
          const code = q.type === "trous" ? assembler(q.code, q.solution) : lignes(q.solution);
          const tableaux = q.donnees ? Object.entries(q.donnees).filter(([, v]) => Array.isArray(v)).map(([k]) => k) : [];
          const lancerQ = (c) => q.dom ? executerDom({ code:c, dom:q.dom, tests:q.tests, contexte:{ tableaux } }) : executer({ code:c, donnees:q.donnees || null, prelude:q.prelude ? lignes(q.prelude) : "", tests:q.tests, contexte:{ tableaux } });
          const r = await lancerQ(code);
          stats.solutions++;
          if (!r.ok) erreurs.push(`${o} : la SOLUTION échoue → ${JSON.stringify({ erreur:r.erreur, diag:r.diagnostics, cas:r.cas.filter(c => !c.ok) }).slice(0, 500)}`);
          if (r.conseils?.length) avert.push(`${o} : la solution déclenche un conseil (${r.conseils.map(c => c.id).join(", ")})`);
          if (!q.erreursTypiques?.length) avert.push(`${o} : aucune erreur typique testée`);
          for (const [k, et] of (q.erreursTypiques || []).entries()) {
            const c2 = q.type === "trous" ? assembler(q.code, et.trous) : lignes(et.code);
            const r2 = await lancerQ(c2);
            stats.erreursTypiques++;
            const aErreur = !!(r2.erreur || r2.cas?.some(c => c.erreur));
            const idsVus = [...(r2.diagnostics || []), ...(r2.conseils || [])].map(d => d.id);
            const resume = r2.erreur ? `erreur « ${r2.erreur.message.slice(0, 120)} »` : `diagnostics [${idsVus.join(", ")}] ; ${r2.cas.filter(c => !c.ok).length} cas ratés`;
            if (r2.ok && et.attendu !== "conseil") erreurs.push(`${o} : l'erreur typique n°${k + 1} PASSE les tests (elle devrait échouer) : ${c2.replace(/\n/g, " ⏎ ")}`);
            else if (et.attendu === "erreur" && !aErreur) erreurs.push(`${o} : l'erreur typique n°${k + 1} devait provoquer une erreur JS, mais : ${resume}`);
            else if (et.diagnostic && !idsVus.includes(et.diagnostic)) erreurs.push(`${o} : l'erreur typique n°${k + 1} devait donner le diagnostic « ${et.diagnostic} », obtenu : ${resume}`);
            else if (!r2.ok && !aErreur && !idsVus.length && !r2.cas.some(c => !c.ok && (c.attendu || c.sortieAttendue || c.details?.length))) avert.push(`${o} : l'erreur typique n°${k + 1} échoue sans explication`);
          }
          continue;
        }
        if (q.type === "predire" && !aModule("code-js") && q.reponse !== undefined) stats.predictions++;   // cours sans code : la réponse écrite fait foi
        else if (q.type === "predire") {
          const r = await executer({ code:lignes(q.code) });
          stats.predictions++;
          const sortie = r.console.join("\n");
          if (r.erreur && !q.erreurVoulue) erreurs.push(`${o} : le code à prédire plante (${r.erreur.message})`);
          if (q.choix && q.verifier !== false && norm(q.choix[q.bonne]) !== norm(sortie)) erreurs.push(`${o} : le bon choix « ${q.choix[q.bonne]} » ≠ sortie réelle « ${sortie} »`);
          if (q.choix && q.choix.filter(c => norm(c) === norm(sortie)).length > 1) erreurs.push(`${o} : plusieurs choix égaux à la sortie`);
          if (!q.choix && q.reponse !== undefined && norm(q.reponse) !== norm(sortie)) erreurs.push(`${o} : réponse « ${q.reponse} » ≠ sortie réelle « ${sortie} »`);
          if (!q.choix && !sortie) erreurs.push(`${o} : rien ne s'affiche, impossible à prédire`);
        }
        if (q.type === "qcm" || q.type === "methode" || q.type === "bug" || (q.type === "predire" && q.choix)) {
          if (!(q.bonne >= 0 && q.bonne < q.choix.length)) erreurs.push(`${o} : index « bonne » hors des choix`);
          if (new Set(q.choix).size !== q.choix.length) erreurs.push(`${o} : choix en double`);
        }
        if (q.type === "qcm" && q.code && q.verifierSortie) {
          const r = await executer({ code:lignes(q.code) });
          if (norm(r.console.join("\n")) !== norm(q.choix[q.bonne])) erreurs.push(`${o} : le bon choix ne correspond pas à la sortie (${r.console.join(" ⏎ ")})`);
        }
        if (q.type === "bug") { const n = lignes(q.code).split("\n").length; if (!(q.ligne >= 1 && q.ligne <= n)) erreurs.push(`${o} : ligne du bug hors du code`); }
        if (q.type === "pointer-code" && !lignes(q.code).includes("⟦")) erreurs.push(`${o} : aucune cible ⟦…⟧ dans le code`);
        if (q.type === "pointer-tableau" && q.bonnes.some(i => i < 0 || i >= q.tableau.length)) erreurs.push(`${o} : case cible hors du tableau`);
        if (q.type === "filtre-visuel") { const f = evalContenu(q.condition); q.tableau.forEach(v => { if (typeof f(v) !== "boolean") avert.push(`${o} : la condition ne renvoie pas un booléen pour ${enCode(v)}`); }); }
        if (q.type === "map-visuel") evalContenu(q.fonction);
        if (q.type === "reduce-pas") { if (!etapesReduce(q).length) erreurs.push(`${o} : aucune étape de reduce`); }
        if (q.type === "types-chaine") q.maillons.forEach((m, k) => evalContenu(q.depart + q.maillons.slice(0, k + 1).join("")));
        if (q.type === "selecteur") { const doc = new DOMParser().parseFromString((await pageDom(q.dom)).html, "text/html"); let n = -1; try { n = doc.querySelectorAll(q.attendu).length; } catch(e) {} if (n < 0) erreurs.push(`${o} : sélecteur attendu invalide`); else if (q.nombre !== undefined && n !== q.nombre) erreurs.push(`${o} : le sélecteur attendu trouve ${n} éléments, pas ${q.nombre}`); }
        if (q.type === "objet") q.cles.forEach(k => { if (!q.bonnes[k]?.every(b => q.etiquettes.includes(b))) erreurs.push(`${o} : bonne étiquette absente pour ${k}`); });
        if (q.type === "fisher-yates" && q.tirages.some((j, k) => j < 0 || j > q.tableau.length - 1 - k)) erreurs.push(`${o} : tirage j hors de [0, i]`);
        if (q.type === "tri" && q.items.some(([, c]) => c < 0 || c >= q.categories.length)) erreurs.push(`${o} : catégorie inexistante`);
        if (!q.explication && q.type !== "boss") avert.push(`${o} : pas d'explication`);
        for (const n of q.notions || []) if (!FICHES[n]) erreurs.push(`${o} : notion « ${n} » sans fiche`);
      } catch(e) { erreurs.push(`${o} : exception ${e.message}`); }
    }
    // exemples des cartes et des fiches
    const exemples = [];
    u.lecons.forEach(l => l.cartes.forEach((c, k) => { if (c.code && c.executable !== false && aModule("code-js")) exemples.push([`${l.id} carte ${k + 1}`, lignes(c.code), c.erreurVoulue, c.donnees, c.dom]); }));
    if (aModule("code-js")) u.fiches.forEach(f => (f.exemples || []).forEach((ex, k) => exemples.push([`fiche ${f.id} ex ${k + 1}`, lignes(ex.code), ex.erreurVoulue || /erreur/i.test(ex.titre || ""), null, ex.dom])));
    for (const [lieu, code, voulue, donnees, dom] of exemples) {
      const r = dom ? await executerDom({ code, dom }) : await executer({ code, donnees: donnees || null });
      stats.exemples++;
      if (r.erreur && !voulue) erreurs.push(`${u.id} · ${lieu} : l'exemple plante (${r.erreur.message.slice(0, 120)})`);
      if (!r.erreur && voulue) avert.push(`${u.id} · ${lieu} : erreur annoncée mais le code ne plante pas`);
    }
    // liens [[fiche]] dans les textes
    const texte = JSON.stringify(u);
    for (const m of texte.matchAll(/\[\[([a-z][a-z0-9-]*)(?:\|[^\]]+)?\]\]/g)) if (!FICHES[m[1]]) erreurs.push(`${u.id} : lien vers une fiche inconnue [[${m[1]}]]`);
    for (const l of u.lecons) for (const c of l.cartes) if (c.fiche && !FICHES[c.fiche]) erreurs.push(`${u.id} · ${l.id} : fiche inconnue ${c.fiche}`);
  }
  return { erreurs, avertissements:avert, stats };
}
