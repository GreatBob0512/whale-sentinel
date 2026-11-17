# Fixed script: user strings arrive only as UTF-8 JSON/base64, never as code.
# Exit codes are the IPC result channel because all child stdio is ignored.
[CmdletBinding()]
param(
    [ValidateSet('Wake', 'Notify')][string]$Mode = 'Wake',
    [int]$ParentPid = 0,
    [string]$PayloadBase64 = ''
)
$ErrorActionPreference = 'Stop'

function Invoke-DshWake {
    if ($ParentPid -le 0) { return 22 }
    # Read the command line as well as the actual executable path: renderer,
    # utility, GPU and crashpad processes are not Electron's native main process.
    $records = @(Get-CimInstance Win32_Process -ErrorAction Stop)
    $byId = @{}
    foreach ($record in $records) { $byId[[int]$record.ProcessId] = $record }
    $mainProcesses = @{}
    foreach ($record in $records) {
        if ([string]::IsNullOrWhiteSpace($record.ExecutablePath) -or
            [string]::IsNullOrWhiteSpace($record.CommandLine)) { continue }
        if ([IO.Path]::GetFileName([string]$record.ExecutablePath) -ine 'DeepSeek Harness.exe') { continue }
        if ([string]$record.CommandLine -match '(?i)(?:^|["\s])--type(?:["\s=]|$)') { continue }
        $mainProcesses[[int]$record.ProcessId] = $record
    }
    # The nearest main-process ancestor is authoritative, with parentPid itself
    # first. Never fall back to another independently launched DSH instance.
    $targetPid = 0
    $cursor = $ParentPid
    $visited = @{}
    for ($depth = 0; $depth -lt 64 -and $cursor -gt 0; $depth++) {
        if ($visited.ContainsKey($cursor)) { break }
        $visited[$cursor] = $true
        if ($mainProcesses.ContainsKey($cursor)) { $targetPid = $cursor; break }
        if (-not $byId.ContainsKey($cursor)) { break }
        $cursor = [int]$byId[$cursor].ParentProcessId
    }
    if ($targetPid -eq 0) { return 22 }

    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class DshNativeWindows {
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder className, int count);
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint command);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    public static IntPtr[] Find(uint targetPid) {
        var found = new List<IntPtr>();
        bool complete = EnumWindows(delegate(IntPtr hwnd, IntPtr unused) {
            uint processId;
            GetWindowThreadProcessId(hwnd, out processId);
            if (processId != targetPid) return true;
            var className = new StringBuilder(256);
            GetClassName(hwnd, className, className.Capacity);
            // Hidden tray windows must remain eligible: do NOT filter visibility.
            // Owned Chromium popups/tooltips are not the native application window.
            if (className.ToString() == "Chrome_WidgetWin_1" && GetWindow(hwnd, 4) == IntPtr.Zero)
                found.Add(hwnd);
            return true;
        }, IntPtr.Zero);
        if (!complete) throw new InvalidOperationException("EnumWindows failed");
        return found.ToArray();
    }
}
'@
    $windows = @([DshNativeWindows]::Find([uint32]$targetPid))
    if ($windows.Count -eq 0) { return 20 }
    $foreground = [DshNativeWindows]::GetForegroundWindow()
    $selected = @($windows | Where-Object { $_ -eq $foreground })
    if ($selected.Count -eq 0) {
        $selected = @($windows | Where-Object { [DshNativeWindows]::IsWindowVisible($_) })
    }
    if ($selected.Count -eq 0 -and $windows.Count -eq 1) { $selected = $windows }
    # Multiple indistinguishable hidden windows: don't focus an arbitrary one.
    if ($selected.Count -ne 1) { return 23 }
    $hwnd = [IntPtr]$selected[0]
    # Recheck identity immediately before acting, avoiding stale PID snapshots.
    $live = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction Stop
    if ($null -eq $live -or [IO.Path]::GetFileName([string]$live.ExecutablePath) -ine 'DeepSeek Harness.exe' -or
        [string]::IsNullOrWhiteSpace($live.CommandLine) -or
        [string]$live.CommandLine -match '(?i)(?:^|["\s])--type(?:["\s=]|$)' -or
        $live.CreationDate -ne $mainProcesses[$targetPid].CreationDate) { return 22 }
    [uint32]$windowPid = 0
    [void][DshNativeWindows]::GetWindowThreadProcessId($hwnd, [ref]$windowPid)
    if ($windowPid -ne $targetPid -or -not [DshNativeWindows]::IsWindow($hwnd)) { return 20 }
    # ShowWindow returns PREVIOUS visibility, not operation success. Ignore it.
    # Restore from tray/minimize first, then maximize so the window fills the screen.
    [void][DshNativeWindows]::ShowWindow($hwnd, 9)
    [void][DshNativeWindows]::ShowWindow($hwnd, 3)
    $accepted = [DshNativeWindows]::SetForegroundWindow($hwnd)
    # Some apps ignore maximize while inactive: retry once the window is foreground.
    if (-not [DshNativeWindows]::IsZoomed($hwnd)) { [void][DshNativeWindows]::ShowWindow($hwnd, 3) }
    # Foreground grants can be denied by Windows. Verify actual window state.
    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        if ($accepted -and [DshNativeWindows]::GetForegroundWindow() -eq $hwnd -and
            [DshNativeWindows]::IsWindowVisible($hwnd) -and -not [DshNativeWindows]::IsIconic($hwnd)) {
            # Maximize is best effort: a window that refuses to zoom still counts as woken.
            if (-not [DshNativeWindows]::IsZoomed($hwnd)) { [void][DshNativeWindows]::ShowWindow($hwnd, 3) }
            return 0
        }
        Start-Sleep -Milliseconds 40
    }
    return 21
}

