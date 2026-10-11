"use strict";
/* =====================================================================
   Moteur de cours — module « code-php » : exécuter et tester du PHP dans le navigateur.
   PHP 8.3 compilé en WebAssembly (js/vendor/php-wasm/, reconstruit par tools/php-wasm/construire.sh)
   tourne dans un Web Worker qui reste vivant (démarrer PHP prend 1 à 3 s) ; chaque exécution est une
   requête PHP neuve, avec un système de fichiers neuf (/app : le code de l'élève, /pw : le harnais).
   Le harnais PHP (PHP_HARNAIS) simule la requête HTTP ($_GET, $_POST, $_COOKIE, session), exécute le
   code de l'élève, puis le code du cas de test, et renvoie en JSON : sorties, erreurs, avertissements,
   en-têtes (cookies, redirection), session, valeur retournée.
   executerPhp() renvoie le même format que executerTout (banc.js) : { ok, console, erreur, cas, diagnostics, conseils }.
   ===================================================================== */

/* ---------------- découpage en jetons du PHP (coloration, pointer, analyse) ---------------- */
const PHP_MOTS_CLES = new Set(["abstract","and","as","break","case","catch","class","clone","const","continue","declare","default","do","echo","else","elseif","empty","enddeclare","endfor","endforeach","endif","endswitch","endwhile","enum","exit","die","extends","final","finally","fn","for","foreach","function","global","goto","if","implements","include","include_once","instanceof","insteadof","interface","isset","list","match","namespace","new","or","print","private","protected","public","readonly","require","require_once","return","static","switch","throw","trait","try","unset","use","var","while","xor","yield","self","parent","array","int","float","string","bool","void","mixed","object","iterable","callable","never"]);
const PHP_LITTERAUX = new Set(["true","false","null"]);
const RE_PHP = /(\/\/[^\n]*|#(?!\[)[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\]|\\[\s\S])*"?|'(?:[^'\\]|\\[\s\S])*'?)|(\?>\n?)|(\$\$?[A-Za-z_\x80-\uffff][\w\x80-\uffff]*)|(\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?|\.\d+)|(\\?[A-Za-z_\x80-\uffff][\w\x80-\uffff]*(?:\\[A-Za-z_\x80-\uffff][\w\x80-\uffff]*)*\\?)|(\s+)|(<=>|\?->|->|=>|::|\.\.\.|\?\?=|\?\?|===|!==|==|!=|<>|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|\.=|%=|\*\*|[-+*/%<>=!?:&|^~.@])|([()[\]{};,])|([\s\S])/g;
const RE_HTML = /(<!--[\s\S]*?(?:-->|$))|(<\/?[A-Za-z][^>]*>?|<!DOCTYPE[^>]*>?)|([^<]+|<)/gi;
/* le code commence en mode HTML s'il contient une balise <?php ou <?= ; sinon c'est du PHP pur (extrait de code) */
function jetonsPhp(code){
  const out = [];
  let mode = /<\?(php|=)/i.test(code) ? "html" : "php", pos = 0;
  while (pos < code.length) {
    if (mode === "html") {
      const m = /<\?(php\b|=)?/i.exec(code.slice(pos));
      const fin = m ? pos + m.index : code.length;
      const html = code.slice(pos, fin); let h; RE_HTML.lastIndex = 0;
      while ((h = RE_HTML.exec(html))) out.push({ t: h[1] ? "com" : h[2] ? "tag" : /^\s+$/.test(h[0]) ? "ws" : "html", v: h[0] });
      if (!m) break;
      out.push({ t:"kw", v: m[0] }); pos = fin + m[0].length; mode = "php"; continue;
    }
    RE_PHP.lastIndex = pos;
    const m = RE_PHP.exec(code);
    if (!m) break;
    const v = m[0]; pos += v.length;
    if (m[1]) out.push({ t:"com", v });
    else if (m[2]) out.push({ t:"str", v });
    else if (m[3]) { out.push({ t:"kw", v:"?>" }); if (v.length > 2) out.push({ t:"ws", v:"\n" }); mode = "html"; }
    else if (m[4]) out.push({ t:"var", v });
    else if (m[5]) out.push({ t:"num", v });
    else if (m[6]) { const b = v.toLowerCase(); out.push({ t: PHP_MOTS_CLES.has(b) ? "kw" : PHP_LITTERAUX.has(b) ? "lit" : "id", v }); }
    else if (m[7]) out.push({ t:"ws", v });
    else if (m[8]) out.push({ t:"op", v });
    else if (m[9]) out.push({ t:"ponct", v });
    else out.push({ t:"autre", v });
  }
  // nom de fonction ou de méthode (suivi d'une parenthèse), attribut (après -> ou ::)
  for (let i = 0; i < out.length; i++) {
    if (out[i].t !== "id") continue;
    let p = i - 1; while (p >= 0 && out[p].t === "ws") p--;
    let n = i + 1; while (n < out.length && out[n].t === "ws") n++;
    const apresFleche = p >= 0 && (out[p].v === "->" || out[p].v === "?->" || out[p].v === "::");
    const appel = n < out.length && out[n].v === "(";
    const avantNew = p >= 0 && /^(new|class|extends|implements|interface|trait|instanceof|use|namespace|enum)$/i.test(out[p].v);
    out[i].t = avantNew ? "id" : appel ? "fn" : apresFleche ? "prop" : "id";
    if (apresFleche) out[i].prop = true;
  }
  return out;
}

/* ---------------- le harnais PHP ---------------- */
const PHP_HARNAIS = String.raw`<?php
function __pw_exporter($v, $prof = 0) {
    if (is_float($v) && (is_nan($v) || is_infinite($v))) return ['__float' => (string) $v];
    if (is_array($v)) {
        if ($prof > 6) return ['__tronque' => true];
        $o = [];
        foreach ($v as $k => $x) $o[$k] = __pw_exporter($x, $prof + 1);
        return $o;
    }
    if ($v instanceof Closure) return ['__objet' => 'Closure'];
    if (is_object($v)) {
        $o = ['__objet' => get_class($v)];
        if ($prof > 4) return $o;
        $props = [];
        try {
            foreach ((new ReflectionObject($v))->getProperties() as $p) {
                if ($p->isStatic()) continue;
                $p->setAccessible(true);
                if (!$p->isInitialized($v)) continue;
                $props[$p->getName()] = __pw_exporter($p->getValue($v), $prof + 1);
            }
        } catch (Throwable $e) {}
        $o['props'] = (object) $props;
        return $o;
    }
    if (is_resource($v)) return ['__objet' => 'ressource'];
    return $v;
}
$GLOBALS['__pw'] = ['avert' => [], 'phase' => 'eleve', 'sorties' => ['eleve' => '', 'cas' => ''], 'exception' => null, 'resultat' => null, 'aResultat' => false,
    'req' => json_decode(file_get_contents('/pw/requete.json'), true) ?: []];
error_reporting(E_ALL);
ini_set('display_errors', '0');
set_error_handler(function ($no, $msg, $file, $line) {
    if (!(error_reporting() & $no)) return false;
    if (count($GLOBALS['__pw']['avert']) < 30) $GLOBALS['__pw']['avert'][] = ['no' => $no, 'message' => $msg, 'fichier' => $file, 'ligne' => $line, 'phase' => $GLOBALS['__pw']['phase']];
    return true;
});
set_exception_handler(function (Throwable $e) {
    $GLOBALS['__pw']['exception'] = ['classe' => get_class($e), 'message' => $e->getMessage(), 'fichier' => $e->getFile(), 'ligne' => $e->getLine(), 'phase' => $GLOBALS['__pw']['phase']];
});
register_shutdown_function(function () {
    $pw = &$GLOBALS['__pw'];
    $s = '';
    while (ob_get_level() > 0) $s = ob_get_clean() . $s;
    $pw['sorties'][$pw['phase']] .= $s;
    $err = error_get_last();
    $fatal = $err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR]) ? ['classe' => 'Fatal', 'message' => $err['message'], 'fichier' => $err['file'], 'ligne' => $err['line'], 'phase' => $pw['phase']] : null;
    $vars = [];
    foreach ($pw['req']['variables'] ?? [] as $n) $vars[$n] = array_key_exists($n, $GLOBALS) ? __pw_exporter($GLOBALS[$n]) : ['__absente' => true];
    echo "\x01PW\x01" . json_encode([
        'sorties' => $pw['sorties'], 'avert' => $pw['avert'], 'exception' => $pw['exception'] ?? $fatal,
        'entetes' => headers_list(), 'statut' => http_response_code(),
        'session' => session_status() === PHP_SESSION_ACTIVE ? __pw_exporter($_SESSION) : null,
        // session d'origine jamais ouverte ni détruite : ses données restent sur le serveur
        'sessionRestante' => session_status() !== PHP_SESSION_ACTIVE && isset($pw['req']['session']) && @filesize(rtrim(session_save_path() ?: sys_get_temp_dir(), '/') . '/sess_pwtest') > 0,
        'resultat' => $pw['aResultat'] ? __pw_exporter($pw['resultat']) : null, 'aResultat' => $pw['aResultat'], 'variables' => (object) $vars, 'phase' => $pw['phase'],
    ], JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRESERVE_ZERO_FRACTION) . "\x02";
    // ce qui s'affiche après ce marqueur vient des destructeurs appelés en fin de script (après les fonctions d'arrêt)
});
$__r = $GLOBALS['__pw']['req'];
$_GET = $__r['get'] ?? []; $_POST = $__r['post'] ?? []; $_COOKIE = $__r['cookies'] ?? []; $_REQUEST = array_merge($_GET, $_POST);
$_SERVER['REQUEST_METHOD'] = $__r['methode'] ?? 'GET';
$_SERVER['PHP_SELF'] = $_SERVER['SCRIPT_NAME'] = $_SERVER['REQUEST_URI'] = '/' . $__r['fichier'];
foreach ($__r['entetes'] ?? [] as $__k => $__v) $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $__k))] = $__v;
if (isset($__r['session'])) {
    session_id('pwtest'); session_start(); $_SESSION = $__r['session']; session_write_close(); $_SESSION = [];
    $_COOKIE[session_name()] = 'pwtest';
    header_remove();
}
ob_start();
if (file_exists('/pw/donnees.php')) require '/pw/donnees.php';
if (file_exists('/pw/prelude.php')) require '/pw/prelude.php';
chdir(dirname('/app/' . $__r['fichier']));
unset($__r, $__k, $__v);
require '/app/' . $GLOBALS['__pw']['req']['fichier'];
$GLOBALS['__pw']['sorties']['eleve'] .= ob_get_clean();
if (file_exists('/pw/cas.php')) {
    $GLOBALS['__pw']['phase'] = 'cas';
    ob_start();
    $GLOBALS['__pw']['resultat'] = require '/pw/cas.php';
    $GLOBALS['__pw']['aResultat'] = true;
    $GLOBALS['__pw']['sorties']['cas'] .= ob_get_clean();
}
`;

/* ---------------- le Web Worker (un seul, gardé vivant ; une exécution à la fois) ---------------- */
const PHP_DOSSIER = "js/vendor/php-wasm/";
const DELAI_PHP = 3000;   // ms par exécution (PHP déjà démarré) : au-delà, boucle infinie probable
let PHPW = null, phpFile = Promise.resolve(), phpN = 0;
function phpWorker(){
  if (PHPW) return PHPW;
  const etat = { attente: new Map(), pret: false };
  etat.demarrage = new Promise(res => { etat.finDemarrage = res; });
  try { etat.w = new Worker(PHP_DOSSIER + "php-worker.js", { type:"module" }); }
  catch(e) { etat.panne = String(e && e.message || e); etat.finDemarrage(); PHPW = etat; return etat; }
  etat.w.onmessage = e => {
    const m = e.data;
    if (m.type === "pret" || m.type === "demarre") { etat.pret = true; etat.finDemarrage(); }
    if (m.type === "demarre") etat.attente.get(m.id)?.demarre();
    if (m.type === "fini" || m.type === "panne") { const a = etat.attente.get(m.id); if (a) { etat.attente.delete(m.id); a.fini(m); } if (m.type === "panne" && !m.id) { etat.panne = m.message; etat.finDemarrage(); } }
  };
  etat.w.onerror = e => { e.preventDefault?.(); const msg = String(e.message || "le moteur PHP n'a pas pu démarrer"); etat.panne = msg; etat.finDemarrage(); for (const a of etat.attente.values()) a.fini({ type:"panne", message: msg }); etat.attente.clear(); if (PHPW === etat) PHPW = null; };
  etat.w.postMessage({ type:"prechauffer" });
  PHPW = etat;
  return etat;
}
function tuerPhp(){
  if (!PHPW) return;
  const e = PHPW; PHPW = null;
  e.w?.terminate();
  for (const a of e.attente.values()) a.fini({ type:"panne", message:"PHP a été redémarré." });
}
function prechargerPhp(){ phpWorker(); }
/* une exécution brute : { type:"fini", texte, erreurs, code } | { type:"timeout" } | { type:"panne", message } */
function lancerPhpBrut(fichiers){
  const tache = phpFile.then(() => new Promise(resolve => {
    const etat = phpWorker();
    if (etat.panne) return resolve({ type:"panne", message: etat.panne });
    if (!etat.pret && typeof toast === "function" && typeof ST !== "undefined" && !/[?&]test\b/.test(location.search)) toast(I.terminal, "Démarrage de PHP…", "La première fois, ça prend quelques secondes.");
    const id = ++phpN; let t = null;
    const garde = setTimeout(() => { etat.attente.delete(id); tuerPhp(); resolve({ type:"panne", message:"PHP ne démarre pas (connexion lente ?). Réessaie dans un instant." }); }, 90000);
    etat.attente.set(id, {
      demarre(){ clearTimeout(garde); t = setTimeout(() => { etat.attente.delete(id); tuerPhp(); resolve({ type:"timeout" }); }, DELAI_PHP); },
      fini(m){ clearTimeout(garde); clearTimeout(t); resolve(m); }
    });
    etat.w.postMessage({ id, fichiers, script:"/pw/harnais.php" });
  }));
  phpFile = tache.catch(() => {});
  return tache;
}

/* ---------------- valeurs : PHP ⇄ JSON, affichage, comparaison ---------------- */
const phpChaine = s => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"';
/* valeur JSON du contenu → littéral PHP (données, arguments des tests) */
function phpLitteral(v){
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return phpChaine(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(phpLitteral).join(", ")}]`;
  return `[${Object.entries(v).map(([k, x]) => `${/^-?\d+$/.test(k) ? k : phpChaine(k)} => ${phpLitteral(x)}`).join(", ")}]`;
}
const estObjetPhp = v => v && typeof v === "object" && !Array.isArray(v) && "__objet" in v;
/* valeur exportée par le harnais → texte, comme on l'écrirait en PHP */
function enPhp(v, prof = 0){
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return phpChaine(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (prof > 3) return "…";
  if (Array.isArray(v)) return `[${v.map(x => enPhp(x, prof + 1)).join(", ")}]`;
  if ("__float" in v) return v.__float;
  if (v.__tronque) return "[…]";
  if (estObjetPhp(v)) {
    const p = Object.entries(v.props || {});
    return `objet ${v.__objet}${p.length && prof < 2 ? ` { ${p.slice(0, 5).map(([k, x]) => `${k}: ${enPhp(x, prof + 1)}`).join(", ")}${p.length > 5 ? ", …" : ""} }` : ""}`;
  }
  return `[${Object.entries(v).map(([k, x]) => `${/^-?\d+$/.test(k) ? k : phpChaine(k)} => ${enPhp(x, prof + 1)}`).join(", ")}]`;
}
/* obtenu (exporté par PHP) égal à attendu (écrit dans le contenu) ?
   { "__objet": "Book", "props": { "title": "1984" } } : un objet de cette classe (props : seulement celles citées) */
function egalPhp(a, b){
  if (estObjetPhp(b)) {
    if (!estObjetPhp(a)) return false;
    const nom = s => String(s).toLowerCase().replace(/^\\/, "");
    if (nom(a.__objet) !== nom(b.__objet) && nom(a.__objet).split("\\").pop() !== nom(b.__objet)) return false;
    return Object.entries(b.props || {}).every(([k, v]) => a.props && k in a.props && egalPhp(a.props[k], v));
  }
  const entrees = x => Array.isArray(x) ? x.map((v, i) => [String(i), v]) : Object.entries(x);
  if (b && typeof b === "object") {
    if (!a || typeof a !== "object" || estObjetPhp(a)) return false;
    if (Array.isArray(b) && Array.isArray(a)) return a.length === b.length && b.every((x, i) => egalPhp(a[i], x));
    const ea = entrees(a), eb = entrees(b);
    if (Array.isArray(b) !== Array.isArray(a) && ea.length && eb.length) return false;   // liste ≠ tableau associatif (sauf vides)
    const ma = new Map(ea);
    return ea.length === eb.length && eb.every(([k, v]) => ma.has(k) && egalPhp(ma.get(k), v));
  }
  return egal(a, b);
}
/* comme echo l'afficherait (pour reconnaître un echo à la place d'un return) */
const commeEcho = v => v === true ? "1" : v === false || v === null ? "" : typeof v === "number" || typeof v === "string" ? String(v) : null;
/* la sortie (HTML ou texte) → lignes de console : <br> et \n coupent les lignes */
function enLignesPhp(s){
  const L = String(s ?? "").replace(/\r/g, "").replace(/<br\s*\/?>\n?/gi, "\n").split("\n").map(x => x.replace(/\s+$/, ""));
  while (L.length && L[L.length - 1] === "") L.pop();
  return L;
}
/* la sortie contient-elle une vraie page (balises autres que <br>) ? */
const aDuHtml = s => /<(?!br\s*\/?>)[a-z!][^>]*>/i.test(String(s || ""));
/* code de l'élève : sans balise <?php (extrait), on l'ajoute ; les numéros de ligne restent ceux de l'élève */
function preparerPhp(code){
  const t = String(code ?? "");
  if (/<\?(php\b|=)/i.test(t)) return { texte: t, decalage: 0 };
  return { texte: "<?php\n" + t, decalage: 1 };
}
/* en-tête affiché grisé avant le code : les données du cours */
const enteteDonneesPhp = d => d ? Object.entries(d).map(([k, v]) => `$${k} = ${phpLitteral(v)};`).join("\n") : "";

/* ---------------- erreurs PHP traduites en français ---------------- */
const TYPES_FR = { int:"un entier (int)", float:"un nombre à virgule (float)", string:"une chaîne (string)", bool:"un booléen (bool)", array:"un tableau (array)", null:"null", void:"rien (void)", none:"rien" };
const typeFr = t => TYPES_FR[t] || `\`${t}\``;
const sansChemins = s => String(s).replace(/\/app\//g, "").replace(/\/pw\/cas\.php/g, "le code du test").replace(/\/pw\/(prelude|donnees)\.php/g, "le code déjà écrit");
function proprietesDeclarees(code){
  return new Set([...String(code).matchAll(/(?:public|private|protected|var|readonly)\s+(?:static\s+)?(?:readonly\s+)?(?:\??[\w\\|]+\s+)?\$(\w+)/g)].map(m => m[1]));
}
/* [regex, (m, ctx) → texte | { texte, id }] ; ctx = { code } */
const TRADUCTIONS_PHP = [
  [/^Undefined variable \$(\w+)/, (m, ctx) => m[1] === "this"
    ? { id:"this-hors-objet", texte:"`$this` n'existe que dans une méthode, appelée sur un objet. Hors d'une classe (ou dans une méthode static), il n'y a pas d'objet." }
    : proprietesDeclarees(ctx.code).has(m[1])
      ? { id:"this-oublie", texte:`Dans une méthode, l'attribut s'écrit \`$this->${m[1]}\`. \`$${m[1]}\` tout seul est une variable locale de la méthode, qui n'existe pas ici.` }
      : { id:"variable-inconnue", texte:`La variable \`$${m[1]}\` n'existe pas à cet endroit. Vérifie l'orthographe (majuscules comprises) et qu'elle est créée avant. Une variable créée hors d'une fonction n'existe pas à l'intérieur : passe-la en paramètre.` }],
  [/Using \$this when not in object context/, () => ({ id:"this-hors-objet", texte:"`$this` n'existe que dans une méthode appelée sur un objet. Dans une fonction normale ou une méthode static, il n'y a pas d'objet." })],
  [/Call to undefined function ([\w\\]+)\(\)/, m => { const f = m[1].split("\\").pop(); return { id:"fonction-inconnue", texte:`La fonction \`${f}()\` n'existe pas. Vérifie l'orthographe. Si c'est une méthode, appelle-la sur un objet : \`$objet->${f}()\` (ou \`$this->${f}()\` dans la classe).${m[1].includes("\\") ? " (Dans un namespace, une fonction de PHP se trouve quand même : c'est donc bien le nom qui ne va pas.)" : ""}` }; }],
  [/Call to undefined method ([\w\\]+)::(\w+)\(\)/, m => ({ id:"methode-inconnue", texte:`La classe \`${m[1]}\` n'a pas de méthode \`${m[2]}()\`. Vérifie le nom exact demandé par l'énoncé, et qu'elle est bien écrite DANS la classe (avant l'accolade fermante), en public.` })],
  [/Call to (private|protected) method ([\w\\]+)::(\w+)\(\) from (?:global )?scope/, m => ({ id:"visibilite", texte:`La méthode \`${m[3]}()\` est ${m[1]} : on ne peut pas l'appeler depuis l'extérieur de la classe. Une méthode qu'on appelle sur l'objet doit être public.` })],
  [/Cannot access (private|protected) property ([\w\\]+)::\$(\w+)/, m => ({ id:"visibilite", texte:`L'attribut \`$${m[3]}\` est ${m[1]} : on ne le lit pas depuis l'extérieur de la classe. Passe par un getter : \`$objet->get${m[3][0].toUpperCase() + m[3].slice(1)}()\`.` })],
  [/Undefined property: ([\w\\]+)::\$(\w*)/, (m, ctx) => /\$this\s*->\s*\$/.test(ctx.code)
    ? { id:"this-dollar", texte:"`$this->$nom` (avec un `$` après la flèche) cherche un attribut dont le nom est dans la variable `$nom`. Pour l'attribut lui-même, c'est `$this->nom`, sans `$` après `->`." }
    : { id:"propriete-inconnue", texte:`L'objet \`${m[1]}\` n'a pas d'attribut \`${m[2]}\`. Déclare-le dans la classe (\`private $${m[2]};\`) et vérifie l'orthographe.` }],
  [/Cannot access empty property|Cannot access property starting with/, () => ({ id:"this-dollar", texte:"`$this->$nom` : il y a un `$` en trop après la flèche. On écrit `$this->nom`." })],
  [/Class "([\w\\]+)" not found/, m => { const nom = m[1], i = nom.lastIndexOf("\\"), court = nom.slice(i + 1), ns = i > 0 ? nom.slice(0, i) : "";
    return { id:"classe-inconnue", texte: ns
      ? `La classe \`${nom}\` est introuvable. PHP l'a cherchée dans le namespace \`${ns}\`, sans doute celui du fichier. Si \`${court}\` est rangée dans un autre namespace, importe-la en haut du fichier (\`use AutreNamespace\\${court};\`) ; sinon, vérifie que l'autoloader est inclus (\`require_once\`) et que le fichier est au bon endroit (\`src/${nom.replace(/\\/g, "/")}.php\`).`
      : `La classe \`${nom}\` est introuvable. Causes fréquentes : faute de frappe, fichier pas inclus (\`require_once\`), ou namespace : il manque un \`use Dossier\\${nom};\` en haut du fichier.` }; }],
  [/Interface "([\w\\]+)" not found/, m => ({ id:"classe-inconnue", texte:`L'interface \`${m[1]}\` est introuvable : orthographe, fichier non inclus, ou namespace (\`use\`).` })],
  [/Trait "([\w\\]+)" not found/, m => ({ id:"classe-inconnue", texte:`Le trait \`${m[1]}\` est introuvable : orthographe, fichier non inclus, ou namespace (\`use\` en haut du fichier).` })],
  [/Cannot instantiate abstract class ([\w\\]+)/, m => ({ id:"abstract-new", texte:`\`${m[1]}\` est une classe abstraite : un plan inachevé, on ne construit pas de maison avec. Crée un objet d'une classe enfant (\`class X extends ${m[1]}\`).` })],
  [/Cannot instantiate interface ([\w\\]+)/, m => ({ id:"abstract-new", texte:`\`${m[1]}\` est une interface : un cahier des charges, pas un plan. On ne fait pas \`new\` dessus : crée une classe qui l'implémente (\`implements ${m[1]}\`).` })],
  [/([\w\\]+) cannot use ([\w\\]+) - it is not a trait/, m => ({ id:"pas-un-trait", texte:`\`use ${m[2]};\` dans la classe \`${m[1]}\` ajoute un trait, mais \`${m[2]}\` n'en est pas un (classe ou interface ?). Un trait se déclare avec \`trait ${m[2]} { … }\` ; une interface s'utilise avec \`implements\`, une classe avec \`extends\`.` })],
  [/([\w\\]+) and ([\w\\]+) define the same property \((\$\w+)\) in the composition of ([\w\\]+)/, m => ({ id:"trait-propriete", texte:`La classe \`${m[4]}\` reçoit deux fois la propriété \`${m[3]}\` (de \`${m[1]}\` et de \`${m[2]}\`), avec des définitions différentes. Quand deux traits (ou un trait et la classe) déclarent la même propriété, elle doit être identique : même visibilité, même type, même valeur par défaut.` })],
  [/Cannot instantiate trait ([\w\\]+)/, m => ({ id:"abstract-new", texte:`\`${m[1]}\` est un trait : une boîte de méthodes à ranger dans une classe (\`use ${m[1]};\` dans la classe), pas une classe.` })],
  [/Class ([\w\\]+) contains (\d+) abstract methods? and must therefore be declared abstract or implement the remaining methods \((.+)\)/, m => ({ id:"methode-promise", texte:`La classe \`${m[1]}\` promet des méthodes (interface ou parent abstrait) qu'elle n'écrit pas : \`${m[3]}\`. Écris-les dans la classe, avec la même signature (ou déclare la classe abstract).` })],
  [/Class ([\w\\]+) cannot extend (?:interface|trait) ([\w\\]+)/, m => ({ id:"extends-implements", texte:`On n'étend pas (\`extends\`) une interface : on l'implémente. Écris \`class ${m[1]} implements ${m[2]}\`.` })],
  [/([\w\\]+) cannot implement ([\w\\]+) - it is not an interface/, m => ({ id:"extends-implements", texte:`\`${m[2]}\` n'est pas une interface : une classe s'étend avec \`extends\`, une interface s'implémente avec \`implements\`.` })],
  [/Class ([\w\\]+) cannot extend final class ([\w\\]+)/, m => `La classe \`${m[2]}\` est final : on ne peut pas en hériter.`],
  [/Declaration of (.+) must be compatible with (.+)/, m => ({ id:"signature", texte:`La méthode \`${m[1]}\` n'a pas la même signature que celle promise \`${m[2]}\` : mêmes paramètres, mêmes types, même type de retour.` })],
  [/Access level to ([\w\\:]+)\(?\)? must be (\w+)/, m => ({ id:"visibilite", texte:`\`${m[1]}\` doit être au moins aussi visible que dans le parent ou l'interface : déclare-la ${m[2]}.` })],
  [/Too few arguments to function ([\w\\:]+)\(\), (\d+) passed.*?(?:at least|exactly) (\d+) expected/, m => ({ id:"arguments", texte: /__construct$/.test(m[1])
    ? `Le constructeur de \`${m[1].replace(/::__construct$/, "")}\` attend ${m[3]} argument${m[3] > 1 ? "s" : ""}, tu en donnes ${m[2]} : \`new ${m[1].replace(/::__construct$/, "").split("\\").pop()}(…)\` doit recevoir toutes les valeurs.`
    : `\`${m[1]}()\` attend ${m[3]} argument${m[3] > 1 ? "s" : ""}, tu en donnes ${m[2]}.` })],
  [/(?:([\w\\:]+)\(\): )?Argument #(\d+) \(\$(\w+)\) must be of type \??([\w\\|]+), ([\w\\]+) given/, m => ({ id:"type-argument", texte:`Le paramètre \`$${m[3]}\`${m[1] ? ` de \`${m[1]}()\`` : ""} attend ${typeFr(m[4])}, il reçoit ${typeFr(m[5])}.${m[4] === "int" && m[5] === "string" ? " Un texte venant d'un formulaire est toujours une chaîne : convertis-le, `(int) $_POST['age']`." : ""}` })],
  [/([\w\\:]+)\(\): Return value must be of type \??([\w\\|]+), (none|[\w\\]+) returned/, m => ({ id: m[3] === "none" ? "sans-return" : "type-retour", texte: m[3] === "none"
    ? `\`${m[1]}()\` promet de retourner ${typeFr(m[2])} (le type après les deux-points), mais ne retourne rien : il manque \`return\`.`
    : `\`${m[1]}()\` promet de retourner ${typeFr(m[2])}, mais retourne ${typeFr(m[3])}.` })],
  [/Cannot assign ([\w\\]+) to property ([\w\\]+)::\$(\w+) of type \??([\w\\|]+)/, m => ({ id:"type-attribut", texte:`L'attribut \`$${m[3]}\` est déclaré ${typeFr(m[4])}, tu lui donnes ${typeFr(m[1])}.` })],
  [/Typed property ([\w\\]+)::\$(\w+) must not be accessed before initialization/, m => ({ id:"attribut-vide", texte:`L'attribut \`$${m[2]}\` n'a jamais reçu de valeur. Remplis-le dans le constructeur (\`$this->${m[2]} = $${m[2]};\`) ou donne-lui une valeur par défaut.` })],
  [/Unsupported operand types: string \+ |Unsupported operand types: .* \+ string|A non-numeric value encountered/, () => ({ id:"concat-plus", texte:"En PHP, on colle des textes avec le point `.` (\"Bonjour \" . $nom). Le `+` additionne des nombres." })],
  [/Unsupported operand types: ([\w\\]+) ([-+*\/%]) ([\w\\]+)/, m => ({ id:"operandes", texte:`Impossible de calculer ${typeFr(m[1])} ${m[2]} ${typeFr(m[3])}.${m[1] === "array" || m[3] === "array" ? " Un tableau ne s'additionne pas : additionne ses éléments (array_sum, ou une boucle)." : ""}` })],
  [/Array to string conversion/, () => ({ id:"array-to-string", texte:"Tu affiches un tableau avec echo : PHP écrit seulement « Array ». Affiche un élément (`$tab[0]`, `$tab['nom']`), parcours-le avec foreach, ou, pour déboguer, `print_r($tab)`." })],
  [/Object of class ([\w\\]+) could not be converted to string/, m => ({ id:"objet-en-texte", texte:`Tu affiches (ou colles avec .) un objet \`${m[1]}\` entier. Affiche plutôt ce que retourne une de ses méthodes : \`$objet->getName()\`.` })],
  [/Call to a member function (\w+)\(\) on (null|bool|false|string|int|float|array)/, m => ({ id:"pas-un-objet", texte: m[2] === "bool" || m[2] === "false"
    ? `Tu appelles \`->${m[1]}()\` sur false. Souvent : \`fetch()\` n'a trouvé aucune ligne (il renvoie false), ou une fonction a échoué. Vérifie le résultat avant de l'utiliser.`
    : `Tu appelles \`->${m[1]}()\` sur ${m[2] === "null" ? "null (rien)" : typeFr(m[2])}, pas sur un objet. La variable a-t-elle bien été créée avec \`new\` ? La fonction qui l'a fournie a-t-elle un \`return\` ? Dans une méthode, as-tu écrit \`$this->\` ?` })],
  [/Attempt to read property "(\w+)" on (null|bool|string|int|float|array)/, m => ({ id:"pas-un-objet", texte: m[2] === "array"
    ? `Tu lis \`->${m[1]}\` sur un tableau. Dans un tableau, on lit avec des crochets : \`$ligne['${m[1]}']\`.`
    : `Tu lis \`->${m[1]}\` sur ${m[2] === "null" ? "null" : typeFr(m[2])}, pas sur un objet.` })],
  [/Attempt to assign property "(\w+)" on (null|bool|string|int|array)/, m => ({ id:"pas-un-objet", texte:`Tu écris \`->${m[1]}\` sur quelque chose qui n'est pas un objet (${m[2]}). Dans une méthode, c'est \`$this->${m[1]}\`.` })],
  [/Cannot use object of type ([\w\\]+) as array/, m => ({ id:"objet-tableau", texte:`\`$x['…']\` sur un objet \`${m[1]}\` : un objet ne s'ouvre pas avec des crochets. Utilise ses méthodes : \`$x->getTitle()\`.` })],
  [/Undefined array key "?(.*?)"?$/, m => ({ id:"cle-inconnue", texte:`La clé \`${m[1]}\` n'existe pas dans ce tableau. Pour un formulaire, le champ n'a pas été envoyé : vérifie avec \`isset($_POST['${m[1]}'])\` ou donne une valeur par défaut avec \`??\`.` })],
  [/Undefined offset|Undefined index: (.+)/, m => ({ id:"cle-inconnue", texte:`Cette case du tableau n'existe pas${m[1] ? ` (\`${m[1]}\`)` : ""}.` })],
  [/Cannot modify header information - headers already sent|Session cannot be started after headers have already been sent|session_start\(\): Session cannot be started/, () => ({ id:"entete-envoye", texte:"`setcookie()`, `header()` et `session_start()` envoient des en-têtes HTTP : ils doivent venir AVANT tout affichage (echo, HTML, même un espace ou une ligne vide avant `<?php`). Déplace-les tout en haut du fichier." })],
  [/Ignoring session_start\(\) because a session is already active/, () => ({ id:"session-double", texte:"`session_start()` est appelé deux fois. Une seule fois par requête, en haut de la page." })],
  [/Undefined constant ([\w\\]+)::(\w+)/, m => ({ id:"constante-inconnue", texte:`La classe \`${m[1]}\` n'a pas de constante \`${m[2]}\`. Déclare-la (\`const ${m[2]} = …;\`) et vérifie l'orthographe.` })],
  [/Undefined constant "?([\w\\]+?)"?$/, m => ({ id:"constante-inconnue", texte:`\`${m[1]}\` n'existe pas. Si c'est une constante de la classe, écris \`self::${m[1].split("\\").pop()}\` ; si c'est une variable, il manque le \`$\` ; si c'est un texte, il faut des guillemets.` })],
  [/Non-static method ([\w\\]+)::(\w+)\(\) cannot be called statically/, m => ({ id:"static", texte:`\`${m[2]}()\` n'est pas static : appelle-la sur un objet avec \`->\` (\`$objet->${m[2]}()\`), pas avec \`::\`.` })],
  [/Cannot use "parent" when current class scope has no parent/, () => ({ id:"parent-sans-extends", texte:"`parent::` n'existe que dans une classe qui hérite d'une autre : `class Fille extends Parent`. (Une interface s'implémente, elle n'a pas de constructeur parent.)" })],
  [/Cannot call constructor/, () => "Le parent n'a pas de constructeur : enlève `parent::__construct(…)`, ou ajoute un constructeur au parent."],
  [/Cannot redeclare ([\w\\]+)::(\w+)\(\)/, m => ({ id:"redeclare", texte:`La méthode \`${m[2]}()\` est écrite deux fois dans \`${m[1]}\`.` })],
  [/Cannot redeclare (?:function )?([\w\\]+)\(\)/, m => ({ id:"redeclare", texte:`La fonction \`${m[1]}()\` est déclarée deux fois (ou porte le nom d'une fonction qui existe déjà dans PHP) : renomme-la. Si un fichier est inclus deux fois, utilise \`require_once\`.` })],
  [/Cannot declare (?:class|interface|trait) ([\w\\]+), because the name is already in use/, m => ({ id:"redeclare", texte:`La classe \`${m[1]}\` est déclarée deux fois. Souvent : un fichier inclus deux fois → \`require_once\` au lieu de \`require\`.` })],
  [/Failed opening required '([^']+)'|Failed to open stream: No such file or directory|require(?:_once)?\(([^)]+)\): Failed/, m => ({ id:"fichier-introuvable", texte:`Le fichier ${m[1] || m[2] ? `\`${sansChemins(m[1] || m[2])}\` ` : ""}est introuvable. Vérifie le chemin : \`__DIR__\` est le dossier du fichier courant ; \`__DIR__ . '/../src/Book.php'\` remonte d'un dossier puis descend dans src.` })],
  [/Division by zero|Modulo by zero/, () => ({ id:"division-zero", texte:"Division par zéro. Vérifie le diviseur avant de diviser." })],
  [/Allowed memory size of \d+ bytes exhausted|Maximum function nesting level|Maximum call stack size/, () => "Ton code tourne sans fin : une fonction qui s'appelle elle-même, ou une boucle qui remplit la mémoire."],
  [/count\(\): Argument #1 \(\$value\) must be of type Countable\|array, (\w+) given/, m => `\`count()\` compte les éléments d'un tableau ; tu lui donnes ${typeFr(m[1])}.`],
  [/SQLSTATE\[HY000\]: General error: 1 no such table: (\w+)/, m => ({ id:"sql-table", texte:`La table \`${m[1]}\` n'existe pas (ou plus !). Vérifie son nom… et, si elle existait au début, qu'aucune donnée n'a pu la supprimer (injection SQL).` })],
  [/SQLSTATE\[HY000\]: General error: 1 no such column: ([\w.]+)/, m => ({ id:"sql-colonne", texte:`La colonne \`${m[1]}\` n'existe pas. Vérifie son nom dans la requête. (Une valeur texte dans la requête doit être entre apostrophes… ou mieux : un paramètre \`:nom\` d'une requête préparée.)` })],
  [/SQLSTATE\[HY000\]: General error: 1 near "(.*?)": syntax error/, m => ({ id:"sql-syntaxe", texte:`Erreur de syntaxe SQL près de \`${m[1]}\`. Si une donnée contient une apostrophe (O'Neil) et qu'elle est collée dans la requête, elle casse le SQL : utilise une requête préparée (\`prepare\` + \`:nom\`).` })],
  [/SQLSTATE\[HY000\]: General error: 1 (?:unrecognized token|incomplete input)/, () => ({ id:"sql-syntaxe", texte:"La requête SQL est mal formée (souvent une apostrophe dans une donnée collée à la requête). Utilise une requête préparée : la donnée reste dans sa case." })],
  [/SQLSTATE\[23000\].*?(?:UNIQUE constraint failed|Duplicate entry)[: ]*(.*)/, m => ({ id:"sql-unique", texte:`Cette valeur existe déjà alors qu'elle doit être unique${m[1] ? ` (\`${m[1]}\`)` : ""}.` })],
  [/SQLSTATE\[23000\].*?NOT NULL constraint failed: ([\w.]+)/, m => ({ id:"sql-null", texte:`La colonne \`${m[1]}\` ne peut pas être vide (NOT NULL) : donne-lui une valeur.` })],
  [/SQLSTATE\[HY093\]|Invalid parameter number|column index out of range/, () => ({ id:"sql-parametres", texte:"Les paramètres de la requête préparée ne correspondent pas : chaque `:nom` de la requête doit recevoir une valeur (`bindValue(':nom', …)` ou `execute(['nom' => …])`), avec exactement le même nom." })],
  [/could not find driver/, () => "Ce pilote de base de données n'existe pas ici : dans l'appli, on travaille avec SQLite (`new PDO('sqlite::memory:')`), comme MySQL mais sans serveur."],
  [/Unclosed '(.)'(?: on line (\d+))?/, (m, ctx) => ({ id:"syntaxe-fin", texte:`Le \`${m[1]}\`${m[2] ? ` ouvert ligne ${m[2] - (ctx.decalage || 0)}` : ""} n'est jamais refermé : il manque le \`${{ "{":"}", "(":")", "[":"]" }[m[1]] || "symbole fermant"}\` correspondant.` })],
  [/syntax error, unexpected end of file/, () => ({ id:"syntaxe-fin", texte:"Le fichier s'arrête trop tôt : une accolade `{` (ou une parenthèse) n'est pas refermée." })],
  [/syntax error, unexpected token "(.+?)", expecting ";"/, m => ({ id:"point-virgule", texte:`Il manque un point-virgule \`;\` à la fin de l'instruction précédente (souvent sur la ligne d'avant), avant \`${m[1]}\`.` })],
  [/syntax error, unexpected variable "(\$\w+)"(?:, expecting (.+))?/, m => ({ id:"syntaxe", texte:`La variable \`${m[1]}\` arrive là où PHP ne l'attend pas : il manque sans doute un \`;\` à la fin de l'instruction d'avant, ou un point \`.\` pour coller du texte.` })],
  [/syntax error, unexpected identifier "(\w+)"(?:, expecting (.+))?/, m => ({ id:"syntaxe", texte:`Le mot \`${m[1]}\` arrive là où PHP ne l'attend pas. Il manque peut-être le \`$\` d'une variable, des guillemets autour d'un texte, un \`;\` avant, ou un \`.\` pour coller.` })],
  [/syntax error, unexpected (?:double-quoted string|single-quoted string|string content) "?(.*?)"?(?:, expecting (.+))?$/, m => ({ id:"syntaxe", texte:`Un texte${m[1] ? ` (\`${m[1]}\`)` : ""} arrive là où PHP ne l'attend pas : il manque un point \`.\` pour coller, une virgule entre deux arguments, ou un \`;\` avant.` })],
  [/syntax error, unexpected token "(.+?)", expecting "(.+?)"/, m => ({ id:"syntaxe", texte:`Le symbole \`${m[1]}\` n'est pas à sa place : PHP attendait \`${m[2]}\`.` })],
  [/syntax error, unexpected token "(.+?)"/, m => ({ id:"syntaxe", texte:`Le symbole \`${m[1]}\` n'est pas à sa place. Souvent : une parenthèse ou une accolade en trop ou en moins, ou un \`;\` oublié juste avant.` })],
  [/syntax error, unexpected (.+)/, m => ({ id:"syntaxe", texte:`Erreur de syntaxe : PHP ne s'attendait pas à ${sansChemins(m[1])}. Regarde la ligne indiquée et celle d'avant (point-virgule, parenthèses, guillemets).` })],
];
function traduireErreurPhp(msg, ctx = {}){
  const m0 = String(msg || "");
  for (const [re, f] of TRADUCTIONS_PHP) { const m = m0.match(re); if (m) { const r = f(m, ctx); return typeof r === "string" ? { texte:r } : r; } }
  return { texte: `Erreur PHP : ${sansChemins(m0)}` };
}
const TITRES_PHP = { ParseError:"Erreur de syntaxe", TypeError:"Mauvais type", ArgumentCountError:"Nombre d'arguments", DivisionByZeroError:"Division par zéro", ValueError:"Valeur invalide", PDOException:"Erreur de base de données", Error:"Erreur", Fatal:"Erreur fatale" };
/* exception non attrapée ou erreur fatale → { titre, message, ligne, original, id } */
function decrireErreurPhp(ex, ctx){
  const msg = String(ex.message || "");
  const t = traduireErreurPhp(msg, ctx);
  const eleve = ex.fichier === "/app/" + ctx.fichier;
  // TypeError « called in /app/index.php on line 7 » : la ligne de l'appel, dans le code de l'élève
  const appel = msg.match(/called in \/app\/(.+?) on line (\d+)/);
  let ligne = null, lieu = "";
  if (appel && appel[1] === ctx.fichier) ligne = +appel[2] - ctx.decalage;
  else if (eleve) ligne = ex.ligne - ctx.decalage;
  else if (ex.fichier === "/pw/cas.php") lieu = "test";
  else if (/^\/pw\//.test(ex.fichier || "")) lieu = "deja";
  else if (ex.fichier) lieu = sansChemins(ex.fichier);
  const exceptionUtilisateur = !TITRES_PHP[ex.classe] && /Exception$/.test(ex.classe || "") && ex.classe !== "PDOException";
  let message = exceptionUtilisateur && !t.id
    ? `Une exception \`${ex.classe}\` a été lancée (\`throw\`) et personne ne l'a attrapée : « ${msg} ». Le signal d'alarme a sonné, mais aucun \`try { … } catch (${ex.classe} $e) { … }\` ne l'a entendu, alors le programme s'arrête.`
    : t.texte;
  if (lieu === "test") message = `Pendant le test : ${message}`;
  else if (lieu === "deja") message = `Dans le code déjà écrit : ${message}`;
  else if (lieu) message = `Dans \`${lieu}\` (ligne ${ex.ligne}) : ${message}`;
  return { type: ex.classe, titre: exceptionUtilisateur ? "Exception non attrapée" : TITRES_PHP[ex.classe] || "Erreur", original: sansChemins(msg), message, ligne: ligne > 0 ? ligne : null, id: exceptionUtilisateur && !t.id ? "exception-non-attrapee" : t.id };
}
/* avertissement (Warning, Notice, Deprecated) → conseil affiché, avec sa ligne */
function decrireAvertPhp(a, ctx){
  const t = traduireErreurPhp(a.message, ctx);
  const ligne = a.fichier === "/app/" + ctx.fichier ? a.ligne - ctx.decalage : null;
  return { id: t.id || "avertissement", ligne, message: `${ligne ? `Ligne ${ligne} : ` : a.phase === "cas" ? "Pendant le test : " : ""}${t.texte}`, avertissement:true };
}

/* ---------------- analyse statique du PHP ---------------- */
function chercherUsagePhp(nu, nom){
  const e = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (nom.startsWith("->")) return new RegExp(`->\\s*${e(nom.slice(2))}\\b`, "i").exec(nu);
  if (/^\w+$/.test(nom)) return new RegExp(`(?<![\\w$>:\\\\])${nom}\\b`, "i").exec(nu);
  if (/^\w+::$/.test(nom)) return new RegExp(`\\b${nom.slice(0, -2)}\\s*::`, "i").exec(nu);
  if (/^\w+\(\)$/.test(nom)) return new RegExp(`(?<![\\w$>:])${nom.slice(0, -2)}\\s*\\(`, "i").exec(nu);
  return new RegExp(e(nom).replace(/\s+/g, "\\s*")).exec(nu);
}
function analyseStatiquePhp(code, tests = {}){
  const nu = codeNu(code);
  const bloquants = [], conseils = [];
  for (const nom of tests.interdit || []) {
    const m = chercherUsagePhp(nu, nom);
    if (m) bloquants.push({ id:"interdit", ligne: ligneDe(code, m.index), message: `Ligne ${ligneDe(code, m.index)} : pas de \`${nom}\` dans cet exercice. Trouve une autre façon de faire.` });
  }
  for (const nom of tests.obligatoire || []) {
    if (!chercherUsagePhp(nu, nom)) bloquants.push({ id:"obligatoire", message: `Cet exercice s'entraîne avec \`${nom}\` : ton code doit l'utiliser.` });
  }
  const mt = /\$this\s*->\s*\$\w+/.exec(nu);
  if (mt) conseils.push({ id:"this-dollar", ligne: ligneDe(code, mt.index), message: `Ligne ${ligneDe(code, mt.index)} : \`${mt[0]}\` a un \`$\` en trop après la flèche. L'attribut s'écrit \`$this->${mt[0].split("$").pop()}\`.` });
  const mp = /["']\s*\+(?!\+)|[^+]\+\s*["']/.exec(nu);
  if (mp) conseils.push({ id:"concat-plus", ligne: ligneDe(code, mp.index), message: `Ligne ${ligneDe(code, mp.index)} : pour coller du texte en PHP, c'est le point \`.\`, pas \`+\`.` });
  // requête SQL fabriquée en collant des variables : porte ouverte à l'injection SQL
  let pos = 0;
  const js = jetonsPhp(code).map(j => { const r = { ...j, pos }; pos += j.v.length; return r; }).filter(j => j.t !== "ws" && j.t !== "com");
  for (let i = 0; i < js.length; i++) {
    const j = js[i];
    if (j.t !== "str" || !/\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(j.v)) continue;
    const interpole = j.v[0] === '"' && /\$\w|\{\$/.test(j.v);
    const colle = (js[i + 1] && js[i + 1].v === "." && js[i + 2] && js[i + 2].t === "var") || (js[i - 1] && js[i - 1].v === "." && js[i - 2] && js[i - 2].t === "var");
    if (interpole || colle) { const l = ligneDe(code, j.pos); conseils.push({ id:"sql-concat", ligne:l, message: `Ligne ${l} : la requête SQL est fabriquée en collant une variable dedans. Si la donnée contient \`'\` (ou une attaque), elle devient du SQL : c'est l'injection SQL. Mets un paramètre \`:nom\` dans la requête, puis \`prepare\` et \`bindValue\` (ou \`execute([…])\`) : la donnée reste dans sa case.` }); break; }
  }
  // setcookie / header / session_start après un affichage : en vrai, « headers already sent » (selon le tampon du serveur)
  let affiche = false;
  for (const j of js) {
    if ((j.t === "html" || j.t === "tag") && /\S/.test(j.v) || (j.t === "kw" && /^(echo|print|<\?=)$/i.test(j.v))) affiche = true;
    if (affiche && j.t === "fn" && /^(setcookie|header|session_start)$/i.test(j.v)) { const l = ligneDe(code, j.pos); conseils.push({ id:"entete-envoye", ligne:l, message:`Ligne ${l} : \`${j.v}()\` envoie un en-tête HTTP, qui part AVANT la page. Il doit venir avant tout affichage (echo, HTML, même une ligne vide avant \`<?php\`) : sinon PHP répond « headers already sent ». Place-le tout en haut du fichier.` }); break; }
  }
  // saisie de l'utilisateur affichée telle quelle (echo, print ou <?=) : XSS
  let mx = null;
  for (const m of nu.matchAll(/(?:\becho\b|\bprint\b|<\?=)([^;]*?)(?:;|\?>|$)/g)) {
    if (/\$_(GET|POST|COOKIE|REQUEST)\b/.test(m[1]) && !/htmlspecialchars\s*\(/.test(m[1])) { mx = m; break; }
  }
  if (mx) conseils.push({ id:"xss", ligne: ligneDe(code, mx.index), message: `Ligne ${ligneDe(code, mx.index)} : tu affiches une saisie de l'utilisateur telle quelle. Si elle contient \`<script>\`, il s'exécute (XSS) : mets-la en vitrine avec \`htmlspecialchars(…)\`.` });
  const mh = /\b(md5|sha1)\s*\(/.exec(nu);
  if (mh && /pass|mdp|mot/i.test(code)) conseils.push({ id:"hachage-faible", ligne: ligneDe(code, mh.index), message: `Ligne ${ligneDe(code, mh.index)} : \`${mh[1]}\` n'est pas fait pour les mots de passe (trop rapide à casser). Utilise \`password_hash()\` pour enregistrer et \`password_verify()\` pour vérifier.` });
  const ignores = tests.sansConseil || [];
  return { bloquants, conseils: conseils.filter(c => !ignores.includes(c.id)) };
}

/* ---------------- en-têtes HTTP : cookies et redirection ---------------- */
function cookiesDe(entetes){
  const c = {};
  for (const e of entetes || []) {
    const m = /^Set-Cookie:\s*([^=;]+)=([^;]*)(.*)$/i.exec(e); if (!m) continue;
    const attrs = m[3], maxAge = /max-age=(-?\d+)/i.exec(attrs), expires = /expires=([^;]+)/i.exec(attrs);
    let valeur; try { valeur = decodeURIComponent(m[2].replace(/\+/g, " ")); } catch(err) { valeur = m[2]; }
    const supprime = (maxAge && +maxAge[1] <= 0) || (expires && Date.parse(expires[1]) < Date.now()) || valeur === "deleted";
    c[m[1].trim()] = { valeur: supprime ? null : valeur, duree: maxAge ? +maxAge[1] : null };
  }
  return c;
}
const redirectionDe = entetes => { for (const e of entetes || []) { const m = /^Location:\s*(.*)$/i.exec(e); if (m) return m[1].trim(); } return null; };

/* ---------------- une exécution complète : fichiers → résultat lu ---------------- */
async function lancerPhp(fichiers){
  const brut = await lancerPhpBrut(fichiers);
  if (brut.type === "timeout") return { timeout:true };
  if (brut.type === "panne") return { panne: brut.message };
  const txt = String(brut.texte || ""), i = txt.lastIndexOf("\x01PW\x01");
  if (i < 0) return { panne: (brut.erreurs || "").split("\n").find(l => /PHP (Fatal|Parse) error/.test(l)) || "le harnais n'a rien renvoyé" };
  const fin = txt.indexOf("\x02", i);
  let r; try { r = JSON.parse(txt.slice(i + 4, fin < 0 ? undefined : fin)); } catch(e) { return { panne:"réponse illisible" }; }
  if (fin >= 0) r.sorties[r.phase] += txt.slice(fin + 1);   // destructeurs de fin de script
  r.avant = txt.slice(0, i);
  return r;
}

/* ---------------- diagnostic d'un cas raté ---------------- */
function diagnostiquerPhp(cas, obtenu, sortieCas, ctx){
  const att = cas.attendu;
  const d = (id, message) => ({ id, message });
  if (att !== null && att !== undefined && (obtenu === null || obtenu === undefined)) {
    const e = commeEcho(att);
    if (e && enLignesPhp(sortieCas).some(l => l.includes(e))) return d("echo-vs-return", `Ta fonction MONTRE le résultat (\`echo\`) au lieu de le TENDRE (\`return\`). Il s'affiche, mais celui qui appelle la fonction ne reçoit rien (null). Remplace \`echo …;\` par \`return …;\`.`);
    return d("sans-return", `Ta fonction (ou méthode) retourne null : il manque \`return\` devant le résultat.`);
  }
  if (estTexteDeNombre(obtenu, att)) return d("texte-vs-nombre", typeof att === "number" ? `Tu retournes du TEXTE (entre guillemets, comme "13") là où on attend un NOMBRE (13). Enlève les guillemets, ou convertis : \`(int) $x\`.` : `Tu retournes un NOMBRE là où on attend du TEXTE.`);
  if (typeof att === "boolean" && typeof obtenu === "string") return d("texte-vs-booleen", `Tu retournes le texte ${phpChaine(obtenu)} au lieu du booléen \`${att}\` (sans guillemets).`);
  if (typeof att === "boolean" && typeof obtenu === "number") return d("texte-vs-booleen", `Tu retournes le nombre ${obtenu} au lieu du booléen \`${att}\`. Une condition (\`$age >= 18\`) donne directement true ou false.`);
  if (ctx.reussiCours && cas.index > 0 && "attenduCours" in ctx && egalPhp(obtenu, ctx.attenduCours) && !egalPhp(ctx.attenduCours, att))
    return d("donnees-en-dur", `Ta solution marche avec les données de l'énoncé, mais pas avec d'autres. As-tu écrit une partie du résultat à la main au lieu d'utiliser les paramètres (ou les attributs) ?`);
  if (Array.isArray(att) && !att.length && obtenu !== null) return d("tableau-vide", `Pense au cas vide : sans aucun élément, on attend un tableau vide \`[]\`.`);
  return null;
}
function diagnostiquerSortie(attendue, obtenue){
  if (!obtenue.length) return { id:"rien-affiche", message:"Rien ne s'affiche. Pour afficher, c'est `echo`." };
  if (obtenue.length === 1 && attendue.length > 1 && normaliserSaisie(obtenue[0]).replace(/ /g, "") === normaliserSaisie(attendue.join("")).replace(/ /g, ""))
    return { id:"lignes-collees", message:"Tes lignes sont collées les unes aux autres : ajoute un retour à la ligne après chaque affichage (`\"<br>\"` dans une page web, ou `\"\\n\"`)." };
  if (obtenue.length === attendue.length && obtenue.every((l, i) => normaliserSaisie(l) === normaliserSaisie(attendue[i])))
    return { id:"espaces", message:"Presque : seuls des espaces ou des guillemets diffèrent. Compare caractère par caractère." };
  return null;
}

/* ---------------- executerPhp : le pendant PHP de executerTout ---------------- */
/* payload : { code, donnees, prelude, tests, contexte, requete, fichiers, fichier } */
async function executerPhp({ code, donnees, prelude, tests, requete, fichiers, fichier }){
  const t0 = Date.now();
  const res = { ok:false, console:[], erreur:null, cas:[], diagnostics:[], conseils:[], duree:0 };
  const nomFichier = String(fichier || "index.php").replace(/^\/+/, "");
  const eleve = preparerPhp(code);
  const ctx = { code: String(code ?? ""), decalage: eleve.decalage, fichier: nomFichier };
  const base = { "/pw/harnais.php": PHP_HARNAIS, ["/app/" + nomFichier]: eleve.texte };
  if (prelude) base["/pw/prelude.php"] = preparerPhp(prelude).texte;
  for (const [c, t] of Object.entries(fichiers || {})) base["/app/" + c.replace(/^\/+/, "")] = lignes(t);
  const fichiersPour = (req, don, casCode, variables) => {
    const f = { ...base, "/pw/requete.json": JSON.stringify({ ...(req || {}), fichier: nomFichier, variables: variables || [] }) };
    if (don) f["/pw/donnees.php"] = "<?php\n" + enteteDonneesPhp(don) + "\n";
    if (casCode !== null && casCode !== undefined) f["/pw/cas.php"] = "<?php\n" + casCode + "\n";
    return f;
  };
  const avertis = (run) => (run.avert || []).filter(a => a.no !== 8192 && a.no !== 16384).map(a => decrireAvertPhp(a, ctx));
  const libre = await lancerPhp(fichiersPour(requete || tests?.requete, donnees, null));
  const finir = () => { res.duree = Date.now() - t0; return res; };
  if (libre.timeout) { res.timeout = true; res.erreur = { titre:"Trop long", message:`Ton code tourne depuis plus de ${DELAI_PHP / 1000} secondes : sans doute une boucle infinie (vérifie que la condition finit par devenir fausse et que le compteur avance), ou une fonction qui s'appelle sans fin.` }; return finir(); }
  if (libre.panne) { res.erreur = { titre:"PHP indisponible", message:`Le moteur PHP n'a pas pu tourner (${libre.panne}). Recharge la page ; le site doit être ouvert en http://.` }; return finir(); }
  const sortieLibre = libre.sorties.eleve;
  res.console = enLignesPhp(sortieLibre);
  if (aDuHtml(sortieLibre)) res.page = sortieLibre;
  for (const a of avertis(libre)) if (!res.conseils.some(c => c.message === a.message)) res.conseils.push(a);
  if (libre.exception && libre.exception.phase === "eleve") { res.erreur = decrireErreurPhp(libre.exception, ctx); return finir(); }
  if (!tests) { res.ok = true; return finir(); }
  const st = analyseStatiquePhp(code, tests);
  for (const c of st.conseils) if (!res.conseils.some(x => x.id === c.id)) res.conseils.push(c);
  const casListe = tests.cas || [];
  let reussiCours = false;
  const avertCas = [];
  for (const [index, cas] of casListe.entries()) {
    const r = { titre: cas.titre || (index === 0 ? "Données de l'énoncé" : `Autres données (${index})`), ok:true, details:[] };
    const nomFn = cas.fonction || tests.fonction;
    const casCode = cas.code !== undefined ? lignes(cas.code) : nomFn ? `return ${nomFn}(${(cas.args || []).map(phpLitteral).join(", ")});` : null;
    r.appel = cas.appel || (nomFn && cas.code === undefined ? `${nomFn}(${(cas.args || []).map(phpLitteral).join(", ")})` : casCode && casCode.split("\n").length === 1 && casCode.length < 90 ? casCode.replace(/^return\s+/, "").replace(/;\s*$/, "") : undefined);
    const vars = Object.keys(cas.variables || {});
    const run = await lancerPhp(fichiersPour(cas.requete || requete || tests.requete, cas.donnees || donnees, casCode, vars));
    if (run.timeout) { r.ok = false; r.erreur = { titre:"Trop long", message:`Plus de ${DELAI_PHP / 1000} secondes : boucle infinie ?` }; res.cas.push(r); res.timeout = true; continue; }
    if (run.panne) { r.ok = false; r.erreur = { titre:"PHP indisponible", message: run.panne }; res.cas.push(r); continue; }
    avertCas.push(...avertis(run));
    if (run.exception) { r.ok = false; r.erreur = decrireErreurPhp(run.exception, ctx); res.cas.push(r); continue; }
    const sortieCas = casCode !== null ? run.sorties.cas : run.sorties.eleve;
    const toute = run.sorties.eleve + run.sorties.cas;
    if ("attendu" in cas) {
      const obtenu = run.aResultat ? run.resultat : null;
      r.attendu = enPhp(cas.attendu); r.obtenu = enPhp(obtenu);
      if (!egalPhp(obtenu, cas.attendu)) {
        r.ok = false;
        const c0 = casListe[0];
        const dg = diagnostiquerPhp({ ...cas, index }, obtenu, sortieCas, { reussiCours, ...(c0 && "attendu" in c0 && (c0.fonction || tests.fonction) === nomFn && c0.code === cas.code ? { attenduCours: c0.attendu } : {}) });
        if (dg) r.diagnostic = dg;
      }
    }
    if (cas.sortie) {
      const L = enLignesPhp(sortieCas);
      r.sortieAttendue = cas.sortie; r.sortieObtenue = L;
      if (!egal(L, cas.sortie.map(s => s.replace(/\s+$/, "")))) { r.ok = false; const dg = diagnostiquerSortie(cas.sortie, L); if (dg && !r.diagnostic) r.diagnostic = dg; }
    }
    for (const t of cas.contient || []) if (!toute.includes(t)) { r.ok = false; r.details.push(`La page devrait contenir \`${t}\`.`); }
    for (const t of cas.neContientPas || []) if (toute.includes(t)) { r.ok = false; r.details.push(`La page ne devrait pas contenir \`${t}\`.`); }
    if ("redirection" in cas) {
      const loc = redirectionDe(run.entetes);
      if (cas.redirection === false && loc) { r.ok = false; r.details.push(`Pas de redirection attendue ici (tu rediriges vers \`${loc}\`).`); }
      else if (cas.redirection !== false && !loc) { r.ok = false; r.details.push(`On attend une redirection${typeof cas.redirection === "string" ? ` vers \`${cas.redirection}\`` : ""} : \`header('Location: …');\` puis \`exit();\`.`); }
      else if (typeof cas.redirection === "string" && loc && loc !== cas.redirection && !loc.endsWith("/" + cas.redirection)) { r.ok = false; r.details.push(`Tu rediriges vers \`${loc}\`, on attend \`${cas.redirection}\`.`); }
    }
    if (cas.cookies) {
      const c = cookiesDe(run.entetes);
      for (const [nom, val] of Object.entries(cas.cookies)) {
        if (val === null) { if (!c[nom] || c[nom].valeur !== null) { r.ok = false; r.details.push(c[nom] ? `Le cookie \`${nom}\` devrait être supprimé (date d'expiration dans le passé).` : `Le cookie \`${nom}\` devrait être supprimé : \`setcookie('${nom}', '', time() - 3600);\`.`); } }
        else if (!c[nom] || c[nom].valeur === null) { r.ok = false; r.details.push(`On attend un cookie \`${nom}\`${val !== true ? ` qui vaut \`${val}\`` : ""} (setcookie).`); }
        else if (val !== true && c[nom].valeur !== String(val)) { r.ok = false; r.details.push(`Le cookie \`${nom}\` vaut \`${c[nom].valeur}\`, on attend \`${val}\`.`); }
      }
      for (const [nom, s] of Object.entries(cas.dureeCookies || {})) {
        if (c[nom] && c[nom].duree !== null && Math.abs(c[nom].duree - s) > 120) { r.ok = false; r.details.push(`Le cookie \`${nom}\` dure ${Math.round(c[nom].duree / 86400 * 10) / 10} jour(s) ; on attend ${Math.round(s / 86400 * 10) / 10} jour(s) (\`time() + ${s}\`).`); }
        else if (c[nom] && c[nom].duree === null) { r.ok = false; r.details.push(`Le cookie \`${nom}\` n'a pas de date d'expiration : il disparaît à la fermeture du navigateur. Donne-lui une durée : \`time() + ${s}\`.`); }
      }
    }
    if (cas.session) {
      const s = run.session;
      if (!s) { r.ok = false; r.details.push("Aucune session active à la fin : as-tu appelé `session_start()` ?"); }
      else for (const [k, v] of Object.entries(cas.session)) {
        if (!(k in s) && !(Array.isArray(s) && k in s)) { r.ok = false; r.details.push(`La session devrait contenir \`$_SESSION['${k}']\`.`); }
        else if (v !== true && !egalPhp(s[k], v)) { r.ok = false; r.details.push(`\`$_SESSION['${k}']\` vaut ${enPhp(s[k])}, on attend ${enPhp(v)}.`); }
      }
    }
    if (cas.sessionVide && (run.sessionRestante || run.session && Object.keys(run.session).length)) { r.ok = false; r.details.push("La session devrait être vidée (`session_destroy()`), mais elle contient encore des données."); }
    if ("statut" in cas && run.statut !== cas.statut) { r.ok = false; r.details.push(`Code HTTP ${run.statut}, on attend ${cas.statut}.`); }
    for (const [nom, val] of Object.entries(cas.variables || {})) {
      const v = run.variables?.[nom];
      if (v && v.__absente) { r.ok = false; r.details.push(`La variable \`$${nom}\` n'existe pas. Crée-la avec exactement ce nom.`); continue; }
      if (!egalPhp(v, val)) { r.ok = false; r.details.push(`\`$${nom}\` vaut ${enPhp(v)}, on attend ${enPhp(val)}.`); if (estTexteDeNombre(v, val)) r.diagnostic = { id:"texte-vs-nombre", message:`\`$${nom}\` contient du TEXTE au lieu d'un NOMBRE (ou l'inverse) : regarde les guillemets.` }; }
    }
    if (index === 0 && r.ok) reussiCours = true;
    res.cas.push(r);
  }
  for (const a of avertCas) if (!res.conseils.some(c => c.message === a.message)) res.conseils.push(a);
  if (st.bloquants.length) res.diagnostics.push(...st.bloquants);
  const GENERIQUES = ["rien-affiche", "tableau-vide", "donnees-en-dur", "espaces"];
  const rates = res.cas.filter(c => !c.ok);
  const specifique = rates.find(c => c.diagnostic && !GENERIQUES.includes(c.diagnostic.id));
  const iSiEchec = res.cas.findIndex((c, i) => !c.ok && !c.erreur && casListe[i]?.siEchec);
  const rate = specifique || rates.find(c => c.diagnostic) || rates[0];
  if (specifique) res.diagnostics.push(specifique.diagnostic);
  else if (iSiEchec >= 0) res.diagnostics.push({ id:"contenu", message: casListe[iSiEchec].siEchec });
  else if (rate && rate.diagnostic) res.diagnostics.push(rate.diagnostic);
  // pas d'explication précise : un avertissement de PHP (variable inconnue, $this oublié…) ou un conseil l'explique souvent
  if (rate && !res.diagnostics.length && !rate.erreur) { const c = res.conseils.find(x => x.avertissement && x.ligne) || res.conseils.find(x => ["this-dollar", "concat-plus", "sql-concat", "xss"].includes(x.id)); if (c) res.diagnostics.push(c); }
  res.ok = res.cas.every(c => c.ok) && !st.bloquants.length;
  return finir();
}

/* ---------------- enregistrement du langage (js/langages.js) ---------------- */
langage("php", {
  nom:"PHP", module:"code-php", indent:"    ", afficher:"echo …;", ecran:"la page", reAffichage:/\becho\b|\bprint\b/g,
  jetons: jetonsPhp, executer: executerPhp, precharger: prechargerPhp, enteteDonnees: enteteDonneesPhp,
  champs: ["requete", "fichiers", "fichier"],   // requête HTTP simulée, fichiers déjà écrits, nom du fichier de l'élève
  symboles: [["( )", "(", ")"], ["{ }", "{", "}"], ["[ ]", "[", "]"], ["$", "$"], ["->", "->"], ["=>", " => "], [";", ";"], [".", " . "], [",", ", "],
    ['" "', '"', '"'], ["' '", "'", "'"], ["::", "::"], ["===", " === "], ["!==", " !== "], ["&&", " && "], ["||", " || "], ["!", "!"],
    ["=", " = "], ["<", " < "], [">", " > "], ["?", " ? "], [":", ": "], ["<br>", '"<br>"'],
    ["$this->", "$this->"], ["return", "return "], ["echo", "echo "], ["public", "public "], ["private", "private "], ["function", "function "], ["⇥", "    "]],
  consoleDepart: ["<?php", '$fruits = ["pomme", "kiwi", "mangue"];', "", "foreach ($fruits as $fruit) {", '    echo $fruit . "<br>";', "}", ""],
  demo: { faux:'echo Bonjour le monde;', juste:'echo "Bonjour le monde";', motAttendu:"guillemets",
          console:'<?php\n$fruits = ["kiwi"];\nforeach ($fruits as $fruit) {\n    echo $fruits;\n}', consoleAttendu:"Array" },
});
