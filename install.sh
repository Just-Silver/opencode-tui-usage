#!/usr/bin/env bash
# opencode-tui-usage 全局安装脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
set -euo pipefail
REPO_URL="https://github.com/Just-Silver/opencode-tui-usage.git"
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
DEST="$XDG_BASE/opencode/plugins/tui"
TMP="$(mktemp -d)"
STAGE_ENTRY="$DEST/.tmp.opencode-tui-usage.tsx"
STAGE_DIR="$DEST/.tmp.opencode-tui-usage"
trap 'rm -rf "$TMP" "$STAGE_ENTRY" "$STAGE_DIR"' EXIT

# 颜色：成功绿 失败红 警告黄（非 TTY 自动禁用）
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; RESET='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; RESET=''
fi

echo "→ 目标目录: $DEST"
mkdir -p "$DEST"

cloned=0
if command -v git >/dev/null 2>&1; then
  echo "→ git clone --depth 1 $REPO_URL"
  if git clone --depth 1 "$REPO_URL" "$TMP" 2>/dev/null && [ -f "$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx" ]; then
    cloned=1
  else
    printf "${YELLOW}warn: git clone 失败，尝试 curl 回退${RESET}\n" >&2
    rm -rf "$TMP"
    mkdir -p "$TMP"
  fi
fi

if [ "$cloned" -eq 0 ]; then
  command -v curl >/dev/null 2>&1 || { printf "${RED}需要 git 或 curl${RESET}\n" >&2; exit 1; }
  echo "→ curl $REPO_URL/archive/main.tar.gz"
  mkdir -p "$TMP"
  curl -fsSL "$REPO_URL/archive/main.tar.gz" | tar -xz -C "$TMP" --strip-components=1
  [ -f "$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx" ] || { printf "${RED}解压后未找到插件入口${RESET}\n" >&2; exit 1; }
fi

SRC_ENTRY="$TMP/.opencode/plugins/tui/opencode-tui-usage.tsx"
SRC_DIR="$TMP/.opencode/plugins/tui/opencode-tui-usage"
[ -f "$SRC_ENTRY" ] || { printf "${RED}未找到 $SRC_ENTRY${RESET}\n" >&2; exit 1; }
[ -d "$SRC_DIR" ] || { printf "${RED}未找到 $SRC_DIR${RESET}\n" >&2; exit 1; }

# 原子替换：先在 DEST 同文件系统内 staging，再 rename（下载/拷贝失败不丢旧版本）
cp -f "$SRC_ENTRY" "$STAGE_ENTRY"
cp -rf "$SRC_DIR" "$STAGE_DIR"
[ -f "$STAGE_ENTRY" ] || { printf "${RED}staging 失败: $STAGE_ENTRY${RESET}\n" >&2; exit 1; }
[ -d "$STAGE_DIR" ] || { printf "${RED}staging 失败: $STAGE_DIR${RESET}\n" >&2; exit 1; }
mv -f "$STAGE_ENTRY" "$DEST/opencode-tui-usage.tsx"
rm -rf "$DEST/opencode-tui-usage"
mv "$STAGE_DIR" "$DEST/opencode-tui-usage"

[ -f "$DEST/opencode-tui-usage.tsx" ] || { printf "${RED}安装失败${RESET}\n" >&2; exit 1; }
printf "${GREEN}✓ 已安装到 $DEST/opencode-tui-usage.tsx${RESET}\n"
printf "${GREEN}  额度模块: $DEST/opencode-tui-usage/quota/${RESET}\n"
echo ""
printf "${GREEN}✓ 安装完成${RESET}\n"
