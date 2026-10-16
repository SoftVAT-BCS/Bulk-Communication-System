@echo off
setlocal DisableDelayedExpansion
rem BCS Step 1E - repository rules only. Open this plain-text file to inspect it.
set "BCS_RULES_SELF=%~f0"
if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    echo [STOP] Windows PowerShell was not found. No setup changes were made.
    endlocal
    exit /b 1
)
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; try { $raw=[IO.File]::ReadAllText($env:BCS_RULES_SELF); $mark=[Environment]::NewLine+'# BCS_STEP1E_POWERSHELL_START'+[Environment]::NewLine; $i=$raw.IndexOf($mark,[StringComparison]::Ordinal); if($i -lt 0){throw 'Setup payload marker not found.'}; & ([scriptblock]::Create($raw.Substring($i+$mark.Length))); } catch { Write-Host ('[STOP] '+$_.Exception.Message); exit 1 }"
set "BCS_RULES_RESULT=%ERRORLEVEL%"
endlocal & exit /b %BCS_RULES_RESULT%
# BCS_STEP1E_POWERSHELL_START
# Intended for Windows PowerShell 5.1 in the confirmed Windows workspace.
# No Git writes, staging, commits, remotes, policy changes, installs or network calls.
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$Root = 'E:\Bulk-Communicatio-System'
$PackId = 'BCS-PHASE1-STEP1E-1.0'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$Created = @()
$WritesStarted = $false

function Hash-Bytes {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Hash-File {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
}

function Assert-NormalPath {
    param([string]$Path)
    # Reject existing junctions/symbolic links along the destination or source path.
    $node = [System.IO.Path]::GetFullPath($Path)
    while (-not [string]::IsNullOrEmpty($node)) {
        if (Test-Path -LiteralPath $node) {
            $item = Get-Item -LiteralPath $node -Force -ErrorAction Stop
            if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw ('Reparse point/junction/symbolic link is not allowed: ' + $node)
            }
        }
        $parent = [System.IO.Path]::GetDirectoryName($node)
        if ($parent -eq $node) { break }
        $node = $parent
    }
}

function Read-IpxSnapshot {
    $ipxRoot = Join-Path $Root 'IPX'
    Assert-NormalPath $ipxRoot
    $queue = New-Object 'System.Collections.Generic.Queue[string]'
    $queue.Enqueue($ipxRoot)
    $records = @()
    while ($queue.Count -gt 0) {
        $directory = $queue.Dequeue()
        foreach ($item in @(Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop)) {
            if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw ('IPX contains a junction/symbolic link. No setup writes permitted: ' + $item.FullName)
            }
            if ($item.PSIsContainer) {
                $queue.Enqueue($item.FullName)
            } else {
                $relative = $item.FullName.Substring($ipxRoot.Length + 1).Replace('\', '/')
                $records += [pscustomobject][ordered]@{
                    path = $relative
                    length = [long]$item.Length
                    sha256 = Hash-File $item.FullName
                }
            }
        }
    }
    $records = @($records | Sort-Object -Property path)
    if ($records.Count -eq 0) { throw 'The IPX tree is empty.' }
    $lines = @($records | ForEach-Object { $_.path + '|' + $_.length.ToString([System.Globalization.CultureInfo]::InvariantCulture) + '|' + $_.sha256 })
    $digest = Hash-Bytes ($Utf8.GetBytes(($lines -join "`n")))
    return [pscustomobject][ordered]@{
        schemaVersion = 1
        relativeRoot = 'IPX'
        fileCount = $records.Count
        treeSha256 = $digest
        files = $records
    }
}

function Write-NewVerifiedFile {
    param([string]$Path, [byte[]]$Bytes, [string]$ExpectedHash)
    # CreateNew is deliberate: never use Create, Truncate, WriteAllText or Set-Content.
    # A concurrent new file causes an exception, not an overwrite.
    Assert-NormalPath $Path
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $stream.Write($Bytes, 0, $Bytes.Length)
        $stream.Flush()
    } finally { $stream.Dispose() }
    if ((Hash-File $Path) -cne $ExpectedHash) {
        throw ('New file failed hash verification: ' + $Path)
    }
}

$Rules = [ordered]@{}
$Rules['.gitignore'] = @'
# BCS / Universal Notify - repository exclusions
# Ignore rules are not secret scanning. Review every first commit.
# Keep approved IPX HTML/CSS/JS, Markdown, migrations and lockfiles trackable.

