$ErrorActionPreference = "Stop"

Write-Host "MediaVault Windows Release Builder" -ForegroundColor Cyan
Write-Host ""

$node = node --version
Write-Host "Node: $node"

Write-Host ""
Write-Host "[0/4] Cleaning previous release output..."
if (Test-Path ".\release") {
    Remove-Item -Recurse -Force ".\release"
}

Write-Host ""
Write-Host "[1/4] Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Write-Host ""
Write-Host "[2/4] Building renderer..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Vite production build failed." }

Write-Host ""
Write-Host "[3/4] Creating Windows installer + portable build..."
npx electron-builder --win nsis:x64 portable:x64 --publish never
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed." }

if (-not (Test-Path ".\release\MediaVault-2.0.6-Setup.exe")) {
    throw "The Windows installer was not created."
}
if (-not (Test-Path ".\release\MediaVault-2.0.6-Portable.exe")) {
    throw "The portable executable was not created."
}

Write-Host ""
Write-Host "[4/4] Writing SHA-256 checksums..."
$files = @(
    ".\release\MediaVault-2.0.6-Setup.exe",
    ".\release\MediaVault-2.0.6-Portable.exe"
)
$checksumLines = foreach ($file in $files) {
    $hash = (Get-FileHash -Algorithm SHA256 $file).Hash
    "$hash  $(Split-Path $file -Leaf)"
}
$checksumLines | Set-Content ".\release\SHA256SUMS.txt"

Write-Host ""
Write-Host "Release files:" -ForegroundColor Green
Get-ChildItem .\release\ |
    Where-Object { $_.Name -like "MediaVault-*" -or $_.Name -eq "SHA256SUMS.txt" } |
    Select-Object Name, Length
