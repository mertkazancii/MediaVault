# MediaVault Web Clipper 1.2.0

The Chrome extension opens its own Chrome side panel when a web image drag begins or the image context-menu action is used. It talks to the running MediaVault desktop application through a loopback-only HTTP bridge at `127.0.0.1:43821`; it does not use Native Messaging and does not bring the desktop window to the foreground.

The panel retrieves current folders and collections from the library and can save an image to All items or a chosen folder with tags, notes, collection, Inbox, and source-URL options. After a successful save, it clears the pending image and asks Chrome to close the side panel.

## Install
1. Build and install `MediaVault-2.2.1-Setup.exe` from this source package.
2. Open MediaVault once and leave it running.
3. Remove any older MediaVault Web Clipper extension from `chrome://extensions`.
4. Extract the separately supplied `MediaVault-Web-Clipper-v1.2.0-BrowserPanel.zip`, enable Developer mode, and choose **Load unpacked** on its `web-clipper` folder.
5. Drag an image from a website or right-click it and choose **Save image to MediaVault**.

The fixed extension ID in the manifest must not be changed, because the local bridge accepts that extension origin only.
