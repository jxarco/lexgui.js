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

    function lastLetter(str) {
        return str[str.length - 1];
    }

    /**
     * @class CodeEditor
     */

    class CodeEditor {

        static CURSOR_LEFT = 1;
        static CURSOR_TOP = 2;

        /**
         * @param {*} options
         */

        constructor( area, options = {} ) {

            this.area = new LX.Area( { className: "lexcodeeditor" } );

            this.tabs = this.area.addTabs();

            this.root = this.area.root;
            this.root.tabIndex = -1;
            area.attach( this.root );

            this.root.addEventListener( 'keydown', this.processKey.bind(this) );
            this.root.addEventListener( 'click', this.processClick.bind(this) );
            this.root.addEventListener( 'focus', this.processFocus.bind(this, true) );
            this.root.addEventListener( 'focusout', this.processFocus.bind(this, false) );

            this.tabs.root.addEventListener( 'dblclick', (e) => {
                e.preventDefault();
                this.addTab("unnamed.js");
            } );

            // Cursors

            this.cursors = document.createElement('div');
            this.cursors.className = 'cursors';
            this.tabs.area.attach(this.cursors);

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

            // Default code tab
            
            this.openedTabs = { };
            this.addTab("script1.js", true);

            // State

            this.state = {
                overwrite: false,
                focused: false,
                // pasteIncoming: false, 
                // cutIncoming: false,
                selectingText: false,
                draggingText: false
            }

            // Code

            this.actions = {};
            this.cursorBlinkRate = 550;
            this.tabSpaces = 4;
            this.maxUndoSteps = 16;
            this._lastTime = null;

            this.specialKeys = [
                'Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 
                'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
                'End', 'Tab'
            ];
            this.keywords = [
                'var', 'let', 'const', 'this', 'in', 'of', 
                'true', 'false', 'new', 'function', '(', ')',
                'static'
            ];
            this.builtin = [
                'console'
            ];
            this.literals = [
                'for', 'if', 'else', 'case', 'switch', 'return',
                'while', 'continue', 'break', 'do'
            ];

            // Action keys

            this.action('Delete', ( ln, cursor, e ) => {
                var letter = this.getCharAtPos( cursor );
                if(!letter) return;
                this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos );
                this.processLines();
            });

            this.action('Tab', ( ln, cursor, e ) => {
                this.addSpaces( this.tabSpaces );
            });

            this.action('Home', ( ln, cursor, e ) => {
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
            });

            this.action('End', ( ln, cursor, e ) => {
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToWord( this.code.lines[ln] );
            });

            this.action('Enter', ( ln, cursor, e ) => {
                cursor.line++;
                this.code.lines.splice(cursor.line, 0, "");
                this.code.lines[cursor.line] = this.code.lines[ln].substr( cursor.charPos );
                this.code.lines[ln] = this.code.lines[ln].substr( 0, cursor.charPos );
                this.cursorToBottom( null, true );
                this.processLines();
            });

            this.action('Backspace', ( ln, cursor, e ) => {
                var letter = this.getCharAtPos( cursor,  -1 );
                if(letter) {
                    this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos - 1 );
                    this.cursorToLeft( letter );
                } 
                else if(this.code.lines[ln - 1] != undefined) {
                    this.lineUp();
                    this.actions['End'](cursor.line, cursor);
                    // Move line on top
                    this.code.lines[ln - 1] += this.code.lines[ln];
                    this.code.lines.splice(ln, 1);
                }
                this.processLines();
            });

            this.action('ArrowUp', ( ln, cursor, e ) => {
                this.lineUp();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor);
            });

            this.action('ArrowDown', ( ln, cursor, e ) => {
                if( this.code.lines[ ln + 1 ] == undefined ) 
                    return;
                this.lineDown();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor);
            });

            this.action('ArrowLeft', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'Home' ]( ln, cursor );
                }else {
                    var letter = this.getCharAtPos( cursor, -1 );
                    if(letter) this.cursorToLeft( letter, cursor );
                    else if( cursor.line > 0 ) {
                        this.lineUp( cursor );
                        this.actions['End'](cursor.line, cursor);
                    }
                }
            });

            this.action('ArrowRight', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'End' ]( ln, cursor );
                }else{
                    var letter = this.getCharAtPos( cursor );
                    if(letter) this.cursorToRight( letter, cursor );
                    else if( this.code.lines[ cursor.line + 1 ] ) {
                        this.lineDown( cursor );
                        this.actions['Home'](cursor.line, cursor);
                    }
                }
            });

            // this.processLines();
        }

        addTab(name, selected) {
            
            let code = document.createElement('div');
            code.className = 'code';
            code.lines = [];
            code.cursorState = {};
            code.undoSteps = [];
            this.openedTabs[name] = code;
            this.tabs.add(name, code, selected, null, { onSelect: (e, tabname) => {
                this.saveCursor(null, this.code.cursorState);    
                this.code = this.openedTabs[tabname];
                this.restoreCursor(null, this.code.cursorState);    
            }});
            
            if(selected){
                this.code = code;  
            }
        }

        processFocus( active ) {

            if( active )
                this.restartBlink();
            else {
                clearInterval( this.blinker );
                this.cursors.classList.remove('show');
            }
        }

        processClick(e) {

            if( !this.code ) return;

            var code_rect = this.code.getBoundingClientRect();
            var position = [e.clientX - code_rect.x, e.clientY - code_rect.y];

            var line = -1;
            while( position[1] > (line + 1) * 22 ) 
                line++;
            
            if(this.code.lines[line] == undefined) return;
            
            var cursor = cursor ?? this.cursors.children[0];
            cursor.line = line;
            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!
            this.resetCursorPos( CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP );

            for( var i = 0; i < line; ++i ) {
                this.cursorToBottom(null, true);
            }

            var chars_width = 0;
            for( let char of this.code.lines[line] )
            {
                var [w, h] = this.measureChar(char);
                chars_width += w;

                if( position[0] < chars_width )
                    break;

                this.cursorToRight(char);
            }
            
            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
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
                switch( key ) {
                case 'z':
                    if(!this.code.undoSteps.length)
                        return;
                    const step = this.code.undoSteps.pop();
                    this.code.lines = step.lines;
                    cursor.line = step.line;
                    this.restoreCursor( cursor, step.cursor );
                    this.processLines();
                    return;
                case 'v':
                    const text = await navigator.clipboard.readText();
                    this.code.lines[lidx] = [
                        this.code.lines[lidx].slice(0, cursor.charPos), 
                        text, 
                        this.code.lines[lidx].slice(cursor.charPos)
                    ].join('');
                    this.cursorToWord( text );
                    this.processLines();
                    return;
                }
            }

            if( e.altKey )
            {
                switch( key ) {
                case 'ArrowUp':
                    if(!this.code.lines[ lidx - 1 ])
                        return;
                    swapElements(this.code.lines, lidx - 1, lidx);
                    this.lineUp();
                    this.processLines();
                    return;
                case 'ArrowDown':
                    if(!this.code.lines[ lidx + 1 ])
                        return;
                    swapElements(this.code.lines, lidx, lidx + 1);
                    this.lineDown();
                    this.processLines();
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

            this.cursorToRight( key );
            // if(key == '{') key += '}';
            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.charPos - 1), 
                key, 
                this.code.lines[lidx].slice(cursor.charPos - 1)
            ].join('');
            this.restartBlink();
            this.processLines();
        }

        action( key, fn ) {
            this.actions[ key ] = fn;
        }

        processLines() {

            this.code.innerHTML = "";

            for( let line of this.code.lines )
            {
                const tokens = line.split(' ').join('& &').split('&');
                var pre = document.createElement('pre');
                var linespan = document.createElement('span');
                pre.appendChild(linespan);
                this.code.appendChild(pre);
    
                for( let t of tokens )
                {
                    let iter = t.matchAll(/[(){}.;:]/g);
                    let subtokens = iter.next();
                    if( subtokens.value && !(+t) )
                    {
                        let idx = 0;
                        while( subtokens.value != undefined )
                        {
                            const _pt = t.substring(idx, subtokens.value.index);
                            this.processToken(_pt, linespan);
                            this.processToken(subtokens.value[0], linespan);
                            idx = subtokens.value.index + 1;
                            subtokens = iter.next();
                            if(!subtokens.value) {
                                const _at = t.substring(idx);
                                this.processToken(_at, linespan);
                            }
                        }
                    }
                    else
                    {
                        this.processToken(t, linespan);
                    }
                }
            }
        }

        processToken(token, line) {

            if(token == ' ')
            {
                line.innerHTML += token;
            }
            else
            {
                var span = document.createElement('span');
                span.innerHTML = token;

                if( this.keywords.indexOf(token) > -1 )
                    span.className += " cm-kwd";

                else if( this.builtin.indexOf(token) > -1 )
                    span.className += " cm-bln";

                else if( this.literals.indexOf(token) > -1 )
                    span.className += " cm-lit";

                else if( isString(token) )
                    span.className += " cm-str";

                else if( !!(+token) )
                    span.className += " cm-dec";

                line.appendChild(span);
            }
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

        cursorToRight( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left += w;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos++;
            this.restartBlink();
        }

        cursorToLeft( key, cursor ) {

            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left -= w;
            cursor._left = Math.max(cursor._left, 0);
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos--;
            cursor.charPos = Math.max(cursor.charPos, 0);
            this.restartBlink();
        }

        cursorToTop( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 22;
            cursor._top -= h;
            cursor._top = Math.max(cursor._top, 4);
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();
            
            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
        }

        cursorToBottom( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 22;
            cursor._top += h;
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();

            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
        }

        cursorToWord( text ) {
            for( let char of text ) 
                this.cursorToRight(char);
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
            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!

            cursor._left = state.left ?? 0;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor._top = state.top ?? 4;
            cursor.style.top = "calc(" + cursor._top + "px)";
            flushCss(cursor);

            cursor.style.transition = transition; // restore transition

            cursor.line = state.line;
            cursor.charPos = state.charPos;
        }

        resetCursorPos( flag, cursor ) {
            cursor = cursor ?? this.cursors.children[0];
            this.restartBlink();

            if( flag & CodeEditor.CURSOR_LEFT )
            {
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor.charPos = 0;
            }

            if( flag & CodeEditor.CURSOR_TOP )
            {
                cursor._top = 4;
                cursor.style.top = "4px";
            }
        }

        addSpaces(n) {
            for( var i = 0; i < n; ++i ) {
                this.root.dispatchEvent(new KeyboardEvent('keydown', {'key': ' '}));
            }
        }

        getCharAtPos( cursor, offset = 0) {
            cursor = cursor ?? this.cursors.children[0];
            return this.code.lines[cursor.line][cursor.charPos + offset];
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
    }

    LX.CodeEditor = CodeEditor;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );