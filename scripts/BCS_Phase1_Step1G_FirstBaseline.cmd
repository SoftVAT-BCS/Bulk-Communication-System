@echo off
setlocal DisableDelayedExpansion
rem One-time local baseline helper. Save in the project's ignored Downloads folder.
rem Only Git index/object/history writes are requested. No worktree file edits or upload.
set "BCS_BASELINE_SELF=%~f0"
if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    echo [STOP] Windows PowerShell was not found.
    endlocal
    exit /b 1
)
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; try { $raw=[IO.File]::ReadAllText($env:BCS_BASELINE_SELF); $mark=[Environment]::NewLine+'# BCS_STEP1G_POWERSHELL_START'+[Environment]::NewLine; $i=$raw.IndexOf($mark,[StringComparison]::Ordinal); if($i -lt 0){throw 'Helper payload marker not found.'}; & ([scriptblock]::Create($raw.Substring($i+$mark.Length))); } catch { Write-Host ('[STOP] '+$_.Exception.Message); exit 1 }"
set "BCS_BASELINE_RESULT=%ERRORLEVEL%"
endlocal & exit /b %BCS_BASELINE_RESULT%
# BCS_STEP1G_POWERSHELL_START
# Windows PowerShell 5.1. Does NOT invoke the earlier setup scripts.
# Does not create/edit reports, change Git config, remove files, reset, push or install.
# No security hooks or signing settings are bypassed: unexpected settings stop this helper.
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$Root = 'E:\Bulk-Communicatio-System'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$GitWritesStarted = $false
$CommitCreated = $false
$CommitMessage = 'chore(bcs): preserve approved IPX and project foundation'

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

$Files = @(
    '.editorconfig',
    '.gitattributes',
    '.gitignore',
    'AGENTS.md',
    'IPX/IPX-BCS/Assets/app.js',
    'IPX/IPX-BCS/Assets/favicon.svg',
    'IPX/IPX-BCS/Assets/styles.css',
    'IPX/IPX-BCS/PARTNER_FEEDBACK.txt',
    'IPX/IPX-BCS/READ_ME_FIRST.txt',
    'IPX/IPX-BCS/communication.html',
    'IPX/IPX-BCS/configuration.html',
    'IPX/IPX-BCS/dashboard.html',
    'IPX/IPX-BCS/index.html',
    'IPX/IPX-BCS/reports.html',
    'IPX/IPX-BCS/scheduling.html',
    'IPX/Universal_Notify_Partner_UI_Review_V1.zip',
    'docs/PROJECT-MASTER.md',
    'docs/README.md',
    'docs/adr/DECISION-LOG.md',
    'docs/architecture/ARCHITECTURE.md',
    'docs/architecture/DATABASE-ARCHITECTURE.md',
    'docs/handover/STEP-1C-INSTALL-REPORT.json',
    'docs/handover/STEP-1E-REPOSITORY-RULES-REPORT.json',
    'docs/handover/WORK-STATUS.md',
    'docs/reference/IPX-BASELINE-SHA256.json',
    'docs/reference/IPX-BASELINE.md',
    'docs/reference/ORIGINAL-PROJECT-HANDOVER.md',
    'docs/requirements/DEVELOPMENT-ROADMAP.md',
    'docs/standards/REUSABLE-COMPONENTS.md',
    'docs/standards/SECURITY-STANDARDS.md',
    'docs/standards/TESTING-AND-ACCEPTANCE.md',
    'docs/standards/UI-DESIGN-SYSTEM.md',
    'scripts/BCS_Phase1_Step1C_CreateDocs.cmd',
    'scripts/BCS_Phase1_Step1E_RepositoryRules.cmd'
)

function Run-Git {
    param([string[]]$Arguments, [int[]]$AllowedExitCodes = @(0))
    $lines = @(& $GitExe --no-pager --no-optional-locks -c color.ui=false -c core.fsmonitor=false -c core.untrackedCache=false -C $Root @Arguments)
    $code = $LASTEXITCODE
    if ($AllowedExitCodes -notcontains $code) {
        throw ('Git command failed: ' + ($Arguments -join ' ') + ' [exit ' + $code + ']')
    }
    return [pscustomobject]@{ Lines = $lines; Code = $code }
}