# Local downloads and private working material (root folders only)
/Downloads/
/.local/
/.backups/
/backups/

# Secrets and machine-specific credentials
.env
.env.*
!.env.example
.npmrc
.pypirc
.netrc
.aws/
.secrets/
secrets/
*.pem
*.key
*.pfx
*.p12
id_rsa
id_ed25519

# Dependencies and generated output
node_modules/
.next/
dist/
build/
out/
.turbo/
.cache/
.pnpm-store/
*.tsbuildinfo

# Test output and local logs (not test source)
coverage/
playwright-report/
test-results/
*.log
*.log.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local databases and backups. Do not ignore *.sql: migrations are source.
*.db
*.sqlite
*.sqlite3
*.dump
*.bak
*.backup

# Local tool/deployment state
.vercel/
.serverless/
.terraform/
*.tfstate
*.tfstate.*

# Editor and operating-system temporary files
.idea/
.vscode/
.DS_Store
Thumbs.db
Desktop.ini
*.swp
*.swo
*~
'@
$Rules['.gitattributes'] = @'
# BCS / Universal Notify - explicit line-ending policy
# This file does not rewrite files already on disk.
* text=auto eol=lf

# Windows command launchers check out with CRLF.
*.cmd text eol=crlf
*.bat text eol=crlf

# Binary assets must not be normalized.
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.ico binary
*.pdf binary
*.zip binary
*.woff binary
*.woff2 binary
*.mp4 binary

# Archived handover is also an original, byte-preserved reference.
docs/reference/ORIGINAL-PROJECT-HANDOVER.md -text -filter -ident !eol !working-tree-encoding

