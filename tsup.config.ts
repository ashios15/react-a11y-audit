import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    baseline: "src/baseline.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "axe-core"],
});
