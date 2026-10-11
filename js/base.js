"use strict";
/* =====================================================================
   Moteur de cours façon Duolingo — socle : utilitaires, icônes, mascotte, sauvegarde, progression,
   toasts, modale, texte enrichi, affichage du code, exécution dans le bac à sable.
   Aucun contenu pédagogique ici : tout est dans content/.
   ===================================================================== */

/* identité de l'appli : section "app" de content/config.json (voir docs/format-contenu.md § 1) */
const APP = {
  nom: "Mon cours", cle: "mon-cours", accroche: "On part de zéro et on va jusqu'aux exercices de ton cours.",
  mascotte: { nom: "Coco", cadre: ["{", "}"], corps: "#FFF6E4", bord: "#E3C98F" },
  modules: [], couleurs: {}, textes: {},
};
let SAVE_KEY = "mon-cours-sauvegarde-v1";
const aModule = m => APP.modules.includes(m);
function appliquerApp(cfg = {}){
  Object.assign(APP, cfg, { mascotte: { ...APP.mascotte, ...(cfg.mascotte || {}) }, textes: { ...APP.textes, ...(cfg.textes || {}) } });
  SAVE_KEY = `${APP.cle}-sauvegarde-v1`;
  // langage du code (js/langages.js) : config.app.langage, sinon celui du module de code activé, sinon JavaScript
  LANG = LANGAGES[APP.langage] || Object.values(LANGAGES).find(l => l.module && l.module !== "code-js" && aModule(l.module)) || LANGAGES.js;
  document.title = APP.nom;
  document.documentElement.lang = APP.langue || "fr";
  // couleurs : { "clair": { "--prim": "#…" }, "sombre": { … } } ; les jetons non cités gardent leur valeur de css/app.css
  const bloc = o => Object.entries(o || {}).map(([k, v]) => `${k.startsWith("--") ? k : "--" + k}:${v}`).join(";");
  const { clair, sombre } = APP.couleurs || {};
  if (clair || sombre) {
    const st = document.getElementById("couleurs-app") || document.head.appendChild(Object.assign(document.createElement("style"), { id:"couleurs-app" }));
    st.textContent = `${clair ? `:root{${bloc(clair)}}` : ""}${sombre ? `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${bloc(sombre)}}}:root[data-theme="dark"]{${bloc(sombre)}}` : ""}`;
  }
  I.logo = logoSVG();
}
const D = { unites: [] };   // données chargées : config + unités (dans l'ordre du sommaire)
let ST;                     // état du joueur
const $app = document.getElementById("app");

