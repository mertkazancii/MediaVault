# MediaVault Privacy Statement (draft for review)

**Last updated:** 2026-10-28

MediaVault is a local-first desktop media organizer. The desktop app stores imported media and its library metadata on the user's computer. The Chrome Web Clipper sends the selected image URL and optional metadata (such as source page URL, tags, notes, and destination folder) to the MediaVault app through a local connection on `127.0.0.1` so the app can download and import the image locally.

## Data handled

- Image URL and, when available, the page URL/title
- Optional filename, tags, notes, collection, and destination folder selected by the user
- Local library records needed to organize imported media

## Data sharing

The extension is not designed to send collected media or metadata to a developer-operated cloud service. When saving a clip, the MediaVault desktop app requests the image from the website URL provided by Chrome. The website hosting the image may receive a request from the user's computer, including ordinary network metadata and a referrer where applicable.

## Storage and retention

Imported media and library metadata are stored locally on the user's computer in the MediaVault library. Users control local files and can remove them through the app or their file system.

## Permissions

The extension uses context-menu access to provide a “Save image to MediaVault” action, storage for pending clip state, active-tab access, content scripts to detect image drags and display the centered overlay, and host access for web image URLs and the local MediaVault bridge. These permissions are used to support the save workflow.

## Contact

Before publication, replace this section with a public support email or issue tracker URL controlled by the publisher.

---

**Publisher review required:** This document is a draft based on the current source implementation. Verify the behavior against the final release, add a real contact method, host this page at a stable public HTTPS URL, and ensure the Chrome Web Store privacy disclosures match the submitted code before publication.
