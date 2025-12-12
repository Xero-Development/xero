document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("releases");
  if (!list) return;

  try {
    const res = await fetch(
      "https://api.github.com/repos/TeamX-Developments/The-X-Project/releases"
    );
    const releases = await res.json();

    list.innerHTML = releases.slice(0, 5).map(r => `
      <li class="x-release">
        <strong>${r.name || r.tag_name}</strong>
        <p>${r.body ? r.body.substring(0, 140) + "…" : "No description."}</p>
        <a href="${r.html_url}" target="_blank">View on GitHub</a>
      </li>
    `).join("");
  } catch (err) {
    list.innerHTML = "<li>Failed to load releases.</li>";
  }
});
