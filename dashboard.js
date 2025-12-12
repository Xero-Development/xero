document.addEventListener("DOMContentLoaded", async () => {
  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const setText = (el, v) => { if (el) el.textContent = (v ?? "--"); };
  const escapeHtml = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  // ---------- OS navigation ----------
  const items = document.querySelectorAll(".x-os-item");
  const views = document.querySelectorAll(".x-os-view");
  items.forEach(btn => {
    btn.addEventListener("click", () => {
      items.forEach(b => b.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      const view = document.getElementById(btn.dataset.view);
      if (view) view.classList.add("active");
    });
  });

  // ---------- elements ----------
  const logoutBtn = $("logoutBtn");
  const rtStatus = $("rtStatus");
  const liveClock = $("liveClock");
  const onlineCount = $("onlineCount");
  const onlineList = $("onlineList");
  const appFeed = $("appFeed");
  const appFeed2 = $("appFeed2");

  const sideUser = $("sideUser");

  // Profile UI
  const profileLine = $("profileLine");
  const discordLine = $("discordLine");
  const avatarPreview = $("avatarPreview");
  const toggleProfileEdit = $("toggleProfileEdit");
  const profileEditor = $("profileEditor");
  const profileForm = $("profileForm");
  const cancelProfileEdit = $("cancelProfileEdit");
  const profileStatus = $("profileStatus");
  const pfUsername = $("pfUsername");
  const pfDisplayName = $("pfDisplayName");
  const pfAvatarUrl = $("pfAvatarUrl");
  const importDiscord = $("importDiscord");

  // Stats UI
  const statsApi = $("statsApi");
  const statsRaw = $("statsRaw");

  // Quick status (overview)
  const osPlatform = $("osPlatform");
  const osRelease = $("osRelease");
  const osArch = $("osArch");
  const osHostname = $("osHostname");
  const osUptime = $("osUptime");
  const procCpu = $("procCpu");

  // Full stats (stats view)
  const osPlatform2 = $("osPlatform2");
  const osRelease2 = $("osRelease2");
  const osArch2 = $("osArch2");
  const osHostname2 = $("osHostname2");
  const osUptime2 = $("osUptime2");
  const osLoadavg2 = $("osLoadavg2");
  const osCores2 = $("osCores2");
  const osCpuModel2 = $("osCpuModel2");

  const memTotal2 = $("memTotal2");
  const memFree2 = $("memFree2");
  const procRss2 = $("procRss2");
  const heapUsed2 = $("heapUsed2");
  const heapTotal2 = $("heapTotal2");
  const procCpu2 = $("procCpu2");
  const statsTs2 = $("statsTs2");

  // ---------- auth guard ----------
  const { data: userData } = await window.sb.auth.getUser();
  const user = userData?.user;
  if (!user) { location.replace("./auth.html"); return; }

  // Clock
  const tick = () => (liveClock.textContent = new Date().toLocaleTimeString());
  tick(); setInterval(tick, 1000);

  // Logout
  logoutBtn?.addEventListener("click", async () => {
    try { await window.sb.auth.signOut(); } finally { location.replace("./index.html"); }
  });

  // ---------- load profile ----------
  let profile = {
    username: user.user_metadata?.username || "",
    display_name: user.user_metadata?.display_name || "",
    avatar_url: user.user_metadata?.avatar_url || "",
    discord_id: null,
    discord_username: null,
  };

  async function loadProfile() {
    const { data, error } = await window.sb
      .from("profiles")
      .select("username, display_name, avatar_url, discord_id, discord_username")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) profile = { ...profile, ...data };

    // render
    const shownName = profile.display_name || profile.username || "(no name)";
    setText(sideUser, shownName);

    if (profileLine) {
      profileLine.innerHTML = `
        <strong>${escapeHtml(shownName)}</strong><br/>
        <span class="x-muted">${escapeHtml(user.email || "")}</span><br/>
        <span class="x-muted">User ID: <code>${escapeHtml(user.id)}</code></span>
      `;
    }

    if (discordLine) {
      discordLine.textContent = profile.discord_id
        ? `${profile.discord_username || "discord user"} (${profile.discord_id})`
        : "Not linked";
    }

    if (avatarPreview) {
      avatarPreview.src = profile.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png";
    }

    if (pfUsername) pfUsername.value = profile.username || "";
    if (pfDisplayName) pfDisplayName.value = profile.display_name || "";
    if (pfAvatarUrl) pfAvatarUrl.value = profile.avatar_url || "";
  }

  await loadProfile();

  // ---------- profile editor ----------
  toggleProfileEdit?.addEventListener("click", () => {
    const open = profileEditor.style.display !== "none";
    profileEditor.style.display = open ? "none" : "block";
    profileStatus.textContent = "";
    if (!open) pfUsername.focus();
  });

  cancelProfileEdit?.addEventListener("click", () => {
    profileEditor.style.display = "none";
    profileStatus.textContent = "";
    pfUsername.value = profile.username || "";
    pfDisplayName.value = profile.display_name || "";
    pfAvatarUrl.value = profile.avatar_url || "";
  });

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    profileStatus.textContent = "Saving…";

    const username = (pfUsername.value || "").trim();
    const display_name = (pfDisplayName.value || "").trim();
    const avatar_url = (pfAvatarUrl.value || "").trim();

    if (username.length < 2) return (profileStatus.textContent = "Username must be at least 2 characters.");
    if (username.length > 32) return (profileStatus.textContent = "Username must be 32 characters or fewer.");
    if (display_name.length > 48) return (profileStatus.textContent = "Display name is too long (max 48).");

    const { error } = await window.sb.from("profiles").upsert({
      id: user.id,
      username,
      display_name,
      avatar_url
    }, { onConflict: "id" });

    if (error) return (profileStatus.textContent = error.message);

    // keep auth metadata loosely in sync (optional)
    await window.sb.auth.updateUser({ data: { username, display_name, avatar_url } });

    profile = { ...profile, username, display_name, avatar_url };
    await loadProfile();
    profileStatus.textContent = "Saved.";
    setTimeout(() => { profileEditor.style.display = "none"; profileStatus.textContent = ""; }, 700);
  });

  // ---------- Discord import ----------
  // Works if the user signed in via Supabase Discord provider (session.provider_token exists).
  importDiscord?.addEventListener("click", async () => {
    profileStatus.textContent = "Importing from Discord…";

    const { data: sessData } = await window.sb.auth.getSession();
    const session = sessData?.session;
    const token = session?.provider_token;

    if (!token) {
      profileStatus.textContent =
        "No Discord OAuth token found. Log in with Discord (Supabase provider) to import.";
      return;
    }

    try {
      const res = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Discord API HTTP ${res.status}`);
      const me = await res.json();

      const discord_id = me.id;
      const discord_username = me.username;
      const display_name = me.global_name || me.username || "";
      const avatar_url = me.avatar
        ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

      const { error } = await window.sb.from("profiles").upsert({
        id: user.id,
        discord_id,
        discord_username,
        display_name: profile.display_name || display_name,
        avatar_url: profile.avatar_url || avatar_url
      }, { onConflict: "id" });

      if (error) throw new Error(error.message);

      profileStatus.textContent = "Imported from Discord.";
      await loadProfile();
    } catch (err) {
      profileStatus.textContent = `Import failed: ${err.message || err}`;
    }
  });

  // ---------- Presence (online users) ----------
  if (onlineList) onlineList.innerHTML = `<li class="x-muted">Loading…</li>`;
  if (onlineCount) onlineCount.textContent = "0";

  const presenceChannel = window.sb
    .channel("pxos-online")
    .on("presence", { event: "sync" }, () => renderPresence())
    .on("presence", { event: "join" }, () => renderPresence())
    .on("presence", { event: "leave" }, () => renderPresence())
    .subscribe(async (status) => {
      if (rtStatus) rtStatus.textContent = status.toLowerCase();
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          userId: user.id,
          username: profile.display_name || profile.username || user.email || "User",
          online_at: new Date().toISOString()
        });
      }
    });

  function renderPresence() {
    const state = presenceChannel.presenceState();
    const people = [];
    Object.values(state).forEach(arr => (arr || []).forEach(p => people.push(p)));

    if (onlineCount) onlineCount.textContent = String(people.length);
    if (onlineList) {
      onlineList.innerHTML = people.length
        ? people.map(p =>
            `<li><strong>${escapeHtml(p.username || "User")}</strong> <span class="x-muted">(${escapeHtml(p.userId || "")})</span></li>`
          ).join("")
        : `<li class="x-muted">No one online.</li>`;
    }
  }

  // ---------- staff_applications realtime ----------
  if (appFeed) appFeed.innerHTML = `<li class="x-muted">Waiting for updates…</li>`;
  if (appFeed2) appFeed2.innerHTML = appFeed.innerHTML;

  await refreshMyApps();

  window.sb
    .channel("pxos-apps-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "staff_applications" }, async (payload) => {
      const row = payload.new || payload.old;
      if (row?.user_id && row.user_id !== user.id) return;
      await refreshMyApps();
    })
    .subscribe((status) => {
      if (rtStatus && status) rtStatus.textContent = status.toLowerCase();
    });

  async function refreshMyApps() {
    const { data, error } = await window.sb
      .from("staff_applications")
      .select("id, role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const html = error
      ? `<li class="x-muted">${escapeHtml(error.message)}</li>`
      : (!data || data.length === 0)
        ? `<li class="x-muted">No applications yet.</li>`
        : data.map(a => {
            const dt = a.created_at ? new Date(a.created_at).toLocaleString() : "";
            return `<li><strong>${escapeHtml(a.role)}</strong> <span class="x-muted">• ${escapeHtml(a.status)} • ${escapeHtml(dt)}</span></li>`;
          }).join("");

    if (appFeed) appFeed.innerHTML = html;
    if (appFeed2) appFeed2.innerHTML = html;
  }

  // ---------- Local stats reader (your schema) ----------
  const STATS_URL = "http://127.0.0.1:17361/v1/stats";

  const fmtUptime = (sec) => {
    const n = Number(sec);
    if (!Number.isFinite(n)) return String(sec ?? "--");
    const s = Math.max(0, Math.floor(n));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}h ${m}m ${r}s`;
  };

  const fmtLoadavg = (v) => Array.isArray(v) ? v.map(x => Number(x).toFixed(2)).join(" / ") : (v ?? "--");
  const fmtPercent = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : (v ?? "--");
  };

  async function pollStats() {
    const start = performance.now();
    try {
      const res = await fetch(STATS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      const ms = Math.round(performance.now() - start);
      setText(statsApi, `online (${ms} ms)`);

      if (statsRaw) statsRaw.textContent = JSON.stringify(payload, null, 2);

      const s = payload?.stats;
      if (!s?.ok) throw new Error("stats.ok is false");

      // overview quick
      setText(osPlatform, s.os?.platform);
      setText(osRelease, s.os?.release);
      setText(osArch, s.os?.arch);
      setText(osHostname, s.os?.hostname);
      setText(osUptime, fmtUptime(s.os?.uptimeSec));
      setText(procCpu, fmtPercent(s.cpu?.processPercent));

      // full stats
      setText(osPlatform2, s.os?.platform);
      setText(osRelease2, s.os?.release);
      setText(osArch2, s.os?.arch);
      setText(osHostname2, s.os?.hostname);
      setText(osUptime2, fmtUptime(s.os?.uptimeSec));
      setText(osLoadavg2, fmtLoadavg(s.os?.loadavg));
      setText(osCores2, s.os?.cores != null ? String(s.os.cores) : "--");
      setText(osCpuModel2, s.os?.cpuModel);

      // your memory fields are already formatted as strings by bytes()
      setText(memTotal2, s.memory?.total);
      setText(memFree2, s.memory?.free);
      setText(procRss2, s.memory?.processRss);
      setText(heapUsed2, s.memory?.heapUsed);
      setText(heapTotal2, s.memory?.heapTotal);

      setText(procCpu2, fmtPercent(s.cpu?.processPercent));
      setText(statsTs2, s.ts || "--");
    } catch (e) {
      setText(statsApi, "offline / blocked");
      if (statsRaw) {
        statsRaw.textContent =
          "Failed to fetch 127.0.0.1 stats.\n\nCommon causes:\n" +
          "- Website is https but stats is http (mixed content blocked)\n" +
          "- Missing CORS headers on the stats server\n" +
          "- Service not running on port 17361\n";
      }
      [
        osPlatform, osRelease, osArch, osHostname, osUptime, procCpu,
        osPlatform2, osRelease2, osArch2, osHostname2, osUptime2, osLoadavg2, osCores2, osCpuModel2,
        memTotal2, memFree2, procRss2, heapUsed2, heapTotal2, procCpu2, statsTs2
      ].forEach(x => setText(x, "--"));
    }
  }

  pollStats();
  setInterval(pollStats, 2000);
});
