// Statistiques SoundCloud : abonnés, écoutes des morceaux publiés et dernier son sorti.
// Accès officiel (OAuth) si les clés sont enregistrées, sinon lecture du profil public.
module.exports = req => {
  let cache = null, cid = null;
  const clean = u => String(u || '').trim().replace(/^https?:\/\/(www\.)?soundcloud\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  const when = s => { const t = Date.parse(s); return isNaN(t) ? Date.parse(String(s || '').replace(/\//g, '-').replace(' ', 'T').replace(' +0000', 'Z')) : t; };
  const num = x => (x == null || isNaN(+x) ? null : +x);

  // Cumul des écoutes et performances du dernier son sorti
  function summarize(tracks) {
    const L = (tracks || []).filter(t => t && t.playback_count != null);
    if (!L.length) return {};
    const top = L.slice().sort((a, b) => (when(b.display_date || b.created_at) || 0) - (when(a.display_date || a.created_at) || 0))[0];
    return {
      views: L.reduce((s, t) => s + (+t.playback_count || 0), 0), counted: L.length,
      last: { text: top.title, url: top.permalink_url, at: when(top.display_date || top.created_at) || null, plays: num(top.playback_count), likes: num(top.likes_count != null ? top.likes_count : top.favoritings_count), comments: num(top.comment_count), shares: num(top.reposts_count) }
    };
  }
  async function pages(first, headers, extra) {
    let url = first, out = [];
    for (let i = 0; i < 6 && url; i++) {
      const r = await req(url, { headers }); if (!r.ok) throw new Error('SoundCloud a répondu ' + r.status);
      const d = await r.json(); out = out.concat(Array.isArray(d) ? d : d.collection || []);
      url = d.next_href ? d.next_href + (extra && !/client_id=/.test(d.next_href) ? extra : '') : null;
    }
    return out;
  }

  // ---- accès officiel
  async function token(k) {
    const id = k.sc + ':' + k.scs;
    if (cache && cache.id === id && Date.now() < cache.exp) return cache.t;
    const r = await req('https://secure.soundcloud.com/oauth/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(id).toString('base64'), Accept: 'application/json; charset=utf-8', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw new Error(r.status === 400 || r.status === 401 ? 'Client ID ou Client secret SoundCloud incorrect' : 'SoundCloud a répondu ' + r.status);
    cache = { id, t: d.access_token, exp: Date.now() + Math.max(60, (d.expires_in || 3600) - 120) * 1000 };
    return cache.t;
  }
  async function viaApi(user, k) {
    const h = { Authorization: 'OAuth ' + await token(k), Accept: 'application/json; charset=utf-8' };
    const r = await req('https://api.soundcloud.com/resolve?url=' + encodeURIComponent('https://soundcloud.com/' + user), { headers: h });
    if (r.status === 401) { cache = null; throw new Error('Accès SoundCloud refusé'); }
    if (r.status === 404) throw new Error('Profil SoundCloud introuvable');
    if (!r.ok) throw new Error('SoundCloud a répondu ' + r.status);
    const d = await r.json();
    if (d.kind && d.kind !== 'user') throw new Error("Cet identifiant n'est pas un profil SoundCloud");
    if (d.followers_count == null) throw new Error('Réponse SoundCloud incomplète');
    const out = { fans: d.followers_count, items: d.track_count };
    try { Object.assign(out, summarize(await pages(`https://api.soundcloud.com/users/${d.id}/tracks?access=playable&limit=200&linked_partitioning=true`, h))); }
    catch { out.note = 'Écoutes indisponibles pour le moment'; }
    return out;
  }

  // ---- profil public
  function parse(h) {
    let u = null;
    const m = h.match(/__sc_hydration\s*=\s*(\[[\s\S]*?\])\s*;?\s*<\/script>/);
    if (m) { try { const x = JSON.parse(m[1]).find(y => y && y.hydratable === 'user'); u = x && x.data; } catch { /* page modifiée */ } }
    let fans = u && u.followers_count, items = u && u.track_count, id = u && u.id;
    if (fans == null) { const a = h.match(/"followers_count"\s*:\s*(\d+)/); if (a) fans = +a[1]; }
    if (items == null) { const b = h.match(/"track_count"\s*:\s*(\d+)/); if (b) items = +b[1]; }
    if (fans == null) { const c = h.match(/soundcloud:follower_count["']\s+content=["'](\d+)/); if (c) fans = +c[1]; }
    return fans == null ? null : { fans, items, id };
  }
  async function findClientId() {
    if (cid) return cid;
    const home = await (await req('https://soundcloud.com/', { headers: { Accept: 'text/html' } })).text();
    const urls = [...home.matchAll(/<script[^>]+src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(x => x[1]).reverse().slice(0, 8);
    for (const u of urls) { const js = await (await req(u)).text(); const m = js.match(/client_id\s*[:=]\s*"([A-Za-z0-9]{32})"/); if (m) return (cid = m[1]); }
    throw new Error('Accès public indisponible');
  }
  async function publicTracks(id) {
    for (let essai = 0; essai < 2; essai++) {
      try { const c = await findClientId(); return await pages(`https://api-v2.soundcloud.com/users/${id}/tracks?client_id=${c}&limit=200&linked_partitioning=1`, { Accept: 'application/json' }, '&client_id=' + c); }
      catch (er) { cid = null; if (essai) throw er; }
    }
  }
  async function viaPage(user) {
    const r = await req('https://soundcloud.com/' + encodeURIComponent(user), { headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' } });
    if (r.status === 404) throw new Error('Profil SoundCloud introuvable');
    if (!r.ok) throw new Error('SoundCloud a répondu ' + r.status);
    const u = parse(await r.text());
    if (!u) throw new Error('Abonnés SoundCloud illisibles sur la page du profil');
    const out = { fans: u.fans, items: u.items };
    if (u.id) { try { Object.assign(out, summarize(await publicTracks(u.id))); } catch { out.note = 'Écoutes indisponibles sans clés SoundCloud'; } }
    else out.note = 'Écoutes indisponibles sans clés SoundCloud';
    return out;
  }

  async function stats(account, k) {
    const user = clean(account);
    if (!user) throw new Error('Identifiant SoundCloud manquant');
    if (k.sc && k.scs) { try { return await viaApi(user, k); } catch (er) { try { return await viaPage(user); } catch { throw er; } } }
    return viaPage(user);
  }
  return { stats, parse, clean, summarize };
};
