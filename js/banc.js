"use strict";
/* =====================================================================
   Moteur de cours — banc d'essai du code.
   Ce fichier est chargé à la fois :
   - par la page (coloration, affichage des valeurs, comparaisons, analyse statique) ;
   - par le Web Worker js/worker.js, qui exécute le code de l'élève et ses tests (fonction executerTout).
   Il ne doit donc utiliser ni le DOM ni rien qui n'existe pas dans un worker.
   ===================================================================== */

/* ---------------- découpage en jetons (coloration, exercices « pointer ») ---------------- */
const MOTS_CLES = new Set(["const","let","var","function","return","if","else","for","while","do","of","in","new","typeof","instanceof","break","continue","switch","case","default","throw","try","catch","finally","class","extends","this","async","await","yield","delete","void","import","export","from"]);
const LITTERAUX = new Set(["true","false","null","undefined","NaN","Infinity"]);
const RE_JETON = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\[\s\S])*`?)|(\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?|\.\d+)|([A-Za-z_$À-ÿ][\w$À-ÿ]*)|(\s+)|(=>|\.\.\.|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\+=|-=|\*=|\/=|%=|\*\*|[-+*/%<>=!?:&|^~])|([()[\]{};,.])|([\s\S])/g;
/* jetons(code) → [{t, v}] ; t ∈ com, str, num, kw, lit, fn (nom suivi de « ( »), prop (après « . »), id, ws, op, ponct, autre */
function jetons(code){
  const out = []; let m; RE_JETON.lastIndex = 0;
  while ((m = RE_JETON.exec(code))) {
    const v = m[0];
    if (m[1]) out.push({ t:"com", v });
    else if (m[2]) out.push({ t:"str", v });
    else if (m[3]) out.push({ t:"num", v });
    else if (m[4]) out.push({ t: MOTS_CLES.has(v) ? "kw" : LITTERAUX.has(v) ? "lit" : "id", v });
    else if (m[5]) out.push({ t:"ws", v });
    else if (m[6]) out.push({ t:"op", v });
    else if (m[7]) out.push({ t:"ponct", v });
    else out.push({ t:"autre", v });
  }
  // nom de fonction (suivi d'une parenthèse) et propriété (après un point)
  for (let i = 0; i < out.length; i++) {
    if (out[i].t !== "id") continue;
    let p = i - 1; while (p >= 0 && out[p].t === "ws") p--;
    let n = i + 1; while (n < out.length && out[n].t === "ws") n++;
    const apresPoint = p >= 0 && out[p].v === ".";
    const appel = n < out.length && out[n].v === "(";
    out[i].t = appel ? "fn" : apresPoint ? "prop" : "id";
    if (apresPoint) out[i].prop = true;
  }
  return out;
}

/* code sans commentaires ni contenu des chaînes (pour chercher des méthodes interdites, des « == »…) ;
   les longueurs sont conservées, donc les positions et les numéros de ligne aussi */
function codeNu(code){
  return jetons(code).map(j => j.t === "com" ? j.v.replace(/[^\n]/g, " ")
    : j.t === "str" ? j.v[0] + j.v.slice(1, -1).replace(/[^\n]/g, " ") + (j.v.length > 1 ? j.v.slice(-1) : "")
    : j.v).join("");
}
const ligneDe = (code, pos) => code.slice(0, pos).split("\n").length;

/* ---------------- affichage d'une valeur, comme dans la console du navigateur ---------------- */
function formater(v, profondeur = 0, vus = []){
  if (typeof v === "string") return profondeur === 0 ? v : JSON.stringify(v);
  if (typeof v === "number") return Object.is(v, -0) ? "0" : String(v);
  if (typeof v === "bigint") return v + "n";
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "symbol") return String(v);
  if (typeof v === "function") return v.name ? `[Function: ${v.name}]` : "[Function (anonyme)]";
  if (vus.includes(v)) return "[Circulaire]";
  if (profondeur > 4) return Array.isArray(v) ? "[…]" : "{…}";
  const s = vus.concat([v]);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const parts = []; let trous = 0;
    for (let i = 0; i < v.length; i++) {
      if (!(i in v)) { trous++; continue; }
      if (trous) { parts.push(`<${trous} vide${trous > 1 ? "s" : ""}>`); trous = 0; }
      parts.push(formater(v[i], profondeur + 1, s));
    }
    if (trous) parts.push(`<${trous} vide${trous > 1 ? "s" : ""}>`);
    return `[${parts.join(", ")}]`;
  }
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (v instanceof Map) return `Map(${v.size}) {${[...v].map(([k, x]) => `${formater(k, profondeur + 1, s)} => ${formater(x, profondeur + 1, s)}`).join(", ")}}`;
  if (v instanceof Set) return `Set(${v.size}) {${[...v].map(x => formater(x, profondeur + 1, s)).join(", ")}}`;
  const cles = Object.keys(v);
  if (!cles.length) return "{}";
  return `{ ${cles.map(k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${formater(v[k], profondeur + 1, s)}`).join(", ")} }`;
}
/* une valeur telle qu'on l'écrirait dans du code (chaînes toujours entre guillemets) */
const enCode = v => formater(v, 1);

/* ---------------- comparaison profonde ---------------- */
function egal(a, b){
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b);
    if (a === b) return true;
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));   // aires avec Math.PI : l'ordre des calculs change le dernier chiffre
  }
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => egal(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && egal(a[k], b[k]));
}
function copieProfonde(v){
  if (Array.isArray(v)) return v.map(copieProfonde);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copieProfonde(x)]));
  return v;
}
function gelProfond(v){
  if (v && typeof v === "object" && !Object.isFrozen(v)) { Object.values(v).forEach(gelProfond); Object.freeze(v); }
  return v;
}
/* réponse tapée par l'élève ≈ valeur attendue ? (espaces et type de guillemets indifférents) */
function normaliserSaisie(s){
  return String(s).trim()
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/'/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*([[\](){},:;])\s*/g, "$1");
}

