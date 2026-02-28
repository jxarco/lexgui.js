interface Token {
    type: string;
    value: string;
}
interface TokenRule {
    match: RegExp;
    type: string;
    next?: string;
    pop?: boolean | number;
}
interface LanguageDef {
    name: string;
    extensions: string[];
    states: Record<string, TokenRule[]>;
    lineComment?: string;
    icon?: string | Record<string, string>;
    reservedWords: string[];
}
interface TokenizerState {
    stack: string[];
}
interface TokenizeResult {
    tokens: Token[];
    state: TokenizerState;
}
export declare class Tokenizer {
    private static languages;
    private static extensionMap;
    static registerLanguage(def: LanguageDef): void;
    static getLanguage(name: string): LanguageDef | undefined;
    static getLanguageByExtension(ext: string): LanguageDef | undefined;
    static getRegisteredLanguages(): string[];
    static initialState(): TokenizerState;
    /**
     * Tokenize a single line given a language and the state from the previous line.
     * Returns the tokens and the updated state for the next line.
     */
    static tokenizeLine(line: string, language: LanguageDef, state: TokenizerState): TokenizeResult;
    /**
     * Merge consecutive tokens with the same type into one.
     */
    private static _mergeTokens;
}
declare class CodeDocument {
    private onChange;
    private _lines;
    get lineCount(): number;
    constructor(onChange?: (doc: CodeDocument) => void);
    getLine(n: number): string;
    getText(separator?: string): string;
    setText(text: string, silent?: boolean): void;
    getCharAt(line: number, col: number): string | undefined;
    /**
     * Get the word at a given position. Returns [word, startCol, endCol].
     */
    getWordAt(line: number, col: number): [string, number, number];
    /**
     * Get the indentation level (number of leading spaces) of a line.
     */
    getIndent(line: number): number;
    /**
     * Find the next occurrence of 'text' starting after (line, col). Returns null if no match.
     */
    findNext(text: string, startLine: number, startCol: number): {
        line: number;
        col: number;
    } | null;
    /**
     * Insert text at a position (handles newlines in the inserted text).
     */
    insert(line: number, col: number, text: string): EditOperation;
    /**
     * Delete `length` characters forward from a position (handles crossing line boundaries).
     */
    delete(line: number, col: number, length: number): EditOperation;
    /**
     * Insert a new line after 'afterLine'. If afterLine is -1, inserts at the beginning.
     */
    insertLine(afterLine: number, text?: string): EditOperation;
    /**
     * Remove an entire line and its trailing newline.
     */
    removeLine(line: number): EditOperation;
    replaceLine(line: number, newText: string): EditOperation;
    /**
     * Apply an edit operation (used by undo/redo).
     */
    applyInverse(op: EditOperation): EditOperation;
}
interface EditOperation {
    type: 'insert' | 'delete' | 'replaceLine';
    line: number;
    col: number;
    text: string;
    oldText?: string;
}
declare class UndoManager {
    private _undoStack;
    private _redoStack;
    private _pendingOps;
    private _pendingCursorsBefore;
    private _pendingCursorsAfter;
    private _lastPushTime;
    private _groupThresholdMs;
    private _maxSteps;
    private _savedDepth;
    constructor(groupThresholdMs?: number, maxSteps?: number);
    /**
     * Record an edit operation. Consecutive operations within the time threshold
     * are grouped into a single undo step.
     */
    record(op: EditOperation, cursors: CursorPosition[]): void;
    /**
     * Force-flush pending operations into a final undo step.
     */
    flush(cursorsAfter?: CursorPosition[]): void;
    /**
     * Undo the last step. Stores the operations to apply inversely, and returns the cursor state to restore.
     */
    undo(doc: CodeDocument, currentCursors?: CursorPosition[]): {
        cursors: CursorPosition[];
    } | null;
    /**
     * Redo the last undone step. Returns the cursor state to restore.
     */
    redo(doc: CodeDocument): {
        cursors: CursorPosition[];
    } | null;
    canUndo(): boolean;
    canRedo(): boolean;
    markSaved(): void;
    isModified(): boolean;
    clear(): void;
    private _flush;
}
interface CursorPosition {
    line: number;
    col: number;
}
interface Selection {
    anchor: CursorPosition;
    head: CursorPosition;
}
declare class CursorSet {
    cursors: Selection[];
    constructor();
    getPrimary(): Selection;
    /**
     * Set a single cursor position. Clears all secondary cursors and selections.
     */
    set(line: number, col: number): void;
    moveLeft(doc: CodeDocument, selecting?: boolean): void;
    moveRight(doc: CodeDocument, selecting?: boolean): void;
    moveUp(doc: CodeDocument, selecting?: boolean): void;
    moveDown(doc: CodeDocument, selecting?: boolean): void;
    moveToLineStart(doc: CodeDocument, selecting?: boolean, noIndent?: boolean): void;
    moveToLineEnd(doc: CodeDocument, selecting?: boolean): void;
    moveWordLeft(doc: CodeDocument, selecting?: boolean): void;
    moveWordRight(doc: CodeDocument, selecting?: boolean): void;
    selectAll(doc: CodeDocument): void;
    addCursor(line: number, col: number): void;
    removeSecondaryCursors(): void;
    /**
     * Returns cursor indices sorted by head position, bottom-to-top (last in doc first)
     * to ensure earlier cursors' positions stay valid.
     */
    sortedIndicesBottomUp(): number[];
    /**
     * After editing at (line, col), shift all other cursors on the same line
     * that are at or after `afterCol` by `colDelta`. Also handles line shifts
     * for multi-line inserts/deletes via `lineDelta`.
     */
    adjustOthers(skipIdx: number, line: number, afterCol: number, colDelta: number, lineDelta?: number): void;
    hasSelection(index?: number): boolean;
    getSelectedText(doc: CodeDocument, index?: number): string;
    getCursorPositions(): CursorPosition[];
    private _moveHead;
    private _moveVertical;
    /**
     * Merge overlapping cursors/selections. Keeps the first one when duplicates exist.
     */
    private _merge;
}
interface Symbol {
    name: string;
    kind: string;
    scope: string;
    line: number;
    col?: number;
}
interface ScopeInfo {
    name: string;
    type: string;
    line: number;
}
/**
 * Manages code symbols for autocomplete, navigation, and outlining.
 * Incrementally updates as lines change.
 */
