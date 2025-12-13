document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logoutBtn");

  const rtStatus = document.getElementById("rtStatus");
  const liveClock = document.getElementById("liveClock");

  const onlineCount = document.getElementById("onlineCount");
  const onlineList = document.getElementById("onlineList");

  const appFeed = document.getElementById("appFeed");

  // Guard
  const { data: userData } = await window.sb.auth.getUser();
  const user = userData?.user;
  if (!user) {
    location.replace("./auth.html");
    return;
  }

  // --- Live Clock (fake-simple realtime, still realtime) ---
  setInterval(() => {
    liveClock.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // --- Get username for presence payload ---
  let username = user.user_metadata?.username || "User";
  try {
    const { data: profile } = await window.sb
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.username) username = profile.username;
  } catch (_) {}

  // --- Presence: Online users (Realtime Presence) ---
  // Presence basics + events: sync/join/leave are official. :contentReference[oaicite:4]{index=4}
  const presenceChannel = window.sb
    .channel("pxos-online")
    .on("presence", { event: "sync" }, () => renderPresence())
    .on("presence", { event: "join" }, () => renderPresence())
    .on("presence", { event: "leave" }, () => renderPresence())
    .subscribe(async (status) => {
      rtStatus.textContent = status.toLowerCase();

      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          userId: user.id,
          username,
          online_at: new Date().toISOString()
        });
      }
    });

  function renderPresence() {
    const state = presenceChannel.presenceState(); // official pattern :contentReference[oaicite:5]{index=5}
    const people = [];

    Object.values(state).forEach((arr) => {
      (arr || []).forEach((p) => people.push(p));
    });

    onlineCount.textContent = String(people.length);

    onlineList.innerHTML = people.length
      ? people
          .map((p) => `<li><strong>${escapeHtml(p.username || "User")}</strong> <span class="x-muted">(${escapeHtml(p.userId || "")})</span></li>`)
          .join("")
      : `<li class="x-muted">No one online.</li>`;
  }

  // --- Postgres Changes: live application updates ---
  // Official Postgres changes subscription uses .channel().on('postgres_changes', ...) :contentReference[oaicite:6]{index=6}
  // Note: RLS applies; with your current policies, users will only see their own rows.
  appFeed.innerHTML = `<li class="x-muted">Waiting for updates…</li>`;

  // Initial load: your applications
  await refreshMyApps();

  const appsChannel = window.sb
    .channel("pxos-apps-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "staff_applications" },
      async (payload) => {
        // Only show events related to this user (extra safety)
        const row = payload.new || payload.old;
        if (row?.user_id && row.user_id !== user.id) return;

        // Update feed
        await refreshMyApps();
      }
    )
    .subscribe((status) => {
      // Keep status visible, because realtime debugging is everyone’s favorite hobby.
      if (status && rtStatus) rtStatus.textContent = status.toLowerCase();
    });

  async function refreshMyApps() {
    const { data, error } = await window.sb
      .from("staff_applications")
      .select("id, role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      appFeed.innerHTML = `<li class="x-muted">${escapeHtml(error.message)}</li>`;
      return;
    }

    if (!data || data.length === 0) {
      appFeed.innerHTML = `<li class="x-muted">No applications yet.</li>`;
      return;
    }

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

  // Logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.sb.auth.signOut();
    } finally {
      location.replace("./index.html");
    }
  });

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
});
// OS sidebar view switching + collapse
document.addEventListener("DOMContentLoaded", () => {
  const os = document.querySelector(".x-os");
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
    os.classList.toggle("collapsed");
    collapseBtn.textContent = os.classList.contains("collapsed") ? "Expand" : "Collapse";
  });
});
// ---- OS STATUS PANEL ----
const osSession = document.getElementById("osSession");
const osRealtime = document.getElementById("osRealtime");
const osOnline = document.getElementById("osOnline");
const osDbSync = document.getElementById("osDbSync");
const osLatency = document.getElementById("osLatency");
const osVersion = document.getElementById("osVersion");

// Session
if (osSession) osSession.textContent = user ? "authenticated" : "signed out";

// Realtime (mirrors rtStatus)
if (osRealtime && rtStatus) osRealtime.textContent = rtStatus.textContent || "starting…";

// Online (mirrors sidebar counter)
const onlineCounterEl = document.getElementById("onlineCount");
if (osOnline && onlineCounterEl) osOnline.textContent = onlineCounterEl.textContent || "0";

// DB sync time will be updated when apps refresh
function markDbSync() {
  if (osDbSync) osDbSync.textContent = new Date().toLocaleTimeString();
}

// Latency: quick fetch timing to GitHub API (works everywhere)
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
measureLatency();
setInterval(measureLatency, 30000);

// PX-OS Version: latest release tag
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
loadVersion();

// Keep osRealtime in sync whenever rtStatus changes
const rtObserver = new MutationObserver(() => {
  if (osRealtime && rtStatus) osRealtime.textContent = rtStatus.textContent || "starting…";
});
if (rtStatus) rtObserver.observe(rtStatus, { childList: true, subtree: true });

// Hook DB sync marker into your app refresh
// Call markDbSync() at the end of refreshMyApps()
// ---- Local OS + Process stats from localhost:17361/v1/stats ----
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

