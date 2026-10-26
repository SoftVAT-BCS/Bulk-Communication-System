param([switch]$Apply)
$ErrorActionPreference='Stop'
$root='E:\Bulk-Communicatio-System'
$backup=Join-Path $root '.local\saas-consolidated-20261019-140610'
if ((Get-Location).Path -ne $root) { throw 'Run in the canonical workspace' }
$changes=Get-Content -LiteralPath (Join-Path $backup 'changed-manifest.json') -Raw | ConvertFrom-Json
function SafePath([string]$relative) {
 $path=[IO.Path]::GetFullPath((Join-Path $root $relative))
 if (!$path.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)) {throw 'Outside workspace'}
 $ancestor=$path
 while($ancestor -and $ancestor -ne $root){if(Test-Path -LiteralPath $ancestor){if((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Reparse path denied'}};$ancestor=Split-Path $ancestor -Parent}
 return $path
}
foreach($item in $changes){
 $path=SafePath $item.path
 if(!(Test-Path -LiteralPath $path) -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.after){throw "Changed since delivery: $($item.path)"}
 if($item.before){$original=Join-Path $backup ('backups\'+$item.path);if((Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.before){throw 'Backup integrity failure'}}
}
if(!$Apply){Write-Output 'Dry run passed. Stop task-owned servers/workers; rerun with -Apply to restore prior bytes and quarantine only task-created files.';exit 0}
$archive=Join-Path $backup ('rollback-current-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
if(Test-Path -LiteralPath $archive){throw 'Archive conflict'}
New-Item -ItemType Directory -Path $archive | Out-Null
# Every current version is preserved before restoring or moving any file.
foreach($item in $changes){$path=SafePath $item.path;$dest=Join-Path $archive ('copies\'+$item.path);New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null;Copy-Item -LiteralPath $path -Destination $dest;if((Get-FileHash -LiteralPath $dest).Hash.ToLowerInvariant() -ne $item.after){throw 'Safety copy mismatch'}}
foreach($item in $changes){$path=SafePath $item.path;if($item.before){Copy-Item -LiteralPath (Join-Path $backup ('backups\'+$item.path)) -Destination $path}else{$dest=[IO.Path]::GetFullPath((Join-Path $archive ('new-files\'+$item.path)));if(!$dest.StartsWith($archive+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe quarantine path'};New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null;Move-Item -LiteralPath $path -Destination $dest}}
Write-Output 'Prior source restored; task-created files preserved in rollback archive. Git and databases untouched. Review dependency-tree reconciliation separately.'
