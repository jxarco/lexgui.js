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

//  _____     _           _             
// |_   _|___| |_ ___ ___|_|___ ___ ___ 
//   | | | . | '_| -_|   | |- _| -_|  _|
//   |_| |___|_,_|___|_|_|_|___|___|_|

class Tokenizer
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
    'default', 'async', 'await', 'yield', 'typeof', 'instanceof', 'void', 'delete',
    'throw', 'try', 'catch', 'finally', 'debugger', 'with'
];

const jsStatements = [
    'for', 'if', 'else', 'switch', 'case', 'return', 'while', 'do', 'continue', 'break'
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
    'as', 'interface', 'type', 'enum', 'namespace', 'declare', 'abstract',
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
        while ( start > 0 && /\w/.test( l[ start - 1 ] ) )
        {
            start--;
        }

        // Expand right
        let end = col;
        while ( end < l.length && /\w/.test( l[ end ] ) )
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
                if ( c > 0 && /\w/.test( l[ c - 1 ] ) )
                {
                    while ( c > 0 && /\w/.test( l[ c - 1 ] ) ) c--;
                }
                else if ( c > 0 )
                {
                    while ( c > 0 && /[^\w\s]/.test( l[ c - 1 ] ) ) c--;
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
                // Skip word or symbols
                if ( c < l.length && /\w/.test( l[ c ] ) )
                {
                    while ( c < l.length && /\w/.test( l[ c ] ) ) c++;
                }
                else if ( c < l.length && /[^\w\s]/.test( l[ c ] ) )
                {
                    while ( c < l.length && /[^\w\s]/.test( l[ c ] ) ) c++;
                }
                // Skip trailing whitespace
                while ( c < l.length && /\s/.test( l[ c ] ) ) c++;
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
const Tabs = LX.Tabs;

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
    currentTab: CodeTab | null = null;
    openedTabs: Record<string, CodeTab> = {};

    // Measurements:
    charWidth: number = 0;
    lineHeight: number = 0;
    xPadding: number = 64;  // 4rem left padding in pixels

    // Editor options:
    // skipInfo: boolean = false;
    disableEdition: boolean = false;
    skipTabs: boolean = false;
    // useFileExplorer: boolean = false;
    // useAutoComplete: boolean = true;
    allowAddScripts: boolean = true;
    allowClosingTabs: boolean = true;
    // allowLoadingFiles: boolean = true;
    tabSize: number = 4;
    highlight: string = 'Plain Text';
    // newTabOptions: any;
    // customSuggestions: any[] = [];
    // explorerName: string = 'EXPLORER';

    // Editor callbacks:
    // onSave: any;
    // onRun: any;
    // onCtrlSpace: any;
    // onCreateStatusPanel: any;
    // onContextMenu: any;
    onNewTab: ( event: MouseEvent ) => void;
    onSelectTab: ( name: string, editor: CodeEditor ) => void;
    // onReady: any;
    onCreateFile: ( ( editor: CodeEditor ) => void ) | undefined;

    private _inputArea!: HTMLTextAreaElement;

    // State:
    private _lineStates: TokenizerState[] = [];     // tokenizer state at end of each line
    private _lineElements: HTMLElement[] = [];      // <pre> element per line
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

    constructor( area: typeof Area, options: Record<string, any> = {} )
    {
        g.editor = this;

        CodeEditor.__instances.push( this );

        // this.skipInfo = options.skipInfo ?? this.skipInfo;
        this.disableEdition = options.disableEdition ?? this.disableEdition;
        this.skipTabs = options.skipTabs ?? this.skipTabs;
        // this.useFileExplorer = ( options.fileExplorer ?? this.useFileExplorer ) && !this.skipTabs;
        // this.useAutoComplete = options.autocomplete ?? this.useAutoComplete;
        this.allowAddScripts = options.allowAddScripts ?? this.allowAddScripts;
        this.allowClosingTabs = options.allowClosingTabs ?? this.allowClosingTabs;
        // this.allowLoadingFiles = options.allowLoadingFiles ?? this.allowLoadingFiles;
        this.highlight = options.highlight ?? this.highlight;
        // this.newTabOptions = options.newTabOptions;
        // this.customSuggestions = options.customSuggestions ?? [];
        // this.explorerName = options.explorerName ?? this.explorerName;

        // Editor callbacks
        // this.onSave = options.onSave;
        // this.onRun = options.onRun;
        // this.onCtrlSpace = options.onCtrlSpace;
        // this.onCreateStatusPanel = options.onCreateStatusPanel;
        // this.onContextMenu = options.onContextMenu;
        this.onNewTab = options.onNewTab;
        this.onSelectTab = options.onSelectTab;
        // this.onReady = options.onReady;

        this.language = Tokenizer.getLanguage( this.highlight ) ?? Tokenizer.getLanguage( 'Plain Text' )!;

        // Full editor
        area.root.className = LX.mergeClass( area.root.className, 'codebasearea overflow-hidden flex relative bg-card' );

        this.baseArea = area;
        this.area = new LX.Area( { className: 'lexcodeeditor outline-none overflow-hidden size-full select-none bg-inherit', skipAppend: true } );

        if ( !this.skipTabs )
        {
            this.tabs = this.area.addTabs( { contentClass: 'lexcodearea scrollbar-hidden flex flex-row', onclose: ( name: string ) => {
                // this._closeTab triggers this onclose!
                delete this.openedTabs[name];
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
            this.codeArea = new LX.Area( { className: 'lexcodearea scrollbar-hidden flex flex-row', skipAppend: true } );
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

        this._measureChar();

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
    }

    getText(): string
    {
        return this.doc.getText();
    }

    setLanguage( name: string ): void
    {
        const lang = Tokenizer.getLanguage( name );
        if ( lang )
        {
            this.language = lang;
            this._lineStates = [];
            this._renderAllLines();
        }
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
        
        this.openedTabs[name] = codeTab;

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

        if( selected )
        {
            this.currentTab = codeTab;
        }

        return name;
    }

    private _closeTab( name: string )
    {
        if ( !this.allowClosingTabs ) return;

        this.tabs.delete( name );
        const tab = this.openedTabs[name];
        if ( tab )
        {
            tab.dom.remove();
            delete this.openedTabs[name];
        }

        // If we closed the current tab, switch to the first available
        if ( this.currentTab?.name === name )
        {
            const remaining = Object.keys( this.openedTabs ).filter( k => k !== '+' );
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

        this.currentTab = this.openedTabs[name];

        // this._updateDataInfoPanel( '@tab-name', name );

        this.language = Tokenizer.getLanguage( this.currentTab.language ) ?? Tokenizer.getLanguage( 'Plain Text' )!;

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

        const dmOptions = [
            { name: 'Create file', icon: 'FilePlus', callback: this._onCreateNewFile.bind( this ) }
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
                navigator.clipboard.writeText( this.openedTabs[name].path ?? '' );
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
        } );
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
        // Diff: if count matches, just update content; otherwise full rebuild.
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
        for ( let i = 0; i < this._lineElements.length; i++ )
        {
            this._lineElements[i].classList.toggle( 'active-line', !hasSelection && i === activeLine );
        }
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
            this._startBlinker();
        }
        else
        {
            this.cursorsLayer.classList.remove( 'show' );
            this.selectionsLayer.classList.remove( 'show' );
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
                case 'k':
                    e.preventDefault();
                    this._keyChain = 'k';
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
                this._doEnter();
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

    private _doEnter(): void
    {
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
        e.preventDefault(); // Prevent browser from stealing focus from _inputArea
        this._wasPaired = false;

        // Calculate line and column from click position
        const rect = this.codeContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - this.xPadding;
        const y = e.clientY - rect.top;

        const line = Math.min( Math.floor( y / this.lineHeight ), this.doc.lineCount - 1 );
        if( line < 0 ) return;

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

    private _afterCursorMove(): void
    {
        this._renderCursors();
        this._renderSelections();
        this._resetBlinker();
        this._scrollCursorIntoView();
        this._resetGutter();
    }

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
        if ( left < this.codeScroller.scrollLeft )
        {
            this.codeScroller.scrollLeft = left;
        }
        else if ( left > this.codeScroller.scrollLeft + this.codeScroller.clientWidth - this.xPadding )
        {
            this.codeScroller.scrollLeft = left - this.codeScroller.clientWidth + this.xPadding;
        }
    }

    private _resetGutter(): void
    {
        const verticalTopOffset = this.tabs?.root.getBoundingClientRect().height ?? 0;
        this.lineGutter.style.height = `${this.doc.lineCount * this.lineHeight - verticalTopOffset}px`;
    }
}

( LX as any ).CodeEditor = CodeEditor;