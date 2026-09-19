const { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const LIBRARY_ROOT = path.join(app.getPath("documents"), "MediaVault");
const DB_PATH = path.join(LIBRARY_ROOT, "library.json");
const BACKUPS_ROOT = path.join(app.getPath("documents"), "MediaVault Backups");
const TRASH_ROOT = path.join(LIBRARY_ROOT, ".trash");
const UNDO_DELETE_PATH = path.join(LIBRARY_ROOT, ".undo-delete.json");

function ensureLibrary() {
  for (const dir of [
    LIBRARY_ROOT,
    BACKUPS_ROOT,
    TRASH_ROOT,
    path.join(LIBRARY_ROOT, "media"),
    path.join(LIBRARY_ROOT, "media", "images"),
    path.join(LIBRARY_ROOT, "media", "videos"),
    path.join(LIBRARY_ROOT, "media", "files"),
    path.join(LIBRARY_ROOT, "thumbnails")
  ]) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      version: 4,
      items: [],
      folders: [],
      tags: [],
      collections: [],
      saved_searches: []
    }, null, 2));
  }
}

function loadDB() {
  ensureLibrary();
  let db;
  try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); }
  catch { db = { version: 4, items: [], folders: [], tags: [], collections: [], saved_searches: [] }; }

  db.version = 5;
  db.items ||= [];
  db.folders ||= [];
  db.tags ||= [];
  db.collections ||= [];
  db.saved_searches ||= [];

  // Migrate v0.2 JSON databases.
  db.items = db.items.map(item => {
    let modifiedAt = item.modified_at || null;
    try { if (!modifiedAt && item.stored_path && fs.existsSync(item.stored_path)) modifiedAt = fs.statSync(item.stored_path).mtime.toISOString(); } catch {}
    return {
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : [],
      folder_id: item.folder_id ?? null,
      favorite: !!item.favorite,
      color: item.color || null,
      collection_ids: Array.isArray(item.collection_ids) ? [...new Set(item.collection_ids)] : [],
      modified_at: modifiedAt,
      notes: typeof item.notes === "string" ? item.notes : "",
      source_url: typeof item.source_url === "string" ? item.source_url : "",
      inbox: !!item.inbox
    };
  });
  db.tags = db.tags.map(tag => ({ ...tag, color: tag.color || null }));
  db.folders = db.folders.map(folder => ({ ...folder, color: folder.color || null }));
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function cleanName(value) {
  return String(value || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function fileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const images = [".jpg",".jpeg",".png",".gif",".webp",".bmp",".svg",".avif",".heic"];
  const videos = [".mp4",".webm",".mov",".mkv",".avi",".m4v",".wmv"];
  if (images.includes(ext)) return "image";
  if (videos.includes(ext)) return "video";
  return "file";
}

function uniqueDestination(dir, filename) {
  let dest = path.join(dir, filename);
  if (!fs.existsSync(dest)) return dest;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(dir, `${base} (${i})${ext}`);
    i++;
  }
  return dest;
}


function copyDirectorySync(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectorySync(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function removeDirectorySync(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive:true, force:true });
}

