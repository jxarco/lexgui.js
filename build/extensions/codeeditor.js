import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.extensions.push( 'CodeEditor' );

function swapElements( obj, a, b ) { [obj[a], obj[b]] = [obj[b], obj[a]]; }
function swapArrayElements( array, id0, id1 ) { [array[id0], array[id1]] = [array[id1], array[id0]]; };
function sliceChars( str, idx, n = 1 ) { return str.substr(0, idx) + str.substr(idx + n); }
function firstNonspaceIndex( str ) { const index = str.search(/\S|$/); return index < str.length ? index : -1; }
function strReverse( str ) { return str.split( "" ).reverse().join( "" ); }
function isLetter( c ){ return /[a-zA-Z]/.test( c ); };
function isSymbol( c ){ return /[^\w\s]/.test( c ); };

function indexOfFrom( str, reg, from, reverse ) {

    from = from ?? 0;

    if( reverse )
    {
        str = str.substr( 0, from );
        var k = from - 1;
        while( str[ k ] && str[ k ] != reg )
            k--;
        return str[ k ] ? k : -1;
    }
    else
    {
        str = str.substr( from );
        return from + str.indexOf( reg );
    }
}

function codeScopesEqual( a, b ) {
    if( a.length !== b.length ) return false;
    for( let i = 0; i < a.length; i++ )
    {
        if( a[ i ].type !== b[ i ].type ) return false;
    }
    return true;
}

class CodeSelection {

    constructor( editor, cursor, className = "lexcodeselection" ) {

        this.editor = editor;
        this.cursor = cursor;
        this.className = className;
        this.chars  = 0;

        this.fromX  = cursor.position;
        this.toX    = cursor.position;
        this.fromY  = cursor.line;
        this.toY    = cursor.line;
    }

    sameLine() {
        return this.fromY === this.toY;
    }

    samePosition() {
        return this.fromX === this.toX;
    }

    isEmpty() {
        return this.sameLine() && this.samePosition();
    }

    invertIfNecessary() {
        // if( this.fromX > this.toX )
        if( this.fromY > this.toY )
        {
            swapElements( this, 'fromX', 'toX' );
            swapElements( this, 'fromY', 'toY' );
        }
        else if( this.sameLine() && this.fromX > this.toX )
        {
            swapElements( this, 'fromX', 'toX' );
        }
    }

    selectInline( cursor, x, y, width, isSearchResult ) {

        this.chars = width / this.editor.charWidth;
        this.fromX = x;
        this.toX = x + this.chars;
        this.fromY = this.toY = y;

        var domEl = document.createElement( 'div' );
        domEl.className = this.className;
        domEl._top = y * this.editor.lineHeight;
        domEl.style.top = domEl._top + "px";
        domEl._left = x * this.editor.charWidth;
        domEl.style.left = "calc(" + domEl._left + "px + " + this.editor.xPadding + ")";
        domEl.style.width = width + "px";

        if( isSearchResult )
        {
            this.editor.searchResultSelections.appendChild( domEl );
        }
        else
        {
            this.editor.selections[ cursor.name ].appendChild( domEl );
        }

        // Hide active line background
        this.editor._hideActiveLine();
    }

    save() {

        return {
            fromX: this.fromX,
            fromY: this.fromY,
            toX: this.toX,
            toY: this.toY
        }
    }

    load( data ) {

        this.fromX = data.fromX;
        this.fromY = data.fromY;
        this.toX = data.toX;
        this.toY = data.toY;
    }

    getText() {

        if( !this.editor.code || !this.sameLine() )
            return null;

        return this.editor.code.lines[ this.fromY ].substring( this.fromX, this.toX );
    }
};

class ScrollBar {

    static SCROLLBAR_VERTICAL       = 1;
    static SCROLLBAR_HORIZONTAL     = 2;

    static SCROLLBAR_VERTICAL_WIDTH = 10;
    static SCROLLBAR_HORIZONTAL_HEIGHT = 10;

