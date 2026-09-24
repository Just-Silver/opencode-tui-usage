#!/usr/bin/env bash
# opencode-tui-usage 卸载脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
set -euo pipefail
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
PLUGINS_DIR="$XDG_BASE/opencode/plugins"
DEST="$PLUGINS_DIR/opencode-tui-usage"
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GREEN='\033[32m'; YELLOW='\033[33m'; RESET='\033[0m'
else
  GREEN=''; YELLOW=''; RESET=''
fi
echo "→ 目标目录: $DEST"
for p in "$DEST" "$PLUGINS_DIR/.tmp.opencode-tui-usage"; do
  if [ -e "$p" ]; then rm -rf "$p"; printf "${GREEN}✓ 已删除 $p${RESET}\n"; else printf "${YELLOW}- 未找到 $p${RESET}\n"; fi
done
# 清理旧版（≤18707 布局：嵌套 plugins/tui/ 下的 tsx + 目录）迁移残留
for p in "$PLUGINS_DIR/tui/opencode-tui-usage.tsx" "$PLUGINS_DIR/tui/opencode-tui-usage" "$PLUGINS_DIR/tui/.tmp.opencode-tui-usage.tsx" "$PLUGINS_DIR/tui/.tmp.opencode-tui-usage"; do
  if [ -e "$p" ]; then rm -rf "$p"; printf "${GREEN}✓ 已删除旧版残留 $p${RESET}\n"; fi
done
echo ""
echo "下一步: opencode2 service restart"
