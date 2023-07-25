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

    function popLetter(str) {
        return str.substr(0, str.length - 1);
    }

    /**
     * @class CodeEditor
     */

    class CodeEditor {

        /**
         * @param {*} options
         */

        constructor( options = {} ) {

            let div = document.createElement('div');
            div.className = 'lexcodeeditor';
            this.root = div;

            // hardcode styles
            div.style.padding = "30px";
            div.style.outline = "none";
            div.tabIndex = -1;

            div.addEventListener( 'keydown', this.processKey.bind(this) );

            this.area = new LX.Area();
            div.appendChild(this.area.root);

            let cursors = document.createElement('div');
            cursors.className = 'cursors';
            this.area.attach(cursors);

            let code = document.createElement('div');
            this.code = code;
            code.className = 'code';
            this.area.attach(code);

            // Code

            this.lines = [];
            this._current_line = 0;

            this.bannedKeys = [
                'Shift', 'Alt'
            ];

            this.keywords = [
                'var', 'let', 'const'
            ];
        }

        processKey(e) {

            // e.preventDefault();

            if( this.bannedKeys.indexOf(e.key) > -1 )
                return;

                let lidx = this._current_line;
                this.lines[lidx] = this.lines[lidx] ?? "";
                
                if( e.key == 'Backspace' )
                {
                    this.lines[lidx] = popLetter(this.lines[lidx]);
                }
                else
                    this.lines[lidx] += e.key;

            console.log(this.lines[lidx]);

            this.processLine( this._current_line );
        }

        processLine( line_idx ) {

            this.code.innerHTML = "";

            const tokens = this.lines[line_idx].split(' ').join('& &').split('&');
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
                        span.className += " cm-keyword";

                    if( isString(t) )
                        span.className += " cm-string";

                    linespan.appendChild(span);

                    if(match > -1)
                    {
                        linespan.innerHTML += _t.substr(match);
                    }
                }
            }
        }
    }

    LX.CodeEditor = CodeEditor;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );