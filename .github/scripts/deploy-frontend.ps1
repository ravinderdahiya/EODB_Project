param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDir,

  [Parameter(Mandatory = $true)]
  [string]$TargetDir,

  [string]$AppPoolName = "EODB_Frontend"
)

$ErrorActionPreference = "Stop"

Write-Host "Frontend deploy started"
Write-Host "SourceDir: $SourceDir"
Write-Host "TargetDir: $TargetDir"

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "Source directory does not exist: $SourceDir"
}

# Build in an isolated temp workspace to avoid local node_modules file locks.
$tempRoot = [System.IO.Path]::GetTempPath()
$buildWorkspace = Join-Path $tempRoot ("eodb-frontend-build-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $buildWorkspace -Force | Out-Null

& robocopy `
  $SourceDir `
  $buildWorkspace `
  /MIR /R:2 /W:2 /NFL /NDL /NP /NJH /NJS `
  /XD ".git" "node_modules" "dist"

$robocopyBuildCopyCode = $LASTEXITCODE
if ($robocopyBuildCopyCode -ge 8) {
  throw "Robocopy to temp build workspace failed with exit code $robocopyBuildCopyCode"
}

Push-Location $buildWorkspace
try {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed"
  }

  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed"
  }
}
finally {
  Pop-Location
}

$buildDir = Join-Path $buildWorkspace "dist"
if (-not (Test-Path -LiteralPath $buildDir)) {
  throw "Build output not found: $buildDir"
}

if (-not (Test-Path -LiteralPath $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# Mirror built frontend to IIS path.
& robocopy `
  $buildDir `
  $TargetDir `
  /MIR /R:2 /W:2 /NFL /NDL /NP /NJH /NJS

$robocopyCode = $LASTEXITCODE
if ($robocopyCode -ge 8) {
  throw "Robocopy failed with exit code $robocopyCode"
}

$webConfigTemplate = Join-Path $SourceDir ".github\iis\web.config"
if (Test-Path -LiteralPath $webConfigTemplate) {
  Copy-Item -LiteralPath $webConfigTemplate -Destination (Join-Path $TargetDir "web.config") -Force
  Write-Host "Copied frontend IIS web.config template"
} else {
  Write-Warning "Frontend IIS web.config template not found at: $webConfigTemplate"
}

Import-Module WebAdministration
if (Test-Path -LiteralPath "IIS:\AppPools\$AppPoolName") {
  Restart-WebAppPool -Name $AppPoolName
  Write-Host "Restarted IIS app pool: $AppPoolName"
} else {
  Write-Warning "App pool '$AppPoolName' not found. Restart manually if required."
}

if (Test-Path -LiteralPath $buildWorkspace) {
  Remove-Item -LiteralPath $buildWorkspace -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Frontend deploy completed"
