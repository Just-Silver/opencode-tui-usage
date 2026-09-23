import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { VERSION } from "../.opencode/plugins/opencode-tui-usage/update/version.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))

test("包名与插件 id 一致且为 ESM", () => {
  assert.equal(pkg.name, "opencode-tui-usage")
  assert.equal(pkg.type, "module")
})

test("仅暴露 ./tui 入口（无 server/main）", () => {
  assert.deepEqual(Object.keys(pkg.exports), ["./tui"])
  assert.equal(pkg.main, undefined)
})

test("exports['./tui'] 指向真实存在的 TUI 入口", () => {
  const rel = pkg.exports["./tui"]
  assert.ok(typeof rel === "string" && rel.length > 0, "exports['./tui'] 必须是字符串")
  assert.ok(rel.endsWith("tui.tsx"), `TUI 入口应为 tui.tsx，实际 ${rel}`)
  assert.ok(existsSync(path.join(root, rel)), `exports 指向的文件不存在: ${rel}`)
})

test("files 覆盖 exports 指向的入口（防点目录被剔除）", () => {
  const norm = (s: string) => s.replace(/^\.\//, "").replace(/\/+$/, "")
  const entry = norm(pkg.exports["./tui"])
  const covered = pkg.files.some((f: string) => {
    const dir = norm(f)
    return entry === dir || entry.startsWith(dir + "/")
  })
  assert.ok(covered, `files 未覆盖入口: ${pkg.exports["./tui"]}`)
})

test("package.json.version 与运行时 VERSION 一致", () => {
  assert.equal(pkg.version, VERSION)
})