/* ---------------- utilitaires ---------------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, rnd = Math.random) => a[Math.floor(rnd() * a.length)];
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dayDiff = (a, b) => Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 864e5);
const plusJours = (n, d = todayStr()) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return todayStr(x); };
function seeded(str){ let x = 2166136261; for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
const fmt = n => n.toLocaleString("fr-FR");
const fmtCourt = n => n >= 10000 ? `${(Math.floor(n / 100) / 10).toLocaleString("fr-FR")} k` : fmt(n);
const defilement = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const lignes = c => Array.isArray(c) ? c.join("\n") : String(c ?? "");   // le contenu écrit le code en tableau de lignes ou en chaîne
const pluriel = (n, mot, motPl = mot + "s") => `${n} ${n > 1 ? motPl : mot}`;

/* ---------------- icônes ---------------- */
const I = {
  flame:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-4 0-7 1-9z" fill="currentColor"/><path d="M12 13c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1-2 0 1 1 1 1 1 0-2 0-3 1-4z" fill="#FFD36B"/></svg>`,
  gem:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="var(--gold)"/><path d="M2 9h20M8 3l4 18M16 3l-4 18" stroke="var(--gold-deep)" stroke-width="1.2" fill="none" opacity=".7"/></svg>`,
  home:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>`,
  star:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/></svg>`,
  book:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/></svg>`,
  user:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>`,
  terminal:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/></svg>`,
  x:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  check:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
  lesson:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z" fill="currentColor"/><path d="M12 6v13.5" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/></svg>`,
  game:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="5.5" fill="currentColor"/><path d="M7 10.5v4M5 12.5h4" stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="11" r="1.4" fill="rgba(0,0,0,.35)"/><circle cx="18" cy="14" r="1.4" fill="rgba(0,0,0,.35)"/></svg>`,
  trophy:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H4c0 3 1 5 3.5 5.5M17 5h3c0 3-1 5-3.5 5.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 13h4l1 5H9z" fill="currentColor"/><rect x="7" y="18" width="10" height="3" rx="1" fill="currentColor"/></svg>`,
  boss:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l3 3 5-7 5 7 3-3-2 10H6z" fill="currentColor"/><rect x="6" y="19" width="12" height="2.5" rx="1" fill="currentColor"/><circle cx="12" cy="13" r="1.6" fill="rgba(0,0,0,.3)"/></svg>`,
  lock:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.6" fill="none"/></svg>`,
  bulb:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="currentColor"/><rect x="8.5" y="18.5" width="7" height="3" rx="1.5" fill="currentColor"/></svg>`,
  egg:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c4 0 7 7 7 12a7 7 0 0 1-14 0C5 9 8 2 12 2z" fill="currentColor"/></svg>`,
  warn:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="currentColor"/><path d="M12 10v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="#fff"/></svg>`,
  play:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  medal:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 6H9zM13 2h4l-2 6h-2z" fill="var(--prim)"/><circle cx="12" cy="15" r="7" fill="currentColor"/><path d="M12 11l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="#fff" opacity=".85"/></svg>`,
  target:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  braces:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c-2 0-3 1-3 3v3c0 1.5-1 3-2.5 3C4 12 5 13.5 5 15v3c0 2 1 3 3 3M16 3c2 0 3 1 3 3v3c0 1.5 1 3 2.5 3-1.5 0-2.5 1.5-2.5 3v3c0 2-1 3-3 3"/></svg>`,
  wallet:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="3" fill="currentColor"/><path d="M4 6l11-3 2 3" fill="currentColor" opacity=".6"/><rect x="15" y="11" width="7" height="4" rx="2" fill="rgba(255,255,255,.6)"/></svg>`,
  bug:`<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="14" rx="5.5" ry="7" fill="currentColor"/><circle cx="12" cy="6" r="3" fill="currentColor"/><path d="M6 10l-3-2M18 10l3-2M6 15H2M18 15h4M7 19l-3 2M17 19l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 9v12" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/></svg>`,
  shuffle:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>`,
  phone:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10.5 18.5h3"/><path d="M12 7v6M9 10h6" stroke-width="2.6"/></svg>`,
  partager:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9H6v12h12V9h-2M12 3v12M8 7l4-4 4 4"/></svg>`,
  ajouter:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>`,
  points:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="19" r="2.2" fill="currentColor"/></svg>`,
  pointsH:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>`,
  chevron:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
  menu:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  reset:`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg>`
};
const ICON_BY_NAME = { etoile:I.star, flamme:I.flame, medaille:I.medal, trophee:I.trophy, boss:I.boss, oeuf:I.egg, livre:I.book, cible:I.target, accolades:I.braces, porte:I.wallet, bug:I.bug, terminal:I.terminal, melange:I.shuffle };

/* ---------------- mascotte (config.app.mascotte, voir docs/format-contenu.md § 1) ----------------
   Une forme du catalogue (MASCOTTES : œuf, éléphant, chouette, renard, goutte, livre), un accessoire facultatif (ACCESSOIRES),
   un « cadre » facultatif pour les cours de code (["{", "}"] dessinées, ou deux textes courts : ["<?", "?>"], ["$", "_"]),
   ou un dessin libre (mascotte.fichier : un SVG avec des groupes id="humeur-happy", "humeur-sad", "humeur-wow").
   Humeurs : happy, sad, wow. Couleurs : corps, bord, accent (oreilles, ailes, dos du livre…). */
const ENCRE = "#2a2340";
const ACCOLADES = [`M22 18c-9 0-12 5-12 12v18c0 6-3 10-8 12 5 2 8 6 8 12v18c0 7 3 12 12 12`, `M98 18c9 0 12 5 12 12v18c0 6 3 10 8 12-5 2-8 6-8 12v18c0 7-3 12-12 12`];
function cadreSVG(couleur, detoure = false){
  const c = APP.mascotte.cadre || [];
  if (!c.length) return "";
  if (c[0] === "{" && c[1] === "}") return ACCOLADES.map(d => `<path d="${d}" stroke="${couleur}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("");
  const contour = detoure ? ` stroke="var(--bg, #FAF7F0)" stroke-width="5" paint-order="stroke" stroke-linejoin="round"` : "";
  const t = (x, txt, a) => `<text x="${x}" y="${detoure ? 108 : 72}" text-anchor="${a}" font-family="JetBrains Mono, ui-monospace, monospace" font-weight="800" font-size="${txt.length > 2 ? 22 : txt.length > 1 ? 28 : 40}" fill="${couleur}"${contour}>${esc(txt)}</text>`;
  return t(14, c[0] || "", "middle") + t(106, c[1] || "", "middle");
}
// une bouche à l'échelle s, centrée en (x, y)
function boucheSVG(mood, x, y, s = 1){
  if (mood === "sad") return `<path d="M${x - 9 * s} ${y + 5 * s}q${9 * s} ${-7 * s} ${18 * s} 0" stroke="${ENCRE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (mood === "wow") return `<ellipse cx="${x}" cy="${y + 4 * s}" rx="${6 * s}" ry="${7 * s}" fill="${ENCRE}"/>`;
  return `<path d="M${x - 11 * s} ${y}q${11 * s} ${11 * s} ${22 * s} 0" stroke="${ENCRE}" stroke-width="3.5" fill="#fff" stroke-linecap="round"/>`;
}
// yeux, joues (class="joue" : retirées du petit logo) et bouche, aux points d'ancrage de la forme
function visageSVG(f, mood){
  const r = f.rOeil || 7, rj = f.rJoue || 5;
  const yeux = f.yeux.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${ENCRE}" stroke-width="1.5"/><circle cx="${x + r * .21}" cy="${y + 1}" r="${r * .52}" fill="${ENCRE}"/>`).join("");
  const joues = f.joues.map(([x, y]) => `<circle class="joue" cx="${x}" cy="${y}" r="${rj}" fill="#ff9fb4" opacity=".6"/>`).join("");
  const bouche = typeof f.bouche === "function" ? f.bouche(mood) : boucheSVG(mood, ...f.bouche);
  return yeux + joues + bouche;
}
// chaque forme : son dessin (sous le visage), ses points d'ancrage (yeux, joues, bouche [x, y, échelle]),
// le sommet de la tête (chapeaux), les tempes [x gauche, x droite, y] (lunettes, casque) et le cou (nœud)
const MASCOTTES = {
  oeuf: {
    dessin: m => `<path d="M60 12c17 0 30 30 30 56a30 30 0 0 1-60 0c0-26 13-56 30-56z" fill="${m.corps}" stroke="${m.bord}" stroke-width="3"/><ellipse cx="48" cy="36" rx="6" ry="9" fill="#fff" opacity=".9"/>`,
    yeux: [[49, 64], [71, 64]], joues: [[40, 76], [80, 76]], bouche: [60, 79], sommet: [60, 12], tempes: [31, 89, 62], cou: [60, 95],
  },
  elephant: {   // tête ronde, grandes oreilles, trompe ; le cadre passe devant les oreilles, détouré de la couleur du fond
    dessin: m => {
      const oreille = (cx, sens) => `<path d="M${cx} 40c${sens * 22}-8 ${sens * 30} 14 ${sens * 24} 36c${-sens * 3} 10 ${-sens * 12} 14 ${-sens * 20} 8z" fill="${m.accent || m.oreilles || m.corps}" stroke="${m.bord}" stroke-width="3" stroke-linejoin="round"/>`;
      return `${oreille(40, -1)}${oreille(80, 1)}<circle cx="60" cy="62" r="29" fill="${m.corps}" stroke="${m.bord}" stroke-width="3"/><ellipse cx="49" cy="42" rx="7" ry="5" fill="#fff" opacity=".45"/>
        <path d="M60 70c0 14 0 24 9 27c5 1.5 8-1 7-5" stroke="${m.bord}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M60 70c0 14 0 24 9 27c5 1.5 8-1 7-5" stroke="${m.corps}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`;
    },
    yeux: [[49, 58], [71, 58]], rOeil: 6.5, joues: [[40, 76], [80, 76]], rJoue: 4.5, sommet: [60, 33], tempes: [32, 88, 56], cou: [60, 92],
    bouche: mood => mood === "sad" ? `<path d="M41 85q6-5 12 0" stroke="${ENCRE}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : mood === "wow" ? `<ellipse cx="47" cy="84" rx="4.5" ry="5.5" fill="${ENCRE}"/>`
      : `<path d="M40 80q7 8 14 2" stroke="${ENCRE}" stroke-width="3" fill="#fff" stroke-linecap="round"/>`,
    cadreDevant: true,
  },
  chouette: {
    dessin: m => `<path d="M33 36l-7-20 20 10zM87 36l7-20-20 10z" fill="${m.accent || m.bord}" stroke="${m.bord}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M60 22c20 0 32 16 32 40v14c0 18-14 28-32 28s-32-10-32-28V62c0-24 12-40 32-40z" fill="${m.corps}" stroke="${m.bord}" stroke-width="3"/>
      <ellipse cx="60" cy="88" rx="17" ry="13" fill="#fff" opacity=".4"/><path d="M50 86q4 3 8 0M62 86q4 3 8 0M56 94q4 3 8 0" stroke="${m.bord}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
      <circle cx="47" cy="58" r="12" fill="#fff" opacity=".55"/><circle cx="73" cy="58" r="12" fill="#fff" opacity=".55"/>`,
    yeux: [[47, 58], [73, 58]], rOeil: 7.5, joues: [[36, 72], [84, 72]], rJoue: 4.5, sommet: [60, 22], tempes: [29, 91, 58], cou: [60, 101],
    // l'humeur se lit dans le bec : fermé (happy), ouvert (wow), fermé sous des sourcils froncés (sad)
    bouche: mood => { const bec = `fill="#F2A93B" stroke="#B9741B" stroke-width="1.5" stroke-linejoin="round"`;
      if (mood === "wow") return `<path d="M54 67h12l-6 5z" ${bec}/><path d="M55 74h10l-5 6z" ${bec}/><path d="M55.5 72.5h9" stroke="${ENCRE}" stroke-width="2"/>`;
      return `<path d="M54 67l6 9 6-9z" ${bec}/>` + (mood === "sad" ? `<path d="M38 45l14 4M82 45l-14 4" stroke="${ENCRE}" stroke-width="3" stroke-linecap="round"/>` : ""); },
  },
  renard: {
    dessin: m => `<path d="M60 100c-20 0-34-14-34-34 0-10 3-20 8-28l-4-24 20 12c3-1 7-1 10-1s7 0 10 1l20-12-4 24c5 8 8 18 8 28 0 20-14 34-34 34z" fill="${m.corps}" stroke="${m.bord}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M35 32l-2-11 10 7zM85 32l2-11-10 7z" fill="${m.accent || "#fff"}" opacity=".8"/>
      <path d="M60 100c-13 0-23-8-25-21 7 5 15 5 25-3 10 8 18 8 25 3-2 13-12 21-25 21z" fill="#fff" opacity=".92"/>
      <ellipse cx="60" cy="79" rx="4.5" ry="3.2" fill="${ENCRE}"/>`,
    yeux: [[47, 62], [73, 62]], rOeil: 6.5, joues: [[38, 74], [82, 74]], rJoue: 4.5, bouche: [60, 86, .55], sommet: [60, 30], tempes: [28, 92, 60], cou: [60, 99],
  },
  goutte: {
    dessin: m => `<path d="M60 10c10 18 32 38 32 60a32 32 0 0 1-64 0c0-22 22-42 32-60z" fill="${m.corps}" stroke="${m.bord}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="46" cy="52" rx="5" ry="9" fill="#fff" opacity=".8" transform="rotate(20 46 52)"/>`,
    yeux: [[49, 68], [71, 68]], joues: [[40, 80], [80, 80]], bouche: [60, 83], sommet: [60, 26], tempes: [30, 90, 66], cou: [60, 99],
  },
  livre: {
    dessin: m => `<rect x="34" y="94" width="56" height="8" rx="3" fill="#fff" stroke="${m.bord}" stroke-width="2.5"/>
      <rect x="30" y="16" width="60" height="82" rx="8" fill="${m.corps}" stroke="${m.bord}" stroke-width="3"/>
      <path d="M38 17.5v79" stroke="${m.accent || m.bord}" stroke-width="6" opacity=".7"/>
      <rect x="50" y="28" width="30" height="8" rx="3" fill="#fff" opacity=".6"/>`,
    yeux: [[54, 60], [76, 60]], rOeil: 6.5, joues: [[47, 72], [83, 72]], rJoue: 4.5, bouche: [65, 75, .8], sommet: [62, 16], tempes: [31, 91, 58], cou: [62, 104],
  },
};
// accessoires : dessinés aux points d'ancrage de la forme ; « chapeau » : la mascotte rétrécit un peu pour lui faire de la place
const ACCESSOIRES = {
  lunettes: { dessin: (f, c) => { const r = (f.rOeil || 7) + 3.5, [[x1, y], [x2]] = f.yeux, [tg, td] = f.tempes;
    return `<g fill="none" stroke="${ENCRE}" stroke-width="2.5" stroke-linecap="round"><circle cx="${x1}" cy="${y}" r="${r}"/><circle cx="${x2}" cy="${y}" r="${r}"/><path d="M${x1 + r} ${y - 1}q${(x2 - x1 - 2 * r) / 2} -4 ${x2 - x1 - 2 * r} 0M${x1 - r} ${y - 1}L${tg + 1} ${y - 4}M${x2 + r} ${y - 1}L${td - 1} ${y - 4}"/></g>`; } },
  mortier: { chapeau: true, dessin: (f, c) => { const [x, y] = f.sommet;
    return `<path d="M${x - 13} ${y - 2}v7c0 3 6 5 13 5s13-2 13-5v-7" fill="${ENCRE}"/><path d="M${x - 26} ${y - 6}L${x} ${y - 16}L${x + 26} ${y - 6}L${x} ${y + 4}z" fill="${ENCRE}"/><path d="M${x} ${y - 6}L${x + 20} ${y - 2}v13" stroke="#F2B705" stroke-width="2" fill="none"/><circle cx="${x + 20}" cy="${y + 12}" r="3" fill="#F2B705"/>`; } },
  toque: { chapeau: true, dessin: (f, c) => { const [x, y] = f.sommet;
    return `<g fill="#fff" stroke="${ENCRE}" stroke-width="2"><circle cx="${x - 10}" cy="${y - 12}" r="8"/><circle cx="${x + 10}" cy="${y - 12}" r="8"/><circle cx="${x}" cy="${y - 16}" r="9"/><rect x="${x - 14}" y="${y - 10}" width="28" height="12" rx="3"/></g>`; } },
  beret: { chapeau: true, dessin: (f, c) => { const [x, y] = f.sommet;
    return `<ellipse cx="${x + 4}" cy="${y - 2}" rx="21" ry="7" fill="${c}"/><path d="M${x + 4} ${y - 9}v-5" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`; } },
  casque: { chapeau: true, dessin: (f, c) => { const [tg, td, ty] = f.tempes, sy = f.sommet[1];
    return `<path d="M${tg + 2} ${ty}C${tg} ${sy - 16} ${td} ${sy - 16} ${td - 2} ${ty}" stroke="${ENCRE}" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="${tg - 6}" y="${ty - 10}" width="11" height="20" rx="5" fill="${c}" stroke="${ENCRE}" stroke-width="2"/><rect x="${td - 5}" y="${ty - 10}" width="11" height="20" rx="5" fill="${c}" stroke="${ENCRE}" stroke-width="2"/>`; } },
  noeud: { dessin: (f, c) => { const [x, y] = f.cou;
    return `<path d="M${x} ${y}l-13-8v16zM${x} ${y}l13-8v16z" fill="${c}" stroke="${ENCRE}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="3.5" fill="${c}" stroke="${ENCRE}" stroke-width="2"/>`; } },
};
let MASCOTTE_FICHIER = null;   // dessin libre (mascotte.fichier), chargé au démarrage
function mascot(mood = "happy", couleur = "var(--prim)"){
  const m = APP.mascotte;
  if (MASCOTTE_FICHIER) {
    const svg = MASCOTTE_FICHIER.cloneNode(true);
    const humeurs = [...svg.querySelectorAll('[id^="humeur-"]')];
    const garde = humeurs.find(g => g.id === `humeur-${mood}`) || humeurs.find(g => g.id === "humeur-happy");
    humeurs.forEach(g => { if (g !== garde) g.remove(); });
    svg.setAttribute("class", "mascot"); svg.setAttribute("aria-hidden", "true");
    return svg.outerHTML;
  }
  const f = MASCOTTES[m.forme] || MASCOTTES.oeuf, acc = ACCESSOIRES[m.accessoire];
  const corps = f.dessin(m) + visageSVG(f, mood) + (acc ? acc.dessin(f, couleur) : "");
  const cadre = cadreSVG(couleur, !!f.cadreDevant);
  return `<svg class="mascot" viewBox="0 0 120 120" aria-hidden="true">${f.cadreDevant ? "" : cadre}${acc?.chapeau ? `<g transform="translate(6 12) scale(.9)">${corps}</g>` : corps}${f.cadreDevant ? cadre : ""}</svg>`;
}
async function chargerMascotte(){
  if (!APP.mascotte.fichier) return;
  try {
    const txt = await (await fetch(APP.mascotte.fichier)).text();
    const svg = new DOMParser().parseFromString(txt, "image/svg+xml").documentElement;
    if (svg.nodeName.toLowerCase() === "svg") MASCOTTE_FICHIER = document.importNode(svg, true);
  } catch(e) { console.warn("mascotte.fichier illisible :", e); }
  I.logo = logoSVG();
}
/* petit logo de la barre du haut : la mascotte, sans les joues */
const logoSVG = () => mascot("happy").replace('class="mascot"', 'class="logo"').replace(/<circle class="joue"[^>]*\/>/g, "");
I.logo = logoSVG();

