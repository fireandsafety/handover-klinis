/* HANDOVER KLINIS — SPA: router, view, hidrasi data. Markup = hasil ekspor Stitch (pages/*.html), tidak diubah. */
(function () {
'use strict';
const $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
const esc = function (v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
const get = function (o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); };
const PERAN = { superadmin: 'Admin Sistem', manajemen: 'Manajemen', klinisi: 'RMO / Perawat / Klinisi', viewer: 'Viewer (baca saja)' };
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const S = { me: null, boot: null, unit: null, cur: null };

// ---------- util ----------
function interp(html, ctx) { return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, p) { return esc(get(ctx, p)); }); }
function jam(iso) { if (!iso) return '-'; const d = new Date(iso); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function tglPendek(iso) { if (!iso) return '-'; const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + (String(iso).length > 10 ? ' (' + jam(iso) + ')' : ''); }
function tglPanjang(iso) { const d = iso ? new Date(iso) : new Date(); return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function toast(msg, tipe) {
  const t = document.createElement('div'); t.setAttribute('role', 'status');
  t.className = 'px-4 py-3 rounded-lg shadow-xl text-sm font-medium ' + (tipe === 'err' ? 'bg-error text-on-error' : tipe === 'warn' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary');
  t.textContent = msg; $('#toasts').appendChild(t); setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, tipe === 'err' ? 6000 : 3500);
}
function show(el) { if (el) { el.classList.remove('hidden'); el.classList.add('flex'); } }
function hide(el) { if (el) { el.classList.add('hidden'); el.classList.remove('flex'); } }
function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.style.opacity = '.6'; if (label) btn.textContent = label; } else { btn.disabled = false; btn.style.opacity = ''; if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } }
function av(ins) { return String(ins || '??').replace(/\./g, '').slice(0, 2); }
function toBlobDownload(b64, nama) { const b = atob(b64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'application/pdf' })); a.download = nama + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
function tpl(html, ctx, fn) {                                          // DOM-level: data-if / data-rep sebelum interpolasi
  const t = document.createElement('template'); t.innerHTML = html;
  $$('[data-if]', t.content).forEach(function (e) { if (!ctx[e.getAttribute('data-if')]) e.remove(); else e.removeAttribute('data-if'); });
  $$('[data-rep="flags"]', t.content).forEach(function (e) { const fl = ctx.flags || []; if (!fl.length) { e.remove(); return; } fl.forEach(function (f) { const c = e.cloneNode(true); c.removeAttribute('data-rep'); c.innerHTML = c.innerHTML.replace('{{f}}', esc(f)); e.parentNode.insertBefore(c, e); }); e.remove(); });
  return interp(t.innerHTML, ctx);
}

// ---------- fragmen halaman ----------
const Frag = { html: {}, tpl: {}, pend: {} };
const KEYS = ['w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w07', 'w08', 'w09', 'w10', 'w11', 'w12', 'w13', 'w14'];
function loadFrag(k) {
  if (Frag.html[k] !== undefined) return Promise.resolve();
  return Frag.pend[k] || (Frag.pend[k] = Promise.all([fetch('pages/' + k + '.html').then(function (r) { return r.text(); }), fetch('pages/' + k + '.tpl.json').then(function (r) { return r.json(); })]).then(function (a) { Frag.html[k] = a[0]; Frag.tpl[k] = a[1]; }));
}
function prefetchAll() { const go = function () { KEYS.forEach(function (k, i) { setTimeout(function () { loadFrag(k); }, i * 120); }); }; (window.requestIdleCallback || setTimeout)(go, 1500); }
function shellCtx() {
  const b = S.boot || {}, u = (b.units || []).filter(function (x) { return x.unit_id === S.unit; })[0] || (b.units || [])[0] || { nama: '-' };
  return { me: { nama: (S.me && S.me.nama) || '', peranLabel: PERAN[S.me && S.me.peran] || '' }, sesi: b.sesi || {}, set: b.set || {}, unit: u, rs: { unit: window.CONFIG.RS_UNIT }, tl_terbuka: b.tl_terbuka || 0, now: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':') };
}
function mount(k, extra) {                                              // render fragmen + konteks → #app
  const raw = Frag.html[k], m = raw.match(/^<!--bodyclass:(.*?)-->/); document.body.className = m ? m[1] : '';
  const ctx = Object.assign(shellCtx(), extra || {}); document.body.removeAttribute('data-wm');
  $('#app').innerHTML = interp(raw.replace(/^<!--bodyclass:.*?-->/, ''), ctx);
  applyShell(); window.scrollTo(0, 0);
}
function applyShell() {
  const role = S.me && S.me.peran;
  $$('aside a, nav a, header a').forEach(function (a) {
    const t = (a.getAttribute('data-nav') || '').toLowerCase(); let r = '';
    if (/pasien|handover$/.test(t) && !/serah/.test(t)) r = 'patients'; if (/serah|handover/.test(t) && /serah/.test(t)) r = 'handover'; if (/impor census|^impor/.test(t)) r = 'import'; if (/riwayat impor/.test(t)) r = 'history';
    if (/tindak lanjut|tugas/.test(t)) r = 'followups'; if (/dashboard/.test(t)) r = 'dashboard'; if (/pengguna|hak akses/.test(t)) r = 'users'; if (/master ward|ward & sesi|ward/.test(t) && !/pasien/.test(t)) r = 'ward';
    if (/audit/.test(t)) r = 'audit'; if (/keamanan|retensi/.test(t)) r = 'security'; if (/^menu|admin/.test(t)) r = r || 'dashboard'; if (/pasien & handover|^pasien/.test(t)) r = 'patients';
    if (r) { a.setAttribute('data-route', r); a.setAttribute('href', '#/' + r); }
    if (r === 'import' && role === 'viewer') a.style.display = 'none';
    if (['users', 'ward', 'audit', 'security'].indexOf(r) > -1 && role !== 'superadmin') a.style.display = 'none';
    if (r === 'dashboard' && !(role === 'superadmin' || role === 'manajemen')) a.style.display = 'none';
  });
  $$('button, a').forEach(function (b) { const t = b.textContent.toLowerCase(); if (/keluar sesi|^\s*logout|keluar$/.test(t.trim()) && !b.dataset.lo) { b.dataset.lo = 1; b.addEventListener('click', function (e) { e.preventDefault(); logout(); }); } });
}

// ---------- sesi & login ----------
function mulai(boot, token, me) { API.setToken(token); S.boot = boot; S.me = boot.me; API.Store.set('boot', boot); S.unit = sessionStorage.getItem('unit') || ((boot.units || [])[0] || {}).unit_id || ''; resetIdle(); API.warm(); prefetchAll(); }
async function logout(semua) { try { await API.call('auth.logout', { semua: !!semua }); } catch (e) {} API.setToken(''); API.Store.del('boot'); API.Store.clearData(); S.me = null; S.boot = null; stopIdle(); go('login'); }
window.addEventListener('sesi-habis', function () { if (S.me) { toast('Sesi berakhir. Silakan masuk kembali.', 'warn'); API.setToken(''); S.me = null; go('login'); } });
let gsiReady = false, gsiHandler = null;
function initGsi(clientId) {
  const tries = function () {
    if (!(window.google && google.accounts && google.accounts.id)) return setTimeout(tries, 200);
    google.accounts.id.initialize({ client_id: clientId, callback: function (r) { if (gsiHandler) gsiHandler(r.credential); }, ux_mode: 'popup', auto_select: false, use_fedcm_for_prompt: true });
    let h = $('#gsi-hidden'); if (!h) { h = document.createElement('div'); h.id = 'gsi-hidden'; h.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(h); }
    h.innerHTML = ''; google.accounts.id.renderButton(h, { type: 'standard', theme: 'outline', size: 'large' }); gsiReady = true;
  }; tries();
}
function triggerGoogle() { const b = $('#gsi-hidden [role=button]') || $('#gsi-hidden div[tabindex]'); if (b) b.click(); else if (window.google) google.accounts.id.prompt(); }
async function viewLogin(denied) {
  await loadFrag('w01'); mount('w01', { email: denied || '', waktu: new Date().toISOString().replace('T', ' ').slice(0, 19), logref: Math.random().toString(36).slice(2, 8).toUpperCase() });
  const a = $('[data-state=login]'), d = $('[data-state=denied]'); if (a) a.style.display = denied ? 'none' : ''; if (d) d.style.display = denied ? '' : 'none';
  const cfg = await API.call('auth.config'); const cid = cfg.success && cfg.data.googleClientId;
  $$('[id^=pin-]').forEach(function (i) { i.addEventListener('focus', function () { toast('Login PIN bersama dinonaktifkan demi keamanan. Gunakan akun Google RS.', 'warn'); i.blur(); }); });
  const pb = $('#btn-pin'); if (pb) pb.addEventListener('click', function (e) { e.preventDefault(); toast('Login PIN dinonaktifkan. Gunakan akun Google RS.', 'warn'); });
  [$('#btn-kembali'), $('#btn-ganti')].forEach(function (b) { if (b) b.addEventListener('click', function (e) { e.preventDefault(); viewLogin(); }); });
  const gb = $('#btn-google') || $('#btn-ganti');
  if (!cid) { toast('GOOGLE_CLIENT_ID belum diisi di backend. Hubungi Admin (lihat panduan).', 'err'); return; }
  initGsi(cid);
  gsiHandler = async function (idToken) {
    const btn = $('#btn-google'); busy(btn, true, 'Memeriksa akun…');
    const r = await API.call('auth.google', { idToken: idToken }, { timeout: 40000 });
    busy(btn, false);
    if (!r.success) { if (r.data && r.data.code === 'NOT_REGISTERED') return viewLogin(r.data.email || 'akun Anda'); return toast(r.message, 'err'); }
    mulai(r.data.boot, r.data.token); go('patients');
  };
  if (gb && gb.id === 'btn-google') gb.addEventListener('click', function (e) { e.preventDefault(); triggerGoogle(); });
}
function viewDarurat() {
  document.body.className = 'bg-surface text-on-surface';
  $('#app').innerHTML = '<div class="min-h-screen flex items-center justify-center p-4"><div class="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg p-6 space-y-3"><img src="assets/siloam.png" class="h-9" alt="Siloam"/><h2 class="font-bold text-lg text-primary">Akses Darurat Admin</h2><p class="text-sm text-on-surface-variant">Hanya bila login Google tidak dapat dipakai. Setiap pemakaian tercatat.</p><input id="d-u" class="w-full border border-outline-variant rounded px-3 py-2" placeholder="Nama pengguna" autocomplete="off"/><input id="d-p" type="password" class="w-full border border-outline-variant rounded px-3 py-2" placeholder="Kata sandi" autocomplete="off"/><button id="d-go" class="w-full bg-primary text-on-primary rounded py-2 font-bold">Masuk</button><a href="#/login" class="block text-center text-sm text-primary">Kembali</a></div></div>';
  $('#d-go').onclick = async function () { const r = await API.call('auth.darurat', { username: $('#d-u').value, password: $('#d-p').value }); if (!r.success) return toast(r.message, 'err'); $('#d-p').value = ''; mulai(r.data.boot, r.data.token); go('patients'); };
}
// auto-lock (butuh login Google ulang)
let idleT = null;
function resetIdle() { clearTimeout(idleT); if (!S.me) return; const m = Number(((S.boot || {}).set || {}).autolock || 2); idleT = setTimeout(kunci, m * 60000); }
function stopIdle() { clearTimeout(idleT); }
['click', 'keydown', 'touchstart', 'mousemove'].forEach(function (ev) { document.addEventListener(ev, function () { if (S.me && !document.getElementById('lock')) resetIdle(); }, { passive: true }); });
function kunci() {
  if (!S.me || $('#lock')) return; const o = document.createElement('div'); o.id = 'lock'; o.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(10,42,128,.92);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:16px';
  o.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px;max-width:360px;text-align:center"><img src="assets/siloam.png" style="height:34px;margin:0 auto 12px" alt=""/><h3 style="font-weight:700;color:#0A2A80;font-size:18px">Layar terkunci</h3><p style="font-size:13px;color:#444653;margin:8px 0 16px">Data pasien disembunyikan karena tidak ada aktivitas. Masuk kembali dengan akun Google untuk melanjutkan.</p><button id="lk-go" style="background:#0A2A80;color:#fff;border-radius:8px;padding:10px 18px;font-weight:700;width:100%">Masuk kembali</button><button id="lk-out" style="margin-top:8px;font-size:13px;color:#0A2A80">Keluar</button></div>';
  document.body.appendChild(o); $('#app').style.visibility = 'hidden';
  gsiHandler = async function (idToken) { const r = await API.call('auth.google', { idToken: idToken }); if (r.success && r.data.boot.me.email === S.me.email) { API.setToken(r.data.token); o.remove(); $('#app').style.visibility = ''; resetIdle(); } else { o.remove(); $('#app').style.visibility = ''; logout(); } };
  $('#lk-go').onclick = function () { gsiReady ? triggerGoogle() : API.call('auth.config').then(function (c) { initGsi(c.data.googleClientId); setTimeout(triggerGoogle, 800); }); }; $('#lk-out').onclick = function () { o.remove(); $('#app').style.visibility = ''; logout(); };
}

