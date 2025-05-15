import terser from '@rollup/plugin-terser';

export default [
    {
        input: 'src/index.js',
        output: [
            {
                file: 'build/lexgui.module.js',
                format: 'esm'
            },
            {
                file: 'build/lexgui.module.min.js',
                format: 'esm',
                plugins: [terser()]
            }
        ]
    },
    // {
    //     input: 'src/index.all.js',
    //     output: [
    //         {
    //             file: 'build/lexgui.module.all.js',
    //             format: 'esm'
    //         },
    //         {
    //             file: 'build/lexgui.module.all.min.js',
    //             format: 'esm',
    //             plugins: [terser()]
    //         }
    //     ]
    // },
    {
        input: 'build/lexgui.js',
        output: {
            file: 'build/lexgui.min.js',
            format: 'cjs',
            plugins: [terser()]
        }
    }
];
