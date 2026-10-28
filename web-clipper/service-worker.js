const BRIDGE_URL = "http://127.0.0.1:43821/clip";
const BRIDGE_KEY = "mvclipper_72f16f4a-5bc8-4c1c-9f73-0e7dfcc4d3ba";

async function bridge(payload) {
  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MediaVault-Key": BRIDGE_KEY },
    body: JSON.stringify(payload)
  });
  let result;
  try { result = await response.json(); } catch { throw new Error("MediaVault returned an invalid response."); }
  if (!response.ok || !result?.ok) throw new Error(result?.message || `MediaVault connection failed (${response.status}).`);
  return result;
}
function contextClip(clip, tab) {
  return { ...clip, pageUrl: clip.pageUrl || tab?.url || "", pageTitle: clip.pageTitle || tab?.title || "" };
}
async function setupMenu() {
  try { await chrome.contextMenus.removeAll(); } catch {}
  chrome.contextMenus.create({ id: "save-image-to-mediavault", title: "Save image to MediaVault…", contexts: ["image"] });
  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }); } catch {}
}
chrome.runtime.onInstalled.addListener(setupMenu);
chrome.runtime.onStartup.addListener(setupMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-image-to-mediavault" || !tab?.id || !info.srcUrl) return;
  let fileName = "Web clip";
  try { fileName = decodeURIComponent(new URL(info.srcUrl).pathname.split("/").pop() || fileName); } catch {}
  const clip = contextClip({ imageUrl: info.srcUrl, fileName }, tab);
  try { await chrome.tabs.sendMessage(tab.id, { type: "mv-show-overlay", clip }); }
  catch { console.warn("MediaVault overlay could not be shown in this tab."); }
});
chrome.action.onClicked.addListener(async tab => {
  if (!tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: "mv-show-overlay", clip: null }); }
  catch { /* Some browser pages do not allow content scripts. */ }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "mv-bridge-get-state") {
        sendResponse({ ok: true, state: await bridge({ action: "get_state" }) }); return;
      }
      if (message?.type === "mv-bridge-save") {
        sendResponse({ ok: true, result: await bridge({ action: "save_url", ...message.payload }) }); return;
      }
      if (message?.type === "web-clipper-drag-start") {
        const clip = contextClip(message.clip || {}, sender.tab);
        sendResponse({ ok: true });
        return;
      }
      sendResponse({ ok: false, message: "Unknown message." });
    } catch (error) {
      sendResponse({ ok: false, message: error?.message || "Cannot connect to MediaVault. Open MediaVault 2.2.1 and keep it running." });
    }
  })();
  return true;
});
