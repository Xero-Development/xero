(function(){
  const cfg = window.XP_CONFIG || {};
  const basePath = (cfg.BASE_PATH && cfg.BASE_PATH !== "/" ? cfg.BASE_PATH : "").replace(/\/$/, "");
  const origin = location.origin;

  function abs(path){
    if(!path.startsWith("/")) path = "/" + path;
    return origin + basePath + path;
  }
  function rel(path){
    if(!path.startsWith("/")) path = "/" + path;
    return basePath + path;
  }

  const sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      })
    : null;

  function discordAuthorizeUrl(){
    const params = new URLSearchParams({
      client_id: cfg.DISCORD_CLIENT_ID,
      response_type: "code",
      redirect_uri: cfg.SUPABASE_URL + "/auth/v1/callback",
      scope: "identify email"
    });
    return "https://discord.com/oauth2/authorize?" + params.toString();
  }

  async function signInDiscord(){
    if(!sb) throw new Error("Supabase client not loaded.");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: abs("/dashboard/") }
    });
    if(error) throw error;
  }

  async function signOut(){
    if(!sb) return;
    await sb.auth.signOut();
  }

  async function getSession(){
    if(!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  function avatarUrl(user){
    const u = user?.user_metadata || {};
    return u.avatar_url || null;
  }

  function displayName(user){
    const u = user?.user_metadata || {};
    return u.preferred_username || u.full_name || user?.email || user?.id || "Unknown";
  }

  async function renderAuthBox(){
    const box = document.getElementById("meBox");
    if(!box) return;

    const navLogin = document.getElementById("navLogin");
    const navDash = document.getElementById("navDash");
    const navLogout = document.getElementById("navLogout");
    const btnDiscord = document.getElementById("btnDiscord");
    const btnLogout = document.getElementById("btnLogout");

    const sess = await getSession();
    const user = sess?.user || null;

    if(user){
      const wrap = document.createElement("div");
      wrap.className = "who";

      const img = document.createElement("img");
      img.className = "avatar";
      img.alt = "avatar";
      img.src = avatarUrl(user) || "https://cdn.discordapp.com/embed/avatars/0.png";

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "whoName";
      name.textContent = displayName(user);
      const muted = document.createElement("div");
      muted.className = "muted";
      muted.textContent = user.email || "Logged in";
      info.appendChild(name);
      info.appendChild(muted);

      wrap.appendChild(img);
      wrap.appendChild(info);

      box.innerHTML = "";
      box.appendChild(wrap);

      if(navLogin) navLogin.style.display = "none";
      if(navDash) navDash.style.display = "inline-flex";
      if(navLogout) navLogout.style.display = "inline-flex";
      if(btnDiscord) btnDiscord.textContent = "Re-login with Discord";
      if(btnLogout) btnLogout.style.display = "inline-flex";
    } else {
      box.textContent = "Not logged in.";
      if(navLogin) navLogin.style.display = "inline-flex";
      if(navDash) navDash.style.display = "none";
      if(navLogout) navLogout.style.display = "none";
      if(btnDiscord) btnDiscord.textContent = "Login with Discord";
      if(btnLogout) btnLogout.style.display = "none";
    }

    if(btnDiscord){
      btnDiscord.onclick = async (e) => {
        e.preventDefault();
        try { await signInDiscord(); } catch(err){ alert(String(err?.message || err)); }
      };
    }
    if(btnLogout){
      btnLogout.onclick = async (e) => {
        e.preventDefault();
        await signOut();
        location.href = rel("/");
      };
    }
    if(navLogout){
      navLogout.onclick = async (e) => {
        e.preventDefault();
        await signOut();
        location.href = rel("/");
      };
    }
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
      assets: (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url || a.url || "#" }))
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
    const embedded = getEmbeddedReleases();
    if(embedded.length) renderReleases(embedded);

    const owner = cfg.GITHUB_OWNER;
    const repo = cfg.GITHUB_REPO;
    if(!owner || !repo) return;

    try{
      const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
      const r = await fetch(api, { headers: { "Accept": "application/vnd.github+json" }});
      if(!r.ok) return;
      const j = await r.json();
      if(Array.isArray(j) && j.length) renderReleases(j);
    } catch {}
  }

  window.XP = { rel, abs, sb, discordAuthorizeUrl, signInDiscord, signOut, getSession, renderAuthBox, loadReleases };
})();
