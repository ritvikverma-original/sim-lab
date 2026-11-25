/* Sim Lab account sync settings for the web copies (GitHub Pages, Lovable).
   Fill in the two values from Supabase: Project Settings > API. The anon key is meant to be public;
   the access rules in supabase/schema.sql are what keep each person's data private.
   Leave url empty to keep the app device-only. The claude.ai copy ignores this file and uses Claude accounts. */
window.SIMLAB_SUPABASE = {
  url: '',          // e.g. 'https://abcdefghijkl.supabase.co'
  anonKey: '',      // the "anon public" key
  google: false     // set to true once Google sign-in is switched on in Supabase (Authentication > Providers)
};
