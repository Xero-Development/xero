// service.js
// Congrats, another file for me to babysit. This script fetches release data
// from the GitHub repo when the page loads. Adjust as needed.

async function fetchReleases() {
  const apiUrl = "https://api.github.com/repos/Xero-Development/The-X-Project/releases";

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("GitHub responded with sadness.");

    const releases = await response.json();

    // Expecting a <div class="releases"> somewhere on the page
    const container = document.querySelector(".releases");
    if (!container) return;

    container.innerHTML = releases
      .map(rel => `
        <div style='margin-bottom:1rem;padding:1rem;border:1px solid #333;border-radius:6px;'>
          <h3>${rel.name || rel.tag_name}</h3>
          <p>${rel.body ? rel.body.replace(/\n/g, "<br>") : "No description."}</p>
          <a href='${rel.html_url}' target='_blank' style='color:#6cf;'>View on GitHub</a>
        </div>
      `)
      .join("");
  } catch (err) {
    console.error(err);
    const container = document.querySelector(".releases");
    if (container) container.innerHTML = "Failed to load release data.";
  }
}

// Trigger the fetch when the page loads
window.addEventListener("DOMContentLoaded", fetchReleases);
