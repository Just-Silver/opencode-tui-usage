#Requires -Version 7.0
# opencode-tui-usage 全局安装脚本（PowerShell 7.6.5）
# 用法: irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.ps1 | iex
$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Just-Silver/opencode-tui-usage.git"
$RawBase = "https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main"

function Get-GlobalTuiDir {
  $base = if ($env:XDG_CONFIG_HOME -and $env:XDG_CONFIG_HOME.Trim()) { $env:XDG_CONFIG_HOME } else { Join-Path $HOME ".config" }
  return Join-Path $base "opencode\plugins\tui"
}

function Test-Command($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

$dest = Get-GlobalTuiDir
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("opencode-tui-usage-" + [Guid]::NewGuid().ToString("N"))
$destEntry = Join-Path $dest "opencode-tui-usage.tsx"
$destDir = Join-Path $dest "opencode-tui-usage"

Write-Host "→ 目标目录: $dest"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# 清理旧版本（幂等）
if (Test-Path $destEntry) { Remove-Item -Force $destEntry }
if (Test-Path $destDir) { Remove-Item -Recurse -Force $destDir }

$cloned = $false
if (Test-Command git) {
  try {
    Write-Host "→ git clone --depth 1 $RepoUrl"
    git clone --depth 1 $RepoUrl $tmp 2>&1 | Out-Null
    if (Test-Path (Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx")) { $cloned = $true }
  } catch { Write-Warning "git clone 失败，尝试 curl 回退: $_" }
}

if (-not $cloned) {
  if (-not (Test-Command curl)) { throw "需要 git 或 curl 之一" }
  # 回退：用 git archive tar 需 curl
  $tar = Join-Path $tmp "archive.tar.gz"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Write-Host "→ curl $RepoUrl/archive/main.tar.gz"
  curl -fsSL "$RepoUrl/archive/main.tar.gz" -o $tar
  # PowerShell 7 自带 tar
  tar -xzf $tar -C $tmp --strip-components=1 2>&1 | Out-Null
  if (-not (Test-Path (Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx"))) { throw "解压后未找到插件入口" }
}

$srcEntry = Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx"
$srcDir = Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage"
if (-not (Test-Path $srcEntry)) { throw "未找到 $srcEntry" }

Copy-Item -Force $srcEntry $destEntry
Copy-Item -Recurse -Force $srcDir $destDir

# 校验
if (-not (Test-Path $destEntry)) { throw "安装失败：$destEntry 不存在" }
Write-Host "✓ 已安装到 $destEntry"
Write-Host "  额度模块: $destDir\quota\"

# 清理
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "下一步: opencode2 service restart && opencode"
Write-Host "日志: ~/.local/share/opencode/log/opencode.log (service:tui-usage)"
