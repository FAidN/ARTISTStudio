const ST = ['Contact', 'Relance', 'Négociation', 'Validé'], CL = ['#7fb3d5', '#f0a35e', '#e6b1c4', '#9cc27a'], TAGS = ['Perso', 'Organisateurs', 'Privé', 'Public'];
const PL = {
  youtube: { n: 'YouTube', l: 'abonnés', c: '#e6b1c4', auto: 1, vu: 'vues', ll: 'Dernière vidéo' },
  instagram: { n: 'Instagram', l: 'abonnés', c: '#f4dfe7', social: 1, key: 'ig', u: 'publications', ll: 'Dernier post' },
  tiktok: { n: 'TikTok', l: 'abonnés', c: '#7fb3d5', social: 1, key: 'ttr', u: 'vidéos', ll: 'Dernière vidéo' },
  soundcloud: { n: 'SoundCloud', l: 'abonnés', c: '#f0a35e', auto: 1, u: 'morceaux', vu: 'écoutes', ll: 'Dernier son' },
  mixcloud: { n: 'Mixcloud', l: 'abonnés', c: '#9c9f69', auto: 1, u: 'mixes', vu: 'écoutes', ll: 'Dernier mix' },
  deezer: { n: 'Deezer', l: 'fans', c: '#9cc27a', auto: 1, u: 'albums', ll: 'Dernière sortie' }
};
const DUR = [0, 30, 60, 90, 120, 180, 240, 300, 360];
let S, view = 'home', flt = 'Tout', tt, editId = null, ex = new Set(), busy = false, lastView = null, fresh = false, calAnim = false, focus = null, archOpen = false, navInit = false, cflt = 'Tous', cq = '', addingLabel = false, dragL = null, tstep = 0, APPVER = '';
const $ = id => document.getElementById(id);
const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => Number(n).toLocaleString('fr-FR');
const fee = x => parseFloat(String(x.f ?? '').replace(',', '.')) || 0;
const eur = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dur = m => !m ? '' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
const when = x => [x.t, dur(x.du)].filter(Boolean).join(', ');
const today = () => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
const days = d => Math.round((new Date(d + 'T12:00') - new Date(today() + 'T12:00')) / 864e5);
const fd = d => d ? new Date(d + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à fixer';
const dt = d => d ? `<b>${d.slice(8)}</b><small>${new Date(d + 'T12:00').toLocaleDateString('fr-FR', { month: 'short' })}</small>` : '<b>?</b><small>à fixer</small>';
const dot = () => `<i style="background:${S.hasToken ? 'var(--p2)' : 'var(--p4)'}"></i>`;
function toast(t, ms = 2400) { const o = $('toast'); o.textContent = t; o.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => o.classList.remove('show'), ms); }
const persist = () => { Share.stamp(S); return api.save({ deals: S.deals, resources: S.resources, settings: S.settings, todos: S.todos, contacts: S.contacts, social: S.social, hist: S.hist, goals: S.goals, tomb: S.tomb }); };
async function sync() {
  toast('Synchronisation avec le site en cours');
  const r = await api.publish({ deals: S.deals, settings: S.settings });
  r.ok ? toast('Site mis à jour, visible dans environ 1 minute', 3500) : toast(r.error, 6000);
}
const pl = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const ymk = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const ago = t => { const d = Math.floor((Date.now() - new Date(t)) / 864e5); return d < 1 ? "aujourd'hui" : d == 1 ? 'hier' : 'il y a ' + d + ' j'; };
const hm = t => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const hello = () => { const h = new Date().getHours(); return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir'; };
const on = k => PL[k].social ? !!S.keys[PL[k].key] : !!S.settings.accounts[k];
const val = k => (PL[k].social ? S.social[k] : S.stats && S.stats[k]) || null;
const dayOf = t => new Date(t).toLocaleDateString('sv-SE');
const dkey = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const pct1 = x => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
const sgn = n => (n > 0 ? '+' : n < 0 ? '-' : '') + nf(Math.abs(n));
const eng = v => { const l = v && v.last; if (!l || !v.fans || (l.likes == null && l.comments == null)) return null; return ['likes', 'comments', 'shares'].reduce((a, f) => a + (+l[f] || 0), 0) / v.fans * 100; };
function snap() {
  S.hist = S.hist || {};
  const T = today();
  Object.keys(PL).filter(on).forEach(k => {
    const v = val(k); if (!v || v.fans == null) return;
    const d = PL[k].social ? (v.at ? dayOf(v.at) : null) : T;
    if (d) (S.hist[d] = S.hist[d] || {})[k] = v.fans;
  });
  const ks = Object.keys(S.hist).sort(); ks.slice(0, Math.max(0, ks.length - 400)).forEach(k => delete S.hist[k]);
  persist();
}
function growth(k, nb = 30) {
  const lim = dkey(nb), ds = Object.keys(S.hist || {}).filter(d => d >= lim && S.hist[d][k] != null).sort();
  return ds.length < 2 ? null : { d: S.hist[ds[ds.length - 1]][k] - S.hist[ds[0]][k], from: ds[0], to: ds[ds.length - 1] };
}
function pser(k) { const H = S.hist || {}; return Object.keys(H).sort().filter(d => H[d][k] != null).slice(-60).map(d => ({ d, v: H[d][k] })); }
function series() {
  const H = S.hist || {}, plats = S.settings.order.filter(on), need = plats.filter(k => val(k) && val(k).fans != null).length, last = {}, out = [];
  Object.keys(H).sort().forEach(d => {
    plats.forEach(k => { if (H[d][k] != null) last[k] = H[d][k]; });
    if (need && Object.keys(last).length >= need) out.push({ d, v: Object.values(last).reduce((a, n) => a + n, 0) });
  });
  return out.slice(-90);
}
const ab = n => nf(n) + ' abonné' + (n > 1 ? 's' : '');
function goalCalc(k) {
  const v = val(k), fans = v && v.fans != null ? v.fans : 0, goal = +(S.goals || {})[k] || 0, g = growth(k);
  if (!goal) return { fans, goal, pc: 0, note: '' };
  if (fans >= goal) return { fans, goal, pc: 100, note: 'Objectif atteint' };
  let note = `Il reste ${ab(goal - fans)}`;
  if (g && g.d > 0) {
    const dd = Math.max(1, Math.round((new Date(g.to) - new Date(g.from)) / 864e5)), eta = (goal - fans) / (g.d / dd);
    note += `, objectif atteint dans environ ${eta < 60 ? Math.round(eta) + ' jours' : eta < 730 ? Math.round(eta / 30) + ' mois' : 'plus de 2 ans'} à ce rythme`;
  }
  return { fans, goal, pc: fans / goal * 100, note };
}
const totalPlays = L => L.reduce((a, k) => a + ((val(k) && val(k).views) || 0), 0);
const pstat = k => {
  const v = val(k), p = PL[k], er = S.err && S.err[k];
  const ext = !v ? '' : (v.views != null ? `, ${nf(v.views)} ${p.vu || 'vues'}` : '') + (v.items != null && p.u ? `, ${nf(v.items)} ${p.u}` : '');
  return v ? p.l + ext : busy ? 'Actualisation en cours' : er ? 'Erreur : ' + e(er) : p.social ? 'Actualisez pour voir vos chiffres' : S.stats ? 'Indisponible, vérifiez le compte' : 'Chargement en cours';
};
const lastPost = (v, k) => {
  const l = v && v.last; if (!l) return '';
  const m = [['plays', 'Écoutes'], ['views', 'Vues'], ['likes', 'Likes'], ['comments', 'Commentaires'], ['shares', 'Partages']].filter(([f]) => l[f] != null);
  return `<div class="lp"><small>${(PL[k] && PL[k].ll) || 'Dernier contenu'}${l.at ? ', ' + ago(l.at) : ''}</small>${l.text ? `<em>${e(l.text)}</em>` : ''}<div class="mt">${m.map(([f, n]) => `<span><b>${nf(l[f])}</b>${n}</span>`).join('')}</div></div>`;
};
async function loadStats(force) {
  if (!Object.keys(PL).some(on)) { S.stats = null; busy = false; return; }
  busy = !!force;
  let r; try { r = await api.stats(S.settings.accounts, !!force); } catch (er) { r = { err: {} }; }
  S.stats = r; S.err = r.err || {}; busy = false;
  if (force) { for (const k of ['instagram', 'tiktok']) if (r[k]) S.social[k] = { ...r[k], at: Date.now() }; persist(); }
  snap();
  if (view === 'home' || (force && view === 'settings')) { if (force) fresh = true; draw(); }
  if ($('dlgA').open) fillAudience();
}

function home() {
  const D = S.deals, T = today(), n = s => D.filter(x => x.s == s).length, sum = L => L.reduce((s, x) => s + fee(x), 0);
  const up = D.filter(x => x.s == 3 && x.d >= T).sort((a, b) => a.d.localeCompare(b.d)), nx = up[0], open = D.filter(x => x.s < 3), V = D.filter(x => x.s == 3);
  const conv = D.length ? Math.round(n(3) / D.length * 100) : 0, dn = nx ? days(nx.d) : 0, nT = S.todos.filter(t => !t.done).length;
  const todo = [...open.filter(x => Date.now() - (x.u || Date.now()) > 7 * 864e5).map(x => ({ t: `Relancer ${x.v}${cn(x.k) ? ', ' + cn(x.k).n : ''} (sans nouvelle depuis ${Math.floor((Date.now() - x.u) / 864e5)} jours)`, a: `data-a="go" data-v="booking" data-id="${x.id}"` })),
    ...D.filter(x => x.s == 3 && !x.d).map(x => ({ t: `Fixer la date de ${x.v}`, a: `data-a="go" data-v="booking" data-id="${x.id}"` })),
    ...D.filter(x => x.s == 3 && x.d >= T && !x.pub).map(x => ({ t: `Publier ${x.v} sur le site`, a: 'data-a="go" data-v="site"' }))];
  const ms = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i); return d; });
  const cnt = ms.map(d => up.filter(x => x.d.startsWith(ymk(d))).length), mx = Math.max(1, ...cnt);
  const fm = ms.map(d => sum(up.filter(x => x.d.startsWith(ymk(d))))), fmx = Math.max(1, ...fm);
  const upFee = sum(up), pastFee = sum(V.filter(x => x.d && x.d < T)), curFee = sum(V.filter(x => x.d && x.d.startsWith(ymk(new Date())))), potFee = sum(open);
  const plats = S.settings.order.filter(on);
  const tot = plats.reduce((s, k) => s + ((val(k) || {}).fans || 0), 0);
  const wd = plats.filter(k => val(k) && val(k).fans != null).sort((a, b) => val(b).fans - val(a).fans);
  const g30 = wd.map(k => growth(k)).filter(Boolean), gsum = g30.reduce((a, g) => a + g.d, 0);
  const ens = wd.map(k => eng(val(k))).filter(x => x != null), eavg = ens.length ? ens.reduce((a, x) => a + x, 0) / ens.length : null;
  const ci = (l, v) => `<span><small>${l}</small><b>${v}</b></span>`, plays = totalPlays(wd);
  const goalsH = plats.filter(k => +S.goals[k] > 0).map(k => { const c = goalCalc(k); return `<span class="gm"><span><span>${PL[k].n}</span><b>${nf(c.fans)} sur ${nf(c.goal)}</b></span><i class="bar" style="--w:${c.pc}%;--c:${PL[k].c}"></i></span>`; }).join('') || '<span class="sub">Aucun objectif défini</span>';
  const aud = !plats.length ? '<div class="panel"><div class="auds"><div class="empty"><b>Aucun compte connecté</b><span>Connectez vos comptes YouTube, SoundCloud, Instagram ou TikTok pour suivre votre audience.</span><button class="btn" data-a="view" data-v="settings">Connecter un compte</button></div></div></div>'
    : `<button class="panel cach aus" data-a="audience" aria-label="Voir le détail de l'audience">
<span class="cl"><small>Abonnés au total</small><b${tot ? ` data-n="${tot}"` : ''}>${nf(tot)}</b><span>${tot ? `${pl(wd.length, 'plateforme')}, ${PL[wd[0]].n} en tête` : busy ? 'Actualisation en cours' : 'Aucune donnée pour le moment'}</span>${Object.keys(S.err || {}).length ? '<span class="late">Une plateforme a renvoyé une erreur</span>' : ''}</span>
<span class="ds"><small>Répartition</small><span class="stk">${wd.map(k => `<i style="--w:${tot ? val(k).fans / tot * 100 : 0}%;--c:${PL[k].c}"></i>`).join('')}</span><span class="lg">${wd.map(k => `<span><i class="dotc" style="--c:${PL[k].c}"></i>${PL[k].n}<b>${nf(val(k).fans)}</b></span>`).join('')}</span></span>
<span class="ds"><small>Objectifs</small><span class="gms">${goalsH}</span></span>
<span class="cf">${ci('Plateforme en tête', wd.length && tot ? PL[wd[0]].n + ', ' + Math.round(val(wd[0]).fans / tot * 100) + ' %' : 'Aucune')}${ci('Croissance (30 j)', g30.length ? `<em class="${gsum > 0 ? 'up' : gsum < 0 ? 'dw' : ''}">${sgn(gsum)}</em>` : 'Pas encore de recul')}${eavg != null ? ci('Engagement dernier post', pct1(eavg)) : ci('Plateformes suivies', plats.length)}${plays ? ci('Écoutes et vues', nf(plays)) : ''}</span>
<em class="go">Voir le détail</em></button>`;
  const sh = (t, s, l) => `<div class="sechd"><h3>${t}</h3>${s ? `<span>${s}</span>` : ''}${l || ''}</div>`;
  const lead = (nx ? `Prochaine date ${dn == 0 ? "aujourd'hui" : dn == 1 ? 'demain' : 'dans ' + dn + ' jours'} : ${e(nx.v)}${nx.c ? ', ' + e(nx.c) : ''}.` : 'Aucune date confirmée à venir : une nouvelle piste fera vivre votre agenda.') + (nT ? ` ${pl(nT, 'tâche')} à traiter.` : ' Aucune tâche en attente.');
  const li = x => `<button class="li lk" data-a="go" data-v="plan" data-d="${x.d}"><span><b>${e(x.v)}</b> <span>${e(x.c)}</span><br><span>${fd(x.d)}${when(x) ? ', ' + when(x) : ''}</span></span><span>${fee(x) ? eur(fee(x)) : ''}</span></button>`;
  return `<div class="home">
<header class="hero"><small>${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h2>${hello()}${S.settings.name ? ' ' + e(S.settings.name) : ''}</h2><p class="lead">${lead}</p><button class="btn ghost" data-a="refresh">Actualiser</button></header>
<section class="sec">${sh('Planning', '', '<button class="x" data-a="view" data-v="plan">Ouvrir le planning</button>')}<div class="g2">
<div class="panel blk nxt"><h4>Prochaine date</h4>${nx ? `<b class="cdn">${dn == 0 ? "Aujourd'hui" : dn == 1 ? 'Demain' : 'J-' + dn}</b><strong>${e(nx.v)}</strong><span>${e(nx.c)}</span><span>${fd(nx.d)}${when(nx) ? ', ' + when(nx) : ''}</span>${fee(nx) ? `<span>Cachet : ${eur(fee(nx))}</span>` : ''}${cn(nx.k) ? `<span>Contact : ${e(cn(nx.k).n)}</span>` : ''}<div class="fill brow"><button class="btn" data-a="go" data-v="plan" data-d="${nx.d}">Voir au planning</button><button class="btn ghost" data-a="edit" data-id="${nx.id}">Voir la fiche</button></div>` : `<p class="sub">Aucune date confirmée à venir.</p><div class="fill"><button class="btn" data-a="new">Nouvelle piste</button></div>`}</div>
<div class="panel blk"><h4>Prochaines dates</h4>${up.slice(0, 5).map(li).join('') || '<p class="sub">Aucune date validée à venir.</p>'}<div class="fill"><button class="x" data-a="view" data-v="booking">Ouvrir le booking</button></div></div>
<div class="panel blk"><h4>À faire</h4>${todoList(todo)}</div>
<div class="panel blk"><h4>Pistes de booking</h4>${ST.map((nm, i) => `<button class="pr" data-a="go" data-v="booking" data-s="${i}"><span>${nm}</span><i style="--w:${D.length ? n(i) / D.length * 100 : 0}%;--c:${CL[i]}"></i><b>${n(i)}</b></button>`).join('')}<div class="fill"><span class="sub">Taux de validation : ${conv} % (${n(3)} sur ${D.length})</span></div></div>
<div class="panel blk wide"><h4>Dates validées, 6 prochains mois</h4><div class="bars">${ms.map((d, i) => `<button data-a="go" data-v="plan" data-m="${ymk(d)}" title="Voir ${d.toLocaleDateString('fr-FR', { month: 'long' })} au planning"><span>${cnt[i]}</span><i style="height:${cnt[i] / mx * 100}%"></i><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></button>`).join('')}</div></div>
</div></section>
<section class="sec">${sh('Cachets', '')}
<button class="panel cach" data-a="cachets" aria-label="Voir le détail des cachets">
<span class="cl"><small>Cachets validés à venir</small><b data-n="${upFee}" data-f="eur">${eur(upFee)}</b><span>${pl(up.length, 'date')} validée${up.length > 1 ? 's' : ''}</span></span>
<span class="cm">${ms.map((d, i) => `<span><i style="--h:${fm[i] / fmx * 100}"></i><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></span>`).join('')}</span>
<span class="cf"><span><small>Ce mois-ci</small><b data-n="${curFee}" data-f="eur">${eur(curFee)}</b></span><span><small>Déjà réalisés</small><b data-n="${pastFee}" data-f="eur">${eur(pastFee)}</b></span><span><small>Potentiel en cours</small><b data-n="${potFee}" data-f="eur">${eur(potFee)}</b></span></span>
<em class="go">Voir le détail</em></button></section>
<section class="sec">${sh('Audience', '', '<button class="x" data-a="view" data-v="settings">Gérer les comptes</button>')}${aud}</section>
</div>`;
}
function booking() {
  const T = today(), past = x => x.s == 3 && x.d && x.d < T, byD = (a, b) => (a.d || '9999').localeCompare(b.d || '9999') || (a.v || '').localeCompare(b.v || '');
  const card = (x, i) => {
    const o = ex.has(x.id), c = cn(x.k), old = x.s < 3 && x.d && x.d < T, live = i == 3 ? (x.pub ? 'on' : 'off') : '';
    const act = i < 3 ? `<button class="btn" data-a="mv" data-id="${x.id}">Passer en ${ST[i + 1]}</button>` : x.pub ? '<span class="btn done">En ligne sur le site</span>' : x.d ? `<button class="btn" data-a="pub" data-id="${x.id}">Publier sur le site</button>` : '<span class="btn done">Fixez une date pour publier</span>';
    return `<div class="card${o ? ' open' : ''}${live ? ' site-' + live : ''}" data-id="${x.id}"><button class="chead" data-a="tog" data-id="${x.id}" aria-expanded="${o}"><span class="date">${dt(x.d)}</span><span class="ci"><b>${e(x.v)}</b><span>${[e(x.c), fee(x) ? eur(fee(x)) : '', old ? 'date passée' : ''].filter(Boolean).join(', ') || 'Lieu à préciser'}</span>${live ? `<span class="ss ${live}"><i></i>${live == 'on' ? 'Sur le site' : 'Pas sur le site'}</span>` : ''}</span><span class="chev" aria-hidden="true"></span></button>
<div class="more"><div class="mi"><div class="mc">${x.d ? `<span>${fd(x.d)}</span>` : ''}${when(x) ? `<span>${e(when(x))}</span>` : ''}${c ? `<span>Contact : ${e(c.n)}</span>` : ''}<div class="steps" style="--c:${CL[i]}">${ST.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div><div class="acts">${act}<button class="x" data-a="edit" data-id="${x.id}">Modifier</button><button class="x" data-a="del" data-id="${x.id}">Supprimer</button></div></div></div></div></div>`;
  };
  const A = S.deals.filter(past).sort((x, y) => y.d.localeCompare(x.d)), MO = {};
  A.forEach(x => (MO[x.d.slice(0, 7)] = MO[x.d.slice(0, 7)] || []).push(x));
  const sm = L => L.reduce((t, x) => t + fee(x), 0);
  const arow = x => `<div class="row ar" data-id="${x.id}"><span><b style="color:var(--ink)">${e(x.v)}</b>${x.c ? ', ' + e(x.c) : ''}</span><span>${fd(x.d)}${when(x) ? ', ' + e(when(x)) : ''}${fee(x) ? `, <b style="color:var(--ink)">${eur(fee(x))}</b>` : ''}${x.pub ? '<i class="tag">Sur le site</i>' : ''}<button class="x" data-a="edit" data-id="${x.id}">Modifier</button><button class="x" data-a="del" data-id="${x.id}">Supprimer</button></span></div>`;
  const arch = A.length ? `<section class="arch${archOpen ? ' open' : ''}"><button class="ah" data-a="arch" aria-expanded="${archOpen}"><span><b>Archives</b><small>${pl(A.length, 'date')} passée${A.length > 1 ? 's' : ''}, ${eur(sm(A))} de cachets</small></span><span class="chev" aria-hidden="true"></span></button><div class="more"><div class="mi">${Object.keys(MO).sort().reverse().map(k => `<h5 class="am">${new Date(k + '-01T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}<span>${pl(MO[k].length, 'date')}, ${eur(sm(MO[k]))}</span></h5>${MO[k].map(arow).join('')}`).join('')}</div></div></section>` : '';
  return `<div class="top"><div><h2>Booking</h2><p class="sub">Vos pistes, de la première prise de contact à la date validée.</p></div><button class="btn" data-a="new">Nouvelle piste</button></div>
<div class="board">${ST.map((nm, i) => { const L = S.deals.filter(x => x.s == i && !past(x)).sort(byD); return `<section class="col" data-s="${i}" style="--c:${CL[i]}"><h3>${nm}<span>${L.length}</span></h3>${i == 3 && L.length ? `<p class="cnt"><span class="ss on"><i></i>${L.filter(x => x.pub).length} sur le site</span><span class="ss off"><i></i>${L.filter(x => !x.pub).length} pas sur le site</span></p>` : ''}${L.map(x => card(x, i)).join('') || '<p class="sub">Aucune piste à cette étape.</p>'}</section>`; }).join('')}</div>${arch}`;
}
function res() {
  const L = S.resources.filter(r => flt == 'Tout' || r.tag == flt);
  return `<h2>Ressources</h2><p class="sub">Vos fichiers et vos liens, rangés par catégorie.</p>
<div class="chips">${['Tout', ...TAGS].map(x => `<button class="chip" aria-pressed="${x == flt}" data-a="flt" data-v="${x}">${x}</button>`).join('')}</div>
<div class="add"><select id="rt" aria-label="Catégorie">${TAGS.map(x => `<option>${x}</option>`).join('')}</select><button class="btn" data-a="files">Ajouter des fichiers</button><input id="ln" placeholder="Nom du lien" aria-label="Nom du lien"><input id="lu" placeholder="Lien Google Drive" aria-label="Lien Drive"><button class="btn ghost" data-a="link">Ajouter le lien</button></div>
${L.map(r => `<div class="row"><span><i class="ext">${r.where == 'Drive' ? 'LIEN' : e((r.name.split('.').pop() || '').slice(0, 4).toUpperCase())}</i><b style="color:var(--ink)">${e(r.name)}</b></span><span>${r.tag} <i class="tag">${r.where == 'Drive' ? 'Google Drive' : 'Sur cet ordinateur'}</i><button class="btn ghost" data-a="open" data-p="${e(r.path)}">Ouvrir</button><button class="x" data-a="rm" data-id="${r.id}">Retirer</button></span></div>`).join('') || '<p class="sub">Aucune ressource dans cette catégorie.</p>'}`;
}
function site() {
  const on = S.deals.filter(x => x.pub), rd = S.deals.filter(x => x.s == 3 && !x.pub && x.d);
  return `<h2>Site web</h2><p class="sub">Chaque modification est envoyée à votre site, la mise en ligne prend environ une minute.</p>
<div class="status">${dot()}<div><b>${S.hasToken ? 'Jeton GitHub enregistré' : 'Jeton GitHub manquant (voir Réglages)'}</b><br><span style="color:var(--muted);font-size:13px">${S.settings.owner && S.settings.repo && S.settings.path ? e(S.settings.owner) + '/' + e(S.settings.repo) + ', ' + e(S.settings.path) : 'Dépôt GitHub non renseigné (voir Réglages)'}</span></div><button class="btn" data-a="sync">Synchroniser maintenant</button></div>
<h4>En ligne (${on.length})</h4>${on.map(x => `<div class="row"><b>${e(x.v)}, ${e(x.c)}${when(x) ? ', ' + e(when(x)) : ''}</b><span><input type="date" value="${x.d}" data-a="setd" data-id="${x.id}" aria-label="Date de ${e(x.v)}"><button class="btn ghost" data-a="unpub" data-id="${x.id}">Retirer du site</button></span></div>`).join('') || '<p class="sub">Aucune date en ligne.</p>'}
<h4>Validées, prêtes à publier (${rd.length})</h4>${rd.map(x => `<div class="row"><b>${e(x.v)}, ${e(x.c)}</b><span>${fd(x.d)}<button class="btn" data-a="pub" data-id="${x.id}">Publier</button></span></div>`).join('') || '<p class="sub">Rien à publier pour le moment.</p>'}`;
}
function settings() {
  const a = S.settings.accounts, o = S.settings.order;
  const inp = (k, lbl, ph) => `<label>${lbl}<input id="a_${k}" value="${e(a[k] || '')}" placeholder="${ph}"></label>`;
  const sk = (id, lbl, saved) => `<label>${lbl}${saved ? ' (enregistré)' : ''}<input id="${id}" type="password" autocomplete="off" placeholder="${saved ? 'Laisser vide pour conserver' : ''}"></label>`;
  const soc = (k, fields, extra) => {
    const p = PL[k], v = S.social[k], er = S.err && S.err[k], ok = S.keys[p.key];
    return `<div class="panel sp"><div class="sph"><h4>${p.n}</h4><span class="tag${ok ? ' ok' : ''}">${ok ? 'Connecté' : 'Non connecté'}</span></div><div class="fg">${fields}</div>${extra || ''}${v ? `<div class="spd"><p class="sub"><b>${nf(v.fans)}</b> abonnés${v.items != null ? ', ' + nf(v.items) + ' ' + p.u : ''}</p>${lastPost(v, k)}<small class="upd">Actualisé le ${hm(v.at)}</small></div>` : '<p class="sub spd">Aucune donnée pour le moment : enregistrez l\'accès, puis actualisez.</p>'}${er ? `<p class="late">${e(er)}</p>` : ''}</div>`;
  };
  return `<h2>Réglages</h2><p class="sub">Les clés sont chiffrées et restent sur cet ordinateur.</p>
<h4>Nom de compte</h4><div class="add"><input id="sn" value="${e(S.settings.name || '')}" placeholder="Votre nom d'artiste" aria-label="Nom de compte" maxlength="30"><button class="btn" data-a="sname">Enregistrer</button></div>
${colorsSection()}
<h4>Partage et sauvegarde</h4><div class="add"><button class="btn" data-a="shexp">Exporter mes données</button><button class="btn ghost" data-a="shimp">Importer des données</button></div>
<h4>Tutoriel</h4><div class="add"><button class="btn ghost" data-a="tutoopen">Revoir le tutoriel</button></div>
<h4>Site web (GitHub)</h4><div class="status">${dot()}<b>${S.hasToken ? 'Jeton GitHub enregistré' : 'Aucun jeton enregistré'}</b></div>
<div class="add" style="margin-top:10px"><input id="tk" type="password" placeholder="Collez votre jeton GitHub" aria-label="Jeton GitHub" autocomplete="off" style="min-width:320px"><button class="btn" data-a="tok">Enregistrer le jeton</button></div>
<div class="add"><input id="so" value="${e(S.settings.owner)}" placeholder="Compte GitHub" aria-label="Compte GitHub"><input id="sr" value="${e(S.settings.repo)}" placeholder="Nom du dépôt" aria-label="Dépôt"><input id="sp" value="${e(S.settings.path)}" placeholder="Fichier des dates (ex. dates.json)" aria-label="Fichier"><button class="btn ghost" data-a="sset">Enregistrer</button></div>
<h4>Comptes d'audience</h4><p class="sub">Laissez vide une plateforme que vous n'utilisez pas : elle n'apparaît pas dans l'accueil.</p>
<div class="fg" style="max-width:760px">${inp('youtube', 'YouTube (@chaîne)', '@chaine')}${inp('soundcloud', 'SoundCloud (identifiant)', 'mon-pseudo')}${inp('mixcloud', 'Mixcloud (pseudo)', 'mon-pseudo')}${inp('deezer', 'Deezer (numéro d\'artiste)', '123456')}</div>
<div class="fg" style="max-width:760px;margin-top:12px"><label>Clé API YouTube ${S.keys.yt ? '(enregistrée)' : ''}<input id="a_k" type="password" autocomplete="off" placeholder="${S.keys.yt ? 'Laisser vide pour la conserver' : ''}"></label><label>Client ID SoundCloud (facultatif) ${S.keys.sc ? '(enregistré)' : ''}<input id="a_sk" type="password" autocomplete="off" placeholder="${S.keys.sc ? 'Laisser vide pour le conserver' : ''}"></label><label>Client secret SoundCloud (facultatif) ${S.keys.scs ? '(enregistré)' : ''}<input id="a_ss" type="password" autocomplete="off" placeholder="${S.keys.scs ? 'Laisser vide pour le conserver' : ''}"></label></div>
<div class="add" style="margin-top:12px"><button class="btn" data-a="sacc">Enregistrer les comptes</button></div>
<h4>Instagram et TikTok</h4><p class="sub">Actualisez pour récupérer vos abonnés et les statistiques de votre dernier post (likes, commentaires, vues).</p>
<div class="soc">${soc('instagram', sk('a_ig', 'Jeton d\'accès Instagram', S.keys.ig))}${soc('tiktok', sk('a_ttk', 'Client key', S.keys.ttk) + sk('a_tts', 'Client secret', S.keys.tts), `<div class="add" style="margin:10px 0 0"><button class="btn ghost" data-a="ttconn">${S.keys.ttr ? 'Reconnecter TikTok' : 'Connecter TikTok'}</button></div>`)}</div>
<div class="add" style="margin-top:12px"><button class="btn" data-a="refsoc">Actualiser</button><button class="btn ghost" data-a="ssoc">Enregistrer les accès</button></div>
<details class="help"><summary>Comment obtenir ces accès ?</summary>
<p><b>SoundCloud.</b> Indiquez seulement l'identifiant de votre profil (la fin de son adresse) : vos abonnés sont lus sur votre page publique. Si vous avez une application développeur SoundCloud, ajoutez son Client ID et son Client secret pour passer par l'accès officiel.</p>
<p><b>Instagram.</b> Le compte doit être <b>Professionnel</b> (Créateur ou Business), à activer dans les réglages d'Instagram. Sur developers.facebook.com, créez une application avec le produit Instagram (connexion Instagram), ajoutez votre compte puis générez un jeton d'accès à coller ci-dessus. Il est renouvelé automatiquement à chaque actualisation.</p>
<p><b>TikTok.</b> Sur developers.tiktok.com, créez une application avec les produits Login Kit et Display API, et les permissions user.info.basic, user.info.stats et video.list. Choisissez la plateforme <b>Desktop</b> et l'adresse de redirection <b>http://localhost:8902/</b>. Collez la Client key et le Client secret, enregistrez, puis cliquez sur <b>Connecter TikTok</b> et autorisez l'accès dans le navigateur. Tant que l'application est en mode test chez TikTok, ajoutez votre compte comme testeur.</p></details>
<h4>Ordre d'affichage sur l'accueil</h4><p class="sub">Les plateformes connectées s'affichent dans cet ordre, de haut en bas.</p>
${o.map((k, i) => `<div class="row"><span><b style="color:var(--ink)">${i + 1}. ${PL[k].n}</b>${on(k) ? '' : ' <i class="tag">non connecté</i>'}</span><span><button class="btn ghost" data-a="up" data-p="${k}" ${i ? '' : 'disabled'}>Monter</button><button class="btn ghost" data-a="down" data-p="${k}" ${i < o.length - 1 ? '' : 'disabled'}>Descendre</button></span></div>`).join('')}`;
}
const TY = { relance: ['Relance', '#f0a35e'], envoi: ['Envoi', '#7fb3d5'], prep: ['Préparation', '#b5c26b'], admin: ['Admin', '#b7a4d6'] };
let pm = new Date(); pm.setDate(1);
let editT = null, editK = null;
const ty = t => TY[t.ty] || TY.admin;
const cn = id => S.contacts.find(c => c.id === id);
const ctl = t => { const c = cn(t.k); return c ? c.n + (c.o ? ', ' + c.o : '') : ''; };
const late = t => t.d && !t.done && t.d < today();
const byDue = (a, b) => (a.d || '9999').localeCompare(b.d || '9999');
const fd2 = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const nextId = L => Math.max(0, ...L.map(y => y.id)) + 1;
const trow = t => `<div class="tl${t.done ? ' fin' : ''}"><button class="ck" data-a="tdone" data-id="${t.id}" aria-label="${t.done ? 'Rouvrir' : 'Terminer'} la tâche">${t.done ? CHK : ''}</button><div style="flex:1;min-width:0"><button class="tt" data-a="vtodo" data-id="${t.id}">${e(t.t)}</button><br><span class="tg" style="--c:${ty(t)[1]}">${ty(t)[0]}</span> <span style="color:var(--muted);font-size:13px">${[ctl(t), t.d && !late(t) ? fd2(t.d) : ''].filter(Boolean).map(e).join(', ')}</span>${late(t) ? ` <span class="late">En retard (${fd2(t.d)})</span>` : ''}</div><button class="x" data-a="etodo" data-id="${t.id}">Modifier</button></div>`;
function todoList(auto) {
  const o = S.todos.filter(t => !t.done).sort(byDue).slice(0, 6);
  return (o.map(trow).join('') + auto.map(t => `<div class="tl"><span style="width:20px;flex:none"></span><div><button class="tt" style="color:var(--muted);font-weight:500" ${t.a}>${e(t.t)}</button><br><span class="tg" style="--c:#9c9f69">Suggestion</span></div></div>`).join('') || '<p class="sub">Rien d\'urgent</p>')
    + '<div class="fill"><button class="x" data-a="view" data-v="plan">Ouvrir le planning</button></div>';
}
function planning() {
  const y = pm.getFullYear(), m = pm.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate(), T = today();
  const cells = [...Array(Math.ceil((off + nd) / 7) * 7)].map((_, i) => i - off + 1);
  const cell = d => {
    if (d < 1 || d > nd) return '<div class="day off"></div>';
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const gs = S.deals.filter(x => x.d == k).map(x => `<button class="pill ${x.s == 3 ? 'gig' : 'opt'}" data-a="edit" data-id="${x.id}" title="${x.s == 3 ? 'Date validée' : 'Option : ' + ST[x.s]}">${e(x.t ? x.t + ' ' : '')}${e(x.v)}</button>`).join('');
    const ts = S.todos.filter(t => t.d == k).map(t => `<button class="pill td${t.done ? ' fin' : ''}${late(t) ? ' late' : ''}" style="--c:${ty(t)[1]}" data-a="vtodo" data-id="${t.id}">${e(ty(t)[0])}, ${e(t.t)}</button>`).join('');
    return `<div class="day${k == T ? ' now' : ''}${S.deals.some(x => x.d == k && x.s == 3) ? ' gigd' : ''}" data-d="${k}"><span class="dnum">${d}</span>${gs}${ts}<button class="addb" data-a="daynew" data-d="${k}" aria-label="Ajouter une tâche le ${d}" title="Ajouter une tâche">+</button></div>`;
  };
  const open = S.todos.filter(t => !t.done).sort(byDue), done = S.todos.filter(t => t.done);
  return `<div class="top"><div><h2>Planning</h2><p class="sub">Vos dates et vos tâches au même endroit.</p></div><button class="btn" data-a="tnew">Nouvelle tâche</button></div>
<div class="plan"><div class="cal"><div class="calh"><button class="btn ghost" data-a="pm" data-v="-1" aria-label="Mois précédent">${CHL}</button><h3>${new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3><button class="btn ghost" data-a="pm" data-v="0">Aujourd'hui</button><button class="btn ghost" data-a="pm" data-v="1" aria-label="Mois suivant">${CHR}</button></div>
<div class="dow">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(d => `<span>${d}</span>`).join('')}</div><div class="days">${cells.map(cell).join('')}</div>
<div class="leg"><span><i class="lgc"></i>Date confirmée</span><span><i class="lgo"></i>Date en option</span>${Object.values(TY).map(([n, c]) => `<span><i style="--c:${c}"></i>${n}</span>`).join('')}<span><i style="--c:#ef6f5e"></i>En retard</span><button class="x" data-a="go" data-v="settings" data-sec="sec-couleurs">Personnaliser les couleurs</button></div></div>
<div class="panel"><h4>Tâches (${open.length})</h4>${open.map(trow).join('') || '<p class="sub">Aucune tâche en cours.</p>'}${done.length ? `<details><summary>Terminées (${done.length})</summary>${done.map(trow).join('')}</details>` : ''}</div></div>`;
}
const XI = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CHK = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const CHL = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>', CHR = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const PAL = ['#7fb3d5', '#f0a35e', '#b7a4d6', '#9cc27a', '#e6b1c4', '#e0c867', '#6fc5b5', '#d98a8a'];
const HEX = /^#[0-9a-f]{6}$/i, COL0 = { gig: '#ff2f8e', opt: '#e6b1c4' };
const PRE = { gig: ['#ff2f8e', '#ff8a2b', '#f5c518', '#3ddc84', '#2fb8ff', '#a96bff'], opt: ['#e6b1c4', '#f0a35e', '#e0c867', '#9cc27a', '#7fb3d5', '#b7a4d6'] };
const colorOf = k => { const c = (S.settings.colors || {})[k]; return HEX.test(c || '') ? c.toLowerCase() : COL0[k]; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = rgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
function shiftHue(h, deg) {
  const [r, g, b] = rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0; if (d) hh = mx == r ? ((g - b) / d) % 6 : mx == g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh = (hh * 60 + 360 + deg) % 360;
  const l = (mx + mn) / 2, sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0, c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2;
  const [R, G, B] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
function applyColors() {
  const root = document.documentElement; if (!root) return;
  const g = colorOf('gig'), g2 = shiftHue(g, 50);
  root.style.setProperty('--gig', g); root.style.setProperty('--gig2', g2);
  root.style.setProperty('--gigtx', (lum(g) + lum(g2)) / 2 > 115 ? '#1a0f12' : '#ffffff'); root.style.setProperty('--opt', colorOf('opt'));
}
const setColor = (k, v) => { if (COL0[k] && HEX.test(v || '')) (S.settings.colors = S.settings.colors || {})[k] = v.toLowerCase(); };
const colorsSection = () => `<h4 id="sec-couleurs">Couleurs du planning</h4><div class="clrs">${[['gig', 'Date confirmée'], ['opt', 'Date en option']].map(([k, n]) => `<div class="clr"><span>${n}</span><span class="sws">${PRE[k].map(c => `<button class="swb" style="--c:${c}" data-a="colorset" data-k="${k}" data-v="${c}" aria-pressed="${colorOf(k) == c}" aria-label="${n} ${c}"></button>`).join('')}</span><input type="color" data-a="color" data-k="${k}" value="${colorOf(k)}" aria-label="Choisir la couleur : ${n}"></div>`).join('')}
<div class="clp"><span class="pill gig">22:00 Date confirmée</span><span class="pill opt">Date en option</span><button class="btn ghost" data-a="colorreset">Rétablir les couleurs d'origine</button></div></div>`;
const LB = { 'Organisateur': '#7fb3d5', 'Bar': '#f0a35e', 'Club': '#6fc5b5', 'Agence': '#b7a4d6', 'Ami': '#9cc27a', 'Perso': '#e6b1c4' };
const lbc = l => LB[l] || PAL[[...l].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PAL.length];
const customLabels = () => S.settings.labels || [];
const allLabels = () => [...Object.keys(LB), ...customLabels()];
const clab = c => c.ls || [];
const TI = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const TUTO = [
  { ic: '<path d="M4 10v4M8 6v12M12 3v18M16 8v8M20 11v2"/>', t: 'Bienvenue dans ARTIST Studio', name: true,
    p: ['ARTIST Studio rassemble au même endroit tout ce qui fait avancer votre carrière : vos dates, vos pistes de booking, vos contacts, vos fichiers, votre site web et votre audience.', 'Pour commencer, choisissez le nom de compte qui s\'affichera sur votre accueil.'] },
  { ic: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>', t: 'Booking et planning',
    p: ['Suivez chaque piste de la première prise de contact jusqu\'à la date validée, en quatre étapes : Contact, Relance, Négociation et Validé.'],
    li: ['Le tableau de booking est trié par date. Les dates validées passées sont rangées dans les archives.', 'Le planning réunit vos dates et vos tâches (relances, envois, préparation). Les dates confirmées ressortent en couleur.', 'Depuis l\'accueil, cliquez sur une date ou une piste pour l\'ouvrir directement. Vos cachets validés, réalisés et en négociation y sont récapitulés.'] },
  { ic: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', t: 'Votre site web',
    p: ['Gérez les dates de votre site internet sans quitter l\'application. Une date validée se publie en un clic et apparaît sur votre site après environ une minute. Vous pouvez la retirer ou changer sa date à tout moment.', 'Pour cela, enregistrez votre jeton GitHub dans les Réglages. La page Site web indique ce qui est en ligne et ce qui reste à publier.'] },
  { ic: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', t: 'Vos contacts',
    p: ['Gardez sous la main vos organisateurs, bars, clubs et agences.'],
    li: ['Épinglez les contacts importants pour les garder en haut de la liste.', 'Glissez un libellé (Organisateur, Bar, Club, Agence, Ami, Perso) sur un contact pour le classer. Créez le vôtre avec le bouton + Personnalisé.', 'Cliquez sur un libellé d\'un contact pour le retirer. Cliquez sur un libellé de la liste pour filtrer vos contacts.', 'Le bouton Relancer crée une tâche liée au contact.'] },
  { ic: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', t: 'Vos ressources',
    p: ['Importez vos fichiers (dossier de presse, riders, visuels, musiques) depuis votre ordinateur, ou ajoutez des liens Google Drive. Classez-les par catégorie et ouvrez-les en un clic.', 'Vos fichiers restent où ils sont : l\'application ne fait que les référencer.'] },
  { ic: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', t: 'Votre audience',
    p: ['Connectez vos comptes YouTube, SoundCloud, Mixcloud, Deezer, Instagram et TikTok dans les Réglages, puis actualisez.', 'L\'accueil affiche votre total d\'abonnés, leur répartition et vos objectifs par plateforme. Cliquez sur le bloc Audience pour voir l\'évolution et fixer vos objectifs.'] },
  { ic: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h.01"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>', t: 'Vous êtes prêt',
    p: ['Retrouvez dans les Réglages votre nom de compte, vos accès, l\'ordre de vos plateformes et ce tutoriel, que vous pouvez relancer quand vous le souhaitez. Vous y trouvez aussi l\'export et l\'import de vos données, pour les partager avec votre manager ou votre groupe.', 'Bonne route avec ARTIST Studio.'] }
];
function renderTuto() {
  const st = TUTO[tstep], last = tstep == TUTO.length - 1;
  $('tuto_b').innerHTML = `<div class="tdots">${TUTO.map((_, i) => `<i class="${i == tstep ? 'on' : i < tstep ? 'ok' : ''}"></i>`).join('')}</div><small class="tcount">Étape ${tstep + 1} sur ${TUTO.length}</small>
<div class="tbody"><span class="tic">${TI(st.ic)}</span><h3>${st.t}</h3>${st.p.map(x => `<p>${x}</p>`).join('')}${st.li ? `<ul>${st.li.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${st.name ? `<label class="tname">Nom de compte<input id="tn" value="${e(S.settings.name || '')}" placeholder="Votre nom d'artiste" maxlength="30" autocomplete="off"></label>` : ''}</div>
<div class="act">${last ? '' : '<button class="btn ghost sk" data-a="tutoskip">Passer</button>'}${tstep ? '<button class="btn ghost" data-a="tutoprev">Précédent</button>' : ''}<button class="btn" data-a="tutonext">${last ? 'Commencer' : 'Suivant'}</button></div>`;
  const i = $('tn'); if (i) i.focus();
}
const tutoName = () => { const i = $('tn'); if (i) S.settings.name = i.value.trim(); };
function openTuto() { tstep = 0; renderTuto(); $('dlgTuto').showModal(); }
function tutoNext() { tutoName(); if (tstep == TUTO.length - 1) $('dlgTuto').close(); else { tstep++; renderTuto(); } }
function addLabel() {
  const i = $('nl'), n = (i ? i.value : '').trim().replace(/\s+/g, ' ');
  if (!n) { if (i) i.focus(); return false; }
  if (allLabels().some(x => x.toLowerCase() == n.toLowerCase())) { toast('Ce libellé existe déjà'); return false; }
  S.settings.labels = [...customLabels(), n]; addingLabel = false; return true;
}
const byPin = (a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || a.n.localeCompare(b.n, 'fr');
const PIN = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16v6M8 3h8l-1 6 3 3v2H6v-2l3-3z"/></svg>';
function contactRows() {
  const q = cq.trim().toLowerCase();
  const L = S.contacts.filter(c => (cflt == 'Tous' || (cflt == 'Épinglés' ? c.pin : clab(c).includes(cflt))) && (!q || [c.n, c.o, c.e, c.p, c.i, c.nt].join(' ').toLowerCase().includes(q))).sort(byPin);
  return L.map(c => {
    const n = S.todos.filter(t => t.k === c.id && !t.done).length, p = S.deals.filter(x => x.k === c.id).length;
    return `<div class="row crow${c.pin ? ' pinned' : ''}" data-id="${c.id}"><span class="cmain"><button class="pin${c.pin ? ' on' : ''}" data-a="kpin" data-id="${c.id}" aria-pressed="${!!c.pin}" aria-label="${c.pin ? 'Retirer des contacts épinglés' : 'Épingler ce contact'}" title="${c.pin ? 'Retirer des épinglés' : 'Épingler'}">${PIN}</button><span class="cid"><span><b style="color:var(--ink)">${e(c.n)}</b>${c.o ? ' ' + e(c.o) : ''}</span>${c.nt ? `<small class="nt">${e(c.nt)}</small>` : ''}</span>${clab(c).map(l => `<button class="lb" style="--c:${lbc(l)}" data-a="klabdel" data-id="${c.id}" data-l="${e(l)}" aria-label="Retirer le libellé ${e(l)}">${e(l)}${XI}</button>`).join('')}</span><span>${[c.e, c.p].filter(Boolean).map(e).join(', ')}${c.i ? `, <button class="x" data-a="open" data-p="https://instagram.com/${e(c.i)}">@${e(c.i)}</button>` : ''}<i class="tag">${pl(p, 'piste')}, ${pl(n, 'tâche')}</i><button class="x" data-a="krelance" data-id="${c.id}">Relancer</button><button class="x" data-a="kedit" data-id="${c.id}">Modifier</button><button class="x" data-a="kdel" data-id="${c.id}">Supprimer</button></span></div>`;
  }).join('') || '<p class="sub">Aucun contact ne correspond.</p>';
}
function contactsView() {
  if (cflt != 'Tous' && cflt != 'Épinglés' && !allLabels().includes(cflt)) cflt = 'Tous';
  return `<div class="top"><div><h2>Contacts</h2><p class="sub">Organisateurs, bars, clubs, agences et proches.</p></div><button class="btn" data-a="knew">Nouveau contact</button></div>
<div class="add"><input id="cs" type="search" placeholder="Rechercher un contact" aria-label="Rechercher un contact" value="${e(cq)}" style="min-width:260px"></div>
<div class="chips">${['Tous', 'Épinglés'].map(x => `<button class="chip" aria-pressed="${x == cflt}" data-a="cflt" data-v="${x}">${x}</button>`).join('')}</div>
<div class="lpal">${allLabels().map(l => `<span class="lbw"><button class="lbl" style="--c:${lbc(l)}" data-a="lflt" data-l="${e(l)}" aria-pressed="${l == cflt}">${e(l)}</button>${customLabels().includes(l) ? `<button class="lbx" data-a="lbdel" data-l="${e(l)}" aria-label="Supprimer le libellé ${e(l)}">${XI}</button>` : ''}</span>`).join('')}${addingLabel ? `<span class="lbw nl"><input id="nl" maxlength="24" placeholder="Nouveau libellé" aria-label="Nom du nouveau libellé" autocomplete="off"><button class="lbx" data-a="lbok" aria-label="Valider">${CHK}</button><button class="lbx" data-a="lbno" aria-label="Annuler">${XI}</button></span>` : '<button class="lbl plus" data-a="lbadd">+ Personnalisé</button>'}</div>
<div id="clist">${contactRows()}</div>`;
}
const cOpts = () => '<option value="0">Aucun</option>' + [...S.contacts].sort(byPin).map(c => `<option value="${c.id}">${e(c.n)}${c.o ? ', ' + e(c.o) : ''}</option>`).join('');
function openTodo(id, d = '') {
  editT = id; const t = S.todos.find(y => y.id === id) || {};
  $('t_h').textContent = id ? 'Modifier la tâche' : 'Nouvelle tâche';
  $('t_y').innerHTML = Object.entries(TY).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('');
  $('t_k').innerHTML = cOpts();
  $('t_t').value = t.t || ''; $('t_y').value = t.ty || 'relance'; $('t_d').value = t.d || d; $('t_k').value = t.k || 0;
  $('t_del').hidden = !id; $('dlgT').showModal(); $('t_t').focus();
}
function openContact(id) {
  editK = id; const c = S.contacts.find(y => y.id === id) || {};
  $('k_h').textContent = id ? 'Modifier le contact' : 'Nouveau contact';
  $('k_n').value = c.n || ''; $('k_o').value = c.o || ''; $('k_e').value = c.e || ''; $('k_p').value = c.p || ''; $('k_i').value = c.i || ''; $('k_nt').value = c.nt || '';
  $('dlgK').showModal(); $('k_n').focus();
}
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function enter(m) {
  if (calm()) return;
  let k = 0;
  m.querySelectorAll('.top,.hero,.sechd,.panel,.cal,.col,.row,.status,.chips,.add,h4').forEach(el => {
    if (el.parentElement.closest('.panel,.cal,.col')) return;
    el.style.setProperty('--i', Math.min(k++, 11)); el.classList.add('rise');
  });
}
function countUp(root = document) {
  if (calm()) return;
  root.querySelectorAll('[data-n]').forEach(el => {
    const n = +el.dataset.n, f = el.dataset.f == 'eur' ? eur : nf, t0 = performance.now();
    if (!n) return;
    const step = t => { const p = Math.min(1, (t - t0) / 800); el.textContent = f(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function navState() {
  if (!S) return;
  const nv = document.querySelector('nav'), ac = nv.querySelector('button[aria-current=true]'), ind = $('ind');
  if (ac && ind) {
    if (!navInit) { ind.style.transition = 'none'; }
    ind.style.transform = `translateY(${ac.offsetTop}px)`; ind.style.height = ac.offsetHeight + 'px';
    if (!navInit) { ind.offsetHeight; ind.style.transition = ''; navInit = true; }
  }
  const bd = { plan: S.todos.filter(t => !t.done).length, booking: S.deals.filter(x => x.s < 3).length };
  Object.keys(bd).forEach(v => { const el = nv.querySelector(`[data-b="${v}"]`); if (el) { el.textContent = bd[v]; el.hidden = !bd[v]; } });
  const st = $('nst'); if (st) { const lie = S.hasToken && S.settings.owner && S.settings.repo && S.settings.path; st.className = 'nst' + (lie ? ' ok' : ''); st.querySelector('span').textContent = lie ? 'Site relié' : !S.hasToken ? 'Jeton GitHub manquant' : 'Dépôt GitHub manquant'; }
}
function draw() {
  const m = $('m'); applyColors();
  m.innerHTML = { home, plan: planning, booking, contacts: contactsView, res, site, settings }[view]();
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.v == view));
  navState();
  if (view !== lastView) window.scrollTo(0, 0);
  if (view == 'contacts' && addingLabel) { const i = $('nl'); if (i) i.focus(); }
  if (view !== lastView || fresh) { enter(m); countUp(m); }
  else if (calAnim && !calm()) { const d = m.querySelector('.days'); if (d) d.classList.add('swap'); }
  lastView = view; fresh = false; calAnim = false;
  if (focus) {
    const f = focus; focus = null;
    const find = () => f.t == 'day' ? m.querySelector(`.day[data-d="${f.k}"]`) : f.t == 'deal' ? m.querySelector(`.card[data-id="${f.id}"],.ar[data-id="${f.id}"]`) : f.t == 'stage' ? m.querySelector(`.col[data-s="${f.s}"]`) : f.t == 'sec' ? m.querySelector('#' + f.id) : null;
    setTimeout(() => { const el = find(); if (el) el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); }, 250);
    setTimeout(() => { const el = find(); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1900); } }, 700);
  }
}
const fd2s = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function spark(L, w = 120, h = 34) {
  if (L.length < 2) return '';
  const mn = Math.min(...L.map(q => q.v)), mx = Math.max(...L.map(q => q.v));
  const pts = L.map((q, i) => [3 + i / (L.length - 1) * (w - 6), h - 4 - (mx == mn ? .5 : (q.v - mn) / (mx - mn)) * (h - 8)]);
  return `<svg class="sp2" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="ln" pathLength="1" d="${pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('')}"/></svg>`;
}
function evoChart(L) {
  const W = 640, H = 190, x0 = 10, x1 = 10, y0 = 14, y1 = 10;
  const mn = Math.min(...L.map(q => q.v)), mx = Math.max(...L.map(q => q.v)), pad = (mx - mn) * .15 || Math.max(1, mx * .05), lo = mn - pad, hi = mx + pad;
  const X = i => x0 + i / (L.length - 1) * (W - x0 - x1), Y = v => y0 + (1 - (v - lo) / (hi - lo)) * (H - y0 - y1);
  const d = L.map((q, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(q.v).toFixed(1)).join('');
  const area = d + `L${X(L.length - 1).toFixed(1)} ${H}L${X(0).toFixed(1)} ${H}Z`;
  const grid = [0, 1, 2, 3].map(i => { const y = (y0 + i * (H - y0 - y1) / 3).toFixed(1); return `<line x1="0" x2="${W}" y1="${y}" y2="${y}"/>`; }).join('');
  return `<svg class="evg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du nombre total d'abonnés"><defs><linearGradient id="evf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6b1c4" stop-opacity=".35"/><stop offset="1" stop-color="#e6b1c4" stop-opacity="0"/></linearGradient></defs><g class="gr">${grid}</g><path class="ar2" d="${area}" fill="url(#evf)"/><path class="ln" pathLength="1" d="${d}"/><circle class="ed" cx="${X(L.length - 1).toFixed(1)}" cy="${Y(L[L.length - 1].v).toFixed(1)}" r="4.5"/></svg>`;
}
const goalRow = k => {
  const c = goalCalc(k), p = PL[k];
  return `<div class="gl"><div class="glh"><span class="an"><i class="dotc" style="--c:${p.c}"></i>${p.n}</span><span class="gn"><b>${nf(c.fans)}</b> sur <input class="gi" type="number" min="0" step="100" inputmode="numeric" data-a="goal" data-k="${k}" value="${c.goal || ''}" placeholder="Objectif" aria-label="Objectif d'abonnés ${p.n}"></span></div><i class="bar" style="--w:${c.pc}%;--c:${p.c}"></i><small class="gnote">${c.note}</small></div>`;
};
function fillAudience() {
  const plats = S.settings.order.filter(on), W = plats.filter(k => val(k) && val(k).fans != null).sort((a, b) => val(b).fans - val(a).fans);
  const tot = W.reduce((a, k) => a + val(k).fans, 0), top = W[0];
  const G = W.map(k => [k, growth(k)]).filter(x => x[1]), gt = G.reduce((a, x) => a + x[1].d, 0), best = G.slice().sort((a, b) => b[1].d - a[1].d)[0];
  const ens = W.map(k => eng(val(k))).filter(x => x != null), em = ens.length ? ens.reduce((a, x) => a + x, 0) / ens.length : null;
  const kp = (l, b, sub, c) => `<div><small>${l}</small><b${c ? ` class="${c}"` : ''}>${b}</b><span>${sub}</span></div>`;
  const k1 = `<div><small>Abonnés au total</small><b data-n="${tot}">${nf(tot)}</b><span>${pl(W.length, 'plateforme')} avec données</span></div>`;
  const pl5 = totalPlays(W), k5 = pl5 ? kp('Écoutes et vues', nf(pl5), 'sur ' + pl(W.filter(k => val(k).views != null).length, 'plateforme')) : '';
  const k2 = kp('Plateforme en tête', top ? PL[top].n : 'Aucune', top && tot ? pct1(val(top).fans / tot * 100) + " de l'audience" : 'En attente de données');
  const k3 = G.length ? kp('Croissance', sgn(gt), 'depuis le ' + fd2s(G.map(x => x[1].from).sort()[0]), gt > 0 ? 'up' : gt < 0 ? 'dw' : '') : kp('Croissance', '-', 'Pas encore de recul');
  const k4 = best && best[1].d !== 0 ? kp('Meilleure progression', PL[best[0]].n, sgn(best[1].d) + ' abonnés', best[1].d > 0 ? 'up' : 'dw') : em != null ? kp('Engagement moyen', pct1(em), 'sur le dernier post') : kp('Plateformes', W.length + '/' + plats.length, 'avec données');
  let acc = 0;
  const segs = W.map((k, i) => { const p = tot ? val(k).fans / tot * 100 : 0, o = acc; acc += p; return `<circle class="sg" style="--d:${i}" cx="60" cy="60" r="46" fill="none" stroke="${PL[k].c}" stroke-width="14" pathLength="100" stroke-dasharray="${Math.max(0, p - (W.length > 1 ? .8 : 0)).toFixed(2)} 100" stroke-dashoffset="${(-o).toFixed(2)}" transform="rotate(-90 60 60)"/>`; }).join('');
  const lgd = W.map(k => { const p = tot ? val(k).fans / tot * 100 : 0; return `<div class="lr"><span class="an"><i class="dotc" style="--c:${PL[k].c}"></i>${PL[k].n}</span><b>${nf(val(k).fans)}</b><span class="pc2">${pct1(p)}</span><i class="bar" style="--w:${p}%;--c:${PL[k].c}"></i></div>`; }).join('');
  const L = series();
  const evo = !W.length ? '' : L.length >= 2 ? `<div class="evo">${evoChart(L)}<div class="axl"><span>${fd2s(L[0].d)}</span><span>${nf(Math.min(...L.map(q => q.v)))} à ${nf(Math.max(...L.map(q => q.v)))} abonnés</span><span>${fd2s(L[L.length - 1].d)}</span></div></div>` : `<p class="sub">Pas encore assez de données pour tracer l'évolution.</p>`;
  const cards = plats.map(k => {
    const v = val(k), p = PL[k], g = growth(k), er = S.err && S.err[k], en = eng(v);
    return `<div class="pc"><div class="pch"><span class="an"><i class="dotc" style="--c:${p.c}"></i>${p.n}</span>${g ? `<span class="dl ${g.d > 0 ? 'up' : g.d < 0 ? 'dw' : ''}" title="Depuis le ${fd2s(g.from)}">${sgn(g.d)}</span>` : ''}</div><strong${v && v.fans != null ? ` data-n="${v.fans}"` : ''}>${v && v.fans != null ? nf(v.fans) : '-'}</strong><span class="ps">${pstat(k)}</span>${spark(pser(k))}${en != null ? `<span class="eng">Engagement du dernier post <b>${pct1(en)}</b></span>` : ''}${lastPost(v, k)}${v && v.note ? `<small class="upd">${e(v.note)}</small>` : ''}${er && v ? `<small class="late">${e(er)}</small>` : ''}${v && v.at && p.social ? `<small class="upd">Actualisé le ${hm(v.at)}</small>` : ''}</div>`;
  }).join('');
  $('a_b').innerHTML = W.length ? `<div class="ak">${k1}${k2}${k3}${k4}${k5}</div>
<div class="ag2"><div><h5>Répartition</h5><div class="rep"><div class="dnw"><svg class="dn" viewBox="0 0 120 120" role="img" aria-label="Répartition de l'audience par plateforme"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" stroke-width="14"/>${segs}</svg><div class="dnc"><b>${nf(tot)}</b><small>abonnés</small></div></div><div class="lgd">${lgd}</div></div></div><div><h5>Objectifs</h5><div class="gls">${plats.map(goalRow).join('')}</div></div></div>
<h5>Évolution du nombre total d'abonnés</h5>${evo}
<h5>Par plateforme</h5><div class="pcs">${cards}</div>` : `<p class="sub">Aucune donnée pour le moment. Actualisez pour récupérer vos statistiques.</p><div class="pcs">${cards}</div>`;
  const r = $('a_r'); r.textContent = 'Actualiser'; r.disabled = false;
  countUp($('dlgA'));
}
function viewTodo(id) {
  const t = S.todos.find(y => y.id === id); if (!t) return;
  const [tn, tc] = ty(t);
  $('v_b').innerHTML = `<button class="xc abs" data-a="closev" aria-label="Fermer">${XI}</button><span class="tg" style="--c:${tc}">${e(tn)}</span><h3 class="vt">${e(t.t)}</h3>
<dl class="vl"><dt>Échéance</dt><dd>${t.d ? e(fd(t.d)) : 'Sans échéance'}${late(t) ? ' <span class="late">En retard</span>' : ''}</dd><dt>Contact</dt><dd>${e(ctl(t)) || 'Aucun'}</dd><dt>Statut</dt><dd>${t.done ? 'Terminée' : 'À faire'}</dd></dl>
<div class="act">${t.d ? `<button class="btn ghost" data-a="go" data-v="plan" data-d="${t.d}">Voir au planning</button>` : ''}<button class="btn ghost" data-a="vedit" data-id="${t.id}">Modifier</button><button class="btn" data-a="vdone" data-id="${t.id}">${t.done ? 'Rouvrir' : 'Marquer comme terminée'}</button></div>`;
  $('dlgV').showModal();
}
function showCachets() {
  const D = S.deals, T = today(), V = D.filter(x => x.s == 3), opn = D.filter(x => x.s < 3), sum = L => L.reduce((s, x) => s + fee(x), 0), bd = (a, b) => a.d.localeCompare(b.d);
  const upc = V.filter(x => x.d && x.d >= T).sort(bd), pas = V.filter(x => x.d && x.d < T).sort(bd).reverse(), nod = V.filter(x => !x.d), cur = ymk(new Date());
  const mo = {}; V.filter(x => x.d).forEach(x => { const k = x.d.slice(0, 7); mo[k] = mo[k] || { n: 0, f: 0 }; mo[k].n++; mo[k].f += fee(x); });
  const mrows = Object.keys(mo).sort().map(k => `<div class="mr${k == cur ? ' cur' : ''}"><span>${new Date(k + '-01T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span><span>${pl(mo[k].n, 'cachet')}</span><b>${eur(mo[k].f)}</b></div>`).join('');
  const line = x => `<div class="li"><div><b>${e(x.v)}</b> <span>${e(x.c)}</span><br><span>${fd(x.d)}</span></div><span>${fee(x) ? eur(fee(x)) : 'À définir'}</span></div>`;
  const grp = (t, L) => L.length ? `<h5>${t}, ${eur(sum(L))}</h5>${L.map(line).join('')}` : '';
  const fg = (t, v) => `<span><small>${t}</small><b>${eur(v)}</b></span>`;
  $('c_b').innerHTML = `<div class="cs">${fg('Validés à venir', sum(upc))}${fg('Déjà réalisés', sum(pas))}${fg('Ce mois-ci', sum(V.filter(x => x.d && x.d.startsWith(cur))))}${fg('Potentiel en cours', sum(opn))}</div>
<h5>Mois par mois (dates validées)</h5>${mrows || '<p class="sub">Aucune date validée avec une date fixée.</p>'}${grp('Validés à venir', upc)}${grp('Déjà réalisés', pas)}${grp('Validés, date à fixer', nod)}${grp('En cours de négociation', opn)}`;
  $('dlgC').showModal();
}
const readAccounts = () => Object.keys(PL).forEach(k => { const i = $('a_' + k); if (i) S.settings.accounts[k] = i.value.trim(); });
async function saveAccess() {
  const set = async (k, id) => { const i = $(id), v = i && i.value.trim(); if (v) { await api.setKey(k, v); S.keys[k] = true; } };
  try { await set('ig', 'a_ig'); await set('ttk', 'a_ttk'); await set('tts', 'a_tts'); return true; }
  catch (er) { toast('Chiffrement indisponible sur cet ordinateur', 5000); return false; }
}
function openDeal(id) {
  editId = id; const x = S.deals.find(y => y.id === id) || {};
  $('f_t').textContent = id ? 'Modifier la piste' : 'Nouvelle piste';
  $('f_u').innerHTML = DUR.map(m => `<option value="${m}">${m ? dur(m) : 'Non précisée'}</option>`).join('');
  $('f_v').value = x.v || ''; $('f_c').value = x.c || ''; $('f_d').value = x.d || ''; $('f_h').value = x.t || '';
  $('f_k').innerHTML = cOpts(); $('f_k').value = x.k || 0; $('f_u').value = x.du || 0; $('f_f').value = x.f || '';
  $('dlg').showModal(); $('f_v').focus();
}

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.tagName === 'INPUT') return;
  const a = b.dataset.a, id = +b.dataset.id, x = S.deals.find(y => y.id === id);
  let s = false;
  if (a === 'view') view = b.dataset.v;
  else if (a === 'flt') flt = b.dataset.v;
  else if (a === 'new') { openDeal(null); return; }
  else if (a === 'edit') { openDeal(id); return; }
  else if (a === 'closedlg') { $('dlg').close(); return; }
  else if (a === 'savedeal') {
    const v = $('f_v').value.trim();
    if (!v) { $('f_v').focus(); return; }
    const o = { v, c: $('f_c').value.trim(), d: $('f_d').value, t: $('f_h').value, du: +$('f_u').value || 0, f: $('f_f').value, k: +$('f_k').value || 0, u: Date.now() };
    const cur = S.deals.find(y => y.id === editId);
    if (cur) { Object.assign(cur, o); s = !!cur.pub; } else S.deals.push({ id: Math.max(0, ...S.deals.map(y => y.id)) + 1, s: 0, ...o });
    $('dlg').close(); toast('Piste enregistrée');
  }
  else if (a === 'tog') { const o = b.closest('.card').classList.toggle('open'); o ? ex.add(id) : ex.delete(id); b.setAttribute('aria-expanded', o); return; }
  else if (a === 'cachets') { showCachets(); return; }
  else if (a === 'audience') { fillAudience(); $('dlgA').showModal(); return; }
  else if (a === 'closea') { $('dlgA').close(); return; }
  else if (a === 'gosettings') { $('dlgA').close(); view = 'settings'; }
  else if (a === 'refa') { b.textContent = 'Actualisation en cours'; b.disabled = true; S.stats = null; busy = true; await loadStats(true); return; }
  else if (a === 'arch') { const o = b.closest('.arch').classList.toggle('open'); archOpen = o; b.setAttribute('aria-expanded', o); return; }
  else if (a === 'go') {
    $('dlgV').close(); view = b.dataset.v; focus = null;
    if (view == 'plan') { const d = b.dataset.d, mo = b.dataset.m || (d && d.slice(0, 7)); if (mo) { pm = new Date(+mo.slice(0, 4), +mo.slice(5, 7) - 1, 1); focus = d ? { t: 'day', k: d } : null; } }
    else if (view == 'settings' && b.dataset.sec) focus = { t: 'sec', id: b.dataset.sec };
    else if (view == 'booking') { if (x) { ex.add(id); if (x.s == 3 && x.d && x.d < today()) archOpen = true; focus = { t: 'deal', id }; } else if (b.dataset.s) focus = { t: 'stage', s: +b.dataset.s }; }
  }
  else if (a === 'closec') { $('dlgC').close(); return; }
  else if (a === 'vtodo') { viewTodo(id); return; }
  else if (a === 'closev') { $('dlgV').close(); return; }
  else if (a === 'vedit') { $('dlgV').close(); openTodo(id); return; }
  else if (a === 'vdone') { const t = S.todos.find(y => y.id === id); if (t) t.done = !t.done; $('dlgV').close(); }
  else if (a === 'tnew') { openTodo(null); return; }
  else if (a === 'daynew') { openTodo(null, b.dataset.d); return; }
  else if (a === 'etodo') { openTodo(id); return; }
  else if (a === 'closet') { $('dlgT').close(); return; }
  else if (a === 'savetodo') {
    const t = $('t_t').value.trim();
    if (!t) { $('t_t').focus(); return; }
    const o = { t, ty: $('t_y').value, d: $('t_d').value, k: +$('t_k').value || 0 };
    const cur = S.todos.find(y => y.id === editT);
    if (cur) Object.assign(cur, o); else S.todos.push({ id: nextId(S.todos), done: false, ...o });
    $('dlgT').close(); toast('Tâche enregistrée');
  }
  else if (a === 'tdel') { S.todos = S.todos.filter(y => y.id !== editT); $('dlgT').close(); }
  else if (a === 'tdone') { const t = S.todos.find(y => y.id === id); if (t) t.done = !t.done; }
  else if (a === 'pm') { calAnim = true; if (b.dataset.v === '0') { pm = new Date(); pm.setDate(1); } else pm = new Date(pm.getFullYear(), pm.getMonth() + +b.dataset.v, 1); }
  else if (a === 'knew') { openContact(null); return; }
  else if (a === 'kpin') { const c = cn(id); if (c) c.pin = !c.pin; }
  else if (a === 'shexp') { openExport(); return; }
  else if (a === 'shsave') { await doExport(); return; }
  else if (a === 'shclose') { $('dlgShare').close(); return; }
  else if (a === 'shimp') { await startImport(); return; }
  else if (a === 'impclose') { $('dlgImp').close(); return; }
  else if (a === 'impgo') { await doImport(); return; }
  else if (a === 'colorset') setColor(b.dataset.k, b.dataset.v);
  else if (a === 'colorreset') delete S.settings.colors;
  else if (a === 'tutoopen') { openTuto(); return; }
  else if (a === 'tutonext') { tutoNext(); return; }
  else if (a === 'tutoprev') { tutoName(); tstep = Math.max(0, tstep - 1); renderTuto(); return; }
  else if (a === 'tutoskip') { $('dlgTuto').close(); return; }
  else if (a === 'cflt') cflt = b.dataset.v;
  else if (a === 'lflt') cflt = cflt == b.dataset.l ? 'Tous' : b.dataset.l;
  else if (a === 'lbadd') addingLabel = true;
  else if (a === 'lbno') addingLabel = false;
  else if (a === 'lbok') { if (!addLabel()) return; }
  else if (a === 'lbdel') {
    const l = b.dataset.l; if (!confirm(`Supprimer le libellé ${l} ? Il sera retiré de tous les contacts.`)) return;
    S.settings.labels = customLabels().filter(x => x !== l); S.contacts.forEach(c => { c.ls = clab(c).filter(x => x !== l); }); if (cflt == l) cflt = 'Tous';
  }
  else if (a === 'klabdel') { const c = cn(id); if (c) c.ls = clab(c).filter(x => x !== b.dataset.l); }
  else if (a === 'krelance') { const c = cn(id); openTodo(null); $('t_k').value = id; $('t_t').value = 'Relancer ' + (c ? c.n : ''); $('t_y').value = 'relance'; return; }
  else if (a === 'kedit') { openContact(id); return; }
  else if (a === 'closek') { $('dlgK').close(); return; }
  else if (a === 'savek') {
    const n = $('k_n').value.trim();
    if (!n) { $('k_n').focus(); return; }
    const o = { n, o: $('k_o').value.trim(), e: $('k_e').value.trim(), p: $('k_p').value.trim(), i: $('k_i').value.trim().replace(/^@/, ''), nt: $('k_nt').value.trim() };
    const cur = S.contacts.find(y => y.id === editK);
    if (cur) Object.assign(cur, o); else S.contacts.push({ id: nextId(S.contacts), ...o });
    $('dlgK').close(); toast('Contact enregistré');
  }
  else if (a === 'kdel') { if (!confirm('Supprimer ce contact ?')) return; S.contacts = S.contacts.filter(c => c.id !== id); S.deals.forEach(d => { if (d.k === id) d.k = 0; }); S.todos.forEach(t => { if (t.k === id) t.k = 0; }); }
  else if (a === 'mv') { if (x && x.s < 3) { x.s++; x.u = Date.now(); } }
  else if (a === 'pub') { if (!x) return; x.pub = true; s = true; }
  else if (a === 'unpub') { if (!x) return; x.pub = false; s = true; }
  else if (a === 'del') { if (!x || !confirm('Supprimer cette piste ?')) return; s = !!x.pub; S.deals = S.deals.filter(y => y !== x); }
  else if (a === 'files') { const tag = $('rt').value, l = await api.addFiles(); l.forEach((f, i) => S.resources.push({ id: Date.now() + i, name: f.name, path: f.path, tag, where: 'Local' })); }
  else if (a === 'link') {
    const u = $('lu').value.trim();
    if (!/^https?:\/\//.test(u)) { toast('Collez un lien qui commence par https://'); return; }
    S.resources.push({ id: Date.now(), name: $('ln').value.trim() || 'Lien Drive', path: u, tag: $('rt').value, where: 'Drive' });
  }
  else if (a === 'rm') S.resources = S.resources.filter(r => r.id !== id);
  else if (a === 'open') { api.open(b.dataset.p).then(r => { if (r) toast("Impossible d'ouvrir ce fichier, il a peut-être été déplacé", 4500); }); return; }
  else if (a === 'sync') { sync(); return; }
  else if (a === 'refresh') { S.stats = null; busy = true; draw(); await loadStats(true); return; }
  else if (a === 'tok') {
    const v = $('tk').value.trim();
    if (!v) return;
    try { await api.token(v); S.hasToken = true; toast('Jeton enregistré'); } catch (er) { toast('Chiffrement indisponible sur cet ordinateur', 5000); }
  }
  else if (a === 'up' || a === 'down') { const o = S.settings.order, i = o.indexOf(b.dataset.p), j = a === 'up' ? i - 1 : i + 1; if (i >= 0 && j >= 0 && j < o.length) [o[i], o[j]] = [o[j], o[i]]; }
  else if (a === 'ssoc') { if (await saveAccess()) toast('Accès enregistrés'); }
  else if (a === 'ttconn') {
    if (!(await saveAccess())) return;
    toast('Autorisez l\'accès dans votre navigateur', 8000);
    const r = await api.ttConnect();
    if (r.ok) { S.keys.ttr = true; toast('TikTok connecté'); } else { toast(r.error, 7000); return; }
  }
  else if (a === 'refsoc') {
    readAccounts(); if (!(await saveAccess())) return;
    toast('Actualisation des comptes en cours', 8000); persist();
    await loadStats(true);
    const er = Object.entries(S.err || {}); toast(er.length ? `${(PL[er[0][0]] || {}).n || 'Actualisation'} : ${er[0][1]}` : 'Comptes actualisés', er.length ? 6000 : 2400);
  }
  else if (a === 'sname') { S.settings.name = $('sn').value.trim(); toast('Nom de compte enregistré'); }
  else if (a === 'sset') S.settings = { ...S.settings, owner: $('so').value.trim(), repo: $('sr').value.trim(), path: $('sp').value.trim() };
  else if (a === 'sacc') {
    readAccounts();
    let ok = true;
    for (const [key, id] of [['sc', 'a_sk'], ['scs', 'a_ss'], ['yt', 'a_k']]) {
      const v = $(id).value.trim();
      if (v) { try { await api.setKey(key, v); S.keys[key] = true; } catch (er) { ok = false; } }
    }
    toast(ok ? 'Comptes enregistrés' : 'Chiffrement indisponible sur cet ordinateur', ok ? 2400 : 5000); loadStats();
  }
  persist(); draw();
  if (s) sync();
});
let pdrag = null, noClick = false;
const dropRow = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.crow') : null; };
document.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return;
  const b = ev.target.closest && ev.target.closest('.lbl[data-l]');
  if (b) pdrag = { l: b.dataset.l, x: ev.clientX, y: ev.clientY, on: false, ghost: null, row: null, cx: ev.clientX, cy: ev.clientY, raf: 0 };
});
document.addEventListener('pointermove', ev => {
  if (!pdrag) return;
  pdrag.cx = ev.clientX; pdrag.cy = ev.clientY;
  if (!pdrag.on) {
    if (Math.hypot(ev.clientX - pdrag.x, ev.clientY - pdrag.y) < 6) return;
    pdrag.on = true; document.body.classList.add('dragging');
    const g = document.createElement('div'); g.className = 'dragghost'; g.textContent = pdrag.l; g.style.setProperty('--c', lbc(pdrag.l)); document.body.appendChild(g); pdrag.ghost = g;
    const tick = () => {
      if (!pdrag) return;
      const vy = pdrag.cy < 80 ? -16 : pdrag.cy > innerHeight - 80 ? 16 : 0;
      if (vy) window.scrollBy({ top: vy, behavior: 'instant' });
      pdrag.ghost.style.transform = `translate(${pdrag.cx + 14}px, ${pdrag.cy + 14}px)`;
      const row = dropRow(pdrag.cx, pdrag.cy);
      if (row !== pdrag.row) { if (pdrag.row) pdrag.row.classList.remove('drop'); if (row) row.classList.add('drop'); pdrag.row = row; }
      pdrag.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  ev.preventDefault();
});
const endDrag = apply => {
  if (!pdrag) return; const d = pdrag; pdrag = null;
  if (!d.on) return;
  cancelAnimationFrame(d.raf); if (d.ghost) d.ghost.remove(); document.body.classList.remove('dragging'); if (d.row) d.row.classList.remove('drop');
  noClick = true; setTimeout(() => { noClick = false; }, 80);
  const row = apply ? dropRow(d.cx, d.cy) : null; if (!row) return;
  const c = cn(+row.dataset.id); if (!c) return;
  if (clab(c).includes(d.l)) toast(`${c.n} a déjà le libellé ${d.l}`);
  else { c.ls = [...clab(c), d.l]; persist(); }
  draw();
};
document.addEventListener('pointerup', () => endDrag(true));
document.addEventListener('pointercancel', () => endDrag(false));
document.addEventListener('click', ev => { if (noClick) { ev.stopPropagation(); ev.preventDefault(); } }, true);
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if (t.id === 'nl') {
    if (ev.key === 'Enter') { ev.preventDefault(); if (addLabel()) { persist(); draw(); } }
    else if (ev.key === 'Escape') { addingLabel = false; draw(); }
  } else if (t.id === 'tn' && ev.key === 'Enter') { ev.preventDefault(); tutoNext(); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset && t.dataset.a === 'color') { setColor(t.dataset.k, t.value); applyColors(); return; }
  if (ev.target.id === 'cs') { cq = ev.target.value; $('clist').innerHTML = contactRows(); }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.closest && t.closest('#dlgImp')) { impPreview(); return; }
  if (t.dataset.a === 'color') { setColor(t.dataset.k, t.value); persist(); draw(); return; }
  if (t.dataset.a === 'goal') {
    const n = Math.max(0, Math.round(+t.value || 0)), k = t.dataset.k;
    if (n) S.goals[k] = n; else delete S.goals[k];
    persist();
    const c = goalCalc(k), row = t.closest('.gl');
    row.querySelector('.bar').style.setProperty('--w', c.pc + '%'); row.querySelector('.gnote').textContent = c.note;
    draw(); return;
  }
  if (t.dataset.a !== 'setd') return;
  const x = S.deals.find(y => y.id == t.dataset.id);
  if (!x) return;
  x.d = t.value; x.u = Date.now(); persist(); draw();
  if (x.pub) sync();
});
// ---- partage de données
const SHD = { deals: 'Dates et pistes de booking', contacts: 'Contacts et libellés', todos: 'Tâches', resources: 'Ressources et liens', audience: 'Audience : comptes, objectifs et historique' };
const SHU = { deals: 'date', contacts: 'contact', todos: 'tâche', resources: 'ressource' };
const shN = k => k == 'audience' ? pl(Object.keys(S.hist || {}).length, 'jour') + " d'historique" : pl(S[k].length, SHU[k]);
const OPT = () => ({ defaultLabels: Object.keys(LB) });
function openExport() {
  $('sh_b').innerHTML = Object.keys(SHD).map(k => `<label class="ckl"><input type="checkbox" id="sx_${k}" checked><span>${SHD[k]}</span><small>${shN(k)}</small></label>`).join('');
  $('sh_m').textContent = ''; $('dlgShare').showModal();
}
async function doExport() {
  const scope = {}; Object.keys(SHD).forEach(k => { scope[k] = $('sx_' + k).checked; });
  if (!Object.values(scope).some(Boolean)) { $('sh_m').textContent = 'Cochez au moins une rubrique.'; return; }
  const file = Share.build(S, scope, { name: S.settings.name, version: APPVER });
  await persist();
  const slug = (S.settings.name || 'export').normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'export';
  const r = await api.exportFile(JSON.stringify(file, null, 2), `ARTIST-Studio-${slug}-${today()}.json`);
  if (r.canceled) return;
  if (r.error) { $('sh_m').textContent = r.error; return; }
  $('dlgShare').close(); toast('Fichier enregistré');
}
let impFile = null;
async function startImport() {
  const r = await api.importFile(); if (r.canceled) return;
  if (r.error) { toast(r.error, 4500); return; }
  const v = Share.validate(r.data); if (!v.ok) { toast(v.error, 4500); return; }
  impFile = r.data; renderImp(); $('imp_m').textContent = ''; $('dlgImp').showModal();
}
function renderImp() {
  const f = impFile, keys = Object.keys(SHD).filter(k => Share.has(f, k));
  const when = f.exportedAt && !isNaN(Date.parse(f.exportedAt)) ? new Date(f.exportedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  $('imp_b').innerHTML = `<p class="sub">Données ${f.from ? 'de ' + e(String(f.from).slice(0, 40)) : "d'un autre appareil"}${when ? ', exportées le ' + when : ''}.</p>
<h5>À importer</h5>${keys.map(k => `<label class="ckl"><input type="checkbox" id="si_${k}" checked><span>${SHD[k]}</span><small>${k == 'audience' ? pl(Share.count(f, k), 'jour') : pl(Share.count(f, k), SHU[k])}</small></label>`).join('') || '<p class="sub">Ce fichier est vide.</p>'}
<h5>Mode</h5><label class="mode"><input type="radio" name="sm" id="sm_merge" checked><span><b>Fusionner avec mes données</b><small>Ajoute les nouveautés et garde la version la plus récente de chaque élément.</small></span></label><label class="mode"><input type="radio" name="sm" id="sm_replace"><span><b>Remplacer mes données</b><small>Vos données actuelles sont remplacées par celles du fichier.</small></span></label>
<h5>Aperçu</h5><div id="imp_p" class="ips"></div>`;
  impPreview();
}
const impScope = () => { const sc = {}; Object.keys(SHD).forEach(k => { const c = $('si_' + k); sc[k] = !!(c && c.checked); }); return sc; };
const impMode = () => ($('sm_replace') && $('sm_replace').checked ? 'replace' : 'merge');
const pp = (n, a, b) => `${n} ${n > 1 ? b : a}`;
function impPreview() {
  if (!impFile) return;
  const sc = impScope(), replace = impMode() == 'replace', nm = { deals: 'Dates', contacts: 'Contacts', todos: 'Tâches', resources: 'Ressources' }, rows = [];
  $('imp_go').textContent = replace ? 'Remplacer mes données' : 'Importer';
  if (!Object.values(sc).some(Boolean)) { $('imp_p').innerHTML = '<p class="sub">Rien n\'est sélectionné.</p>'; return; }
  if (replace) {
    const r = Share.replace(S, impFile, sc, false, OPT());
    Object.keys(r.lists).forEach(k => rows.push([nm[k], `${r.lists[k].before} actuels, remplacés par ${r.lists[k].after}`]));
  } else {
    const r = Share.merge(S, impFile, sc, false, OPT());
    Object.keys(r.lists).forEach(k => {
      const c = r.lists[k], parts = [c.added && pp(c.added, 'ajouté', 'ajoutés'), c.updated && pp(c.updated, 'mis à jour', 'mis à jour'), c.removed && pp(c.removed, 'supprimé', 'supprimés'), c.kept && pp(c.kept, 'gardé (plus récent chez vous)', 'gardés (plus récents chez vous)'), c.same && pp(c.same, 'identique', 'identiques')].filter(Boolean);
      rows.push([nm[k], parts.join(', ') || 'Rien à changer']);
    });
    if (r.skippedLocal) rows.push(['Ressources', `${pp(r.skippedLocal, 'fichier local ignoré', 'fichiers locaux ignorés')}, seuls les liens se partagent`]);
    if (sc.contacts && r.labels) rows.push(['Libellés', pp(r.labels, 'ajouté', 'ajoutés')]);
    if (sc.audience && (r.accounts || r.goals || r.hist)) rows.push(['Audience', [r.accounts && pp(r.accounts, 'compte', 'comptes'), r.goals && pp(r.goals, 'objectif', 'objectifs'), r.hist && pp(r.hist, "jour d'historique", "jours d'historique")].filter(Boolean).join(', ')]);
  }
  $('imp_p').innerHTML = rows.map(([a, b]) => `<div class="ipr"><b>${a}</b><span>${b}</span></div>`).join('') || '<p class="sub">Rien à changer.</p>';
}
async function doImport() {
  const sc = impScope(), replace = impMode() == 'replace';
  if (!Object.values(sc).some(Boolean)) { $('imp_m').textContent = 'Sélectionnez au moins une rubrique.'; return; }
  if (replace && !confirm('Remplacer vos données actuelles par celles du fichier ? Une sauvegarde est créée avant.')) return;
  await persist(); await api.backup();
  if (replace) Share.replace(S, impFile, sc, true, OPT()); else Share.merge(S, impFile, sc, true, OPT());
  await persist(); impFile = null; $('dlgImp').close(); draw(); toast('Données importées');
}
api.load().then(d => { S = d; S.settings.accounts = S.settings.accounts || {}; S.keys = S.keys || {}; S.todos = S.todos || []; S.contacts = S.contacts || []; S.social = S.social || {}; S.hist = S.hist || {}; S.goals = S.goals || {}; S.err = {}; S.settings.labels = S.settings.labels || [];
  S.contacts.forEach(c => { if (c.l) { const l = c.l == 'Bar ou club' ? 'Bar' : c.l; c.ls = [...new Set([...(c.ls || []), l])]; if (!LB[l] && !S.settings.labels.includes(l)) S.settings.labels.push(l); delete c.l; } });
  Share.init(S);
  const ok = S.settings.order || []; S.settings.order = [...ok.filter(k => PL[k]), ...Object.keys(PL).filter(k => !ok.includes(k))]; draw(); loadStats(); if (!S.settings.tuto) setTimeout(openTuto, 400); });
api.version().then(v => { APPVER = v; $('ver').textContent = 'Version ' + v; });
$('dlgTuto').addEventListener('close', () => { tutoName(); S.settings.tuto = true; persist(); draw(); });
window.addEventListener('resize', navState);