/* ---------------- sauvegarde ---------------- */
// La progression est indexée par des identifiants explicites (jamais par position) : ajouter du contenu ne perd rien.
function freshState(){
  return { v:1, xp:0, streak:{count:0,last:null}, days:{}, done:{}, quiz:{}, boss:{}, games:{}, badges:{}, erreurs:[], notions:{}, daily:{}, fiches:{}, ouvertes:{}, brouillons:{}, stats:{ premierCoup:0, bugs:0, codes:0 }, theme:null, installPlusTard:null, installJamais:false, projet:{}, repliees:{} };
}
function normaliser(o){
  const s = freshState();
  const obj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const num = (v, d) => Number.isFinite(v) ? v : d;
  if (!obj(o)) return s;
  s.xp = Math.max(0, num(o.xp, 0));
  if (obj(o.streak)) s.streak = { count:Math.max(0, num(o.streak.count, 0)), last:typeof o.streak.last === "string" ? o.streak.last : null };
  for (const k of ["days", "done", "games", "badges", "daily", "fiches", "ouvertes", "brouillons", "projet", "repliees"]) if (obj(o[k])) s[k] = o[k];
  for (const k of ["quiz", "boss", "notions"]) if (obj(o[k])) s[k] = Object.fromEntries(Object.entries(o[k]).filter(([, q]) => obj(q)));
  if (Array.isArray(o.erreurs)) s.erreurs = o.erreurs.filter(x => typeof x === "string").slice(-80);
  if (obj(o.stats)) for (const k of Object.keys(s.stats)) s.stats[k] = Math.max(0, num(o.stats[k], 0));
  if (o.theme === "light" || o.theme === "dark") s.theme = o.theme;
  if (typeof o.installPlusTard === "string") s.installPlusTard = o.installPlusTard;
  s.installJamais = o.installJamais === true;
  return s;
}
function loadState(){
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return normaliser(JSON.parse(raw)); } catch(e) {}
  return freshState();
}
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(ST)); } catch(e) {} }