/* ---------------- erreurs JavaScript traduites ---------------- */
const nomCode = s => `\`${s}\``;
const TRADUCTIONS = [
  [/^(.+) is not defined$/, (m, ctx) => {
    const n = m[1];
    if (/^(prompt|alert|document|window|localStorage)$/.test(n)) return `${nomCode(n)} n'existe pas dans ce bac à sable : ici, on affiche avec console.log et on teste des fonctions.`;
    const proche = ctx?.noms?.find(x => x !== n && x.toLowerCase() === n.toLowerCase());
    return `Tu utilises ${nomCode(n)}, mais aucune variable ni fonction ne porte ce nom.${proche ? ` Tu voulais peut-être dire ${nomCode(proche)} ? Les majuscules comptent.` : " Vérifie l'orthographe (majuscules comprises)."} Si tu l'as créée dans une fonction, elle n'existe qu'entre les { } de cette fonction.`;
  }],
  [/Cannot access '(.+)' before initialization/, m => `Tu utilises ${nomCode(m[1])} avant la ligne qui la crée. En JavaScript, on crée d'abord (const / let), on utilise ensuite : déplace la déclaration plus haut.`],
  [/^(.+)\.(addEventListener|classList) is not a function$|^(.+)\.addEventListener is not a function$/, m => `addEventListener s'appelle sur UN élément (querySelector). Sur une collection (querySelectorAll), parcours-la avec forEach.`],
  [/^(.+)\.map is not a function$/, m => `${nomCode(".map()")} n'existe pas sur ${nomCode(m[1])}. Si c'est le résultat de querySelectorAll (une NodeList), convertis-la d'abord en tableau : [...collection]. Sinon, vérifie que c'est bien un tableau.`],
  [/^(.+)\.(\w+) is not a function$/, m => {
    const tab = ["map","filter","forEach","reduce","some","every","slice","toSorted","flatMap","find","findIndex","join","includes","with","toReversed","at","indexOf"];
    if (tab.includes(m[2])) return `${nomCode("." + m[2] + "()")} n'existe pas sur ${nomCode(m[1])} : ce n'est pas le type attendu (un tableau, une chaîne ?). Vérifie ce que contient ${nomCode(m[1])} à ce moment-là, et l'orthographe de la méthode.`;
    return `${nomCode(m[1] + "." + m[2])} n'est pas une fonction. Vérifie le nom de la méthode (majuscules comprises : toLowerCase, pas tolowercase) et le type de ${nomCode(m[1])}.`;
  }],
  [/^(.+) is not a function$/, m => `${nomCode(m[1])} n'est pas une fonction : on ne peut pas mettre des parenthèses après. Vérifie le nom, et que ce n'est pas un nombre, une chaîne ou un tableau.`],
  [/Cannot read properties of null \(reading '(addEventListener|classList|click|textContent|querySelector|querySelectorAll|cloneNode|replaceChildren|removeAttribute)'\)/, m => `querySelector n'a trouvé aucun élément (il a renvoyé null), donc ${nomCode("." + m[1])} est impossible. Vérifie le sélecteur : # pour un id, . pour une classe, et l'orthographe exacte (select-hearts…).`],
  [/Cannot read properties of undefined \(reading '(add|remove|toggle|contains)'\)/, m => `${nomCode(".classList." + m[1])} sur quelque chose qui n'a pas de classList : souvent une **collection** (querySelectorAll) au lieu d'un seul élément. Parcours la collection avec forEach et applique classList à chaque élément.`],
  [/Cannot read properties of (undefined|null) \(reading '(.+)'\)/, m => `Tu lis ${nomCode("." + m[2])} sur quelque chose qui vaut ${m[1]}. Causes fréquentes : un indice trop grand (le dernier indice est length - 1), une fonction qui ne retourne rien (il manque return), ou une variable mal nommée.`],
  [/Cannot set properties of (undefined|null) \(setting '(.+)'\)/, m => `Tu modifies ${nomCode("." + m[2])} sur quelque chose qui vaut ${m[1]}. Vérifie la variable placée avant le point.`],
  [/Assignment to constant variable/, () => `Tu modifies une variable créée avec const. Une const ne change jamais : utilise let si la valeur doit évoluer, ou crée une nouvelle variable.`],
  [/Cannot add property (.+), object is not extensible/, () => `Tu essaies d'ajouter un élément au tableau d'origine, qui est gelé (Object.freeze). Ne modifie pas l'original : fabrique un nouveau tableau (map, filter, slice, [...tab, x]…).`],
  [/Cannot assign to read only property '(.+)' of/, () => `Tu essaies de modifier le tableau (ou l'objet) d'origine, qui est gelé (Object.freeze). Des méthodes comme sort, reverse, push, splice modifient l'original : prends leur version non mutante (toSorted, toReversed, [...tab, x], toSpliced, with…).`],
  [/Cannot delete property '(.+)' of/, () => `Tu essaies de retirer un élément du tableau d'origine, qui est gelé (Object.freeze). Fabrique plutôt un nouveau tableau sans cet élément (slice, filter…).`],
  [/Reduce of empty array with no initial value/, () => `reduce sur un tableau vide, sans valeur de départ : le porte-monnaie n'a rien pour commencer. Ajoute la valeur de départ en deuxième argument (0 pour une somme, "" pour une chaîne).`],
  [/Maximum call stack size exceeded/, () => `Ta fonction s'appelle elle-même sans jamais s'arrêter.`],
  [/Invalid array length/, () => `Tu crées un tableau d'une longueur impossible (négative ou à virgule).`],
  [/(.+) is not iterable/, m => `${nomCode(m[1].replace(/^object /, ""))} n'est pas un tableau : on ne peut ni l'étaler avec ... ni le parcourir avec for…of.`],
  [/Identifier '(.+)' has already been declared/, m => `Tu crées deux fois ${nomCode(m[1])}. Une variable ne se déclare qu'une seule fois : la deuxième fois, enlève const / let (ou choisis un autre nom).`],
  [/Missing initializer in const declaration/, () => `Une const doit recevoir sa valeur dès sa création : const x = … ;`],
  [/Illegal return statement/, () => `return ne s'utilise qu'à l'intérieur d'une fonction. En dehors, il n'y a personne à qui « tendre le plat ».`],
  [/Invalid left-hand side in assignment/, () => `À gauche d'un = il faut un nom de variable. Pour comparer deux valeurs, utilise === (trois signes égal).`],
  [/missing \) after argument list/, () => `Il manque une parenthèse fermante ) dans un appel de fonction, ou une virgule entre deux arguments.`],
  [/Unexpected end of input/, () => `Le code s'arrête trop tôt : une ( , une [ ou une { n'est pas refermée.`],
  [/Unterminated template literal/, () => `Un accent grave \` n'est pas refermé.`],
  [/Unterminated string constant|Invalid or unexpected token/, () => `Caractère inattendu : un guillemet non refermé, ou un guillemet typographique (« » ’ “) au lieu de " ou '.`],
  [/Unexpected token '=>'/, () => `La flèche => est mal placée : les paramètres doivent être juste avant, entre parenthèses : (x) => …`],
  [/Unexpected token '(.+)'/, m => `Le symbole ${nomCode(m[1])} n'est pas à sa place. Souvent : une parenthèse ou une accolade en trop, ou une virgule oubliée juste avant.`],
  [/Unexpected identifier '(.+)'/, m => `Le mot ${nomCode(m[1])} arrive là où JavaScript ne l'attend pas : il manque sans doute une virgule, un opérateur, une parenthèse ou un point avant lui. Si c'est du texte, il faut des guillemets autour.`],
  [/Unexpected (string|number|identifier)/, m => `Une ${m[1] === "string" ? "chaîne" : m[1] === "number" ? "valeur numérique" : "valeur"} arrive là où JavaScript ne l'attend pas : il manque sans doute une virgule ou un opérateur juste avant.`],
  [/Unexpected strict mode reserved word|Unexpected reserved word/, () => `Un mot réservé de JavaScript est utilisé comme nom : choisis un autre nom.`],
  [/Unexpected eval or arguments/, () => `eval et arguments sont des noms réservés : choisis un autre nom de variable.`],
  [/Delete of an unqualified identifier/, () => `delete ne s'applique pas à une variable.`],
];
function traduireErreur(err, ctx){
  const msg = String(err && err.message || err);
  for (const [re, f] of TRADUCTIONS) { const m = msg.match(re); if (m) return f(m, ctx); }
  return `Erreur JavaScript : ${msg}`;
}
const NOM_ERREUR = { ReferenceError:"Nom inconnu", TypeError:"Mauvais type", SyntaxError:"Erreur de syntaxe", RangeError:"Valeur hors limites" };

