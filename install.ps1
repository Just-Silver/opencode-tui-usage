#Requires -Version 7.0
# opencode-tui-usage 全局安装脚本（PowerShell 7.6.5）
# 用法: irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.ps1 | iex
$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Just-Silver/opencode-tui-usage.git"
# archive 端点不接受 .git 后缀（实测 404），独立变量避免与 clone URL 混用
$ArchiveUrl = "https://github.com/Just-Silver/opencode-tui-usage/archive/main.tar.gz"

function Get-GlobalPluginsDir {
  $base = if ($env:XDG_CONFIG_HOME -and $env:XDG_CONFIG_HOME.Trim()) { $env:XDG_CONFIG_HOME } else { Join-Path $HOME ".config" }
  return Join-Path $base "opencode\plugins"
}

function Test-Command($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

# opencode2 ≥ 0.0.0-beta-18721 的发现器只认 plugins/ 的直接子项，且目录型插件以 tui.tsx 为 TUI 入口：
# 整个插件必须落在单个目录 plugins/opencode-tui-usage/（入口 tui.tsx + 子模块），不能再是嵌套的 plugins/tui/opencode-tui-usage.tsx
$pluginsDir = Get-GlobalPluginsDir
$dest = Join-Path $pluginsDir "opencode-tui-usage"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("opencode-tui-usage-" + [Guid]::NewGuid().ToString("N"))
# STAGE 必须与 dest 同文件系统才原子（同目录必同 FS），放 pluginsDir 内是最简单取法；固定名+复制前先清理，异常残留也不影响下次
$stage = Join-Path $pluginsDir ".tmp.opencode-tui-usage"

try {
  Write-Host "→ 目标目录: $dest"
  New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null

  $cloned = $false
  if (Test-Command git) {
    Write-Host "→ git clone --depth 1 $RepoUrl"
    git clone --depth 1 $RepoUrl $tmp 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $tmp ".opencode\plugins\opencode-tui-usage\tui.tsx"))) {
      $cloned = $true
    } else {
      Write-Warning "git clone 失败，尝试 curl 回退"
      if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
      New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    }
  }

  if (-not $cloned) {
    if (-not (Test-Command curl.exe)) { throw "需要 git 或 curl 之一" }
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $tar = Join-Path $tmp "archive.tar.gz"
    Write-Host "→ curl.exe $ArchiveUrl"
    curl.exe -fsSL "$ArchiveUrl" -o $tar 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "curl 下载失败 (exit $LASTEXITCODE)" }
    tar -xzf $tar -C $tmp --strip-components=1 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "tar 解压失败 (exit $LASTEXITCODE)" }
    if (-not (Test-Path (Join-Path $tmp ".opencode\plugins\opencode-tui-usage\tui.tsx"))) { throw "解压后未找到插件入口" }
  }

  $srcDir = Join-Path $tmp ".opencode\plugins\opencode-tui-usage"
  if (-not (Test-Path (Join-Path $srcDir "tui.tsx"))) { throw "未找到 $srcDir\tui.tsx" }

  # 原子替换：整目录 Copy 到同文件系统的 STAGE，再 Move 覆盖 dest（单目录 rename 原子，优于旧版 tsx+目录两对象分步替换）
  # STAGE 若残留（上次 kill -9/断电），Copy-Item -Recurse 会嵌套复制而非覆盖，故复制前先清理
  if (Test-Path $stage) { Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue }
  Copy-Item -Recurse -Force $srcDir $stage
  if (-not (Test-Path (Join-Path $stage "tui.tsx"))) { throw "staging 失败：$stage\tui.tsx" }
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Move-Item $stage $dest

  if (-not (Test-Path (Join-Path $dest "tui.tsx"))) { throw "安装失败：$dest\tui.tsx 不存在" }
  Write-Host "✓ 已安装到 $dest\tui.tsx" -ForegroundColor Green
  Write-Host "  额度模块: $dest\quota\" -ForegroundColor Green
  Write-Host ""
  Write-Host "✓ 安装完成" -ForegroundColor Green
} finally {
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
  if (Test-Path $stage) { Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue }
}
