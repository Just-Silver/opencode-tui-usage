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
# STAGE 必须与 dest 同文件系统才原子（非同目录/同硬盘），放 dest 内是最简单必同 FS 的取法；固定名保证零残留，下次直接覆盖
$stageEntry = Join-Path $dest ".tmp.opencode-tui-usage.tsx"
$stageDir = Join-Path $dest ".tmp.opencode-tui-usage"

try {
  Write-Host "→ 目标目录: $dest"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  $cloned = $false
  if (Test-Command git) {
    Write-Host "→ git clone --depth 1 $RepoUrl"
    git clone --depth 1 $RepoUrl $tmp 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx"))) {
      $cloned = $true
    } else {
      Write-Warning "git clone 失败，尝试 curl 回退"
      if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
      New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    }
  }

  if (-not $cloned) {
    if (-not (Test-Command curl)) { throw "需要 git 或 curl 之一" }
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $tar = Join-Path $tmp "archive.tar.gz"
    Write-Host "→ curl $RepoUrl/archive/main.tar.gz"
    curl -fsSL "$RepoUrl/archive/main.tar.gz" -o $tar 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "curl 下载失败 (exit $LASTEXITCODE)" }
    tar -xzf $tar -C $tmp --strip-components=1 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "tar 解压失败 (exit $LASTEXITCODE)" }
    if (-not (Test-Path (Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx"))) { throw "解压后未找到插件入口" }
  }

  $srcEntry = Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage.tsx"
  $srcDir = Join-Path $tmp ".opencode\plugins\tui\opencode-tui-usage"
  if (-not (Test-Path $srcEntry)) { throw "未找到 $srcEntry" }
  if (-not (Test-Path $srcDir -PathType Container)) { throw "未找到 $srcDir" }

  # 原子替换：先完整 Copy 到同文件系统的 STAGE，再 Move；下载/staging 失败不删旧版，但插件由 tsx+目录两对象分步替换，非单次原子，切换窗口异常仍可能不完整（kill -9/断电 finally 不保证）
  Copy-Item -Force $srcEntry $stageEntry
  Copy-Item -Recurse -Force $srcDir $stageDir
  if (-not (Test-Path $stageEntry)) { throw "staging 失败：$stageEntry" }
  if (-not (Test-Path $stageDir -PathType Container)) { throw "staging 失败：$stageDir" }
  Move-Item -Force $stageEntry $destEntry
  if (Test-Path $destDir) { Remove-Item -Recurse -Force $destDir }
  Move-Item $stageDir $destDir

  if (-not (Test-Path $destEntry)) { throw "安装失败：$destEntry 不存在" }
  Write-Host "✓ 已安装到 $destEntry" -ForegroundColor Green
  Write-Host "  额度模块: $destDir\quota\" -ForegroundColor Green
  Write-Host ""
  Write-Host "✓ 安装完成" -ForegroundColor Green
} finally {
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
  if (Test-Path $stageEntry) { Remove-Item -Force $stageEntry -ErrorAction SilentlyContinue }
  if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir -ErrorAction SilentlyContinue }
}
