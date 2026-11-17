param(
    [string]$Mode,
    [string]$Protocol,
    [string]$SpoolDirectory,
    [string]$ActivationUri
)

# Exit codes: 0 success (including replay/missing unregister), 2 invalid input,
# 3 foreign registration conflict, 4 local IO/registry failure. Never elevate.
$ErrorActionPreference = 'Stop'

function Test-LocalFixedPath([string]$Value) {
    return (-not [string]::IsNullOrEmpty($Value)) -and ($Value -cmatch '^[A-Za-z]:\\') -and
        ($Value -notmatch '[\x00-\x1f\x7f"<>|?*%]') -and (-not $Value.Substring(2).Contains(':'))
}

function Get-ActivationToken([string]$Value, [string]$ExpectedProtocol) {
    if ($ExpectedProtocol -cnotmatch '\Adsh-whale-[a-f0-9]{12}\z') { return $null }
    # Match raw URI, not System.Uri canonicalization (which hides case, escapes,
    # default ports or extra slash). This forbids credentials/query/fragment too.
    $pattern = '\A' + [regex]::Escape($ExpectedProtocol) + '://activate/([a-f0-9]{64})\z'
    $match = [regex]::Match($Value, $pattern, [Text.RegularExpressions.RegexOptions]::CultureInvariant)
    if (-not $match.Success) { return $null }
    return $match.Groups[1].Value
}

function ConvertTo-FixedArgument([string]$Value) {
    if (-not (Test-LocalFixedPath $Value)) { throw 'Invalid fixed path' }
    # Windows CommandLineToArgvW: backslashes before the closing quote double.
    # No internal quote/control is permitted. Percent is forbidden so a fixed
    # path cannot contain shell protocol substitution placeholders such as %1.
    return '"' + [regex]::Replace($Value, '(\\+)$', '$1$1') + '"'
}

function Get-ActivationCommand([string]$WScriptPath, [string]$LauncherPath, [string]$ExpectedProtocol) {
    if ($ExpectedProtocol -cnotmatch '\Adsh-whale-[a-f0-9]{12}\z') { throw 'Invalid protocol' }
    # wscript.exe is a GUI-subsystem host: no console window is created at all, so
    # clicking a toast never flashes a terminal the way powershell.exe does.
    return (ConvertTo-FixedArgument $WScriptPath) + ' //B //Nologo ' + (ConvertTo-FixedArgument $LauncherPath) + ' "%1"'
}

function Write-ActivationLauncher([string]$Directory, [string]$PowerShellPath, [string]$ScriptPath, [string]$ExpectedProtocol) {
    if (-not (Test-LocalDirectory $Directory) -or -not (Test-LocalFixedPath $PowerShellPath) -or
        -not (Test-LocalFixedPath $ScriptPath) -or $ExpectedProtocol -cnotmatch '\Adsh-whale-[a-f0-9]{12}\z') { throw 'Invalid launcher input' }
    $launcher = [IO.Path]::Combine($Directory, 'activate.vbs')
    # A here-string keeps each interpolated value on one line: concatenating array
    # elements emitted the paths as separate VBS lines and broke the launcher.
    $body = @"
Option Explicit
Dim uri, re, sh, cmd, q, ps
If WScript.Arguments.Count <> 1 Then WScript.Quit 2
uri = WScript.Arguments(0)
Set re = New RegExp
re.Pattern = "^${ExpectedProtocol}://activate/[0-9a-f]{64}`$"
If Not re.Test(uri) Then WScript.Quit 2
q = Chr(34)
ps = q & "$PowerShellPath" & q & " -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File " & q & "$ScriptPath" & q & " -Mode Activate -Protocol " & q & "$ExpectedProtocol" & q & " -SpoolDirectory " & q & "$Directory" & q & " -ActivationUri " & q & uri & q
Set sh = CreateObject("WScript.Shell")
sh.Run ps, 0, False
"@
    [IO.File]::WriteAllText($launcher, ($body -replace "`r?`n", "`r`n"), [Text.Encoding]::ASCII)
    return $launcher
}

function Get-RegistrationDecision([bool]$Exists, [string]$ActualMarker, [string]$ActualCommand, [string]$ExpectedMarker, [string]$ExpectedCommand) {
    if (-not $Exists) { return 'missing' }
    # Marker match alone proves ownership: the command string changes between
    # versions (e.g. powershell.exe -> wscript.exe) and must be upgradable.
    if ($ActualMarker -ceq $ExpectedMarker) { return 'owned' }
    return 'conflict'
}

function Test-LocalDirectory([string]$Directory) {
    if (-not (Test-LocalFixedPath $Directory) -or -not [IO.Directory]::Exists($Directory)) { return $false }
    $drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($Directory))
    if ($drive.DriveType -notin @([IO.DriveType]::Fixed, [IO.DriveType]::Removable, [IO.DriveType]::Ram)) { return $false }
    # Do not follow a junction/symlink into a remote or unrelated directory.
    $item = New-Object IO.DirectoryInfo $Directory
    while ($null -ne $item) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
        $item = $item.Parent
    }
    return $true
}

