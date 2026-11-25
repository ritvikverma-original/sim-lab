# B-School Sim Lab

Business simulations, cases, guesstimates and decision practice.

Live: https://ritvikverma-original.github.io/sim-lab/

A static app: open `index.html`. Progress is saved in the browser.

## Accounts and progress sync (web copies)

The claude.ai copy signs people in with their Claude account. The web copies (GitHub Pages, Lovable) can sync through Supabase; until it is set up they stay device-only.

1. Create a project at supabase.com.
2. In SQL Editor, run `supabase/schema.sql`.
3. In Authentication > URL Configuration, set the Site URL to `https://www.business-simulator.business` and add `https://www.business-simulator.business/**` and `https://bschool-sim-lab.lovable.app/**` as redirect URLs.
4. Copy the Project URL and the anon public key (Project Settings > API) into `cloud-config.js`.
5. Optional: switch on Google in Authentication > Providers, then set `google: true` in `cloud-config.js`.
6. Sign in once on the site, then make yourself an owner in SQL Editor:
   `insert into public.simlab_admins (user_id) select id from auth.users where email = 'you@example.com';`
7. Open `/results.html` to see everyone's scores. Answers and drafts stay private to each player.

Sign-in is required on the website while `requireSignIn` is `true` in `cloud-config.js`. Accounts listed in `simlab_admins` see a User / Admin switch in the top bar; Admin opens `results.html`. If Supabase can't be reached, visitors may continue on their device until it is back.
