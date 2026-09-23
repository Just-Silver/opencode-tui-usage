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

test("暴露 ./server 与 ./tui 两个入口（server 入口是配置安装可达的必要条件）", () => {
  assert.deepEqual(Object.keys(pkg.exports), ["./server", "./tui"])
  assert.equal(pkg.main, undefined)
})

test("exports 两个入口都指向真实存在的文件", () => {
  for (const rel of [pkg.exports["./server"], pkg.exports["./tui"]]) {
    assert.ok(typeof rel === "string" && rel.length > 0, "入口必须是字符串")
    assert.ok(existsSync(path.join(root, rel)), `入口文件不存在: ${rel}`)
  }
  assert.ok(pkg.exports["./tui"].endsWith("tui.tsx"), "TUI 入口应为 tui.tsx")
  assert.ok(pkg.exports["./server"].endsWith("server.ts"), "server 入口应为 server.ts")
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