// ---------- router ----------
function go(r) { location.hash = '#/' + r; }
async function route() {
  const h = (location.hash || '#/').replace(/^#\/?/, ''), parts = h.split('/'), name = parts[0] || '';
  if (name === 'darurat') return viewDarurat();
  if (!API.token() || !S.me) {
    if (API.token()) { const b = API.Store.get('boot'); if (b) { S.boot = b; S.me = b.me; S.unit = sessionStorage.getItem('unit') || ((b.units || [])[0] || {}).unit_id || ''; resetIdle(); } }
    if (!S.me) return name === 'login' ? viewLogin() : go('login');
  }
  if (name === 'login' || !name) return go('patients');
  S.cur = name;
  const V = { patients: viewPatients, patient: viewPatient, soap: viewSoap, handover: viewHandover, import: viewImport, followups: viewFollowups, followup: viewFollowup, history: viewHistory, dashboard: viewDash, users: viewUsers, ward: viewWard, audit: viewAudit, security: viewSecurity };
  const f = V[name] || viewPatients; try { await f(parts[1] ? decodeURIComponent(parts[1]) : ''); } catch (e) { console.error(e); toast('Terjadi kesalahan tampilan: ' + e.message, 'err'); }
}
window.addEventListener('hashchange', route);
document.addEventListener('click', function (e) {
  const a = e.target.closest('a[data-route]'); if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); }
});
function viewStatic(k) { return async function () { await loadFrag(k); mount(k); }; }
async function refreshBoot() { const r = await API.call('boot'); if (r.success) { S.boot = r.data; S.me = r.data.me; API.Store.set('boot', r.data); } }

// ---------- DAFTAR PASIEN (W-02) ----------
function ctxKartu(p) {
  const base = { adm: p.admission_no, bed: p.bed_tampil || p.bed, inisial: p.inisial, mr: p.mr, umur: p.umur, sex: p.sex, payer: p.payer, av: av(p.inisial), dpjp: p.dpjp, los: p.los, masuk: tglPendek(p.tgl_masuk), dx: p.diagnosis || 'Belum diisi di EMR', flags: p.flags, pindah: p.pindah, stlabel: p.status === 'Terbarui' ? 'Terbarui (' + jam(p.updated_at) + ')' : p.status };
  const sb = p.sbar || {}; base.s = sb.s || '-'; base.b = sb.b || '-'; base.a = sb.a || '-'; base.r = sb.r || '-';
  base.signoff = 'Sign-off: ' + jam(p.updated_at) + ' WIB oleh ' + (p.penulis || '-'); base.jam_upd = jam(p.updated_at);
  const stl = (S.boot.set || {}).stale_jam || 8; base.stale_txt = p.updated_at ? 'Catatan SBAR belum diperbarui sejak ' + tglPendek(p.updated_at) + '.' : 'Belum ada catatan SBAR untuk pasien ini.'; base.delta = p.umur_jam >= 9000 ? 'belum pernah diisi' : Math.floor(p.umur_jam) + ' Jam ' + Math.round((p.umur_jam % 1) * 60) + ' Menit';
  base.flaglabel = p.baru ? 'Pasien Baru' : 'Draft'; return base;
}
function pickTpl(p) { return p.status === 'Terbarui' ? 'card_a' : (p.status === 'Draft' || (p.status === 'Belum ada' && p.baru)) ? 'card_c' : 'card_b'; }
async function viewPatients() {
  await loadFrag('w02'); const T = Frag.tpl.w02; if (!S.unit) S.unit = ((S.boot.units || [])[0] || {}).unit_id || '';
  const draw = function (d) {
    const units = S.boot.units || [], un = units.filter(function (u) { return u.unit_id === S.unit; })[0] || { nama: '-', kapasitas: 0 };
    const list = d ? d.pasien : [], ci = d ? d.census : (S.boot.census || {});
    mount('w02', { unit: un, census: { aktif: ci.aktif || 0, jam: ci.terakhir ? jam(ci.terakhir) : '-', oleh: ci.oleh ? penumap(ci.oleh) : '-' }, tl: { total: d ? d.tl.total : 0 } });
    const sesi = S.boot.sesi || {}, mulaiS = sesi.tanggal ? new Date(sesi.tanggal + 'T' + sesi.sesi + ':00') : null, menit = mulaiS ? (mulaiS - Date.now()) / 60000 : 999;
    const basi = ci.menit_lalu == null || ci.menit_lalu > 600 || (menit >= 0 && menit <= 15 && ci.menit_lalu > (S.boot.set.offset_impor || 30) + 5);
    hide($('#census-success-bar')); hide($('#census-warning-bar')); $('#census-success-bar').classList.toggle('hidden', basi); $('#census-warning-bar').classList.toggle('hidden', !basi);
    $('#census-warning-bar').classList.toggle('flex', basi); $('#census-success-bar').classList.toggle('flex', !basi);
    // banner TL
    const tls = d ? d.tl.items : [], ban = $('#morning-report-banner'); if (ban) { ban.style.display = tls.length ? '' : 'none'; const g = $('[data-slot=tl-items]'); if (g) g.innerHTML = tls.slice(0, 3).map(function (t, i) { return interp(T.tl_item, { n: i + 1, isi: String(t.isi).slice(0, 70), sub: (t.pj || 'PJ: -') + ' · ' + (t.tenggat ? 'Tenggat ' + jam(t.tenggat) : 'tanpa tenggat') }); }).join(''); }
    // tab unit
    const tb = $('[data-slot=tabs]'); if (tb) { tb.innerHTML = units.map(function (u) { return interp(u.unit_id === S.unit ? T.tab_on : T.tab_off, { nama: u.nama, n: u.n || 0 }).replace('<button', '<button data-unit="' + esc(u.unit_id) + '"'); }).join(''); $$('[data-unit]', tb).forEach(function (b) { b.addEventListener('click', function () { S.unit = b.dataset.unit; sessionStorage.setItem('unit', S.unit); viewPatients(); }); }); }
    // filter select
    const sels = $$('main select'); if (sels[0]) { const ds = Array.from(new Set(list.map(function (p) { return p.dpjp; }).filter(Boolean))).sort(); sels[0].innerHTML = '<option value="">Semua DPJP</option>' + ds.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); }
    if (sels[1]) sels[1].innerHTML = '<option value="">Semua Lama Rawat</option><option value="1">Hari ke-1</option><option value="2">Hari 2-3</option><option value="4">Hari ≥ 4</option>';
    const cap = list.length; const capEl = $$('main span').filter(function (s) { return /Kapasitas Bangsal/.test(s.textContent); })[0]; if (capEl) { const k = un.kapasitas || 0; capEl.textContent = 'Kapasitas Bangsal: ' + cap + '/' + k + ' Terisi' + (k ? ' (' + Math.round(cap / k * 100) + '%)' : ''); }
    const ren = function () {
      const q = ($('#patient-search').value || '').toLowerCase(), dp = sels[0] ? sels[0].value : '', lo = sels[1] ? sels[1].value : '', st = $('#stale-toggle').checked;
      const f = list.filter(function (p) { return (!q || (p.inisial + p.mr + p.bed + p.dpjp + p.admission_no).toLowerCase().indexOf(q) > -1) && (!dp || p.dpjp === dp) && (!lo || (lo === '1' ? p.los === 1 : lo === '2' ? p.los >= 2 && p.los <= 3 : p.los >= 4)) && (!st || p.status === 'Stale' || p.status === 'Belum ada'); });
      const box = $('[data-slot=cards]'); box.innerHTML = f.length ? f.map(function (p) { return tpl(T[pickTpl(p)], ctxKartu(p)); }).join('') : '<div class="p-8 text-center text-on-surface-variant">' + (list.length ? 'Tidak ada pasien yang cocok dengan filter.' : 'Belum ada pasien aktif. Impor census EMR terlebih dahulu.') + '</div>';
      $$('main span, main p').forEach(function (x) { if (/^Menampilkan \d+ dari/.test(x.textContent) || /^Menampilkan\s+\{/.test(x.textContent)) x.textContent = 'Menampilkan ' + f.length + ' dari ' + list.length + ' pasien di bangsal ' + un.nama; if (/Pasien Stale/.test(x.textContent) && /Baru/.test(x.textContent)) x.textContent = '· ' + list.filter(function (p) { return p.status === 'Stale'; }).length + ' Pasien Stale · ' + list.filter(function (p) { return p.baru; }).length + ' Pasien Baru'; if (/Pasien Siap Estafet/.test(x.textContent)) x.textContent = list.length + ' Pasien Siap Estafet Dinas'; });
      $$('[data-act=open]', box).forEach(function (b) { b.addEventListener('click', function () { go('patient/' + encodeURIComponent(b.closest('article').dataset.adm)); }); });
      $$('[data-act=dx]', box).forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); const p = list.filter(function (x) { return x.admission_no === b.closest('article').dataset.adm; })[0]; toast(p.diagnosis || 'Diagnosis belum diisi di EMR'); }); });
      $$('article', box).forEach(function (a) { a.style.cursor = 'pointer'; a.addEventListener('dblclick', function () { go('patient/' + encodeURIComponent(a.dataset.adm)); }); });
    };
    ren(); ['input', 'change'].forEach(function (ev) { $('#patient-search').addEventListener(ev, ren); $('#stale-toggle').addEventListener(ev, ren); sels.forEach(function (s) { s.addEventListener(ev, ren); }); });
    const bi = $('#btn-impor'); if (bi) bi.addEventListener('click', function () { go('import'); });
    const ba = $('#btn-ack'); if (ba) ba.addEventListener('click', async function () { busy(ba, true); const r = await API.call('tl.ack', { unit_id: S.unit }, { write: true }); busy(ba, false); toast(r.message, r.success ? '' : 'err'); API.Store.del('c:pasien:' + S.unit); viewPatients(); });
    $$('[data-act=serahterima]').forEach(function (b) { b.addEventListener('click', function () { go('handover'); }); });
    $$('[data-act=tl]').forEach(function (b) { b.addEventListener('click', function () { go('followups'); }); });
    $$('[data-act=cetak]').forEach(function (b) { b.addEventListener('click', function () { cetak(); }); });
    $$('[data-act=pdf]').forEach(function (b) { b.addEventListener('click', function () { pdfUnit(b); }); });
  };
  draw(null);
  API.swr('pasien:' + S.unit, 'pasien.list', { unit_id: S.unit }, function (d, fromCache, err) { if (d) { if (S.cur === 'patients') draw(d); } else if (err) toast(err.message, 'err'); }, 15000);
}
function penumap(email) { return email && email.indexOf('@') > -1 ? email.split('@')[0] : email; }
function cetak() { document.body.setAttribute('data-wm', ((S.me && S.me.nama) || '') + '\n' + new Date().toLocaleString('id-ID') + ' WIB\nRAHASIA'); API.call('st.cetak', { unit_id: S.unit }); setTimeout(function () { window.print(); }, 100); }
async function pdfUnit(btn) { busy(btn, true); const r = await API.call('doc.handover', { unit_id: S.unit }, { timeout: 60000 }); busy(btn, false); if (!r.success) return toast(r.message, 'err'); toBlobDownload(r.data.pdf_base64, r.data.nama); toast('PDF dibuat di memori & diunduh. Tidak ada file disimpan di Drive.'); }

