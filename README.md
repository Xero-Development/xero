# PX-OS Web

Static site + Supabase Auth + Realtime + Local stats.

- Home pulls GitHub releases.
- Auth uses Supabase email/password.
- Dashboard: OS-like UI + presence + staff_applications live updates.
- Local agent endpoint: http://localhost:17361/v1/stats
  expects payload.stats.ok + payload.stats.os/memory/cpu as in your sample.

Notes:
- If hosted over https, browsers may block http://localhost calls (mixed content).
- Your stats server must send CORS headers.
