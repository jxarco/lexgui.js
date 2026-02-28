// This is a generated file. Do not edit.
import { LX } from '../core/Namespace.js';

// CodeEditor.ts @jxarco
if (!LX) {
    throw ('Missing LX namespace!');
}
LX.extensions.push('CodeEditor');
//  _____ _   _ _ _ _   _         
// |  |  | |_|_| |_| |_|_|___ ___ 
// |  |  |  _| | | |  _| | -_|_ -|
// |_____|_| |_|_|_|_| |_|___|___|
function firstNonspaceIndex(str) {
    const index = str.search(/\S|$/);
    return index < str.length ? index : -1;
}
function isSymbol(str) {
    return /[^\w\s]/.test(str);
}
function isWord(str) {
    return /\w/.test(str);
}
function getLanguageIcon(langDef, extension) {
    if (!langDef?.icon) {
        return 'FileCode text-neutral-500'; // default icon
    }
    if (typeof langDef.icon === 'string') {
        return langDef.icon;
    }
    if (extension && langDef.icon[extension]) {
        return langDef.icon[extension];
    }
    const firstIcon = Object.values(langDef.icon)[0];
    return firstIcon || 'FileCode text-neutral-500';
}
//  _____     _           _             
// |_   _|___| |_ ___ ___|_|___ ___ ___ 
//   | | | . | '_| -_|   | |- _| -_|  _|
//   |_| |___|_,_|___|_|_|_|___|___|_|
class Tokenizer {
    static languages = new Map();
    static extensionMap = new Map(); // ext -> language name
    static registerLanguage(def) {
        Tokenizer.languages.set(def.name, def);
        for (const ext of def.extensions) {
            Tokenizer.extensionMap.set(ext, def.name);
        }
    }
    static getLanguage(name) {
        return Tokenizer.languages.get(name);
    }
    static getLanguageByExtension(ext) {
        const name = Tokenizer.extensionMap.get(ext);
        return name ? Tokenizer.languages.get(name) : undefined;
    }
    static getRegisteredLanguages() {
        return Array.from(Tokenizer.languages.keys());
    }
    static initialState() {
        return { stack: ['root'] };
    }
    /**
     * Tokenize a single line given a language and the state from the previous line.
     * Returns the tokens and the updated state for the next line.
     */
    static tokenizeLine(line, language, state) {
        const tokens = [];
        const stack = [...state.stack]; // clone
        let pos = 0;
        while (pos < line.length) {
            const currentState = stack[stack.length - 1];
            const rules = language.states[currentState];
            if (!rules) {
                // No rules for this state, so emit rest as text
                tokens.push({ type: 'text', value: line.slice(pos) });
                pos = line.length;
                break;
            }
            let matched = false;
            for (const rule of rules) {
                // Anchor regex at current position
                const regex = new RegExp(rule.match.source, 'y' + (rule.match.flags.replace(/[gy]/g, '')));
                regex.lastIndex = pos;
                const m = regex.exec(line);
                if (m) {
                    if (m[0].length === 0) {
                        // Zero-length match, skipping to avoid infinite loop...
                        continue;
                    }
                    tokens.push({ type: rule.type, value: m[0] });
                    pos += m[0].length;
                    // State transitions
                    if (rule.next) {
                        stack.push(rule.next);
                    }
                    else if (rule.pop) {
                        const popCount = typeof rule.pop === 'number' ? rule.pop : 1;
                        for (let i = 0; i < popCount && stack.length > 1; i++) {
                            stack.pop();
                        }
                    }
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // No rule matched, consume one character as text either merged or as a new token
                const lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type === 'text') {
                    lastToken.value += line[pos];
                }
                else {
                    tokens.push({ type: 'text', value: line[pos] });
                }
                pos++;
            }
        }
        const merged = Tokenizer._mergeTokens(tokens);
        return { tokens: merged, state: { stack } };
    }
    /**
     * Merge consecutive tokens with the same type into one.
     */
    static _mergeTokens(tokens) {
        if (tokens.length === 0)
            return tokens;
        const result = [tokens[0]];
        for (let i = 1; i < tokens.length; i++) {
            const prev = result[result.length - 1];
            if (tokens[i].type === prev.type) {
                prev.value += tokens[i].value;
            }
            else {
                result.push(tokens[i]);
            }
        }
        return result;
    }
}
LX.Tokenizer = Tokenizer;
//  __                                   _____     _                 
// |  |   ___ ___ ___ _ _ ___ ___ ___   |  |  |___| |___ ___ ___ ___ 
// |  |__| .'|   | . | | | .'| . | -_|  |     | -_| | . | -_|  _|_ -|
// |_____|__,|_|_|_  |___|__,|_  |___|  |__|__|___|_|  _|___|_| |___|
//               |___|       |___|                  |_|
/**
 * Build a word-boundary regex from a list of words to use as a language rule "match".
 * e.g. words(['const', 'let', 'var']) → /\b(?:const|let|var)\b/
 */
function words(list) {
    return new RegExp('\\b(?:' + list.join('|') + ')\\b');
}
/**
 * Common state rules reusable across C-like languages.
 */