/* ---------------- progression ---------------- */
function rankOf(xp){ const r = D.config.rangs; let cur = r[0], next = null; for (let i = 0; i < r.length; i++) { if (xp >= r[i].xp) { cur = r[i]; next = r[i+1] || null; } } return {cur, next}; }
function streakNow(){ const s = ST.streak; if (!s.last) return 0; const d = dayDiff(s.last, todayStr()); return d <= 1 ? s.count : 0; }
function gainXP(n){
  if (n <= 0) return;
  const before = rankOf(ST.xp).cur;
  ST.xp += n;
  const t = todayStr();
  ST.days[t] = (ST.days[t] || 0) + n;
  const s = ST.streak;
  const ecart = s.last ? dayDiff(s.last, t) : null;
  if (ecart === null || ecart > 0) { s.count = ecart === 1 ? s.count + 1 : 1; s.last = t; if (s.count > 1) toast(I.flame, `Série de ${s.count} jours !`, "Reviens demain pour la prolonger."); }
  const after = rankOf(ST.xp).cur;
  if (after.nom !== before.nom) toast(I.star, `Nouveau rang : ${after.nom}`, `${fmt(ST.xp)} XP au compteur.`);
  checkBadges(); save(); renderTop();
}
/* badges : ceux de config.json (sauf ceux d'un module absent : "module": "code-js") + un badge par unité (quiz) et un par unité (tous ses boss), générés depuis les unités */
function tousLesBadges(){
  const parUnite = D.unites.flatMap(u => [
    { id:`unite-${u.id}`, nom:`${u.titre} : validé`, desc:`Valider le quiz de l'unité ${u.numero}`, icone:u.badgeIcone || "medaille" },
    ...(u.boss?.length ? [{ id:`boss-${u.id}`, nom:`Boss vaincu : ${u.titre}`, desc:`Réussir ${u.boss.length > 1 ? `les ${u.boss.length} boss` : "le boss"} de l'unité ${u.numero}`, icone:"boss" }] : [])
  ]);
  return [...D.config.badges.filter(b => !b.module || aModule(b.module)), ...parUnite];
}
function award(id){
  if (ST.badges[id]) return;
  const b = tousLesBadges().find(x => x.id === id); if (!b) return;
  ST.badges[id] = todayStr(); save();
  toast(ICON_BY_NAME[b.icone] || I.medal, `Badge débloqué : ${b.nom}`, b.desc);
}
function checkBadges(){
  if (Object.keys(ST.done).some(k => !k.startsWith("jeu:"))) award("premier-pas");
  const s = streakNow(); if (s >= 3) award("serie-3"); if (s >= 7) award("serie-7"); if (s >= 30) award("serie-30");
  if (Object.keys(ST.fiches).length >= 10) award("theoricien");
  if (ST.stats.premierCoup >= 10) award("premier-coup");
  if (ST.stats.bugs >= 10) award("chasseur-bugs");
  if (ST.stats.codes >= 25) award("codeur");
  for (const u of D.unites) if (u.boss?.length && u.boss.every(b => ST.boss[b.id]?.fait)) award(`boss-${u.id}`);
  if (Object.values(ST.boss).some(b => b.fait && !b.indices)) award("sans-indice");
}
/* une unité s'ouvre quand le quiz de la précédente est validé ; une fois ouverte, elle le reste (même si une unité est insérée avant) */
function uniteOuverte(u){
  const i = D.unites.indexOf(u);
  if (i <= 0 || ST.ouvertes[u.id]) return true;
  const prev = D.unites[i - 1];
  if (ST.quiz[prev.id]?.passed) { ST.ouvertes[u.id] = todayStr(); save(); return true; }
  return false;
}
function noeudFait(u, step){
  if (step === "quiz") return !!ST.quiz[u.id]?.passed;
  if (step.startsWith("boss:")) return !!ST.boss[step.slice(5)]?.fait;
  return !!ST.done[step];
}

/* répétition espacée par notion (boîtes de Leitner) : raté → boîte 1, revue aujourd'hui ; réussi → boîte suivante */
const INTERVALLES = [1, 2, 4, 8, 16];
function noterNotions(q, ok){
  for (const id of q.notions || []) {
    const n = ST.notions[id] || { b:1, due:todayStr(), vu:0, rate:0 };
    n.vu++;
    if (ok) { n.b = Math.min(5, n.b + 1); n.due = plusJours(INTERVALLES[n.b - 1]); }
    else { n.b = 1; n.rate++; n.due = todayStr(); }
    ST.notions[id] = n;
  }
}
function notionsDues(){ const t = todayStr(); return Object.entries(ST.notions).filter(([, n]) => n.due <= t).sort((a, b) => a[1].b - b[1].b || a[1].due.localeCompare(b[1].due)).map(([id]) => id); }