function timestampLabel(date = new Date()) {
  const p=n=>String(n).padStart(2,"0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
}

function readUndoRecord() {
  try {
    if (!fs.existsSync(UNDO_DELETE_PATH)) return null;
    return JSON.parse(fs.readFileSync(UNDO_DELETE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeUndoRecord(record) {
  fs.writeFileSync(UNDO_DELETE_PATH, JSON.stringify(record, null, 2));
}

function clearUndoRecord() {
  try { if (fs.existsSync(UNDO_DELETE_PATH)) fs.unlinkSync(UNDO_DELETE_PATH); } catch {}
}

function createBackupSnapshot(label="MediaVault Backup") {
  ensureLibrary();
  fs.mkdirSync(BACKUPS_ROOT,{recursive:true});
  let destination=path.join(BACKUPS_ROOT,`${cleanName(label)} ${timestampLabel()}`);
  let n=2;
  while(fs.existsSync(destination)){
    destination=path.join(BACKUPS_ROOT,`${cleanName(label)} ${timestampLabel()} (${n++})`);
  }
  fs.mkdirSync(destination,{recursive:true});

  const manifest={
    format:"MediaVault Backup",
    formatVersion:1,
    createdAt:new Date().toISOString(),
    appVersion:"2.0.6"
  };
  fs.writeFileSync(path.join(destination,"backup.json"),JSON.stringify(manifest,null,2));
  if(fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH,path.join(destination,"library.json"));

  const mediaRoot=path.join(LIBRARY_ROOT,"media");
  if(fs.existsSync(mediaRoot)) copyDirectorySync(mediaRoot,path.join(destination,"media"));
  const thumbRoot=path.join(LIBRARY_ROOT,"thumbnails");
  if(fs.existsSync(thumbRoot)) copyDirectorySync(thumbRoot,path.join(destination,"thumbnails"));

  return destination;
}


function parseClipboardPathText(text) {
  return String(text || "")
    .split(/\r?\n|\0/g)
    .map(v => v.trim().replace(/^"(.*)"$/, "$1"))
    .map(v => {
      if (/^file:\/\//i.test(v)) {
        try {
          return decodeURIComponent(v.replace(/^file:\/\//i, "")).replace(/^\/([A-Za-z]:)/, "$1");
        } catch {
          return v.replace(/^file:\/\//i, "").replace(/^\/([A-Za-z]:)/, "$1");
        }
      }
      return v;
    })
    .filter(v => v && (
      /^[A-Za-z]:[\\/]/.test(v) ||
      /^\\\\[^\\]+\\/.test(v) ||
      (path.isAbsolute(v) && v.length > 1)
    ))
    .filter(v => {
      try { return fs.existsSync(v) && fs.statSync(v).isFile(); } catch { return false; }
    });
}

function getClipboardFilePaths() {
  const formats = clipboard.availableFormats ? clipboard.availableFormats() : [];
  const fileFormat = formats.find(format => /filenamew/i.test(format))
    || formats.find(format => /filename/i.test(format));

  if (fileFormat && clipboard.readBuffer) {
    try {
      const buffer = clipboard.readBuffer(fileFormat);
      const text = /w$/i.test(fileFormat) ? buffer.toString("utf16le") : buffer.toString("utf8");
      const paths = parseClipboardPathText(text);
      if (paths.length) return paths;
    } catch {}
  }

  const uriFormat = formats.find(format => /uri-list/i.test(format));
  if (uriFormat && clipboard.readBuffer) {
    try {
      const text = clipboard.readBuffer(uriFormat).toString("utf8");
      const paths = parseClipboardPathText(text);
      if (paths.length) return paths;
    } catch {}
  }

  try {
    return parseClipboardPathText(clipboard.readText ? clipboard.readText() : "");
  } catch {
    return [];
  }
}

ipcMain.handle("paste-clipboard", async (_, { folderId = null, inInbox = false } = {}) => {
  ensureLibrary();
  let paths = getClipboardFilePaths();
  let tempImagePath = null;

  // Browser/screenshot/image-copy fallback: persist the clipboard bitmap as a
  // temporary PNG, then send it through the normal import pipeline.
  if (!paths.length && clipboard.hasImage && clipboard.hasImage()) {
    try {
      const image = clipboard.readImage();
      if (image && !image.isEmpty()) {
        const tempDir = path.join(LIBRARY_ROOT, ".clipboard-imports");
        fs.mkdirSync(tempDir, { recursive: true });
        const stamp = timestampLabel();
        tempImagePath = path.join(tempDir, `Clipboard ${stamp}.png`);
        fs.writeFileSync(tempImagePath, image.toPNG());
        paths = [tempImagePath];
      }
    } catch {}
  }

  if (!paths.length) {
    return { ok:false, message:"Clipboard does not contain an importable file or image.", state:loadDB(), imported:[] };
  }

  const result = await importFiles(paths, folderId, inInbox);
  let state = result.state;

  if (tempImagePath) {
    try { fs.rmSync(tempImagePath, { force:true }); } catch {}
    const importedIds = new Set((result.imported || []).map(item => item.id));
    if (importedIds.size) {
      state.items = state.items.map(item =>
        importedIds.has(item.id) ? { ...item, original_path:"Clipboard" } : item
      );
      saveDB(state);
    }
  }

  return { ok:true, state, imported:result.imported || [] };
});

async function importFiles(filePaths, folderId = null, inInbox = false) {
  const db = loadDB();
  const imported = [];

  for (const source of filePaths || []) {
    try {
      const stat = fs.statSync(source);
      if (!stat.isFile()) continue;

      const hash = crypto.createHash("sha256");
      const data = fs.readFileSync(source);
      hash.update(data);
      const contentHash = hash.digest("hex");

      if (db.items.some(x => x.content_hash === contentHash)) continue;

      const type = fileType(source);
      const dir = path.join(LIBRARY_ROOT, "media", `${type}s`);
      const filename = cleanName(path.basename(source));
      const destination = uniqueDestination(dir, filename);
      fs.copyFileSync(source, destination);

      const item = {
        id: id("item"),
        content_hash: contentHash,
        name: path.basename(source),
        original_path: source,
        stored_path: destination,
        type,
        extension: path.extname(source).toLowerCase(),
        size: stat.size,
        created_at: new Date().toISOString(),
        modified_at: stat.mtime.toISOString(),
        favorite: false,
        tags: [],
        folder_id: folderId || null,
        collection_ids: [],
        thumbnail_path: null,
        notes: "",
        source_url: "",
        inbox: !!inInbox
      };

      db.items.unshift(item);
      imported.push(item);
    } catch (error) {
      console.error("Import failed:", source, error);
    }
  }

  saveDB(db);
  return { imported, state: db };
}

ipcMain.handle("choose-import-files", async () => {
  const result = await dialog.showOpenDialog({
    title: "Import media",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Media & Files", extensions: ["jpg","jpeg","png","gif","webp","bmp","svg","avif","heic","mp4","webm","mov","mkv","avi","m4v","wmv","pdf","zip","psd","txt"] },
      { name: "All files", extensions: ["*"] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

function mimeForExtension(ext) {
  const map = {
    ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".gif":"image/gif",
    ".webp":"image/webp", ".bmp":"image/bmp", ".svg":"image/svg+xml", ".avif":"image/avif",
    ".heic":"image/heic", ".mp4":"video/mp4", ".webm":"video/webm", ".mov":"video/quicktime",
    ".mkv":"video/x-matroska", ".avi":"video/x-msvideo", ".m4v":"video/mp4", ".wmv":"video/x-ms-wmv"
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}


function readImageDimensions(buffer, ext) {
  try {
    if ([".jpg",".jpeg"].includes(ext)) {
      // JPEG parser: find SOF marker without needing native libraries.
      let i=2;
      while(i+9<buffer.length){
        if(buffer[i]!==0xFF){i++;continue;}
        const marker=buffer[i+1]; i+=2;
        if(marker===0xD8 || marker===0xD9) continue;
        if(marker===0xDA) break;
        const len=buffer.readUInt16BE(i);
        if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
          return { width:buffer.readUInt16BE(i+5), height:buffer.readUInt16BE(i+3) };
        }
        i += len;
      }
    }
    if(ext===".png" && buffer.length>24 && buffer.toString("ascii",1,4)==="PNG"){
      return { width:buffer.readUInt32BE(16), height:buffer.readUInt32BE(20) };
    }
    if(ext===".gif" && buffer.length>10 && buffer.toString("ascii",0,3)==="GIF"){
      return { width:buffer.readUInt16LE(6), height:buffer.readUInt16LE(8) };
    }
    if(ext===".webp" && buffer.length>30 && buffer.toString("ascii",0,4)==="RIFF" && buffer.toString("ascii",8,12)==="WEBP"){
      return null; // handled visually by renderer if unsupported
    }
  } catch {}
  return null;
}

ipcMain.handle("get-item-metadata", (_, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const stat=fs.statSync(filePath);
    const ext=path.extname(filePath).toLowerCase();
    const type=fileType(filePath);
    let dimensions=null;
    if(type==="image"){
      const fd=fs.openSync(filePath,"r");
      const size=Math.min(stat.size, 2*1024*1024);
      const buffer=Buffer.alloc(size);
      fs.readSync(fd,buffer,0,size,0);
      fs.closeSync(fd);
      dimensions=readImageDimensions(buffer,ext);
    }
    return {
      name:path.basename(filePath),
      path:filePath,
      extension:ext,
      type,
      size:stat.size,
      createdAt:stat.birthtime.toISOString(),
      modifiedAt:stat.mtime.toISOString(),
      width:dimensions?.width||null,
      height:dimensions?.height||null
    };
  } catch { return null; }
});


function thumbnailPathFor(filePath) {
  const hash = crypto.createHash("sha256").update(filePath).digest("hex");
  return path.join(LIBRARY_ROOT, "thumbnails", `${hash}.png`);
}

async function createImageThumbnail(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return "";
    const out = thumbnailPathFor(filePath);
    if (fs.existsSync(out)) return out;

    const image = await nativeImage.createThumbnailFromPath(filePath, { width: 700, height: 520 });
    if (image.isEmpty()) return "";
    fs.writeFileSync(out, image.toPNG());
    return out;
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return "";
  }
}


function createVideoThumbnail(filePath) {
  return new Promise(resolve => {
    try {
      if (!ffmpegPath || !filePath || !fs.existsSync(filePath)) return resolve("");
      const out = thumbnailPathFor(filePath);
      if (fs.existsSync(out)) return resolve(out);
      execFile(ffmpegPath, [
        "-y", "-ss", "1.5", "-i", filePath,
        "-frames:v", "1", "-vf", "scale=700:520:force_original_aspect_ratio=decrease",
        "-f", "image2", out
      ], { windowsHide: true }, error => {
        if (error || !fs.existsSync(out)) {
          // Some very short videos do not have a frame at 1.5s; try the first frame.
          execFile(ffmpegPath, [
            "-y", "-i", filePath, "-frames:v", "1",
            "-vf", "scale=700:520:force_original_aspect_ratio=decrease",
            "-f", "image2", out
          ], { windowsHide: true }, error2 => resolve(!error2 && fs.existsSync(out) ? out : ""));
        } else resolve(out);
      });
    } catch { resolve(""); }
  });
}

ipcMain.handle("get-thumbnail-data-url", async (_, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return "";
    let out = thumbnailPathFor(filePath);
    if (!fs.existsSync(out)) {
      const type = fileType(filePath);
      if (type === "image") out = await createImageThumbnail(filePath);
      else if (type === "video") out = await createVideoThumbnail(filePath);
      else return "";
    }
    if (!out || !fs.existsSync(out)) return "";
    return `data:image/png;base64,${fs.readFileSync(out).toString("base64")}`;
  } catch {
    return "";
  }
});

ipcMain.handle("save-video-thumbnail", (_, { filePath, dataUrl }) => {
  try {
    if (!filePath || !dataUrl || !dataUrl.startsWith("data:image/")) return "";
    const out = thumbnailPathFor(filePath);
    const base64 = dataUrl.split(",")[1];
    fs.writeFileSync(out, Buffer.from(base64, "base64"));
    return out;
  } catch {
    return "";
  }
});

ipcMain.handle("delete-thumbnail", (_, filePath) => {
  try {
    const out = thumbnailPathFor(filePath);
    if (fs.existsSync(out)) fs.unlinkSync(out);
  } catch {}
});

ipcMain.handle("get-asset-data-url", (_, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return "";
    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeForExtension(ext);
    // Data URLs are used for images so the renderer can display local files
    // even though the React dev server runs on http://127.0.0.1.
    if (!mime.startsWith("image/")) return "";
    const data = fs.readFileSync(filePath).toString("base64");
    return `data:${mime};base64,${data}`;
  } catch {
    return "";
  }
});

ipcMain.handle("get-state", () => loadDB());
ipcMain.handle("import-files", (_, { paths = [], folderId = null, inInbox = false } = {}) => importFiles(paths, folderId, inInbox));


ipcMain.handle("set-items-inbox", (_, { ids = [], inbox = true } = {}) => {
  const db = loadDB();
  const wanted = new Set((ids || []).map(String));
  db.items.forEach(item => {
    if (wanted.has(String(item.id))) item.inbox = !!inbox;
  });
  saveDB(db);
  return db;
});

ipcMain.handle("organize-inbox", (_, {
  ids = [],
  folderMode = "keep",
  folderId = null,
  collectionId = "",
  tagsToAdd = [],
  colorMode = "keep",
  color = null,
  archive = true
} = {}) => {
  const db = loadDB();
  const wanted = new Set((ids || []).map(String));
  const cleanTags = [...new Set((tagsToAdd || [])
    .map(t => String(t || "").trim().replace(/^#/, ""))
    .filter(Boolean))];

  const selectedTags = new Set(db.tags.map(t => String(t.name || "").toLowerCase()));
  cleanTags.forEach(tag => {
    if (!selectedTags.has(tag.toLowerCase())) {
      db.tags.push({ id:id("tag"), name:tag, color:null, created_at:new Date().toISOString() });
      selectedTags.add(tag.toLowerCase());
    }
  });

  const resultItems = [];
  db.items.forEach(item => {
    if (!wanted.has(String(item.id))) return;

    if (folderMode === "root") item.folder_id = null;
    if (folderMode === "folder") item.folder_id = folderId || null;

    if (collectionId) {
      item.collection_ids = Array.isArray(item.collection_ids) ? [...new Set(item.collection_ids)] : [];
      if (!item.collection_ids.includes(collectionId)) item.collection_ids.push(collectionId);
    }

    if (cleanTags.length) {
      item.tags = Array.isArray(item.tags) ? [...item.tags] : [];
      for (const tag of cleanTags) {
        if (!item.tags.includes(tag)) item.tags.push(tag);
      }
    }

    if (colorMode === "set") item.color = color || null;
    if (colorMode === "remove") item.color = null;
    if (archive) item.inbox = false;

    resultItems.push(item);
  });

  saveDB(db);
  return { ok:true, state:db, organized:resultItems };
});

ipcMain.handle("toggle-favorite", (_, itemId) => {
  const db = loadDB();
  const item = db.items.find(x => x.id === itemId);
  if (item) item.favorite = !item.favorite;
  saveDB(db);
  return db;
});



ipcMain.handle("set-item-favorite", (_, { ids = [], favorite = true } = {}) => {
  const db = loadDB();
  const wanted = new Set((ids || []).map(String));
  db.items = db.items.map(item => wanted.has(String(item.id)) ? { ...item, favorite:!!favorite } : item);
  saveDB(db);
  return db;
});

ipcMain.handle("set-item-color", (_, { ids = [], color = null } = {}) => {
  const db = loadDB();
  const set = new Set(ids || []);
  db.items.forEach(item => { if (set.has(item.id)) item.color = color || null; });
  saveDB(db);
  return db;
});


ipcMain.handle("update-item-info", (_, { id:itemId, notes="", source_url="" } = {}) => {
  const db = loadDB();
  const item = db.items.find(x => x.id === itemId);
  if (!item) return { ok:false, state:db, message:"Item not found." };

  const cleanNotes = String(notes ?? "");
  const cleanSource = String(source_url ?? "").trim();

  if (cleanSource && !/^https?:\/\/\S+/i.test(cleanSource)) {
    return { ok:false, state:db, message:"Source URL must start with http:// or https://." };
  }

  item.notes = cleanNotes;
  item.source_url = cleanSource;
  saveDB(db);
  return { ok:true, state:db };
});

ipcMain.handle("delete-items", (_, ids) => {
  const db = loadDB();
  const set = new Set(ids || []);
  const targets = db.items.filter(x => set.has(x.id));
  if (!targets.length) return {ok:false, undoable:false, state:db, message:"No items selected."};

  // The most recent delete batch is the one Ctrl+Z restores.
  const previous = readUndoRecord();
  if(previous?.trashDir) removeDirectorySync(previous.trashDir);

  const opId=id("delete");
  const trashDir=path.join(TRASH_ROOT,opId);
  const itemsDir=path.join(trashDir,"items");
  const thumbsDir=path.join(trashDir,"thumbnails");
  fs.mkdirSync(itemsDir,{recursive:true});
  fs.mkdirSync(thumbsDir,{recursive:true});

  const undoItems=[];
  for(const item of targets){
    const rec={
      ...item,
      originalStoredPath:item.stored_path,
      originalThumbnailPath:thumbnailPathFor(item.stored_path),
      trashPath:"",
      trashThumbnailPath:""
    };
    const itemDir=path.join(itemsDir,item.id);
    fs.mkdirSync(itemDir,{recursive:true});

    if(fs.existsSync(item.stored_path)){
      const target=path.join(itemDir,path.basename(item.stored_path));
      try{
        fs.renameSync(item.stored_path,target);
        rec.trashPath=target;
      }catch{
        try{
          fs.copyFileSync(item.stored_path,target);
          fs.unlinkSync(item.stored_path);
          rec.trashPath=target;
        }catch{}
      }
    }

    try{
      const thumb=thumbnailPathFor(item.stored_path);
      if(fs.existsSync(thumb)){
        const target=path.join(thumbsDir,item.id+".png");
        fs.renameSync(thumb,target);
        rec.trashThumbnailPath=target;
      }
    }catch{}

    undoItems.push(rec);
  }

  // Persist the undo record before changing the visible DB state.
  writeUndoRecord({
    format:"MediaVault Delete Undo",
    createdAt:new Date().toISOString(),
    trashDir,
    items:undoItems
  });

  db.items=db.items.filter(x=>!set.has(x.id));
  saveDB(db);

  return {ok:true, undoable:true, state:db, deleted:targets};
});

ipcMain.handle("undo-delete", () => {
  const record=readUndoRecord();
  const db=loadDB();
  if(!record?.items?.length) return {ok:false,state:db,message:"Nothing to undo."};

  const restored=[];
  for(const saved of record.items){
    if(db.items.some(x=>x.id===saved.id)) continue;
    if(!saved.trashPath || !fs.existsSync(saved.trashPath)) continue;

    let destination=saved.originalStoredPath;
    if(fs.existsSync(destination)){
      destination=uniqueDestination(path.dirname(destination),path.basename(destination));
    }

    try{
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.renameSync(saved.trashPath,destination);

      const item={...saved};
      delete item.originalStoredPath;
      delete item.originalThumbnailPath;
      delete item.trashPath;
      delete item.trashThumbnailPath;
      item.stored_path=destination;
      item.name=path.basename(destination);
      item.thumbnail_path=null;

      if(saved.trashThumbnailPath && fs.existsSync(saved.trashThumbnailPath)){
        const thumb=thumbnailPathFor(destination);
        fs.mkdirSync(path.dirname(thumb),{recursive:true});
        fs.renameSync(saved.trashThumbnailPath,thumb);
        item.thumbnail_path=thumb;
      }

      db.items.unshift(item);
      restored.push(item);
    }catch{}
  }

  if(!restored.length){
    return {ok:false,state:db,message:"The deleted files could not be restored."};
  }

  saveDB(db);
  removeDirectorySync(record.trashDir);
  clearUndoRecord();
  return {ok:true,state:db,restored};
});

ipcMain.handle("create-backup", () => {
  try{
    const folder=createBackupSnapshot();
    return {ok:true,name:path.basename(folder),path:folder};
  }catch{
    return {ok:false,message:"Backup could not be created."};
  }
});

ipcMain.handle("open-backups-folder", async () => {
  try{
    fs.mkdirSync(BACKUPS_ROOT,{recursive:true});
    await shell.openPath(BACKUPS_ROOT);
    return true;
  }catch{
    return false;
  }
});

ipcMain.handle("choose-backup-folder", async () => {
  try{
    fs.mkdirSync(BACKUPS_ROOT,{recursive:true});
    const result=await dialog.showOpenDialog({
      title:"Select a MediaVault backup",
      defaultPath:BACKUPS_ROOT,
      properties:["openDirectory"]
    });
    if(result.canceled || !result.filePaths?.length) return "";
    return result.filePaths[0];
  }catch{
    return "";
  }
});

ipcMain.handle("restore-backup", async (_, backupFolder) => {
  try{
    if(!backupFolder || !fs.existsSync(backupFolder)) return {ok:false,message:"Backup folder was not found."};

    const manifestPath=path.join(backupFolder,"backup.json");
    const backupDbPath=path.join(backupFolder,"library.json");
    if(!fs.existsSync(manifestPath) || !fs.existsSync(backupDbPath)){
      return {ok:false,message:"This folder is not a valid MediaVault backup."};
    }

    let manifest;
    try{manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));}catch{
      return {ok:false,message:"Backup manifest is invalid."};
    }
    if(manifest?.format!=="MediaVault Backup" || Number(manifest?.formatVersion)!==1){
      return {ok:false,message:"This folder is not a valid MediaVault backup."};
    }

    let backupDb;
    try{backupDb=JSON.parse(fs.readFileSync(backupDbPath,"utf8"));}catch{
      return {ok:false,message:"Backup database is invalid."};
    }
    backupDb.items ||= [];
    backupDb.folders ||= [];
    backupDb.tags ||= [];
    backupDb.collections ||= [];

    // Create a safety backup before replacing live data.
    createBackupSnapshot("Pre-restore safety");

    const stage=path.join(BACKUPS_ROOT,`.restore-${crypto.randomUUID()}`);
    fs.mkdirSync(stage,{recursive:true});
    fs.copyFileSync(backupDbPath,path.join(stage,"library.json"));

    const backupMedia=path.join(backupFolder,"media");
    const backupThumbs=path.join(backupFolder,"thumbnails");
    if(fs.existsSync(backupMedia)) copyDirectorySync(backupMedia,path.join(stage,"media"));
    if(fs.existsSync(backupThumbs)) copyDirectorySync(backupThumbs,path.join(stage,"thumbnails"));

    // Replace live media and metadata only after the staged backup has parsed successfully.
    const liveMedia=path.join(LIBRARY_ROOT,"media");
    const liveThumbs=path.join(LIBRARY_ROOT,"thumbnails");
    removeDirectorySync(liveMedia);
    removeDirectorySync(liveThumbs);
    fs.mkdirSync(liveMedia,{recursive:true});
    fs.mkdirSync(liveThumbs,{recursive:true});
    if(fs.existsSync(path.join(stage,"media"))) copyDirectorySync(path.join(stage,"media"),liveMedia);
    if(fs.existsSync(path.join(stage,"thumbnails"))) copyDirectorySync(path.join(stage,"thumbnails"),liveThumbs);
    fs.copyFileSync(path.join(stage,"library.json"),DB_PATH);

    removeDirectorySync(stage);
    clearUndoRecord();

    return {ok:true,state:loadDB(),itemCount:backupDb.items.length};
  }catch{
    return {ok:false,message:"Backup could not be restored."};
  }
});



ipcMain.handle("open-url", async (_, value) => {
  const url = String(value || "").trim();
  if (!/^https?:\/\/\S+/i.test(url)) return { ok:false, message:"Only http:// and https:// URLs can be opened." };
  try {
    await shell.openExternal(url);
    return { ok:true };
  } catch {
    return { ok:false, message:"Could not open URL." };
  }
});

ipcMain.handle("open-file", async (_, filePath) => {
  if (filePath) await shell.openPath(filePath);
});

ipcMain.handle("reveal-file", (_, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle("open-library-folder", async () => {
  await shell.openPath(LIBRARY_ROOT);
  return true;
});

ipcMain.handle("create-folder", (_, { name, parentId = null }) => {
  const db = loadDB();
  const folderName = String(name || "").trim();
  if (!folderName) return { ok:false, state:db, message:"Folder name is empty." };
  if (db.folders.some(f => f.parentId === parentId && f.name.toLowerCase() === folderName.toLowerCase())) {
    return { ok:false, state:db, message:"A folder with this name already exists here." };
  }
  const folder = { id: id("folder"), name: folderName, parentId: parentId || null, created_at: new Date().toISOString() };
  db.folders.push(folder);
  saveDB(db);
  return { ok:true, state:db, folder };
});

ipcMain.handle("set-folder-color", (_, { id: folderId, color = null }) => {
  const db = loadDB();
  const folder = db.folders.find(f => f.id === folderId);
  if (folder) folder.color = color || null;
  saveDB(db);
  return db;
});

ipcMain.handle("rename-item", (_, { id: itemId, name }) => {
  const db = loadDB();
  const item = db.items.find(x => x.id === itemId);
  const newBase = cleanName(String(name || "").trim());
  if (!item || !newBase) return { ok:false, state:db, message:"File name is empty." };
  const ext = path.extname(item.name || item.stored_path || "");
  const requested = path.extname(newBase) ? newBase : `${newBase}${ext}`;
  const dir = path.dirname(item.stored_path);
  const currentBase = path.basename(item.stored_path);
  let destination = path.join(dir, requested);
  if (destination.toLowerCase() !== item.stored_path.toLowerCase() && fs.existsSync(destination)) {
    return { ok:false, state:db, message:"A file with this name already exists in the library." };
  }
  try {
    if (destination.toLowerCase() !== item.stored_path.toLowerCase()) {
      fs.renameSync(item.stored_path, destination);
      try { const oldThumb=thumbnailPathFor(item.stored_path); if(fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb); } catch {}
    }
    item.name = path.basename(destination);
    item.stored_path = destination;
    item.extension = path.extname(destination).toLowerCase();
    item.modified_at = new Date().toISOString();
    item.thumbnail_path = null;
    saveDB(db);
    return { ok:true, state:db, item };
  } catch (error) {
    return { ok:false, state:db, message:"File could not be renamed." };
  }
});

ipcMain.handle("rename-folder", (_, { id: folderId, name }) => {
  const db = loadDB();
  const folder = db.folders.find(f => f.id === folderId);
  const newName = String(name || "").trim();
  if (folder && newName) folder.name = newName;
  saveDB(db);
  return db;
});

ipcMain.handle("delete-folder", (_, folderId) => {
  const db = loadDB();
  const folder = db.folders.find(f => f.id === folderId);
  if (!folder) return db;

  const descendants = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of db.folders) {
      if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
        descendants.add(f.id);
        changed = true;
      }
    }
  }

  const fallback = folder.parentId || null;
  db.items.forEach(item => {
    if (item.folder_id && descendants.has(item.folder_id)) item.folder_id = fallback;
  });
  db.folders = db.folders.filter(f => !descendants.has(f.id));
  saveDB(db);
  return db;
});

ipcMain.handle("copy-items", (_, { ids = [], folderId = null } = {}) => {
  const db = loadDB();
  const copied = [];
  for (const sourceItem of db.items.filter(x => ids.includes(x.id))) {
    try {
      if (!sourceItem.stored_path || !fs.existsSync(sourceItem.stored_path)) continue;
      const dir = path.dirname(sourceItem.stored_path);
      const destination = uniqueDestination(dir, path.basename(sourceItem.stored_path));
      fs.copyFileSync(sourceItem.stored_path, destination);
      const stat = fs.statSync(destination);
      const copy = {
        ...sourceItem,
        id: id("item"),
        name: path.basename(destination),
        stored_path: destination,
        original_path: sourceItem.original_path,
        folder_id: folderId || null,
        created_at: new Date().toISOString(),
        modified_at: stat.mtime.toISOString(),
        thumbnail_path: null,
        tags: [...(sourceItem.tags || [])]
      };
      db.items.unshift(copy);
      copied.push(copy);
    } catch (error) {
      console.error("Copy failed:", sourceItem?.stored_path, error);
    }
  }
  saveDB(db);
  return { copied, state:db };
});

ipcMain.handle("move-items", (_, { ids, folderId = null }) => {
  const db = loadDB();
  const set = new Set(ids || []);
  db.items.forEach(item => { if (set.has(item.id)) item.folder_id = folderId; });
  saveDB(db);
  return db;
});

ipcMain.handle("create-tag", (_, { name }) => {
  const db = loadDB();
  const tagName = String(name || "").trim().replace(/^#+/, "");
  if (!tagName) return { ok:false, state:db, message:"Tag name is empty." };
  if (db.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
    return { ok:false, state:db, message:"This tag already exists." };
  }
  const tag = { id: id("tag"), name: tagName, created_at: new Date().toISOString() };
  db.tags.push(tag);
  saveDB(db);
  return { ok:true, state:db, tag };
});

ipcMain.handle("set-tag-color", (_, { id: tagId, color = null }) => {
  const db = loadDB();
  const tag = db.tags.find(t => t.id === tagId);
  if (tag) tag.color = color || null;
  saveDB(db);
  return db;
});

ipcMain.handle("rename-tag", (_, { id: tagId, name }) => {
  const db = loadDB();
  const tag = db.tags.find(t => t.id === tagId);
  const newName = String(name || "").trim().replace(/^#/, "");
  if (!tag || !newName) return db;
  const old = tag.name;
  if (db.tags.some(t => t.id !== tagId && t.name.toLowerCase() === newName.toLowerCase())) return db;
  tag.name = newName;
  db.items.forEach(item => {
    item.tags = item.tags.map(t => t === old ? newName : t);
  });
  saveDB(db);
  return db;
});

ipcMain.handle("delete-tag", (_, tagId) => {
  const db = loadDB();
  const tag = db.tags.find(t => t.id === tagId);
  if (tag) db.items.forEach(item => item.tags = item.tags.filter(t => t !== tag.name));
  db.tags = db.tags.filter(t => t.id !== tagId);
  saveDB(db);
  return db;
});

ipcMain.handle("update-item-tags", (_, { id: itemId, tags }) => {
  const db = loadDB();
  const item = db.items.find(x => x.id === itemId);
  if (item) item.tags = [...new Set((tags || []).map(x => String(x).replace(/^#/, "").trim()).filter(Boolean))];
  saveDB(db);
  return db;
});

ipcMain.handle("bulk-update-tags", (_, { ids, tagsToAdd = [], tagsToRemove = [] }) => {
  const db = loadDB();
  const set = new Set(ids || []);
  const add = tagsToAdd.map(x => String(x).replace(/^#/, "").trim()).filter(Boolean);
  const remove = new Set(tagsToRemove.map(x => String(x).replace(/^#/, "").trim()));
  db.items.forEach(item => {
    if (!set.has(item.id)) return;
    item.tags = [...new Set([...item.tags, ...add])].filter(t => !remove.has(t));
  });
  saveDB(db);
  return db;
});



ipcMain.handle("batch-rename-items", (_, { items = [] } = {}) => {
  const db = loadDB();
  const requested = Array.isArray(items) ? items : [];
  if (!requested.length) return { ok:false, state:db, message:"No items selected." };

  const targets = [];
  for (const req of requested) {
    const item = db.items.find(x => x.id === req.id);
    if (!item) continue;
    const cleaned = cleanName(String(req.name || "").trim());
    if (!cleaned) return { ok:false, state:db, message:`Empty name for ${item.name}.` };

    const ext = item.extension || path.extname(item.name || "");
    const finalName = path.extname(cleaned) ? cleaned : `${cleaned}${ext}`;
    const finalPath = path.join(path.dirname(item.stored_path), finalName);

    targets.push({ item, finalName, finalPath, oldPath:item.stored_path });
  }

  if (!targets.length) return { ok:false, state:db, message:"No valid items selected." };

  const seen = new Set();
  for (const t of targets) {
    const key = t.finalPath.toLowerCase();
    if (seen.has(key)) {
      return { ok:false, state:db, message:`Duplicate generated name: ${t.finalName}` };
    }
    seen.add(key);

    const sameAsCurrent = t.finalPath.toLowerCase() === t.oldPath.toLowerCase();
    if (!sameAsCurrent && fs.existsSync(t.finalPath) && !targets.some(other => other.oldPath.toLowerCase() === t.finalPath.toLowerCase())) {
      return { ok:false, state:db, message:`A file named "${t.finalName}" already exists.` };
    }
  }

  const staged = [];
  try {
    // Stage every source to a temporary name first. This makes A->B and B->A
    // safe even when the files are in the same folder.
    for (const t of targets) {
      if (t.finalPath.toLowerCase() === t.oldPath.toLowerCase()) continue;
      const tmp = path.join(path.dirname(t.oldPath), `.mediavault-rename-${crypto.randomUUID()}${path.extname(t.oldPath)}`);
      fs.renameSync(t.oldPath, tmp);
      staged.push({ ...t, tmpPath:tmp });
    }

    const stagedById = new Map(staged.map(x => [x.item.id, x]));
    const renamed = [];
    for (const t of targets) {
      const stage = stagedById.get(t.item.id);
      const from = stage ? stage.tmpPath : t.oldPath;
      if (from.toLowerCase() !== t.finalPath.toLowerCase()) {
        fs.renameSync(from, t.finalPath);
        if (stage) {
          try {
            const oldThumb = thumbnailPathFor(t.oldPath);
            if (fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb);
          } catch {}
        }
      }
      t.item.name = t.finalName;
      t.item.stored_path = t.finalPath;
      t.item.extension = path.extname(t.finalPath).toLowerCase();
      t.item.modified_at = new Date().toISOString();
      t.item.thumbnail_path = null;
      renamed.push(t.item);
    }

    saveDB(db);
    return { ok:true, state:db, renamed };
  } catch (error) {
    // Best-effort rollback of any staged files if the final pass fails.
    for (const s of staged.reverse()) {
      try {
        if (fs.existsSync(s.tmpPath) && !fs.existsSync(s.oldPath)) fs.renameSync(s.tmpPath,s.oldPath);
      } catch {}
    }
    return { ok:false, state:loadDB(), message:"Batch rename failed." };
  }
});



ipcMain.handle("create-saved-search", (_, { name, query } = {}) => {
  const db = loadDB();
  const clean = String(name || "").trim();
  const q = String(query || "").trim();
  if (!clean || !q) return { ok:false, message:"Search name and query are required.", state:db };
  if (db.saved_searches.some(item => item.name.toLowerCase() === clean.toLowerCase())) {
    return { ok:false, message:"A saved search with this name already exists.", state:db };
  }
  db.saved_searches.unshift({
    id:id("search"),
    name:clean,
    query:q,
    created_at:new Date().toISOString()
  });
  saveDB(db);
  return { ok:true, state:db };
});

ipcMain.handle("rename-saved-search", (_, { id:searchId, name } = {}) => {
  const db = loadDB();
  const clean = String(name || "").trim();
  const target = db.saved_searches.find(item => item.id === searchId);
  if (!target || !clean) return db;
  if (db.saved_searches.some(item => item.id !== searchId && item.name.toLowerCase() === clean.toLowerCase())) return db;
  target.name = clean;
  saveDB(db);
  return db;
});

ipcMain.handle("delete-saved-search", (_, searchId) => {
  const db = loadDB();
  db.saved_searches = db.saved_searches.filter(item => item.id !== searchId);
  saveDB(db);
  return db;
});

ipcMain.handle("create-collection", (_, { name } = {}) => {
  const db = loadDB();
  const collectionName = String(name || "").trim();
  if (!collectionName) return { ok:false, state:db, message:"Collection name is empty." };
  if (db.collections.some(c => c.name.toLowerCase() === collectionName.toLowerCase())) {
    return { ok:false, state:db, message:"A collection with this name already exists." };
  }
  const collection = {
    id: id("collection"),
    name: collectionName,
    created_at: new Date().toISOString()
  };
  db.collections.push(collection);
  saveDB(db);
  return { ok:true, state:db, collection };
});

ipcMain.handle("rename-collection", (_, { id: collectionId, name } = {}) => {
  const db = loadDB();
  const collection = db.collections.find(c => c.id === collectionId);
  const newName = String(name || "").trim();
  if (!collection || !newName) return { ok:false, state:db, message:"Collection name is empty." };
  if (db.collections.some(c => c.id !== collectionId && c.name.toLowerCase() === newName.toLowerCase())) {
    return { ok:false, state:db, message:"A collection with this name already exists." };
  }
  collection.name = newName;
  saveDB(db);
  return { ok:true, state:db, collection };
});

ipcMain.handle("delete-collection", (_, collectionId) => {
  const db = loadDB();
  db.collections = db.collections.filter(c => c.id !== collectionId);
  db.items.forEach(item => {
    item.collection_ids = (item.collection_ids || []).filter(id => id !== collectionId);
  });
  saveDB(db);
  return db;
});

ipcMain.handle("update-item-collections", (_, { ids = [], collectionId, add = true } = {}) => {
  const db = loadDB();
  const set = new Set(ids || []);
  db.items.forEach(item => {
    if (!set.has(item.id)) return;
    const current = new Set(item.collection_ids || []);
    if (add) current.add(collectionId);
    else current.delete(collectionId);
    item.collection_ids = [...current];
  });
  saveDB(db);
  return db;
});


function createWindow() {
  ensureLibrary();
  if (process.platform === "win32") app.setAppUserModelId("com.mediavault.desktop");
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: "#111214",
    title: "MediaVault",
    icon: path.join(__dirname, "../assets/mediavault.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // MediaVault is a local desktop library; allow the renderer to preview local video files.
      webSecurity: false
    }
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});