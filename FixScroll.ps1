# FixScroll.ps1 – Allow game container to scroll internally

$cssPath = "css/styles.css"
$content = Get-Content $cssPath -Raw

# Replace the #gameContainer block with the version that scrolls internally
$oldBlock = @'
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

$newBlock = @'
#gameContainer {
  position: fixed;
  inset: 0;                       /* top:0; right:0; bottom:0; left:0 */
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;               /* scroll inside if content is taller than viewport */
  overflow-x: hidden;
  background: transparent;
  transition: opacity 1.2s ease;
  opacity: 0;
  will-change: opacity;
  z-index: 1;
}
'@

$content = $content.Replace($oldBlock, $newBlock)

Set-Content $cssPath -Value $content -Encoding UTF8 -NoNewline
Write-Host "Game container now scrolls internally. Restart the game to test." -ForegroundColor Green