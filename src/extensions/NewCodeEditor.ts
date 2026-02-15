// NewCodeEditor.ts @jxarco

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'CodeEditor' );

//  _____                 
// |_   _|_ _ ___ ___ ___ 
//   | | | | | . | -_|_ -|
//   |_| |_  |  _|___|___|
//       |___|_|

interface Token
{
    type: string;   // 'keyword', 'string', 'comment', 'number', 'method', 'type', 'symbol', 'builtin', 'statement', 'preprocessor', 'text'
    value: string;
}

interface TokenRule
{
    match: RegExp;
    type: string;
    next?: string;   // push this state
    pop?: boolean;   // pop back to previous state
}

interface LanguageDef
{
    name: string;
    extensions: string[];
    states: Record<string, TokenRule[]>;
    lineComment?: string;
    icon?: string | Record<string, string>;
}

interface TokenizerState
{
    stack: string[];  // state stack, e.g. ['root'] or ['root', 'blockComment']
}

interface TokenizeResult
{
    tokens: Token[];
    state: TokenizerState;
}

//  _____ _   _ _ _ _   _         
// |  |  | |_|_| |_| |_|_|___ ___ 
// |  |  |  _| | | |  _| | -_|_ -|
// |_____|_| |_|_|_|_| |_|___|___|

function firstNonspaceIndex( str: string ): number
{
    const index = str.search( /\S|$/ );
    return index < str.length ? index : -1;
}

function isSymbol( str: string ): boolean
{
    return /[^\w\s]/.test( str );
}

function isWord( str: string ): boolean
{
    return /\w/.test( str );
}

//  _____     _           _             
// |_   _|___| |_ ___ ___|_|___ ___ ___ 
//   | | | . | '_| -_|   | |- _| -_|  _|
//   |_| |___|_,_|___|_|_|_|___|___|_|

export class Tokenizer
{
    private static languages: Map<string, LanguageDef> = new Map();
    private static extensionMap: Map<string, string> = new Map(); // ext -> language name

    static registerLanguage( def: LanguageDef ): void
    {
        Tokenizer.languages.set( def.name, def );
        for ( const ext of def.extensions )
        {
            Tokenizer.extensionMap.set( ext, def.name );
        }
    }

    static getLanguage( name: string ): LanguageDef | undefined
    {
        return Tokenizer.languages.get( name );
    }

    static getLanguageByExtension( ext: string ): LanguageDef | undefined
    {
        const name = Tokenizer.extensionMap.get( ext );
        return name ? Tokenizer.languages.get( name ) : undefined;
    }

    static getRegisteredLanguages(): string[]
    {
        return Array.from( Tokenizer.languages.keys() );
    }

    static initialState(): TokenizerState
    {
        return { stack: [ 'root' ] };
    }

    /**
     * Tokenize a single line given a language and the state from the previous line.
     * Returns the tokens and the updated state for the next line.
     */
    static tokenizeLine( line: string, language: LanguageDef, state: TokenizerState ): TokenizeResult
    {
        const tokens: Token[] = [];
        const stack = [ ...state.stack ]; // clone

        let pos = 0;

        while ( pos < line.length )
        {
            const currentState = stack[ stack.length - 1 ];
            const rules = language.states[ currentState ];

            if ( !rules )
            {
                // No rules for this state, so emit rest as text
                tokens.push( { type: 'text', value: line.slice( pos ) } );
                pos = line.length;
                break;
            }

            let matched = false;

            for ( const rule of rules )
            {
                // Anchor regex at current position
                const regex = new RegExp( rule.match.source, 'y' + ( rule.match.flags.replace( /[gy]/g, '' ) ) );
                regex.lastIndex = pos;
                const m = regex.exec( line );

                if ( m )
                {
                    if ( m[0].length === 0 )
                    {
                        // Zero-length match, skipping to avoid infinite loop...
                        continue;
                    }

                    tokens.push( { type: rule.type, value: m[0] } );
                    pos += m[0].length;

                    // State transitions
                    if ( rule.next )
                    {
                        stack.push( rule.next );
                    }
                    else if ( rule.pop )
                    {
                        if ( stack.length > 1 )
                        {
                            stack.pop();
                        }
                    }

                    matched = true;
                    break;
                }
            }

            if ( !matched )
            {
                // No rule matched, consume one character as text either merged or as a new token
                const lastToken = tokens[ tokens.length - 1 ];
                if ( lastToken && lastToken.type === 'text' )
                {
                    lastToken.value += line[ pos ];
                }
                else
                {
                    tokens.push( { type: 'text', value: line[ pos ] } );
                }
                pos++;
            }
        }

        const merged = Tokenizer._mergeTokens( tokens );

        return { tokens: merged, state: { stack } };
    }

