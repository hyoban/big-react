import path from "path"
import replace from "@rollup/plugin-replace"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { resolvePkgPath } from "../rollup/utils"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    replace({
      __DEV__: true,
      preventAssignment: true,
    }),
  ],
  resolve: {
    alias: [
      {
        find: "react",
        replacement: resolvePkgPath("react"),
      },
      {
        find: "react-dom",
        replacement: resolvePkgPath("react-dom"),
      },
      {
        find: "react-noop-renderer",
        replacement: resolvePkgPath("react-noop-renderer"),
      },
      {
        find: "hostConfig",
        replacement: path.resolve(
          resolvePkgPath("react-dom"),
          "./src/hostConfig.ts",
        ),
      },
    ],
  },
})