function Write-ActivationClick([string]$Directory, [string]$Token) {
    if ($Token -cnotmatch '\A[a-f0-9]{64}\z' -or -not (Test-LocalDirectory $Directory)) { return $false }
    $target = [IO.Path]::Combine($Directory, ($Token + '.click'))
    $stream = $null
    try {
        $stream = [IO.File]::Open($target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        $bytes = [Text.Encoding]::ASCII.GetBytes($Token)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush()
        return $true
    } catch [IO.IOException] {
        # ERROR_FILE_EXISTS / ERROR_ALREADY_EXISTS only: never overwrite a replay.
        $code = $_.Exception.HResult -band 0xFFFF
        if (($code -in @(80, 183)) -and [IO.File]::Exists($target)) { return $true }
        throw
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
    }
}

try {
    if ($Mode -cnotin @('Register', 'Unregister', 'Activate') -or $Protocol -cnotmatch '\Adsh-whale-[a-f0-9]{12}\z' -or
        -not (Test-LocalFixedPath $SpoolDirectory) -or -not (Test-LocalFixedPath $PSCommandPath)) { exit 2 }
    if ($Mode -ceq 'Activate') {
        $token = Get-ActivationToken $ActivationUri $Protocol
        if ($null -eq $token -or -not (Test-LocalDirectory $SpoolDirectory)) { exit 2 }
        if (Write-ActivationClick $SpoolDirectory $token) { exit 0 }
        exit 4
    }
    if ($Mode -ceq 'Register' -and -not (Test-LocalDirectory $SpoolDirectory)) { exit 2 }
    $powerShellPath = [IO.Path]::Combine($env:SystemRoot, 'System32\WindowsPowerShell\v1.0\powershell.exe')
    if (-not (Test-LocalFixedPath $powerShellPath) -or -not [IO.File]::Exists($powerShellPath)) { exit 2 }
    $wscriptPath = [IO.Path]::Combine($env:SystemRoot, 'System32\wscript.exe')
    if (-not (Test-LocalFixedPath $wscriptPath) -or -not [IO.File]::Exists($wscriptPath)) { exit 2 }
    $launcherPath = Write-ActivationLauncher $SpoolDirectory $powerShellPath $PSCommandPath $Protocol
    $command = Get-ActivationCommand $wscriptPath $launcherPath $Protocol
    # Explicit ownership also pins the exact script/spool via the expected command.
    $markerName = 'DSHWhaleActivationOwner'
    $marker = 'whale-sentinel.win-activation.v1'
    $keyPath = 'Software\Classes\' + $Protocol
    $root = [Microsoft.Win32.Registry]::CurrentUser
    $key = $root.OpenSubKey($keyPath, $false)
    $exists = $null -ne $key
    $actualMarker = ''
    $actualCommand = ''
    if ($exists) {
        try {
            $actualMarker = [string]$key.GetValue($markerName, '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
            $commandKey = $key.OpenSubKey('shell\open\command', $false)
            if ($null -ne $commandKey) {
                try { $actualCommand = [string]$commandKey.GetValue('', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) }
                finally { $commandKey.Dispose() }
            }
        } finally { $key.Dispose() }
    }
    $decision = Get-RegistrationDecision $exists $actualMarker $actualCommand $marker $command
    if ($decision -ceq 'conflict') { exit 3 }
    if ($Mode -ceq 'Unregister') {
        if ($decision -ceq 'owned') { $root.DeleteSubKeyTree($keyPath, $false) }
        try { $stale = [IO.Path]::Combine($SpoolDirectory, 'activate.vbs'); if ([IO.File]::Exists($stale)) { [IO.File]::Delete($stale) } } catch { }
        exit 0
    }
    if ($decision -ceq 'owned') { exit 0 }
    # Reclaim our own protocols left behind by earlier plugin generations: only
    # keys carrying this marker are ours, and the current one is kept.
    try {
        foreach ($stale in @($root.OpenSubKey('Software\Classes').GetSubKeyNames() | Where-Object { $_ -like 'dsh-whale-*' -and $_ -cne $Protocol })) {
            $staleKey = $root.OpenSubKey('Software\Classes\' + $stale, $false)
            if ($null -eq $staleKey) { continue }
            try {
                $staleMarker = [string]$staleKey.GetValue($markerName, '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
            } finally { $staleKey.Dispose() }
            if ($staleMarker -ceq $marker) { $root.DeleteSubKeyTree('Software\Classes\' + $stale, $false) }
        }
    } catch { }
    $key = $root.CreateSubKey($keyPath)
    try {
        $key.SetValue('', 'URL:DSH Whale Activation', [Microsoft.Win32.RegistryValueKind]::String)
        $key.SetValue('URL Protocol', '', [Microsoft.Win32.RegistryValueKind]::String)
        $key.SetValue($markerName, $marker, [Microsoft.Win32.RegistryValueKind]::String)
        $commandKey = $key.CreateSubKey('shell\open\command')
        try { $commandKey.SetValue('', $command, [Microsoft.Win32.RegistryValueKind]::String) }
        finally { $commandKey.Dispose() }
    } finally { $key.Dispose() }
    exit 0
} catch {
    exit 4
}
