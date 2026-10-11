/* =====================================================================
   Langages de code : tout ce qui change d'un langage à l'autre, au même endroit.
   Le cours choisit le sien dans config.app.langage ("js", "php", "java", "python"…) ; sans ce champ :
   "php" avec le module code-php, sinon "js". Le reste du moteur (éditeur, coloration, exercices de code,
   console, tests) demande au langage du cours (LANG) au lieu de supposer du JavaScript.

   langage(id, définition) enregistre un langage. Définition :
     nom            "JavaScript" (affiché)
     jetons(code)   → [{ t, v }] : t ∈ com, str, num, kw, lit, fn, prop, var, tag, id, ws, op, ponct, autre (coloration, « pointer »)
     symboles       la barre de symboles de l'éditeur au doigt : [[libellé, insère, referme?], …]
     indent         l'indentation ("  " ou "    ")
     afficher       comment on affiche un résultat dans ce langage ("console.log(…)", "echo …;")
     ecran          où ça s'affiche ("la console", "la page")
     reAffichage    expression qui compte les affichages d'un code (taille de la zone de « prédire »)
     enteteDonnees(donnees)   les données du cours, écrites dans ce langage (en-tête grisé des exercices)
     consoleDepart  le code de départ de la console libre
   Et, seulement si un module l'exécute (sinon : exercices de code sans exécution, voir docs/modules.md) :
     module         le module qui l'exécute ("code-js", "code-php") : il doit être dans config.app.modules
     executer(payload)  → Promise<{ ok, console, erreur?, cas, diagnostics, conseils, page? }> (format de executerTout)
     precharger()   facultatif : démarrer le moteur en avance (appelé au premier exercice ou exemple de code affiché)
     champs         champs propres au langage, recopiés de l'exercice vers executer() (PHP : requete, fichiers, fichier)
     demo           pour tools/test-parcours.py : { faux, juste, motAttendu } (« Affiche Bonjour le monde ») et
                    { console, consoleAttendu } (une erreur de la console libre, et un mot de son explication)
   ===================================================================== */
const LANGAGES = {};
function langage(id, def){ LANGAGES[id] = { id, indent:"  ", ecran:"la console", reAffichage:/(?!)/g, enteteDonnees:() => "", consoleDepart:[""], ...def }; }
let LANG = null;   // le langage du cours : fixé par appliquerApp (js/base.js)
const aCode = () => !!(LANG && LANG.executer && aModule(LANG.module));   // le cours exécute-t-il du code ?
// champs propres au langage, pris sur un exercice, une carte ou un exemple, pour executer()
const champsExec = src => Object.fromEntries((LANG?.champs || []).filter(k => src && src[k] !== undefined).map(k => [k, src[k]]));
let prechargeFait = false;
const prechargerLangage = () => { if (!prechargeFait && aCode() && LANG.precharger) { prechargeFait = true; setTimeout(() => LANG.precharger(), 50); } };

