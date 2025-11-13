import typescript from 'rollup-plugin-typescript2';
// import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import cssnano from 'cssnano';

export default [
    {
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
            postcss({
                extract: 'lexgui.css'
            }),
            typescript({
                tsconfig: './tsconfig.core.json',
                clean: true
            })
        ]
    },
    {
        input: 'src/index.all.ts',
        output: [
            {
                file: 'build/lexgui.all.module.js',
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
            postcss({
                extract: 'lexgui.min.css',
                plugins: [cssnano()]
            }),
            typescript({
                tsconfig: './tsconfig.all.json',
                clean: true
            })
        ]
    }
];
