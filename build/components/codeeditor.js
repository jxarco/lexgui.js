import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'CodeEditor' );

function swapElements( obj, a, b ) {
    [obj[a], obj[b]] = [obj[b], obj[a]];
}

function swapArrayElements( array, id0, id1 ) {
    [array[id0], array[id1]] = [array[id1], array[id0]];
};

function sliceChars( str, idx, n = 1 ) {
    return str.substr(0, idx) + str.substr(idx + n);
}

function firstNonspaceIndex( str ) {
    const index = str.search(/\S|$/)
    return index < str.length ? index : -1;
}

function strReverse( str ) {
    return str.split( "" ).reverse().join( "" );
}

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

let ASYNC_ENABLED = true;

function doAsync( fn, ms ) {
    if( ASYNC_ENABLED )
        setTimeout( fn, ms ?? 0 );
    else
        fn();
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

    constructor( editor, type ) {

        this.editor = editor;
        this.type = type;

        this.root = document.createElement( 'div' );
        this.root.className = "lexcodescrollbar";

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

    /**
     * @param {*} options
     * name:
     * skipInfo:
     * fileExplorer:
     * allowAddScripts:
     * disableEdition:
     */

    constructor( area, options = {} ) {

        window.editor = this;

        CodeEditor.__instances.push( this );

        // File explorer
        if( options.fileExplorer ?? false )
        {
            var [ explorerArea, codeArea ] = area.split({ sizes:[ "15%","85%" ] });
            explorerArea.setLimitBox( 180, 20, 512 );
            this.explorerArea = explorerArea;

            let panel = new LX.Panel();

            panel.addTitle( "EXPLORER" );

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
                            this.tabs.delete( event.node.id );
                            delete this.loadedTabs[ event.node.id ];
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
            area = codeArea;
        }

        this.base_area = area;
        this.area = new LX.Area( { className: "lexcodeeditor", height: "100%", skipAppend: true } );

        this.skipInfo = options.skipInfo ?? false;
        this.disableEdition = options.disableEdition ?? false;

        this._tabStorage = {};
        this.tabs = this.area.addTabs( { onclose: (name) => {
            delete this.openedTabs[ name ];
            if( Object.keys( this.openedTabs ).length < 2 )
            {
                clearInterval( this.blinker );
                this.cursors.classList.remove( 'show' );
            }
        } } );

        if( !this.disableEdition )
        {
            this.tabs.root.addEventListener( 'dblclick', (e) => {
                if( options.allowAddScripts ?? true ) {
                    e.preventDefault();
                    this.addTab("unnamed.js", true);
                }
            } );
        }

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

        // Code area
        this.tabs.area.root.classList.add( 'codetabsarea' );

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
        this.tabs.area.attach( this.cursors );

        this.searchResultSelections = document.createElement( 'div' );
        this.searchResultSelections.id = 'search-selections';
        this.searchResultSelections.className = 'selections';
        this.tabs.area.attach( this.searchResultSelections );

        // Store here selections per cursor
        this.selections = {};

        // Css char synchronization
        this.xPadding = CodeEditor.LINE_GUTTER_WIDTH + "px";

        // Add main cursor
        this._addCursor( 0, 0, true, true );

        // Scroll stuff
        {
            this.codeScroller = this.tabs.area.root;
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
                            const totalLinesInViewport = ((this.codeScroller.offsetHeight - 36) / this.lineHeight)|0;
                            const scrollDownBoundary =
                                ( Math.max( this.visibleLinesViewport.y - totalLinesInViewport, 0 ) - 1 ) * this.lineHeight;

                            if( scrollTop >= scrollDownBoundary )
                                this.processLines( CodeEditor.UPDATE_VISIBLE_LINES );
                        }
                    }
                    // Scroll up...
                    else
                    {
                        const scrollUpBoundary = parseInt( this.code.style.top );
                        if( scrollTop < scrollUpBoundary )
                            this.processLines( CodeEditor.UPDATE_VISIBLE_LINES );
                    }

                    lastScrollTopValue = scrollTop;
                });

                this.codeScroller.addEventListener( 'wheel', e => {
                    if( e.ctrlKey )
                    {
                        e.preventDefault();
                        ( e.deltaY > 0.0 ? this._decreaseFontSize() : this._increaseFontSize() );
                    }
                    else
                    {
                        const dX = ( e.deltaY > 0.0 ? 10.0 : -10.0 ) * ( e.shiftKey ? 1.0 : 0.0 );
                        if( dX != 0.0 ) this.setScrollBarValue( 'horizontal', dX );
                    }
                });
            }
        }

        // This is only the container, line numbers are in the same line div
        {
            this.gutter = document.createElement( 'div' );
            this.gutter.className = "lexcodegutter";
            area.attach( this.gutter );
        }

        // Add custom vertical scroll bar
        {
            this.vScrollbar = new ScrollBar( this, ScrollBar.SCROLLBAR_VERTICAL );
            area.attach( this.vScrollbar.root );
        }

        // Add custom horizontal scroll bar
        {
            this.hScrollbar = new ScrollBar( this, ScrollBar.SCROLLBAR_HORIZONTAL );
            area.attach( this.hScrollbar.root );
        }

        if( !this.disableEdition )
        {
            // Add autocomplete box
            {
                var box = document.createElement( 'div' );
                box.className = "autocomplete";
                this.autocomplete = box;
                this.tabs.area.attach( box );

                this.isAutoCompleteActive = false;
            }

            // Add search box
            {
                var box = document.createElement( 'div' );
                box.className = "searchbox";

                var searchPanel = new LX.Panel();
                box.appendChild( searchPanel.root );

                searchPanel.sameLine( 4 );
                searchPanel.addText( null, "", null, { placeholder: "Find" } );
                searchPanel.addButton( null, "up", () => this.search( null, true ), { icon: "ArrowUp" } );
                searchPanel.addButton( null, "down", () => this.search(), { icon: "ArrowDown" } );
                searchPanel.addButton( null, "x", this.hideSearchBox.bind( this ), { icon: "X" } );

                box.querySelector( 'input' ).addEventListener( 'keyup', e => {
                    if( e.key == 'Escape' ) this.hideSearchBox();
                    else if( e.key == 'Enter' ) this.search( e.target.value, !!e.shiftKey );
                } );

                this.searchbox = box;
                this.tabs.area.attach( box );
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
                this.tabs.area.attach( box );
            }
        }

        // Add code-sizer
        {
            this.codeSizer = document.createElement( 'div' );
            this.codeSizer.className = "code-sizer pseudoparent-tabs";

            // Append all childs
            while( this.codeScroller.firstChild )
                this.codeSizer.appendChild( this.codeScroller.firstChild );

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

        this.useAutoComplete = options.autocomplete ?? true;
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

        this.languages = {
            'Plain Text': { ext: 'txt', blockComments: false, singleLineComments: false },
            'JavaScript': { ext: 'js' },
            'C': { ext: [ 'c', 'h' ] },
            'C++': { ext: [ 'cpp', 'hpp' ] },
            'CSS': { ext: 'css' },
            'CMake': { ext: 'cmake', singleLineCommentToken: '#', blockComments: false, ignoreCase: true },
            'GLSL': { ext: 'glsl' },
            'WGSL': { ext: 'wgsl' },
            'JSON': { ext: 'json', blockComments: false, singleLineComments: false },
            'XML': { ext: 'xml', tags: true },
            'Rust': { ext: 'rs' },
            'Python': { ext: 'py', singleLineCommentToken: '#' },
            'HTML': { ext: 'html', tags: true, singleLineComments: false, blockCommentsTokens: [ '<!--', '-->' ] },
            'Batch': { ext: 'bat', blockComments: false, singleLineCommentToken: '::' },
            'Markdown': { ext: 'md', blockComments: false, singleLineCommentToken: '::', tags: true }
        };

        this.specialKeys = [
            'Backspace', 'Enter', 'ArrowUp', 'ArrowDown',
            'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
            'End', 'Tab', 'Escape'
        ];

        this._blockCommentCache = [];

        // Convert reserved word arrays to maps so we can search tokens faster

        if( !CodeEditor._staticReady )
        {
            for( let lang in CodeEditor.keywords ) CodeEditor.keywords[lang] = CodeEditor.keywords[lang].reduce((a, v) => ({ ...a, [v]: true}), {});
            for( let lang in CodeEditor.utils ) CodeEditor.utils[lang] = CodeEditor.utils[lang].reduce((a, v) => ({ ...a, [v]: true}), {});
            for( let lang in CodeEditor.types ) CodeEditor.types[lang] = CodeEditor.types[lang].reduce((a, v) => ({ ...a, [v]: true}), {});
            for( let lang in CodeEditor.builtIn ) CodeEditor.builtIn[lang] = CodeEditor.builtIn[lang].reduce((a, v) => ({ ...a, [v]: true}), {});
            for( let lang in CodeEditor.statementsAndDeclarations ) CodeEditor.statementsAndDeclarations[lang] = CodeEditor.statementsAndDeclarations[lang].reduce((a, v) => ({ ...a, [v]: true}), {});
            for( let lang in CodeEditor.symbols ) CodeEditor.symbols[lang] = CodeEditor.symbols[lang].reduce((a, v) => ({ ...a, [v]: true}), {});

            CodeEditor._staticReady = true;
        }

        // Action keys

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

            if( cursor.selection ) {
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
                if( letter ) {

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
                else if( this.code.lines[ ln - 1 ] != undefined ) {

                    this.lineUp( cursor );
                    e.cancelShift = true;
                    this.actions[ 'End' ].callback( cursor.line, cursor, e );
                    // Move line on top
                    this.code.lines[ ln - 1 ] += this.code.lines[ ln ];
                    this.code.lines.splice( ln, 1 );
                    this.processLines();
                }
            }
        });

        this.action( 'Delete', false, ( ln, cursor, e ) => {

            this._addUndoStep( cursor );

            if( cursor.selection ) {
                // Use 'Backspace' as it's the same callback...
                this.actions['Backspace'].callback( ln, cursor, e );
            }
            else
            {
                var letter = this.getCharAtPos( cursor );
                if( letter ) {
                    this.code.lines[ ln ] = sliceChars( this.code.lines[ ln ], cursor.position );
                    this.processLine( ln );
                }
                else if( this.code.lines[ ln + 1 ] != undefined ) {
                    this.code.lines[ ln ] += this.code.lines[ ln + 1 ];
                    this.code.lines.splice( ln + 1, 1 );
                    this.processLines();
                }
            }
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

            const last_char = ( this.code.clientWidth / this.charWidth )|0;
            this.setScrollLeft( cursor.position >= last_char ? ( cursor.position - last_char ) * this.charWidth : 0 );

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

            if( _c0 == '{' && _c1 == '}' ) {
                this.code.lines.splice( cursor.line, 0, "" );
                this._addSpaceTabs( cursor, tabs + 1 );
                this.code.lines[ cursor.line + 1 ] = " ".repeat(spaces) + this.code.lines[ cursor.line + 1 ];
            } else {
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

        // Default code tab

        this.loadedTabs = { };
        this.openedTabs = { };

        if( options.allowAddScripts ?? true )
        {
            this.addTab("+", false, "New File");
        }

        this.addTab( options.name || "untitled", true, options.title, { language: options.highlight ?? "Plain Text" } );

        // Create inspector panel
        let panel = this._createPanelInfo();
        if( panel ) area.attach( panel );

        const fontUrl = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/" + "/data/CommitMono-400-Regular.otf";
        const commitMono = new FontFace(
            "CommitMono",
            `url(${ fontUrl })`,
            {
                style: "normal",
                weight: "400",
                display: "swap"
            }
        );

        // Add to the document.fonts (FontFaceSet)
        document.fonts.add( commitMono );

        // Load the font
        commitMono.load();

        // Wait until the fonts are all loaded
        document.fonts.ready.then(() => {
            // console.log("commitMono loaded")
            this.charWidth = this._measureChar( "a", true );
        });
    }

    static getInstances()
    {
        return CodeEditor.__instances;
    }

    // This received key inputs from the entire document...
    onKeyPressed( e ) {

        // Toggle visibility of the file explorer
        if( e.key == 'b' && e.ctrlKey && this.explorer )
        {
            this.explorerArea.root.classList.toggle( "hidden" );
            if( this._lastBaseareaWidth )
            {
                this.base_area.root.style.width = this._lastBaseareaWidth;
                delete this._lastBaseareaWidth;

            } else
            {
                this._lastBaseareaWidth = this.base_area.root.style.width;
                this.base_area.root.style.width = "100%";
            }
        }
    }

    getText( min ) {

        return this.code.lines.join( min ? ' ' : '\n' );
    }

    // This can be used to empty all text...
    setText( text = "", lang ) {

        let new_lines = text.split( '\n' );
        this.code.lines = [].concat( new_lines );

        this._removeSecondaryCursors();

        let cursor = this._getCurrentCursor( true );
        let lastLine = new_lines.pop();

        this.cursorToLine( cursor, new_lines.length ); // Already substracted 1
        this.cursorToPosition( cursor, lastLine.length );
        this.processLines();

        if( lang )
        {
            this._changeLanguage( lang );
        }
    }

    appendText( text, cursor ) {

        let lidx = cursor.line;

        if( cursor.selection ) {
            this.deleteSelection( cursor );
            lidx = cursor.line;
        }

        this.endSelection();

        const new_lines = text.replaceAll( '\r', '' ).split( '\n' );

        // Pasting Multiline...
        if( new_lines.length != 1 )
        {
            let num_lines = new_lines.length;
            console.assert( num_lines > 0 );
            const first_line = new_lines.shift();
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

            for( var i = 0; i < new_lines.length; ++i ) {
                _text = new_lines[ i ];
                this.cursorToLine( cursor, cursor.line++, true );
                // Add remaining...
                if( i == (new_lines.length - 1) )
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
                new_lines[ 0 ],
                this.code.lines[ lidx ].slice( cursor.position )
            ].join('');

            this.cursorToPosition( cursor, ( cursor.position + new_lines[ 0 ].length ) );
            this.processLine( lidx );
        }

        this.resize( null, ( scrollWidth, scrollHeight ) => {
            var viewportSizeX = ( this.codeScroller.clientWidth + this.getScrollLeft() ) - CodeEditor.LINE_GUTTER_WIDTH; // Gutter offset
            if( ( cursor.position * this.charWidth ) >= viewportSizeX )
                this.setScrollLeft( this.code.lines[ lidx ].length * this.charWidth );
        } );
    }

    loadFile( file, options = {} ) {

        const inner_add_tab = ( text, name, title ) => {

            // Remove Carriage Return in some cases and sub tabs using spaces
            text = text.replaceAll( '\r', '' );
            text = text.replaceAll( /\t|\\t/g, ' '.repeat( this.tabSpaces ) );

            // Set current text and language

            const lines = text.split( '\n' );

            // Add item in the explorer if used

            if( this.explorer )
            {
                this._tabStorage[ name ] = {
                    lines: lines,
                    options: options
                };

                const ext = this.languages[ options.language ] ?. ext;
                this.addExplorerItem( { id: name, skipVisibility: true, icon: this._getFileIcon( name, ext ) } );
                this.explorer.innerTree.frefresh( name );
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
        };

        if( file.constructor == String )
        {
            let filename = file;
            LX.request({ url: filename, success: text => {
                const name = filename.substring(filename.lastIndexOf( '/' ) + 1);
                inner_add_tab( text, name, filename );
            } });
        }
        else // File Blob
        {
            const fr = new FileReader();
            fr.readAsText( file );
            fr.onload = e => {
                const text = e.currentTarget.result;
                inner_add_tab( text, file.name );
            };
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
                if( cursor.isMain ) this._updateDataInfoPanel( "@cursor-pos", "Col " + ( v + 1 ) );
            }
        } );

        this.cursors.appendChild( cursor );

        return cursor;
    }

    _getCurrentCursor( removeOthers ) {

        if( removeOthers )
        {
            this._removeSecondaryCursors();
        }

        return this.cursors.children[ 0 ];
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

    _addUndoStep( cursor, force, deleteRedo = true )  {

        // Only the mainc cursor stores undo steps
        if( !cursor.isMain )
            return;

        const d = new Date();
        const current = d.getTime();

        if( !force )
        {
            if( !this._lastTime ) {
                this._lastTime = current;
            } else {
                if( ( current - this._lastTime ) > 2000 ){
                    this._lastTime = null;
                } else {
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
            return;

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
                currentCursor = this._addCursor();

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
        this.processLines();

        const ext = langExtension ?? this.languages[ lang ].ext;
        const icon = this._getFileIcon( null, ext );

        // Update tab icon
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
        if( this.explorer )
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

        for( let l in this.languages )
        {
            const langExtension = this.languages[ l ].ext;

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

    _createPanelInfo() {

        if( !this.skipInfo )
        {
            let panel = new LX.Panel({ className: "lexcodetabinfo", width: "calc(100%)", height: "auto" });

            panel.sameLine();
            panel.addLabel( this.code.title, { fit: true, signal: "@tab-name" });
            panel.addLabel( "Ln " + 1, { fit: true, signal: "@cursor-line" });
            panel.addLabel( "Col " + 1, { fit: true, signal: "@cursor-pos" });
            panel.addButton( null, "Spaces: " + this.tabSpaces, ( value, event ) => {
                LX.addContextMenu( "Spaces", event, m => {
                    const options = [ 2, 4, 8 ];
                    for( const n of options )
                        m.add( n, (v) => {
                            this.tabSpaces = v;
                            this.processLines();
                            this._updateDataInfoPanel( "@tab-spaces", "Spaces: " + this.tabSpaces );
                        } );
                });
            }, { nameWidth: "15%", signal: "@tab-spaces" });
            panel.addButton( "<b>{ }</b>", this.highlight, ( value, event ) => {
                LX.addContextMenu( "Language", event, m => {
                    for( const lang of Object.keys( this.languages ) )
                    {
                        m.add( lang, v => {
                            this._changeLanguage( v, null, true )
                        } );
                    }
                });
            }, { nameWidth: "15%", signal: "@highlight" });
            panel.endLine();

            return panel;
        }
        else
        {
            doAsync( () => {

                // Change css a little bit...
                this.gutter.style.height = "calc(100% - 28px)";
                this.root.querySelectorAll( '.code' ).forEach( e => e.style.height = "calc(100% - 6px)" );
                this.root.querySelector( '.lexareatabscontent' ).style.height = "calc(100% - 23px)";
                this.base_area.root.querySelector( '.lexcodescrollbar.vertical' ).style.height = "calc(100% - 27px)";
                this.tabs.area.root.classList.add( 'no-code-info' );

            }, 100);
        }
    }

    _getFileIcon( name, extension ) {

        const isNewTabButton = name ? ( name === '+' ) : false;

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

        return extension == "html" ? "Code orange" :
            extension == "css" ? "Hash dodgerblue" :
            extension == "xml" ? "Rss orange" :
            extension == "bat" ? "Windows lightblue" :
            extension == "json" ? "Braces fg-primary" :
            extension == "js" ? "Js goldenrod" :
            extension == "py" ? "Python munsellblue" :
            extension == "rs" ? "Rust fg-primary" :
            extension == "md" ? "Markdown fg-primary" :
            extension == "cpp" ? "CPlusPlus pictonblue" :
            extension == "hpp" ? "CPlusPlus heliotrope" :
            extension == "c" ? "C pictonblue" :
            extension == "h" ? "C heliotrope" :
            !isNewTabButton ? "AlignLeft gray" : undefined;
    }

    _onNewTab( e ) {

        this.processFocus(false);

        LX.addContextMenu( null, e, m => {
            m.add( "Create", this.addTab.bind( this, "unnamed.js", true, "", { language: "JavaScript" } ) );
            m.add( "Load", this.loadTabFromFile.bind( this, "unnamed.js", true ) );
        });
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

        var cursor = this._getCurrentCursor( true );
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
    }

    _onContextMenuTab( isNewTabButton, event, name,  ) {

        if( isNewTabButton )
        return;

        LX.addContextMenu( null, event, m => {
            m.add( "Close", () => { this.tabs.delete( name ) } );
            m.add( "" );
            m.add( "Rename", () => { console.warn( "TODO" )} );
        });
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
        code.className = 'code';
        code.lines = [ "" ];
        code.language = options.language ?? "Plain Text";
        code.cursorState = {};
        code.undoSteps = [];
        code.redoSteps = [];
        code.tabName = name;
        code.title = title ?? name;
        code.tokens = {};
        code.style.left = "0px";
        code.style.top = "0px";

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

        if( this.explorer && !isNewTabButton )
        {
            this.addExplorerItem( { id: name, skipVisibility: true, icon: tabIcon } );
            this.explorer.innerTree.frefresh( name );
        }

        this.tabs.add( name, code, {
            selected: selected,
            fixed: isNewTabButton,
            title: code.title,
            icon: tabIcon,
            onSelect: this._onSelectTab.bind( this, isNewTabButton ),
            onContextMenu: this._onContextMenuTab.bind( this, isNewTabButton ),
            allowDelete: true
        } );

        // Move into the sizer..
        this.codeSizer.appendChild( code );

        this.endSelection();

        if( selected )
        {
            this.code = code;
            this.resetCursorPos( CodeEditor.CURSOR_LEFT_TOP );
            this.processLines();
        }

        if( options.language )
        {
            code.languageOverride = options.language;
            this._changeLanguage( code.languageOverride );
        }

        this._updateDataInfoPanel( "@tab-name", name );

        // Bc it could be overrided..
        return name;
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
            if (e.target.files[ 0 ]) {
                this.loadFile( e.target.files[ 0 ] );
            }
            input.remove();
        });
    }

    processFocus( active ) {

        if( active )
            this.restartBlink();
        else {
            clearInterval( this.blinker );
            this.cursors.classList.remove( 'show' );
        }
    }

    processMouse( e ) {

        if( !e.target.classList.contains('code') && !e.target.classList.contains('codetabsarea') ) return;
        if( !this.code ) return;

        var cursor = this._getCurrentCursor();
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

        if( (LX.getTime() - this.lastMouseDown) < 120 ) {
            this.state.selectingText = false;
            this.endSelection();
        }

        const cursor = this._getCurrentCursor();
        if( cursor.selection )
            cursor.selection.invertIfNecessary();

        this.state.selectingText = false;
        delete this._lastSelectionKeyDir;
    }

    processClick( e ) {

        var cursor = this._getCurrentCursor();
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

    updateSelections( e, keep_range, flags = CodeEditor.SELECTION_X_Y ) {

        for( let cursor of this.cursors.children )
        {
            if( !cursor.selection )
                continue;

            this._processSelection( cursor, e, keep_range, flags );
        }
    }

    processSelections( e, keep_range, flags = CodeEditor.SELECTION_X_Y ) {

        for( let cursor of this.cursors.children )
        {
            this._processSelection( cursor, e, keep_range, flags );
        }
    }

    _processSelection( cursor, e, keep_range, flags = CodeEditor.SELECTION_X_Y ) {

        const isMouseEvent = e && ( e.constructor == MouseEvent );

        if( isMouseEvent ) this.processClick( e );

        if( !cursor.selection )
            this.startSelection( cursor );

        this._hideActiveLine();

        // Update selection
        if( !keep_range )
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
                let string;

                if(sId == 0) // First line 2 cases (single line, multiline)
                {
                    const reverse = fromX > toX;
                    if(deltaY == 0) string = !reverse ? this.code.lines[ i ].substring( fromX, toX ) : this.code.lines[ i ].substring(toX, fromX);
                    else string = this.code.lines[ i ].substr( fromX );
                    const pixels = (reverse && deltaY == 0 ? toX : fromX) * this.charWidth;
                    if( isVisible ) domEl.style.left = "calc(" + pixels + "px + " + this.xPadding + ")";
                }
                else
                {
                    string = (i == toY) ? this.code.lines[ i ].substring( 0, toX ) : this.code.lines[ i ]; // Last line, any multiple line...
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
                    if(!domEl)
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

        let cursor = this._getCurrentCursor();

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

        const skip_undo = e.detail.skip_undo ?? false;

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

        if( !skip_undo && this.code.lines.length )
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
        const maxLineLength = this.getMaxLineLength();
        const numViewportChars = Math.floor( ( this.codeScroller.clientWidth - CodeEditor.LINE_GUTTER_WIDTH ) / this.charWidth );
        if( maxLineLength >= numViewportChars && maxLineLength != this._lastMaxLineLength )
        {
            this.resize( maxLineLength, () => {
                if( cursor.position > numViewportChars )
                {
                    this.setScrollLeft( cursor.position * this.charWidth );
                }
            } );
        }

        // Manage autocomplete

        if( this.useAutoComplete )
        {
            this.showAutoCompleteBox( key, cursor );
        }
    }

    async _pasteContent( cursor ) {

        let text = await navigator.clipboard.readText();

        // Remove any possible tabs (\t) and add spaces
        text = text.replaceAll( /\t|\\t/g, ' '.repeat( this.tabSpaces ) );

        this._addUndoStep( cursor, true );

        this.appendText( text, cursor );

        const currentScroll = this.getScrollTop();
        const scroll = Math.max( cursor.line * this.lineHeight - this.codeScroller.offsetWidth, 0 );

        if( currentScroll < scroll ) {
            this.codeScroller.scrollTo( 0, cursor.line * this.lineHeight );
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
                index += ( i == cursor.selection.fromY ? cursor.selection.fromX : this.code.lines[ i ].length );

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
            var cursor = this._getCurrentCursor();
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

        const lang = this.languages[ this.highlight ];

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
            var cursor = this._getCurrentCursor();
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

        const lang = this.languages[ this.highlight ];

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
            const linestring = this.code.lines[ i ];
            const tokens = this._getTokensFromLine( linestring, true );
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

    processLines( mode ) {

        var code_html = "";
        this._blockCommentCache.length = 0;

        // Reset all lines content
        this.code.innerHTML = "";

        // Get info about lines in viewport
        const lastScrollTop = this.getScrollTop();
        this.firstLineInViewport = ( mode ?? CodeEditor.KEEP_VISIBLE_LINES ) & CodeEditor.UPDATE_VISIBLE_LINES ?
                                    ( (lastScrollTop / this.lineHeight)|0 ) : this.firstLineInViewport;
        const totalLinesInViewport = ((this.codeScroller.offsetHeight - 36) / this.lineHeight)|0;
        this.visibleLinesViewport = new LX.vec2(
            Math.max( this.firstLineInViewport - this.lineScrollMargin.x, 0 ),
            Math.min( this.firstLineInViewport + totalLinesInViewport + this.lineScrollMargin.y, this.code.lines.length )
        );

        // Add remaining lines if we are near the end of the scroll
        {
            const diff = Math.max( this.code.lines.length - this.visibleLinesViewport.y, 0 );
            if( diff <= this.lineScrollMargin.y )
                this.visibleLinesViewport.y += diff;
        }

        // Process visible lines
        for( let i = this.visibleLinesViewport.x; i < this.visibleLinesViewport.y; ++i )
        {
            code_html += this.processLine( i, true );
        }

        this.code.innerHTML = code_html;

        // Update scroll data
        this.codeScroller.scrollTop = lastScrollTop;
        this.code.style.top = ( this.visibleLinesViewport.x * this.lineHeight ) + "px";

        // Update selections
        this.updateSelections( null, true );

        this._clearTmpVariables();
        this._setActiveLine();
        this.resize();
    }

    processLine( linenum, force ) {

        // Check if we are in block comment sections..
        if( !force && this._inBlockCommentSection( linenum ) )
        {
            this.processLines();
            return;
        }

        const lang = this.languages[ this.highlight ];
        const local_line_num =  this.toLocalLine( linenum );
        const gutter_line = "<span class='line-gutter'>" + (linenum + 1) + "</span>";

        const UPDATE_LINE = ( html ) => {
            if( !force ) // Single line update
            {
                this.code.childNodes[ local_line_num ].innerHTML = gutter_line + html;
                this._setActiveLine( linenum );
                this._clearTmpVariables();
            }
            else // Update all lines at once
                return "<pre>" + ( gutter_line + html ) + "</pre>";
        }

        // multi-line strings not supported by now
        delete this._buildingString;
        delete this._pendingString;
        delete this._markdownHeader;

        let linestring = this.code.lines[ linenum ];

        // Single line
        if( !force )
        {
            LX.deleteElement( this.code.childNodes[ local_line_num ] );
            this.code.insertChildAtIndex( document.createElement( 'pre' ), local_line_num );
        }

        // Early out check for no highlighting languages
        if( this.highlight == 'Plain Text' )
        {
            return UPDATE_LINE( linestring );
        }

        this._currentLineNumber = linenum;
        this._currentLineString = linestring;

        const tokensToEvaluate = this._getTokensFromLine( linestring );

        if( !tokensToEvaluate.length )
        return "<pre><span class='line-gutter'>" + linenum + "</span></pre>";

        var line_inner_html = "";

        // Process all tokens
        for( var i = 0; i < tokensToEvaluate.length; ++i )
        {
            let it = i - 1;
            let prev = tokensToEvaluate[ it ];
            while( prev == ' ' ) {
                it--;
                prev = tokensToEvaluate[ it ];
            }

            it = i + 1;
            let next = tokensToEvaluate[ it ];
            while( next == ' ' || next == '"' ) {
                it++;
                next = tokensToEvaluate[ it ];
            }

            const token = tokensToEvaluate[ i ];

            if( lang.blockComments ?? true )
            {
                const blockCommentsToken = ( lang.blockCommentsTokens ?? this.defaultBlockCommentTokens )[ 0 ];
                if( token.substr( 0, blockCommentsToken.length ) == blockCommentsToken )
                    this._buildingBlockComment = linenum;
            }

            line_inner_html += this._evaluateToken( {
                token: token,
                prev: prev,
                prevWithSpaces: tokensToEvaluate[ i - 1 ],
                next: next,
                nextWithSpaces: tokensToEvaluate[ i + 1 ],
                tokenIndex: i,
                isFirstToken: (i == 0),
                isLastToken: (i == tokensToEvaluate.length - 1),
                tokens: tokensToEvaluate
            } );
        }

        return UPDATE_LINE( line_inner_html );
    }

    _lineHasComment( linestring ) {

        const lang = this.languages[ this.highlight ];

        if( !(lang.singleLineComments ?? true) )
            return;

        const singleLineCommentToken = lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken;
        const idx = linestring.indexOf( singleLineCommentToken );

        if( idx > -1 )
        {
            const stringKeys = Object.values( this.stringKeys );
            // Count times we started a string BEFORE the comment
            var err = false;
            err |= stringKeys.some( function(v) {
                var re = new RegExp( v, "g" );
                var matches = (linestring.substring( 0, idx ).match( re ) || []);
                return (matches.length % 2) !== 0;
            } );
            return err ? undefined : idx;
        }
    }

    _getTokensFromLine( linestring, skipNonWords ) {

        // Check if line comment
        const ogLine = linestring;
        const hasCommentIdx = this._lineHasComment( linestring );

        if( hasCommentIdx != undefined )
        {
            linestring = ogLine.substring( 0, hasCommentIdx );
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

        let iter = linestring.matchAll(/(<!--|-->|\*\/|\/\*|::|[\[\](){}<>.,;:*"'%@!/= ])/g);
        let subtokens = iter.next();
        if( subtokens.value )
        {
            let idx = 0;
            while( subtokens.value != undefined )
            {
                const _pt = linestring.substring(idx, subtokens.value.index);
                if( _pt.length ) pushToken( _pt );
                pushToken( subtokens.value[ 0 ] );
                idx = subtokens.value.index + subtokens.value[ 0 ].length;
                subtokens = iter.next();
                if(!subtokens.value) {
                    const _at = linestring.substring(idx);
                    if( _at.length ) pushToken( _at );
                }
            }
        }
        else pushToken( linestring );

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
        }

        return tokens;
    }

    _mustHightlightWord( token, kindArray, lang ) {

        if( !lang )
        {
            lang = this.languages[ this.highlight ];
        }

        let t = token;

        if( lang.ignoreCase )
        {
            t = t.toLowerCase();
        }

        return kindArray[ this.highlight ] && kindArray[ this.highlight ][ t ] != undefined;
    }

    _evaluateToken( ctxData ) {

        let token        = ctxData.token,
            prev         = ctxData.prev,
            next         = ctxData.next,
            tokenIndex   = ctxData.tokenIndex,
            isFirstToken = ctxData.isFirstToken,
            isLastToken  = ctxData.isLastToken;

        const lang = this.languages[ this.highlight ],
              highlight = this.highlight.replace( /\s/g, '' ).replaceAll( "+", "p" ).toLowerCase(),
              customStringKeys = Object.assign( {}, this.stringKeys );

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

        if( usePreviousTokenToCheckString || ( this._buildingBlockComment === undefined && ( lang.tags ?? false ? ( this._enclosedByTokens( token, tokenIndex, '<', '>' ) ) : true ) ) )
        {
            const checkIfStringEnded = t => {
                const idx = Object.values( customStringKeys ).indexOf( t );
                this._stringEnded = (idx > -1) && (idx == Object.values(customStringKeys).indexOf( customStringKeys[ '@' + this._buildingString ] ));
            };

            if( this._buildingString != undefined )
            {
                checkIfStringEnded( usePreviousTokenToCheckString ? ctxData.nextWithSpaces : token );
            }
            else if( customStringKeys[ '@' + ( usePreviousTokenToCheckString ? ctxData.prevWithSpaces : token ) ] )
            {
                // Start new string
                this._buildingString = ( usePreviousTokenToCheckString ? ctxData.prevWithSpaces : token );

                // Check if string ended in same token using next...
                if( usePreviousTokenToCheckString )
                {
                    checkIfStringEnded( ctxData.nextWithSpaces );
                }
            }
        }

        const usesBlockComments = lang.blockComments ?? true;
        const blockCommentsTokens = lang.blockCommentsTokens ?? this.defaultBlockCommentTokens;
        const singleLineCommentToken = lang.singleLineCommentToken ?? this.defaultSingleLineCommentToken;

        let token_classname = "";
        let discardToken = false;

        if( this._buildingBlockComment != undefined )
            token_classname = "cm-com";

        else if( this._buildingString != undefined )
            discardToken = this._appendStringToken( token );

        else if( this._isKeyword( ctxData, lang ) )
            token_classname = "cm-kwd";

        else if( this._mustHightlightWord( token, CodeEditor.builtIn, lang ) && ( lang.tags ?? false ? ( this._enclosedByTokens( token, tokenIndex, '<', '>' ) ) : true ) )
            token_classname = "cm-bln";

        else if( this._mustHightlightWord( token, CodeEditor.statementsAndDeclarations, lang ) )
            token_classname = "cm-std";

        else if( this._mustHightlightWord( token, CodeEditor.symbols, lang ) )
            token_classname = "cm-sym";

        else if( token.substr( 0, singleLineCommentToken.length ) == singleLineCommentToken )
            token_classname = "cm-com";

        else if( this._isNumber( token ) || this._isNumber( token.replace(/[px]|[em]|%/g,'') ) )
            token_classname = "cm-dec";

        else if( this._isCSSClass( ctxData ) )
            token_classname = "cm-kwd";

        else if ( this._isType( ctxData, lang ) )
            token_classname = "cm-typ";

        else if ( highlight == 'batch' && ( token == '@' || prev == ':' || prev == '@' ) )
            token_classname = "cm-kwd";

        else if ( [ 'cpp', 'c', 'wgsl', 'glsl' ].indexOf( highlight ) > -1 && token.includes( '#' ) ) // C++ preprocessor
            token_classname = "cm-ppc";

        else if ( highlight == 'cpp' && prev == '<' && (next == '>' || next == '*') ) // Defining template type in C++
            token_classname = "cm-typ";

        else if ( highlight == 'cpp' && (next == '::' || prev == '::' && next != '(' )) // C++ Class
            token_classname = "cm-typ";

        else if ( highlight == 'css' && prev == ':' && (next == ';' || next == '!important') ) // CSS value
            token_classname = "cm-str";

        else if ( highlight == 'css' && prev == undefined && next == ':' ) // CSS attribute
            token_classname = "cm-typ";

        else if ( this._markdownHeader || ( highlight == 'markdown' && isFirstToken && token.replaceAll('#', '').length != token.length ) ) // Header
        {
            token_classname = "cm-kwd";
            this._markdownHeader = true;
        }

        else if ( token[ 0 ] != '@' && token[ 0 ] != ',' && next == '(' )
            token_classname = "cm-mtd";


        if( usesBlockComments && this._buildingBlockComment != undefined
            && token.substr( 0, blockCommentsTokens[ 1 ].length ) == blockCommentsTokens[ 1 ] )
        {
            this._blockCommentCache.push( new LX.vec2( this._buildingBlockComment, this._currentLineNumber ) );
            delete this._buildingBlockComment;
        }

        // We finished constructing a string
        if( this._buildingString && ( this._stringEnded || isLastToken ) )
        {
            token = this._getCurrentString();
            token_classname = "cm-str";
            discardToken = false;
        }

        // Update state
        this._buildingString = this._stringEnded ? undefined : this._buildingString;

        if( discardToken )
        {
            return "";
        }

        token = token.replace( "<", "&lt;" );
        token = token.replace( ">", "&gt;" );

        // No highlighting, no need to put it inside another span..
        if( !token_classname.length )
        {
            return token;
        }

        return "<span class='" + highlight + " " + token_classname + "'>" + token + "</span>";
    }

    _appendStringToken( token ) {

        if( !this._pendingString )
            this._pendingString = "";

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

    _inBlockCommentSection( line ) {

        for( var section of this._blockCommentCache )
        {
            if( line >= section.x && line <= section.y )
            {
                return true;
            }
        }

        return false;
    }

    _isKeyword( ctxData, lang ) {

        const token = ctxData.token;
        const tokenIndex = ctxData.tokenIndex;
        const tokens = ctxData.tokens;

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
        else if( lang.tags )
        {
            isKwd &= ( this._enclosedByTokens( token, tokenIndex, '<', '>' ) != undefined );
        }


        return isKwd;
    }

    _isCSSClass( ctxData ) {

        const token = ctxData.token;
        const prev = ctxData.prev;
        const next = ctxData.next;

        if( this.highlight != 'CSS' )
        {
            return false;
        }

        return  ( prev == '.' || prev == '::'
                || ( prev == ':' && next == '{' )
                || ( token[ 0 ] == '#' && prev != ':' ) );
    }

    _isNumber( token ) {

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

    _isType( ctxData, lang ) {

        const token = ctxData.token;
        const prev = ctxData.prev;
        const next = ctxData.next;

        // Common case
        if( this._mustHightlightWord( token, CodeEditor.types, lang ) )
        {
            return true;
        }

        if( this.highlight == 'JavaScript' )
        {
            return (prev == 'class' && next == '{') || (prev == 'new' && next == '(');
        }
        else if( this.highlight == 'C++' )
        {
            return (prev == 'class' && next == '{') || (prev == 'struct' && next == '{');
        }
        else if ( this.highlight == 'WGSL' )
        {
            const not_kwd = !this._mustHightlightWord( token, CodeEditor.keywords, lang );
            return  (prev == 'struct' && next == '{') ||
                    (not_kwd && prev == ':' && next == ';') ||
            ( not_kwd &&
                ( prev == ':' && next == ')' || prev == ':' && next == ',' || prev == '>' && next == '{'
                    || prev == '<' && next == ',' || prev == '<' && next == '>' || prev == '>' && token != ';' && !next ));
        }
    }

    _encloseSelectedWordWithKey( key, lidx, cursor ) {

        if( !cursor.selection || (cursor.selection.fromY != cursor.selection.toY) )
        return false;

        cursor.selection.invertIfNecessary();

        // Insert first..
        this.code.lines[ lidx ] = [
            this.code.lines[ lidx ].slice(0, cursor.selection.fromX),
            key,
            this.code.lines[ lidx ].slice(cursor.selection.fromX)
        ].join('');

        // Go to the end of the word
        this.cursorToPosition(cursor, cursor.selection.toX + 1);

        // Change next key?
        switch(key)
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

        var cursor = this._getCurrentCursor();
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
        cursor.style.left = "calc( " + cursor._left + "px + " + this.xPadding + " )";
        cursor.position++;

        this.restartBlink();

        // Add horizontal scroll

        doAsync(() => {
            var viewportSizeX = ( this.codeScroller.clientWidth + this.getScrollLeft() ) - CodeEditor.LINE_GUTTER_WIDTH; // Gutter offset
            if( (cursor.position * this.charWidth) >= viewportSizeX )
                this.setScrollLeft( this.getScrollLeft() + this.charWidth );
        });
    }

    cursorToLeft( key, cursor ) {

        if( !key ) return;

        cursor._left -= this.charWidth;
        cursor._left = Math.max( cursor._left, 0 );
        cursor.style.left = "calc( " + cursor._left + "px + " + this.xPadding + " )";
        cursor.position--;
        cursor.position = Math.max( cursor.position, 0 );
        this.restartBlink();

        // Add horizontal scroll

        doAsync(() => {
            var viewportSizeX = this.getScrollLeft(); // Gutter offset
            if( ( ( cursor.position - 1 ) * this.charWidth ) < viewportSizeX )
                this.setScrollLeft( this.getScrollLeft() - this.charWidth );
        });
    }

    cursorToTop( cursor, resetLeft = false ) {

        cursor._top -= this.lineHeight;
        cursor._top = Math.max(cursor._top, 0);
        cursor.style.top = "calc(" + cursor._top + "px)";
        this.restartBlink();

        if( resetLeft )
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

        doAsync(() => {
            var first_line = ( this.getScrollTop() / this.lineHeight )|0;
            if( (cursor.line - 1) < first_line )
                this.setScrollTop( this.getScrollTop() - this.lineHeight );
        });
    }

    cursorToBottom( cursor, resetLeft = false ) {

        cursor._top += this.lineHeight;
        cursor.style.top = "calc(" + cursor._top + "px)";

        this.restartBlink();

        if( resetLeft )
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

        doAsync(() => {
            var last_line = ( ( this.codeScroller.offsetHeight + this.getScrollTop() ) / this.lineHeight )|0;
            if( cursor.line >= last_line )
                this.setScrollTop( this.getScrollTop() + this.lineHeight );
        });
    }

    cursorToString( cursor, text, reverse ) {

        if( !text.length )
            return;

        for( let char of text )
            reverse ? this.cursorToLeft( char, cursor ) : this.cursorToRight( char, cursor );
    }

    cursorToPosition( cursor, position ) {

        cursor.position = position;
        cursor._left = position * this.charWidth;
        cursor.style.left = "calc(" + cursor._left + "px + " + this.xPadding + ")";
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

    relocateCursors() {

        for( let cursor of this.cursors.children )
        {
            cursor._left = cursor.position * this.charWidth;
            cursor.style.left = "calc(" + cursor._left + "px + " + this.xPadding + ")";
            cursor._top = cursor.line * this.lineHeight;
            cursor.style.top = "calc(" + cursor._top + "px)";
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
        cursor.style.left = "calc(" + cursor._left + "px + " + this.xPadding + ")";
        cursor._top = cursor.line * this.lineHeight;
        cursor.style.top = "calc(" + cursor._top + "px)";

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

        cursor = cursor ?? this._getCurrentCursor();

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

    _addSpaceTabs( cursor, n ) {

        for( var i = 0; i < n; ++i ) {
            this.actions[ 'Tab' ].callback( cursor.line, cursor, null );
        }
    }

    _addSpaces( n ) {

        for( var i = 0; i < n; ++i ) {
            this.root.dispatchEvent( new CustomEvent( 'keydown', { 'detail': {
                skip_undo: true,
                key: ' ',
                targetCursor: this._lastProcessedCursorIndex
            }}));
        }
    }

    _removeSpaces( cursor ) {

        // Remove indentation
        const lidx = cursor.line;
        let lineStart = firstNonspaceIndex( this.code.lines[ lidx ] );

        // Nothing to remove... we are at the start of the line
        if( lineStart == 0 )
            return;

        // Only tabs/spaces in the line...
        if( lineStart == -1 ) {
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
        this.codeScroller.scrollLeft = value;
        this.setScrollBarValue( 'horizontal', 0 );
    }

    setScrollTop( value ) {

        if( !this.codeScroller ) return;
        this.codeScroller.scrollTop = value;
        this.setScrollBarValue( 'vertical' );
    }

    resize( pMaxLength, onResize ) {

        setTimeout( () => {

            // Update max viewport
            const maxLineLength = pMaxLength ?? this.getMaxLineLength();
            const scrollWidth = maxLineLength * this.charWidth + CodeEditor.LINE_GUTTER_WIDTH;
            const scrollHeight = this.code.lines.length * this.lineHeight;

            this._lastMaxLineLength = maxLineLength;

            this.codeSizer.style.minWidth = scrollWidth + "px";
            this.codeSizer.style.minHeight = scrollHeight + "px";

            this.resizeScrollBars();

            if( onResize )
            {
                onResize( scrollWidth, scrollHeight );
            }

        }, 10 );
    }

    resizeScrollBars() {

        const totalLinesInViewport = ((this.codeScroller.offsetHeight) / this.lineHeight)|0;

        if( totalLinesInViewport >= this.code.lines.length )
        {
            this.codeScroller.classList.remove( 'with-vscrollbar' );
            this.vScrollbar.root.classList.add( 'scrollbar-unused' );
        }
        else
        {
            this.codeScroller.classList.add( 'with-vscrollbar' );
            this.vScrollbar.root.classList.remove( 'scrollbar-unused' );
            this.vScrollbar.thumb.size = (totalLinesInViewport / this.code.lines.length);
            this.vScrollbar.thumb.style.height = (this.vScrollbar.thumb.size * 100.0) + "%";
        }

        const numViewportChars = Math.floor( ( this.codeScroller.clientWidth - CodeEditor.LINE_GUTTER_WIDTH ) / this.charWidth );
        const maxLineLength = this._lastMaxLineLength;

        if( numViewportChars >= maxLineLength )
        {
            this.codeScroller.classList.remove( 'with-hscrollbar' );
            this.hScrollbar.root.classList.add( 'scrollbar-unused' );
        }
        else
        {
            this.codeScroller.classList.add( 'with-hscrollbar' );
            this.hScrollbar.root.classList.remove( 'scrollbar-unused' );
            this.hScrollbar.thumb.size = (numViewportChars / maxLineLength);
            this.hScrollbar.thumb.style.width = (this.hScrollbar.thumb.size * 100.0) + "%";
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

    _measureChar( char = "a", use_floating = false, get_bb = false ) {
        const parentContainer = LX.makeContainer( null, "lexcodeeditor", "", document.body );
        const container = LX.makeContainer( null, "code", "", parentContainer );
        const line = document.createElement( "pre" );
        container.appendChild( line );
        const text = document.createElement( "span" );
        line.appendChild( text );
        text.innerText = char;
        var rect = text.getBoundingClientRect();
        LX.deleteElement( parentContainer );
        const bb = [ use_floating ? rect.width : Math.floor( rect.width ), use_floating ? rect.height : Math.floor( rect.height ) ];
        return get_bb ? bb : bb[ 0 ];
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
            return;

        const [word, start, end] = this.getWordAtPos( cursor, -1 );
        if( key == ' ' || !word.length ) {
            this.hideAutoCompleteBox();
            return;
        }

        this.autocomplete.innerHTML = ""; // Clear all suggestions

        let suggestions = [];

        // Add language special keys...
        suggestions = suggestions.concat(
            Object.keys( CodeEditor.builtIn[ this.highlight ] ?? {} ),
            Object.keys( CodeEditor.keywords[ this.highlight ] ?? {} ),
            Object.keys( CodeEditor.statementsAndDeclarations[ this.highlight ] ?? {} ),
            Object.keys( CodeEditor.types[ this.highlight ] ?? {} ),
            Object.keys( CodeEditor.utils[ this.highlight ] ?? {} )
        );

        // Add words in current tab plus remove current word
        // suggestions = suggestions.concat( Object.keys(this.code.tokens).filter( a => a != word ) );

        // Remove 1/2 char words and duplicates...
        suggestions = suggestions.filter( (value, index) => value.length > 2 && suggestions.indexOf(value) === index );

        // Order...
        suggestions = suggestions.sort( ( a, b ) => a.localeCompare( b ) );

        for( let s of suggestions )
        {
            if( !s.toLowerCase().includes( word.toLowerCase() ) )
            continue;

            var pre = document.createElement( 'pre' );
            this.autocomplete.appendChild( pre );

            var icon = "Type";

            if( this._mustHightlightWord( s, CodeEditor.utils ) )
                icon = "Box";
            else if( this._mustHightlightWord( s, CodeEditor.types ) )
                icon = "Code";

            pre.appendChild( LX.makeIcon( icon, { iconClass: "mr-1", svgClass: "xs" } ) );

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
        this.autocomplete.firstChild.classList.add('selected');

        // Show box
        this.autocomplete.classList.toggle('show', true);
        this.autocomplete.classList.toggle('no-scrollbar', !(this.autocomplete.scrollHeight > this.autocomplete.offsetHeight));
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
            const cursor = this._getCurrentCursor();

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
            return;

        let cursor = this._getCurrentCursor();
        let cursorData = new LX.vec2( cursor.position, cursor.line );
        let line = null;
        let char = -1;

        if( this._lastResult )
        {
            LX.deleteElement( this._lastResult.dom );
            cursorData = this._lastResult.pos;
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

        if( line == null)
        {
            if( !skipAlert )
                alert( "No results!" );

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
            char += ( line == cursorData.y ? cursorData.x : 0 );


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
            'pos': new LX.vec2( char + text.length * ( reverse ? -1 : 1 ) , line )
        };
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
        var cursor = this._getCurrentCursor( true );
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

        this._updateDataInfoPanel( "@cursor-line", "Ln " + ( number + 1 ) );

        const old_local = this.toLocalLine( this.state.activeLine );
        let line = this.code.childNodes[ old_local ];

        if( !line )
            return;

        line.classList.remove( 'active-line' );

        // Set new active
        {
            this.state.activeLine = number;

            const new_local = this.toLocalLine( number );
            line = this.code.childNodes[ new_local ];
            if( line ) line.classList.add( 'active-line' );
        }
    }

    _hideActiveLine() {

        this.code.querySelectorAll( '.active-line' ).forEach( e => e.classList.remove( 'active-line' ) );
    }

    _increaseFontSize() {

        // Change font size

        var r = document.querySelector( ':root' );
        var s = getComputedStyle( r );
        var pixels = parseInt( s.getPropertyValue( "--code-editor-font-size" ) );
        pixels = LX.clamp( pixels + 1, CodeEditor.CODE_MIN_FONT_SIZE, CodeEditor.CODE_MAX_FONT_SIZE );
        r.style.setProperty( "--code-editor-font-size", pixels + "px" );
        this.charWidth = this._measureChar( "a", true );

        // Change row size

        var row_pixels = pixels + 6;
        r.style.setProperty( "--code-editor-row-height", row_pixels + "px" );
        this.lineHeight = row_pixels;

        // Relocate cursors

        this.relocateCursors();

        // Resize the code area

        this.processLines();
    }

    _decreaseFontSize() {

        // Change font size

        var r = document.querySelector( ':root' );
        var s = getComputedStyle( r );
        var pixels = parseInt( s.getPropertyValue( "--code-editor-font-size" ) );
        pixels = LX.clamp( pixels - 1, CodeEditor.CODE_MIN_FONT_SIZE, CodeEditor.CODE_MAX_FONT_SIZE );
        r.style.setProperty( "--code-editor-font-size", pixels + "px" );
        this.charWidth = this._measureChar( "a", true );

        // Change row size

        var row_pixels = pixels + 6;
        r.style.setProperty( "--code-editor-row-height", row_pixels + "px" );
        this.lineHeight = row_pixels;

        // Relocate cursors

        this.relocateCursors();

        // Resize the code area

        this.processLines();
    }

    _clearTmpVariables() {

        delete this._currentLineString;
        delete this._currentLineNumber;
        delete this._buildingString;
        delete this._pendingString;
        delete this._buildingBlockComment;
        delete this._markdownHeader;
        delete this._lastResult;
    }
}

CodeEditor.keywords = {

    'JavaScript': ['var', 'let', 'const', 'this', 'in', 'of', 'true', 'false', 'new', 'function', 'NaN', 'static', 'class', 'constructor', 'null', 'typeof', 'debugger', 'abstract',
                  'arguments', 'extends', 'instanceof', 'Infinity'],
    'C': ['int', 'float', 'double', 'long', 'short', 'char', 'const', 'void', 'true', 'false', 'auto', 'struct', 'typedef', 'signed', 'volatile', 'unsigned', 'static', 'extern', 'enum', 'register',
        'union'],
    'C++': ['int', 'float', 'double', 'bool', 'long', 'short', 'char', 'wchar_t', 'const', 'static_cast', 'dynamic_cast', 'new', 'delete', 'void', 'true', 'false', 'auto', 'class', 'struct', 'typedef', 'nullptr',
            'NULL', 'signed', 'unsigned', 'namespace', 'enum', 'extern', 'union', 'sizeof', 'static', 'private', 'public'],
    'CMake': ['cmake_minimum_required', 'set', 'not', 'if', 'endif', 'exists', 'string', 'strequal', 'add_definitions', 'macro', 'endmacro', 'file', 'list', 'source_group', 'add_executable',
        'target_include_directories', 'set_target_properties', 'set_property', 'add_compile_options', 'add_link_options', 'include_directories', 'add_library', 'target_link_libraries',
        'target_link_options', 'add_subdirectory', 'add_compile_definitions', 'project', 'cache'],
    'JSON': ['true', 'false'],
    'GLSL': ['true', 'false', 'function', 'int', 'float', 'vec2', 'vec3', 'vec4', 'mat2x2', 'mat3x3', 'mat4x4', 'struct'],
    'CSS': ['body', 'html', 'canvas', 'div', 'input', 'span', '.'],
    'WGSL': ['var', 'let', 'true', 'false', 'fn', 'bool', 'u32', 'i32', 'f16', 'f32', 'vec2f', 'vec3f', 'vec4f', 'mat2x2f', 'mat3x3f', 'mat4x4f', 'array', 'atomic', 'struct',
            'sampler', 'sampler_comparison', 'texture_depth_2d', 'texture_depth_2d_array', 'texture_depth_cube', 'texture_depth_cube_array', 'texture_depth_multisampled_2d',
            'texture_external', 'texture_1d', 'texture_2d', 'texture_2d_array', 'texture_3d', 'texture_cube', 'texture_cube_array', 'texture_storage_1d', 'texture_storage_2d',
            'texture_storage_2d_array', 'texture_storage_3d', 'vec2u', 'vec3u', 'vec4u'],
    'Rust': ['as', 'const', 'crate', 'enum', 'extern', 'false', 'fn', 'impl', 'in', 'let', 'mod', 'move', 'mut', 'pub', 'ref', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true',
             'type', 'unsafe', 'use', 'where', 'abstract', 'become', 'box', 'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual'],
    'Python': ['False', 'def', 'None', 'True', 'in', 'is', 'and', 'lambda', 'nonlocal', 'not', 'or'],
    'Batch': ['set', 'SET', 'echo', 'ECHO', 'off', 'OFF', 'del', 'DEL', 'defined', 'DEFINED', 'setlocal', 'SETLOCAL', 'enabledelayedexpansion', 'ENABLEDELAYEDEXPANSION', 'driverquery',
              'DRIVERQUERY', 'print', 'PRINT'],
    'HTML': ['html', 'meta', 'title', 'link', 'script', 'body', 'DOCTYPE', 'head', 'br', 'i', 'a', 'li', 'img', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'],
    'Markdown': ['br', 'i', 'a', 'li', 'img', 'table', 'title', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'],
};

CodeEditor.utils = { // These ones don't have hightlight, used as suggestions to autocomplete only...

    'JavaScript': ['querySelector', 'body', 'addEventListener', 'removeEventListener', 'remove', 'sort', 'keys', 'filter', 'isNaN', 'parseFloat', 'parseInt', 'EPSILON', 'isFinite',
                  'bind', 'prototype', 'length', 'assign', 'entries', 'values', 'concat', 'substring', 'substr', 'splice', 'slice', 'buffer', 'appendChild', 'createElement', 'prompt',
                  'alert'],
    'WGSL': ['textureSample'],
    'Python': ['abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
              'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
              'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
              'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip']
};

CodeEditor.types = {

    'JavaScript': ['Object', 'String', 'Function', 'Boolean', 'Symbol', 'Error', 'Number', 'TextEncoder', 'TextDecoder', 'Array', 'ArrayBuffer', 'InputEvent', 'MouseEvent',
                   'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'Element'],
    'Rust': ['u128'],
    'Python': ['int', 'type', 'float', 'map', 'list', 'ArithmeticError', 'AssertionError', 'AttributeError', 'Exception', 'EOFError', 'FloatingPointError', 'GeneratorExit',
              'ImportError', 'IndentationError', 'IndexError', 'KeyError', 'KeyboardInterrupt', 'LookupError', 'MemoryError', 'NameError', 'NotImplementedError', 'OSError',
              'OverflowError', 'ReferenceError', 'RuntimeError', 'StopIteration', 'SyntaxError', 'TabError', 'SystemError', 'SystemExit', 'TypeError', 'UnboundLocalError',
              'UnicodeError', 'UnicodeEncodeError', 'UnicodeDecodeError', 'UnicodeTranslateError', 'ValueError', 'ZeroDivisionError'],
    'C++': ['uint8_t', 'uint16_t', 'uint32_t']
};

CodeEditor.builtIn = {

    'JavaScript': ['document', 'console', 'window', 'navigator', 'performance'],
    'CSS': ['*', '!important'],
    'C++': ['vector', 'list', 'map'],
    'HTML': ['type', 'xmlns', 'PUBLIC', 'http-equiv', 'src', 'style', 'lang', 'href', 'rel', 'content', 'xml', 'alt'], // attributes
    'Markdown': ['type', 'src', 'style', 'lang', 'href', 'rel', 'content', 'valign', 'alt'], // attributes
};

CodeEditor.statementsAndDeclarations = {

    'JavaScript': ['for', 'if', 'else', 'case', 'switch', 'return', 'while', 'continue', 'break', 'do', 'import', 'from', 'throw', 'async', 'try', 'catch', 'await'],
    'CSS': ['@', 'import'],
    'C': ['for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'using', 'default', 'goto', 'do'],
    'C++': ['std', 'for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'using', 'glm', 'spdlog', 'default'],
    'GLSL': ['for', 'if', 'else', 'return', 'continue', 'break'],
    'WGSL': ['const','for', 'if', 'else', 'return', 'continue', 'break', 'storage', 'read', 'read_write', 'uniform', 'function', 'workgroup'],
    'Rust': ['break', 'else', 'continue', 'for', 'if', 'loop', 'match', 'return', 'while', 'do', 'yield'],
    'Python': ['if', 'raise', 'del', 'import', 'return', 'elif', 'try', 'else', 'while', 'as', 'except', 'with', 'assert', 'finally', 'yield', 'break', 'for', 'class', 'continue',
              'global', 'pass', 'from'],
    'Batch': ['if', 'IF', 'for', 'FOR', 'in', 'IN', 'do', 'DO', 'call', 'CALL', 'goto', 'GOTO', 'exit', 'EXIT']
};

CodeEditor.symbols = {

    'JavaScript': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '??'],
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
    'XML': ['<', '>', '/']
};

LX.CodeEditor = CodeEditor;

export { CodeEditor };