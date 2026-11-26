# 第 176 項最後一步（店主 11-25 第 695 項、11-27 第 732 項「改名記得」）：本機資料夾 JapaneseGrillSimulator 改名為 GrilledFishBusiness（店主選「全部做完後再改」）。
# 資料夾有程式開著（Claude App 的對話與終端分頁、命令列視窗、VS Code、開發伺服器）的時候 Windows 不讓改名。兩種用法：
#   自動（第 732 項）：Claude 把這個檔複製到資料夾外，在背景以 -Wait 執行（WMI 開的程序，關掉 Claude App 也不會跟著停）：
#     每 20 秒看一次哪些程式的工作資料夾在裡面，除了開發伺服器以外都關掉的那一刻，自己停開發伺服器、改名、收尾；
#     紀錄寫在 %LOCALAPPDATA%\GrilledFishBusiness-rename\rename-folder.log（改名後也複製一份到新資料夾的 logs\）。
#   手動：關掉上面那些程式後，在新的 PowerShell 視窗執行一次（還有程式開著就列出是哪些，什麼都不改）：
#     powershell -ExecutionPolicy Bypass -File C:\Users\augus\Projects\JapaneseGrillSimulator\scripts\rename-folder.ps1
# 改名之後：git 的 worktree 記錄修好、它們借用的 node_modules 連結指到新資料夾 → 文件與設定裡的路徑換新
# → 半夜推送的排程換成新名字與新路徑 → 備忘複製到新資料夾的位置 → 在新資料夾重開開發伺服器 → 測試通過才提交、推上去。
# 演練：-Old、-New 指到別的資料夾並加 -Rehearse，只做等候與改名（不碰文件、設定、排程、備忘、git）。-List 只列出現在開著資料夾的程式。
param(
  [switch]$Wait,
  [double]$Hours = 72,
  [int]$Pause = 60,
  [string]$Old = 'C:\Users\augus\Projects\JapaneseGrillSimulator',
  [string]$New = 'C:\Users\augus\Projects\GrilledFishBusiness',
  [switch]$Rehearse,
  [switch]$List
)
# (Continue: git and npm write their warnings to stderr, which 'Stop' would take for a failure and end on)
$ErrorActionPreference = 'Continue'
$wfb = 'GrilledFishBusiness'
$utf8 = New-Object System.Text.UTF8Encoding $false
$logDir = Join-Path $env:LOCALAPPDATA 'GrilledFishBusiness-rename'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir $(if ($Rehearse) { 'rehearse.log' } else { 'rename-folder.log' })
function Say([string]$m) {
  $l = "$(Get-Date -Format 'MM-dd HH:mm:ss') $m"
  Write-Host $l
  try { [System.IO.File]::AppendAllText($log, $l + "`r`n", $utf8) } catch { }
}
# (started in the background by WMI the user's PATH may be missing: git and node from where they are on this machine)
foreach ($d in 'C:\Program Files\Git\cmd', 'C:\Program Files\nodejs') { if ((Test-Path $d) -and ((";$env:Path;") -notlike "*;$d;*")) { $env:Path = "$d;$env:Path" } }
function Swap([string]$path, [string[][]]$pairs) {
  if (-not (Test-Path $path)) { Say "  (沒有 $path)"; return }
  $s = [System.IO.File]::ReadAllText($path, $utf8)
  $was = $s
  foreach ($p in $pairs) { $s = $s.Replace($p[0], $p[1]) }
  if ($s -ne $was) { [System.IO.File]::WriteAllText($path, $s, $utf8); Say "  改了 $path" }
}
Set-Location $env:USERPROFILE
[Environment]::CurrentDirectory = $env:USERPROFILE
if (Test-Path $new) { Say "$new 已經存在，停止"; exit 1 }
if (-not (Test-Path $old)) { Say "找不到 $old，停止"; exit 1 }

