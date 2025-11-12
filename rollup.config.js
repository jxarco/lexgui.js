import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'src/index.all.ts',
    output: {
        file: 'build/lexgui.module.js',
        format: 'esm',
        sourcemap: true,
        banner: '// This is a generated file. Do not edit.'
    },
    plugins: [
        typescript({
            tsconfig: './tsconfig.all.json',
            clean: true
        })
    ]
};
