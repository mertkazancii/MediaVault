# Contributing

Thanks for helping improve MediaVault.

## Development

```powershell
npm install
npm run dev
```

## Before opening a pull request

- Keep the local-first architecture intact unless the change explicitly requires otherwise.
- Avoid introducing native dependencies without a strong reason.
- Test the affected feature manually on Windows.
- Run:

```powershell
npm run build
```

- Describe user-visible changes and any migration/backup implications.

## Releases

Windows release artifacts are created with:

```powershell
.\scripts\build-windows.ps1
```
