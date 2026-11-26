# =====================================================================
# QREDO - Mise à jour du sommaire et export PDF du mode d'emploi (Word)
# ---------------------------------------------------------------------
# Usage : powershell -ExecutionPolicy Bypass -File tools\manual\export-pdf.ps1 [-Docx <nom.docx>]
#         (par défaut : le mode d'emploi ; ex. -Docx QREDO-Installation-iPhone.docx)
# Nécessite Microsoft Word installé.
# =====================================================================

param([string]$Docx = 'QREDO-Mode-emploi.docx')

$docPath = Resolve-Path (Join-Path $PSScriptRoot "..\..\documentation\$Docx")
$pdf = [System.IO.Path]::ChangeExtension($docPath, '.pdf')

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
    $doc = $word.Documents.Open($docPath.Path)
    # Confidentialité : Word ne doit pas inscrire le nom de l'utilisateur du PC
    # (auteur, dernier auteur) dans le document ni dans le PDF
    $doc.RemovePersonalInformation = $true
    # Sommaire + numéros de page
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    $doc.Save()
    # 17 = wdExportFormatPDF ; 0 = optimisé pour l'impression ; 1 = signets depuis les titres
    try {
        $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 0, 0, 0, $true, $true, 1)
        Write-Host "OK  $pdf"
    }
    catch {
        Write-Warning "PDF non exporté : le fichier est probablement ouvert dans un lecteur PDF. Fermez-le et relancez."
    }
}
finally {
    if ($doc) { $doc.Close($false) }
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
