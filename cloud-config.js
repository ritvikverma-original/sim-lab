/* Sim Lab account sync settings for the web copies (GitHub Pages, Lovable).
   Values from Supabase: Project Settings > API. The publishable (anon) key is meant to be public;
   the access rules in supabase/schema.sql are what keep each person's data private.
   Leave url empty to keep the app device-only. The claude.ai copy ignores this file and uses Claude accounts. */
window.SIMLAB_SUPABASE = {
  url: 'https://qkkqfhudczfmvdwnemuh.supabase.co',
  anonKey: 'sb_publishable_nXo974qBq-ASCezw1JbInw_1E1Q5Dxb',  // publishable (public) key
  google: false     // set to true once Google sign-in is switched on in Supabase (Authentication > Providers)
};
