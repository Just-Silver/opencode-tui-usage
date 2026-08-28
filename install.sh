#!/usr/bin/env bash
# opencode-tui-usage 全局安装脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
set -euo pipefail
REPO_URL="https://github.com/Just-Silver/opencode-tui-usage.git"
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
DEST="$XDG_BASE/opencode/plugins/tui"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ 目标目录: $DEST"
mkdir -p "$DEST"

cloned=0
if command -v git >/dev/null 2>&1; then
  echo "→ git clone --depth 1 $REPO_URL"
  if git clone --depth 1 "$REPO_URL" "$TMP" 2>/dev/null && [ -f "$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx" ]; then
    cloned=1
  else
    echo "warn: git clone 失败，尝试 curl 回退" >&2
    rm -rf "$TMP"
    mkdir -p "$TMP"
  fi
fi

if [ "$cloned" -eq 0 ]; then
  command -v curl >/dev/null 2>&1 || { echo "需要 git 或 curl"; exit 1; }
  echo "→ curl $REPO_URL/archive/main.tar.gz"
  mkdir -p "$TMP"
  curl -fsSL "$REPO_URL/archive/main.tar.gz" | tar -xz -C "$TMP" --strip-components=1
  [ -f "$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx" ] || { echo "解压后未找到插件入口"; exit 1; }
fi

SRC_ENTRY="$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx"
SRC_DIR="$TMP/.opencode/plugins/tui/opencode-tui-usage"
[ -f "$SRC_ENTRY" ] || { echo "未找到 $SRC_ENTRY"; exit 1; }
[ -d "$SRC_DIR" ] || { echo "未找到 $SRC_DIR"; exit 1; }

# 验证通过后再替换旧版本（原子安装：下载失败不影响现有插件）
rm -rf "$DEST/opencode-tui-usage.tsx" "$DEST/opencode-tui-usage"
cp -f "$SRC_ENTRY" "$DEST/opencode-tui-usage.tsx"
cp -rf "$SRC_DIR" "$DEST/opencode-tui-usage"

[ -f "$DEST/opencode-tui-usage.tsx" ] || { echo "安装失败"; exit 1; }
echo "✓ 已安装到 $DEST/opencode-tui-usage.tsx"
echo "  额度模块: $DEST/opencode-tui-usage/quota/"

echo ""
echo "下一步: opencode2 service restart && opencode"
echo "日志: ~/.local/share/opencode/log/opencode.log (service:tui-usage)"
