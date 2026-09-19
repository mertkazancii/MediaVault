<div align="center">

# MediaVault

**A local-first Windows media library for organizing, searching, tagging and preserving personal media.**

<img src="docs/mediavault-banner.png" alt="MediaVault" width="900">

<p>
  <a href="#features">Features</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#building-from-source">Build from source</a> ·
  <a href="#privacy--storage">Privacy & Storage</a> ·
  <a href="#keyboard-shortcuts">Keyboard shortcuts</a>
</p>

</div>

---

## What is MediaVault?

MediaVault is a Windows desktop media library built around a simple idea: **your archive should stay on your PC, remain easy to browse, and be easy to organize.**

There is no account requirement. Your media library is stored locally in `Documents\MediaVault`.

## Features

### Organize
- Folders and nested subfolders
- Tags with colors
- Collections
- Saved Searches
- File and folder colors
- Inbox workflow for unsorted imports
- Batch Rename

### Browse
- Grid, Compact and Masonry views
- Fast thumbnails with local caching
- Media Viewer with zoom, rotate and fullscreen
- Inspector with metadata, tags, notes, source URL and file details
- Recently useful views such as Favorites and Inbox

### Search
- Normal text search
- `tag:`
- `type:`
- `ext:`
- `color:`
- `favorite:`
- `folder:`
- `size:`
- `created:`
- `modified:`
- `note:`
- `source:`

### Safety
- Exact Duplicate Manager
- Backup & Restore
- Automatic safety backup before restore
- One-step `Ctrl+Z` undo for deletes
- Deleted items are moved to the internal trash before removal

### Fast workflow
- Drag & drop import
- Import directly into Inbox
- Clipboard image/file import with `Ctrl+V`
- Keyboard shortcuts for common actions
- Click an empty area to clear the current selection

---

## Screenshots

> Replace the placeholder screenshots in `docs/screenshots/` with real captures from the installed application before publishing the repository.

### Library

![MediaVault Library](docs/screenshots/library.png)

### Media Viewer

![MediaVault Media Viewer](docs/screenshots/viewer.png)

### Inbox

![MediaVault Inbox](docs/screenshots/inbox.png)

### Settings

![MediaVault Settings](docs/screenshots/settings.png)

---

## Installation

### Recommended: Windows Installer

Download the latest:

**`MediaVault-2.0.6-Setup.exe`**

Run the installer and choose the installation directory. The installer creates a Start Menu entry and a Desktop shortcut.

### Portable

Download:

**`MediaVault-2.0.6-Portable.exe`**

No installation is required.

### First launch

MediaVault creates its local library under:

```text
Documents\MediaVault
```

Backups are stored under:

```text
Documents\MediaVault Backups
```

Your media files remain local unless you explicitly move or copy them elsewhere.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + V` | Paste/import clipboard content |
| `Ctrl + K` | Focus search |
| `Ctrl + Shift + S` | Save current search |
| `Ctrl + Shift + N` | New folder |
| `Ctrl + Shift + F` | Toggle favorite for selection |
| `F2` | Rename selected item |
| `Space` / `Enter` | Preview selected item |
| `Delete` | Move selected items to trash |
| `Ctrl + Z` | Undo the latest delete |
| `Ctrl + A` | Select visible items |

---

## Privacy & Storage

MediaVault is designed as a local-first desktop application.

- No account is required.
- The library database is stored locally.
- Thumbnails are stored locally.
- Backups are stored locally unless you choose to move them elsewhere.
- Source URLs and notes are stored as library metadata.

---

## Building from source

Requirements:

- Windows 10/11 x64
- Node.js
- npm

Install dependencies:

```powershell
npm install
```

Run the development build:

```powershell
npm run dev
```

Build the renderer:

```powershell
npm run build
```

Create Windows release binaries:

```powershell
npm run dist
```

Or use the included release helper:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\build-windows.ps1
```

The release directory will contain:

```text
release\
  MediaVault-2.0.6-Setup.exe
  MediaVault-2.0.6-Portable.exe
  SHA256SUMS.txt
```

The first Windows packaging run may require elevated PowerShell privileges if the Windows signing tools need symbolic-link permissions.

---

## Checksums

For published binaries, include `SHA256SUMS.txt` with the release and verify downloaded files with:

```powershell
Get-FileHash .\MediaVault-2.0.6-Setup.exe -Algorithm SHA256
Get-FileHash .\MediaVault-2.0.6-Portable.exe -Algorithm SHA256
```

---

## Release notes

See [`RELEASE_NOTES_2.0.6.md`](RELEASE_NOTES_2.0.6.md).

## Project documentation

- [`RELEASE.md`](RELEASE.md) — Windows release checklist
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`docs/screenshots/README.md`](docs/screenshots/README.md) — screenshot checklist

---

## License

MediaVault is licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**MediaVault 2.0.6**

Local-first · Windows · Personal media archive

</div>
