// Échange de données entre appareils et entre personnes : export, import, fusion.
// Chaque élément porte un identifiant stable (uid) et une date de modification (mod).
// Les suppressions sont mémorisées (tomb) pour que la fusion ne ressuscite pas un élément supprimé.
(function (root) {
  'use strict';
  const LISTS = ['deals', 'contacts', 'todos', 'resources'];
  const PLATS = ['youtube', 'soundcloud', 'mixcloud', 'deezer', 'instagram', 'tiktok'];
  const SPEC = {
    deals: { v: 's', c: 's', d: 'date', t: 'time', du: 'n', f: 's', k: 'ref', u: 'n', s: 'st', pub: 'b' },
    contacts: { n: 's', o: 's', e: 's', p: 's', i: 's', nt: 'long', ls: 'arr', pin: 'b' },
    todos: { t: 's', ty: 's', d: 'date', k: 'ref', done: 'b' },
    resources: { name: 's', path: 'path', tag: 's', where: 's' }
  };
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const gen = () => (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const sigOf = x => JSON.stringify(x, (k, v) => (k === 'mod' || k === 'uid' ? undefined : v));
  const nextId = L => Math.max(0, ...L.map(y => +y.id || 0)) + 1;
  const isLocal = r => !/^https?:\/\//i.test(r.path || '');
  const KEY = { deals: x => low(x.v) + '|' + (x.d || ''), contacts: x => low(x.n) + '|' + low(x.o), todos: x => low(x.t) + '|' + (x.d || '') + '|' + low(x.ty), resources: x => low(x.path) };
  const VALID = { deals: x => !!x.v, contacts: x => !!x.n, todos: x => !!x.t, resources: x => !!x.name && !!x.path };
  const clone = o => JSON.parse(JSON.stringify(o));
  // départage deux modifications simultanées de la même façon sur tous les appareils
  const fsig = (L, x) => JSON.stringify(Object.keys(SPEC[L]).filter(k => k !== 'k').sort().map(k => x[k]));

  // Nettoyage : seuls les champs connus sont conservés, avec leur type.
  function cleanItem(L, x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    const out = {};
    for (const k of Object.keys(SPEC[L])) {
      const v = Object.prototype.hasOwnProperty.call(x, k) ? x[k] : undefined; if (v === undefined || v === null) continue;
      switch (SPEC[L][k]) {
        case 's': out[k] = String(v).slice(0, 300); break;
        case 'long': out[k] = String(v).slice(0, 2000); break;
        case 'path': out[k] = String(v).slice(0, 500); break;
        case 'date': if (v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v; break;
        case 'time': if (v === '' || /^\d{2}:\d{2}$/.test(v)) out[k] = v; break;
        case 'n': if (isFinite(+v)) out[k] = +v; break;
        case 'ref': out[k] = Number.isInteger(+v) && +v > 0 ? +v : 0; break;
        case 'st': out[k] = Math.min(3, Math.max(0, Math.round(+v) || 0)); break;
        case 'b': out[k] = !!v; break;
        case 'arr': out[k] = Array.isArray(v) ? [...new Set(v.map(a => String(a).trim().slice(0, 24)).filter(Boolean))].slice(0, 20) : []; break;
      }
    }
    out.uid = typeof x.uid === 'string' && /^[\w-]{6,64}$/.test(x.uid) ? x.uid : null;
    out.mod = isFinite(+x.mod) && +x.mod > 0 ? +x.mod : 0;
    out.id = Number.isInteger(+x.id) && +x.id > 0 ? +x.id : 0;
    return out;
  }

  // Identifiants et dates de modification pour les données existantes
  function init(S) {
    S.tomb = S.tomb || {}; S.sig = {}; const now = Date.now();
    LISTS.forEach(L => (S[L] = S[L] || []).forEach(x => { if (!x.uid) x.uid = gen(); if (!x.mod) x.mod = now; S.sig[x.uid] = sigOf(x); }));
  }
  // Détecte ce qui a changé depuis la dernière sauvegarde (modifications, créations, suppressions)
  function stamp(S) {
    S.tomb = S.tomb || {}; S.sig = S.sig || {};
    const now = Date.now(), seen = new Set();
    LISTS.forEach(L => (S[L] = S[L] || []).forEach(x => {
      if (!x.uid) x.uid = gen();
      seen.add(x.uid); const sg = sigOf(x);
      if (S.sig[x.uid] !== sg) { x.mod = now; S.sig[x.uid] = sg; }
      delete S.tomb[x.uid];
    }));
    Object.keys(S.sig).forEach(u => { if (!seen.has(u)) { S.tomb[u] = now; delete S.sig[u]; } });
    Object.keys(S.tomb).forEach(u => { if (now - S.tomb[u] > 365 * 864e5) delete S.tomb[u]; });
  }
  const rebuild = S => { S.sig = {}; LISTS.forEach(L => S[L].forEach(x => { S.sig[x.uid] = sigOf(x); })); };

  // ---- export
  function build(S, scope, info) {
    stamp(S);
    const data = {}, out = { app: 'ARTIST Studio', format: 1, version: (info && info.version) || '', from: (info && info.name) || '', exportedAt: new Date().toISOString(), data };
    LISTS.filter(L => scope[L]).forEach(L => { data[L] = S[L].map(x => { const c = cleanItem(L, x); c.uid = x.uid; c.mod = x.mod || 0; c.id = x.id; return c; }); });
    if (scope.contacts) data.labels = (S.settings.labels || []).slice(0, 50);
    if (scope.audience) data.audience = { accounts: clone(S.settings.accounts || {}), order: (S.settings.order || []).slice(), goals: clone(S.goals || {}), hist: clone(S.hist || {}) };
    data.tomb = clone(S.tomb || {});
    return out;
  }
  function validate(f) {
    if (!f || typeof f !== 'object' || f.app !== 'ARTIST Studio' || !f.data || typeof f.data !== 'object') return { ok: false, error: "Ce fichier n'est pas un export ARTIST Studio" };
    if (f.format !== 1) return { ok: false, error: 'Ce fichier vient d\'une version plus récente d\'ARTIST Studio' };
    return { ok: true };
  }
  const has = (f, k) => k === 'audience' ? !!(f.data && f.data.audience && typeof f.data.audience === 'object') : Array.isArray(f.data && f.data[k]);
  const count = (f, k) => k === 'audience' ? Object.keys((f.data.audience && f.data.audience.hist) || {}).length : (f.data[k] || []).length;

  const goodLabel = l => String(l == null ? '' : l).trim().replace(/\s+/g, ' ').slice(0, 24);
  function addLabels(W, labels, defaults) {
    const known = new Set([...defaults, ...W.settings.labels].map(low));
    let n = 0;
    labels.map(goodLabel).filter(Boolean).forEach(l => { if (!known.has(low(l)) && W.settings.labels.length < 60) { W.settings.labels.push(l); known.add(low(l)); n++; } });
    return n;
  }

  // ---- fusion (calcul sur une copie ; appliquée à S seulement si apply = true)
  function merge(S, file, scope, apply, opts) {
    stamp(S);
    const defaults = (opts && opts.defaultLabels) || [], inc = file.data;
    const W = clone({ deals: S.deals, contacts: S.contacts, todos: S.todos, resources: S.resources, tomb: S.tomb || {}, settings: { labels: S.settings.labels || [], accounts: S.settings.accounts || {} }, goals: S.goals || {}, hist: S.hist || {} });
    const res = { lists: {}, skippedLocal: 0, labels: 0, accounts: 0, goals: 0, hist: 0 };
    const cmap = {};
    ['contacts', 'deals', 'todos', 'resources'].forEach(L => {
      if (!scope[L] || !Array.isArray(inc[L])) return;
      const R = res.lists[L] = { added: 0, updated: 0, same: 0, kept: 0, removed: 0, skippedDeleted: 0 };
      const byUid = new Map(W[L].map(x => [x.uid, x])), byKey = new Map(W[L].map(x => [KEY[L](x), x]));
      inc[L].forEach(raw => {
        const x = cleanItem(L, raw); if (!x || !VALID[L](x)) return;
        if (L === 'resources' && isLocal(x)) { res.skippedLocal++; return; }
        let cur = x.uid ? byUid.get(x.uid) : null;
        if (!cur) {                                   // même élément créé de part et d'autre : on le rattache
          const m = byKey.get(KEY[L](x));
          if (m && (!x.uid || !byUid.has(x.uid))) { cur = m; if (x.uid) { byUid.delete(cur.uid); cur.uid = x.uid; byUid.set(x.uid, cur); } }
        }
        if (!cur) {
          const tb = W.tomb[x.uid]; if (x.uid && tb && tb >= x.mod) { R.skippedDeleted++; return; }
          const item = { ...x, id: nextId(W[L]), uid: x.uid || gen(), mod: x.mod || Date.now() };
          if ('k' in item) item.k = cmap[x.k] || 0;
          W[L].push(item); byUid.set(item.uid, item); byKey.set(KEY[L](item), item); R.added++;
          if (L === 'contacts' && raw.id) cmap[raw.id] = item.id;
          return;
        }
        if (L === 'contacts' && raw.id) cmap[raw.id] = cur.id;
        if (x.mod > (cur.mod || 0) || (x.mod === (cur.mod || 0) && fsig(L, x) > fsig(L, cur))) {
          const before = sigOf(cur);
          Object.keys(SPEC[L]).forEach(k => { if (k === 'k') { if (cmap[x.k]) cur.k = cmap[x.k]; else if ('k' in x && !x.k) cur.k = 0; } else if (k in x) cur[k] = x[k]; });
          cur.mod = x.mod;
          if (sigOf(cur) === before) R.same++; else R.updated++;
        } else if (sigOf({ ...cur, ...x, id: cur.id, k: cur.k, mod: 0, uid: 0 }) === sigOf({ ...cur, mod: 0, uid: 0 })) R.same++;
        else R.kept++;
      });
    });
    // suppressions faites ailleurs
    Object.entries(inc.tomb || {}).forEach(([u, at]) => {
      at = +at; if (!isFinite(at) || !/^[\w-]{6,64}$/.test(u)) return;
      LISTS.filter(L => scope[L] && res.lists[L]).forEach(L => {
        const i = W[L].findIndex(y => y.uid === u);
        if (i >= 0 && (W[L][i].mod || 0) < at) { const gone = W[L].splice(i, 1)[0]; res.lists[L].removed++; if (L === 'contacts') ['deals', 'todos'].forEach(M => W[M].forEach(y => { if (y.k === gone.id) y.k = 0; })); }
      });
      if (!(W.tomb[u] >= at)) W.tomb[u] = at;
    });
    if (scope.contacts) {
      if (Array.isArray(inc.labels)) res.labels += addLabels(W, inc.labels, defaults);
      res.labels += addLabels(W, [].concat(...W.contacts.map(c => c.ls || [])), defaults);
    }
    if (scope.audience && inc.audience) {
      const A = inc.audience;
      Object.keys(A.accounts || {}).forEach(k => { const v = String(A.accounts[k] || '').trim().slice(0, 100); if (PLATS.includes(k) && v && !W.settings.accounts[k]) { W.settings.accounts[k] = v; res.accounts++; } });
      Object.keys(A.goals || {}).forEach(k => { const n = Math.round(+A.goals[k]); if (PLATS.includes(k) && n > 0 && !W.goals[k]) { W.goals[k] = n; res.goals++; } });
      Object.keys(A.hist || {}).forEach(d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !A.hist[d] || typeof A.hist[d] !== 'object') return; Object.keys(A.hist[d]).forEach(k => { const n = +A.hist[d][k]; if (PLATS.includes(k) && isFinite(n) && n >= 0 && !(W.hist[d] && W.hist[d][k] != null)) { (W.hist[d] = W.hist[d] || {})[k] = n; res.hist++; } }); });
    }
    if (apply) {
      LISTS.forEach(L => { S[L] = W[L]; }); S.tomb = W.tomb; S.settings.labels = W.settings.labels; S.settings.accounts = W.settings.accounts; S.goals = W.goals; S.hist = W.hist; rebuild(S);
    }
    return res;
  }

  // ---- remplacement
  function replace(S, file, scope, apply, opts) {
    const defaults = (opts && opts.defaultLabels) || [], inc = file.data, res = { lists: {}, labels: 0 };
    const W = {};
    LISTS.forEach(L => {
      if (!scope[L] || !Array.isArray(inc[L])) return;
      const used = new Set(), seen = new Set(), L2 = [];
      inc[L].forEach(raw => { const x = cleanItem(L, raw); if (!x || !VALID[L](x)) return; if (x.uid && seen.has(x.uid)) return; if (x.uid) seen.add(x.uid); L2.push(x); });
      L2.forEach(x => { if (!x.uid) x.uid = gen(); if (!x.mod) x.mod = Date.now(); if (!x.id || used.has(x.id)) x.id = 0; else used.add(x.id); });
      L2.forEach(x => { if (!x.id) { let n = 1; while (used.has(n)) n++; x.id = n; used.add(n); } });
      W[L] = L2; res.lists[L] = { before: (S[L] || []).length, after: L2.length };
    });
    if (W.deals || W.todos) {
      const ids = new Set((W.contacts || (scope.contacts ? [] : S.contacts) || []).map(c => c.id));
      ['deals', 'todos'].forEach(M => (W[M] || []).forEach(y => { if (y.k && !ids.has(y.k)) y.k = 0; }));
    }
    if (apply) {
      Object.keys(W).forEach(L => { S[L] = W[L]; W[L].forEach(x => { delete (S.tomb = S.tomb || {})[x.uid]; }); });
      if (W.contacts) { S.settings.labels = []; addLabels(S2(S), Array.isArray(inc.labels) ? inc.labels : [], defaults); addLabels(S2(S), [].concat(...S.contacts.map(c => c.ls || [])), defaults); }
      if (scope.audience && inc.audience) {
        const A = inc.audience, acc = {}, goals = {}, hist = {};
        Object.keys(A.accounts || {}).forEach(k => { const v = String(A.accounts[k] || '').trim().slice(0, 100); if (PLATS.includes(k) && v) acc[k] = v; });
        Object.keys(A.goals || {}).forEach(k => { const n = Math.round(+A.goals[k]); if (PLATS.includes(k) && n > 0) goals[k] = n; });
        Object.keys(A.hist || {}).forEach(d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !A.hist[d] || typeof A.hist[d] !== 'object') return; Object.keys(A.hist[d]).forEach(k => { const n = +A.hist[d][k]; if (PLATS.includes(k) && isFinite(n) && n >= 0) (hist[d] = hist[d] || {})[k] = n; }); });
        S.settings.accounts = acc; S.goals = goals; S.hist = hist;
      }
      rebuild(S);
    }
    return res;
  }
  const S2 = S => ({ settings: S.settings });

  root.Share = { LISTS, init, stamp, rebuild, build, validate, has, count, merge, replace, cleanItem, isLocal };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Share;
})(typeof window !== 'undefined' ? window : globalThis);