    constructor( editor, type ) {

        this.editor = editor;
        this.type = type;

        this.root = document.createElement( 'div' );
        this.root.className = "lexcodescrollbar hidden";

        if( type & ScrollBar.SCROLLBAR_VERTICAL )
            this.root.classList.add( 'vertical' );
        else if( type & ScrollBar.SCROLLBAR_HORIZONTAL )
            this.root.classList.add( 'horizontal' );

        this.thumb = document.createElement( 'div' );
        this.thumb._top = 0;
        this.thumb._left = 0;

        this.root.appendChild( this.thumb );

        this.thumb.addEventListener( "mousedown", inner_mousedown );

        this.lastPosition = new LX.vec2( 0, 0 );

        let that = this;

        function inner_mousedown( e )
        {
            var doc = editor.root.ownerDocument;
            doc.addEventListener( "mousemove", inner_mousemove );
            doc.addEventListener( "mouseup", inner_mouseup );
            that.lastPosition.set( e.x, e.y );
            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mousemove( e )
        {
            var dt = that.lastPosition.sub( new LX.vec2( e.x, e.y ) );
            if( that.type & ScrollBar.SCROLLBAR_VERTICAL )
                editor.updateVerticalScrollFromScrollBar( dt.y )
            else
                editor.updateHorizontalScrollFromScrollBar( dt.x )
            that.lastPosition.set( e.x, e.y );
            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup( e )
        {
            var doc = editor.root.ownerDocument;
            doc.removeEventListener( "mousemove", inner_mousemove );
            doc.removeEventListener( "mouseup", inner_mouseup );
        }
    }

}

/* Highlight rules
- test: function that receives a context object and returns true or false
- className: class to apply if test is true
- action: optional function to execute if test is true, receives context and editor as parameter
- discard: optional boolean, if true the token is discarded, action value is returned
        to "ctx.discardToken" and no class is applied
*/

const HighlightRules = {

    common: [
        { test: ctx => ctx.inBlockComment, className: "cm-com" },
        { test: ctx => ctx.inString, action: (ctx, editor) => editor._appendStringToken( ctx.token ), discard: true },
        { test: ctx => ctx.token.substr( 0, ctx.singleLineCommentToken.length ) == ctx.singleLineCommentToken, className: "cm-com" },
        { test: (ctx, editor) => editor._isKeyword( ctx ), className: "cm-kwd" },
        { test: (ctx, editor) => editor._mustHightlightWord( ctx.token, CodeEditor.builtIn, ctx.lang ) && ( ctx.lang.tags ?? false ? ( editor._enclosedByTokens( ctx.token, ctx.tokenIndex, '<', '>' ) ) : true ), className: "cm-bln" },
        { test: (ctx, editor) => editor._mustHightlightWord( ctx.token, CodeEditor.statements, ctx.lang ), className: "cm-std" },
        { test: (ctx, editor) => editor._mustHightlightWord( ctx.token, CodeEditor.symbols, ctx.lang ), className: "cm-sym" },
        { test: (ctx, editor) => editor._mustHightlightWord( ctx.token, CodeEditor.types, ctx.lang ), className: "cm-typ" },
        { test: (ctx, editor) => editor._isNumber( ctx.token ) || editor._isNumber( ctx.token.replace(/[px]|[em]|%/g,'') ), className: "cm-dec" },
        { test: ctx => ctx.lang.usePreprocessor && ctx.token.includes( '#' ), className: "cm-ppc" },
    ],

    javascript: [
        { test: ctx => (ctx.prev === 'class' && ctx.next === '{') , className: "cm-typ" },
    ],

    typescript: [
        { test: ctx => ctx.scope && (ctx.token !== ',' && ctx.scope.type == "enum"), className: "cm-enu" },
        { test: ctx => (ctx.prev === ':' && ctx.next !== undefined && isLetter(ctx.token) ) || (ctx.prev === 'interface' && ctx.next === '{') || (ctx.prev === 'enum' && ctx.next === '{'), className: "cm-typ" },
        { test: ctx => (ctx.prev === 'class' && ctx.next === '{') || (ctx.prev === 'class' && ctx.next === '<') || (ctx.prev === 'new' && ctx.next === '(') || (ctx.prev === 'new' && ctx.next === '<'), className: "cm-typ" },
        { test: (ctx, editor) => ctx.token !== ',' && editor._enclosedByTokens( ctx.token, ctx.tokenIndex, '<', '>' ), className: "cm-typ" },
    ],

    cpp: [
        { test: ctx => ctx.scope && (ctx.token !== ',' && ctx.scope.type == "enum"), className: "cm-enu" },
        { test: ctx => ctx.isEnumValueSymbol( ctx.token ), className: "cm-enu" },
        { test: ctx => (ctx.prev === 'class' && ctx.next === '{') || (ctx.prev === 'struct' && ctx.next === '{'), className: "cm-typ" },
        { test: ctx => ctx.prev === "<" && (ctx.next === ">" || ctx.next === "*"), className: "cm-typ" }, // Defining template type in C++
        { test: ctx => ctx.next === "::" || (ctx.prev === "::" && ctx.next !== "("), className: "cm-typ" }, // C++ Class
        { test: ctx => ctx.isClassSymbol( ctx.token ) || ctx.isStructSymbol( ctx.token ), className: "cm-typ" },
    ],

    wgsl: [
        { test: ctx => ctx.prev === '>' && (!ctx.next || ctx.next === '{'), className: "cm-typ" }, // Function return type
        { test: ctx => (ctx.prev === ':' && ctx.next !== undefined) || (ctx.prev === 'struct' && ctx.next === '{'), className: "cm-typ" },
        { test: (ctx, editor) => ctx.token !== ',' && editor._enclosedByTokens( ctx.token, ctx.tokenIndex, '<', '>' ), className: "cm-typ" },
    ],

    css: [
        { test: ctx => ( ctx.prev == '.' || ctx.prev == '::' || ( ctx.prev == ':' && ctx.next == '{' ) || ( ctx.token[ 0 ] == '#' && ctx.prev != ':' ) ), className: "cm-kwd" },
        { test: ctx => ctx.prev === ':' && (ctx.next === ';' || ctx.next === '!important'), className: "cm-str" }, // CSS value
        { test: ctx => ( ctx.prev === undefined || ctx.prev === '{' || ctx.prev === ';' ) && ctx.next === ":", className: "cm-typ" }, // CSS attribute
        { test: ctx => ctx.prev === "(" && ctx.next === ")" && ctx.token.startsWith( "--" ), className: "cm-typ" }, // CSS vars
    ],

    batch: [
        { test: ctx => ctx.token === '@' || ctx.prev === ':' || ctx.prev === '@', className: "cm-kwd" }
    ],

    markdown: [
        { test: ctx => ctx.isFirstToken && ctx.token.replaceAll('#', '').length != ctx.token.length, action: (ctx, editor) => editor._markdownHeader = true, className: "cm-kwd" }
    ],

    php: [
        { test: ctx => ctx.token.startsWith( '$' ), className: "cm-var" },
        { test: ctx => (ctx.prev === 'class' && (ctx.next === '{' || ctx.next === 'implements') ) || (ctx.prev === 'enum'), className: "cm-typ" },
    ],

    post_common: [
        { test: ctx => isLetter(ctx.token) && (ctx.token[ 0 ] != '@') && (ctx.token[ 0 ] != ',') && (ctx.next === '('), className: "cm-mtd" }
    ],
};

/**
 * @class CodeEditor
 */

class CodeEditor {

    static __instances  = [];

    static CURSOR_LEFT      = 1;
    static CURSOR_TOP       = 2;
    static CURSOR_LEFT_TOP  = CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP;

    static SELECTION_X      = 1;
    static SELECTION_Y      = 2
    static SELECTION_X_Y    = CodeEditor.SELECTION_X | CodeEditor.SELECTION_Y;

    static KEEP_VISIBLE_LINES   = 1;
    static UPDATE_VISIBLE_LINES = 2;

    static WORD_TYPE_METHOD = 0;
    static WORD_TYPE_CLASS  = 1;

    static CODE_MIN_FONT_SIZE = 9;
    static CODE_MAX_FONT_SIZE = 22;

    static LINE_GUTTER_WIDTH = 48;
    static LINE_GUTTER_WIDTH = 48;

    static RESIZE_SCROLLBAR_H = 1;
    static RESIZE_SCROLLBAR_V = 2;
    static RESIZE_SCROLLBAR_H_V = CodeEditor.RESIZE_SCROLLBAR_H | CodeEditor.RESIZE_SCROLLBAR_V;

    /**
     * @param {*} options
     * name:
     * skipInfo:
     * fileExplorer:
     * allowAddScripts:
     * disableEdition:
     */

    constructor( area, options = {} ) {

        if( options.filesAsync )
        {
            options.files = [ ...options.filesAsync ];

            return (async () => {
                await this._init( area, options );
                // Constructors return `this` implicitly, but this is an IIFE, so
                // return `this` explicitly (else we'd return an empty object).
                return this;
            })();
        }
        else
        {
            this._init( area, options );
        }
    }

    async _init( area, options ) {

        window.editor = this;

        CodeEditor.__instances.push( this );

        this.skipInfo = options.skipInfo ?? false;
        this.disableEdition = options.disableEdition ?? false;
        this.skipTabs = options.skipTabs ?? false;
        this.useFileExplorer = ( options.fileExplorer ?? false ) && !this.skipTabs;
        this.useAutoComplete = options.autocomplete ?? true;
        this.allowClosingTabs = options.allowClosingTabs ?? true;

        // File explorer
        if( this.useFileExplorer )
        {
            let [ explorerArea, editorArea ] = area.split({ sizes:[ "15%","85%" ] });
            // explorerArea.setLimitBox( 180, 20, 512 );
            this.explorerArea = explorerArea;

            let panel = new LX.Panel();

            panel.addTitle( options.explorerName ?? "EXPLORER" );

            let sceneData = {
                'id': 'WORKSPACE',
                'skipVisibility': true,
                'children': []
            };

            this.explorer = panel.addTree( null, sceneData, {
                filter: false,
                rename: false,
                skipDefaultIcon: true,
                onevent: (event) => {
                    switch(event.type) {
                        // case LX.TreeEvent.NODE_SELECTED:
                        //     if( !this.tabs.tabDOMs[ event.node.id ] ) break;
                        case LX.TreeEvent.NODE_DBLCLICKED:
                            this.loadTab( event.node.id );
                            break;
                        case LX.TreeEvent.NODE_DELETED:
                            this.closeTab( event.node.id );
                            break;
                        // case LX.TreeEvent.NODE_CONTEXTMENU:
                        //     LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {
                        //
                        //     });
                        //     break;
                        // case LX.TreeEvent.NODE_DRAGGED:
                        //     console.log(event.node.id + " is now child of " + event.value.id);
                        //     break;
                    }
                }
            });

            this.addExplorerItem = function( item )
            {
                if( !this.explorer.innerTree.data.children.find( ( value, index ) => value.id === item.id ) )
                {
                    this.explorer.innerTree.data.children.push( item );
                }
            };

            explorerArea.attach( panel );

            // Update area
            area = editorArea;
        }

        this.baseArea = area;
        this.area = new LX.Area( { className: "lexcodeeditor", height: "100%", skipAppend: true } );

        if( !this.skipTabs )
        {
            this.tabs = this.area.addTabs( { allowClosingTabs: this.allowClosingTabs, onclose: (name) => {
                delete this.openedTabs[ name ];
                if( Object.keys( this.openedTabs ).length < 2 )
                {
                    clearInterval( this.blinker );
                    this.cursors.classList.remove( 'show' );
                }
            } } );

            if( !this.disableEdition )
            {
                this.tabs.root.parentElement.addEventListener( 'dblclick', (e) => {
                    if( options.allowAddScripts ?? true )
                    {
                        e.preventDefault();
                        this._onCreateNewFile();
                    }
                } );
            }

            this.codeArea = this.tabs.area;
        }
        else
        {
            this.codeArea = new LX.Area( { skipAppend: true } );
            this.area.attach( this.codeArea );
            this._loadFileButton = LX.makeElement( "button",
                "grid absolute self-center z-100 p-3 rounded-full bg-secondary hover:bg-tertiary cursor-pointer border",
                LX.makeIcon( "FolderOpen" ).innerHTML,
                this.area,
                {
                    bottom: "8px"
                }
            );
            this._loadFileButton.addEventListener( "click", e => {

                const dropdownOptions = [];

                for( const [ key, value ] of [ ...Object.entries( this.loadedTabs ).slice( 1 ), ...Object.entries( this._tabStorage ) ] )
                {
                    const icon = this._getFileIcon( key );
                    const classes = icon ? icon.split( ' ' ) : [];
                    dropdownOptions.push( {
                        name: key,
                        icon: classes[ 0 ],
                        svgClass: classes.slice( 0 ).join( ' ' ),
                        callback: (v) => {
                            this.loadCode( v );
                        }
                    } );
                }

                new LX.DropdownMenu( this._loadFileButton, dropdownOptions, { side: "top", align: "center" });

            } );
        }

        this.codeArea.root.classList.add( 'lexcodearea' );

        // Full editor
        area.root.classList.add('codebasearea');

        const observer = new MutationObserver((e) => {
            if( e[0].attributeName == "style" )
            {
                this.resize();
            }
        });

        observer.observe( area.root.parentNode, {
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        this.root = this.area.root;
        this.root.tabIndex = -1;
        area.attach( this.root );

        if( !this.disableEdition )
        {
            this.root.addEventListener( 'keydown', this.processKey.bind( this) );
            this.root.addEventListener( 'focus', this.processFocus.bind( this, true ) );
            this.root.addEventListener( 'focusout', this.processFocus.bind( this, false ) );
        }
        else
        {
            this.root.classList.add( "disabled" );
        }

        this.root.addEventListener( 'mousedown', this.processMouse.bind(this) );
        this.root.addEventListener( 'mouseup', this.processMouse.bind(this) );
        this.root.addEventListener( 'mousemove', this.processMouse.bind(this) );
        this.root.addEventListener( 'click', this.processMouse.bind(this) );
        this.root.addEventListener( 'contextmenu', this.processMouse.bind(this) );

        // Add mouseup event to document as well to detect when selections end
        document.body.addEventListener( 'mouseup', this._onMouseUp.bind(this) );

        // Cursors and selection

        this.cursors = document.createElement( 'div' );
        this.cursors.className = 'cursors';
        this.codeArea.attach( this.cursors );

        this.searchResultSelections = document.createElement( 'div' );
        this.searchResultSelections.id = 'search-selections';
        this.searchResultSelections.className = 'selections';
        this.codeArea.attach( this.searchResultSelections );

        // Store here selections per cursor
        this.selections = {};

        // Css char synchronization
        this.xPadding = CodeEditor.LINE_GUTTER_WIDTH + "px";

        // Add main cursor
        this._addCursor( 0, 0, true, true );

        // Scroll stuff
        {
            this.codeScroller = this.codeArea.root;
            this.firstLineInViewport = 0;
            this.lineScrollMargin = new LX.vec2( 20, 20 ); // [ mUp, mDown ]

            let lastScrollTopValue = -1;

            if( !this.disableEdition )
            {
                this.codeScroller.addEventListener( 'scroll', e => {

                    if( this._discardScroll )
                    {
                        this._discardScroll = false;
                        return;
                    }

                    this.setScrollBarValue( 'vertical' );

                    const scrollTop = this.getScrollTop();

                    // Scroll down...
                    if( scrollTop > lastScrollTopValue )
                    {
                        if( this.visibleLinesViewport.y < (this.code.lines.length - 1) )
                        {
                            const totalLinesInViewport = ( ( this.codeScroller.offsetHeight ) / this.lineHeight )|0;
                            const scrollDownBoundary =
                                ( Math.max( this.visibleLinesViewport.y - totalLinesInViewport, 0 ) - 1 ) * this.lineHeight;

                            if( scrollTop >= scrollDownBoundary )
                            {
                                this.processLines( CodeEditor.UPDATE_VISIBLE_LINES );
                            }
                        }
                    }
                    // Scroll up...
                    else
                    {
                        const scrollUpBoundary = parseInt( this.code.style.top );
                        if( scrollTop < scrollUpBoundary )
                        {
                            this.processLines( CodeEditor.UPDATE_VISIBLE_LINES );
                        }
                    }

                    lastScrollTopValue = scrollTop;
                });

                this.codeScroller.addEventListener( 'wheel', e => {
                    if( e.ctrlKey )
                    {
                        e.preventDefault();
                        e.stopPropagation();
                        ( e.deltaY > 0.0 ? this._decreaseFontSize() : this._increaseFontSize() );
                    }
                } );

                this.codeScroller.addEventListener( 'wheel', e => {
                    if( !e.ctrlKey )
                    {
                        const dX = ( e.deltaY > 0.0 ? 10.0 : -10.0 ) * ( e.shiftKey ? 1.0 : 0.0 );
                        if( dX != 0.0 ) this.setScrollBarValue( 'horizontal', dX );
                    }
                }, { passive: true });
            }
        }

        // Line numbers and scrollbars
        {
            // This is only the container, line numbers are in the same line div
            this.gutter = document.createElement( 'div' );
            this.gutter.className = "lexcodegutter";
            area.attach( this.gutter );

            // Add custom vertical scroll bar
            this.vScrollbar = new ScrollBar( this, ScrollBar.SCROLLBAR_VERTICAL );
            area.attach( this.vScrollbar.root );

            // Add custom horizontal scroll bar
            this.hScrollbar = new ScrollBar( this, ScrollBar.SCROLLBAR_HORIZONTAL );
            area.attach( this.hScrollbar.root );
        }

        // Add autocomplete, search boxes (IF edition enabled)
        if( !this.disableEdition )
        {
            // Add autocomplete box
            {
                const box = document.createElement( 'div' );
                box.className = "autocomplete";
                this.autocomplete = box;
                this.codeArea.attach( box );
                this.isAutoCompleteActive = false;
            }

            // Add search box
            {
                const box = document.createElement( 'div' );
                box.className = "searchbox";

                const searchPanel = new LX.Panel();
                box.appendChild( searchPanel.root );

                searchPanel.sameLine( 4 );
                searchPanel.addText( null, "", null, { placeholder: "Find" } );
                searchPanel.addButton( null, "up", () => this.search( null, true ), { icon: "ArrowUp", title: "Previous Match", tooltip: true } );
                searchPanel.addButton( null, "down", () => this.search(), { icon: "ArrowDown", title: "Next Match", tooltip: true } );
                searchPanel.addButton( null, "x", this.hideSearchBox.bind( this ), { icon: "X", title: "Close", tooltip: true } );

                box.querySelector( 'input' ).addEventListener( 'keyup', e => {
                    if( e.key == 'Escape' ) this.hideSearchBox();
                    else if( e.key == 'Enter' ) this.search( e.target.value, !!e.shiftKey );
                } );

                this.searchbox = box;
                this.codeArea.attach( box );
            }

            // Add search LINE box
            {
                var box = document.createElement( 'div' );
                box.className = "searchbox gotoline";

                var searchPanel = new LX.Panel();
                box.appendChild( searchPanel.root );

                searchPanel.addText( null, "", ( value, event ) => {
                    input.value = ":" + value.replaceAll( ':', '' );
                    this.goToLine( input.value.slice( 1 ) );
                }, { placeholder: "Go to line", trigger: "input" } );

                let input = box.querySelector( 'input' );
                input.addEventListener( 'keyup', e => {
                    if( e.key == 'Escape' ) this.hideSearchLineBox();
                } );

                this.searchlinebox = box;
                this.codeArea.attach( box );
            }
        }

        // Add code-sizer
        {
            this.codeSizer = document.createElement( 'div' );
            this.codeSizer.className = "code-sizer pseudoparent-tabs";

            // Append all childs
            while( this.codeScroller.firstChild )
            {
                this.codeSizer.appendChild( this.codeScroller.firstChild );
            }

            this.codeScroller.appendChild( this.codeSizer );
        }

        // State

        this.state = {
            focused: false,
            selectingText: false,
            activeLine: null,
            keyChain: null
        }

        // Code

        this.highlight = options.highlight ?? 'Plain Text';
        this.onsave = options.onsave ?? ((code) => { console.log( code, "save" ) });
        this.onrun = options.onrun ?? ((code) => { this.runScript(code) });
        this.actions = {};
        this.cursorBlinkRate = 550;
        this.tabSpaces = 4;
        this.maxUndoSteps = 16;
        this.lineHeight = 20;
        this.charWidth = 7; // To update later depending on size..
        this.defaultSingleLineCommentToken = '//';
        this.defaultBlockCommentTokens = [ '/*', '*/' ];
        this._lastTime = null;
        this._tabStorage = {};

        this.pairKeys = {
            "\"": "\"",
            "'": "'",
            "(": ")",
            "{": "}",
            "[": "]"
        };

        this.stringKeys = { // adding @ because some words are always true in (e.g. constructor..)
            "@\"": "\"",
            "@'": "'"
        };

        // Scan tokens..
        // setInterval( this.scanWordSuggestions.bind( this ), 2000 );

        this.specialKeys = [
            'Backspace', 'Enter', 'ArrowUp', 'ArrowDown',
            'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
            'End', 'Tab', 'Escape'
        ];

        this._blockCommentCache = [];

        // Convert reserved word arrays to maps so we can search tokens faster

        if( !CodeEditor._staticReady )
        {
            for( let lang in CodeEditor.keywords ) CodeEditor.keywords[lang] = new Set( CodeEditor.keywords[lang] );
            for( let lang in CodeEditor.utils ) CodeEditor.utils[lang] = new Set( CodeEditor.utils[lang] );
            for( let lang in CodeEditor.types ) CodeEditor.types[lang] = new Set( CodeEditor.types[lang] );
            for( let lang in CodeEditor.builtIn ) CodeEditor.builtIn[lang] = new Set( CodeEditor.builtIn[lang] );
            for( let lang in CodeEditor.statements ) CodeEditor.statements[lang] = new Set( CodeEditor.statements[lang] );
            for( let lang in CodeEditor.symbols ) CodeEditor.symbols[lang] = new Set( CodeEditor.symbols[lang] );

            CodeEditor._staticReady = true;
        }

        // Action keys
        {
            this.action( 'Escape', false, ( ln, cursor, e ) => {
                if( this.hideAutoCompleteBox() )
                    return;
                if( this.hideSearchBox() )
                    return;
                // Remove selections and cursors
                this.endSelection();
                this._removeSecondaryCursors();
            });

            this.action( 'Backspace', false, ( ln, cursor, e ) => {

                this._addUndoStep( cursor );

                if( cursor.selection )
                {
                    this.deleteSelection( cursor );
                    // Remove entire line when selecting with triple click
                    if( this._tripleClickSelection )
                    {
                        this.actions['Backspace'].callback( ln, cursor, e );
                        this.lineDown( cursor, true );
                    }
                }
                else {

                    var letter = this.getCharAtPos( cursor, -1 );
                    if( letter )
                    {
                        var deleteFromPosition = cursor.position - 1;
                        var numCharsDeleted = 1;

                        // Delete full word
                        if( e.shiftKey )
                        {
                            const [word, from, to] = this.getWordAtPos( cursor, -1 );

                            if( word.length > 1 )
                            {
                                deleteFromPosition = from;
                                numCharsDeleted = word.length;
                            }
                        }

                        this.code.lines[ ln ] = sliceChars( this.code.lines[ ln ], deleteFromPosition, numCharsDeleted );
                        this.processLine( ln );

                        this.cursorToPosition( cursor, deleteFromPosition );

                        if( this.useAutoComplete )
                        {
                            this.showAutoCompleteBox( 'foo', cursor );
                        }
                    }
                    else if( this.code.lines[ ln - 1 ] != undefined )
                    {
                        this.lineUp( cursor );
                        e.cancelShift = true;
                        this.actions[ 'End' ].callback( cursor.line, cursor, e );
                        // Move line on top
                        this.code.lines[ ln - 1 ] += this.code.lines[ ln ];
                        this.code.lines.splice( ln, 1 );
                        this.processLines();
                    }
                }

                this.resizeIfNecessary( cursor, true );
            });

            this.action( 'Delete', false, ( ln, cursor, e ) => {

                this._addUndoStep( cursor );

                if( cursor.selection )
                {
                    // Use 'Backspace' as it's the same callback...
                    this.actions['Backspace'].callback( ln, cursor, e );
                }
                else
                {
                    var letter = this.getCharAtPos( cursor );
                    if( letter )
                    {
                        this.code.lines[ ln ] = sliceChars( this.code.lines[ ln ], cursor.position );
                        this.processLine( ln );
                    }
                    else if( this.code.lines[ ln + 1 ] != undefined )
                    {
                        this.code.lines[ ln ] += this.code.lines[ ln + 1 ];
                        this.code.lines.splice( ln + 1, 1 );
                        this.processLines();
                    }
                }

                this.resizeIfNecessary( cursor, true );
            });

            this.action( 'Tab', true, ( ln, cursor, e ) => {

                if( this._skipTabs )
                {
                    this._skipTabs--;
                    if( !this._skipTabs )
                        delete this._skipTabs;
                }
                else if( this.isAutoCompleteActive )
                {
                    this.autoCompleteWord();
                }
                else
                {
                    this._addUndoStep( cursor );

                    if( e && e.shiftKey )
                    {
                        this._removeSpaces( cursor );
                    }
                    else
                    {
                        const indentSpaces = this.tabSpaces - (cursor.position % this.tabSpaces);
                        this._addSpaces( indentSpaces );
                    }
                }
            }, "shiftKey");

            this.action( 'Home', false, ( ln, cursor, e ) => {

                let idx = firstNonspaceIndex( this.code.lines[ ln ] );

                // We already are in the first non space index...
                if( idx == cursor.position ) idx = 0;

                const prestring = this.code.lines[ ln ].substring( 0, idx );
                let lastX = cursor.position;

                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                if( idx > 0 )
                {
                    this.cursorToString( cursor, prestring );
                }
                else
                {
                    // No spaces, start from char 0
                    idx = 0;
                }

                this.setScrollLeft( 0 );
                this.mergeCursors( ln );

                if( e.shiftKey && !e.cancelShift )
                {
                    // Get last selection range
                    if( cursor.selection )
                    {
                        lastX += cursor.selection.chars;
                    }

                    if( !cursor.selection )
                    {
                        this.startSelection( cursor );
                    }

                    var string = this.code.lines[ ln ].substring( idx, lastX );
                    if( cursor.selection.sameLine() )
                    {
                        cursor.selection.selectInline( cursor, idx, cursor.line, this.measureString( string ) );
                    }
                    else
                    {
                        this._processSelection( cursor, e );
                    }
                } else if( !e.keepSelection )
                    this.endSelection();
            });

            this.action( 'End', false, ( ln, cursor, e ) => {

                if( ( e.shiftKey || e._shiftKey ) && !e.cancelShift ) {

                    var string = this.code.lines[ ln ].substring( cursor.position );
                    if( !cursor.selection )
                        this.startSelection( cursor );
                    if( cursor.selection.sameLine() )
                        cursor.selection.selectInline( cursor, cursor.position, cursor.line, this.measureString( string ));
                    else
                    {
                        this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                        this.cursorToString( cursor, this.code.lines[ ln ] );
                        this._processSelection( cursor, e );
                    }
                } else if( !e.keepSelection )
                    this.endSelection();

                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToString( cursor, this.code.lines[ ln ] );

                var viewportSizeX = ( this.codeScroller.clientWidth + this.getScrollLeft() ) - CodeEditor.LINE_GUTTER_WIDTH; // Gutter offset
                if( ( cursor.position * this.charWidth ) >= viewportSizeX )
                    this.setScrollLeft( this.code.lines[ ln ].length * this.charWidth );

                // Merge cursors
                this.mergeCursors( ln );
            });

            this.action( 'Enter', true, ( ln, cursor, e ) => {

                // Add word
                if( this.isAutoCompleteActive )
                {
                    this.autoCompleteWord();
                    return;
                }

                if( e.ctrlKey )
                {
                    this.onrun( this.getText() );
                    return;
                }

                this._addUndoStep( cursor, true );

                var _c0 = this.getCharAtPos( cursor, -1 );
                var _c1 = this.getCharAtPos( cursor );

                this.code.lines.splice( cursor.line + 1, 0, "" );
                this.code.lines[cursor.line + 1] = this.code.lines[ ln ].substr( cursor.position ); // new line (below)
                this.code.lines[ ln ] = this.code.lines[ ln ].substr( 0, cursor.position ); // line above

                this.lineDown( cursor, true );

                // Check indentation
                var spaces = firstNonspaceIndex( this.code.lines[ ln ]);
                var tabs = Math.floor( spaces / this.tabSpaces );

                if( _c0 == '{' && _c1 == '}' )
                {
                    this.code.lines.splice( cursor.line, 0, "" );
                    this._addSpaceTabs( cursor, tabs + 1 );
                    this.code.lines[ cursor.line + 1 ] = " ".repeat(spaces) + this.code.lines[ cursor.line + 1 ];
                }
                else
                {
                    this._addSpaceTabs( cursor, tabs );
                }

                this.processLines();
            });

            this.action( 'ArrowUp', false, ( ln, cursor, e ) => {

                // Move cursor..
                if( !this.isAutoCompleteActive )
                {
                    if( e.shiftKey ) {
                        if( !cursor.selection )
                            this.startSelection( cursor );

                        this.lineUp( cursor );

                        var letter = this.getCharAtPos( cursor );
                        if( !letter ) {
                            this.cursorToPosition( cursor, this.code.lines[ cursor.line ].length );
                        }

                        this._processSelection( cursor, e, false );

                    } else {
                        this.endSelection();
                        this.lineUp( cursor );
                        // Go to end of line if out of line
                        var letter = this.getCharAtPos( cursor );
                        if( !letter ) this.actions['End'].callback( cursor.line, cursor, e );
                    }
                }
                // Move up autocomplete selection
                else
                {
                    this._moveArrowSelectedAutoComplete('up');
                }
            });

            this.action( 'ArrowDown', false, ( ln, cursor, e ) => {

                // Move cursor..
                if( !this.isAutoCompleteActive )
                {
                    if( e.shiftKey ) {
                        if( !cursor.selection )
                            this.startSelection( cursor );
                    } else {
                        this.endSelection();
                    }

                    const canGoDown = this.lineDown( cursor );
                    const letter = this.getCharAtPos( cursor );

                    // Go to end of line if out of range
                    if( !letter || !canGoDown ) {
                        this.cursorToPosition( cursor, Math.max(this.code.lines[ cursor.line ].length, 0) );
                    }

                    if( e.shiftKey ) {
                        this._processSelection( cursor, e );
                    }
                }
                // Move down autocomplete selection
                else
                {
                    this._moveArrowSelectedAutoComplete('down');
                }
            });

            this.action( 'ArrowLeft', false, ( ln, cursor, e ) => {

                // Nothing to do..
                if( cursor.line == 0 && cursor.position == 0 )
                return;

                if( e.metaKey ) { // Apple devices (Command)
                    e.preventDefault();
                    this.actions[ 'Home' ].callback( ln, cursor, e );
                }
                else if( e.ctrlKey ) {
                    // Get next word
                    const [word, from, to] = this.getWordAtPos( cursor, -1 );
                    // If no length, we change line..
                    if( !word.length && this.lineUp( cursor, true ) ) {
                        const cS = e.cancelShift, kS = e.keepSelection;
                        e.cancelShift = true;
                        e.keepSelection = true;
                        this.actions[ 'End' ].callback( cursor.line, cursor, e );
                        e.cancelShift = cS;
                        e.keepSelection = kS;
                    }
                    var diff = Math.max( cursor.position - from, 1 );
                    var substr = word.substr( 0, diff );

                    // Selections...
                    if( e.shiftKey ) {
                        if( !cursor.selection )
                        this.startSelection( cursor );
                    }
                    else
                        this.endSelection();

                    this.cursorToString( cursor, substr, true );

                    if( e.shiftKey )
                        this._processSelection( cursor, e );
                }
                else {
                    var letter = this.getCharAtPos( cursor, -1 );
                    if( letter ) {
                        if( e.shiftKey ) {
                            if( !cursor.selection ) this.startSelection( cursor );
                            this.cursorToLeft( letter, cursor );
                            this._processSelection( cursor, e, false, CodeEditor.SELECTION_X );
                        }
                        else {
                            if( !cursor.selection ) {
                                this.cursorToLeft( letter, cursor );
                                if( this.useAutoComplete && this.isAutoCompleteActive )
                                    this.showAutoCompleteBox( 'foo', cursor );
                            }
                            else {
                                cursor.selection.invertIfNecessary();
                                this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP, cursor );
                                this.cursorToLine( cursor, cursor.selection.fromY, true );
                                this.cursorToPosition( cursor, cursor.selection.fromX );
                                this.endSelection();
                            }
                        }
                    }
                    else if( cursor.line > 0 ) {

                        if( e.shiftKey && !cursor.selection ) this.startSelection( cursor );

                        this.lineUp( cursor );

                        e.cancelShift = e.keepSelection = true;
                        this.actions[ 'End' ].callback( cursor.line, cursor, e );
                        delete e.cancelShift; delete e.keepSelection;

                        if( e.shiftKey ) this._processSelection( cursor, e, false );
                    }
                }
            });

            this.action( 'ArrowRight', false, ( ln, cursor, e ) => {

                // Nothing to do..
                if( cursor.line == this.code.lines.length - 1 &&
                    cursor.position == this.code.lines[ cursor.line ].length )
                return;

                if( e.metaKey ) // Apple devices (Command)
                {
                    e.preventDefault();
                    this.actions[ 'End' ].callback( ln, cursor );
                }
                else if( e.ctrlKey ) // Next word
                {
                    // Get next word
                    const [ word, from, to ] = this.getWordAtPos( cursor );

                    // If no length, we change line..
                    if( !word.length ) this.lineDown( cursor, true );
                    var diff = cursor.position - from;
                    var substr = word.substr( diff );

                    // Selections...
                    if( e.shiftKey ) {
                        if( !cursor.selection )
                            this.startSelection( cursor );
                    }
                    else
                        this.endSelection();

                    this.cursorToString( cursor, substr );

                    if( e.shiftKey )
                        this._processSelection( cursor, e );
                }
                else // Next char
                {
                    var letter = this.getCharAtPos( cursor );
                    if( letter ) {

                        // Selecting chars
                        if( e.shiftKey )
                        {
                            if( !cursor.selection )
                                this.startSelection( cursor );

                            this.cursorToRight( letter, cursor );
                            this._processSelection( cursor, e, false, CodeEditor.SELECTION_X );
                        }
                        else
                        {
                            if( !cursor.selection ) {
                                this.cursorToRight( letter, cursor );
                                if( this.useAutoComplete && this.isAutoCompleteActive )
                                    this.showAutoCompleteBox( 'foo', cursor );
                            }
                            else
                            {
                                cursor.selection.invertIfNecessary();
                                this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP, cursor );
                                this.cursorToLine( cursor, cursor.selection.toY );
                                this.cursorToPosition( cursor, cursor.selection.toX );
                                this.endSelection();
                            }
                        }
                    }
                    else if( this.code.lines[ cursor.line + 1 ] !== undefined ) {

                        if( e.shiftKey ) {
                            if( !cursor.selection ) this.startSelection( cursor );
                        }
                        else this.endSelection();

                        this.lineDown( cursor, true );

                        if( e.shiftKey ) this._processSelection( cursor, e, false );

                        this.hideAutoCompleteBox();
                    }
                }
            });
        }

        // Default code tab

        this.loadedTabs = { };
        this.openedTabs = { };

        const onLoadAll = () => {

            // Create inspector panel when the initial state is complete
            // and we have at least 1 tab opened
            this.statusPanel = this._createStatusPanel( options );
            if( this.statusPanel )
            {
                area.attach( this.statusPanel );
            }

            // Wait until the fonts are all loaded
            document.fonts.ready.then(() => {
                // Load any font size from local storage
                const savedFontSize = window.localStorage.getItem( "lexcodeeditor-font-size" );
                if( savedFontSize )
                {
                    this._setFontSize( parseInt( savedFontSize ) );
                }
                else // Use default size
                {
                    const r = document.querySelector( ':root' );
                    const s = getComputedStyle( r );
                    this.fontSize = parseInt( s.getPropertyValue( "--code-editor-font-size" ) );
                    this.charWidth = this._measureChar( "a", true );
                    this.processLines();
                }

                LX.emit( "@font-size", this.fontSize );

                // Get final sizes for editor elements based on Tabs and status bar offsets
                LX.doAsync( () => {
                    this._verticalTopOffset = this.tabs?.root.getBoundingClientRect().height ?? 0;
                    this._verticalBottomOffset = this.statusPanel?.root.getBoundingClientRect().height ?? 0;
                    this._fullVerticalOffset = this._verticalTopOffset + this._verticalBottomOffset;

                    this.gutter.style.marginTop = `${ this._verticalTopOffset }px`;
                    this.gutter.style.height = `calc(100% - ${ this._fullVerticalOffset }px)`;
                    this.vScrollbar.root.style.marginTop = `${ this._verticalTopOffset }px`;
                    this.vScrollbar.root.style.height = `calc(100% - ${ this._fullVerticalOffset }px)`;
                    this.hScrollbar.root.style.bottom = `${ this._verticalBottomOffset }px`;
                    this.codeArea.root.style.height = `calc(100% - ${ this._fullVerticalOffset }px)`;
                }, 50 );

            });

            window.editor = this;
        };

        if( options.allowAddScripts ?? true )
        {
            this.onCreateFile = options.onCreateFile;
            this.addTab( "+", false, "Create file" );
        }

        if( options.files )
        {
            console.assert( options.files.constructor === Array, "_files_ must be an Array!" );
            const numFiles = options.files.length;
            const loadAsync = ( options.filesAsync !== undefined );
            let filesLoaded = 0;
            for( let url of options.files )
            {
                const finalUrl = url.constructor === Array ? url[ 0 ] : url;
                const finalFileName = url.constructor === Array ? url[ 1 ] : undefined;

                await this.loadFile( finalUrl, { filename: finalFileName, async: loadAsync, callback: ( name, text ) => {
                    filesLoaded++;
                    if( filesLoaded == numFiles )
                    {
                        onLoadAll();

                        if( options.onFilesLoaded )
                        {
                            options.onFilesLoaded( this.loadedTabs, numFiles );
                        }
                    }
                }});
            }
        }
        else
        {
            this.addTab( options.name || "untitled", true, options.title, { language: options.highlight ?? "Plain Text" } );
            onLoadAll();
        }
    }

    static getInstances()
    {
        return CodeEditor.__instances;
    }

    // This received key inputs from the entire document...
    onKeyPressed( e ) {

        // Toggle visibility of the file explorer
        if( e.key == 'b' && e.ctrlKey && this.useFileExplorer )
        {
            this.explorerArea.root.classList.toggle( "hidden" );
            if( this._lastBaseareaWidth )
            {
                this.baseArea.root.style.width = this._lastBaseareaWidth;
                delete this._lastBaseareaWidth;

            } else
            {
                this._lastBaseareaWidth = this.baseArea.root.style.width;
                this.baseArea.root.style.width = "100%";
            }
        }
    }

    getText( min ) {
        return this.code.lines.join( min ? ' ' : '\n' );
    }

    // This can be used to empty all text...
    setText( text = "", lang ) {

        let newLines = text.split( '\n' );
        this.code.lines = [].concat( newLines );

        this._removeSecondaryCursors();

        let cursor = this.getCurrentCursor( true );
        let lastLine = newLines.pop();

        this.cursorToLine( cursor, newLines.length ); // Already substracted 1
        this.cursorToPosition( cursor, lastLine.length );

        this.mustProcessLines = true;

        if( lang )
        {
            this._changeLanguage( lang );
        }

        this._processLinesIfNecessary();
    }

    appendText( text, cursor ) {

        let lidx = cursor.line;

        if( cursor.selection )
        {
            this.deleteSelection( cursor );
            lidx = cursor.line;
        }

        this.endSelection();

        const newLines = text.replaceAll( '\r', '' ).split( '\n' );

        // Pasting Multiline...
        if( newLines.length != 1 )
        {
            let num_lines = newLines.length;
            console.assert( num_lines > 0 );
            const first_line = newLines.shift();
            num_lines--;

            const remaining = this.code.lines[ lidx ].slice( cursor.position );

            // Add first line
            this.code.lines[ lidx ] = [
                this.code.lines[ lidx ].slice( 0, cursor.position ),
                first_line
            ].join('');

            this.cursorToPosition( cursor, ( cursor.position + first_line.length ) );

            // Enter next lines...

            let _text = null;

            for( var i = 0; i < newLines.length; ++i ) {
                _text = newLines[ i ];
                this.cursorToLine( cursor, cursor.line++, true );
                // Add remaining...
                if( i == (newLines.length - 1) )
                    _text += remaining;
                this.code.lines.splice( 1 + lidx + i, 0, _text );
            }

            if( _text ) this.cursorToPosition( cursor, _text.length );
            this.cursorToLine( cursor, cursor.line + num_lines );
            this.processLines();
        }
        // Pasting one line...
        else
        {
            this.code.lines[ lidx ] = [
                this.code.lines[ lidx ].slice( 0, cursor.position ),
                newLines[ 0 ],
                this.code.lines[ lidx ].slice( cursor.position )
            ].join('');

            this.cursorToPosition( cursor, ( cursor.position + newLines[ 0 ].length ) );
            this.processLine( lidx );
        }

        this.resize( CodeEditor.RESIZE_SCROLLBAR_H_V, null, ( scrollWidth, scrollHeight ) => {
            var viewportSizeX = ( this.codeScroller.clientWidth + this.getScrollLeft() ) - CodeEditor.LINE_GUTTER_WIDTH; // Gutter offset
            if( ( cursor.position * this.charWidth ) >= viewportSizeX )
            {
                this.setScrollLeft( this.code.lines[ lidx ].length * this.charWidth );
            }
        } );
    }

    async loadFile( file, options = {} ) {

        const _innerAddTab = ( text, name, title ) => {

            // Remove Carriage Return in some cases and sub tabs using spaces
            text = text.replaceAll( '\r', '' ).replaceAll( /\t|\\t/g, ' '.repeat( this.tabSpaces ) );

            // Set current text and language
            const lines = text.split( '\n' );

            // Add item in the explorer if used
            if( this.useFileExplorer || this.skipTabs )
            {
                this._tabStorage[ name ] = {
                    lines: lines,
                    options: options
                };

                const ext = CodeEditor.languages[ options.language ] ?. ext;

                if( this.useFileExplorer )
                {
                    this.addExplorerItem( { id: name, skipVisibility: true, icon: this._getFileIcon( name, ext ) } );
                    this.explorer.innerTree.frefresh( name );
                }
            }
            else
            {
                this.addTab( name, true, title, options );
                this.code.lines = lines;

                // Default inferred language if not specified
                if( !options.language )
                {
                    this._changeLanguageFromExtension( LX.getExtension( name ) );
                }
            }

            if( options.callback )
            {
                options.callback( name, text );
            }
        };

        if( file.constructor == String )
        {
            const filename = file;
            const name = options.filename ?? filename.substring(filename.lastIndexOf( '/' ) + 1);

            if( options.async ?? false )
            {
                const text = await this._requestFileAsync( filename, "text" );
                _innerAddTab( text, name, options.filename ?? filename );
            }
            else
            {
                LX.request({ url: filename, success: text => {
                    _innerAddTab( text, name, options.filename ?? filename );
                } });
            }
        }
        else // File Blob
        {
            const fr = new FileReader();
            fr.readAsText( file );
            fr.onload = e => {
                const text = e.currentTarget.result;
                _innerAddTab( text, file.name );
            };
        }
    }

    _addUndoStep( cursor, force, deleteRedo = true )  {

        // Only the mainc cursor stores undo steps
        if( !cursor.isMain )
            return;

        const d = new Date();
        const current = d.getTime();

        if( !force )
        {
            if( !this._lastTime )
            {
                this._lastTime = current;
            }
            else
            {
                if( ( current - this._lastTime ) > 2000 )
                {
                    this._lastTime = null;
                }
                else
                {
                    // If time not enough, reset timer
                    this._lastTime = current;
                    return;
                }
            }
        }

        if( deleteRedo )
        {
            // Remove all redo steps
            this.code.redoSteps.length = 0;
        }

        this.code.undoSteps.push( {
            lines: LX.deepCopy( this.code.lines ),
            cursors: this.saveCursors()
        } );
    }

    _doUndo( cursor ) {

        if( !this.code.undoSteps.length )
            return;

        this._addRedoStep( cursor );

        // Extract info from the last code state
        const step = this.code.undoSteps.pop();

        // Set old state lines
        this.code.lines = step.lines;
        this.processLines();

        this._removeSecondaryCursors();

        for( let i = 0; i < step.cursors.length; ++i )
        {
            var currentCursor = this.cursors.children[ i ];

            // Generate new if needed
            if( !currentCursor )
                currentCursor = this._addCursor();

            this.restoreCursor( currentCursor, step.cursors[ i ] );
        }

        this._hideActiveLine();
    }

    _addRedoStep( cursor )  {

        // Only the mainc cursor stores redo steps
        if( !cursor.isMain )
        {
            return;
        }

        this.code.redoSteps.push( {
            lines: LX.deepCopy( this.code.lines ),
            cursors: this.saveCursors()
        } );
    }

    _doRedo( cursor ) {

        if( !this.code.redoSteps.length )
            return;

        this._addUndoStep( cursor, true, false);

        // Extract info from the next saved code state
        const step = this.code.redoSteps.pop();

        // Set old state lines
        this.code.lines = step.lines;
        this.processLines();

        this._removeSecondaryCursors();

        for( let i = 0; i < step.cursors.length; ++i )
        {
            var currentCursor = this.cursors.children[ i ];

            // Generate new if needed
            if( !currentCursor )
            {
                currentCursor = this._addCursor();
            }

            this.restoreCursor( currentCursor, step.cursors[ i ] );
        }
    }

    _changeLanguage( lang, langExtension, override = false ) {

        this.code.language = lang;
        this.highlight = lang;

        if( override )
        {
            this.code.languageOverride = lang;
        }

        this._updateDataInfoPanel( "@highlight", lang );

        this.mustProcessLines = true;

        const ext = langExtension ?? CodeEditor.languages[ lang ].ext;
        const icon = this._getFileIcon( null, ext );

        // Update tab icon
        if( !this.skipTabs )
        {
            const tab = this.tabs.tabDOMs[ this.code.tabName ];
            tab.firstChild.remove();
            console.assert( tab != undefined );
            var iconEl;
            if( !icon.includes( '.' ) ) // Not a file
            {
                const classes = icon.split( ' ' );
                iconEl = LX.makeIcon( classes[ 0 ], { svgClass: classes.slice( 0 ).join( ' ' ) } );
            } else
            {
                iconEl = document.createElement( 'img' );
                iconEl.src = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/" + icon;
            }
            tab.prepend( iconEl );
        }

        // Update explorer icon
        if( this.useFileExplorer )
        {
            const item = this.explorer.innerTree.data.children.filter( (v) => v.id === this.code.tabName )[ 0 ];
            console.assert( item != undefined );
            item.icon = icon;
            this.explorer.innerTree.frefresh( this.code.tabName );
        }
    }

    _changeLanguageFromExtension( ext ) {

        if( !ext )
        {
            return this._changeLanguage( this.code.language );
        }

        for( let l in CodeEditor.languages )
        {
            const langExtension = CodeEditor.languages[ l ].ext;

            if( langExtension.constructor == Array )
            {
                if( langExtension.indexOf( ext ) > -1 )
                {
                    return this._changeLanguage( l, ext );
                }
            }
            else
            {
                if( langExtension == ext )
                {
                    return this._changeLanguage( l );
                }
            }

        }

        this._changeLanguage( 'Plain Text' );
    }

    _createStatusPanel( options ) {

        if( this.skipInfo )
        {
            return;
        }

        let panel = new LX.Panel({ className: "lexcodetabinfo flex flex-row", height: "auto" });

        let leftStatusPanel = new LX.Panel( { id: "FontSizeZoomStatusComponent", height: "auto" } );
        leftStatusPanel.sameLine();

        if( this.skipTabs )
        {
            leftStatusPanel.addButton( null, "ZoomOutButton", this._decreaseFontSize.bind( this ), { icon: "ZoomOut", width: "32px", title: "Zoom Out", tooltip: true } );
        }

        leftStatusPanel.addButton( null, "ZoomOutButton", this._decreaseFontSize.bind( this ), { icon: "ZoomOut", width: "32px", title: "Zoom Out", tooltip: true } );
        leftStatusPanel.addLabel( this.fontSize ?? 14, { fit: true, signal: "@font-size" });
        leftStatusPanel.addButton( null, "ZoomInButton", this._increaseFontSize.bind( this ), { icon: "ZoomIn", width: "32px", title: "Zoom In", tooltip: true } );
        leftStatusPanel.endLine( "justify-start" );
        panel.attach( leftStatusPanel.root );

        let rightStatusPanel = new LX.Panel( { height: "auto" } );
        rightStatusPanel.sameLine();
        rightStatusPanel.addLabel( this.code?.title ?? "", { id: "EditorFilenameStatusComponent", fit: true, signal: "@tab-name" });
        rightStatusPanel.addButton( null, "Ln 1, Col 1", this.showSearchLineBox.bind( this ), { id: "EditorSelectionStatusComponent", fit: true, signal: "@cursor-data" });
        rightStatusPanel.addButton( null, "Spaces: " + this.tabSpaces, ( value, event ) => {
            LX.addContextMenu( "Spaces", event, m => {
                const options = [ 2, 4, 8 ];
                for( const n of options )
                    m.add( n, (v) => {
                        this.tabSpaces = v;
                        this.processLines();
                        this._updateDataInfoPanel( "@tab-spaces", "Spaces: " + this.tabSpaces );
                    } );
            });
        }, { id: "EditorIndentationStatusComponent", nameWidth: "15%", signal: "@tab-spaces" });
        rightStatusPanel.addButton( "<b>{ }</b>", this.highlight, ( value, event ) => {
            LX.addContextMenu( "Language", event, m => {
                for( const lang of Object.keys( CodeEditor.languages ) )
                {
                    m.add( lang, v => {
                        this._changeLanguage( v, null, true )
                    } );
                }
            });
        }, { id: "EditorLanguageStatusComponent", nameWidth: "15%", signal: "@highlight" });
        rightStatusPanel.endLine( "justify-end" );
        panel.attach( rightStatusPanel.root );

        const itemVisibilityMap = {
            "Font Size Zoom": options.statusShowFontSizeZoom ?? true,
            "Editor Filename": options.statusShowEditorFilename ?? true,
            "Editor Selection": options.statusShowEditorSelection ?? true,
            "Editor Indentation": options.statusShowEditorIndentation ?? true,
            "Editor Language": options.statusShowEditorLanguage ?? true,
        };

        const _setVisibility = ( itemName ) => {
            const b = panel.root.querySelector( `#${ itemName.replaceAll( " ", "" ) }StatusComponent` );
            console.assert( b, `${ itemName } has no status button!` );
            b.classList.toggle( "hidden", !itemVisibilityMap[ itemName ] );
        }

        for( const [ itemName, v ] of Object.entries( itemVisibilityMap ) )
        {
            _setVisibility( itemName );
        }

        panel.root.addEventListener( "contextmenu", (e) => {

            if( e.target && ( e.target.classList.contains( "lexpanel" ) || e.target.classList.contains( "lexinlinecomponents" ) ) )
            {
                return;
            }

            const menuOptions = Object.keys( itemVisibilityMap ).map( ( itemName, idx ) => {
                const item = {
                    name: itemName,
                    icon: "Check",
                    callback: () => {
                        itemVisibilityMap[ itemName ] = !itemVisibilityMap[ itemName ];
                        _setVisibility( itemName );
                    }
                }
                if( !itemVisibilityMap[ itemName ] ) delete item.icon;
                return item;
            } );
            new LX.DropdownMenu( e.target, menuOptions, { side: "top", align: "start" });
        } );

        return panel;
    }

    _getFileIcon( name, extension, lang ) {

        const isNewTabButton = name ? ( name === '+' ) : false;
        if( isNewTabButton )
        {
            return;
        }

        if( !lang )
        {
            if( !extension )
            {
                extension = LX.getExtension( name );
            }
            else
            {
                const possibleExtensions = [].concat( extension );

                if( name )
                {
                    const fileExtension = LX.getExtension( name );
                    const idx = possibleExtensions.indexOf( fileExtension );

                    if( idx > -1)
                    {
                        extension = possibleExtensions[ idx ];
                    }
                }
                else
                {
                    extension = possibleExtensions[ 0 ];
                }
            }

            for( const [ l, lData ] of Object.entries( CodeEditor.languages ) )
            {
                const extensions = [].concat( lData.ext );
                if( extensions.includes( extension ) )
                {
                    lang = l;
                    break;
                }
            }

        }

        const iconPlusClasses = CodeEditor.languages[ lang ]?.icon;
        if( iconPlusClasses )
        {
            return iconPlusClasses[ extension ] ?? iconPlusClasses;
        }

        return "AlignLeft gray";
    }

    _onNewTab( e ) {

        this.processFocus( false );

        new LX.DropdownMenu( e.target, [
            { name: "Create file", icon: "FilePlus", callback: this._onCreateNewFile.bind( this ) },
            { name: "Load file", icon: "FileUp", callback: this.loadTabFromFile.bind( this ) },
        ], { side: "bottom", align: "start" });
    }

    _onCreateNewFile() {

        let options = {};

        if( this.onCreateFile )
        {
            options = this.onCreateFile( this );
        }

        const name = options.name ?? "unnamed.js";
        this.addTab( name, true, name, { indexOffset: options.indexOffset, language: options.language ?? "JavaScript" } );
    }

    _onSelectTab( isNewTabButton, event, name ) {

        if( this.disableEdition )
        {
            return;
        }

        if( isNewTabButton )
        {
            this._onNewTab( event );
            return;
        }

        this._removeSecondaryCursors();

        var cursor = this.getCurrentCursor( true );
        this.saveCursor( cursor, this.code.cursorState );
        this.code = this.loadedTabs[ name ];
        this.restoreCursor( cursor, this.code.cursorState );

        this.endSelection();

        this.hideAutoCompleteBox();

        this._updateDataInfoPanel( "@tab-name", name );

        if( this.code.languageOverride )
        {
            this._changeLanguage( this.code.languageOverride );
        }
        else
        {
            this._changeLanguageFromExtension( LX.getExtension( name ) );
        }

        this.processLines();
    }

    _onContextMenuTab( isNewTabButton, event, name,  ) {

        if( isNewTabButton )
        {
            return;
        }

        new LX.DropdownMenu( event.target, [
            { name: "Close", kbd: "MWB", disabled: !this.allowClosingTabs, callback: () => { this.closeTab( name ) } },
            { name: "Close Others", disabled: !this.allowClosingTabs, callback: () => {
                for( const [ key, data ] of Object.entries( this.tabs.tabs ) )
                {
                    if( key === '+' || key === name ) continue;
                    this.closeTab( key )
                }
            } },
            { name: "Close All", disabled: !this.allowClosingTabs, callback: () => {
                for( const [ key, data ] of Object.entries( this.tabs.tabs ) )
                {
                    if( key === '+' ) continue;
                    this.closeTab( key )
                }
            } },
            null,
            { name: "Copy Path", icon: "Copy", callback: () => {
                navigator.clipboard.writeText( this.openedTabs[ name ].path ?? "" );
            } }
        ], { side: "bottom", align: "start", event });
    }

    addTab( name, selected, title, options = {} ) {

        // If already loaded, set new name...
        const repeats = Object.keys( editor.loadedTabs ).slice( 1 ).reduce( ( v, key ) => {
            const noRepeatName = key.replace( /[_\d+]/g, '');
            return v + ( noRepeatName == name );
        }, 0 );

        if( repeats > 0 )
        {
            name = name.split( '.' ).join( '_' + repeats + '.' );
        }

        const isNewTabButton = ( name === '+' );

        // Create code content
        let code = document.createElement( 'div' );
        Object.assign( code, {
            path: options.path ?? "",
            className: 'code',
            lines: [ "" ],
            language: options.language ?? "Plain Text",
            cursorState: {},
            undoSteps: [],
            redoSteps: [],
            lineScopes: [],
            lineSymbols: [],
            lineSignatures: [],
            symbolsTable: new Map(),
            tabName: name,
            title: title ?? name,
            tokens: {}
        } );

        code.style.left = "0px",
        code.style.top = "0px",

        code.addEventListener( 'dragenter', function(e) {
            e.preventDefault();
            this.parentElement.classList.add( 'dragging' );
        });
        code.addEventListener( 'dragleave', function(e) {
            e.preventDefault();
            this.parentElement.remove( 'dragging' );
        });
        code.addEventListener( 'drop', e => {
            e.preventDefault();
            code.parentElement.classList.remove( 'dragging' );
            for( let i = 0; i < e.dataTransfer.files.length; ++i )
                this.loadFile( e.dataTransfer.files[ i ] );
        });

        this.loadedTabs[ name ] = code;
        this.openedTabs[ name ] = code;

        const tabIcon = this._getFileIcon( name );

        if( this.useFileExplorer && !isNewTabButton )
        {
            this.addExplorerItem( { id: name, skipVisibility: true, icon: tabIcon } );
            this.explorer.innerTree.frefresh( name );
        }

        if( !this.skipTabs )
        {
            this.tabs.add( name, code, {
                selected: selected,
                fixed: isNewTabButton,
                title: code.title,
                icon: tabIcon,
                onSelect: this._onSelectTab.bind( this, isNewTabButton ),
                onContextMenu: this._onContextMenuTab.bind( this, isNewTabButton ),
                allowDelete: true,
                indexOffset: options.indexOffset
            } );
        }

        // Move into the sizer..
        this.codeSizer.appendChild( code );

        this.endSelection();

        if( selected )
        {
            this.code = code;
            this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP );
            this.mustProcessLines = true;
        }

        if( options.language )
        {
            code.languageOverride = options.language;
            this._changeLanguage( code.languageOverride );
            this.mustProcessLines = true;
        }

        this._processLinesIfNecessary();

        this._updateDataInfoPanel( "@tab-name", name );

        // Bc it could be overrided..
        return name;
    }

    loadCode( name ) {

        // Hide all others
        this.codeSizer.querySelectorAll( ".code" ).forEach( c => c.classList.add( "hidden" ) );

        // Already open...
        if( this.openedTabs[ name ] )
        {
            let code = this.openedTabs[ name ]
            code.classList.remove( "hidden" );
            return;
        }

        let code = this.loadedTabs[ name ]
        if( !code )
        {
            this.addTab( name, true );

            // Unload lines from storage...
            const tabData = this._tabStorage[ name ];
            if( tabData )
            {
                this.code.lines = tabData.lines;

                if( tabData.options.language )
                {
                    this._changeLanguage( tabData.options.language, null, true );
                }
                else
                {
                    this._changeLanguageFromExtension( LX.getExtension( name ) );
                }

                delete this._tabStorage[ name ];
            }

            this._processLinesIfNecessary();

            return;
        }

        this.openedTabs[ name ] = code;

        // Move into the sizer..
        this.codeSizer.appendChild( code );

        this.endSelection();

        // Select as current...
        this.code = code;
        this.mustProcessLines = true;

        this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP );
        this.processLines();
        this._changeLanguageFromExtension( LX.getExtension( name ) );
        this._processLinesIfNecessary();
        this._updateDataInfoPanel( "@tab-name", code.tabName );
    }