/* ---------------- toasts, modale, confettis ---------------- */
const TOASTQ = []; let toastBusy = false;
function toast(icon, title, sub){ TOASTQ.push([icon, title, sub]); if (!toastBusy) nextToast(); }
function nextToast(){
  const t = TOASTQ.shift(); if (!t) { toastBusy = false; return; }
  toastBusy = true;
  const [icon, title, sub] = t;
  const el = h(`<div class="toast" role="status">${icon}<div>${esc(title)}${sub?`<small>${esc(sub)}</small>`:""}</div></div>`);
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => { el.remove(); nextToast(); }, TOASTQ.length ? 1700 : 2400);
}
/* calques (session, fiche, modale) : tout ce qui est dessous devient inerte */
function majCalques(){
  const calques = [...document.querySelectorAll("body > .session, body > .drawer, body > .modal-bg")];
  const haut = calques[calques.length - 1] || null;
  for (const el of document.body.children) {
    if (el.id === "toasts" || el.matches(".drawer-bg,.confetti,.drag-ghost,script,style,link,title")) continue;
    el.inert = !!haut && el !== haut;
  }
}
function confirmBox(title, text, okLabel, onOk, danger = true){
  const m = h(`<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="row-btns"><button class="btn ghost" data-a="no">Rester</button><button class="btn ${danger?"ko":""}" data-a="ok">${esc(okLabel)}</button></div></div></div>`);
  const avant = document.activeElement;
  const echap = e => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } };
  const fermer = () => { document.removeEventListener("keydown", echap, true); m.remove(); majCalques(); if (avant?.isConnected) avant.focus({preventScroll:true}); };
  document.addEventListener("keydown", echap, true);
  m.addEventListener("click", e => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "ok") { fermer(); onOk(); } else if (a === "no" || e.target === m) fermer(); });
  document.body.appendChild(m); majCalques(); m.querySelector('[data-a="no"]').focus();
}
/* ---------------- appli sur l'écran d'accueil (repris de Pampre) ---------------- */
// Android (Chrome, Edge, Samsung Internet) : invite native, reçue par « beforeinstallprompt ».
// iOS et les autres navigateurs : pas d'invite programmable, on affiche le mode d'emploi du navigateur détecté.
// Proposé uniquement sur téléphone et tablette, jamais sur ordinateur, dans l'appli déjà installée ni en mode ?test.
let INVITE_INSTALL = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); INVITE_INSTALL = e;
  document.querySelectorAll("[data-installer]").forEach(b => b.textContent = "Installer");
});
window.addEventListener("appinstalled", () => {
  INVITE_INSTALL = null; document.querySelector(".modal.installer")?.closest(".modal-bg")?.remove(); majCalques();
  toast(I.check, `${APP.nom} est installé`, `Retrouve ${APP.mascotte.nom} sur ton écran d'accueil.`);
});
function appareil(){
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS se présente comme un Mac
  const android = !ios && /Android/.test(ua);
  const v = ua.match(/OS (\d+)_(\d+)/); const versionIOS = v ? +v[1] + +v[2] / 100 : 99;
  return {
    ios, android, mobile: ios || android,
    installe: matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true,
    // navigateurs intégrés aux applis (Instagram, Facebook, Messenger, TikTok…) : pas d'ajout à l'écran d'accueil
    integre: /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Snapchat|TikTok|musical_ly|Bytedance|LinkedInApp|Pinterest|Line\//.test(ua),
    nav: ios ? (/CriOS/.test(ua) ? "chrome" : /FxiOS/.test(ua) ? "firefox" : /EdgiOS/.test(ua) ? "edge" : "safari")
      : /SamsungBrowser/.test(ua) ? "samsung" : /Firefox/.test(ua) ? "firefox" : /OPR\//.test(ua) ? "opera" : /EdgA/.test(ua) ? "edge" : "chrome",
    ancienIOS: ios && versionIOS < 16.04   // avant iOS 16.4, seul Safari sait ajouter à l'écran d'accueil
  };
}
const installPossible = () => { const a = appareil(); return a.mobile && !a.installe && !/[?&]test\b/.test(location.search); };
// fenêtre automatique : après la première leçon, puis 14 jours après chaque « plus tard », jusqu'au « ne plus proposer »
const proposerInstall = () => installPossible() && ST.xp > 0 && !ST.installJamais && !(ST.installPlusTard && dayDiff(ST.installPlusTard, todayStr()) < 14);
const pic = n => `<span class="pic">${I[n]}</span>`;
// mode d'emploi : liste d'étapes (HTML) selon l'appareil
function etapesInstall(a){
  const m = esc(APP.mascotte.nom);
  if (a.integre) return [`Cette page est ouverte dans une appli (Instagram, Facebook…), qui ne permet pas l'ajout à l'écran d'accueil.`,
    `Touche ${pic("pointsH")} ou ${pic("points")} puis « Ouvrir dans ${a.ios ? "Safari" : "le navigateur"} ».`, `Reviens ici : le mode d'emploi s'adaptera à ton navigateur.`];
  if (a.ios && a.nav !== "safari" && a.ancienIOS) return [`Sur ta version d'iOS, seul Safari sait ajouter un site à l'écran d'accueil.`, `Ouvre cette page dans Safari, puis reviens ici.`];
  if (a.ios && a.nav === "safari") return [
    `Touche le bouton Partager ${pic("partager")} de Safari : en bas de l'écran sur iPhone, en haut sur iPad. S'il n'apparaît pas, il est dans le menu ${pic("pointsH")} à côté de l'adresse.`,
    `Fais défiler et choisis « Sur l'écran d'accueil » ${pic("ajouter")} (selon la version : « Ajouter à l'écran d'accueil », parfois sous « Plus »).`,
    `Touche « Ajouter » en haut à droite. ${m} rejoint tes applis.`];
  if (a.ios) return [
    a.nav === "chrome" ? `Touche le bouton Partager ${pic("partager")} à droite de la barre d'adresse.` : `Ouvre le menu ${pic("menu")} ou ${pic("pointsH")} du navigateur, puis « Partager » ${pic("partager")}.`,
    `Choisis « Sur l'écran d'accueil » (ou « Ajouter à l'écran d'accueil ») ${pic("ajouter")}.`,
    `Touche « Ajouter ». ${m} rejoint tes applis.`];
  if (a.nav === "samsung") return [`Touche le menu ${pic("menu")} en bas à droite.`, `Choisis « Ajouter la page à », puis « Écran d'accueil ».`, `Confirme avec « Ajouter ».`];
  if (a.nav === "firefox") return [`Touche le menu ${pic("points")} (en haut ou en bas à droite).`, `Choisis « Ajouter à l'écran d'accueil » (ou « Installer »).`, `Confirme : l'icône apparaît avec tes applis.`];
  if (a.nav === "opera") return [`Touche le menu ${pic("points")} en haut à droite.`, `Choisis « Ajouter à… », puis « Écran d'accueil ».`, `Confirme avec « Ajouter ».`];
  if (a.nav === "edge") return [`Touche le menu ${pic("menu")} en bas de l'écran.`, `Choisis « Ajouter au téléphone » (ou « Ajouter à l'écran d'accueil »).`, `Confirme avec « Installer ».`];
  return [`Touche le menu ${pic("points")} en haut à droite de Chrome.`, `Choisis « Ajouter à l'écran d'accueil » ou « Installer l'application ».`, `Confirme avec « Installer ».`];
}
// la fenêtre : bouton « Installer » quand le navigateur offre l'invite native, sinon le mode d'emploi ; auto = proposée d'elle-même
function aideInstall(auto = false){
  const a = appareil(), nom = esc(APP.nom);
  if (auto) { ST.installPlusTard = todayStr(); save(); }   // fermer la fenêtre vaut « plus tard »
  const autres = `<details class="autres"><summary>Sur un autre appareil</summary><dl>
    <dt>iPhone, iPad (Safari)</dt><dd>Partager ${pic("partager")} → « Sur l'écran d'accueil » → Ajouter.</dd>
    <dt>iPhone, iPad (Chrome, Edge, Firefox ; iOS 16.4 ou plus)</dt><dd>Partager ${pic("partager")} → « Sur l'écran d'accueil ».</dd>
    <dt>Android (Chrome, Edge)</dt><dd>Bouton « Installer » de ${nom}, ou menu ${pic("points")} → « Ajouter à l'écran d'accueil ».</dd>
    <dt>Android (Samsung Internet)</dt><dd>Menu ${pic("menu")} → « Ajouter la page à » → « Écran d'accueil ».</dd>
    <dt>Android (Firefox)</dt><dd>Menu ${pic("points")} → « Ajouter à l'écran d'accueil ».</dd></dl></details>`;
  const etapes = `<ol class="etapes">${etapesInstall(a).map(e => `<li><span>${e}</span></li>`).join("")}</ol>`;
  const m = h(`<div class="modal-bg"><div class="modal installer" role="dialog" aria-modal="true" aria-labelledby="inst-titre">
    <div class="inst-tete">${mascot("wow")}<h3 id="inst-titre">${nom} sur ton écran d'accueil</h3></div>
    <p class="muted">Une icône comme une vraie appli : ${nom} s'ouvre en plein écran, sans barre d'adresse, même hors connexion. Rien à télécharger dans un store, ta progression reste la même.</p>
    ${INVITE_INSTALL ? `<details class="autres"><summary>Le faire à la main</summary>${etapes}</details>` : etapes}${autres}
    <div class="row-btns">${auto ? `<button class="btn ghost" data-a="plus-tard">Plus tard</button>` : ""}<button class="btn" data-a="${INVITE_INSTALL ? "installer" : "ok"}">${INVITE_INSTALL ? "Installer" : "Compris"}</button></div>
    ${auto ? `<button type="button" class="lien-discret" data-a="jamais">Ne plus me le proposer</button>` : ""}</div></div>`);
  const avant = document.activeElement;
  const fermer = () => { document.removeEventListener("keydown", echap, true); m.remove(); majCalques(); if (avant?.isConnected) avant.focus({preventScroll:true}); };
  const echap = e => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } };
  document.addEventListener("keydown", echap, true);
  m.addEventListener("click", e => {
    const act = e.target.closest("[data-a]")?.dataset.a;
    if (act === "installer") { fermer(); installer(); }
    else if (act === "jamais") { ST.installJamais = true; save(); fermer(); toast(I.phone, "C'est noté", "Tu retrouveras le mode d'emploi dans Profil."); }
    else if (act || e.target === m) fermer();
  });
  document.body.appendChild(m); majCalques(); m.querySelector(".row-btns .btn:last-child").focus();
}
async function installer(){
  if (!INVITE_INSTALL) return aideInstall();
  const invite = INVITE_INSTALL; INVITE_INSTALL = null;   // une invite ne sert qu'une fois
  try { await invite.prompt(); const { outcome } = await invite.userChoice; if (outcome !== "accepted") document.querySelectorAll("[data-installer]").forEach(b => b.textContent = b.dataset.aide); }
  catch(e) { aideInstall(); }
}
function confetti(){
  const box = h(`<div class="confetti"></div>`); const cols = ["var(--prim)","var(--gold)","var(--ok)","var(--teal)","#ff9fb4"];
  for (let i = 0; i < 60; i++) { const c = document.createElement("i"); c.style.left = Math.random()*100 + "%"; c.style.background = cols[i % cols.length]; c.style.animationDelay = (Math.random()*.8) + "s"; c.style.animationDuration = (1.8 + Math.random()*1.4) + "s"; box.appendChild(c); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
}

/* ---------------- affichage du code ---------------- */
/* jetons colorés, découpés par ligne (un commentaire ou une chaîne peut s'étendre sur plusieurs lignes) */
function lignesColorees(code){
  const out = [[]];
  for (const j of (LANG || LANGAGES.js).jetons(code)) {
    const morceaux = j.v.split("\n");
    morceaux.forEach((m, i) => { if (i > 0) out.push([]); if (m) out[out.length - 1].push({ ...j, v:m }); });
  }
  return out;
}
const spanJeton = j => j.t === "ws" ? esc(j.v) : `<span class="t-${j.t}">${esc(j.v)}</span>`;
function colorer(code){ return lignesColorees(code).map(l => l.map(spanJeton).join("")).join("\n"); }
/* bloc de code en lecture seule ; opts : { numeros, entete (lignes affichées grisées avant), surligne:[n] } */
function codeHTML(code, opts = {}){
  const L = lignesColorees(code);
  const num = opts.numeros !== false && L.length > 1;
  const ent = opts.entete ? lignesColorees(opts.entete).map(l => `<div class="l entete">${num ? `<span class="n"></span>` : ""}<span>${l.map(spanJeton).join("")}</span></div>`).join("") : "";
  return `<div class="code ${num ? "" : "sans-n"}" translate="no">${ent}${L.map((l, i) => `<div class="l ${(opts.surligne || []).includes(i + 1) ? "lu" : ""}" data-l="${i + 1}">${num ? `<span class="n">${i + 1}</span>` : ""}<span>${l.map(spanJeton).join("") || " "}</span></div>`).join("")}</div>`;
}
/* couleurs du terminal (codes ANSI, TP « showCard ») : \x1b[31;47m rouge sur blanc, \x1b[30;47m noir sur blanc, \x1b[0m normal */
const ANSI_COUL = ["#1a1a1a", "#d22b2b", "#2e9e4b", "#c7a008", "#2f6fd0", "#b03fc0", "#1c9fa8", "#f2f2f2"];
function ansiHTML(texte){
  if (!texte.includes("\x1b[")) return esc(texte);
  let st = {}, out = "";
  for (const [i, m] of texte.split(/\x1b\[([\d;]*)m/).entries()) {
    if (i % 2) { for (const c of (m || "0").split(";").map(Number)) { if (c === 0) st = {}; else if (c === 1) st.b = true; else if (c >= 30 && c <= 37) st.fg = ANSI_COUL[c - 30]; else if (c >= 40 && c <= 47) st.bg = ANSI_COUL[c - 40]; else if (c === 39) delete st.fg; else if (c === 49) delete st.bg; } continue; }
    if (!m) continue;
    const css = [st.fg && `color:${st.fg}`, st.bg && `background:${st.bg}`, st.b && "font-weight:800"].filter(Boolean).join(";");
    out += css ? `<span style="${css}">${esc(m)}</span>` : esc(m);
  }
  return out;
}
function consoleHTML(logs, opts = {}){
  const L = (logs || []).map(l => `<div class="cl">${ansiHTML(l)}</div>`).join("");
  return `<div class="console" role="log" aria-label="Console">${opts.titre === false ? "" : `<div class="titre">Console</div>`}${L || `<div class="vide">${esc(opts.vide || "Rien n'a été affiché.")}</div>`}</div>`;
}

/* ---------------- exécution du code : celle du langage du cours (js/langages.js) ---------------- */
/* payload : { code, donnees, prelude, tests, contexte, …champs propres au langage (champsExec) } → résultat au format de executerTout */
function executer(payload){
  if (!aCode()) return Promise.resolve({ ok:false, console:[], cas:[], diagnostics:[], conseils:[], erreur:{ titre:"Pas d'exécution", message:`Ce cours n'exécute pas le ${LANG.nom}.` } });
  return LANG.executer(payload);
}
/* aperçu d'une page HTML produite par le code (PHP…) : iframe sans JavaScript */
function apercuPageHTML(html){
  const el = h(`<div class="apercu-page"><div class="eyebrow">Aperçu de la page envoyée au navigateur</div><iframe sandbox="" title="Aperçu de la page"></iframe><p class="note">Les scripts ne s'exécutent pas dans l'aperçu.</p></div>`);
  el.querySelector("iframe").srcdoc = `<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:12px;font-size:15px}</style>${html}`;
  return el;
}
/* JavaScript (module code-js) : un Web Worker neuf par exécution (js/worker.js + js/banc.js), tué après DELAI_MAX */
const DELAI_MAX = 2000;   // ms : au-delà, on considère que le code tourne en rond
function executerJs(payload){
  return new Promise(resolve => {
    let w;
    const vide = { ok:false, console:[], cas:[], diagnostics:[], conseils:[] };
    try { w = new Worker("js/worker.js"); }
    catch(e) { return resolve({ ...vide, erreur:{ titre:"Bac à sable indisponible", message:"Ton navigateur n'a pas pu lancer le bac à sable. Recharge la page (le site doit être ouvert en http://, pas en double-cliquant le fichier)." } }); }
    const t = setTimeout(() => { w.terminate(); resolve({ ...vide, timeout:true, erreur:{ titre:"Trop long", message:`Ton code tourne depuis plus de ${DELAI_MAX / 1000} secondes : sans doute une boucle infinie (vérifie que la condition finit par devenir fausse et que le compteur avance dans le bon sens), ou une boucle beaucoup trop longue (des milliards de tours).` } }); }, DELAI_MAX);
    w.onmessage = e => { clearTimeout(t); w.terminate(); resolve(e.data); };
    w.onerror = e => { clearTimeout(t); w.terminate(); e.preventDefault?.(); resolve({ ...vide, erreur:{ titre:"Erreur", message: traduireErreur({ message: String(e.message || "").replace(/^Uncaught \w+: /, "") }) } }); };
    w.postMessage(payload);
  });
}
/* bouton « Exécuter » sous un exemple de code (cartes de leçon, fiches) */
function blocExecutable(code, opts = {}){
  prechargerLangage();
  const el = h(`<div>${codeHTML(code, opts)}<div class="code-run"><button type="button" class="btn small ghost" data-run>${I.play}Exécuter</button></div><div class="sortie"></div></div>`);
  el.querySelector("[data-run]").onclick = async (e) => {
    const b = e.currentTarget;
    if (opts.dom) {   // exemple sur une page web (TP DOM) : la page s'affiche, la console se remplit au fil des clics
      const s = el.querySelector(".sortie");
      s.innerHTML = `<div class="apercu-zone"></div>${consoleHTML([], { vide:`Rien n'a été affiché (pas de ${LANG.afficher}).` })}`;
      const cons = s.querySelector(".console") || s.lastElementChild;
      const ajouter = (t, err) => { cons.querySelector(".vide")?.remove(); const l = h(`<div class="cl ${err ? "err" : ""}"></div>`); l.innerHTML = ansiHTML(t); cons.appendChild(l); };
      const r = await apercuDom(s.querySelector(".apercu-zone"), { code, dom: opts.dom, surLog: (t, g) => ajouter(t, g === "error") });
      if (r.erreur) ajouter(`✖ ${r.erreur.titre} : ${r.erreur.message}`, true);
      return;
    }
    b.disabled = true;
    const r = await executer({ code, donnees: opts.donnees || null, ...champsExec(opts.source) });
    b.disabled = false;
    const s = el.querySelector(".sortie");
    s.innerHTML = consoleHTML(r.console.concat(r.erreur ? [`✖ ${r.erreur.titre} : ${r.erreur.message}`] : []), { vide:`Rien n'a été affiché (pas de ${LANG.afficher}).` });
    if (r.erreur) s.querySelector(".cl:last-child")?.classList.add("err");
    for (const c of (r.conseils || []).filter(c => c.avertissement)) s.appendChild(h(`<div class="diag conseil"><b>Avertissement de ${esc(LANG.nom)}</b>${richInline(c.message)}</div>`));
    if (r.page) s.appendChild(apercuPageHTML(r.page));
  };
  return el;
}

/* ---------------- texte enrichi ---------------- */
/* **gras**, `code`, [[fiche]] ou [[fiche|texte]] (lien vers une fiche de théorie), \n\n paragraphe, \n retour à la ligne, « - » en début de ligne : liste */
function richInline(txt){
  return esc(txt)
    .replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[\[([a-z][a-z0-9-]*)(?:\|([^\]]+))?\]\]/g, (m, id, t) => `<button type="button" class="fl" data-fiche="${id}">${t || (FICHES[id]?.titre ?? id)}</button>`);
}
function rich(txt){
  // blocs de code entre ``` : affichés colorés, en lecture seule
  const morceaux = String(txt ?? "").split(/```\w*\n?([\s\S]*?)```/);
  if (morceaux.length > 1) return morceaux.map((m, i) => i % 2 ? codeHTML(m.replace(/\n$/, ""), { numeros:false }) : richParas(m.trim())).join("");
  return richParas(txt);
}
function richParas(txt){
  if (!String(txt ?? "").trim()) return "";
  return String(txt ?? "").split(/\n\n/).map(p => {
    const ls = p.split("\n");
    if (ls.every(l => /^- /.test(l))) return `<ul>${ls.map(l => `<li>${richInline(l.slice(2))}</li>`).join("")}</ul>`;
    return `<p>${ls.map(richInline).join("<br>")}</p>`;
  }).join("");
}

