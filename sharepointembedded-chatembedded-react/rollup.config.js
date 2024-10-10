import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import packageJson from "./package.json";

export default [
    {
      input: "src/index.ts",
      output: [
        {
          file: packageJson.main,
          format: "cjs",
          sourcemap: true,
        },
        {
          file: packageJson.module,
          format: "esm",
          sourcemap: true,
        },
      ],
      plugins: [
        peerDepsExternal(),
        nodeResolve({
            browser: true,
            preferBuiltins: true,
            dedupe: [ "react", "react-dom" ]
          }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
        // terser(),
      ],
      external: ["react", "react-dom"],
    },
    {
      input: "src/index.ts",
      output: [{ file: "dist/index.d.ts", format: "es" }],
      plugins: [dts.default()],
    },
  ];