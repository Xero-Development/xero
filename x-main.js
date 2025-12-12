document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("downloadBtn");
  const text = document.getElementById("downloadText");

  if (!btn || !text) return;

  try {
    const res = await fetch(
      "https://api.github.com/repos/TeamX-Developments/The-X-Project/releases/latest"
    );
    const release = await res.json();

    let url = release.html_url;
    let label = release.name || release.tag_name;

    if (release.assets && release.assets.length > 0) {
      url = release.assets[0].browser_download_url;
    }

    btn.href = url;
    btn.textContent = `Download ${label}`;
    btn.style.display = "inline-block";

    text.textContent = "Latest stable release available.";
  } catch (err) {
    text.textContent = "Failed to load latest release.";
  }
});
