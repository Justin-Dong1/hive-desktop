$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
$bitmap=New-Object Drawing.Bitmap(256,256)
$g=[Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.Color]::Transparent)
$brush=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255,28,46,54))
$pen=New-Object Drawing.Pen([Drawing.Color]::FromArgb(255,146,226,215),8)
$points=0..5 | ForEach-Object {[Drawing.PointF]::new([single](128+112*[Math]::Cos($_*[Math]::PI/3)),[single](128+112*[Math]::Sin($_*[Math]::PI/3)))}
$g.FillPolygon($brush,[Drawing.PointF[]]$points)
$g.DrawPolygon($pen,[Drawing.PointF[]]$points)
$pen.Width=14
$g.DrawLine($pen,92,86,92,170);$g.DrawLine($pen,164,86,164,170);$g.DrawLine($pen,92,128,164,128)
$stream=New-Object IO.MemoryStream
$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
$png=$stream.ToArray()
$file=[IO.File]::Create((Join-Path $root 'build\hive.ico'))
$writer=New-Object IO.BinaryWriter($file)
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]1)
$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0)
$writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$png.Length);$writer.Write([uint32]22);$writer.Write($png)
$writer.Dispose();$stream.Dispose();$g.Dispose();$bitmap.Dispose();$pen.Dispose();$brush.Dispose()
