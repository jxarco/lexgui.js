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
            //     file: 'build/lexgui.module.min.js',
            //     format: 'esm',
            //     sourcemap: false,
            //     plugins: [terser()]
            // },
            // {
            //     file: 'build/lexgui.js',
            //     format: 'umd',
            //     name: "lexgui",
            //     sourcemap: true,
            //     banner: '// This is a generated file. Do not edit.'
            // },
            // {
            //     file: 'build/lexgui.min.js',
            //     format: 'umd',
            //     name: "lexgui",
            //     sourcemap: false,
            //     plugins: [terser()]
            // }
        ],
    plugins: [
        css(),
        typescript({
            tsconfig: './tsconfig.json',
            clean: true
        })
    ]
};