/* ---------------- fiches de théorie ---------------- */
let FICHES = {};   // id → fiche (avec .unite)
document.addEventListener("click", e => { const f = e.target.closest(".fl"); if (f) { e.preventDefault(); ouvrirFiche(f.dataset.fiche); } });
function ficheHTML(f){
  const el = h(`<article class="fiche"><div class="eyebrow">Unité ${f.unite.numero} · ${esc(f.unite.titre)}</div><h2 style="font-size:26px;margin:4px 0 6px">${esc(f.titre)}</h2>${f.resume ? `<p class="resume">${richInline(f.resume)}</p>` : ""}</article>`);
  if (f.analogie) el.appendChild(h(`<div class="aside analogie">${I.egg.replace("<svg", '<svg style="color:var(--gold-deep)"')}<div><b class="t">Pour s'en souvenir</b><div class="rich">${rich(f.analogie)}</div></div></div>`));
  if (f.texte) el.appendChild(h(`<div class="rich" style="margin-top:14px">${rich(f.texte)}</div>`));
  for (const ex of f.exemples || []) {
    if (ex.titre) el.appendChild(h(`<h3>${richInline(ex.titre)}</h3>`));
    el.appendChild(aCode() && ex.executable !== false ? blocExecutable(lignes(ex.code), { dom: ex.dom, source: ex }) : h(`<div>${codeHTML(lignes(ex.code))}</div>`));
    if (ex.note) el.appendChild(h(`<div class="rich" style="font-size:15px">${rich(ex.note)}</div>`));
  }
  if (f.pieges?.length) el.appendChild(h(`<div class="aside piege">${I.warn.replace("<svg", '<svg style="color:var(--ko)"')}<div><b class="t">Pièges classiques</b><div class="rich">${rich(f.pieges.map(p => "- " + p).join("\n"))}</div></div></div>`));
  return el;
}
function ouvrirFiche(id){
  const f = FICHES[id]; if (!f) return;
  ST.fiches[id] = (ST.fiches[id] || 0) + 1; checkBadges(); save();
  const bg = h(`<div class="drawer-bg"></div>`);
  const dr = h(`<aside class="drawer" role="dialog" aria-modal="true" aria-label="Fiche : ${esc(f.titre)}"><div class="drawer-head"><h2>Théorie</h2><button class="iconbtn" data-close aria-label="Fermer">${I.x}</button></div><div class="drawer-body"></div></aside>`);
  dr.querySelector(".drawer-body").appendChild(ficheHTML(f));
  const avant = document.activeElement, overflowAvant = document.body.style.overflow;
  const echap = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener("keydown", echap, true); bg.remove(); dr.remove(); document.body.style.overflow = overflowAvant; majCalques(); if (avant?.isConnected) avant.focus({preventScroll:true}); };
  bg.onclick = close; dr.querySelector("[data-close]").onclick = close;
  document.addEventListener("keydown", echap, true);
  document.body.append(bg, dr); document.body.style.overflow = "hidden"; majCalques();
  dr.querySelector("[data-close]").focus({preventScroll:true});
}

