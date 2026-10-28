# Chrome Web Store publication checklist

## Extension package

Upload a ZIP whose root contains `manifest.json`, `service-worker.js`, `content.js`, `sidepanel.html`, `sidepanel.js`, `sidepanel.css`, and `icons/`. Do not upload the enclosing `web-clipper/` folder as the ZIP root.

## Suggested listing

**Name:** MediaVault Web Clipper

**Short description:** Save web images to your local MediaVault library with folders, tags, notes, and source links.

**Detailed description:**
MediaVault Web Clipper helps you collect images from the web into your personal MediaVault desktop library. Start a drag on an image or use the image context menu to open a centered overlay, choose All items or a folder, add optional tags and notes, and save. The extension communicates with the MediaVault desktop app through a local loopback connection; it is not a cloud storage service. MediaVault must be installed and running in the system tray.

## Before submission

- Verify the published extension ID matches `WEB_CLIPPER_EXTENSION_ID` in `electron/main.js`.
- Test install from the packaged ZIP in a clean Chrome profile.
- Test image drag, context-menu save, duplicate image behavior, folder selection, errors when MediaVault is closed, and supported image formats.
- Host `PRIVACY.md` on a stable public HTTPS page and add its URL in the store dashboard.
- Add a working support contact URL/email.
- Complete the Chrome Web Store privacy practices / data use disclosures truthfully.
- Supply original screenshots of the actual extension in use (not mockups) and a promotional tile if requested.
- Ensure the extension does not access or collect data beyond what is required for the save action.
- Confirm that the publisher account has completed any required developer registration and fee.

## Important

This repository contains a draft listing and privacy statement only. It has not been reviewed or approved by Google, and no store submission has been made.
