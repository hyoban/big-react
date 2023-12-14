import generatePackageJson from "rollup-plugin-generate-package-json"

import { getBaseRollupPlugins, getPackageJSON, resolvePkgPath } from "./utils"

const { name, module } = getPackageJSON("react")
// react包的路径
const pkgPath = resolvePkgPath(name)
// react产物路径
const pkgDistPath = resolvePkgPath(name, true)

export default [
  // React
  {
    input: `${pkgPath}/${module}`,
    output: {
      file: `${pkgDistPath}/index.js`,
      // output 中 name 字段的值应为 react 而不是 index.js
      // 对于 umd 的格式，如果是以 esm 引入，则两者没有区别。
      // 但如果在浏览器引入，前者会挂载 window.react，而后者会挂载 window.index。
      name: "React",
      // umd: 兼容 commonjs、esm
      format: "umd",
    },
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        // 不直接将 package.json 中的全部内容写入
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          main: "index.js",
        }),
      }),
    ],
  },
  // jsx-runtime
  {
    input: `${pkgPath}/src/jsx.ts`,
    output: [
      // jsx-runtime
      {
        file: `${pkgDistPath}/jsx-runtime.js`,
        name: "jsx-runtime",
        format: "umd",
      },
      // jsx-dev-runtime
      {
        file: `${pkgDistPath}/jsx-dev-runtime.js`,
        name: "jsx-dev-runtime",
        format: "umd",
      },
    ],
    plugins: getBaseRollupPlugins(),
  },
]
