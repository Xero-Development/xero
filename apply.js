document.addEventListener("DOMContentLoaded", async () => {
  const gate = document.getElementById("applyGate");
  const card = document.getElementById("applyFormCard");
  const form = document.getElementById("applyForm");
  const status = document.getElementById("applyStatus");

  const { data: { user } } = await window.sb.auth.getUser();

  if (!user) {
    gate.innerHTML = `
      <h2>Login required</h2>
      <p class="x-muted">You need an account to submit an application.</p>
      <div class="x-row" style="margin-top:10px;">
        <a class="x-button" href="./auth.html">Login / Register</a>
      </div>
    `;
    return;
  }

  gate.style.display = "none";
  card.style.display = "block";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Submitting…";

    const role = document.getElementById("role").value;
    const message = document.getElementById("message").value.trim();

    const { error } = await window.sb
      .from("staff_applications")
      .insert([{ user_id: user.id, role, message }]);

    if (error) {
      status.textContent = error.message;
      return;
    }

    status.textContent = "Application submitted. If you're accepted, you'll be contacted.";
    form.reset();
  });
});