    /**
     * Merge consecutive tokens with the same type into one.
     */
    private static _mergeTokens( tokens: Token[] ): Token[]
    {
        if ( tokens.length === 0 ) return tokens;

        const result: Token[] = [ tokens[0] ];

        for ( let i = 1; i < tokens.length; i++ )
        {
            const prev = result[ result.length - 1 ];
            if ( tokens[i].type === prev.type )
            {
                prev.value += tokens[i].value;
            }
            else
            {
                result.push( tokens[i] );
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
function words( list: string[] ): RegExp
{
    return new RegExp( '\\b(?:' + list.join( '|' ) + ')\\b' );
}

/**
 * Common state rules reusable across C-like languages.
 */
const CommonStates: Record<string, TokenRule[]> = {
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
const NumberRules: TokenRule[] = [
    { match: /0[xX][0-9a-fA-F]+\b/, type: 'number' },
    { match: /\d+\.?\d*(?:[eE][+-]?\d+)?/, type: 'number' },
    { match: /\.\d+(?:[eE][+-]?\d+)?/, type: 'number' },
];

/** Common tail rules: method detection, identifiers, symbols, whitespace. */
const TailRules: TokenRule[] = [
    { match: /[a-zA-Z_$]\w*(?=\s*\()/, type: 'method' },
    { match: /[a-zA-Z_$]\w*/, type: 'text' },
    { match: /[{}()\[\];,.:?!&|<>=+\-*/%^~@#]/, type: 'symbol' },
    { match: /\s+/, type: 'text' },
];

/** Template string states for JS/TS. */
function templateStringStates( exprKeywords: string[] ): Record<string, TokenRule[]>
{
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
            { match: words( exprKeywords ), type: 'keyword' },
            ...TailRules,
        ],
    };
}

//  __                                   ____      ___ _     _ _   _             
// |  |   ___ ___ ___ _ _ ___ ___ ___   |    \ ___|  _|_|___|_| |_|_|___ ___ ___ 
// |  |__| .'|   | . | | | .'| . | -_|  |  |  | -_|  _| |   | |  _| | . |   |_ -|
// |_____|__,|_|_|_  |___|__,|_  |___|  |____/|___|_| |_|_|_|_|_| |_|___|_|_|___|
//               |___|       |___|

Tokenizer.registerLanguage( {
    name: 'Plain Text',
    extensions: [ 'txt' ],
    states: {
        root: [
            { match: /.+/, type: 'text' }
        ]
    },
    icon: 'AlignLeft text-neutral-500'
} );

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

Tokenizer.registerLanguage( {
    name: 'JavaScript',
    extensions: [ 'js', 'mjs', 'cjs' ],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /`/, type: 'string', next: 'templateString' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words( jsKeywords ), type: 'keyword' },
            { match: words( jsStatements ), type: 'statement' },
            { match: words( jsBuiltins ), type: 'builtin' },
            ...TailRules,
        ],
        ...CommonStates,
        ...templateStringStates( [ 'var', 'let', 'const', 'this', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'instanceof', 'void' ] ),
    },
    icon: 'Js text-yellow-500'
} );

// TypeScript

const tsKeywords = [
    ...jsKeywords,
    'as', 'interface', 'type', 'enum', 'namespace', 'declare', 'private', 'protected',
    'implements', 'readonly', 'keyof', 'infer', 'is', 'asserts', 'override', 'satisfies'
];

const tsTypes = [
    'string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'null',
    'undefined', 'object', 'symbol', 'bigint',
    'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude',
    'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'ConstructorParameters',
    'InstanceType', 'Awaited'
];

Tokenizer.registerLanguage( {
    name: 'TypeScript',
    extensions: [ 'ts', 'tsx' ],
    lineComment: '//',
    states: {
        root: [
            { match: /\/\*/, type: 'comment', next: 'blockComment' },
            { match: /\/\/.*/, type: 'comment' },
            { match: /`/, type: 'string', next: 'templateString' },
            { match: /"/, type: 'string', next: 'doubleString' },
            { match: /'/, type: 'string', next: 'singleString' },
            ...NumberRules,
            { match: words( tsKeywords ), type: 'keyword' },
            { match: words( jsStatements ), type: 'statement' },
            { match: words( tsTypes ), type: 'type' },
            { match: words( jsBuiltins ), type: 'builtin' },
            ...TailRules,
        ],
        ...CommonStates,
        ...templateStringStates( [ 'var', 'let', 'const', 'this', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'instanceof', 'void' ] ),
    },
    icon: 'Ts text-blue-600'
} );

//  ____                            _   
// |    \ ___ ___ _ _ _____ ___ ___| |_ 
// |  |  | . |  _| | |     | -_|   |  _|
// |____/|___|___|___|_|_|_|___|_|_|_|

class CodeDocument
{
    private _lines: string[] = [ '' ];

    get lineCount(): number
    {
        return this._lines.length;
    }

    getLine( n: number ): string
    {
        return this._lines[ n ] ?? '';
    }

    getText( separator: string = '\n' ): string
    {
        return this._lines.join( separator );
    }

    setText( text: string ): void
    {
        this._lines = text.split( /\r?\n/ );
        if ( this._lines.length === 0 )
        {
            this._lines = [ '' ];
        }
    }

    getCharAt( line: number, col: number ): string | undefined
    {
        const l = this._lines[ line ];
        if ( !l || col < 0 || col >= l.length ) return undefined;
        return l[ col ];
    }

    /**
     * Get the word at a given position. Returns [word, startCol, endCol].
     */
    getWordAt( line: number, col: number ): [ string, number, number ]
    {
        const l = this._lines[ line ];
        if ( !l || col < 0 || col > l.length ) return [ '', col, col ];

        // Expand left
        let start = col;
        while ( start > 0 && isWord( l[ start - 1 ] ) )
        {
            start--;
        }

        // Expand right
        let end = col;
        while ( end < l.length && isWord( l[ end ] ) )
        {
            end++;
        }

        return [ l.substring( start, end ), start, end ];
    }

    /**
     * Get the indentation level (number of leading spaces) of a line.
     */
    getIndent( line: number ): number
    {
        const idx = firstNonspaceIndex( this._lines[ line ] ?? '' );
        return idx === -1 ? ( this._lines[ line ]?.length ?? 0 ) : idx;
    }

    /**
     * Find the next occurrence of 'text' starting after (line, col). Returns null if no match.
     */
    findNext( text: string, startLine: number, startCol: number ): { line: number, col: number } | null
    {
        if ( !text ) return null;

        // Search from startLine:startCol forward
        for ( let i = startLine; i < this._lines.length; i++ )
        {
            const searchFrom = i === startLine ? startCol : 0;
            const idx = this._lines[i].indexOf( text, searchFrom );
            if ( idx !== -1 ) return { line: i, col: idx };
        }

        // Wrap around from beginning
        for ( let i = 0; i <= startLine; i++ )
        {
            const searchUntil = i === startLine ? startCol : this._lines[i].length;
            const idx = this._lines[i].indexOf( text );
            if ( idx !== -1 && idx < searchUntil ) return { line: i, col: idx };
        }

        return null;
    }

    // Mutations (return EditOperations for undo):

    /**
     * Insert text at a position (handles newlines in the inserted text).
     */
    insert( line: number, col: number, text: string ): EditOperation
    {
        const parts = text.split( /\r?\n/ );
        const currentLine = this._lines[ line ] ?? '';
        const before = currentLine.substring( 0, col );
        const after = currentLine.substring( col );

        if ( parts.length === 1 )
        {
            this._lines[ line ] = before + parts[0] + after;
        }
        else
        {
            this._lines[ line ] = before + parts[0];
            for ( let i = 1; i < parts.length - 1; i++ )
            {
                this._lines.splice( line + i, 0, parts[i] );
            }
            this._lines.splice( line + parts.length - 1, 0, parts[ parts.length - 1 ] + after );
        }

        return { type: 'insert', line, col, text };
    }

    /**
     * Delete `length` characters forward from a position (handles crossing line boundaries).
     */
    delete( line: number, col: number, length: number ): EditOperation
    {
        let remaining = length;
        let deletedText = '';
        let currentLine = line;
        let currentCol = col;

        while ( remaining > 0 && currentLine < this._lines.length )
        {
            const l = this._lines[ currentLine ];
            const available = l.length - currentCol;

            if ( remaining <= available )
            {
                deletedText += l.substring( currentCol, currentCol + remaining );
                this._lines[ currentLine ] = l.substring( 0, currentCol ) + l.substring( currentCol + remaining );
                remaining = 0;
            }
            else
            {
                // Delete rest of this line + the newline
                deletedText += l.substring( currentCol ) + '\n';
                remaining -= ( available + 1 ); // +1 for the newline

                // Merge next line into current
                const nextContent = this._lines[ currentLine + 1 ] ?? '';
                this._lines[ currentLine ] = l.substring( 0, currentCol ) + nextContent;
                this._lines.splice( currentLine + 1, 1 );
            }
        }

        return { type: 'delete', line, col, text: deletedText };
    }

    /**
     * Insert a new line after 'afterLine'. If afterLine is -1, inserts at the beginning.
     */
    insertLine( afterLine: number, text: string = '' ): EditOperation
    {
        const insertAt = afterLine + 1;
        this._lines.splice( insertAt, 0, text );
        // Represent as inserting a newline + text at end of afterLine
        return { type: 'insert', line: Math.max( afterLine, 0 ), col: afterLine >= 0 ? this._lines[ afterLine ]?.length ?? 0 : 0, text: '\n' + text };
    }

    /**
     * Remove an entire line and its trailing newline.
     */
    removeLine( line: number ): EditOperation
    {
        const text = this._lines[ line ];
        this._lines.splice( line, 1 );
        if ( this._lines.length === 0 )
        {
            this._lines = [ '' ];
        }
        return { type: 'delete', line: Math.max( line - 1, 0 ), col: line > 0 ? ( this._lines[ line - 1 ]?.length ?? 0 ) : 0, text: '\n' + text };
    }

    replaceLine( line: number, newText: string ): EditOperation
    {
        const oldText = this._lines[ line ];
        this._lines[ line ] = newText;
        return { type: 'replaceLine', line, col: 0, text: newText, oldText };
    }

    /**
     * Apply an edit operation (used by undo/redo).
     */
    applyInverse( op: EditOperation ): EditOperation
    {
        if ( op.type === 'insert' )
        {
            return this.delete( op.line, op.col, op.text.length );
        }
        else if ( op.type === 'replaceLine' )
        {
            return this.replaceLine( op.line, op.oldText! );
        }
        else
        {
            return this.insert( op.line, op.col, op.text );
        }
    }
}

//  _____   _ _ _      _____                 _   _                _| |_    _____       _        _____                         
// |   __|_| |_| |_   |     |___ ___ ___ ___| |_|_|___ ___ ___   |   __|  |  |  |___ _| |___   |     |___ ___ ___ ___ ___ ___ 
// |   __| . | |  _|  |  |  | . | -_|  _| .'|  _| | . |   |_ -|  |   __|  |  |  |   | . | . |  | | | | .'|   | .'| . | -_|  _|
// |_____|___|_|_|    |_____|  _|___|_| |__,|_| |_|___|_|_|___|  |_   _|  |_____|_|_|___|___|  |_|_|_|__,|_|_|__,|_  |___|_|  
//                          |_|                                    |_|                                           |___|

interface EditOperation
{
    type: 'insert' | 'delete' | 'replaceLine';
    line: number;
    col: number;
    text: string;
    oldText?: string; // used by replaceLine to store previous content
}

interface UndoEntry
{
    operations: EditOperation[];
    cursorsBefore: CursorPosition[];
    cursorsAfter: CursorPosition[];
}

class UndoManager
{
    private _undoStack: UndoEntry[] = [];
    private _redoStack: UndoEntry[] = [];
    private _pendingOps: EditOperation[] = [];
    private _pendingCursorsBefore: CursorPosition[] = [];
    private _pendingCursorsAfter: CursorPosition[] = [];
    private _lastPushTime: number = 0;
    private _groupThresholdMs: number;
    private _maxSteps: number;

    constructor( groupThresholdMs: number = 2000, maxSteps: number = 200 )
    {
        this._groupThresholdMs = groupThresholdMs;
        this._maxSteps = maxSteps;
    }

    /**
     * Record an edit operation. Consecutive operations within the time threshold
     * are grouped into a single undo step.
     */
    record( op: EditOperation, cursors: CursorPosition[] ): void
    {
        const now = Date.now();
        const elapsed = now - this._lastPushTime;

        if ( elapsed > this._groupThresholdMs && this._pendingOps.length > 0 )
        {
            this._flush();
        }

        if ( this._pendingOps.length === 0 )
        {
            this._pendingCursorsBefore = cursors.map( c => ( { ...c } ) );
        }

        this._pendingOps.push( op );
        this._pendingCursorsAfter = cursors.map( c => ( { ...c } ) );
        this._lastPushTime = now;

        // New edits clear the redo stack
        this._redoStack.length = 0;
    }

    /**
     * Force-flush pending operations into a final undo step.
     */
    flush( cursorsAfter?: CursorPosition[] ): void
    {
        if ( cursorsAfter && this._pendingOps.length > 0 )
        {
            this._pendingCursorsAfter = cursorsAfter.map( c => ( { ...c } ) );
        }
        this._flush();
    }

    /**
     * Undo the last step. Stores the operations to apply inversely, and returns the cursor state to restore.
     */
    undo( doc: CodeDocument, currentCursors?: CursorPosition[] ): { cursors: CursorPosition[] } | null
    {
        this.flush( currentCursors );

        const entry = this._undoStack.pop();
        if ( !entry ) return null;

        // Apply in reverse order
        const redoOps: EditOperation[] = [];
        for ( let i = entry.operations.length - 1; i >= 0; i-- )
        {
            const inverseOp = doc.applyInverse( entry.operations[i] );
            redoOps.unshift( inverseOp );
        }

        this._redoStack.push( { operations: redoOps, cursorsBefore: entry.cursorsBefore, cursorsAfter: entry.cursorsAfter } );

        return { cursors: entry.cursorsBefore };
    }

    /**
     * Redo the last undone step. Returns the cursor state to restore.
     */
    redo( doc: CodeDocument ): { cursors: CursorPosition[] } | null
    {
        const entry = this._redoStack.pop();
        if ( !entry ) return null;

        // Apply in forward order (redo entries are already in correct order)
        const undoOps: EditOperation[] = [];
        for ( let i = 0; i < entry.operations.length; i++ )
        {
            const inverseOp = doc.applyInverse( entry.operations[i] );
            undoOps.push( inverseOp );
        }

        this._undoStack.push( { operations: undoOps, cursorsBefore: entry.cursorsBefore, cursorsAfter: entry.cursorsAfter } );

        return { cursors: entry.cursorsAfter };
    }

    canUndo(): boolean
    {
        return this._undoStack.length > 0 || this._pendingOps.length > 0;
    }

    canRedo(): boolean
    {
        return this._redoStack.length > 0;
    }

    clear(): void
    {
        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._pendingOps.length = 0;
        this._lastPushTime = 0;
    }

    private _flush(): void
    {
        if ( this._pendingOps.length === 0 ) return;

        this._undoStack.push( {
            operations: [ ...this._pendingOps ],
            cursorsBefore: [ ...this._pendingCursorsBefore ],
            cursorsAfter: [ ...this._pendingCursorsAfter ]
        } );

        this._pendingOps.length = 0;
        this._pendingCursorsBefore = [];
        this._pendingCursorsAfter = [];

        // Limit stack size
        while ( this._undoStack.length > this._maxSteps )
        {
            this._undoStack.shift();
        }
    }
}

//  _____                        _| |_    _____     _         _   _         
// |     |_ _ ___ ___ ___ ___   |   __|  |   __|___| |___ ___| |_|_|___ ___ 
// |   --| | |  _|_ -| . |  _|  |   __|  |__   | -_| | -_|  _|  _| | . |   |
// |_____|___|_| |___|___|_|    |_   _|  |_____|___|_|___|___|_| |_|___|_|_|
//                                |_|

interface CursorPosition
{
    line: number;
    col: number;
}

interface Selection
{
    anchor: CursorPosition;  // where selection started
    head: CursorPosition;    // where cursor is (moves during selection)
}

function posEqual( a: CursorPosition, b: CursorPosition ): boolean
{
    return a.line === b.line && a.col === b.col;
}

function posBefore( a: CursorPosition, b: CursorPosition ): boolean
{
    return a.line < b.line || ( a.line === b.line && a.col < b.col );
}

function selectionStart( sel: Selection ): CursorPosition
{
    return posBefore( sel.anchor, sel.head ) ? sel.anchor : sel.head;
}

function selectionEnd( sel: Selection ): CursorPosition
{
    return posBefore( sel.anchor, sel.head ) ? sel.head : sel.anchor;
}

function selectionIsEmpty( sel: Selection ): boolean
{
    return posEqual( sel.anchor, sel.head );
}

class CursorSet
{
    cursors: Selection[] = [];

    constructor()
    {
        // Start with one cursor at 0,0
        this.cursors = [ { anchor: { line: 0, col: 0 }, head: { line: 0, col: 0 } } ];
    }

    getPrimary(): Selection
    {
        return this.cursors[0];
    }

    /**
     * Set a single cursor position. Clears all secondary cursors and selections.
     */
    set( line: number, col: number ): void
    {
        this.cursors = [ { anchor: { line, col }, head: { line, col } } ];
    }

    // Movement:

    moveLeft( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            this._moveHead( sel, doc, -1, 0, selecting );
        }
        this._merge();
    }

    moveRight( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            this._moveHead( sel, doc, 1, 0, selecting );
        }
        this._merge();
    }

    moveUp( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            this._moveVertical( sel, doc, -1, selecting );
        }
        this._merge();
    }

    moveDown( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            this._moveVertical( sel, doc, 1, selecting );
        }
        this._merge();
    }

    moveToLineStart( doc: CodeDocument, selecting: boolean = false, noIndent: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            const line = sel.head.line;
            const indent = doc.getIndent( line );
            // Toggle between indent and column 0
            const targetCol = ( sel.head.col === indent || noIndent ) ? 0 : indent;
            sel.head = { line, col: targetCol };
            if ( !selecting ) sel.anchor = { ...sel.head };
        }
        this._merge();
    }

