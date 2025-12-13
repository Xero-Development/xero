// x-main.js (Home page GitHub releases + download latest)
document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("releases");
  const btn = document.getElementById("downloadBtn");
  const text = document.getElementById("downloadText");

  // Releases list
  if (list) {
    list.innerHTML = '<li class="x-muted">Loading…</li>';
    try {
      const res = await fetch("https://api.github.com/repos/TeamX-Developments/The-X-Project/releases");
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
    } catch (e) {
      list.innerHTML = '<li class="x-muted">Failed to load releases.</li>';
    }
  }

  // Download latest
  if (btn && text) {
    try {
      const res = await fetch("https://api.github.com/repos/TeamX-Developments/The-X-Project/releases/latest");
      const release = await res.json();

      let url = release.html_url;
      let label = release.name || release.tag_name || "Latest";

      if (release.assets && release.assets.length > 0) {
        // Prefer first asset download link
        url = release.assets[0].browser_download_url;
      }

      btn.href = url;
      btn.textContent = `Download ${label}`;
      btn.style.display = "inline-flex";
      text.textContent = "Latest stable release available.";
    } catch (e) {
      text.textContent = "Failed to load latest release.";
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
});
