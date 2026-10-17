$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$output=Join-Path $root 'vendor\NAudio-2.2.1\HiveSpectrum.exe'
$reference=Join-Path $root 'vendor\NAudio-2.2.1\NAudio.Core.dll'
$wasapi=Join-Path $root 'vendor\NAudio-2.2.1\NAudio.Wasapi.dll'
$facade=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\netstandard.dll'
if(-not (Test-Path -LiteralPath $facade)){throw 'Install .NET Framework 4.8 before building the spectrum helper'}
& "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:exe "/out:$output" "/reference:$reference" "/reference:$wasapi" "/reference:$facade" (Join-Path $PSScriptRoot 'spectrum.cs')
if($LASTEXITCODE -ne 0){throw 'Spectrum compilation failed'}
& $output --test
if($LASTEXITCODE -ne 0){throw 'Spectrum FFT test failed'}
