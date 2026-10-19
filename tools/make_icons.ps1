# Regenerate the whole Windows/macOS icon set from one source PNG.
#
#   pwsh -File tools/make_icons.ps1
#
# Uses .NET's imaging (no Pillow, no ImageMagick) and hand-assembles the .ico
# and .icns containers, because neither System.Drawing nor Tauri's CLI will
# write a multi-size icon for you.
#
# The source is committed at src-tauri/icons/source.png so the set is
# reproducible. Never upscale beyond the source: a 256px source yields a crisp
# 256 icon and a blurry 512 one, so 512 is deliberately not produced.

param(
    [string]$Source = "$PSScriptRoot\..\src-tauri\icons\source.png",
    [string]$OutDir = "$PSScriptRoot\..\src-tauri\icons"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Source)) { throw "source icon not found: $Source" }
$src = [System.Drawing.Image]::FromFile($Source)
"source: $Source ($($src.Width)x$($src.Height))"
if ($src.Width -ne $src.Height) { throw "source icon must be square" }

function Resize([System.Drawing.Image]$image, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($image, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

function PngBytes([System.Drawing.Bitmap]$bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    return $ms.ToArray()
}

function Write-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
    [System.IO.File]::WriteAllBytes($path, (PngBytes $bmp))
    "  $(Split-Path $path -Leaf)  $($bmp.Width)x$($bmp.Height)  $([math]::Round((Get-Item $path).Length/1KB)) KB"
}

# --- one bitmap per size we need ------------------------------------------
$sizes = 16, 24, 32, 48, 64, 128, 256
$cache = @{}
foreach ($s in $sizes) {
    if ($s -le $src.Width) { $cache[$s] = Resize $src $s }
    elseif ($s -eq 256) { $cache[$s] = Resize $src $src.Width }
}

# --- PNGs Tauri's bundle references ---------------------------------------
Write-Png $cache[32]  (Join-Path $OutDir '32x32.png')
Write-Png $cache[128] (Join-Path $OutDir '128x128.png')
Write-Png $cache[256] (Join-Path $OutDir '128x128@2x.png')
Write-Png $cache[256] (Join-Path $OutDir 'icon.png')

# --- multi-size .ico (32bpp DIB entries + AND mask) ------------------------
function New-Ico([int[]]$sizes, [hashtable]$bitmaps, [string]$path) {
    $blobs = @()
    foreach ($s in $sizes) {
        $bmp = $bitmaps[$s]
        $w = $bmp.Width; $h = $bmp.Height
        $px = New-Object System.IO.MemoryStream
        $bw = New-Object System.IO.BinaryWriter($px)
        # BITMAPINFOHEADER: height is doubled (XOR + AND)
        $bw.Write([UInt32]40); $bw.Write([Int32]$w); $bw.Write([Int32]($h * 2))
        $bw.Write([UInt16]1);  $bw.Write([UInt16]32); $bw.Write([UInt32]0)
        $bw.Write([UInt32]0);  $bw.Write([Int32]0);   $bw.Write([Int32]0)
        $bw.Write([UInt32]0);  $bw.Write([UInt32]0)
        for ($y = $h - 1; $y -ge 0; $y--) {            # bottom-up BGRA
            for ($x = 0; $x -lt $w; $x++) {
                $c = $bmp.GetPixel($x, $y)
                $bw.Write([Byte]$c.B); $bw.Write([Byte]$c.G)
                $bw.Write([Byte]$c.R); $bw.Write([Byte]$c.A)
            }
        }
        $maskRow = [math]::Floor(($w + 31) / 32) * 4     # 1bpp, 4-byte aligned
        $bw.Write((New-Object byte[] ($maskRow * $h)))
        $bw.Flush()
        $blobs += , $px.ToArray()
    }

    $ms = New-Object System.IO.MemoryStream
    $out = New-Object System.IO.BinaryWriter($ms)
    $out.Write([UInt16]0); $out.Write([UInt16]1); $out.Write([UInt16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]
        $dim = if ($s -ge 256) { 0 } else { $s }
        $out.Write([Byte]$dim); $out.Write([Byte]$dim)
        $out.Write([Byte]0); $out.Write([Byte]0)
        $out.Write([UInt16]1); $out.Write([UInt16]32)
        $out.Write([UInt32]$blobs[$i].Length); $out.Write([UInt32]$offset)
        $offset += $blobs[$i].Length
    }
    foreach ($b in $blobs) { $out.Write($b) }
    $out.Flush()
    [System.IO.File]::WriteAllBytes($path, $ms.ToArray())
    "  icon.ico  $([math]::Round((Get-Item $path).Length/1KB)) KB  ($($sizes -join '/'))"
}

New-Ico @(16, 24, 32, 48, 64, 128, 256) $cache (Join-Path $OutDir 'icon.ico')

# --- .icns (ic07/08/11/12 chunks, each a PNG) ------------------------------
function New-Icns([array]$chunks, [string]$path) {
    $body = New-Object System.IO.MemoryStream
    foreach ($c in $chunks) {
        $type = [System.Text.Encoding]::ASCII.GetBytes($c[0])
        $data = $c[1]
        $len = [BitConverter]::GetBytes([UInt32]($data.Length + 8))
        [array]::Reverse($len)                            # big-endian
        $body.Write($type, 0, 4); $body.Write($len, 0, 4); $body.Write($data, 0, $data.Length)
    }
    $bytes = $body.ToArray()
    $ms = New-Object System.IO.MemoryStream
    $out = New-Object System.IO.BinaryWriter($ms)
    $out.Write([System.Text.Encoding]::ASCII.GetBytes('icns'), 0, 4)
    $total = [BitConverter]::GetBytes([UInt32]($bytes.Length + 8)); [array]::Reverse($total)
    $out.Write($total, 0, 4); $out.Write($bytes, 0, $bytes.Length); $out.Flush()
    [System.IO.File]::WriteAllBytes($path, $ms.ToArray())
    "  icon.icns $([math]::Round((Get-Item $path).Length/1KB)) KB"
}

New-Icns @(
    @('ic11', (PngBytes $cache[32])),
    @('ic12', (PngBytes $cache[64])),
    @('ic07', (PngBytes $cache[128])),
    @('ic08', (PngBytes $cache[256]))
) (Join-Path $OutDir 'icon.icns')

$src.Dispose()
foreach ($b in $cache.Values) { $b.Dispose() }
"done"
