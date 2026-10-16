# NEON SHELL - Desktop scanner & icon extractor
# Pure ASCII source (PowerShell 5.1 reads UTF-8-without-BOM as ANSI).
# Emits a single JSON document on stdout.

param([string]$IconPath,[string]$IconOutput)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$CSharp = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class NeonIcon
{
    const uint SHGFI_ICON          = 0x000000100;
    const uint SHGFI_SYSICONINDEX  = 0x000004000;
    const uint SHGFI_LARGEICON     = 0x000000000;
    const int  SHIL_JUMBO          = 0x4;
    const int  ILD_TRANSPARENT     = 0x1;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct SHFILEINFO
    {
        public IntPtr hIcon;
        public int    iIcon;
        public uint   dwAttributes;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string szDisplayName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)]  public string szTypeName;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IMAGELISTDRAWPARAMS
    {
        public int    cbSize;
        public IntPtr himl;
        public int    i;
        public IntPtr hdcDst;
        public int    x, y, cx, cy, xBitmap, yBitmap;
        public int    rgbBk, rgbFg, fStyle, dwRop;
    }

    [ComImport, Guid("46EB5926-582E-4017-9FDF-E8998DAA0950"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IImageList
    {
        [PreserveSig] int Add(IntPtr hbmImage, IntPtr hbmMask, ref int pi);
        [PreserveSig] int ReplaceIcon(int i, IntPtr hicon, ref int pi);
        [PreserveSig] int SetOverlayImage(int iImage, int iOverlay);
        [PreserveSig] int Replace(int i, IntPtr hbmImage, IntPtr hbmMask);
        [PreserveSig] int AddMasked(IntPtr hbmImage, int crMask, ref int pi);
        [PreserveSig] int Draw(ref IMAGELISTDRAWPARAMS pimldp);
        [PreserveSig] int Remove(int i);
        [PreserveSig] int GetIcon(int i, int flags, ref IntPtr picon);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, ref SHFILEINFO psfi, uint cbFileInfo, uint uFlags);

    [DllImport("shell32.dll")]
    static extern int SHGetImageList(int iImageList, ref Guid riid, out IImageList ppv);

    [DllImport("user32.dll")]
    static extern bool DestroyIcon(IntPtr hIcon);
    [DllImport("shell32.dll",CharSet=CharSet.Unicode)] static extern int SHParseDisplayName(string name,IntPtr bind,out IntPtr pidl,uint mask,out uint attrs);
    [DllImport("shell32.dll",CharSet=CharSet.Unicode,EntryPoint="SHGetFileInfoW")] static extern IntPtr InfoPidl(IntPtr pidl,uint attr,ref SHFILEINFO info,uint size,uint flags);
    public static void Normalize(Bitmap source,string output,int size){
      int l=source.Width,t=source.Height,r=-1,b=-1;
      for(int y=0;y<source.Height;y++)for(int x=0;x<source.Width;x++)if(source.GetPixel(x,y).A>12){l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);b=Math.Max(b,y);}
      if(r<l)throw new Exception("Empty icon");
      using(var result=new Bitmap(size,size,PixelFormat.Format32bppArgb))using(var g=Graphics.FromImage(result)){
        g.Clear(Color.Transparent);g.InterpolationMode=InterpolationMode.HighQualityBicubic;
        double scale=(size*.86)/Math.Max(r-l+1,b-t+1);int w=(int)((r-l+1)*scale),h=(int)((b-t+1)*scale);
        g.DrawImage(source,new Rectangle((size-w)/2,(size-h)/2,w,h),new Rectangle(l,t,r-l+1,b-t+1),GraphicsUnit.Pixel);result.Save(output,ImageFormat.Png);
      }
    }

    public static string Extract(string path, string outPng, int size, out int gotW, out int gotH)
    {
        gotW = 0; gotH = 0;
        IntPtr hIcon = IntPtr.Zero;
        IImageList list = null;
        string src = "?";
        try
        {
            if(System.IO.Path.GetExtension(path).ToLowerInvariant()==".ico"&&System.IO.File.Exists(path)){
              using(var icon=new Icon(path,new Size(256,256)))using(var bitmap=icon.ToBitmap()){gotW=bitmap.Width;gotH=bitmap.Height;Normalize(bitmap,outPng,size);}return "OK:ico-direct";
            }
            var shfi = new SHFILEINFO();
            IntPtr ret;
            if(path.StartsWith("::{")){
              IntPtr pidl;uint attrs;SHParseDisplayName(path,IntPtr.Zero,out pidl,0,out attrs);
              if(pidl==IntPtr.Zero)return "INVALID_NAMESPACE";
              try{ret=InfoPidl(pidl,0,ref shfi,(uint)Marshal.SizeOf(typeof(SHFILEINFO)),SHGFI_SYSICONINDEX|0x8);}finally{Marshal.FreeCoTaskMem(pidl);}
            }else ret = SHGetFileInfo(path, 0, ref shfi, (uint)Marshal.SizeOf(typeof(SHFILEINFO)),SHGFI_SYSICONINDEX | SHGFI_LARGEICON);
            if (ret == IntPtr.Zero) return "SHGETFILEINFO_ZERO";

            Guid iid = new Guid("46EB5926-582E-4017-9FDF-E8998DAA0950");
            int hr = SHGetImageList(SHIL_JUMBO, ref iid, out list);
            if (hr == 0 && list != null)
            {
                if (list.GetIcon(shfi.iIcon, ILD_TRANSPARENT, ref hIcon) == 0 && hIcon != IntPtr.Zero)
                    src = "jumbo";
            }
            if (hIcon == IntPtr.Zero)
            {
                var f2 = new SHFILEINFO();
                SHGetFileInfo(path, 0, ref f2, (uint)Marshal.SizeOf(typeof(SHFILEINFO)), SHGFI_ICON | SHGFI_LARGEICON);
                hIcon = f2.hIcon;
                src = "large";
            }
            if (hIcon == IntPtr.Zero) return "NO_ICON";

            using (var ico = Icon.FromHandle(hIcon))
            {
                gotW = ico.Width; gotH = ico.Height;
                using (var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
                {
                    using (var g = Graphics.FromImage(bmp))
                    {
                        g.Clear(Color.Transparent);
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode   = PixelOffsetMode.HighQuality;
                        g.DrawIcon(ico, new Rectangle(0, 0, size, size));
                    }
                    Normalize(bmp,outPng,size);
                }
            }
            return "OK:" + src;
        }
        catch (Exception ex) { return "ERR:" + ex.Message; }
        finally
        {
            if (hIcon != IntPtr.Zero) { try { DestroyIcon(hIcon); } catch {} }
            if (list  != null)        { try { Marshal.ReleaseComObject(list); } catch {} }
        }
    }
}
'@

Add-Type -TypeDefinition $CSharp -ReferencedAssemblies 'System.Drawing' -ErrorAction Stop
if($IconPath -and $IconOutput){$w=0;$h=0;[NeonIcon]::Extract($IconPath,$IconOutput,128,[ref]$w,[ref]$h);exit}

$OUT_DIR = Join-Path $env:LOCALAPPDATA 'GlassHiveDesktop\icons'
if (-not (Test-Path -LiteralPath $OUT_DIR)) { New-Item -ItemType Directory -Force -Path $OUT_DIR | Out-Null }
$INDEX_FILE = Join-Path $env:LOCALAPPDATA 'GlassHiveDesktop\icon-index.json'

$cache = @{}
if (Test-Path -LiteralPath $INDEX_FILE) {
    try {
        $raw = Get-Content -LiteralPath $INDEX_FILE -Raw -Encoding UTF8
        if ($raw) {
            (ConvertFrom-Json $raw).PSObject.Properties | ForEach-Object { $cache[$_.Name] = $_.Value }
        }
    } catch { $cache = @{} }
}

function Get-IconHash([string]$p) {
    $fi = New-Item -ItemType File -Path $p -Force -ErrorAction SilentlyContinue
    return $null
}

$roots = @()
$roots += [Environment]::GetFolderPath('Desktop')
$pub = [Environment]::GetFolderPath('CommonDesktopDirectory')
if ($pub) { $roots += $pub }
$roots = $roots | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

$skip = @('desktop.ini', 'thumbs.db', '.ds_store')

$items = New-Object System.Collections.ArrayList
$newCache = @{}
$seen = @{}

foreach ($root in $roots) {
    $files = Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        if ($skip -contains $f.Name.ToLower()) { continue }
        if ($f.Attributes -band [IO.FileAttributes]::Hidden) { continue }
        $full = $f.FullName
        if ($seen.ContainsKey($full)) { continue }
        $seen[$full] = $true

        $isDir = $f.PSIsContainer
        $ext = ''
        if (-not $isDir) { $ext = $f.Extension.ToLower() }

        $kind = 'file'
        if ($isDir)                      { $kind = 'folder' }
        elseif ($ext -eq '.lnk')         { $kind = 'link' }
        elseif ($ext -eq '.url')         { $kind = 'url' }
        elseif ($ext -eq '.exe')         { $kind = 'exe' }
        elseif ($ext -eq '.bat' -or $ext -eq '.cmd' -or $ext -eq '.ps1') { $kind = 'script' }
        elseif ($ext -in @('.png','.jpg','.jpeg','.gif','.bmp','.webp','.svg','.ico')) { $kind = 'image' }
        elseif ($ext -in @('.doc','.docx','.pdf','.txt','.md','.rtf','.xls','.xlsx','.ppt','.pptx')) { $kind = 'doc' }
        elseif ($ext -in @('.zip','.rar','.7z','.tar','.gz')) { $kind = 'archive' }

        $label = $f.BaseName
        if ($isDir) { $label = $f.Name }
        if ($ext -in @('.lnk','.url')) { $label = $f.BaseName }

        $iconSource=$full
        if($ext -eq '.url'){
          $line=Get-Content -LiteralPath $full | Where-Object { $_ -match '^IconFile=' } | Select-Object -First 1
          if($line){$candidate=[Environment]::ExpandEnvironmentVariables(($line -replace '^IconFile=','').Trim('"'));if(Test-Path -LiteralPath $candidate){$iconSource=$candidate}}
        }
        $sourceStamp=if(Test-Path -LiteralPath $iconSource){(Get-Item -LiteralPath $iconSource).LastWriteTimeUtc.Ticks}else{0}
        $key = ('v3_' + $f.LastWriteTimeUtc.Ticks.ToString() + '_' + $f.Length.ToString()+'_'+$sourceStamp)
        $png = $null
        $src = '-'

        $cached = $cache[$full]
        if ($cached -and $cached.k -eq $key -and (Test-Path -LiteralPath (Join-Path $OUT_DIR $cached.f))) {
            $png = $cached.f
            $src = 'cache'
        } else {
            $safe = [Guid]::NewGuid().ToString('N') + '.png'
            $dest = Join-Path $OUT_DIR $safe
            $w = 0; $h = 0
            $res = [NeonIcon]::Extract($iconSource, $dest, 128, [ref]$w, [ref]$h)
            if($res -notlike 'OK*' -and $iconSource -ne $full){$res=[NeonIcon]::Extract($full,$dest,128,[ref]$w,[ref]$h)}
            if ($res -like 'OK*') {
                $png = $safe
                $src = $res + '(' + $w + 'x' + $h + ')'
            } else {
                $src = $res
            }
        }
        if ($png) { $newCache[$full] = @{ k = $key; f = $png } }

        $null = $items.Add([ordered]@{
            name    = $label
            raw     = $f.Name
            path    = $full
            kind    = $kind
            ext     = $ext
            isDir   = [bool]$isDir
            size    = [int64]($(if ($isDir) { 0 } else { $f.Length }))
            mtime   = $f.LastWriteTimeUtc.ToString('o')
            icon    = $png
            iconSrc = $src
            source  = $(if ($root -eq $pub) { 'public' } else { 'user' })
        })
    }
}

