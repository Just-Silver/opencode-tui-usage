#Requires -Version 7.0
# opencode-tui-usage 卸载脚本（PowerShell 7.6.5）
# 用法: irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.ps1 | iex
$ErrorActionPreference = "Stop"
function Get-GlobalTuiDir {
  $base = if ($env:XDG_CONFIG_HOME -and $env:XDG_CONFIG_HOME.Trim()) { $env:XDG_CONFIG_HOME } else { Join-Path $HOME ".config" }
  return Join-Path $base "opencode\plugins\tui"
}
$dest = Get-GlobalTuiDir
Write-Host "→ 目标目录: $dest"
$entry = Join-Path $dest "opencode-tui-usage.tsx"
$dir = Join-Path $dest "opencode-tui-usage"
if (Test-Path $entry) { Remove-Item -Force $entry; Write-Host "✓ 已删除 $entry" -ForegroundColor Green } else { Write-Host "- 未找到 $entry" -ForegroundColor Yellow }
if (Test-Path $dir) { Remove-Item -Recurse -Force $dir; Write-Host "✓ 已删除 $dir" -ForegroundColor Green } else { Write-Host "- 未找到 $dir" -ForegroundColor Yellow }
Write-Host ""
Write-Host "下一步: opencode2 service restart"
