/* Source du Web Worker PHP (module « code-php ») : PHP 8.3 compilé en WebAssembly (@php-wasm, projet WordPress Playground).
   Assemblé en un seul fichier par tools/php-wasm/construire.sh → js/vendor/php-wasm/php-worker.js (avec php_8_3.wasm à côté).
   Le worker reste vivant d'une exécution à l'autre (PHP met 1 à 3 s à démarrer) ; chaque exécution est une requête neuve :
   PHP oublie classes, fonctions et variables entre deux run(). La page (js/php.js) le tue s'il tourne en rond.
   Message reçu : { id, fichiers: { "/chemin": "contenu" }, script: "/pw/harnais.php" } → réponse { type:"fini", id, texte, erreurs, code }. */
import { loadPHPRuntime, PHP } from '@php-wasm/universal';
import * as chargeur from '@php-wasm/web-8-3/asyncify/php_8_3.js';

let php = null;
async function pret() {
  if (!php) {
    const id = await loadPHPRuntime(chargeur, { locateFile: () => new URL('php_8_3.wasm', self.location.href).href });
    php = new PHP(id);
  }
  return php;
}
const dossier = (c) => c.slice(0, c.lastIndexOf('/')) || '/';
self.onmessage = async ({ data }) => {
  let p;
  try { p = await pret(); }
  catch (e) { self.postMessage({ type: 'panne', id: data.id, message: String(e && e.message || e) }); return; }
  if (data.type === 'prechauffer') { self.postMessage({ type: 'pret' }); return; }
  self.postMessage({ type: 'demarre', id: data.id });
  for (const d of ['/app', '/pw']) { try { if (p.isDir(d)) p.rmdir(d, { recursive: true }); } catch (e) {} }
  for (const [chemin, contenu] of Object.entries(data.fichiers || {})) { p.mkdir(dossier(chemin)); p.writeFile(chemin, contenu); }
  let res;
  try {
    const r = await p.run({ scriptPath: data.script });
    res = { texte: r.text, erreurs: r.errors, code: r.exitCode };
  } catch (e) {   // code de sortie 255 (erreur fatale) : la réponse reste lisible
    res = { texte: e && e.response ? e.response.text : '', erreurs: e && e.response ? e.response.errors : String(e && e.message || e), code: 255 };
  }
  self.postMessage({ type: 'fini', id: data.id, ...res });
};
