document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("releases");
  const btn = document.getElementById("downloadBtn");
  const text = document.getElementById("downloadText");

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  if (list) {
    list.innerHTML = '<li class="x-muted">Loading…</li>';
    try {
      const res = await fetch("https://api.github.com/repos/TeamX-Developments/The-X-Project/releases", { cache: "no-store" });
      const releases = await res.json();
      const items = (Array.isArray(releases) ? releases : []).slice(0, 6).map(r => {
        const title = r.name || r.tag_name || "Release";
        const desc = (r.body || "").trim().replace(/\r/g, "");
        const short = desc ? (desc.length > 160 ? desc.slice(0, 160) + "…" : desc) : "No description.";
        const date = r.published_at ? new Date(r.published_at).toLocaleString() : "";
        return `
          <li class="x-release">
            <div class="x-release-top">
              <strong>${escapeHtml(title)}</strong>
              <span class="x-muted x-small">${escapeHtml(date)}</span>
            </div>
            <p class="x-muted">${escapeHtml(short)}</p>
            <a href="${r.html_url}" target="_blank" rel="noopener">View on GitHub</a>
          </li>
        `;
      }).join("");
      list.innerHTML = items || '<li class="x-muted">No releases found.</li>';
    } catch {
      list.innerHTML = '<li class="x-muted">Failed to load releases.</li>';
    }
  }

  if (btn && text) {
    try {
      const res = await fetch("https://api.github.com/repos/TeamX-Developments/The-X-Project/releases/latest", { cache: "no-store" });
      const rel = await res.json();
      let url = rel.html_url;
      let label = rel.name || rel.tag_name || "Latest";
      if (rel.assets && rel.assets.length > 0) url = rel.assets[0].browser_download_url;

      btn.href = url;
      btn.textContent = `Download ${label}`;
      btn.style.display = "inline-flex";
      text.textContent = "Latest stable release available.";
    } catch {
      text.textContent = "Failed to load latest release.";
    }
  }
});
