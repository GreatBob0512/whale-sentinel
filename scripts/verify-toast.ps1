$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Y9000P\Documents\deepseek-harness\default-workspace\whale-sentinel'
$script = Join-Path $root 'native-wake.ps1'
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
try {
    $installed = @(Get-StartApps | Where-Object { $_.Name -eq 'DeepSeek Harness' })
    if ($installed.Count -eq 1 -and [string]$installed[0].AppID -match '^(?:electron\.app\.DeepSeek Harness|com\.deepseek\.dsh)$') { $appId = [string]$installed[0].AppID }
} catch { }
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
function Get-Toasts { @([Windows.UI.Notifications.ToastNotificationManager]::History.GetHistory($appId) | Where-Object { $_.Group -eq 'whale-sentinel' }) }
function Show-Test([string]$tag) {
    $uri = 'dsh-whale-aaaaaaaaaaaa://activate/' + ('b' * 64)
    $payload = @{ title = '小鲸哨 · 验证'; body = 'Toast 撤回验证'; sessionId = 'verify-toast'; kind = 'done'; tag = $tag; soundEnabled = $false; meta = 'verification'; activationUri = $uri } | ConvertTo-Json -Compress
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
    & $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script -Mode Notify -PayloadBase64 $b64
}
$tag = ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes('verify-toast')))).Replace('-', '').ToLower().Substring(0, 16)
$before = (Get-Toasts).Count
$notifyExit = Show-Test $tag
Start-Sleep -Seconds 1
$shown = (Get-Toasts).Count
$removeExit = & $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script -Mode Remove
Start-Sleep -Seconds 1
$afterGroup = (Get-Toasts).Count
$notify2Exit = Show-Test $tag
Start-Sleep -Seconds 1
$shownAgain = (Get-Toasts).Count
$removeTagExit = & $ps -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script -Mode Remove -Tag $tag
Start-Sleep -Seconds 1
$afterTag = (Get-Toasts).Count
[ordered]@{ appId = $appId; before = $before; notifyExit = $notifyExit; shown = $shown; removeExit = $removeExit; afterGroup = $afterGroup; notify2Exit = $notify2Exit; shownAgain = $shownAgain; removeTagExit = $removeTagExit; afterTag = $afterTag } | ConvertTo-Json -Compress
