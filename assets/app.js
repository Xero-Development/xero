(function(){
  const cfg = window.XP_CONFIG || {};
  const clientId = cfg.DISCORD_CLIENT_ID || "";
  const scopes = (cfg.DISCORD_SCOPES || ["identify"]).join(" ");
  const TOKEN_KEY = "xp_discord_token";
  const ME_KEY = "xp_discord_me";

  function basePath(){
    // Works for https://user.github.io/repo/ and for custom domains
    const p = location.pathname;
    // If we're on /something/page/index.html, base is /something/page/
    return p.endsWith(".html") ? p.replace(/[^/]+$/, "") : (p.endsWith("/") ? p : p + "/");
  }

  function redirectUri(){
    return location.origin + basePath() + "auth/callback/";
  }

  function setToken(tok){ sessionStorage.setItem(TOKEN_KEY, tok); }
  function getToken(){ return sessionStorage.getItem(TOKEN_KEY); }
  function clearToken(){
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ME_KEY);
  }

  function outMe(el, me){
    if(!el) return;
    if(!me){
      el.textContent = "Not logged in.";
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "who";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.alt = "avatar";
    avatar.src = me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(Number(me.discriminator||0)%5)}.png`;

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "whoName";
    name.textContent = `${me.username}#${me.discriminator || "0000"}`;
    const muted = document.createElement("div");
    muted.className = "muted";
    muted.textContent = me.email ? me.email : "Logged in via Discord";
    info.appendChild(name);
    info.appendChild(muted);

    wrap.appendChild(avatar);
    wrap.appendChild(info);

    el.innerHTML = "";
    el.appendChild(wrap);
  }

  async function fetchMe(){
    const tok = getToken();
    if(!tok) return null;

    // cached
    const cached = sessionStorage.getItem(ME_KEY);
    if(cached){
      try { return JSON.parse(cached); } catch {}
    }

    const r = await fetch("https://discord.com/api/users/@me", {
      headers: { "Authorization": `Bearer ${tok}` }
    });
    if(!r.ok) return null;
    const me = await r.json();
    sessionStorage.setItem(ME_KEY, JSON.stringify(me));
    return me;
  }

  function loginUrl(){
    if(!clientId) throw new Error("Missing DISCORD_CLIENT_ID in assets/config.js");
    const state = crypto.getRandomValues(new Uint8Array(16));
    const stateStr = btoa(String.fromCharCode(...state)).replace(/=+$/,"");
    sessionStorage.setItem("xp_oauth_state", stateStr);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "token", // implicit grant
      scope: scopes,
      state: stateStr,
      prompt: "consent"
    });

    return "https://discord.com/api/oauth2/authorize?" + params.toString();
  }

  function getEmbeddedReleases(){
    const node = document.getElementById("embedded-releases");
    if(!node) return [];
    try { return JSON.parse(node.textContent || "[]"); } catch { return []; }
  }

  function renderReleases(){
    const list = document.getElementById("releaseList");
    if(!list) return;
    const releases = getEmbeddedReleases();
    list.innerHTML = "";

    if(!releases.length){
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = "No releases embedded yet. Edit the JSON inside index.html.";
      list.appendChild(p);
      return;
    }

    for(const r of releases){
      const card = document.createElement("div");
      card.className = "release";

      const top = document.createElement("div");
      top.className = "releaseTop";

      const left = document.createElement("div");
      const tag = document.createElement("div");
      tag.className = "relTag";
      tag.textContent = `${r.tag || "v0.0.0"}  •  ${r.title || ""}`.trim();
      const meta = document.createElement("div");
      meta.className = "relMeta";
      meta.textContent = r.date ? `Published: ${r.date}` : "";
      left.appendChild(tag);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "relMeta";
      right.textContent = (r.assets && r.assets.length) ? `${r.assets.length} asset(s)` : "";

      top.appendChild(left);
      top.appendChild(right);

      const notes = document.createElement("div");
      notes.className = "relNotes";
      notes.textContent = r.notes || "";

      card.appendChild(top);
      if(r.notes) card.appendChild(notes);

      if(r.assets && r.assets.length){
        const assets = document.createElement("div");
        assets.className = "assetList";
        for(const a of r.assets){
          const link = document.createElement("a");
          link.className = "asset";
          link.href = a.url || "#";
          link.textContent = a.name || "asset";
          link.target = "_blank";
          link.rel = "noopener";
          assets.appendChild(link);
        }
        card.appendChild(assets);
      }

      list.appendChild(card);
    }
  }

  async function wireAuthUI(){
    const meBox = document.getElementById("meBox");
    const navLogin = document.getElementById("navLogin");
    const navLogout = document.getElementById("navLogout");
    const btnDiscord = document.getElementById("btnDiscord");

    const tok = getToken();
    let me = null;
    if(tok) me = await fetchMe();

    if(me){
      outMe(meBox, me);
      if(navLogin) navLogin.style.display = "none";
      if(navLogout) navLogout.style.display = "inline-flex";
      if(btnDiscord) btnDiscord.textContent = "Re-login with Discord";
    } else {
      outMe(meBox, null);
      if(navLogin) navLogin.style.display = "inline-flex";
      if(navLogout) navLogout.style.display = "none";
      if(btnDiscord) btnDiscord.textContent = "Login with Discord";
    }

    // attach login
    if(btnDiscord){
      btnDiscord.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = loginUrl();
      });
    }

    // logout
    if(navLogout){
      navLogout.addEventListener("click", (e) => {
        e.preventDefault();
        clearToken();
        location.href = "./";
      });
    }
  }

  window.XP = {
    loginUrl,
    setToken,
    getToken,
    clearToken,
    fetchMe,
    renderReleases,
    wireAuthUI,
    redirectUri
  };
})();
