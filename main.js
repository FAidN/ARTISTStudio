const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, net } = require('electron');
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const APPDATA = app.getPath('appData'), DATA_DIR = path.join(APPDATA, 'artist-studio'), OLD_DIR = path.join(APPDATA, 'aidn-studio');
try { require('./reprise')(OLD_DIR, DATA_DIR); } catch (er) { console.error('reprise des données', er); }
app.setPath('userData', DATA_DIR);

const F = n => path.join(app.getPath('userData'), n);
const read = (n, d) => { try { return JSON.parse(fs.readFileSync(F(n), 'utf8')); } catch { return d; } };
const readData = () => { const a = read('data.json', null); return a || read('data.bak.json', {}); };
const DEF = {
  deals: [{ id: 1, v: 'Maximo Club', c: 'Nantes', d: '2026-10-08', f: '', s: 3, pub: true }],
  resources: [],
  settings: { owner: 'djaidn', repo: 'djaidn.github.io', path: 'dates.json' }
};
const slug = x => (x.v + '-' + x.d).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const T = (p, ms = 8000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('délai dépassé')), ms))]);
const req = async (u, o) => { try { return await net.fetch(u, o); } catch (e1) { try { return await fetch(u, o); } catch (e2) { throw e1; } } };
const getToken = () => { try { return safeStorage.decryptString(fs.readFileSync(F('token.bin'))); } catch { return null; } };