    loadTab( name ) {

        // Already open...
        if( this.openedTabs[ name ] )
        {
            this.tabs.select( name );
            return;
        }

        let code = this.loadedTabs[ name ]

        if( !code )
        {
            this.addTab( name, true );

            // Unload lines from storage...
            const tabData = this._tabStorage[ name ];
            if( tabData )
            {
                this.code.lines = tabData.lines;

                if( tabData.options.language )
                {
                    this._changeLanguage( tabData.options.language, null, true );
                }
                else
                {
                    this._changeLanguageFromExtension( LX.getExtension( name ) );
                }

                delete this._tabStorage[ name ];
            }

            this._processLinesIfNecessary();

            return;
        }

        this.openedTabs[ name ] = code;

        const isNewTabButton = ( name === '+' );
        const tabIcon = this._getFileIcon( name );

        this.tabs.add(name, code, {
            selected: true,
            fixed: isNewTabButton,
            title: code.title,
            icon: tabIcon,
            onSelect: this._onSelectTab.bind( this, isNewTabButton ),
            onContextMenu: this._onContextMenuTab.bind( this, isNewTabButton ),
            allowDelete: true
        });

        // Move into the sizer..
        this.codeSizer.appendChild( code );

        this.endSelection();

        // Select as current...
        this.code = code;
        this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP );
        this.processLines();
        this._changeLanguageFromExtension( LX.getExtension( name ) );
        this._updateDataInfoPanel( "@tab-name", code.tabName );
    }

    closeTab( name, eraseAll ) {

        if( !this.allowClosingTabs )
        {
            return;
        }

        this.tabs.delete( name );

        if( eraseAll )
        {
            delete this.openedTabs[ name ];
            delete this.loadedTabs[ name ];
            delete this._tabStorage[ name ];
        }
    }

    getSelectedTabName() {
        return this.tabs.selected;
    }

    loadTabFromFile() {

        const input = document.createElement( 'input' );
        input.type = 'file';
        document.body.appendChild( input );
        input.click();
        input.addEventListener('change', e => {
            if( e.target.files[ 0 ] )
            {
                this.loadFile( e.target.files[ 0 ] );
            }
            input.remove();
        });
    }

    processFocus( active ) {

        if( active )
        {
            this.restartBlink();
        }
        else
        {
            clearInterval( this.blinker );
            this.cursors.classList.remove( 'show' );
        }
    }

    processMouse( e ) {

        if( !e.target.classList.contains('code') && !e.target.classList.contains('lexcodearea') ) return;
        if( !this.code ) return;

        var cursor = this.getCurrentCursor();
        var code_rect = this.code.getBoundingClientRect();
        var mouse_pos = [(e.clientX - code_rect.x), (e.clientY - code_rect.y)];

        // Discard out of lines click...
        var ln = ( mouse_pos[ 1 ] / this.lineHeight ) | 0;
        if( ln < 0 ) return;

        if( e.type == 'mousedown' )
        {
            // Left click only...
            if( e.button === 2 )
            {
                this.processClick( e );

                this.canOpenContextMenu = !cursor.selection;

                if( cursor.selection )
                {
                    this.canOpenContextMenu |= (cursor.line >= cursor.selection.fromY && cursor.line <= cursor.selection.toY
                                                && cursor.position >= cursor.selection.fromX && cursor.position <= cursor.selection.toX);
                    if( this.canOpenContextMenu )
                        return;
                }
            }

            this.lastMouseDown = LX.getTime();
            this.state.selectingText = true;
            this.endSelection();
            this.processClick( e );
        }

        else if( e.type == 'mouseup' )
        {
            this._onMouseUp( e );
        }

        else if( e.type == 'mousemove' )
        {
            if( this.state.selectingText )
                this.processSelections( e );
        }

        else if ( e.type == 'click' ) // trip
        {
            switch( e.detail )
            {
                case LX.MOUSE_DOUBLE_CLICK:
                    const [word, from, to] = this.getWordAtPos( cursor );
                    this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                    this.cursorToPosition( cursor, from );
                    this.startSelection( cursor );
                    cursor.selection.selectInline( cursor, from, cursor.line, this.measureString( word ) );
                    this.cursorToString( cursor, word ); // Go to the end of the word
                    break;
                // Select entire line
                case LX.MOUSE_TRIPLE_CLICK:
                    this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                    e._shiftKey = true;
                    this.actions['End'].callback(cursor.line, cursor, e);
                    this._tripleClickSelection = true;
                    break;
            }
        }

        else if ( e.type == 'contextmenu' )
        {
            e.preventDefault();

            if( !this.canOpenContextMenu )
                return;

            LX.addContextMenu( null, e, m => {
                m.add( "Copy", () => {  this._copyContent( cursor ); } );
                if( !this.disableEdition )
                {
                    m.add( "Cut", () => {  this._cutContent( cursor ); } );
                    m.add( "Paste", () => {  this._pasteContent( cursor ); } );
                    m.add( "" );
                    m.add( "Format/JSON", () => {
                        let json = this.toJSONFormat( this.getText() );
                        if( !json )
                            return;
                        this.code.lines = json.split( "\n" );
                        this.processLines();
                    } );
                }
            });

            this.canOpenContextMenu = false;
        }
    }

    _onMouseUp( e ) {

        if( ( LX.getTime() - this.lastMouseDown ) < 120 )
        {
            this.state.selectingText = false;
            this.endSelection();
        }

        const cursor = this.getCurrentCursor();
        if( cursor.selection )
        {
            cursor.selection.invertIfNecessary();
        }

        this.state.selectingText = false;
        delete this._lastSelectionKeyDir;
    }

    processClick( e ) {

        var cursor = this.getCurrentCursor();
        var code_rect = this.codeScroller.getBoundingClientRect();
        var position = [( e.clientX - code_rect.x ) + this.getScrollLeft(), (e.clientY - code_rect.y) + this.getScrollTop()];
        var ln = (position[ 1 ] / this.lineHeight)|0;

        // Check out of range line
        const outOfRange = ln > this.code.lines.length - 1;
        ln = Math.min( ln, this.code.lines.length - 1 );

        var ch = ( ( position[ 0 ] - parseInt( this.xPadding ) + 3) / this.charWidth )|0;
        var string = outOfRange ? this.code.lines[ ln ] : this.code.lines[ ln ].slice( 0, ch );

        // Move main cursor there...
        if( !e.altKey )
        {
            // Make sure we only keep the main cursor..
            this._removeSecondaryCursors();
            this.cursorToLine( cursor, ln, true );
            this.cursorToPosition( cursor, string.length );
        }

        // Add new cursor
        else
        {
            this._addCursor( ln, string.length );
        }

        this.hideAutoCompleteBox();
    }

    updateSelections( e, keepRange, flags = CodeEditor.SELECTION_X_Y ) {

        for( let cursor of this.cursors.children )
        {
            if( !cursor.selection )
            {
                continue;
            }

            this._processSelection( cursor, e, keepRange, flags );
        }
    }

    processSelections( e, keepRange, flags = CodeEditor.SELECTION_X_Y ) {

        for( let cursor of this.cursors.children )
        {
            this._processSelection( cursor, e, keepRange, flags );
        }
    }

    _processSelection( cursor, e, keepRange, flags = CodeEditor.SELECTION_X_Y ) {

        const isMouseEvent = e && ( e.constructor == MouseEvent );

        if( isMouseEvent )
        {
            this.processClick( e );
        }

        if( !cursor.selection )
        {
            this.startSelection( cursor );
        }

        this._hideActiveLine();

        // Update selection
        if( !keepRange )
        {
            let ccw = true;

            // Check if we must change ccw or not ... (not with mouse)
            if( !isMouseEvent && cursor.line >= cursor.selection.fromY &&
                (cursor.line == cursor.selection.fromY ? cursor.position >= cursor.selection.fromX : true) )
            {
                ccw = ( e && this._lastSelectionKeyDir && ( e.key == 'ArrowRight' || e.key == 'ArrowDown' || e.key == 'End' ) );
            }

            if( ccw )
            {
                if( flags & CodeEditor.SELECTION_X ) cursor.selection.fromX = cursor.position;
                if( flags & CodeEditor.SELECTION_Y ) cursor.selection.fromY = cursor.line;
            }
            else
            {
                if( flags & CodeEditor.SELECTION_X ) cursor.selection.toX = cursor.position;
                if( flags & CodeEditor.SELECTION_Y ) cursor.selection.toY = cursor.line;
            }

            this._lastSelectionKeyDir = ccw;
        }

        // Only leave if not a mouse selection...
        if( !isMouseEvent && cursor.selection.isEmpty() )
        {
            this.endSelection();
            return;
        }

        cursor.selection.chars = 0;

        const fromX = cursor.selection.fromX,
                fromY = cursor.selection.fromY,
                toX = cursor.selection.toX,
                toY = cursor.selection.toY;
        const deltaY = toY - fromY;

        let cursorSelections = this.selections[ cursor.name ];

        // Selection goes down...
        if( deltaY >= 0 )
        {
            while( deltaY < ( cursorSelections.childElementCount - 1 ) )
                LX.deleteElement( cursorSelections.lastChild );

            for(let i = fromY; i <= toY; i++){

                const sId = i - fromY;
                const isVisible = i >= this.visibleLinesViewport.x && i <= this.visibleLinesViewport.y;
                let domEl = null;

                if( isVisible )
                {
                    // Make sure that the line selection is generated...
                    domEl = cursorSelections.childNodes[ sId ];
                    if(!domEl)
                    {
                        domEl = document.createElement( 'div' );
                        domEl.className = "lexcodeselection";
                        cursorSelections.appendChild( domEl );
                    }
                }

                // Compute new width and selection margins
                let string = "";

                if( sId == 0 ) // First line 2 cases (single line, multiline)
                {
                    const reverse = fromX > toX;
                    if(deltaY == 0) string = !reverse ? this.code.lines[ i ].substring( fromX, toX ) : this.code.lines[ i ].substring(toX, fromX);
                    else string = this.code.lines[ i ].substr( fromX );
                    const pixels = ( reverse && deltaY == 0 ? toX : fromX ) * this.charWidth;
                    if( isVisible ) domEl.style.left = `calc(${ pixels }px + ${ this.xPadding })`;
                }
                else
                {
                    string = ( i == toY ) ? this.code.lines[ i ].substring( 0, toX ) : this.code.lines[ i ]; // Last line, any multiple line...
                    if( isVisible ) domEl.style.left = this.xPadding;
                }

                const stringWidth = this.measureString( string );
                cursor.selection.chars += stringWidth / this.charWidth;

                if( isVisible )
                {
                    domEl.style.width = ( stringWidth || 8 ) + "px";
                    domEl._top = i * this.lineHeight;
                    domEl.style.top = domEl._top + "px";
                }
            }
        }
        else // Selection goes up...
        {
            while( Math.abs( deltaY ) < ( cursorSelections.childElementCount - 1 ) )
                LX.deleteElement( cursorSelections.firstChild );

            for( let i = toY; i <= fromY; i++ ){

                const sId = i - toY;
                const isVisible = i >= this.visibleLinesViewport.x && i <= this.visibleLinesViewport.y;
                let domEl = null;

                if( isVisible )
                {
                    // Make sure that the line selection is generated...
                    domEl = cursorSelections.childNodes[ sId ];
                    if( !domEl )
                    {
                        domEl = document.createElement( 'div' );
                        domEl.className = "lexcodeselection";
                        cursorSelections.appendChild( domEl );
                    }
                }

                // Compute new width and selection margins
                let string;

                if( sId == 0 )
                {
                    string = this.code.lines[ i ].substr(toX);
                    const pixels = toX * this.charWidth;
                    if( isVisible ) domEl.style.left = "calc(" + pixels + "px + " + this.xPadding + ")";
                }
                else
                {
                    string = (i == fromY) ? this.code.lines[ i ].substring(0, fromX) : this.code.lines[ i ]; // Last line, any multiple line...
                    if( isVisible ) domEl.style.left = this.xPadding;
                }

                const stringWidth = this.measureString( string );
                cursor.selection.chars += stringWidth / this.charWidth;

                if( isVisible )
                {
                    domEl.style.width = (stringWidth || 8) + "px";
                    domEl._top = i * this.lineHeight;
                    domEl.style.top = domEl._top + "px";
                }
            }
        }
    }

    async processKey( e ) {

        const numCursors = this.cursors.childElementCount;

        if( !this.code || e.srcElement.constructor != HTMLDivElement )
        return;

        const key = e.key ?? e.detail.key;

        // Do not propagate "space to scroll" event
        if( key == ' ' )
        {
            e.preventDefault();
            e.stopPropagation();
        }

        const target = e.detail.targetCursor;

        // Global keys

        if( this._processGlobalKeys( e, key ) ) {
            // Stop propagation..
            return;
        }

        // By cursor keys

        if( target !== undefined )
        {
            this.processKeyAtTargetCursor( e, key, target );
            return;
        }

        this._lastProcessedCursorIndex = null;

        var lastProcessedCursor = null;
        var cursorOffset = new LX.vec2( 0, 0 );

        for( var i = 0; i < numCursors; i++ )
        {
            let cursor = this.cursors.children[ i ];

            // We could delete secondary cursor while iterating..
            if( !cursor )
                break;

            // Arrows don't modify code lines.. And only add offset if in the same line
            if( lastProcessedCursor && lastProcessedCursor.line == cursor.line && !key.includes( 'Arrow' ) )
            {
                cursor.position += cursorOffset.x;
                cursor.line += cursorOffset.y;

                this.relocateCursors();
            }

            lastProcessedCursor = this.saveCursor( cursor );
            this._lastProcessedCursorIndex = i;

            this._processKeyAtCursor( e, key, cursor );

            cursorOffset.x += ( cursor.position - lastProcessedCursor.position );
            cursorOffset.y += ( cursor.line - lastProcessedCursor.line );
        }

        // Clear tmp

        delete this._lastProcessedCursorIndex;
    }

    async processKeyAtTargetCursor( e, key, targetIdx ) {

        let cursor = this.cursors.children[ targetIdx ];

        // We could delete secondary cursor while iterating..
        if( !cursor )
            return;

        this._processKeyAtCursor( e, key, cursor );
        this._processGlobalKeys( e, key );
    }

    _processGlobalKeys( e, key ) {

        let cursor = this.getCurrentCursor();

        if( e.ctrlKey || e.metaKey )
        {
            switch( key.toLowerCase() ) {
            case 'a': // select all
                e.preventDefault();
                this.selectAll();
                return true;
            case 'c': // k+c, comment line
                e.preventDefault();
                if( this.state.keyChain == 'k' ) {
                    this._commentLines();
                    return true;
                }
                return false;
            case 'd': // next ocurrence
                e.preventDefault();
                this.selectNextOcurrence( cursor );
                return true;
            case 'f': // find/search
                e.preventDefault();
                this.showSearchBox();
                return true;
            case 'g': // find line
                e.preventDefault();
                this.showSearchLineBox();
                return true;
            case 'k': // shortcut chain
                e.preventDefault();
                this.state.keyChain = 'k';
                return true;
            case 's': // save
                e.preventDefault();
                this.onsave( this.getText() );
                return true;
            case 'u': // k+u, uncomment line
                e.preventDefault();
                if( this.state.keyChain == 'k' ) {
                    this._uncommentLines();
                    return true;
                }
                return false;
            case 'y': // redo
                e.preventDefault();
                this._doRedo( cursor );
                return true;
            case 'z': // undo
                e.preventDefault();
                this._doUndo( cursor );
                return true;
            case '+': // increase size
                e.preventDefault();
                this._increaseFontSize();
                return true;
            case '-': // decrease size
                e.preventDefault();
                this._decreaseFontSize();
                return true;
            }
        }

        this.state.keyChain = null;
        return false;
    }

    async _processKeyAtCursor( e, key, cursor ) {

        const skipUndo = e.detail.skipUndo ?? false;

        // keys with length > 1 are probably special keys
        if( key.length > 1 && this.specialKeys.indexOf( key ) == -1 )
        {
            return;
        }

        let lidx = cursor.line;
        this.code.lines[ lidx ] = this.code.lines[ lidx ] ?? "";

        // Check combinations

        const isLastCursor = cursor.isLast();

        if( e.ctrlKey || e.metaKey )
        {
            switch( key.toLowerCase() ) {
            case 'c': // copy
                this._copyContent( cursor );
                return;
            case 'v': // paste
                this._pasteContent( cursor );
                return;
            case 'x': // cut line
                this._cutContent( cursor );
                this.hideAutoCompleteBox();
                return;
            case 'arrowdown': // add cursor below only for the main cursor..
                // Make sure shift is not pressed..
                if( !e.shiftKey && isLastCursor && this.code.lines[ lidx + 1 ] != undefined )
                {
                    var new_cursor = this._addCursor( cursor.line, cursor.position, true );
                    this.lineDown( new_cursor );
                    return;
                }
            }
        }

        else if( e.altKey )
        {
            switch( key ) {
                case 'd': // duplicate line
                e.preventDefault();
                this._duplicateLine( lidx, cursor );
                return;
                case 'ArrowUp':
                if(this.code.lines[ lidx - 1 ] == undefined)
                    return;
                this._addUndoStep( cursor, true );
                swapArrayElements( this.code.lines, lidx - 1, lidx );
                this.lineUp( cursor );
                this.processLine( lidx - 1 );
                this.processLine( lidx );
                this.hideAutoCompleteBox();
                return;
            case 'ArrowDown':
                if(this.code.lines[ lidx + 1 ] == undefined)
                    return;
                this._addUndoStep( cursor, true );
                swapArrayElements( this.code.lines, lidx, lidx + 1 );
                this.lineDown( cursor );
                this.processLine( lidx );
                this.processLine( lidx + 1 );
                this.hideAutoCompleteBox();
                return;
            }
        }

        // Apply binded actions...

        for( const actKey in this.actions ) {

            if( key != actKey )
                continue;

            e.preventDefault();

            if( this._actionMustDelete( cursor, this.actions[ key ], e ) )
                this.actions['Backspace'].callback( lidx, cursor, e );

            return this.actions[ key ].callback( lidx, cursor, e );
        }

        // From now on, don't allow ctrl, shift or meta (mac) combinations
        if( e.ctrlKey || e.metaKey )
            return;

        // Add undo steps

        if( !skipUndo && this.code.lines.length )
        {
            this._addUndoStep( cursor );
        }

        //  Some custom cases for word enclosing (), {}, "", '', ...

        const enclosableKeys = [ "\"", "'", "(", "{" ];
        if( enclosableKeys.indexOf( key ) > -1 )
        {
            if( this._encloseSelectedWordWithKey( key, lidx, cursor ) )
                return;
        }

        // Until this point, if there was a selection, we need
        // to delete the content..

        if( cursor.selection )
        {
            this.actions['Backspace'].callback( lidx, cursor, e );
            lidx = cursor.line;
        }

        // Append key

        const isPairKey = ( Object.values( this.pairKeys ).indexOf( key ) > -1 ) && !this.wasKeyPaired;
        const sameKeyNext = isPairKey && ( this.code.lines[ lidx ][ cursor.position ] === key );

        if( !sameKeyNext )
        {
            this.code.lines[ lidx ] = [
                this.code.lines[ lidx ].slice( 0, cursor.position ),
                key,
                this.code.lines[ lidx ].slice( cursor.position )
            ].join('');
        }

        this.cursorToRight( key, cursor );

        //  Some custom cases for auto key pair (), {}, "", '', ...

        const keyMustPair = (this.pairKeys[ key ] !== undefined);
        if( keyMustPair && !this.wasKeyPaired )
        {
            // Make sure to detect later that the key is paired automatically to avoid loops...
            this.wasKeyPaired = true;

            if( sameKeyNext ) return;

            this.root.dispatchEvent(new KeyboardEvent('keydown', { 'key': this.pairKeys[ key ] }));
            this.cursorToLeft( key, cursor );
            return;
        }

        // Once here we can pair keys again
        delete this.wasKeyPaired;

        // Update only the current line, since it's only an appended key
        this.processLine( lidx );

        // We are out of the viewport and max length is different? Resize scrollbars...
        this.resizeIfNecessary( cursor );

        // Manage autocomplete

        if( this.useAutoComplete )
        {
            this.showAutoCompleteBox( key, cursor );
        }
    }

    async _pasteContent( cursor ) {

        const mustDetectLanguage = ( !this.getText().length );

        let text = await navigator.clipboard.readText();

        // Remove any possible tabs (\t) and add spaces
        text = text.replaceAll( /\t|\\t/g, ' '.repeat( this.tabSpaces ) );

        this._addUndoStep( cursor, true );

        this.appendText( text, cursor );

        const currentScroll = this.getScrollTop();
        const scroll = Math.max( cursor.line * this.lineHeight - this.codeScroller.offsetWidth, 0 );

        if( currentScroll < scroll )
        {
            this.codeScroller.scrollTo( 0, cursor.line * this.lineHeight );
        }

        if( mustDetectLanguage )
        {
            const detectedLang = this._detectLanguage( text );
            if( detectedLang )
            {
                this._changeLanguage( detectedLang );
            }
        }
    }

    async _copyContent( cursor ) {

        let textToCopy = "";

        if( !cursor.selection )
        {
            textToCopy = "\n" + this.code.lines[ cursor.line ];
        }
        else
        {
            // Some selections don't depend on mouse up..
            if( cursor.selection ) cursor.selection.invertIfNecessary();

            const separator = "_NEWLINE_";
            let code = this.code.lines.join( separator );

            // Get linear start index
            let index = 0;

            for( let i = 0; i <= cursor.selection.fromY; i++ )
            {
                index += ( i == cursor.selection.fromY ? cursor.selection.fromX : this.code.lines[ i ].length );
            }

            index += cursor.selection.fromY * separator.length;
            const num_chars = cursor.selection.chars + ( cursor.selection.toY - cursor.selection.fromY ) * separator.length;
            const text = code.substr( index, num_chars );
            const lines = text.split( separator );
            textToCopy = lines.join('\n');
        }

        navigator.clipboard.writeText( textToCopy );
            // .then(() => console.log("Successfully copied"), (err) => console.error("Error"));
    }

    async _cutContent( cursor ) {

        let lidx = cursor.line;
        let textToCut = "";

        this._addUndoStep( cursor, true );

        if( !cursor.selection )
        {
            textToCut = "\n" + this.code.lines[ cursor.line ];
            this.code.lines.splice( lidx, 1 );
            this.processLines();
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
            if( this.code.lines[ lidx ] == undefined )
            {
                this.lineUp( cursor );
            }
        }
        else
        {
            // Some selections don't depend on mouse up..
            if( cursor.selection ) cursor.selection.invertIfNecessary();

            const separator = "_NEWLINE_";
            let code = this.code.lines.join( separator );

            // Get linear start index
            let index = 0;

            for( let i = 0; i <= cursor.selection.fromY; i++ )
            {
                index += (i == cursor.selection.fromY ? cursor.selection.fromX : this.code.lines[ i ].length);
            }

            index += cursor.selection.fromY * separator.length;
            const numChars = cursor.selection.chars + (cursor.selection.toY - cursor.selection.fromY) * separator.length;
            const text = code.substr( index, numChars );
            const lines = text.split( separator );
            textToCut = lines.join('\n');

            this.deleteSelection( cursor );
        }

        navigator.clipboard.writeText( textToCut );
            // .then(() => console.log("Successfully cut"), (err) => console.error("Error"));
    }

    _duplicateLine( lidx, cursor ) {

        this.endSelection();
        this._addUndoStep( cursor, true );
        this.code.lines.splice( lidx, 0, this.code.lines[ lidx ] );
        this.lineDown( cursor );
        this.processLines();
        this.hideAutoCompleteBox();
    }

    _commentLines() {

        this.state.keyChain = null;

        if( cursor.selection )
        {
            var cursor = this.getCurrentCursor();
            this._addUndoStep( cursor, true );

            const selectedLines = this.code.lines.slice( cursor.selection.fromY, cursor.selection.toY );
            const minIdx = Math.min(...selectedLines.map( v => {
                var idx = firstNonspaceIndex( v );
                return idx < 0 ? 1e10 : idx;
            } ));

            for( var i = cursor.selection.fromY; i <= cursor.selection.toY; ++i )
            {
                this._commentLine( cursor, i, minIdx );
            }
        }
        else
        {
            for( let cursor of this.cursors.children )
            {
                this._addUndoStep( cursor, true );
                this._commentLine( cursor, cursor.line );
            }
        }

        this.processLines();
        this._hideActiveLine();
    }

    _commentLine( cursor, line, minNonspaceIdx ) {

        const lang = CodeEditor.languages[ this.highlight ];

        if( !( lang.singleLineComments ?? true ))
            return;

        const token = ( lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken ) + ' ';
        const string = this.code.lines[ line ];

        let idx = firstNonspaceIndex( string );
        if( idx > -1 )
        {
            // Update idx using min of the selected lines (if necessary..)
            idx = minNonspaceIdx ?? idx;

            this.code.lines[ line ] = [
                string.substring( 0, idx ),
                token,
                string.substring( idx )
            ].join( '' );

            this.cursorToString( cursor, token );
        }
    }

    _uncommentLines() {

        this.state.keyChain = null;

        if( cursor.selection )
        {
            var cursor = this.getCurrentCursor();
            this._addUndoStep( cursor, true );

            for( var i = cursor.selection.fromY; i <= cursor.selection.toY; ++i )
            {
                this._uncommentLine( cursor, i );
            }
        }
        else
        {
            for( let cursor of this.cursors.children )
            {
                this._addUndoStep( cursor, true );
                this._uncommentLine( cursor, cursor.line );
            }
        }

        this.processLines();
        this._hideActiveLine();
    }

    _uncommentLine( cursor, line ) {

        const lang = CodeEditor.languages[ this.highlight ];

        if( !( lang.singleLineComments ?? true ))
            return;

        const token = lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken;
        const string = this.code.lines[ line ];

        if( string.includes( token ) )
        {
            this.code.lines[ line ] = string.replace( token + ' ', '' );

            // try deleting token + space, and then if not, delete only the token
            if( string.length == this.code.lines[ line ].length )
                this.code.lines[ line ] = string.replace( token, '' );

            this.cursorToString( cursor, 'X'.repeat( Math.abs( string.length - this.code.lines[ line ].length ) ), true );
        }
    }

    action( key, deleteSelection, fn, eventSkipDelete ) {

        this.actions[ key ] = {
            "key": key,
            "callback": fn,
            "deleteSelection": deleteSelection,
            "eventSkipDelete": eventSkipDelete
        };
    }

    _actionMustDelete( cursor, action, e ) {
        return cursor.selection && action.deleteSelection &&
            ( action.eventSkipDelete ? !e[ action.eventSkipDelete ] : true );
    }

    scanWordSuggestions() {

        this.code.tokens = {};

        for( let i = 0; i < this.code.lines.length; ++i )
        {
            const lineString = this.code.lines[ i ];
            const tokens = this._getTokensFromLine( lineString, true );
            tokens.forEach( t => this.code.tokens[ t ] = 1 );
        }
    }

    toLocalLine( line ) {
        const d = Math.max( this.firstLineInViewport - this.lineScrollMargin.x, 0 );
        return Math.min( Math.max( line - d, 0 ), this.code.lines.length - 1 );
    }

    getMaxLineLength() {
        return Math.max(...this.code.lines.map( v => v.length ));
    }

    _processLinesIfNecessary() {
        if( this.mustProcessLines )
        {
            this.mustProcessLines = false;
            this.processLines();
        }
    }

    processLines( mode ) {

        if( !this.code )
        {
            return;
        }

        var htmlCode = "";
        this._blockCommentCache.length = 0;
        this.mustProcessLines = false;

        // Reset all lines content
        this.code.innerHTML = "";

        // Get info about lines in viewport
        const lastScrollTop = this.getScrollTop();
        this.firstLineInViewport = ( mode ?? CodeEditor.KEEP_VISIBLE_LINES ) & CodeEditor.UPDATE_VISIBLE_LINES ?
                                    ( (lastScrollTop / this.lineHeight)|0 ) : this.firstLineInViewport;
        const totalLinesInViewport = ( ( this.codeScroller.offsetHeight ) / this.lineHeight )|0;
        this.visibleLinesViewport = new LX.vec2(
            Math.max( this.firstLineInViewport - this.lineScrollMargin.x, 0 ),
            Math.min( this.firstLineInViewport + totalLinesInViewport + this.lineScrollMargin.y, this.code.lines.length )
        );

        // Add remaining lines if we are near the end of the scroll
        {
            const diff = Math.max( this.code.lines.length - this.visibleLinesViewport.y, 0 );
            if( diff <= this.lineScrollMargin.y )
            {
                this.visibleLinesViewport.y += diff;
            }
        }

        this._scopeStack = [ { name: "", type: "global" } ];

        // Process visible lines
        for( let i = this.visibleLinesViewport.x; i < this.visibleLinesViewport.y; ++i )
        {
            htmlCode += this.processLine( i, true );
        }

        this.code.innerHTML = htmlCode;

        // Update scroll data
        this.codeScroller.scrollTop = lastScrollTop;
        this.code.style.top = ( this.visibleLinesViewport.x * this.lineHeight ) + "px";

        // Update selections
        this.updateSelections( null, true );

        this._clearTmpVariables();
        this._setActiveLine();
        this.resize();
    }

    processLine( lineNumber, force, skipPropagation ) {

        if( this._scopeStack )
        {
            this.code.lineScopes[ lineNumber ] = [ ...this._scopeStack ];
        }
        else
        {
            this.code.lineScopes[ lineNumber ] = this.code.lineScopes[ lineNumber ] ?? [];
            this._scopeStack = [ ...this.code.lineScopes[ lineNumber ] ];
        }

        const lang = CodeEditor.languages[ this.highlight ];
        const localLineNum =  this.toLocalLine( lineNumber );
        const lineString = this.code.lines[ lineNumber ];
        if( lineString === undefined )
        {
            return;
        }

        this._lastProcessedLine = lineNumber;

        // multi-line strings not supported by now
        delete this._buildingString;
        delete this._pendingString;
        delete this._markdownHeader;

        // Single line
        if( !force )
        {
            LX.deleteElement( this.code.childNodes[ localLineNum ] );
            this.code.insertChildAtIndex( document.createElement( 'pre' ), localLineNum );
        }

        // Early out check for no highlighting languages
        if( this.highlight == 'Plain Text' )
        {
            const plainTextHtml = lineString.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
            return this._updateLine( force, lineNumber, plainTextHtml, skipPropagation );
        }

        this._currentLineNumber = lineNumber;
        this._currentLineString = lineString;

        const tokensToEvaluate = this._getTokensFromLine( lineString );
        if( !tokensToEvaluate.length )
        {
            return this._updateLine( force, lineNumber, "", skipPropagation );
        }

        let lineInnerHtml = "";
        let pushedScope = false;

        const newSignature = this._getLineSignatureFromTokens( tokensToEvaluate );
        const cachedSignature = this.code.lineSignatures[ lineNumber ];
        const mustUpdateScopes = ( cachedSignature !== newSignature ) && !force;
        const blockComments = lang.blockComments ?? true;
        const blockCommentsTokens = lang.blockCommentsTokens ?? this.defaultBlockCommentTokens;

        // Reset scope stack if structural changes in current line
        if( mustUpdateScopes )
        {
            this._scopeStack = [ { name: "", type: "global" } ];
        }

        // Process all tokens
        for( let i = 0; i < tokensToEvaluate.length; ++i )
        {
            let it = i - 1;
            let prev = tokensToEvaluate[ it ];
            while( prev == ' ' )
            {
                it--;
                prev = tokensToEvaluate[ it ];
            }

            it = i + 1;
            let next = tokensToEvaluate[ it ];
            while( next == ' ' || next == '"' )
            {
                it++;
                next = tokensToEvaluate[ it ];
            }

            const token = tokensToEvaluate[ i ];
            const tokenIndex = i;
            const tokenStartIndex = this._currentTokenPositions[ tokenIndex ];;

            if( blockComments )
            {
                if( token.substr( 0, blockCommentsTokens[ 0 ].length ) == blockCommentsTokens[ 0 ] )
                {
                    this._buildingBlockComment = [ lineNumber, tokenStartIndex ];
                }
            }

            // Compare line signature for structural changes
            // to pop current scope if necessary
            if( token === "}" && this._scopeStack.length > 1 )
            {
                this._scopeStack.pop();
            }

            lineInnerHtml += this._evaluateToken( {
                token,
                prev,
                prevWithSpaces: tokensToEvaluate[ i - 1 ],
                next,
                nextWithSpaces: tokensToEvaluate[ i + 1 ],
                tokenIndex,
                isFirstToken: ( tokenIndex == 0 ),
                isLastToken: ( tokenIndex == tokensToEvaluate.length - 1 ),
                tokens: tokensToEvaluate
            } );

            if( blockComments && this._buildingBlockComment != undefined
                && token.substr( 0, blockCommentsTokens[ 1 ].length ) == blockCommentsTokens[ 1 ] )
            {
                const [ commentLineNumber, tokenPos ] = this._buildingBlockComment;
                this._blockCommentCache.push( [ new LX.vec2( commentLineNumber, lineNumber ), new LX.vec2( tokenPos, tokenStartIndex ) ] );
                delete this._buildingBlockComment;
            }

            if( token !== "{" )
            {
                continue;
            }

            // Store current scopes

            let contextTokens = [
                ...this._getTokensFromLine( this.code.lines[ lineNumber ].substring( 0, tokenStartIndex ) )
            ];

            // Add token context from above lines in case we don't have information
            // in the same line to get the scope data
            if( !prev )
            {
                for( let k = 1; k < 50; k++ )
                {
                    let kLineString = this.code.lines[ lineNumber - k ];
                    if( !kLineString )
                    {
                        break;
                    }

                    const openIdx = kLineString.lastIndexOf( '{' );
                    const closeIdx = kLineString.lastIndexOf( '}' );
                    if( openIdx > -1 )
                    {
                        kLineString = kLineString.substr( openIdx );
                    }
                    else if( closeIdx > -1 )
                    {
                        kLineString = kLineString.substr( closeIdx );
                    }

                    contextTokens = [ ...this._getTokensFromLine( kLineString ), ...contextTokens ];

                    if( kLineString.length !== this.code.lines[ lineNumber - k ] )
                    {
                        break;
                    }
                }
            }

            contextTokens = contextTokens.reverse().filter( v => v.length && v != ' ' );

            // Keywords that can open a *named* scope
            // TODO: Do this per language
            const scopeKeywords = ["class", "enum", "function", "interface", "type", "struct", "namespace"];

            let scopeType = null; // This is the type of scope (function, class, enum, etc)
            let scopeName = null;

            for( let i = 0; i < contextTokens.length; i++ )
            {
                const t = contextTokens[ i ];

                if ( scopeKeywords.includes( t ) )
                {
                    scopeType = t;
                    scopeName = contextTokens[ i - 1 ];  // usually right before the keyword in reversed array
                    break;
                }
            }

            // Special case: enum type specification `enum Foo : int {`
            if( scopeType === "enum" && contextTokens.includes( ":" ) )
            {
                const colonIndex = contextTokens.indexOf( ":" );
                scopeName = contextTokens[ colonIndex + 1 ] || scopeName;
            }

            if( !scopeType )
            {
                const parOpenIndex = contextTokens.indexOf( "(" );
                scopeName = contextTokens[ parOpenIndex + 1 ] || scopeName;

                if( scopeName )
                {
                    scopeType = "method";
                }
            }

            // Only push if it's not already reflected in the cached scopes
            const lastScope = this._scopeStack.at( -1 );
            if( lastScope?.lineNumber !== lineNumber )
            {
                this._scopeStack.push( { name: scopeName ?? "", type: scopeType ?? "anonymous", lineNumber } );
            }

            pushedScope = true;
        }

        // Update scopes cache
        this.code.lineScopes[ lineNumber ] = [ ...this._scopeStack ];

        const symbols = this._parseLineForSymbols( lineNumber, lineString, tokensToEvaluate, pushedScope );

        return this._updateLine( force, lineNumber, lineInnerHtml, skipPropagation, symbols, tokensToEvaluate );
    }

    _getLineSignatureFromTokens( tokens ) {
        const structuralChars = new Set( [ '{',  '}'] );
        const sign = tokens.filter( t => structuralChars.has( t ) );
        return sign.join( "_" );
    }

    _updateBlockComments( section, lineNumber, tokens ) {

        const lang = CodeEditor.languages[ this.highlight ];
        const blockCommentsTokens = lang.blockCommentsTokens ?? this.defaultBlockCommentTokens;
        const lineOpensBlock = ( section[ 0 ].x === lineNumber );
        const lineClosesBlock = ( section[ 0 ].y === lineNumber );
        const lineInsideBlock = ( section[ 0 ].x !== lineNumber ) && ( section[ 0 ].y !== lineNumber );

        delete this._buildingBlockComment;

        /*
            Check if delimiters have been removed and process lines backwards/forward
            until reaching new delimiters
        */

        if( lineOpensBlock )
        {
            const r = tokens.filter( t => t.substr( 0, blockCommentsTokens[ 0 ].length ) == blockCommentsTokens[ 0 ] );
            if( !r.length )
            {
                this._buildingBlockComment = [ lineNumber - 1, 0 ];

                this.mustProcessPreviousLine = ( tokens ) => {
                    const idx = tokens.indexOf( blockCommentsTokens[ 0 ] );
                    return ( idx === -1 );
                }

                this.processLine( lineNumber - 1, false, true );

                section[ 0 ].x = this._lastProcessedLine;

                const lastProcessedString = this.code.lines[ this._lastProcessedLine ];
                const idx = lastProcessedString.indexOf( blockCommentsTokens[ 0 ] );
                section[ 1 ].x = idx > 0 ? idx : 0;
            }
            else
            {
                const tokenIndex = tokens.indexOf( blockCommentsTokens[ 0 ] );
                const tokenStartIndex = this._currentTokenPositions[ tokenIndex ];
                section[ 1 ].x = tokenStartIndex;
                console.log(tokenStartIndex)
                // Process current line to update new sections
                this.processLine( lineNumber, false, true );
            }
        }
        else if( lineClosesBlock )
        {
            const r = tokens.filter( t => t.substr( 0, blockCommentsTokens[ 1 ].length ) == blockCommentsTokens[ 1 ] );
            if( !r.length )
            {
                this._buildingBlockComment = [ section[ 0 ].x, section[ 1 ].x ];

                this.mustProcessNextLine = ( tokens ) => {
                    const idx = tokens.indexOf( blockCommentsTokens[ 1 ] );
                    return ( idx === -1 );
                }

                this.processLine( lineNumber + 1, false, true );

                section[ 0 ].y = this._lastProcessedLine;

                const lastProcessedString = this.code.lines[ this._lastProcessedLine ];
                const idx = lastProcessedString.indexOf( blockCommentsTokens[ 1 ] );
                section[ 1 ].y = idx > 0 ? idx : ( lastProcessedString.length - 1 );
            }
            else
            {
                const tokenIndex = tokens.indexOf( blockCommentsTokens[ 1 ] );
                const tokenStartIndex = this._currentTokenPositions[ tokenIndex ];
                section[ 1 ].y = tokenStartIndex;
                // Process current line to update new sections
                this.processLine( lineNumber, false, true );
            }
        }
        else if( lineInsideBlock )
        {
            // Here it can't modify delimiters..
        }
    }

    _processExtraLineIfNecessary( lineNumber, tokens, oldSymbols, skipPropagation ) {

        if( !this._scopeStack )
        {
            console.warn( "CodeEditor: No scope available" );
            return;
        }

        // Update block comments if necessary
        {
            const commentBlockSection = this._inBlockCommentSection( lineNumber, 1e10, -1e10 );
            if( tokens && commentBlockSection !== undefined )
            {
                this._updateBlockComments( commentBlockSection, lineNumber, tokens );

                // Get again correct scope
                this._scopeStack = [ ...this.code.lineScopes[ lineNumber ] ];
            }
        }

        if( ( (lineNumber + 1) === this.code.lines.length ) || !this.code.lineScopes[ lineNumber + 1 ] )
        {
            return;
        }

        const newSignature = this._getLineSignatureFromTokens( tokens );
        const cachedSignature = this.code.lineSignatures[ lineNumber ];
        const mustUpdateScopes = ( cachedSignature !== newSignature );
        const sameScopes = codeScopesEqual( this._scopeStack, this.code.lineScopes[ lineNumber + 1 ] );

        // Only update scope stack if something changed when editing a single line
        // Compare line signature for structural changes
        if( ( mustUpdateScopes || this._scopesUpdated ) && ( !sameScopes && !skipPropagation ) )
        {
            if( mustUpdateScopes )
            {
                this._scopesUpdated = true;
            }

            this.code.lineScopes[ lineNumber + 1 ] = [ ...this._scopeStack ];
            this.processLine( lineNumber + 1 );

            delete this._scopesUpdated;
        }
        else if( sameScopes )
        {
            // In case of same scope, check for occurrencies of the old symbols, to reprocess that lines
            for( const sym of oldSymbols )
            {
                const tableSymbol = this.code.symbolsTable.get( sym.name );
                if( tableSymbol === undefined )
                {
                    return;
                }

                for( const occ of tableSymbol )
                {
                    if( occ.line === lineNumber )
                    {
                        continue;
                    }

                    this.processLine( occ.line, false, true );
                }
            }
        }
    }

    _updateLine( force, lineNumber, html, skipPropagation, symbols = [], tokens = [] ) {

        const gutterLineHtml = `<span class='line-gutter'>${ lineNumber + 1 }</span>`;
        const oldSymbols = this._updateLineSymbols( lineNumber, symbols );
        const lineScope = CodeEditor.debugScopes && this.code.lineScopes[ lineNumber ] ? this.code.lineScopes[ lineNumber ].map( s => `${ s.type }` ).join( ", " ) : "";
        const lineSymbols = CodeEditor.debugSymbols && this.code.lineSymbols[ lineNumber ] ? this.code.lineSymbols[ lineNumber ].map( s => `${ s.name }(${ s.kind })` ).join( ", " ) : "";
        const debugString = lineScope + ( lineScope.length ? " - " : "" ) + lineSymbols;

        if( !force ) // Single line update
        {
            this.code.childNodes[ this.toLocalLine( lineNumber ) ].innerHTML = ( gutterLineHtml + html + debugString );

            if( !skipPropagation )
            {
                this._processExtraLineIfNecessary( lineNumber, tokens, oldSymbols, skipPropagation );
            }

            if( this.mustProcessNextLine )
            {
                if( this.mustProcessNextLine( tokens ) && ( ( lineNumber + 1 ) < this.code.lines.length ) )
                {
                    this.processLine( lineNumber + 1, false, true );
                }
                else
                {
                    delete this.mustProcessNextLine;
                }
            }

            if( this.mustProcessPreviousLine )
            {
                if( this.mustProcessPreviousLine( tokens ) && ( ( lineNumber - 1 ) >= 0 ) )
                {
                    this.processLine( lineNumber - 1, false, true );
                }
                else
                {
                    delete this.mustProcessPreviousLine;
                }
            }

            if( CodeEditor.debugProcessedLines )
            {
                this.code.childNodes[ lineNumber ]?.classList.add( "debug" );
            }

            this._setActiveLine( lineNumber );
            this._clearTmpVariables();
        }

        this.code.lineSignatures[ lineNumber ] = this._getLineSignatureFromTokens( tokens );

        // Update all lines at once
        return force ? `<pre>${ ( gutterLineHtml + html + debugString ) }</pre>` : undefined;
    }

    /**
     * Parses a single line of code and extract declared symbols
     */
    _parseLineForSymbols( lineNumber, lineString, tokens, pushedScope ) {

        const scope = this._scopeStack.at( pushedScope ? -2 : -1 );

        if( !scope || this._inBlockCommentSection( lineNumber ) )
        {
            return [];
        }

        const scopeName = scope.name;
        const scopeType = scope.type;
        const symbols = [];
        const symbolsMap = new Map();
        const text = lineString.trim();
        const previousLineScope = this.code.lineScopes[ lineNumber - 1 ];

        const _pushSymbol = ( s ) => {
            const signature = `${ s.name }_${ s.kind }_${ s.scope }_${ s.line }`;
            if( symbolsMap.has( signature ) )
            {
                return;
            }
            symbolsMap.set( signature, s );
            symbols.push( s );
        };

        // Don't make symbols from preprocessor lines
        if( text.startsWith( "#" ) )
        {
            return [];
        }

        const nativeTypes = CodeEditor.nativeTypes[ this.highlight ];

        const topLevelRegexes = [
            [/^class\s+([A-Za-z0-9_]+)/, "class"],
            [/^struct\s+([A-Za-z0-9_]+)/, "struct"],
            [/^enum\s+([A-Za-z0-9_]+)/, "enum"],
            [/^interface\s+([A-Za-z0-9_]+)/, "interface"],
            [/^type\s+([A-Za-z0-9_]+)/, "type"],
            [/^function\s+([A-Za-z0-9_]+)/, "method"],
            [/^fn\s+([A-Za-z0-9_]+)/, "method"],
            [/^def\s+([A-Za-z0-9_]+)/, "method"],
            [/^([A-Za-z0-9_]+)\s*=\s*\(?.*\)?\s*=>/, "method"] // arrow functions
        ];

        // Add regexes to detect methods, variables ( including "id : nativeType" )
        {
            if( nativeTypes )
            {
                topLevelRegexes.push( [ new RegExp( `^(?:${nativeTypes.join('|')})\\s+([A-Za-z0-9_]+)\s*[\(]+` ), 'method' ] );

                if( this.highlight === "WGSL" )
                {
                    topLevelRegexes.push( [ new RegExp( `[A-Za-z0-9]+(\\s*)+:(\\s*)+(${nativeTypes.join('|')})` ), 'variable', ( m ) => m[ 0 ].split( ":" )[ 0 ].trim() ] );
                }
            }

            const declarationKeywords = CodeEditor.declarationKeywords[ this.highlight ] ?? [ "const", "let", "var" ];
            topLevelRegexes.push( [ new RegExp( `^(?:${ declarationKeywords.join('|') })\\s+([A-Za-z0-9_]+)` ), 'variable' ] );
        }

        for( let [ regex, kind, fn ] of topLevelRegexes )
        {
            const m = text.match( regex );
            if( m )
            {
                _pushSymbol( { name: fn ? fn( m ) : m[ 1 ], kind, scope: scopeName, line: lineNumber } );
            }
        }

        const usageRegexes = [
            [/new\s+([A-Za-z0-9_]+)\s*\(/, "constructor-call"],
            [/this.([A-Za-z_][A-Za-z0-9_]*)\s*\=/, "class-property"],
        ];

        for( let [ regex, kind, fn ] of usageRegexes )
        {
            const m = text.match( regex );
            if( m )
            {
                _pushSymbol( { name: fn ? fn( m ) : m[ 1 ], kind, scope: scopeName, line: lineNumber } );
            }
        }

        // Detect method calls
        const regex = /([A-Za-z0-9_]+)\s*\(/g;
        let match;
        while( match = regex.exec( text ) )
        {
            const name = match[ 1 ];
            const before = text.slice( 0, match.index );
            if( /(new|function|fn|def)\s+$/.test( before ) ) continue; // skip constructor calls
            if( [ "constructor", "location", ...( nativeTypes ?? [] ) ].indexOf( name ) > -1 ) continue; // skip hardcoded non method symbol
            if( previousLineScope && previousLineScope.at( -1 )?.type === "class" ) continue; // skip class methods
            _pushSymbol( { name, kind: "method-call", scope: scopeName, line: lineNumber } );
        }

        // Stop after matches for top-level declarations and usage symbols
        if( symbols.length )
        {
            return symbols;
        }

        const nonWhiteSpaceTokens = tokens.filter( t => t.trim().length );

        for( let i = 0; i < nonWhiteSpaceTokens.length; i++ )
        {
            const prev = nonWhiteSpaceTokens[ i - 1 ];
            const token = nonWhiteSpaceTokens[ i ];
            const next = nonWhiteSpaceTokens[ i + 1 ];

            if( scopeType.startsWith("class") )
            {
                if( next === "(" && /^[a-zA-Z_]\w*$/.test( token ) && prev === undefined )
                {
                    if( token === "constructor" ) continue; // skip constructor symbol
                    _pushSymbol( { name: token, kind: "method", scope: scopeName, line: lineNumber } );
                }
            }
            else if( scopeType.startsWith("enum") )
            {
                if( !isSymbol( token ) && !this._isNumber( token ) && !this._mustHightlightWord( token, CodeEditor.statements ) )
                {
                    _pushSymbol({ name: token, kind: "enum_value", scope: scopeName, line: lineNumber });
                }
            }
        }

        return symbols;
    }

    /**
     * Updates the symbol table for a single line
     * - Removes old symbols from that line
     * - Inserts the new symbols
     */
    _updateLineSymbols( lineNumber, newSymbols ) {

        this.code.lineSymbols[ lineNumber ] = this.code.lineSymbols[ lineNumber ] ?? [];
        const oldSymbols = LX.deepCopy( this.code.lineSymbols[ lineNumber ] );

        // Clean old symbols from current line
        for( let sym of this.code.lineSymbols[ lineNumber ] )
        {
            let array = this.code.symbolsTable.get( sym.name );
            if( !array )
            {
                continue;
            }

            array = array.filter( s => s.line !== lineNumber );

            if( array.length )
            {
                this.code.symbolsTable.set( sym.name, array );
            }
            else
            {
                this.code.symbolsTable.delete( sym.name );
            }
        }

        // Add new symbols to table
        for( let sym of newSymbols )
        {
            let arr = this.code.symbolsTable.get( sym.name ) ?? [];
            arr.push(sym);
            this.code.symbolsTable.set( sym.name, arr );
        }

        // Keep lineSymbols in sync
        this.code.lineSymbols[ lineNumber ] = newSymbols;

        return oldSymbols;
    }

    _lineHasComment( lineString ) {

        const lang = CodeEditor.languages[ this.highlight ];

        if( !(lang.singleLineComments ?? true) )
        {
            return;
        }

        const singleLineCommentToken = lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken;
        const idx = lineString.indexOf( singleLineCommentToken );

        if( idx > -1 )
        {
            const stringKeys = Object.values( this.stringKeys );
            // Count times we started a string BEFORE the comment
            var err = false;
            err |= stringKeys.some( function(v) {
                var re = new RegExp( v, "g" );
                var matches = (lineString.substring( 0, idx ).match( re ) || []);
                return (matches.length % 2) !== 0;
            } );
            return err ? undefined : idx;
        }
    }

    _getTokensFromLine( lineString, skipNonWords ) {

        if( !lineString || !lineString.length )
        {
            return [];
        }

        // Check if line comment
        const ogLine = lineString;
        const hasCommentIdx = this._lineHasComment( lineString );

        if( hasCommentIdx != undefined )
        {
            lineString = ogLine.substring( 0, hasCommentIdx );
        }

        let tokensToEvaluate = []; // store in a temp array so we know prev and next tokens...
        let charCounterList = [];
        let charCounter = 0;

        const pushToken = function( t ) {
            if( (skipNonWords && ( t.includes('"') || t.length < 3 )) )
                return;
            tokensToEvaluate.push( t );
            charCounterList.push( charCounter );
            // Update positions
            charCounter += t.length;
        };

        let iter = lineString.matchAll(/(<!--|-->|\*\/|\/\*|::|[\[\](){}<>.,;:*"'%@$!/= ])/g);
        let subtokens = iter.next();
        if( subtokens.value )
        {
            let idx = 0;
            while( subtokens.value != undefined )
            {
                const _pt = lineString.substring( idx, subtokens.value.index );
                if( _pt.length ) pushToken( _pt );
                pushToken( subtokens.value[ 0 ] );
                idx = subtokens.value.index + subtokens.value[ 0 ].length;
                subtokens = iter.next();
                if( !subtokens.value )
                {
                    const _at = lineString.substring( idx );
                    if( _at.length ) pushToken( _at );
                }
            }
        }
        else pushToken( lineString );

        if( hasCommentIdx != undefined )
        {
            pushToken( ogLine.substring( hasCommentIdx ) );
        }

        this._currentTokenPositions = charCounterList;

        return this._processTokens( tokensToEvaluate );
    }

    _processTokens( tokens, offset = 0 ) {

        if( this.highlight == 'C++' || this.highlight == 'CSS' )
        {
            var idx = tokens.slice( offset ).findIndex( ( value, index ) => this._isNumber( value ) );
            if( idx > -1 )
            {
                idx += offset; // Add offset to compute within the whole array of tokens
                let data = tokens[ idx ] + tokens[ ++idx ];
                while( this._isNumber( data ) )
                {
                    tokens[ idx - 1 ] += tokens[ idx ];
                    tokens.splice( idx, 1 );
                    data += tokens[ idx ];
                }
                // Scan for numbers again
                return this._processTokens( tokens, idx );
            }

            const importantIdx = tokens.indexOf( 'important' );
            if( this.highlight == 'CSS' && importantIdx > -1 && tokens[ importantIdx - 1 ] === '!' )
            {
                tokens[ importantIdx - 1 ] = "!important";
                tokens.splice( importantIdx, 1 );
            }
        }
        else if( this.highlight == 'PHP' )
        {
            let offset = 0;
            let dollarIdx = tokens.indexOf( '$' );

            while( dollarIdx > -1 )
            {
                const offsetIdx = dollarIdx + offset;

                if( tokens[ offsetIdx + 1 ] === 'this-' )
                {
                    tokens[ offsetIdx ] = "$this";
                    tokens[ offsetIdx + 1 ] = "-";
                }
                else
                {
                    tokens[ offsetIdx ] += ( tokens[ offsetIdx + 1 ] ?? "" );
                    tokens.splice( offsetIdx + 1, 1 );
                }

                dollarIdx = tokens.slice( offsetIdx ).indexOf( '$' );
                offset = offsetIdx;
            }
        }
        else if( this.highlight == 'WGSL' )
        {
            let offset = 0;
            let atIdx = tokens.indexOf( '@' );

            while( atIdx > -1 )
            {
                const offsetIdx = atIdx + offset;

                tokens[ offsetIdx ] += ( tokens[ offsetIdx + 1 ] ?? "" );
                tokens.splice( offsetIdx + 1, 1 );

                atIdx = tokens.slice( offsetIdx ).indexOf( '$' );
                offset = offsetIdx;
            }
        }

        return tokens;
    }

    _mustHightlightWord( token, wordCategory, lang ) {

        if( !lang )
        {
            lang = CodeEditor.languages[ this.highlight ];
        }

        let t = token;

        if( lang.ignoreCase )
        {
            t = t.toLowerCase();
        }

        return wordCategory[ this.highlight ] && wordCategory[ this.highlight ].has( t );
    }

    _getTokenHighlighting( ctx, highlight ) {

        const rules = [ ...HighlightRules.common, ...( HighlightRules[ highlight ] || [] ), ...HighlightRules.post_common ];

        for( const rule of rules )
        {
            if( !rule.test( ctx, this ) )
            {
                continue;
            }

            const r = rule.action ? rule.action( ctx, this ) : undefined;
            if( rule.discard ) ctx.discardToken = r;
            return rule.className;
        }

        return null;
    }

    _evaluateToken( ctxData ) {

        let { token, prev, next, tokenIndex, isFirstToken, isLastToken } = ctxData;

        const lang = CodeEditor.languages[ this.highlight ];
        const highlight = this.highlight.replace( /\s/g, '' ).replaceAll( "+", "p" ).toLowerCase();
        const customStringKeys = Object.assign( {}, this.stringKeys );
        const lineNumber = this._currentLineNumber;
        const tokenStartIndex = this._currentTokenPositions[ tokenIndex ];
        const inBlockComment = ( this._buildingBlockComment ?? this._inBlockCommentSection( lineNumber, tokenStartIndex, token.length ) !== undefined )

        var usePreviousTokenToCheckString = false;

        if( [ 'cpp', 'c' ].indexOf( highlight ) > -1 && prev && prev.includes( '#' ) ) // preprocessor code..
        {
            customStringKeys['@<'] = '>';
        }
        else if( highlight == 'markdown' && ( ctxData.prevWithSpaces == '[' || ctxData.nextWithSpaces == ']' ) )
        {
            // console.warn(prev, token, next)
            usePreviousTokenToCheckString = true;
            customStringKeys['@['] = ']';
        }

        // Manage strings
        this._stringEnded = false;

        if( usePreviousTokenToCheckString || ( !inBlockComment && ( lang.tags ?? false ? ( this._enclosedByTokens( token, tokenIndex, '<', '>' ) ) : true ) ) )
        {
            const _checkIfStringEnded = t => {
                const idx = Object.values( customStringKeys ).indexOf( t );
                this._stringEnded = (idx > -1) && (idx == Object.values(customStringKeys).indexOf( customStringKeys[ '@' + this._buildingString ] ));
            };

            if( this._buildingString != undefined )
            {
                _checkIfStringEnded( usePreviousTokenToCheckString ? ctxData.nextWithSpaces : token );
            }
            else if( customStringKeys[ '@' + ( usePreviousTokenToCheckString ? ctxData.prevWithSpaces : token ) ] )
            {
                // Start new string
                this._buildingString = ( usePreviousTokenToCheckString ? ctxData.prevWithSpaces : token );

                // Check if string ended in same token using next...
                if( usePreviousTokenToCheckString )
                {
                    _checkIfStringEnded( ctxData.nextWithSpaces );
                }
            }
        }

        // Update context data for next tests
        ctxData.discardToken = false;
        ctxData.inBlockComment = inBlockComment;
        ctxData.markdownHeader = this._markdownHeader;
        ctxData.inString = ( this._buildingString !== undefined );
        ctxData.singleLineCommentToken = lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken;
        ctxData.lang = lang;
        ctxData.scope = this._scopeStack.at( -1 );

        // Add utils functions for the rules
        ctxData.isVariableSymbol = ( token ) => this.code.symbolsTable.has( token ) && this.code.symbolsTable.get( token )[ 0 ].kind === "variable";
        ctxData.isEnumValueSymbol = ( token ) => this.code.symbolsTable.has( token ) && this.code.symbolsTable.get( token )[ 0 ].kind === "enum_value";
        ctxData.isClassSymbol = ( token ) => this.code.symbolsTable.has( token ) && this.code.symbolsTable.get( token )[ 0 ].kind === "class";
        ctxData.isStructSymbol = ( token ) => this.code.symbolsTable.has( token ) && this.code.symbolsTable.get( token )[ 0 ].kind === "struct";
        ctxData.isEnumSymbol = ( token ) => this.code.symbolsTable.has( token ) && this.code.symbolsTable.get( token )[ 0 ].kind === "enum";

        // Get highlighting class based on language common and specific rules
        let tokenClass = this._getTokenHighlighting( ctxData, highlight );

        // We finished constructing a string
        if( this._buildingString && ( this._stringEnded || isLastToken ) && !inBlockComment )
        {
            token = this._getCurrentString();
            tokenClass = "cm-str";
            ctxData.discardToken = false;
        }

        // Update state
        this._buildingString = this._stringEnded ? undefined : this._buildingString;

        if( ctxData.discardToken )
        {
            return "";
        }

        // Replace html chars
        token = token.replace( "<", "&lt;" ).replace( ">", "&gt;" );

        // No highlighting, no need to put it inside another span..
        if( !tokenClass )
        {
            return token;
        }

        return `<span class="${ highlight } ${ tokenClass }">${ token }</span>`;
    }

    _appendStringToken( token ) {

        if( !this._pendingString )
        {
            this._pendingString = "";
        }

        this._pendingString += token;

        return true;
    }

    _getCurrentString() {
        const chars = this._pendingString;
        delete this._pendingString;
        return chars;
    }

    _enclosedByTokens( token, tokenIndex, tagStart, tagEnd ) {

        const tokenStartIndex = this._currentTokenPositions[ tokenIndex ];
        const tagStartIndex = indexOfFrom( this._currentLineString, tagStart, tokenStartIndex, true );
        if( tagStartIndex < 0 ) // Not found..
            return;
        const tagStartIndexOpposite = indexOfFrom( this._currentLineString, tagEnd, tokenStartIndex, true );
        if( tagStartIndexOpposite >= 0  && tagStartIndexOpposite > tagStartIndex ) // Found the opposite first while reversing..
            return;
        const tagEndIndex = indexOfFrom( this._currentLineString, tagEnd, tokenStartIndex );
        if( tagEndIndex < 0 ) // Not found..
            return;

        if( ( tagStartIndex < tokenStartIndex ) && ( tagEndIndex >= ( tokenStartIndex + token.length ) ) && !this._mustHightlightWord( token, CodeEditor.symbols ) )
        {
            return [ tagStartIndex, tagEndIndex ];
        }
    }

    _inBlockCommentSection( lineNumber, tokenPosition, tokenLength ) {

        const lang = CodeEditor.languages[ this.highlight ];
        const blockCommentsTokens = lang.blockCommentsTokens ?? this.defaultBlockCommentTokens;

        for( let section of this._blockCommentCache )
        {
            const lineRange = section[ 0 ];
            const posRange = section[ 1 ];

            // Outside the lines range
            const meetsLineRange = ( lineNumber >= lineRange.x && lineNumber <= lineRange.y );
            if( !meetsLineRange )
            {
                continue;
            }

            if( ( lineNumber != lineRange.x && lineNumber != lineRange.y ) || // Inside the block, not first nor last line
                ( lineNumber == lineRange.x && tokenPosition >= posRange.x &&
                    (( lineNumber == lineRange.y && ( tokenPosition + tokenLength ) <= ( posRange.y + blockCommentsTokens[ 1 ].length ) ) || lineNumber !== lineRange.y) ) ||
                ( lineNumber == lineRange.y && ( ( tokenPosition + tokenLength ) <= ( posRange.y + blockCommentsTokens[ 1 ].length ) ) ) &&
                    (( lineNumber == lineRange.x && tokenPosition >= posRange.x ) || lineNumber !== lineRange.x) )
            {
                return section;
            }
        }
    }

    _isKeyword( ctxData ) {

        const { token, tokenIndex, tokens, lang } = ctxData;

        let isKwd = this._mustHightlightWord( token, CodeEditor.keywords ) || this.highlight == 'XML';

        if( this.highlight == 'CMake' )
        {
            // Highlight $ symbol
            if( token == '$' && this._enclosedByTokens( tokens[ tokenIndex + 2 ], tokenIndex + 2, '{', '}' ) )
            {
                isKwd = true;
            }
            // Highlight what is between the { }
            else if( this._enclosedByTokens( token, tokenIndex, '{', '}' ) )
            {
                isKwd |= ( ctxData.tokens[ tokenIndex - 2 ] == '$' );
            }
        }
        if( this.highlight == 'Markdown' )
        {
            isKwd = ( this._markdownHeader !== undefined );
        }
        else if( lang.tags )
        {
            isKwd &= ( this._enclosedByTokens( token, tokenIndex, '<', '>' ) != undefined );
        }


        return isKwd;
    }

    _isNumber( token ) {

        const lang = CodeEditor.languages[ this.highlight ];
        if( !( lang.numbers ?? true ) )
        {
            return false;
        }

        const subToken = token.substring( 0, token.length - 1 );

        if( this.highlight == 'C++' )
        {
            if( token.lastChar == 'f' )
            {
                return this._isNumber( subToken )
            }
            else if( token.lastChar == 'u' )
            {
                return !(token.includes('.')) && this._isNumber( subToken );
            }
        }
        else if( this.highlight == 'WGSL' )
        {
            if( token.lastChar == 'u' )
            {
                return !(token.includes('.')) && this._isNumber( subToken );
            }
        }
        else if( this.highlight == 'CSS' )
        {
            if( token.lastChar == '%' )
            {
                return this._isNumber( subToken )
            }
        }

        return token.length && token != ' ' && !Number.isNaN( +token );
    }

    _encloseSelectedWordWithKey( key, lidx, cursor ) {

        if( !cursor.selection || ( cursor.selection.fromY != cursor.selection.toY ) )
        {
            return false;
        }

        cursor.selection.invertIfNecessary();

        // Insert first..
        this.code.lines[ lidx ] = [
            this.code.lines[ lidx ].slice( 0, cursor.selection.fromX ),
            key,
            this.code.lines[ lidx ].slice( cursor.selection.fromX )
        ].join('');

        // Go to the end of the word
        this.cursorToPosition( cursor, cursor.selection.toX + 1 );

        // Change next key?
        switch( key )
        {
            case "'":
            case "\"":
                break;
            case "(": key = ")"; break;
            case "{": key = "}"; break;
        }

        // Insert the other
        this.code.lines[ lidx ] = [
            this.code.lines[ lidx ].slice(0, cursor.position),
            key,
            this.code.lines[ lidx ].slice(cursor.position)
        ].join('');

        // Recompute and reposition current selection

        cursor.selection.fromX++;
        cursor.selection.toX++;

        this._processSelection( cursor );
        this.processLine( lidx );

        // Stop propagation
        return true;
    }

    _detectLanguage( text ) {

        const tokenSet = new Set( this._getTokensFromLine( text, true ) );
        const scores = {};

        for( let [ lang, wordList ] of Object.entries( CodeEditor.keywords ) )
        {
            scores[ lang ] = 0;
            for( let kw of wordList )
                if( tokenSet.has( kw ) ) scores[ lang ]++;
        }

        for( let [ lang, wordList ] of Object.entries( CodeEditor.statements ) )
        {
            for( let kw of wordList )
                if( tokenSet.has( kw ) ) scores[ lang ]++;
        }

        for( let [ lang, wordList ] of Object.entries( CodeEditor.utils ) )
        {
            for( let kw of wordList )
                if( tokenSet.has( kw ) ) scores[ lang ]++;
        }

        for( let [ lang, wordList ] of Object.entries( CodeEditor.types ) )
        {
            for( let kw of wordList )
                if( tokenSet.has( kw ) ) scores[ lang ]++;
        }

        for( let [ lang, wordList ] of Object.entries( CodeEditor.builtIn ) )
        {
            for( let kw of wordList )
                if( tokenSet.has( kw ) ) scores[ lang ]++;
        }

        const sorted = Object.entries( scores ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] );
        return sorted[0][1] > 0 ? sorted[0][0] : undefined;
    }

    lineUp( cursor, resetLeft ) {

        if( this.code.lines[ cursor.line - 1 ] == undefined )
            return false;

        cursor.line--;
        cursor.line = Math.max( 0, cursor.line );
        this.cursorToTop( cursor, resetLeft );

        return true;
    }

    lineDown( cursor, resetLeft ) {

        if( this.code.lines[ cursor.line + 1 ] == undefined )
            return false;

        cursor.line++;

        this.cursorToBottom( cursor, resetLeft );

        return true;
    }

    restartBlink() {

        if( !this.code ) return;

        clearInterval( this.blinker );
        this.cursors.classList.add( 'show' );

        if( this.cursorBlinkRate > 0 )
            this.blinker = setInterval(() => {
                this.cursors.classList.toggle( 'show' );
            }, this.cursorBlinkRate);
        else if( this.cursorBlinkRate < 0 )
            this.cursors.classList.remove( 'show' );
    }

    startSelection( cursor ) {

        // Show elements
        let selectionContainer = document.createElement( 'div' );
        selectionContainer.className = 'selections';
        selectionContainer.classList.add( 'show' );

        this.codeSizer.insertChildAtIndex( selectionContainer, 2 );
        this.selections[ cursor.name ] = selectionContainer;

        // Create new selection instance
        cursor.selection = new CodeSelection( this, cursor );
    }

    deleteSelection( cursor ) {

        // I think it's not necessary but...
        if( this.disableEdition )
        {
            return;
        }

        // Some selections don't depend on mouse up..
        if( cursor.selection ) cursor.selection.invertIfNecessary();

        const separator = "_NEWLINE_";
        let code = this.code.lines.join( separator );

        // Get linear start index
        let index = 0;
        for( let i = 0; i <= cursor.selection.fromY; i++ )
            index += (i == cursor.selection.fromY ? cursor.selection.fromX : this.code.lines[ i ].length);

        index += cursor.selection.fromY * separator.length;

        const num_chars = cursor.selection.chars + (cursor.selection.toY - cursor.selection.fromY) * separator.length;
        const pre = code.slice( 0, index );
        const post = code.slice( index + num_chars );

        this.code.lines = ( pre + post ).split( separator );

        this.cursorToLine( cursor, cursor.selection.fromY, true );
        this.cursorToPosition( cursor, cursor.selection.fromX );
        this.endSelection( cursor );
        this.processLines();
    }

    endSelection( cursor ) {

        delete this._tripleClickSelection;
        delete this._lastSelectionKeyDir;
        delete this._currentOcurrences;
        delete this._lastResult;

        if( cursor )
        {
            LX.deleteElement( this.selections[ cursor.name ] );
            delete this.selections[ cursor.name ];
            delete cursor.selection;
        }
        else
        {
            for( let cursor of this.cursors.children )
            {
                LX.deleteElement( this.selections[ cursor.name ] );
                delete this.selections[ cursor.name ];
                delete cursor.selection;
            }
        }
    }

    selectAll() {

        // Use main cursor
        this._removeSecondaryCursors();

        var cursor = this.getCurrentCursor();
        this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP, cursor );

        this.startSelection( cursor );

        const nlines = this.code.lines.length - 1;
        cursor.selection.toX = this.code.lines[ nlines ].length;
        cursor.selection.toY = nlines;

        this.cursorToPosition( cursor, cursor.selection.toX );
        this.cursorToLine( cursor, cursor.selection.toY );

        this._processSelection( cursor, null, true );

        this.hideAutoCompleteBox();
    }

    cursorToRight( key, cursor ) {

        if( !key ) return;

        cursor._left += this.charWidth;
        cursor.style.left = `calc( ${ cursor._left }px + ${ this.xPadding } )`;
        cursor.position++;

        this.restartBlink();

        // Add horizontal scroll
        const currentScrollLeft = this.getScrollLeft();
        var viewportSizeX = ( this.codeScroller.clientWidth + currentScrollLeft ) - CodeEditor.LINE_GUTTER_WIDTH; // Gutter offset
        if( (cursor.position * this.charWidth) >= viewportSizeX )
        {
            this.setScrollLeft( currentScrollLeft + this.charWidth );
        }
    }

    cursorToLeft( key, cursor ) {

        if( !key ) return;

        cursor._left -= this.charWidth;
        cursor._left = Math.max( cursor._left, 0 );
        cursor.style.left = `calc( ${ cursor._left }px + ${ this.xPadding } )`;
        cursor.position--;
        cursor.position = Math.max( cursor.position, 0 );
        this.restartBlink();

        // Add horizontal scroll

        const currentScrollLeft = this.getScrollLeft();
        var viewportSizeX = currentScrollLeft; // Gutter offset
        if( ( ( cursor.position - 1 ) * this.charWidth ) < viewportSizeX )
        {
            this.setScrollLeft( currentScrollLeft - this.charWidth );
        }
    }

    cursorToTop( cursor, resetLeft = false ) {

        cursor._top -= this.lineHeight;
        cursor._top = Math.max( cursor._top, 0 );
        cursor.style.top = `calc(${ cursor._top }px)`;
        this.restartBlink();

        if( resetLeft )
        {
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
        }

        const currentScrollTop = this.getScrollTop();
        var firstLine = ( currentScrollTop / this.lineHeight )|0;
        if( (cursor.line - 1) < firstLine )
        {
            this.setScrollTop( currentScrollTop - this.lineHeight );
        }
    }

    cursorToBottom( cursor, resetLeft = false ) {

        cursor._top += this.lineHeight;
        cursor.style.top = `calc(${ cursor._top }px)`;

        this.restartBlink();

        if( resetLeft )
        {
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
        }

        const currentScrollTop = this.getScrollTop();
        const scrollerHeight = this.codeScroller.offsetHeight - this._fullVerticalOffset;
        const lastLine = ( ( scrollerHeight + currentScrollTop ) / this.lineHeight )|0;
        if( cursor.line >= lastLine )
        {
            this.setScrollTop( currentScrollTop + this.lineHeight );
        }
    }

    cursorToString( cursor, text, reverse ) {

        if( !text.length )
        {
            return;
        }

        for( let char of text )
        {
            reverse ? this.cursorToLeft( char, cursor ) : this.cursorToRight( char, cursor );
        }
    }

    cursorToPosition( cursor, position ) {

        cursor.position = position;
        cursor._left = position * this.charWidth;
        cursor.style.left = `calc( ${ cursor._left }px + ${ this.xPadding } )`;
    }

    cursorToLine( cursor, line, resetLeft = false ) {

        cursor.line = line;
        cursor._top = this.lineHeight * line;
        cursor.style.top = cursor._top + "px";
        if( resetLeft ) this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
    }

    saveCursor( cursor, state = {} ) {

        state.position = cursor.position;
        state.line = cursor.line;
        state.selection = cursor.selection ? cursor.selection.save() : undefined;

        return state;
    }

    saveCursors() {

        var cursors = [];

        for( let cursor of this.cursors.children )
        {
            cursors.push( this.saveCursor( cursor ) );
        }

        return cursors;
    }

    getCurrentCursor( removeOthers ) {

        if( removeOthers )
        {
            this._removeSecondaryCursors();
        }

        return this.cursors.children[ 0 ];
    }

    relocateCursors() {

        for( let cursor of this.cursors.children )
        {
            cursor._left = cursor.position * this.charWidth;
            cursor.style.left = `calc( ${ cursor._left }px + ${ this.xPadding } )`;
            cursor._top = cursor.line * this.lineHeight;
            cursor.style.top = `calc(${ cursor._top }px)`;
        }
    }

    mergeCursors( line ) {

        console.assert( line >= 0 );
        const cursorsInLine = Array.from( this.cursors.children ).filter( v => v.line == line );

        while( cursorsInLine.length > 1 )
            this.removeCursor( cursorsInLine.pop() );
    }

    restoreCursor( cursor, state ) {

        cursor.position = state.position ?? 0;
        cursor.line = state.line ?? 0;

        cursor._left = cursor.position * this.charWidth;
        cursor.style.left = `calc( ${ cursor._left }px + ${ this.xPadding } )`;
        cursor._top = cursor.line * this.lineHeight;
        cursor.style.top = `calc(${ cursor._top }px)`;

        if( state.selection )
        {
            this.startSelection( cursor );

            cursor.selection.load( state.selection );

            this._processSelection( cursor, null, true );
        }
    }

    removeCursor( cursor ) {

        LX.deleteElement( this.selections[ cursor.name ] );
        delete this.selections[ cursor.name ];
        LX.deleteElement( cursor );
    }

    resetCursorPos( flag, cursor ) {

        cursor = cursor ?? this.getCurrentCursor();

        if( flag & CodeEditor.CURSOR_LEFT )
        {
            cursor._left = 0;
            cursor.style.left = "calc(" + ( -this.getScrollLeft() ) + "px + " + this.xPadding + ")";
            cursor.position = 0;
        }

        if( flag & CodeEditor.CURSOR_TOP )
        {
            cursor._top = 0;
            cursor.style.top = ( -this.getScrollTop() ) + "px";
            cursor.line = 0;
        }
    }

    _addCursor( line = 0, position = 0, force, isMain = false ) {

        // If cursor in that position exists, remove it instead..
        const exists = Array.from( this.cursors.children ).find( v => v.position == position && v.line == line );
        if( exists && !force )
        {
            if( !exists.isMain )
                exists.remove();

            return;
        }

        let cursor = document.createElement( 'div' );
        cursor.name = "cursor" + this.cursors.childElementCount;
        cursor.className = "cursor";
        cursor.innerHTML = "&nbsp;";
        cursor.isMain = isMain;
        cursor._left = position * this.charWidth;
        cursor.style.left = "calc( " + cursor._left + "px + " + this.xPadding + " )";
        cursor._top = line * this.lineHeight;
        cursor.style.top = cursor._top + "px";
        cursor._position = position;
        cursor._line = line;
        cursor.print = (function() { console.log( this._line, this._position ) }).bind( cursor );
        cursor.isLast = (function() { return this.cursors.lastChild == cursor; }).bind( this );

        Object.defineProperty( cursor, 'line', {
            get: (v) => { return cursor._line },
            set: (v) => {
                cursor._line = v;
                if( cursor.isMain ) this._setActiveLine( v );
            }
        } );

        Object.defineProperty( cursor, 'position', {
            get: (v) => { return cursor._position },
            set: (v) => {
                cursor._position = v;
                if( cursor.isMain )
                {
                    const activeLine = this.state.activeLine;
                    this._updateDataInfoPanel( "@cursor-data", `Ln ${ activeLine + 1 }, Col ${ v + 1 }` );
                }
            }
        } );

        this.cursors.appendChild( cursor );

        return cursor;
    }

    _removeSecondaryCursors() {

        while( this.cursors.childElementCount > 1 )
            this.cursors.lastChild.remove();
    }

    _logCursors() {

        for( let cursor of this.cursors.children )
        {
            cursor.print();
        }
    }

    _addSpaceTabs( cursor, n ) {

        for( var i = 0; i < n; ++i )
        {
            this.actions[ 'Tab' ].callback( cursor.line, cursor, null );
        }
    }

    _addSpaces( n ) {

        for( var i = 0; i < n; ++i )
        {
            this.root.dispatchEvent( new CustomEvent( 'keydown', { 'detail': {
                skipUndo: true,
                key: ' ',
                targetCursor: this._lastProcessedCursorIndex
            }}));
        }
    }

    _removeSpaces( cursor ) {

        const lidx = cursor.line;

        // Remove indentation
        let lineStart = firstNonspaceIndex( this.code.lines[ lidx ] );

        // Nothing to remove... we are at the start of the line
        if( lineStart == 0 )
        {
            return;
        }

        // Only tabs/spaces in the line...
        if( lineStart == -1 )
        {
            lineStart = this.code.lines[ lidx ].length;
        }

        let indentSpaces = lineStart % this.tabSpaces;
        indentSpaces = indentSpaces == 0 ? this.tabSpaces : indentSpaces;
        const newStart = Math.max( lineStart - indentSpaces, 0 );

        this.code.lines[ lidx ] = [
            this.code.lines[ lidx ].slice( 0, newStart ),
            this.code.lines[ lidx ].slice( lineStart )
        ].join('');

        this.processLine( lidx );

        this.cursorToString( cursor, " ".repeat( indentSpaces ), true );

        if( cursor.selection )
        {
            cursor.selection.invertIfNecessary();
            cursor.selection.fromX = Math.max( cursor.selection.fromX - indentSpaces, 0 );
            this._processSelection( cursor );
        }
    }

    getScrollLeft() {
        if( !this.codeScroller ) return 0;
        return this.codeScroller.scrollLeft;
    }

    getScrollTop() {
        if( !this.codeScroller ) return 0;
        return this.codeScroller.scrollTop;
    }

    setScrollLeft( value ) {
        if( !this.codeScroller ) return;
        LX.doAsync( () => {
            this.codeScroller.scrollLeft = value;
            this.setScrollBarValue( 'horizontal', 0 );
        }, 20 );
    }

    setScrollTop( value ) {
        if( !this.codeScroller ) return;
        LX.doAsync( () => {
            this.codeScroller.scrollTop = value;
            this.setScrollBarValue( 'vertical' );
        }, 20 );
    }

    resize( flag = CodeEditor.RESIZE_SCROLLBAR_H_V, pMaxLength, onResize ) {

        setTimeout( () => {

            let scrollWidth, scrollHeight;

            if( flag & CodeEditor.RESIZE_SCROLLBAR_H )
            {
                // Update max viewport
                const maxLineLength = pMaxLength ?? this.getMaxLineLength();
                this._lastMaxLineLength = maxLineLength;
                scrollWidth = maxLineLength * this.charWidth + CodeEditor.LINE_GUTTER_WIDTH;
                this.codeSizer.style.minWidth = scrollWidth + "px";
            }

            if( flag & CodeEditor.RESIZE_SCROLLBAR_V )
            {
                scrollHeight = this.code.lines.length * this.lineHeight;
                this.codeSizer.style.minHeight = scrollHeight + "px";
            }

            this.resizeScrollBars( flag );

            if( onResize )
            {
                onResize( scrollWidth, scrollHeight );
            }

        }, 10 );
    }

    resizeIfNecessary( cursor, force ) {

        const maxLineLength = this.getMaxLineLength();
        const numViewportChars = Math.floor( ( this.codeScroller.clientWidth - CodeEditor.LINE_GUTTER_WIDTH ) / this.charWidth );
        if( force || ( maxLineLength >= numViewportChars && maxLineLength != this._lastMaxLineLength ) )
        {
            this.resize( CodeEditor.RESIZE_SCROLLBAR_H, maxLineLength, () => {
                if( cursor.position > numViewportChars )
                {
                    this.setScrollLeft( cursor.position * this.charWidth );
                }
            } );
        }
    }

    resizeScrollBars( flag = CodeEditor.RESIZE_SCROLLBAR_H_V ) {

        if( flag & CodeEditor.RESIZE_SCROLLBAR_V )
        {
            const totalLinesInViewport = (( this.codeScroller.offsetHeight ) / this.lineHeight)|0;
            const needsVerticalScrollbar = ( this.code.lines.length >= totalLinesInViewport );
            if( needsVerticalScrollbar )
            {
                this.vScrollbar.thumb.size = ( totalLinesInViewport / this.code.lines.length );
                this.vScrollbar.thumb.style.height = (this.vScrollbar.thumb.size * 100.0) + "%";
            }

            this.vScrollbar.root.classList.toggle( 'hidden', !needsVerticalScrollbar );
            this.hScrollbar.root.style.width = `calc(100% - ${ 48 + ( needsVerticalScrollbar ? ScrollBar.SCROLLBAR_VERTICAL_WIDTH : 0 ) }px)`; // 48 is the line gutter
            this.codeArea.root.style.width = `calc(100% - ${ needsVerticalScrollbar ? ScrollBar.SCROLLBAR_VERTICAL_WIDTH : 0 }px)`;
        }

        if( flag & CodeEditor.RESIZE_SCROLLBAR_H )
        {
            const numViewportChars = Math.floor( ( this.codeScroller.clientWidth - CodeEditor.LINE_GUTTER_WIDTH ) / this.charWidth );
            const maxLineLength = this._lastMaxLineLength;
            const needsHorizontalScrollbar = maxLineLength >= numViewportChars;

            if( needsHorizontalScrollbar )
            {
                this.hScrollbar.thumb.size = ( numViewportChars / maxLineLength );
                this.hScrollbar.thumb.style.width = ( this.hScrollbar.thumb.size * 100.0 ) + "%";
            }

            this.hScrollbar.root.classList.toggle( 'hidden', !needsHorizontalScrollbar );
            this.codeArea.root.style.height = `calc(100% - ${ this._fullVerticalOffset + ( needsHorizontalScrollbar ? ScrollBar.SCROLLBAR_HORIZONTAL_HEIGHT : 0 ) }px)`;
        }
    }

    setScrollBarValue( type = 'vertical', value ) {

        if( type == 'vertical' )
        {
            const scrollBarHeight = this.vScrollbar.thumb.parentElement.offsetHeight;
            const scrollThumbHeight = this.vScrollbar.thumb.offsetHeight;

            const scrollHeight = this.codeScroller.scrollHeight - this.codeScroller.clientHeight;
            const currentScroll = this.codeScroller.scrollTop;

            this.vScrollbar.thumb._top = ( currentScroll / scrollHeight ) * ( scrollBarHeight - scrollThumbHeight );
            this.vScrollbar.thumb.style.top = this.vScrollbar.thumb._top + "px";
        }
        else
        {
            this.codeScroller.scrollLeft += value;

            const scrollBarWidth = this.hScrollbar.thumb.parentElement.offsetWidth;
            const scrollThumbWidth = this.hScrollbar.thumb.offsetWidth;

            const scrollWidth = this.codeScroller.scrollWidth - this.codeScroller.clientWidth;
            const currentScroll = this.codeScroller.scrollLeft;

            this.hScrollbar.thumb._left = ( currentScroll / scrollWidth ) * ( scrollBarWidth - scrollThumbWidth );
            this.hScrollbar.thumb.style.left = this.hScrollbar.thumb._left + "px";
        }
    }

    updateHorizontalScrollFromScrollBar( value ) {

        value = this.hScrollbar.thumb._left - value;

        // Move scrollbar thumb

        const scrollBarWidth = this.hScrollbar.thumb.parentElement.offsetWidth;
        const scrollThumbWidth = this.hScrollbar.thumb.offsetWidth;

        this.hScrollbar.thumb._left = LX.clamp( value, 0, ( scrollBarWidth - scrollThumbWidth ) );
        this.hScrollbar.thumb.style.left = this.hScrollbar.thumb._left + "px";

        // Scroll code

        const scrollWidth = this.codeScroller.scrollWidth - this.codeScroller.clientWidth;
        const currentScroll = (this.hScrollbar.thumb._left * scrollWidth) / ( scrollBarWidth - scrollThumbWidth );
        this.codeScroller.scrollLeft = currentScroll;


        this._discardScroll = true;
    }

    updateVerticalScrollFromScrollBar( value ) {

        value = this.vScrollbar.thumb._top - value;

        // Move scrollbar thumb

        const scrollBarHeight = this.vScrollbar.thumb.parentElement.offsetHeight;
        const scrollThumbHeight = this.vScrollbar.thumb.offsetHeight;

        this.vScrollbar.thumb._top = LX.clamp( value, 0, ( scrollBarHeight - scrollThumbHeight ) );
        this.vScrollbar.thumb.style.top = this.vScrollbar.thumb._top + "px";

        // Scroll code

        const scrollHeight = this.codeScroller.scrollHeight - this.codeScroller.clientHeight;
        const currentScroll = (this.vScrollbar.thumb._top * scrollHeight) / ( scrollBarHeight - scrollThumbHeight );
        this.codeScroller.scrollTop = currentScroll;
    }

    getCharAtPos( cursor, offset = 0 ) {
        return this.code.lines[ cursor.line ][ cursor.position + offset ];
    }

    getWordAtPos( cursor, offset = 0 ) {

        const col = cursor.line;
        const words = this.code.lines[ col ];

        const is_char = char => {
            const exceptions = [ '_', '#', '!' ];
            const code = char.charCodeAt( 0 );
            return (exceptions.indexOf( char ) > - 1) || (code > 47 && code < 58) || (code > 64 && code < 91) || (code > 96 && code < 123);
        }

        let from = cursor.position + offset;
        let to = cursor.position + offset;

        // Check left ...

        while( words[ from ] && is_char( words[ from ] ) )
            from--;

        from++;

        // Check right ...

        while( words[ to ] && is_char( words[ to ] ) )
            to++;

        // Skip spaces ...

        let word = words.substring( from, to );
        if( word == ' ' )
        {
            if( offset < 0 )
            {
                while( words[ from - 1 ] != undefined && words[ from - 1 ] == ' ' )
                    from--;
                to++;
                word = words.substring( from, to + 1 );
            }
            else
            {
                while( words[ to ] != undefined && words[ to ] == ' ' )
                    to++;
                from--;
                word = words.substring( from, to );
            }
        }

        return [ word, from, to ];
    }

    _measureChar( char = "a", useFloating = false, getBB = false ) {
        const parentContainer = LX.makeContainer( null, "lexcodeeditor", "", document.body );
        const container = LX.makeContainer( null, "code", "", parentContainer );
        const line = document.createElement( "pre" );
        container.appendChild( line );
        const text = document.createElement( "span" );
        line.appendChild( text );
        text.innerText = char;
        var rect = text.getBoundingClientRect();
        LX.deleteElement( parentContainer );
        const bb = [ useFloating ? rect.width : Math.floor( rect.width ), useFloating ? rect.height : Math.floor( rect.height ) ];
        return getBB ? bb : bb[ 0 ];
    }

    measureString( str ) {
        return str.length * this.charWidth;
    }

    runScript( code ) {

        const script = document.createElement( 'script' );
        script.type = 'module';
        script.innerHTML = code;
        // script.src = url[ i ] + ( version ? "?version=" + version : "" );
        script.async = false;
        // script.onload = function(e) { };
        document.getElementsByTagName( 'head' )[ 0 ].appendChild( script );
    }

    toJSONFormat( text ) {

        let params = text.split( ':' );

        for(let i = 0; i < params.length; i++) {
            let key = params[ i ].split( ',' );
            if( key.length > 1 )
            {
                if( key[ key.length - 1 ].includes( ']' ))
                    continue;
                key = key[ key.length - 1 ];
            }
            else if( key[ 0 ].includes( '}' ) )
                continue;
            else
                key = key[ 0 ];
            key = key.replaceAll( /[{}\n\r]/g, '' ).replaceAll( ' ', '' )
            if( key[ 0 ] != '"' && key[ key.length - 1 ] != '"')
            {
                params[ i ] = params[ i ].replace( key, '"' + key + '"' );
            }
        }

        text = params.join( ':' );

        try {
            let json = JSON.parse( text );
            return JSON.stringify( json, undefined, 4 );
        }
        catch( e ) {
            alert( "Invalid JSON format" );
            return;	
        }
    }

    showAutoCompleteBox( key, cursor ) {

        if( !cursor.isMain )
        {
            return;
        }

        const [ word, start, end ] = this.getWordAtPos( cursor, -1 );
        if( key == ' ' || !word.length )
        {
            this.hideAutoCompleteBox();
            return;
        }

        this.autocomplete.innerHTML = ""; // Clear all suggestions

        // Add language special keys...
        let suggestions = [
            ...Array.from( CodeEditor.keywords[ this.highlight ] ?? [] ),
            ...Array.from( CodeEditor.builtIn[ this.highlight ] ?? [] ),
            ...Array.from( CodeEditor.statements[ this.highlight ] ?? [] ),
            ...Array.from( CodeEditor.types[ this.highlight ] ?? [] ),
            ...Array.from( CodeEditor.utils[ this.highlight ] ?? [] )
        ];

        const scopeStack = [ ...this.code.lineScopes[ cursor.line ] ];
        const scope = scopeStack.at( -1 );
        if( scope.type.startsWith( "enum" ) )
        {
            const enumValues = Array.from( this.code.symbolsTable ).filter( s => s[ 1 ][ 0 ].kind === "enum_value" && s[ 1 ][ 0 ].scope === scope.name ).map( s => s[ 0 ] );
            suggestions = suggestions.concat( enumValues.slice( 0, -1 ) );
        }
        else
        {
            const otherValues = Array.from( this.code.symbolsTable ).map( s => s[ 0 ] );
            suggestions = suggestions.concat( otherValues.slice( 0, -1 ) );
        }

        // Remove 1/2 char words and duplicates...
        suggestions = Array.from( new Set( suggestions )).filter( s => s.length > 2 && s.toLowerCase().includes( word.toLowerCase() ) );

        // Order...

        function scoreSuggestion( s, prefix ) {
            if( s.startsWith( prefix ) ) return 0; // best option
            if( s.includes( prefix ))  return 1;
            return 2; // worst
        }

        suggestions = suggestions.sort( ( a, b ) => ( scoreSuggestion( a, word ) - scoreSuggestion( b, word ) ) || a.localeCompare( b ) );

        for( let s of suggestions )
        {
            const pre = document.createElement( 'pre' );
            this.autocomplete.appendChild( pre );

            const symbol = this.code.symbolsTable.get( s );

            let iconName = "CaseLower";
            let iconClass = "foo";

            if( symbol )
            {
                switch( symbol[ 0 ].kind )  // Get first occurrence
                {
                    case "variable":
                        iconName = "Cuboid";
                        iconClass = "lightblue";
                        break;
                    case "method":
                        iconName = "Box";
                        iconClass = "heliotrope";
                        break;
                    case "class":
                        iconName = "CircleNodes";
                        iconClass = "orange";
                        break;
                }
            }
            else
            {
                if( this._mustHightlightWord( s, CodeEditor.utils ) )
                    iconName = "ToolCase";
                else if( this._mustHightlightWord( s, CodeEditor.types ) )
                {
                    iconName = "Type";
                    iconClass = "lightblue";
                }
            }

            pre.appendChild( LX.makeIcon( iconName, { iconClass: "mr-1", svgClass: "sm " + iconClass } ) );
s
            pre.addEventListener( 'click', () => {
                this.autoCompleteWord( s );
            } );

            // Highlight the written part
            const index = s.toLowerCase().indexOf( word.toLowerCase() );

            var preWord = document.createElement( 'span' );
            preWord.innerHTML = s.substring( 0, index );
            pre.appendChild( preWord );

            var actualWord = document.createElement('span');
            actualWord.innerHTML = s.substr( index, word.length );
            actualWord.classList.add( 'word-highlight' );
            pre.appendChild( actualWord );

            var postWord = document.createElement('span');
            postWord.innerHTML = s.substring( index + word.length );
            pre.appendChild( postWord );
        }

        if( !this.autocomplete.childElementCount )
        {
            this.hideAutoCompleteBox();
            return;
        }

        // Select always first option
        this.autocomplete.firstChild.classList.add( 'selected' );

        // Show box
        this.autocomplete.classList.toggle( 'show', true );
        this.autocomplete.classList.toggle( 'no-scrollbar', !( this.autocomplete.scrollHeight > this.autocomplete.offsetHeight ) );
        this.autocomplete.style.left = (cursor._left + CodeEditor.LINE_GUTTER_WIDTH - this.getScrollLeft()) + "px";
        this.autocomplete.style.top = (cursor._top + 28 + this.lineHeight - this.getScrollTop()) + "px";

        this.isAutoCompleteActive = true;
    }

    hideAutoCompleteBox() {

        if( !this.autocomplete )
        {
            return;
        }

        const isActive = this.isAutoCompleteActive;
        this.isAutoCompleteActive = false;
        this.autocomplete.classList.remove( 'show' );
        this.autocomplete.innerHTML = ""; // Clear all suggestions

        return isActive != this.isAutoCompleteActive;
    }

    autoCompleteWord( suggestion ) {

        if( !this.isAutoCompleteActive )
            return;

        let [suggestedWord, idx] = this._getSelectedAutoComplete();
        suggestedWord = suggestion ?? suggestedWord;

        for( let cursor of this.cursors.children )
        {
            const [word, start, end] = this.getWordAtPos( cursor, -1 );

            const lineString = this.code.lines[ cursor.line ];
            this.code.lines[ cursor.line ] =
                lineString.slice(0, start) + suggestedWord + lineString.slice( end );

            // Process lines and remove suggestion box
            this.cursorToPosition( cursor, start + suggestedWord.length );
            this.processLine( cursor.line );
        }

        // Only the main cursor autocompletes, skip the "Tab" event for the rest
        this._skipTabs = this.cursors.childElementCount - 1;

        this.hideAutoCompleteBox();
    }

    _getSelectedAutoComplete() {

        if( !this.isAutoCompleteActive )
        {
            return;
        }

        for( let i = 0; i < this.autocomplete.childElementCount; ++i )
        {
            const child = this.autocomplete.childNodes[ i ];
            if( child.classList.contains('selected') )
            {
                var word = "";
                for( let childSpan of child.childNodes )
                {
                    if( childSpan.constructor != HTMLSpanElement )
                    {
                        continue;
                    }
                    word += childSpan.innerHTML;
                }

                return [ word, i ]; // Get text of the span inside the 'pre' element
            }
        }
    }

    _moveArrowSelectedAutoComplete( dir ) {

        if( !this.isAutoCompleteActive )
        return;

        const [word, idx] = this._getSelectedAutoComplete();
        const offset = dir == 'down' ? 1 : -1;

        if( dir == 'down' ) {
            if( (idx + offset) >= this.autocomplete.childElementCount ) return;
        } else if( dir == 'up') {
            if( (idx + offset) < 0 ) return;
        }

        this.autocomplete.scrollTop += offset * 20;

        // Remove selected from the current word and add it to the next one
        this.autocomplete.childNodes[ idx ].classList.remove('selected');
        this.autocomplete.childNodes[ idx + offset ].classList.add('selected');
    }

    showSearchBox( clear ) {

        this.hideSearchLineBox();

        this.searchbox.classList.add( 'opened' );
        this.searchboxActive = true;

        const input = this.searchbox.querySelector( 'input' );

        if( clear )
        {
            input.value = "";
        }
        else
        {
            const cursor = this.getCurrentCursor();

            if( cursor.selection )
            {
                input.value = cursor.selection.getText() ?? input.value;
            }
        }

        input.selectionStart = 0;
        input.selectionEnd = input.value.length;

        input.focus();
    }

    hideSearchBox() {

        const active = this.searchboxActive;

        if( this.searchboxActive )
        {
            this.searchbox.classList.remove( 'opened' );
            this.searchboxActive = false;
        }

        else if( this._lastResult )
        {
            LX.deleteElement( this._lastResult.dom );
            delete this._lastResult;
        }

        this.searchResultSelections.classList.remove( 'show' );

        return active != this.searchboxActive;
    }

    search( text, reverse, callback, skipAlert ) {

        text = text ?? this._lastTextFound;

        if( !text )
        {
            return;
        }

        let cursor = this.getCurrentCursor();
        let cursorData = new LX.vec2( cursor.position, cursor.line );
        let line = null;
        let char = -1;

        if( this._lastResult )
        {
            LX.deleteElement( this._lastResult.dom );
            cursorData = this._lastResult.pos;
            cursorData.x += text.length * ( reverse ? -1 : 1 );
            delete this._lastResult;
        }

        const getIndex = l => {

            var string = this.code.lines[ l ];

            if( reverse )
            {
                string = string.substr( 0, l == cursorData.y ? cursorData.x : string.length );
                var reversed = strReverse( string );
                var reversedIdx = reversed.indexOf( strReverse( text ) );
                return reversedIdx == -1 ? -1 : string.length - reversedIdx - text.length;
            }
            else
            {
                return string.substr( l == cursorData.y ? cursorData.x : 0 ).indexOf( text );
            }
        };

        if( reverse )
        {
            for( var j = cursorData.y; j >= 0; --j )
            {
                char = getIndex( j );
                if( char > -1 )
                {
                    line = j;
                    break;
                }
            }
        }
        else
        {
            for( var j = cursorData.y; j < this.code.lines.length; ++j )
            {
                char = getIndex( j );
                if( char > -1 )
                {
                    line = j;
                    break;
                }
            }
        }

        if( line == null )
        {
            if( !skipAlert )
            {
                alert( "No results!" );
            }

            const lastLine = this.code.lines.length - 1;

            this._lastResult = {
                'dom': this.searchResultSelections.lastChild,
                'pos': reverse ? new LX.vec2( this.code.lines[ lastLine ].length, lastLine ) : new LX.vec2( 0, 0 )
            };

            return;
        }

        /*
            Position idx is computed from last pos, which could be in same line,
            so we search in the substring (first_ocurrence, end). That's why we
            have to add the length of the substring (0, first_ocurrence)
        */

        if( !reverse )
        {
            char += ( line == cursorData.y ? cursorData.x : 0 );
        }


        // Text found..

        this._lastTextFound = text;

        this.codeScroller.scrollTo(
            Math.max( char * this.charWidth - this.codeScroller.clientWidth, 0 ),
            Math.max( line - 10, 0 ) * this.lineHeight
        );

        if( callback )
        {
            callback( char, line );
        }
        else
        {
            // Show elements
            this.searchResultSelections.classList.add( 'show' );

            // Create new selection instance
            cursor.selection = new CodeSelection( this, cursor, "lexcodesearchresult" );
            cursor.selection.selectInline( cursor, char, line, this.measureString( text ), true );
        }

        this._lastResult = {
            'dom': this.searchResultSelections.lastChild,
            'pos': new LX.vec2( char , line ),
            reverse
        };

        // Force focus back to search box
        const input = this.searchbox.querySelector( 'input' );
        input.focus();
    }

    showSearchLineBox() {

        this.hideSearchBox();

        this.searchlinebox.classList.add( 'opened' );
        this.searchlineboxActive = true;

        const input = this.searchlinebox.querySelector( 'input' );
        input.value = ":";
        input.focus();
    }

    hideSearchLineBox() {

        if( this.searchlineboxActive )
        {
            this.searchlinebox.classList.remove( 'opened' );
            this.searchlineboxActive = false;
        }
    }

    goToLine( line ) {

        if( !this._isNumber( line ) )
            return;

        this.codeScroller.scrollTo( 0, Math.max( line - 15 ) * this.lineHeight );

        // Select line ?
        var cursor = this.getCurrentCursor( true );
        this.cursorToLine( cursor, line - 1, true );
    }

    selectNextOcurrence( cursor ) {

        if( !cursor.selection )
            return;

        const text = cursor.selection.getText();
        if( !text )
            return;

        if( !this._currentOcurrences )
        {
            const currentKey = [ cursor.position - text.length, cursor.line ].join( '_' );
            this._currentOcurrences = { };
            this._currentOcurrences[ currentKey ] = true;
        }

        this.search( text, false, (col, ln) => {

            const key = [ col, ln ].join( '_' );

            if( this._currentOcurrences[ key ] ) {
                return;
            }

            var newCursor = this._addCursor( ln, col, true );
            this.startSelection( newCursor );
            newCursor.selection.selectInline( newCursor, col, ln, this.measureString( text ) );
            this.cursorToString( newCursor, text );

            this._currentOcurrences[ key ] = true;

        }, true );
    }

    _updateDataInfoPanel( signal, value ) {

        if( !this.skipInfo )
        {
            if( this.cursors.childElementCount > 1 )
            {
                value = "";
            }

            LX.emit( signal, value );
        }
    }

    _setActiveLine( number ) {

        number = number ?? this.state.activeLine;

        const cursor = this.getCurrentCursor();
        this._updateDataInfoPanel( "@cursor-data", `Ln ${ number + 1 }, Col ${ cursor.position + 1 }` );

        const oldLocal = this.toLocalLine( this.state.activeLine );
        let line = this.code.childNodes[ oldLocal ];

        if( !line )
        {
            return;
        }

        line.classList.remove( 'active-line' );

        // Set new active
        {
            this.state.activeLine = number;

            const newLocal = this.toLocalLine( number );
            line = this.code.childNodes[ newLocal ];
            if( line ) line.classList.add( 'active-line' );
        }
    }

    _hideActiveLine() {
        this.code.querySelectorAll( '.active-line' ).forEach( e => e.classList.remove( 'active-line' ) );
    }

    _setFontSize( size ) {
        // Change font size
        this.fontSize = size;
        const r = document.querySelector( ':root' );
        r.style.setProperty( "--code-editor-font-size", `${ this.fontSize }px` );
        this.charWidth = this._measureChar( "a", true );

        window.localStorage.setItem( "lexcodeeditor-font-size", this.fontSize );

        // Change row size
        const rowPixels = this.fontSize + 6;
        r.style.setProperty( "--code-editor-row-height", `${ rowPixels }px` );
        this.lineHeight = rowPixels;

        // Relocate cursors
        this.relocateCursors();

        // Resize the code area
        this.processLines();

        // Emit event
        LX.emit( "@font-size", this.fontSize );
    }

    _applyFontSizeOffset( offset = 0 ) {
        const newFontSize = LX.clamp( this.fontSize + offset, CodeEditor.CODE_MIN_FONT_SIZE, CodeEditor.CODE_MAX_FONT_SIZE );
        this._setFontSize( newFontSize );
    }

    _increaseFontSize() {
        this._applyFontSizeOffset( 1 );
    }

    _decreaseFontSize() {
        this._applyFontSizeOffset( -1 );
    }

    _clearTmpVariables() {
        delete this._currentLineString;
        delete this._currentLineNumber;
        delete this._buildingString;
        delete this._pendingString;
        delete this._buildingBlockComment;
        delete this._markdownHeader;
        delete this._lastResult;
        delete this._scopeStack;
    }

    async _requestFileAsync( url, dataType, nocache ) {
        return new Promise( (resolve, reject) => {
            dataType = dataType ?? "arraybuffer";
            const mimeType = dataType === "arraybuffer" ? "application/octet-stream" : undefined;
            var xhr = new XMLHttpRequest();
            xhr.open( 'GET', url, true );
            xhr.responseType = dataType;
            if( mimeType )
                xhr.overrideMimeType( mimeType );
            if( nocache )
                xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.onload = function(load)
            {
                var response = this.response;
                if( this.status != 200)
                {
                    var err = "Error " + this.status;
                    reject(err);
                    return;
                }
                resolve( response );
            };
            xhr.onerror = function(err) {
                reject(err);
            };
            xhr.send();
            return xhr;
        });
    }
}

CodeEditor.languages = {
    'Plain Text': { ext: "txt", blockComments: false, singleLineComments: false, numbers: false, icon: "AlignLeft gray" },
    'JavaScript': { ext: "js", icon: "Js goldenrod" },
    'TypeScript': { ext: "ts", icon: "Ts pipelineblue" },
    'C': { ext: [ 'c', 'h' ], usePreprocessor: true, icon: { 'c': "C pictonblue", 'h': "C heliotrope" } },
    'C++': { ext: [ "cpp", "hpp" ], usePreprocessor: true, icon: { 'cpp': "CPlusPlus pictonblue", 'hpp': "CPlusPlus heliotrope" } },
    'CSS': { ext: "css", icon: "Hash dodgerblue" },
    'CMake': { ext: "cmake", singleLineCommentToken: '#', blockComments: false, ignoreCase: true },
    'GLSL': { ext: "glsl", usePreprocessor: true },
    'WGSL': { ext: "wgsl", usePreprocessor: true },
    'JSON': { ext: "json", blockComments: false, singleLineComments: false, icon: "Braces fg-primary" },
    'XML': { ext: "xml", tags: true, icon: "Rss orange" },
    'Rust': { ext: "rs", icon: "Rust fg-primary" },
    'Python': { ext: "py", singleLineCommentToken: '#', icon: "Python munsellblue" },
    'HTML': { ext: "html", tags: true, singleLineComments: false, blockCommentsTokens: [ '<!--', '-->' ], numbers: false, icon: "Code orange" },
    'Batch': { ext: "bat", blockComments: false, singleLineCommentToken: '::', ignoreCase: true, icon: "Windows lightblue" },
    'Markdown': { ext: "md", blockComments: false, singleLineCommentToken: '::', tags: true, numbers: false, icon: "Markdown fg-primary" },
    'PHP': { ext: "php", icon: "Php blueviolet" },
};

CodeEditor.nativeTypes = {
    'C++': ['int', 'float', 'double', 'bool', 'long', 'short', 'char', 'wchar_t', 'void'],
    'WGSL': ['bool', 'u32', 'i32', 'f16', 'f32', 'vec2', 'vec3', 'vec4', 'vec2f', 'vec3f', 'vec4f', 'mat2x2f', 'mat3x3f', 'mat4x4f', 'array', 'vec2u', 'vec3u', 'vec4u', 'ptr', 'sampler']
};

CodeEditor.declarationKeywords = {
    'JavaScript': ['var', 'let', 'const', 'this', 'static', 'class'],
    'C++': [...CodeEditor.nativeTypes["C++"], 'const', 'auto', 'class', 'struct', 'namespace', 'enum', 'extern']
};

CodeEditor.keywords = {
    'JavaScript': ['var', 'let', 'const', 'this', 'in', 'of', 'true', 'false', 'new', 'function', 'NaN', 'static', 'class', 'constructor', 'null', 'typeof', 'debugger', 'abstract',
                  'arguments', 'extends', 'instanceof', 'Infinity'],
    'TypeScript': ['var', 'let', 'const', 'this', 'in', 'of', 'true', 'false', 'new', 'function', 'class', 'extends', 'instanceof', 'Infinity', 'private', 'public', 'protected', 'interface',
                  'enum', 'type'],
    'C': ['int', 'float', 'double', 'long', 'short', 'char', 'const', 'void', 'true', 'false', 'auto', 'struct', 'typedef', 'signed', 'volatile', 'unsigned', 'static', 'extern', 'enum', 'register',
        'union'],
    'C++': [...CodeEditor.nativeTypes["C++"], 'const', 'static_cast', 'dynamic_cast', 'new', 'delete', 'true', 'false', 'auto', 'class', 'struct', 'typedef', 'nullptr',
            'NULL', 'signed', 'unsigned', 'namespace', 'enum', 'extern', 'union', 'sizeof', 'static', 'private', 'public'],
    'CMake': ['cmake_minimum_required', 'set', 'not', 'if', 'endif', 'exists', 'string', 'strequal', 'add_definitions', 'macro', 'endmacro', 'file', 'list', 'source_group', 'add_executable',
        'target_include_directories', 'set_target_properties', 'set_property', 'add_compile_options', 'add_link_options', 'include_directories', 'add_library', 'target_link_libraries',
        'target_link_options', 'add_subdirectory', 'add_compile_definitions', 'project', 'cache'],
    'JSON': ['true', 'false'],
    'GLSL': ['true', 'false', 'function', 'int', 'float', 'vec2', 'vec3', 'vec4', 'mat2x2', 'mat3x3', 'mat4x4', 'struct'],
    'CSS': ['body', 'html', 'canvas', 'div', 'input', 'span', '.', 'table', 'tr', 'td', 'th', 'label', 'video', 'img', 'code', 'button', 'select', 'option', 'svg', 'media', 'all',
            'i', 'a', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'last-child', 'tbody', 'pre', 'monospace', 'font-face'],
    'WGSL': [...CodeEditor.nativeTypes["WGSL"], 'var', 'let', 'true', 'false', 'fn', 'atomic', 'struct', 'sampler_comparison', 'texture_depth_2d', 'texture_depth_2d_array', 'texture_depth_cube',
            'texture_depth_cube_array', 'texture_depth_multisampled_2d', 'texture_external', 'texture_1d', 'texture_2d', 'texture_2d_array', 'texture_3d', 'texture_cube', 'texture_cube_array',
            'texture_storage_1d', 'texture_storage_2d', 'texture_storage_2d_array', 'texture_storage_3d'],
    'Rust': ['as', 'const', 'crate', 'enum', 'extern', 'false', 'fn', 'impl', 'in', 'let', 'mod', 'move', 'mut', 'pub', 'ref', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true',
             'type', 'unsafe', 'use', 'where', 'abstract', 'become', 'box', 'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual'],
    'Python': ['False', 'def', 'None', 'True', 'in', 'is', 'and', 'lambda', 'nonlocal', 'not', 'or'],
    'Batch': ['set', 'echo', 'off', 'del', 'defined', 'setlocal', 'enabledelayedexpansion', 'driverquery', 'print'],
    'HTML': ['html', 'meta', 'title', 'link', 'script', 'body', 'DOCTYPE', 'head', 'br', 'i', 'a', 'li', 'img', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'],
    'Markdown': ['br', 'i', 'a', 'li', 'img', 'table', 'title', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'],
    'PHP': ['const', 'function', 'array', 'new', 'int', 'string', '$this', 'public', 'null', 'private', 'protected', 'implements', 'class', 'use', 'namespace', 'abstract', 'clone', 'final',
            'enum'],
};

CodeEditor.utils = { // These ones don't have hightlight, used as suggestions to autocomplete only...
    'JavaScript': ['querySelector', 'body', 'addEventListener', 'removeEventListener', 'remove', 'sort', 'keys', 'filter', 'isNaN', 'parseFloat', 'parseInt', 'EPSILON', 'isFinite',
                  'bind', 'prototype', 'length', 'assign', 'entries', 'values', 'concat', 'substring', 'substr', 'splice', 'slice', 'buffer', 'appendChild', 'createElement', 'prompt',
                  'alert'],
    'WGSL': ['textureSample'],
    'Python': ['abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
              'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
              'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
              'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'],
    'CSS': [ ...Object.keys( document.body.style ).map( LX.toKebabCase ), 'block', 'inline', 'inline-block', 'flex', 'grid', 'none', 'inherit', 'initial', 'unset', 'revert', 'sticky',
            'relative', 'absolute', 'fixed', 'static', 'auto', 'visible', 'hidden', 'scroll', 'clip', 'ellipsis', 'nowrap', 'wrap', 'break-word', 'solid', 'dashed', 'dotted', 'double',
            'groove', 'ridge', 'inset', 'outset', 'left', 'right', 'center', 'top', 'bottom', 'start', 'end', 'justify', 'stretch', 'space-between', 'space-around', 'space-evenly',
            'baseline', 'middle', 'normal', 'bold', 'lighter', 'bolder', 'italic', 'blur', 'uppercase', 'lowercase', 'capitalize', 'transparent', 'currentColor', 'pointer', 'default',
            'move', 'grab', 'grabbing', 'not-allowed', 'none', 'cover', 'contain', 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'round', 'space', 'linear-gradient', 'radial-gradient',
            'conic-gradient', 'url', 'calc', 'min', 'max', 'clamp', 'red', 'blue', 'green', 'black', 'white', 'gray', 'silver', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'magenta',
            'lime', 'teal', 'navy', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'none', 'auto', 'fit-content', 'min-content', 'max-content']
};

CodeEditor.types = {
    'JavaScript': ['Object', 'String', 'Function', 'Boolean', 'Symbol', 'Error', 'Number', 'TextEncoder', 'TextDecoder', 'Array', 'ArrayBuffer', 'InputEvent', 'MouseEvent',
                   'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'Element'],
    'TypeScript': ['arguments', 'constructor', 'null', 'typeof', 'debugger', 'abstract', 'Object', 'string', 'String', 'Function', 'Boolean', 'boolean', 'Error', 'Number', 'number', 'TextEncoder',
                  'TextDecoder', 'Array', 'ArrayBuffer', 'InputEvent', 'MouseEvent', 'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'Element'],
    'Rust': ['u128'],
    'Python': ['int', 'type', 'float', 'map', 'list', 'ArithmeticError', 'AssertionError', 'AttributeError', 'Exception', 'EOFError', 'FloatingPointError', 'GeneratorExit',
              'ImportError', 'IndentationError', 'IndexError', 'KeyError', 'KeyboardInterrupt', 'LookupError', 'MemoryError', 'NameError', 'NotImplementedError', 'OSError',
              'OverflowError', 'ReferenceError', 'RuntimeError', 'StopIteration', 'SyntaxError', 'TabError', 'SystemError', 'SystemExit', 'TypeError', 'UnboundLocalError',
              'UnicodeError', 'UnicodeEncodeError', 'UnicodeDecodeError', 'UnicodeTranslateError', 'ValueError', 'ZeroDivisionError'],
    'C++': ['uint8_t', 'uint16_t', 'uint32_t'],
    'PHP': ['Exception', 'DateTime', 'JsonSerializable'],
};

CodeEditor.builtIn = {
    'JavaScript': ['document', 'console', 'window', 'navigator', 'performance'],
    'CSS': ['*', '!important'],
    'C++': ['vector', 'list', 'map'],
    'WGSL': ['@vertex', '@fragment'],
    'HTML': ['type', 'xmlns', 'PUBLIC', 'http-equiv', 'src', 'style', 'lang', 'href', 'rel', 'content', 'xml', 'alt'], // attributes
    'Markdown': ['type', 'src', 'style', 'lang', 'href', 'rel', 'content', 'valign', 'alt'], // attributes
    'PHP': ['echo', 'print'],
};

CodeEditor.statements = {
    'JavaScript': ['for', 'if', 'else', 'case', 'switch', 'return', 'while', 'continue', 'break', 'do', 'import', 'from', 'throw', 'async', 'try', 'catch', 'await'],
    'TypeScript': ['for', 'if', 'else', 'case', 'switch', 'return', 'while', 'continue', 'break', 'do', 'import', 'from', 'throw', 'async', 'try', 'catch', 'await', 'as'],
    'CSS': ['@', 'import'],
    'C': ['for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'using', 'default', 'goto', 'do'],
    'C++': ['std', 'for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'using', 'glm', 'spdlog', 'default'],
    'GLSL': ['for', 'if', 'else', 'return', 'continue', 'break'],
    'WGSL': ['const','for', 'if', 'else', 'return', 'continue', 'break', 'storage', 'read', 'read_write', 'uniform', 'function', 'workgroup', 'bitcast'],
    'Rust': ['break', 'else', 'continue', 'for', 'if', 'loop', 'match', 'return', 'while', 'do', 'yield'],
    'Python': ['if', 'raise', 'del', 'import', 'return', 'elif', 'try', 'else', 'while', 'as', 'except', 'with', 'assert', 'finally', 'yield', 'break', 'for', 'class', 'continue',
              'global', 'pass', 'from'],
    'Batch': ['if', 'IF', 'for', 'FOR', 'in', 'IN', 'do', 'DO', 'call', 'CALL', 'goto', 'GOTO', 'exit', 'EXIT'],
    'PHP': ['declare', 'enddeclare', 'foreach', 'endforeach', 'if', 'else', 'elseif', 'endif', 'for', 'endfor', 'while', 'endwhile', 'switch', 'case', 'default', 'endswitch', 'return', 'break', 'continue',
            'try', 'catch', 'die', 'do', 'exit', 'finally'],
};

CodeEditor.symbols = {
    'JavaScript': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '??'],
    'TypeScript': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '??'],
    'C': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '*', '-', '+'],
    'C++': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '::', '*', '-', '+'],
    'CMake': ['{', '}'],
    'JSON': ['[', ']', '{', '}', '(', ')'],
    'GLSL': ['[', ']', '{', '}', '(', ')'],
    'WGSL': ['[', ']', '{', '}', '(', ')', '->'],
    'CSS': ['{', '}', '(', ')', '*'],
    'Rust': ['<', '>', '[', ']', '(', ')', '='],
    'Python': ['<', '>', '[', ']', '(', ')', '='],
    'Batch': ['[', ']', '(', ')', '%'],
    'HTML': ['<', '>', '/'],
    'XML': ['<', '>', '/'],
    'PHP': ['[', ']', '{', '}', '(', ')'],
};

CodeEditor.REGISTER_LANGUAGE = function( name, options = {}, def, rules )
{
    CodeEditor.languages[ name ] = options;

    if( def?.keywords ) CodeEditor.keywords[ name ] = new Set( def.keywords );
    if( def?.utils ) CodeEditor.utils[ name ] = new Set( def.utils );
    if( def?.types ) CodeEditor.types[ name ] = new Set( def.types );
    if( def?.builtIn ) CodeEditor.builtIn[ name ] = new Set( def.builtIn );
    if( def?.statements ) CodeEditor.statements[ name ] = new Set( def.statements );
    if( def?.symbols ) CodeEditor.symbols[ name ] = new Set( def.symbols );

    if( rules ) HighlightRules[ name ] = rules;
};

LX.CodeEditor = CodeEditor;

export { CodeEditor };