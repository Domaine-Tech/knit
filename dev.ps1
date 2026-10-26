<#
.SYNOPSIS
    Lance Knit en mode développement avec rechargement automatique (Watch Mode).

.DESCRIPTION
    Ce script démarre l'environnement de développement Knit avec un file watcher complet :
    - Mode Desktop (par défaut) : Lance Tauri v2 avec Vite HMR (rechargement instantané des composants React/CSS)
      et surveillance continue du code Rust (recompilation automatique à chaque modification).
    - Mode Web : Démarre le serveur Vite rapide dans le navigateur avec rechargement à chaud instantané.

.PARAMETER Mode
    'desktop' (défaut) ou 'web'

.EXAMPLE
    .\dev.ps1
    .\dev.ps1 -Mode web
    .\dev.ps1 -Mode desktop
#>

param(
    [ValidateSet('desktop', 'web')]
    [string]$Mode = 'desktop'
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host " 🧶 Knit — Environnement de Développement (Watch Mode)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Magenta

# Une session ouverte avant l'installation de Node ne voit pas le PATH machine.
# npm.cmd évite npm.ps1, que PowerShell bloque selon la stratégie d'exécution.
if (-not (Get-Command "npm.cmd" -ErrorAction SilentlyContinue)) {
    $nodeRoots = @(
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)},
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Programs" })
    ) | Where-Object { $_ }
    foreach ($root in $nodeRoots) {
        $dir = Join-Path $root "nodejs"
        if (Test-Path (Join-Path $dir "npm.cmd")) {
            $env:Path = "$dir;$env:Path"
            break
        }
    }
}

$npm = (Get-Command "npm.cmd" -ErrorAction SilentlyContinue).Source
if (-not $npm) {
    Write-Error "npm n'est pas installé ou n'est pas dans le PATH."
    exit 1
}

if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Error "cargo (Rust) n'est pas installé ou n'est pas dans le PATH."
    exit 1
}

$RepoRoot = $PSScriptRoot
$KnitAppDir = Join-Path $RepoRoot "knit-app"

# Vérification des node_modules dans knit-app
if (-not (Test-Path (Join-Path $KnitAppDir "node_modules"))) {
    Write-Host "📦 Installation initiale des dépendances npm..." -ForegroundColor Yellow
    Push-Location $KnitAppDir
    & $npm install
    Pop-Location
}

if ($Mode -eq 'web') {
    Write-Host "🌐 Lancement du mode Web rapide (Vite HMR sur http://localhost:5173)..." -ForegroundColor Green
    Write-Host "   Chaque modification (.tsx, .ts, .css) rechargera instantanément l'application." -ForegroundColor DarkGray
    Push-Location $KnitAppDir
    & $npm run dev
    Pop-Location
} else {
    Write-Host "🖥️ Lancement du mode Desktop Tauri v2 (Rechargement automatique complet)..." -ForegroundColor Green
    Write-Host "   - Frontend : Vite HMR actif (mise à jour instantanée React/CSS)" -ForegroundColor DarkGray
    Write-Host "   - Backend  : Tauri CLI surveille et recompile automatiquement le Rust" -ForegroundColor DarkGray
    Push-Location $KnitAppDir
    & $npm run tauri dev
    Pop-Location
}
