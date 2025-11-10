import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-import-css';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'build/lexgui.module.js',
            format: 'esm',
            sourcemap: true,
            banner: '// This is a generated file. Do not edit.'
        },
        // {
        //     file: 'build/lexgui.js',
        //     format: 'umd',
        //     sourcemap: true
        // },
        // {
        //     file: 'build/lexgui.module.min.js',
        //     format: 'esm',
        //     plugins: [terser()],
        //     sourcemap: false
        // },
        // {
        //     file: 'build/lexgui.min.js',
        //     format: 'umd',
        //     plugins: [terser()],
        //     sourcemap: false
        // }
    ],
    plugins: [
        css(), // allows importing lexgui.css if needed
        typescript({
        tsconfig: './tsconfig.json',
        clean: true
    })
  ]
};
