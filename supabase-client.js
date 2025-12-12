// supabase-client.js
// Put your Supabase project URL + anon key here (ANON only).
// For GitHub Pages: add your exact URLs to Supabase Auth -> Redirect URLs, e.g.
//   https://YOURNAME.github.io/YOURREPO/oauth/callback.html
//   https://YOURNAME.github.io/YOURREPO/dashboard.html
//   https://YOURNAME.github.io/YOURREPO/auth.html
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});
