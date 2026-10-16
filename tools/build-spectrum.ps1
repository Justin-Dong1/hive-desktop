$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$output=Join-Path $root 'vendor\NAudio-1.10\HiveSpectrum.exe'
$reference=Join-Path $root 'vendor\NAudio-1.10\NAudio.dll'
& "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:exe "/out:$output" "/reference:$reference" (Join-Path $PSScriptRoot 'spectrum.cs')
if($LASTEXITCODE -ne 0){throw 'Spectrum compilation failed'}
& $output --test
if($LASTEXITCODE -ne 0){throw 'Spectrum FFT test failed'}