declare class SymbolTable {
    private _symbols;
    private _lineSymbols;
    private _scopeStack;
    private _lineScopes;
    private _lineScopesEnd;
    get currentScope(): string;
    get currentScopeType(): string;
    getScopeAtLine(line: number): ScopeInfo[];
    getLineScopeEnd(line: number): ScopeInfo[];
    getSymbols(name: string): Symbol[];
    getAllSymbolNames(): string[];
    getAllSymbols(): Symbol[];
    getLineSymbols(line: number): Symbol[];
    /** Update scope stack for a line (call before parsing symbols) */
    updateScopeForLine(line: number, lineText: string): void;
    /** Name the most recent anonymous scope (called when detecting class/function) */
    nameCurrentScope(name: string, type: string): void;
    /** Remove symbols from a line (before reparsing) */
    removeLineSymbols(line: number): void;
    addSymbol(symbol: Symbol): void;
    /** Reset scope stack (e.g. when document structure changes significantly) */
    resetScopes(): void;
    clear(): void;
}
declare const Area: any;
declare const Panel: any;
declare const Tabs: any;
declare const NodeTree: any;
interface CodeTab {
    name: string;
    dom: HTMLElement;
    doc: CodeDocument;
    cursorSet: CursorSet;
    undoManager: UndoManager;
    language: string;
    modified: boolean;
    title?: string;
    path?: string;
}
export interface CodeSuggestion {
    label: string;
    kind?: string;
    scope?: string;
    detail?: string;
    insertText?: string;
    filterText?: string;
    sortText?: string;
    icon?: string;
    iconClass?: string;
    cursorOffset?: number;
    selectLength?: number;
}
export interface HoverSymbolInfo {
    word: string;
    tokenType: string;
    symbols: Symbol[];
}
declare class ScrollBar {
    static SIZE: number;
    root: HTMLElement;
    thumb: HTMLElement;
    private _vertical;
    private _thumbPos;
    private _thumbRatio;
    private _lastMouse;
    private _onDrag;
    get visible(): boolean;
    get isVertical(): boolean;
    constructor(vertical: boolean, onDrag: (delta: number) => void);
    setThumbRatio(ratio: number): void;
    syncToScroll(scrollPos: number, scrollMax: number): void;
    applyDragDelta(delta: number, scrollMax: number): number;
    private _applyPosition;
    private _onMouseDown;
}
/**
 * @class CodeEditor
 * The main editor class. Wires Document, Tokenizer, CursorSet, UndoManager
 * together with the DOM.
 */
