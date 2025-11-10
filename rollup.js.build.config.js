import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'build/lexgui.module.js',
                format: 'esm',
                sourcemap: true,
                banner: '// This is a generated file. Do not edit.'
            },
            {
                file: 'build/lexgui.module.min.js',
                format: 'esm',
                sourcemap: false,
                plugins: [terser()]
            },
            {
                file: 'build/lexgui.js',
                format: 'umd',
                name: "lexgui",
                sourcemap: true,
                banner: '// This is a generated file. Do not edit.'
            },
            {
                file: 'build/lexgui.min.js',
                format: 'umd',
                name: "lexgui",
                sourcemap: false,
                plugins: [terser()]
            }
        ]
    }
];
