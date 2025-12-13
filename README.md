# PX-OS Website (GitHub Pages)

This is a static site styled with x-*.css and powered by:
- GitHub Releases API (Home page)
- Supabase Auth (email/password)
- Supabase table insert for staff applications

## 1) GitHub Pages
Enable Pages in your repo settings:
- Deploy from branch: `main`
- Folder: `/ (root)`

## 2) Supabase setup
1. Create a Supabase project
2. In Supabase: Auth → URL Configuration
   - Set Site URL to your GitHub Pages URL (example: https://username.github.io/repo/)
   - Add redirect URLs you will use (auth.html, dashboard.html)
3. Copy your project URL + anon key into `supabase-client.js`

## 3) Database tables
Run `schema.sql` in Supabase SQL editor.

## 4) Files
- index.html: Home (releases + download latest)
- about.html, docs.html, support.html, apply.html
- auth.html: Supabase login/register
- dashboard.html: requires login

## Notes
- Use the SUPABASE *anon* key in the browser. Never expose a service_role key.