/* ---------------- illustrations des cartes de leçon ---------------- */
/* clé "illu" d'une carte ; la fonction reçoit la carte (illustrations pilotées par le contenu) */
const svgT = (x, y, t, { s = 12, w = 800, f = "var(--f-body)", c = "var(--ink)", a = "middle" } = {}) => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="${f}" font-weight="${w}" font-size="${s}" fill="${c}">${t}</text>`;
const IL = {
  /* la boîte d'œufs : "tableau": [...], "nom": "fruits", "negatifs": true */
  boite: c => boiteHTML(c.tableau || [], { nom:c.nom, negatifs:c.negatifs }),
  porte: () => `<svg viewBox="0 0 300 150"><rect x="20" y="40" width="120" height="80" rx="16" fill="var(--gold)"/><path d="M28 40l70-22 14 22" fill="var(--gold-deep)"/><rect x="100" y="68" width="40" height="24" rx="12" fill="#fff" opacity=".7"/>${svgT(80, 136, "acc (le porte-monnaie)", {s:12})}
    ${[0,1,2].map(i => `<circle cx="${190 + i * 34}" cy="${60 + (i % 2) * 14}" r="14" fill="var(--gold-soft)" stroke="var(--gold-deep)" stroke-width="2.5"/>${svgT(190 + i * 34, 65 + (i % 2) * 14, ["3","5","2"][i], {s:13, f:"var(--f-code)"})}`).join("")}
    <path d="M176 92c-10 10-22 14-34 10" stroke="var(--muted)" stroke-width="2.5" fill="none" stroke-dasharray="4 4" marker-end="url(#fl)"/>${svgT(224, 118, "chaque pièce (l'élément)", {s:12})}
    <defs><marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0l10 5-10 5z" fill="var(--muted)"/></marker></defs></svg>`,
  cuisinier: () => `<svg viewBox="0 0 300 160"><rect x="10" y="20" width="130" height="120" rx="14" fill="var(--paper)" stroke="var(--line)" stroke-width="3"/>${svgT(75, 40, "cuisine (la fonction)", {s:11, c:"var(--muted)"})}
    <circle cx="60" cy="80" r="16" fill="#FFE2C6"/><rect x="44" y="52" width="32" height="14" rx="6" fill="#fff" stroke="var(--line)"/><rect x="46" y="96" width="28" height="30" rx="8" fill="#fff" stroke="var(--line)"/>
    <ellipse cx="108" cy="104" rx="20" ry="6" fill="var(--gold)"/>
    <path d="M130 104h70" stroke="var(--ok)" stroke-width="4" marker-end="url(#fo)"/>${svgT(170, 96, "return", {s:13, f:"var(--f-code)", c:"var(--ok-ink)"})}${svgT(250, 108, "tu reçois", {s:12})}${svgT(250, 124, "le plat", {s:12})}
    <rect x="96" y="34" width="34" height="26" rx="4" fill="var(--teal-soft)" stroke="var(--teal)" stroke-width="2"/><path d="M130 47h60" stroke="var(--ko)" stroke-width="3" stroke-dasharray="5 4"/>${svgT(160, 40, "console.log", {s:12, f:"var(--f-code)", c:"var(--ko-ink)"})}${svgT(250, 44, "on te le montre", {s:12})}${svgT(250, 60, "par la fenêtre", {s:12})}
    <defs><marker id="fo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0l10 5-10 5z" fill="var(--ok)"/></marker></defs></svg>`,
  /* variables = étiquettes collées sur des boîtes : "variables": [["age", "16"], ["prenom", "\"Léa\""]] */
  variables: c => { const v = c.variables || [["x", "42"]]; return `<svg viewBox="0 0 ${Math.max(300, v.length * 110)} 130">${v.map(([n, val], i) => { const x = 20 + i * 110; return `<rect x="${x}" y="40" width="90" height="60" rx="10" fill="var(--paper)" stroke="var(--prim)" stroke-width="3"/>${svgT(x + 45, 76, esc(val), {s:14, f:"var(--f-code)"})}<rect x="${x + 10}" y="20" width="70" height="26" rx="8" fill="var(--gold)"/>${svgT(x + 45, 38, esc(n), {s:13, f:"var(--f-code)", c:"#2E2300"})}`; }).join("")}${svgT(Math.max(300, v.length * 110) / 2, 122, "le nom est l'étiquette, la valeur est dans la boîte", {s:11, c:"var(--muted)"})}</svg>`; },
  types: () => `<svg viewBox="0 0 300 120">${[["42","nombre","var(--sy-num)",20],["\"42\"","chaîne","var(--sy-str)",115],["true","booléen","var(--sy-kw)",210]].map(([v, t, c, x]) => `<rect x="${x}" y="20" width="76" height="52" rx="14" fill="var(--paper)" stroke="${c}" stroke-width="3"/>${svgT(x + 38, 52, esc(v), {s:16, f:"var(--f-code)", c})}${svgT(x + 38, 96, t, {s:13})}`).join("")}</svg>`,
  fleche: () => `<svg viewBox="0 0 320 120">${svgT(160, 52, "(fruit) =&gt; fruit.length", {s:19, f:"var(--f-code)"})}<path d="M70 62v18M118 62v18M220 62v18" stroke="var(--muted)" stroke-width="2"/>${svgT(80, 96, "paramètre", {s:11, c:"var(--prim-ink)"})}${svgT(80, 110, "(un œuf)", {s:11, c:"var(--muted)"})}${svgT(132, 96, "flèche", {s:11, c:"var(--prim-ink)"})}${svgT(228, 96, "ce qui est retourné", {s:11, c:"var(--prim-ink)"})}${svgT(228, 110, "(pas besoin de return)", {s:11, c:"var(--muted)"})}</svg>`,
  portee: () => `<svg viewBox="0 0 300 150"><rect x="10" y="10" width="280" height="130" rx="14" fill="var(--paper)" stroke="var(--line)" stroke-width="3"/>${svgT(24, 30, "programme", {s:11, a:"start", c:"var(--muted)"})}${svgT(24, 50, "const prix = 10;", {s:13, a:"start", f:"var(--f-code)"})}<rect x="24" y="62" width="250" height="66" rx="12" fill="var(--prim-soft)" stroke="var(--prim)" stroke-width="2"/>${svgT(36, 80, "function ttc() {", {s:13, a:"start", f:"var(--f-code)"})}${svgT(52, 100, "const taxe = 2; // vit ici", {s:13, a:"start", f:"var(--f-code)"})}${svgT(36, 120, "}", {s:13, a:"start", f:"var(--f-code)"})}</svg>`,
  spread: () => `<svg viewBox="0 0 320 120">${boiteSVG(10, 26, ["🥚","🥚"], "var(--boite)")}${svgT(120, 64, "...", {s:28, f:"var(--f-code)", c:"var(--prim-ink)"})}${[0,1].map(i => `<ellipse cx="${170 + i * 34}" cy="62" rx="13" ry="16" fill="var(--oeuf)" stroke="var(--oeuf-bord)" stroke-width="2.5"/>`).join("")}${svgT(260, 66, "œufs sortis", {s:12})}${svgT(160, 112, "[...boite] : les œufs, sans la boîte", {s:12, c:"var(--muted)"})}</svg>`
};
function boiteSVG(x, y, items, col){ return `<rect x="${x}" y="${y}" width="${items.length * 36 + 14}" height="56" rx="12" fill="${col}" opacity=".6"/>${items.map((_, i) => `<ellipse cx="${x + 25 + i * 36}" cy="${y + 28}" rx="13" ry="16" fill="var(--oeuf)" stroke="var(--oeuf-bord)" stroke-width="2.5"/>`).join("")}`; }
function illu(key, carte){ const f = IL[key]; return f ? f(carte) : ""; }
/* une boîte d'œufs HTML (tableau) ; opts : nom, negatifs (indices négatifs), tap (cases touchables), sansIndices */
function boiteHTML(arr, opts = {}){
  const n = arr.length;
  return `<div class="boite ${opts.tap ? "tap" : ""}" ${opts.label ? `aria-label="${esc(opts.label)}"` : ""}>${opts.nom ? `<div class="nom">${esc(opts.nom)}</div>` : ""}${arr.map((v, i) => `<div class="case" data-i="${i}">${opts.tap ? `<button type="button" class="oeuf" aria-pressed="false" aria-label="Case ${i} : ${esc(enCode(v))}">${esc(enCode(v))}</button>` : `<div class="oeuf">${esc(enCode(v))}</div>`}${opts.sansIndices ? "" : `<div class="idx">${i}${opts.negatifs ? `<span class="neg">${i - n}</span>` : ""}</div>`}</div>`).join("") || `<div class="muted" style="font-weight:700">[] (boîte vide)</div>`}</div>`;
}
