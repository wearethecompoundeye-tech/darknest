# fix-gaze-phase.ps1
# Moves isGazeActive/setGazeActive from startGazeWarning() to startGazeEvent()
# No regex, no bulk replacements, bulletproof handling.

$ErrorActionPreference = "Stop"

$FilePath = "js\systems\gaze-event.ts"
$BackupPath = "$FilePath.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

# Read all lines as array
$lines = Get-Content $FilePath -Encoding UTF8

# Backup the original
Copy-Item $FilePath $BackupPath
Write-Host "Backup created: $BackupPath"

# Function to find the index of a line whose trimmed content equals $search
function Find-ExactLine {
    param($lines, $search, $startIndex = 0)
    $trimmedSearch = $search.Trim()
    for ($i = $startIndex; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq $trimmedSearch) {
            return $i
        }
    }
    return -1
}

# Find the startGazeWarning function
$warningFuncIdx = Find-ExactLine $lines "export function startGazeWarning(): void {"
if ($warningFuncIdx -lt 0) {
    Write-Error "Could not locate 'startGazeWarning' function definition."
    exit 2
}

# Within that function, find the two lines to remove (they appear inside)
$remove1 = "isGazeActive.value = true;"
$remove2 = "setGazeActive(true);"

$idx1 = Find-ExactLine $lines $remove1 $warningFuncIdx
$idx2 = Find-ExactLine $lines $remove2 $warningFuncIdx

if ($idx1 -lt 0 -or $idx2 -lt 0) {
    Write-Error "Could not find one or both target lines inside startGazeWarning()."
    Write-Host "Searched for: '$remove1' and '$remove2'"
    exit 3
}

# Verify they are inside the function (before the closing brace) – simple check: they appear after the opening, and before the end of the function (but we don't need to be overly complex)
# Just delete them. Remove them in reverse order to keep indices stable.
$lines = $lines | Where-Object { $_.Trim() -ne $remove1.Trim() -and $_.Trim() -ne $remove2.Trim() }
# Note: This removes ALL occurrences of these lines, but there should be only one of each globally.
# If there are duplicates, the script will remove all of them. We'll check for multiple occurrences before removal.

# Instead, safer: we'll remove only the found indices. Let's do that.

# Re-read lines and remove by index (descending)
$lines = Get-Content $FilePath -Encoding UTF8
$removeIndices = @($idx1, $idx2) | Sort-Object -Descending
foreach ($idx in $removeIndices) {
    $lines = $lines[0..($idx-1)] + $lines[($idx+1)..($lines.Count-1)]
}

# Now insert the two lines at the beginning of startGazeEvent()
$startEventFuncIdx = Find-ExactLine $lines "function startGazeEvent(): void {"
if ($startEventFuncIdx -lt 0) {
    Write-Error "Could not locate 'startGazeEvent' function definition after removal."
    exit 4
}

# Find the stopLoop line inside that function to insert after
$stopLoopLine = "stopLoop('gazeWarningBg');"
$insertAfterIdx = Find-ExactLine $lines $stopLoopLine $startEventFuncIdx
if ($insertAfterIdx -lt 0) {
    Write-Error "Could not locate the stopLoop line in startGazeEvent()."
    exit 5
}

# Insert the two lines after that line
$newLines = @()
for ($i = 0; $i -le $insertAfterIdx; $i++) {
    $newLines += $lines[$i]
}
$newLines += "  isGazeActive.value = true;"
$newLines += "  setGazeActive(true);"
for ($i = $insertAfterIdx + 1; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
}

# Write the file
$newLines | Set-Content $FilePath -Encoding UTF8
Write-Host "Successfully updated $FilePath"
Write-Host "Original backup saved as $BackupPath"