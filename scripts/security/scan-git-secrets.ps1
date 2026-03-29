param(
    [switch]$History
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

Write-Host "[secret-scan] Repo root: $repoRoot"

$patterns = @(
    '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'firebase-adminsdk',
    '"private_key"\s*:\s*"-----BEGIN',
    '(?i)GEMINI_API_KEY\s*=\s*[^\s]+'
)

$regex = ($patterns -join "|")
$tracked = git ls-files
$trackedExisting = $tracked | Where-Object { Test-Path $_ }

if (-not $trackedExisting) {
    Write-Host "[secret-scan] No tracked files found."
    exit 0
}

$hits = Select-String -Path $trackedExisting -Pattern $regex -CaseSensitive:$false -ErrorAction SilentlyContinue

$allowlist = @(
    'README.md:.*GEMINI_API_KEY=your_',
    'backend\\.env.example:.*GEMINI_API_KEY=replace_'
)

$filteredHits = @()
foreach ($hit in $hits) {
    $normalizedPath = $hit.Path.Replace('/', '\\')
    if ($normalizedPath -match 'scripts\\security\\scan-git-secrets\.ps1$') {
        continue
    }
    $entry = "{0}:{1}: {2}" -f $normalizedPath, $hit.LineNumber, $hit.Line.Trim()
    $isAllowed = $false
    foreach ($allowed in $allowlist) {
        if ($entry -match $allowed) {
            $isAllowed = $true
            break
        }
    }
    if (-not $isAllowed) {
        $filteredHits += $hit
    }
}

if ($filteredHits) {
    Write-Host "[secret-scan] Potential secrets found in tracked files:" -ForegroundColor Red
    $filteredHits | ForEach-Object {
        Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim())
    }
    exit 1
}

if ($History) {
    Write-Host "[secret-scan] Scanning git history with gitleaks..."
    $gitleaks = Get-Command gitleaks -ErrorAction SilentlyContinue
    if (-not $gitleaks) {
        Write-Host "[secret-scan] gitleaks not found in PATH; skipping history scan." -ForegroundColor Yellow
    } else {
        gitleaks detect --source . --redact --verbose
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }
}

Write-Host "[secret-scan] No tracked secret patterns detected." -ForegroundColor Green
exit 0
