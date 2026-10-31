$ErrorActionPreference = 'Stop'
$revision = '797538c97f3cd957bf700b23b90cdaf808e4fa80'
$repository = "https://raw.githubusercontent.com/denniske/aoe2companion/$revision"
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'public\units'
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
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
    }
    Invoke-WebRequest -Uri "$repository/assets/units/$primaryUnit.png" -OutFile (Join-Path $assetDirectory "$primaryUnit.png")
}
$catalog | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot 'src\games\aoe2\unit-catalog.json') -Encoding utf8
Write-Output "Updated $($catalog.Count) civilizations from $revision"
