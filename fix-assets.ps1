# fix-assets.ps1 – Gentle asset path mending for GitHub Pages

# 1. sfx.ts
$sfx = Get-Content "js/audio/sfx.ts" -Raw
$sfx = $sfx.Replace('`/sfx/', '`${import.meta.env.BASE_URL}sfx/')
$sfx = $sfx.Replace('`/music/', '`${import.meta.env.BASE_URL}music/')
Set-Content "js/audio/sfx.ts" $sfx -NoNewline
Write-Host "✔ sfx.ts"

# 2. All .ts / .tsx / .js / .jsx image paths
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx | ForEach-Object {
    $text = Get-Content $_.FullName -Raw
    $changed = $false
    if ($text.Contains("'/Images/")) {
        $text = $text.Replace("'/Images/", "'`${import.meta.env.BASE_URL}Images/")
        $changed = $true
    }
    if ($text.Contains('"/Images/')) {
        $text = $text.Replace('"/Images/', '"`${import.meta.env.BASE_URL}Images/')
        $changed = $true
    }
    if ($changed) {
        Set-Content $_.FullName $text -NoNewline
        Write-Host "✔ $($_.Name)"
    }
}

# 3. index.html – use Vite’s <%= BASE_URL %> placeholder
$html = Get-Content "index.html" -Raw
$html = $html.Replace('"/Images/', '"<%= BASE_URL %>Images/')
Set-Content "index.html" $html -NoNewline
Write-Host "✔ index.html"

# 4. styles.css – background via CSS variable
$css = Get-Content "styles.css" -Raw
$css = $css.Replace(
    "background-image: url('/Images/Game%20Art/UI%20Elements/Main%20Game%20Background%20Image.png');",
    "background-image: var(--bg-image);"
)
Set-Content "styles.css" $css -NoNewline

# 5. Inject the CSS variable setter into index.html (inside <head>)
$setter = '<script>document.documentElement.style.setProperty(''--bg-image'', ''url(<%= BASE_URL %>Images/Game%20Art/UI%20Elements/Main%20Game%20Background%20Image.png)'');</script>'
$html = $html.Replace('</head>', "$setter`r`n</head>")
Set-Content "index.html" $html -NoNewline
Write-Host "✔ CSS background variable setter added to index.html"

Write-Host "All asset paths repaired, my dear."
