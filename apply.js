document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("applyForm");
  const status = document.getElementById("formStatus");

  form.addEventListener("submit", e => {
    e.preventDefault();

    const data = new FormData(form);
    const body = `
Name: ${data.get("name")}
Email: ${data.get("email")}
Discord: ${data.get("discord")}
Role: ${data.get("role")}

Why I want to join:
${data.get("message")}
    `.trim();

    const mailto = `mailto:teamxdevelopments@gmail.com?subject=PX-OS Application&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;

    status.textContent = "Opening your email client to submit the application…";
  });
});
