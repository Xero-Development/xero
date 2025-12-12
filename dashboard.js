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
