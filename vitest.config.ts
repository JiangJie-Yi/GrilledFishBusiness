// The tests' settings: the game's own (vite.config.ts), with @react-three/fiber loaded as its ES module build (its package names no
// `exports`, so Node took its CommonJS build, which does require("three"): three 0.186 warns at every test worker that its CommonJS build
// will be removed, and once it is `npm test` would fail to load; the Tester window's report, item 515). Taken in through Vite's transform
// (inline) so its own imports resolve the same way. Nothing of the game itself, nor its build, changes.
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

const FIBER_ESM = fileURLToPath(new URL('./node_modules/@react-three/fiber/dist/react-three-fiber.esm.js', import.meta.url))

export default defineConfig((env) => mergeConfig(viteConfig(env), {
  test: {
    alias: [{ find: /^@react-three\/fiber$/, replacement: FIBER_ESM }],
    server: { deps: { inline: [/@react-three\//] } },
  },
}))
