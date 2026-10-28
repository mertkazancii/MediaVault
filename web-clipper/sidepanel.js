const BRIDGE_URL = "http://127.0.0.1:43821/clip";
const BRIDGE_KEY = "mvclipper_72f16f4a-5bc8-4c1c-9f73-0e7dfcc4d3ba";
const state = { clip: null, folders: [], collections: [], connected: false, itemCount: 0, saving: false };
const $ = id => document.getElementById(id);

function setStatus(text, type = "") {
  const el = $("status");
  el.textContent = text;
  el.className = `status ${type}`.trim();
}

function send(message) {
  return new Promise(resolve => chrome.runtime.sendMessage(message, response => {
    const lastError = chrome.runtime.lastError;
    resolve(response || { ok: false, message: lastError?.message || "Extension message failed." });
  }));
}

async function bridge(payload) {
  let response;
  try {
    response = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MediaVault-Key": BRIDGE_KEY
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error("Cannot reach MediaVault. Open MediaVault 2.2.1 and leave it running, then press refresh.");
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`MediaVault returned an invalid response (${response.status}).`); }
  if (!response.ok || !result?.ok) {
    throw new Error(result?.message || `MediaVault connection failed (${response.status}).`);
  }
  return result;
}

function folderLabel(folder) {
  const map = new Map(state.folders.map(item => [item.id, item]));
  let depth = 0;
  let parent = folder.parentId;
  while (parent && depth < 8) {
    depth++;
    parent = map.get(parent)?.parentId || null;
  }
  return `${"— ".repeat(depth)}${folder.name}`;
}

function fillOptions() {
  const folderSelect = $("folder");
  const previousFolder = folderSelect.value;
  folderSelect.innerHTML = '<option value="">All items (Library root)</option>';
  state.folders.forEach(folder => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folderLabel(folder);
    folderSelect.appendChild(option);
  });
  if ([...folderSelect.options].some(option => option.value === previousFolder)) folderSelect.value = previousFolder;

  const collectionSelect = $("collection");
  const previousCollection = collectionSelect.value;
  collectionSelect.innerHTML = '<option value="">No collection</option>';
  state.collections.forEach(collection => {
    const option = document.createElement("option");
    option.value = collection.id;
    option.textContent = collection.name;
    collectionSelect.appendChild(option);
  });
  if ([...collectionSelect.options].some(option => option.value === previousCollection)) collectionSelect.value = previousCollection;
}

function showClip(clip) {
  state.clip = clip || null;
  $("dropArea").classList.toggle("hidden", !!clip);
  $("clipCard").classList.toggle("hidden", !clip);
  $("save").disabled = !clip || state.saving || !state.connected;
  if (!clip) {
    $("preview").removeAttribute("src");
    $("clipName").textContent = "";
    $("sourceText").textContent = "";
    return;
  }
  $("preview").src = clip.imageUrl || "";
  $("clipName").textContent = clip.fileName || "Web clip";
  $("sourceText").textContent = clip.pageUrl || clip.imageUrl || "";
}

async function loadPending() {
  const result = await send({ type: "get-pending-clip" });
  if (result.ok && result.clip) showClip(result.clip);
}

async function connect() {
  setStatus("Connecting to MediaVault…");
  try {
    const result = await bridge({ action: "get_state" });
    state.connected = true;
    state.folders = Array.isArray(result.folders) ? result.folders : [];
    state.collections = Array.isArray(result.collections) ? result.collections : [];
    state.itemCount = Number(result.itemCount || 0);
    fillOptions();
    setStatus(`Connected to MediaVault · ${state.itemCount} items in library.`, "ok");
    $("save").disabled = !state.clip || state.saving;
    return true;
  } catch (error) {
    state.connected = false;
    $("save").disabled = true;
    setStatus(error?.message || "MediaVault is not connected.", "error");
    return false;
  }
}

async function closePanelAfterSave(clip) {
  await send({ type: "clear-pending-clip" });
  const windowId = clip?.windowId;
  if (typeof windowId !== "number") return;
  // Give Chrome a moment to show the success state before closing its side panel.
  window.setTimeout(async () => {
    try {
      if (chrome.sidePanel?.close) await chrome.sidePanel.close({ windowId });
    } catch (error) {
      console.debug("Chrome did not close the side panel automatically.", error);
    }
  }, 800);
}

async function save() {
  if (!state.clip || state.saving) return;
  if (!state.connected && !(await connect())) return;
  const clip = { ...state.clip };
  state.saving = true;
  $("save").disabled = true;
  setStatus("Saving image to MediaVault…");
  const tags = $("tags").value.split(",").map(value => value.trim()).filter(Boolean);
  try {
    const result = await bridge({
      action: "save_url",
      url: clip.imageUrl,
      pageUrl: clip.pageUrl || "",
      pageTitle: clip.pageTitle || "",
      fileName: clip.fileName || "Web clip",
      folderId: $("folder").value || null,
      collectionId: $("collection").value || "",
      tags,
      notes: $("notes").value,
      inbox: $("inbox").checked,
      saveSource: $("keepSource").checked
    });
    setStatus(result.duplicate ? "This image is already in MediaVault." : `Saved to ${result.destination || "MediaVault"}. Closing panel…`, "ok");
    state.saving = false;
    await closePanelAfterSave(clip);
  } catch (error) {
    state.saving = false;
    $("save").disabled = !state.clip || !state.connected;
    setStatus(error?.message || "Could not save the image.", "error");
  }
}

$("save").addEventListener("click", save);
$("refresh").addEventListener("click", async () => { await loadPending(); await connect(); });
$("test").addEventListener("click", connect);

const drop = $("dropArea");
drop.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async event => {
  event.preventDefault();
  drop.classList.remove("over");
  const raw = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain") || "";
  const uri = raw.split(/\r?\n/).find(value => value && !value.startsWith("#")) || "";
  let imageUrl = "";
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") imageUrl = parsed.href;
  } catch {}
  const clip = { ...(state.clip || {}), imageUrl };
  if (clip.imageUrl) {
    if (!clip.fileName || clip.fileName === "Web clip") {
      try { clip.fileName = decodeURIComponent(new URL(clip.imageUrl).pathname.split("/").pop() || "Web clip"); }
      catch { clip.fileName = "Web clip"; }
    }
    showClip(clip);
    await send({ type: "set-pending-clip", clip });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes.pendingClip) {
    showClip(changes.pendingClip.newValue || null);
    setStatus(changes.pendingClip.newValue ? "Image ready to save." : "Ready for a web image.");
  }
});

(async () => {
  await loadPending();
  await connect();
})();
