const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("mediaVault", {
  chooseImportFiles: () => ipcRenderer.invoke("choose-import-files"),
  importFiles: (filePaths, folderId = null, inInbox = false) => ipcRenderer.invoke("import-files", { paths: filePaths, folderId, inInbox }),
  pasteClipboard: (folderId = null, inInbox = false) => ipcRenderer.invoke("paste-clipboard", { folderId, inInbox }),
  getDroppedFilePath: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return ""; }
  },
  getAssetDataUrl: (filePath) => ipcRenderer.invoke("get-asset-data-url", filePath),
  getThumbnailDataUrl: (filePath) => ipcRenderer.invoke("get-thumbnail-data-url", filePath),
  saveVideoThumbnail: (filePath, dataUrl) => ipcRenderer.invoke("save-video-thumbnail", { filePath, dataUrl }),
  getItemMetadata: (filePath) => ipcRenderer.invoke("get-item-metadata", filePath),
  getState: () => ipcRenderer.invoke("get-state"),
  toggleFavorite: (id) => ipcRenderer.invoke("toggle-favorite", id),
  setItemFavorite: (ids, favorite = true) => ipcRenderer.invoke("set-item-favorite", { ids, favorite }),
  setItemsInbox: (ids, inbox = true) => ipcRenderer.invoke("set-items-inbox", { ids, inbox }),
  organizeInbox: (ids, options = {}) => ipcRenderer.invoke("organize-inbox", { ids, ...options }),
  setItemColor: (ids, color = null) => ipcRenderer.invoke("set-item-color", { ids, color }),
  updateItemInfo: (id, notes = "", sourceUrl = "") => ipcRenderer.invoke("update-item-info", { id, notes, source_url:sourceUrl }),
  deleteItems: (ids) => ipcRenderer.invoke("delete-items", ids),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  revealFile: (filePath) => ipcRenderer.invoke("reveal-file", filePath),
  openLibraryFolder: () => ipcRenderer.invoke("open-library-folder"),
  createBackup: () => ipcRenderer.invoke("create-backup"),
  chooseBackupFolder: () => ipcRenderer.invoke("choose-backup-folder"),
  restoreBackup: (folderPath) => ipcRenderer.invoke("restore-backup", folderPath),
  openBackupsFolder: () => ipcRenderer.invoke("open-backups-folder"),
  undoDelete: () => ipcRenderer.invoke("undo-delete"),

  createFolder: (name, parentId = null) => ipcRenderer.invoke("create-folder", { name, parentId }),
  renameFolder: (id, name) => ipcRenderer.invoke("rename-folder", { id, name }),
  setFolderColor: (id, color = null) => ipcRenderer.invoke("set-folder-color", { id, color }),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),
  renameItem: (id, name) => ipcRenderer.invoke("rename-item", { id, name }),
  batchRenameItems: (items) => ipcRenderer.invoke("batch-rename-items", { items }),
  copyItems: (ids, folderId = null) => ipcRenderer.invoke("copy-items", { ids, folderId }),
  moveItems: (ids, folderId = null) => ipcRenderer.invoke("move-items", { ids, folderId }),

  createCollection: (name) => ipcRenderer.invoke("create-collection", { name }),
  renameCollection: (id, name) => ipcRenderer.invoke("rename-collection", { id, name }),
  deleteCollection: (id) => ipcRenderer.invoke("delete-collection", id),
  updateItemCollections: (ids, collectionId, add = true) =>
    ipcRenderer.invoke("update-item-collections", { ids, collectionId, add }),

  createTag: (name) => ipcRenderer.invoke("create-tag", { name }),
  renameTag: (id, name) => ipcRenderer.invoke("rename-tag", { id, name }),
  setTagColor: (id, color = null) => ipcRenderer.invoke("set-tag-color", { id, color }),
  deleteTag: (id) => ipcRenderer.invoke("delete-tag", id),
  createSavedSearch: (name, query) => ipcRenderer.invoke("create-saved-search", { name, query }),
  renameSavedSearch: (id, name) => ipcRenderer.invoke("rename-saved-search", { id, name }),
  deleteSavedSearch: (id) => ipcRenderer.invoke("delete-saved-search", id),
  updateItemTags: (id, tags) => ipcRenderer.invoke("update-item-tags", { id, tags }),
  bulkUpdateTags: (ids, tagsToAdd = [], tagsToRemove = []) =>
    ipcRenderer.invoke("bulk-update-tags", { ids, tagsToAdd, tagsToRemove })
});