// ---------- KARTU HANDOVER (W-03) ----------
async function viewPatient(adm) {
  if (!adm) return go('patients'); await loadFrag('w03'); const T = Frag.tpl.w03;
  const r = await API.call('handover.get', { admission_no: adm }); if (!r.success) { toast(r.message, 'err'); return go('patients'); }
  const d = r.data, p = d.pasien, h = d.handover || { situation: '', background: '', assessment: '', recommendation: '', flags: [], todo: [], status: 'Draft' }, tl = (d.tl || [])[0] || null;
  const ctx = { p: { ward: p.ward, inisial: p.inisial, mr: p.mr, av: av(p.inisial), dpjp: p.dpjp, masuk: tglPendek(p.tgl_masuk), los: p.los, umur: p.umur, sexlabel: p.sex === 'L' ? 'Laki-laki' : p.sex === 'P' ? 'Perempuan' : '-', bed: p.bed_tampil, payer: p.payer, dx: p.diagnosis || 'Belum diisi di EMR' }, v: d.vitals, prio: (h.flags || []).length ? 'Prioritas: Perhatian Khusus' : 'Prioritas: Rutin',
    carry_txt: h.carried ? 'Catatan dibawa dari sesi ' + h.carried_from + '. Perbarui bagian yang berubah lalu finalkan.' : 'Catatan sesi berjalan.', todo: { n: (h.todo || []).length }, tl: tl ? { tl_id: tl.tl_id, isi: tl.isi, unit: tl.unit, status: tl.status, pj: tl.pj || '-', tenggat: tl.tenggat ? tglPendek(tl.tenggat) : '-' } : {}, upd: h.updated_at ? jam(h.updated_at) : '-', penulis: h.penulis ? penumap(h.penulis) : '-', h: { status: h.status === 'Final' ? 'Siap Diserahkan' : 'Draft' }, id_rekaman: d.id_rekaman };
  mount('w03', ctx); const tb = $('[data-if=tl]'); if (!tl && tb) tb.style.display = 'none';
  $('#sbar-situation').value = h.situation || ''; $('#sbar-background').value = h.background || ''; $('#sbar-assessment').value = h.assessment || ''; $('#sbar-recommendation').value = h.recommendation || '';
  const flagSet = {}; (h.flags || []).forEach(function (f) { flagSet[f] = 1; }); $$('[data-flag]').forEach(function (l) { const c = l.querySelector('input'); if (c) c.checked = !!flagSet[l.getAttribute('data-flag')]; });
  let todo = (h.todo || []).slice();
  const drawTodo = function () { const box = $('[data-slot=todo]'); box.innerHTML = todo.map(function (t, i) { return interp(T.todo, { t: t.t, tag: t.tag || '' }).replace('<', '<').replace(/^(\s*<\w+)/, '$1 data-i="' + i + '"'); }).join(''); $$('[data-i]', box).forEach(function (e) { const c = e.querySelector('input[type=checkbox]'); if (c) { c.checked = !!todo[+e.dataset.i].done; c.addEventListener('change', function () { todo[+e.dataset.i].done = c.checked; }); } }); const n = $$('main span').filter(function (s) { return /Butir Aktif/.test(s.textContent); })[0]; if (n) n.textContent = todo.length + ' Butir Aktif'; };
  drawTodo(); const ba = $('#btn-add-todo'); if (ba) ba.addEventListener('click', function () { const t = prompt('Tugas untuk sesi berikutnya:'); if (t && t.trim()) { todo.push({ t: t.trim().slice(0, 200), done: false, tag: '' }); drawTodo(); } });
  const body = function (final) { return { admission_no: adm, situation: $('#sbar-situation').value, background: $('#sbar-background').value, assessment: $('#sbar-assessment').value, recommendation: $('#sbar-recommendation').value, flags: $$('[data-flag]').filter(function (l) { return l.querySelector('input').checked; }).map(function (l) { return l.getAttribute('data-flag'); }), todo: todo, final: final }; };
  const simpan = async function (btn, final) { busy(btn, true); const x = await API.call('handover.save', body(final), { write: true }); busy(btn, false); if (!x.success) return toast(x.message, 'err'); toast(x.message); API.Store.clearData(); if (final) go('patients'); };
  $('#btn-save-draft').addEventListener('click', function () { simpan(this, false); }); $('#btn-finalize').addEventListener('click', function () { simpan(this, true); });
  $('#btn-paste-soap').addEventListener('click', function () { go('soap/' + encodeURIComponent(adm)); });
  const cp = $('#btn-copy-reset'); if (cp) cp.addEventListener('click', function () { toast(h.carried ? 'Isi sudah disalin dari sesi sebelumnya. Edit bagian yang berubah.' : 'Kartu sesi ini sudah berisi catatan Anda.'); });
  const ta = $('#btn-toggle-all-sbar'); if (ta) ta.addEventListener('click', function () { $$('textarea').forEach(function (t) { t.style.display = t.style.display === 'none' ? '' : 'none'; }); });
  const sa = $('#btn-show-audit'); if (sa) sa.addEventListener('click', function () { toast((d.lokasi || []).length ? d.lokasi.map(function (l) { return l.dari + ' → ' + l.ke; }).join(' | ') : 'Belum ada perpindahan kamar tercatat.'); });
  const rv = $('#btn-reveal-name'), mo = $('#modal-reveal-confirm'); let timer = null;
  if (rv) rv.addEventListener('click', function () { show(mo); }); $('#btn-modal-cancel').addEventListener('click', function () { hide(mo); });
  $('#btn-modal-confirm').addEventListener('click', async function () { const x = await API.call('pasien.reveal', { admission_no: adm }); hide(mo); if (!x.success) return toast(x.message, 'err'); const el = $('#patient-identity-display'); el.textContent = x.data.nama; clearTimeout(timer); timer = setTimeout(function () { el.textContent = p.inisial; }, 30000); toast('Nama lengkap ditampilkan 30 detik & tercatat di audit log.', 'warn'); });
  $$('[data-act=opentl]').forEach(function (b) { b.addEventListener('click', function () { go('followup/' + encodeURIComponent(tl.tl_id)); }); });
  $$('[data-act=back]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); go('patients'); }); });
}

// ---------- TEMPEL SOAP (W-04) ----------
const SOAP_CONTOH = 'S: Pasien mengeluh mual berkurang, nyeri ulu hati skala 2/10.\nO: TD 120/80 mmHg, HR 82x/menit, RR 18x/menit, Suhu 36.8, SpO2 98%.\nA: Dispepsia, perbaikan klinis.\nP: Lanjut terapi, cek elektrolit besok pagi.';
async function viewSoap(adm) {
  if (!adm) return go('patients'); await loadFrag('w04');
  const r = await API.call('pasien.list', { unit_id: '' }); const p = r.success ? r.data.pasien.filter(function (x) { return x.admission_no === adm; })[0] : null; if (!p) { toast('Pasien tidak ditemukan.', 'err'); return go('patients'); }
  mount('w04', { p: { inisial: p.inisial, bed: p.bed_tampil, mr: p.mr, dpjp: p.dpjp, dx: p.diagnosis } });
  const raw = $('#rawSoapInput'); let last = null;
  const parse = async function () { const x = await API.call('soap.parse', { teks: raw.value, admission_no: adm }); if (!x.success) return toast(x.message, 'err'); last = x.data; $('#parsedS').value = x.data.s; $('#parsedO').value = x.data.o; $('#parsedA').value = x.data.a; $('#parsedP').value = x.data.p; if (!x.data.dikenali && raw.value.trim()) toast('Penanda S/O/A/P tidak dikenali — seluruh teks dimasukkan ke S. Pilah manual.', 'warn'); };
  const cnt = function () { const c = $('#charLineCount'); if (c) c.textContent = raw.value.length + ' karakter · ' + (raw.value ? raw.value.split('\n').length : 0) + ' baris'; }; cnt();
  let tmo; raw.addEventListener('input', function () { cnt(); if ($('#autoMapToggle') && $('#autoMapToggle').checked) { clearTimeout(tmo); tmo = setTimeout(parse, 500); } });
  $('#btnReparse').addEventListener('click', parse); $('#btnClearInput').addEventListener('click', function () { raw.value = ''; ['S', 'O', 'A', 'P'].forEach(function (k) { $('#parsed' + k).value = ''; }); cnt(); });
  $('#btnLoadSample').addEventListener('click', function () { raw.value = SOAP_CONTOH; cnt(); parse(); });
  const mo = $('#modalSbarPreview');
  const terapkan = async function (btn) { await parse(); busy(btn, true); const x = await API.call('soap.apply', { admission_no: adm, teks: raw.value, s: $('#parsedS').value, o: $('#parsedO').value, a: $('#parsedA').value, p: $('#parsedP').value, sbar: last && last.sbar }, { write: true }); busy(btn, false); if (!x.success) return toast(x.message, 'err'); toast(x.message); API.Store.clearData(); go('patient/' + encodeURIComponent(adm)); };
  [$('#btnPreviewModal')].forEach(function (b) { if (b) b.addEventListener('click', async function () { await parse(); const sb = (last && last.sbar) || {}; const m = { s: sb.situation, b: sb.background, a: sb.assessment, r: sb.recommendation }; $$('[data-sb]').forEach(function (e) { e.textContent = m[e.dataset.sb] || '-'; }); show(mo); }); });
  [$('#btnClosePreview'), $('#btnCancelModal')].forEach(function (b) { if (b) b.addEventListener('click', function () { hide(mo); }); });
  $('#btnApplySbar').addEventListener('click', function () { terapkan(this); }); $('#btnConfirmApply').addEventListener('click', function () { hide(mo); terapkan(this); });
  $$('[data-act=back]').forEach(function (b) { b.addEventListener('click', function () { go('patient/' + encodeURIComponent(adm)); }); });
}

// ---------- SERAH TERIMA (W-05) ----------
async function viewHandover() {
  await loadFrag('w05'); const T = Frag.tpl.w05; if (!S.unit) S.unit = ((S.boot.units || [])[0] || {}).unit_id || '';
  const r = await API.call('st.get', { unit_id: S.unit }); if (!r.success) return toast(r.message, 'err'); const d = r.data;
  const ack = d.tl.items.filter(function (t) { return t.ack; }).length;
  mount('w05', { sesi: d.sesi, st: { dari: d.diserahkan_oleh || '-', status_txt: d.status === 'Diterima' ? 'Diterima oleh ' + penumap(d.diterima_oleh) : 'Menunggu Penerimaan Sesi ' + d.sesi.sesi, sesi_jam: d.sesi.sesi, bor: d.bor, watermark: d.watermark, kode: d.kode_lembar }, r: d.ringkas, tl: { total: d.tl.total, ack: ack } });
  const box = $('[data-slot=tl-labels]'); box.innerHTML = d.tl.items.length ? d.tl.items.map(function (t, i) { return interp(T.tl_label, { no: i + 1, isi: t.isi, detail: 'PJ: ' + (t.pj || '-') + ' · ' + (t.tenggat ? 'Tenggat ' + tglPendek(t.tenggat) : 'tanpa tenggat') + ' · ' + t.unit, acktxt: t.ack ? 'Sudah dibaca sesi ini' : 'Belum dibaca', tl_id: t.tl_id }); }).join('') : '<p class="text-on-surface-variant p-3">Tidak ada tindak lanjut terbuka untuk unit ini.</p>';
  const btn = $('#btn-terima-handover'), cek = $$('input[data-tl]', box); const sync = function () { const n = cek.filter(function (c) { return c.checked; }).length; const c = $('#ack-counter'); if (c) c.textContent = n + ' dari ' + cek.length + ' Instruksi Dikonfirmasi'; btn.disabled = d.status === 'Diterima' || n < cek.length; btn.style.opacity = btn.disabled ? '.5' : ''; };
  cek.forEach(function (c, i) { c.checked = d.tl.items[i].ack; c.addEventListener('change', async function () { if (c.checked) { const x = await API.call('tl.ack', { tl_ids: [d.tl.items[i].tl_id] }, { write: true }); if (!x.success) { c.checked = false; toast(x.message, 'err'); } } sync(); }); }); sync();
  const mk = function (list) { return list.map(function (p) { return tpl(T.st_card, { bed: p.bed_tampil, inisial: p.inisial, mr: p.mr, sex: p.sex, umur: p.umur, dpjp: p.dpjp, flags: p.flags, dx: p.diagnosis || 'Belum diisi di EMR', sbar: p.sbar ? [p.sbar.s, p.sbar.a, p.sbar.r].filter(Boolean).join(' · ').slice(0, 220) : 'Belum ada catatan SBAR.' }); }).join(''); };
  const baru = d.pasien.filter(function (p) { return p.baru; }), pindah = d.pasien.filter(function (p) { return p.pindah && !p.baru; }), lain = d.pasien.filter(function (p) { return !p.baru && !p.pindah; });
  const gb = $('[data-slot=grid-baru]'), gp = $('[data-slot=grid-pindah]'); if (gb) { gb.innerHTML = mk(baru); if (!baru.length && gb.parentElement) gb.parentElement.style.display = 'none'; } if (gp) { gp.innerHTML = mk(pindah); if (!pindah.length && gp.parentElement) gp.parentElement.style.display = 'none'; }
  const rl = $('[data-slot=rows-lain]'); if (rl && T.st_row) rl.innerHTML = lain.map(function (p) { return interp(T.st_row, { bed: p.bed_tampil, inisial: p.inisial, umur: p.umur, mr: 'MR ' + p.mr, dpjp: p.dpjp, dx: p.diagnosis || '-', sbar: p.sbar ? (p.sbar.r || p.sbar.s || '-').slice(0, 120) : '-', ket: p.los ? 'Hari ke-' + p.los : '-', st: p.status }); }).join('');
  btn.addEventListener('click', async function () { busy(btn, true); const x = await API.call('st.terima', { unit_id: S.unit, diserahkan_oleh: d.diserahkan_oleh }, { write: true }); busy(btn, false); if (!x.success) return toast(x.message, x.data && x.data.code === 'ACK' ? 'warn' : 'err'); toast(x.message); API.Store.clearData(); refreshBoot(); go('patients'); });
  $$('[data-act=cetak]').forEach(function (b) { b.addEventListener('click', cetak); }); $$('[data-act=pdf]').forEach(function (b) { b.addEventListener('click', function () { pdfUnit(b); }); });
}

// ---------- IMPOR CENSUS (W-06) ----------
const KOLOM_PAKAI = ['Ward', 'Room', 'Bed', 'BedType', 'MR No', 'Name', 'Diagnosis', 'BirthDate', 'Sex', 'Payer', 'Primary Doctor', 'Admission No', 'Admission Date'];
function loadXlsx() { return window.XLSX ? Promise.resolve() : new Promise(function (ok, no) { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = function () { no(new Error('Pustaka Excel gagal dimuat')); }; document.head.appendChild(s); }); }
async function viewImport() {
  if (S.me.peran === 'viewer' || (S.me.peran === 'klinisi' && !S.me.boleh_impor)) { toast('Anda tidak memiliki izin impor census.', 'err'); return go('patients'); }
  await loadFrag('w06'); const T = Frag.tpl.w06, st = { rows: null, prev: null, file: { nama: 'Belum ada file — klik untuk memilih .xlsx', size: '-', sheet: '-', jam: '-' }, filter: 'all' };
  const ctxNow = function () { const p = st.prev || { total: 0, baru: 0, diperbarui: 0, pindah: 0, akan_diarsipkan: 0, ditolak: 0, aktif_sebelumnya: 0, turun_persen: 0 }; const hdr = st.rows ? Object.keys(st.rows[0] || {}) : []; const ok = hdr.filter(function (h) { return ['Ward', 'Room', 'Bed', 'BedType', 'Invoice Class', 'MR No', 'Name', 'Diagnosis', 'BirthDate', 'Age', 'Sex', 'Religion', 'Patient Type', 'Payer', 'Primary Doctor', 'Referral Doctor', 'Admission No', 'Admission Date', 'Adm. Days'].indexOf(h) > -1; }).length;
    return { sesi: S.boot.sesi, set: S.boot.set, sisa: 'Sesi ' + S.boot.sesi.sesi, f: st.file, prev: { ringkas: st.prev ? st.prev.total + ' pasien terbaca' : 'Menunggu file' }, kol: { ok: ok, lain: Math.max(0, hdr.length - KOLOM_PAKAI.length) }, g: { baru_total: p.baru, persen: p.turun_persen, lama: p.aktif_sebelumnya, hilang: p.akan_diarsipkan }, c: { baru: p.baru, upd: p.diperbarui, pindah: p.pindah, hilang: p.akan_diarsipkan, ditolak: p.ditolak, total: p.total }, shown: Math.min(200, (p.sampel || []).length), now: new Date().toLocaleString('id-ID') }; };
  const draw = function () {
    mount('w06', ctxNow()); const gb = $('#guardrail-detail-box'), gp = gb && gb.closest('[class*=border]'); if (gb) gb.classList.add('hidden'); if (st.prev && st.prev.guard) { const w = $$('main div').filter(function (d) { return /Guardrail|Penurunan/i.test(d.textContent.slice(0, 80)); })[0]; }
    const rows = $('[data-slot=rows]'), sm = st.prev ? st.prev.sampel : [], f = sm.filter(function (x) { return st.filter === 'all' || (st.filter === 'new' && x.perubahan === 'Baru') || (st.filter === 'transfer' && x.perubahan === 'Pindah') || (st.filter === 'missing' && x.perubahan === 'Missing'); }).slice(0, 200);
    rows.innerHTML = f.map(function (x) { const k = x.perubahan === 'Baru' ? 'row_baru' : x.perubahan === 'Pindah' ? 'row_pindah' : 'row_tetap'; return interp(T[k], { adm: x.adm, mr: x.mr, inisial: x.inisial, umur: x.umur, sexl: x.sex === 'L' ? 'Laki-laki' : x.sex === 'P' ? 'Perempuan' : '-', bed: x.bed, dari: x.dari, dpjp: x.dpjp, payer: x.payer, dx: x.dx, ket: x.perubahan === 'Missing' ? 'Tidak ada di tarikan' : 'Tetap aktif', st: x.perubahan === 'Baru' ? 'BARU MASUK' : x.perubahan === 'Pindah' ? 'PINDAH BED' : x.perubahan === 'Missing' ? 'MISSING' : 'DIPERBARUI' }); }).join('') || '<tr><td colspan="9" class="p-6 text-center text-on-surface-variant">Belum ada data. Pilih file Excel dari EMR.</td></tr>';
    [['filter-all', 'all'], ['filter-new', 'new'], ['filter-transfer', 'transfer'], ['filter-missing', 'missing']].forEach(function (a) { const b = $('#' + a[0]); if (b) b.addEventListener('click', function () { st.filter = a[1]; draw(); }); });
    const pick = function () { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xls,.csv'; i.onchange = function () { if (i.files[0]) baca(i.files[0]); }; i.click(); };
    ['btn-file', 'btn-ulang'].forEach(function (id) { const b = $('#' + id); if (b) b.addEventListener('click', pick); });
    const bt = $('#btn-tempel'); if (bt) bt.addEventListener('click', tempel);
    const bv = $('#btn-verif'); if (bv) bv.addEventListener('click', function () { if (gb) gb.classList.toggle('hidden'); });
    const bb = $('#btn-batal'); if (bb) bb.addEventListener('click', function () { st.rows = null; st.prev = null; draw(); });
    const bu = $('#btn-unduhlog'); if (bu) bu.style.display = 'none';
    $('#btn-simpan').addEventListener('click', simpan);
  };
  const preview = async function (rows, nama) { const r = await API.call('census.preview', { rows: rows }, { timeout: 60000 }); if (!r.success) { toast(r.message, 'err'); return; } st.rows = rows; st.prev = r.data; st.file.nama = nama; draw(); toast('Pratinjau siap: ' + r.data.baru + ' baru, ' + r.data.pindah + ' pindah, ' + r.data.akan_diarsipkan + ' hilang.'); };
  const baca = async function (file) { try { await loadXlsx(); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false }), ws = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }); st.file = { nama: file.name, size: (file.size / 1024).toFixed(1) + ' KB', sheet: wb.SheetNames[0], jam: jam(new Date().toISOString()) }; if (!rows.length) return toast('Sheet kosong.', 'err'); if (rows.length > 3000) return toast('Terlalu banyak baris (maks 3000).', 'err'); const slim = rows.map(function (r) { const o = {}; Object.keys(r).forEach(function (k) { if (['Religion', 'Invoice Class', 'Patient Type', 'Referral Doctor'].indexOf(k) === -1) o[k] = r[k]; }); return o; }); const hdr = Object.keys(slim[0]); const kurang = ['Ward', 'Room', 'Bed', 'Admission No', 'Primary Doctor', 'Admission Date'].filter(function (k) { return hdr.indexOf(k) === -1; }); if (kurang.length) return toast('Kolom wajib tidak ada: ' + kurang.join(', '), 'err'); await preview(slim, file.name); } catch (e) { toast('Gagal membaca file: ' + e.message, 'err'); } };
  const tempel = function () { const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(10,42,128,.45);display:flex;align-items:center;justify-content:center;padding:16px'; o.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px;max-width:640px;width:100%"><h3 style="font-weight:700;color:#0A2A80;margin-bottom:8px">Tempel tabel dari Excel</h3><p style="font-size:12px;color:#444653;margin-bottom:8px">Salin seluruh tabel termasuk baris judul kolom, lalu tempel di sini.</p><textarea id="tp" style="width:100%;height:220px;border:1px solid #c5c5d3;border-radius:8px;padding:8px;font-size:12px"></textarea><div style="text-align:right;margin-top:10px"><button id="tp-x" style="margin-right:8px">Batal</button><button id="tp-ok" style="background:#0A2A80;color:#fff;border-radius:8px;padding:8px 16px;font-weight:700">Proses</button></div></div>'; document.body.appendChild(o); $('#tp-x').onclick = function () { o.remove(); }; $('#tp-ok').onclick = function () { const L = $('#tp').value.replace(/\r/g, '').split('\n').filter(Boolean); if (L.length < 2) return toast('Tempel minimal judul + 1 baris.', 'err'); const h = L[0].split('\t'), rows = L.slice(1).map(function (l) { const c = l.split('\t'), x = {}; h.forEach(function (k, i) { if (['Religion', 'Invoice Class', 'Patient Type', 'Referral Doctor'].indexOf(k) === -1) x[k] = c[i] || ''; }); return x; }); o.remove(); st.file = { nama: 'Tempel dari Excel', size: L.length - 1 + ' baris', sheet: '-', jam: jam(new Date().toISOString()) }; preview(rows, 'Tempel dari Excel'); }; };
  const simpan = async function () {
    if (!st.rows) return toast('Pilih file terlebih dahulu.', 'warn'); const btn = this; let konf = false;
    if (st.prev.guard) { const gb = $('#guardrail-detail-box'); const alasan = gb ? $('select', gb) : null; if (gb && gb.classList.contains('hidden')) { gb.classList.remove('hidden'); toast('Penurunan pasien melewati batas. Pilih alasan lalu tekan Simpan lagi.', 'warn'); return; } if (alasan && !alasan.value) return toast('Pilih alasan penurunan jumlah pasien.', 'warn'); konf = true; }
    busy(btn, true, 'Menyimpan…'); const r = await API.call('census.commit', { rows: st.rows, konfirmasi: konf }, { write: true, timeout: 90000 }); busy(btn, false);
    if (!r.success) return toast(r.message, 'err'); toast('Impor selesai: ' + r.data.ringkas.baru + ' baru, ' + r.data.ringkas.pindah + ' pindah, ' + r.data.ringkas.akan_diarsipkan + ' ditandai hilang.'); API.Store.clearData(); await refreshBoot(); go('patients');
  };
  draw();
}

