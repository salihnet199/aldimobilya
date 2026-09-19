Add-Type -AssemblyName System.Drawing

$inputPath = 'C:\Users\salih\Desktop\aldimobilya\apps\web\public\photo_2026-09-19_11-13-51.jpg'
$outputPath = 'C:\Users\salih\Desktop\aldimobilya\apps\web\public\logo.png'

$bitmap = New-Object System.Drawing.Bitmap($inputPath)
$w = $bitmap.Width
$h = $bitmap.Height
Write-Host "Processing ${w}x${h} image..."

$result = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($result)
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($bitmap, 0, 0)
$g.Dispose()

$threshold = 55
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $pixel = $result.GetPixel($x, $y)
        $r = $pixel.R
        $gr = $pixel.G
        $b = $pixel.B
        if ($r -lt $threshold -and $gr -lt $threshold -and $b -lt $threshold) {
            $result.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        } elseif ($r -lt 90 -and $gr -lt 90 -and $b -lt 90) {
            $maxVal = $r
            if ($gr -gt $maxVal) { $maxVal = $gr }
            if ($b -gt $maxVal) { $maxVal = $b }
            $alpha = [int](($maxVal / 90.0) * 255)
            $result.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $gr, $b))
        }
    }
}

$result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$result.Dispose()
Write-Host "Done! Saved to $outputPath"