    moveToLineEnd( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            const line = sel.head.line;
            sel.head = { line, col: doc.getLine( line ).length };
            if ( !selecting ) sel.anchor = { ...sel.head };
        }
        this._merge();
    }

    moveWordLeft( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            const { line, col } = sel.head;
            if ( col === 0 && line > 0 )
            {
                // Jump to end of previous line
                sel.head = { line: line - 1, col: doc.getLine( line - 1 ).length };
            }
            else
            {
                const l = doc.getLine( line );
                let c = col;
                // Skip whitespace
                while ( c > 0 && /\s/.test( l[ c - 1 ] ) ) c--;
                // Skip word or symbols
                if ( c > 0 && isWord( l[ c - 1 ] ) )
                {
                    while ( c > 0 && isWord( l[ c - 1 ] ) ) c--;
                }
                else if ( c > 0 )
                {
                    while ( c > 0 && isSymbol( l[ c - 1 ] ) ) c--;
                }
                sel.head = { line, col: c };
            }
            if ( !selecting ) sel.anchor = { ...sel.head };
        }
        this._merge();
    }

    moveWordRight( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            const { line, col } = sel.head;
            const l = doc.getLine( line );
            if ( col >= l.length && line < doc.lineCount - 1 )
            {
                // Jump to start of next line
                sel.head = { line: line + 1, col: 0 };
            }
            else
            {
                let c = col;
                // Skip leading whitespace first
                while ( c < l.length && /\s/.test( l[ c ] ) ) c++;
                // Then skip word or symbols to end of group
                if ( c < l.length && isWord( l[ c ] ) )
                {
                    while ( c < l.length && isWord( l[ c ] ) ) c++;
                }
                else if ( c < l.length && isSymbol( l[ c ] ) )
                {
                    while ( c < l.length && isSymbol( l[ c ] ) ) c++;
                }
                sel.head = { line, col: c };
            }
            if ( !selecting ) sel.anchor = { ...sel.head };
        }
        this._merge();
    }

    selectAll( doc: CodeDocument ): void
    {
        const lastLine = doc.lineCount - 1;
        this.cursors = [ {
            anchor: { line: 0, col: 0 },
            head: { line: lastLine, col: doc.getLine( lastLine ).length }
        } ];
    }

    // Multi-cursor:

    addCursor( line: number, col: number ): void
    {
        this.cursors.push( { anchor: { line, col }, head: { line, col } } );
        this._merge();
    }

    removeSecondaryCursors(): void
    {
        this.cursors = [ this.cursors[0] ];
    }

    /**
     * Returns cursor indices sorted by head position, bottom-to-top (last in doc first)
     * to ensure earlier cursors' positions stay valid.
     */
    sortedIndicesBottomUp(): number[]
    {
        return this.cursors
            .map( ( _, i ) => i )
            .sort( ( a, b ) =>
            {
                const ah = this.cursors[a].head;
                const bh = this.cursors[b].head;
                return bh.line !== ah.line ? bh.line - ah.line : bh.col - ah.col;
            } );
    }

    /**
     * After editing at (line, col), shift all other cursors on the same line
     * that are at or after `afterCol` by `colDelta`. Also handles line shifts
     * for multi-line inserts/deletes via `lineDelta`.
     */
    adjustOthers( skipIdx: number, line: number, afterCol: number, colDelta: number, lineDelta: number = 0 ): void
    {
        for ( let i = 0; i < this.cursors.length; i++ )
        {
            if ( i === skipIdx ) continue;
            const c = this.cursors[i];

            // Adjust head
            if ( lineDelta !== 0 && c.head.line > line )
            {
                c.head = { line: c.head.line + lineDelta, col: c.head.col };
            }
            else if ( c.head.line === line && c.head.col >= afterCol )
            {
                c.head = { line: c.head.line + lineDelta, col: c.head.col + colDelta };
            }

            // Adjust anchor
            if ( lineDelta !== 0 && c.anchor.line > line )
            {
                c.anchor = { line: c.anchor.line + lineDelta, col: c.anchor.col };
            }
            else if ( c.anchor.line === line && c.anchor.col >= afterCol )
            {
                c.anchor = { line: c.anchor.line + lineDelta, col: c.anchor.col + colDelta };
            }
        }
    }

    // Queries:

    hasSelection( index: number = 0 ): boolean
    {
        const sel = this.cursors[ index ];
        return sel ? !posEqual( sel.anchor, sel.head ) : false;
    }

    getSelectedText( doc: CodeDocument, index: number = 0 ): string
    {
        const sel = this.cursors[ index ];
        if ( !sel || selectionIsEmpty( sel ) ) return '';

        const start = selectionStart( sel );
        const end = selectionEnd( sel );

        if ( start.line === end.line )
        {
            return doc.getLine( start.line ).substring( start.col, end.col );
        }

        const lines: string[] = [];
        lines.push( doc.getLine( start.line ).substring( start.col ) );
        for ( let i = start.line + 1; i < end.line; i++ )
        {
            lines.push( doc.getLine( i ) );
        }
        lines.push( doc.getLine( end.line ).substring( 0, end.col ) );
        return lines.join( '\n' );
    }

    getCursorPositions(): CursorPosition[]
    {
        return this.cursors.map( s => ( { ...s.head } ) );
    }

    private _moveHead( sel: Selection, doc: CodeDocument, dx: number, _dy: number, selecting: boolean ): void
    {
        const { line, col } = sel.head;

        // If there's a selection and we're not extending it, collapse to the edge
        if ( !selecting && !selectionIsEmpty( sel ) )
        {
            const target = dx < 0 ? selectionStart( sel ) : selectionEnd( sel );
            sel.head = { ...target };
            sel.anchor = { ...target };
            return;
        }

        if ( dx < 0 )
        {
            if ( col > 0 )
            {
                sel.head = { line, col: col - 1 };
            }
            else if ( line > 0 )
            {
                sel.head = { line: line - 1, col: doc.getLine( line - 1 ).length };
            }
        }
        else if ( dx > 0 )
        {
            const lineLen = doc.getLine( line ).length;
            if ( col < lineLen )
            {
                sel.head = { line, col: col + 1 };
            }
            else if ( line < doc.lineCount - 1 )
            {
                sel.head = { line: line + 1, col: 0 };
            }
        }

        if ( !selecting ) sel.anchor = { ...sel.head };
    }

    private _moveVertical( sel: Selection, doc: CodeDocument, direction: number, selecting: boolean ): void
    {
        const { line, col } = sel.head;
        const newLine = line + direction;

        if ( newLine < 0 || newLine >= doc.lineCount ) return;

        const newLineLen = doc.getLine( newLine ).length;
        sel.head = { line: newLine, col: Math.min( col, newLineLen ) };

        if ( !selecting ) sel.anchor = { ...sel.head };
    }

    /**
     * Merge overlapping cursors/selections. Keeps the first one when duplicates exist.
     */
    private _merge(): void
    {
        if ( this.cursors.length <= 1 ) return;

        // Sort by head position
        this.cursors.sort( ( a, b ) => {
            if ( a.head.line !== b.head.line ) return a.head.line - b.head.line;
            return a.head.col - b.head.col;
        } );

        const merged: Selection[] = [ this.cursors[0] ];

        for ( let i = 1; i < this.cursors.length; i++ )
        {
            const prev = merged[ merged.length - 1 ];
            const curr = this.cursors[i];

            if ( posEqual( prev.head, curr.head ) )
            {
                // Same position — skip duplicate
                continue;
            }

            merged.push( curr );
        }

        this.cursors = merged;
    }
}

//  _____       _     _____   _ _ _              ____  _____ _____ 
// |     |___ _| |___|   __|_| |_| |_ ___ ___   |    \|     |     |
// |   --| . | . | -_|   __| . | |  _| . |  _|  |  |  |  |  | | | |
// |_____|___|___|___|_____|___|_|_| |___|_|    |____/|_____|_|_|_|

const g = globalThis as any;
const TOKEN_CLASS_MAP: Record<string, string> = {
    'keyword':      'cm-kwd',
    'statement':    'cm-std',
    'type':         'cm-typ',
    'builtin':      'cm-bln',
    'string':       'cm-str',
    'comment':      'cm-com',
    'number':       'cm-dec',
    'method':       'cm-mtd',
    'symbol':       'cm-sym',
    'enum':         'cm-enu',
    'preprocessor': 'cm-ppc',
    'variable':     'cm-var',
};

const Area = LX.Area;
const Panel = LX.Panel;
const Tabs = LX.Tabs;
const ContextMenu = LX.ContextMenu;

interface CodeTab
{
    name: string;
    dom: HTMLElement;
    doc: CodeDocument;
    cursorSet: CursorSet;
    undoManager: UndoManager;
    language: string;
    title?: string;
    path?: string;
}

                                     
//  _____             _ _ _____         
// |   __|___ ___ ___| | | __  |___ ___ 
// |__   |  _|  _| . | | | __ -| .'|  _|
// |_____|___|_| |___|_|_|_____|__,|_|

class ScrollBar
{
    static SIZE = 10;

    root: HTMLElement;
    thumb: HTMLElement;

    private _vertical: boolean;
    private _thumbPos: number = 0;      // current thumb offset in px
    private _thumbRatio: number = 0;    // thumb size as fraction of track (0..1)
    private _lastMouse: number = 0;
    private _onDrag: ( ( delta: number ) => void ) | null = null;

    get visible(): boolean { return !this.root.classList.contains( 'hidden' ); }
    get isVertical(): boolean { return this._vertical; }

    constructor( vertical: boolean, onDrag: ( delta: number ) => void )
    {
        this._vertical = vertical;
        this._onDrag = onDrag;

        this.root = LX.makeElement( 'div', `lexcodescrollbar hidden ${vertical ? 'vertical' : 'horizontal'}` );

        this.thumb = LX.makeElement( 'div' );
        this.thumb.addEventListener( 'mousedown', ( e: MouseEvent ) => this._onMouseDown( e ) );
        this.root.appendChild( this.thumb );
    }

    setThumbRatio( ratio: number ): void
    {
        this._thumbRatio = LX.clamp( ratio, 0, 1 );
        const needed = this._thumbRatio < 1;
        this.root.classList.toggle( 'hidden', !needed );

        if ( needed )
        {
            if ( this._vertical )
                this.thumb.style.height = ( this._thumbRatio * 100 ) + '%';
            else
                this.thumb.style.width = ( this._thumbRatio * 100 ) + '%';
        }
    }

    syncToScroll( scrollPos: number, scrollMax: number ): void
    {
        if ( scrollMax <= 0 ) return;
        const trackSize = this._vertical ? this.root.offsetHeight : this.root.offsetWidth;
        const thumbSize = this._vertical ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        const available = trackSize - thumbSize;
        if ( available <= 0 ) return;

        this._thumbPos = ( scrollPos / scrollMax ) * available;
        this._applyPosition();
    }

    applyDragDelta( delta: number, scrollMax: number ): number
    {
        const trackSize = this._vertical ? this.root.offsetHeight : this.root.offsetWidth;
        const thumbSize = this._vertical ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        const available = trackSize - thumbSize;
        if ( available <= 0 ) return 0;

        this._thumbPos = LX.clamp( this._thumbPos + delta, 0, available );
        this._applyPosition();

        return ( this._thumbPos / available ) * scrollMax;
    }

    private _applyPosition(): void
    {
        if ( this._vertical )
            this.thumb.style.top = this._thumbPos + 'px';
        else
            this.thumb.style.left = this._thumbPos + 'px';
    }

    private _onMouseDown( e: MouseEvent ): void
    {
        const doc = document;
        this._lastMouse = this._vertical ? e.clientY : e.clientX;

        const onMouseMove = ( e: MouseEvent ) =>
        {
            const current = this._vertical ? e.clientY : e.clientX;
            const delta = current - this._lastMouse;
            this._lastMouse = current;
            this._onDrag?.( delta );
            e.stopPropagation();
            e.preventDefault();
        };

        const onMouseUp = () =>
        {
            doc.removeEventListener( 'mousemove', onMouseMove );
            doc.removeEventListener( 'mouseup', onMouseUp );
        };

        doc.addEventListener( 'mousemove', onMouseMove );
        doc.addEventListener( 'mouseup', onMouseUp );
        e.stopPropagation();
        e.preventDefault();
    }
}

/**
 * @class CodeEditor
 * The main editor class. Wires Document, Tokenizer, CursorSet, UndoManager
 * together with the DOM.
 */
export class CodeEditor
{
    static __instances: CodeEditor[] = [];

    language: LanguageDef;

    // DOM:
    area: typeof Area;
    baseArea: typeof Area;
    codeArea: typeof Area;
    tabs: typeof Tabs;
    root: HTMLElement;
    codeScroller: HTMLElement;
    codeSizer: HTMLElement;
    cursorsLayer: HTMLElement;
    selectionsLayer: HTMLElement;
    lineGutter: HTMLElement;
    vScrollbar!: ScrollBar;
    hScrollbar!: ScrollBar;
    searchBox: HTMLElement | null = null;
    searchLineBox: HTMLElement | null = null;
    currentTab: CodeTab | null = null;
    statusPanel: typeof Panel;
    leftStatusPanel: typeof Panel;
    rightStatusPanel: typeof Panel;

    // Measurements:
    charWidth: number = 0;
    lineHeight: number = 0;
    fontSize: number = 0;
    xPadding: number = 64;  // 4rem left padding in pixels

    // Editor options:
    skipInfo: boolean = false;
    disableEdition: boolean = false;
    skipTabs: boolean = false;
    // useFileExplorer: boolean = false;
    // useAutoComplete: boolean = true;
    allowAddScripts: boolean = true;
    allowClosingTabs: boolean = true;
    allowLoadingFiles: boolean = true;
    tabSize: number = 4;
    highlight: string = 'Plain Text';
    newTabOptions: any[] | null = null;
    // customSuggestions: any[] = [];
    // explorerName: string = 'EXPLORER';

    // Editor callbacks:
    onSave: ( text: string, editor: CodeEditor ) => void;
    onRun: ( text: string, editor: CodeEditor ) => void;
    onCtrlSpace: ( text: string, editor: CodeEditor ) => void;
    onCreateStatusPanel: ( panel: typeof Panel, editor: CodeEditor ) => void;
    onContextMenu: any;
    onNewTab: ( event: MouseEvent ) => void;
    onSelectTab: ( name: string, editor: CodeEditor ) => void;
    onReady: ( ( editor: CodeEditor ) => void ) | undefined;
    onCreateFile: ( ( editor: CodeEditor ) => void ) | undefined;

    private _inputArea!: HTMLTextAreaElement;

    // State:
    private _lineStates: TokenizerState[] = [];     // tokenizer state at end of each line
    private _lineElements: HTMLElement[] = [];      // <pre> element per line
    private _openedTabs: Record<string, CodeTab> = {};
    private _focused: boolean = false;
    private _composing: boolean = false;
    private _keyChain: string | null = null;
    private _wasPaired: boolean = false;
    private _lastAction: string = '';
    private _blinkerInterval: ReturnType<typeof setInterval> | null = null;
    private _cursorVisible: boolean = true;
    private _cursorBlinkRate: number = 550;
    private _clickCount: number = 0;
    private _lastClickTime: number = 0;
    private _lastClickLine: number = -1;
    private _isSearchBoxActive: boolean = false;
    private _isSearchLineBoxActive: boolean = false;
    private _searchMatchCase: boolean = false;
    private _lastTextFound: string = '';
    private _lastSearchPos: { line: number, col: number } | null = null;
    private _discardScroll: boolean = false;
    private _isReady: boolean = false;
    private _lastMaxLineLength: number = 0;
    private _lastLineCount: number = 0;

    private static readonly CODE_MIN_FONT_SIZE = 9;
    private static readonly CODE_MAX_FONT_SIZE = 22;
    private static readonly PAIR_KEYS: Record<string, string> = { '"': '"', "'": "'", '`': '`', '(': ')', '{': '}', '[': ']' };

    get doc(): CodeDocument
    {
        return this.currentTab!.doc;
    }

    get undoManager(): UndoManager
    {
        return this.currentTab!.undoManager;
    }

    get cursorSet(): CursorSet
    {
        return this.currentTab!.cursorSet;
    }

    get codeContainer(): HTMLElement
    {
        return this.currentTab!.dom;
    }

    static getInstances()
    {
        return CodeEditor.__instances;
    }

