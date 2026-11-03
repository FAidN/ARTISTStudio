// Reprise des données de l'ancien dossier de l'application vers le nouveau.
// L'ancien dossier n'est jamais modifié : on copie seulement quelques fichiers, une seule fois.
const fs = require('fs'), path = require('path');
const FILES = ['data.json', 'data.bak.json', 'token.bin', 'keys.bin'];
const lire = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
// Un dossier "vide" ne contient que les valeurs de départ : aucune donnée de l'artiste à protéger.
const vide = d => !d || (!(d.contacts || []).length && !(d.resources || []).length && !(d.todos || []).length && (d.deals || []).length <= 1);

module.exports = (oldDir, newDir) => {
  const flag = path.join(newDir, 'reprise.ok'), nd = path.join(newDir, 'data.json');
  if (fs.existsSync(flag)) return 'deja-fait';
  const od = path.join(oldDir, 'data.json'), ob = path.join(oldDir, 'data.bak.json');
  const src = lire(od) ? od : lire(ob) ? ob : null;
  if (!src) return 'rien-a-reprendre';
  fs.mkdirSync(newDir, { recursive: true });
  let r = 'donnees-conservees';
  if (vide(lire(nd))) {
    if (fs.existsSync(nd)) fs.copyFileSync(nd, path.join(newDir, 'data.avant-reprise.json'));
    for (const n of FILES) if (fs.existsSync(path.join(oldDir, n))) fs.copyFileSync(path.join(oldDir, n), path.join(newDir, n));
    if (src === ob) fs.copyFileSync(ob, nd);
    r = 'reprise';
  }
  fs.writeFileSync(flag, new Date().toISOString());
  return r;
};
