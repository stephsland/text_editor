# Download Resource Hacker if not already present
$resourceHackerUrl = "https://raw.githubusercontent.com/angusj/resourcehacker/master/release/ResourceHacker.exe"
$resourceHackerDir = ".\src\ResourceHacker"
$resourceHackerExe = "$resourceHackerDir\ResourceHacker.exe"

# Create ResourceHacker directory if it doesn't exist
if (-not (Test-Path $resourceHackerDir)) {
    New-Item -ItemType Directory -Path $resourceHackerDir | Out-Null
}

# Download ResourceHacker.exe if not present
if (-not (Test-Path $resourceHackerExe)) {
    Write-Host "Downloading Resource Hacker..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $resourceHackerUrl -OutFile $resourceHackerExe
        Write-Host "Resource Hacker downloaded successfully"
    }
    catch {
        Write-Error "Failed to download Resource Hacker: $_"
        exit 1
    }
}

# Verify paths exist
$exePath = ".\dist\win-unpacked\text-editor.exe"
$icoPath = ".\src\icon.ico"

if (-not (Test-Path $exePath)) {
    Write-Error "Could not find executable at: $exePath"
    exit 1
}

if (-not (Test-Path $icoPath)) {
    Write-Error "Could not find icon file at: $icoPath"
    exit 1
}

# Create backup of original exe
try {
    Copy-Item $exePath "$exePath.backup" -ErrorAction Stop
    Write-Host "Created backup at $exePath.backup"
}
catch {
    Write-Error "Failed to create backup: $_"
    exit 1
}

# Replace icon using Resource Hacker
try {
    & $resourceHackerExe -open $exePath -save $exePath -action addoverwrite -res $icoPath -mask ICONGROUP,1
    Write-Host "Icon replacement completed successfully"
}
catch {
    Write-Error "Failed to replace icon: $_"
    Write-Host "Restoring backup..."
    Copy-Item "$exePath.backup" $exePath
    exit 1
}
