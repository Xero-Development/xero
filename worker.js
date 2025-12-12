export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login") {
      const returnTo = url.searchParams.get("return");
      if (!returnTo) return new Response("Missing ?return", { status: 400 });

      // You must set this redirect URI in Discord Developer Portal:
      // e.g. https://YOUR-WORKER.yourname.workers.dev/callback
      const redirectUri = "https://discord.com/oauth2/authorize?client_id=1448874475348033577&response_type=code&redirect_uri=https%3A%2F%2Fteamx-developments.github.io%2Fx%2Fcallback&scope=identify";

      const scope = "identify"; // keep it minimal
      const state = btoa(JSON.stringify({ returnTo, t: Date.now() }))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

      const auth = new URL("https://discord.com/oauth2/authorize");
      auth.searchParams.set("client_id", "1448873457344315584");
      auth.searchParams.set("redirect_uri", redirectUri);
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", scope);
      auth.searchParams.set("state", state);

      return Response.redirect(auth.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return new Response("Missing code/state", { status: 400 });

      const decoded = JSON.parse(atob(state.replace(/-/g, "+").replace(/_/g, "/")));
      const returnTo = decoded.returnTo;

      // Exchange code for token (server-side; requires client secret). :contentReference[oaicite:4]{index=4}
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: "1448873457344315584",
          client_secret:"qNWmIvGGkSrz2aTMMYhWwJHpxjLUj8bV",
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUrl,
        }),
      });

      if (!tokenRes.ok) {
        return new Response(`Token exchange failed: ${await tokenRes.text()}`, { status: 400 });
      }

      const token = await tokenRes.json();

      // Fetch user profile (identify scope)
      // GET /users/@me is the “current user” endpoint in OAuth2 context. :contentReference[oaicite:5]{index=5}
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });

      if (!userRes.ok) {
        return new Response(`User fetch failed: ${await userRes.text()}`, { status: 400 });
      }

      const user = await userRes.json();

      // Pass minimal user data back to frontend (not a real secure session; just UI-level login)
      const minimal = {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar || null
      };

      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(minimal))))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

      // Put it in the fragment so it doesn’t hit logs as a query param
      return Response.redirect(`${returnTo}#px_user=${payload}`, 302);
    }

    return new Response("Not found", { status: 404 });
  }
}