app.setAppUserModelId('com.artiststudio.app');
const gotLock = app.requestSingleInstanceLock();
let win;
if (!gotLock) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  if (!gotLock) return;
  const w = win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, backgroundColor: '#0b0c09', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', ev => ev.preventDefault());
  w.loadFile(path.join(__dirname, 'renderer', 'index.html'));
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('version', () => app.getVersion());
ipcMain.handle('load', () => {
  const s = readData();
  return { ...DEF, ...s, hasToken: !!getToken(), keys: Object.fromEntries(['yt', 'sc', 'scs', 'ig', 'ttk', 'tts', 'ttr'].map(k => [k, !!getKeys()[k]])) };
});
// Partage de données : export vers un fichier, import depuis un fichier, sauvegarde avant import
const FILTRES = [{ name: 'Fichier ARTIST Studio', extensions: ['json'] }];
ipcMain.handle('exportFile', async (_, text, name) => {
  if (typeof text !== 'string' || !text) return { error: 'Rien à enregistrer' };
  const safe = String(name || 'ARTIST-Studio.json').replace(/[\\/:*?"<>|]+/g, '-');
  const r = await dialog.showSaveDialog(win, { title: 'Exporter mes données', defaultPath: path.join(app.getPath('documents'), safe), filters: FILTRES });
  if (r.canceled || !r.filePath) return { canceled: true };
  fs.writeFileSync(r.filePath, text);
  return { ok: true, path: r.filePath };
});
ipcMain.handle('importFile', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Importer des données', properties: ['openFile'], filters: FILTRES });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  const p = r.filePaths[0];
  try {
    if (fs.statSync(p).size > 20e6) return { error: 'Ce fichier est trop volumineux' };
    return { ok: true, name: path.basename(p), data: JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch { return { error: "Ce fichier n'est pas un export ARTIST Studio" }; }
});
ipcMain.handle('backup', () => {
  const dir = F('sauvegardes'), f = F('data.json');
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, 'avant-import-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
  fs.readdirSync(dir).filter(n => n.startsWith('avant-import-')).sort().slice(0, -10).forEach(n => { try { fs.unlinkSync(path.join(dir, n)); } catch {} });
  return true;
});
ipcMain.handle('save', (_, s) => {
  const f = F('data.json'), tmp = f + '.tmp';
  try { if (fs.existsSync(f)) fs.copyFileSync(f, F('data.bak.json')); } catch {}
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2)); fs.renameSync(tmp, f);
  return true;
});
ipcMain.handle('token', (_, t) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement indisponible');
  fs.writeFileSync(F('token.bin'), safeStorage.encryptString(String(t).trim()));
  return true;
});
ipcMain.handle('addFiles', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
  return r.canceled ? [] : r.filePaths.map(p => ({ name: path.basename(p), path: p }));
});
ipcMain.handle('open', async (_, p) => {
  if (typeof p !== 'string' || !p) return '';
  if (/^https?:\/\//.test(p)) { await shell.openExternal(p); return ''; }
  return shell.openPath(p);          // renvoie un message d'erreur si le fichier est introuvable
});

ipcMain.handle('publish', async (_, s) => {
  const tk = getToken();
  if (!tk) return { ok: false, error: 'Aucun jeton GitHub enregistré (voir Réglages).' };
  const { owner, repo, path: file } = s.settings;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;
  const h = { Authorization: `Bearer ${tk}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let step = 'lecture du fichier sur GitHub';
  try {
    let sha;
    const r = await req(`${url}?_=${Date.now()}`, { headers: h, cache: 'no-store' });
    if (r.ok) sha = (await r.json()).sha;
    else if (r.status !== 404) return { ok: false, error: `GitHub a répondu ${r.status} à la lecture (jeton, droits ou dépôt incorrects ?)` };
    const dates = s.deals.filter(x => x.pub && x.d).sort((a, b) => a.d.localeCompare(b.d))
      .map(x => ({ id: slug(x), date: x.d, venue: x.v, city: x.c, time: x.t || null, duration: x.du || null, status: 'confirmed' }));
    const json = JSON.stringify({ version: 1, updated: new Date().toISOString(), dates }, null, 2) + '\n';
    const body = { message: 'Mise à jour des dates (ARTIST Studio)', content: Buffer.from(json).toString('base64'), sha };
    step = "envoi des dates à GitHub";
    const w = await req(url, { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (w.ok) return { ok: true };
    const m = await w.json().catch(() => ({}));
    return { ok: false, error: `GitHub ${w.status} : ${m.message || 'erreur inconnue'}` };
  } catch (err) {
    console.error('publish', step, err);
    return { ok: false, error: `Échec (${step}) : ${err.message || err}` };
  }
});

const getKeys = () => { try { return JSON.parse(safeStorage.decryptString(fs.readFileSync(F('keys.bin')))); } catch { return {}; } };
const putKey = (k, v) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement indisponible');
  const o = getKeys(); o[k] = String(v).trim();
  fs.writeFileSync(F('keys.bin'), safeStorage.encryptString(JSON.stringify(o)));
  return true;
};
ipcMain.handle('setKey', (_, k, v) => putKey(k, v));
const J = u => T(req(u).then(r => { if (!r.ok) throw new Error(r.status === 404 ? 'Compte introuvable' : r.status === 401 || r.status === 403 ? 'Accès refusé, vérifiez vos clés' : 'Erreur ' + r.status); return r.json(); }));
const SC = require('./soundcloud')(req);
// ---------- Instagram et TikTok : récupération par bouton Actualiser ----------
const IGH = 'https://graph.instagram.com/v23.0', TTH = 'https://open.tiktokapis.com/v2', TT_REDIRECT = 'http://localhost:8902/';
const qs = o => new URLSearchParams(o).toString();
const ts = x => Date.parse(String(x).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
const jfetch = async (u, o) => {
  const r = await req(u, o), d = await r.json().catch(() => ({}));
  const er = d.error && d.error.code !== 'ok' ? d : null;               // TikTok renvoie error.code = "ok" en cas de succès
  if (!r.ok || er) {
    const m = er && (er.error_description || (typeof er.error === 'string' ? er.error : er.error.message || er.error.code));
    throw new Error(m || 'HTTP ' + r.status);
  }
  return d;
};

async function igStats(tk) {
  // Le jeton Instagram dure 60 jours : on le renouvelle à chaque actualisation (ignoré si trop récent).
  const nt = await jfetch(`https://graph.instagram.com/refresh_access_token?${qs({ grant_type: 'ig_refresh_token', access_token: tk })}`).then(d => d.access_token).catch(() => null);
  if (nt && nt !== tk) { putKey('ig', nt); tk = nt; }
  const g = (p, f) => jfetch(`${IGH}/${p}?${qs({ ...f, access_token: tk })}`);
  const me = await g('me', { fields: 'username,followers_count,media_count' });
  const out = { fans: me.followers_count, items: me.media_count, handle: me.username };
  const fld = 'id,caption,media_type,permalink,timestamp';
  const lm = await g('me/media', { fields: fld + ',like_count,comments_count', limit: 1 }).catch(() => g('me/media', { fields: fld, limit: 1 }));
  const m = lm.data && lm.data[0];
  if (m) {
    out.last = { text: (m.caption || '').slice(0, 90), url: m.permalink, at: ts(m.timestamp), likes: m.like_count, comments: m.comments_count };
    const ins = await g(`${m.id}/insights`, { metric: 'views' }).catch(() => null);
    const d0 = ins && ins.data && ins.data[0], v = d0 && (d0.values ? d0.values[0].value : d0.total_value && d0.total_value.value);
    if (v != null) out.last.views = v;
  }
  return out;
}

const ttToken = async (k, body) => {
  const d = await jfetch(`${TTH}/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs({ client_key: k.ttk, client_secret: k.tts, ...body }) });
  if (d.refresh_token) putKey('ttr', d.refresh_token);                   // TikTok change le jeton de renouvellement à chaque fois
  return d;
};
async function ttStats(k) {
  const t = await ttToken(k, { grant_type: 'refresh_token', refresh_token: k.ttr });
  const h = { Authorization: `Bearer ${t.access_token}` };
  const u = (await jfetch(`${TTH}/user/info/?fields=display_name,follower_count,likes_count,video_count`, { headers: h })).data.user;
  const out = { fans: u.follower_count, likes: u.likes_count, items: u.video_count, handle: u.display_name };
  const v = await jfetch(`${TTH}/video/list/?fields=id,title,share_url,create_time,like_count,comment_count,share_count,view_count`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ max_count: 1 }) }).catch(() => null);
  const x = v && v.data && v.data.videos && v.data.videos[0];
  if (x) out.last = { text: (x.title || '').slice(0, 90), url: x.share_url, at: x.create_time * 1000, likes: x.like_count, comments: x.comment_count, shares: x.share_count, views: x.view_count };
  return out;
}

// Connexion TikTok : ouvre le navigateur, récupère le code sur localhost:8902 et échange contre les jetons.
ipcMain.handle('ttConnect', () => new Promise(resolve => {
  const k = getKeys();
  if (!k.ttk || !k.tts) return resolve({ ok: false, error: 'Enregistrez d\'abord la Client key et le Client secret TikTok.' });
  const ver = crypto.randomBytes(48).toString('base64url'), st = crypto.randomBytes(8).toString('hex');
  const chal = crypto.createHash('sha256').update(ver).digest('hex');   // TikTok attend le hachage SHA-256 en hexadécimal
  let done = false, srv;
  const to = setTimeout(() => fin({ ok: false, error: 'Délai dépassé (3 minutes).' }), 180000);
  const fin = r => { if (done) return; done = true; clearTimeout(to); try { srv.close(); } catch {} resolve(r); };
  const page = (ok, m) => `<!doctype html><meta charset="utf-8"><title>ARTIST Studio</title><body style="font:16px system-ui;background:#0b0c09;color:#ece8ea;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:${ok ? '#e6b1c4' : '#ef6f5e'}">${ok ? 'TikTok est connecté' : 'Connexion impossible'}</h2><p>${ok ? 'Vous pouvez fermer cet onglet et revenir à ARTIST Studio.' : m}</p></div>`;
  srv = http.createServer(async (rq, rs) => {
    const u = new URL(rq.url, TT_REDIRECT), code = u.searchParams.get('code'), er = u.searchParams.get('error_description') || u.searchParams.get('error');
    if (!code && !er) { rs.writeHead(204); rs.end(); return; }
    rs.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (!code || u.searchParams.get('state') !== st) { rs.end(page(false, er || 'Autorisation refusée.')); return fin({ ok: false, error: er || 'Autorisation refusée.' }); }
    try { await ttToken(k, { grant_type: 'authorization_code', code, redirect_uri: TT_REDIRECT, code_verifier: ver }); rs.end(page(true)); fin({ ok: true }); }
    catch (err) { rs.end(page(false, err.message)); fin({ ok: false, error: err.message }); }
  });
  srv.on('error', err => fin({ ok: false, error: 'Port 8902 indisponible : ' + err.message }));
  srv.listen(8902, '127.0.0.1', () => shell.openExternal(`https://www.tiktok.com/v2/auth/authorize/?${qs({ client_key: k.ttk, scope: 'user.info.basic,user.info.stats,video.list', response_type: 'code', redirect_uri: TT_REDIRECT, state: st, code_challenge: chal, code_challenge_method: 'S256' })}`));
}));

ipcMain.handle('stats', async (_, a, social) => {
  const out = { err: {} }, k = getKeys(), q = encodeURIComponent;
  const job = (name, fn) => T(fn(), 20000).then(r => { out[name] = r; }).catch(er => { out.err[name] = (er && er.message) || 'Erreur ' + name; });
  const jobs = [];
  const n = x => (x == null || isNaN(+x) ? null : +x);
  const bare = (v, re) => String(v).trim().replace(re, '').split(/[/?#]/)[0];
  if (a.mixcloud) jobs.push(job('mixcloud', async () => { const u = q(bare(a.mixcloud, /^https?:\/\/(www\.)?mixcloud\.com\//i)), d = await J(`https://api.mixcloud.com/${u}/`), out = { fans: d.follower_count, items: d.cloudcast_count };
    try {
      let url = `https://api.mixcloud.com/${u}/cloudcasts/?limit=100`, L = [];
      for (let i = 0; i < 3 && url; i++) { const c = await J(url); L = L.concat(c.data || []); url = c.paging && c.paging.next; }
      if (L.length) { const t = L.slice().sort((x, y) => Date.parse(y.created_time) - Date.parse(x.created_time))[0]; out.views = L.reduce((s, x) => s + (+x.play_count || 0), 0); out.last = { text: t.name, url: t.url, at: Date.parse(t.created_time) || null, plays: n(t.play_count), likes: n(t.favorite_count), comments: n(t.comment_count), shares: n(t.repost_count) }; }
    } catch { out.note = 'Écoutes indisponibles pour le moment'; }
    return out; }));
  if (a.deezer) jobs.push(job('deezer', async () => { const d = await J(`https://api.deezer.com/artist/${q(bare(a.deezer, /^https?:\/\/(www\.)?deezer\.com\/([a-z]{2}\/)?artist\//i))}`); if (d.error) throw new Error('Artiste Deezer introuvable'); const out = { fans: d.nb_fan, items: d.nb_album };
    try {
      const al = await J(`https://api.deezer.com/artist/${d.id}/albums?limit=100`), t = (al.data || []).slice().sort((x, y) => String(y.release_date).localeCompare(String(x.release_date)))[0];
      if (t) { const f = await J(`https://api.deezer.com/album/${t.id}`); out.last = { text: f.title, url: f.link, at: Date.parse(f.release_date) || null, likes: n(f.fans) }; }
    } catch { out.note = 'Dernière sortie indisponible pour le moment'; }
    return out; }));
  if (a.soundcloud) jobs.push(job('soundcloud', () => SC.stats(a.soundcloud, k)));
  if (a.youtube) jobs.push(job('youtube', async () => {
    if (!k.yt) throw new Error('Ajoutez votre clé API YouTube dans les Réglages');
    const y = String(a.youtube).trim(), byId = /^UC[\w-]{20,}$/.test(y), param = byId ? 'id' : 'forHandle', v = byId ? y : (y[0] === '@' ? y : '@' + y);
    const d = await J(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&${param}=${q(v)}&key=${q(k.yt)}`);
    if (!d.items || !d.items[0]) throw new Error('Chaîne YouTube introuvable');
    const t = d.items[0].statistics, out = { fans: +t.subscriberCount, views: +t.viewCount, items: +t.videoCount };
    try {
      const up = d.items[0].contentDetails.relatedPlaylists.uploads, pl = await J(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${q(up)}&maxResults=1&key=${q(k.yt)}`);
      const id = pl.items && pl.items[0] && pl.items[0].contentDetails.videoId;
      if (id) { const x = (await J(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${q(id)}&key=${q(k.yt)}`)).items[0], s = x.statistics; out.last = { text: x.snippet.title, url: 'https://youtu.be/' + id, at: Date.parse(x.snippet.publishedAt) || null, views: n(s.viewCount), likes: n(s.likeCount), comments: n(s.commentCount) }; }
    } catch { out.note = 'Dernière vidéo indisponible pour le moment'; }
    return out;
  }));
  if (social && k.ig) jobs.push(job('instagram', () => igStats(k.ig)));
  if (social && k.ttr) jobs.push(job('tiktok', () => ttStats(k)));
  await Promise.all(jobs);
  return out;
});
