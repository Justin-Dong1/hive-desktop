$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vendor=Join-Path $root 'vendor\NAudio-1.10'
New-Item -ItemType Directory -Path $vendor -Force | Out-Null
if(-not (Test-Path -LiteralPath (Join-Path $vendor 'NAudio.dll'))){
 $download=Join-Path ([IO.Path]::GetTempPath()) ('hive-naudio-'+[guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $download | Out-Null
 Invoke-WebRequest 'https://api.nuget.org/v3-flatcontainer/naudio/1.10.0/naudio.1.10.0.nupkg' -OutFile (Join-Path $download 'package.zip')
 Expand-Archive -LiteralPath (Join-Path $download 'package.zip') -DestinationPath (Join-Path $download 'package')
 Copy-Item -LiteralPath (Join-Path $download 'package\lib\net35\NAudio.dll') -Destination (Join-Path $vendor 'NAudio.dll')
}
if(-not (Test-Path -LiteralPath (Join-Path $vendor 'LICENSE.txt'))){
 Invoke-WebRequest 'https://raw.githubusercontent.com/naudio/NAudio/v1.10.0/license.txt' -OutFile (Join-Path $vendor 'LICENSE.txt')
}
& (Join-Path $PSScriptRoot 'build-icon.ps1')
& (Join-Path $PSScriptRoot 'build-spectrum.ps1')