const CommonStates = {
    blockComment: [
        { match: /\*\//, type: 'comment', pop: true },
        { match: /[^*]+/, type: 'comment' },
        { match: /\*/, type: 'comment' },
    ],
    doubleString: [
        { match: /\\./, type: 'string' },
        { match: /"/, type: 'string', pop: true },
        { match: /[^"\\]+/, type: 'string' },
    ],
    singleString: [
        { match: /\\./, type: 'string' },
        { match: /'/, type: 'string', pop: true },
        { match: /[^'\\]+/, type: 'string' },
    ],
};
/** Common number rules for C-like languages. */
const NumberRules = [
    // Binary: 0b1010, 0B1010
    { match: /0[bB][01]+(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?)?\b/, type: 'number' },
    // Hex: 0xFF, 0xDEADBEEF, 0xFFu, 0xFFul, 0xFFull
    { match: /0[xX][0-9a-fA-F]+(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?)?\b/, type: 'number' },
    // Octal: 0o77, 0O77
    { match: /0[oO][0-7]+(?:[uU][lL]{0,2}|[lL]{1,2}[uU]?)?\b/, type: 'number' },
    // Decimal with optional suffix: 123, 123.456, 1.23e10, 0.5f, 16u, 100L, 42ul, 3.14d, 100m
    { match: /\d+\.?\d*(?:[eE][+-]?\d+)?(?:[fFdDmMlLuUiI]|[uU][lL]{0,2}|[lL]{1,2}[uU]?)?\b/, type: 'number' },
    // Decimal starting with dot: .123, .5f
    { match: /\.\d+(?:[eE][+-]?\d+)?(?:[fFdDmM])?\b/, type: 'number' },
];
/** Common tail rules: method detection, identifiers, symbols, whitespace. */
const TailRules = [
    { match: /[a-zA-Z_$]\w*(?=\s*[<(])/, type: 'method' }, // function/method names (followed by < or ()
    { match: /[a-zA-Z_$]\w*/, type: 'text' },
    { match: /[{}()\[\];,.:?!&|<>=+\-*/%^~@#]/, type: 'symbol' },
    { match: /\s+/, type: 'text' },
];
/** Template string states for JS/TS. */
function templateStringStates(exprKeywords) {
    return {
        templateString: [
            { match: /\\./, type: 'string' },
            { match: /`/, type: 'string', pop: true },
            { match: /\$\{/, type: 'symbol', next: 'templateExpr' },
            { match: /[^`\\$]+/, type: 'string' },
            { match: /\$/, type: 'string' },
        ],
        templateExpr: [
            { match: /\}/, type: 'symbol', pop: true },
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /`/, type: 'string', next: 'templateString' },
            ...NumberRules,
            { match: words(exprKeywords), type: 'keyword' },
            ...TailRules,
        ],
    };
}
//  __                                   ____      ___ _     _ _   _             
// |  |   ___ ___ ___ _ _ ___ ___ ___   |    \ ___|  _|_|___|_| |_|_|___ ___ ___ 
// |  |__| .'|   | . | | | .'| . | -_|  |  |  | -_|  _| |   | |  _| | . |   |_ -|
// |_____|__,|_|_|_  |___|__,|_  |___|  |____/|___|_| |_|_|_|_|_| |_|___|_|_|___|
//               |___|       |___|
Tokenizer.registerLanguage({
    name: 'Plain Text',
    extensions: ['txt'],
    states: {
        root: [
            { match: /.+/, type: 'text' }
        ]
    },
    reservedWords: [],
    icon: 'FileText text-neutral-500'
});
// JavaScript
const jsKeywords = [
    'var', 'let', 'const', 'this', 'in', 'of', 'true', 'false', 'null', 'undefined',
    'new', 'function', 'class', 'extends', 'super', 'import', 'export', 'from',
    'default', 'async', 'typeof', 'instanceof', 'void', 'delete', 'debugger', 'NaN',
    'static', 'constructor', 'Infinity', 'abstract'
];
const jsStatements = [
    'for', 'if', 'else', 'switch', 'case', 'return', 'while', 'do', 'continue', 'break',
    'await', 'yield', 'throw', 'try', 'catch', 'finally', 'with'
];
const jsBuiltins = [
    'document', 'console', 'window', 'navigator', 'performance',
    'Math', 'JSON', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect'
];
Tokenizer.registerLanguage({
    name: 'JavaScript',
    extensions: ['js', 'mjs', 'cjs'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /`/, type: 'string', next: 'templateString' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(jsKeywords), type: 'keyword' },
            { match: words(jsBuiltins), type: 'builtin' },
            { match: words(jsStatements), type: 'statement' },
            { match: /(?<=\b(?:class|enum)\s+)[A-Z][a-zA-Z0-9_]*/, type: 'type' }, // class/enum names
            ...TailRules,
        ],
        ...CommonStates,
        ...templateStringStates(['var', 'let', 'const', 'this', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'instanceof', 'void']),
    },
    reservedWords: [...jsKeywords, ...jsStatements, ...jsBuiltins],
    icon: 'Js text-yellow-500'
});
// TypeScript
const tsKeywords = [
    ...jsKeywords,
    'as', 'interface', 'type', 'enum', 'namespace', 'declare', 'private', 'protected',
    'implements', 'readonly', 'keyof', 'infer', 'is', 'asserts', 'override', 'satisfies'
];
const tsTypes = [
    'string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'null',
    'undefined', 'object', 'symbol', 'bigint', 'Promise',
    'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude',
    'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'ConstructorParameters',
    'InstanceType', 'Awaited'
];
Tokenizer.registerLanguage({
    name: 'TypeScript',
    extensions: ['ts', 'tsx'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /`/, type: 'string', next: 'templateString' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(tsKeywords), type: 'keyword' },
            { match: words(tsTypes), type: 'type' },
            { match: words(jsBuiltins), type: 'builtin' },
            { match: words(jsStatements), type: 'statement' },
            { match: /(?<=\b(?:class|enum|interface|type|extends|implements)\s+)[A-Z][a-zA-Z0-9_]*/, type: 'type' }, // class/enum/interface/type names
            { match: /(?<=<\s*)[A-Z][a-zA-Z0-9_]*(?=\s*(?:[,>]|extends|=))/, type: 'type' }, // type parameters in generics <T>
            { match: /(?<=,\s*)[A-Z][a-zA-Z0-9_]*(?=\s*(?:[,>]|extends|=))/, type: 'type' }, // type parameters after comma <T, K>
            { match: /(?<=:\s*)[A-Z][a-zA-Z0-9_]*/, type: 'type' }, // type annotations after colon
            ...TailRules,
        ],
        ...CommonStates,
        ...templateStringStates(['var', 'let', 'const', 'this', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'instanceof', 'void']),
    },
    reservedWords: [...tsKeywords, ...tsTypes, ...jsBuiltins, ...jsStatements],
    icon: 'Ts text-blue-600'
});
// WGSL (WebGPU Shading Language)
const wgslKeywords = [
    'bool', 'i32', 'u32', 'f16', 'f32', 'vec2', 'vec3', 'vec4', 'vec2i', 'vec3i', 'vec4i',
    'vec2u', 'vec3u', 'vec4u', 'vec2f', 'vec3f', 'vec4f', 'mat2x2f', 'mat2x3f', 'mat2x4f', 'mat3x2f', 'mat3x3f',
    'mat3x4f', 'mat4x2f', 'mat4x3f', 'mat4x4f', 'array', 'struct', 'ptr', 'atomic', 'sampler', 'sampler_comparison',
    'texture_1d', 'texture_2d', 'texture_2d_array', 'texture_3d', 'texture_cube', 'texture_cube_array', 'texture_multisampled_2d',
    'texture_depth_2d', 'texture_depth_2d_array', 'texture_depth_cube', 'texture_depth_cube_array',
    'texture_depth_multisampled_2d', 'texture_storage_1d', 'texture_storage_2d', 'texture_storage_2d_array',
    'texture_storage_3d', 'texture_external', 'var', 'let', 'const', 'override', 'fn', 'type', 'alias',
    'true', 'false'
];
const wgslStatements = [
    'if', 'else', 'switch', 'case', 'default', 'for', 'loop', 'while', 'break', 'continue', 'discard',
    'return', 'function', 'private', 'workgroup', 'uniform', 'storage', 'read', 'write', 'read_write', 'bitcast'
];
const wgslBuiltins = [
    'position', 'vertex_index', 'instance_index', 'front_facing', 'frag_depth',
    'local_invocation_id', 'local_invocation_index', 'global_invocation_id', 'workgroup_id', 'num_workgroups',
    'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'atan2', 'ceil', 'clamp', 'cos', 'cosh',
    'cross', 'degrees', 'determinant', 'distance', 'dot', 'exp', 'exp2', 'floor', 'fma', 'fract', 'inverseSqrt',
    'length', 'log', 'log2', 'max', 'min', 'mix', 'normalize', 'pow', 'radians', 'reflect', 'refract', 'round',
    'saturate', 'sign', 'sin', 'sinh', 'smoothstep', 'sqrt', 'step', 'tan', 'tanh', 'transpose', 'trunc',
    'textureSample', 'textureSampleBias', 'textureSampleLevel', 'textureSampleGrad',
    'textureSampleCompare', 'textureSampleCompareLevel', 'textureSampleBaseClampToEdge',
    'textureLoad', 'textureStore', 'textureGather', 'textureGatherCompare',
    'textureDimensions', 'textureNumLayers', 'textureNumLevels', 'textureNumSamples',
    'pack4x8snorm', 'pack4x8unorm', 'pack2x16snorm', 'pack2x16unorm', 'pack2x16float',
    'unpack4x8snorm', 'unpack4x8unorm', 'unpack2x16snorm', 'unpack2x16unorm', 'unpack2x16float',
    'atomicLoad', 'atomicStore', 'atomicAdd', 'atomicSub', 'atomicMax', 'atomicMin',
    'atomicAnd', 'atomicOr', 'atomicXor', 'atomicExchange', 'atomicCompareExchangeWeak',
    'dpdx', 'dpdxCoarse', 'dpdxFine', 'dpdy', 'dpdyCoarse', 'dpdyFine', 'fwidth', 'fwidthCoarse', 'fwidthFine',
    'select', 'arrayLength', 'countLeadingZeros', 'countOneBits', 'countTrailingZeros',
    'extractBits', 'firstLeadingBit', 'firstTrailingBit', 'insertBits', 'reverseBits',
    'storageBarrier', 'workgroupBarrier', 'workgroupUniformLoad'
];
Tokenizer.registerLanguage({
    name: 'WGSL',
    extensions: ['wgsl'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /#\w+/, type: 'preprocessor' },
            ...NumberRules,
            { match: words(wgslKeywords), type: 'keyword' },
            { match: words(wgslBuiltins), type: 'builtin' },
            { match: words(wgslStatements), type: 'statement' },
            { match: /@\w+/, type: 'text' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...wgslKeywords, ...wgslBuiltins, ...wgslStatements],
    icon: 'AlignLeft text-orange-500'
});
// GLSL (OpenGL/WebGL Shading Language)
const glslKeywords = [
    'true', 'false', 'int', 'float', 'double', 'bool', 'void', 'uint', 'struct', 'mat2', 'mat3',
    'mat4', 'mat2x2', 'mat2x3', 'mat2x4', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4x2', 'mat4x3', 'mat4x4',
    'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'dvec2', 'dvec3',
    'dvec4', 'bvec2', 'bvec3', 'bvec4', 'sampler1D', 'sampler2D', 'sampler3D', 'samplerCube',
    'sampler2DShadow', 'samplerCubeShadow', 'sampler2DArray', 'sampler2DArrayShadow',
    'samplerCubeArray', 'samplerCubeArrayShadow', 'isampler2D', 'usampler2D', 'isampler3D',
    'usampler3D', 'lowp', 'mediump', 'highp', 'precision', 'in', 'out', 'inout', 'uniform',
    'varying', 'attribute', 'const', 'layout', 'centroid', 'flat', 'smooth', 'noperspective',
    'patch', 'sample', 'buffer', 'shared', 'coherent', 'volatile', 'restrict', 'readonly', 'writeonly'
];
const glslStatements = [
    'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue',
    'return', 'discard'
];
const glslBuiltins = [
    'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'exp', 'log',
    'exp2', 'log2', 'sqrt', 'inversesqrt', 'abs', 'sign', 'floor', 'ceil', 'fract',
    'mod', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'length', 'distance',
    'dot', 'cross', 'normalize', 'reflect', 'refract', 'matrixCompMult',
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
    'equal', 'notEqual', 'any', 'all', 'not', 'texture', 'textureProj',
    'textureLod', 'textureGrad', 'texelFetch'
];
Tokenizer.registerLanguage({
    name: 'GLSL',
    extensions: ['glsl'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /#\w+/, type: 'preprocessor' },
            ...NumberRules,
            { match: words(glslKeywords), type: 'keyword' },
            { match: words(glslBuiltins), type: 'builtin' },
            { match: words(glslStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...glslKeywords, ...glslBuiltins, ...glslStatements],
    icon: 'AlignLeft text-neutral-500'
});
// HLSL (DirectX Shader Language)
const hlslKeywords = [
    'bool', 'int', 'uint', 'dword', 'half', 'float', 'double', 'min16float', 'min10float', 'min16int', 'min12int', 'min16uint',
    'float1', 'float2', 'float3', 'float4', 'int1', 'int2', 'int3', 'int4', 'uint1', 'uint2', 'uint3', 'uint4',
    'bool1', 'bool2', 'bool3', 'bool4', 'half1', 'half2', 'half3', 'half4',
    'float1x1', 'float1x2', 'float1x3', 'float1x4', 'float2x1', 'float2x2', 'float2x3', 'float2x4',
    'float3x1', 'float3x2', 'float3x3', 'float3x4', 'float4x1', 'float4x2', 'float4x3', 'float4x4',
    'vector', 'matrix', 'string', 'void', 'struct', 'class', 'interface', 'true', 'false',
    'sampler', 'sampler1D', 'sampler2D', 'sampler3D', 'samplerCUBE', 'sampler_state',
    'Texture1D', 'Texture2D', 'Texture3D', 'TextureCube', 'Texture1DArray', 'Texture2DArray', 'TextureCubeArray',
    'Buffer', 'AppendStructuredBuffer', 'ConsumeStructuredBuffer', 'StructuredBuffer', 'RWStructuredBuffer',
    'ByteAddressBuffer', 'RWByteAddressBuffer', 'RWTexture1D', 'RWTexture2D', 'RWTexture3D', 'RWTexture1DArray', 'RWTexture2DArray',
    'cbuffer', 'tbuffer', 'in', 'out', 'inout', 'uniform', 'extern', 'static', 'volatile', 'precise', 'shared', 'groupshared',
    'linear', 'centroid', 'nointerpolation', 'noperspective', 'sample', 'const', 'row_major', 'column_major'
];
const hlslStatements = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'discard', 'return',
    'typedef', 'register', 'packoffset'
];
const hlslBuiltins = [
    'SV_Position', 'SV_Target', 'SV_Depth', 'SV_VertexID', 'SV_InstanceID', 'SV_PrimitiveID', 'SV_DispatchThreadID',
    'SV_GroupID', 'SV_GroupThreadID', 'SV_GroupIndex', 'SV_Coverage', 'SV_IsFrontFace', 'SV_RenderTargetArrayIndex',
    'POSITION', 'NORMAL', 'TEXCOORD', 'COLOR', 'TANGENT', 'BINORMAL'
];
Tokenizer.registerLanguage({
    name: 'HLSL',
    extensions: ['hlsl', 'fx', 'fxh', 'vsh', 'psh'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /#\w+/, type: 'preprocessor' },
            ...NumberRules,
            { match: words(hlslKeywords), type: 'keyword' },
            { match: words(hlslBuiltins), type: 'builtin' },
            { match: words(hlslStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...hlslKeywords, ...hlslBuiltins, ...hlslStatements],
    icon: 'AlignLeft text-purple-500'
});
// Python
const pyKeywords = [
    'False', 'def', 'None', 'True', 'in', 'is', 'and', 'lambda', 'nonlocal', 'not', 'or'
];
const pyStatements = [
    'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'match', 'case',
    'break', 'continue', 'return', 'raise', 'pass', 'import', 'from', 'as', 'global', 'nonlocal',
    'assert', 'del', 'yield'
];
const pyBuiltins = [
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod',
    'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter',
    'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
    'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max',
    'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property',
    'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
    'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
];
const pyTypes = [
    'int', 'float', 'complex', 'bool', 'str', 'bytes', 'bytearray', 'list', 'tuple', 'set', 'frozenset',
    'dict', 'object', 'type', 'ArithmeticError', 'AssertionError', 'AttributeError', 'BaseException',
    'BufferError', 'EOFError', 'Exception', 'FloatingPointError', 'GeneratorExit', 'ImportError',
    'ModuleNotFoundError', 'IndentationError', 'IndexError', 'KeyError', 'KeyboardInterrupt',
    'LookupError', 'MemoryError', 'NameError', 'NotImplementedError', 'OSError', 'OverflowError',
    'RecursionError', 'ReferenceError', 'RuntimeError', 'StopAsyncIteration', 'StopIteration',
    'SyntaxError', 'TabError', 'SystemError', 'SystemExit', 'TypeError', 'UnboundLocalError',
    'UnicodeError', 'UnicodeEncodeError', 'UnicodeDecodeError', 'UnicodeTranslateError',
    'ValueError', 'ZeroDivisionError'
];
Tokenizer.registerLanguage({
    name: 'Python',
    extensions: ['py'],
    lineComment: '#',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /#.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(pyKeywords), type: 'keyword' },
            { match: words(pyTypes), type: 'type' },
            { match: words(pyBuiltins), type: 'builtin' },
            { match: words(pyStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...pyKeywords, ...pyTypes, ...pyBuiltins, ...pyStatements],
    icon: 'Python text-cyan-600'
});
// PHP
const phpKeywords = [
    'abstract', 'and', 'array', 'as', 'callable', 'class', 'clone', 'const',
    'enum', 'extends', 'final', 'fn', 'function', 'global',
    'implements', 'include', 'include_once', 'instanceof',
    'insteadof', 'interface', 'namespace', 'new', 'null', 'or',
    'private', 'protected', 'public', 'readonly', 'require',
    'require_once', 'static', 'trait', 'use', 'var', 'xor',
    'from', '$this'
];
const phpStatements = [
    'if', 'else', 'elseif', 'endif', 'switch', 'case', 'default', 'endswitch',
    'for', 'endfor', 'foreach', 'endforeach', 'while', 'endwhile', 'do',
    'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw',
    'declare', 'enddeclare', 'goto', 'yield', 'match'
];
const phpTypes = [
    'int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'iterable',
    'void', 'never', 'mixed', 'static', 'self', 'parent',
    'Exception', 'Error', 'Throwable', 'DateTime', 'DateTimeImmutable',
    'Closure', 'Generator', 'JsonSerializable'
];
const phpBuiltins = [
    'echo', 'print', 'isset', 'empty', 'unset', 'eval', 'die', 'exit',
    'count', 'sizeof', 'in_array', 'array_merge', 'array_push', 'array_pop',
    'strlen', 'strpos', 'substr', 'str_replace', 'explode', 'implode',
    'json_encode', 'json_decode', 'var_dump', 'print_r'
];
Tokenizer.registerLanguage({
    name: 'PHP',
    extensions: ['php'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(phpKeywords), type: 'keyword' },
            { match: words(phpTypes), type: 'type' },
            { match: words(phpBuiltins), type: 'builtin' },
            { match: words(phpStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...phpKeywords, ...phpTypes, ...phpBuiltins, ...phpStatements],
    icon: 'Php text-purple-700'
});
// C
const cKeywords = [
    'int', 'float', 'double', 'bool', 'long', 'short', 'char', 'void', 'const', 'enum', 'extern', 'register', 'sizeof', 'static',
    'struct', 'typedef', 'union', 'volatile', 'true', 'false'
];
const cStatements = [
    'break', 'continue', 'do', 'else', 'for', 'goto', 'if', 'return', 'switch', 'while'
];
Tokenizer.registerLanguage({
    name: 'C',
    extensions: ['c', 'h'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /#\w+/, type: 'preprocessor' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(cKeywords), type: 'keyword' },
            { match: words(cStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...cKeywords, ...cStatements],
    icon: { 'c': 'C text-sky-400', 'h': 'C text-fuchsia-500' }
});
// C++
const cppKeywords = [
    ...cKeywords, 'wchar_t', 'static_cast', 'dynamic_cast', 'new', 'delete', 'auto', 'class', 'nullptr', 'NULL', 'signed',
    'unsigned', 'namespace', 'static', 'private', 'public'
];
const cppStatements = [
    ...cStatements, 'case', 'using', 'glm', 'spdlog', 'default'
];
const cppTypes = [
    'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'size_t', 'ptrdiff_t'
];
const cppBuiltins = [
    'std', 'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set', 'array', 'tuple', 'optional', 'variant',
    'cout', 'cin', 'cerr', 'clog'
];
Tokenizer.registerLanguage({
    name: 'C++',
    extensions: ['cpp', 'hpp'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /#\w+/, type: 'preprocessor' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words(cppKeywords), type: 'keyword' },
            { match: words(cppTypes), type: 'type' },
            { match: words(cppBuiltins), type: 'builtin' },
            { match: words(cppStatements), type: 'statement' },
            ...TailRules,
        ],
        ...CommonStates
    },
    reservedWords: [...cppKeywords, ...cppTypes, ...cppBuiltins, ...cppStatements],
    icon: { 'cpp': 'CPlusPlus text-sky-400', 'hpp': 'CPlusPlus text-fuchsia-500' }
});
// JSON
Tokenizer.registerLanguage({
    name: 'JSON',
    extensions: ['json', 'jsonc', 'bml'],
    states: {
        root: [
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /\btrue\b|\bfalse\b|\bnull\b/, type: 'keyword' },
            { match: /-?\d+\.?\d*(?:[eE][+-]?\d+)?/, type: 'number' },
            { match: /[{}[\]:,]/, type: 'symbol' },
            { match: /\s+/, type: 'text' },
        ],
        ...CommonStates
    },
    reservedWords: [],
    icon: 'Json text-yellow-600'
});
// XML
Tokenizer.registerLanguage({
    name: 'XML',
    extensions: ['xml', 'xaml', 'xsd', 'xsl'],
    lineComment: '<!--',
    states: {
        root: [
            { match: /<!--/, type: 'comment', next: 'xmlComment' },
            { match: /<\?/, type: 'preprocessor', next: 'processingInstruction' },
            { match: /<\/[a-zA-Z][\w:-]*>/, type: 'keyword' },
            { match: /<[a-zA-Z][\w:-]*/, type: 'keyword', next: 'tag' },
            { match: /[^<]+/, type: 'text' },
        ],
        tag: [
            { match: /\/?>/, type: 'keyword', pop: true },
            { match: /[a-zA-Z][\w:-]*(?==)/, type: 'type' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /[^"'>/]+/, type: 'text' },
        ],
        xmlComment: [
            { match: /-->/, type: 'comment', pop: true },
            { match: /[^-]+/, type: 'comment' },
            { match: /-/, type: 'comment' },
        ],
        processingInstruction: [
            { match: /\?>/, type: 'preprocessor', pop: true },
            { match: /[^?]+/, type: 'preprocessor' },
            { match: /\?/, type: 'preprocessor' },
        ],
        ...CommonStates
    },
    reservedWords: [],
    icon: 'Rss text-orange-600'
});
// HTML
const htmlTags = [
    'html', 'head', 'body', 'title', 'meta', 'link', 'script', 'style',
    'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
    'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'nav', 'section', 'article',
    'aside', 'main', 'figure', 'figcaption', 'video', 'audio', 'source', 'canvas', 'svg'
];
Tokenizer.registerLanguage({
    name: 'HTML',
    extensions: ['html'],
    lineComment: '<!--',
    states: {
        root: [
            { match: /<!--/, type: 'comment', next: 'xmlComment' },
            { match: /<!DOCTYPE/i, type: 'preprocessor' },
            { match: /<\/[a-zA-Z][\w-]*>/, type: 'keyword' },
            { match: /<script\b/i, type: 'keyword', next: 'scriptTag' },
            { match: /<style\b/i, type: 'keyword', next: 'styleTag' },
            { match: /<[a-zA-Z][\w-]*/, type: 'keyword', next: 'tag' },
            { match: /[^<]+/, type: 'text' },
        ],
        tag: [
            { match: /\/?>/, type: 'keyword', pop: true },
            { match: /[a-zA-Z][\w-]*(?==)/, type: 'type' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /[^"'>/]+/, type: 'text' },
        ],
        scriptTag: [
            { match: /\/>/, type: 'keyword', pop: true },
            { match: />/, type: 'keyword', next: 'scriptContent' },
            { match: /[a-zA-Z][\w-]*(?==)/, type: 'type' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /[^"'>/]+/, type: 'text' },
        ],
        scriptContent: [
            { match: /<\/script>/i, type: 'keyword', pop: 2 },
            { match: /[^<]+/, type: 'text' },
            { match: /</, type: 'text' },
        ],
        styleTag: [
            { match: /\/>/, type: 'keyword', pop: true },
            { match: />/, type: 'keyword', next: 'styleContent' },
            { match: /[a-zA-Z][\w-]*(?==)/, type: 'type' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /[^"'>/]+/, type: 'text' },
        ],
        styleContent: [
            { match: /<\/style>/i, type: 'keyword', pop: 2 },
            { match: /[^<]+/, type: 'text' },
            { match: /</, type: 'text' },
        ],
        xmlComment: [
            { match: /-->/, type: 'comment', pop: true },
            { match: /[^-]+/, type: 'comment' },
            { match: /-/, type: 'comment' },
        ],
        ...CommonStates
    },
    reservedWords: [...htmlTags],
    icon: 'Code text-orange-500'
});
// CSS
const cssProperties = [
    'color', 'background', 'border', 'margin', 'padding', 'font', 'display', 'position',
    'width', 'height', 'top', 'left', 'right', 'bottom', 'flex', 'grid', 'z-index',
    'opacity', 'transform', 'transition', 'animation', 'content', 'visibility'
];
const cssPropertyValues = [
    'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'auto', 'none', 'hidden', 'visible', 'collapse',
    'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'list-item',
    'static', 'relative', 'absolute', 'fixed', 'sticky', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge',
    'inset', 'outset', 'bold', 'bolder', 'lighter', 'normal', 'italic', 'oblique', 'uppercase', 'lowercase', 'capitalize',
    'left', 'right', 'center', 'top', 'bottom', 'start', 'end', 'stretch', 'space-between', 'space-around', 'space-evenly',
    'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'cover', 'contain', 'pointer', 'default', 'move', 'text', 'not-allowed',
    'transparent', 'currentColor'
];
const cssPseudos = [
    'hover', 'active', 'focus', 'visited', 'link', 'before', 'after', 'first-child',
    'last-child', 'nth-child', 'not', 'root', 'disabled', 'checked'
];
Tokenizer.registerLanguage({
    name: 'CSS',
    extensions: ['css', 'scss', 'sass', 'less'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' }, // SCSS/Less
            { match: /@[\w-]+/, type: 'statement' }, // @media, @import, @keyframes, etc.
            { match: /#[\w-]+/, type: 'keyword' }, // ID selectors
            { match: /\.[\w-]+/, type: 'keyword' }, // class selectors
            { match: /::?[\w-]+(?:\([^)]*\))?/, type: 'keyword' }, // pseudo-classes/elements
            { match: /\[[\w-]+(?:[~|^$*]?=(?:"[^"]*"|'[^']*'|[\w-]+))?\]/, type: 'type' }, // attribute selectors
            { match: /{/, type: 'symbol', next: 'properties' },
            { match: /}/, type: 'symbol' },
            { match: /[,>+~*]/, type: 'symbol' }, // combinators
            { match: /[\w-]+/, type: 'keyword' }, // element selectors
            { match: /\s+/, type: 'text' },
        ],
        properties: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' }, // SCSS/Less
            { match: /}/, type: 'symbol', pop: true },
            { match: /[\w-]+(?=\s*:)/, type: 'type' }, // property names
            { match: /:/, type: 'symbol' },
            { match: words(cssPropertyValues), type: 'string' },
            { match: /;/, type: 'symbol' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            { match: /#[a-fA-F0-9]{3,8}\b/, type: 'string' }, // hex colors
            { match: /-?\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|pt|cm|mm|in|pc|ex|ch|fr|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?/, type: 'number' },
            { match: /!important\b/, type: 'builtin' },
            { match: /[\w-]+\(/, type: 'method' }, // functions: rgb(), calc(), var(), url()
            { match: /--[\w-]+/, type: 'type' }, // vars --
            { match: /[(),]/, type: 'symbol' },
            { match: /{/, type: 'symbol', next: 'properties' }, // nested rules (SCSS/Less)
            { match: /[\w-]+/, type: 'text' },
            { match: /\s+/, type: 'text' },
        ],
        ...CommonStates
    },
    reservedWords: [...cssProperties, ...cssPropertyValues, ...cssPseudos],
    icon: 'Hash text-blue-500'
});
// Markdown
Tokenizer.registerLanguage({
    name: 'Markdown',
    extensions: ['md', 'markdown'],
    states: {
        root: [
            { match: /^#{1,6}\s+.+/, type: 'keyword' },
            { match: /^\*\*\*.+$/, type: 'symbol' },
            { match: /\*\*[^*]+\*\*/, type: 'keyword' },
            { match: /\*[^*]+\*/, type: 'type' },
            { match: /__[^_]+__/, type: 'keyword' },
            { match: /_[^_]+_/, type: 'type' },
            { match: /`[^`]+`/, type: 'string' },
            { match: /```/, type: 'comment', next: 'codeBlock' },
            { match: /^\s*[-*+]\s+/, type: 'symbol' },
            { match: /^\s*\d+\.\s+/, type: 'symbol' },
            { match: /\[([^\]]+)\]\(([^)]+)\)/, type: 'builtin' },
            { match: /^>\s+/, type: 'comment' },
            { match: /.+/, type: 'text' },
        ],
        codeBlock: [
            { match: /```/, type: 'comment', pop: true },
            { match: /.+/, type: 'string' },
        ]
    },
    reservedWords: [],
    icon: 'Markdown text-red-500'
});
// Batch
const batchKeywords = [
    'if', 'else', 'for', 'in', 'do', 'goto', 'call', 'exit', 'setlocal', 'endlocal',
    'set', 'echo', 'rem', 'pause', 'cd', 'pushd', 'popd', 'shift', 'start'
];
const batchBuiltins = [
    'dir', 'copy', 'move', 'del', 'ren', 'md', 'rd', 'type', 'find', 'findstr',
    'tasklist', 'taskkill', 'ping', 'ipconfig', 'netstat', 'cls', 'title', 'color'
];
Tokenizer.registerLanguage({
    name: 'Batch',
    extensions: ['bat', 'cmd'],
    lineComment: 'rem',
    states: {
        root: [
            { match: /^rem\s+.*/i, type: 'comment' },
            { match: /^::.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /%[\w]+%/, type: 'type' },
            { match: /\b\d+\b/, type: 'number' },
            { match: words([...batchKeywords, ...batchKeywords.map(w => w.toUpperCase())]), type: 'keyword' },
            { match: words(batchBuiltins), type: 'builtin' },
            { match: /@echo/, type: 'statement' },
            { match: /[a-zA-Z_]\w*/, type: 'text' },
            { match: /[<>|&()@]/, type: 'symbol' },
            { match: /\s+/, type: 'text' },
        ],
        ...CommonStates
    },
    reservedWords: [...batchKeywords, ...batchBuiltins],
    icon: 'Terminal text-gray-300'
});
// CMake
const cmakeCommands = [
    'project', 'cmake_minimum_required', 'add_executable', 'add_library', 'target_link_libraries',
    'target_include_directories', 'set', 'option', 'if', 'else', 'elseif', 'endif', 'foreach',
    'endforeach', 'while', 'endwhile', 'function', 'endfunction', 'macro', 'endmacro',
    'find_package', 'include', 'message', 'install', 'add_subdirectory', 'configure_file'
];
Tokenizer.registerLanguage({
    name: 'CMake',
    extensions: ['cmake', 'txt', 'cmake-cache'],
    lineComment: '#',
    states: {
        root: [
            { match: /#.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /\$\{[^}]+\}/, type: 'type' },
            { match: /\b\d+\.?\d*\b/, type: 'number' },
            { match: words([...cmakeCommands, ...cmakeCommands.map(w => w.toUpperCase())]), type: 'keyword' },
            { match: /\b[A-Z_][A-Z0-9_]*\b/, type: 'builtin' },
            { match: /[a-zA-Z_]\w*/, type: 'text' },
            { match: /[(){}]/, type: 'symbol' },
            { match: /\s+/, type: 'text' },
        ],
        ...CommonStates
    },
    reservedWords: [...cmakeCommands],
    icon: 'AlignLeft text-neutral-500'
});
// Rust
const rustKeywords = [
    'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn',
    'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref',
    'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe',
    'use', 'where', 'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do',
    'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield'
];
const rustTypes = [
    'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
    'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result', 'Box'
];
const rustBuiltins = [
    'println', 'print', 'eprintln', 'eprint', 'format', 'panic', 'assert', 'assert_eq',
    'assert_ne', 'debug_assert', 'vec', 'Some', 'None', 'Ok', 'Err'
];
Tokenizer.registerLanguage({
    name: 'Rust',
    extensions: ['rs'],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'(?:\\.|[^'])+'/, type: 'string' },
            { match: /r#*"/, type: 'string', next: 'rawString' },
            ...NumberRules,
            { match: /#\[[\w:]+\]/, type: 'preprocessor' },
            { match: words(rustKeywords), type: 'keyword' },
            { match: words(rustTypes), type: 'type' },
            { match: words(rustBuiltins), type: 'builtin' },
            { match: /![a-zA-Z_]\w*/, type: 'preprocessor' },
            ...TailRules,
        ],
        rawString: [
            { match: /"#*/, type: 'string', pop: true },
            { match: /[^"]+/, type: 'string' },
            { match: /"/, type: 'string' },
        ],
        ...CommonStates
    },
    reservedWords: [...rustKeywords, ...rustTypes, ...rustBuiltins],
    icon: 'Rust text-orange-400'
});
//  ____                            _
// |    \ ___ ___ _ _ _____ ___ ___| |_
// |  |  | . |  _| | |     | -_|   |  _|
// |____/|___|___|___|_|_|_|___|_|_|_|
class CodeDocument {
    onChange = undefined;
    _lines = [''];
    get lineCount() {
        return this._lines.length;
    }
    constructor(onChange) {
        this.onChange = onChange;
    }
    getLine(n) {
        return this._lines[n] ?? '';
    }
    getText(separator = '\n') {
        return this._lines.join(separator);
    }
    setText(text, silent = false) {
        this._lines = text.split(/\r?\n/);
        if (this._lines.length === 0) {
            this._lines = [''];
        }
        if (!silent && this.onChange)
            this.onChange(this);
    }
    getCharAt(line, col) {
        const l = this._lines[line];
        if (!l || col < 0 || col >= l.length)
            return undefined;
        return l[col];
    }
    /**
     * Get the word at a given position. Returns [word, startCol, endCol].
     */
    getWordAt(line, col) {
        const l = this._lines[line];
        if (!l || col < 0 || col > l.length)
            return ['', col, col];
        // Expand left
        let start = col;
        while (start > 0 && isWord(l[start - 1])) {
            start--;
        }
        // Expand right
        let end = col;
        while (end < l.length && isWord(l[end])) {
            end++;
        }
        return [l.substring(start, end), start, end];
    }
    /**
     * Get the indentation level (number of leading spaces) of a line.
     */
    getIndent(line) {
        const idx = firstNonspaceIndex(this._lines[line] ?? '');
        return idx === -1 ? (this._lines[line]?.length ?? 0) : idx;
    }
    /**
     * Find the next occurrence of 'text' starting after (line, col). Returns null if no match.
     */
    findNext(text, startLine, startCol) {
        if (!text)
            return null;
        // Search from startLine:startCol forward
        for (let i = startLine; i < this._lines.length; i++) {
            const searchFrom = i === startLine ? startCol : 0;
            const idx = this._lines[i].indexOf(text, searchFrom);
            if (idx !== -1)
                return { line: i, col: idx };
        }
        // Wrap around from beginning
        for (let i = 0; i <= startLine; i++) {
            const searchUntil = i === startLine ? startCol : this._lines[i].length;
            const idx = this._lines[i].indexOf(text);
            if (idx !== -1 && idx < searchUntil)
                return { line: i, col: idx };
        }
        return null;
    }
    // Mutations (return EditOperations for undo):
    /**
     * Insert text at a position (handles newlines in the inserted text).
     */
    insert(line, col, text) {
        const parts = text.split(/\r?\n/);
        const currentLine = this._lines[line] ?? '';
        const before = currentLine.substring(0, col);
        const after = currentLine.substring(col);
        if (parts.length === 1) {
            this._lines[line] = before + parts[0] + after;
        }
        else {
            this._lines[line] = before + parts[0];
            for (let i = 1; i < parts.length - 1; i++) {
                this._lines.splice(line + i, 0, parts[i]);
            }
            this._lines.splice(line + parts.length - 1, 0, parts[parts.length - 1] + after);
        }
        if (this.onChange)
            this.onChange(this);
        return { type: 'insert', line, col, text };
    }
    /**
     * Delete `length` characters forward from a position (handles crossing line boundaries).
     */
    delete(line, col, length) {
        let remaining = length;
        let deletedText = '';
        let currentLine = line;
        let currentCol = col;
        while (remaining > 0 && currentLine < this._lines.length) {
            const l = this._lines[currentLine];
            const available = l.length - currentCol;
            if (remaining <= available) {
                deletedText += l.substring(currentCol, currentCol + remaining);
                this._lines[currentLine] = l.substring(0, currentCol) + l.substring(currentCol + remaining);
                remaining = 0;
            }
            else {
                // Delete rest of this line + the newline
                deletedText += l.substring(currentCol) + '\n';
                remaining -= (available + 1); // +1 for the newline
                // Merge next line into current
                const nextContent = this._lines[currentLine + 1] ?? '';
                this._lines[currentLine] = l.substring(0, currentCol) + nextContent;
                this._lines.splice(currentLine + 1, 1);
            }
        }
        if (this.onChange)
            this.onChange(this);
        return { type: 'delete', line, col, text: deletedText };
    }
    /**
     * Insert a new line after 'afterLine'. If afterLine is -1, inserts at the beginning.
     */
    insertLine(afterLine, text = '') {
        const insertAt = afterLine + 1;
        this._lines.splice(insertAt, 0, text);
        if (this.onChange)
            this.onChange(this);
        return { type: 'insert', line: Math.max(afterLine, 0), col: afterLine >= 0 ? this._lines[afterLine]?.length ?? 0 : 0, text: '\n' + text };
    }
    /**
     * Remove an entire line and its trailing newline.
     */
    removeLine(line) {
        const text = this._lines[line];
        this._lines.splice(line, 1);
        if (this._lines.length === 0) {
            this._lines = [''];
        }
        if (this.onChange)
            this.onChange(this);
        return { type: 'delete', line: Math.max(line - 1, 0), col: line > 0 ? (this._lines[line - 1]?.length ?? 0) : 0, text: '\n' + text };
    }
    replaceLine(line, newText) {
        const oldText = this._lines[line];
        this._lines[line] = newText;
        if (this.onChange)
            this.onChange(this);
        return { type: 'replaceLine', line, col: 0, text: newText, oldText };
    }
    /**
     * Apply an edit operation (used by undo/redo).
     */
    applyInverse(op) {
        if (op.type === 'insert') {
            return this.delete(op.line, op.col, op.text.length);
        }
        else if (op.type === 'replaceLine') {
            return this.replaceLine(op.line, op.oldText);
        }
        else {
            return this.insert(op.line, op.col, op.text);
        }
    }
}
class UndoManager {
    _undoStack = [];
    _redoStack = [];
    _pendingOps = [];
    _pendingCursorsBefore = [];
    _pendingCursorsAfter = [];
    _lastPushTime = 0;
    _groupThresholdMs;
    _maxSteps;
    _savedDepth = 0;
    constructor(groupThresholdMs = 2000, maxSteps = 200) {
        this._groupThresholdMs = groupThresholdMs;
        this._maxSteps = maxSteps;
    }
    /**
     * Record an edit operation. Consecutive operations within the time threshold
     * are grouped into a single undo step.
     */
    record(op, cursors) {
        const now = Date.now();
        const elapsed = now - this._lastPushTime;
        if (elapsed > this._groupThresholdMs && this._pendingOps.length > 0) {
            this._flush();
        }
        if (this._pendingOps.length === 0) {
            this._pendingCursorsBefore = cursors.map(c => ({ ...c }));
        }
        this._pendingOps.push(op);
        this._pendingCursorsAfter = cursors.map(c => ({ ...c }));
        this._lastPushTime = now;
        // New edits clear the redo stack
        this._redoStack.length = 0;
    }
    /**
     * Force-flush pending operations into a final undo step.
     */
    flush(cursorsAfter) {
        if (cursorsAfter && this._pendingOps.length > 0) {
            this._pendingCursorsAfter = cursorsAfter.map(c => ({ ...c }));
        }
        this._flush();
    }
    /**
     * Undo the last step. Stores the operations to apply inversely, and returns the cursor state to restore.
     */
    undo(doc, currentCursors) {
        this.flush(currentCursors);
        const entry = this._undoStack.pop();
        if (!entry)
            return null;
        // Apply in reverse order
        const redoOps = [];
        for (let i = entry.operations.length - 1; i >= 0; i--) {
            const inverseOp = doc.applyInverse(entry.operations[i]);
            redoOps.unshift(inverseOp);
        }
        this._redoStack.push({ operations: redoOps, cursorsBefore: entry.cursorsBefore, cursorsAfter: entry.cursorsAfter });
        return { cursors: entry.cursorsBefore };
    }
    /**
     * Redo the last undone step. Returns the cursor state to restore.
     */
    redo(doc) {
        const entry = this._redoStack.pop();
        if (!entry)
            return null;
        // Apply in forward order (redo entries are already in correct order)
        const undoOps = [];
        for (let i = 0; i < entry.operations.length; i++) {
            const inverseOp = doc.applyInverse(entry.operations[i]);
            undoOps.push(inverseOp);
        }
        this._undoStack.push({ operations: undoOps, cursorsBefore: entry.cursorsBefore, cursorsAfter: entry.cursorsAfter });
        return { cursors: entry.cursorsAfter };
    }
    canUndo() {
        return this._undoStack.length > 0 || this._pendingOps.length > 0;
    }
    canRedo() {
        return this._redoStack.length > 0;
    }
    markSaved() {
        this._flush();
        this._savedDepth = this._undoStack.length;
    }
    isModified() {
        return this._undoStack.length !== this._savedDepth || this._pendingOps.length > 0;
    }
    clear() {
        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._pendingOps.length = 0;
        this._lastPushTime = 0;
        this._savedDepth = 0;
    }
    _flush() {
        if (this._pendingOps.length === 0)
            return;
        this._undoStack.push({
            operations: [...this._pendingOps],
            cursorsBefore: [...this._pendingCursorsBefore],
            cursorsAfter: [...this._pendingCursorsAfter]
        });
        this._pendingOps.length = 0;
        this._pendingCursorsBefore = [];
        this._pendingCursorsAfter = [];
        // Limit stack size
        while (this._undoStack.length > this._maxSteps) {
            this._undoStack.shift();
        }
    }
}
function posEqual(a, b) {
    return a.line === b.line && a.col === b.col;
}
function posBefore(a, b) {
    return a.line < b.line || (a.line === b.line && a.col < b.col);
}
function selectionStart(sel) {
    return posBefore(sel.anchor, sel.head) ? sel.anchor : sel.head;
}
function selectionEnd(sel) {
    return posBefore(sel.anchor, sel.head) ? sel.head : sel.anchor;
}
function selectionIsEmpty(sel) {
    return posEqual(sel.anchor, sel.head);
}
class CursorSet {
    cursors = [];
    constructor() {
        // Start with one cursor at 0,0
        this.cursors = [{ anchor: { line: 0, col: 0 }, head: { line: 0, col: 0 } }];
    }
    getPrimary() {
        return this.cursors[0];
    }
    /**
     * Set a single cursor position. Clears all secondary cursors and selections.
     */
    set(line, col) {
        this.cursors = [{ anchor: { line, col }, head: { line, col } }];
    }
    // Movement:
    moveLeft(doc, selecting = false) {
        for (const sel of this.cursors) {
            this._moveHead(sel, doc, -1, 0, selecting);
        }
        this._merge();
    }
    moveRight(doc, selecting = false) {
        for (const sel of this.cursors) {
            this._moveHead(sel, doc, 1, 0, selecting);
        }
        this._merge();
    }
    moveUp(doc, selecting = false) {
        for (const sel of this.cursors) {
            this._moveVertical(sel, doc, -1, selecting);
        }
        this._merge();
    }
    moveDown(doc, selecting = false) {
        for (const sel of this.cursors) {
            this._moveVertical(sel, doc, 1, selecting);
        }
        this._merge();
    }
    moveToLineStart(doc, selecting = false, noIndent = false) {
        for (const sel of this.cursors) {
            const line = sel.head.line;
            const indent = doc.getIndent(line);
            // Toggle between indent and column 0
            const targetCol = (sel.head.col === indent || noIndent) ? 0 : indent;
            sel.head = { line, col: targetCol };
            if (!selecting)
                sel.anchor = { ...sel.head };
        }
        this._merge();
    }
    moveToLineEnd(doc, selecting = false) {
        for (const sel of this.cursors) {
            const line = sel.head.line;
            sel.head = { line, col: doc.getLine(line).length };
            if (!selecting)
                sel.anchor = { ...sel.head };
        }
        this._merge();
    }
    moveWordLeft(doc, selecting = false) {
        for (const sel of this.cursors) {
            const { line, col } = sel.head;
            if (col === 0 && line > 0) {
                // Jump to end of previous line
                sel.head = { line: line - 1, col: doc.getLine(line - 1).length };
            }
            else {
                const l = doc.getLine(line);
                let c = col;
                // Skip whitespace
                while (c > 0 && /\s/.test(l[c - 1]))
                    c--;
                // Skip word or symbols
                if (c > 0 && isWord(l[c - 1])) {
                    while (c > 0 && isWord(l[c - 1]))
                        c--;
                }
                else if (c > 0) {
                    while (c > 0 && isSymbol(l[c - 1]))
                        c--;
                }
                sel.head = { line, col: c };
            }
            if (!selecting)
                sel.anchor = { ...sel.head };
        }
        this._merge();
    }
    moveWordRight(doc, selecting = false) {
        for (const sel of this.cursors) {
            const { line, col } = sel.head;
            const l = doc.getLine(line);
            if (col >= l.length && line < doc.lineCount - 1) {
                // Jump to start of next line
                sel.head = { line: line + 1, col: 0 };
            }
            else {
                let c = col;
                // Skip leading whitespace first
                while (c < l.length && /\s/.test(l[c]))
                    c++;
                // Then skip word or symbols to end of group
                if (c < l.length && isWord(l[c])) {
                    while (c < l.length && isWord(l[c]))
                        c++;
                }
                else if (c < l.length && isSymbol(l[c])) {
                    while (c < l.length && isSymbol(l[c]))
                        c++;
                }
                sel.head = { line, col: c };
            }
            if (!selecting)
                sel.anchor = { ...sel.head };
        }
        this._merge();
    }
    selectAll(doc) {
        const lastLine = doc.lineCount - 1;
        this.cursors = [{
                anchor: { line: 0, col: 0 },
                head: { line: lastLine, col: doc.getLine(lastLine).length }
            }];
    }
    // Multi-cursor:
    addCursor(line, col) {
        this.cursors.push({ anchor: { line, col }, head: { line, col } });
        this._merge();
    }
    removeSecondaryCursors() {
        this.cursors = [this.cursors[0]];
    }
    /**
     * Returns cursor indices sorted by head position, bottom-to-top (last in doc first)
     * to ensure earlier cursors' positions stay valid.
     */
    sortedIndicesBottomUp() {
        return this.cursors
            .map((_, i) => i)
            .sort((a, b) => {
            const ah = this.cursors[a].head;
            const bh = this.cursors[b].head;
            return bh.line !== ah.line ? bh.line - ah.line : bh.col - ah.col;
        });
    }
    /**
     * After editing at (line, col), shift all other cursors on the same line
     * that are at or after `afterCol` by `colDelta`. Also handles line shifts
     * for multi-line inserts/deletes via `lineDelta`.
     */
    adjustOthers(skipIdx, line, afterCol, colDelta, lineDelta = 0) {
        for (let i = 0; i < this.cursors.length; i++) {
            if (i === skipIdx)
                continue;
            const c = this.cursors[i];
            // Adjust head
            if (lineDelta !== 0 && c.head.line > line) {
                c.head = { line: c.head.line + lineDelta, col: c.head.col };
            }
            else if (c.head.line === line && c.head.col >= afterCol) {
                c.head = { line: c.head.line + lineDelta, col: c.head.col + colDelta };
            }
            // Adjust anchor
            if (lineDelta !== 0 && c.anchor.line > line) {
                c.anchor = { line: c.anchor.line + lineDelta, col: c.anchor.col };
            }
            else if (c.anchor.line === line && c.anchor.col >= afterCol) {
                c.anchor = { line: c.anchor.line + lineDelta, col: c.anchor.col + colDelta };
            }
        }
    }
    // Queries:
    hasSelection(index = 0) {
        const sel = this.cursors[index];
        return sel ? !posEqual(sel.anchor, sel.head) : false;
    }
    getSelectedText(doc, index = 0) {
        const sel = this.cursors[index];
        if (!sel || selectionIsEmpty(sel))
            return '';
        const start = selectionStart(sel);
        const end = selectionEnd(sel);
        if (start.line === end.line) {
            return doc.getLine(start.line).substring(start.col, end.col);
        }
        const lines = [];
        lines.push(doc.getLine(start.line).substring(start.col));
        for (let i = start.line + 1; i < end.line; i++) {
            lines.push(doc.getLine(i));
        }
        lines.push(doc.getLine(end.line).substring(0, end.col));
        return lines.join('\n');
    }
    getCursorPositions() {
        return this.cursors.map(s => ({ ...s.head }));
    }
    _moveHead(sel, doc, dx, _dy, selecting) {
        const { line, col } = sel.head;
        // If there's a selection and we're not extending it, collapse to the edge
        if (!selecting && !selectionIsEmpty(sel)) {
            const target = dx < 0 ? selectionStart(sel) : selectionEnd(sel);
            sel.head = { ...target };
            sel.anchor = { ...target };
            return;
        }
        if (dx < 0) {
            if (col > 0) {
                sel.head = { line, col: col - 1 };
            }
            else if (line > 0) {
                sel.head = { line: line - 1, col: doc.getLine(line - 1).length };
            }
        }
        else if (dx > 0) {
            const lineLen = doc.getLine(line).length;
            if (col < lineLen) {
                sel.head = { line, col: col + 1 };
            }
            else if (line < doc.lineCount - 1) {
                sel.head = { line: line + 1, col: 0 };
            }
        }
        if (!selecting)
            sel.anchor = { ...sel.head };
    }
    _moveVertical(sel, doc, direction, selecting) {
        const { line, col } = sel.head;
        const newLine = line + direction;
        if (newLine < 0 || newLine >= doc.lineCount)
            return;
        const newLineLen = doc.getLine(newLine).length;
        sel.head = { line: newLine, col: Math.min(col, newLineLen) };
        if (!selecting)
            sel.anchor = { ...sel.head };
    }
    /**
     * Merge overlapping cursors/selections. Keeps the first one when duplicates exist.
     */
    _merge() {
        if (this.cursors.length <= 1)
            return;
        // Sort by head position
        this.cursors.sort((a, b) => {
            if (a.head.line !== b.head.line)
                return a.head.line - b.head.line;
            return a.head.col - b.head.col;
        });
        const merged = [this.cursors[0]];
        for (let i = 1; i < this.cursors.length; i++) {
            const prev = merged[merged.length - 1];
            const curr = this.cursors[i];
            if (posEqual(prev.head, curr.head)) {
                // Same position — skip duplicate
                continue;
            }
            merged.push(curr);
        }
        this.cursors = merged;
    }
}
/**
 * Strips string literals and single-line comments from a line of code,
 * leaving only the structural characters (braces, operators, keywords etc).
 */
function stripLiteralsAndComments(line) {
    let result = '';
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        // Remove single-line comment
        if (ch === '/' && line[i + 1] === '/') {
            break;
        }
        // Block comment (same line): skip to closing */
        if (ch === '/' && line[i + 1] === '*') {
            i += 2;
            while (i < line.length && !(line[i] === '*' && line[i + 1] === '/'))
                i++;
            i += 2;
            continue;
        }
        // Remove strings (single, double, template)
        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            i++;
            while (i < line.length) {
                if (line[i] === '\\') {
                    i += 2;
                    continue;
                } // escaped char
                if (line[i] === quote) {
                    i++;
                    break;
                } // closing quote
                i++;
            }
            continue;
        }
        result += ch;
        i++;
    }
    return result;
}
/**
 * Manages code symbols for autocomplete, navigation, and outlining.
 * Incrementally updates as lines change.
 */
class SymbolTable {
    _symbols = new Map(); // name -> symbols[]
    _lineSymbols = []; // [lineNum] -> symbols declared on that line
    _scopeStack = [{ name: 'global', type: 'global', line: 0 }];
    _lineScopes = []; // [lineNum] -> scope stack at start of that line
    _lineScopesEnd = []; // [lineNum] -> scope stack at end of that line
    get currentScope() {
        return this._scopeStack[this._scopeStack.length - 1]?.name ?? 'global';
    }
    get currentScopeType() {
        return this._scopeStack[this._scopeStack.length - 1]?.type ?? 'global';
    }
    getScopeAtLine(line) {
        return this._lineScopes[line] ?? [{ name: 'global', type: 'global', line: 0 }];
    }
    getLineScopeEnd(line) {
        return this._lineScopesEnd[line] ?? [{ name: 'global', type: 'global', line: 0 }];
    }
    getSymbols(name) {
        return this._symbols.get(name) ?? [];
    }
    getAllSymbolNames() {
        return Array.from(this._symbols.keys());
    }
    getAllSymbols() {
        const all = [];
        for (const symbols of this._symbols.values()) {
            all.push(...symbols);
        }
        return all;
    }
    getLineSymbols(line) {
        return this._lineSymbols[line] ?? [];
    }
    /** Update scope stack for a line (call before parsing symbols) */
    updateScopeForLine(line, lineText) {
        if (line === 0) {
            this._scopeStack = [{ name: 'global', type: 'global', line: 0 }];
        }
        else if (this._lineScopesEnd[line - 1]) {
            this._scopeStack = [...this._lineScopesEnd[line - 1]];
        }
        const stripped = stripLiteralsAndComments(lineText);
        const openBraces = (stripped.match(/\{/g) || []).length;
        const closeBraces = (stripped.match(/\}/g) || []).length;
        this._lineScopes[line] = [...this._scopeStack];
        // Pop scopes for closing braces
        for (let i = 0; i < closeBraces; i++) {
            if (this._scopeStack.length > 1)
                this._scopeStack.pop();
        }
        // Push scopes for opening braces (symbol detection will name them later)
        for (let i = 0; i < openBraces; i++) {
            this._scopeStack.push({ name: 'anonymous', type: 'anonymous', line });
        }
        this._lineScopesEnd[line] = [...this._scopeStack];
    }
    /** Name the most recent anonymous scope (called when detecting class/function) */
    nameCurrentScope(name, type) {
        if (this._scopeStack.length > 0) {
            const current = this._scopeStack[this._scopeStack.length - 1];
            if (current.name === 'anonymous' || current.type === 'anonymous') {
                current.name = name;
                current.type = type;
            }
        }
    }
    /** Remove symbols from a line (before reparsing) */
    removeLineSymbols(line) {
        const oldSymbols = this._lineSymbols[line];
        if (!oldSymbols)
            return;
        for (const symbol of oldSymbols) {
            const list = this._symbols.get(symbol.name);
            if (!list)
                continue;
            // Remove this specific symbol from the name's list
            const index = list.findIndex(s => s.line === line && s.kind === symbol.kind && s.scope === symbol.scope);
            if (index !== -1)
                list.splice(index, 1);
            if (list.length === 0)
                this._symbols.delete(symbol.name);
        }
        this._lineSymbols[line] = [];
    }
    addSymbol(symbol) {
        if (!this._symbols.has(symbol.name)) {
            this._symbols.set(symbol.name, []);
        }
        this._symbols.get(symbol.name).push(symbol);
        if (!this._lineSymbols[symbol.line]) {
            this._lineSymbols[symbol.line] = [];
        }
        this._lineSymbols[symbol.line].push(symbol);
    }
    /** Reset scope stack (e.g. when document structure changes significantly) */
    resetScopes() {
        this._scopeStack = [{ name: 'global', type: 'global', line: 0 }];
        this._lineScopes = [];
        this._lineScopesEnd = [];
    }
    clear() {
        this._symbols.clear();
        this._lineSymbols = [];
        this.resetScopes();
    }
}
/**
 * Parse symbols from a line of code using token types and text patterns to detect declarations.
 */
function parseSymbolsFromLine(lineText, tokens, line, symbolTable) {
    const symbols = [];
    // Use the scope snapshot from the START of this line, not currentScope/currentScopeType 
    // which will reflect state AFTER updateScopeForLine already pushed/popped braces on this line...
    const lineScopes = symbolTable.getScopeAtLine(line);
    const lineScope = lineScopes[lineScopes.length - 1];
    const scope = lineScope?.name ?? 'global';
    const scopeType = lineScope?.type ?? 'global';
    const reservedWords = new Set();
    for (const token of tokens) {
        if (['keyword', 'statement', 'builtin', 'preprocessor'].includes(token.type)) {
            reservedWords.add(token.value);
        }
    }
    // Track added symbols by name and approximate position using 5 chars tolerance to avoid duplicates
    const addedSymbols = new Set();
    const addSymbol = (name, kind, col = 0) => {
        if (!name || !name.match(/^[a-zA-Z_$][\w$]*$/))
            return; // Valid identifier check
        if (reservedWords.has(name))
            return;
        const posKey = `${name}@${Math.floor(col / 5) * 5}`;
        if (addedSymbols.has(posKey))
            return; // Already added
        symbols.push({ name, kind, scope, line, col });
        addedSymbols.add(posKey);
    };
    // Top-level declaration patterns (only one per line, checked with anchors)
    const topLevelPatterns = [
        { regex: /^\s*class\s+([A-Z_]\w*)/i, kind: 'class' },
        { regex: /^\s*struct\s+([A-Z_]\w*)/i, kind: 'struct' },
        { regex: /^\s*interface\s+([A-Z_]\w*)/i, kind: 'interface' },
        { regex: /^\s*enum\s+([A-Z_]\w*)/i, kind: 'enum' },
        { regex: /^\s*type\s+([A-Z_]\w*)\s*=/i, kind: 'type' },
        { regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/i, kind: 'function' },
        { regex: /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/i, kind: 'function' },
        { regex: /^\s*(?:static\s+|const\s+|virtual\s+|inline\s+|extern\s+|pub\s+|async\s+)*(?!\b(?:await|return|if|else|while|for|switch|case|throw|new|delete|typeof|yield)\b)(\w+[\w\s\*&:<>,]*?)\s+(\w+)\s*\([^)]*\)\s*[{;]/i, kind: 'typed-function' },
        { regex: /^\s*(?:(?:public|private|protected|static|readonly|async|override)\s+)*(\w+)\s*\([^)]*\)\s*[:{]/i, kind: scopeType === 'class' ? 'method' : 'function' }
    ];
    const multiPatterns = [
        { regex: /(?:const|let|var)\s+(\w+)/gi, kind: 'variable' },
        { regex: /(\w+)\s*:\s*(?:function|[A-Z]\w*)/gi, kind: 'variable' },
        { regex: /this\.(\w+)\s*=/gi, kind: 'property' },
        { regex: /\b(?:private|protected|public)\s+(?:(?:static|readonly)\s+)*(\w+)\s*[=:;]/gi, kind: 'property' },
        { regex: /new\s+([A-Z]\w+)/gi, kind: 'constructor-call' },
        { regex: /(\w+)\s*\(/gi, kind: 'method-call' }
    ];
    let foundTopLevel = false;
    for (const pattern of topLevelPatterns) {
        const match = lineText.match(pattern.regex);
        if (match) {
            let name;
            let kind = pattern.kind;
            if (pattern.kind === 'typed-function' && match[2]) {
                name = match[2];
                kind = scopeType === 'class' ? 'method' : 'function';
            }
            else if (match[1]) {
                name = match[1];
            }
            else {
                continue;
            }
            const col = lineText.indexOf(name);
            addSymbol(name, kind, col);
            if (['class', 'function', 'method', 'enum', 'struct', 'interface'].includes(kind)) {
                symbolTable.nameCurrentScope(name, kind);
            }
            foundTopLevel = true;
            break;
        }
    }
    // If no top-level declaration, check for multiple occurrences
    if (!foundTopLevel) {
        for (const pattern of multiPatterns) {
            const matches = lineText.matchAll(pattern.regex);
            for (const match of matches) {
                if (match[1]) {
                    const name = match[1];
                    const col = match.index ?? 0;
                    addSymbol(name, pattern.kind, col);
                }
            }
        }
    }
    if (scopeType === 'enum') {
        const enumValueMatch = lineText.match(/^\s*(\w+)\s*[,=]?/);
        if (enumValueMatch && enumValueMatch[1] && !lineText.includes('enum')) {
            addSymbol(enumValueMatch[1], 'enum-value', lineText.indexOf(enumValueMatch[1]));
        }
    }
    return symbols;
}
//  _____       _     _____   _ _ _              ____  _____ _____ 
// |     |___ _| |___|   __|_| |_| |_ ___ ___   |    \|     |     |
// |   --| . | . | -_|   __| . | |  _| . |  _|  |  |  |  |  | | | |
// |_____|___|___|___|_____|___|_|_| |___|_|    |____/|_____|_|_|_|
const g = globalThis;
const TOKEN_CLASS_MAP = {
    'keyword': 'cm-kwd',
    'statement': 'cm-std',
    'type': 'cm-typ',
    'builtin': 'cm-bln',
    'string': 'cm-str',
    'comment': 'cm-com',
    'number': 'cm-dec',
    'method': 'cm-mtd',
    'symbol': 'cm-sym',
    'enum': 'cm-enu',
    'preprocessor': 'cm-ppc',
    'variable': 'cm-var',
};
LX.Area;
LX.Panel;
LX.Tabs;
LX.NodeTree;
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const URL_REGEX = /(https?:\/\/[^\s"'<>)\]]+)/g;
/**
 * Returns true if the string token at `idx` in the token list is a module import path.
 */
function isImportPath(tokens, idx) {
    const isWs = (t) => /^\s+$/.test(t.value);
    const isImportWord = (t) => t.value === 'require' || t.value === 'import';
    for (let i = idx - 1; i >= 0; i--) {
        const t = tokens[i];
        if (isWs(t))
            continue;
        if (t.type === 'keyword' && t.value === 'from')
            return true;
        if (isImportWord(t))
            return true;
        if (t.type === 'symbol' && t.value === '(') {
            for (let j = i - 1; j >= 0; j--) {
                const t2 = tokens[j];
                if (isWs(t2))
                    continue;
                if (isImportWord(t2))
                    return true;
                break;
            }
        }
        break;
    }
    return false;
}
/**
 * Scans a raw token value for hex color literals and returns HTML with each
 * color wrapped in a swatch span. Non-color text is HTML-escaped.
 */
function injectColorSpans(raw, lineIndex, colOffset) {
    HEX_COLOR_RE.lastIndex = 0;
    let result = '';
    let lastIndex = 0;
    let match;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    while ((match = HEX_COLOR_RE.exec(raw)) !== null) {
        result += esc(raw.slice(lastIndex, match.index));
        const color = match[0];
        const col = colOffset + match.index;
        result += `<span class="code-color" data-color="${color}" data-line="${lineIndex}" data-col="${col}" style="--code-color:${color}"><span class="code-color-swatch"></span>${esc(color)}</span>`;
        lastIndex = match.index + color.length;
    }
    result += esc(raw.slice(lastIndex));
    return result;
}
//  _____             _ _ _____
// |   __|___ ___ ___| | | __  |___ ___
// |__   |  _|  _| . | | | __ -| .'|  _|
// |_____|___|_| |___|_|_|_____|__,|_|
class ScrollBar {
    static SIZE = 10;
    root;
    thumb;
    _vertical;
    _thumbPos = 0; // current thumb offset in px
    _thumbRatio = 0; // thumb size as fraction of track (0..1)
    _lastMouse = 0;
    _onDrag = null;
    get visible() { return !this.root.classList.contains('hidden'); }
    get isVertical() { return this._vertical; }
    constructor(vertical, onDrag) {
        this._vertical = vertical;
        this._onDrag = onDrag;
        this.root = LX.makeElement('div', `lexcodescrollbar hidden ${vertical ? 'vertical' : 'horizontal'}`);
        this.thumb = LX.makeElement('div');
        this.thumb.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.root.appendChild(this.thumb);
        this.root.addEventListener('mousedown', (e) => {
            if (e.target === this.thumb)
                return;
            const clickPos = this._vertical ? e.offsetY : e.offsetX;
            const thumbSize = this._vertical ? this.thumb.offsetHeight : this.thumb.offsetWidth;
            const delta = (clickPos - thumbSize / 2) - this._thumbPos;
            this._onDrag?.(delta);
            this._onMouseDown(e); // continue as drag from new position
        });
    }
    setThumbRatio(ratio) {
        this._thumbRatio = LX.clamp(ratio, 0, 1);
        const needed = this._thumbRatio < 1;
        this.root.classList.toggle('hidden', !needed);
        if (needed) {
            if (this._vertical)
                this.thumb.style.height = (this._thumbRatio * 100) + '%';
            else
                this.thumb.style.width = (this._thumbRatio * 100) + '%';
        }
    }
    syncToScroll(scrollPos, scrollMax) {
        if (scrollMax <= 0)
            return;
        const trackSize = this._vertical ? this.root.offsetHeight : this.root.offsetWidth;
        const thumbSize = this._vertical ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        const available = trackSize - thumbSize;
        if (available <= 0)
            return;
        this._thumbPos = (scrollPos / scrollMax) * available;
        this._applyPosition();
    }
    applyDragDelta(delta, scrollMax) {
        const trackSize = this._vertical ? this.root.offsetHeight : this.root.offsetWidth;
        const thumbSize = this._vertical ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        const available = trackSize - thumbSize;
        if (available <= 0)
            return 0;
        this._thumbPos = LX.clamp(this._thumbPos + delta, 0, available);
        this._applyPosition();
        return (this._thumbPos / available) * scrollMax;
    }
    _applyPosition() {
        if (this._vertical)
            this.thumb.style.top = this._thumbPos + 'px';
        else
            this.thumb.style.left = this._thumbPos + 'px';
    }
    _onMouseDown(e) {
        const doc = document;
        this._lastMouse = this._vertical ? e.clientY : e.clientX;
        const onMouseMove = (e) => {
            const current = this._vertical ? e.clientY : e.clientX;
            const delta = current - this._lastMouse;
            this._lastMouse = current;
            this._onDrag?.(delta);
            e.stopPropagation();
            e.preventDefault();
        };
        const onMouseUp = () => {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
        };
        doc.addEventListener('mousemove', onMouseMove);
        doc.addEventListener('mouseup', onMouseUp);
        e.stopPropagation();
        e.preventDefault();
    }
}
/**
 * @class CodeEditor
 * The main editor class. Wires Document, Tokenizer, CursorSet, UndoManager
 * together with the DOM.
 */
class CodeEditor {
    static __instances = [];
    language;
    symbolTable;
    // DOM:
    area;
    baseArea;
    codeArea;
    explorerArea;
    tabs;
    root;
    codeScroller;
    codeSizer;
    cursorsLayer;
    selectionsLayer;
    lineGutter;
    vScrollbar;
    hScrollbar;
    searchBox = null;
    searchLineBox = null;
    autocomplete = null;
    currentTab = null;
    statusPanel;
    leftStatusPanel;
    rightStatusPanel;
    explorer = null;
    // Measurements:
    charWidth = 0;
    lineHeight = 0;
    fontSize = 0;
    xPadding = 64; // 4rem left padding in pixels
    _cachedTabsHeight = 0;
    _cachedStatusPanelHeight = 0;
    // Editor options:
    skipInfo = false;
    disableEdition = false;
    skipTabs = false;
    useFileExplorer = false;
    useAutoComplete = true;
    allowAddScripts = true;
    allowClosingTabs = true;
    allowLoadingFiles = true;
    tabSize = 4;
    highlight = 'Plain Text';
    newTabOptions = null;
    customSuggestions = [];
    explorerName = 'EXPLORER';
    // Editor callbacks:
    onSave;
    onRun;
    onCtrlSpace;
    onCreateStatusPanel;
    onContextMenu;
    onNewTab;
    onSelectTab;
    onReady;
    onCreateFile;
    onCodeChange;
    onOpenPath;
    onHoverSymbol;
    _inputArea;
    // State:
    _lineStates = []; // tokenizer state at end of each line
    _lineElements = []; // <pre> element per line
    _bracketOpenLine = -1; // line of the { opening current scope
    _bracketCloseLine = -1; // line of the } closing current scope
    _hoverTimer = null;
    _hoverPopup = null;
    _hoverWord = '';
    _colorPopover = null; // active color picker popover
    _openedTabs = {};
    _loadedTabs = {};
    _storedTabs = {};
    _focused = false;
    _composing = false;
    _keyChain = null;
    _wasPaired = false;
    _lastAction = '';
    _blinkerInterval = null;
    _cursorVisible = true;
    _cursorBlinkRate = 550;
    _clickCount = 0;
    _lastClickTime = 0;
    _lastClickLine = -1;
    _isSearchBoxActive = false;
    _isSearchLineBoxActive = false;
    _searchMatchCase = false;
    _lastTextFound = '';
    _lastSearchPos = null;
    _discardScroll = false;
    _isReady = false;
    _lastMaxLineLength = 0;
    _lastLineCount = 0;
    _isAutoCompleteActive = false;
    _selectedAutocompleteIndex = 0;
    _displayObservers;
    static CODE_MIN_FONT_SIZE = 9;
    static CODE_MAX_FONT_SIZE = 22;
    static PAIR_KEYS = { '"': '"', "'": "'", '`': '`', '(': ')', '{': '}', '[': ']' };
    get doc() {
        return this.currentTab.doc;
    }
    get undoManager() {
        return this.currentTab.undoManager;
    }
    get cursorSet() {
        return this.currentTab.cursorSet;
    }
    get codeContainer() {
        return this.currentTab.dom;
    }
    static getInstances() {
        return CodeEditor.__instances;
    }
    constructor(area, options = {}) {
        g.editor = this;
        CodeEditor.__instances.push(this);
        this.skipInfo = options.skipInfo ?? this.skipInfo;
        this.disableEdition = options.disableEdition ?? this.disableEdition;
        this.skipTabs = options.skipTabs ?? this.skipTabs;
        this.useFileExplorer = (options.fileExplorer ?? this.useFileExplorer) && !this.skipTabs;
        this.useAutoComplete = options.autocomplete ?? this.useAutoComplete;
        this.allowAddScripts = options.allowAddScripts ?? this.allowAddScripts;
        this.allowClosingTabs = options.allowClosingTabs ?? this.allowClosingTabs;
        this.allowLoadingFiles = options.allowLoadingFiles ?? this.allowLoadingFiles;
        this.highlight = options.highlight ?? this.highlight;
        this.newTabOptions = options.newTabOptions;
        this.customSuggestions = options.customSuggestions ?? [];
        this.explorerName = options.explorerName ?? this.explorerName;
        // Editor callbacks
        this.onSave = options.onSave;
        this.onRun = options.onRun;
        this.onCtrlSpace = options.onCtrlSpace;
        this.onCreateStatusPanel = options.onCreateStatusPanel;
        this.onContextMenu = options.onContextMenu;
        this.onNewTab = options.onNewTab;
        this.onSelectTab = options.onSelectTab;
        this.onReady = options.onReady;
        this.onCodeChange = options.onCodeChange;
        this.onOpenPath = options.onOpenPath;
        this.onHoverSymbol = options.onHoverSymbol;
        this.language = Tokenizer.getLanguage(this.highlight) ?? Tokenizer.getLanguage('Plain Text');
        this.symbolTable = new SymbolTable();
        // File explorer
        if (this.useFileExplorer) {
            let [explorerArea, editorArea] = area.split({ sizes: ['15%', '85%'] });
            // explorerArea.setLimitBox( 180, 20, 512 );
            this.explorerArea = explorerArea;
            let panel = new LX.Panel();
            panel.addTitle(this.explorerName);
            let sceneData = [];
            this.explorer = panel.addTree(null, sceneData, {
                filter: false,
                rename: false,
                skipDefaultIcon: true
            });
            this.explorer.on('dblClick', (event) => {
                const node = event.items[0];
                const name = node.id;
                this.loadTab(name);
            });
            this.explorer.on('beforeDelete', (event, resolve) => {
                return;
            });
            explorerArea.attach(panel);
            // Update area
            area = editorArea;
        }
        // Full editor
        area.root.className = LX.mergeClass(area.root.className, 'codebasearea overflow-hidden flex relative');
        this.baseArea = area;
        this.area = new LX.Area({
            className: 'lexcodeeditor flex flex-col outline-none overflow-hidden size-full select-none bg-inherit relative',
            skipAppend: true
        });
        const codeAreaClassName = 'lexcodearea scrollbar-hidden flex flex-row flex-auto-fill';
        if (!this.skipTabs) {
            this.tabs = this.area.addTabs({ contentClass: codeAreaClassName, onclose: (name) => {
                    // this.closeTab triggers this onclose!
                    delete this._openedTabs[name];
                } });
            LX.addClass(this.tabs.root.parentElement, 'rounded-t-lg');
            if (!this.disableEdition) {
                this.tabs.root.parentElement.addEventListener('dblclick', (e) => {
                    if (!this.allowAddScripts)
                        return;
                    e.preventDefault();
                    this._onCreateNewFile();
                });
            }
            this.codeArea = this.tabs.area;
        }
        else {
            this.codeArea = new LX.Area({ className: codeAreaClassName, skipAppend: true });
            this.area.attach(this.codeArea);
        }
        this.root = this.area.root;
        area.attach(this.root);
        this.codeScroller = this.codeArea.root;
        // Add Line numbers gutter, only the container, line numbers are in the same line div
        this.lineGutter = LX.makeElement('div', `w-16 overflow-hidden absolute top-0 bg-inherit z-10 ${this.skipTabs ? '' : 'mt-8'}`, null, this.codeScroller);
        // Add code sizer, which will have the code elements
        this.codeSizer = LX.makeElement('div', 'pseudoparent-tabs w-full', null, this.codeScroller);
        // Cursors and selections
        this.cursorsLayer = LX.makeElement('div', 'cursors', null, this.codeSizer);
        this.selectionsLayer = LX.makeElement('div', 'selections', null, this.codeSizer);
        // Custom scrollbars
        if (!this.disableEdition) {
            this.vScrollbar = new ScrollBar(true, (delta) => {
                const scrollMax = this.codeScroller.scrollHeight - this.codeScroller.clientHeight;
                this.codeScroller.scrollTop = this.vScrollbar.applyDragDelta(delta, scrollMax);
                this._discardScroll = true;
            });
            this.root.appendChild(this.vScrollbar.root);
            this.hScrollbar = new ScrollBar(false, (delta) => {
                const scrollMax = this.codeScroller.scrollWidth - this.codeScroller.clientWidth;
                this.codeScroller.scrollLeft = this.hScrollbar.applyDragDelta(delta, scrollMax);
                this._discardScroll = true;
            });
            this.root.appendChild(this.hScrollbar.root);
            // Sync scrollbar thumbs on native scroll
            this.codeScroller.addEventListener('scroll', () => {
                if (this._discardScroll) {
                    this._discardScroll = false;
                    return;
                }
                this._syncScrollBars();
            });
            // Touch events for native scrolling on mobile
            let touchStartX = 0;
            let touchStartY = 0;
            this.codeScroller.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            this.codeScroller.addEventListener('touchmove', (e) => {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchStartX - touchX;
                const deltaY = touchStartY - touchY;
                this.codeScroller.scrollLeft += deltaX;
                this.codeScroller.scrollTop += deltaY;
                touchStartX = touchX;
                touchStartY = touchY;
            }, { passive: true });
            // Wheel: Ctrl+Wheel for font zoom, Shift+Wheel for horizontal scroll
            this.codeScroller.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._applyFontSizeOffset(e.deltaY < 0 ? 1 : -1);
                    return;
                }
                if (e.shiftKey) {
                    this.codeScroller.scrollLeft += e.deltaY > 0 ? 10 : -10;
                }
            }, { passive: false });
        }
        // Resize observer
        const codeResizeObserver = new ResizeObserver(() => {
            if (!this.currentTab)
                return;
            this.resize(true);
        });
        codeResizeObserver.observe(this.codeArea.root);
        if (!this.disableEdition) {
            // Add autocomplete box
            if (this.useAutoComplete) {
                this.autocomplete = LX.makeElement('div', 'autocomplete');
                this.codeArea.attach(this.autocomplete);
            }
            const searchBoxClass = 'searchbox bg-card min-w-96 absolute z-100 top-8 right-2 rounded-lg border-color overflow-y-scroll opacity-0';
            // Add search box
            {
                const box = LX.makeElement('div', searchBoxClass, null, this.codeArea);
                const searchPanel = new LX.Panel();
                box.appendChild(searchPanel.root);
                searchPanel.sameLine();
                const textComponent = searchPanel.addText(null, '', null, { placeholder: 'Find', inputClass: 'bg-secondary' });
                searchPanel.addButton(null, 'MatchCaseButton', (v) => {
                    this._searchMatchCase = v;
                    this._doSearch();
                }, { icon: 'CaseSensitive', selectable: true, buttonClass: 'link', title: 'Match Case',
                    tooltip: true });
                searchPanel.addButton(null, 'up', () => this._doSearch(null, true), { icon: 'ArrowUp', buttonClass: 'ghost', title: 'Previous Match',
                    tooltip: true });
                searchPanel.addButton(null, 'down', () => this._doSearch(), { icon: 'ArrowDown', buttonClass: 'ghost', title: 'Next Match',
                    tooltip: true });
                searchPanel.addButton(null, 'x', this._doHideSearch.bind(this), { icon: 'X', buttonClass: 'ghost', title: 'Close',
                    tooltip: true });
                searchPanel.endLine();
                const searchInput = textComponent.root.querySelector('input');
                searchInput?.addEventListener('keyup', (e) => {
                    if (e.key == 'Escape')
                        this._doHideSearch();
                    else if (e.key == 'Enter')
                        this._doSearch(e.target.value, !!e.shiftKey);
                });
                this.searchBox = box;
            }
            // Add search LINE box
            {
                const box = LX.makeElement('div', searchBoxClass, null, this.codeArea);
                const searchPanel = new LX.Panel();
                box.appendChild(searchPanel.root);
                searchPanel.sameLine();
                const textComponent = searchPanel.addText(null, '', (value) => {
                    searchInput.value = ':' + value.replaceAll(':', '');
                    this._doGotoLine(parseInt(searchInput.value.slice(1)));
                }, { className: 'flex-auto-fill', placeholder: 'Go to line', trigger: 'input' });
                searchPanel.addButton(null, 'x', this._doHideSearch.bind(this), { icon: 'X', title: 'Close', buttonClass: 'ghost',
                    tooltip: true });
                searchPanel.endLine();
                const searchInput = textComponent.root.querySelector('input');
                searchInput.addEventListener('keyup', (e) => {
                    if (e.key == 'Escape')
                        this._doHideSearch();
                });
                searchPanel.addText(null, 'Type a line number to go to (from 0 to 0).', null, { disabled: true, inputClass: 'text-xs bg-none', signal: '@line-number-range' });
                this.searchLineBox = box;
            }
        }
        // Hidden textarea for capturing keyboard input (dead keys, IME, etc.)
        this._inputArea = LX.makeElement('textarea', 'absolute opacity-0 w-[1px] h-[1px] top-0 left-0 overflow-hidden resize-none', '', this.root);
        this._inputArea.setAttribute('autocorrect', 'off');
        this._inputArea.setAttribute('autocapitalize', 'off');
        this._inputArea.setAttribute('spellcheck', 'false');
        this._inputArea.tabIndex = 0;
        // Events:
        this._inputArea.addEventListener('keydown', this._onKeyDown.bind(this));
        this._inputArea.addEventListener('compositionstart', () => this._composing = true);
        this._inputArea.addEventListener('compositionend', (e) => {
            this._composing = false;
            this._inputArea.value = '';
            if (e.data)
                this._doInsertChar(e.data);
        });
        this._inputArea.addEventListener('input', () => {
            if (this._composing)
                return;
            const val = this._inputArea.value;
            if (val) {
                this._inputArea.value = '';
                this._doInsertChar(val);
            }
        });
        this._inputArea.addEventListener('focus', () => this._setFocused(true));
        this._inputArea.addEventListener('blur', () => this._setFocused(false));
        this.codeArea.root.addEventListener('mousedown', this._onMouseDown.bind(this));
        this.codeArea.root.addEventListener('contextmenu', this._onMouseDown.bind(this));
        this.codeArea.root.addEventListener('mouseover', (e) => {
            const target = e.target;
            const link = target.closest('.code-link');
            if (link && e.ctrlKey)
                link.classList.add('hovered');
            const path = target.closest('.code-path');
            if (path && e.ctrlKey)
                path.classList.add('hovered');
        });
        this.codeArea.root.addEventListener('mouseout', (e) => {
            const target = e.target;
            const link = target.closest('.code-link');
            if (link)
                link.classList.remove('hovered');
            const path = target.closest('.code-path');
            if (path)
                path.classList.remove('hovered');
        });
        this.codeArea.root.addEventListener('mousemove', (e) => {
            const target = e.target;
            const link = target.closest('.code-link');
            if (link)
                link.classList.toggle('hovered', e.ctrlKey);
            const path = target.closest('.code-path');
            if (path)
                path.classList.toggle('hovered', e.ctrlKey);
            this._onCodeAreaMouseMove(e);
        });
        this.codeArea.root.addEventListener('mouseleave', () => {
            this._clearHoverPopup();
        });
        this.codeArea.root.addEventListener('click', (e) => {
            this._onColorSwatchClick(e);
        });
        // Bottom status panel
        this.statusPanel = this._createStatusPanel(options);
        if (this.statusPanel) {
            // Don't do this.area.attach here, since it will append to the tabs area.
            this.area.root.appendChild(this.statusPanel.root);
        }
        if (this.allowAddScripts) {
            this.onCreateFile = options.onCreateFile;
            this.addTab('+', {
                selected: false,
                title: 'Create file'
            });
        }
        // Starter code tab container
        if (options.defaultTab ?? true) {
            this.addTab(options.name || 'untitled', {
                language: this.highlight,
                title: options.title
            });
            // Initial render
            this._renderAllLines();
            this._renderCursors();
        }
        this._init();
    }
    _init() {
        if (this._displayObservers)
            return;
        this._isReady = false;
        const root = this.root;
        const _isVisible = () => {
            return (root.offsetParent !== null
                && root.clientWidth > 0
                && root.clientHeight > 0);
        };
        const _tryPrepare = async () => {
            if (this._isReady)
                return;
            if (!_isVisible())
                return;
            // Stop observing once prepared
            intersectionObserver.disconnect();
            resizeObserver.disconnect();
            await this._setupEditorWhenVisible();
        };
        // IntersectionObserver (for viewport)
        const intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    _tryPrepare();
                }
            }
        });
        intersectionObserver.observe(root);
        // ResizeObserver (for display property changes)
        const resizeObserver = new ResizeObserver(() => {
            _tryPrepare();
        });
        resizeObserver.observe(root);
        // Fallback polling (don't use it for now)
        // const interval = setInterval( () => {
        //     if ( this._isReady ) {
        //         clearInterval( interval );
        //         return;
        //     }
        //     _tryPrepare();
        // }, 250 );
        this._displayObservers = {
            intersectionObserver,
            resizeObserver
            // interval,
        };
    }
    clear() {
        console.assert(this.rightStatusPanel && this.leftStatusPanel, 'No panels to clear.');
        this.rightStatusPanel.clear();
        this.leftStatusPanel.clear();
    }
    addExplorerItem(item) {
        if (!this.explorer) {
            return;
        }
        if (!this.explorer.innerTree.data.find((value, index) => value.id === item.id)) {
            this.explorer.innerTree.data.push(item);
        }
    }
    ;
    setText(text, language, detectLang = false) {
        if (!this.currentTab)
            return;
        this.doc.setText(this._normalizeText(text), true);
        this.cursorSet.set(0, 0);
        this.undoManager.clear();
        this._lineStates = [];
        if (language) {
            this.setLanguage(language);
        }
        else if (detectLang) {
            const detected = this._detectLanguage(text);
            if (detected)
                this.setLanguage(detected);
        }
        this._renderAllLines();
        this._renderCursors();
        this._renderSelections();
        this.resize(true);
    }
    _detectLanguage(text) {
        const scores = {};
        const add = (lang, pts) => { scores[lang] = (scores[lang] ?? 0) + pts; };
        // Score using reservedWords from each registered language
        const textWords = new Set(text.match(/\b\w+\b/g) ?? []);
        const totalWords = Math.max(textWords.size, 1);
        for (const langName of Tokenizer.getRegisteredLanguages()) {
            const langDef = Tokenizer.getLanguage(langName);
            if (!langDef?.reservedWords?.length)
                continue;
            let hits = 0;
            for (const word of langDef.reservedWords) {
                if (textWords.has(word))
                    hits++;
            }
            if (hits > 0) {
                const vocabRatio = hits / langDef.reservedWords.length;
                const textRatio = hits / totalWords;
                add(langName, Math.round((vocabRatio + textRatio) * 40));
            }
        }
        // Add scores based on "important" structural words only
        // HTML
        if (/<!DOCTYPE\s+html/i.test(text))
            add('HTML', 20);
        if (/<html[\s>]/i.test(text))
            add('HTML', 15);
        if (/<\/?(div|span|body|head|script|style|meta)\b/i.test(text))
            add('HTML', 8);
        // JSON — must come before JS checks (starts with { or [)
        if (/^\s*[\[{]/.test(text) && /"\s*:\s*/.test(text) && !/function|=>|const|var|let/.test(text))
            add('JSON', 15);
        // CSS
        if (/[\w-]+\s*:\s*[\w#\d"'(]+.*;/.test(text) && /[{}]/.test(text) && !/<\w+/.test(text))
            add('CSS', 10);
        if (/@(media|keyframes|import|charset|font-face)\b/.test(text))
            add('CSS', 15);
        // WGSL
        if (/@(vertex|fragment|compute|group|binding|builtin)\b/.test(text))
            add('WGSL', 20);
        if (/\bfn\s+\w+\s*\(/.test(text) && /\bvar\b/.test(text))
            add('WGSL', 10);
        if (/\b(vec2f|vec3f|vec4f|mat4x4f|f32|u32|i32)\b/.test(text))
            add('WGSL', 12);
        // GLSL
        if (/\b(gl_Position|gl_FragColor|gl_FragCoord)\b/.test(text))
            add('GLSL', 20);
        if (/\b(uniform|varying|attribute)\s+\w/.test(text))
            add('GLSL', 10);
        if (/\b(vec2|vec3|vec4|mat4|sampler2D)\b/.test(text) && !/vec2f|vec3f/.test(text))
            add('GLSL', 8);
        // HLSL
        if (/\b(SV_Position|SV_Target|SV_Depth)\b/.test(text))
            add('HLSL', 20);
        if (/\b(cbuffer|tbuffer|float4|float3|float2|Texture2D)\b/.test(text))
            add('HLSL', 12);
        // Python
        if (/^\s*def\s+\w+\s*\(/m.test(text))
            add('Python', 15);
        if (/^\s*import\s+\w/m.test(text) && !/\bfrom\s+['"]/.test(text))
            add('Python', 8);
        if (/^\s*class\s+\w+(\s*\(.*\))?:/m.test(text))
            add('Python', 10);
        if (/\bprint\s*\(/.test(text) && /:\s*$/.test(text))
            add('Python', 5);
        if (/elif\b|lambda\b|self\.\w/.test(text))
            add('Python', 8);
        // Rust
        if (/\bfn\s+\w+\s*\(/.test(text) && /\blet\s+mut\b/.test(text))
            add('Rust', 15);
        if (/\b(impl|trait|enum|struct)\s+\w+/.test(text) && /\bfn\b/.test(text))
            add('Rust', 12);
        if (/use\s+std::|use\s+\w+::\w+/.test(text))
            add('Rust', 10);
        if (/println!\s*\(/.test(text))
            add('Rust', 8);
        // C++
        if (/#include\s*<[\w./]+>/.test(text))
            add('C++', 15);
        if (/\bstd::\w+/.test(text))
            add('C++', 12);
        if (/\b(class|template|namespace|nullptr|new\s+\w)\b/.test(text))
            add('C++', 8);
        if (/(::|->)\w+/.test(text))
            add('C++', 6);
        // C
        if (/#include\s*<[\w.]+\.h>/.test(text))
            add('C', 12);
        if (/\bint\s+main\s*\(/.test(text))
            add('C', 15);
        if (/\b(printf|scanf|malloc|free|sizeof)\s*\(/.test(text))
            add('C', 10);
        // TypeScript — before JS (is a superset)
        if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(text))
            add('TypeScript', 12);
        if (/\binterface\s+\w+/.test(text))
            add('TypeScript', 12);
        if (/\btype\s+\w+\s*=/.test(text))
            add('TypeScript', 10);
        if (/\bas\s+(string|number|any|unknown)\b/.test(text))
            add('TypeScript', 8);
        if (/\benum\s+\w+\s*\{/.test(text))
            add('TypeScript', 8);
        // JavaScript
        if (/\b(const|let|var)\s+\w+\s*=/.test(text))
            add('JavaScript', 8);
        if (/=>\s*[\w{(]/.test(text))
            add('JavaScript', 6);
        if (/\b(import|export)\s+(default|{|\*)/.test(text))
            add('JavaScript', 8);
        if (/\bconsole\.(log|warn|error)\b/.test(text))
            add('JavaScript', 6);
        // Markdown
        if (/^#{1,6}\s+\S/m.test(text))
            add('Markdown', 12);
        if (/\*\*\w.*?\*\*/.test(text) || /\[.+\]\(.+\)/.test(text))
            add('Markdown', 8);
        if (/^```\w*/m.test(text))
            add('Markdown', 10);
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        return best && best[1] >= 8 ? best[0] : null;
    }
    appendText(text) {
        const cursor = this.cursorSet.getPrimary();
        const { line, col } = cursor.head;
        const op = this.doc.insert(line, col, text);
        this.undoManager.record(op, this.cursorSet.getCursorPositions());
        // Move cursor to end of inserted text
        const lines = text.split(/\r?\n/);
        if (lines.length === 1) {
            cursor.head = { line, col: col + text.length };
        }
        else {
            cursor.head = { line: line + lines.length - 1, col: lines[lines.length - 1].length };
        }
        cursor.anchor = { ...cursor.head };
        this._rebuildLines();
        this._renderCursors();
        this._renderSelections();
        this.resize();
        this._scrollCursorIntoView();
    }
    getText() {
        return this.doc.getText();
    }
    setLanguage(name, extension) {
        const lang = Tokenizer.getLanguage(name);
        if (!lang)
            return;
        this.language = lang;
        if (this.currentTab) {
            this.currentTab.language = name;
            if (!this.skipTabs) {
                this.tabs.setIcon(this.currentTab.name, getLanguageIcon(lang, extension));
            }
        }
        this._lineStates = [];
        this._renderAllLines();
        LX.emitSignal('@highlight', name);
    }
    focus() {
        this._inputArea.focus();
    }
    addTab(name, options = {}) {
        const isNewTabButton = name === '+';
        const dom = LX.makeElement('div', 'code');
        const langName = options.language ?? 'Plain Text';
        const langDef = Tokenizer.getLanguage(langName);
        const extension = LX.getExtension(name);
        const icon = isNewTabButton ? null : getLanguageIcon(langDef, extension);
        const selected = options.selected ?? true;
        const codeTab = {
            name,
            dom,
            doc: new CodeDocument((doc) => {
                this._setTabModified(name, true);
                this.onCodeChange?.(doc);
            }),
            cursorSet: new CursorSet(),
            undoManager: new UndoManager(),
            language: langName,
            modified: false,
            title: options.title ?? name
        };
        this._openedTabs[name] = codeTab;
        this._loadedTabs[name] = codeTab;
        if (this.useFileExplorer && !isNewTabButton) {
            this.addExplorerItem({ id: name, skipVisibility: true, icon });
            this.explorer.innerTree.frefresh(name);
        }
        if (!this.skipTabs) {
            this.tabs.add(name, dom, {
                selected,
                icon,
                fixed: isNewTabButton,
                title: codeTab.title,
                onSelect: this._onSelectTab.bind(this, isNewTabButton),
                onContextMenu: this._onContextMenuTab.bind(this, isNewTabButton),
                allowDelete: this.allowClosingTabs,
                indexOffset: options.indexOffset
            });
        }
        // Move into the sizer..
        this.codeSizer.appendChild(dom);
        if (options.text) {
            codeTab.doc.setText(options.text, true);
            codeTab.cursorSet.set(0, 0);
            codeTab.undoManager.clear();
            this._renderAllLines();
            this._renderCursors();
            this._renderSelections();
            this._resetGutter();
        }
        if (selected) {
            this.currentTab = codeTab;
            this._updateDataInfoPanel('@tab-name', name);
            this.setLanguage(langName, extension);
        }
        return codeTab;
    }
    loadTab(name) {
        if (this._openedTabs[name]) {
            this.tabs.select(name);
            return;
        }
        const tab = this._loadedTabs[name];
        if (tab) {
            this._openedTabs[name] = tab;
            this.tabs.add(name, tab.dom, {
                selected: true,
                // icon,
                title: tab.title,
                onSelect: this._onSelectTab.bind(this),
                onContextMenu: this._onContextMenuTab.bind(this),
                allowDelete: this.allowClosingTabs
            });
            // Move into the sizer..
            this.codeSizer.appendChild(tab.dom);
            this.currentTab = tab;
            this._updateDataInfoPanel('@tab-name', name);
            return;
        }
        this.addTab(name, this._storedTabs[name] ?? null);
    }
    closeTab(name) {
        if (!this.allowClosingTabs)
            return;
        this.tabs.delete(name);
        const tab = this._openedTabs[name];
        if (tab) {
            tab.dom.remove();
            delete this._openedTabs[name];
        }
        // If we closed the current tab, switch to the first available
        if (this.currentTab?.name === name) {
            const remaining = Object.keys(this._openedTabs).filter(k => k !== '+');
            if (remaining.length > 0) {
                this.tabs.select(remaining[0]);
            }
            else {
                this.currentTab = null;
            }
        }
    }
    setCustomSuggestions(suggestions) {
        if (!suggestions || suggestions.constructor !== Array) {
            console.warn('suggestions should be an array!');
            return;
        }
        this.customSuggestions = suggestions.map(s => typeof s === 'string' ? { label: s } : s);
    }
    loadFile(file, options = {}) {
        const onLoad = (text, name) => {
            text = this._normalizeText(text);
            const ext = LX.getExtension(name);
            const lang = options.language ?? (Tokenizer.getLanguage(options.language)
                ?? (Tokenizer.getLanguageByExtension(ext) ?? Tokenizer.getLanguage('Plain Text')));
            const langName = lang.name;
            if (this.useFileExplorer || this.skipTabs) {
                this._storedTabs[name] = {
                    text,
                    title: options.title ?? name,
                    language: langName,
                    ...options
                };
                if (this.useFileExplorer) {
                    this.addExplorerItem({ id: name, skipVisibility: true, icon: getLanguageIcon(lang, ext) });
                    this.explorer.innerTree.frefresh(name);
                }
            }
            else {
                this.addTab(name, {
                    selected: true,
                    title: options.title ?? name,
                    language: langName
                });
                this.doc.setText(text, true);
                this.setLanguage(langName, ext);
                this.cursorSet.set(0, 0);
                this.undoManager.clear();
                this._renderCursors();
                this._renderSelections();
                this._resetGutter();
            }
            if (options.callback) {
                options.callback(name, text);
            }
        };
        if (typeof file === 'string') {
            const url = file;
            const name = options.filename ?? url.substring(url.lastIndexOf('/') + 1);
            LX.request({ url, success: (text) => {
                    onLoad(text, name);
                } });
        }
        else {
            const fr = new FileReader();
            fr.readAsText(file);
            fr.onload = (e) => {
                const text = e.currentTarget.result;
                onLoad(text, file.name);
            };
        }
    }
    async loadFiles(files, onComplete, async = false) {
        if (!files || files.length === 0) {
            onComplete?.(this, [], 0);
            return;
        }
        const results = [];
        for (const filePath of files) {
            try {
                const text = await LX.requestFileAsync(filePath, 'text');
                // Process the loaded file
                const name = filePath.substring(filePath.lastIndexOf('/') + 1);
                const processedText = text.replaceAll('\r', '').replaceAll(/\t|\\t/g, ' '.repeat(this.tabSize));
                const ext = LX.getExtension(name);
                const lang = Tokenizer.getLanguageByExtension(ext) ?? Tokenizer.getLanguage('Plain Text');
                const langName = lang.name;
                if (this.useFileExplorer || this.skipTabs) {
                    this._storedTabs[name] = {
                        text: processedText,
                        title: name,
                        language: langName
                    };
                    if (this.useFileExplorer) {
                        this.addExplorerItem({ id: name, skipVisibility: true, icon: getLanguageIcon(lang, ext) });
                        this.explorer.innerTree.frefresh(name);
                    }
                }
                else {
                    this.addTab(name, {
                        selected: results.length === 0, // Select first tab only
                        title: name,
                        language: langName
                    });
                    if (results.length === 0) {
                        this.doc.setText(processedText, true);
                        this.setLanguage(langName, ext);
                        this.cursorSet.set(0, 0);
                        this.undoManager.clear();
                        this._renderCursors();
                        this._renderSelections();
                        this._resetGutter();
                    }
                }
                results.push({ filePath, name, success: true });
            }
            catch (error) {
                console.error(`[LX.CodeEditor] Failed to load file: ${filePath}`, error);
                results.push({ filePath, success: false, error });
            }
        }
        onComplete?.(this, results, results.length);
    }
    async _setupEditorWhenVisible() {
        // Load any font size from local storage
        // If not, use default size and make sure it's sync by not hardcoding a number by default here
        const savedFontSize = window.localStorage.getItem('lexcodeeditor-font-size');
        if (savedFontSize) {
            await this._setFontSize(parseInt(savedFontSize), false);
        }
        else {
            const r = document.querySelector(':root');
            const s = getComputedStyle(r);
            this.fontSize = parseInt(s.getPropertyValue('--code-editor-font-size'));
            await this._measureChar();
        }
        LX.emitSignal('@font-size', this.fontSize);
        LX.doAsync(() => {
            if (!this._isReady) {
                this._isReady = true;
                if (this.onReady) {
                    this.onReady(this);
                }
                console.log(`[LX.CodeEditor] Ready! (font size: ${this.fontSize}px, char size: ${this.charWidth}px)`);
            }
        }, 20);
    }
    _findTabByPath(importPath) {
        // By now only uses base name
        const importBase = importPath.split('/').pop().replace(/\.\w+$/, '').toLowerCase();
        const allNames = new Set([
            ...Object.keys(this._openedTabs),
            ...Object.keys(this._loadedTabs),
            ...Object.keys(this._storedTabs),
        ]);
        for (const name of allNames) {
            const tabBase = name.split('/').pop().replace(/\.\w+$/, '').toLowerCase();
            if (tabBase === importBase)
                return name;
        }
        return null;
    }
    _setTabModified(name, modified) {
        const tab = this._openedTabs[name];
        if (!tab || tab.modified === modified)
            return;
        tab.modified = modified;
        const tabEl = this.tabs?.tabDOMs?.[name];
        if (tabEl)
            tabEl.toggleAttribute('data-modified', modified);
    }
    _onSelectTab(isNewTabButton, event, name) {
        if (this.disableEdition) {
            return;
        }
        if (isNewTabButton) {
            this._onNewTab(event);
            return;
        }
        this.currentTab = this._openedTabs[name];
        this._updateDataInfoPanel('@tab-name', name);
        this.language = Tokenizer.getLanguage(this.currentTab.language) ?? Tokenizer.getLanguage('Plain Text');
        LX.emitSignal('@highlight', this.currentTab.language);
        this._renderAllLines();
        this._afterCursorMove();
        if (!isNewTabButton && this.onSelectTab) {
            this.onSelectTab(name, this);
        }
    }
    _onNewTab(event) {
        if (this.onNewTab) {
            this.onNewTab(event);
            return;
        }
        const dmOptions = this.newTabOptions ?? [
            { name: 'Create file', icon: 'FilePlus', callback: this._onCreateNewFile.bind(this) },
            { name: 'Load file', icon: 'FileUp', disabled: !this.allowLoadingFiles, callback: this._doLoadFromFile.bind(this) }
        ];
        LX.addDropdownMenu(event.target, dmOptions, { side: 'bottom', align: 'start' });
    }
    _onCreateNewFile() {
        let options = {};
        if (this.onCreateFile) {
            options = this.onCreateFile(this);
            // Skip adding new file
            if (!options) {
                return;
            }
        }
        const name = options.name ?? 'unnamed.js';
        this.addTab(name, {
            selected: true,
            title: name,
            indexOffset: options.indexOffset,
            language: options.language ?? 'JavaScript'
        });
        this._renderAllLines();
        this._renderCursors();
        this._renderSelections();
        this._resetGutter();
    }
    _onContextMenuTab(isNewTabButton = false, event, name) {
        if (isNewTabButton) {
            return;
        }
        LX.addDropdownMenu(event.target, [
            { name: 'Close', kbd: 'MWB', disabled: !this.allowClosingTabs, callback: () => {
                    this.closeTab(name);
                } },
            { name: 'Close Others', disabled: !this.allowClosingTabs, callback: () => {
                    for (const key of Object.keys(this.tabs.tabs)) {
                        if (key === '+' || key === name)
                            continue;
                        this.closeTab(key);
                    }
                } },
            { name: 'Close All', disabled: !this.allowClosingTabs, callback: () => {
                    for (const key of Object.keys(this.tabs.tabs)) {
                        if (key === '+')
                            continue;
                        this.closeTab(key);
                    }
                } },
            null,
            { name: 'Copy Path', icon: 'Copy', callback: () => {
                    navigator.clipboard.writeText(this._openedTabs[name].path ?? '');
                } }
        ], { side: 'bottom', align: 'start', event });
    }
    async _measureChar() {
        const parentContainer = LX.makeContainer(null, 'lexcodeeditor', '', document.body);
        const container = LX.makeContainer(null, 'code', '', parentContainer);
        const line = document.createElement('pre');
        container.appendChild(line);
        const measurer = document.createElement('span');
        measurer.className = 'codechar';
        measurer.style.visibility = 'hidden';
        measurer.textContent = 'M';
        line.appendChild(measurer);
        // Force load the font before measuring
        const computedStyle = getComputedStyle(measurer);
        const fontFamily = computedStyle.fontFamily;
        const fontSize = computedStyle.fontSize;
        const fontWeight = computedStyle.fontWeight || 'normal';
        const fontStyle = computedStyle.fontStyle || 'normal';
        const fontString = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
        try {
            await document.fonts.load(fontString);
        }
        catch (e) {
            console.warn('[LX.CodeEditor] Failed to load font:', fontString, e);
        }
        // Use requestAnimationFrame to ensure the element is rendered
        requestAnimationFrame(() => {
            const rect = measurer.getBoundingClientRect();
            this.charWidth = rect.width || 7;
            this.lineHeight = parseFloat(getComputedStyle(this.root).getPropertyValue('--code-editor-row-height')) || 20;
            LX.deleteElement(parentContainer);
            // Re-render cursors with correct measurements
            this._renderCursors();
            this._renderSelections();
            this.resize(true);
        });
    }
    _createStatusPanel(options = {}) {
        if (this.skipInfo) {
            return;
        }
        let panel = new LX.Panel({ className: 'lexcodetabinfo bg-inherit flex flex-row flex-auto-keep', height: 'auto' });
        if (this.onCreateStatusPanel) {
            this.onCreateStatusPanel(panel, this);
        }
        let leftStatusPanel = this.leftStatusPanel = new LX.Panel({ id: 'FontSizeZoomStatusComponent',
            className: 'pad-xs content-center items-center flex-auto-keep', width: 'auto', height: 'auto' });
        leftStatusPanel.sameLine();
        // Zoom Component
        leftStatusPanel.addButton(null, 'ZoomOutButton', this._decreaseFontSize.bind(this), { icon: 'ZoomOut', buttonClass: 'ghost sm',
            title: 'Zoom Out', tooltip: true });
        leftStatusPanel.addLabel(this.fontSize, { fit: true, signal: '@font-size' });
        leftStatusPanel.addButton(null, 'ZoomInButton', this._increaseFontSize.bind(this), { icon: 'ZoomIn', buttonClass: 'ghost sm',
            title: 'Zoom In', tooltip: true });
        leftStatusPanel.endLine('justify-start');
        panel.attach(leftStatusPanel.root);
        // Filename cursor data
        let rightStatusPanel = this.rightStatusPanel = new LX.Panel({ className: 'pad-xs content-center items-center', height: 'auto' });
        rightStatusPanel.sameLine();
        rightStatusPanel.addLabel(this.currentTab?.title ?? '', { id: 'EditorFilenameStatusComponent', fit: true, inputClass: 'text-xs',
            signal: '@tab-name' });
        rightStatusPanel.addButton(null, 'Ln 1, Col 1', this._doOpenLineSearch.bind(this), {
            id: 'EditorSelectionStatusComponent',
            buttonClass: 'outline xs',
            fit: true,
            signal: '@cursor-data'
        });
        const tabSizeButton = rightStatusPanel.addButton(null, 'Spaces: ' + this.tabSize, (value, event) => {
            const _onNewTabSize = (v) => {
                this.tabSize = parseInt(v);
                this._rebuildLines();
                this._updateDataInfoPanel('@tab-spaces', `Spaces: ${this.tabSize}`);
            };
            const dd = LX.addDropdownMenu(tabSizeButton.root, ['2', '4', '8'].map((v) => { return { name: v, className: 'w-full place-content-center', callback: _onNewTabSize }; }), { side: 'top', align: 'end' });
            LX.addClass(dd.root, 'min-w-16! items-center');
        }, { id: 'EditorIndentationStatusComponent', buttonClass: 'outline xs', signal: '@tab-spaces' });
        const langButton = rightStatusPanel.addButton('<b>{ }</b>', this.highlight, (value, event) => {
            const dd = LX.addDropdownMenu(langButton.root, Tokenizer.getRegisteredLanguages().map((v) => {
                const lang = Tokenizer.getLanguage(v);
                const icon = getLanguageIcon(lang);
                const iconData = icon ? icon.split(' ') : [];
                return {
                    name: v,
                    icon: iconData[0],
                    className: 'w-full text-xs px-3',
                    svgClass: iconData.slice(1).join(' '),
                    callback: (v) => this.setLanguage(v)
                };
            }), { side: 'top', align: 'end' });
            LX.addClass(dd.root, 'min-w-min! items-center');
        }, { id: 'EditorLanguageStatusComponent', nameWidth: 'auto', buttonClass: 'outline xs', signal: '@highlight', title: '' });
        rightStatusPanel.endLine('justify-end');
        panel.attach(rightStatusPanel.root);
        const itemVisibilityMap = {
            'Font Size Zoom': options.statusShowFontSizeZoom ?? true,
            'Editor Filename': options.statusShowEditorFilename ?? true,
            'Editor Selection': options.statusShowEditorSelection ?? true,
            'Editor Indentation': options.statusShowEditorIndentation ?? true,
            'Editor Language': options.statusShowEditorLanguage ?? true
        };
        const _setVisibility = (itemName) => {
            const b = panel.root.querySelector(`#${itemName.replaceAll(' ', '')}StatusComponent`);
            console.assert(b, `${itemName} has no status button!`);
            b.classList.toggle('hidden', !itemVisibilityMap[itemName]);
        };
        for (const [itemName, v] of Object.entries(itemVisibilityMap)) {
            _setVisibility(itemName);
        }
        panel.root.addEventListener('contextmenu', (e) => {
            if (e.target
                && (e.target.classList.contains('lexpanel')
                    || e.target.classList.contains('lexinlinecomponents'))) {
                return;
            }
            const menuOptions = Object.keys(itemVisibilityMap).map((itemName, idx) => {
                const item = {
                    name: itemName,
                    icon: 'Check',
                    callback: () => {
                        itemVisibilityMap[itemName] = !itemVisibilityMap[itemName];
                        _setVisibility(itemName);
                    }
                };
                if (!itemVisibilityMap[itemName])
                    delete item.icon;
                return item;
            });
            LX.addDropdownMenu(e.target, menuOptions, { side: 'top', align: 'start' });
        });
        return panel;
    }
    _updateDataInfoPanel(signal, value) {
        if (this.skipInfo)
            return;
        if (this.cursorSet.cursors.length > 1) {
            value = '';
        }
        LX.emitSignal(signal, value);
    }
    /**
     * Tokenize a line and return its innerHTML with syntax highlighting spans.
     */
    _tokenizeLine(lineIndex) {
        const prevState = lineIndex > 0
            ? (this._lineStates[lineIndex - 1] ?? Tokenizer.initialState())
            : Tokenizer.initialState();
        const lineText = this.doc.getLine(lineIndex);
        const result = Tokenizer.tokenizeLine(lineText, this.language, prevState);
        const langClass = this.language.name.toLowerCase().replace(/[^a-z]/g, '');
        // Pre-compute which token index gets the bracket-highlight class
        let bracketTokenIdx = -1;
        if (lineIndex === this._bracketOpenLine) {
            // Last '{' symbol token on this line
            for (let i = result.tokens.length - 1; i >= 0; i--) {
                if (result.tokens[i].type === 'symbol' && result.tokens[i].value === '{') {
                    bracketTokenIdx = i;
                    break;
                }
            }
        }
        else if (lineIndex === this._bracketCloseLine) {
            // First '}' symbol token on this line
            for (let i = 0; i < result.tokens.length; i++) {
                if (result.tokens[i].type === 'symbol' && result.tokens[i].value === '}') {
                    bracketTokenIdx = i;
                    break;
                }
            }
        }
        let html = '';
        let colOffset = 0;
        for (let ti = 0; ti < result.tokens.length; ti++) {
            const token = result.tokens[ti];
            const cls = TOKEN_CLASS_MAP[token.type];
            const tokenCol = colOffset;
            colOffset += token.value.length;
            // Inject content depending on type of token: color, url, path?
            let content;
            if (token.type === 'comment') {
                const escaped = token.value
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                content = escaped.replace(URL_REGEX, `<span class="code-link" data-url="$1">$1</span>`);
            }
            else if (token.type === 'string' && isImportPath(result.tokens, ti)) {
                const inner = token.value.slice(1, -1); // strip surrounding quotes
                const q = token.value[0];
                const escapedInner = inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                content = `${q}<span class="code-path" data-path="${inner}">${escapedInner}</span>${q}`;
            }
            else {
                content = injectColorSpans(token.value, lineIndex, tokenCol);
            }
            const bracketClass = ti === bracketTokenIdx ? ' code-bracket-active' : '';
            if (cls) {
                html += `<span class="${cls} ${langClass}${bracketClass}">${content}</span>`;
            }
            else if (bracketClass) {
                html += `<span class="${bracketClass.trim()}">${content}</span>`;
            }
            else {
                html += content;
            }
        }
        return { html: html || '&nbsp;', endState: result.state, tokens: result.tokens };
    }
    /**
     * Update symbol table for a line.
     */
    _updateSymbolsForLine(lineIndex) {
        const lineText = this.doc.getLine(lineIndex);
        this.symbolTable.updateScopeForLine(lineIndex, lineText);
        this.symbolTable.removeLineSymbols(lineIndex);
        const { tokens } = this._tokenizeLine(lineIndex);
        const symbols = parseSymbolsFromLine(lineText, tokens, lineIndex, this.symbolTable);
        for (const symbol of symbols) {
            this.symbolTable.addSymbol(symbol);
        }
    }
    /**
     * Render all lines from scratch.
     */
    _renderAllLines() {
        if (!this.currentTab)
            return;
        this.codeContainer.innerHTML = '';
        this._lineElements = [];
        this._lineStates = [];
        this.symbolTable.clear(); // Clear all symbols on full rebuild
        for (let i = 0; i < this.doc.lineCount; i++) {
            this._appendLineElement(i);
        }
    }
    /**
     * Gets the html for the line gutter.
     */
    _getGutterHtml(lineIndex) {
        return `<span class="line-gutter">${lineIndex + 1}</span>`;
    }
    /**
     * Create and append a <pre> element for a line.
     */
    _appendLineElement(lineIndex) {
        const { html, endState } = this._tokenizeLine(lineIndex);
        this._lineStates[lineIndex] = endState;
        const pre = document.createElement('pre');
        pre.innerHTML = this._getGutterHtml(lineIndex) + html;
        this.codeContainer.appendChild(pre);
        this._lineElements[lineIndex] = pre;
        // Update symbols for this line
        this._updateSymbolsForLine(lineIndex);
    }
    /**
     * Re-render a single line's content (after editing).
     */
    _updateLine(lineIndex) {
        const { html, endState } = this._tokenizeLine(lineIndex);
        const oldState = this._lineStates[lineIndex];
        this._lineStates[lineIndex] = endState;
        if (this._lineElements[lineIndex]) {
            this._lineElements[lineIndex].innerHTML = this._getGutterHtml(lineIndex) + html;
        }
        // Update symbols for this line
        this._updateSymbolsForLine(lineIndex);
        // If the tokenizer state changed (e.g. opened/closed a block comment),
        // re-render subsequent lines until states stabilize
        if (!this._statesEqual(oldState, endState)) {
            for (let i = lineIndex + 1; i < this.doc.lineCount; i++) {
                const { html: nextHtml, endState: nextEnd } = this._tokenizeLine(i);
                const nextOld = this._lineStates[i];
                this._lineStates[i] = nextEnd;
                if (this._lineElements[i]) {
                    this._lineElements[i].innerHTML = this._getGutterHtml(i) + nextHtml;
                }
                this._updateSymbolsForLine(i); // Update symbols for cascaded lines too
                if (this._statesEqual(nextOld, nextEnd))
                    break;
            }
        }
        // Propagate/cascade scope updates to subsequent lines until the start-of-line scope stabilizes
        for (let i = lineIndex + 1; i < this.doc.lineCount; i++) {
            const oldStartDepth = this.symbolTable.getScopeAtLine(i).length;
            this.symbolTable.updateScopeForLine(i, this.doc.getLine(i));
            if (this.symbolTable.getScopeAtLine(i).length === oldStartDepth)
                break;
        }
    }
    /**
     * Rebuild line elements after structural changes (insert/delete lines).
     */
    _rebuildLines() {
        // Diff: if count matches, just update content; otherwise full rebuild
        if (this._lineElements.length === this.doc.lineCount) {
            for (let i = 0; i < this.doc.lineCount; i++) {
                this._updateLine(i);
            }
        }
        else {
            this._renderAllLines();
        }
        this.resize();
    }
    _statesEqual(a, b) {
        if (!a)
            return false;
        if (a.stack.length !== b.stack.length)
            return false;
        for (let i = 0; i < a.stack.length; i++) {
            if (a.stack[i] !== b.stack[i])
                return false;
        }
        return true;
    }
    _updateActiveLine() {
        const hasSelection = this.cursorSet.hasSelection();
        const activeLine = this.cursorSet.getPrimary().head.line;
        const activeCol = this.cursorSet.getPrimary().head.col;
        for (let i = 0; i < this._lineElements.length; i++) {
            this._lineElements[i].classList.toggle('active-line', !hasSelection && i === activeLine);
        }
        this._updateDataInfoPanel('@cursor-data', `Ln ${activeLine + 1}, Col ${activeCol + 1}`);
    }
    _renderCursors() {
        if (!this.currentTab)
            return;
        this.cursorsLayer.innerHTML = '';
        for (const sel of this.cursorSet.cursors) {
            const el = LX.makeElement('div', 'cursor', '&nbsp;', this.cursorsLayer);
            el.style.left = (sel.head.col * this.charWidth + this.xPadding) + 'px';
            el.style.top = (sel.head.line * this.lineHeight) + 'px';
        }
        this._updateActiveLine();
    }
    _renderSelections() {
        if (!this.currentTab)
            return;
        this.selectionsLayer.innerHTML = '';
        for (const sel of this.cursorSet.cursors) {
            if (selectionIsEmpty(sel))
                continue;
            const start = selectionStart(sel);
            const end = selectionEnd(sel);
            for (let line = start.line; line <= end.line; line++) {
                const lineText = this.doc.getLine(line);
                const fromCol = line === start.line ? start.col : 0;
                const toCol = line === end.line ? end.col : lineText.length;
                // Skip only when the selection ends exactly at col 0 of this line
                if (fromCol === toCol && line === end.line)
                    continue;
                const width = fromCol === toCol
                    ? Math.ceil(this.charWidth * 0.5) // minimum width for empty lines
                    : (toCol - fromCol) * this.charWidth;
                const div = LX.makeElement('div', 'lexcodeselection', '', this.selectionsLayer);
                div.style.top = (line * this.lineHeight) + 'px';
                div.style.left = (fromCol * this.charWidth + this.xPadding) + 'px';
                div.style.width = width + 'px';
            }
        }
    }
    _setFocused(focused) {
        this._focused = focused;
        if (focused) {
            this.cursorsLayer.classList.add('show');
            this.selectionsLayer.classList.add('show');
            this.selectionsLayer.classList.remove('unfocused');
            this._startBlinker();
        }
        else {
            this.cursorsLayer.classList.remove('show');
            if (!this._isSearchBoxActive) {
                this.selectionsLayer.classList.add('unfocused');
            }
            else {
                this.selectionsLayer.classList.add('show');
            }
            this._stopBlinker();
        }
    }
    _startBlinker() {
        this._stopBlinker();
        this._cursorVisible = true;
        this._setCursorVisibility(true);
        this._blinkerInterval = setInterval(() => {
            this._cursorVisible = !this._cursorVisible;
            this._setCursorVisibility(this._cursorVisible);
        }, this._cursorBlinkRate);
    }
    _stopBlinker() {
        if (this._blinkerInterval !== null) {
            clearInterval(this._blinkerInterval);
            this._blinkerInterval = null;
        }
    }
    _resetBlinker() {
        if (this._focused) {
            this._startBlinker();
        }
    }
    _setCursorVisibility(visible) {
        const cursors = this.cursorsLayer.querySelectorAll('.cursor');
        for (const c of cursors) {
            c.style.opacity = visible ? '0.6' : '0';
        }
    }
    // Keyboard input events:
    _onKeyDown(e) {
        if (!this.currentTab)
            return;
        // Ignore events during IME / dead key composition
        if (this._composing || e.key === 'Dead')
            return;
        // Ignore modifier-only presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key))
            return;
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;
        if (this._keyChain) {
            const chain = this._keyChain;
            this._keyChain = null;
            e.preventDefault();
            if (ctrl && chain === 'k') {
                switch (e.key.toLowerCase()) {
                    case 'c':
                        this._commentLines();
                        return;
                    case 'u':
                        this._uncommentLines();
                        return;
                }
            }
            return; // Unknown chord, just consume it
        }
        if (ctrl) {
            switch (e.key.toLowerCase()) {
                case 'a':
                    e.preventDefault();
                    this.cursorSet.selectAll(this.doc);
                    this._afterCursorMove();
                    return;
                case 'd':
                    e.preventDefault();
                    this._doFindNextOcurrence();
                    return;
                case 'f':
                    e.preventDefault();
                    this._doOpenSearch();
                    return;
                case 'g':
                    e.preventDefault();
                    this._doOpenLineSearch();
                    return;
                case 'k':
                    e.preventDefault();
                    this._keyChain = 'k';
                    return;
                case 's': // save
                    e.preventDefault();
                    if (this.onSave) {
                        this.onSave(this.getText(), this);
                        this.undoManager.markSaved();
                        this._setTabModified(this.currentTab.name, false);
                    }
                    return;
                case 'z':
                    e.preventDefault();
                    shift ? this._doRedo() : this._doUndo();
                    return;
                case 'y':
                    e.preventDefault();
                    this._doRedo();
                    return;
                case 'c':
                    e.preventDefault();
                    this._doCopy();
                    return;
                case 'x':
                    e.preventDefault();
                    this._doCut();
                    return;
                case 'v':
                    e.preventDefault();
                    this._doPaste();
                    return;
                case 'home':
                    e.preventDefault();
                    this.cursorSet.set(0, 0);
                    this._afterCursorMove();
                    return;
                case 'end':
                    e.preventDefault();
                    const lastLine = this.doc.lineCount - 1;
                    this.cursorSet.set(lastLine, this.doc.getLine(lastLine).length);
                    this._afterCursorMove();
                    return;
                case ' ':
                    e.preventDefault();
                    // Also call user callback if provided
                    if (this.onCtrlSpace) {
                        this.onCtrlSpace(this.getText(), this);
                    }
                    return;
            }
        }
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this._wasPaired = false;
                if (ctrl)
                    this.cursorSet.moveWordLeft(this.doc, shift);
                else
                    this.cursorSet.moveLeft(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'ArrowRight':
                e.preventDefault();
                this._wasPaired = false;
                if (ctrl)
                    this.cursorSet.moveWordRight(this.doc, shift);
                else
                    this.cursorSet.moveRight(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'ArrowUp':
                e.preventDefault();
                if (this._isAutoCompleteActive) {
                    const items = this.autocomplete.childNodes;
                    items[this._selectedAutocompleteIndex]?.classList.remove('selected');
                    this._selectedAutocompleteIndex = (this._selectedAutocompleteIndex - 1 + items.length) % items.length;
                    items[this._selectedAutocompleteIndex]?.classList.add('selected');
                    items[this._selectedAutocompleteIndex]?.scrollIntoView({ block: 'nearest' });
                    return;
                }
                this._wasPaired = false;
                if (alt && shift) {
                    this._duplicateLine(-1);
                    return;
                }
                if (alt) {
                    this._swapLine(-1);
                    return;
                }
                this.cursorSet.moveUp(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'ArrowDown':
                e.preventDefault();
                if (this._isAutoCompleteActive) {
                    const items = this.autocomplete.childNodes;
                    items[this._selectedAutocompleteIndex]?.classList.remove('selected');
                    this._selectedAutocompleteIndex = (this._selectedAutocompleteIndex + 1) % items.length;
                    items[this._selectedAutocompleteIndex]?.classList.add('selected');
                    items[this._selectedAutocompleteIndex]?.scrollIntoView({ block: 'nearest' });
                    return;
                }
                this._wasPaired = false;
                if (alt && shift) {
                    this._duplicateLine(1);
                    return;
                }
                if (alt) {
                    this._swapLine(1);
                    return;
                }
                this.cursorSet.moveDown(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'Home':
                e.preventDefault();
                this._wasPaired = false;
                this.cursorSet.moveToLineStart(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'End':
                e.preventDefault();
                this._wasPaired = false;
                this.cursorSet.moveToLineEnd(this.doc, shift);
                this._afterCursorMove();
                return;
            case 'Escape':
                e.preventDefault();
                if (this._isAutoCompleteActive) {
                    this._doHideAutocomplete();
                    return;
                }
                if (this._doHideSearch())
                    return;
                this.cursorSet.removeSecondaryCursors();
                // Collapse selection
                const h = this.cursorSet.getPrimary().head;
                this.cursorSet.set(h.line, h.col);
                this._afterCursorMove();
                return;
        }
        switch (e.key) {
            case 'Backspace':
                e.preventDefault();
                this._doBackspace(ctrl);
                return;
            case 'Delete':
                e.preventDefault();
                this._doDelete(ctrl);
                return;
            case 'Enter':
                e.preventDefault();
                this._doEnter(ctrl);
                return;
            case 'Tab':
                e.preventDefault();
                this._doTab(shift);
                return;
        }
        if (e.key.length === 1 && !ctrl) {
            e.preventDefault();
            this._doInsertChar(e.key);
        }
    }
    _flushIfActionChanged(action) {
        if (this._lastAction !== action) {
            this.undoManager.flush(this.cursorSet.getCursorPositions());
            this._lastAction = action;
        }
    }
    _flushAction() {
        this.undoManager.flush(this.cursorSet.getCursorPositions());
        this._lastAction = '';
    }
    _doInsertChar(char) {
        // Enclose selection if applicable
        if (char in CodeEditor.PAIR_KEYS && this.cursorSet.hasSelection()) {
            this._encloseSelection(char, CodeEditor.PAIR_KEYS[char]);
            return;
        }
        this._flushIfActionChanged('insert');
        this._deleteSelectionIfAny();
        const changedLines = new Set();
        let paired = false;
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const nextChar = this.doc.getCharAt(line, col);
            // If we just auto-paired and the next char is the same closing char, skip over it
            if (this._wasPaired && nextChar === char) {
                cursor.head = { line, col: col + 1 };
                cursor.anchor = { ...cursor.head };
                continue;
            }
            const op = this.doc.insert(line, col, char);
            this.undoManager.record(op, this.cursorSet.getCursorPositions());
            const pairInserted = char in CodeEditor.PAIR_KEYS && (!nextChar || /\s/.test(nextChar));
            const charsInserted = pairInserted ? 2 : 1;
            // Auto-pair: insert closing char if next char is whitespace or end of line
            if (pairInserted) {
                const closeOp = this.doc.insert(line, col + 1, CodeEditor.PAIR_KEYS[char]);
                this.undoManager.record(closeOp, this.cursorSet.getCursorPositions());
                paired = true;
            }
            cursor.head = { line, col: col + 1 };
            cursor.anchor = { ...cursor.head };
            this.cursorSet.adjustOthers(idx, line, col, charsInserted);
            changedLines.add(line);
        }
        this._wasPaired = paired;
        for (const line of changedLines)
            this._updateLine(line);
        this._afterCursorMove();
        // Close autocomplete when typing most chars (except word chars which update it)
        if (/[\w$]/.test(char)) {
            // Update autocomplete with new partial word
            this._doOpenAutocomplete();
        }
        else {
            // Non-word char, close autocomplete
            this._doHideAutocomplete();
        }
    }
    _getAffectedLines() {
        const cursor = this.cursorSet.getPrimary();
        const a = cursor.anchor.line;
        const h = cursor.head.line;
        return a <= h ? [a, h] : [h, a];
    }
    _commentLines() {
        const token = this.language.lineComment;
        if (!token)
            return;
        const [fromLine, toLine] = this._getAffectedLines();
        const comment = token + ' ';
        // Find minimum indentation across affected lines (skip empty lines)
        let minIndent = Infinity;
        for (let i = fromLine; i <= toLine; i++) {
            const line = this.doc.getLine(i);
            if (line.trim().length === 0)
                continue;
            minIndent = Math.min(minIndent, this.doc.getIndent(i));
        }
        if (minIndent === Infinity)
            minIndent = 0;
        this._flushAction();
        for (let i = fromLine; i <= toLine; i++) {
            const line = this.doc.getLine(i);
            if (line.trim().length === 0)
                continue;
            const op = this.doc.insert(i, minIndent, comment);
            this.undoManager.record(op, this.cursorSet.getCursorPositions());
            this._updateLine(i);
        }
        this._afterCursorMove();
    }
    _uncommentLines() {
        const token = this.language.lineComment;
        if (!token)
            return;
        const [fromLine, toLine] = this._getAffectedLines();
        this._flushAction();
        for (let i = fromLine; i <= toLine; i++) {
            const line = this.doc.getLine(i);
            const indent = this.doc.getIndent(i);
            const rest = line.substring(indent);
            // Check for "// " or "//"
            if (rest.startsWith(token + ' ')) {
                const op = this.doc.delete(i, indent, token.length + 1);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
            }
            else if (rest.startsWith(token)) {
                const op = this.doc.delete(i, indent, token.length);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
            }
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    _doFindNextOcurrence() {
        const primary = this.cursorSet.getPrimary();
        // Get the search text: selection or word under cursor
        let searchText = this.cursorSet.getSelectedText(this.doc);
        if (!searchText) {
            const { line, col } = primary.head;
            const [word, start, end] = this.doc.getWordAt(line, col);
            if (!word)
                return;
            // Select the word under cursor first (first Ctrl+D)
            primary.anchor = { line, col: start };
            primary.head = { line, col: end };
            this._renderCursors();
            this._renderSelections();
            return;
        }
        const lastCursor = this.cursorSet.cursors[this.cursorSet.cursors.length - 1];
        const lastEnd = posBefore(lastCursor.anchor, lastCursor.head) ? lastCursor.head : lastCursor.anchor;
        const match = this.doc.findNext(searchText, lastEnd.line, lastEnd.col);
        if (!match)
            return;
        // Check if this occurrence is already selected by any cursor
        const alreadySelected = this.cursorSet.cursors.some(sel => {
            const start = posBefore(sel.anchor, sel.head) ? sel.anchor : sel.head;
            return start.line === match.line && start.col === match.col;
        });
        if (alreadySelected)
            return;
        this.cursorSet.cursors.push({
            anchor: { line: match.line, col: match.col },
            head: { line: match.line, col: match.col + searchText.length }
        });
        this._renderCursors();
        this._renderSelections();
        this._scrollCursorIntoView();
    }
    _doOpenSearch(clear = false) {
        if (!this.searchBox)
            return;
        this._doHideSearch();
        LX.addClass(this.searchBox, 'opened');
        this._isSearchBoxActive = true;
        const input = this.searchBox.querySelector('input');
        if (!input)
            return;
        if (clear) {
            input.value = '';
        }
        else if (this.cursorSet.hasSelection()) {
            input.value = this.cursorSet.getSelectedText(this.doc);
        }
        input.selectionStart = 0;
        input.selectionEnd = input.value.length;
        input.focus();
    }
    _doOpenLineSearch() {
        if (!this.searchLineBox)
            return;
        this._doHideSearch();
        LX.emitSignal('@line-number-range', `Type a line number to go to (from 1 to ${this.doc.lineCount}).`);
        LX.addClass(this.searchLineBox, 'opened');
        this._isSearchLineBoxActive = true;
        const input = this.searchLineBox.querySelector('input');
        if (!input)
            return;
        input.value = ':';
        input.focus();
    }
    /**
     * Returns true if visibility changed.
     */
    _doHideSearch() {
        if (!this.searchBox || !this.searchLineBox)
            return false;
        const active = this._isSearchBoxActive;
        const activeLine = this._isSearchLineBoxActive;
        if (active) {
            this.searchBox.classList.remove('opened');
            this._isSearchBoxActive = false;
            this._lastSearchPos = null;
        }
        else if (activeLine) {
            this.searchLineBox.classList.remove('opened');
            this._isSearchLineBoxActive = false;
        }
        return (active != this._isSearchBoxActive) || (activeLine != this._isSearchLineBoxActive);
    }
    _doSearch(text, reverse = false, callback, skipAlert = true, forceFocus = true) {
        text = text ?? this._lastTextFound;
        if (!text)
            return;
        const doc = this.doc;
        let startLine;
        let startCol;
        if (this._lastSearchPos) {
            startLine = this._lastSearchPos.line;
            startCol = this._lastSearchPos.col + (reverse ? -text.length : text.length);
        }
        else {
            const cursor = this.cursorSet.getPrimary();
            startLine = cursor.head.line;
            startCol = cursor.head.col;
        }
        const findInLine = (lineIdx, fromCol) => {
            let lineText = doc.getLine(lineIdx);
            let needle = text;
            if (!this._searchMatchCase) {
                lineText = lineText.toLowerCase();
                needle = needle.toLowerCase();
            }
            if (reverse) {
                const sub = lineText.substring(0, fromCol);
                return sub.lastIndexOf(needle);
            }
            else {
                return lineText.indexOf(needle, fromCol);
            }
        };
        let foundLine = -1;
        let foundCol = -1;
        if (reverse) {
            for (let j = startLine; j >= 0; j--) {
                const col = findInLine(j, j === startLine ? startCol : doc.getLine(j).length);
                if (col > -1) {
                    foundLine = j;
                    foundCol = col;
                    break;
                }
            }
            // Wrap around from bottom
            if (foundLine === -1) {
                for (let j = doc.lineCount - 1; j > startLine; j--) {
                    const col = findInLine(j, doc.getLine(j).length);
                    if (col > -1) {
                        foundLine = j;
                        foundCol = col;
                        break;
                    }
                }
            }
        }
        else {
            for (let j = startLine; j < doc.lineCount; j++) {
                const col = findInLine(j, j === startLine ? startCol : 0);
                if (col > -1) {
                    foundLine = j;
                    foundCol = col;
                    break;
                }
            }
            // Wrap around from top
            if (foundLine === -1) {
                for (let j = 0; j < startLine; j++) {
                    const col = findInLine(j, 0);
                    if (col > -1) {
                        foundLine = j;
                        foundCol = col;
                        break;
                    }
                }
            }
        }
        if (foundLine === -1) {
            if (!skipAlert)
                alert('No results!');
            this._lastSearchPos = null;
            return;
        }
        this._lastTextFound = text;
        this._lastSearchPos = { line: foundLine, col: foundCol };
        if (callback) {
            callback(foundCol, foundLine);
        }
        else {
            // Select the found text
            const primary = this.cursorSet.getPrimary();
            primary.anchor = { line: foundLine, col: foundCol };
            primary.head = { line: foundLine, col: foundCol + text.length };
            this._renderCursors();
            this._renderSelections();
        }
        // Scroll to the match
        this.codeScroller.scrollTop = Math.max((foundLine - 10) * this.lineHeight, 0);
        this.codeScroller.scrollLeft = Math.max(foundCol * this.charWidth - this.codeScroller.clientWidth / 2, 0);
        if (forceFocus) {
            const input = this.searchBox?.querySelector('input');
            input?.focus();
        }
    }
    _doGotoLine(lineNumber) {
        if (Number.isNaN(lineNumber) || lineNumber < 1 || lineNumber > this.doc.lineCount)
            return;
        this.cursorSet.set(lineNumber - 1, 0);
        this._afterCursorMove();
    }
    _encloseSelection(open, close) {
        const cursor = this.cursorSet.getPrimary();
        const sel = cursor.anchor;
        const head = cursor.head;
        // Normalize selection (old invertIfNecessary)
        const fromLine = sel.line < head.line || (sel.line === head.line && sel.col < head.col) ? sel : head;
        const toLine = fromLine === sel ? head : sel;
        // Only single-line selections for now
        if (fromLine.line !== toLine.line)
            return;
        const line = fromLine.line;
        const from = fromLine.col;
        const to = toLine.col;
        this._flushAction();
        const op1 = this.doc.insert(line, from, open);
        this.undoManager.record(op1, this.cursorSet.getCursorPositions());
        const op2 = this.doc.insert(line, to + 1, close);
        this.undoManager.record(op2, this.cursorSet.getCursorPositions());
        // Keep selection on the enclosed word (shifted by 1)
        cursor.anchor = { line, col: from + 1 };
        cursor.head = { line, col: to + 1 };
        this._updateLine(line);
        this._afterCursorMove();
    }
    _doBackspace(ctrlKey) {
        this._flushIfActionChanged('backspace');
        // If any cursor has a selection, delete selections
        if (this.cursorSet.hasSelection()) {
            this._deleteSelectionIfAny();
            this._rebuildLines();
            this._afterCursorMove();
            return;
        }
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            if (line === 0 && col === 0)
                continue;
            if (col === 0) {
                // Merge with previous line
                const prevLineLen = this.doc.getLine(line - 1).length;
                const op = this.doc.delete(line - 1, prevLineLen, 1);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line: line - 1, col: prevLineLen };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, 0, prevLineLen, -1);
            }
            else if (ctrlKey) {
                // Delete word left
                const [word, from] = this.doc.getWordAt(line, col - 1);
                const deleteFrom = word.length > 0 ? from : col - 1;
                const deleteLen = col - deleteFrom;
                const op = this.doc.delete(line, deleteFrom, deleteLen);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line, col: deleteFrom };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, col, -deleteLen);
            }
            else {
                const op = this.doc.delete(line, col - 1, 1);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line, col: col - 1 };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, col, -1);
            }
        }
        this._rebuildLines();
        this._afterCursorMove();
        this._doOpenAutocomplete();
    }
    _doDelete(ctrlKey) {
        if (this.cursorSet.hasSelection()) {
            this._deleteSelectionIfAny();
            this._rebuildLines();
            this._afterCursorMove();
            return;
        }
        this._flushIfActionChanged('delete');
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const lineText = this.doc.getLine(line);
            if (col >= lineText.length && line >= this.doc.lineCount - 1)
                continue;
            if (col >= lineText.length) {
                // Merge with next line
                const op = this.doc.delete(line, col, 1);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                this.cursorSet.adjustOthers(idx, line, col, 0, -1);
            }
            else if (ctrlKey) {
                // Delete word right
                const [word, , end] = this.doc.getWordAt(line, col);
                const deleteLen = word.length > 0 ? end - col : 1;
                const op = this.doc.delete(line, col, deleteLen);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                this.cursorSet.adjustOthers(idx, line, col, -deleteLen);
            }
            else {
                const op = this.doc.delete(line, col, 1);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                this.cursorSet.adjustOthers(idx, line, col, -1);
            }
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    _doEnter(shift) {
        if (this._isAutoCompleteActive) {
            this._doAutocompleteWord();
            return;
        }
        if (shift && this.onRun) {
            this.onRun(this.getText(), this);
            return;
        }
        this._deleteSelectionIfAny();
        this._flushAction();
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const indent = this.doc.getIndent(line);
            const spaces = ' '.repeat(indent);
            const charBefore = this.doc.getCharAt(line, col - 1);
            const charAfter = this.doc.getCharAt(line, col);
            const OPEN_CLOSE = { '{': '}', '[': ']', '(': ')' };
            if (charBefore && charAfter && OPEN_CLOSE[charBefore] === charAfter) {
                const innerSpaces = ' '.repeat(indent + this.tabSize);
                const insertion = '\n' + innerSpaces + '\n' + spaces;
                const op = this.doc.insert(line, col, insertion);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line: line + 1, col: indent + this.tabSize };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, col, 0, 2);
            }
            else {
                const op = this.doc.insert(line, col, '\n' + spaces);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line: line + 1, col: indent };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, col, 0, 1);
            }
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    _doTab(shift) {
        if (this._isAutoCompleteActive) {
            this._doAutocompleteWord();
            return;
        }
        this._flushAction();
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const anchorLine = cursor.anchor.line;
            // Multiline selection: indent/dedent all lines in the selection
            const startLine = Math.min(line, anchorLine);
            const endLine = Math.max(line, anchorLine);
            const isMultiline = startLine !== endLine;
            if (isMultiline) {
                for (let i = startLine; i <= endLine; i++) {
                    if (shift) {
                        const lineText = this.doc.getLine(i);
                        let spacesToRemove = 0;
                        while (spacesToRemove < this.tabSize && spacesToRemove < lineText.length && lineText[spacesToRemove] === ' ') {
                            spacesToRemove++;
                        }
                        if (spacesToRemove > 0) {
                            const op = this.doc.delete(i, 0, spacesToRemove);
                            this.undoManager.record(op, this.cursorSet.getCursorPositions());
                        }
                    }
                    else {
                        const spaces = ' '.repeat(this.tabSize);
                        const op = this.doc.insert(i, 0, spaces);
                        this.undoManager.record(op, this.cursorSet.getCursorPositions());
                    }
                }
                const delta = shift ? -this.tabSize : this.tabSize;
                cursor.head = { line, col: Math.max(0, col + delta) };
                cursor.anchor = { line: anchorLine, col: Math.max(0, cursor.anchor.col + delta) };
            }
            else if (shift) {
                // Single line dedent: remove up to tabSize spaces from start
                const lineText = this.doc.getLine(line);
                let spacesToRemove = 0;
                while (spacesToRemove < this.tabSize && spacesToRemove < lineText.length && lineText[spacesToRemove] === ' ') {
                    spacesToRemove++;
                }
                if (spacesToRemove > 0) {
                    const op = this.doc.delete(line, 0, spacesToRemove);
                    this.undoManager.record(op, this.cursorSet.getCursorPositions());
                    cursor.head = { line, col: Math.max(0, col - spacesToRemove) };
                    cursor.anchor = { ...cursor.head };
                    this.cursorSet.adjustOthers(idx, line, 0, -spacesToRemove);
                }
            }
            else {
                // Single line indent: insert spaces at cursor
                const spacesToAdd = this.tabSize - (col % this.tabSize);
                const spaces = ' '.repeat(spacesToAdd);
                const op = this.doc.insert(line, col, spaces);
                this.undoManager.record(op, this.cursorSet.getCursorPositions());
                cursor.head = { line, col: col + spacesToAdd };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers(idx, line, col, spacesToAdd);
            }
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    _deleteSelectionIfAny() {
        let anyDeleted = false;
        for (const idx of this.cursorSet.sortedIndicesBottomUp()) {
            const sel = this.cursorSet.cursors[idx];
            if (selectionIsEmpty(sel))
                continue;
            const start = selectionStart(sel);
            const end = selectionEnd(sel);
            const selectedText = this.cursorSet.getSelectedText(this.doc, idx);
            if (!selectedText)
                continue;
            const linesRemoved = end.line - start.line;
            // not exact for multiline, but start.col is where cursor lands
            const colDelta = linesRemoved === 0 ? (end.col - start.col) : start.col;
            const op = this.doc.delete(start.line, start.col, selectedText.length);
            this.undoManager.record(op, this.cursorSet.getCursorPositions());
            sel.head = { ...start };
            sel.anchor = { ...start };
            this.cursorSet.adjustOthers(idx, start.line, start.col, -colDelta, -linesRemoved);
            anyDeleted = true;
        }
        if (anyDeleted) {
            this._rebuildLines();
            this._doHideAutocomplete();
        }
    }
    // Clipboard helpers:
    _doCopy() {
        const text = this.cursorSet.getSelectedText(this.doc);
        if (text) {
            navigator.clipboard.writeText(text);
        }
    }
    _doCut() {
        this._flushAction();
        const text = this.cursorSet.getSelectedText(this.doc);
        if (text) {
            navigator.clipboard.writeText(text);
            this._deleteSelectionIfAny();
        }
        else {
            const cursor = this.cursorSet.getPrimary();
            const line = cursor.head.line;
            const lineText = this.doc.getLine(line);
            const isLastLine = line === this.doc.lineCount - 1;
            navigator.clipboard.writeText(lineText + (isLastLine ? '' : '\n'));
            const op = this.doc.removeLine(line);
            this.undoManager.record(op, this.cursorSet.getCursorPositions());
            // Place cursor at col 0 of the resulting line
            const newLine = Math.min(line, this.doc.lineCount - 1);
            cursor.head = { line: newLine, col: 0 };
            cursor.anchor = { ...cursor.head };
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    _swapLine(dir) {
        const cursor = this.cursorSet.getPrimary();
        const line = cursor.head.line;
        const targetLine = line + dir;
        if (targetLine < 0 || targetLine >= this.doc.lineCount)
            return;
        const currentText = this.doc.getLine(line);
        const targetText = this.doc.getLine(targetLine);
        this._flushAction();
        const op1 = this.doc.replaceLine(line, targetText);
        this.undoManager.record(op1, this.cursorSet.getCursorPositions());
        const op2 = this.doc.replaceLine(targetLine, currentText);
        this.undoManager.record(op2, this.cursorSet.getCursorPositions());
        cursor.head = { line: targetLine, col: cursor.head.col };
        cursor.anchor = { ...cursor.head };
        this._rebuildLines();
        this._afterCursorMove();
    }
    _duplicateLine(dir) {
        const cursor = this.cursorSet.getPrimary();
        const line = cursor.head.line;
        const text = this.doc.getLine(line);
        this._flushAction();
        const op = this.doc.insertLine(line, text);
        this.undoManager.record(op, this.cursorSet.getCursorPositions());
        const newLine = dir === 1 ? line + 1 : line;
        cursor.head = { line: newLine, col: cursor.head.col };
        cursor.anchor = { ...cursor.head };
        this._rebuildLines();
        this._afterCursorMove();
    }
    /**
     * Normalize external text before inserting into the document:
     * - Unify line endings to \n
     * - Replace tab characters with the configured number of spaces
     */
    _normalizeText(text) {
        return text
            .replace(/\r\n?/g, '\n')
            .replace(/\t/g, ' '.repeat(this.tabSize));
    }
    async _doPaste() {
        const raw = await navigator.clipboard.readText();
        if (!raw)
            return;
        const text = this._normalizeText(raw);
        this._flushAction();
        this._deleteSelectionIfAny();
        const cursor = this.cursorSet.getPrimary();
        const op = this.doc.insert(cursor.head.line, cursor.head.col, text);
        this.undoManager.record(op, this.cursorSet.getCursorPositions());
        // Calculate new cursor position after paste
        const lines = text.split('\n');
        if (lines.length === 1) {
            this.cursorSet.set(cursor.head.line, cursor.head.col + text.length);
        }
        else {
            this.cursorSet.set(cursor.head.line + lines.length - 1, lines[lines.length - 1].length);
        }
        this._rebuildLines();
        this._afterCursorMove();
    }
    // Undo/Redo:
    _doUndo() {
        const result = this.undoManager.undo(this.doc, this.cursorSet.getCursorPositions());
        if (result) {
            if (result.cursors.length > 0) {
                const c = result.cursors[0];
                this.cursorSet.set(c.line, c.col);
            }
            this._rebuildLines();
            this._afterCursorMove();
            if (this.currentTab)
                this._setTabModified(this.currentTab.name, this.undoManager.isModified());
        }
    }
    _doRedo() {
        const result = this.undoManager.redo(this.doc);
        if (result) {
            if (result.cursors.length > 0) {
                const c = result.cursors[0];
                this.cursorSet.set(c.line, c.col);
            }
            this._rebuildLines();
            this._afterCursorMove();
            if (this.currentTab)
                this._setTabModified(this.currentTab.name, this.undoManager.isModified());
        }
    }
    // Mouse input events:
    _onMouseDown(e) {
        if (!this.currentTab)
            return;
        if (this.searchBox && this.searchBox.contains(e.target))
            return;
        if (this.autocomplete && this.autocomplete.contains(e.target))
            return;
        // Ctrl+click: open link or import path
        if (e.ctrlKey && e.button === 0) {
            const target = e.target;
            const link = target.closest('.code-link');
            if (link?.dataset.url) {
                window.open(link.dataset.url, '_blank');
                return;
            }
            const pathEl = target.closest('.code-path');
            if (pathEl?.dataset.path) {
                const rawPath = pathEl.dataset.path;
                const tabName = this._findTabByPath(rawPath);
                if (tabName)
                    this.loadTab(tabName);
                this.onOpenPath?.(rawPath, this);
                return;
            }
        }
        e.preventDefault(); // Prevent browser from stealing focus from _inputArea
        this._wasPaired = false;
        // Calculate line and column from click position
        const rect = this.codeContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - this.xPadding;
        const y = e.clientY - rect.top;
        const line = LX.clamp(Math.floor(y / this.lineHeight), 0, this.doc.lineCount - 1);
        const col = LX.clamp(Math.round(x / this.charWidth), 0, this.doc.getLine(line).length);
        if (e.type === 'contextmenu') {
            this._onContextMenu(e, line, col);
            return;
        }
        if (e.button !== 0)
            return;
        const now = Date.now();
        if (now - this._lastClickTime < 400 && line === this._lastClickLine) {
            this._clickCount = Math.min(this._clickCount + 1, 3);
        }
        else {
            this._clickCount = 1;
        }
        this._lastClickTime = now;
        this._lastClickLine = line;
        // Triple click: select entire line
        if (this._clickCount === 3) {
            const sel = this.cursorSet.getPrimary();
            sel.anchor = { line, col: 0 };
            sel.head = { line, col: this.doc.getLine(line).length };
        }
        // Double click: select word
        else if (this._clickCount === 2) {
            const [, start, end] = this.doc.getWordAt(line, col);
            const sel = this.cursorSet.getPrimary();
            sel.anchor = { line, col: start };
            sel.head = { line, col: end };
        }
        else if (e.shiftKey) {
            // Extend selection
            const sel = this.cursorSet.getPrimary();
            sel.head = { line, col };
        }
        else {
            this.cursorSet.set(line, col);
        }
        this._afterCursorMove();
        this._inputArea.focus();
        // Track mouse for drag selection (with auto-scroll when outside editor window/area)
        let lastMouseX = 0;
        let lastMouseY = 0;
        let rafId = null;
        const updateSelection = () => {
            const currentRect = this.codeContainer.getBoundingClientRect();
            const mx = lastMouseX - currentRect.left - this.xPadding;
            const my = lastMouseY - currentRect.top;
            const ml = LX.clamp(Math.floor(my / this.lineHeight), 0, this.doc.lineCount - 1);
            const mc = LX.clamp(Math.round(mx / this.charWidth), 0, this.doc.getLine(ml).length);
            const sel = this.cursorSet.getPrimary();
            sel.head = { line: ml, col: mc };
            this._renderCursors();
            this._renderSelections();
        };
        const autoScroll = () => {
            const scrollerRect = this.codeScroller.getBoundingClientRect();
            const overshootY = lastMouseY < scrollerRect.top ? lastMouseY - scrollerRect.top
                : lastMouseY > scrollerRect.bottom ? lastMouseY - scrollerRect.bottom : 0;
            const overshootX = lastMouseX < scrollerRect.left ? lastMouseX - scrollerRect.left
                : lastMouseX > scrollerRect.right ? lastMouseX - scrollerRect.right : 0;
            if (overshootY === 0 && overshootX === 0) {
                rafId = null;
                return;
            }
            const speedY = Math.sign(overshootY) * Math.min(Math.abs(overshootY) * 0.3, 15);
            const speedX = Math.sign(overshootX) * Math.min(Math.abs(overshootX) * 0.3, 15);
            this.codeScroller.scrollTop += speedY;
            this.codeScroller.scrollLeft += speedX;
            this._syncScrollBars();
            updateSelection();
            rafId = requestAnimationFrame(autoScroll);
        };
        const onMouseMove = (me) => {
            lastMouseX = me.clientX;
            lastMouseY = me.clientY;
            updateSelection();
            const scrollerRect = this.codeScroller.getBoundingClientRect();
            const isOutside = me.clientY < scrollerRect.top || me.clientY > scrollerRect.bottom
                || me.clientX < scrollerRect.left || me.clientX > scrollerRect.right;
            if (isOutside && rafId === null) {
                rafId = requestAnimationFrame(autoScroll);
            }
        };
        const onMouseUp = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    _onContextMenu(e, line, col) {
        e.preventDefault();
        // if ( !this.canOpenContextMenu )
        // {
        //     return;
        // }
        const dmOptions = [{ name: 'Copy', icon: 'Copy', callback: () => this._doCopy(), kbd: ['Ctrl', 'C'], useKbdSpecialKeys: false }];
        if (!this.disableEdition) {
            dmOptions.push({ name: 'Cut', icon: 'Scissors', callback: () => this._doCut(), kbd: ['Ctrl', 'X'], useKbdSpecialKeys: false });
            dmOptions.push({ name: 'Paste', icon: 'Paste', callback: () => this._doPaste(), kbd: ['Ctrl', 'V'], useKbdSpecialKeys: false });
        }
        if (this.onContextMenu) {
            const content = this.cursorSet.getSelectedText(this.doc);
            const options = this.onContextMenu(this, content, e);
            if (options?.length) {
                dmOptions.push(null); // Separator
                for (const o of options) {
                    dmOptions.push({ name: o.path, disabled: o.disabled, callback: o.callback });
                }
            }
        }
        LX.addDropdownMenu(e.target, dmOptions, { event: e, side: 'bottom', align: 'start' });
    }
    // Autocomplete:
    /**
     * Get word at cursor position for autocomplete.
     */
    _getWordAtCursor() {
        const cursor = this.cursorSet.getPrimary().head;
        const line = this.doc.getLine(cursor.line);
        let start = cursor.col;
        let end = cursor.col;
        // Find word boundaries
        while (start > 0 && /[\w$]/.test(line[start - 1]))
            start--;
        while (end < line.length && /[\w$]/.test(line[end]))
            end++;
        return { word: line.slice(start, end), start, end };
    }
    /**
     * Open autocomplete box with suggestions from symbols and custom suggestions.
     */
    _doOpenAutocomplete() {
        if (!this.autocomplete || !this.useAutoComplete)
            return;
        this.autocomplete.innerHTML = ''; // Clear all suggestions
        const { word } = this._getWordAtCursor();
        if (!word || word.length === 0) {
            this._doHideAutocomplete();
            return;
        }
        const suggestions = [];
        const added = new Set();
        const addSuggestion = (s) => {
            if (!added.has(s.label)) {
                suggestions.push(s);
                added.add(s.label);
            }
        };
        const filterSuggestion = (suggestion, word) => {
            const w = word.toLowerCase();
            if (suggestion.filterText) {
                return suggestion.filterText.split(' ').some(token => token.toLowerCase().trim().startsWith(w));
            }
            return suggestion.label.toLowerCase().startsWith(w);
        };
        // Get first suggestions from symbol table
        const allSymbols = this.symbolTable.getAllSymbols();
        for (const symbol of allSymbols) {
            const s = { label: symbol.name, kind: symbol.kind, scope: symbol.scope, detail: `${symbol.kind} in ${symbol.scope}` };
            if (filterSuggestion(s, word))
                addSuggestion(s);
        }
        // Add language reserved keys
        for (const reservedWord of this.language.reservedWords) {
            const s = { label: reservedWord };
            if (filterSuggestion(s, word))
                addSuggestion(s);
        }
        // Add custom suggestions
        for (const suggestion of this.customSuggestions) {
            if (filterSuggestion(suggestion, word))
                addSuggestion(suggestion);
        }
        if (suggestions.length === 0) {
            this._doHideAutocomplete();
            return;
        }
        // Sort suggestions: exact matches first, then by sortText (or label if absent)
        const w = word.toLowerCase();
        suggestions.sort((a, b) => {
            const aKey = (a.sortText ?? a.label).toLowerCase();
            const bKey = (b.sortText ?? b.label).toLowerCase();
            const aExact = aKey === w ? 0 : 1;
            const bExact = bKey === w ? 0 : 1;
            if (aExact !== bExact)
                return aExact - bExact;
            return aKey.localeCompare(bKey);
        });
        this._selectedAutocompleteIndex = 0;
        // Render suggestions
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('pre');
            item.insertText = suggestion.insertText ?? suggestion.label;
            if (index === this._selectedAutocompleteIndex)
                item.classList.add('selected');
            const currSuggestionLabel = suggestion.label;
            let iconName = suggestion.icon ?? 'CaseLower';
            let iconClass = suggestion.iconClass ?? 'text-gray-500';
            switch (suggestion.kind) {
                case 'class':
                    iconName = 'CircleNodes';
                    iconClass = 'text-orange-500';
                    break;
                case 'struct':
                    iconName = 'Form';
                    iconClass = 'text-orange-400';
                    break;
                case 'interface':
                    iconName = 'FileType';
                    iconClass = 'text-cyan-500';
                    break;
                case 'enum':
                    iconName = 'ListTree';
                    iconClass = 'text-yellow-500';
                    break;
                case 'enum-value':
                    iconName = 'Dot';
                    iconClass = 'text-yellow-400';
                    break;
                case 'type':
                    iconName = 'Type';
                    iconClass = 'text-teal-500';
                    break;
                case 'function':
                    iconName = 'Function';
                    iconClass = 'text-purple-500';
                    break;
                case 'method':
                    iconName = 'Box';
                    iconClass = 'text-fuchsia-500';
                    break;
                case 'variable':
                    iconName = 'Cuboid';
                    iconClass = 'text-blue-400';
                    break;
                case 'property':
                    iconName = 'Layers';
                    iconClass = 'text-blue-300';
                    break;
                case 'constructor-call':
                    iconName = 'Hammer';
                    iconClass = 'text-green-500';
                    break;
                case 'method-call':
                    iconName = 'Parentheses';
                    iconClass = 'text-gray-400';
                    break;
            }
            item.appendChild(LX.makeIcon(iconName, { iconClass: 'ml-1 mr-2', svgClass: 'sm ' + iconClass }));
            // Highlight the written part
            const hIndex = currSuggestionLabel.toLowerCase().indexOf(word.toLowerCase());
            var preWord = document.createElement('span');
            preWord.textContent = currSuggestionLabel.substring(0, hIndex);
            item.appendChild(preWord);
            var actualWord = document.createElement('span');
            actualWord.textContent = currSuggestionLabel.substring(hIndex, hIndex + word.length);
            actualWord.classList.add('word-highlight');
            item.appendChild(actualWord);
            var postWord = document.createElement('span');
            postWord.textContent = currSuggestionLabel.substring(hIndex + word.length);
            item.appendChild(postWord);
            if (suggestion.kind) {
                const kind = document.createElement('span');
                kind.textContent = ` (${suggestion.kind})`;
                kind.className = 'kind text-muted-foreground text-xs! ml-2';
                item.appendChild(kind);
            }
            item.addEventListener('click', () => {
                this._doAutocompleteWord();
            });
            this.autocomplete.appendChild(item);
        });
        this._isAutoCompleteActive = true;
        const handleClick = (e) => {
            if (!this.autocomplete?.contains(e.target)) {
                this._doHideAutocomplete();
            }
        };
        setTimeout(() => document.addEventListener('click', handleClick, { once: true }), 0);
        // Store cleanup function
        this.autocomplete._cleanup = () => {
            document.removeEventListener('click', handleClick);
        };
        // Prepare autocomplete ui
        this.autocomplete.classList.toggle('show', true);
        this.autocomplete.classList.toggle('no-scrollbar', !(this.autocomplete.scrollHeight > this.autocomplete.offsetHeight));
        const cursor = this.cursorSet.getPrimary().head;
        const left = cursor.col * this.charWidth + this.xPadding;
        const top = (cursor.line + 1) * this.lineHeight + this._cachedTabsHeight - this.codeScroller.scrollTop;
        this.autocomplete.style.left = left + 'px';
        this.autocomplete.style.top = top + 'px';
    }
    _doHideAutocomplete() {
        if (!this.autocomplete || !this._isAutoCompleteActive)
            return;
        this.autocomplete.innerHTML = ''; // Clear all suggestions
        this.autocomplete.classList.remove('show');
        this._isAutoCompleteActive = false;
        if (this.autocomplete._cleanup) {
            this.autocomplete._cleanup();
            delete this.autocomplete._cleanup;
        }
    }
    /**
     * Insert the selected autocomplete word at cursor.
     */
    _doAutocompleteWord() {
        const text = this._getSelectedAutoCompleteWord();
        if (!text)
            return;
        const cursor = this.cursorSet.getPrimary().head;
        const { start, end } = this._getWordAtCursor();
        const line = cursor.line;
        const cursorsBefore = this.cursorSet.getCursorPositions();
        if (end > start) {
            const deleteOp = this.doc.delete(line, start, end - start);
            this.undoManager.record(deleteOp, cursorsBefore);
        }
        const insertOp = this.doc.insert(line, start, text);
        const insertedLines = text.split(/\r?\n/);
        if (insertedLines.length === 1) {
            this.cursorSet.set(line, start + text.length);
        }
        else {
            this.cursorSet.set(line + insertedLines.length - 1, insertedLines[insertedLines.length - 1].length);
        }
        const cursorsAfter = this.cursorSet.getCursorPositions();
        this.undoManager.record(insertOp, cursorsAfter);
        this._rebuildLines();
        this._afterCursorMove();
        this._doHideAutocomplete();
    }
    _getSelectedAutoCompleteWord() {
        if (!this.autocomplete || !this._isAutoCompleteActive)
            return null;
        const pre = this.autocomplete.childNodes[this._selectedAutocompleteIndex];
        return pre.insertText;
    }
    _afterCursorMove() {
        this._renderCursors();
        this._renderSelections();
        this._resetBlinker();
        this.resize();
        this._scrollCursorIntoView();
        this._updateBracketHighlight();
    }
    /**
     * Returns the scope stack at the exact cursor position (line + column).
     * Basically starts from getScopeAtLine and then counts real braces up to the cursor column.
     */
    _getScopeAtCursor() {
        const cursor = this.cursorSet.getPrimary().head;
        const line = cursor.line;
        const col = cursor.col;
        const lineText = this.doc.getLine(line);
        const scopeStack = [...this.symbolTable.getScopeAtLine(line)];
        let i = 0;
        let inString = false;
        let stringCh = '';
        while (i < col && i < lineText.length) {
            const ch = lineText[i];
            if (inString) {
                if (ch === '\\') {
                    i += 2;
                    continue;
                }
                if (ch === stringCh)
                    inString = false;
                i++;
                continue;
            }
            if (ch === '/' && lineText[i + 1] === '/')
                break;
            if (ch === '/' && lineText[i + 1] === '*') {
                i += 2;
                while (i < col && !(lineText[i] === '*' && lineText[i + 1] === '/'))
                    i++;
                i += 2;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                inString = true;
                stringCh = ch;
                i++;
                continue;
            }
            if (ch === '{') {
                scopeStack.push({ name: 'anonymous', type: 'anonymous', line });
            }
            else if (ch === '}' && scopeStack.length > 1) {
                scopeStack.pop();
            }
            i++;
        }
        return scopeStack;
    }
    _updateBracketHighlight() {
        const scopes = this._getScopeAtCursor();
        // Find innermost non-global scope
        let innermost = null;
        for (let i = scopes.length - 1; i >= 0; i--) {
            if (scopes[i].type !== 'global') {
                innermost = scopes[i];
                break;
            }
        }
        const prevOpen = this._bracketOpenLine;
        const prevClose = this._bracketCloseLine;
        if (!innermost) {
            this._bracketOpenLine = -1;
            this._bracketCloseLine = -1;
        }
        else {
            const openLine = innermost.line;
            const targetDepth = scopes.length; // depth including the innermost scope
            // Closing line: last line where scope depth >= targetDepth
            let closeLine = openLine;
            for (let i = openLine + 1; i < this.doc.lineCount; i++) {
                if (this.symbolTable.getScopeAtLine(i).length >= targetDepth)
                    closeLine = i;
                else
                    break;
            }
            this._bracketOpenLine = openLine;
            this._bracketCloseLine = closeLine;
        }
        // Re-render only the lines that changed
        const linesToUpdate = new Set();
        if (prevOpen !== this._bracketOpenLine) {
            linesToUpdate.add(prevOpen);
            linesToUpdate.add(this._bracketOpenLine);
        }
        if (prevClose !== this._bracketCloseLine) {
            linesToUpdate.add(prevClose);
            linesToUpdate.add(this._bracketCloseLine);
        }
        for (const line of linesToUpdate) {
            if (line >= 0 && line < this.doc.lineCount)
                this._updateLine(line);
        }
    }
    // Color picker:
    _onColorSwatchClick(e) {
        const span = e.target.closest('.code-color');
        if (!span)
            return;
        e.stopPropagation();
        e.preventDefault();
        const colorValue = span.dataset.color;
        const lineIndex = parseInt(span.dataset.line);
        const colStart = parseInt(span.dataset.col);
        let currentLen = colorValue.length;
        if (this._colorPopover) {
            this._colorPopover.destroy();
            this._colorPopover = null;
        }
        const picker = new LX.ColorPicker(colorValue, {
            colorModel: 'Hex',
            onChange: (color) => {
                // Generate a hex string matching the original length (# + 3/4/6/8 hex chars)
                const raw = color.hex.replace(/^#/, '');
                const digits = currentLen - 1;
                const newHex = '#' + (digits <= 4
                    ? raw.slice(0, digits).padEnd(digits, '0')
                    : raw.slice(0, Math.min(digits, 8)).padEnd(digits, '0'));
                const lineText = this.doc.getLine(lineIndex);
                if (lineText.slice(colStart, colStart + currentLen) !== span.dataset.color)
                    return;
                const delOp = this.doc.delete(lineIndex, colStart, currentLen);
                this.undoManager.record(delOp, this.cursorSet.getCursorPositions());
                const insOp = this.doc.insert(lineIndex, colStart, newHex);
                this.undoManager.record(insOp, this.cursorSet.getCursorPositions());
                this._updateLine(lineIndex);
                currentLen = newHex.length;
                span.dataset.color = newHex;
                span.dataset.col = String(colStart);
                span.style.setProperty('--code-color', newHex);
            }
        });
        this._colorPopover = new LX.Popover(span, [picker], { side: 'bottom', align: 'start', sideOffset: 4 });
    }
    // Symbol hover:
    /**
     * Extracts the parameter list from a function/method declaration line.
     */
    _getSymbolParams(symLine) {
        if (symLine < 0 || symLine >= this.doc.lineCount)
            return '()';
        const m = this.doc.getLine(symLine).match(/\(([^)]*)\)/);
        return m ? `(${m[1].trim()})` : '()';
    }
    /**
     * Starting from the line where a class is defined, scans forward to find
     * the constructor signature and returns its parameter list.
     */
    _findConstructorParams(classLine) {
        const classDepth = this.symbolTable.getScopeAtLine(classLine).length;
        const maxScan = Math.min(classLine + 50, this.doc.lineCount);
        for (let i = classLine + 1; i < maxScan; i++) {
            if (this.symbolTable.getScopeAtLine(i).length < classDepth + 1)
                break;
            const m = this.doc.getLine(i).match(/\bconstructor\s*\(([^)]*)\)/);
            if (m)
                return `(${m[1].trim()})`;
        }
        return null;
    }
    /**
     * Given multiple symbols with the same name, pick the most likely one for
     * the hovered position using the available context data.
     */
    _pickBestSymbol(symbols, word, tokenType, lineText, hoveredLine) {
        if (symbols.length === 1)
            return symbols[0];
        const curScopes = this.symbolTable.getScopeAtLine(hoveredLine);
        const curScope = [...curScopes].reverse().find(s => s.type !== 'global')?.name ?? 'global';
        const wordEsc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const isNewCall = new RegExp(`\\bnew\\s+${wordEsc}\\b`).test(lineText);
        const isFuncCall = new RegExp(`\\b${wordEsc}\\s*[(<]`).test(lineText);
        const isTypeAnno = new RegExp(`(?::\\s*|<\\s*|[,>]\\s*)${wordEsc}\\b`).test(lineText);
        const typeKinds = new Set(['class', 'interface', 'type', 'enum', 'struct']);
        const funcKinds = new Set(['function', 'method']);
        const scored = symbols.map(sym => {
            let score = 0;
            // Defined in the current innermost scope
            if (sym.scope === curScope)
                score += 5;
            // Check token type
            if (tokenType === 'method' && funcKinds.has(sym.kind))
                score += 3;
            if (tokenType === 'type' && typeKinds.has(sym.kind))
                score += 3;
            // Hovered-line context patterns
            if (isNewCall && sym.kind === 'constructor-call')
                score += 20;
            if (isNewCall && sym.kind === 'class')
                score += 3;
            if (isFuncCall && funcKinds.has(sym.kind))
                score += 3;
            if (isTypeAnno && typeKinds.has(sym.kind))
                score += 2;
            // Validate kind based on symbol declaration line
            if (sym.line >= 0 && sym.line < this.doc.lineCount) {
                const declLine = this.doc.getLine(sym.line);
                if (/\bfunction\b/.test(declLine) && funcKinds.has(sym.kind))
                    score += 4;
                if (/\bclass\b/.test(declLine) && sym.kind === 'class')
                    score += 4;
                if (/\binterface\b/.test(declLine) && sym.kind === 'interface')
                    score += 4;
                if (/\btype\b/.test(declLine) && sym.kind === 'type')
                    score += 4;
                if (/\benum\b/.test(declLine) && sym.kind === 'enum')
                    score += 4;
                if (/\b(?:const|let|var)\b/.test(declLine) && sym.kind === 'variable')
                    score += 3;
            }
            // Order also by line proximity
            const dist = Math.abs(sym.line - hoveredLine);
            score += Math.max(0, 4 - Math.floor(dist / 20));
            return { sym, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored[0].sym;
    }
    _clearHoverPopup() {
        if (this._hoverTimer) {
            clearTimeout(this._hoverTimer);
            this._hoverTimer = null;
        }
        if (this._hoverPopup) {
            this._hoverPopup.remove();
            this._hoverPopup = null;
        }
        this._hoverWord = '';
    }
    _onCodeAreaMouseMove(e) {
        if (!this.currentTab)
            return;
        // Only show hover when no button is pressed (no dragging)
        if (e.buttons !== 0) {
            this._clearHoverPopup();
            return;
        }
        const rect = this.codeContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - this.xPadding;
        const y = e.clientY - rect.top;
        const line = LX.clamp(Math.floor(y / this.lineHeight), 0, this.doc.lineCount - 1);
        const col = LX.clamp(Math.round(x / this.charWidth), 0, this.doc.getLine(line).length);
        const [word, wordStart] = this.doc.getWordAt(line, col);
        if (!word || word === this._hoverWord)
            return;
        this._clearHoverPopup();
        if (!word.trim())
            return;
        this._hoverWord = word;
        this._hoverTimer = setTimeout(() => {
            this._hoverTimer = null;
            const prevState = line > 0 ? (this._lineStates[line - 1] ?? Tokenizer.initialState()) : Tokenizer.initialState();
            const { tokens } = Tokenizer.tokenizeLine(this.doc.getLine(line), this.language, prevState);
            let tokenType = 'text';
            let charPos = 0;
            for (const tok of tokens) {
                // Use wordStart (not col) so boundary positions like col=wordEnd don't fall into the next token
                if (wordStart >= charPos && wordStart < charPos + tok.value.length) {
                    tokenType = tok.type;
                    break;
                }
                charPos += tok.value.length;
            }
            if (tokenType === 'comment' || tokenType === 'string' || tokenType === 'number')
                return;
            const symbols = this.symbolTable.getSymbols(word);
            const info = { word, tokenType, symbols };
            let userContent;
            if (this.onHoverSymbol)
                userContent = this.onHoverSymbol(info, this);
            // No popup if user explicitly returns null
            if (userContent === null)
                return;
            const hasSymbols = symbols.length > 0;
            if (!userContent && !hasSymbols)
                return;
            const popup = this._hoverPopup = LX.makeElement('div', 'code-hover-popup [&_span]:text-sm');
            if (userContent) {
                if (typeof userContent === 'string')
                    popup.innerHTML = userContent;
                else
                    popup.appendChild(userContent);
            }
            else {
                const sym = this._pickBestSymbol(symbols, word, tokenType, this.doc.getLine(line), line);
                let kindLabel = sym.kind;
                let nameLabel = `<span class="font-semibold">${word}</span>`;
                if (sym.kind === 'constructor-call') {
                    const classSym = this.symbolTable.getSymbols(word).find(s => s.kind === 'class');
                    const params = classSym != null ? (this._findConstructorParams(classSym.line) ?? '()') : '()';
                    kindLabel = 'constructor';
                    nameLabel = `${nameLabel}<span class="text-muted-foreground">${params}</span>`;
                }
                else if (sym.kind === 'function') {
                    const params = this._getSymbolParams(sym.line);
                    nameLabel = `${nameLabel}<span class="text-muted-foreground">${params}</span>`;
                }
                else if (sym.scope && sym.scope !== 'global' && sym.scope !== 'anonymous') {
                    if (sym.kind === 'property' || sym.kind === 'method') {
                        const scopePrefix = `<span class="text-muted-foreground">${sym.scope}.</span>`;
                        if (sym.kind === 'method') {
                            const params = this._getSymbolParams(sym.line);
                            nameLabel = `${scopePrefix}${nameLabel}<span class="text-muted-foreground">${params}</span>`;
                        }
                        else {
                            nameLabel = `${scopePrefix}${nameLabel}`;
                        }
                    }
                    else if (sym.kind === 'variable') {
                        // Only prefix the scope when the variable is a member (class/interface/struct field)
                        const declScopes = this.symbolTable.getScopeAtLine(sym.line);
                        const scopeEntry = declScopes.find(s => s.name === sym.scope);
                        const memberTypes = new Set(['class', 'interface', 'struct']);
                        if (scopeEntry && memberTypes.has(scopeEntry.type)) {
                            nameLabel = `<span class="text-muted-foreground">${sym.scope}.</span>${nameLabel}`;
                        }
                    }
                }
                popup.innerHTML = `<span class="text-info">(${kindLabel})</span> ${nameLabel}`;
            }
            document.body.appendChild(popup);
            // Position just below the hovered word
            const lineEl = this._lineElements[line];
            if (lineEl) {
                const elRect = lineEl.getBoundingClientRect();
                const leftPx = elRect.left + this.xPadding + col * this.charWidth;
                const topPx = elRect.bottom + 4;
                popup.style.left = Math.min(leftPx, window.innerWidth - popup.offsetWidth - 8) + 'px';
                popup.style.top = topPx + 'px';
            }
        }, 500);
    }
    // Scrollbar & Resize:
    _scrollCursorIntoView() {
        const cursor = this.cursorSet.getPrimary().head;
        const top = cursor.line * this.lineHeight;
        const left = cursor.col * this.charWidth;
        // Vertical scroll
        if (top < this.codeScroller.scrollTop) {
            this.codeScroller.scrollTop = top;
        }
        else if (top + this.lineHeight > this.codeScroller.scrollTop + this.codeScroller.clientHeight) {
            this.codeScroller.scrollTop = top + this.lineHeight - this.codeScroller.clientHeight;
        }
        // Horizontal scroll
        const sbOffset = ScrollBar.SIZE * 2;
        if (left < this.codeScroller.scrollLeft) {
            this.codeScroller.scrollLeft = left;
        }
        else if (left + sbOffset > this.codeScroller.scrollLeft + this.codeScroller.clientWidth - this.xPadding) {
            this.codeScroller.scrollLeft = left + sbOffset - this.codeScroller.clientWidth + this.xPadding;
        }
    }
    _resetGutter() {
        // Use cached value or compute if not available (e.g., on initial load)
        const tabsHeight = this._cachedTabsHeight || (this.tabs?.root.getBoundingClientRect().height ?? 0);
        const statusPanelHeight = this._cachedStatusPanelHeight || (this.statusPanel?.root.getBoundingClientRect().height ?? 0);
        this.lineGutter.style.height = `calc(100% - ${tabsHeight + statusPanelHeight}px)`;
    }
    getMaxLineLength() {
        if (!this.currentTab)
            return 0;
        let max = 0;
        for (let i = 0; i < this.doc.lineCount; i++) {
            const len = this.doc.getLine(i).length;
            if (len > max)
                max = len;
        }
        return max;
    }
    resize(force = false) {
        if (!this.charWidth)
            return;
        // Cache layout measurements to avoid reflows
        this._cachedTabsHeight = this.tabs?.root.getBoundingClientRect().height ?? 0;
        this._cachedStatusPanelHeight = this.statusPanel?.root.getBoundingClientRect().height ?? 0;
        const maxLineLength = this.getMaxLineLength();
        const lineCount = this.currentTab ? this.doc.lineCount : 0;
        const viewportChars = Math.floor((this.codeScroller.clientWidth - this.xPadding) / this.charWidth);
        const viewportLines = Math.floor(this.codeScroller.clientHeight / this.lineHeight);
        let needsHResize = maxLineLength !== this._lastMaxLineLength
            && (maxLineLength >= viewportChars || this._lastMaxLineLength >= viewportChars);
        let needsVResize = lineCount !== this._lastLineCount
            && (lineCount >= viewportLines || this._lastLineCount >= viewportLines);
        // If doesn't need resize due to not reaching min length, maybe we need to resize if the content shrinks and we have extra space now
        needsHResize = needsHResize || (maxLineLength < viewportChars && this.hScrollbar?.visible);
        needsVResize = needsVResize || (lineCount < viewportLines && this.vScrollbar?.visible);
        if (!force && !needsHResize && !needsVResize)
            return;
        this._lastMaxLineLength = maxLineLength;
        this._lastLineCount = lineCount;
        if (force || needsHResize) {
            this.codeSizer.style.minWidth = (maxLineLength * this.charWidth + this.xPadding + ScrollBar.SIZE * 2) + 'px';
        }
        if (force || needsVResize) {
            this.codeSizer.style.minHeight = (lineCount * this.lineHeight + ScrollBar.SIZE * 2) + 'px';
        }
        this._resetGutter();
        setTimeout(() => this._resizeScrollBars(), 10);
    }
    _resizeScrollBars() {
        if (!this.vScrollbar)
            return;
        // Use cached offsets to avoid reflows
        const topOffset = this._cachedTabsHeight;
        const bottomOffset = this._cachedStatusPanelHeight;
        // Vertical scrollbar: right edge, between tabs and status bar
        const scrollHeight = this.codeScroller.scrollHeight;
        this.vScrollbar.setThumbRatio(scrollHeight > 0 ? this.codeScroller.clientHeight / scrollHeight : 1);
        this.vScrollbar.root.style.top = topOffset + 'px';
        this.vScrollbar.root.style.height = `calc(100% - ${topOffset + bottomOffset}px)`;
        // Horizontal scrollbar: bottom of code area, offset by gutter and vertical scrollbar
        const scrollWidth = this.codeScroller.scrollWidth;
        this.hScrollbar.setThumbRatio(scrollWidth > 0 ? this.codeScroller.clientWidth / scrollWidth : 1);
        this.hScrollbar.root.style.bottom = bottomOffset + 'px';
        this.hScrollbar.root.style.width = `calc(100% - ${this.xPadding + (this.vScrollbar.visible ? ScrollBar.SIZE : 0)}px)`;
    }
    _syncScrollBars() {
        if (!this.vScrollbar)
            return;
        this.vScrollbar.syncToScroll(this.codeScroller.scrollTop, this.codeScroller.scrollHeight - this.codeScroller.clientHeight);
        this.hScrollbar.syncToScroll(this.codeScroller.scrollLeft, this.codeScroller.scrollWidth - this.codeScroller.clientWidth);
    }
    // Files:
    _doLoadFromFile() {
        const input = LX.makeElement('input', '', '', document.body);
        input.type = 'file';
        input.click();
        input.addEventListener('change', (e) => {
            const target = e.target;
            if (target.files && target.files[0]) {
                this.loadFile(target.files[0]);
            }
            input.remove();
        });
    }
    // Font Size utils:
    async _setFontSize(size, updateDOM = true) {
        // Change font size
        this.fontSize = size;
        const r = document.querySelector(':root');
        r.style.setProperty('--code-editor-font-size', `${this.fontSize}px`);
        window.localStorage.setItem('lexcodeeditor-font-size', `${this.fontSize}`);
        await this._measureChar();
        // Change row size
        const rowPixels = this.fontSize + 6;
        r.style.setProperty('--code-editor-row-height', `${rowPixels}px`);
        this.lineHeight = rowPixels;
        if (updateDOM) {
            this._rebuildLines();
            this._afterCursorMove();
        }
        // Emit event
        LX.emitSignal('@font-size', this.fontSize);
    }
    _applyFontSizeOffset(offset = 0) {
        const newFontSize = LX.clamp(this.fontSize + offset, CodeEditor.CODE_MIN_FONT_SIZE, CodeEditor.CODE_MAX_FONT_SIZE);
        this._setFontSize(newFontSize);
    }
    _increaseFontSize() {
        this._applyFontSizeOffset(1);
    }
    _decreaseFontSize() {
        this._applyFontSizeOffset(-1);
    }
}
LX.CodeEditor = CodeEditor;

export { CodeEditor, Tokenizer };
//# sourceMappingURL=CodeEditor.js.map