/* découpage en jetons d'un langage « simple » (coloration seulement) : commentaires, chaînes, nombres, variables, mots */
function jetonsSimples(o){
  const parties = [o.commentaires || "(?!)", o.chaines || String.raw`"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?`,
    String.raw`\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[fFlLdDmM]?|\.\d+`, o.variables || "(?!)", o.annotations || "(?!)",
    String.raw`[A-Za-z_À-ÿ][\wÀ-ÿ]*`, String.raw`\s+`,
    o.operateurs || String.raw`->|=>|::|\+\+|--|&&|\|\||<<|>>|[=!<>]=|[-+*/%&|^]=|[-+*/%<>=!?:&|^~@.]`, String.raw`[()[\]{};,]`, String.raw`[\s\S]`];
  const re = new RegExp(parties.map(p => `(${p})`).join("|"), "g");
  const mot = o.casse === false ? v => v.toLowerCase() : v => v;
  return code => {
    const out = []; let m; re.lastIndex = 0;
    while ((m = re.exec(code))) {
      const v = m[0];
      if (m[1]) out.push({ t:"com", v }); else if (m[2]) out.push({ t:"str", v }); else if (m[3]) out.push({ t:"num", v });
      else if (m[4]) out.push({ t:"var", v }); else if (m[5]) out.push({ t:"tag", v });
      else if (m[6]) {
        const avant = [...out].reverse().find(j => j.t !== "ws");
        const t = o.motsCles.has(mot(v)) ? "kw" : (o.litteraux || new Set()).has(mot(v)) ? "lit"
          : /^\s*\(/.test(code.slice(re.lastIndex)) ? "fn" : avant?.v === "." ? "prop" : "id";
        out.push({ t, v });
      }
      else if (m[7]) out.push({ t:"ws", v }); else if (m[8]) out.push({ t:"op", v }); else if (m[9]) out.push({ t:"ponct", v }); else out.push({ t:"autre", v });
    }
    return out;
  };
}
const ensembleMots = s => new Set(s.split(" "));
const COM_C = String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`;
// barre de symboles commune aux langages à accolades ; chacun ajoute ses mots
const SYMBOLES_BASE = [["( )", "(", ")"], ["{ }", "{", "}"], ["[ ]", "[", "]"], [";", ";"], [".", "."], [",", ", "], ['" "', '"', '"'],
  ["==", " == "], ["!=", " != "], ["&&", " && "], ["||", " || "], ["=", " = "], ["<", " < "], [">", " > "], ["+", " + "], ["-", " - "], ["*", " * "], ["/", " / "], ["%", " % "]];

/* ---------------- JavaScript : exécuté par le module code-js (js/banc.js, js/worker.js) ---------------- */
langage("js", {
  nom:"JavaScript", module:"code-js",
  jetons: code => jetons(code),               // js/banc.js (aussi utilisé par l'analyse du code dans le Worker)
  executer: payload => executerJs(payload),   // js/base.js
  symboles: [["( )", "(", ")"], ["{ }", "{", "}"], ["[ ]", "[", "]"], ["=>", " => "], [";", ";"], [".", "."], [",", ", "],
    ['" "', '"', '"'], ["' '", "'", "'"], ["...", "..."], ["===", " === "], ["!==", " !== "], ["&&", " && "], ["||", " || "],
    ["%", " % "], ["+", " + "], ["-", " - "], ["*", " * "], ["<", " < "], [">", " > "], ["=", " = "], ["!", "!"], ["?", " ? "], [":", ": "],
    ["return", "return "], ["const", "const "], ["log", "console.log(", ")"], ["⇥", "  "]],
  afficher:"console.log(…)", reAffichage:/console\.log\(/g,
  enteteDonnees: d => d ? Object.entries(d).map(([k, v]) => `const ${k} = ${v && typeof v === "object" ? `Object.freeze(${enCode(v)})` : enCode(v)};`).join("\n") : "",
  consoleDepart: ['const fruits = ["pomme", "kiwi", "mangue"];', "", "fruits.forEach((fruit) => console.log(fruit));", ""],
  demo: { faux:'console.log(Bonjour le monde);', juste:'console.log("Bonjour le monde");', motAttendu:"guillemets",
          console:'const fruits = ["kiwi"];\nfruits.forEach((fruits) => console.log(fruit));', consoleAttendu:"fruit" },
});

/* ---------------- langages sans exécution (coloration, éditeur, exercices « prédire », « bug », « parsons »…) ----------------
   Un module pourra les exécuter plus tard (docs/modules.md) : il complète alors la définition (module, executer…). */
langage("java", { nom:"Java", indent:"    ", afficher:"System.out.println(…);", reAffichage:/System\.out\.print/g,
  jetons: jetonsSimples({ commentaires: COM_C, annotations: String.raw`@[A-Za-z_]\w*`,
    motsCles: ensembleMots("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public record return short static super switch synchronized this throw throws try var void volatile while String"),
    litteraux: ensembleMots("true false null") }),
  symboles: [...SYMBOLES_BASE, ["public", "public "], ["static", "static "], ["void", "void "], ["int", "int "], ["String", "String "], ["new", "new "], ["return", "return "], ["println", "System.out.println(", ");"], ["⇥", "    "]] });
langage("python", { nom:"Python", indent:"    ", afficher:"print(…)", reAffichage:/\bprint\(/g,
  jetons: jetonsSimples({ commentaires: String.raw`#[^\n]*`, chaines: String.raw`"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[fFrRbB]?"(?:[^"\\\n]|\\.)*"?|[fFrRbB]?'(?:[^'\\\n]|\\.)*'?`, annotations: String.raw`@[A-Za-z_]\w*`,
    motsCles: ensembleMots("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self"),
    litteraux: ensembleMots("True False None") }),
  symboles: [["( )", "(", ")"], ["[ ]", "[", "]"], ["{ }", "{", "}"], [":", ":"], ['" "', '"', '"'], ["' '", "'", "'"], [",", ", "], [".", "."], ["==", " == "], ["!=", " != "], ["=", " = "], ["<", " < "], [">", " > "], ["+", " + "], ["-", " - "], ["*", " * "], ["/", " / "], ["%", " % "],
    ["def", "def "], ["return", "return "], ["for", "for "], ["in", " in "], ["if", "if "], ["print", "print(", ")"], ["⇥", "    "]] });