function Assert-Paths {
    param([string[]]$Actual, [string[]]$Expected, [string]$Label)
    $a = @($Actual | Sort-Object)
    $b = @($Expected | Sort-Object)
    if ($a.Count -ne $b.Count) { throw ($Label + ': file count differs from the reviewed allowlist.') }
    for ($j = 0; $j -lt $a.Count; $j++) {
        if ($a[$j] -cne $b[$j]) { throw ($Label + ': an unexpected or missing path was detected.') }
    }
}

function Assert-SourceHashes {
    foreach ($rel in $Files) {
        if ((Hash-File (Join-Path $Root $rel)) -cne $SourceHashes[$rel]) {
            throw ('A source file changed during this activity: ' + $rel)
        }
    }
    $current = Read-IpxSnapshot
    Assert-IpxBaseline -Snapshot $current -Saved $SavedIpx
}

try {
    Write-Host '=============================================='
    Write-Host 'BCS PHASE 1 - STEP 1G: FIRST LOCAL COMMIT'
    Write-Host '=============================================='
    Write-Host ('Workspace: ' + $Root)
    if ($PSVersionTable.PSVersion -lt [Version]'5.1' -or
        [Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Run this helper in the confirmed Windows workspace with Windows PowerShell 5.1 or later.'
    }
    Assert-NormalPath $Root
    if (-not [IO.Directory]::Exists((Join-Path $Root '.git'))) { throw 'Expected local .git directory is missing.' }
    Assert-NormalPath (Join-Path $Root '.git')
    if (@(Get-ChildItem Env: | Where-Object { $_.Name -like 'GIT_*' }).Count -ne 0) {
        throw 'A GIT_ environment override is present. Share this result without changing global settings.'
    }
    $GitExe = (Get-Command git.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $r = Run-Git -Arguments @('rev-parse','--show-toplevel')
    if ($r.Lines.Count -ne 1 -or [IO.Path]::GetFullPath([string]$r.Lines[0]).TrimEnd('\') -ine $Root) {
        throw 'Git root is not the canonical BCS workspace.'
    }
    $r = Run-Git -Arguments @('symbolic-ref','--quiet','--short','HEAD')
    if ($r.Lines.Count -ne 1 -or $r.Lines[0] -cne 'main') { throw 'Expected the main branch. No branch switch requested.' }
    $r = Run-Git -Arguments @('rev-parse','--verify','--quiet','HEAD') -AllowedExitCodes @(0,1)
    if ($r.Code -eq 0) { throw 'A commit already exists. Do not rerun this initial-commit helper.' }
    $r = Run-Git -Arguments @('ls-files','--cached')
    if ($r.Lines.Count -ne 0) { throw 'Files are already staged. Nothing was unstaged or reset; share the output.' }
    $r = Run-Git -Arguments @('remote')
    if ($r.Lines.Count -ne 0) { throw 'A remote has been added since the review. No remote was contacted.' }
    foreach ($pair in @(@('user.name','Pranesh Nadig'),@('user.email','skillbrahma-code@users.noreply.github.com'))) {
        $r = Run-Git -Arguments @('config','--get',$pair[0]) -AllowedExitCodes @(0,1)
        if ($r.Code -ne 0 -or $r.Lines.Count -ne 1 -or $r.Lines[0] -cne $pair[1]) {
            throw ('Git author identity differs from the reviewed value: ' + $pair[0] + '. No identity setting changed.')
        }
    }
    # Do not bypass custom validation hooks or signing policies in a one-time setup.
    $r = Run-Git -Arguments @('config','--get','core.hooksPath') -AllowedExitCodes @(0,1)
    if ($r.Code -eq 0) { throw 'A custom hooks path is configured. Review it before committing; it was not bypassed.' }
    $hooks = Join-Path $Root '.git/hooks'
    Assert-NormalPath $hooks
    if ([IO.Directory]::Exists($hooks)) {
        if (@(Get-ChildItem -LiteralPath $hooks -Force | Where-Object { -not $_.PSIsContainer -and $_.Name -notlike '*.sample' }).Count -ne 0) {
            throw 'Non-sample Git hook files exist. Review them before committing; none were bypassed.'
        }
    }
    $r = Run-Git -Arguments @('config','--bool','--get','commit.gpgsign') -AllowedExitCodes @(0,1)
    if ($r.Code -eq 0 -and $r.Lines[0] -ceq 'true') {
        throw 'Commit signing is enabled. Share the output so a signed first-commit workflow can be used. Signing was not disabled.'
    }
    if ($Files.Count -ne 34 -or @($Files | Select-Object -Unique).Count -ne 34) { throw 'Invalid helper allowlist.' }
    $SourceHashes = @{}
    foreach ($rel in $Files) {
        $p = Join-Path $Root $rel
        Assert-NormalPath $p
        if (-not [IO.File]::Exists($p)) { throw ('A reviewed file is missing: ' + $rel) }
        $SourceHashes[$rel] = Hash-File $p
        $r = Run-Git -Arguments @('check-ignore','--no-index','--quiet','--',$rel) -AllowedExitCodes @(0,1)
        if ($r.Code -eq 0) { throw ('A reviewed file is now ignored: ' + $rel + '. Do not force-add it.') }
    }
    $r = Run-Git -Arguments @('check-ignore','--no-index','--quiet','--','Downloads/BCS_Phase1_Step1G_FirstBaseline.cmd') -AllowedExitCodes @(0,1)
    if ($r.Code -ne 0) { throw 'The local Downloads helper is not excluded as expected.' }
    $SavedIpx = [IO.File]::ReadAllText((Join-Path $Root 'docs/reference/IPX-BASELINE-SHA256.json'),$Utf8) | ConvertFrom-Json
    $ipx = Read-IpxSnapshot
    Assert-IpxBaseline -Snapshot $ipx -Saved $SavedIpx
    if ($ipx.fileCount -ne 12) { throw 'Expected the 12 reviewed IPX files.' }
    Assert-Paths -Actual @($ipx.files | ForEach-Object { 'IPX/' + $_.path }) -Expected @($Files | Where-Object { $_ -clike 'IPX/*' }) -Label 'IPX inventory'
    $reportC = [IO.File]::ReadAllText((Join-Path $Root 'docs/handover/STEP-1C-INSTALL-REPORT.json'),$Utf8) | ConvertFrom-Json
    if ($reportC.result -cne 'SUCCESS' -or $reportC.markdownCount -ne 14) { throw 'Step 1C report is invalid.' }
    $markdown = @($Files | Where-Object { $_.EndsWith('.md',[StringComparison]::Ordinal) })
    Assert-Paths -Actual @($reportC.documents | ForEach-Object { $_.path }) -Expected $markdown -Label 'Master document inventory'
    foreach ($doc in @($reportC.documents)) {
        if ($SourceHashes[[string]$doc.path] -cne $doc.sha256) { throw ('Master document changed since Step 1C: ' + $doc.path) }
    }
    $reportE = [IO.File]::ReadAllText((Join-Path $Root 'docs/handover/STEP-1E-REPOSITORY-RULES-REPORT.json'),$Utf8) | ConvertFrom-Json
    if ($reportE.result -cne 'SUCCESS') { throw 'Step 1E report is invalid.' }
    Assert-Paths -Actual @($reportE.ruleFiles | ForEach-Object { $_.path }) -Expected @('.editorconfig','.gitattributes','.gitignore') -Label 'Repository rules'
    foreach ($rule in @($reportE.ruleFiles)) {
        if ($SourceHashes[[string]$rule.path] -cne $rule.sha256) { throw ('Repository rule changed since Step 1E: ' + $rule.path) }
    }
    $attrs = [ordered]@{ text='unset'; eol='unspecified'; filter='unset'; ident='unset'; 'working-tree-encoding'='unspecified' }
    foreach ($rel in @($Files | Where-Object { $_ -clike 'IPX/*' })) {
        $r = Run-Git -Arguments @('check-attr','text','eol','filter','ident','working-tree-encoding','--',$rel)
        foreach ($attr in $attrs.Keys) {
            $suffix = ': ' + $attr + ': ' + $attrs[$attr]
            if (@($r.Lines | Where-Object { ([string]$_).EndsWith($suffix,[StringComparison]::Ordinal) }).Count -ne 1) {
                throw ('IPX preservation attribute differs: ' + $rel + ' / ' + $attr)
            }
        }
    }
    Write-Host '[CHECK] Correct workspace, main branch, no commits, empty staging area, no remotes.'
    Write-Host '[CHECK] Reviewed Git author retained; no custom hook or signing policy bypassed.'
    Write-Host '[CHECK] 12 IPX files, 14 master documents and 3 repository rules match saved baselines.'
    Write-Host '[CHECK] Exactly 34 existing reviewed files selected; Downloads is excluded.'
    Write-Host ''
    Write-Host 'STAGING THE REVIEWED FILES:'
    Assert-SourceHashes
    $GitWritesStarted = $true
    $r = Run-Git -Arguments (@('add','--') + $Files)
    foreach ($line in $r.Lines) { Write-Host $line }
    $r = Run-Git -Arguments @('diff','--cached','--name-only')
    Assert-Paths -Actual $r.Lines -Expected $Files -Label 'Staging area'
    # Compare the raw file Git object to the staged object for every IPX file,
    # including the ZIP. This verifies byte preservation in the Git index.
    foreach ($rel in @($Files | Where-Object { $_ -clike 'IPX/*' })) {
        $raw = Run-Git -Arguments @('hash-object','--no-filters','--',$rel)
        $staged = Run-Git -Arguments @('rev-parse','--verify',(':' + $rel))
        if ($raw.Lines.Count -ne 1 -or $staged.Lines.Count -ne 1 -or $raw.Lines[0] -cne $staged.Lines[0]) {
            throw ('Staged IPX bytes differ from the original: ' + $rel)
        }
    }
    Assert-SourceHashes
    $r = Run-Git -Arguments @('diff','--quiet','--') -AllowedExitCodes @(0,1)
    if ($r.Code -ne 0) { throw 'A tracked file changed after staging. No automatic reset or retry.' }
    Write-Host '[VERIFY] Exactly 34 files staged; all 12 IPX objects preserve original bytes.'
    $r = Run-Git -Arguments @('diff','--cached','--stat')
    foreach ($line in $r.Lines) { Write-Host $line }
    Write-Host ''
    Write-Host 'CREATING THE FIRST LOCAL COMMIT:'
    $r = Run-Git -Arguments @('commit','-m',$CommitMessage)
    $CommitCreated = $true
    foreach ($line in $r.Lines) { Write-Host $line }
    Assert-SourceHashes
    $r = Run-Git -Arguments @('ls-tree','--full-tree','-r','--name-only','HEAD')
    Assert-Paths -Actual $r.Lines -Expected $Files -Label 'Committed tree'
    $r = Run-Git -Arguments @('rev-list','--count','HEAD')
    if ($r.Lines.Count -ne 1 -or $r.Lines[0] -cne '1') { throw 'Unexpected commit count; inspect without resetting.' }
    $r = Run-Git -Arguments @('diff','HEAD','--quiet','--') -AllowedExitCodes @(0,1)
    if ($r.Code -ne 0) { throw 'A tracked file differs from the new commit. Preserve changes and share the output.' }
    Write-Host ''
    Write-Host '[VERIFY] 34 files recorded in one root commit.'
    Write-Host '[VERIFY] All selected source files remain unchanged on disk.'
    Write-Host '[VERIFY] All 12 IPX files still match the Step 1C checksum baseline.'
    Write-Host ''
    Write-Host 'COMMIT:'
    $r = Run-Git -Arguments @('log','-1','--oneline')
    foreach ($line in $r.Lines) { Write-Host $line }
    Write-Host ''
    Write-Host 'CURRENT STATUS:'
    $r = Run-Git -Arguments @('status','--short','--branch','--untracked-files=normal')
    foreach ($line in $r.Lines) { Write-Host $line }
    if (@($r.Lines | Where-Object { ([string]$_).StartsWith('?? ') }).Count -ne 0) {
        Write-Host '[NOTICE] Other untracked files were left outside this commit. Do not add or delete them automatically.'
    }
    Write-Host ''
    Write-Host '[SUMMARY] Existing project files overwritten or deleted: 0'
    Write-Host '[SUMMARY] One local commit; no push, remote change, install or live connection requested.'
    Write-Host '[SUCCESS] BCS STEP 1G COMPLETE'
    Write-Host 'STOP HERE. Share the final output and commit ID with Anna.'
    exit 0
} catch {
    Write-Host ''
    Write-Host ('[STOP] ' + $_.Exception.Message)
    if ($CommitCreated) {
        Write-Host 'A commit was created, but a later verification stopped. Do not reset or create another commit.'
    } elseif ($GitWritesStarted) {
        Write-Host 'Git may contain staged files or a new commit. Do not unstage, reset, amend or rerun automatically.'
    } else {
        Write-Host 'Stopped before staging or committing. No project file changes were requested.'
    }
    Write-Host 'Leave files and Git state unchanged. Share the complete output for review.'
    exit 1
}
