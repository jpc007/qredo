# =====================================================================
# QREDO - Génération des icônes de l'application (PNG)
# ---------------------------------------------------------------------
# Usage :  powershell -ExecutionPolicy Bypass -File tools\generate-icons.ps1
# Produit : app\icons\icon-192.png, icon-512.png, icon-maskable-512.png
# Dessin  : fond rouge, carré blanc avec 3 repères "QR", croix médicale.
# =====================================================================

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\app\icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function Draw-Finder($g, [single]$x, [single]$y, [single]$m, $dark, $white) {
    # Repère QR : carré 7x7 modules, anneau blanc 5x5, centre 3x3
    $g.FillRectangle($dark, $x, $y, 7 * $m, 7 * $m)
    $g.FillRectangle($white, $x + $m, $y + $m, 5 * $m, 5 * $m)
    $g.FillRectangle($dark, $x + 2 * $m, $y + 2 * $m, 3 * $m, 3 * $m)
}

function New-QredoIcon([int]$size, [string]$file, [bool]$maskable) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)

    $red = [System.Drawing.Color]::FromArgb(198, 40, 40)
    $redDark = [System.Drawing.Color]::FromArgb(142, 0, 0)
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $red, $redDark, 45

    # Fond : plein cadre pour "maskable", coins arrondis sinon
    if ($maskable) { $g.FillRectangle($grad, $rect) }
    else { $g.FillPath($grad, (New-RoundedPath 0 0 $size $size ($size * 0.22))) }

    # Carré blanc central (plus petit en maskable : zone de sécurité Android)
    $inner = if ($maskable) { $size * 0.56 } else { $size * 0.70 }
    $x0 = ($size - $inner) / 2
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(29, 36, 51))
    $redBrush = New-Object System.Drawing.SolidBrush $red
    $g.FillPath($white, (New-RoundedPath $x0 $x0 $inner $inner ($inner * 0.12)))

    # Grille de 21 modules (taille d'un QR version 1)
    $pad = $inner * 0.09
    $m = ($inner - 2 * $pad) / 21
    $q0 = $x0 + $pad
    Draw-Finder $g $q0 $q0 $m $dark $white
    Draw-Finder $g ($q0 + 14 * $m) $q0 $m $dark $white
    Draw-Finder $g $q0 ($q0 + 14 * $m) $m $dark $white

    # Quelques modules décoratifs
    foreach ($c in @(@(9, 1), @(11, 3), @(9, 5), @(1, 9), @(3, 11), @(5, 9), @(15, 15), @(17, 17), @(19, 15), @(15, 19), @(19, 19))) {
        $g.FillRectangle($dark, $q0 + $c[0] * $m, $q0 + $c[1] * $m, $m, $m)
    }

    # Croix médicale rouge au centre
    $cx = $q0 + 10.5 * $m
    $arm = 2.2 * $m
    $len = 7 * $m
    $g.FillRectangle($white, $cx - $len / 2 - $m * 0.6, $cx - $len / 2 - $m * 0.6, $len + $m * 1.2, $len + $m * 1.2)
    $g.FillRectangle($redBrush, $cx - $arm / 2, $cx - $len / 2, $arm, $len)
    $g.FillRectangle($redBrush, $cx - $len / 2, $cx - $arm / 2, $len, $arm)

    $path = Join-Path $outDir $file
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Host "OK  $path"
}

New-QredoIcon 192 'icon-192.png' $false
New-QredoIcon 512 'icon-512.png' $false
New-QredoIcon 512 'icon-maskable-512.png' $true
