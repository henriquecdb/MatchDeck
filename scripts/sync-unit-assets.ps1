$ErrorActionPreference = 'Stop'
$revision = '797538c97f3cd957bf700b23b90cdaf808e4fa80'
$repository = "https://raw.githubusercontent.com/denniske/aoe2companion/$revision"
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'public\units'
$emblemDirectory = Join-Path $projectRoot 'public\civilizations'
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $emblemDirectory -Force | Out-Null
$civSource = (Invoke-WebRequest -Uri "$repository/dataset2/src/data/aoe2/civs.data.ts").Content
$emblemEntries = [regex]::Matches($civSource, "'([^']+)': require\('([^']+/civilizations/de/[^']+\.png)'\)")
$emblems = @{}
foreach ($emblem in $emblemEntries) {
    $emblems[$emblem.Groups[1].Value] = $emblem.Groups[2].Value -replace '^.*assets/', 'assets/'
}
$source = (Invoke-WebRequest -Uri "$repository/data/src/helper/civs.ts").Content
$entries = [regex]::Matches($source, "name:\s*'([^']+)',\s*uniqueUnits:\s*\[([^\]]+)\]")
$catalog = [ordered]@{}
foreach ($entry in $entries) {
    $civilization = $entry.Groups[1].Value
    $unitKeys = @([regex]::Matches($entry.Groups[2].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
    $primaryUnit = $unitKeys[0]
    $catalog[$civilization.ToLowerInvariant()] = [ordered]@{
        name = $civilization
        units = @($unitKeys | ForEach-Object { [regex]::Replace($_, '(?<=[a-z])(?=[A-Z])', ' ') })
        image = "/units/$primaryUnit.png"
        emblem = "/civilizations/$($civilization.ToLowerInvariant()).png"
    }
    Invoke-WebRequest -Uri "$repository/assets/units/$primaryUnit.png" -OutFile (Join-Path $assetDirectory "$primaryUnit.png")
    if (-not $emblems.ContainsKey($civilization)) { throw "No emblem mapped for $civilization" }
    Invoke-WebRequest -Uri "$repository/$($emblems[$civilization])" -OutFile (Join-Path $emblemDirectory "$($civilization.ToLowerInvariant()).png")
}
$catalog | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot 'src\games\aoe2\unit-catalog.json') -Encoding utf8
Write-Output "Updated $($catalog.Count) civilizations from $revision"
