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

    function allLetter(str) {
        return /^[A-Za-z\s]*$/.test(str);
    }

    function swapElements (array, id0, id1) {
        [array[id0], array[id1]] = [array[id1], array[id0]];
    };

    function isString(str) {
        return (str[0] == '"' &&  str[ str.length - 1 ] == '"') 
                || (str[0] == "'" &&  str[ str.length - 1 ] == "'");
    }

    function popChar(str) {
        return [str.substr(0, str.length - 1), str.substr(str.length - 1)];
    }

    function sliceChar(str, idx) {
        return str.substr(0, idx) + str.substr(idx + 1);
    }

    function firstNonspaceIndex(str) {
        return str.search(/\S|$/);
    }

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

            this.base_area = area;
            this.area = new LX.Area( { className: "lexcodeeditor" } );

            this.tabs = this.area.addTabs( { onclose: (name) => delete this.openedTabs[name] } );
            this.tabs.root.addEventListener( 'dblclick', (e) => {
                e.preventDefault();
                this.addTab("unnamed.js", true);
            } );

            area.root.style.display = "flex"; // add gutter and code
            area.root.style.position = "relative";
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
                cursor.charPos = 0;
                cursor.line = 0;
                this.cursors.appendChild(cursor);
            }

            // Test selection
            {
                this.selection = document.createElement('div');
                this.selection.className = "lexcodeselection";
                this.selections.appendChild( this.selection );
            }

            // State

            this.state = {
                overwrite: false,
                focused: false,
                selectingText: false,
                // draggingText: false
            }

            // Code

            this.highlight = 'JavaScript';
            this.onsave = options.onsave ?? ((code) => {  });
            this.onrun = options.onrun ?? ((code) => { this.runScript(code) });
            this.actions = {};
            this.cursorBlinkRate = 550;
            this.tabSpaces = 4;
            this.maxUndoSteps = 16;
            this.lineHeight = 22;
            this._lastTime = null;

            this.languages = [
                'JavaScript', 'GLSL'
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
            this.literals = [
                'for', 'if', 'else', 'case', 'switch', 'return',
                'while', 'continue', 'break', 'do'
            ];
            this.symbols = [
                '<', '>', '{', '}', '(', ')', ';', '=', '|', '||', '&', '&&', '?', '??'
            ];

            // Action keys

            this.action('Backspace', ( ln, cursor, e ) => {
                let selection = this.selections.children[0];
                if(selection.range) {
                    this.deleteSelection(cursor, selection);
                    if(!this.code.lines[ln].length) this.actions['Backspace'](ln, cursor, e);
                    this.processLines();
                }
                else {
                    var letter = this.getCharAtPos( cursor,  -1 );
                    if(letter) {
                        this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos - 1 );
                        this.cursorToLeft( letter );
                        this.processLine(ln);
                    } 
                    else if(this.code.lines[ln - 1] != undefined) {
                        this.lineUp();
                        this.actions['End'](cursor.line, cursor, e);
                        // Move line on top
                        this.code.lines[ln - 1] += this.code.lines[ln];
                        this.code.lines.splice(ln, 1);
                        this.processLines(ln);
                    }
                }
            });

            this.action('Delete', ( ln, cursor, e ) => {
                let selection = this.selections.children[0];
                if(selection.range)
                {
                    this.deleteSelection(cursor, selection);
                    if(!this.code.lines[ln].length) this.actions['Delete'](ln, cursor);
                    this.processLines();
                }
                else
                {
                    var letter = this.getCharAtPos( cursor );
                    if(letter) {
                        this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos );
                        this.processLine(ln);
                    } 
                    else if(this.code.lines[ln + 1] != undefined) {
                        this.code.lines[ln] += this.code.lines[ln + 1];
                        this.code.lines.splice(ln + 1, 1);
                        this.processLines(ln);
                    }
                }
            });

            this.action('Tab', ( ln, cursor, e ) => {
                this.addSpaces( this.tabSpaces );
            });

            this.action('Home', ( ln, cursor, e ) => {
                // Find first non space char
                var idx = firstNonspaceIndex(this.code.lines[ln]);
                var prestring = this.code.lines[ln].substring(0, idx);
                let selection = this.selections.children[0];
                if( e.shiftKey ) {
                    this.startSelection(cursor, selection);
                    var string = this.code.lines[ln].substring(idx, cursor.charPos);
                    selection.style.width = this.measureString(string)[0] + "px";
                    selection.style.left = "calc(" + (this.measureString(prestring)[0]) + "px + 0.25em)";
                    selection.range = [ idx, cursor.charPos ];
                }
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToString(cursor, prestring);
            });

            this.action('End', ( ln, cursor, e ) => {
                let selection = this.selections.children[0];
                if( e.shiftKey || e._shiftKey ) {
                    this.startSelection(cursor, selection);
                    var string = this.code.lines[ln].substring(cursor.charPos);
                    selection.style.width = this.measureString(string)[0] + "px";
                    selection.range = [ cursor.charPos, this.code.lines[ln].length ];
                }
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToString( cursor, this.code.lines[ln] );
            });

            this.action('Enter', ( ln, cursor, e ) => {

                if(e.ctrlKey)
                {
                    this.onrun( this.code.lines.join("\n") );
                    return;
                }

                var _c0 = this.getCharAtPos( cursor, -1 );
                var _c1 = this.getCharAtPos( cursor );

                cursor.line++;
                this.code.lines.splice(cursor.line, 0, "");
                this.code.lines[cursor.line] = this.code.lines[ln].substr( cursor.charPos ); // new line (below)
                this.code.lines[ln] = this.code.lines[ln].substr( 0, cursor.charPos ); // line above
                this.cursorToBottom( null, true );

                // Check indentation
                var spaces = firstNonspaceIndex(this.code.lines[ln]);
                var tabs = Math.floor( spaces / this.tabSpaces );
                var transition = cursor.style.transition;
                cursor.style.transition = "none";

                if( _c0 == '{' && _c1 == '}' ) {
                    this.code.lines.splice(cursor.line, 0, "");
                    this.addSpaceTabs(tabs + 1);
                    this.code.lines[cursor.line + 1] = " ".repeat(spaces) + this.code.lines[cursor.line + 1];
                } else {
                    this.addSpaceTabs(tabs);
                }

                flushCss(cursor);
                cursor.style.transition = transition; // restore transition
                
                this.processLines( ln );
                this.code.scrollTop = this.code.scrollHeight;
            });

            this.action('ArrowUp', ( ln, cursor, e ) => {
                this.lineUp();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor, e);
            });

            this.action('ArrowDown', ( ln, cursor, e ) => {
                if( this.code.lines[ ln + 1 ] == undefined ) 
                    return;
                this.lineDown();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor, e);
            });

            this.action('ArrowLeft', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'Home' ]( ln, cursor );
                } else if(e.ctrlKey) {
                    // get next word
                    const [word, from, to] = this.getWordAtPos( cursor, -1 );
                    var diff = Math.max(cursor.charPos - from, 1);
                    var substr = word.substr(0, diff);
                    this.cursorToString(cursor, substr, true);
                } else {
                    var letter = this.getCharAtPos( cursor, -1 );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            const charWidth = this.measureChar(letter)[0];
                            if( (cursor.charPos - 1) < this.initial_charPos ) {
                                selection.range[0]--;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left - charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) + charWidth;
                            }
                            else if( (cursor.charPos - 1) == this.initial_charPos ) {
                                selection.range[1]--;
                                new_width = 0;
                            }
                            else {
                                selection.range[1]--;
                                new_width = +parseInt(selection.style.width) - this.measureChar(letter)[0];
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
                        this.actions['End'](cursor.line, cursor, e);
                    }
                }
            });

            this.action('ArrowRight', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'End' ]( ln, cursor );
                } else if(e.ctrlKey) {
                    // get next word
                    const [word, from, to] = this.getWordAtPos( cursor );
                    var diff = cursor.charPos - from;
                    var substr = word.substr(diff);
                    this.cursorToString(cursor, substr);
                } else {
                    var letter = this.getCharAtPos( cursor );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            const charWidth = this.measureChar(letter)[0];
                            if( cursor.charPos < this.initial_charPos ) {
                                selection.range[0]++;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left + charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) - charWidth;
                            }
                            else {
                                selection.range[1]++;
                                new_width = +parseInt(selection.style.width) + charWidth;
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
                        this.actions['Home'](cursor.line, cursor, e);
                    }
                }
            });

            // Default code tab
        
            this.openedTabs = { };
            this.addTab("+", false, "New File");
            this.addTab("script1.js", true);

            this.loadFile( "../data/script.js" );

            // Create inspector panel
            let panel = this._create_panel_info();
            area.attach( panel );
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

        _create_panel_info() {
            
            let panel = new LX.Panel({ className: "lexcodetabinfo", width: "calc(100%)", height: "auto" });
            panel.ln = 0;
            panel.col = 0;

            const on_change_language = ( lang ) => {
                this.highlight = lang;
                this._refresh_code_info();
            }

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
                            m.add( lang, on_change_language );
                    });
                }, { width: "25%", nameWidth: "15%" });
                panel.endLine();
            };

            this._refresh_code_info();

            return panel;
        }

        _onNewTab( e ) {

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
                this.processLines();
                this._refresh_code_info(cursor.line + 1, cursor.charPos);

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
                if( (time.getTime() - this.lastMouseDown) < 600 ) {
                    this.state.selectingText = false;
                    this.processClick(e);
                    this.endSelection();
                }
                this.selection_started = false;
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
                    // double click
                    const [word, from, to] = this.getWordAtPos( cursor );

                    var cursor = this.cursors.children[0];
                    let selection = this.selections.children[0];

                    this.resetCursorPos( CodeEditor.CURSOR_LEFT );
                    this.cursorToString( cursor, this.code.lines[cursor.line].substr(0, from) );
                    this.startSelection( cursor, selection );
                    selection.style.width = this.measureString(word)[0] + "px";
                    selection.range = [from, to];
                    break;
                case 3:
                    // triple click: select entire line
                    this.resetCursorPos( CodeEditor.CURSOR_LEFT );
                    e._shiftKey = true;
                    var cursor = this.cursors.children[0];
                    this.actions['End'](cursor.line, cursor, e);
                    break;
                }
            }
        }

        processClick(e, skip_refresh) {

            var code_rect = this.code.getBoundingClientRect();
            var position = [e.clientX - code_rect.x, (e.clientY - code_rect.y) + this.getScrollTop()];
            var ln = (position[1] / this.lineHeight)|0;

            if(this.code.lines[ln] == undefined) return;
            
            var cursor = this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!
            this.resetCursorPos( CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP );

            for( var i = 0; i < ln; ++i ) {
                this.cursorToBottom(null, true, skip_refresh);
            }

            var chars_width = 0;
            for( let char of this.code.lines[ln] )
            {
                var [w, h] = this.measureChar(char);
                chars_width += w;

                if( position[0] < chars_width )
                    break;

                this.cursorToRight(char);
            }
            
            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
            cursor.line = ln;

            this._refresh_code_info( ln + 1, cursor.charPos );
        }

        processSelection( e, selection ) {

            selection = selection ?? this.selections.children[0];
            var cursor = cursor ?? this.cursors.children[0];

            this.processClick(e, true);

            if( !this.selection_started )
                this.startSelection(cursor, selection);

            var [sw, sh] = this.measureString( this.code.lines[cursor.line].substring(this.initial_charPos, cursor.charPos) );
            selection.style.width = sw + "px";
            selection.range = [this.initial_charPos, cursor.charPos];

            if(cursor.charPos < this.initial_charPos) {
                selection.style.left = cursor.style.left;
                selection.range = [cursor.charPos, this.initial_charPos];
            }
        }

        async processKey(e) {

            if( !this.code ) 
                return;

            var key = e.key;

            // keys with length > 1 are probably special keys
            if( key.length > 1 && this.specialKeys.indexOf(key) == -1 )
                return;

            let cursor = this.cursors.children[0];
            let lidx = cursor.line;
            this.code.lines[lidx] = this.code.lines[lidx] ?? "";

            // Check combinations

            if( e.ctrlKey || e.metaKey )
            {
                switch( key.toLowerCase() ) {
                case 'c': // copy
                    let selected_text = "";
                    let selection = this.selections.children[0];
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
                    this.onsave( this.code.lines.join("\n") );
                    return;
                case 'v': // paste
                    const text = await navigator.clipboard.readText();
                    this.code.lines[lidx] = [
                        this.code.lines[lidx].slice(0, cursor.charPos), 
                        text, 
                        this.code.lines[lidx].slice(cursor.charPos)
                    ].join('');
                    this.cursorToString( cursor, text );
                    this.processLine( lidx );
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

            for( const actKey in this.actions ) {
                if( key != actKey ) continue;
                e.preventDefault();
                return this.actions[ key ]( lidx, cursor, e );
            }

            // from now on, don't allow ctrl, shift or meta (mac) combinations
            if( (e.ctrlKey || e.metaKey) )
                return;

            // Add undo steps

            const d = new Date();
            const current = d.getTime();

            if( !this._lastTime ) {
                this._lastTime = current;
                this.code.undoSteps.push( {
                    lines: LX.deepCopy(this.code.lines),
                    cursor: this.saveCursor(cursor),
                    line: cursor.line
                } );
            } else {
                if( (current - this._lastTime) > 3000 && this.code.lines.length){
                    this._lastTime = null;
                    this.code.undoSteps.push( {
                        lines: LX.deepCopy(this.code.lines),
                        cursor: this.saveCursor(cursor),
                        line: cursor.line
                    } );
                }else{
                    // If time not enough, reset timer
                    this._lastTime = current;
                }
            }

            // Append key 

            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.charPos), 
                key, 
                this.code.lines[lidx].slice(cursor.charPos)
            ].join('');

            this.cursorToRight( key );

            // Special single char cases

            if( key == '{' )
            {
                this.root.dispatchEvent(new KeyboardEvent('keydown', {'key': '}'}));
                this.cursorToLeft( key, cursor );
                return; // it will be processed with the above event
            }

            // Update only the current line, since it's only an appended key
            this.processLine( lidx );
        }

        action( key, fn ) {
            this.actions[ key ] = fn;
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

            // ... if starts comment block
            const starts_block_comment = linestring.split('/*');
            linestring = ( starts_block_comment.length > 1 ) ? starts_block_comment[0] : linestring;

            // ... if ends comment block
            // const ends_block_comment = linestring.split('*/');
            // linestring = ( ends_block_comment.length > 1 ) ? ends_block_comment[1] : linestring;

            const tokens = linestring.split(' ').join('¬ ¬').split('¬'); // trick to split without losing spaces
            const to_process = []; // store in a temp array so we know prev and next tokens...

            // append block line
            // if( ends_block_comment.length > 1 )
            //     to_process.push( ends_block_comment[0] + "*/" );

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

            else if( starts_block_comment.length > 1 )
            {
                let line_comm = starts_block_comment[1];

                // ... if ends comment block
                const ends_block_comment = line_comm.split('*/');
                if( ends_block_comment.length > 1 ) {
                    line_comm = ends_block_comment[0];
                }

                to_process.push( "/*" + line_comm );
                to_process.push( "*/" );
                to_process.push( ends_block_comment[1] );
            }
            
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
                while( next == '' || next == ' ' ) {
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
                    span.className += " cm-com";
                
                else if( this._building_string  )
                    span.className += " cm-str";
                
                else if( this.keywords.indexOf(token) > -1 )
                    span.className += " cm-kwd";

                else if( this.builtin.indexOf(token) > -1 )
                    span.className += " cm-bln";

                else if( this.literals.indexOf(token) > -1 )
                    span.className += " cm-lit";

                else if( this.symbols.indexOf(token) > -1 )
                    span.className += " cm-sym";

                else if( token.substr(0, 2) == '//' )
                    span.className += " cm-com";

                else if( token.substr(0, 2) == '/*' )
                    span.className += " cm-com";

                else if( token.substr(token.length - 2) == '*/' )
                    span.className += " cm-com";

                else if( !Number.isNaN(+token) )
                    span.className += " cm-dec";

                else if (   (prev == 'class' && next == '{') || 
                            (prev == 'new' && next == '(') )
                    span.className += " cm-typ";

                linespan.appendChild(span);
            }

            if(sString) delete this._building_string;
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

        startSelection( cursor, selection ) {

            this.selections.classList.add('show');
            selection.style.left = cursor.style.left;
            selection.style.top = cursor.style.top;
            selection.range = [cursor.charPos, cursor.charPos];
            selection.style.width = "0px";
            this.initial_charPos = cursor.charPos;
            this.selection_started = true;
        }

        deleteSelection( cursor, selection ) {

            let ln = cursor.line;
            this.code.lines[ln] = [
                this.code.lines[ln].slice(0, selection.range[0]), 
                this.code.lines[ln].slice(selection.range[1])
            ].join('');
            this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
            this.cursorToString(cursor, this.code.lines[ln].slice(0, selection.range[0]));
            this.endSelection();
        }

        endSelection( selection ) {

            this.selections.classList.remove('show');
            selection = selection ?? this.selections.children[0];
            selection.range = null;
            this.state.selectingText = false;
        }

        cursorToRight( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left += w;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos++;
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToLeft( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left -= w;
            cursor._left = Math.max(cursor._left, 0);
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos--;
            cursor.charPos = Math.max(cursor.charPos, 0);
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToTop( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            cursor._top -= this.lineHeight;
            cursor._top = Math.max(cursor._top, 4);
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
            this.restartBlink();
            
            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

            this._refresh_code_info( cursor.line + 1, cursor.charPos );

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

            this._refresh_code_info( cursor.line + 1, cursor.charPos );

            var last_line = ((this.code.scrollTop  + this.code.offsetHeight) / this.lineHeight)|0;
            if( cursor.line >= last_line )
                this.code.scrollTop += this.lineHeight;
        }

        cursorToString( cursor, text, reverse ) {
            cursor = cursor ?? this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none";

            for( let char of text ) 
                reverse ? this.cursorToLeft(char) : this.cursorToRight(char);

            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
        }

        saveCursor( cursor, state = {} ) {
            var cursor = cursor ?? this.cursors.children[0];
            state.top = cursor._top;
            state.left = cursor._left;
            state.line = cursor.line;
            state.charPos = cursor.charPos;
            return state;
        }

        restoreCursor( cursor, state ) {
            cursor = cursor ?? this.cursors.children[0];
            cursor.line = state.line ?? 0;
            cursor.charPos = state.charPos ?? 0;

            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!
            cursor._left = state.left ?? 0;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor._top = state.top ?? 4;
            cursor.style.top = "calc(" + cursor._top + "px - " + this.getScrollTop() + "px)";
            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
        }

        resetCursorPos( flag, cursor ) {
            
            cursor = cursor ?? this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none";

            if( flag & CodeEditor.CURSOR_LEFT )
            {
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor.charPos = 0;
            }

            if( flag & CodeEditor.CURSOR_TOP )
            {
                cursor._top = 4;
                cursor.style.top = "calc(4px - " + this.getScrollTop() + "px)";
                cursor.line = 0;
            }

            flushCss(cursor);
            cursor.style.transition = transition;
        }

        addSpaceTabs(n) {
            
            for( var i = 0; i < n; ++i ) {
                this.actions['Tab']();
            }
        }

        addSpaces(n) {
            
            for( var i = 0; i < n; ++i ) {
                this.root.dispatchEvent(new KeyboardEvent('keydown', {'key': ' '}));
            }
        }

        getScrollTop() {

            if(!this.code) return 0;
            return this.code.scrollTop;
        }

        getCharAtPos( cursor, offset = 0) {
            
            cursor = cursor ?? this.cursors.children[0];
            return this.code.lines[cursor.line][cursor.charPos + offset];
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

            let it = cursor.charPos + offset;

            while( words[it] && is_char(words[it]) )
                it--;

            const from = it + 1;
            it = cursor.charPos + offset;

            while( words[it] && is_char(words[it]) )
                it++;

            const to = it;

            return [words.substring( from, to ), from, to];
        }

        measureChar(char) {
            
            var test = document.createElement("pre");
            test.className = "codechar";
            test.innerHTML = char;
            document.body.appendChild(test);
            var rect = test.getBoundingClientRect();
            test.remove();
            return [Math.floor(rect.width), Math.floor(rect.height)];
        }

        measureString(str) {
            
            var w = 0, h = 0;
            for( var i = 0; i < str.length; ++i ) {
                const [cw, ch] = this.measureChar(str[i]);
                w += cw;
                h += ch;
            }
            return [w, h];
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
    }

    LX.CodeEditor = CodeEditor;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );