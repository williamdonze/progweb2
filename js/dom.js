"use strict";
/* =====================================================================
   Moteur de cours — bac à sable DOM (TP « Manipulation du DOM »).
   Le Web Worker n'a pas de DOM : ici, le code de l'élève tourne dans une <iframe sandbox="allow-scripts allow-forms">
   qui contient la page de l'exercice (content/pages/*.html + .css, ou du HTML écrit dans l'exercice).
   - executerDom({ code, dom, tests }) : iframe cachée, joue les tests, renvoie un résultat au format de executerTout ;
   - apercuDom(conteneur, { code, dom, surLog }) : la même page, visible, pour cliquer soi-même (« Exécuter »).
   ===================================================================== */
const TEXTES = {};
const texteDe = u => TEXTES[u] ??= fetch(u, { cache:"no-cache" }).then(r => { if (!r.ok) throw new Error(`${u} : HTTP ${r.status}`); return r.text(); });
/* la page d'un exercice : { page: "cards" } (fichiers de content/pages/) ou { html: [lignes], css: [lignes] } ;
   "fichiers": { "dom.js": "content/pages/dom.js" } : modules que le code de l'élève peut importer (import … from './dom.js') */
async function pageDom(dom = {}){
  const html = dom.page ? await texteDe(`content/pages/${dom.page}.html`) : lignes(dom.html || "");
  const css = dom.page ? await texteDe(`content/pages/${dom.page}.css`) : lignes(dom.css || "");
  const fichiers = Object.fromEntries(await Promise.all(Object.entries(dom.fichiers || {}).map(async ([nom, chemin]) => [nom, await texteDe(chemin)])));
  return { html, css, fichiers };
}
async function documentDom(dom, harnais = true){
  const page = await pageDom(dom);
  const scripts = harnais ? await Promise.all([texteDe("js/banc.js"), texteDe("js/dom-harnais.js")]) : [];
  const sur = t => t.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${page.css}</style></head><body>${page.html}${scripts.map(s => `<script>${sur(s)}<\/script>`).join("")}</body></html>`;
}
const DELAI_DOM = 4000;
function lancerIframe({ code, dom, tests, conteneur, surLog }){
  return new Promise(async resolve => {
    const vide = { ok:false, console:[], cas:[], diagnostics:[], conseils:[] };
    let doc, fichiers;
    try { doc = await documentDom(dom); fichiers = (await pageDom(dom)).fichiers; }
    catch(e) { return resolve({ ...vide, erreur:{ titre:"Page introuvable", message:`La page de l'exercice n'a pas pu être chargée (${e.message}).` } }); }
    const f = document.createElement("iframe");
    // allow-forms : l'événement submit existe (le harnais empêche tout rechargement de la page) ;
    // allow-modals dans l'aperçu seulement : confirm() et alert() s'affichent quand l'élève clique lui-même (dans les tests, le harnais y répond)
    f.setAttribute("sandbox", conteneur ? "allow-scripts allow-forms allow-modals" : "allow-scripts allow-forms");
    f.setAttribute("title", "Page de l'exercice");
    f.className = conteneur ? "apercu-dom" : "iframe-cachee";
    f.srcdoc = doc;
    let fini = false;
    const finir = (res) => { if (fini) return; fini = true; clearTimeout(t); if (!conteneur) { removeEventListener("message", ecoute); f.remove(); } resolve(res); };
    const ecoute = e => {
      if (fini && !f.isConnected) { removeEventListener("message", ecoute); return; }   // aperçu remplacé : on arrête d'écouter
      if (e.source !== f.contentWindow || !e.data) return;
      if (e.data.type === "pret") f.contentWindow.postMessage({ type:"lancer", code, tests: tests || null, fichiers }, "*");
      else if (e.data.type === "log") surLog?.(e.data.texte, e.data.genre);
      else if (e.data.type === "resultat") finir(e.data.res);
    };
    addEventListener("message", ecoute);
    const t = setTimeout(() => finir({ ...vide, timeout:true, erreur:{ titre:"Trop long", message:`La page ne répond plus après ${DELAI_DOM / 1000} secondes : sans doute une boucle infinie.` } }), DELAI_DOM);
    (conteneur || document.body).appendChild(f);
  });
}
async function executerDom({ code, dom, tests, contexte }){
  const res = await lancerIframe({ code, dom, tests });
  if (tests) {   // analyse statique (méthodes obligatoires / interdites, conseils) : la même que pour le JavaScript pur
    const st = analyseStatique(code, tests, contexte || {});
    res.conseils = (res.conseils || []).concat(st.conseils);
    if (st.bloquants.length) { res.diagnostics = st.bloquants.concat(res.diagnostics || []); res.ok = false; }
  }
  return res;
}
/* aperçu visible : l'élève clique lui-même ; la console se remplit au fil des clics */
function apercuDom(conteneur, { code, dom, surLog }){
  conteneur.innerHTML = "";
  return lancerIframe({ code, dom, conteneur, surLog });
}
