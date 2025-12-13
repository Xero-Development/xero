document.addEventListener("DOMContentLoaded", async () => {
  // ----------------------------
  // Elements (existing UI)
  // ----------------------------
  const logoutBtn = document.getElementById("logoutBtn");

  const rtStatus = document.getElementById("rtStatus");
  const liveClock = document.getElementById("liveClock");

  const onlineCount = document.getElementById("onlineCount");
  const onlineList = document.getElementById("onlineList");

  const appFeed = document.getElementById("appFeed");

  // OS sidebar
  const osRoot = document.querySelector(".x-os");
  const collapseBtn = document.getElementById("collapseSide");
  const items = document.querySelectorAll(".x-os-item");
  const views = document.querySelectorAll(".x-os-view");

  // OS status panel
  const osSession = document.getElementById("osSession");
  const osRealtime = document.getElementById("osRealtime");
  const osOnline = document.getElementById("osOnline");
  const osDbSync = document.getElementById("osDbSync");
  const osLatency = document.getElementById("osLatency");
  const osVersion = document.getElementById("osVersion");

  // Local stats panel
  const el = (id) => document.getElementById(id);

  const osPlatform = el("osPlatform");
  const osRelease  = el("osRelease");
  const osArch     = el("osArch");
  const osHostname = el("osHostname");
  const osUptime   = el("osUptime");
  const osLoadavg  = el("osLoadavg");
  const osCores    = el("osCores");
  const osCpuModel = el("osCpuModel");

  const memTotal   = el("memTotal");
  const memFree    = el("memFree");
  const procRss    = el("procRss");
  const procHeapUsed  = el("procHeapUsed");
  const procHeapTotal = el("procHeapTotal");
  const procCpu    = el("procCpu");

  const statsApi   = el("statsApi");
  const statsRaw   = el("statsRaw");

  // ----------------------------
  // Helpers
  // ----------------------------
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setText(node, value) {
    if (!node) return;
    node.textContent = value ?? "--";
  }

  function bytesToGB(b) {
    const n = Number(b);
    if (!Number.isFinite(n)) return String(b ?? "--");
    return `${(n / (1024 ** 3)).toFixed(2)} GB`;
  }

  function bytesToMB(b) {
    const n = Number(b);
    if (!Number.isFinite(n)) return String(b ?? "--");
    return `${(n / (1024 ** 2)).toFixed(0)} MB`;
  }

  function formatUptimeSeconds(sec) {
    const n = Number(sec);
    if (!Number.isFinite(n)) return String(sec ?? "--");
    const s = Math.max(0, Math.floor(n));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}h ${m}m ${r}s`;
  }

  function formatLoadavg(v) {
    if (Array.isArray(v)) return v.map(x => Number(x).toFixed(2)).join(" / ");
    if (typeof v === "string") return v;
    return v != null ? String(v) : "--";
  }

  function markDbSync() {
    if (osDbSync) osDbSync.textContent = new Date().toLocaleTimeString();
  }

  // Latency: external ping (works in browser)
  async function measureLatency() {
    const start = performance.now();
    try {
      await fetch("https://api.github.com/rate_limit", { cache: "no-store" });
      const ms = Math.round(performance.now() - start);
      if (osLatency) osLatency.textContent = `${ms} ms`;
    } catch {
      if (osLatency) osLatency.textContent = "offline";
    }
  }

  // Version: latest release tag (browser OK)
  async function loadVersion() {
    try {
      const res = await fetch("https://api.github.com/repos/TeamX-Developments/The-X-Project/releases/latest");
      const rel = await res.json();
      const ver = rel.tag_name || rel.name || "unknown";
      if (osVersion) osVersion.textContent = ver;
    } catch {
      if (osVersion) osVersion.textContent = "unknown";
    }
  }

  // ----------------------------
  // Sidebar switching + collapse
  // ----------------------------
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
    osRoot?.classList.toggle("collapsed");
    if (collapseBtn && osRoot) {
      collapseBtn.textContent = osRoot.classList.contains("collapsed") ? "Expand" : "Collapse";
    }
  });

  // ----------------------------
  // Auth guard
  // ----------------------------
  const { data: userData } = await window.sb.auth.getUser();
  const user = userData?.user;

  if (!user) {
    location.replace("./auth.html");
    return;
  }

  // OS session status
  if (osSession) osSession.textContent = "authenticated";

  // ----------------------------
  // Live clock
  // ----------------------------
  setInterval(() => {
    if (liveClock) liveClock.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // ----------------------------
  // Username for presence
  // ----------------------------
  let username = user.user_metadata?.username || "User";
  try {
    const { data: profile } = await window.sb
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.username) username = profile.username;
  } catch (_) {}

  // ----------------------------
  // Presence: online users
  // ----------------------------
  const presenceChannel = window.sb
    .channel("pxos-online")
    .on("presence", { event: "sync" }, () => renderPresence())
    .on("presence", { event: "join" }, () => renderPresence())
    .on("presence", { event: "leave" }, () => renderPresence())
    .subscribe(async (status) => {
      if (rtStatus) rtStatus.textContent = String(status).toLowerCase();
      if (osRealtime) osRealtime.textContent = String(status).toLowerCase();

      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          userId: user.id,
          username,
          online_at: new Date().toISOString()
        });
      }
    });

  function renderPresence() {
    const state = presenceChannel.presenceState();
    const people = [];

    Object.values(state).forEach((arr) => {
      (arr || []).forEach((p) => people.push(p));
    });

    if (onlineCount) onlineCount.textContent = String(people.length);
    if (osOnline) osOnline.textContent = String(people.length);

    if (onlineList) {
      onlineList.innerHTML = people.length
        ? people
            .map((p) =>
              `<li><strong>${escapeHtml(p.username || "User")}</strong> <span class="x-muted">(${escapeHtml(p.userId || "")})</span></li>`
            )
            .join("")
        : `<li class="x-muted">No one online.</li>`;
    }
  }

  // ----------------------------
  // Apps: realtime + refresh
  // ----------------------------
  if (appFeed) appFeed.innerHTML = `<li class="x-muted">Waiting for updates…</li>`;

  async function refreshMyApps() {
    const { data, error } = await window.sb
      .from("staff_applications")
      .select("id, role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      if (appFeed) appFeed.innerHTML = `<li class="x-muted">${escapeHtml(error.message)}</li>`;
      return;
    }

    if (!data || data.length === 0) {
      if (appFeed) appFeed.innerHTML = `<li class="x-muted">No applications yet.</li>`;
      markDbSync();
      return;
    }

    if (appFeed) {
      appFeed.innerHTML = data
        .map((a) => {
          const dt = a.created_at ? new Date(a.created_at).toLocaleString() : "";
          return `
            <li>
              <strong>${escapeHtml(a.role)}</strong>
              <span class="x-muted"> • ${escapeHtml(a.status)} • ${escapeHtml(dt)}</span>
            </li>
          `;
        })
        .join("");
    }

    markDbSync();
  }

  await refreshMyApps();

  window.sb
    .channel("pxos-apps-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "staff_applications" },
      async (payload) => {
        const row = payload.new || payload.old;
        if (row?.user_id && row.user_id !== user.id) return;
        await refreshMyApps();
      }
    )
    .subscribe((status) => {
      if (status && rtStatus) rtStatus.textContent = String(status).toLowerCase();
      if (status && osRealtime) osRealtime.textContent = String(status).toLowerCase();
    });

  // ----------------------------
  // Local stats polling (your API on 3301 /v2/stats)
  // ----------------------------
  const STATS_URLS = "http://localhost:3301/v2/stats",
 

  // CPU estimate (only works if renderer has node access; otherwise shows --)
  let lastCpu = null;
  let lastCpuTime = null;

  function estimateProcessCpuPercent(coresHint) {
    if (typeof process === "undefined" || typeof process.cpuUsage !== "function") return null;

    const now = performance.now();
    const u = process.cpuUsage();
    const totalMicros = (u.user || 0) + (u.system || 0);

    if (lastCpu == null || lastCpuTime == null) {
      lastCpu = { totalMicros };
      lastCpuTime = now;
      return null;
    }

    const deltaMicros = totalMicros - lastCpu.totalMicros;
    const deltaMs = now - lastCpuTime;

    lastCpu = { totalMicros };
    lastCpuTime = now;

    if (deltaMs <= 0) return null;

    const cores = Number(coresHint) || navigator.hardwareConcurrency || 1;
    const cpuMs = deltaMicros / 1000;
    const pct = (cpuMs / (deltaMs * cores)) * 100;

    return Math.max(0, Math.min(999, pct));
  }

  async function pollStats() {
    const started = performance.now();

    for (const url of STATS_URLS) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const ms = Math.round(performance.now() - started);

        setText(statsApi, `online (${ms} ms)`);
        if (statsRaw) statsRaw.textContent = JSON.stringify(data, null, 2);

        // This mapping matches the API-3301.js response shape:
        // data.platform.os / arch / release / cpus
        // data.host.hostname / totalmem / freemem / loadavg
        // data.uptime_sec
        // data.memory.rss / heap_used / heap_total

        const p = data.platform || {};
        const h = data.host || {};
        const m = data.memory || {};

        setText(osPlatform, p.os ?? "--");
        setText(osArch, p.arch ?? "--");
        setText(osRelease, p.release ?? "--");
        setText(osHostname, h.hostname ?? "--");
        setText(osCores, p.cpus != null ? String(p.cpus) : String(navigator.hardwareConcurrency || "--"));

        setText(osUptime, formatUptimeSeconds(data.uptime_sec));
        setText(osLoadavg, formatLoadavg(h.loadavg));

        // CPU model not provided by API-3301.js. Leave it blank unless you add it server-side.
        setText(osCpuModel, "--");

        setText(memTotal, h.totalmem != null ? bytesToGB(h.totalmem) : "--");
        setText(memFree,  h.freemem  != null ? bytesToGB(h.freemem)  : "--");

        setText(procRss, m.rss != null ? bytesToMB(m.rss) : "--");
        setText(procHeapUsed, m.heap_used != null ? bytesToMB(m.heap_used) : "--");
        setText(procHeapTotal, m.heap_total != null ? bytesToMB(m.heap_total) : "--");

        const estPct = estimateProcessCpuPercent(p.cpus);
        setText(procCpu, Number.isFinite(estPct) ? `${estPct.toFixed(1)}%` : "--");

        return;
      } catch (_) {
        // try next URL
      }
    }

    setText(statsApi, "offline / blocked");
    if (statsRaw) {
      statsRaw.textContent =
        "Failed to fetch localhost stats.\n\nCommon causes:\n" +
        "- Page is https but API is http://localhost (mixed content blocked)\n" +
        "- API not running on port 3301\n" +
        "- Browser/network blocks localhost\n";
    }
  }

  pollStats();
  setInterval(pollStats, 2000);

  // ----------------------------
  // OS misc background jobs
  // ----------------------------
  measureLatency();
  setInterval(measureLatency, 30000);
  loadVersion();

  // ----------------------------
  // Logout
  // ----------------------------
  logoutBtn?.addEventListener("click", async () => {
    try {
      await window.sb.auth.signOut();
    } finally {
      location.replace("./index.html");
    }
  });
});
