# MediaVault

**MediaVault** is a local-first Windows desktop media library for collecting, browsing, tagging, and organizing images and videos. It includes folder organization, search and filters, a media viewer, bulk actions, and an optional Chrome Web Clipper.

> Current source package: **2.2.7**. This repository contains source code, not a prebuilt signed Windows installer.

## Features

- Local media library stored under your Windows Documents folder
- Nested folders, tags, color labels, favorites, collections, and Inbox
- Search, filters, media viewer, Inspector, and bulk editing
- Cached thumbnails and video preview support
- Chrome Web Clipper for saving images into the local library
- Windows system-tray behavior so the local bridge can stay available while the main window is hidden

## Requirements

- Windows 10/11 x64 for packaged desktop builds
- Node.js LTS and npm for development/building
- Google Chrome for the optional extension

## Run in development

```powershell
npm install
npm run dev
```

## Build Windows installers

```powershell
npm install
npm run dist
```

Artifacts are written to `release/` (NSIS installer and portable executable). The installer is not code-signed by default, so Windows SmartScreen may show a warning.

## Install the Chrome extension for development

1. Build and install MediaVault, then open it once.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `web-clipper/` directory.
4. The extension uses the MediaVault local bridge at `127.0.0.1:43821`; MediaVault must be running in the system tray for saving to work.

For Chrome Web Store submission, upload the contents of `web-clipper/` as a ZIP with `manifest.json` at the ZIP root. Review `docs/CHROME-WEB-STORE.md` and `docs/PRIVACY.md` before publishing.

## Data and privacy

MediaVault is designed for local-first use. The desktop app stores the library database and imported files on the user's computer. The Web Clipper downloads a selected image to the local MediaVault library through a loopback-only local bridge. See [`docs/PRIVACY.md`](docs/PRIVACY.md) for a draft privacy statement and the exact behavior to review before public release.

## Security notes

- Do not expose the local bridge port `43821` to the network.
- Keep the bridge bound to loopback (`127.0.0.1`) only.
- Review all requested Chrome permissions and the fixed extension ID before submitting to the Chrome Web Store.
- Do not commit local libraries, media files, credentials, signing certificates, or build output.

## License

No license file is included yet. Unless a license is added, the source is not granted an open-source license by default. Choose a license before advertising this repository as open source.
