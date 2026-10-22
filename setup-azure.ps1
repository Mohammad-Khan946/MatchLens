$ErrorActionPreference = 'Stop'
Write-Host 'Paste your NEW Azure key at the hidden prompt. Do not send it in chat.'
$matchlensSecret = Read-Host 'Azure API key (input hidden)' -AsSecureString
$matchlensPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($matchlensSecret)
try {
    $matchlensPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($matchlensPointer)
    if ([string]::IsNullOrWhiteSpace($matchlensPlain)) { throw 'Key cannot be empty.' }
    @{key=$matchlensPlain.Trim()} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.azure.local.json') -Encoding utf8
    Write-Host 'Saved locally. This file contains a secret and is excluded from Git. Restart MatchLens to load it.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($matchlensPointer)
    $matchlensPlain = $null
}
