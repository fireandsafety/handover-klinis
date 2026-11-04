// === API CLIENT: fetch POST text/plain (tanpa preflight), retry+backoff, idempotensi, SWR ===
(function () {
  const C = window.CONFIG, NS = 'hk1:';
  const Store = {
    get(k) { try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
    clearData() { try { Object.keys(localStorage).filter(function (k) { return k.indexOf(NS + 'c:') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  };
  let TOKEN = Store.get('token') || '';
  const API = {
    Store: Store,
    setToken(t) { TOKEN = t || ''; t ? Store.set('token', t) : Store.del('token'); },
    token() { return TOKEN; },
    async call(action, data, opt) {
      opt = opt || {};
      const reqId = opt.write ? (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) : '';
      const body = JSON.stringify({ action: action, data: data || {}, token: TOKEN, reqId: reqId });
      let last;
      for (let i = 0; i <= (opt.write ? 1 : C.RETRY); i++) {
        const ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, opt.timeout || C.TIMEOUT_MS);
        try {
          const r = await fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, signal: ctl.signal, redirect: 'follow' });
          clearTimeout(to);
          const j = await r.json();
          if (!j.success && j.data && (j.data.code === 'AUTH' || j.data.code === 'FORBIDDEN') && action !== 'auth.google') { window.dispatchEvent(new CustomEvent('sesi-habis')); }
          return j;
        } catch (e) { clearTimeout(to); last = e; await new Promise(function (res) { setTimeout(res, 400 * Math.pow(2, i)); }); }
      }
      return { success: false, message: 'Koneksi bermasalah. Periksa jaringan lalu coba lagi.', data: { code: 'NET' } };
    },
    /** Stale-While-Revalidate: tampilkan cache seketika, segarkan di latar, panggil onData lagi bila berbeda. */
    swr(key, action, data, onData, ttlMs) {
      const ck = 'c:' + key, hit = Store.get(ck); let shown = false;
      if (hit && hit.d) { shown = true; onData(hit.d, true); }
      if (hit && ttlMs && Date.now() - hit.t < ttlMs) return Promise.resolve(hit.d);
      return API.call(action, data).then(function (r) {
        if (r.success) { const same = hit && JSON.stringify(hit.d) === JSON.stringify(r.data); Store.set(ck, { t: Date.now(), d: r.data }); if (!same) onData(r.data, false); return r.data; }
        if (!shown) onData(null, false, r); return null;
      });
    },
    warm() { try { fetch(C.API_URL + '?w=ping', { mode: 'no-cors' }); } catch (e) {} }
  };
  window.API = API;
})();
