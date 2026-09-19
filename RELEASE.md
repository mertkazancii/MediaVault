# MediaVault Windows Release

## Build prerequisites

Windows 10/11 x64, Node.js LTS and npm.

## Create the release

PowerShell:

```powershell
.\scripts\build-windows.ps1
```

Or:

```powershell
npm install
npm run dist
```

The `release` directory will contain:

- `MediaVault-2.0.3-Setup.exe` — normal Windows installer
- `MediaVault-2.0.3-Portable.exe` — portable build

The installer creates Start Menu and Desktop shortcuts and lets the user choose the installation directory.

## Release smoke test

1. Install MediaVault.
2. Launch it from the Start Menu or Desktop shortcut.
3. Import one image and one video.
4. Restart the app and verify the library is still present.
5. Test Favorites, tags, collections, Inbox and Saved Searches.
6. Open Inspector and scroll through the full panel.
7. Create a backup, delete one test item, use `Ctrl+Z`, then test Restore backup with a test backup.
8. Uninstall and confirm user library data remains under `Documents\\MediaVault`.

## Publishing

For the first public build, publish the installer and portable executable together. Keep the exact version number in the release title and checksums alongside the files.


## v2.0.4 packaging fix

The packaging error from v2.0.3 was caused by `electron` being listed under `dependencies`. It is now under `devDependencies`, which matches electron-builder's requirement.


## v2.0.6 release artifacts

The recommended public files are:

- `MediaVault-2.0.6-Setup.exe` — standard Windows installation.
- `MediaVault-2.0.6-Portable.exe` — portable Windows build.
- `SHA256SUMS.txt` — SHA-256 checksums for both binaries.

The current build is unsigned unless a Windows code-signing certificate is supplied to electron-builder. The build log may therefore report that signing is skipped. electron-builder supports target-specific NSIS `artifactName` and portable `artifactName`, which are used here. citeturn694344search0turn694344search5
