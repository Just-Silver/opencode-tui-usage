#!/usr/bin/env bash
# opencode-tui-usage 卸载脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
set -euo pipefail
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
DEST="$XDG_BASE/opencode/plugins/tui"
echo "→ 目标目录: $DEST"
for p in "$DEST/opencode-tui-usage.tsx" "$DEST/opencode-tui-usage"; do
  if [ -e "$p" ]; then rm -rf "$p"; echo "✓ 已删除 $p"; else echo "- 未找到 $p"; fi
done
echo ""
echo "下一步: opencode2 service restart"