$shellApp=New-Object -ComObject Shell.Application
$visibility=@{}
foreach($registryRoot in @('HKLM:','HKCU:')){
 $keyPath=$registryRoot+'\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel'
 if(Test-Path $keyPath){(Get-ItemProperty $keyPath).PSObject.Properties | Where-Object {$_.Name -match '^\{'} | ForEach-Object {$visibility[$_.Name]=[int]$_.Value}}
}
$entries=@($shellApp.Namespace(0).Items())
foreach($guid in $visibility.Keys){if($visibility[$guid] -eq 0){try{$folder=$shellApp.Namespace('::'+$guid);if($folder){$entries+=,$folder.Self}}catch{}}}
foreach($entry in $entries){
 if($entry.IsFileSystem -or $entry.Path -notmatch '^::\{[0-9A-Fa-f-]+\}$'){continue}
 $guid=$entry.Path.Substring(2)
 if($guid -eq '{26EE0668-A00A-44D7-9371-BEB064C98683}'){$guid='{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}'}
 $enabled=if($visibility.ContainsKey($guid)){$visibility[$guid] -eq 0}else{$guid -eq '{645FF040-5081-101B-9F08-00AA002F954E}'}
 if(-not $enabled){continue}
 if($items | Where-Object { $_.name -eq $entry.Name }){continue}
 $safe=[Guid]::NewGuid().ToString('N')+'.png';$w=0;$h=0
 $res=[NeonIcon]::Extract($entry.Path,(Join-Path $OUT_DIR $safe),128,[ref]$w,[ref]$h)
 $null=$items.Add(@{name=$entry.Name;raw=$entry.Name;path=$entry.Path;kind='system';isDir=$false;icon=$(if($res -like 'OK*'){$safe}else{$null});iconSrc=$res})
}
$newCache | ConvertTo-Json -Depth 3 -Compress | Set-Content -LiteralPath $INDEX_FILE -Encoding UTF8

$result = [ordered]@{
    desktopPath = [Environment]::GetFolderPath('Desktop')
    user        = $env:USERNAME
    computer    = $env:COMPUTERNAME
    count       = $items.Count
    items       = @($items)
}

$json = $result | ConvertTo-Json -Depth 6 -Compress
[Console]::Out.Write($json)
