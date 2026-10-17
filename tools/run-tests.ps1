$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $root 'node_modules\.bin\electron.cmd'
$electronTests = @('test-icon-centers.js', 'test-icon-hover.js')
$tests = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'test-*.js' -File | Sort-Object Name)
$failed = @()

foreach ($test in $tests) {
  if ($electronTests -contains $test.Name) { continue }
  & node $test.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $test.Name }
}

if (-not (Test-Path -LiteralPath $electron)) { throw 'Electron command is missing. Run pnpm install first.' }
$env:ELECTRON_RUN_AS_NODE = $null
foreach ($name in $electronTests) {
  & $electron (Join-Path $PSScriptRoot $name)
  if ($LASTEXITCODE -ne 0) { $failed += $name }
}

if ($failed.Count) { throw ('Tests failed: ' + ($failed -join ', ')) }
Write-Output ("PASS all {0} test scripts" -f $tests.Count)
