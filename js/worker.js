/* Bac à sable : exécute le code de l'élève loin de la page (pas de DOM, pas de sauvegarde accessibles).
   Un worker neuf par exécution : aucune variable ne survit d'un essai à l'autre. La page le tue s'il dépasse le temps permis. */
importScripts("banc.js");
self.onmessage = (e) => {
  let res;
  try { res = executerTout(e.data); }
  catch(err) { res = { ok:false, console:[], cas:[], diagnostics:[], conseils:[], erreur:{ titre:"Erreur", message:"Le banc d'essai a rencontré un problème inattendu : " + (err && err.message || err) } }; }
  self.postMessage(res);
};
