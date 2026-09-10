#!/usr/bin/env bash
# opencode-tui-usage 全局安装脚本（bash）
# 用法: curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
set -euo pipefail
REPO_URL="https://github.com/Just-Silver/opencode-tui-usage.git"
# archive 端点不接受 .git 后缀（实测 404），独立变量避免与 clone URL 混用
ARCHIVE_URL="https://github.com/Just-Silver/opencode-tui-usage/archive/main.tar.gz"
XDG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
PLUGINS_DIR="$XDG_BASE/opencode/plugins"
# opencode2 ≥ 0.0.0-beta-18721 的发现器只认 plugins/ 的直接子项，且目录型插件以 tui.tsx 为 TUI 入口：
# 整个插件必须落在单个目录 plugins/opencode-tui-usage/（入口 tui.tsx + 子模块），不能再是嵌套的 plugins/tui/opencode-tui-usage.tsx
DEST="$PLUGINS_DIR/opencode-tui-usage"
TMP="$(mktemp -d)"
# STAGE 必须与 DEST 同文件系统才原子（同目录必同 FS），放 PLUGINS_DIR 内是最简单取法；固定名+复制前先清理，异常残留也不影响下次
STAGE="$PLUGINS_DIR/.tmp.opencode-tui-usage"
trap 'rm -rf "$TMP" "$STAGE"' EXIT

# 颜色：成功绿 失败红 警告黄（非 TTY 自动禁用）
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; RESET='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; RESET=''
fi

echo "→ 目标目录: $DEST"
mkdir -p "$PLUGINS_DIR"

cloned=0
if command -v git >/dev/null 2>&1; then
  echo "→ git clone --depth 1 $REPO_URL"
  if git clone --depth 1 "$REPO_URL" "$TMP" 2>/dev/null && [ -f "$TMP/.opencode/plugins/opencode-tui-usage/tui.tsx" ]; then
    cloned=1
  else
    printf "${YELLOW}warn: git clone 失败，尝试 curl 回退${RESET}\n" >&2
    rm -rf "$TMP"
    mkdir -p "$TMP"
  fi
fi

if [ "$cloned" -eq 0 ]; then
  command -v curl >/dev/null 2>&1 || { printf "${RED}需要 git 或 curl${RESET}\n" >&2; exit 1; }
  echo "→ curl $ARCHIVE_URL"
  mkdir -p "$TMP"
  if ! curl -fsSL "$ARCHIVE_URL" | tar -xz -C "$TMP" --strip-components=1; then
    printf "${RED}下载或解压失败${RESET}\n" >&2
    exit 1
  fi
  [ -f "$TMP/.opencode/plugins/opencode-tui-usage/tui.tsx" ] || { printf "${RED}解压后未找到插件入口${RESET}\n" >&2; exit 1; }
fi

SRC_DIR="$TMP/.opencode/plugins/opencode-tui-usage"
[ -f "$SRC_DIR/tui.tsx" ] || { printf "${RED}未找到 $SRC_DIR/tui.tsx${RESET}\n" >&2; exit 1; }

# 原子替换：整目录 cp 到同文件系统的 STAGE，再 mv 覆盖 DEST（单目录 rename 原子，优于旧版 tsx+目录两对象分步替换）
# STAGE 若残留（上次 kill -9/断电），cp -rf 会嵌套复制而非覆盖，故复制前先清空
rm -rf "$STAGE"
cp -rf "$SRC_DIR" "$STAGE"
[ -f "$STAGE/tui.tsx" ] || { printf "${RED}staging 失败: $STAGE/tui.tsx${RESET}\n" >&2; exit 1; }
rm -rf "$DEST"
mv "$STAGE" "$DEST"

[ -f "$DEST/tui.tsx" ] || { printf "${RED}安装失败${RESET}\n" >&2; exit 1; }
printf "${GREEN}✓ 已安装到 $DEST/tui.tsx${RESET}\n"
printf "${GREEN}  额度模块: $DEST/quota/${RESET}\n"
echo ""
printf "${GREEN}✓ 安装完成${RESET}\n"