    constructor( area: typeof Area, options: Record<string, any> = {} )
    {
        g.editor = this;

        CodeEditor.__instances.push( this );

        this.skipInfo = options.skipInfo ?? this.skipInfo;
        this.disableEdition = options.disableEdition ?? this.disableEdition;
        this.skipTabs = options.skipTabs ?? this.skipTabs;
        // this.useFileExplorer = ( options.fileExplorer ?? this.useFileExplorer ) && !this.skipTabs;
        // this.useAutoComplete = options.autocomplete ?? this.useAutoComplete;
        this.allowAddScripts = options.allowAddScripts ?? this.allowAddScripts;
        this.allowClosingTabs = options.allowClosingTabs ?? this.allowClosingTabs;
        this.allowLoadingFiles = options.allowLoadingFiles ?? this.allowLoadingFiles;
        this.highlight = options.highlight ?? this.highlight;
        this.newTabOptions = options.newTabOptions;
        // this.customSuggestions = options.customSuggestions ?? [];
        // this.explorerName = options.explorerName ?? this.explorerName;

        // Editor callbacks
        this.onSave = options.onSave;
        this.onRun = options.onRun;
        this.onCtrlSpace = options.onCtrlSpace;
        this.onCreateStatusPanel = options.onCreateStatusPanel;
        this.onContextMenu = options.onContextMenu;
        this.onNewTab = options.onNewTab;
        this.onSelectTab = options.onSelectTab;
        this.onReady = options.onReady;

        this.language = Tokenizer.getLanguage( this.highlight ) ?? Tokenizer.getLanguage( 'Plain Text' )!;

        // Full editor
        area.root.className = LX.mergeClass( area.root.className, 'codebasearea overflow-hidden flex relative bg-card' );

        this.baseArea = area;
        this.area = new LX.Area( {
            className: 'lexcodeeditor flex flex-col outline-none overflow-hidden size-full select-none bg-inherit relative',
            skipAppend: true
        } );

        const codeAreaClassName = 'lexcodearea scrollbar-hidden flex flex-row flex-auto-fill';

        if ( !this.skipTabs )
        {
            this.tabs = this.area.addTabs( { contentClass: codeAreaClassName, onclose: ( name: string ) => {
                // this._closeTab triggers this onclose!
                delete this._openedTabs[name];
            } } );

            LX.addClass( this.tabs.root.parentElement, 'rounded-t-lg' );

            if ( !this.disableEdition )
            {
                this.tabs.root.parentElement.addEventListener( 'dblclick', ( e: MouseEvent ) => {
                    if ( !this.allowAddScripts ) return;
                    e.preventDefault();
                    this._onCreateNewFile();
                } );
            }

            this.codeArea = this.tabs.area;
        }
        else
        {
            this.codeArea = new LX.Area( { className: codeAreaClassName, skipAppend: true } );
            this.area.attach( this.codeArea );
        }

        this.root = this.area.root;
        area.attach( this.root );

        this.codeScroller = this.codeArea.root;
        // Add Line numbers gutter, only the container, line numbers are in the same line div
        this.lineGutter = LX.makeElement( 'div', 'w-16 mt-8 overflow-hidden absolute top-0 bg-inherit z-1', null, this.codeScroller );
        // Add code sizer, which will have the code elements
        this.codeSizer = LX.makeElement( 'div', 'pseudoparent-tabs w-full', null, this.codeScroller );

        // Cursors and selections
        this.cursorsLayer = LX.makeElement( 'div', 'cursors', null, this.codeSizer );
        this.selectionsLayer = LX.makeElement( 'div', 'selections', null, this.codeSizer );

        // Custom scrollbars
        if ( !this.disableEdition )
        {
            this.vScrollbar = new ScrollBar( true, ( delta ) => {
                const scrollMax = this.codeScroller.scrollHeight - this.codeScroller.clientHeight;
                this.codeScroller.scrollTop = this.vScrollbar.applyDragDelta( delta, scrollMax );
                this._discardScroll = true;
            } );
            this.root.appendChild( this.vScrollbar.root );

            this.hScrollbar = new ScrollBar( false, ( delta ) => {
                const scrollMax = this.codeScroller.scrollWidth - this.codeScroller.clientWidth;
                this.codeScroller.scrollLeft = this.hScrollbar.applyDragDelta( delta, scrollMax );
                this._discardScroll = true;
            } );
            this.root.appendChild( this.hScrollbar.root );

            // Sync scrollbar thumbs on native scroll
            this.codeScroller.addEventListener( 'scroll', () => {
                if ( this._discardScroll )
                {
                    this._discardScroll = false;
                    return;
                }
                this._syncScrollBars();
            } );

            // Wheel: Ctrl+Wheel for font zoom, Shift+Wheel for horizontal scroll
            this.codeScroller.addEventListener( 'wheel', ( e: WheelEvent ) => {
                if ( e.ctrlKey )
                {
                    e.preventDefault();
                    this._applyFontSizeOffset( e.deltaY < 0 ? 1 : -1 );
                    return;
                }

                if ( e.shiftKey )
                {
                    this.codeScroller.scrollLeft += e.deltaY > 0 ? 10 : -10;
                }
            }, { passive: false } );
        }

        // Resize observer
        const codeResizeObserver = new ResizeObserver( () => {
            if ( !this.currentTab ) return;
            this.resize( true );
        } );
        codeResizeObserver.observe( this.codeArea.root );

        if ( !this.disableEdition )
        {
            // Add autocomplete box
            // {
            //     this.autocomplete = document.createElement( 'div' );
            //     this.autocomplete.className = 'autocomplete';
            //     this.codeArea.attach( this.autocomplete );
            // }

            const searchBoxClass = 'searchbox bg-card min-w-96 absolute z-100 top-8 right-2 rounded-lg border-colored overflow-y-scroll opacity-0';

            // Add search box
            {
                const box = LX.makeElement( 'div', searchBoxClass, null, this.codeArea );
                const searchPanel = new LX.Panel();
                box.appendChild( searchPanel.root );

                searchPanel.sameLine();
                const textComponent = searchPanel.addText( null, '', null, { placeholder: 'Find', inputClass: 'bg-secondary' } );
                searchPanel.addButton( null, 'MatchCaseButton', ( v: boolean ) => {
                    this._searchMatchCase = v;
                    this._doSearch();
                }, { icon: 'CaseSensitive', selectable: true, buttonClass: 'link', title: 'Match Case',
                    tooltip: true } );
                searchPanel.addButton( null, 'up', () => this._doSearch( null, true ), { icon: 'ArrowUp', buttonClass: 'ghost', title: 'Previous Match',
                    tooltip: true } );
                searchPanel.addButton( null, 'down', () => this._doSearch(), { icon: 'ArrowDown', buttonClass: 'ghost', title: 'Next Match',
                    tooltip: true } );
                searchPanel.addButton( null, 'x', this._doHideSearch.bind( this ), { icon: 'X', buttonClass: 'ghost', title: 'Close',
                    tooltip: true } );
                searchPanel.endLine();

                const searchInput = textComponent.root.querySelector( 'input' );
                searchInput?.addEventListener( 'keyup', ( e: KeyboardEvent ) => {
                    if ( e.key == 'Escape' ) this._doHideSearch();
                    else if ( e.key == 'Enter' ) this._doSearch( ( e.target as HTMLInputElement ).value, !!e.shiftKey );
                } );

                this.searchBox = box;
            }

            // Add search LINE box
            {
                const box = LX.makeElement( 'div', searchBoxClass, null, this.codeArea );
                const searchPanel = new LX.Panel();
                box.appendChild( searchPanel.root );

                searchPanel.sameLine();
                const textComponent = searchPanel.addText( null, '', ( value: string ) => {
                    searchInput.value = ':' + value.replaceAll( ':', '' );
                    this._doGotoLine( parseInt( searchInput.value.slice( 1 ) ) );
                }, { className: 'flex-auto-fill', placeholder: 'Go to line', trigger: 'input' } );
                searchPanel.addButton( null, 'x', this._doHideSearch.bind( this ), { icon: 'X', title: 'Close', buttonClass: 'ghost',
                    tooltip: true } );
                searchPanel.endLine();

                const searchInput = textComponent.root.querySelector( 'input' );
                searchInput.addEventListener( 'keyup', ( e: KeyboardEvent ) => {
                    if ( e.key == 'Escape' ) this._doHideSearch();
                } );

                searchPanel.addText( null, 'Type a line number to go to (from 0 to 0).', null,
                    { disabled: true, inputClass: 'bg-none', signal: '@line-number-range' } );

                this.searchLineBox = box;
            }
        }

        // Load any font size from local storage
        // If not, use default size and make sure it's sync by not hardcoding a number by default here
        const savedFontSize = window.localStorage.getItem( 'lexcodeeditor-font-size' );
        if ( savedFontSize )
        {
            this._setFontSize( parseInt( savedFontSize ), false );
        }
        else
        {
            const r: any = document.querySelector( ':root' );
            const s = getComputedStyle( r );
            this.fontSize = parseInt( s.getPropertyValue( '--code-editor-font-size' ) );
            this._measureChar();
        }

        LX.emitSignal( '@font-size', this.fontSize );

        // Hidden textarea for capturing keyboard input (dead keys, IME, etc.)
        this._inputArea = LX.makeElement( 'textarea', 'absolute opacity-0 w-[1px] h-[1px] top-0 left-0 overflow-hidden resize-none', '', this.root );
        this._inputArea.setAttribute( 'autocorrect', 'off' );
        this._inputArea.setAttribute( 'autocapitalize', 'off' );
        this._inputArea.setAttribute( 'spellcheck', 'false' );
        this._inputArea.tabIndex = 0;

        // Events:
        this._inputArea.addEventListener( 'keydown', this._onKeyDown.bind( this ) );
        this._inputArea.addEventListener( 'compositionstart', () => this._composing = true );
        this._inputArea.addEventListener( 'compositionend', ( e: CompositionEvent ) => {
            this._composing = false;
            this._inputArea.value = '';
            if ( e.data ) this._doInsertChar( e.data );
        } );
        this._inputArea.addEventListener( 'input', () => {
            if ( this._composing ) return;
            const val = this._inputArea.value;
            if ( val )
            {
                this._inputArea.value = '';
                this._doInsertChar( val );
            }
        } );
        this._inputArea.addEventListener( 'focus', () => this._setFocused( true ) );
        this._inputArea.addEventListener( 'blur', () => this._setFocused( false ) );
        this.root.addEventListener( 'mousedown', this._onMouseDown.bind( this ) );
        this.root.addEventListener( 'contextmenu', this._onContextMenu.bind( this ) );

        // Bottom status panel
        this.statusPanel = this._createStatusPanel( options );
        if ( this.statusPanel )
        {
            // Don't do this.area.attach here, since it will append to the tabs area.
            this.area.root.appendChild( this.statusPanel.root );
        }

        if ( this.allowAddScripts )
        {
            this.onCreateFile = options.onCreateFile;
            this._addTab( '+', {
                selected: false,
                title: 'Create file'
            } );
        }

        // Starter code tab container
        this._addTab( options.name || 'untitled', {
            language: this.highlight,
            title: options.title
        } );

        // Initial render
        this._renderAllLines();
        this._renderCursors();
    }

    setText( text: string ): void
    {
        this.doc.setText( text );
        this.cursorSet.set( 0, 0 );
        this.undoManager.clear();
        this._lineStates = [];
        this._renderAllLines();
        this._renderCursors();
        this._renderSelections();
        this.resize( true );
    }

    getText(): string
    {
        return this.doc.getText();
    }

    setLanguage( name: string ): void
    {
        const lang = Tokenizer.getLanguage( name );
        if ( !lang ) return;

        this.language = lang;

        if ( this.currentTab )
        {
            this.currentTab.language = name;
            this.tabs.setIcon( this.currentTab.name, lang.icon );
        }

        this._lineStates = [];
        this._renderAllLines();
        LX.emitSignal( '@highlight', name );
    }

    focus(): void
    {
        this._inputArea.focus();
    }

    private _addTab( name: string, options: Record<string, any> = {} ): string
    {
        const isNewTabButton = name === '+';
        const dom = LX.makeElement( 'div', 'code' );
        const langName = options.language ?? 'Plain Text';
        const langDef = Tokenizer.getLanguage( langName );
        const icon = isNewTabButton ? null : ( langDef?.icon ?? 'AlignLeft text-neutral-500' );
        const selected = options.selected ?? true;

        const codeTab : CodeTab = {
            name,
            dom,
            doc: new CodeDocument(),
            cursorSet: new CursorSet(),
            undoManager: new UndoManager(),
            language: langName,
            title: options.title ?? name
        };
        
        this._openedTabs[name] = codeTab;

        this.tabs.add( name, dom, {
            selected,
            icon,
            fixed: isNewTabButton,
            title: codeTab.title,
            onSelect: this._onSelectTab.bind( this, isNewTabButton ),
            onContextMenu: this._onContextMenuTab.bind( this, isNewTabButton ),
            allowDelete: this.allowClosingTabs,
            indexOffset: options.indexOffset
        } );

        // Move into the sizer..
        this.codeSizer.appendChild( dom );

        if ( selected )
        {
            this.currentTab = codeTab;
            this._updateDataInfoPanel( '@tab-name', name );
        }

        return name;
    }

    private _closeTab( name: string )
    {
        if ( !this.allowClosingTabs ) return;

        this.tabs.delete( name );
        const tab = this._openedTabs[name];
        if ( tab )
        {
            tab.dom.remove();
            delete this._openedTabs[name];
        }

        // If we closed the current tab, switch to the first available
        if ( this.currentTab?.name === name )
        {
            const remaining = Object.keys( this._openedTabs ).filter( k => k !== '+' );
            if ( remaining.length > 0 )
            {
                this.tabs.select( remaining[0] );
            }
            else
            {
                this.currentTab = null;
            }
        }
    }