const MOTS_C = "auto break case char const continue default do double else enum extern float for goto if inline int long register return short signed sizeof static struct switch typedef union unsigned void volatile while";
langage("c", { nom:"C", indent:"    ", afficher:"printf(…);", reAffichage:/\bprintf\(/g,
  jetons: jetonsSimples({ commentaires: COM_C, annotations: String.raw`#\s*\w+`, motsCles: ensembleMots(MOTS_C), litteraux: ensembleMots("NULL true false") }),
  symboles: [...SYMBOLES_BASE, ["&", "&"], ["*", "*"], ["->", "->"], ["int", "int "], ["char", "char "], ["return", "return "], ["printf", 'printf("', '");'], ["⇥", "    "]] });
langage("cpp", { nom:"C++", indent:"    ", afficher:"std::cout << … ;", reAffichage:/cout\s*<</g,
  jetons: jetonsSimples({ commentaires: COM_C, annotations: String.raw`#\s*\w+`, motsCles: ensembleMots(MOTS_C + " bool catch class delete explicit friend namespace new nullptr operator private protected public template this throw try typename using virtual std string vector auto"), litteraux: ensembleMots("true false nullptr NULL") }),
  symboles: [...SYMBOLES_BASE, ["::", "::"], ["<<", " << "], ["->", "->"], ["&", "&"], ["int", "int "], ["return", "return "], ["cout", "std::cout << ", ";"], ["⇥", "    "]] });
langage("csharp", { nom:"C#", indent:"    ", afficher:"Console.WriteLine(…);", reAffichage:/Console\.Write/g,
  jetons: jetonsSimples({ commentaires: COM_C, chaines: String.raw`\$?@?"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?`, annotations: String.raw`\[[A-Z]\w*\]`,
    motsCles: ensembleMots("abstract as async await base bool break case catch char class const continue decimal default do double else enum false finally float for foreach get if in int interface internal is long namespace new null object out override private protected public readonly record ref return set static string struct switch this throw try using var virtual void while"),
    litteraux: ensembleMots("true false null") }),
  symboles: [...SYMBOLES_BASE, ["=>", " => "], ["public", "public "], ["static", "static "], ["void", "void "], ["int", "int "], ["string", "string "], ["new", "new "], ["return", "return "], ["WriteLine", "Console.WriteLine(", ");"], ["⇥", "    "]] });
langage("sql", { nom:"SQL", afficher:"SELECT …", reAffichage:/\bselect\b/gi,
  jetons: jetonsSimples({ commentaires: String.raw`--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`, casse: false, chaines: String.raw`'(?:[^'\n]|'')*'?|"[^"\n]*"?|\x60[^\x60\n]*\x60?`,
    motsCles: ensembleMots("select from where and or not in is like between order by group having limit offset insert into values update set delete create table alter drop primary key foreign references join inner left right outer on as distinct count sum avg min max union all exists case when then else end index view default unique check constraint int integer varchar text date datetime boolean auto_increment"),
    litteraux: ensembleMots("null true false") }),
  symboles: [["( )", "(", ")"], ["' '", "'", "'"], [",", ", "], [";", ";"], ["*", "*"], ["=", " = "], ["<>", " <> "], ["<", " < "], [">", " > "], ["SELECT", "SELECT "], ["FROM", "FROM "], ["WHERE", "WHERE "], ["AND", " AND "], ["JOIN", "JOIN "], ["ON", " ON "], ["GROUP BY", "GROUP BY "], ["ORDER BY", "ORDER BY "], ["⇥", "  "]] });
langage("bash", { nom:"Bash", afficher:"echo …", ecran:"le terminal", reAffichage:/\becho\b/g,
  jetons: jetonsSimples({ commentaires: String.raw`#[^\n]*`, variables: String.raw`\$\{[^}\n]*\}?|\$[\w@#?$!*-]`,
    motsCles: ensembleMots("if then else elif fi for while until do done case esac in function return local export echo cd ls mkdir rm cp mv cat grep chmod chown sudo touch pwd source exit read"),
    operateurs: String.raw`&&|\|\||>>|<<|[|&;<>=!]` }),
  symboles: [["|", " | "], [">", " > "], [">>", " >> "], ["&&", " && "], ["$", "$"], ['" "', '"', '"'], ["' '", "'", "'"], ["/", "/"], ["~", "~"], ["-", "-"], ["*", "*"], ["cd", "cd "], ["ls", "ls "], ["echo", "echo "], ["⇥", "  "]] });