// ---------- TINDAK LANJUT (W-08, W-09) ----------
let TLCACHE = null;
async function viewFollowups() {
  await loadFrag('w08'); const T = Frag.tpl.w08, H = JSON.parse(T.harv), TD = JSON.parse(T.tdcls);
  const draw = function (d) {
    TLCACHE = d; mount('w08', { k: { terbuka: d.kpi.terbuka, belum_ack: d.items.filter(function (x) { return !x.ack && x.status !== 'Selesai'; }).length, terlambat: d.kpi.terlambat, ack_persen: d.kpi.ack_persen, selesai_24j: d.kpi.selesai_24j, selesai_total: d.kpi.selesai_total }, shown: Math.min(d.items.length, 50), total: d.items.length, ms: '-' });
    const sels = $$('select[data-sel]'); const byS = function (n) { return sels.filter(function (s) { return s.dataset.sel === n; })[0]; };
    if (byS('unit')) byS('unit').innerHTML = '<option value="">Semua Unit</option>' + d.units.map(function (u) { return '<option value="' + esc(u.unit_id) + '">' + esc(u.nama) + '</option>'; }).join('');
    if (byS('pj')) byS('pj').innerHTML = '<option value="">Semua PJ</option>' + d.pj.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
    if (byS('prio')) byS('prio').innerHTML = '<option value="">Semua Prioritas</option><option>Tinggi</option><option>Sedang</option><option>Rendah</option>';
    const rows = $('[data-slot=rows]'); const ren = function () {
      const u = byS('unit') ? byS('unit').value : '', pj = byS('pj') ? byS('pj').value : '', pr = byS('prio') ? byS('prio').value : '', late = $$('input[type=checkbox]').some(function (c) { return c.checked && c.closest('label') && /Terlambat/.test(c.closest('label').textContent); });
      const f = d.items.filter(function (x) { return (!u || x.unit_id === u) && (!pj || x.pj === pj) && (!pr || x.prioritas === pr) && (!late || x.terlambat); }).slice(0, 50);
      rows.innerHTML = f.length ? f.map(function (t) { const td = function (i, h) { return '<td class="' + (TD[i] || 'px-space-md py-space-sm') + '">' + h + '</td>'; }; return '<tr class="border-b border-surface-container hover:bg-surface-container-low cursor-pointer" data-tl="' + esc(t.tl_id) + '">' + td(0, H[t.prioritas] || esc(t.prioritas)) + td(1, '<div class="font-bold">' + esc(t.tl_id) + '</div><div>' + esc(String(t.isi).slice(0, 140)) + '</div>') + td(2, esc(t.cakupan) + (t.admission_no ? ' · pasien' : '')) + td(3, esc(t.unit)) + td(4, esc(t.pj || '-')) + td(5, esc(t.tenggat ? tglPendek(t.tenggat) : '-') + (t.terlambat ? ' ' + (H['Terlambat (+3j)'] || '<b>Terlambat</b>').replace(/\(\+3j\)/, '') : '')) + td(6, H[t.status] || esc(t.status)) + td(7, t.ack ? 'Sudah dibaca' : 'Belum dibaca') + td(8, '<button class="text-primary font-bold underline" data-ack="' + esc(t.tl_id) + '">Ack</button> <button class="text-primary font-bold underline" data-open="' + esc(t.tl_id) + '">Detail</button>') + '</tr>'; }).join('') : '<tr><td colspan="9" class="p-6 text-center text-on-surface-variant">Belum ada tindak lanjut.</td></tr>';
      $$('[data-ack]', rows).forEach(function (b) { b.addEventListener('click', async function (e) { e.stopPropagation(); const x = await API.call('tl.ack', { tl_ids: [b.dataset.ack] }, { write: true }); toast(x.message, x.success ? '' : 'err'); viewFollowups(); }); });
      $$('[data-open]', rows).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); go('followup/' + encodeURIComponent(b.dataset.open)); }); }); $$('tr[data-tl]', rows).forEach(function (r) { r.addEventListener('click', function () { go('followup/' + encodeURIComponent(r.dataset.tl)); }); });
    }; ren(); sels.concat($$('input[type=checkbox]')).forEach(function (s) { s.addEventListener('change', ren); });
    $$('[data-act=tl-baru]').forEach(function (b) { if (S.me.peran === 'klinisi' || S.me.peran === 'viewer') b.style.display = 'none'; else b.addEventListener('click', function () { dialogTl(d); }); });
    $$('[data-act=rekap]').forEach(function (b) { b.addEventListener('click', async function () { busy(b, true); const x = await API.call('doc.rekap_tl', {}, { timeout: 60000 }); busy(b, false); if (!x.success) return toast(x.message, 'err'); toBlobDownload(x.data.pdf_base64, x.data.nama); }); });
  };
  API.swr('tl', 'tl.list', {}, function (d, c, err) { if (d && S.cur === 'followups') draw(d); else if (err) toast(err.message, 'err'); }, 8000);
}
function dialogTl(d) {
  const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(10,42,128,.45);display:flex;align-items:center;justify-content:center;padding:16px'; const cls = 'w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface-container-lowest';
  o.innerHTML = '<div class="bg-surface-container-lowest rounded-xl shadow-xl p-6 w-full max-w-lg space-y-3"><h3 class="font-bold text-primary text-lg">Tindak Lanjut Baru</h3><textarea id="n-isi" class="' + cls + '" rows="3" placeholder="Isi instruksi (jangan menuliskan nama lengkap/No. MR pasien)"></textarea><div class="grid grid-cols-2 gap-2"><select id="n-cak" class="' + cls + '"><option>Umum</option><option>Bangsal</option></select><select id="n-unit" class="' + cls + '"><option value="">Semua unit</option>' + d.units.map(function (u) { return '<option value="' + esc(u.unit_id) + '">' + esc(u.nama) + '</option>'; }).join('') + '</select><select id="n-pj" class="' + cls + '"><option value="">PJ…</option>' + d.pj.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select><select id="n-pri" class="' + cls + '"><option>Sedang</option><option>Tinggi</option><option>Rendah</option></select></div><label class="text-xs text-on-surface-variant">Tenggat</label><input id="n-ten" type="datetime-local" class="' + cls + '"/><div class="text-right pt-2"><button id="n-x" class="mr-3 text-sm">Batal</button><button id="n-ok" class="bg-primary text-on-primary rounded px-4 py-2 font-bold text-sm">Simpan</button></div></div>';
  document.body.appendChild(o); $('#n-x').onclick = function () { o.remove(); };
  $('#n-ok').onclick = async function () { const isi = $('#n-isi').value.trim(); if (!isi) return toast('Isi instruksi wajib diisi.', 'warn'); const b = this; busy(b, true); const x = await API.call('tl.save', { isi: isi, cakupan: $('#n-cak').value, unit_id: $('#n-unit').value, pj: $('#n-pj').value, prioritas: $('#n-pri').value, tenggat: $('#n-ten').value ? new Date($('#n-ten').value).toISOString() : '' }, { write: true }); busy(b, false); if (!x.success) return toast(x.message, 'err'); o.remove(); toast(x.message); API.Store.del('c:tl'); API.Store.clearData(); refreshBoot(); viewFollowups(); };
}
async function viewFollowup(id) {
  await loadFrag('w09'); let d = TLCACHE; if (!d || !d.items.some(function (x) { return x.tl_id === id; })) { const r = await API.call('tl.list', {}); if (!r.success) return toast(r.message, 'err'); d = r.data; TLCACHE = d; }
  const t = d.items.filter(function (x) { return x.tl_id === id; })[0]; if (!t) { toast('Tindak lanjut tidak ditemukan.', 'err'); return go('followups'); }
  const sisa = t.sisa_menit == null ? '-' : t.sisa_menit < 0 ? 'Terlambat ' + Math.floor(-t.sisa_menit / 60) + ' jam ' + (-t.sisa_menit % 60) + ' mnt' : 'Sisa ' + Math.floor(t.sisa_menit / 60) + ' jam ' + (t.sisa_menit % 60) + ' mnt';
  mount('w09', { t: { tl_id: t.tl_id, prioritas: t.prioritas, status_txt: t.status + (t.terlambat ? ' • Terlambat' : ''), unit: t.unit, isi: t.isi, sisa: sisa, tenggat: t.tenggat ? tglPendek(t.tenggat) : '-', pj: t.pj || '-', dibuat_oleh: penumap(t.dibuat_oleh) } });
  const ta = $('#clinical-resolution'); if (ta) ta.value = t.catatan || ''; const dlg = $('#signoff-modal');
  const tutup = async function (status) { const cat = ta ? ta.value.trim() : ''; if (status !== 'Dikerjakan' && !cat) { toast('Catatan penutupan wajib diisi.', 'warn'); if (dlg && dlg.open) dlg.close(); return; } const x = await API.call('tl.tutup', { tl_id: id, status: status, catatan: cat }, { write: true }); if (!x.success) return toast(x.message, 'err'); toast(x.message); TLCACHE = null; API.Store.del('c:tl'); refreshBoot(); go('followups'); };
  const bc = $('#btn-close-instruction'); if (bc) bc.addEventListener('click', function () { if (!ta.value.trim()) return toast('Tuliskan catatan penutupan terlebih dahulu.', 'warn'); dlg && dlg.showModal ? dlg.showModal() : tutup('Selesai'); });
  const ok = $('#btn-confirm-auth'); if (ok) ok.addEventListener('click', function (e) { e.preventDefault(); if (dlg && dlg.open) dlg.close(); tutup('Selesai'); });
  [$('#btn-modal-close'), $('#btn-cancel-auth')].forEach(function (b) { if (b) b.addEventListener('click', function (e) { e.preventDefault(); dlg && dlg.open && dlg.close(); }); });
  const dr = $('#btn-draf'); if (dr) dr.addEventListener('click', function () { tutup('Dikerjakan'); });
  $$('[data-act=back]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); go('followups'); }); });
}


// ---------- ADMIN & DASHBOARD (W-07, W-10 – W-14) ----------
function need(roles) { if (roles.indexOf(S.me.peran) === -1) { toast('Akses ditolak untuk peran Anda.', 'err'); go('patients'); return false; } return true; }
function rowsHtml(T, list, cellsFn, attrFn) { return list.map(function (x, i) { return '<tr class="' + esc(T.rowcls) + '"' + (attrFn ? attrFn(x, i) : '') + '>' + cellsFn(x, i).map(function (h, j) { return '<td class="' + esc(T.tdcls[j] || '') + '">' + h + '</td>'; }).join('') + '</tr>'; }).join(''); }
function opts(sel, list, first) { if (sel) sel.innerHTML = '<option value="">' + esc(first) + '</option>' + list.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join(''); }
const BTN = 'text-primary font-bold underline text-sm';
function tglJam(iso) { if (!iso) return '-'; const d = new Date(iso); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + ' • ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }
function modal(html, onReady) { const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(10,42,128,.45);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto'; o.innerHTML = '<div class="bg-surface-container-lowest rounded-xl shadow-xl p-6 w-full max-w-lg space-y-3">' + html + '</div>'; document.body.appendChild(o); o.close = function () { o.remove(); }; onReady(o); return o; }
const FLD = 'w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface-container-lowest';

async function viewHistory() {
  if (!need(['superadmin', 'manajemen', 'klinisi'])) return; await loadFrag('w07'); const T = JSON.parse(Frag.tpl.w07.t);
  const r = await API.call('census.riwayat'); if (!r.success) return toast(r.message, 'err'); const L = r.data.log, ok = L.filter(function (x) { return x.status === 'Berhasil'; }).length;
  const k = { total: L.length, ok: ok, persen: L.length ? Math.round(ok / L.length * 1000) / 10 : 100, ditahan: L.filter(function (x) { return x.status === 'Ditahan'; }).length, gagal: L.length - ok, mutasi: L.reduce(function (a, x) { return a + Number(x.pindah || 0) + Number(x.hilang || 0); }, 0), hilang: L.reduce(function (a, x) { return a + Number(x.hilang || 0); }, 0), shown: Math.min(L.length, 60) };
  mount('w07', { k: k }); let flt = 'all';
  const ren = function () { const f = L.filter(function (x) { return flt === 'all' || (flt === 'ok' ? x.status === 'Berhasil' : x.status !== 'Berhasil'); }).slice(0, 60);
    $('[data-slot=rows]').innerHTML = f.length ? rowsHtml(T, f, function (x) { return ['<div class="font-bold">' + esc(x.import_id) + '</div><div>' + tglJam(x.waktu) + '</div>', 'Impor census EMR<div class="text-xs">' + esc(x.jumlah) + ' baris' + (x.ditolak ? ' · ' + esc(x.ditolak) + ' ditolak' : '') + '</div>', esc(penumap(x.oleh)), '<span class="font-bold">+' + esc(x.baru) + ' Baru</span> · ' + esc(x.diperbarui) + ' Tetap · ' + esc(x.pindah) + ' Pindah · ' + esc(x.hilang) + ' Hilang', esc(x.status), '—']; }) : '<tr><td colspan="6" class="p-6 text-center text-on-surface-variant">Belum ada impor.</td></tr>'; };
  ren(); $$('main button').forEach(function (b) { const t = b.textContent; if (/^Semua Riwayat/.test(t.trim())) b.addEventListener('click', function () { flt = 'all'; ren(); }); if (/^Berhasil/.test(t.trim())) b.addEventListener('click', function () { flt = 'ok'; ren(); }); if (/Ditahan \/ Gagal/.test(t)) b.addEventListener('click', function () { flt = 'gagal'; ren(); }); });
  const ps = $$('main select'); opts(ps[0], [['1', 'Sesi ' + ((S.boot.sesi.daftar || [])[0] || '')], ['2', 'Sesi ' + ((S.boot.sesi.daftar || [])[1] || '')]], 'Semua Sesi'); opts(ps[1], Array.from(new Set(L.map(function (x) { return x.oleh; }))).map(function (e) { return [e, penumap(e)]; }), 'Semua Petugas');
  $$('[data-act=import]').forEach(function (b) { b.addEventListener('click', function () { go('import'); }); }); $$('[data-act=refresh]').forEach(function (b) { b.addEventListener('click', viewHistory); });
}
async function viewDash() {
  if (!need(['superadmin', 'manajemen'])) return; await loadFrag('w10'); const T = JSON.parse(Frag.tpl.w10.t), T2 = JSON.parse(Frag.tpl.w10.t2);
  const [r, tl] = await Promise.all([API.call('dash'), API.call('tl.list', {})]); if (!r.success) return toast(r.message, 'err'); const d = r.data, t = d.total, y = new Date(Date.now() - 864e5);
  mount('w10', { t: t, sesi: d.sesi, census: { jam: d.census.terakhir ? jam(d.census.terakhir) : '-' }, menunggu: t.unit_total - t.unit_diterima, pctst: t.unit_total ? Math.round(t.unit_diterima / t.unit_total * 100) : 0, kemarin: tglPendek(y.toISOString().slice(0, 10)) });
  const ren = function () { const u = ($('select[data-sel=unit]') || {}).value || ''; const L = d.units.filter(function (x) { return !u || x.unit_id === u; });
    $('[data-slot=rows]').innerHTML = rowsHtml(T, L, function (x) { return ['<div class="font-bold">' + esc(x.nama) + '</div>', '<b>' + x.aktif + '</b> / ' + x.kapasitas + ' (' + x.bor + '%)', '+' + x.baru + ' Baru • ' + x.pindah + ' Pindah', x.kelengkapan + '%', x.stale + ' Stale', x.tl + ' Terbuka' + (x.tl_late ? ' • ' + x.tl_late + ' Terlambat' : ''), esc(x.serah_terima), '<button class="' + BTN + '" data-unit="' + esc(x.unit_id) + '">Buka Unit</button>']; }); $$('[data-unit]').forEach(function (b) { b.addEventListener('click', function () { S.unit = b.dataset.unit; sessionStorage.setItem('unit', S.unit); go('patients'); }); }); };
  opts($('select[data-sel=unit]'), d.units.map(function (u) { return [u.unit_id, u.nama]; }), 'Semua Unit Rawat Inap'); ren(); const sel = $('select[data-sel=unit]'); if (sel) sel.addEventListener('change', ren);
  const sel24 = tl.success ? tl.data.items.filter(function (x) { return x.status === 'Selesai' && x.waktu_tutup && Date.now() - new Date(x.waktu_tutup).getTime() < 36 * 36e5; }) : [];
  $('[data-slot=rows2]').innerHTML = sel24.length ? rowsHtml(T2, sel24, function (x) { return ['<b>' + esc(x.tl_id) + '</b><div>' + esc(x.prioritas) + '</div>', esc(String(x.isi).slice(0, 160)), esc(x.pj || '-') + '<div class="text-xs">' + esc(x.unit) + '</div>', 'Selesai', esc(String(x.catatan).slice(0, 160)), esc(penumap(x.ditutup_oleh)) + '<div class="text-xs">' + tglJam(x.waktu_tutup) + '</div>']; }) : '<tr><td colspan="6" class="p-6 text-center text-on-surface-variant">Tidak ada instruksi yang ditutup dalam 36 jam terakhir.</td></tr>';
  $$('main a, main button').forEach(function (b) { if (/Lihat Kartu Stale/.test(b.textContent)) b.addEventListener('click', function () { go('patients'); }); });
  $$('main button').forEach(function (b) { if (/Unduh Data Agregat/.test(b.textContent)) b.addEventListener('click', function () { const rows = [['Unit', 'Aktif', 'Kapasitas', 'BOR%', 'Baru', 'Pindah', 'Kelengkapan%', 'Stale', 'TL terbuka']].concat(d.units.map(function (x) { return [x.nama, x.aktif, x.kapasitas, x.bor, x.baru, x.pindah, x.kelengkapan, x.stale, x.tl]; })); const csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'agregat_handover.csv'; a.click(); toast('Data agregat tanpa identitas pasien diunduh (manual).'); }); });
}
function dialogUser(u, units, done) {
  u = u || { email: '', nama: '', peran: 'klinisi', unit_akses: '*', boleh_impor: false, aktif: true, wa: '' }; const sel = u.unit_akses === '*' ? [] : u.unit_akses.split(',');
  modal('<h3 class="font-bold text-primary text-lg">' + (u.email ? 'Ubah Pengguna' : 'Tambah Pengguna') + '</h3><input id="u-e" class="' + FLD + '" placeholder="Email Google RS" value="' + esc(u.email) + '" ' + (u.email ? 'readonly' : '') + '/><input id="u-n" class="' + FLD + '" placeholder="Nama (mis. dr. Nama, Sp.PD)" value="' + esc(u.nama) + '"/><select id="u-p" class="' + FLD + '">' + ['superadmin', 'manajemen', 'klinisi', 'viewer'].map(function (p) { return '<option value="' + p + '"' + (u.peran === p ? ' selected' : '') + '>' + PERAN[p] + '</option>'; }).join('') + '</select><div class="text-xs text-on-surface-variant">Unit akses (kosong = semua):</div><div id="u-u" class="flex flex-wrap gap-2">' + units.map(function (x) { return '<label class="text-sm"><input type="checkbox" value="' + esc(x.unit_id) + '"' + (sel.indexOf(x.unit_id) > -1 ? ' checked' : '') + '/> ' + esc(x.nama) + '</label>'; }).join('') + '</div><input id="u-w" class="' + FLD + '" placeholder="No. WhatsApp (opsional)" value="' + esc(u.wa) + '"/><label class="text-sm block"><input id="u-i" type="checkbox"' + (u.boleh_impor ? ' checked' : '') + '/> Boleh impor census (RMO)</label><label class="text-sm block"><input id="u-a" type="checkbox"' + (u.aktif ? ' checked' : '') + '/> Akun aktif</label><div class="text-right pt-2"><button id="u-x" class="mr-3 text-sm">Batal</button><button id="u-ok" class="bg-primary text-on-primary rounded px-4 py-2 font-bold text-sm">Simpan</button></div>', function (o) {
    $('#u-x', o).onclick = o.close; $('#u-ok', o).onclick = async function () { const un = $$('#u-u input:checked', o).map(function (c) { return c.value; }); const b = this; busy(b, true); const x = await API.call('user.save', { email: $('#u-e', o).value, nama: $('#u-n', o).value, peran: $('#u-p', o).value, unit_akses: un.length ? un.join(',') : '*', boleh_impor: $('#u-i', o).checked, aktif: $('#u-a', o).checked, wa: $('#u-w', o).value }, { write: true }); busy(b, false); if (!x.success) return toast(x.message, 'err'); o.close(); toast(x.message); done(); }; });
}
async function viewUsers() {
  if (!need(['superadmin'])) return; await loadFrag('w11'); const T = JSON.parse(Frag.tpl.w11.t); const r = await API.call('user.list'); if (!r.success) return toast(r.message, 'err'); const U = r.data.users, un = r.data.units;
  const k = { total: U.length, klinisi: U.filter(function (x) { return x.peran === 'klinisi'; }).length, importir: U.filter(function (x) { return x.boleh_impor; }).length, mgmt: U.filter(function (x) { return x.peran === 'manajemen' || x.peran === 'superadmin'; }).length, nonaktif: U.filter(function (x) { return !x.aktif; }).length, shown: U.length };
  mount('w11', { k: k }); const ps = $$('main select'); opts(ps[0], Object.keys(PERAN).map(function (p) { return [p, PERAN[p]]; }), 'Peran: Semua Peran'); opts(ps[1], un.map(function (x) { return [x.unit_id, x.nama]; }), 'Bangsal: Semua Unit'); opts(ps[2], [['ya', 'Boleh Impor'], ['tidak', 'Tidak Boleh Impor']], 'Otorisasi Impor: Semua'); if (ps[3]) ps[3].style.display = 'none';
  const pill = function (a) { return T.pills[a ? 'Aktif' : 'Nonaktif'] || (a ? 'Aktif' : 'Nonaktif'); };
  const ren = function () { const q = (($('main input[type=text]') || {}).value || '').toLowerCase(), pe = ps[0].value, uu = ps[1].value, im = ps[2].value;
    const f = U.filter(function (x) { return (!q || (x.nama + x.email).toLowerCase().indexOf(q) > -1) && (!pe || x.peran === pe) && (!uu || x.unit_akses === '*' || x.unit_akses.split(',').indexOf(uu) > -1) && (!im || (im === 'ya') === x.boleh_impor); });
    $('[data-slot=rows]').innerHTML = rowsHtml(T, f, function (x) { return ['<div class="font-bold">' + esc(x.nama || x.email) + '</div>', esc(x.email), esc(PERAN[x.peran]), esc(x.unit_akses === '*' ? 'Semua unit' : x.unit_akses.split(',').map(namaUnitFe).join(', ')), x.boleh_impor ? 'Ya' : '—', pill(x.aktif), '<button class="' + BTN + '" data-ed="' + esc(x.email) + '">Ubah</button>']; });
    $$('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { dialogUser(U.filter(function (x) { return x.email === b.dataset.ed; })[0], un, viewUsers); }); }); };
  const namaUnitFe = function (id) { const u = un.filter(function (x) { return x.unit_id === id; })[0]; return u ? u.nama : id; };
  ren(); ps.slice(0, 3).concat($$('main input[type=text]')).forEach(function (s) { s.addEventListener('input', ren); s.addEventListener('change', ren); }); $$('[data-act=user-baru]').forEach(function (b) { b.addEventListener('click', function () { dialogUser(null, un, viewUsers); }); });
}
async function viewWard() {
  if (!need(['superadmin'])) return; await loadFrag('w12'); const T = JSON.parse(Frag.tpl.w12.t); const [w, st] = await Promise.all([API.call('ward.list'), API.call('set.get')]); if (!w.success || !st.success) return toast((w.message || st.message), 'err');
  const W = w.data.ward, SET = {}; st.data.set.forEach(function (x) { SET[x.key] = x.value; });
  const draw = function () { mount('w12', { k: { unit: W.length, aktif: W.filter(function (x) { return x.aktif; }).length, nonaktif: W.filter(function (x) { return !x.aktif; }).length, kap: W.reduce(function (a, x) { return a + (x.kapasitas || 0); }, 0) }, s: SET });
    const pill = function (a) { return T.pills[a ? 'Aktif' : 'Nonaktif'] || (a ? 'Aktif' : 'Nonaktif'); };
    $('[data-slot=rows]').innerHTML = rowsHtml(T, W, function (x) { return ['<div class="font-bold">' + esc(x.ward_raw) + '</div>', esc(x.nama_unit) + '<div class="text-xs">Kode: ' + esc(x.unit_id) + '</div>', '—', esc(x.kapasitas) + ' Bed', pill(x.aktif), '<button class="' + BTN + '" data-ed="' + esc(x.ward_raw) + '">Ubah</button>']; });
    $$('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { dialogWard(W.filter(function (x) { return x.ward_raw === b.dataset.ed; })[0], draw2); }); }); $$('[data-act=ward-baru]').forEach(function (b) { b.addEventListener('click', function () { dialogWard(null, draw2); }); });
    $$('input[data-set]').forEach(function (i) { i.value = SET[i.dataset.set] || i.value; }); const so = $('select[data-set]'); if (so) { const v = SET.OFFSET_IMPOR_MENIT || '30'; Array.from(so.options).forEach(function (o, i) { o.value = [30, 45, 60][i]; o.selected = o.value === v; }); }
    $$('[data-act=jadwal-simpan]').forEach(function (b) { b.addEventListener('click', async function () { const upd = []; $$('input[data-set]').forEach(function (i) { upd.push([i.dataset.set, i.value.trim()]); }); if (so) upd.push(['OFFSET_IMPOR_MENIT', so.value]); for (const u of upd) { if (/^SESI/.test(u[0]) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(u[1])) return toast('Format jam harus HH:MM (mis. 07:00).', 'err'); } for (const u of upd) { const x = await API.call('set.save', { key: u[0], value: u[1] }, { write: true }); if (!x.success) return toast(x.message, 'err'); SET[u[0]] = u[1]; } toast('Jadwal sesi & offset impor disimpan.'); refreshBoot(); }); });
    $$('[data-act=jadwal-reset]').forEach(function (b) { b.addEventListener('click', function () { const d = { SESI_1: '07:00', SESI_2: '15:30', SESI_LIBUR: '07:00' }; $$('input[data-set]').forEach(function (i) { if (d[i.dataset.set]) i.value = d[i.dataset.set]; }); if (so) so.value = '30'; toast('Nilai bawaan dimuat. Tekan Simpan untuk menerapkan.', 'warn'); }); }); };
  const draw2 = async function () { const x = await API.call('ward.list'); if (x.success) { W.length = 0; x.data.ward.forEach(function (i) { W.push(i); }); } API.Store.clearData(); await refreshBoot(); draw(); }; draw();
}
function dialogWard(w, done) {
  w = w || { ward_raw: '', unit_id: '', nama_unit: '', kapasitas: 0, aktif: true };
  modal('<h3 class="font-bold text-primary text-lg">Pemetaan Ward EMR → Unit Handover</h3><input id="w-r" class="' + FLD + '" placeholder="Nilai Ward di EMR (persis seperti di Excel)" value="' + esc(w.ward_raw) + '" ' + (w.ward_raw ? 'readonly' : '') + '/><input id="w-i" class="' + FLD + '" placeholder="Kode unit (mis. ICU)" value="' + esc(w.unit_id) + '"/><input id="w-n" class="' + FLD + '" placeholder="Nama unit tampil" value="' + esc(w.nama_unit) + '"/><input id="w-k" type="number" class="' + FLD + '" placeholder="Kapasitas bed" value="' + esc(w.kapasitas) + '"/><label class="text-sm block"><input id="w-a" type="checkbox"' + (w.aktif ? ' checked' : '') + '/> Aktif</label><p class="text-xs text-on-surface-variant">Satu nilai Ward EMR = satu daftar handover.</p><div class="text-right pt-2"><button id="w-x" class="mr-3 text-sm">Batal</button><button id="w-ok" class="bg-primary text-on-primary rounded px-4 py-2 font-bold text-sm">Simpan</button></div>', function (o) {
    $('#w-x', o).onclick = o.close; $('#w-ok', o).onclick = async function () { const x = await API.call('ward.save', { ward_raw: $('#w-r', o).value, unit_id: $('#w-i', o).value, nama_unit: $('#w-n', o).value, kapasitas: $('#w-k', o).value, aktif: $('#w-a', o).checked }, { write: true }); if (!x.success) return toast(x.message, 'err'); o.close(); toast(x.message); done(); }; });
}
async function viewAudit() {
  if (!need(['superadmin'])) return; await loadFrag('w13'); const T = JSON.parse(Frag.tpl.w13.t); const r = await API.call('audit.list', { limit: 500 }); if (!r.success) return toast(r.message, 'err'); const L = r.data.log;
  const k = { total: L.length, normal: L.filter(function (x) { return !/^(HANDOVER|SOAP|IMPOR|TL_|USER|WARD|SET|TERIMA|RAHASIA)/.test(x.aksi); }).length, mutasi: L.filter(function (x) { return /^(HANDOVER|SOAP|IMPOR|TL_|TERIMA)/.test(x.aksi); }).length, unmask: L.filter(function (x) { return x.aksi === 'BUKA_NAMA_LENGKAP'; }).length, pola: r.data.pola.length, shown: Math.min(L.length, 100) };
  mount('w13', { k: k }); const ps = $$('main select'); opts(ps[1], Array.from(new Set(L.map(function (x) { return x.user; }))).map(function (u) { return [u, penumap(u)]; }), 'Semua Pengguna'); opts(ps[2], Array.from(new Set(L.map(function (x) { return x.unit; }).filter(Boolean))).map(function (u) { return [u, namaUnitGlobal(u)]; }), 'Semua Unit'); opts(ps[3], Array.from(new Set(L.map(function (x) { return x.aksi; }))).map(function (a) { return [a, a.replace(/_/g, ' ')]; }), 'Semua Aksi'); if (ps[0]) ps[0].style.display = 'none'; if (ps[4]) ps[4].style.display = 'none';
  const ren = function () { const u = ps[1].value, un = ps[2].value, ak = ps[3].value, q = (($('main input[type=text]') || {}).value || '').toLowerCase(); const f = L.filter(function (x) { return (!u || x.user === u) && (!un || x.unit === un) && (!ak || x.aksi === ak) && (!q || (x.objek + x.detail + x.user).toLowerCase().indexOf(q) > -1); }).slice(0, 100);
    $('[data-slot=rows]').innerHTML = rowsHtml(T, f, function (x) { return [tglJam(x.waktu), esc(x.user), '<b>' + esc(x.aksi.replace(/_/g, ' ')) + '</b>', esc(x.objek), esc(x.unit ? namaUnitGlobal(x.unit) : '-'), 'Tercatat', esc(x.detail)]; }); };
  ren(); ps.concat($$('main input[type=text]')).forEach(function (s) { s.addEventListener('change', ren); s.addEventListener('input', ren); }); $$('main button').forEach(function (b) { if (/Reset Filter/.test(b.textContent)) b.addEventListener('click', function () { ps.forEach(function (s) { s.value = ''; }); ren(); }); });
}
function namaUnitGlobal(id) { const u = ((S.boot || {}).units || []).filter(function (x) { return x.unit_id === id; })[0]; return u ? u.nama : id; }
async function viewSecurity() {
  if (!need(['superadmin'])) return; await loadFrag('w14'); const r = await API.call('set.get'); if (!r.success) return toast(r.message, 'err'); const SET = {}; r.data.set.forEach(function (x) { SET[x.key] = x.value; });
  mount('w14', {}); $$('input[data-set]').forEach(function (i) { const p = i.dataset.set.split(':'); i.checked = String(SET[p[0]]) === p[1]; });
  ['toggleIntranet', 'toggle2FA', 'toggleClipboard', 'toggleBlur'].forEach(function (id) { const t = document.getElementById(id); if (!t) return; t.checked = id === 'toggleBlur'; t.disabled = true; const l = t.closest('label') || t.parentElement; if (l) { l.style.opacity = '.6'; l.title = id === 'toggleBlur' ? 'Selalu aktif: layar terkunci setelah tidak aktif.' : 'Diatur IT melalui Google Workspace (verifikasi 2 langkah / akses kontekstual), bukan oleh aplikasi ini.'; } });
  const sv = $('#btnSaveConfig'); if (sv) sv.addEventListener('click', async function () { const chosen = $$('input[data-set]:checked').map(function (i) { return i.dataset.set.split(':'); }); busy(sv, true); for (const c of chosen) { const x = await API.call('set.save', { key: c[0], value: c[1] }, { write: true }); if (!x.success) { busy(sv, false); return toast(x.message, 'err'); } } busy(sv, false); toast('Kebijakan keamanan & retensi disimpan.'); refreshBoot(); });
}

// ---------- start ----------
window.addEventListener('load', function () { if (!location.hash) location.hash = API.token() ? '#/patients' : '#/login'; route(); });
})();
