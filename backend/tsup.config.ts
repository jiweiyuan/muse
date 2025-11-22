import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  outDir: "dist",
  sourcemap: true,
  splitting: true,
  clean: true,
  external: ["fastify-plugin"]
})
