param([ValidateSet('List','Create')][string]$Mode='List',[string]$Extension,[string]$Destination)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$registry=[Microsoft.Win32.Registry]::ClassesRoot
function Get-NewTypes {
 $out=@()
 foreach($ext in $registry.GetSubKeyNames() | Where-Object { $_.StartsWith('.') -and $_ -ne '.lnk' }){
  $key=$registry.OpenSubKey($ext)
  try {
   $prog=[string]$key.GetValue('')
   if(-not $prog){continue}
   $paths=@('ShellNew');if($prog){$paths+=($prog+'\ShellNew')}
   foreach($sub in $paths){
    $sn=$key.OpenSubKey($sub);if(-not $sn){continue}
    try {
     $names=$sn.GetValueNames();if($names -contains 'LegacyDisable' -or $names -contains 'Handler'){continue}
     $method=if($names -contains 'NullFile'){'NullFile'}elseif($names -contains 'FileName'){'FileName'}elseif($names -contains 'Data'){'Data'}elseif($names -contains 'Command'){'Command'}else{''}
     if(-not $method){continue}
     $label=$ext; $pk=$registry.OpenSubKey($prog)
     if($pk){try{if($pk.GetValue('')){$label=[string]$pk.GetValue('')}}finally{$pk.Close()}}
     $out+=@{extension=$ext;name=$label;method=$method;value=$sn.GetValue($method);command=($method -eq 'Command')}
     break
    }finally{$sn.Close()}
   }
  }finally{$key.Close()}
 }
 # Modern packaged Paint/Notepad may not expose legacy ShellNew keys.
 if(-not($out | Where-Object extension -eq '.bmp')){$out+=@{extension='.bmp';name='BMP 图像';method='Bitmap';command=$false}}
 if(-not($out | Where-Object extension -eq '.txt')){$out+=@{extension='.txt';name='文本文档';method='NullFile';command=$false}}
 return @($out | ForEach-Object { [pscustomobject]$_ })
}
try{
 $types=@(Get-NewTypes)
 if($Mode -eq 'List'){
  [Console]::Write((ConvertTo-Json -InputObject @($types | Sort-Object extension | Select-Object extension,name,command,@{Name='requiresPath';Expression={-not $_.command -or $_.value -match '%[12]'}}) -Compress));exit
 }
 $type=$types | Where-Object extension -eq $Extension | Select-Object -First 1
 if(-not $type){throw 'This file type is no longer registered for New'}
 if($type.command){
  $command=[Environment]::ExpandEnvironmentVariables([string]$type.value)
  if($command -match '^"([^"]+)"\s*(.*)$'){$exe=$matches[1];$arguments=$matches[2]}
  elseif($command -match '^(\S+)\s*(.*)$'){$exe=$matches[1];$arguments=$matches[2]}else{throw 'Invalid registered command'}
  if($arguments -match '%[12]'){
   if(-not $Destination){throw 'This command requires a destination'}
   $arguments=$arguments.Replace('"%1"','"'+$Destination+'"').Replace('"%2"','"'+$Destination+'"').Replace('%1','"'+$Destination+'"').Replace('%2','"'+$Destination+'"')
  }
  $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=$exe;$info.Arguments=$arguments;$info.UseShellExecute=$true
  $null=[Diagnostics.Process]::Start($info)
  [Console]::Write('{"ok":true,"launched":true}');exit
 }
 if(-not $Destination -or [IO.Path]::GetExtension($Destination) -ne $Extension){throw 'Invalid destination extension'}
 if(Test-Path -LiteralPath $Destination){throw 'Destination already exists'}
 switch($type.method){
  'FileName' {
   $template=[Environment]::ExpandEnvironmentVariables([string]$type.value)
   if(-not [IO.Path]::IsPathRooted($template)){
    $candidates=@((Join-Path "$env:WINDIR\ShellNew" $template),(Join-Path "$env:APPDATA\Microsoft\Windows\Templates" $template),(Join-Path "$env:APPDATA\Microsoft\Templates" $template))
    $template=$candidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
   }
   if(-not $template -or -not(Test-Path -LiteralPath $template)){throw 'Registered template is missing; repair the associated application'}
   [IO.File]::Copy($template,$Destination,$false)
  }
  default {
   [byte[]]$bytes=@()
   if($type.method -eq 'Data'){$bytes=if($type.value -is [byte[]]){$type.value}else{[Text.Encoding]::Default.GetBytes([string]$type.value)}}
   if($type.method -eq 'Bitmap'){
    # Valid 1x1 white 24-bit BMP, not an empty file with a BMP suffix.
    $bytes=New-Object byte[] 58;$bytes[0]=66;$bytes[1]=77;$bytes[2]=58;$bytes[10]=54;$bytes[14]=40;$bytes[18]=1;$bytes[22]=1;$bytes[26]=1;$bytes[28]=24;$bytes[34]=4;$bytes[54]=255;$bytes[55]=255;$bytes[56]=255
   }
   $stream=[IO.File]::Open($Destination,[IO.FileMode]::CreateNew)
   try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  }
 }
 [Console]::Write('{"ok":true}')
}catch{[Console]::Write((@{ok=$false;message=$_.Exception.Message}|ConvertTo-Json -Compress));exit 1}
