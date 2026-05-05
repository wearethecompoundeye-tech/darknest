# FixUI.ps1 – Replace body/game-container blocks with correct positioning.

$cssPath = "css/styles.css"
$content = Get-Content $cssPath -Raw

# ---------- 1. Replace the html, body block ----------
$oldHtmlBody = @'
html, body {
  margin: 0;
  padding: 0;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  background: #08040c;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 15px;
  color: #efe0c0;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
  perspective: 1000px;
}
'@

$newHtmlBody = @'
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;               /* prevent unintended page scroll */
  background: #08040c;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 15px;
  color: #efe0c0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
  perspective: 1000px;
}
'@

$content = $content.Replace($oldHtmlBody, $newHtmlBody)

# ---------- 2. Replace the #gameContainer block ----------
$oldGameContainer = @'
#gameContainer {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: auto;
  overflow: visible !important;
  border: none;
  background: transparent;
  transition: opacity 1.2s ease;
  /* perspective for 3D effect (applied when altars active) */
  opacity: 0;
  will-change: opacity;
}
'@

$newGameContainer = @'
#gameContainer {
  position: fixed;
  inset: 0;                       /* top:0; right:0; bottom:0; left:0 */
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;               /* no page‑level scroll */
  background: transparent;
  transition: opacity 1.2s ease;
  opacity: 0;
  will-change: opacity;
  z-index: 1;
}
'@

$content = $content.Replace($oldGameContainer, $newGameContainer)

# ---------- Save ----------
Set-Content $cssPath -Value $content -Encoding UTF8 -NoNewline
Write-Host "UI positioning fixed. Restart game to see changes." -ForegroundColor Green