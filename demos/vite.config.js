import path from "path"
import replace from "@rollup/plugin-replace"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

console.log(path.resolve(__dirname, "../packages/react-dom"))

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
        replacement: path.resolve(__dirname, "../packages/react"),
      },
      {
        find: "react-dom",
        replacement: path.resolve(__dirname, "../packages/react-dom"),
      },
      {
        find: "react-reconciler",
        replacement: path.resolve(__dirname, "../packages/react-reconciler"),
      },
      {
        find: "react-noop-renderer",
        replacement: path.resolve(__dirname, "../packages/react-noop-renderer"),
      },
      {
        find: "hostConfig",
        replacement: path.resolve(
          __dirname,
          // '../packages/react-noop-renderer/src/hostConfig.ts'
          "../packages/react-dom/src/hostConfig.ts",
        ),
      },
    ],
  },
  // optimizeDeps: {
  //   // force: true
  //   exclude: ["react", "react-dom"],
  // },
})
