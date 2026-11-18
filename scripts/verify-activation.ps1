$ErrorActionPreference = 'Stop'
$root = (Resolve-Path '.').Path
$script = Join-Path $root 'win-activation.ps1'
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
$p1 = 'dsh-whale-7e57aaaa0001'
$p2 = 'dsh-whale-7e57bbbb0002'
$real = 'dsh-whale-c38062243fae'
$d1 = Join-Path $env:TEMP ('鲸哨-路径测试-a-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$d2 = Join-Path $env:TEMP ('鲸哨-路径测试-b-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$realBefore = Test-Path "HKCU:\Software\Classes\$real"
$results = [ordered]@{}
function Invoke-Mode([string]$mode, [string]$protocol, [string]$dir) {
    & $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script -Mode $mode -Protocol $protocol -SpoolDirectory $dir
    return $LASTEXITCODE
}
try {
    New-Item -ItemType Directory -Path $d1, $d2 | Out-Null
    $results['registerA'] = Invoke-Mode 'Register' $p1 $d1
    $results['registerB'] = Invoke-Mode 'Register' $p2 $d2
    $results['keyA'] = Test-Path "HKCU:\Software\Classes\$p1"
    $results['keyB'] = Test-Path "HKCU:\Software\Classes\$p2"
    $results['realKept'] = (Test-Path "HKCU:\Software\Classes\$real") -eq $realBefore
    $results['registerAgain'] = Invoke-Mode 'Register' $p1 $d1
    $results['oneProtocolEach'] = ((Test-Path "HKCU:\Software\Classes\$p1") -and (Test-Path "HKCU:\Software\Classes\$p2"))

    $vbsA = Join-Path $d1 'activate.vbs'
    $bytes = [IO.File]::ReadAllBytes($vbsA)
    $results['launcherUtf16'] = ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE)
    $body = [IO.File]::ReadAllText($vbsA, [Text.Encoding]::Unicode)
    $results['cjkPathInLauncher'] = $body.Contains($d1)

    $token = 'c' * 64
    & $wscript //B //Nologo $vbsA ($p1 + '://activate/' + $token)
    Start-Sleep -Milliseconds 1200
    $click = Join-Path $d1 ($token + '.click')
    $results['clickWritten'] = Test-Path $click
    $results['clickMatches'] = if (Test-Path $click) { ([IO.File]::ReadAllText($click)).Trim() -ceq $token } else { $false }
} finally {
    foreach ($pair in @(@($p1, $d1), @($p2, $d2))) {
        try { [void](Invoke-Mode 'Unregister' $pair[0] $pair[1]) } catch { }
    }
    foreach ($dir in @($d1, $d2)) { if (Test-Path $dir) { Remove-Item -LiteralPath $dir -Recurse -Force } }
}
$results['keysRemoved'] = (-not (Test-Path "HKCU:\Software\Classes\$p1")) -and (-not (Test-Path "HKCU:\Software\Classes\$p2"))
$results['realStillThere'] = (Test-Path "HKCU:\Software\Classes\$real")
$results | ConvertTo-Json -Compress
