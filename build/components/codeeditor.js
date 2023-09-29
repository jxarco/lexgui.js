(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    LX.components.push( 'CodeEditor' );

    function flushCss(element) {
        // By reading the offsetHeight property, we are forcing
        // the browser to flush the pending CSS changes (which it
        // does to ensure the value obtained is accurate).
        element.offsetHeight;
    }

    function swapElements (array, id0, id1) {
        [array[id0], array[id1]] = [array[id1], array[id0]];
    };

    function sliceChar(str, idx) {
        return str.substr(0, idx) + str.substr(idx + 1);
    }

    function firstNonspaceIndex(str) {
        return str.search(/\S|$/);
    }

    class ISelection {

        constructor(ix, iy) {

            this.fromX  = ix;
            this.toX    = ix;
            
            this.fromY  = iy;
            this.toY    = iy;

            this.chars  = 0;
        }
    };

    /**
     * @class CodeEditor
     */

    class CodeEditor {

        static CURSOR_LEFT  = 1;
        static CURSOR_TOP   = 2;

        /**
         * @param {*} options
         */

        constructor( area, options = {} ) {

            this.skip_info = options.skip_info;
            this.base_area = area;
            this.area = new LX.Area( { className: "lexcodeeditor", height: "auto" } );

            this.tabs = this.area.addTabs( { onclose: (name) => delete this.openedTabs[name] } );
            this.tabs.root.addEventListener( 'dblclick', (e) => {
                e.preventDefault();
                this.addTab("unnamed.js", true);
            } );

            area.root.classList.add('codebasearea');
            this.gutter = document.createElement('div');
            this.gutter.className = "lexcodegutter";
            area.attach( this.gutter );

            this.root = this.area.root;
            this.root.tabIndex = -1;
            area.attach( this.root );

            this.root.addEventListener( 'keydown', this.processKey.bind(this), true);
            this.root.addEventListener( 'mousedown', this.processMouse.bind(this) );
            this.root.addEventListener( 'mouseup', this.processMouse.bind(this) );
            this.root.addEventListener( 'mousemove', this.processMouse.bind(this) );
            this.root.addEventListener( 'click', this.processMouse.bind(this) );
            this.root.addEventListener( 'contextmenu', this.processMouse.bind(this) );
            this.root.addEventListener( 'focus', this.processFocus.bind(this, true) );
            this.root.addEventListener( 'focusout', this.processFocus.bind(this, false) );

            // Cursors and selection

            this.cursors = document.createElement('div');
            this.cursors.className = 'cursors';
            this.tabs.area.attach(this.cursors);

            this.selections = document.createElement('div');
            this.selections.className = 'selections';
            this.tabs.area.attach(this.selections);

            // Add main cursor
            {
                var cursor = document.createElement('div');
                cursor.className = "cursor";
                cursor.innerHTML = "&nbsp;";
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor._top = 4;
                cursor.style.top = "4px";
                cursor.position = 0;
                cursor.line = 0;
                this.cursors.appendChild(cursor);
            }

            // State

            this.state = {
                overwrite: false,
                focused: false,
                selectingText: false
            }

            // Code

            this.highlight = options.highlight ?? 'Plain Text';
            this.onsave = options.onsave ?? ((code) => {  });
            this.onrun = options.onrun ?? ((code) => { this.runScript(code) });
            this.actions = {};
            this.cursorBlinkRate = 550;
            this.tabSpaces = 4;
            this.maxUndoSteps = 16;
            this.lineHeight = 22;
            this.charWidth = this.measureChar();
            this._lastTime = null;

            this.languages = [
                'Plain Text', 'JavaScript', 'GLSL', 'JSON', 'XML'
            ];
            this.specialKeys = [
                'Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 
                'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
                'End', 'Tab'
            ];
            this.keywords = [
                'var', 'let', 'const', 'this', 'in', 'of', 
                'true', 'false', 'new', 'function', 'NaN',
                'static', 'class', 'constructor', 'null', 
                'typeof'
            ];
            this.builtin = [
                'console', 'window', 'navigator'
            ];
            this.literals = {
                'JavaScript': ['for', 'if', 'else', 'case', 'switch', 'return', 'while', 'continue', 'break', 'do']
            };
            this.symbols = {
                'JavaScript': ['<', '>', '[', ']', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '??'],
                'JSON': ['[', ']', '{', '}', '(', ')']
            };

            // Action keys

            this.action('Backspace', true, ( ln, cursor, e ) => {

                this._addUndoStep(cursor);

                if(this.selection) {
                    this.deleteSelection(cursor);
                    // Remove entire line when selecting with triple click
                    if(!this.code.lines[ln].length) 
                        this.actions['Backspace'].callback(ln, cursor, e);
                }
                else {
                    var letter = this.getCharAtPos( cursor,  -1 );
                    if(letter) {
                        this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.position - 1 );
                        this.cursorToLeft( letter );
                        this.processLine(ln);
                    } 
                    else if(this.code.lines[ln - 1] != undefined) {
                        this.lineUp();
                        this.actions['End'].callback(cursor.line, cursor, e);
                        // Move line on top
                        this.code.lines[ln - 1] += this.code.lines[ln];
                        this.code.lines.splice(ln, 1);
                        this.processLines(ln);
                    }
                }
            });

            this.action('Delete', true, ( ln, cursor, e ) => {

                this._addUndoStep( cursor );
                let count = this.selected_lines[0];
                for(let i = this.selected_lines.length - 1; i >= 0; i--) {
                    ln = this.selected_lines[i];
                    
                    let selection = this.selections.children[ln - count];
                    cursor.line = ln;
                    if(selection.range && (selection.range[1] - selection.range[0]))
                    {
                        this.deleteSelection(cursor, selection);

                        // if(!this.code.lines[ln].length) this.actions['Delete'].callback(ln, cursor);
                        this.processLines();

                    }
                    else
                    {
                        var letter = this.getCharAtPos( cursor );
                        if(letter) {
                            this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.position );
                            this.processLine(ln);
                        } 
                        else if(this.code.lines[ln + 1] != undefined) {
                            this.code.lines[ln] += this.code.lines[ln + 1];
                            this.code.lines.splice(ln + 1, 1);
                            this.processLines(ln);
                        }
                    }
                }
                this.endSelection();
            });

            this.action('Tab', true, ( ln, cursor, e ) => {
                this.addSpaces( this.tabSpaces );
            });

            this.action('Home', false, ( ln, cursor, e ) => {
                // Find first non space char
                var idx = firstNonspaceIndex(this.code.lines[ln]);
                var prestring = this.code.lines[ln].substring(0, idx);
                let selection = this.selections.children[0] || this.selection;
                if( e.shiftKey ) {
                    this.startSelection(cursor, selection);
                    var string = this.code.lines[ln].substring(idx, cursor.position);
                    selection.style.width = this.measureString(string) + "px";
                    selection.style.left = "calc(" + this.measureString(prestring) + "px + 0.25em)";
                    selection.range = [ idx, cursor.position ];
                }
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToString(cursor, prestring);
            });

            this.action('End', false, ( ln, cursor, e ) => {
                let selection = this.selections.children[0] || this.selection;
                if( e.shiftKey || e._shiftKey ) {
                    this.startSelection(cursor, selection);
                    var string = this.code.lines[ln].substring(cursor.position);
                    selection.style.width = this.measureString(string) + "px";
                    selection.range = [ cursor.position, this.code.lines[ln].length ];
                }
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToString( cursor, this.code.lines[ln] );
            });

            this.action('Enter', true, ( ln, cursor, e ) => {

                if(e.ctrlKey)
                {
                    this.onrun( this.getText() );
                    return;
                }

                this._addUndoStep(cursor);

                var _c0 = this.getCharAtPos( cursor, -1 );
                var _c1 = this.getCharAtPos( cursor );

                cursor.line++;
                this.code.lines.splice(cursor.line, 0, "");
                this.code.lines[cursor.line] = this.code.lines[ln].substr( cursor.position ); // new line (below)
                this.code.lines[ln] = this.code.lines[ln].substr( 0, cursor.position ); // line above
                this.cursorToBottom( null, true );

                // Check indentation
                var spaces = firstNonspaceIndex(this.code.lines[ln]);
                var tabs = Math.floor( spaces / this.tabSpaces );

                if( _c0 == '{' && _c1 == '}' ) {
                    this.code.lines.splice(cursor.line, 0, "");
                    this.addSpaceTabs(tabs + 1);
                    this.code.lines[cursor.line + 1] = " ".repeat(spaces) + this.code.lines[cursor.line + 1];
                } else {
                    this.addSpaceTabs(tabs);
                }

                this.processLines( ln );
                this.code.scrollTop = this.code.scrollHeight;
            });

            this.action('ArrowUp', false, ( ln, cursor, e ) => {
                this.lineUp();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'].callback(cursor.line, cursor, e);
            });

            this.action('ArrowDown', false, ( ln, cursor, e ) => {
                if( this.code.lines[ ln + 1 ] == undefined ) 
                    return;
                this.lineDown();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'].callback(cursor.line, cursor, e);
            });

            this.action('ArrowLeft', false, ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'Home' ].callback( ln, cursor );
                } else if(e.ctrlKey) {
                    // get next word
                    const [word, from, to] = this.getWordAtPos( cursor, -1 );
                    var diff = Math.max(cursor.position - from, 1);
                    var substr = word.substr(0, diff);
                    this.cursorToString(cursor, substr, true);
                } else {
                    var letter = this.getCharAtPos( cursor, -1 );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            if( (cursor.position - 1) < this.initial_charPos ) {
                                selection.range[0]--;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left - this.charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) + this.charWidth;
                            }
                            else if( (cursor.position - 1) == this.initial_charPos ) {
                                selection.range[1]--;
                                new_width = 0;
                            }
                            else {
                                selection.range[1]--;
                                new_width = +parseInt(selection.style.width) - this.charWidth;
                            }
                            selection.style.width = new_width + "px";
                            if(new_width == 0) this.endSelection();
                            this.cursorToLeft( letter, cursor );
                        }else {
                            // no selection
                            if(!selection.range) this.cursorToLeft( letter, cursor );
                            else {
                                this.endSelection();
                                // TODO: go to start of selection
                                // ...
                            }
                        }
                    }
                    else if( cursor.line > 0 ) {
                        this.lineUp( cursor );
                        this.actions['End'].callback(cursor.line, cursor, e);
                    }
                }
            });

            this.action('ArrowRight', false, ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'End' ].callback( ln, cursor );
                } else if(e.ctrlKey) {
                    // get next word
                    const [word, from, to] = this.getWordAtPos( cursor );
                    var diff = cursor.position - from;
                    var substr = word.substr(diff);
                    this.cursorToString(cursor, substr);
                } else {
                    var letter = this.getCharAtPos( cursor );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            if( cursor.position < this.initial_charPos ) {
                                selection.range[0]++;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left + this.charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) - this.charWidth;
                            }
                            else {
                                selection.range[1]++;
                                new_width = +parseInt(selection.style.width) + this.charWidth;
                            }
                            selection.style.width = new_width + "px";
                            if(new_width == 0) this.endSelection();
                            this.cursorToRight( letter, cursor );
                        }else{
                            // no selection
                            if(!selection.range) this.cursorToRight( letter, cursor );
                            else {
                                this.endSelection();
                                // TODO: go to end of selection
                                // ...
                            }
                        }
                    }
                    else if( this.code.lines[ cursor.line + 1 ] !== undefined ) {
                        this.lineDown( cursor );
                        this.actions['Home'].callback(cursor.line, cursor, e);
                    }
                }
            });

            // Default code tab
        
            this.openedTabs = { };
            this.addTab("+", false, "New File");
            this.addTab("untitled", true);

            // Create inspector panel
            let panel = this._create_panel_info();
            if( panel ) area.attach( panel );
        }

        getText( min ) {
            return this.code.lines.join(min ? ' ' : '\n');
        }

        loadFile( file ) {

            const inner_add_tab = ( text, name, title ) => {
                this.addTab(name, true, title);
                text = text.replaceAll('\r', '');
                this.code.lines = text.split('\n');
                this.processLines();
                this._refresh_code_info();
            };

            if(file.constructor == String)
            {
                let filename = file;
                LX.request({ url: filename, success: text => {

                    const name = filename.substring(filename.lastIndexOf('/') + 1);
                    this._change_language_from_extension( LX.getExtension(name) );
                    inner_add_tab( text, name, filename );
                } });
            }
            else // File Blob
            {
                const fr = new FileReader();
                fr.readAsText( file );
                fr.onload = e => { 
                    this._change_language_from_extension( LX.getExtension(file.name) );
                    const text = e.currentTarget.result;
                    inner_add_tab( text, file.name );
                };
            }
            
        }

        _addUndoStep( cursor )  {

            var cursor = cursor ?? this.cursors.children[0];

            this.code.undoSteps.push( {
                lines: LX.deepCopy(this.code.lines),
                cursor: this.saveCursor(cursor),
                line: cursor.line
            } );
        }

        _change_language( lang ) {
            this.highlight = lang;
            this._refresh_code_info();
            this.processLines();
        }

        _change_language_from_extension( ext ) {
            
            switch(ext.toLowerCase())
            {
                case 'js': return this._change_language('JavaScript');
                case 'glsl': return this._change_language('GLSL');
                case 'json': return this._change_language('JSON');
                case 'xml': return this._change_language('XML');
                case 'txt': 
                default:
                    this._change_language('Plain Text');
            }
        }

        _create_panel_info() {
            
            if( !this.skip_info )
            {
                let panel = new LX.Panel({ className: "lexcodetabinfo", width: "calc(100%)", height: "auto" });
                panel.ln = 0;
                panel.col = 0;
    
                this._refresh_code_info = (ln = panel.ln, col = panel.col) => {
                    panel.ln = ln;
                    panel.col = col;
                    panel.clear();
                    panel.sameLine();
                    panel.addLabel(this.code.title, { float: 'right' });
                    panel.addLabel("Ln " + ln, { width: "48px" });
                    panel.addLabel("Col " + col, { width: "48px" });
                    panel.addButton("<b>{ }</b>", this.highlight, (value, event) => {
                        LX.addContextMenu( "Language", event, m => {
                            for( const lang of this.languages )
                                m.add( lang, this._change_language.bind(this) );
                        });
                    }, { width: "25%", nameWidth: "15%" });
                    panel.endLine();
                };

                this._refresh_code_info();

                return panel;
            }
            else
            {
                this._refresh_code_info = () => {};

                setTimeout( () => {

                    // Change css a little bit...
                    this.gutter.style.height = "calc(100% - 31px)";
                    this.root.querySelectorAll('.code').forEach( e => e.style.height = "100%" );
                    this.root.querySelector('.lexareatabscontent').style.height = "calc(100% - 23px)";

                }, 100);
            }
        }

        _onNewTab( e ) {

            this.processFocus(false);

            LX.addContextMenu( null, e, m => {
                m.add( "Create", this.addTab.bind(this, "unnamed.js", true) );
                m.add( "Load", this.loadTab.bind(this, "unnamed.js", true) );
            });
        }

        addTab(name, selected, title) {
            
            if(this.openedTabs[name])
            {
                this.tabs.select( this.code.tabName );
                return;
            }

            // Create code content
            let code = document.createElement('div');
            code.className = 'code';
            code.lines = [""];
            code.cursorState = {};
            code.undoSteps = [];
            code.tabName = name;
            code.title = title ?? name;

            code.addEventListener('dragenter', function(e) {
                e.preventDefault();
                this.classList.add('dragging');
            });
            code.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragging');
            });
            code.addEventListener('drop', (e) => {
                e.preventDefault();
                code.classList.remove('dragging');
                for( let i = 0; i < e.dataTransfer.files.length; ++i )
                    this.loadFile( e.dataTransfer.files[i] );
            });

            code.addEventListener('scroll', (e) => {
                // const maxScrollTop = this.gutter.scrollHeight - this.gutter.offsetHeight;
                // code.scrollTop = Math.min( code.scrollTop, maxScrollTop );
                this.gutter.scrollTop = code.scrollTop;
                this.gutter.scrollLeft = code.scrollLeft;

                // Update cursor
                var cursor = this.cursors.children[0];
                cursor.style.top = "calc(" + cursor._top + "px - " + code.scrollTop + "px)";
            });

            this.openedTabs[name] = code;

            this.tabs.add(name, code, selected, null, { 'fixed': (name === '+') , 'title': code.title, 'onSelect': (e, tabname) => {

                if(tabname == '+')
                {
                    this._onNewTab( e );
                    return;
                }

                var cursor = cursor ?? this.cursors.children[0];
                this.saveCursor(cursor, this.code.cursorState);    
                this.code = this.openedTabs[tabname];
                this.restoreCursor(cursor, this.code.cursorState);    
                this.endSelection();
                // this.processLines();
                this._change_language_from_extension( LX.getExtension(tabname) );
                this._refresh_code_info(cursor.line + 1, cursor.position);

                // Restore scroll
                this.gutter.scrollTop = this.code.scrollTop;
                this.gutter.scrollLeft = this.code.scrollLeft;
            }});
            
            if(selected){
                this.code = code;  
                this.resetCursorPos(CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP);
                this.processLines();
                setTimeout( () => this._refresh_code_info(0, 0), 50 )
            }
        }

        loadTab() {
            const input = document.createElement('input');
            input.type = 'file';
            document.body.appendChild(input);
            input.click();
            input.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.loadFile( e.target.files[0] );
                }
                input.remove();
            });
        }

        processFocus( active ) {

            if( active )
                this.restartBlink();
            else {
                clearInterval( this.blinker );
                this.cursors.classList.remove('show');
            }
        }

        processMouse(e) {

            if( !e.target.classList.contains('code') ) return;
            if( !this.code ) return;

            const time = new Date();

            if( e.type == 'mousedown' )
            {
                this.lastMouseDown = time.getTime();
                this.state.selectingText = true;
                return;
            }
            
            else if( e.type == 'mouseup' )
            {
                if( (time.getTime() - this.lastMouseDown) < 200 ) {
                    this.state.selectingText = false;
                    this.processClick(e);
                    this.endSelection();
                }

                this.state.selectingText = false;
            }

            else if( e.type == 'mousemove' )
            {
                if( this.state.selectingText )
                {
                    this.processSelection(e);
                }
            }

            else if ( e.type == 'click' ) // trip
            {
                switch( e.detail )
                {
                    case 2:
                        // Double click
                        const [word, from, to] = this.getWordAtPos( cursor );

                        var cursor = this.cursors.children[0];
                        let selection = this.selections.children[0] || this.selection;

                        this.resetCursorPos( CodeEditor.CURSOR_LEFT );
                        this.cursorToString( cursor, this.code.lines[cursor.line].substr(0, from) );
                        this.startSelection( cursor, selection );
                        selection.style.width = this.measureString(word) + "px";
                        selection.range = [from, to];
                        break;
                    case 3:
                        // Triple click: select entire line
                        this.resetCursorPos( CodeEditor.CURSOR_LEFT );
                        e._shiftKey = true;
                        var cursor = this.cursors.children[0];
                        this.actions['End'].callback(cursor.line, cursor, e);
                        break;
                }
            }

            else if ( e.type == 'contextmenu' ) {
                e.preventDefault()
                LX.addContextMenu( "Format code", e, m => {
                    m.add( "JSON", () => { 
                        let json = this.toJSONFormat(this.getText());
                        this.code.lines = json.replaceAll("\n", "\n \n   ").split("\n   "); 
                        this.processLines();
                    } );
                   
                });
            }
        }

        processClick(e, skip_refresh = false) {

            var code_rect = this.code.getBoundingClientRect();
            var position = [e.clientX - code_rect.x, (e.clientY - code_rect.y) + this.getScrollTop()];
            var ln = (position[1] / this.lineHeight)|0;

            if(this.code.lines[ln] == undefined) return;
            
            var cursor = this.cursors.children[0];
            cursor.line = ln;

            this.cursorToLine(cursor, ln, true);
            
            var ch = (position[0] / this.charWidth)|0;
            var string = this.code.lines[ln].slice(0, ch);
            this.cursorToString(cursor, string);
            
            if(!skip_refresh) 
                this._refresh_code_info( ln + 1, cursor.position );
        }

        processSelection( e ) {

            var cursor = this.cursors.children[0];

            this.processClick(e, true);

            if( !this.selection )
                this.startSelection(cursor);

            // Update selection
            this.selection.toX = cursor.position;
            this.selection.toY = cursor.line;
            this.selection.chars = 0;

            const fromX = this.selection.fromX,
                  fromY = this.selection.fromY,
                  toX = this.selection.toX,
                  toY = this.selection.toY;
            const deltaY = toY - fromY;

            // Selection goes down...
            if( deltaY >= 0 )
            {
                while( deltaY < (this.selections.childElementCount - 1) )            
                    this.selections.lastChild.remove();

                for(let i = fromY; i <= toY; i++){

                    const sId = i - fromY;

                    // Make sure that the line selection is generated...
                    let domEl = this.selections.childNodes[sId];
                    if(!domEl)
                    {
                        domEl = document.createElement('div');
                        domEl.className = "lexcodeselection";
                        this.selections.appendChild( domEl );
                    }

                    // Compute new width and selection margins
                    let string;
                    
                    if(sId == 0) // First line 2 cases (single line, multiline)
                    {
                        string = (deltaY == 0) ? this.code.lines[i].substring(fromX, toX) : this.code.lines[i].substr(fromX);
                        domEl.style.left = "calc(" + (fromX * this.charWidth) + "px + 0.25em)";
                    }
                    else
                    {
                        string = (i == toY) ? this.code.lines[i].substring(0, toX) : this.code.lines[i]; // Last line, any multiple line...
                        domEl.style.left = "0.25em";
                    }
                    
                    const stringWidth = this.measureString(string);
                    domEl.style.width = (stringWidth || 8) + "px";
                    domEl.style.top = (4 + i * this.lineHeight - this.getScrollTop()) + "px";
                    this.selection.chars += stringWidth / this.charWidth;
                }
            }
            else // Selection goes up...
            {
                // TODO...
            }
        }

        async processKey(e) {

            if( !this.code ) 
                return;

            var key = e.key ?? e.detail.key;

            const skip_undo = e.detail.skip_undo ?? false;

            // keys with length > 1 are probably special keys
            if( key.length > 1 && this.specialKeys.indexOf(key) == -1 )
                return;

            let cursor = this.cursors.children[0];
            let lidx = cursor.line;
            this.code.lines[lidx] = this.code.lines[lidx] ?? "";

            // Check combinations
            let selection = this.selections.children[0];

            if( e.ctrlKey || e.metaKey )
            {
                switch( key.toLowerCase() ) {
                case 'c': // copy
                    let selected_text = "";
                    if( !selection.range ) {
                        selected_text = this.code.lines[cursor.line];
                    }
                    else {
                        for( var i = selection.range[0]; i < selection.range[1]; ++i )
                        selected_text += this.code.lines[cursor.line][i];
                    }
                    navigator.clipboard.writeText(selected_text);
                    return;
                case 'd': // duplicate line
                    e.preventDefault();
                    this.code.lines.splice(lidx, 0, this.code.lines[lidx]);
                    this.lineDown( cursor );
                    this.processLines(lidx);
                    return;
                case 's': // save
                    e.preventDefault();
                    this.onsave( this.getText() );
                    return;
                case 'v': // paste
                    let text = await navigator.clipboard.readText();
                    let params = text.split(":");
                    for(let i = 0; i < params.length; i++) {
                        let key = params[i].split(',');
                        if(key.length > 1) {
                            if(key[key.length-1].includes("]"))
                                continue;
                            key = key[key.length-1];
                        }
                        else
                            key = key[0];
                        key = key.replaceAll(/[{}\n\r]/g,"").replaceAll(" ","")
                        if(key[0] != '"' && key[key.length - 1] != '"') {
                            params[i] = params[i].replace(key, '"' + key + '"');
                        }
                    }
                    text = params.join(':');

                    // const text = await navigator.clipboard.readText();
                    const new_lines = text.split('\n');
                    console.assert(new_lines.length > 0);
                    const first_line = new_lines.shift();

                    const remaining = this.code.lines[lidx].slice(cursor.position);

                    // Add first line
                    this.code.lines[lidx] = [
                        this.code.lines[lidx].slice(0, cursor.position), 
                        first_line
                    ].join('');

                    this.cursorToString(cursor, first_line);

                    // Enter next lines...

                    let _text = null;
                    for( var i = 0; i < new_lines.length; ++i )
                    {
                        _text = new_lines[i];
                        this.cursorToBottom(cursor, true);
                        // Add remaining...
                        if( i == (new_lines.length - 1) )
                            _text += remaining;
                        this.code.lines.splice( 1 + lidx + i, 0, _text);
                    }

                    if(_text) this.cursorToString(cursor, _text);
                    this.processLines(lidx);

                    return;
                case 'z': // undo
                    if(!this.code.undoSteps.length)
                        return;
                    const step = this.code.undoSteps.pop();
                    this.code.lines = step.lines;
                    cursor.line = step.line;
                    this.restoreCursor( cursor, step.cursor );
                    this.processLines();
                    return;
                }
            }

            if( e.altKey )
            {
                switch( key ) {
                case 'ArrowUp':
                    if(this.code.lines[ lidx - 1 ] == undefined)
                        return;
                    swapElements(this.code.lines, lidx - 1, lidx);
                    this.lineUp();
                    this.processLine( lidx - 1 );
                    this.processLine( lidx );
                    return;
                case 'ArrowDown':
                    if(this.code.lines[ lidx + 1 ] == undefined)
                        return;
                    swapElements(this.code.lines, lidx, lidx + 1);
                    this.lineDown();
                    this.processLine( lidx );
                    this.processLine( lidx + 1 );
                    return;
                }
            }

            // Apply binded actions...

            for( const actKey in this.actions ) {
                if( key != actKey ) continue;
                e.preventDefault();

                // if(this.actions[ key ].deleteSelection && selection.range)
                //     this.actions['Delete'].callback(lidx, cursor, e);

                return this.actions[ key ].callback( lidx, cursor, e );
            }

            // From now on, don't allow ctrl, shift or meta (mac) combinations
            if( (e.ctrlKey || e.metaKey) )
                return;

            // Add undo steps

            const d = new Date();
            const current = d.getTime();

            if( !skip_undo )
            {
                if( !this._lastTime ) {
                    this._lastTime = current;
                    this._addUndoStep( cursor );
                } else {
                    if( (current - this._lastTime) > 3000 && this.code.lines.length){
                        this._lastTime = null;
                        this._addUndoStep( cursor );
                    }else{
                        // If time not enough, reset timer
                        this._lastTime = current;
                    }
                }
            }

            //  Some custom cases for word enclosing (), {}, "", '', ...

            const enclosableKeys = ["\"", "'", "(", "{"];
            if( enclosableKeys.indexOf( key ) > -1 )
            {
                this.encloseSelectedWordWithKey(key, lidx, cursor, selection);
                return;
            }

            // Until this point, if there was a selection, we need 
            // to delete the content..

            if( selection.range )
            {
                this.actions['Delete'].callback(lidx, cursor, e);
            }

            // Append key 

            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.position), 
                key, 
                this.code.lines[lidx].slice(cursor.position)
            ].join('');

            this.cursorToRight( key );

            // Other special char cases...

            if( key == '{' )
            {
                this.root.dispatchEvent(new KeyboardEvent('keydown', {'key': '}'}));
                this.cursorToLeft( key, cursor );
                return; // It will be processed with the above event
            }

            // Update only the current line, since it's only an appended key
            this.processLine( lidx );
        }

        action( key, deleteSelection, fn ) {

            this.actions[ key ] = {
                "callback": fn,
                "deleteSelection": deleteSelection
            };
        }

        processLines( from ) {

            if( !from )
            {
                this.gutter.innerHTML = "";
                this.code.innerHTML = "";
            }

            for( let i = from ?? 0; i < this.code.lines.length; ++i )
            {
                this.processLine( i );
            }

            // Clean up...
            if( from )
            {
                while( this.code.lines.length != this.gutter.children.length )            
                    this.gutter.lastChild.remove();
                while( this.code.lines.length != this.code.children.length )            
                    this.code.lastChild.remove();
            }

        }

        processLine( linenum ) {

            delete this._building_string; // multi-line strings not supported by now
            
            // It's allowed to process only 1 line to optimize
            let linestring = this.code.lines[ linenum ];
            var _lines = this.code.querySelectorAll('pre');
            var pre = null, single_update = false;
            if( _lines[linenum] ) {
                pre = _lines[linenum];
                single_update = true;
            }
            
            if(!pre)
            {
                var pre = document.createElement('pre');
                pre.dataset['linenum'] = linenum;
                this.code.appendChild(pre);
            }
            else
            {
                pre.children[0].remove(); // Remove token list
            }

            var linespan = document.createElement('span');
            pre.appendChild(linespan);

            // Check if line comment
            const is_comment = linestring.split('//');
            linestring = ( is_comment.length > 1 ) ? is_comment[0] : linestring;

            const tokens = linestring.split(' ').join('¬ ¬').split('¬'); // trick to split without losing spaces
            const to_process = []; // store in a temp array so we know prev and next tokens...

            for( let t of tokens )
            {
                let iter = t.matchAll(/[\[\](){}<>.,;:"']/g);
                let subtokens = iter.next();
                if( subtokens.value )
                {
                    let idx = 0;
                    while( subtokens.value != undefined )
                    {
                        const _pt = t.substring(idx, subtokens.value.index);
                        to_process.push( _pt );
                        to_process.push( subtokens.value[0] );
                        idx = subtokens.value.index + 1;
                        subtokens = iter.next();
                        if(!subtokens.value) {
                            const _at = t.substring(idx);
                            to_process.push( _at );
                        }
                    }
                }
                else
                    to_process.push( t );
            }

            if( is_comment.length > 1 )
                to_process.push( "//" + is_comment[1] );

            // Process all tokens
            for( var i = 0; i < to_process.length; ++i )
            {
                let it = i - 1;
                let prev = to_process[it];
                while( prev == '' || prev == ' ' ) {
                    it--;
                    prev = to_process[it];
                }

                it = i + 1;
                let next = to_process[it];
                while( next == '' || next == ' ' || next == '"') {
                    it++;
                    next = to_process[it];
                }
                
                let token = to_process[i];
                if( token.substr(0, 2) == '/*' )
                    this._building_block_comment = true;
                if( token.substr(token.length - 2) == '*/' )
                    delete this._building_block_comment;
                
                this.processToken(token, linespan, prev, next);
            }

            // add line gutter
            if(!single_update)
            {
                var linenumspan = document.createElement('span');
                linenumspan.innerHTML = (linenum + 1);
                this.gutter.appendChild(linenumspan);
            }
        }

        processToken(token, linespan, prev, next) {

            let sString = false;

            if(token == '"' || token == "'")
            {
                sString = (this._building_string == token); // stop string if i was building it
                this._building_string = this._building_string ? this._building_string : token;
            }

            if(token == ' ')
            {
                linespan.innerHTML += token;
            }
            else
            {
                var span = document.createElement('span');
                span.innerHTML = token;

                if( this._building_block_comment )
                    span.classList.add("cm-com");
                
                else if( this._building_string  )
                {
                    span.classList.add("cm-str");
                    // if (this.highlight === "JSON" && next == ':' )
                    //     span.classList.add("key");
                }
                
                else if( this.keywords.indexOf(token) > -1 )
                    span.classList.add("cm-kwd");

                else if( this.builtin.indexOf(token) > -1 )
                    span.classList.add("cm-bln");

                else if( this.literals[this.highlight] && this.literals[this.highlight].indexOf(token) > -1 )
                    span.classList.add("cm-lit");

                else if( this.symbols[this.highlight] && this.symbols[this.highlight].indexOf(token) > -1 )
                    span.classList.add("cm-sym");

                else if( token.substr(0, 2) == '//' )
                    span.classList.add("cm-com");

                else if( token.substr(0, 2) == '/*' )
                    span.classList.add("cm-com");

                else if( token.substr(token.length - 2) == '*/' )
                    span.classList.add("cm-com");

                else if( !Number.isNaN(+token) )
                    span.classList.add("cm-dec");

                else if (   (prev == 'class' && next == '{') || 
                            (prev == 'new' && next == '(') )
                     span.classList.add("cm-typ");
                
                else if ( next == '(' )
                    span.classList.add("cm-mtd");

                let highlight = this.highlight.replace(/\s/g, '');
                span.classList.add(highlight.toLowerCase());
                linespan.appendChild(span);
            }

            if(sString) delete this._building_string;
        }

        encloseSelectedWordWithKey( key, lidx, cursor, selection ) {

            if( !selection.range )
            return;
                                        
            const _lastLeft = cursor._left;

            // Insert first..
            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.position), 
                key, 
                this.code.lines[lidx].slice(cursor.position)
            ].join('');

            // Go to the end of the word
            this.cursorToString(cursor, 
                this.code.lines[lidx].slice(selection.range[0], selection.range[1] + 1));

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
            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.position), 
                key, 
                this.code.lines[lidx].slice(cursor.position)
            ].join('');

            // Recompute and reposition current selection
            this.selection.range[0]++; this.selection.range[1]++;
            const text_selected = this.code.lines[lidx].slice(
                this.selection.range[0],
                this.selection.range[1]
            );
            selection.style.width = this.measureString(text_selected) + "px";
            selection.style.left = "calc(" + (_lastLeft + this.charWidth) + "px + 0.25em)";

            this.processLine( lidx );
        }

        lineUp(cursor) {

            cursor = cursor ?? this.cursors.children[0];
            cursor.line--;
            cursor.line = Math.max(0, cursor.line);
            this.cursorToTop();
        }

        lineDown(cursor) {

            cursor = cursor ?? this.cursors.children[0];
            cursor.line++;
            this.cursorToBottom();
        }

        restartBlink() {

            if( !this.code ) return;

            clearInterval(this.blinker);
            this.cursors.classList.add('show');

            if (this.cursorBlinkRate > 0)
                this.blinker = setInterval(() => {
                    this.cursors.classList.toggle('show');
                }, this.cursorBlinkRate);
            else if (this.cursorBlinkRate < 0)
                this.cursors.classList.remove('show');
        }

        startSelection( cursor ) {

            // Show elements
            this.selections.classList.add('show');

            // Create new selection instance
            this.selection = new ISelection(cursor.position, cursor.line);
        }

        deleteSelection( cursor ) {

            const separator = "_NEWLINE_";
            let code = this.code.lines.join(separator);

            // Get linear start index
            let index = 0;
            for(let i = 0; i <= this.selection.fromY; i++)
                index += (i == this.selection.fromY ? this.selection.fromX : this.code.lines[i].length);

            index += this.selection.fromY * separator.length; 

            const num_chars = this.selection.chars + (this.selection.toY - this.selection.fromY) * separator.length;
            const pre = code.slice(0, index);
            const post = code.slice(index + num_chars);

            this.code.lines = (pre + post).split(separator);
            this.processLines(this.selection.fromY);
            this.cursorToLine(cursor, this.selection.fromY, true);
            this.cursorToString(cursor, this.code.lines[this.selection.fromY].slice(0, this.selection.fromX));
            this.endSelection();
        }

        endSelection() {

            this.selections.classList.remove('show');
            this.selections.innerHTML = "";
            delete this.selection;
        }

        cursorToRight( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            cursor._left += this.charWidth;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.position++;
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.position );
        }

        cursorToLeft( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            cursor._left -= this.charWidth;
            cursor._left = Math.max(cursor._left, 0);
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.position--;
            cursor.position = Math.max(cursor.position, 0);
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.position );
        }

        cursorToTop( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            cursor._top -= this.lineHeight;
            cursor._top = Math.max(cursor._top, 4);
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
            this.restartBlink();
            
            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

            this._refresh_code_info( cursor.line + 1, cursor.position );

            var first_line = (this.code.scrollTop / this.lineHeight)|0;
            if( cursor.line < first_line )
                this.code.scrollTop -= this.lineHeight;
        }

        cursorToBottom( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            cursor._top += this.lineHeight;
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
            this.restartBlink();

            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

            this._refresh_code_info( cursor.line + 1, cursor.position );

            var last_line = ((this.code.scrollTop  + this.code.offsetHeight) / this.lineHeight)|0;
            if( cursor.line >= last_line )
                this.code.scrollTop += this.lineHeight;
        }

        cursorToString( cursor, text, reverse ) {

            cursor = cursor ?? this.cursors.children[0];
            for( let char of text ) 
                reverse ? this.cursorToLeft(char) : this.cursorToRight(char);
        }

        cursorToLine( cursor, line, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            cursor._top = 4 + this.lineHeight * line;
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
            if(resetLeft) this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
        }

        saveCursor( cursor, state = {} ) {
            var cursor = cursor ?? this.cursors.children[0];
            state.top = cursor._top;
            state.left = cursor._left;
            state.line = cursor.line;
            state.charPos = cursor.position;
            return state;
        }

        restoreCursor( cursor, state ) {

            cursor = cursor ?? this.cursors.children[0];
            cursor.line = state.line ?? 0;
            cursor.position = state.charPos ?? 0;

            cursor._left = state.left ?? 0;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor._top = state.top ?? 4;
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
        }

        resetCursorPos( flag, cursor ) {
            
            cursor = cursor ?? this.cursors.children[0];

            if( flag & CodeEditor.CURSOR_LEFT )
            {
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor.position = 0;
            }

            if( flag & CodeEditor.CURSOR_TOP )
            {
                cursor._top = 4;
                cursor.style.top = "calc(4px - " + this.getScrollTop() + "px)";
                cursor.line = 0;
            }
        }

        addSpaceTabs(n) {
            
            for( var i = 0; i < n; ++i ) {
                this.actions['Tab'].callback();
            }
        }

        addSpaces(n) {
            
            for( var i = 0; i < n; ++i ) {
                this.root.dispatchEvent(new CustomEvent('keydown', {'detail': {
                    skip_undo: true,
                    key: ' '
                }}));
            }
        }

        getScrollTop() {

            if(!this.code) return 0;
            return this.code.scrollTop;
        }

        getCharAtPos( cursor, offset = 0) {
            
            cursor = cursor ?? this.cursors.children[0];
            return this.code.lines[cursor.line][cursor.position + offset];
        }

        getWordAtPos( cursor, offset = 0) {
            
            cursor = cursor ?? this.cursors.children[0];
            const col = cursor.line;
            const words = this.code.lines[col];

            const is_char = (char) => {
                const exceptions = ['_'];
                const code = char.charCodeAt(0);
                return (exceptions.indexOf(char) > - 1) || (code > 47 && code < 58) || (code > 64 && code < 91) || (code > 96 && code < 123);
            }

            let it = cursor.position + offset;

            while( words[it] && is_char(words[it]) )
                it--;

            const from = it + 1;
            it = cursor.position + offset;

            while( words[it] && is_char(words[it]) )
                it++;

            const to = it;

            return [words.substring( from, to ), from, to];
        }

        measureChar(char = "a", get_bb = false) {
            
            var test = document.createElement("pre");
            test.className = "codechar";
            test.innerHTML = char;
            document.body.appendChild(test);
            var rect = test.getBoundingClientRect();
            test.remove();
            const bb = [Math.floor(rect.width), Math.floor(rect.height)];
            return get_bb ? bb : bb[0];
        }

        measureString(str) {

            return str.length * this.charWidth;
        }

        runScript( code ) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = code;
            // script.src = url[i] + ( version ? "?version=" + version : "" );
            script.async = false;
            // script.onload = function(e) { };
            document.getElementsByTagName('head')[0].appendChild(script);
        }

        toJSONFormat(json) {

            try{
                let parseJSON = JSON.parse(json);
                let prettyJSON = JSON.stringify(parseJSON, undefined, 4);
                return prettyJSON;
              }
              catch(e){
                
                alert("Invalid JSON format")
                return;	
              }
        }
    }

    LX.CodeEditor = CodeEditor;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );