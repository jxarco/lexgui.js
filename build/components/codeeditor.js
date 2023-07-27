(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    LX.components.push( 'CodeEditor' );

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

        /**
         * @param {*} options
         */

        constructor( area, options = {} ) {

            let div = document.createElement('div');
            div.className = 'lexcodeeditor';
            div.tabIndex = -1;
            div.style.height = "calc(100% - 60px)";
            this.root = div;

            area.attach( this.root );
            area.root.style.overflow = 'scroll';

            div.addEventListener( 'keydown', this.processKey.bind(this) );
            div.addEventListener( 'focus', this.restartBlink.bind(this) );

            div.addEventListener( 'focusout', () => {
                clearInterval( this.blinker );
                this.cursors.classList.remove('show');
            } );

            this.area = new LX.Area( { height: "100%" } );
            div.appendChild(this.area.root);

            this.cursors = document.createElement('div');
            this.cursors.className = 'cursors';
            this.area.attach(this.cursors);

            // Add main cursor
            {
                var cursor = document.createElement('div');
                cursor.className = "cursor";
                cursor.innerHTML = "&nbsp;";
                cursor.style.top = cursor.style.left = "0px";
                cursor._left = cursor._top = 0;
                cursor.charPos = 0;
                this.cursors.appendChild(cursor);
            }

            let code = document.createElement('div');
            this.code = code;
            code.className = 'code';
            
            this.area.attach(code);

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
            this.lines = [];
            this._current_line = 0;

            this.specialKeys = [
                'Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 
                'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
                'End'
            ];
            this.keywords = [
                'var', 'let', 'const', 'this', 'in', 'of', 
                'true', 'false', 'new'
            ];
            this.builtin = [
                'console'
            ];
            this.literals = [
                'for', 'if', 'else', 'case', 'switch'
            ];

            // Action keys

            // this.action();
        }

        processKey(e) {

            console.log(e.key);

            // keys with length > 1 are probably special keys
            if( e.key.length > 1 && this.specialKeys.indexOf(e.key) == -1 )
                return;

            let cursor = this.cursors.children[0];
            let lidx = this._current_line;
            this.lines[lidx] = this.lines[lidx] ?? "";
            
            if( e.key == 'Backspace' )
            {
                var letter;
                [ this.lines[lidx], letter ] = popChar(this.lines[lidx]);

                if(letter) this.cursorToLeft( letter );
                else {
                    this._current_line--;
                    this._current_line = Math.max(0, this._current_line);
                    this.restartBlink();
                    this.cursorToTop( null );
                }
            }
            else if( e.key == 'Delete' )
            {
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter) return;

                this.lines[lidx] = sliceChar( this.lines[lidx], cursor.charPos );
                
            }
            else if( e.key == 'ArrowUp' )
            {
                this._current_line--;
                this._current_line = Math.max(0, this._current_line);
                this.cursorToTop( null );
                return;
            }
            else if( e.key == 'ArrowDown' )
            {
                if( this.lines[ this._current_line + 1 ] == undefined )
                return;
                this._current_line++;
                this.cursorToBottom( null );
                return;
            }
            else if( e.key == 'ArrowLeft' )
            {
                this.cursorToLeft( lastLetter(this.lines[lidx]) );
                return;
            }
            else if( e.key == 'ArrowRight' )
            {
                var letter = this.getCharAtPos( cursor.charPos );
                if(!letter) return;
                this.cursorToRight( lastLetter(this.lines[lidx]) );
                return;
            }
            else if( e.key == 'Enter' )
            {
                this._current_line++;
                this.lines.splice(this._current_line, 0, "");
                this.lines[this._current_line] = this.lines[lidx].substr( cursor.charPos );
                this.lines[lidx] = this.lines[lidx].substr( 0, cursor.charPos );
                this.cursorToBottom( null, true );
                this.processLines();
                return;
            }
            else if( e.key == 'Home' )
            {
                this.resetCursorPos( cursor );
                return;
            }
            else if( e.key == 'End' )
            {
                // Reset cursor first..
                this.resetCursorPos( cursor );

                for( let char of this.lines[lidx] )
                {
                    this.cursorToRight(char);
                }
                return;
            }

            // Apend key
            else 
            {
                console.log(cursor.charPos);
                this.lines[lidx] = [this.lines[lidx].slice(0, cursor.charPos), e.key, this.lines[lidx].slice(cursor.charPos)].join('');
                // this.lines[lidx] += e.key;
                this.cursorToRight( e.key );
                this.restartBlink();
            }

            this.processLines();
        }

        action( key, fn ) {

        }

        processLines() {

            this.code.innerHTML = "";

            for( let line of this.lines )
            {
                const tokens = line.split(' ').join('& &').split('&');
                var pre = document.createElement('pre');
                var linespan = document.createElement('span');
                pre.appendChild(linespan);
                this.code.appendChild(pre);
    
                for( let t of tokens )
                {
                    if(!t.length)
                    continue;
                    
                    if(t == ' ')
                    {
                        linespan.innerHTML += t;
                    }
                    else
                    {
                        // special characters
                        let _t = t;
                        let match = t.indexOf(';');
                        if(match > -1)
                        {
                           t = t.substr(0, match);
                        }
    
                        var span = document.createElement('span');
                        span.innerHTML = t;
    
                        if( this.keywords.indexOf(t) > -1 )
                            span.className += " cm-kwd";
    
                        else if( this.builtin.indexOf(t) > -1 )
                            span.className += " cm-bln";

                        else if( this.literals.indexOf(t) > -1 )
                            span.className += " cm-lit";
    
                        else if( isString(t) )
                            span.className += " cm-str";
    
                        else if( !!(+t) )
                            span.className += " cm-dec";
    
                        linespan.appendChild(span);
    
                        if(match > -1)
                        {
                            linespan.innerHTML += _t.substr(match);
                        }
                    }
                }
            }
        }

        restartBlink() {

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
            this.restartBlink();
        }

        cursorToTop( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 20.5;
            cursor._top -= h;
            cursor._top = Math.max(cursor._top, 0);
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();
            
            if(resetLeft)
                this.resetCursorPos( cursor );
        }

        cursorToBottom( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 20.5;
            cursor._top += h;
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();

            if(resetLeft)
                this.resetCursorPos( cursor );
        }

        resetCursorPos( cursor ) {
            cursor = cursor ?? this.cursors.children[0];
            cursor._left = 0;
            cursor.style.left = "0px";
            cursor.charPos = 0;
            this.restartBlink();
        }

        getCharAtPos( pos ) {
            let idx = this._current_line;
            return this.lines[idx][pos];
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