document.addEventListener("DOMContentLoaded", async () => {
  // UI: view switching + collapse
  const osShell = document.querySelector(".x-os");
  const collapseBtn = document.getElementById("collapseSide");
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

  collapseBtn?.addEventListener("click", () => {
    osShell.classList.toggle("collapsed");
    collapseBtn.textContent = osShell.classList.contains("collapsed") ? "Expand" : "Collapse";
  });

  // Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const rtStatus = document.getElementById("rtStatus");
  const liveClock = document.getElementById("liveClock");

  const onlineCount = document.getElementById("onlineCount");
  const onlineList = document.getElementById("onlineList");

  const appFeed = document.getElementById("appFeed");
  const appFeed2 = document.getElementById("appFeed2");

  const profileLine = document.getElementById("profileLine");
  const editBtn = document.getElementById("editProfileBtn");
  const editSection = document.getElementById("editProfileSection");
  const editForm = document.getElementById("editProfileForm");
  const editUsername = document.getElementById("editUsername");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editStatus = document.getElementById("editStatus");

  // Auth guard
  const { data: userData } = await window.sb.auth.getUser();
  const user = userData?.user;
  if (!user) {
    location.replace("./auth.html");
    return;
  }

  // Live clock
  const tick = () => (liveClock.textContent = new Date().toLocaleTimeString());
  tick();
  setInterval(tick, 1000);

  // Load profile username
  let currentUsername = user.user_metadata?.username || "";
  try {
    const { data: profile, error } = await window.sb
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && profile?.username) currentUsername = profile.username;
  } catch {}

  renderProfile(currentUsername, user.email, user.id);
  if (editUsername) editUsername.value = currentUsername || "";

  // Profile edit toggle
  editBtn?.addEventListener("click", () => {
    const open = editSection.style.display !== "none";
    editSection.style.display = open ? "none" : "block";
    editStatus.textContent = "";
    if (!open) editUsername.focus();
  });

  cancelEditBtn?.addEventListener("click", () => {
    editUsername.value = currentUsername || "";
    editStatus.textContent = "";
    editSection.style.display = "none";
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    editStatus.textContent = "Saving…";

    const next = (editUsername.value || "").trim();
    if (next.length < 2) return (editStatus.textContent = "Username must be at least 2 characters.");
    if (next.length > 32) return (editStatus.textContent = "Username must be 32 characters or fewer.");

    const { error: upsertErr } = await window.sb
      .from("profiles")
      .upsert({ id: user.id, username: next }, { onConflict: "id" });

    if (upsertErr) return (editStatus.textContent = upsertErr.message);

    const { error: metaErr } = await window.sb.auth.updateUser({ data: { username: next } });

    currentUsername = next;
    renderProfile(currentUsername, user.email, user.id);

    editStatus.textContent = metaErr ? "Saved (metadata sync failed)." : "Saved.";
    setTimeout(() => {
      editSection.style.display = "none";
      editStatus.textContent = "";
    }, 800);
  });

  // Logout
  logoutBtn?.addEventListener("click", async () => {
    try { await window.sb.auth.signOut(); } finally { location.replace("./index.html"); }
  });

  // Presence
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
          username: currentUsername || user.email || "User",
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
        ? people
            .map(p => `<li><strong>${escapeHtml(p.username || "User")}</strong> <span class="x-muted">(${escapeHtml(p.userId || "")})</span></li>`)
            .join("")
        : `<li class="x-muted">No one online.</li>`;
    }
  }

  // Apps realtime
  if (appFeed) appFeed.innerHTML = `<li class="x-muted">Waiting for updates…</li>`;
  if (appFeed2 && appFeed) appFeed2.innerHTML = appFeed.innerHTML;

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

  function renderProfile(username, email, id) {
    if (!profileLine) return;
    profileLine.innerHTML = `
      <strong>${escapeHtml(username || "(no username)")}</strong><br />
      <span class="x-muted">${escapeHtml(email || "")}</span><br />
      <span class="x-muted">User ID: <code>${escapeHtml(id)}</code></span>
    `;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Local stats (exact schema)
  const STATS_URL = "http://localhost:17361/v1/stats";
  const setText = (el, v) => { if (el) el.textContent = (v ?? "--"); };
  const el = (id) => document.getElementById(id);

  const osPlatform = el("osPlatform");
  const osRelease  = el("osRelease");
  const osArch     = el("osArch");
  const osHostname = el("osHostname");
  const osUptime   = el("osUptime");
  const osLoadavg  = el("osLoadavg");
  const osCores    = el("osCores");
  const osCpuModel = el("osCpuModel");

  const memTotal = el("memTotal");
  const memFree  = el("memFree");
  const procRss  = el("procRss");
  const procHeapUsed  = el("procHeapUsed");
  const procHeapTotal = el("procHeapTotal");

  const procCpu  = el("procCpu");
  const statsApi = el("statsApi");
  const statsRaw = el("statsRaw");

  function fmtUptime(sec) {
    const n = Number(sec);
    if (!Number.isFinite(n)) return String(sec ?? "--");
    const s = Math.max(0, Math.floor(n));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}h ${m}m ${r}s`;
  }
  function fmtLoadavg(v) {
    if (Array.isArray(v)) return v.map(x => Number(x).toFixed(2)).join(" / ");
    return v != null ? String(v) : "--";
  }
  function fmtPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? "--");
    return `${n.toFixed(1)}%`;
  }

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

      setText(osPlatform, s.os?.platform);
      setText(osRelease,  s.os?.release);
      setText(osArch,     s.os?.arch);
      setText(osHostname, s.os?.hostname);
      setText(osUptime,   fmtUptime(s.os?.uptimeSec));
      setText(osLoadavg,  fmtLoadavg(s.os?.loadavg));
      setText(osCores,    s.os?.cores != null ? String(s.os.cores) : "--");
      setText(osCpuModel, s.os?.cpuModel);

      setText(memTotal,      s.memory?.total);
      setText(memFree,       s.memory?.free);
      setText(procRss,       s.memory?.processRss);
      setText(procHeapUsed,  s.memory?.heapUsed);
      setText(procHeapTotal, s.memory?.heapTotal);

      setText(procCpu, fmtPercent(s.cpu?.processPercent));
    } catch (e) {
      setText(statsApi, "offline / blocked");
      if (statsRaw) {
        statsRaw.textContent =
          "Failed to fetch localhost stats.\n\nCommon causes:\n" +
          "- Site is https but stats is http://localhost (mixed content blocked)\n" +
          "- Missing CORS headers on the stats server\n" +
          "- Service not running on 17361\n";
      }
      [osPlatform, osRelease, osArch, osHostname, osUptime, osLoadavg, osCores, osCpuModel,
       memTotal, memFree, procRss, procHeapUsed, procHeapTotal, procCpu].forEach(x => setText(x, "--"));
    }
  }

  pollStats();
  setInterval(pollStats, 2000);
});