    private _onSelectTab( isNewTabButton: boolean, event: MouseEvent, name: string ): void
    {
        if ( this.disableEdition )
        {
            return;
        }

        if ( isNewTabButton )
        {
            this._onNewTab( event );
            return;
        }

        this.currentTab = this._openedTabs[name];

        this._updateDataInfoPanel( '@tab-name', name );

        this.language = Tokenizer.getLanguage( this.currentTab.language ) ?? Tokenizer.getLanguage( 'Plain Text' )!;
        LX.emitSignal( '@highlight', this.currentTab.language );
        
        this._rebuildLines();
        this._afterCursorMove();

        if ( !isNewTabButton && this.onSelectTab )
        {
            this.onSelectTab( name, this );
        }
    }

    private _onNewTab( event: MouseEvent )
    {
        if ( this.onNewTab )
        {
            this.onNewTab( event );
            return;
        }

        const dmOptions = this.newTabOptions ?? [
            { name: 'Create file', icon: 'FilePlus', callback: this._onCreateNewFile.bind( this ) },
            { name: 'Load file', icon: 'FileUp', disabled: !this.allowLoadingFiles, callback: this._doLoadFromFile.bind( this ) }
        ];

        LX.addDropdownMenu( event.target, dmOptions, { side: 'bottom', align: 'start' } );
    }

    private _onCreateNewFile()
    {
        let options: any = {};

        if ( this.onCreateFile )
        {
            options = this.onCreateFile( this );
            // Skip adding new file
            if ( !options )
            { 
                return;
            }
        }

        const name = options.name ?? 'unnamed.js';
        this._addTab( name, {
            selected: true,
            title: name,
            indexOffset: options.indexOffset,
            language: options.language ?? 'JavaScript'
        } );
    }

    private _onContextMenuTab( isNewTabButton: boolean = false, event: any, name: string )
    {
        if ( isNewTabButton )
        {
            return;
        }

        LX.addDropdownMenu( event.target, [
            { name: 'Close', kbd: 'MWB', disabled: !this.allowClosingTabs, callback: () => {
                this._closeTab( name );
            } },
            { name: 'Close Others', disabled: !this.allowClosingTabs, callback: () => {
                for ( const key of Object.keys( this.tabs.tabs ) )
                {
                    if ( key === '+' || key === name ) continue;
                    this._closeTab( key );
                }
            } },
            { name: 'Close All', disabled: !this.allowClosingTabs, callback: () => {
                for ( const key of Object.keys( this.tabs.tabs ) )
                {
                    if ( key === '+' ) continue;
                    this._closeTab( key );
                }
            } },
            null,
            { name: 'Copy Path', icon: 'Copy', callback: () => {
                navigator.clipboard.writeText( this._openedTabs[name].path ?? '' );
            } }
        ], { side: 'bottom', align: 'start', event } );
    }

    private _measureChar(): void
    {
        const parentContainer = LX.makeContainer( null, 'lexcodeeditor', '', document.body );
        const container = LX.makeContainer( null, 'code', '', parentContainer );
        const line = document.createElement( 'pre' );
        container.appendChild( line );
        const measurer = document.createElement( 'span' );
        measurer.className = 'codechar';
        measurer.style.visibility = 'hidden';
        measurer.textContent = 'M';
        line.appendChild( measurer );

        // Use requestAnimationFrame to ensure the element is rendered
        requestAnimationFrame( () =>
        {
            const rect = measurer.getBoundingClientRect();
            this.charWidth = rect.width || 7;
            this.lineHeight = parseFloat( getComputedStyle( this.root ).getPropertyValue( '--code-editor-row-height' ) ) || 20;
            LX.deleteElement( parentContainer );

            // Re-render cursors with correct measurements
            this._renderCursors();
            this._renderSelections();
            this.resize( true );

            if ( !this._isReady )
            {
                this._isReady = true;
                if ( this.onReady )
                {
                    this.onReady( this );
                }
                console.log( `[LX.CodeEditor] Ready! (font size: ${this.fontSize}px)` );
            }
        } );
    }

    private _createStatusPanel( options: Record<string, any> = {} )
    {
        if ( this.skipInfo )
        {
            return;
        }

        let panel = new LX.Panel( { className: 'lexcodetabinfo bg-card flex flex-row flex-auto-keep', height: 'auto' } );

        if ( this.onCreateStatusPanel )
        {
            this.onCreateStatusPanel( panel, this );
        }

        let leftStatusPanel = this.leftStatusPanel = new LX.Panel( { id: 'FontSizeZoomStatusComponent',
            className: 'pad-xs content-center items-center flex-auto-keep', width: 'auto', height: 'auto' } );
        leftStatusPanel.sameLine();

        // Zoom Component
        leftStatusPanel.addButton( null, 'ZoomOutButton', this._decreaseFontSize.bind( this ), { icon: 'ZoomOut', buttonClass: 'ghost sm',
            title: 'Zoom Out', tooltip: true } );
        leftStatusPanel.addLabel( this.fontSize, { fit: true, signal: '@font-size' } );
        leftStatusPanel.addButton( null, 'ZoomInButton', this._increaseFontSize.bind( this ), { icon: 'ZoomIn', buttonClass: 'ghost sm',
            title: 'Zoom In', tooltip: true } );
        leftStatusPanel.endLine( 'justify-start' );
        panel.attach( leftStatusPanel.root );

        // Filename cursor data
        let rightStatusPanel = this.rightStatusPanel = new LX.Panel( { className: 'pad-xs content-center items-center', height: 'auto' } );
        rightStatusPanel.sameLine();
        rightStatusPanel.addLabel( this.currentTab?.title ?? '', { id: 'EditorFilenameStatusComponent', fit: true, inputClass: 'text-xs',
            signal: '@tab-name' } );
        rightStatusPanel.addButton( null, 'Ln 1, Col 1', this._doOpenLineSearch.bind( this ), {
            id: 'EditorSelectionStatusComponent',
            buttonClass: 'outline xs',
            fit: true,
            signal: '@cursor-data'
        } );

        const tabSizeButton = rightStatusPanel.addButton( null, 'Spaces: ' + this.tabSize, ( value: any, event: any ) => {

            const _onNewTabSize = ( v: string ) => {
                this.tabSize = parseInt( v );
                this._rebuildLines();
                this._updateDataInfoPanel( '@tab-spaces', `Spaces: ${this.tabSize}` );
            }

            const dd = LX.addDropdownMenu(
                tabSizeButton.root,
                [ '2', '4', '8' ].map( ( v ) => { return { name: v, className: 'w-full place-content-center', callback: _onNewTabSize } } ),
                { side: 'top', align: 'end' }
            );
            LX.addClass( dd.root, 'min-w-16! items-center' );

        }, { id: 'EditorIndentationStatusComponent', buttonClass: 'outline xs', signal: '@tab-spaces' } );

        const langButton = rightStatusPanel.addButton( '<b>{ }</b>', this.highlight, ( value: any, event: any ) => {

            const dd = LX.addDropdownMenu(
                langButton.root,
                Tokenizer.getRegisteredLanguages().map( ( v ) => {
                    const lang = Tokenizer.getLanguage( v );
                    const icon: any = lang?.icon;
                    const iconData = icon ? icon.split( ' ' ) : [];
                    return {
                        name: v,
                        icon: iconData[0],
                        className: 'w-full place-content-center',
                        svgClass: iconData.slice( 1 ).join( ' ' ),
                        callback: ( v: string ) => this.setLanguage( v )
                    };
                } ),
                { side: 'top', align: 'end' }
            );
            LX.addClass( dd.root, 'min-w-min! items-center' );

        }, { id: 'EditorLanguageStatusComponent', nameWidth: 'auto', buttonClass: 'outline xs', signal: '@highlight', title: '' } );

        rightStatusPanel.endLine( 'justify-end' );
        panel.attach( rightStatusPanel.root );

        const itemVisibilityMap: Record<string, boolean> = {
            'Font Size Zoom': options.statusShowFontSizeZoom ?? true,
            'Editor Filename': options.statusShowEditorFilename ?? true,
            'Editor Selection': options.statusShowEditorSelection ?? true,
            'Editor Indentation': options.statusShowEditorIndentation ?? true,
            'Editor Language': options.statusShowEditorLanguage ?? true
        };

        const _setVisibility = ( itemName: string ) => {
            const b = panel.root.querySelector( `#${itemName.replaceAll( ' ', '' )}StatusComponent` );
            console.assert( b, `${itemName} has no status button!` );
            b.classList.toggle( 'hidden', !itemVisibilityMap[itemName] );
        };

        for ( const [ itemName, v ] of Object.entries( itemVisibilityMap ) )
        {
            _setVisibility( itemName );
        }

        panel.root.addEventListener( 'contextmenu', ( e: any ) => {
            if ( e.target
                && ( e.target.classList.contains( 'lexpanel' )
                    || e.target.classList.contains( 'lexinlinecomponents' ) ) )
            {
                return;
            }

            const menuOptions = Object.keys( itemVisibilityMap ).map( ( itemName, idx ) => {
                const item: any = {
                    name: itemName,
                    icon: 'Check',
                    callback: () => {
                        itemVisibilityMap[itemName] = !itemVisibilityMap[itemName];
                        _setVisibility( itemName );
                    }
                };
                if ( !itemVisibilityMap[itemName] ) delete item.icon;
                return item;
            } );

            LX.addDropdownMenu( e.target, menuOptions, { side: 'top', align: 'start' } );
        } );

        return panel;
    }

    private _updateDataInfoPanel( signal: string, value: string )
    {
        if ( this.skipInfo ) return;

        if ( this.cursorSet.cursors.length > 1 )
        {
            value = '';
        }

        LX.emitSignal( signal, value );
    }

    /**
     * Tokenize a line and return its innerHTML with syntax highlighting spans.
     */
    private _tokenizeLine( lineIndex: number ): { html: string; endState: TokenizerState }
    {
        const prevState = lineIndex > 0
            ? ( this._lineStates[ lineIndex - 1 ] ?? Tokenizer.initialState() )
            : Tokenizer.initialState();

        const lineText = this.doc.getLine( lineIndex );
        const result = Tokenizer.tokenizeLine( lineText, this.language, prevState );

        // Build HTML
        const langClass = this.language.name.toLowerCase().replace( /[^a-z]/g, '' );
        let html = '';
        for ( const token of result.tokens )
        {
            const cls = TOKEN_CLASS_MAP[ token.type ];
            const escaped = token.value
                .replace( /&/g, '&amp;' )
                .replace( /</g, '&lt;' )
                .replace( />/g, '&gt;' );
            if ( cls )
            {
                html += `<span class="${cls} ${langClass}">${escaped}</span>`;
            }
            else
            {
                html += escaped;
            }
        }

        return { html: html || '&nbsp;', endState: result.state };
    }

    /**
     * Render all lines from scratch.
     */
    private _renderAllLines(): void
    {
        this.codeContainer.innerHTML = '';
        this._lineElements = [];
        this._lineStates = [];

        for ( let i = 0; i < this.doc.lineCount; i++ )
        {
            this._appendLineElement( i );
        }
    }

    /**
     * Gets the html for the line gutter.
     */
    private _getGutterHtml( lineIndex: number ): string
    {
        return `<span class="line-gutter">${lineIndex + 1}</span>`;
    }

    /**
     * Create and append a <pre> element for a line.
     */
    private _appendLineElement( lineIndex: number ): void
    {
        const { html, endState } = this._tokenizeLine( lineIndex );
        this._lineStates[ lineIndex ] = endState;

        const pre = document.createElement( 'pre' );
        pre.innerHTML = this._getGutterHtml( lineIndex ) + html;
        this.codeContainer.appendChild( pre );
        this._lineElements[ lineIndex ] = pre;
    }

    /**
     * Re-render a single line's content (after editing).
     */
    private _updateLine( lineIndex: number ): void
    {
        const { html, endState } = this._tokenizeLine( lineIndex );
        const oldState = this._lineStates[ lineIndex ];
        this._lineStates[ lineIndex ] = endState;

        if ( this._lineElements[ lineIndex ] )
        {
            this._lineElements[ lineIndex ].innerHTML = this._getGutterHtml( lineIndex ) + html;
        }

        // If the tokenizer state changed (e.g. opened/closed a block comment),
        // re-render subsequent lines until states stabilize
        if ( !this._statesEqual( oldState, endState ) )
        {
            for ( let i = lineIndex + 1; i < this.doc.lineCount; i++ )
            {
                const { html: nextHtml, endState: nextEnd } = this._tokenizeLine( i );
                const nextOld = this._lineStates[ i ];
                this._lineStates[ i ] = nextEnd;
                if ( this._lineElements[ i ] )
                {
                    this._lineElements[ i ].innerHTML = this._getGutterHtml( lineIndex ) + nextHtml;
                }
                if ( this._statesEqual( nextOld, nextEnd ) ) break;
            }
        }
    }

    /**
     * Rebuild line elements after structural changes (insert/delete lines).
     */
    private _rebuildLines(): void
    {
        // Diff: if count matches, just update content; otherwise full rebuild
        if ( this._lineElements.length === this.doc.lineCount )
        {
            for ( let i = 0; i < this.doc.lineCount; i++ )
            {
                this._updateLine( i );
            }
        }
        else
        {
            this._renderAllLines();
        }
        this.resize();
    }

    private _statesEqual( a: TokenizerState | undefined, b: TokenizerState ): boolean
    {
        if ( !a ) return false;
        if ( a.stack.length !== b.stack.length ) return false;
        for ( let i = 0; i < a.stack.length; i++ )
        {
            if ( a.stack[i] !== b.stack[i] ) return false;
        }
        return true;
    }

