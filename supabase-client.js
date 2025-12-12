// supabase-client.js
// Put your Supabase project URL + anon key here.
// IMPORTANT: Use the ANON key (safe for browsers). Never put service_role keys in a public website.
const SUPABASE_URL = "https://qopgwxlrdqjyamerllwz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HYgmuRFRreMN0le5UX26PA_Nkbul_ae";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
