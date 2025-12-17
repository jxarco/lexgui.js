import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';

export default [
    {
        input: 'src/index.css.ts',
        output: [
            {
                file: 'build/lexgui.module.js',
                format: 'esm',
                sourcemap: true,
                name: "lexgui",
                banner: '// This is a generated file. Do not edit.',
                globals: {
                    "https://cdn.jsdelivr.net/npm/tailwind-merge@3.4.0/+esm": "twMerge",
                }
            }
        ],
        external: ["https://cdn.jsdelivr.net/npm/tailwind-merge@3.4.0/+esm"],
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
    // {
    //     input: ['src/extensions/index.ts'],
    //     output: {
    //         dir: 'build',
    //         format: 'esm',
    //         sourcemap: true,
    //         preserveModules: true, // ensure single file per entry
    //         preserveModulesRoot: 'src',
    //         banner: '// This is a generated file. Do not edit.'
    //     },
    //     plugins: [
    //         typescript({
    //             tsconfig: './tsconfig.ext.json',
    //             clean: true
    //         })
    //     ]
    // }
];