    private _updateActiveLine(): void
    {
        const hasSelection = this.cursorSet.hasSelection();
        const activeLine = this.cursorSet.getPrimary().head.line;
        const activeCol = this.cursorSet.getPrimary().head.col;
        for ( let i = 0; i < this._lineElements.length; i++ )
        {
            this._lineElements[i].classList.toggle( 'active-line', !hasSelection && i === activeLine );
        }

        this._updateDataInfoPanel( '@cursor-data', `Ln ${activeLine + 1}, Col ${activeCol + 1}` );
    }

    private _renderCursors(): void
    {
        this.cursorsLayer.innerHTML = '';

        for ( const sel of this.cursorSet.cursors )
        {
            const el = document.createElement( 'div' );
            el.className = 'cursor';
            el.innerHTML = '&nbsp;';
            el.style.left = ( sel.head.col * this.charWidth + this.xPadding ) + 'px';
            el.style.top = ( sel.head.line * this.lineHeight ) + 'px';
            this.cursorsLayer.appendChild( el );
        }

        this._updateActiveLine();
    }

    private _renderSelections(): void
    {
        this.selectionsLayer.innerHTML = '';

        for ( const sel of this.cursorSet.cursors )
        {
            if ( selectionIsEmpty( sel ) ) continue;

            const start = selectionStart( sel );
            const end = selectionEnd( sel );

            for ( let line = start.line; line <= end.line; line++ )
            {
                const lineText = this.doc.getLine( line );
                const fromCol = line === start.line ? start.col : 0;
                const toCol = line === end.line ? end.col : lineText.length;

                if ( fromCol === toCol ) continue;

                const div = document.createElement( 'div' );
                div.className = 'lexcodeselection';
                div.style.top = ( line * this.lineHeight ) + 'px';
                div.style.left = ( fromCol * this.charWidth + this.xPadding ) + 'px';
                div.style.width = ( ( toCol - fromCol ) * this.charWidth ) + 'px';
                this.selectionsLayer.appendChild( div );
            }
        }
    }

    private _setFocused( focused: boolean ): void
    {
        this._focused = focused;

        if ( focused )
        {
            this.cursorsLayer.classList.add( 'show' );
            this.selectionsLayer.classList.add( 'show' );
            this.selectionsLayer.classList.remove( 'unfocused' );
            this._startBlinker();
        }
        else
        {
            this.cursorsLayer.classList.remove( 'show' );
            if ( !this._isSearchBoxActive )
            {
                this.selectionsLayer.classList.add( 'unfocused' );
            }
            else
            {
                this.selectionsLayer.classList.add( 'show' );
            }
            this._stopBlinker();
        }
    }

    private _startBlinker(): void
    {
        this._stopBlinker();
        this._cursorVisible = true;
        this._setCursorVisibility( true );

        this._blinkerInterval = setInterval( () =>
        {
            this._cursorVisible = !this._cursorVisible;
            this._setCursorVisibility( this._cursorVisible );
        }, this._cursorBlinkRate );
    }

    private _stopBlinker(): void
    {
        if ( this._blinkerInterval !== null )
        {
            clearInterval( this._blinkerInterval );
            this._blinkerInterval = null;
        }
    }

    private _resetBlinker(): void
    {
        if ( this._focused )
        {
            this._startBlinker();
        }
    }

    private _setCursorVisibility( visible: boolean ): void
    {
        const cursors = this.cursorsLayer.querySelectorAll( '.cursor' );
        for ( const c of cursors )
        {
            ( c as HTMLElement ).style.opacity = visible ? '0.6' : '0';
        }
    }

    // Keyboard input events:

