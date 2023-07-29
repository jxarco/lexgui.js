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

            // this.area.setSize( ["calc(100% - 60px)", "calc(100% - 60px)"] );
            this.root = this.area.root;
            this.root.tabIndex = -1;
            area.attach( this.root );

            this.root.addEventListener( 'keydown', this.processKey.bind(this) );
            this.root.addEventListener( 'click', this.processClick.bind(this) );
            this.root.addEventListener( 'focus', this.restartBlink.bind(this) );

            this.root.addEventListener( 'focusout', () => {
                clearInterval( this.blinker );
                this.cursors.classList.remove('show');
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
                this.cursors.appendChild(cursor);
            }

            // Default code tab
            
            this.openedTabs = { };
            this.addTab("script1.js", true);
            this.addTab("script2.js");

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
            this._current_line = 0;
            this._lastTime = 0;

            this.specialKeys = [
                'Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 
                'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
                'End', 'Tab'
            ];
            this.keywords = [
                'var', 'let', 'const', 'this', 'in', 'of', 
                'true', 'false', 'new', 'function'
            ];
            this.builtin = [
                'console'
            ];
            this.literals = [
                'for', 'if', 'else', 'case', 'switch', 'return'
            ];
            // Action keys

            // this.action();

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
                this.saveCursor(this.code.cursorState);    
                this.code = this.openedTabs[tabname];
                this.restoreCursor(this.code.cursorState);    
            }});
            
            if(selected)
                this.code = code;  
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

        processKey(e) {

            if( !this.code ) return;

            var key = e.key;
            // console.log(key);

            const d = new Date();
            const current = d.getTime();
            if( (current - this._lastTime) > 3000 && this.code.lines.length){
                this._lastTime = current;
                this.code.undoSteps.push( LX.deepCopy(this.code.lines) );
            }

            if( key == 'z' && e.ctrlKey )
            {
                this.code.lines = this.code.undoSteps.pop();
                this.processLines();
                return;
            }

            // keys with length > 1 are probably special keys
            if( key.length > 1 && this.specialKeys.indexOf(key) == -1 )
                return;

            let cursor = this.cursors.children[0];
            let lidx = this._current_line;
            this.code.lines[lidx] = this.code.lines[lidx] ?? "";
            
            if( key == 'Tab' ) {
                e.preventDefault();
                this.addSpaces( this.tabSpaces );
                return;
            }
            else if( key == 'Backspace' )
            {
                var letter;
                [ this.code.lines[lidx], letter ] = popChar(this.code.lines[lidx]);
                if(letter) this.cursorToLeft( letter );
                else {
                    this._current_line--;
                    this._current_line = Math.max(0, this._current_line);
                    this.cursorToTop( null, true );

                    for( let char of this.code.lines[this._current_line] )
                        this.cursorToRight(char);
                }
            }
            else if( key == 'Delete' )
            {
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter) return;

                this.code.lines[lidx] = sliceChar( this.code.lines[lidx], cursor.charPos );
                
            }
            else if( key == 'ArrowUp' )
            {
                this._current_line--;
                this._current_line = Math.max(0, this._current_line);
                this.cursorToTop( null );

                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter)
                {
                    // Reset cursor first..
                    this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

                    for( let char of this.code.lines[this._current_line] )
                    {
                        this.cursorToRight(char);
                    }
                }

                return;
            }
            else if( key == 'ArrowDown' )
            {
                if( this.code.lines[ this._current_line + 1 ] == undefined )
                return;
                this._current_line++;
                this.cursorToBottom( null );

                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter)
                {
                    // Reset cursor first..
                    this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

                    for( let char of this.code.lines[this._current_line] )
                    {
                        this.cursorToRight(char);
                    }
                }

                return;
            }
            else if( key == 'ArrowLeft' )
            {
                this.cursorToLeft( lastLetter(this.code.lines[lidx]) );
                return;
            }
            else if( key == 'ArrowRight' )
            {
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter) return;
                this.cursorToRight( lastLetter(this.code.lines[lidx]) );
                return;
            }
            else if( key == 'Enter' )
            {
                this._current_line++;
                this.code.lines.splice(this._current_line, 0, "");
                this.code.lines[this._current_line] = this.code.lines[lidx].substr( cursor.charPos );
                this.code.lines[lidx] = this.code.lines[lidx].substr( 0, cursor.charPos );
                this.cursorToBottom( null, true );
            }
            else if( key == 'Home' )
            {
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                return;
            }
            else if( key == 'End' )
            {
                // Reset cursor first..
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

                for( let char of this.code.lines[lidx] )
                {
                    this.cursorToRight(char);
                }
                return;
            }

            // Append key
            else 
            {
                this.code.lines[lidx] = [this.code.lines[lidx].slice(0, cursor.charPos), key, this.code.lines[lidx].slice(cursor.charPos)].join('');
                this.cursorToRight( key );
                this.restartBlink();
            }

            this.processLines();
        }

        action( key, fn ) {

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
                    let iter = t.matchAll(/[(){}.;:]+/g);
                    let subtokens = iter.next();

                    if( subtokens.value && !(+t) )
                    {
                        let idx = 0;
                        while( subtokens.value != undefined )
                        {
                            const _t = t.substring(idx, subtokens.value.index);
                            this.processToken(_t, linespan);
                            this.processToken(subtokens.value[0], linespan);
                            idx = subtokens.value.index + 1;
                            subtokens = iter.next();
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

        saveCursor( state ) {
            var cursor = cursor ?? this.cursors.children[0];
            state.top = cursor._top;
            state.left = cursor._left;
        }

        restoreCursor( state ) {
            var cursor = cursor ?? this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!

            cursor._left = state.left ?? 0;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor._top = state.top ?? 4;
            cursor.style.top = "calc(" + cursor._top + "px)";
            flushCss(cursor);

            cursor.style.transition = transition; // restore transition
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

        getCharAtPos( pos ) {
            let idx = this._current_line;
            return this.code.lines[idx][pos];
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