function Invoke-DshToast {
    if ($PayloadBase64.Length -eq 0 -or $PayloadBase64.Length -gt 20000) { return 30 }
    $data = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadBase64)) | ConvertFrom-Json
    if ([string]$data.tag -notmatch '^[a-f0-9]{16}$') { return 30 }
    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    [void][Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]
    [void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $toast = $xml.CreateElement('toast')
    # Exact per-notice capability, handled by this plugin's own protocol bridge.
    if ([string]$data.activationUri -notmatch '^dsh-whale-[a-f0-9]{12}://activate/[a-f0-9]{64}$') { return 30 }
    $toast.SetAttribute('activationType', 'protocol')
    $toast.SetAttribute('launch', [string]$data.activationUri)
    $visual = $xml.CreateElement('visual')
    $binding = $xml.CreateElement('binding')
    $binding.SetAttribute('template', 'ToastGeneric')
    $heading = $xml.CreateElement('text')
    $heading.InnerText = [string]$data.title
    $heading.SetAttribute('hint-maxLines', '1')
    [void]$binding.AppendChild($heading)
    $group = $xml.CreateElement('group')
    if (-not [string]::IsNullOrWhiteSpace([string]$data.iconPath)) {
        $imagePath = [string]$data.iconPath
        if ($imagePath -notmatch '^[a-zA-Z]:\\' -or [IO.Path]::GetExtension($imagePath) -ine '.png' -or
            -not (Test-Path -LiteralPath $imagePath -PathType Leaf)) { return 30 }
        $portrait = $xml.CreateElement('subgroup')
        $portrait.SetAttribute('hint-weight', '1')
        $portrait.SetAttribute('hint-textStacking', 'center')
        $image = $xml.CreateElement('image')
        $image.SetAttribute('src', ([Uri]$imagePath).AbsoluteUri)
        $image.SetAttribute('hint-crop', 'none')
        [void]$portrait.AppendChild($image)
        [void]$group.AppendChild($portrait)
    }
    $copy = $xml.CreateElement('subgroup')
    $copy.SetAttribute('hint-weight', '4')
    $copy.SetAttribute('hint-textStacking', 'center')
    $description = $xml.CreateElement('text')
    $description.InnerText = [string]$data.body
    $description.SetAttribute('hint-maxLines', '3')
    $description.SetAttribute('hint-wrap', 'true')
    [void]$copy.AppendChild($description)
    if (-not [string]::IsNullOrWhiteSpace([string]$data.meta)) {
        $caption = $xml.CreateElement('text')
        $caption.InnerText = [string]$data.meta
        $caption.SetAttribute('hint-style', 'captionSubtle')
        $caption.SetAttribute('hint-maxLines', '1')
        [void]$copy.AppendChild($caption)
    }
    [void]$group.AppendChild($copy)
    [void]$binding.AppendChild($group)
    [void]$visual.AppendChild($binding)
    [void]$toast.AppendChild($visual)
    $audio = $xml.CreateElement('audio')
    if ($data.soundEnabled -eq $true) { $audio.SetAttribute('src', 'ms-winsoundevent:Notification.Default') } else { $audio.SetAttribute('silent', 'true') }
    [void]$toast.AppendChild($audio)
    [void]$xml.AppendChild($toast)
    $notification = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $notification.Tag = [string]$data.tag
    $notification.Group = 'whale-sentinel'
    $notification.ExpirationTime = [DateTimeOffset]::Now.AddMinutes(5)
    # Prefer the already registered DSH Start-menu identity. Do not create or
    # spoof registration. Keep the existing PowerShell fallback on other installs.
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    try {
        $installed = @(Get-StartApps | Where-Object { $_.Name -eq 'DeepSeek Harness' })
        if ($installed.Count -eq 1 -and [string]$installed[0].AppID -match '^(?:electron\.app\.DeepSeek Harness|com\.deepseek\.dsh)$') {
            $appId = [string]$installed[0].AppID
        }
    } catch { }
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
    # Setting's enum projection may be null in Windows PowerShell 5.1. Show's
    # acceptance/exception is the result boundary, not a delivery guarantee.
    $notifier.Show($notification)
    return 0
}

try {
    if ($Mode -eq 'Notify') { exit (Invoke-DshToast) }
    exit (Invoke-DshWake)
} catch {
    if ($Mode -eq 'Notify') { exit 30 }
    exit 1
}