# Approved IPX: no text normalization, clean/smudge filters or ident expansion.
# Keep this rule last. Do not add nested attributes or format IPX.
IPX/** -text -filter -ident !eol !working-tree-encoding
'@
$Rules['.editorconfig'] = @'
# BCS / Universal Notify - editing defaults for supported editors
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
# Preserve intentional Markdown hard-break spaces.
trim_trailing_whitespace = false

[*.{cmd,bat}]
end_of_line = crlf

# Do not apply these editing defaults to preserved reference material.
# This does not make files read-only: the no-edit IPX rule still applies.
[IPX/**]
charset = unset
end_of_line = unset
indent_style = unset
indent_size = unset
insert_final_newline = unset
trim_trailing_whitespace = unset

[docs/reference/ORIGINAL-PROJECT-HANDOVER.md]
charset = unset
end_of_line = unset
indent_style = unset
indent_size = unset
insert_final_newline = unset
trim_trailing_whitespace = unset
'@

function Read-Git {
    param([string[]]$Arguments, [int[]]$AllowedExitCodes = @(0))
    $lines = @(& $GitExe --no-optional-locks -c core.fsmonitor=false -c core.untrackedCache=false -C $Root @Arguments)
    $code = $LASTEXITCODE
    if ($AllowedExitCodes -notcontains $code) {
        throw ('Read-only Git check failed: ' + ($Arguments -join ' ') + ' [exit ' + $code + ']')
    }
    return [pscustomobject]@{ Lines = $lines; Code = $code }
}

function Assert-InitialGitState {
    $top = Read-Git -Arguments @('rev-parse','--show-toplevel')
    if ($top.Lines.Count -ne 1 -or
        [IO.Path]::GetFullPath([string]$top.Lines[0]).TrimEnd('\') -ine $Root.TrimEnd('\')) {
        throw 'Git root is not the canonical BCS workspace.'
    }
    $branch = Read-Git -Arguments @('symbolic-ref','--quiet','--short','HEAD')
    if ($branch.Lines.Count -ne 1 -or $branch.Lines[0] -cne 'main') {
        throw 'Expected the new main branch. Do not switch branches automatically.'
    }
    $headCheck = Read-Git -Arguments @('rev-parse','--verify','--quiet','HEAD') -AllowedExitCodes @(0,1)
    if ($headCheck.Code -eq 0) { throw 'A commit already exists. Share the output before continuing.' }
    $tracked = Read-Git -Arguments @('ls-files','--cached')
    if ($tracked.Lines.Count -ne 0) { throw 'Staged/tracked files already exist. Nothing will be unstaged or reset.' }
    $remotes = Read-Git -Arguments @('remote')
    if ($remotes.Lines.Count -ne 0) { throw 'An unexpected remote exists. No remote was contacted or changed.' }
}

function Assert-IpxBaseline {
    param($Snapshot, $Saved)
    if ($Saved.schemaVersion -ne 1 -or $Saved.relativeRoot -cne 'IPX' -or
        $Saved.fileCount -ne $Snapshot.fileCount -or $Saved.treeSha256 -cne $Snapshot.treeSha256) {
        throw 'IPX differs from the Step 1C checksum baseline. Do not replace the baseline or IPX.'
    }
    $savedFiles = @($Saved.files | Sort-Object -Property path)
    if ($savedFiles.Count -ne $Snapshot.fileCount) { throw 'IPX baseline count is invalid.' }
    for ($i = 0; $i -lt $savedFiles.Count; $i++) {
        if ($savedFiles[$i].path -cne $Snapshot.files[$i].path -or
            [long]$savedFiles[$i].length -ne [long]$Snapshot.files[$i].length -or
            $savedFiles[$i].sha256 -cne $Snapshot.files[$i].sha256) {
            throw 'IPX baseline file entries differ. No automatic correction is allowed.'
        }
    }
}

try {
    Write-Host '=============================================='
    Write-Host 'BCS PHASE 1 - STEP 1E: REPOSITORY RULES'
    Write-Host '=============================================='
    Write-Host ('Workspace: ' + $Root)
    if ($PSVersionTable.PSVersion -lt [Version]'5.1' -or
        [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Run this launcher in the confirmed Windows workspace with Windows PowerShell 5.1 or later.'
    }
    Assert-NormalPath $Root
    if (-not [IO.Directory]::Exists($Root)) { throw 'Canonical workspace is missing.' }
    if (@(Get-ChildItem Env: | Where-Object { $_.Name -like 'GIT_*' }).Count -ne 0) {
        throw 'A GIT_ environment override is present. Share the message; do not change global settings.'
    }
    $GitExe = (Get-Command git.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    foreach ($rel in @('.git','docs/handover','docs/reference','scripts','IPX/IPX-BCS')) {
        $p = Join-Path $Root $rel
        Assert-NormalPath $p
        if (-not [IO.Directory]::Exists($p)) { throw ('Expected ordinary directory missing: ' + $rel) }
    }
    $manifestPath = Join-Path $Root 'docs/reference/IPX-BASELINE-SHA256.json'
    $step1cPath = Join-Path $Root 'docs/handover/STEP-1C-INSTALL-REPORT.json'
    foreach ($rel in @('AGENTS.md','IPX/IPX-BCS/index.html','docs/reference/IPX-BASELINE-SHA256.json','docs/handover/STEP-1C-INSTALL-REPORT.json')) {
        $p = Join-Path $Root $rel
        Assert-NormalPath $p
        if (-not [IO.File]::Exists($p)) { throw ('Required file missing: ' + $rel) }
    }
    Assert-InitialGitState
    Write-Host '[CHECK] Canonical repository, main branch, no commits, no staged files, no remotes.'
    $saved = [IO.File]::ReadAllText($manifestPath, $Utf8) | ConvertFrom-Json
    $step1c = [IO.File]::ReadAllText($step1cPath, $Utf8) | ConvertFrom-Json
    if ($step1c.result -cne 'SUCCESS' -or $step1c.markdownCount -ne 14) { throw 'Step 1C success report is invalid.' }
    $before = Read-IpxSnapshot
    Assert-IpxBaseline -Snapshot $before -Saved $saved
    Write-Host ('[CHECK] All ' + $before.fileCount + ' IPX files match the saved Step 1C baseline.')
    # Preserve all 14 documents and both Step 1C records; never update them here.
    $protected = @{}
    foreach ($doc in @($step1c.documents)) {
        $rel = [string]$doc.path
        if ($rel -cne 'AGENTS.md' -and $rel -cnotmatch '^docs/[A-Za-z0-9_/-]+\.md$') { throw 'Invalid Step 1C document path.' }
        $p = Join-Path $Root $rel
        Assert-NormalPath $p
        $hash = Hash-File $p
        if ($hash -cne $doc.sha256) { throw ('Existing master document changed since Step 1C: ' + $rel + '. No files replaced.') }
        $protected[$p] = $hash
    }
    if ($protected.Count -ne 14) { throw 'Expected 14 distinct Step 1C documents.' }
    foreach ($p in @($manifestPath,$step1cPath,(Join-Path $Root '.git/HEAD'),(Join-Path $Root '.git/config'))) {
        Assert-NormalPath $p
        $protected[$p] = Hash-File $p
    }
    $indexPath = Join-Path $Root '.git/index'
    Assert-NormalPath $indexPath
    $indexExisted = [IO.File]::Exists($indexPath)
    if ($indexExisted) { $protected[$indexPath] = Hash-File $indexPath }
    $infoAttributes = Join-Path $Root '.git/info/attributes'
    Assert-NormalPath $infoAttributes
    if ([IO.File]::Exists($infoAttributes)) { throw 'Local Git info/attributes exists and requires review before adding IPX rules.' }

    $prepared = @()
    foreach ($rel in @($Rules.Keys)) {
        $target = Join-Path $Root $rel
        Assert-NormalPath $target
        if ([IO.Directory]::Exists($target)) { throw ('A directory occupies this file path: ' + $rel) }
        $text = ([string]$Rules[$rel]).Replace("`r`n","`n").TrimEnd([char[]]"`r`n") + "`n"
        $bytes = $Utf8.GetBytes($text)
        $hash = Hash-Bytes $bytes
        if ([IO.File]::Exists($target) -and (Hash-File $target) -cne $hash) {
            throw ('Existing different file: ' + $rel + '. No files were created or overwritten. Share this output.')
        }
        $prepared += [pscustomobject]@{ Relative = $rel; Target = $target; Bytes = $bytes; Hash = $hash }
    }
    $reportPath = Join-Path $Root 'docs/handover/STEP-1E-REPOSITORY-RULES-REPORT.json'
    Assert-NormalPath $reportPath
    if ([IO.Directory]::Exists($reportPath)) { throw 'A directory occupies the Step 1E report path.' }
    if ([IO.File]::Exists($reportPath)) {
        $previous = [IO.File]::ReadAllText($reportPath, $Utf8) | ConvertFrom-Json
        if ($previous.packId -cne $PackId -or $previous.result -cne 'SUCCESS' -or
            $previous.ipxTreeSha256 -cne $before.treeSha256) { throw 'Existing Step 1E report conflicts; it will not be replaced.' }
    }
    Write-Host '[CHECK] Preflight passed. Identical files are kept; different files are never replaced.'
    $WritesStarted = $true
    foreach ($entry in $prepared) {
        if ([IO.File]::Exists($entry.Target)) {
            if ((Hash-File $entry.Target) -cne $entry.Hash) { throw ('Concurrent change: ' + $entry.Relative) }
            Write-Host ('[KEEP] ' + $entry.Relative)
        } else {
            Write-NewVerifiedFile $entry.Target $entry.Bytes $entry.Hash
            $Created += $entry.Relative
            Write-Host ('[CREATED] ' + $entry.Relative)
        }
    }

    # Test matching on hypothetical paths. No test credential or database file is created.
    $ignored = @('Downloads/BCS-probe.zip','.env','apps/api/.env.local','.aws/credentials',
        'apps/web/node_modules/probe/index.js','apps/web/.next/probe.json','apps/worker/dist/probe.js',
        'tests/playwright-report/probe.html','private-key.pem','database/local.dump')
    foreach ($rel in $ignored) {
        $r = Read-Git -Arguments @('check-ignore','--no-index','--quiet','--',$rel) -AllowedExitCodes @(0,1)
        if ($r.Code -ne 0) { throw ('Expected exclusion is not effective: ' + $rel) }
    }
    $included = @('AGENTS.md','docs/PROJECT-MASTER.md','IPX/IPX-BCS/index.html',
        'IPX/IPX-BCS/Assets/app.js','IPX/IPX-BCS/Assets/styles.css','database/migrations/001_probe.sql',
        'packages/ui/src/SmartMultiSelect.tsx','package-lock.json','apps/api/.env.example',
        'scripts/BCS_Phase1_Step1E_RepositoryRules.cmd','.gitignore','.gitattributes','.editorconfig')
    foreach ($rel in $included) {
        $r = Read-Git -Arguments @('check-ignore','--no-index','--quiet','--',$rel) -AllowedExitCodes @(0,1)
        if ($r.Code -ne 1) { throw ('Required source path is ignored, possibly by another ignore file: ' + $rel) }
    }
    Write-Host '[VERIFY] Ignore checks passed: Downloads, local secrets and generated output excluded.'
    Write-Host '[VERIFY] IPX entry/assets, source code, migrations, documentation and example config remain trackable.'

    $expectedAttrs = [ordered]@{ text='unset'; eol='unspecified'; filter='unset'; ident='unset'; 'working-tree-encoding'='unspecified' }
    foreach ($file in $before.files) {
        $rel = 'IPX/' + $file.path
        $r = Read-Git -Arguments @('check-attr','text','eol','filter','ident','working-tree-encoding','--',$rel)
        foreach ($attr in $expectedAttrs.Keys) {
            $suffix = ': ' + $attr + ': ' + $expectedAttrs[$attr]
            if (@($r.Lines | Where-Object { ([string]$_).EndsWith($suffix,[StringComparison]::Ordinal) }).Count -ne 1) {
                throw ('An attribute override prevents byte-preserving IPX rules for: ' + $rel + ' / ' + $attr)
            }
        }
    }
    Write-Host '[VERIFY] IPX text conversion, content filters and ident expansion are disabled.'
    foreach ($entry in $prepared) {
        if ((Hash-File $entry.Target) -cne $entry.Hash) { throw ('Rule file changed during setup: ' + $entry.Relative) }
    }
    foreach ($p in $protected.Keys) {
        if ((Hash-File $p) -cne $protected[$p]) { throw ('Protected file changed during setup: ' + $p) }
    }
    if (-not $indexExisted -and [IO.File]::Exists($indexPath)) { throw 'A Git index appeared during setup. Check for concurrent Git activity.' }
    $after = Read-IpxSnapshot
    Assert-IpxBaseline -Snapshot $after -Saved $saved
    Assert-InitialGitState
    Write-Host ('[VERIFY] IPX files unchanged: ' + $after.fileCount)
    Write-Host '[VERIFY] All 14 master documents and Step 1C verification records are unchanged.'

    if (-not [IO.File]::Exists($reportPath)) {
        $report = [ordered]@{
            schemaVersion=1; packId=$PackId; result='SUCCESS'; completedUtc=[DateTime]::UtcNow.ToString('o')
            workspace=$Root; branch='main'; commitsPresent=$false; stagedFilesPresent=$false
            existingFilesOverwritten=0; ipxFileCount=$after.fileCount; ipxTreeSha256=$after.treeSha256
            ipxMatchesStep1CBaseline=$true; originalMarkdownFilesUnchanged=14
            downloadsExcludedNotDeleted=$true; gitConfigurationWritten=$false; networkCallsMade=$false
            ruleFiles=@($prepared | ForEach-Object { [ordered]@{ path=$_.Relative; sha256=$_.Hash } })
            ownerAcceptance='Pending review of CMD output'
            note='New-file-only setup; original WORK-STATUS.md was not edited. Read this report and actual Git state for the later checkpoint. Ignore rules are not secret scanning, immutability or a backup.'
        }
        $bytes = $Utf8.GetBytes(($report | ConvertTo-Json -Depth 6) + "`n")
        Write-NewVerifiedFile $reportPath $bytes (Hash-Bytes $bytes)
        $Created += 'docs/handover/STEP-1E-REPOSITORY-RULES-REPORT.json'
        Write-Host '[CREATED] docs/handover/STEP-1E-REPOSITORY-RULES-REPORT.json'
    } else { Write-Host '[KEEP] Existing Step 1E report; all checks were rerun.' }
    Write-Host ''
    Write-Host 'CURRENT STATUS:'
    $status = Read-Git -Arguments @('status','--short','--branch','--untracked-files=normal')
    foreach ($line in $status.Lines) { Write-Host $line }
    Write-Host ''
    Write-Host ('[SUMMARY] New rule/report files created: ' + $Created.Count)
    Write-Host '[SUMMARY] Existing files overwritten: 0'
    Write-Host '[SUMMARY] No staging, commit, upload, install, database connection or email sending.'
    Write-Host '[SUCCESS] BCS STEP 1E COMPLETE'
    Write-Host 'STOP HERE. Share the final output with Anna before the first baseline review.'
    exit 0
} catch {
    Write-Host ''
    Write-Host ('[STOP] ' + $_.Exception.Message)
    if ($WritesStarted) {
        Write-Host 'Some new rule files may have been created. Do not delete, force-replace or reset anything.'
    } else { Write-Host 'Preflight stopped before creating rule files.' }
    Write-Host 'No overwrite or cleanup was requested. Share this output before continuing.'
    exit 1
}