# 0. 誰開著這個資料夾：每個程式的工作資料夾（從它的 PEB 讀），開發伺服器那一串另外算（改名前由這裡停掉）
if (-not ('FolderOf' -as [type])) {
  Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices; using System.Text;
public static class FolderOf {
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, IntPtr at, byte[] buf, int n, out IntPtr read);
  [DllImport("kernel32.dll")] static extern bool IsWow64Process(IntPtr h, out bool wow);
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int cls, byte[] buf, int n, out int len);
  static bool Read(IntPtr h, long at, byte[] buf) { IntPtr r; return ReadProcessMemory(h, new IntPtr(at), buf, buf.Length, out r); }
  // the folder a process works in (its PEB's ProcessParameters.CurrentDirectory); null when it can't be read (not ours, 32-bit)
  public static string Cwd(int pid) {
    IntPtr h = OpenProcess(0x0410, false, pid);
    if (h == IntPtr.Zero) return null;
    try {
      bool wow;
      if (IntPtr.Size != 8 || (IsWow64Process(h, out wow) && wow)) return null;
      var pbi = new byte[48]; int len;
      if (NtQueryInformationProcess(h, 0, pbi, pbi.Length, out len) != 0) return null;
      var b = new byte[8];
      if (!Read(h, BitConverter.ToInt64(pbi, 8) + 0x20, b)) return null;
      var us = new byte[16];
      if (!Read(h, BitConverter.ToInt64(b, 0) + 0x38, us)) return null;
      int n = BitConverter.ToUInt16(us, 0);
      if (n == 0 || n > 4096) return null;
      var s = new byte[n];
      if (!Read(h, BitConverter.ToInt64(us, 8), s)) return null;
      return Encoding.Unicode.GetString(s);
    } finally { CloseHandle(h); }
  }
}
'@
}
function Scan {
  $all = @(Get-CimInstance Win32_Process)
  $byId = @{}
  foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
  # the dev server: vite out of this folder, the npm and the cmd that started it, and whatever it started
  $dev = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($v in $all) {
    if (-not ($v.CommandLine -and $v.CommandLine -like "*$old*vite*")) { continue }
    $p = $v
    while ($p -and $dev.Add([int]$p.ProcessId)) {
      $up = $byId[[int]$p.ParentProcessId]
      if ($up -and $up.CommandLine -and ($up.CommandLine -like '*run dev*' -or $up.CommandLine -like '*/c vite*')) { $p = $up } else { $p = $null }
    }
  }
  do {
    $grew = $false
    foreach ($p in $all) { if ($dev.Contains([int]$p.ParentProcessId) -and $dev.Add([int]$p.ProcessId)) { $grew = $true } }
  } while ($grew)
  $held = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($p in $all) {
    $id = [int]$p.ProcessId
    if ($id -eq $PID -or $dev.Contains($id)) { continue }
    $d = [FolderOf]::Cwd($id)
    if ($d -and (($d.TrimEnd('\') -ieq $old) -or ($d -ilike "$old\*"))) { [void]$held.Add($id) }
  }
  # (each program once: a shell's or a session's own children folded into it)
  $roots = @(foreach ($id in $held) { if (-not $held.Contains([int]$byId[$id].ParentProcessId)) { $byId[$id] } })
  # left behind: command-line tools whose parent ended long ago (a Claude window's monitors, tail -F into grep, found 54 of them
  # from 11-23 on 11-27), nobody reading them; stopped with the dev server just before the move. A parent that started after
  # its child is a later process given the same number, not its parent.
  $tools = 'tail.exe', 'grep.exe', 'awk.exe', 'gawk.exe', 'sed.exe', 'cat.exe', 'tee.exe', 'head.exe', 'sleep.exe', 'bash.exe', 'sh.exe', 'xargs.exe', 'find.exe', 'timeout.exe'
  $left = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($p in $roots) {
    $up = $byId[[int]$p.ParentProcessId]
    if (($tools -contains $p.Name) -and ((-not $up) -or ($up.CreationDate -gt $p.CreationDate))) { [void]$left.Add([int]$p.ProcessId) }
  }
  do {
    $grew = $false
    foreach ($id in $held) { if ($left.Contains([int]$byId[$id].ParentProcessId) -and $left.Add($id)) { $grew = $true } }
  } while ($grew)
  $roots = @($roots | Where-Object { -not $left.Contains([int]$_.ProcessId) })
  @{ Dev = $dev; Left = $left; Roots = $roots; ById = $byId }
}
function Tally($s, $ids) { (@(foreach ($id in $ids) { $s.ById[$id].Name -replace '\.exe$', '' }) | Group-Object | Sort-Object Count -Descending | ForEach-Object { "$($_.Name) $($_.Count)" }) -join '、' }
function Who($s) {
  $names = foreach ($p in $s.Roots) {
    $up = $s.ById[[int]$p.ParentProcessId]
    $upName = if ($up) { $up.Name } else { '' }
    $upCmd = if ($up) { "$($up.CommandLine)" } else { '' }
    if ($p.Name -eq 'Code.exe') { 'VS Code' }
    elseif ($p.Name -eq 'claude.exe' -and "$($p.CommandLine)" -like '*stream-json*') { 'Claude App 的對話' }
    elseif ($upName -eq 'claude.exe' -and $upCmd -like '*NodeService*') { 'Claude App 的終端分頁' }
    elseif ($upName -eq 'explorer.exe') { "命令列視窗（$($p.Name)）" }
    else { $p.Name }
  }
  (@($names) | Group-Object | Sort-Object Count -Descending | ForEach-Object { "$($_.Name) $($_.Count)" }) -join '、'
}
function StopDev($ids) {
  foreach ($id in @($ids)) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Say "  停了開發伺服器的程序 $id" } catch { } }
  if (@($ids).Count) { Start-Sleep -Seconds 2 }
}
function StopLeft($s) {
  if (-not $s.Left.Count) { return }
  Say "  停了留下來的命令列工具 $($s.Left.Count) 個（$(Tally $s $s.Left)；它們的上層早就結束了）"
  foreach ($id in @($s.Left)) { try { Stop-Process -Id $id -Force -ErrorAction Stop } catch { } }
  Start-Sleep -Seconds 1
}
function StartDev([string]$dir) {
  # (in the background, its output to logs\dev-server.log: started in a console window of its own, a paused console (text selected in it)
  # stops it writing and the whole server with it: the page stuck at its loading screen, 100%, as the owner saw on 2026-11-15)
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd run dev > logs\dev-server.log 2>&1' -WorkingDirectory $dir -WindowStyle Hidden
}

if ($List) { $s = Scan; Write-Host "開著 $old 的：$(if ($s.Roots.Count) { Who $s } else { '沒有' })（另計，改名前會停掉的：開發伺服器 $($s.Dev.Count) 個程序；留下來的命令列工具 $($s.Left.Count) 個$(if ($s.Left.Count) { "（$(Tally $s $s.Left)）" })）"; exit 0 }
# (one at a time: a second copy, by hand or in the background, leaves it to the first)
$one = New-Object System.Threading.Mutex($false, $(if ($Rehearse) { 'Global\GrilledFishBusinessRenameRehearse' } else { 'Global\GrilledFishBusinessRename' }))
try { $mine = $one.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $mine = $true }
if (-not $mine) { Say '已經有一個改名的程序在背景等候（佔著資料夾的程式都關掉後 20 秒內會自己改名），這個不做'; exit 6 }

# 1. 等到只剩開發伺服器與留下來的命令列工具（或什麼都沒有）開著資料夾，停掉它們，記下其他視窗的 worktree，改名（全有或全無）
Say "開始：$old → $new（$(if ($Wait) { "背景等候，最多 $Hours 小時" } else { '馬上試一次' })$(if ($Rehearse) { '，演練' })）"
$until = (Get-Date).AddHours($Hours)
$said = ''
$gap = 0
$moved = $false
$wts = @()
while (-not $moved) {
  $s = Scan
  if ($s.Roots.Count) {
    $w = Who $s
    if (-not $Wait) { Say "還有程式開著這個資料夾：$w。關掉後再執行一次。什麼都沒改。"; exit 2 }
    if ($w -ne $said) { Say "等候中，還開著：$w"; $said = $w }
    if ((Get-Date) -gt $until) { Say "等了 $Hours 小時，還有程式開著，停止等候。什麼都沒改。"; exit 5 }
    Start-Sleep -Seconds 20
    continue
  }
  Say '佔著資料夾的程式都關了，開始改名'
  $wts = @(git -C $old worktree list --porcelain 2>$null | Where-Object { $_ -like 'worktree *' } | ForEach-Object { $_.Substring(9).Replace('/', [string][char]92) } | Where-Object { $_ -ne $old })
  Say "其他的 worktree：$($wts.Count) 個"
  $devWas = $s.Dev.Count -gt 0
  StopDev $s.Dev
  StopLeft $s
  for ($k = 1; $k -le 5 -and -not $moved; $k++) {
    try { [System.IO.Directory]::Move($old, $new); $moved = $true; Say "資料夾改名完成：$new" }
    catch { Say "第 $k 次改名失敗：$($_.Exception.Message)"; Start-Sleep -Seconds 3 }
  }
  if ($moved) { break }
  if ($devWas -and -not $Rehearse) { StartDev $old; Say '開發伺服器已在原處重開' }
  if (-not $Wait) { Say '還有程式開著資料夾裡的檔案（看不出工作資料夾的：編輯器開著的檔、檔案總管的預覽…），關掉後再執行一次。什麼都沒改。'; exit 2 }
  if ((Get-Date) -gt $until) { Say "等了 $Hours 小時還是改不了，停止等候。什麼都沒改。"; exit 5 }
  $gap = [Math]::Min(900, [Math]::Max($Pause, 2 * $gap))
  Say "還有程式開著資料夾裡的檔案，$gap 秒後再試"
  Start-Sleep -Seconds $gap
  $said = ''
}
if ($Rehearse) { Say '演練：改名做完，其餘不做'; exit 0 }

# 2. worktree 的記錄（主資料夾的 .git\worktrees\*\gitdir 與各 worktree 的 .git 檔互指），與它們借用的 node_modules（連結：只拆連結本身，不碰裡面的東西）
if ($wts.Count) {
  git -C $new worktree repair @($wts | Where-Object { Test-Path $_ }) 2>&1 | ForEach-Object { Say "  worktree：$_" }
  foreach ($w in $wts) {
    $nm = Join-Path $w 'node_modules'
    $it = Get-Item $nm -Force -ErrorAction SilentlyContinue
    if ($it -and ($it.Attributes -band [IO.FileAttributes]::ReparsePoint) -and ("$($it.Target)" -like "$old*")) {
      cmd.exe /c rmdir "$nm" | Out-Null
      $to = Join-Path $new 'node_modules'
      cmd.exe /c mklink /J "$nm" "$to" | Out-Null
      Say "  $nm 改指到 $to"
    }
  }
}

# 3. 文件與設定裡的路徑
Swap "$new\CLAUDE.md" @(, @('Windows 排程工作「JapaneseGrillSimulator nightly push」', "Windows 排程工作「$wfb nightly push」"))
Swap "$new\CLAUDE.md" @(, @('本機（`C:\Users\augus\Projects\JapaneseGrillSimulator`）是主', "本機（``C:\Users\augus\Projects\$wfb``）是主"))
Swap "$new\HANDOFF.md" @(@('C:\Users\augus\Projects\JapaneseGrillSimulator', "C:\Users\augus\Projects\$wfb"), @('..\JapaneseGrillSimulator\', "..\$wfb\"))
Swap "$new\.claude\settings.local.json" @(, @('//c/Users/augus/Projects/JapaneseGrillSimulator/', "//c/Users/augus/Projects/$wfb/"))
Swap "$new\.team\project.json" @(@('"name": "JapaneseGrillSimulator"', "`"name`": `"$wfb`""), @('http://localhost:5174/JapaneseGrillSimulator/', "http://localhost:5174/$wfb/"))
Swap "$new\.team\CHECKLIST.md" @(, @('# JapaneseGrillSimulator 審查清單', "# $wfb 審查清單"))
Swap "$env:USERPROFILE\.claude\team\projects.json" @(, @('{ "name": "JapaneseGrillSimulator", "path": "C:/Users/augus/Projects/JapaneseGrillSimulator"', "{ `"name`": `"$wfb`", `"path`": `"C:/Users/augus/Projects/$wfb`""))
Swap "$env:USERPROFILE\.claude\team\bin\install-task.ps1" @(, @("after JapaneseGrillSimulator's", "after $wfb's"))
# (待辦第 176、695、732 列標完成，工作紀錄記一行)
$how = if ($Wait) { '在背景等到佔著資料夾的程式都關掉，自己改名' } else { '店主關掉佔著資料夾的程式後執行' }
$done = "（**完成**：$(Get-Date -Format 'MM-dd HH:mm') 由 scripts\rename-folder.ps1 完成（$how），本機資料夾改名為 $wfb；半夜推送的排程換新名字與新路徑；備忘複製到新位置；設定、Agent Team 登記、CLAUDE.md、HANDOFF.md 的路徑換新） | 完成 |"
$tp = "$new\TASKS.md"
$t = [System.IO.File]::ReadAllText($tp, $utf8)
$nl = if ($t.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $t -split [regex]::Escape($nl)
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i].StartsWith('| 176 |') -or $lines[$i].StartsWith('| 695 |') -or $lines[$i].StartsWith('| 732 |')) {
    $m = [regex]::Match($lines[$i], '\|\s*進行中[^|]*\|\s*$')
    if ($m.Success) { $lines[$i] = $lines[$i].Substring(0, $m.Index).TrimEnd() + $done }
  }
}
[System.IO.File]::WriteAllText($tp, ($lines -join $nl), $utf8)
$wline = "- 176、695、732 收尾：本機資料夾改名 $wfb（$(Get-Date -Format 'yyyy-MM-dd HH:mm') 由 scripts\rename-folder.ps1 完成，$how：停開發伺服器、改名、路徑換新、排程重建、備忘複製、開發伺服器在新資料夾重開）。"
$wp = "$new\WORKLOG.md"
$wt = [System.IO.File]::ReadAllText($wp, $utf8)
$wnl = if ($wt.Contains("`r`n")) { "`r`n" } else { "`n" }
[System.IO.File]::WriteAllText($wp, $wt.TrimEnd("`r", "`n") + $wnl + $wline + $wnl, $utf8)

# 4. 半夜推送的排程：同樣的動作、時間、設定、身分，換新資料夾與新名字；舊的刪掉
try {
  $task = Get-ScheduledTask -TaskName 'JapaneseGrillSimulator nightly push' -ErrorAction Stop
  $acts = foreach ($a in $task.Actions) { New-ScheduledTaskAction -Execute $a.Execute -Argument $a.Arguments -WorkingDirectory ($a.WorkingDirectory -replace [regex]::Escape($old), $new) }
  Register-ScheduledTask -TaskName "$wfb nightly push" -Action $acts -Trigger $task.Triggers -Settings $task.Settings -Principal $task.Principal -Description $task.Description -Force -ErrorAction Stop | Out-Null
  Unregister-ScheduledTask -TaskName 'JapaneseGrillSimulator nightly push' -Confirm:$false -ErrorAction Stop
  $n = Get-ScheduledTask -TaskName "$wfb nightly push"
  Say "排程：$($n.TaskName)，起始資料夾 $($n.Actions[0].WorkingDirectory)，下次 $((Get-ScheduledTaskInfo -TaskName $n.TaskName).NextRunTime)"
} catch { Say "排程沒換成：$($_.Exception.Message)" }

# 5. 備忘（Claude Code 依資料夾路徑找）：複製一份到新資料夾的位置，裡面寫到的路徑換新
try {
  $mo = "$env:USERPROFILE\.claude\projects\C--Users-augus-Projects-JapaneseGrillSimulator\memory"
  $mn = "$env:USERPROFILE\.claude\projects\C--Users-augus-Projects-$wfb\memory"
  New-Item -ItemType Directory -Force -Path (Split-Path $mn) -ErrorAction Stop | Out-Null
  if (Test-Path $mn) { Copy-Item -Recurse -Force "$mo\*" $mn -ErrorAction Stop } else { Copy-Item -Recurse -Force $mo $mn -ErrorAction Stop }
  foreach ($f in Get-ChildItem $mn -Filter *.md) { Swap $f.FullName @(@($old, $new), @('C:/Users/augus/Projects/JapaneseGrillSimulator', "C:/Users/augus/Projects/$wfb"), @('/c/Users/augus/Projects/JapaneseGrillSimulator', "/c/Users/augus/Projects/$wfb")) }
  Say "備忘複製到 $mn（$((Get-ChildItem $mn).Count) 個檔）"
} catch { Say "備忘沒複製成：$($_.Exception.Message)" }

# 6. 開發伺服器在新資料夾
StartDev $new
$ok = $false
for ($k = 0; $k -lt 20 -and -not $ok; $k++) {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-WebRequest -Uri "http://localhost:5173/$wfb/" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { }
}
Say "開發伺服器（新資料夾）：$(if ($ok) { "http://localhost:5173/$wfb/ 有回應" } else { '還沒回應，稍等再開' })"

# 7. 提交（TASKS、WORKLOG 只放這幾列與這一行：其他視窗還沒提交的列留在工作目錄），測試通過才推上去
Set-Location $new
[Environment]::CurrentDirectory = $new
function Blob([string]$path) {
  $tmp = Join-Path $logDir 'head-blob.tmp'
  cmd.exe /c "git cat-file blob HEAD:$path > $tmp"
  $s = [System.IO.File]::ReadAllText($tmp, $utf8)
  Remove-Item $tmp -Force
  return $s
}
function Put([string]$path, [string]$text) {
  $tmp = Join-Path $logDir 'put-blob.tmp'
  [System.IO.File]::WriteAllText($tmp, $text, $utf8)
  $sha = "$(git hash-object -w --no-filters $tmp)".Trim()
  Remove-Item $tmp -Force
  if ($sha -match '^[0-9a-f]{40}$') { git update-index --cacheinfo "100644,$sha,$path" } else { Say "  $path 沒放進提交：$sha" }
}
git add CLAUDE.md HANDOFF.md 2>&1 | Out-Null
try {
  $tH = Blob 'TASKS.md'
  $tW = [System.IO.File]::ReadAllText($tp, $utf8)
  foreach ($r in '176', '695', '732') {
    $pat = "(?m)^\| $r \|[^\n]*?(?=\r?\n|\z)"
    $mW = [regex]::Match($tW, $pat)
    $mH = [regex]::Match($tH, $pat)
    if ($mW.Success -and $mH.Success) { $tH = $tH.Substring(0, $mH.Index) + $mW.Value + $tH.Substring($mH.Index + $mH.Length) }
  }
  Put 'TASKS.md' $tH
  $wH = Blob 'WORKLOG.md'
  Put 'WORKLOG.md' ($wH.TrimEnd("`r", "`n") + "`n" + $wline + "`n")
} catch { Say "  TASKS、WORKLOG 沒放進提交：$($_.Exception.Message)" }
git commit -q -m "docs: items 176, 695 and 732 done: the local folder renamed GrilledFishBusiness (scripts/rename-folder.ps1, $(if ($Wait) { 'waiting in the background until nothing held the folder open' } else { 'run by the owner once nothing held the folder open' })), the nightly push's task, the other windows' worktrees and the paths moved with it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" 2>&1 | Out-Null
$test = npm test 2>&1 | Select-String -Pattern 'Tests ' | Select-Object -Last 1
Say "測試：$test"
$code = 0
if ("$test" -match 'failed' -or -not "$test") { Say '測試沒過或沒跑：沒推'; $code = 3 }
else {
  git fetch origin -q 2>&1 | Out-Null
  if ((git rev-list --count main..origin/main) -ne '0') { Say 'GitHub 上有本機沒有的提交：沒推'; $code = 4 }
  else { git push origin main 2>&1 | Select-Object -Last 1 | ForEach-Object { Say "推送：$_" } }
}
Say "完成。之後在 Claude 打開 $new 繼續。"
try { Copy-Item $log (Join-Path $new 'logs\rename-folder.log') -Force } catch { }
exit $code