const STATS_URLS = [
  "http://127.0.0.1:17361/v1/stats",
  "http://localhost:17361/v1/stats",
  "https://127.0.0.1:17361/v1/stats",
  "https://localhost:17361/v1/stats",
];

// For CPU% estimate in Electron (between calls)
let lastCpu = null;        // { totalMicros }
let lastCpuTime = null;    // performance.now()

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

function estimateProcessCpuPercent(coresHint) {
  // If we're in Electron with node access:
  if (typeof process === "undefined" || typeof process.cpuUsage !== "function") return null;

  const now = performance.now();
  const u = process.cpuUsage(); // microseconds since process start
  const totalMicros = (u.user || 0) + (u.system || 0);

  if (lastCpu == null || lastCpuTime == null) {
    lastCpu = { totalMicros };
    lastCpuTime = now;
    return null; // need a previous sample
  }

  const deltaMicros = totalMicros - lastCpu.totalMicros;
  const deltaMs = now - lastCpuTime;

  lastCpu = { totalMicros };
  lastCpuTime = now;

  if (deltaMs <= 0) return null;

  const cores = Number(coresHint) || navigator.hardwareConcurrency || 1;

  // deltaMicros is CPU time used across all threads in that interval.
  // Convert to ms and normalize by wall time * cores.
  const cpuMs = deltaMicros / 1000;
  const pct = (cpuMs / (deltaMs * cores)) * 100;

  return Math.max(0, Math.min(999, pct));
}

function getElectronMemoryFallback() {
  // Electron renderer with nodeIntegration: process.memoryUsage exists
  if (typeof process !== "undefined" && typeof process.memoryUsage === "function") {
    const m = process.memoryUsage();
    return { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal };
  }

  // Browser fallback (Chrome-only-ish)
  const pm = (performance && performance.memory) ? performance.memory : null;
  if (pm) {
    return { rss: null, heapUsed: pm.usedJSHeapSize, heapTotal: pm.totalJSHeapSize };
  }

  return null;
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

      // OS fields (use your requested keys, but tolerate nesting)
      setText(osPlatform, data.platform ?? data.os?.platform);
      setText(osRelease,  data.release  ?? data.os?.release);
      setText(osArch,     data.arch     ?? data.os?.arch);
      setText(osHostname, data.hostname ?? data.os?.hostname);
      setText(osUptime,   formatUptimeSeconds(data.uptime ?? data.os?.uptime));
      setText(osLoadavg,  formatLoadavg(data.loadavg ?? data.os?.loadavg));
      setText(osCores,    String(data.cores ?? data.os?.cores ?? navigator.hardwareConcurrency ?? "--"));
      setText(osCpuModel, data.cpuModel ?? data.os?.cpuModel ?? data.cpu?.model);

      // Memory: total/free
      const total = data.memory?.total ?? data.mem?.total ?? data.totalMemory ?? data.os?.memoryTotal;
      const free  = data.memory?.free  ?? data.mem?.free  ?? data.freeMemory  ?? data.os?.memoryFree;

      setText(memTotal, total != null ? bytesToGB(total) : "--");
      setText(memFree,  free  != null ? bytesToGB(free)  : "--");

      // Electron process memory: prefer API, fallback to local
      const apiProc = data.process ?? data.electron ?? null;
      const fallbackProc = getElectronMemoryFallback();

      const rssVal = apiProc?.rss ?? apiProc?.memory?.rss ?? fallbackProc?.rss ?? null;
      const heapUsedVal  = apiProc?.heapUsed  ?? apiProc?.memory?.heapUsed  ?? fallbackProc?.heapUsed  ?? null;
      const heapTotalVal = apiProc?.heapTotal ?? apiProc?.memory?.heapTotal ?? fallbackProc?.heapTotal ?? null;

      setText(procRss, rssVal != null ? bytesToMB(rssVal) : "--");
      setText(procHeapUsed, heapUsedVal != null ? bytesToMB(heapUsedVal) : "--");
      setText(procHeapTotal, heapTotalVal != null ? bytesToMB(heapTotalVal) : "--");

      // CPU: process CPU % estimated between calls
      // Prefer API-provided percent, else estimate locally (Electron only)
      const apiCpuPct = apiProc?.cpuPercent ?? apiProc?.cpu?.percent ?? null;
      const estPct = estimateProcessCpuPercent(data.cores ?? data.os?.cores);

      const pct = apiCpuPct != null ? Number(apiCpuPct) : estPct;
      setText(procCpu, Number.isFinite(pct) ? `${pct.toFixed(1)}%` : (apiCpuPct != null ? String(apiCpuPct) : "--"));

      return; // success, stop trying URLs
    } catch (e) {
      // try next URL
    }
  }

  // All failed
  setText(statsApi, "offline / blocked");
  if (statsRaw) {
    statsRaw.textContent =
      "Failed to fetch localhost stats.\n\nCommon causes:\n" +
      "- GitHub Pages is https but stats is http://localhost (mixed content blocked)\n" +
      "- Your stats API is missing CORS headers\n" +
      "- Service not running on port 17361\n";
  }
}

pollStats();
setInterval(pollStats, 2000);
