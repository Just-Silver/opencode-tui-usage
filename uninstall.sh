#!/usr/bin/env bash
# opencode-tui-usage 卸载脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
set -euo pipefail
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
DEST="$XDG_BASE/opencode/plugins/tui"
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GREEN='\033[32m'; YELLOW='\033[33m'; RESET='\033[0m'
else
  GREEN=''; YELLOW=''; RESET=''
fi
echo "→ 目标目录: $DEST"
for p in "$DEST/opencode-tui-usage.tsx" "$DEST/opencode-tui-usage"; do
  if [ -e "$p" ]; then rm -rf "$p"; printf "${GREEN}✓ 已删除 $p${RESET}\n"; else printf "${YELLOW}- 未找到 $p${RESET}\n"; fi
done
# 清理异常中断可能残留的 STAGE（安装脚本的临时对象）
for p in "$DEST/.tmp.opencode-tui-usage.tsx" "$DEST/.tmp.opencode-tui-usage"; do
  if [ -e "$p" ]; then rm -rf "$p"; printf "${GREEN}✓ 已删除残留 $p${RESET}\n"; fi
done
echo ""
echo "下一步: opencode2 service restart"
