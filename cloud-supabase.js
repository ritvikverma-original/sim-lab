/* Sim Lab account storage on Supabase, for the web copies of the app.
   It offers the same small user/db interface that core.js already uses for Claude accounts,
   so core's saving, syncing and "move device runs to account" logic works unchanged.
   Inactive unless cloud-config.js has a url and anon key, and never used inside claude.ai. */
(function () {
  'use strict';
  const cfg = window.SIMLAB_SUPABASE || {};
  const TABLE = 'simlab_docs';
  const LIB = cfg.lib || 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
  const configured = !!(cfg.url && cfg.anonKey);
  let client = null, session = null, channel = null;
  const listeners = new Set();

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB; s.async = true;
      s.onload = () => resolve(); s.onerror = () => reject({ code: 'unavailable', message: 'Could not load the sign-in library.' });
      document.head.appendChild(s);
    });
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'unavailable', message: 'Timed out' }), ms))]);
  }
  async function getClient() {
    if (client) return client;
    await withTimeout(loadLib(), 10000);
    client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }

  /* Turn Supabase errors into the codes core.js already handles. */
  function mapErr(e) {
    if (!e) return { code: 'unknown' };
    const msg = String(e.message || '');
    if (e.code === '42501' || /row-level security/i.test(msg)) return { code: 'not_granted', message: msg };
    if (e.code === 'PGRST301' || /JWT|token/i.test(msg)) return { code: 'revoked', message: msg };
    if (/fetch|network|Failed to fetch|timeout/i.test(msg) || e.code === '') return { code: 'unavailable', message: msg };
    return { code: e.code || 'unknown', message: msg };
  }

  /* ---- Firestore-shaped wrappers over one table ---- */
  let refreshTimer = null;
  function refreshAll() { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => listeners.forEach(l => l.fetch()), 250); }

  function docRef(uid, col, id) {
    return {
      path: col + '/' + id,
      async get() {
        const { data, error } = await client.from(TABLE).select('body').eq('user_id', uid).eq('col', col).eq('id', id).maybeSingle();
        if (error) throw mapErr(error);
        return { exists: !!data, data: () => (data ? data.body : undefined) };
      },
      async set(body) {
        const { error } = await client.from(TABLE).upsert({ user_id: uid, col, id, body: JSON.parse(JSON.stringify(body)), updated_at: new Date().toISOString() });
        if (error) throw mapErr(error);
        if (col === 'runs') refreshAll();
      },
      async delete() {
        const { error } = await client.from(TABLE).delete().eq('user_id', uid).eq('col', col).eq('id', id);
        if (error) throw mapErr(error);
        if (col === 'runs') refreshAll();
      }
    };
  }
  function query(uid, col) {
    const o = { limit: 500 };
    const q = {
      orderBy() { return q; },            /* rows always come newest first */
      limit(n) { o.limit = n; return q; },
      onSnapshot(cb, onErr) {
        let first = true, dead = false;
        const l = {
          async fetch() {
            if (dead) return;
            const { data, error } = await client.from(TABLE).select('id, body').eq('user_id', uid).eq('col', col).order('updated_at', { ascending: false }).limit(o.limit);
            if (dead) return;
            if (error) { if (first && onErr) onErr(mapErr(error)); return; }
            first = false;
            cb({ docs: (data || []).map(r => ({ id: r.id, data: () => r.body })) });
          }
        };
        listeners.add(l); l.fetch();
        return () => { dead = true; listeners.delete(l); };
      }
    };
    return q;
  }
  function makeDb(uid) {
    const col = name => ({ doc: id => docRef(uid, name, id), orderBy: () => query(uid, name), limit: n => query(uid, name).limit(n) });
    return { doc: () => ({ collection: col }) };
  }
  function meOf(s) {
    const u = s.user, md = u.user_metadata || {};
    return { id: u.id, name: md.full_name || md.name || (u.email ? u.email.split('@')[0] : ''), email: u.email || null, avatarUrl: md.avatar_url || md.picture || null };
  }
  function watch(uid) {
    try {
      channel = client.channel('simlab-' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: 'user_id=eq.' + uid }, refreshAll)
        .subscribe();
    } catch (e) { /* live updates are a bonus; refresh on focus still works */ }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAll(); });
  }

  window.SimLabCloud = {
    configured,
    google: !!cfg.google,
    requireSignIn: configured && !!cfg.requireSignIn,
    /* Resolves to { user, db } when signed in, or null for a guest. */
    async start() {
      if (!configured) return null;
      const c = await getClient();
      const { data } = await withTimeout(c.auth.getSession(), 10000);
      session = data && data.session;
      if (!session) return null;
      const me = meOf(session);
      const db = makeDb(me.id);
      db.doc().collection('profile').doc('main').set({ name: me.name, email: me.email, lastSeen: Date.now() }).catch(() => {});
      let isAdmin = false;
      try { const { data: adm } = await c.from('simlab_admins').select('user_id').eq('user_id', me.id).maybeSingle(); isAdmin = !!adm; } catch (e) { /* not an admin */ }
      watch(me.id);
      c.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
      return { user: { me: async () => me }, db, isAdmin };
    },
    async signInEmail(email) {
      const c = await getClient();
      const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw mapErr(error);
    },
    async signInGoogle() {
      const c = await getClient();
      const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) throw mapErr(error);
    },
    async signOut() {
      const c = await getClient();
      if (channel) { try { c.removeChannel(channel); } catch (e) { /* ignore */ } }
      await c.auth.signOut();
    }
  };
})();
