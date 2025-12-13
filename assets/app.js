(function(){
  const cfg = window.XP_CONFIG || {};
  const clientId = cfg.DISCORD_CLIENT_ID || "";
  const scopes = (cfg.DISCORD_SCOPES || ["identify"]).join(" ");
  const TOKEN_KEY = "xp_discord_token";
  const ME_KEY = "xp_discord_me";

  function basePath(){
    const bp = (cfg.BASE_PATH || "").trim();
    if(!bp || bp === "/") return "";
    return bp.startsWith("/") ? bp : ("/" + bp);
  }

  function redirectUri(){
    return location.origin + basePath() + "/auth/collback/";
  }

  function setToken(tok){ sessionStorage.setItem(TOKEN_KEY, tok); }
  function getToken(){ return sessionStorage.getItem(TOKEN_KEY); }
  function clearToken(){ sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(ME_KEY); }

  async function fetchMe(){
    const tok = getToken();
    if(!tok) return null;

    const cached = sessionStorage.getItem(ME_KEY);
    if(cached){ try { return JSON.parse(cached); } catch {} }

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

    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    const stateStr = btoa(String.fromCharCode(...stateBytes)).replace(/=+$/,"");
    sessionStorage.setItem("xp_oauth_state", stateStr);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "token",   // implicit grant for static hosting
      scope: scopes,
      state: stateStr,
      prompt: "consent"
    });

    return "https://discord.com/oauth2/authorize?" + params.toString();
  }

  function outMe(el, me){
    if(!el) return;
    if(!me){ el.textContent = "Not logged in."; return; }

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

  function getEmbeddedReleases(){
    const node = document.getElementById("embedded-releases");
    if(!node) return [];
    try { return JSON.parse(node.textContent || "[]"); } catch { return []; }
  }

  function normalizeRelease(r){
    return {
      tag: r.tag_name || r.tag || "v0.0.0",
      title: r.name || r.title || "",
      date: (r.published_at || r.date || "").slice(0, 10),
      notes: r.body || r.notes || "",
      url: r.html_url || r.url || "",
      assets: (r.assets || []).map(a => ({
        name: a.name,
        url: a.browser_download_url || a.url || "#"
      }))
    };
  }

  function renderReleases(releases){
    const list = document.getElementById("releaseList");
    if(!list) return;

    list.innerHTML = "";
    if(!releases || !releases.length){
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = "No releases found.";
      list.appendChild(p);
      return;
    }

    for(const r0 of releases){
      const r = normalizeRelease(r0);

      const card = document.createElement("div");
      card.className = "release";

      const top = document.createElement("div");
      top.className = "releaseTop";

      const left = document.createElement("div");
      const tag = document.createElement("div");
      tag.className = "relTag";
      tag.textContent = `${r.tag}  •  ${r.title}`.trim();
      const meta = document.createElement("div");
      meta.className = "relMeta";
      meta.textContent = r.date ? `Published: ${r.date}` : "";
      left.appendChild(tag);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "relMeta";
      right.textContent = r.assets.length ? `${r.assets.length} asset(s)` : "";

      top.appendChild(left);
      top.appendChild(right);

      card.appendChild(top);

      if(r.notes){
        const notes = document.createElement("div");
        notes.className = "relNotes";
        notes.textContent = r.notes;
        card.appendChild(notes);
      }

      if(r.assets.length){
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
      } else if (r.url) {
        const assets = document.createElement("div");
        assets.className = "assetList";
        const link = document.createElement("a");
        link.className = "asset";
        link.href = r.url;
        link.textContent = "View on GitHub";
        link.target = "_blank";
        link.rel = "noopener";
        assets.appendChild(link);
        card.appendChild(assets);
      }

      list.appendChild(card);
    }
  }

  async function loadReleases(){
    // render embedded first
    const embedded = getEmbeddedReleases();
    if(embedded.length) renderReleases(embedded);

    const owner = cfg.REPO_OWNER;
    const repo = cfg.REPO_NAME;
    if(!owner || !repo) return;

    try{
      const api = `https://github.com/TeamX-Developments/The-X-Project/releases`;
      const r = await fetch(api, { headers: { "Accept": "application/vnd.github+json" }});
      if(!r.ok) return;
      const j = await r.json();
      if(Array.isArray(j) && j.length) renderReleases(j);
    } catch {}
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

    if(btnDiscord){
      btnDiscord.addEventListener("click", (e)=>{ e.preventDefault(); location.href = loginUrl(); });
    }
    if(navLogout){
      navLogout.addEventListener("click", (e)=>{ e.preventDefault(); clearToken(); location.href = basePath() + "/"; });
    }
  }

  window.XP = { loginUrl, redirectUri, setToken, getToken, clearToken, fetchMe, wireAuthUI, loadReleases };
})();
