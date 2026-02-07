// NewCodeEditor.ts @jxarco

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'CodeEditor' );

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Utilities ──────────────────────────────────────────────────────

function firstNonspaceIndex( str: string ): number
{
    const index = str.search( /\S|$/ );
    return index < str.length ? index : -1;
}

// ─── Tokenizer ──────────────────────────────────────────────────────

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
                // No rules for this state — emit rest as text
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
                        // Zero-length match — skip to avoid infinite loop
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
                // No rule matched — consume one character as text
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

        // Merge consecutive tokens of the same type
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

// ─── Language Helpers ────────────────────────────────────────────────

/**
 * Build a word-boundary regex from a list of words.
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

// ─── Language Definitions ───────────────────────────────────────────

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

// ── JavaScript ──

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

// ── TypeScript ──

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

// ─── Document ───────────────────────────────────────────────────────

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
     * A "word" is a contiguous run of word characters (\w).
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

    // ── Mutations (return EditOperations for undo) ──

    /**
     * Insert text at a position. Handles newlines in the inserted text.
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
     * Delete `length` characters forward from a position.
     * Handles crossing line boundaries.
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
     * Insert a new line after `afterLine`. If afterLine is -1, inserts at the beginning.
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

    /**
     * Apply an edit operation (used by undo/redo).
     */
    applyInverse( op: EditOperation ): EditOperation
    {
        if ( op.type === 'insert' )
        {
            // Inverse of insert is delete
            return this.delete( op.line, op.col, op.text.length );
        }
        else
        {
            // Inverse of delete is insert
            return this.insert( op.line, op.col, op.text );
        }
    }
}

// ─── Edit Operations & Undo Manager ─────────────────────────────────

interface EditOperation
{
    type: 'insert' | 'delete';
    line: number;
    col: number;
    text: string;
}

interface UndoEntry
{
    operations: EditOperation[];
    cursors: CursorPosition[];  // cursor state before the edit
}

class UndoManager
{
    private _undoStack: UndoEntry[] = [];
    private _redoStack: UndoEntry[] = [];
    private _pendingOps: EditOperation[] = [];
    private _pendingCursors: CursorPosition[] = [];
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
            this._pendingCursors = cursors.map( c => ( { ...c } ) );
        }

        this._pendingOps.push( op );
        this._lastPushTime = now;

        // New edits clear the redo stack
        this._redoStack.length = 0;
    }

    /**
     * Force-flush pending operations into an undo step.
     * Call this before undo, or before non-typing operations (Enter, paste, etc.)
     */
    flush(): void
    {
        this._flush();
    }

    /**
     * Undo the last step. Returns the operations to apply inversely, and the cursor state to restore.
     */
    undo( doc: CodeDocument ): { cursors: CursorPosition[] } | null
    {
        this._flush();

        const entry = this._undoStack.pop();
        if ( !entry ) return null;

        // Apply operations in reverse order
        const redoOps: EditOperation[] = [];
        for ( let i = entry.operations.length - 1; i >= 0; i-- )
        {
            const inverseOp = doc.applyInverse( entry.operations[i] );
            redoOps.unshift( inverseOp );
        }

        this._redoStack.push( { operations: redoOps, cursors: entry.cursors } );

        return { cursors: entry.cursors };
    }

    /**
     * Redo the last undone step.
     */
    redo( doc: CodeDocument ): { cursors: CursorPosition[] } | null
    {
        const entry = this._redoStack.pop();
        if ( !entry ) return null;

        const undoOps: EditOperation[] = [];
        for ( let i = entry.operations.length - 1; i >= 0; i-- )
        {
            const inverseOp = doc.applyInverse( entry.operations[i] );
            undoOps.unshift( inverseOp );
        }

        this._undoStack.push( { operations: undoOps, cursors: entry.cursors } );

        return { cursors: entry.cursors };
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
            cursors: [ ...this._pendingCursors ]
        } );

        this._pendingOps.length = 0;
        this._pendingCursors = [];

        // Limit stack size
        while ( this._undoStack.length > this._maxSteps )
        {
            this._undoStack.shift();
        }
    }
}

// ─── Cursor & Selection ─────────────────────────────────────────────

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
     * Set a single cursor position, clearing all secondary cursors and selections.
     */
    set( line: number, col: number ): void
    {
        this.cursors = [ { anchor: { line, col }, head: { line, col } } ];
    }

    // ── Movement ──

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

    moveToLineStart( doc: CodeDocument, selecting: boolean = false ): void
    {
        for ( const sel of this.cursors )
        {
            const line = sel.head.line;
            const indent = doc.getIndent( line );
            // Toggle between indent and column 0
            const targetCol = sel.head.col === indent ? 0 : indent;
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

    // ── Multi-cursor ──

    addCursor( line: number, col: number ): void
    {
        this.cursors.push( { anchor: { line, col }, head: { line, col } } );
        this._merge();
    }

    removeSecondaryCursors(): void
    {
        this.cursors = [ this.cursors[0] ];
    }

    // ── Queries ──

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

    // ── Private ──

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

// ─── Exports ────────────────────────────────────────────────────────

export { Tokenizer, CodeDocument, UndoManager, CursorSet };
export type { Token, TokenRule, TokenizerState, TokenizeResult, LanguageDef, EditOperation, CursorPosition, Selection };
