(() => {
  if (window.__mediaVaultClipperInstalled) return;
  window.__mediaVaultClipperInstalled = true;
  let activeClip = null;
  let overlay = null;
  let folders = [];
  let loading = false;

  const send = (message) => new Promise(resolve => {
    try {
      chrome.runtime.sendMessage(message, response => {
        const err = chrome.runtime.lastError;
        resolve(response || { ok: false, message: err?.message || "Extension message failed." });
      });
    } catch (error) { resolve({ ok: false, message: error?.message || "Extension unavailable." }); }
  });

  function clipFromImage(target) {
    const img = target?.closest?.("img");
    if (!img) return null;
    const imageUrl = img.currentSrc || img.src;
    if (!imageUrl || !/^https?:/i.test(imageUrl)) return null;
    let fileName = "Web clip";
    try { fileName = decodeURIComponent(new URL(imageUrl, location.href).pathname.split("/").pop() || fileName); } catch {}
    if (img.alt?.trim()) fileName = img.alt.trim().slice(0, 120);
    return { imageUrl, pageUrl: location.href, pageTitle: document.title || "", alt: img.alt || "", fileName };
  }

  function ensureStyle() {
    if (document.getElementById("mv-clipper-style")) return;
    const style = document.createElement("style");
    style.id = "mv-clipper-style";
    style.textContent = `
      #mv-clipper-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(8,12,28,.38);backdrop-filter:blur(3px);font:13px/1.4 Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#f8fafc;pointer-events:none}
      #mv-clipper-overlay *{box-sizing:border-box}
      #mv-clipper-card{width:min(440px,calc(100vw - 32px));max-height:min(76vh,620px);overflow:hidden;border:1px solid rgba(255,255,255,.22);border-radius:15px;background:linear-gradient(145deg,#292b3b,#171923);box-shadow:0 24px 90px rgba(0,0,0,.55);pointer-events:auto;display:flex;flex-direction:column}
      #mv-clipper-head{padding:17px 18px 12px;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.1)}
      #mv-clipper-mark{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:#343b65;font-size:18px}
      #mv-clipper-title{font-size:16px;font-weight:750;letter-spacing:.1px}
      #mv-clipper-subtitle{font-size:11px;color:#aeb5c9;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:325px}
      #mv-clipper-close{margin-left:auto;border:0;background:transparent;color:#c8cde0;font-size:22px;cursor:pointer;padding:3px 6px;border-radius:6px}
      #mv-clipper-close:hover{background:#41465a}
      #mv-clipper-status{padding:10px 18px 5px;color:#aeb5c9;font-size:11px}
      #mv-clipper-list{padding:4px 10px 12px;overflow:auto;min-height:80px}
      .mv-clipper-folder{display:flex;align-items:center;gap:10px;width:100%;padding:10px 11px;margin:3px 0;text-align:left;color:#f5f6fb;background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer;font:inherit}
      .mv-clipper-folder:hover,.mv-clipper-folder.mv-over{background:#414768;border-color:#8796ff}
      .mv-clipper-folder.mv-over{outline:2px solid #aab5ff}
      .mv-clipper-icon{width:18px;flex:none;color:#b7c0ff;font-size:15px}
      .mv-clipper-folder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
      .mv-clipper-hint{padding:11px 18px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:#aeb5c9}
      .mv-clipper-error{color:#ffaaaa!important}
      .mv-clipper-success{color:#9ce6b0!important}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function showOverlay(clip) {
    if (clip) activeClip = clip;
    ensureStyle();
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mv-clipper-overlay";
      overlay.innerHTML = `<div id="mv-clipper-card" role="dialog" aria-label="Save to MediaVault">
        <div id="mv-clipper-head"><div id="mv-clipper-mark">▣</div><div style="min-width:0"><div id="mv-clipper-title">Save to MediaVault</div><div id="mv-clipper-subtitle">Drag the image onto a folder</div></div><button id="mv-clipper-close" title="Close" aria-label="Close">×</button></div>
        <div id="mv-clipper-status">Loading your folders…</div><div id="mv-clipper-list"></div>
        <div class="mv-clipper-hint">Drop on a folder to save there · Drop outside this box to keep dragging to MediaVault</div></div>`;
      document.documentElement.appendChild(overlay);
      overlay.querySelector("#mv-clipper-close").addEventListener("click", hideOverlay);
      overlay.addEventListener("dragover", event => { event.preventDefault(); });
    }
    overlay.style.display = "flex";
    const subtitle = overlay.querySelector("#mv-clipper-subtitle");
    subtitle.textContent = activeClip?.fileName || "Choose a folder or drop the image onto MediaVault";
    renderFolders();
    if (!folders.length) loadFolders();
  }

  function hideOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  function status(text, cls = "") {
    if (!overlay) return;
    const el = overlay.querySelector("#mv-clipper-status");
    el.textContent = text;
    el.className = cls;
  }

  function renderFolders() {
    if (!overlay) return;
    const list = overlay.querySelector("#mv-clipper-list");
    list.innerHTML = "";
    const entries = [{ id: "", name: "All items", depth: 0, root: true }, ...folders];
    if (loading && !folders.length) { status("Loading your folders…"); return; }
    if (!folders.length && !loading) { status("No folders found. All items is available."); }
    else status("Drop the image on a destination");
    entries.forEach(folder => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mv-clipper-folder";
      button.innerHTML = `<span class="mv-clipper-icon">${folder.root ? "▤" : "▰"}</span><span class="mv-clipper-folder-name"></span><span aria-hidden="true">›</span>`;
      button.querySelector(".mv-clipper-folder-name").textContent = `${"　".repeat(Math.min(folder.depth || 0, 5))}${folder.name}`;
      button.addEventListener("dragover", event => { event.preventDefault(); event.stopPropagation(); button.classList.add("mv-over"); });
      button.addEventListener("dragleave", () => button.classList.remove("mv-over"));
      button.addEventListener("drop", async event => {
        event.preventDefault(); event.stopPropagation(); button.classList.remove("mv-over");
        await saveToFolder(folder.id || null);
      });
      button.addEventListener("click", () => saveToFolder(folder.id || null));
      list.appendChild(button);
    });
  }

  async function loadFolders() {
    if (loading) return;
    loading = true;
    renderFolders();
    const response = await send({ type: "mv-bridge-get-state" });
    loading = false;
    if (!response.ok) { status(response.message || "Cannot connect to MediaVault. Open MediaVault and try again.", "mv-clipper-error"); return; }
    const raw = response.state?.folders || [];
    const byId = new Map(raw.map(folder => [String(folder.id), folder]));
    const depthOf = folder => {
      let depth = 0, parent = folder.parentId, guard = 0;
      while (parent && guard++ < 10) { depth++; parent = byId.get(String(parent))?.parentId || null; }
      return depth;
    };
    folders = raw.map(folder => ({ ...folder, depth: depthOf(folder) })).sort((a,b) => a.depth-b.depth || a.name.localeCompare(b.name));
    renderFolders();
  }

  async function saveToFolder(folderId) {
    if (!activeClip?.imageUrl) { status("Drag an image here or right-click an image first.", "mv-clipper-error"); return; }
    status("Saving image to MediaVault…");
    const response = await send({ type: "mv-bridge-save", payload: {
      url: activeClip.imageUrl, imageUrl: activeClip.imageUrl,
      pageUrl: activeClip.pageUrl || location.href, pageTitle: activeClip.pageTitle || document.title,
      fileName: activeClip.fileName || "Web clip", folderId, collectionId: "",
      tags: [], notes: "", inbox: false, saveSource: true
    }});
    if (!response.ok || !response.result?.ok) {
      status(response.message || response.result?.message || "Could not save image.", "mv-clipper-error");
      return;
    }
    status(response.result.duplicate ? "Already in MediaVault." : `Saved to ${response.result.destination || "All items"} ✓`, "mv-clipper-success");
    window.setTimeout(hideOverlay, 650);
  }

  document.addEventListener("dragstart", event => {
    const clip = clipFromImage(event.target);
    if (!clip) return;
    activeClip = clip;
    try {
      event.dataTransfer?.setData("text/uri-list", clip.imageUrl);
      event.dataTransfer?.setData("text/plain", clip.imageUrl);
    } catch {}
    showOverlay(clip);
    send({ type: "web-clipper-drag-start", clip });
  }, true);

  document.addEventListener("dragend", () => {
    window.setTimeout(() => {
      if (overlay && !overlay.querySelector(".mv-clipper-folder.mv-over")) hideOverlay();
    }, 700);
  }, true);

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "mv-show-overlay") {
      if (message.clip) activeClip = message.clip;
      showOverlay(message.clip || activeClip);
    }
  });
})();