/* parenthèses, crochets et accolades : où est le problème ? (complète les erreurs de syntaxe, qui n'ont pas de numéro de ligne) */
function verifierParentheses(code){
  const paires = { ")":"(", "]":"[", "}":"{" };
  const pile = []; let pos = 0;
  for (const j of jetons(code)) {
    if (j.t === "str" && (j.v.length < 2 || j.v.slice(-1) !== j.v[0])) return { ligne: ligneDe(code, pos), message: `La chaîne qui commence par ${j.v[0]} à la ligne ${ligneDe(code, pos)} n'est jamais refermée.` };
    if (j.t === "ponct" && "([{".includes(j.v)) pile.push({ c:j.v, pos });
    if (j.t === "ponct" && ")]}".includes(j.v)) {
      const o = pile.pop();
      if (!o) return { ligne: ligneDe(code, pos), message: `Ligne ${ligneDe(code, pos)} : ce ${j.v} ferme quelque chose qui n'a jamais été ouvert.` };
      if (o.c !== paires[j.v]) return { ligne: ligneDe(code, pos), message: `Ligne ${ligneDe(code, pos)} : ${j.v} ferme le ${o.c} ouvert ligne ${ligneDe(code, o.pos)}. Il manque un ${{"(":")","[":"]","{":"}"}[o.c]} avant.` };
    }
    if (j.t === "autre" && /[«»“”‘’]/.test(j.v)) return { ligne: ligneDe(code, pos), message: `Ligne ${ligneDe(code, pos)} : le guillemet typographique ${j.v} n'existe pas en JavaScript. Utilise " ou '.` };
    pos += j.v.length;
  }
  const o = pile.pop();
  if (o) return { ligne: ligneDe(code, o.pos), message: `Le ${o.c} ouvert à la ligne ${ligneDe(code, o.pos)} n'est jamais refermé.` };
  return null;
}

/* deux mots qui se suivent sans opérateur ni virgule (Bonjour ProgWeb) : presque toujours du texte oublié sans guillemets */
const MOTS_AVANT_NOM = new Set(["const","let","var","function","return","typeof","new","of","in","instanceof","else","await","async","case","throw","delete","void","class","extends","yield","import","export","from","do"]);
function texteSansGuillemets(code){
  const tous = jetons(code); let p2 = 0; const avecPos = tous.map(j => { const r = { ...j, pos:p2 }; p2 += j.v.length; return r; }).filter(j => j.t !== "ws" && j.t !== "com");
  for (let i = 0; i + 1 < avecPos.length; i++) {
    const a = avecPos[i], b = avecPos[i + 1];
    const motA = a.t === "id" || a.t === "fn" || a.t === "lit", motB = b.t === "id" || b.t === "fn" || b.t === "lit" || b.t === "kw";
    if (motA && motB && !MOTS_AVANT_NOM.has(a.v) && !MOTS_AVANT_NOM.has(b.v) && !(i > 0 && avecPos[i - 1].v === ".")) {
      let fin = i + 1; while (fin + 1 < avecPos.length && ["id","fn","lit","kw"].includes(avecPos[fin + 1].t) && !MOTS_AVANT_NOM.has(avecPos[fin + 1].v)) fin++;
      return { ligne: ligneDe(code, a.pos), texte: code.slice(a.pos, avecPos[fin].pos + avecPos[fin].v.length) };
    }
  }
  return null;
}

