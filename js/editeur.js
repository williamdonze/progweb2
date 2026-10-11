"use strict";
/* =====================================================================
   Moteur de cours — éditeur de code maison (aucune dépendance).
   Technique de l'« éditeur à calque » : un <textarea> au texte transparent, posé exactement
   sur un <pre> qui affiche le même texte coloré. Le textarea garde tout le comportement natif
   (clavier du téléphone, sélection, copier-coller, annuler), le <pre> ne fait que l'affichage.
   ===================================================================== */

// la barre de symboles et l'indentation viennent du langage du cours (js/langages.js)
const listeSymboles = () => (LANG || LANGAGES.js).symboles;
const indentUnite = () => (LANG || LANGAGES.js).indent;
const PAIRES = { "(":")", "[":"]", "{":"}", '"':'"', "'":"'", "`":"`" };

/* Editeur({ code, entete, onChange, symboles }) → { el, valeur(), definir(code), focus(), marquer(ligne), lectureSeule(bool) } */
function Editeur({ code = "", entete = "", onChange = () => {}, symboles = true, etiquette = "Éditeur de code" } = {}){
  const el = h(`<div class="ed-bloc">
    <div class="editeur">
      ${entete ? `<div class="ed-entete" translate="no"><span class="eyebrow">Déjà écrit pour toi</span>${colorer(entete)}</div>` : ""}
      <div class="ed-scroll"><div class="ed-inner"><div class="ed-n" aria-hidden="true"></div><div class="ed-zone"><pre aria-hidden="true" translate="no"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${esc(etiquette)}" aria-describedby="ed-aide"></textarea><div class="ed-ligne-bad" hidden></div></div></div></div>
    </div>
    ${symboles ? `<div class="symboles" role="toolbar" aria-label="Symboles à insérer">${listeSymboles().map(([lib], i) => `<button type="button" data-s="${i}" class="${lib.length > 3 && /\w/.test(lib) ? "mot" : ""}" aria-label="Insérer ${esc(lib === "⇥" ? "une indentation" : lib)}">${esc(lib)}</button>`).join("")}</div>` : ""}
    <p id="ed-aide" hidden>Tab insère une indentation ; Échap pour sortir de l'éditeur.</p>
  </div>`);
  const ta = el.querySelector("textarea"), pre = el.querySelector("pre"), nums = el.querySelector(".ed-n"), scroll = el.querySelector(".ed-scroll"), bad = el.querySelector(".ed-ligne-bad");
  let sel = [0, 0];
  ta.value = code;
  const maj = () => {
    pre.innerHTML = colorer(ta.value) + "\n";
    const n = ta.value.split("\n").length;
    nums.textContent = Array.from({ length:n }, (_, i) => i + 1).join("\n");
    bad.hidden = true;
  };
  const changer = () => { maj(); onChange(ta.value); assurerVisible(); };
  // le textarea ne défile jamais lui-même (il a la taille du texte) : on fait défiler le cadre pour garder le curseur visible
  function assurerVisible(){
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 24;
    const avant = ta.value.slice(0, ta.selectionStart).split("\n");
    const ligne = avant.length - 1, col = avant[avant.length - 1].length;
    const y = 10 + ligne * lh, x = col * (lh / 1.6) * 0.6;
    if (y < scroll.scrollTop) scroll.scrollTop = y - 4;
    else if (y + lh > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = y + lh - scroll.clientHeight + 8;
    const gauche = nums.offsetWidth;
    if (x + gauche + 40 > scroll.scrollLeft + scroll.clientWidth) scroll.scrollLeft = x + gauche + 60 - scroll.clientWidth;
    else if (x < scroll.scrollLeft) scroll.scrollLeft = Math.max(0, x - 20);
  }
  // insertion qui garde l'historique « annuler » quand le navigateur le permet
  function inserer(texte, recul = 0){
    ta.focus({ preventScroll:true });
    let ok = false;
    try { ok = document.execCommand("insertText", false, texte); } catch(e) {}
    if (!ok) ta.setRangeText(texte, ta.selectionStart, ta.selectionEnd, "end");
    if (recul) { const p = ta.selectionStart - recul; ta.setSelectionRange(p, p); }
    changer();
  }
  const indentation = (pos) => { const debut = ta.value.lastIndexOf("\n", pos - 1) + 1; return (ta.value.slice(debut).match(/^[ \t]*/) || [""])[0]; };
  function saisie(data){
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, suiv = v[e] || "", prec = v[s - 1] || "";
    // fermeture tapée alors qu'elle est déjà là : on passe par-dessus
    if ((data === ")" || data === "]" || data === "}" || data === '"' || data === "'" || data === "`") && s === e && suiv === data) { ta.setSelectionRange(s + 1, s + 1); return true; }
    if (PAIRES[data]) {
      const guillemet = data === '"' || data === "'" || data === "`";
      if (s !== e) { const t = v.slice(s, e); inserer(data + t + PAIRES[data]); return true; }   // entoure la sélection
      if (guillemet && /[\w$]/.test(prec)) return false;
      if (suiv && !/[\s)\]};,.]/.test(suiv)) return false;
      inserer(data + PAIRES[data], 1); return true;
    }
    return false;
  }
  function retourLigne(){
    const s = ta.selectionStart, v = ta.value, ind = indentation(s), prec = v[s - 1], suiv = v[s];
    if ((prec === "{" && suiv === "}") || (prec === "[" && suiv === "]") || (prec === "(" && suiv === ")")) {
      inserer("\n" + ind + indentUnite() + "\n" + ind, ind.length + 1); return;
    }
    inserer("\n" + ind + (prec === "{" || prec === "[" || prec === "(" || (prec === ":" && indentUnite().length === 4) ? indentUnite() : ""));
  }
  ta.addEventListener("beforeinput", e => {
    if (ta.readOnly) return;
    if (e.inputType === "insertText" && e.data && e.data.length === 1) { if (saisie(e.data)) e.preventDefault(); }
    else if (e.inputType === "insertLineBreak" || e.inputType === "insertParagraph") { e.preventDefault(); retourLigne(); }
    else if (e.inputType === "deleteContentBackward") {
      const s = ta.selectionStart, v = ta.value;
      if (s === ta.selectionEnd && s > 0 && PAIRES[v[s - 1]] === v[s] && v[s] !== undefined) { e.preventDefault(); ta.setSelectionRange(s - 1, s + 1); inserer(""); }
    }
  });
  ta.addEventListener("keydown", e => {
    if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !ta.readOnly) { e.preventDefault(); inserer(indentUnite()); }
    if (e.key === "Escape") { e.stopPropagation(); ta.blur(); }
    if (e.key === "Enter") e.stopPropagation();   // Entrée écrit une ligne, elle ne déclenche pas « Vérifier »
  });
  ta.addEventListener("input", changer);
  const garderSelection = () => { sel = [ta.selectionStart, ta.selectionEnd]; };
  ta.addEventListener("select", garderSelection); ta.addEventListener("keyup", garderSelection); ta.addEventListener("pointerup", garderSelection); ta.addEventListener("blur", garderSelection);
  const barre = el.querySelector(".symboles");
  if (barre) {
    // pointerdown sans perte de focus : le clavier du téléphone reste ouvert
    barre.addEventListener("pointerdown", e => { if (e.target.closest("button") && document.activeElement === ta) e.preventDefault(); });
    barre.addEventListener("click", e => {
      const b = e.target.closest("button[data-s]"); if (!b || ta.readOnly) return;
      const [, ouvre, ferme] = listeSymboles()[+b.dataset.s];
      if (document.activeElement !== ta) { ta.focus({ preventScroll:true }); ta.setSelectionRange(sel[0], sel[1]); }
      const s = ta.selectionStart, e2 = ta.selectionEnd;
      if (ferme) { const t = ta.value.slice(s, e2); inserer(ouvre + t + ferme, t ? 0 : ferme.length); }
      else inserer(ouvre);
      garderSelection();
    });
  }
  maj();
  return {
    el,
    valeur: () => ta.value,
    definir(v){ ta.value = v; maj(); },
    focus(){ ta.focus({ preventScroll:true }); },
    lectureSeule(b){ ta.readOnly = b; el.querySelectorAll(".symboles button").forEach(x => x.disabled = b); },
    marquer(ligne){
      if (!ligne) { bad.hidden = true; return; }
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 24;
      bad.style.top = (10 + (ligne - 1) * lh) + "px"; bad.style.height = lh + "px"; bad.hidden = false;
      scroll.scrollTop = Math.max(0, (ligne - 3) * lh);
    }
  };
}
