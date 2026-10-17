$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$vendor=Join-Path $root 'vendor\NAudio-2.2.1'
New-Item -ItemType Directory -Path $vendor -Force | Out-Null
$packages=@(
 @{Id='NAudio.Core';Hash='794645DBFD30E4880663D52D9D9224D55C301FA54228FF623C95D572C7887347'},
 @{Id='NAudio.Wasapi';Hash='C8396B8DBAB86A2619EDFD9158BEAF18C21CB86677099B5594950FD8651B9D1A'}
)
foreach($package in $packages){
 $download=Join-Path ([IO.Path]::GetTempPath()) ('hive-naudio-'+[guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path $download | Out-Null
 $id=$package.Id.ToLowerInvariant()
 Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/$id/2.2.1/$id.2.2.1.nupkg" -OutFile (Join-Path $download 'package.zip')
 $sha=[Security.Cryptography.SHA256]::Create()
 try{$hash=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes((Join-Path $download 'package.zip')))).Replace('-','')}finally{$sha.Dispose()}
 if($hash -ne $package.Hash){throw 'NAudio package hash mismatch'}
 Expand-Archive -LiteralPath (Join-Path $download 'package.zip') -DestinationPath (Join-Path $download 'package')
 [xml]$metadata=Get-Content -LiteralPath (Join-Path $download ('package\'+$package.Id+'.nuspec'))
 if($metadata.package.metadata.license.InnerText -ne 'MIT'){throw 'Unexpected NAudio license'}
 Copy-Item -LiteralPath (Join-Path $download ('package\lib\netstandard2.0\'+$package.Id+'.dll')) -Destination (Join-Path $vendor ($package.Id+'.dll'))
}
Copy-Item -LiteralPath (Join-Path $root 'licenses\NAudio-2.2.1.txt') -Destination (Join-Path $vendor 'LICENSE.txt')
$icon=Join-Path $root 'build\hive.ico'
if(-not (Test-Path -LiteralPath $icon)){throw 'Reviewed build icon is missing; run tools/build-icon.ps1 and commit it before release'}
& (Join-Path $PSScriptRoot 'build-spectrum.ps1')