/* ---------------- analyse statique : méthodes interdites ou attendues, pièges classiques ---------------- */
const MUTANTES = ["push","pop","shift","unshift","splice","sort","reverse","fill","copyWithin"];
const LIBELLE_INTERDIT = {
  for: "boucle for", while: "boucle while", "=>": "fonction fléchée =>", function: "mot-clé function", if: "if", forEach: "forEach", "Math.max": "Math.max", join: "join",
};
function chercherUsage(nu, nom){
  if (nom === "=>") return /=>/.exec(nu);
  if (nom === "classList" || nom === "length") return new RegExp(`\\.\\s*${nom}\\b`).exec(nu);   // propriétés : pas de parenthèses
  if (nom === "function" || nom === "return" || nom === "if") return new RegExp(`\\b${nom}\\b`).exec(nu);
  if (nom === "for" || nom === "while") return new RegExp(`\\b${nom}\\s*\\(`).exec(nu);
  if (nom.endsWith("()")) return new RegExp(`(?<![.\\w])${nom.slice(0, -2)}\\s*\\(`).exec(nu);   // appel d'une fonction (pas d'une méthode) : "drawCards()"
  if (nom.includes(".")) return new RegExp(nom.replace(".", "\\s*\\.\\s*") + "\\b").exec(nu);
  return new RegExp(`\\.\\s*${nom}\\s*\\(`).exec(nu);
}
function analyseStatique(code, tests = {}, contexte = {}){
  const nu = codeNu(code);
  const bloquants = [], conseils = [];
  for (const nom of tests.interdit || []) {
    const m = chercherUsage(nu, nom);
    if (m) bloquants.push({ id:"interdit", ligne: ligneDe(code, m.index), message: MUTANTES.includes(nom)
      ? `Ligne ${ligneDe(code, m.index)} : ${nomCode(nom)} modifie le tableau d'origine (méthode mutante), c'est interdit ici. Fabrique un nouveau tableau.`
      : `Ligne ${ligneDe(code, m.index)} : pas de ${LIBELLE_INTERDIT[nom] || nomCode(nom)} dans cet exercice. Trouve une autre façon de faire.` });
  }
  for (const nom of tests.obligatoire || []) {
    if (!chercherUsage(nu, nom)) bloquants.push({ id:"obligatoire", message: nom === "=>" ? `Cet exercice s'entraîne avec les fonctions fléchées : écris tes fonctions avec =>.` : `Cet exercice s'entraîne avec ${nomCode(nom)} : ton code doit l'utiliser.` });
  }
  // paramètre de la fléchée qui porte le nom d'une boîte (tableau) : fruits.forEach((fruits) => …)
  const tableaux = new Set(contexte.tableaux || []);
  for (const m of nu.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*(?:Object\.freeze\(\s*)?\[/g)) tableaux.add(m[1]);
  const reParam = /\b(\w+)\s*\.\s*(map|filter|forEach|some|every|find|findIndex|flatMap|reduce|toSorted)\s*\(\s*(?:function\s*\w*\s*)?\(?\s*([\w\s,]*?)\s*\)?\s*(?:=>|\{)/g;
  for (const m of nu.matchAll(reParam)) {
    const params = m[3].split(",").map(s => s.trim()).filter(Boolean);
    const elem = m[2] === "reduce" ? params[1] : params[0];
    const l = ligneDe(code, m.index);
    if (elem && (elem === m[1] || (tableaux.has(elem) && elem !== m[1]))) {
      conseils.push({ id:"param-nom-tableau", ligne:l, message: `Ligne ${l} : le paramètre ${nomCode(elem)} porte le nom d'un tableau. ${nomCode(m[1])} est la boîte ; le paramètre, c'est UN œuf de la boîte : donne-lui un nom au singulier (${nomCode(singulier(m[1]))}).` });
    }
    if (m[2] === "reduce" && params.length === 1) conseils.push({ id:"reduce-un-param", ligne:l, message: `Ligne ${l} : la fonction de reduce reçoit deux paramètres, le porte-monnaie (acc) puis l'élément : (acc, n) => …` });
  }
  // == et != : comparaison « souple »
  for (const m of nu.matchAll(/[^=!<>]={2}(?!=)|!=(?!=)/g)) {
    const l = ligneDe(code, m.index + 1);
    conseils.push({ id:"egal-souple", ligne:l, message: `Ligne ${l} : préfère === et !== à == et != (qui transforment les types : 4 == "4" vaut true).` });
    break;
  }
  // tableau comparé avec === : deux boîtes différentes ne sont jamais égales
  const mt = /(===|!==|==|!=)\s*\[|\]\s*(===|!==|==|!=)/.exec(nu);
  if (mt) conseils.push({ id:"egalite-tableaux", ligne: ligneDe(code, mt.index), message: `Ligne ${ligneDe(code, mt.index)} : === entre deux tableaux compare les boîtes, pas leur contenu. Deux boîtes différentes ne sont jamais ===, même avec les mêmes œufs.` });
  // toSorted dans son propre comparateur
  const ms = /toSorted\s*\(\s*\([^)]*\)\s*=>[^;]*toSorted/.exec(nu);
  if (ms) conseils.push({ id:"tosorted-imbrique", ligne: ligneDe(code, ms.index), message: `Ligne ${ligneDe(code, ms.index)} : le comparateur de toSorted reçoit deux éléments (a, b) et retourne un nombre (a - b, ou a.localeCompare(b)). Pas besoin d'appeler toSorted à l'intérieur.` });
  // console.log(maFonction) sans parenthèses
  const fonctions = [...nu.matchAll(/\bfunction\s+(\w+)|\b(?:const|let)\s+(\w+)\s*=\s*(?:function\b|\([^)]*\)\s*=>|\w+\s*=>)/g)].map(m => m[1] || m[2]);
  for (const f of fonctions) {
    const mf = new RegExp(`console\\s*\\.\\s*log\\s*\\(\\s*${f}\\s*\\)`).exec(nu);
    if (mf) conseils.push({ id:"fonction-affichee", ligne: ligneDe(code, mf.index), message: `Ligne ${ligneDe(code, mf.index)} : console.log(${f}) affiche la recette (la fonction), pas le plat. Pour le résultat, appelle-la : console.log(${f}(…)).` });
  }
  // accolades après => sans return
  for (const m of nu.matchAll(/=>\s*\{/g)) {
    const debut = m.index + m[0].length; let prof = 1, i = debut;
    while (i < nu.length && prof) { if (nu[i] === "{") prof++; else if (nu[i] === "}") prof--; i++; }
    const corps = nu.slice(debut, i - 1);
    // seulement pour les fonctions dont on attend un résultat (map, filter, reduce…) : un écouteur d'événement n'a pas besoin de return
    const avant = nu.slice(Math.max(0, m.index - 120), m.index);
    const attendResultat = /\.\s*(map|filter|reduce|some|every|find|findIndex|flatMap|toSorted)\s*\(\s*(?:\([^()]*\)|\w+)\s*$/.test(avant);
    if (attendResultat && !/\breturn\b/.test(corps) && /\S/.test(corps) && !/^\s*\w+\s*:/.test(corps)) {
      const l = ligneDe(code, m.index);
      conseils.push({ id:"accolades-sans-return", ligne:l, message: `Ligne ${l} : avec des accolades après =>, la fonction ne retourne rien tant qu'il n'y a pas de return. Écris soit (x) => x * 2, soit (x) => { return x * 2; }.` });
    }
  }
  // objet retourné par une fléchée courte : (x) => { nom: x } ne fait pas un objet
  const mo = /=>\s*\{\s*\w+\s*:/.exec(nu);
  if (mo) conseils.push({ id:"objet-sans-parentheses", ligne: ligneDe(code, mo.index), message: `Ligne ${ligneDe(code, mo.index)} : pour retourner un objet avec une fléchée courte, entoure-le de parenthèses : (x) => ({ nom: x }). Sans elles, les { } sont lues comme le corps de la fonction.` });
  const ignores = tests.sansConseil || [];
  return { bloquants, conseils: conseils.filter(c => !ignores.includes(c.id)) };
}
function singulier(nom){
  const s = { numbers:"number", strings:"word", words:"word", fruits:"fruit", prix:"p", notes:"note", eleves:"eleve", circles:"circle", cards:"card", ranks:"rank", suits:"suit", values:"value", nombres:"nombre", mots:"mot", tshirts:"tshirt" }[nom];
  return s || (nom.length > 3 && nom.endsWith("s") ? nom.slice(0, -1) : "x");
}

/* ---------------- diagnostics : pourquoi ce cas de test échoue-t-il ? ---------------- */
function estTexteDeNombre(a, b){   // "13" au lieu de 13 (ou l'inverse), y compris dans un tableau ou un objet
  if (typeof a === "string" && typeof b === "number") return a.trim() !== "" && Number(a) === b;
  if (typeof a === "number" && typeof b === "string") return b.trim() !== "" && Number(b) === a;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.some((x, i) => estTexteDeNombre(x, b[i])) && a.every((x, i) => egal(x, b[i]) || estTexteDeNombre(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ks = Object.keys(b); return ks.length === Object.keys(a).length && ks.some(k => estTexteDeNombre(a[k], b[k])) && ks.every(k => egal(a[k], b[k]) || estTexteDeNombre(a[k], b[k]));
  }
  return false;
}
function diagnostiquer(cas, obtenu, logs, code, contexte){
  const att = cas.attendu, nu = codeNu(code);
  const entree = cas.args && cas.args.find(Array.isArray);
  const d = (id, message) => ({ id, message });
  if (obtenu === undefined && att !== undefined) {
    const logue = logs.some(l => l === formater(att) || normaliserSaisie(l) === normaliserSaisie(formater(att, 1)));
    if (logue) return d("return-vs-log", `Ta fonction MONTRE le résultat par la fenêtre (console.log) au lieu de le TENDRE (return). Le résultat s'affiche, mais celui qui appelle ta fonction ne reçoit rien (undefined). Remplace console.log(…) par return …`);
    if (/\.\s*forEach\s*\(/.test(nu) && Array.isArray(att)) return d("foreach-rien", `forEach parcourt la boîte mais ne fabrique rien : il retourne toujours undefined. Pour obtenir un nouveau tableau, c'est map (transformer) ou filter (garder certains éléments).`);
    if (/=>\s*\{/.test(nu)) return d("sans-return", `Ta fonction retourne undefined. Avec des accolades { }, il faut écrire return devant le résultat. Vérifie aussi que tu retournes bien le résultat de map / filter / reduce (return numbers.map(…)).`);
    return d("sans-return", `Ta fonction retourne undefined : il manque return devant le résultat. Une fonction sans return ne tend rien à celui qui l'appelle.`);
  }
  if (Array.isArray(obtenu) && obtenu.length && obtenu.every(x => x === undefined) && Array.isArray(att) && !att.includes(undefined))
    return d("fleche-sans-return", /=>\s*\{/.test(nu)
      ? `Ton tableau est rempli d'undefined : la fonction donnée à map ne retourne rien. Avec des accolades { }, il faut return : (n) => { return n * 2; }, ou plus court : (n) => n * 2.`
      : `Ton tableau est rempli d'undefined : la fonction donnée à map ne retourne rien pour chaque élément.`);
  if (estTexteDeNombre(obtenu, att)) return d("texte-vs-nombre", typeof att === "number" || (Array.isArray(att) && att.some(x => typeof x === "number"))
    ? `Tu obtiens du TEXTE (entre guillemets, comme "13") là où on attend un NOMBRE (13, sans guillemets). Enlève les guillemets, ou vérifie que tu ne colles pas des chaînes.`
    : `Tu obtiens un NOMBRE là où on attend du TEXTE (entre guillemets).`);
  if (Array.isArray(obtenu) && Array.isArray(att) && obtenu.some(Array.isArray) && !att.some(Array.isArray) && egal(obtenu.flat(), att))
    return d("oublie-spread", `Les œufs sont restés dans leur boîte : tu as mis un tableau DANS le tableau. Pour sortir les œufs de la boîte, utilise le spread : [...tab, x] (ou flatMap au lieu de map).`);
  if (Array.isArray(obtenu) && obtenu.length && obtenu.every(x => typeof x === "boolean") && Array.isArray(att) && !att.every(x => typeof x === "boolean"))
    return d("map-condition", `Tu obtiens des true / false : c'est ce que fait map avec une condition (il transforme chaque œuf en réponse à la question). Pour GARDER les éléments qui répondent oui, c'est filter.`);
  if (entree && Array.isArray(obtenu) && Array.isArray(att) && att.length !== entree.length && obtenu.length === entree.length && /\.\s*map\s*\(/.test(nu))
    return d("map-longueur", `map garde toujours la même longueur : ${entree.length} œufs entrent, ${entree.length} œufs sortent. Pour en garder seulement certains, c'est filter.`);
  if (entree && Array.isArray(obtenu) && Array.isArray(att) && att.length === entree.length && obtenu.length < entree.length && att.some(x => !entree.some(e => egal(e, x))) && /\.\s*filter\s*\(/.test(nu))
    return d("filter-transforme", `filter garde ou jette des éléments, il ne les transforme pas. Pour transformer chaque élément (même longueur), c'est map.`);
  if (typeof att === "string" && typeof obtenu === "string" && obtenu.length > att.length && obtenu.endsWith(att) && /\.\s*reduce\s*\(/.test(nu))
    return d("depart-texte", `Ton résultat commence par ${nomCode(obtenu.slice(0, obtenu.length - att.length))} en trop : c'est la valeur de départ du reduce. Pour coller des textes, le porte-monnaie commence vide : "" (une chaîne vide).`);
  if (typeof att === "number" && att < 0 && obtenu === 0 && /\.\s*reduce\s*\(/.test(nu))
    return d("depart-zero", `Ton porte-monnaie commence à 0 : avec uniquement des nombres négatifs, 0 reste toujours le plus grand. Pour un maximum, démarre avec le premier élément (sans valeur de départ, ou avec numbers[0]).`);
  if (contexte && contexte.reussiCours && cas.index > 0 && "attenduCours" in contexte && egal(obtenu, contexte.attenduCours) && !egal(att, contexte.attenduCours))
    return d("donnees-en-dur", `Ta solution marche avec les données du cours, mais pas avec d'autres. As-tu utilisé la variable du cours (comme numbers) au lieu du paramètre de la fonction, ou écrit une partie du résultat à la main ?`);
  if (typeof obtenu === "function") return d("fonction-retournee", `Ta fonction retourne une fonction au lieu d'un résultat. Il manque sans doute des parenthèses d'appel quelque part : maFonction(…).`);
  if (entree && entree.length === 0) return d("tableau-vide", `Pense au tableau vide [] : ta solution doit aussi fonctionner sans aucun élément.`);
  return null;
}

/* ---------------- exécution (dans le worker) ---------------- */
/* entête : les données du cours, déclarées avant le code de l'élève (const numbers = Object.freeze([…]);) */
function enteteDonnees(donnees){
  if (!donnees) return "";
  return Object.entries(donnees).map(([k, v]) => `const ${k} = __donnees[${JSON.stringify(k)}];`).join("\n");
}
/* code « déjà écrit » exécuté avant celui de l'élève (constantes du cours, fonction d'un boss précédent) */
let PRELUDE = "";
/* exécute code (+ entête) une fois ; renvoie { lire(nom), logs, erreur } */
function lancer(code, donnees){
  const logs = [];
  let cible = logs;
  const ecrire = (genre) => (...args) => { if (cible.length < 400) cible.push(args.length ? args.map((a, i) => formater(a, 0)).join(" ") : ""); if (genre === "error") cible.err = true; };
  const faux = { log: ecrire("log"), info: ecrire("log"), warn: ecrire("warn"), error: ecrire("error"), table: ecrire("log"), debug: ecrire("log") };
  const entete = enteteDonnees(donnees);
  const corps = `"use strict";\n${entete ? entete + "\n" : ""}${PRELUDE ? PRELUDE + "\n" : ""}${code}\n;return (__n) => eval(__n);`;
  const don = donnees ? Object.fromEntries(Object.entries(donnees).map(([k, v]) => [k, gelProfond(copieProfonde(v))])) : {};
  let lire = null, erreur = null;
  try {
    const f = new Function("console", "__donnees", corps);
    lire = f(faux, don);
  } catch(e) { erreur = e; }
  return { lire, logs, erreur, don, rediriger(t){ cible = t; }, entete };
}
/* numéro de ligne (dans le code de l'élève) d'une erreur levée à l'exécution */
function ligneErreur(err, decalage){
  const pile = String(err && err.stack || "");
  const m = pile.match(/<anonymous>:(\d+):(\d+)/) || pile.match(/Function:(\d+):(\d+)/) || pile.match(/eval.*?:(\d+):(\d+)/);
  if (!m) return null;
  const l = +m[1] - decalage;
  return l >= 1 ? l : null;
}
function decrireErreur(err, code, donnees){
  const decalage = 3 + (donnees ? Object.keys(donnees).length : 0) + (PRELUDE ? PRELUDE.split("\n").length : 0);   // « function anonymous(…) { », ligne vide, "use strict", entête, prélude
  const ctx = { noms: [...new Set(jetons(code).filter(j => j.t === "id" || j.t === "fn").map(j => j.v))].concat(donnees ? Object.keys(donnees) : []) };
  let ligne = err && err.name === "SyntaxError" ? null : ligneErreur(err, decalage);
  let message = traduireErreur(err, ctx);
  if (err && err.name === "SyntaxError") {
    const p = verifierParentheses(code);
    const t = texteSansGuillemets(code);
    if (t) { message = `Ligne ${t.ligne} : on dirait du texte sans guillemets (${nomCode(t.texte)}). Un texte s'écrit entre guillemets : ${nomCode('"' + t.texte + '"')}. (Si ce sont deux valeurs différentes, il manque une virgule ou un opérateur entre elles.)`; ligne = t.ligne; }
    else if (p) { message = p.message; ligne = p.ligne; }
  }
  return { type: err && err.name || "Error", titre: NOM_ERREUR[err && err.name] || "Erreur", original: String(err && err.message || err), message, ligne };
}

/* executerTout({ code, donnees, tests, contexte }) : lance le code, puis chaque cas de test */
function executerTout({ code, donnees, prelude, tests, contexte = {} }){
  const t0 = Date.now();
  PRELUDE = prelude || "";
  const res = { ok:false, console:[], erreur:null, cas:[], diagnostics:[], conseils:[], duree:0 };
  const libre = lancer(code, donnees);
  res.console = libre.logs;
  if (libre.erreur) { res.erreur = decrireErreur(libre.erreur, code, donnees); res.duree = Date.now() - t0; return res; }
  // conseils sur les sorties de console : une fonction affichée au lieu d'être appelée
  if (libre.logs.some(l => /^\[Function/.test(l))) res.conseils.push({ id:"fonction-affichee", message: `Ta console affiche [Function: …] : tu as affiché la fonction (la recette) au lieu de son résultat (le plat). Ajoute les parenthèses d'appel : console.log(maFonction(…)).` });
  if (!tests) { res.ok = true; res.duree = Date.now() - t0; return res; }
  const st = analyseStatique(code, tests, contexte);
  res.conseils.push(...st.conseils.filter(c => !res.conseils.some(x => x.id === c.id)));
  const casListe = tests.cas || [];
  let reussiCours = false;
  casListe.forEach((cas, index) => {
    const r = { titre: cas.titre || (index === 0 ? "Données du cours" : `Autres données (${index})`), ok:true, details:[] };
    const don = cas.donnees || donnees;
    const run = index === 0 && !cas.donnees ? libre : lancer(code, don);
    if (run.erreur) { r.ok = false; r.erreur = decrireErreur(run.erreur, code, don); res.cas.push(r); return; }
    const nomFn = cas.fonction || tests.fonction;
    if (nomFn) {
      let fn; try { fn = run.lire(`typeof ${nomFn} === "function" ? ${nomFn} : undefined`); } catch(e) { fn = undefined; }
      if (typeof fn !== "function") {
        const proches = jetons(code).filter(j => (j.t === "fn" || j.t === "id") && j.v.toLowerCase() === nomFn.toLowerCase() && j.v !== nomFn).map(j => j.v);
        r.ok = false; r.erreur = { titre:"Fonction introuvable", message: `Je ne trouve pas de fonction nommée ${nomCode(nomFn)}.${proches.length ? ` Tu l'as écrite ${nomCode(proches[0])} : les majuscules comptent.` : " Garde exactement ce nom, il sert aux tests."}` };
        res.cas.push(r); return;
      }
      // argsCode : arguments écrits en JavaScript, évalués dans le code de l'élève (ex. "[square, 2]" pour passer une fonction)
      let args;
      if (cas.argsCode) { try { args = run.lire(cas.argsCode); } catch(e) { r.ok = false; r.erreur = decrireErreur(e, code, don); res.cas.push(r); return; } }
      else { args = copieProfonde(cas.args || []); if (!cas.modifiable) gelProfond(args); }   // "modifiable": la fonction a le droit de modifier son argument (shuffleInPlace)
      if (cas.melange) {   // mélange équitable ? on compte les ordres obtenus sur de nombreux essais
        const { tableau, essais = 24000, tolerance = 0.06 } = cas.melange;   // 3 éléments × 24 000 essais : un mélange naïf (j entre 0 et la fin) s’écarte de 11 %, le hasard de moins de 4 % ; pour 4 éléments, 96 000 essais
        const compte = new Map(); let faute = null;
        for (let k = 0; k < essais && !faute; k++) {
          const t = tableau.slice();
          try { fn(t); } catch(e) { r.erreur = decrireErreur(e, code, don); r.ok = false; break; }
          if (t.length !== tableau.length || [...t].sort().join() !== [...tableau].sort().join()) faute = `Après le mélange, le tableau ne contient plus les mêmes éléments (${enCode(t)}). Un mélange échange des éléments, il n'en ajoute ni n'en retire.`;
          const cle = t.join(","); compte.set(cle, (compte.get(cle) || 0) + 1);
        }
        const fact = n => n <= 1 ? 1 : n * fact(n - 1), nbOrdres = fact(tableau.length), moyen = essais / nbOrdres;
        if (!r.erreur && !faute) {
          if (compte.size === 1 && compte.has(tableau.join(","))) faute = `Le tableau reçu n'est jamais mélangé. La fonction doit le modifier **sur place** (échanger ses éléments), pas en fabriquer un autre.`;
          else if (compte.size < nbOrdres) faute = `Sur ${essais} mélanges de ${enCode(tableau)}, seulement ${compte.size} ordres différents sur ${nbOrdres} possibles apparaissent. Pour chaque i (du dernier jusqu'à 1), j doit pouvoir valoir n'importe quel indice de 0 à i **compris** : Math.floor(Math.random() * (i + 1)).`;
          else if ([...compte.values()].some(v => Math.abs(v - moyen) > tolerance * moyen)) faute = `Le mélange n'est pas équitable : sur ${essais} essais, certains ordres sortent bien plus souvent que d'autres (attendu : environ ${Math.round(moyen)} fois chacun). Avec Fisher–Yates, j est tiré entre 0 et i, pas entre 0 et la fin du tableau.`;
        }
        if (faute) { r.ok = false; r.details.push(faute); }
        r.appel = `${nomFn}(${enCode(tableau)}) × ${essais}`;
        res.cas.push(r); return;
      }
      const logsAppel = []; run.rediriger(logsAppel);
      if (cas.repetitions) {   // fonction au hasard : propriétés sur de nombreux tirages
        const vus = new Set(); let faute = null;
        const verif = cas.verifie ? new Function("r", "args", `"use strict"; return (${cas.verifie});`) : null;
        for (let k = 0; k < cas.repetitions && !faute; k++) {
          let v; try { v = fn(...args); } catch(e) { r.erreur = decrireErreur(e, code, don); r.ok = false; break; }
          if (verif) { let bon = false; try { bon = verif(v, args); } catch(e) {} if (!bon) faute = `${cas.messageVerifie || "Résultat inattendu"} (obtenu : ${formater(v, 1)}).`; continue; }
          if (typeof v !== "number" || Number.isNaN(v)) faute = `Un tirage a donné ${formater(v, 1)} au lieu d'un nombre.`;
          else if (cas.entier && !Number.isInteger(v)) faute = `Un tirage a donné ${v}, qui n'est pas un nombre entier : pense à Math.floor.`;
          else if (v < cas.min || v > cas.max) faute = `Un tirage a donné ${v}, hors des bornes ${cas.min} à ${cas.max} (comprises). Vérifie le calcul : Math.floor(Math.random() * (max - min + 1)) + min.`;
          vus.add(v);
        }
        if (!r.erreur && !faute && cas.tous) { const manquants = []; for (let x = cas.min; x <= cas.max; x++) if (!vus.has(x)) manquants.push(x); if (manquants.length) faute = `Sur ${cas.repetitions} tirages, ${manquants.join(", ")} ne sort${manquants.length > 1 ? "ent" : ""} jamais. Les bornes doivent être comprises : multiplie par (max - min + 1).`; }
        if (faute) { r.ok = false; r.details.push(faute); }
        r.appel = `${nomFn}(${args.map(a => enCode(a)).join(", ")}) × ${cas.repetitions}`;
        res.cas.push(r); return;
      }
      let obtenu;
      try { obtenu = fn(...args); if (cas.puis) { if (typeof obtenu !== "function") throw new TypeError(`${nomFn}(…) is not a function`); obtenu = obtenu(...cas.puis); } }
      catch(e) { r.ok = false; r.erreur = decrireErreur(e, code, don); r.appel = `${nomFn}(${args.map(a => enCode(a)).join(", ")})`; res.cas.push(r); return; }
      r.appel = cas.appel || `${nomFn}(${cas.argsCode ? cas.argsCode.replace(/^\[|\]$/g, "") : (cas.args || []).map(a => enCode(a)).join(", ")})${cas.puis ? `(${cas.puis.map(a => enCode(a)).join(", ")})` : ""}`;
      if ("attendu" in cas || cas.attenduUndefined) {   // JSON ne sait pas écrire undefined : "attenduUndefined": true
        const att = cas.attenduUndefined ? undefined : cas.attendu;
        r.attendu = enCode(att); r.obtenu = enCode(obtenu);
        if (!egal(obtenu, att)) { r.ok = false; const dg = diagnostiquer({ ...cas, attendu: att, index }, obtenu, logsAppel, code, { reussiCours, ...(casListe[0] && "attendu" in casListe[0] && (casListe[0].fonction || tests.fonction) === nomFn ? { attenduCours: casListe[0].attendu } : {}) }); if (dg) r.diagnostic = dg; }
      }
      if (cas.verifie) {   // propriété du résultat (fonctions au hasard) : expression JavaScript sur r et args
        let bon = false; try { bon = new Function("r", "args", `"use strict"; return (${cas.verifie});`)(obtenu, args); } catch(e) {}
        r.obtenu = enCode(obtenu);
        if (!bon) { r.ok = false; r.details.push(`${cas.messageVerifie || "Le résultat ne respecte pas ce qui est demandé"} (obtenu : ${enCode(obtenu)}).`); if (obtenu === undefined) { const dg = diagnostiquer({ ...cas, attendu: 0, index }, obtenu, logsAppel, code, {}); if (dg) r.diagnostic = dg; } }
      }
      if (cas.sortie) {
        r.sortieAttendue = cas.sortie; r.sortieObtenue = logsAppel.slice();
        if (!egal(logsAppel.map(s => s.trimEnd()), cas.sortie)) {
          r.ok = false;
          if (logsAppel.length === 1 && cas.sortie.length > 1 && normaliserSaisie(logsAppel[0]) === normaliserSaisie(enCode(cas.args && cas.args[0])))
            r.diagnostic = { id:"boite-entiere", message: `Tu as affiché la boîte entière d'un coup. On veut chaque œuf sur sa propre ligne : parcours le tableau (forEach) et affiche chaque élément.` };
          else if (!logsAppel.length && cas.sortie.length && obtenu !== undefined) r.diagnostic = { id:"log-vs-return", message: `Ta fonction retourne ${formater(obtenu, 1).length > 40 ? "un résultat" : formater(obtenu, 1)} mais n'affiche rien. Ici, on demande d'AFFICHER : console.log(…) à l'intérieur de la fonction, au lieu de return.` };
          else if (!logsAppel.length && cas.sortie.length) r.diagnostic = { id:"rien-affiche", message: `Ta fonction n'affiche rien. Pour afficher, c'est console.log(…).` };
        }
      }
      if (index === 0 && r.ok) reussiCours = true;
    } else {
      // mode script : on lit des variables, on compare la sortie console
      if (cas.repetitions && cas.variable) {   // valeur tirée au hasard : on relance le programme de nombreuses fois
        const vus = new Set(); let faute = null;
        for (let k = 0; k < cas.repetitions && !faute; k++) {
          const rk = k === 0 ? run : lancer(code, don);
          if (rk.erreur) { r.erreur = decrireErreur(rk.erreur, code, don); r.ok = false; break; }
          let v; try { v = rk.lire(cas.variable); } catch(e) { faute = `La variable ${nomCode(cas.variable)} n'existe pas.`; break; }
          if (typeof v !== "number" || Number.isNaN(v)) faute = `${nomCode(cas.variable)} vaut ${formater(v, 1)} au lieu d'un nombre.`;
          else if (cas.entier && !Number.isInteger(v)) faute = `Un tirage a donné ${v}, qui n'est pas un entier : pense à Math.floor.`;
          else if (v < cas.min || v > cas.max) faute = `Un tirage a donné ${v}, hors des bornes ${cas.min} à ${cas.max} (comprises).`;
          vus.add(v);
        }
        if (!r.erreur && !faute && cas.tous) { const manquants = []; for (let x = cas.min; x <= cas.max; x++) if (!vus.has(x)) manquants.push(x); if (manquants.length) faute = `Sur ${cas.repetitions} essais, ${manquants.join(", ")} ne sort${manquants.length > 1 ? "ent" : ""} jamais.`; }
        if (faute) { r.ok = false; r.details.push(faute); }
        res.cas.push(r); return;
      }
      for (const [nom, val] of Object.entries(cas.variables || {})) {
        let v, existe = true;
        try { v = run.lire(nom); } catch(e) { existe = false; }
        if (!existe) { r.ok = false; r.details.push(`La variable ${nomCode(nom)} n'existe pas. Crée-la avec exactement ce nom : const ${nom} = …;`); continue; }
        if (!egal(v, val)) {
          r.ok = false;
          r.details.push(`${nomCode(nom)} vaut ${enCode(v)}, on attend ${enCode(val)}.`);
          if (estTexteDeNombre(v, val)) r.diagnostic = { id:"texte-vs-nombre", message: typeof val === "number" ? `${nomCode(nom)} contient du TEXTE ("…" entre guillemets) au lieu d'un NOMBRE. Enlève les guillemets.` : `${nomCode(nom)} contient un NOMBRE au lieu de TEXTE : mets la valeur entre guillemets.` };
          else if (Array.isArray(v) && Array.isArray(val) && v.some(Array.isArray) && egal(v.flat(), val)) r.diagnostic = { id:"oublie-spread", message: `Les œufs sont restés dans leur boîte : il manque le spread ... pour sortir les éléments du tableau.` };
        }
      }
      if (cas.sortie) {
        r.sortieAttendue = cas.sortie; r.sortieObtenue = run.logs.slice();
        if (!egal(run.logs.map(s => s.trimEnd()), cas.sortie)) {
          r.ok = false;
          if (!run.logs.length) r.diagnostic = { id:"rien-affiche", message: `Rien ne s'affiche. Pour afficher dans la console, c'est console.log(…).` };
          else if (run.logs.length === cas.sortie.length && run.logs.every((l, i) => normaliserSaisie(l) === normaliserSaisie(cas.sortie[i]))) r.diagnostic = { id:"espaces", message: `Presque : seuls des espaces ou des guillemets diffèrent. Compare caractère par caractère.` };
          else if (run.logs.some(l => /^\[Function/.test(l))) r.diagnostic = { id:"fonction-affichee", message: `Tu affiches la fonction elle-même ([Function: …]) au lieu de son résultat : ajoute les parenthèses d'appel.` };
        }
      }
    }
    res.cas.push(r);
  });
  if (st.bloquants.length) res.diagnostics.push(...st.bloquants);
  // premier diagnostic utile : celui du premier cas raté
  // le message le plus précis : un diagnostic automatique spécifique, sinon le « siEchec » du contenu, sinon un diagnostic générique
  const GENERIQUES = ["rien-affiche", "tableau-vide", "donnees-en-dur", "espaces"];
  const rates = res.cas.filter(c => !c.ok);
  const specifique = rates.find(c => c.diagnostic && !GENERIQUES.includes(c.diagnostic.id));
  const iSiEchec = res.cas.findIndex((c, i) => !c.ok && !c.erreur && casListe[i]?.siEchec);
  const rate = specifique || rates.find(c => c.diagnostic) || rates[0];
  if (specifique) res.diagnostics.push(specifique.diagnostic);
  else if (iSiEchec >= 0) res.diagnostics.push({ id:"contenu", message: casListe[iSiEchec].siEchec });
  else if (rate && rate.diagnostic) res.diagnostics.push(rate.diagnostic);
  // pas de diagnostic précis : un conseil de l'analyse statique explique peut-être l'échec
  if (rate && !res.diagnostics.length && !rate.erreur) { const c = res.conseils.find(x => ["accolades-sans-return","objet-sans-parentheses","param-nom-tableau","reduce-un-param","tosorted-imbrique","egalite-tableaux"].includes(x.id)); if (c) res.diagnostics.push(c); }
  if (rate && !res.diagnostics.length && rate.titre && /vide/i.test(rate.titre)) res.diagnostics.push({ id:"tableau-vide", message: `Ta solution ne marche pas avec un tableau vide []. Pense à ce cas : que doit-on obtenir s'il n'y a aucun élément ?` });
  res.ok = res.cas.every(c => c.ok) && !st.bloquants.length;
  res.duree = Date.now() - t0;
  return res;
}

if (typeof module !== "undefined") module.exports = { jetons, codeNu, formater, enCode, egal, normaliserSaisie, traduireErreur, verifierParentheses, analyseStatique, executerTout };
