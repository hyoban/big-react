import fs from "fs"
import path from "path"
// rollup 原生支持 ESM 格式，所以对于 CJS 格式的包，我们需要先将它用该插件转为 ESM 格式。
// 这里使用该插件是因为他是 rollup 中最常见的插件，加上有备无患。
import cjs from "@rollup/plugin-commonjs"
import replace from "@rollup/plugin-replace"
import ts from "rollup-plugin-typescript2"

const pkgPath = path.resolve(__dirname, "../../packages")
// 产物路径，打包的产物会有多个
const distPath = path.resolve(__dirname, "../../dist/node_modules")

/**
 * @param {string} pkgName 包名
 * @param {boolean} isDist 是否为产物路径
 * @returns 包所处的路径
 */
export function resolvePkgPath(pkgName, isDist) {
  if (isDist) {
    return `${distPath}/${pkgName}`
  } else {
    return `${pkgPath}/${pkgName}`
  }
}

/**
 * @param {string} pkgName 包名
 * @returns 解析包的package.json
 */
export function getPackageJSON(pkgName) {
  const path = `${resolvePkgPath(pkgName)}/package.json`
  const str = fs.readFileSync(path, "utf8")
  return JSON.parse(str)
}

export function getBaseRollupPlugins({
  alias = {
    __DEV__: true,
    preventAssignment: true,
  },
  typescript = {},
} = {}) {
  return [replace(alias), cjs(), ts(typescript)]
}