    private _onKeyDown( e: KeyboardEvent ): void
    {
        // Ignore events during IME / dead key composition
        if ( this._composing || e.key === 'Dead' ) return;

        // Ignore modifier-only presses
        if ( [ 'Control', 'Shift', 'Alt', 'Meta' ].includes( e.key ) ) return;

        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;

        if ( this._keyChain )
        {
            const chain = this._keyChain;
            this._keyChain = null;
            e.preventDefault();

            if ( ctrl && chain === 'k' )
            {
                switch ( e.key.toLowerCase() )
                {
                    case 'c': this._commentLines(); return;
                    case 'u': this._uncommentLines(); return;
                }
            }
            return; // Unknown chord, just consume it
        }

        if ( ctrl )
        {
            switch ( e.key.toLowerCase() )
            {
                case 'a':
                    e.preventDefault();
                    this.cursorSet.selectAll( this.doc );
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
                    if ( this.onSave )
                    {
                        this.onSave( this.getText(), this );
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
                case ' ': 
                    if ( this.onCtrlSpace )
                    {
                        e.preventDefault();
                        this.onCtrlSpace( this.getText(), this );
                        return;
                    }
            }
        }

        switch ( e.key )
        {
            case 'ArrowLeft':
                e.preventDefault();
                this._wasPaired = false;
                if ( ctrl ) this.cursorSet.moveWordLeft( this.doc, shift );
                else this.cursorSet.moveLeft( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'ArrowRight':
                e.preventDefault();
                this._wasPaired = false;
                if ( ctrl ) this.cursorSet.moveWordRight( this.doc, shift );
                else this.cursorSet.moveRight( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'ArrowUp':
                e.preventDefault();
                this._wasPaired = false;
                if ( alt && shift ) { this._duplicateLine( -1 ); return; }
                if ( alt ) { this._swapLine( -1 ); return; }
                this.cursorSet.moveUp( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'ArrowDown':
                e.preventDefault();
                this._wasPaired = false;
                if ( alt && shift ) { this._duplicateLine( 1 ); return; }
                if ( alt ) { this._swapLine( 1 ); return; }
                this.cursorSet.moveDown( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'Home':
                e.preventDefault();
                this._wasPaired = false;
                this.cursorSet.moveToLineStart( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'End':
                e.preventDefault();
                this._wasPaired = false;
                this.cursorSet.moveToLineEnd( this.doc, shift );
                this._afterCursorMove();
                return;
            case 'Escape':
                e.preventDefault();
                if ( this._doHideSearch() ) return;
                this.cursorSet.removeSecondaryCursors();
                // Collapse selection
                const h = this.cursorSet.getPrimary().head;
                this.cursorSet.set( h.line, h.col );
                this._afterCursorMove();
                return;
        }

        switch ( e.key )
        {
            case 'Backspace':
                e.preventDefault();
                this._doBackspace( ctrl );
                return;
            case 'Delete':
                e.preventDefault();
                this._doDelete( ctrl );
                return;
            case 'Enter':
                e.preventDefault();
                this._doEnter( ctrl );
                return;
            case 'Tab':
                e.preventDefault();
                this._doTab( shift );
                return;
        }

        if ( e.key.length === 1 && !ctrl )
        {
            e.preventDefault();
            this._doInsertChar( e.key );
        }
    }

    private _flushIfActionChanged( action: string ): void
    {
        if ( this._lastAction !== action )
        {
            this.undoManager.flush( this.cursorSet.getCursorPositions() );
            this._lastAction = action;
        }
    }

    private _flushAction(): void
    {
        this.undoManager.flush( this.cursorSet.getCursorPositions() );
        this._lastAction = '';
    }

    private _doInsertChar( char: string ): void
    {
        // Enclose selection if applicable
        if ( char in CodeEditor.PAIR_KEYS && this.cursorSet.hasSelection() )
        {
            this._encloseSelection( char, CodeEditor.PAIR_KEYS[ char ] );
            return;
        }

        this._flushIfActionChanged( 'insert' );

        this._deleteSelectionIfAny();

        const changedLines = new Set<number>();
        let paired = false;

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const nextChar = this.doc.getCharAt( line, col );

            // If we just auto-paired and the next char is the same closing char, skip over it
            if ( this._wasPaired && nextChar === char )
            {
                cursor.head = { line, col: col + 1 };
                cursor.anchor = { ...cursor.head };
                continue;
            }

            const op = this.doc.insert( line, col, char );
            this.undoManager.record( op, this.cursorSet.getCursorPositions() );

            const pairInserted = char in CodeEditor.PAIR_KEYS && ( !nextChar || /\s/.test( nextChar ) );
            const charsInserted = pairInserted ? 2 : 1;

            // Auto-pair: insert closing char if next char is whitespace or end of line
            if ( pairInserted )
            {
                const closeOp = this.doc.insert( line, col + 1, CodeEditor.PAIR_KEYS[ char ] );
                this.undoManager.record( closeOp, this.cursorSet.getCursorPositions() );
                paired = true;
            }

            cursor.head = { line, col: col + 1 };
            cursor.anchor = { ...cursor.head };
            this.cursorSet.adjustOthers( idx, line, col, charsInserted );
            changedLines.add( line );
        }

        this._wasPaired = paired;
        for ( const line of changedLines ) this._updateLine( line );
        this._afterCursorMove();
    }

    private _getAffectedLines(): [ number, number ]
    {
        const cursor = this.cursorSet.getPrimary();
        const a = cursor.anchor.line;
        const h = cursor.head.line;
        return a <= h ? [ a, h ] : [ h, a ];
    }

    private _commentLines(): void
    {
        const token = this.language.lineComment;
        if ( !token ) return;

        const [ fromLine, toLine ] = this._getAffectedLines();
        const comment = token + ' ';

        // Find minimum indentation across affected lines (skip empty lines)
        let minIndent = Infinity;
        for ( let i = fromLine; i <= toLine; i++ )
        {
            const line = this.doc.getLine( i );
            if ( line.trim().length === 0 ) continue;
            minIndent = Math.min( minIndent, this.doc.getIndent( i ) );
        }
        if ( minIndent === Infinity ) minIndent = 0;

        this._flushAction();
        for ( let i = fromLine; i <= toLine; i++ )
        {
            const line = this.doc.getLine( i );
            if ( line.trim().length === 0 ) continue;
            const op = this.doc.insert( i, minIndent, comment );
            this.undoManager.record( op, this.cursorSet.getCursorPositions() );
            this._updateLine( i );
        }

        this._afterCursorMove();
    }

    private _uncommentLines(): void
    {
        const token = this.language.lineComment;
        if ( !token ) return;

        const [ fromLine, toLine ] = this._getAffectedLines();

        this._flushAction();
        for ( let i = fromLine; i <= toLine; i++ )
        {
            const line = this.doc.getLine( i );
            const indent = this.doc.getIndent( i );
            const rest = line.substring( indent );

            // Check for "// " or "//"
            if ( rest.startsWith( token + ' ' ) )
            {
                const op = this.doc.delete( i, indent, token.length + 1 );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
            }
            else if ( rest.startsWith( token ) )
            {
                const op = this.doc.delete( i, indent, token.length );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
            }
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _doFindNextOcurrence(): void
    {
        const primary = this.cursorSet.getPrimary();

        // Get the search text: selection or word under cursor
        let searchText = this.cursorSet.getSelectedText( this.doc );
        if ( !searchText )
        {
            const { line, col } = primary.head;
            const [ word, start, end ] = this.doc.getWordAt( line, col );
            if ( !word ) return;

            // Select the word under cursor first (first Ctrl+D)
            primary.anchor = { line, col: start };
            primary.head = { line, col: end };
            this._renderCursors();
            this._renderSelections();
            return;
        }

        const lastCursor = this.cursorSet.cursors[ this.cursorSet.cursors.length - 1 ];
        const lastEnd = posBefore( lastCursor.anchor, lastCursor.head ) ? lastCursor.head : lastCursor.anchor;

        const match = this.doc.findNext( searchText, lastEnd.line, lastEnd.col );
        if ( !match ) return;

        // Check if this occurrence is already selected by any cursor
        const alreadySelected = this.cursorSet.cursors.some( sel =>
        {
            const start = posBefore( sel.anchor, sel.head ) ? sel.anchor : sel.head;
            return start.line === match.line && start.col === match.col;
        } );

        if ( alreadySelected ) return;

        this.cursorSet.cursors.push( {
            anchor: { line: match.line, col: match.col },
            head: { line: match.line, col: match.col + searchText.length }
        } );

        this._renderCursors();
        this._renderSelections();
        this._scrollCursorIntoView();
    }

    private _doOpenSearch( clear: boolean = false ): void
    {
        if ( !this.searchBox ) return;

        this._doHideSearch();

        LX.addClass( this.searchBox, 'opened' );
        this._isSearchBoxActive = true;

        const input: HTMLInputElement | null = this.searchBox.querySelector( 'input' );
        if ( !input ) return;

        if ( clear )
        {
            input.value = '';
        }
        else if ( this.cursorSet.hasSelection() )
        {
            input.value = this.cursorSet.getSelectedText( this.doc );
        }

        input.selectionStart = 0;
        input.selectionEnd = input.value.length;
        input.focus();
    }

    private _doOpenLineSearch(): void
    {
        if ( !this.searchLineBox ) return;

        this._doHideSearch();

        LX.emitSignal( '@line-number-range', `Type a line number to go to (from 1 to ${this.doc.lineCount}).` )

        LX.addClass( this.searchLineBox, 'opened' );
        this._isSearchLineBoxActive = true;

        const input: HTMLInputElement | null = this.searchLineBox.querySelector( 'input' );
        if ( !input ) return;
        input.value = '';
        input.focus();
    }

    /**
     * Returns true if visibility changed.
     */
    private _doHideSearch(): boolean
    {
        if ( !this.searchBox || !this.searchLineBox ) return false;

        const active = this._isSearchBoxActive;
        const activeLine = this._isSearchLineBoxActive;
        if ( active )
        {
            this.searchBox.classList.remove( 'opened' );
            this._isSearchBoxActive = false;
            this._lastSearchPos = null;
        }
        else if ( activeLine )
        {
            this.searchLineBox.classList.remove( 'opened' );
            this._isSearchLineBoxActive = false;
        }

        return ( active != this._isSearchBoxActive ) || ( activeLine != this._isSearchLineBoxActive );
    }

    private _doSearch( text?: string | null, reverse: boolean = false, callback?: any, skipAlert: boolean = true, forceFocus: boolean = true )
    {
        text = text ?? this._lastTextFound;

        if ( !text ) return;

        const doc = this.doc;
        let startLine: number;
        let startCol: number;

        if ( this._lastSearchPos )
        {
            startLine = this._lastSearchPos.line;
            startCol = this._lastSearchPos.col + ( reverse ? -text.length : text.length );
        }
        else
        {
            const cursor = this.cursorSet.getPrimary();
            startLine = cursor.head.line;
            startCol = cursor.head.col;
        }

        const findInLine = ( lineIdx: number, fromCol: number ): number =>
        {
            let lineText = doc.getLine( lineIdx );
            let needle = text!;

            if ( !this._searchMatchCase )
            {
                lineText = lineText.toLowerCase();
                needle = needle.toLowerCase();
            }

            if ( reverse )
            {
                const sub = lineText.substring( 0, fromCol );
                return sub.lastIndexOf( needle );
            }
            else
            {
                return lineText.indexOf( needle, fromCol );
            }
        };

        let foundLine: number = -1;
        let foundCol: number = -1;

        if ( reverse )
        {
            for ( let j = startLine; j >= 0; j-- )
            {
                const col = findInLine( j, j === startLine ? startCol : doc.getLine( j ).length );
                if ( col > -1 )
                {
                    foundLine = j;
                    foundCol = col;
                    break;
                }
            }

            // Wrap around from bottom
            if ( foundLine === -1 )
            {
                for ( let j = doc.lineCount - 1; j > startLine; j-- )
                {
                    const col = findInLine( j, doc.getLine( j ).length );
                    if ( col > -1 )
                    {
                        foundLine = j;
                        foundCol = col;
                        break;
                    }
                }
            }
        }
        else
        {
            for ( let j = startLine; j < doc.lineCount; j++ )
            {
                const col = findInLine( j, j === startLine ? startCol : 0 );
                if ( col > -1 )
                {
                    foundLine = j;
                    foundCol = col;
                    break;
                }
            }

            // Wrap around from top
            if ( foundLine === -1 )
            {
                for ( let j = 0; j < startLine; j++ )
                {
                    const col = findInLine( j, 0 );
                    if ( col > -1 )
                    {
                        foundLine = j;
                        foundCol = col;
                        break;
                    }
                }
            }
        }

        if ( foundLine === -1 )
        {
            if ( !skipAlert ) alert( 'No results!' );
            this._lastSearchPos = null;
            return;
        }

        this._lastTextFound = text;
        this._lastSearchPos = { line: foundLine, col: foundCol };

        if ( callback )
        {
            callback( foundCol, foundLine );
        }
        else
        {
            // Select the found text
            const primary = this.cursorSet.getPrimary();
            primary.anchor = { line: foundLine, col: foundCol };
            primary.head = { line: foundLine, col: foundCol + text.length };
            this._renderCursors();
            this._renderSelections();
        }

        // Scroll to the match
        this.codeScroller.scrollTop = Math.max( ( foundLine - 10 ) * this.lineHeight, 0 );
        this.codeScroller.scrollLeft = Math.max( foundCol * this.charWidth - this.codeScroller.clientWidth / 2, 0 );

        if ( forceFocus )
        {
            const input = this.searchBox?.querySelector( 'input' );
            input?.focus();
        }
    }

    private _doGotoLine( lineNumber: number ): void
    {
        if ( Number.isNaN( lineNumber ) || lineNumber < 1 || lineNumber > this.doc.lineCount ) return;

        this.cursorSet.set( lineNumber - 1, 0 );

        this._afterCursorMove();
    }

    private _encloseSelection( open: string, close: string ): void
    {
        const cursor = this.cursorSet.getPrimary();
        const sel = cursor.anchor;
        const head = cursor.head;

        // Normalize selection (old invertIfNecessary)
        const fromLine = sel.line < head.line || ( sel.line === head.line && sel.col < head.col ) ? sel : head;
        const toLine = fromLine === sel ? head : sel;

        // Only single-line selections for now
        if ( fromLine.line !== toLine.line ) return;

        const line = fromLine.line;
        const from = fromLine.col;
        const to = toLine.col;

        this._flushAction();

        const op1 = this.doc.insert( line, from, open );
        this.undoManager.record( op1, this.cursorSet.getCursorPositions() );
        const op2 = this.doc.insert( line, to + 1, close );
        this.undoManager.record( op2, this.cursorSet.getCursorPositions() );

        // Keep selection on the enclosed word (shifted by 1)
        cursor.anchor = { line, col: from + 1 };
        cursor.head = { line, col: to + 1 };

        this._updateLine( line );
        this._afterCursorMove();
    }

    private _doBackspace( ctrlKey: boolean ): void
    {
        this._flushIfActionChanged( 'backspace' );

        // If any cursor has a selection, delete selections
        if ( this.cursorSet.hasSelection() )
        {
            this._deleteSelectionIfAny();
            this._rebuildLines();
            this._afterCursorMove();
            return;
        }

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;

            if ( line === 0 && col === 0 ) continue;

            if ( col === 0 )
            {
                // Merge with previous line
                const prevLineLen = this.doc.getLine( line - 1 ).length;
                const op = this.doc.delete( line - 1, prevLineLen, 1 );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                cursor.head = { line: line - 1, col: prevLineLen };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers( idx, line, 0, prevLineLen, -1 );
            }
            else if ( ctrlKey )
            {
                // Delete word left
                const [ word, from ] = this.doc.getWordAt( line, col - 1 );
                const deleteFrom = word.length > 0 ? from : col - 1;
                const deleteLen = col - deleteFrom;
                const op = this.doc.delete( line, deleteFrom, deleteLen );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                cursor.head = { line, col: deleteFrom };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers( idx, line, col, -deleteLen );
            }
            else
            {
                const op = this.doc.delete( line, col - 1, 1 );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                cursor.head = { line, col: col - 1 };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers( idx, line, col, -1 );
            }
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _doDelete( ctrlKey: boolean ): void
    {
        if ( this.cursorSet.hasSelection() )
        {
            this._deleteSelectionIfAny();
            this._rebuildLines();
            this._afterCursorMove();
            return;
        }

        this._flushIfActionChanged( 'delete' );

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;
            const lineText = this.doc.getLine( line );

            if ( col >= lineText.length && line >= this.doc.lineCount - 1 ) continue;

            if ( col >= lineText.length )
            {
                // Merge with next line
                const op = this.doc.delete( line, col, 1 );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                this.cursorSet.adjustOthers( idx, line, col, 0, -1 );
            }
            else if ( ctrlKey )
            {
                // Delete word right
                const [ word, , end ] = this.doc.getWordAt( line, col );
                const deleteLen = word.length > 0 ? end - col : 1;
                const op = this.doc.delete( line, col, deleteLen );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                this.cursorSet.adjustOthers( idx, line, col, -deleteLen );
            }
            else
            {
                const op = this.doc.delete( line, col, 1 );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                this.cursorSet.adjustOthers( idx, line, col, -1 );
            }
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _doEnter( shift: boolean ): void
    {
        if ( shift && this.onRun )
        {
            this.onRun( this.getText(), this );
            return;
        }

        this._deleteSelectionIfAny();
        this._flushAction();

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;

            const indent = this.doc.getIndent( line );
            const spaces = ' '.repeat( indent );

            const op = this.doc.insert( line, col, '\n' + spaces );
            this.undoManager.record( op, this.cursorSet.getCursorPositions() );

            cursor.head = { line: line + 1, col: indent };
            cursor.anchor = { ...cursor.head };
            this.cursorSet.adjustOthers( idx, line, col, 0, 1 );
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _doTab( shift: boolean ): void
    {
        this._flushAction();

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const cursor = this.cursorSet.cursors[idx];
            const { line, col } = cursor.head;

            if ( shift )
            {
                // Dedent: remove up to tabSize spaces from start
                const lineText = this.doc.getLine( line );
                let spacesToRemove = 0;
                while ( spacesToRemove < this.tabSize && spacesToRemove < lineText.length && lineText[spacesToRemove] === ' ' )
                {
                    spacesToRemove++;
                }
                if ( spacesToRemove > 0 )
                {
                    const op = this.doc.delete( line, 0, spacesToRemove );
                    this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                    cursor.head = { line, col: Math.max( 0, col - spacesToRemove ) };
                    cursor.anchor = { ...cursor.head };
                    this.cursorSet.adjustOthers( idx, line, 0, -spacesToRemove );
                }
            }
            else
            {
                const spacesToAdd = this.tabSize - ( col % this.tabSize );
                const spaces = ' '.repeat( spacesToAdd );
                const op = this.doc.insert( line, col, spaces );
                this.undoManager.record( op, this.cursorSet.getCursorPositions() );
                cursor.head = { line, col: col + spacesToAdd };
                cursor.anchor = { ...cursor.head };
                this.cursorSet.adjustOthers( idx, line, col, spacesToAdd );
            }
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _deleteSelectionIfAny(): void
    {
        let anyDeleted = false;

        for ( const idx of this.cursorSet.sortedIndicesBottomUp() )
        {
            const sel = this.cursorSet.cursors[idx];
            if ( selectionIsEmpty( sel ) ) continue;

            const start = selectionStart( sel );
            const end = selectionEnd( sel );
            const selectedText = this.cursorSet.getSelectedText( this.doc, idx );
            if ( !selectedText ) continue;

            const linesRemoved = end.line - start.line;
            // not exact for multiline, but start.col is where cursor lands
            const colDelta = linesRemoved === 0 ? ( end.col - start.col ) : start.col; 

            const op = this.doc.delete( start.line, start.col, selectedText.length );
            this.undoManager.record( op, this.cursorSet.getCursorPositions() );

            sel.head = { ...start };
            sel.anchor = { ...start };
            this.cursorSet.adjustOthers( idx, start.line, start.col, -colDelta, -linesRemoved );
            anyDeleted = true;
        }

        if ( anyDeleted ) this._rebuildLines();
    }

    // Clipboard helpers:

    private _doCopy(): void
    {
        const text = this.cursorSet.getSelectedText( this.doc );
        if ( text )
        {
            navigator.clipboard.writeText( text );
        }
    }

    private _doCut(): void
    {
        this._flushAction();

        const text = this.cursorSet.getSelectedText( this.doc );
        if ( text )
        {
            navigator.clipboard.writeText( text );
            this._deleteSelectionIfAny();
        }
        else
        {
            const cursor = this.cursorSet.getPrimary();
            const line = cursor.head.line;
            const lineText = this.doc.getLine( line );
            const isLastLine = line === this.doc.lineCount - 1;

            navigator.clipboard.writeText( lineText + ( isLastLine ? '' : '\n' ) );

            
            const op = this.doc.removeLine( line );
            this.undoManager.record( op, this.cursorSet.getCursorPositions() );

            // Place cursor at col 0 of the resulting line
            const newLine = Math.min( line, this.doc.lineCount - 1 );
            cursor.head = { line: newLine, col: 0 };
            cursor.anchor = { ...cursor.head };
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _swapLine( dir: -1 | 1 ): void
    {
        const cursor = this.cursorSet.getPrimary();
        const line = cursor.head.line;
        const targetLine = line + dir;

        if ( targetLine < 0 || targetLine >= this.doc.lineCount ) return;

        const currentText = this.doc.getLine( line );
        const targetText = this.doc.getLine( targetLine );

        this._flushAction();
        const op1 = this.doc.replaceLine( line, targetText );
        this.undoManager.record( op1, this.cursorSet.getCursorPositions() );
        const op2 = this.doc.replaceLine( targetLine, currentText );
        this.undoManager.record( op2, this.cursorSet.getCursorPositions() );

        cursor.head = { line: targetLine, col: cursor.head.col };
        cursor.anchor = { ...cursor.head };

        this._rebuildLines();
        this._afterCursorMove();
    }

    private _duplicateLine( dir: -1 | 1 ): void
    {
        const cursor = this.cursorSet.getPrimary();
        const line = cursor.head.line;
        const text = this.doc.getLine( line );

        this._flushAction();
        const op = this.doc.insertLine( line, text );
        this.undoManager.record( op, this.cursorSet.getCursorPositions() );

        const newLine = dir === 1 ? line + 1 : line;
        cursor.head = { line: newLine, col: cursor.head.col };
        cursor.anchor = { ...cursor.head };

        this._rebuildLines();
        this._afterCursorMove();
    }

    private async _doPaste(): Promise<void>
    {
        const text = await navigator.clipboard.readText();
        if ( !text ) return;
        
        this._flushAction();

        this._deleteSelectionIfAny();

        const cursor = this.cursorSet.getPrimary();
        const op = this.doc.insert( cursor.head.line, cursor.head.col, text );
        this.undoManager.record( op, this.cursorSet.getCursorPositions() );

        // Calculate new cursor position after paste
        const lines = text.split( '\n' );
        if ( lines.length === 1 )
        {
            this.cursorSet.set( cursor.head.line, cursor.head.col + text.length );
        }
        else
        {
            this.cursorSet.set(
                cursor.head.line + lines.length - 1,
                lines[ lines.length - 1 ].length
            );
        }

        this._rebuildLines();
        this._afterCursorMove();
    }

    // Undo/Redo:

    private _doUndo(): void
    {
        const result = this.undoManager.undo( this.doc, this.cursorSet.getCursorPositions() );
        if ( result )
        {
            if ( result.cursors.length > 0 )
            {
                const c = result.cursors[0];
                this.cursorSet.set( c.line, c.col );
            }
            this._rebuildLines();
            this._afterCursorMove();
        }
    }

    private _doRedo(): void
    {
        const result = this.undoManager.redo( this.doc );
        if ( result )
        {
            if ( result.cursors.length > 0 )
            {
                const c = result.cursors[0];
                this.cursorSet.set( c.line, c.col );
            }
            this._rebuildLines();
            this._afterCursorMove();
        }
    }

    // Mouse input events:

    private _onMouseDown( e: MouseEvent ): void
    {
        if ( e.button !== 0 ) return;
        if ( !this.currentTab ) return;
        if ( this.searchBox && this.searchBox.contains( e.target as Node ) ) return;

        e.preventDefault(); // Prevent browser from stealing focus from _inputArea
        this._wasPaired = false;

        // Calculate line and column from click position
        const rect = this.codeContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - this.xPadding;
        const y = e.clientY - rect.top;

        const line = Math.floor( y / this.lineHeight );
        if ( line < 0 || line > this.doc.lineCount - 1 ) return;

        const col = Math.max( 0, Math.min( Math.round( x / this.charWidth ), this.doc.getLine( line ).length ) );

        const now = Date.now();
        if ( now - this._lastClickTime < 400 && line === this._lastClickLine )
        {
            this._clickCount = Math.min( this._clickCount + 1, 3 );
        }
        else
        {
            this._clickCount = 1;
        }

        this._lastClickTime = now;
        this._lastClickLine = line;

        // Triple click: select entire line
        if ( this._clickCount === 3 )
        {
            const sel = this.cursorSet.getPrimary();
            sel.anchor = { line, col: 0 };
            sel.head = { line, col: this.doc.getLine( line ).length };
        }
        // Double click: select word
        else if ( this._clickCount === 2 )
        {
            const [ , start, end ] = this.doc.getWordAt( line, col );
            const sel = this.cursorSet.getPrimary();
            sel.anchor = { line, col: start };
            sel.head = { line, col: end };
        }
        else if ( e.shiftKey )
        {
            // Extend selection
            const sel = this.cursorSet.getPrimary();
            sel.head = { line, col };
        }
        else
        {
            this.cursorSet.set( line, col );
        }

        this._afterCursorMove();
        this._inputArea.focus();

        // Track mouse for drag selection
        const onMouseMove = ( me: MouseEvent ) =>
        {
            const mx = me.clientX - rect.left - this.xPadding;
            const my = me.clientY - rect.top;
            const ml = Math.max( 0, Math.min( Math.floor( my / this.lineHeight ), this.doc.lineCount - 1 ) );
            const mc = Math.max( 0, Math.min( Math.round( mx / this.charWidth ), this.doc.getLine( ml ).length ) );

            const sel = this.cursorSet.getPrimary();
            sel.head = { line: ml, col: mc };
            this._renderCursors();
            this._renderSelections();
        };

        const onMouseUp = () =>
        {
            document.removeEventListener( 'mousemove', onMouseMove );
            document.removeEventListener( 'mouseup', onMouseUp );
        };

        document.addEventListener( 'mousemove', onMouseMove );
        document.addEventListener( 'mouseup', onMouseUp );
    }

    private _onContextMenu( e: MouseEvent ): void
    {
        e.preventDefault();
        
        // if ( !this.canOpenContextMenu )
        // {
        //     return;
        // }

        const dmOptions: any[] = [ { name: 'Copy', icon: 'Copy', callback: () => this._doCopy(), kbd: ['Ctrl', 'C'], useKbdSpecialKeys: false } ];

        if ( !this.disableEdition )
        {
            dmOptions.push( { name: 'Cut', icon: 'Scissors', callback: () => this._doCut(), kbd: ['Ctrl', 'X'], useKbdSpecialKeys: false } );
            dmOptions.push( { name: 'Paste', icon: 'Paste', callback: () => this._doPaste(), kbd: ['Ctrl', 'V'], useKbdSpecialKeys: false } );
        }

        if ( this.onContextMenu )
        {
            const content = this.cursorSet.getSelectedText( this.doc );
            const options = this.onContextMenu( this, content, e );
            if ( options?.length )
            {
                dmOptions.push( null ); // Separator

                for ( const o of options )
                {
                    dmOptions.push( { name: o.path, disabled: o.disabled, callback: o.callback } );
                }
            }
        }

        LX.addDropdownMenu( e.target, dmOptions, { event: e, side: 'bottom', align: 'start' } );
    }

    private _afterCursorMove(): void
    {
        this._renderCursors();
        this._renderSelections();
        this._resetBlinker();
        this.resize();
        this._scrollCursorIntoView();
        this._resetGutter();
    }

    // Scrollbar & Resize:

    private _scrollCursorIntoView(): void
    {
        const cursor = this.cursorSet.getPrimary().head;
        const top = cursor.line * this.lineHeight;
        const left = cursor.col * this.charWidth;

        // Vertical scroll
        if ( top < this.codeScroller.scrollTop )
        {
            this.codeScroller.scrollTop = top;
        }
        else if ( top + this.lineHeight > this.codeScroller.scrollTop + this.codeScroller.clientHeight )
        {
            this.codeScroller.scrollTop = top + this.lineHeight - this.codeScroller.clientHeight;
        }

        // Horizontal scroll
        const sbOffset = ScrollBar.SIZE * 2;
        if ( left < this.codeScroller.scrollLeft )
        {
            this.codeScroller.scrollLeft = left;
        }
        else if ( left + sbOffset > this.codeScroller.scrollLeft + this.codeScroller.clientWidth - this.xPadding )
        {
            this.codeScroller.scrollLeft = left + sbOffset - this.codeScroller.clientWidth + this.xPadding;
        }
    }

    private _resetGutter(): void
    {
        const verticalTopOffset = this.tabs?.root.getBoundingClientRect().height ?? 0;
        this.lineGutter.style.height = `calc(100% - ${verticalTopOffset}px)`;
    }

    getMaxLineLength(): number
    {
        let max = 0;
        for ( let i = 0; i < this.doc.lineCount; i++ )
        {
            const len = this.doc.getLine( i ).length;
            if ( len > max ) max = len;
        }
        return max;
    }

    resize( force: boolean = false ): void
    {
        if ( !this.charWidth ) return;

        const maxLineLength = this.getMaxLineLength();
        const lineCount = this.doc.lineCount;
        const viewportChars = Math.floor( ( this.codeScroller.clientWidth - this.xPadding ) / this.charWidth );
        const viewportLines = Math.floor( this.codeScroller.clientHeight / this.lineHeight );

        let needsHResize = maxLineLength !== this._lastMaxLineLength
            && ( maxLineLength >= viewportChars || this._lastMaxLineLength >= viewportChars );
        let needsVResize = lineCount !== this._lastLineCount
            && ( lineCount >= viewportLines || this._lastLineCount >= viewportLines );


        // If doesn't need resize due to not reaching min length, maybe we need to resize if the content shrinks and we have extra space now
        needsHResize = needsHResize || ( maxLineLength < viewportChars && this.hScrollbar?.visible );
        needsVResize = needsVResize || ( lineCount < viewportLines && this.vScrollbar?.visible );

        if ( !force && !needsHResize && !needsVResize ) return;

        this._lastMaxLineLength = maxLineLength;
        this._lastLineCount = lineCount;

        if ( force || needsHResize )
        {
            this.codeSizer.style.minWidth = ( maxLineLength * this.charWidth + this.xPadding + ScrollBar.SIZE * 2 ) + 'px';
        }

        if ( force || needsVResize )
        {
            this.codeSizer.style.minHeight = ( lineCount * this.lineHeight + ScrollBar.SIZE * 2 ) + 'px';
        }

        setTimeout( () => this._resizeScrollBars(), 10 );
    }

    private _resizeScrollBars(): void
    {
        if ( !this.vScrollbar ) return;

        // Compute offsets for tabs and status bar
        const topOffset = this.tabs?.root.getBoundingClientRect().height ?? 0;
        const bottomOffset = this.statusPanel?.root.getBoundingClientRect().height ?? 0;

        // Vertical scrollbar: right edge, between tabs and status bar
        const scrollHeight = this.codeScroller.scrollHeight;
        this.vScrollbar.setThumbRatio( scrollHeight > 0 ? this.codeScroller.clientHeight / scrollHeight : 1 );
        this.vScrollbar.root.style.top = topOffset + 'px';
        this.vScrollbar.root.style.height = `calc(100% - ${topOffset + bottomOffset}px)`;

        // Horizontal scrollbar: bottom of code area, offset by gutter and vertical scrollbar
        const scrollWidth = this.codeScroller.scrollWidth;
        this.hScrollbar.setThumbRatio( scrollWidth > 0 ? this.codeScroller.clientWidth / scrollWidth : 1 );
        this.hScrollbar.root.style.bottom = bottomOffset + 'px';
        this.hScrollbar.root.style.width = `calc(100% - ${this.xPadding + ( this.vScrollbar.visible ? ScrollBar.SIZE : 0 )}px)`;
    }

    private _syncScrollBars(): void
    {
        if ( !this.vScrollbar ) return;

        this.vScrollbar.syncToScroll(
            this.codeScroller.scrollTop,
            this.codeScroller.scrollHeight - this.codeScroller.clientHeight
        );
        this.hScrollbar.syncToScroll(
            this.codeScroller.scrollLeft,
            this.codeScroller.scrollWidth - this.codeScroller.clientWidth
        );
    }

    // Files:

    private _doLoadFromFile()
    {
        const input = LX.makeElement( 'input', '', '', document.body );
        input.type = 'file';
        input.click();
        input.addEventListener( 'change', ( e: Event ) => {
            const target = e.target as HTMLInputElement;
            if ( target.files && target.files[0] )
            {
                this.loadFile( target.files[0] );
            }
            input.remove();
        } );
    }

    loadFile( file: File | string, options: Record<string, any> = {} ): void
    {
        const onLoad = ( text: string, name: string ) =>
        {
            // Remove Carriage Return in some cases and sub tabs using spaces
            text = text.replaceAll( '\r', '' ).replaceAll( /\t|\\t/g, ' '.repeat( this.tabSize ) );

            const ext = LX.getExtension( name );
            const langName = options.language ?? ( Tokenizer.getLanguage( options.language )?.name
                ?? ( Tokenizer.getLanguageByExtension( ext )?.name ?? 'Plain Text' ) );

            this._addTab( name, {
                selected: true,
                title: options.title ?? name,
                language: langName
            } );

            this.doc.setText( text );
            this.setLanguage( langName );
            this.cursorSet.set( 0, 0 );
            this.undoManager.clear();
            this._renderCursors();
            this._renderSelections();
            this._resetGutter();

            if ( options.callback )
            {
                options.callback( name, text );
            }
        };

        if ( typeof file === 'string' )
        {
            const url = file;
            const name = options.filename ?? url.substring( url.lastIndexOf( '/' ) + 1 );

            LX.request( { url, success: ( text: string ) => {
                onLoad( text, name );
            } } );
        }
        else
        {
            const fr = new FileReader();
            fr.readAsText( file );
            fr.onload = ( e ) => {
                const text = ( e.currentTarget as any ).result;
                onLoad( text, file.name );
            };
        }
    }

    // Font Size utils:

    private _setFontSize( size: number, updateDOM: boolean = true )
    {
        // Change font size
        this.fontSize = size;
        const r: any = document.querySelector( ':root' );
        r.style.setProperty( '--code-editor-font-size', `${this.fontSize}px` );
        window.localStorage.setItem( 'lexcodeeditor-font-size', `${this.fontSize}` );
        this._measureChar();

        // Change row size
        const rowPixels = this.fontSize + 6;
        r.style.setProperty( '--code-editor-row-height', `${rowPixels}px` );
        this.lineHeight = rowPixels;

        if ( updateDOM )
        {
            this._rebuildLines();
            this._afterCursorMove();
        }

        // Emit event
        LX.emitSignal( '@font-size', this.fontSize );
    }

    private _applyFontSizeOffset( offset = 0 )
    {
        const newFontSize = LX.clamp( this.fontSize + offset, CodeEditor.CODE_MIN_FONT_SIZE, CodeEditor.CODE_MAX_FONT_SIZE );
        this._setFontSize( newFontSize );
    }

    private _increaseFontSize()
    {
        this._applyFontSizeOffset( 1 );
    }

    private _decreaseFontSize()
    {
        this._applyFontSizeOffset( -1 );
    }
}

( LX as any ).CodeEditor = CodeEditor;