export declare class CodeEditor {
    static __instances: CodeEditor[];
    language: LanguageDef;
    symbolTable: SymbolTable;
    area: typeof Area;
    baseArea: typeof Area;
    codeArea: typeof Area;
    explorerArea: typeof Area;
    tabs: typeof Tabs;
    root: HTMLElement;
    codeScroller: HTMLElement;
    codeSizer: HTMLElement;
    cursorsLayer: HTMLElement;
    selectionsLayer: HTMLElement;
    lineGutter: HTMLElement;
    vScrollbar: ScrollBar;
    hScrollbar: ScrollBar;
    searchBox: HTMLElement | null;
    searchLineBox: HTMLElement | null;
    autocomplete: HTMLElement | null;
    currentTab: CodeTab | null;
    statusPanel: typeof Panel;
    leftStatusPanel: typeof Panel;
    rightStatusPanel: typeof Panel;
    explorer: typeof NodeTree | null;
    charWidth: number;
    lineHeight: number;
    fontSize: number;
    xPadding: number;
    private _cachedTabsHeight;
    private _cachedStatusPanelHeight;
    skipInfo: boolean;
    disableEdition: boolean;
    skipTabs: boolean;
    useFileExplorer: boolean;
    useAutoComplete: boolean;
    allowAddScripts: boolean;
    allowClosingTabs: boolean;
    allowLoadingFiles: boolean;
    tabSize: number;
    highlight: string;
    newTabOptions: any[] | null;
    customSuggestions: CodeSuggestion[];
    explorerName: string;
    onSave: (text: string, editor: CodeEditor) => void;
    onRun: (text: string, editor: CodeEditor) => void;
    onCtrlSpace: (text: string, editor: CodeEditor) => void;
    onCreateStatusPanel: (panel: typeof Panel, editor: CodeEditor) => void;
    onContextMenu: any;
    onNewTab: (event: MouseEvent) => void;
    onSelectTab: (name: string, editor: CodeEditor) => void;
    onReady: ((editor: CodeEditor) => void) | undefined;
    onCreateFile: ((editor: CodeEditor) => void) | undefined;
    onCodeChange: ((doc: CodeDocument) => void) | undefined;
    onOpenPath: ((path: string, editor: CodeEditor) => void) | undefined;
    onHoverSymbol: ((info: HoverSymbolInfo, editor: CodeEditor) => string | HTMLElement | null | undefined) | undefined;
    private _inputArea;
    private _lineStates;
    private _lineElements;
    private _bracketOpenLine;
    private _bracketCloseLine;
    private _hoverTimer;
    private _hoverPopup;
    private _hoverWord;
    private _colorPopover;
    private _openedTabs;
    private _loadedTabs;
    private _storedTabs;
    private _focused;
    private _composing;
    private _keyChain;
    private _wasPaired;
    private _lastAction;
    private _blinkerInterval;
    private _cursorVisible;
    private _cursorBlinkRate;
    private _clickCount;
    private _lastClickTime;
    private _lastClickLine;
    private _isSearchBoxActive;
    private _isSearchLineBoxActive;
    private _searchMatchCase;
    private _lastTextFound;
    private _lastSearchPos;
    private _discardScroll;
    private _isReady;
    private _lastMaxLineLength;
    private _lastLineCount;
    private _isAutoCompleteActive;
    private _selectedAutocompleteIndex;
    private _displayObservers;
    private static readonly CODE_MIN_FONT_SIZE;
    private static readonly CODE_MAX_FONT_SIZE;
    private static readonly PAIR_KEYS;
    get doc(): CodeDocument;
    get undoManager(): UndoManager;
    get cursorSet(): CursorSet;
    get codeContainer(): HTMLElement;
    static getInstances(): CodeEditor[];
    constructor(area: typeof Area, options?: Record<string, any>);
    private _init;
    clear(): void;
    addExplorerItem(item: any): void;
    setText(text: string, language?: string, detectLang?: boolean): void;
    private _detectLanguage;
    appendText(text: string): void;
    getText(): string;
    setLanguage(name: string, extension?: string): void;
    focus(): void;
    addTab(name: string, options?: Record<string, any>): CodeTab;
    loadTab(name: string): void;
    closeTab(name: string): void;
    setCustomSuggestions(suggestions: CodeSuggestion[] | string[]): void;
    loadFile(file: File | string, options?: Record<string, any>): void;
    loadFiles(files: string[], onComplete?: (editor: CodeEditor, results: any[], total: number) => void, async?: boolean): Promise<void>;
    _setupEditorWhenVisible(): Promise<void>;
    private _findTabByPath;
    private _setTabModified;
    private _onSelectTab;
    private _onNewTab;
    private _onCreateNewFile;
    private _onContextMenuTab;
    private _measureChar;
    private _createStatusPanel;
    private _updateDataInfoPanel;
    /**
     * Tokenize a line and return its innerHTML with syntax highlighting spans.
     */
    private _tokenizeLine;
    /**
     * Update symbol table for a line.
     */
    private _updateSymbolsForLine;
    /**
     * Render all lines from scratch.
     */
    private _renderAllLines;
    /**
     * Gets the html for the line gutter.
     */
    private _getGutterHtml;
    /**
     * Create and append a <pre> element for a line.
     */
    private _appendLineElement;
    /**
     * Re-render a single line's content (after editing).
     */
    private _updateLine;
    /**
     * Rebuild line elements after structural changes (insert/delete lines).
     */
    private _rebuildLines;
    private _statesEqual;
    private _updateActiveLine;
    private _renderCursors;
    private _renderSelections;
    private _setFocused;
    private _startBlinker;
    private _stopBlinker;
    private _resetBlinker;
    private _setCursorVisibility;
    private _onKeyDown;
    private _flushIfActionChanged;
    private _flushAction;
    private _doInsertChar;
    private _getAffectedLines;
    private _commentLines;
    private _uncommentLines;
    private _doFindNextOcurrence;
    private _doOpenSearch;
    private _doOpenLineSearch;
    /**
     * Returns true if visibility changed.
     */
    private _doHideSearch;
    private _doSearch;
    private _doGotoLine;
    private _encloseSelection;
    private _doBackspace;
    private _doDelete;
    private _doEnter;
    private _doTab;
    private _deleteSelectionIfAny;
    private _doCopy;
    private _doCut;
    private _swapLine;
    private _duplicateLine;
    /**
     * Normalize external text before inserting into the document:
     * - Unify line endings to \n
     * - Replace tab characters with the configured number of spaces
     */
    private _normalizeText;
    private _doPaste;
    private _doUndo;
    private _doRedo;
    private _onMouseDown;
    private _onContextMenu;
    /**
     * Get word at cursor position for autocomplete.
     */
    private _getWordAtCursor;
    /**
     * Open autocomplete box with suggestions from symbols and custom suggestions.
     */
    private _doOpenAutocomplete;
    private _doHideAutocomplete;
    /**
     * Insert the selected autocomplete word at cursor.
     */
    private _doAutocompleteWord;
    private _getSelectedAutoCompleteSuggestion;
    private _afterCursorMove;
    /**
     * Returns the scope stack at the exact cursor position (line + column).
     * Basically starts from getScopeAtLine and then counts real braces up to the cursor column.
     */
    private _getScopeAtCursor;
    private _updateBracketHighlight;
    private _onColorSwatchClick;
    /**
     * Extracts the parameter list from a function/method declaration line.
     */
    private _getSymbolParams;
    /**
     * Starting from the line where a class is defined, scans forward to find
     * the constructor signature and returns its parameter list.
     */
    private _findConstructorParams;
    /**
     * Given multiple symbols with the same name, pick the most likely one for
     * the hovered position using the available context data.
     */
    private _pickBestSymbol;
    private _clearHoverPopup;
    private _onCodeAreaMouseMove;
    private _scrollCursorIntoView;
    private _resetGutter;
    getMaxLineLength(): number;
    resize(force?: boolean): void;
    private _resizeScrollBars;
    private _syncScrollBars;
    private _doLoadFromFile;
    private _setFontSize;
    private _applyFontSizeOffset;
    private _increaseFontSize;
    private _decreaseFontSize;
}
export {};
