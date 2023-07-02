// Lexgui.js @jxarco

(function(global){

    /**
     * Main namespace
     * @namespace LX
    */

    var LX = global.LX = {
        version: 1.1,
        ready: false
    };

    function clamp (num, min, max) { return Math.min(Math.max(num, min), max) }

    function deepCopy(o) { return JSON.parse(JSON.stringify(o)) }

    function hexToRgb(string) {
        const red = parseInt(string.substring(1, 3), 16) / 255;
        const green = parseInt(string.substring(3, 5), 16) / 255;
        const blue = parseInt(string.substring(5, 7), 16) / 255;
        return [red, green, blue];
    }

    function rgbToHex(rgb) {
        let hex = "#";
        for(let c of rgb) {
            c = Math.floor(c * 255);
            hex += c.toString(16);
        }
        return hex;
    }

    function simple_guidGenerator() {
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+"-"+S4());
    }

    function set_as_draggable(domEl) {

        let offsetX;
        let offsetY;

        domEl.setAttribute('draggable', true);
        domEl.addEventListener("dragstart", function(e) {
            const rect = e.target.getBoundingClientRect();
            offsetX = e.clientX - rect.x;
            offsetY = e.clientY - rect.y;
            // Remove image when dragging
            var img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
            e.dataTransfer.setDragImage(img, 0, 0);
            e.dataTransfer.effectAllowed = "move";
        });
        domEl.addEventListener("drag", function(e) {
            e.preventDefault();
            this.style.left = e.clientX - offsetX + 'px';
            this.style.top = e.clientY - offsetY + 'px';
        }, false );
        domEl.addEventListener("dragend", function(e) {
            e.preventDefault();
            this.style.left = e.clientX - offsetX + 'px';
            this.style.top = e.clientY - offsetY + 'px';
        }, false );
    }

    /**
     * @method init
     * @param {*} options 
     * container: Root location for the gui (default is the document body)
     */

    function init(options = {})
    {
        if(this.ready)
            return;

        // LexGUI root 
		var root = document.createElement("div");
		root.id = "lexroot";
        
        var modal = document.createElement("div");
        modal.id = "modal";

        this.modal = modal;
        this.root = root;
        this.container = document.body;

        this.modal.toggleAttribute('hidden', true);
        this.modal.toggle = function(force) { this.toggleAttribute('hidden', force); };

        if(options.container)
            this.container = document.getElementById(options.container);
        
        this.container.appendChild( modal );
        this.container.appendChild( root );

        // Disable drag icon
        root.addEventListener("dragover", function(e) {
            e.preventDefault();
        }, false );

        // Global vars
        this.DEFAULT_NAME_WIDTH     = "30%";
        this.DEFAULT_SPLITBAR_SIZE  = 6;
        this.OPEN_CONTEXTMENU_ENTRY = 'click';

        this.ready = true;

        // Create main area
        return new Area( {id: options.id ?? "mainarea"} );
    }

    LX.init = init;

    class IEvent {

        constructor(name, value, domEvent) {
            this.name = name;
            this.value = value;
            this.domEvent = domEvent;
        }
    };

    class TreeEvent {

        static NONE                 = 0;
        static NODE_SELECTED        = 1;
        static NODE_DBLCLICKED      = 2;
        static NODE_CONTEXTMENU     = 3;
        static NODE_DRAGGED         = 4;
        static NODE_RENAMED         = 5;
        static NODE_VISIBILITY      = 6;

        constructor( type, node, value ) {
            this.type = type || TreeEvent.NONE;
            this.node = node;
            this.value = value;
        }
        
        string() {
            switch(this.type) {
                case TreeEvent.NONE: return "tree_event_none";
                case TreeEvent.NODE_SELECTED: return "tree_event_selected";
                case TreeEvent.NODE_DBLCLICKED:  return "tree_event_dblclick";
                case TreeEvent.NODE_CONTEXTMENU:  return "tree_event_contextmenu";
                case TreeEvent.NODE_DRAGGED: return "tree_event_dragged";
                case TreeEvent.NODE_RENAMED: return "tree_event_renamed";
                case TreeEvent.NODE_VISIBILITY: return "tree_event_visibility";
            }
        }
    };

    LX.TreeEvent = TreeEvent;

    /**
     * @method message
     * @param {String} text 
     * @param {String} title (Optional)
     * @param {*} options 
     * id: Id of the message dialog
     * position: Dialog position in screen [screen centered]
     * draggable: Dialog can be dragged [false]
     */

    function message(text, title, options = {})
    {
        if(!text)
            throw("No message to show");

        this.modal.toggle(false);
        var root = document.createElement('div');
        root.className = "lexdialog";
        if(options.id)
            root.id = options.id;
        this.root.appendChild(root);

        var titleDiv = document.createElement('div');
        if(title) {
            titleDiv.className = "lexdialogtitle";
            titleDiv.innerHTML = title;
            root.appendChild(titleDiv);
        }

        var closeButton = document.createElement('div');
        closeButton.className = "lexdialogcloser";
        closeButton.innerHTML = "<a class='fa-solid fa-xmark'></a>";
        closeButton.title = "Close dialog";

        closeButton.addEventListener('click', (function(e) {
            root.remove();
            this.modal.toggle();
        }).bind(this));

        root.appendChild(closeButton);

        var content = document.createElement('div');
        content.className = "lexdialogcontent" + (title ? "" : " notitle");
        content.innerHTML = text;
        root.appendChild(content);

        // Process position and size
        options.size = options.size ?? [];
        options.position = options.position ?? [];

        root.style.width = options.size[0] ? (options.size[0] + "px") : "auto";
        root.style.height = options.size[1] ? (options.size[1] + "px") : "auto";
        
        let rect = root.getBoundingClientRect();
        root.style.left = options.position[0] ? (options.position[0] + "px") : "calc( 50% - " + (rect.width * 0.5) + "px )";
        root.style.top = options.position[1] ? (options.position[1] + "px") : "calc( 50vh - " + (rect.height * 0.5) + "px )";

        content.style.height = title ? "calc( 100% - " + (titleDiv.offsetHeight + 30) + "px )" : "calc( 100% - 51px )";

        // Process if draggble
        if(options.draggable ?? true)
            set_as_draggable(root);
    }

    LX.message = message;
	
    function addContextMenu( title, event, callback )
    {
        var menu = new ContextMenu( event, title );
        LX.root.appendChild(menu.root);

        if(callback)
            callback( menu );

        menu.onCreate();
    }

    LX.addContextMenu = addContextMenu;

    class Area {

        /**
         * @constructor Area
         * @param {*} options 
         * id: Id of the element
         * className: Add class to the element
         * width: Width of the area element [fit space]
         * height: Height of the area element [fit space]
         * no_append: Create but not append to GUI root [false]
         */

        constructor( options = {} ) {
        
            var root = document.createElement('div');
            root.className = "lexarea";
            if(options.id)
                root.id = options.id;
            if(options.className)
                root.className += " " + options.className;
    
            var width = options.width || "calc( 100% )";
            var height = options.height || "100vh";
    
            if(width.constructor == Number)
                width += "px";
            if(height.constructor == Number)
                height += "px";
    
            root.style.width = width;
            root.style.height = height;
    
            this.root = root;
            this.size = [ this.root.offsetWidth, this.root.offsetHeight ];
            this.sections = {};
    
            if(!options.no_append) {
                var lexroot = document.getElementById("lexroot");
                lexroot.appendChild( this.root );
            }
        }

        /**
         * @method attach
         * @param {Element} content child to append to area (e.g. a Panel)
         */

        attach( content ) {

            // Append to last split section if area has been split
            if(this.sections.length) {
                this.sections[1].attach( content );
                return;
            }

            if(!content)
            throw("no content to attach");

            content.parent = this;

            let element = content.root ? content.root : content;
            
            // E.g. menubar has predefined height
            if(element.style.height == "100%")
            {
                let size = 0;
                for( var el of this.root.children ) {
                    size += el.offsetHeight;
                }
                element.style.height = "calc( 100% - " + size + "px )";
            }

            this.root.appendChild( element );
        }

        /**
         * @method split
         * @param {*} options 
         * type: Split mode (horizontal, vertical) ["horizontal"]
         * sizes: Size of each new area (Array) ["50%", "50%"]
         */
        
        split( options = {} ) {

            if(this.sections.length)
            {
                // In case Area has been split before, get 2nd section as root
                this.root = this.sections[1].root;
            }

            var type = options.type || "horizontal";
            var sizes = options.sizes || ["50%", "50%"];
            var auto = false;

            if( !sizes[1] )
            {
                if(sizes[0].constructor == Number)
                    sizes[0] += "px";
                
                sizes[1] = "calc( 100% - " + sizes[0] + " )";
                auto = true;
            }

            // Create areas
            var area1 = new Area({className: "split"});
            var area2 = new Area({className: "split"});

            var resize = options.resize ?? true;
            var data = "0px";
            
            if(resize)
            {
                this.resize = resize;
                this.split_bar = document.createElement("div");
                this.split_bar.className = "lexsplitbar " + type;

                if(type == "horizontal") {
                    this.split_bar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.split_bar.style.left = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                }
                else {
                    this.split_bar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.split_bar.style.top = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                }
                this.split_bar.addEventListener("mousedown", inner_mousedown);
                data = LX.DEFAULT_SPLITBAR_SIZE/2 + "px"; // updates
            }

            if(type == "horizontal")
            {
                var width1 = sizes[0],
                    width2 = sizes[1];

                if(width1.constructor == Number)
                    width1 += "px";
                if(width2.constructor == Number)
                    width2 += "px";

                area1.root.style.width = "calc( " + width1 + " - " + data + " )";
                area1.root.style.height = "100%";
                area2.root.style.width = "calc( " + width2 + " - " + data + " )";
                area2.root.style.height = "100%";
                this.root.style.display = "flex";
            }

            else
            {
                var height1 = sizes[0],
                    height2 = sizes[1];

                if(height1.constructor == Number)
                    height1 += "px";
                if(height2.constructor == Number)
                    height2 += "px";

                area1.root.style.width = "100%";
                area1.root.style.height = "calc( " + height1 + " - " + data + " )";
                area2.root.style.width = "100%";
                
                // Check for menubar to add more offset
                if(!auto && this.root.parentElement.parentElement.children.length) {
                    const item = this.root.parentElement.parentElement.children[0];
                    const menubar = item.querySelector('.lexmenubar');
                    if(menubar)
                        data = parseInt(data) + menubar.offsetHeight + "px";
                }

                area2.root.style.height = "calc( " + height2 + " - " + data + " )";
            }

            this.root.appendChild( area1.root );
            if(resize) this.root.appendChild(this.split_bar);
            this.root.appendChild( area2.root );
            this.sections = [area1, area2];
            this.type = type;

            // Update sizes
            this.#update();

            if(!resize)
            return;

            // from litegui.js @jagenjo

            var that = this;
            var last_pos = [0,0];
            function inner_mousedown(e)
            {
                var doc = that.root.ownerDocument;
                doc.addEventListener("mousemove",inner_mousemove);
                doc.addEventListener("mouseup",inner_mouseup);
                last_pos[0] = e.x;
                last_pos[1] = e.y;
                e.stopPropagation();
                e.preventDefault();
                document.body.classList.add("nocursor");
                that.split_bar.classList.add("nocursor");
            }

            function inner_mousemove(e)
            {
                if(that.type == "horizontal") {
                    that.#moveSplit(last_pos[0] - e.x);
                        
                }
                else {
                    that.#moveSplit(last_pos[1] - e.y);
                }
                
                last_pos[0] = e.x;
                last_pos[1] = e.y;
                e.stopPropagation();
                e.preventDefault();
                            
            }

            function inner_mouseup(e)
            {
                var doc = that.root.ownerDocument;
                doc.removeEventListener("mousemove",inner_mousemove);
                doc.removeEventListener("mouseup",inner_mouseup);
                document.body.classList.remove("nocursor");
                that.split_bar.classList.remove("nocursor");
            }
        }

        /**
         * @method propagateEvent
         */

        propagateEvent( type ) {

            for(var i = 0; i < this.sections.length; i++)
            {
                const area = this.sections[i];
                if(area[ type ])
                    area[ type ].call(this, area.root.getBoundingClientRect());
                area.propagateEvent( type );
            }
        }

        /**
         * @method addPanel
         * @param {*} options
         * Options to create a Panel
         */

        addPanel( options ) {
            let panel = new Panel( options );
            this.attach( panel );
            return panel;
        }

        /**
         * @method addMenubar
         * @param {*} options:
         * float: Justify content (left, center, right) [left]
         */

        addMenubar( callback, options = {} ) {
            
            var menubar = new Menubar(options);

            if(callback) callback( menubar );

            // Hack to get content height
            var d = document.createElement('div');
            d.appendChild(menubar.root);
            document.body.appendChild(d);
            const height = menubar.root.clientHeight;
            d.remove();

            this.split({type: 'vertical', sizes:[height,null], resize: false});
            this.sections[0].attach( menubar );
        }

        #moveSplit( dt ) {

            if(!this.type)
                throw("No split area");

            if(!dt) // splitbar didn't move!
                return;

            var a1 = this.sections[0];
            var a2 = this.sections[1];
            var splitinfo = " - "+ LX.DEFAULT_SPLITBAR_SIZE +"px";
            const min_size = 10;

            if(this.type == "horizontal") {

                var size = (a2.root.offsetWidth + dt);
				if(size < min_size)
					size = min_size;
				a1.root.style.width = "-moz-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.width = "-webkit-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.width = "calc( 100% - " + size + "px " + splitinfo + " )";
				a2.root.style.width = size + "px"; //other split
            }
            else {
                var size = (a2.root.offsetHeight + dt);
				if(size < min_size)
					size = min_size;
				a1.root.style.height = "-moz-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.height = "-webkit-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.height = "calc( 100% - " + size + "px " + splitinfo + " )";
				a2.root.style.height = size + "px"; //other split
            }
                
            this.#update();

            // Resize events   
            this.propagateEvent( 'onresize' );
        }

        #update()
        {
            const rect = this.root.getBoundingClientRect();

            this.size = [ rect.width, rect.height ];

            for(var i = 0; i < this.sections.length; i++) {
                this.sections[i].#update();
            }
        }
    };

    LX.Area = Area;

    /**
     * @class Menubar
     */

    class Menubar {

        constructor( options = {} )  {

            this.root = document.createElement('div');
            this.root.className = "lexmenubar";
            if(options.float)
                this.root.style.justifyContent = options.float;
            this.items = [];
            
            this.icons = {};
            this.shorts = {};
            this.buttons = [];
        }

        /**
         * @method add
         * @param {*} options:
         * callback: Function to call on each item
         */

        add( path, options = {} ) {

            if(options.constructor == Function)
                options = { callback: options };

            // process path
            const tokens = path.split("/");

            // assign icons and shortcuts to last token in path
            const lastPath = tokens[tokens.length - 1];
            this.icons[ lastPath ] = options.icon;
            this.shorts[ lastPath ] = options.short;

            let idx = 0;
            let that = this;

            const insert = (token, list) => {
                if(token == undefined) return;

                let found = null;
                list.forEach( o => {
                    const keys = Object.keys(o);
                    const key = keys.find( t => t == token );
                    if(key) found = o[ key ];
                } );

                if(found) {
                    insert( tokens[idx++], found );    
                }
                else {
                    let item = {};
                    item[ token ] = [];
                    const next_token = tokens[idx++];
                    // Check if last token -> add callback
                    if(!next_token) {
                        item[ 'callback' ] = options.callback;
                    }
                    list.push( item );
                    insert( next_token, item[ token ] ); 
                }
            };

            insert( tokens[idx++], this.items );

            // Create elements

            for( let item of this.items )
            {
                let key = Object.keys(item)[0];

                // Item already created
                if( this.root.querySelector("#" + key.replace(/\s/g, '')) )
                    continue;   

                let entry = document.createElement('div');
                entry.className = "lexmenuentry";
                entry.id = key.replace(/\s/g, '');
                entry.innerText = key;
                this.root.appendChild( entry );

                const create_submenu = function( o, k, c, d ) {

                    let contextmenu = document.createElement('div');
                    contextmenu.className = "lexcontextmenu";
                    contextmenu.tabIndex = "0";
                    const isSubMenu = c.classList.contains('lexcontextmenuentry');
                    var rect = c.getBoundingClientRect();
                    contextmenu.style.left = (isSubMenu ? rect.width : rect.left) + "px";
                    // Entries use css to set top relative to parent
                    contextmenu.style.top = (isSubMenu ? 0 : -1 + rect.bottom) + "px";
                    c.appendChild( contextmenu );

                    contextmenu.focus();

                    rect = contextmenu.getBoundingClientRect();

                    for( var i = 0; i < o[k].length; ++i )
                    {
                        const subitem = o[k][i];
                        const subkey = Object.keys(subitem)[0];
                        const hasSubmenu = subitem[ subkey ].length;
                        let subentry = document.createElement('div');
                        subentry.className = "lexcontextmenuentry";
                        subentry.className += (i == o[k].length - 1 ? " last" : "");
                        if(subkey == '')
                            subentry.className = " lexseparator";
                        else {
                            subentry.id = subkey;
                            subentry.innerHTML = "";
                            const icon = that.icons[ subkey ];
                            if(icon) {
                                subentry.innerHTML += "<a class='" + icon + " fa-sm'></a>";
                            }
                            subentry.innerHTML += "<div class='lexentryname'>" + subkey + "</div>";
                        }
                        contextmenu.appendChild( subentry );

                        // Nothing more for separators
                        if(subkey == '') continue;

                        contextmenu.addEventListener('keydown', function(e) {
                            e.preventDefault();
                            let short = that.shorts[ subkey ];
                            if(!short) return;
                            // check if it's a letter or other key
                            short = short.length == 1 ? short.toLowerCase() : short;
                            if(short == e.key) {
                                subentry.click()
                            }
                        });

                        // Add callback
                        subentry.addEventListener("click", e => {
                            const f = subitem[ 'callback' ];
                            if(f) {
                                f.call( this, subkey, subentry );
                                that.root.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());  
                            } 
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        });

                        // Add icon if has submenu, else check for shortcut
                        if( !hasSubmenu)
                        {
                            if(that.shorts[ subkey ]) {
                                let shortEl = document.createElement('div');
                                shortEl.className = "lexentryshort";
                                shortEl.innerText = that.shorts[ subkey ];
                                subentry.appendChild( shortEl );
                            }
                            continue;
                        }

                        let submenuIcon = document.createElement('a');
                        submenuIcon.className = "fa-solid fa-angle-right fa-xs";
                        subentry.appendChild( submenuIcon );

                        subentry.addEventListener("mouseover", e => {
                            if(subentry.built)
                            return;
                            subentry.built = true;
                            create_submenu( subitem, subkey, subentry, ++d );
                            e.stopPropagation();
                        });

                        subentry.addEventListener("mouseleave", () => {
                            d = -1; // Reset depth
                            delete subentry.built;
                            contextmenu.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());
                        });
                    }

                    // Set final width
                    contextmenu.style.width = contextmenu.offsetWidth + "px";
                };

                entry.addEventListener("click", () => {

                    const f = item[ 'callback' ];
                    if(f) {
                        f.call( this, key, entry );
                        return;
                    } 

                    this.root.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());
                    create_submenu( item, key, entry, -1 );
                });

                entry.addEventListener("mouseleave", () => {
                    this.root.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());
                });
            }
        }

        /**
         * @method getButton
         * @param {String} title
         */

        getButton( title ) {
            return this.buttons[ title ];
        }

        /**
         * @method setButtonIcon
         * @param {String} title
         * @param {String} icon
         */

        setButtonIcon( title, icon ) {
            const button = this.buttons[ title ];
            if(!button) return;

            button.querySelector('a').className = "fa-solid" + " " + icon + " lexicon";
        }

        /**
         * @method addButton
         * @param {Array} buttons
         * @param {*} options
         * float: center (Default), right
         */

        addButtons( buttons, options = {} ) {

            if(!buttons)
                throw("No buttons to add!");

            if(!this.buttonContainer)
            {
                this.buttonContainer = document.createElement('div');
                this.buttonContainer.className = "lexmenubuttons";
                this.buttonContainer.classList.add(options.float ?? 'center');
                this.root.appendChild( this.buttonContainer );    
            }

            for( let i = 0; i < buttons.length; ++i )
            {
                let data = buttons[i];
                let button = document.createElement('div');
                const title = data.title;
                const disabled = data.disabled ?? false;
                button.className = "lexmenubutton" + (disabled ? " disabled" : "");
                button.title = title ?? "";
                button.innerHTML = "<a class='" + data.icon + " lexicon'></a>";
                this.buttonContainer.appendChild( button );
    
                const _b = button.querySelector('a');
                _b.addEventListener("click", (e) => {
                    if(data.callback && !disabled)
                        data.callback.call( this, _b, e );
                });

                if(title)
                    this.buttons[ title ] = button;
            }
        }
    };

    LX.Menubar = Menubar;

    /**
     * @class Widget
     */

    class Widget {
        
        static NONE         = 0;
        static TEXT         = 1;
        static BUTTON       = 2;
        static DROPDOWN     = 3;
        static CHECKBOX     = 4;
        static COLOR        = 5;
        static NUMBER       = 6;
        static TITLE        = 7;
        static VECTOR       = 8;
        static TREE         = 9;
        static PROGRESS     = 10;
        static FILE         = 11;
        static LAYERS       = 12;
        static ARRAY        = 13;
        static LIST         = 14;
        static SEPARATOR    = 15;

        #no_context_types = [
            Widget.BUTTON,
            Widget.LIST,
            Widget.FILE,
            Widget.PROGRESS
        ];

        constructor(name, type, options) {
            this.name = name;
            this.type = type;
            this.options = options;
        }

        value() {

            switch(this.type) {
                case Widget.TEXT: 
                case Widget.COLOR:
                    return this.domEl.querySelector("input").value;
                case Widget.NUMBER:
                    return +this.domEl.querySelector("input").value;
                case Widget.DROPDOWN: 
                    return this.domEl.querySelector("li.selected").getAttribute('value');
                case Widget.CHECKBOX: 
                    return this.domEl.querySelector(".checkbox").value;
                case Widget.PROGRESS:
                    return this.domEl.querySelector("meter").value;
                case Widget.VECTOR:
                    let inputs = this.domEl.querySelectorAll("input");
                    let value = [];
                    for( var v of inputs )
                        value.push( +v.value );
                    return value;
                case Widget.LAYERS:
                    return this.domEl.value;
                case Widget.ARRAY:
                    let array_inputs = this.domEl.querySelectorAll("input");
                    let values = [];
                    for( var v of array_inputs )
                        values.push( v.value );
                    return values;
            }

            console.warn("Can't get value of " + this.typeName());
        }

        setValue( value ) {

            if(this.onSetValue)
                this.onSetValue(value);
        }

        oncontextmenu(e) {

            if( this.#no_context_types.includes(this.type) )
                return;

            addContextMenu(this.typeName(), e, c => {
                c.add("Copy", () => { this.copy() });
                c.add("Paste", { disabled: !this.canPaste(), callback: () => { this.paste() } } );
            });
        }

        copy() {
            navigator.clipboard.type = this.type;
            navigator.clipboard.data = this.value();
            navigator.clipboard.writeText( navigator.clipboard.data );
        }

        canPaste() {
            return navigator.clipboard.type === this.type;
        }

        paste() {
            if( !this.canPaste() )
            return;

            this.setValue(navigator.clipboard.data);
        }

        typeName() {

            switch(this.type) {
                case Widget.TEXT: return "Text";
                case Widget.BUTTON: return "Button";
                case Widget.DROPDOWN: return "Dropdown";
                case Widget.CHECKBOX: return "Checkbox";
                case Widget.COLOR: return "Color";
                case Widget.NUMBER: return "Number";
                case Widget.VECTOR: return "Vector";
                case Widget.TREE: return "Tree";
                case Widget.PROGRESS: return "Progress";
                case Widget.FILE: return "File";
                case Widget.LAYERS: return "Layers";
                case Widget.ARRAY: return "Array";
            }
        }

        refresh() {
            // this.domEl.innerHTML = "";
            // if( this.options.callback ) this.options.callback();
        }
    }

    LX.Widget = Widget;
    
    /**
     * @class NodeTree
     */

    class NodeTree {
            
        constructor(domEl, data, options) {
            this.domEl = domEl;
            this.data = data;
            this.onevent = options.onevent;
            this.options = options;
            this.#create_item(null, data);
        }

        #create_item( parent, node, level = 0 ) {

            const that = this;
            const node_filter_input = this.domEl.querySelector("#lexnodetree_filter");

            if(node_filter_input && !node.id.includes(node_filter_input.value))
            {
                for( var i = 0; i < node.children.length; ++i )
                    this.#create_item( node, node.children[i], level + 1 );
                return;
            }

            const list = this.domEl.querySelector("ul");

            node.visible = node.visible ?? true;
            node.parent = parent;
            const is_parent = node.children.length > 0;

            let item = document.createElement('li');
            item.className = "lextreeitem " + "datalevel" + level + " " + (is_parent ? "parent" : "");
            item.id = node.id;

            // Select hierarchy icon
            let icon = "fa-solid fa-square"; // Default: no childs
            if( is_parent ) icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
            item.innerHTML = "<a class='" + icon + " hierarchy'></a>";
            
            // Add display icon
            icon = node.icon; // Default: no childs
            if( icon ) item.innerHTML += "<a class='" + icon + "'></a>";

            item.innerHTML += (node.rename ? "" : node.id);

            item.setAttribute('draggable', true);
            item.style.paddingLeft = ((is_parent ? 0 : 3 ) + (3 + (level+1) * 25)) + "px";
            list.appendChild(item);

            // Callbacks
            item.addEventListener("click", function(e) {
                list.querySelectorAll("li").forEach( e => { e.classList.remove('selected'); } );
                this.classList.add('selected');
                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_SELECTED, node);
                    that.onevent( event );
                }
            });

            if( this.options.rename ?? true )
                item.addEventListener("dblclick", function() {
                    // Trigger rename
                    node.rename = true;
                    that.refresh();
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_DBLCLICKED, node);
                        that.onevent( event );
                    }
                });

            item.addEventListener("contextmenu", function(e) {
                e.preventDefault();
                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_CONTEXTMENU, node, e);
                    that.onevent( event );
                }
            });

            // Node rename

            let name_input = document.createElement('input');
            name_input.toggleAttribute('hidden', !node.rename);
            name_input.value = node.id;
            item.appendChild(name_input);            

            if(node.rename) {
                item.classList.add('selected');
                name_input.focus();
            }

            name_input.addEventListener("keyup", function(e){
                if(e.key == 'Enter') {

                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_RENAMED, node, this.value);
                        that.onevent( event );
                    }

                    node.id = this.value;
                    delete node.rename;
                    that.refresh();
                    list.querySelector("#" + this.value).classList.add('selected');
                }
                if(e.key == 'Escape') {
                    delete node.rename;
                    that.refresh();
                }
            });

            name_input.addEventListener("blur", function(e){
                delete node.rename;
                that.refresh();
            });


            if(this.options.draggable ?? true) {
                // Drag nodes
                if(parent) // Root doesn't move!
                {
                    item.addEventListener("dragstart", e => {
                        window.__tree_node_dragged = node;
                    });
                }

                /* Events fired on other node items */
                item.addEventListener("dragover", e => {
                    e.preventDefault(); // allow drop
                }, false );
                item.addEventListener("dragenter", (e) => {
                    e.target.classList.add("draggingover");
                });
                item.addEventListener("dragleave", (e) => {
                    e.target.classList.remove("draggingover");
                });
                item.addEventListener("drop", e => {
                    e.preventDefault(); // Prevent default action (open as link for some elements)
                    let dragged = window.__tree_node_dragged;
                    if(!dragged)
                        return;
                    let target = node;
                    // Can't drop to same node
                    if(dragged.id == target.id) {
                        console.warn("Cannot parent node to itself!");
                        return;
                    }

                    // Can't drop to child node
                    const isChild = function(new_parent, node) {
                        var result = false;
                        for( var c of node.children ) {
                            if( c.id == new_parent.id )
                                return true;
                            result |= isChild(new_parent, c);
                        }
                        return result;
                    };

                    if(isChild(target, dragged)) {
                        console.warn("Cannot parent node to a current child!");
                        return;
                    }

                    // Trigger node dragger event
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_DRAGGED, dragged, target);
                        that.onevent( event );
                    }

                    const index = dragged.parent.children.findIndex(n => n.id == dragged.id);
                    const removed = dragged.parent.children.splice(index, 1);
                    target.children.push( removed[0] );
                    that.refresh();
                    delete window.__tree_node_dragged;
                });
            }
            

            // Show/hide children
            if(is_parent) {
                item.querySelector('a').addEventListener("click", function(){
                    node.closed = !node.closed;
                    that.refresh();
                });
            }

            // Add button icons

            if( !node.skipVisibility ?? false )
            {
                let visibility = document.createElement('a');
                visibility.className = "itemicon fa-solid fa-eye" + (!node.visible ? "-slash" : "");
                visibility.title = "Toggle visible";
                visibility.addEventListener("click", function(e) {
                    e.stopPropagation();
                    node.visible = node.visible === undefined ? false : !node.visible;
                    this.className = "itemicon fa-solid fa-eye" + (!node.visible ? "-slash" : "");
                    // Trigger visibility event
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_VISIBILITY, node, node.visible);
                        that.onevent( event );
                    }
                });

                item.appendChild(visibility);
            }
            
            if(node.actions) 
            {
                for(var i = 0; i < node.actions.length; ++i) {
                    let a = node.actions[i];
                    var actionEl = document.createElement('a');
                    actionEl.className = "itemicon " + a.icon;
                    actionEl.title = a.name;
                    actionEl.addEventListener("click", function(e) {
                        a.callback.call(this, node);
                        e.stopPropagation();
                    });
                    item.appendChild(actionEl);
                }
            }

            if(node.closed)
                return;

            for( var i = 0; i < node.children.length; ++i )
                this.#create_item( node, node.children[i], level + 1 );
        }

        refresh(newData) {
            this.data = newData ?? this.data;
            this.domEl.querySelector("ul").innerHTML = "";
            this.#create_item( null, this.data );
        }
    }

    /**
     * @class Panel
     */

    class Panel {

        #inline_widgets_left;

        /**
         * @param {*} options 
         * id: Id of the element
         * className: Add class to the element
         */

        constructor( options = {} )  {
            var root = document.createElement('div');
            root.className = "lexpanel";
            if(options.id)
                root.id = options.id;
            if(options.className)
                root.className += " " + options.className;

            root.style.width = options.width || "calc( 100% - 7px )";
            root.style.height = options.height || "100%";
            this.root = root;

            this.onevent = (e => {});

            // branches
            this.branch_open = false;
            this.branches = [];
            this.current_branch = null;
            this.widgets = {};
        }

        get( name ) {

            return this.widgets[ name ];
        }

        getValue( name ) {

            let widget = this.widgets[ name ];
            if(!widget)
                throw("No widget called " + name);

            return widget.value();
        }

        setValue( name, value ) {

            let widget = this.widgets[ name ];
            if(!widget)
                throw("No widget called " + name);

            return widget.setValue(value);
        }

        /**
         * @method clear
         */

        clear() {

            this.branch_open = false;
            this.branches = [];
            this.current_branch = null;
            this.widgets = {};

            this.root.innerHTML = "";
        }

        /**
         * @method sameLine
         * @param {Number} number Of widgets that will be placed in the same line
         * @description Next widgets will be in the same line
         */

        sameLine( number ) {

            console.assert(number > 0);
            this.#inline_widgets_left = number;
        }

        /**
         * @method branch
         * @param {String} name Name of the branch/section
         * @param {*} options 
         * id: Id of the branch
         * className: Add class to the branch
         * closed: Set branch collapsed/opened [false]
         * icon: Set branch icon (Fontawesome class e.g. "fa-solid fa-skull")
         * filter: Allow filter widgets in branch by name [false]
         */

        branch( name, options = {} ) {

            if( this.branch_open )
                this.merge();

            // Create new branch
            var branch = new Branch(name, options);
            branch.panel = this;
            // Declare new open
            this.branch_open = true;
            this.current_branch = branch;
            // Append to panel
            if(this.branches.length == 0)
                branch.root.classList.add('first');

            // This is the last!
            this.root.querySelectorAll(".last").forEach( e => { e.classList.remove("last"); } );
            branch.root.classList.add('last');

            this.branches.push( branch );
            this.root.appendChild( branch.root );

            // Add widget filter
            if(options.filter) {
                this.#add_filter( options.filter, {callback: this.#search_widgets.bind(this, branch.name)} );
            }
        }

        /**
         * @method tab
         * @param {String} name Name of the branch/section
         * @param {*} options 
         * id: Id of the branch
         * className: Add class to the branch
         * closed: Set branch collapsed/opened [false]
         * icon: Set branch icon (Fontawesome class e.g. "fa-solid fa-skull")
         * filter: Allow filter widgets in branch by name [false]
         */

        tab( name, options = {} ) {

            if(!this.current_branch)
            throw("Open the first tab using 'Panel.branch()'!");

            // Create new branch
            var branch = new Branch(name, options);
            branch.panel = this;
            this.branches.push( branch );

            if(!this.current_tabs) {
                this.current_tabs = [ this.current_branch.name ];
                this.tab_parent = this.current_branch;
            }

            this.current_tabs.push( name );

            // Set header to tabs
            let title = this.tab_parent.root.querySelector(".lexbranchtitle");
            title.classList.add('wtabs');
            title.innerHTML = "";

            // This might be called innecessarily more times...
            title.removeEventListener("click", this.tab_parent.onclick);

            for( let i = 0; i < this.current_tabs.length; ++i )
            {
                let branch_name = this.current_tabs[i];
                let tab = document.createElement('span');
                tab.className = i == 0 ? "first selected" : "";
                tab.innerText = branch_name;
                title.appendChild(tab);

                tab.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    title.querySelectorAll('span').forEach( s => s.classList.remove('selected'));
                    tab.classList.toggle('selected');
                    let parent = title.parentElement;
                    // Hide Contents
                    parent.querySelectorAll('.lexbranchcontent').forEach( s => s.style.display = 'none');
                    // Show branch
                    const nameid = branch_name.replace(/\s/g, '');
                    parent.querySelector("#" + nameid).style.display = "";
                });
            }

            // Append content to last branch
            let content = branch.root.querySelector(".lexbranchcontent");
            this.tab_parent.root.appendChild( content );
            content.style.display = 'none';

            // Set as current
            this.current_branch = branch;

            // Add widget filter
            if(options.filter) {
                this.#add_filter( options.filter, {callback: this.#search_widgets.bind(this, branch.name)} );
            }
        }

        merge() {

            this.branch_open = false;
            this.current_branch = null;
            this.current_tabs = null;
            this.tab_parent = null;
        }

        #pick( arg, def ) {
            return (typeof arg == 'undefined' ? def : arg);
        }

        static #dispatch_event( element, type, bubbles, cancelable ) {
            let event = new Event(type, { 'bubbles': bubbles, 'cancelable': cancelable });
            element.dispatchEvent(event);
        }

        static #add_reset_property( container, callback ) {
            var domEl = document.createElement('a');
            domEl.style.display = "none";
            domEl.style.marginRight = "6px";
            domEl.className = "lexicon fa fa-rotate-left";
            domEl.addEventListener("click", callback);
            container.appendChild(domEl);
            return domEl;
        }

        /*
            Panel Widgets
        */

        #create_widget( name, type, options = {} ) {

            let widget = new Widget(name, type, options);

            let element = document.createElement('div');
            element.className = "lexwidget";
            if(options.id)
                element.id = options.id;
            if(options.className)
                element.className += " " + options.className;
            if(options.title)
                element.title = options.title;

            element.style.width = options.width || "calc( 100% - 10px)";

            if(name) {
                let domName = document.createElement('div');
                domName.className = "lexwidgetname";
                domName.innerHTML = name || "";
                domName.style.width = options.nameWidth || LX.DEFAULT_NAME_WIDTH;

                element.appendChild(domName);
                element.domName = domName;

                // Copy-paste info
                domName.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    widget.oncontextmenu(e);
                });

                this.widgets[ name ] = widget;
            }

            widget.domEl = element;

            const insert_widget = el => {
                if(options.container)
                    options.container.appendChild(el);
                else if(!this.queuedContainer) {

                    if(this.current_branch)
                    {
                        if(!options.skipWidget) 
                            this.current_branch.widgets.push( widget );
                        this.current_branch.content.appendChild( el );
                    }
                    else
                    {
                        this.root.appendChild( el );
                    }
                } 
                // Append content to queued tab container
                else {
                    this.queuedContainer.appendChild( el );
                }
            };

            // Process inline widgets
            if(this.#inline_widgets_left > 0)
            {
                if(!this._inlineContainer)  {
                    this._inlineContainer = document.createElement('div');
                    this._inlineContainer.className = "lexinlinewidgets";
                }
                this._inlineContainer.appendChild(element);
                this.#inline_widgets_left--;

                // Last widget
                if(!this.#inline_widgets_left) {
                    insert_widget(this._inlineContainer);
                    delete this._inlineContainer;
                }
            }else {
                insert_widget(element);
            }

            return widget;
        }

        #add_filter( placeholder, options = {} ) {

            options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties"
            options.skipWidget = options.skipWidget ?? true;

            let widget = this.#create_widget(null, Widget.TEXT, options);
            let element = widget.domEl;
            element.className += " lexfilter noname";
            
            let input = document.createElement('input');
            input.setAttribute("placeholder", options.placeholder);
            input.style.width =  "calc( 100% - 17px )";
            input.value = options.filterValue || "";

            let searchIcon = document.createElement('a');
            searchIcon.className = "fa-solid fa-magnifying-glass";
            element.appendChild(input);
            element.appendChild(searchIcon);

            // store ref to branch name
            let branchName = options.branchName || this.current_branch.name;

            var that = this;

            input.addEventListener("input", (e) => { 
                if(options.callback)
                    options.callback(input.value, e); 
            });
        }

        #search_widgets(branchName, value) {
            for( let b of this.branches ) {

                if(b.name !== branchName)
                    continue;
                
                // remove all widgets
                for( let w of b.widgets ) {
                    if(w.domEl.classList.contains('lexfilter'))
                        continue;
                    w.domEl.remove();
                }

                // push to right container
                this.queuedContainer = b.content;

                const emptyFilter = !value.length;

                // add widgets
                for( let w of b.widgets ) {

                    if(!emptyFilter)
                    {
                        if(!w.name) continue;
                        const filterWord = value.toLowerCase();
                        const name = w.name.toLowerCase();
                        if(!name.includes(value)) continue;
                    }

                    // insert filtered widget
                    this.queuedContainer.appendChild( w.domEl );
                }

                // push again to current branch
                delete this.queuedContainer;

                // no more branches to check!
                return;
            }
        }

        #search_options(options, value) {
            // push to right container
            const emptyFilter = !value.length;
            let filteredOptions = [];
            // add widgets
            for( let i = 0; i < options.length; i++) {
                let o = options[i];
                if(!emptyFilter)
                {
                    if(typeof o == 'string')
                        o = {value: o};
                    const filterWord = value.toLowerCase();
                    const name = o.value.toLowerCase();
                    if(!name.includes(value)) continue;
                }
                // insert filtered widget
                filteredOptions.push(o);
            }
 
            this.refresh(filteredOptions);
        }

        #trigger( event, callback ) {

            if(callback)
                callback.call(this, event.value, event.domEvent);

            if(this.onevent)
                this.onevent.call(this, event);
        }

        /**
         * @method addBlank
         * @param {Number} height
         */

        addBlank( height = 8) {

            let widget = this.#create_widget(null, Widget.addBlank);
            widget.domEl.style.height = height + "px";
            return widget;
        }

        /**
         * @method addTitle
         * @param {String} name Title name
         */

        addTitle( name, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(null, Widget.TITLE, options);
            let element = widget.domEl;
            element.innerText = name;
            element.className = "lextitle noname";
        }

        /**
         * @method addText
         * @param {String} name Widget name
         * @param {String} value Text value
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * placeholder: Add input placeholder
         * trigger: Choose onchange trigger (default, input) [default]
         * inputWidth: Width of the text input
         */

        addText( name, value, callback, options = {} ) {

            let widget = this.#create_widget(name, Widget.TEXT, options);
            widget.onSetValue = (new_value) => {
                wValue.value = new_value;
                Panel.#dispatch_event(wValue, "focusout");
            };
            let element = widget.domEl;

            // Add reset functionality
            if(name && !(options.noreset ?? false)) {
                Panel.#add_reset_property(element.domName, function() {
                    wValue.value = wValue.iValue;
                    this.style.display = "none";
                    Panel.#dispatch_event(wValue, "focusout");
                });
            }
            
            // Add widget value
            let wValue = document.createElement('input');
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " - 8px )";
            // wValue.style.marginLeft = "4px";

            if(options.disabled ?? false) wValue.setAttribute("disabled", true);
            if(options.placeholder) wValue.setAttribute("placeholder", options.placeholder);

            var resolve = (function(val, event) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn)
                    btn.style.display = (val != wValue.iValue ? "block" : "none");
                this.#trigger( new IEvent(name, val, event), callback );
            }).bind(this);

            const trigger = options.trigger ?? 'default';

            if(trigger == 'default')
            {
                wValue.addEventListener("keyup", function(e){
                    if(e.key == 'Enter')
                        resolve(e.target.value, e);
                });
                wValue.addEventListener("focusout", function(e){
                    resolve(e.target.value, e);
                });
            }
            else if(trigger == 'input')
            {
                wValue.addEventListener("input", function(e){
                    resolve(e.target.value, e);
                });
            }

            element.appendChild(wValue);
            
            // Remove branch padding and margins
            if(!name) {
                element.className += " noname";
                wValue.style.width = "100%";
            }
        }

        /**
         * @method addLabel
         * @param {String} value Information string
         */

        addLabel( value ) {

            this.addText( null, value, null, { disabled: true, className: "auto" } );
        }
        
        /**
         * @method addButton
         * @param {String} name Widget name
         * @param {String} value Button name
         * @param {Function} callback Callback function on click
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         */

        addButton( name, value, callback, options = {} ) {

            let widget = this.#create_widget(name, Widget.BUTTON, options);
            let element = widget.domEl;

            var wValue = document.createElement('button');

            wValue.className = "lexbutton";
            if(options.buttonClass)
                wValue.classList.add(options.buttonClass);
            wValue.innerHTML = "<span>" + (value || "") + "</span>";
            wValue.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";
          
            if(options.disabled)
                wValue.setAttribute("disabled", true);
            
            wValue.addEventListener("click", e => {
                this.#trigger( new IEvent(name, true, e), callback );   
            });

            element.appendChild(wValue);
            
            // Remove branch padding and margins
            if(!name) {
                wValue.className += " noname";
                wValue.style.width =  "100%";
            }
            return element;
        }

        /**
         * @method addDropdown
         * @param {String} name Widget name
         * @param {Array} values Posible options of the dropdown widget -> String (for default dropdown) or Object = {value, url} (for images, gifs..)
         * @param {String} value Select by default option
         * @param {Function} callback Callback function on change
         * @param {*} options: {filter: boolean} to add a search bar to the widget
         * disabled: Make the widget disabled [false]
         */

        addDropdown( name, values, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.DROPDOWN, options);
            widget.onSetValue = (new_value) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != wValue.iValue ? "block" : "none");
                value = new_value;
                list.querySelectorAll('li').forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
                this.#trigger( new IEvent(name, value, null), callback ); 
            };

            let element = widget.domEl;
            let that = this;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                value = wValue.iValue;
                list.querySelectorAll('li').forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
                that.#trigger( new IEvent(name, value, null), callback ); 
                this.style.display = "none";
            });

            let container = document.createElement('div');
            container.className = "lexdropdown";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";            
            
            // Add widget value
            let wValue = document.createElement('div');
            wValue.className = "lexdropdown lexoption";
            wValue.name = name;
            wValue.iValue = value;

            // Add dropdown widget button  
            let buttonName = value;
            buttonName += "<a class='fa-solid fa-caret-down' style='float:right'></a>";
            let selectedOption = this.addButton(null, buttonName, (value, event) => {
                let rect = event.currentTarget.getClientRects();
                let y = rect[0].y + rect[0].height;
                element.querySelector(".lexoptions").style.top = y + 'px';
                element.querySelector(".lexoptions").style.width = event.currentTarget.clientWidth - 10 + 'px';
                element.querySelector(".lexoptions").toggleAttribute('hidden');
            }, { buttonClass: 'array' });

            selectedOption.refresh = (v) => {
                selectedOption.querySelector("span").innerHTML = selectedOption.querySelector("span").innerHTML.replaceAll(selectedOption.querySelector("span").innerText, v); 
            }

            //Add dropdown options container
            let list = document.createElement('ul');
            list.className = "lexoptions";
            list.hidden = true;

            // Add filter options
            if(options.filter)
                this.#add_filter("Search option", {container: list, callback: this.#search_options.bind(list, values)});

            // Add dropdown options list
            list.refresh = (options) => {
                if(!options.length)
                    return;

                let children = [];
                for(let i = 0; i < list.children.length; i++) {
                    
                    if(list.children[i].classList.contains('lexfilter'))
                        continue;
                    children.push(list.children[i]);
                }
                for(let i = 0; i < children.length; i++) {
                    list.removeChild(children[i]);
                }
                for(let i = 0; i < options.length; i++)
                {
                    let iValue = options[i];
                    let li = document.createElement('li');
                    let option = document.createElement('div');
                    option.className = "option";
                    li.appendChild(option);
                    li.addEventListener("click", (e) => {
                        element.querySelector(".lexoptions").toggleAttribute('hidden', true);
                        element.querySelector(".lexoptions .selected").classList.remove("selected");
                        value = e.currentTarget.getAttribute("value");
                        e.currentTarget.toggleAttribute('hidden', false);
                        e.currentTarget.classList.add("selected");
                        selectedOption.refresh(value);

                        let btn = element.querySelector(".lexwidgetname .lexicon");
                        if(btn) btn.style.display = (value != wValue.iValue ? "block" : "none");
                    })

                    if(typeof iValue == 'string') {
                        //Add string option
                        
                        option.innerHTML = option.value = iValue;
                        li.setAttribute("value", iValue);
                        li.className = "lexlistitem";
                        if(iValue == value)
                        {
                            li.classList.add("selected");
                            wValue.innerHTML = iValue;
                        }
                    }
                    else {
                        //Add image option
                        let img = document.createElement("img");
                        img.src = iValue.src;
                        li.setAttribute("value", iValue.value);
                        li.className = "lexlistitem";
                        let p = document.createElement("p");
                        p.innerText = iValue.value;
                        option.appendChild(img);
                        option.appendChild(p);

                        option.setAttribute("value", iValue.value);
                        option.setAttribute("data-index", i);
                        option.setAttribute("data-src", iValue.src);
                        option.setAttribute("title", iValue.value);
                        if(value == iValue.value)
                            li.classList.add("selected");
                    }      
                    list.appendChild(li);
                }
            }

            list.refresh(values);
            if(options.disabled)
                wValue.setAttribute("disabled", true);
            
            wValue.addEventListener("change", e => {
                const val = e.target.value;
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (val != wValue.iValue ? "block" : "none");
                this.#trigger( new IEvent(name, val, e), callback ); 
            });

            container.appendChild(selectedOption);
            container.appendChild(list)
            element.appendChild(container);
        }

        /**
         * @method addLayers
         * @param {String} name Widget name
         * @param {Number} value Flag value by default option
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addLayers( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let that = this;
            let widget = this.#create_widget(name, Widget.LAYERS, options);
            widget.onSetValue = (new_value) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != defaultValue ? "block" : "none");
                value = element.value = new_value;
                setLayers();
                that.#trigger( new IEvent(name, value), callback );
            };

            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                value = element.value = defaultValue;
                setLayers();
                that.#trigger( new IEvent(name, value, e), callback );
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexlayers";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            let defaultValue = element.value = value;

            const setLayers = () =>  {

                container.innerHTML = "";

                let binary = value.toString( 2 );
                let nbits = binary.length;
                // fill zeros
                for(var i = 0; i < (16 - nbits); ++i) {
                    binary = '0' + binary;
                }
    
                for( let bit = 0; bit < 16; ++bit )
                {
                    let layer = document.createElement('div');
                    layer.className = "lexlayer";
                    if( value != undefined )
                    {
                        const valueBit = binary[ 16 - bit - 1 ];
                        if(valueBit != undefined && valueBit == '1') 
                            layer.classList.add('selected');    
                    }
                    layer.innerText = bit + 1;
                    layer.title = "Bit " + bit + ", value " + (1 << bit);
                    container.appendChild( layer );
                    
                    layer.addEventListener("click", e => {
    
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        e.target.classList.toggle('selected');
                        value ^= ( 1 << bit );
                        element.value = value;
    
                        let btn = element.querySelector(".lexwidgetname .lexicon");
                        if(btn) btn.style.display = (value != defaultValue ? "block" : "none");
    
                        this.#trigger( new IEvent(name, value, e), callback );
                    });
                }
    
            };

            setLayers();
            
            element.appendChild(container);
        }

        /**
         * @method addArray
         * @param {String} name Widget name
         * @param {Array} values By default values in the array
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addArray( name, values, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.ARRAY, options);
            widget.onSetValue = (new_value) => {
                values = new_value;
                updateItems();
                this.#trigger( new IEvent(name, values, null), callback );
            };
            let element = widget.domEl;
            element.style.flexWrap = "wrap";

            // Add dropdown array button

            const itemNameWidth = "10%";

            var container = document.createElement('div');
            container.className = "lexarray";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            this.queuedContainer = container;
            let buttonName = "Array (size " + values.length + ")";
            buttonName += "<a class='fa-solid fa-caret-down' style='float:right'></a>";
            this.addButton(null, buttonName, () => {
                element.querySelector(".lexarrayitems").toggleAttribute('hidden');
            }, { buttonClass: 'array' });
            delete this.queuedContainer;

            // Show elements

            let array_items = document.createElement('div');
            array_items.className = "lexarrayitems";
            array_items.toggleAttribute('hidden',  true);
            
            element.appendChild(container);
            element.appendChild(array_items);

            const updateItems = () => {

                // Update num items
                let buttonEl = element.querySelector(".lexbutton.array span");
                buttonEl.innerHTML = "Array (size " + values.length + ")";
                buttonEl.innerHTML += "<a class='fa-solid fa-caret-down' style='float:right'></a>";

                // Update inputs
                array_items.innerHTML = "";

                this.queuedContainer = array_items;

                for( let i = 0; i < values.length; ++i )
                {
                    const value = values[i];
                    const baseclass = value.constructor;

                    this.sameLine(2);

                    switch(baseclass)
                    {
                        case String:
                            this.addText(i+"", value, function(value, event) {
                                values[i] = value;
                                callback( values );
                            }, { nameWidth: itemNameWidth, inputWidth: "90%", noreset: true });
                            break;
                        case Number:
                            this.addNumber(i+"", value, function(value, event) {
                                values[i] = value;
                                callback( values );
                            }, { nameWidth: itemNameWidth, inputWidth: "90%", noreset: true });
                            break;
                    }

                    this.addButton( null, "<a class='lexicon fa-solid fa-trash'></a>", (v, event) => {
                        values.splice(values.indexOf( value ), 1);
                        updateItems();
                        this.#trigger( new IEvent(name, values, event), callback );
                    }, { title: "Remove item", className: 'small'} );
                }

                buttonName = "Add item";
                buttonName += "<a class='fa-solid fa-plus' style='float:right'></a>";
                this.addButton(null, buttonName, (v, event) => {
                    values.push( "" );
                    updateItems();
                    this.#trigger( new IEvent(name, values, event), callback );
                }, { buttonClass: 'array' });

                // Stop pushing to array_items
                delete this.queuedContainer;
            };

            updateItems();
        }

        /**
         * @method addList
         * @param {String} name Widget name
         * @param {String} value Selected list value
         * @param {Array} values List values
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addList( name, value, values, callback, options = {} ) {

            let widget = this.#create_widget(name, Widget.ARRAY, options);
            let element = widget.domEl;

            // Show list

            let list_container = document.createElement('div');
            list_container.className = "lexlist";
            list_container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            for( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let item_value = values[i];

                if( item_value.constructor === Array )
                {
                    icon = item_value[1];
                    item_value = item_value[0];
                }

                let list_item = document.createElement('div');
                list_item.className = "lexlistitem" + (value == item_value ? " selected" : "");
                list_item.innerHTML = "<span>" + item_value + "</span>" + (icon ? "<a class='" + icon + "'></a>" : "");

                list_item.addEventListener('click', (e) => {
                    list_container.querySelectorAll('.lexlistitem').forEach( e => e.classList.remove('selected'));
                    list_item.classList.toggle( 'selected' );
                    this.#trigger( new IEvent(name, item_value, e), callback );
                });

                list_container.appendChild(list_item);
            }

            // Remove branch padding and margins
            if(!name) {
                element.className += " noname";
                list_container.style.width = "100%";
            }

            element.appendChild(list_container);
        }

        /**
         * @method addCheckbox
         * @param {String} name Widget name
         * @param {Boolean} value Value of the checkbox
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         */

        addCheckbox( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.CHECKBOX, options);
            widget.onSetValue = (value) => {
                if(flag.value !== value)
                    Panel.#dispatch_event(toggle, "click");
            };

            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                Panel.#dispatch_event(toggle, "click");
            });
            
            // Add widget value

            var container = document.createElement('div');
            container.className = "lexcheckboxcont";

            let toggle = document.createElement('span');
            toggle.className = "lexcheckbox";

            let flag = document.createElement('span');
            flag.value = flag.iValue = value || false;
            flag.className = "checkbox " + (flag.value ? "on" : "");
            flag.id = "checkbox"+simple_guidGenerator();
            flag.innerHTML = "<a class='fa-solid fa-check' style='display: " + (flag.value ? "block" : "none") + "'></a>";
            
            if(options.disabled) {
                flag.disabled = true;
                toggle.className += " disabled";
            }

            toggle.appendChild(flag);

            let value_name = document.createElement('span');
            value_name.id = "checkboxtext";
            value_name.innerHTML = "On";

            container.appendChild(toggle);
            container.appendChild(value_name);

            toggle.addEventListener("click", (e) => {

                let flag = toggle.querySelector(".checkbox");
                if(flag.disabled)
                return;

                let check = toggle.querySelector(".checkbox a");

                flag.value = !flag.value;
                flag.className = "checkbox " + (flag.value ? "on" : "");
                check.style.display = flag.value ? "block" : "none";

                // Reset button (default value)
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn)
                    btn.style.display = flag.value != flag.iValue ? "block": "none";
                this.#trigger( new IEvent(name, flag.value, e), callback );
            });
            
            element.appendChild(container);
        }

        /**
         * @method addColor
         * @param {String} name Widget name
         * @param {String} value Default color (hex)
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * useRGB: The callback returns color as Array (r, g, b) and not hex [true]
         */

        addColor( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.COLOR, options);
            widget.onSetValue = (new_value) => {
                color.value = new_value;
                Panel.#dispatch_event(color, "input");
            };
            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                this.style.display = "none";
                color.value = color.iValue;
                Panel.#dispatch_event(color, "input");
            });

            // Add widget value

            var container = document.createElement('span');
            container.className = "lexcolor";

            let color = document.createElement('input');
            color.type = 'color';
            color.className = "colorinput";
            color.id = "color" + simple_guidGenerator();
            color.useRGB = options.useRGB ?? true;
            color.value = color.iValue = value.constructor === Array ? rgbToHex(value) : value;
            
            if(options.disabled) {
                color.disabled = true;
            }

            let valueName = document.createElement('div');
            valueName.className = "colorinfo";
            valueName.innerText = color.value;

            container.appendChild(color);
            container.appendChild(valueName);

            color.addEventListener("input", e => {
                let val = e.target.value;

                // Change value (always hex)
                valueName.innerText = val;

                // Reset button (default value)
                if(val != color.iValue) {
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    btn.style.display = "block";
                }

                if(color.useRGB)
                    val = hexToRgb(val);

                this.#trigger( new IEvent(name, val, e), callback );
            }, false);
            
            element.appendChild(container);
        }

        /**
         * @method addNumber
         * @param {String} name Widget name
         * @param {Number} value Default number value
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * step: Step of the input
         * min, max: Min and Max values for the input
         */

        addNumber( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.NUMBER, options);
            widget.onSetValue = (new_value) => {
                vecinput.value = new_value;
                Panel.#dispatch_event(vecinput, "input");
            };
            let element = widget.domEl;

            // add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                this.style.display = "none";
                vecinput.value = vecinput.iValue;
                Panel.#dispatch_event(vecinput, "input");
            });

            // add widget value

            var container = document.createElement('div');
            container.className = "lexnumber";        
            container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            let box = document.createElement('div');
            box.className = "numberbox";

            let vecinput = document.createElement('input');
            vecinput.className = "vecinput";
            vecinput.min = options.min || -1e24;
            vecinput.max = options.max || 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "number_"+simple_guidGenerator();
            vecinput.value = vecinput.iValue = value;
            box.appendChild(vecinput);

            if(options.disabled) {
                vecinput.disabled = true;
            }

            // add slider below
            if(options.min && options.max) {
                let slider = document.createElement('input');
                slider.className = "lexinputslider";
                slider.step = options.step ?? "any";
                slider.min = options.min;
                slider.max = options.max;
                slider.type = "range";
                slider.addEventListener("input", function(e) {
                    vecinput.value = +this.value;
                    Panel.#dispatch_event(vecinput, "input");
                }, false);
                box.appendChild(slider);
            }

            // Add wheel input

            vecinput.addEventListener("wheel", function(e) {
                e.preventDefault();
                if(this !== document.activeElement)
                    return;
                let mult = options.step ?? 1;
                if(e.shiftKey) mult = 10;
                else if(e.altKey) mult = 0.1;
                this.value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
                Panel.#dispatch_event(vecinput, "input");
            }, false);

            vecinput.addEventListener("input", e => {
                let val = e.target.value = clamp(e.target.value, vecinput.min, vecinput.max);
   
                // update slider!
                if( box.querySelector(".lexinputslider"))
                    box.querySelector(".lexinputslider").value = val;

                // Reset button (default value)
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn)
                    btn.style.display = val != vecinput.iValue ? "block": "none";
                this.#trigger( new IEvent(name, val, e), callback );
            }, false);
            
            // Add drag input

            vecinput.addEventListener("mousedown", inner_mousedown);

            var that = this;
            var lastY = 0;
            function inner_mousedown(e) {
                var doc = that.root.ownerDocument;
                doc.addEventListener("mousemove",inner_mousemove);
                doc.addEventListener("mouseup",inner_mouseup);
                lastY = e.pageY;
                document.body.classList.add('nocursor');
            }

            function inner_mousemove(e) {
                if (lastY != e.pageY) {
                    let dt = lastY - e.pageY;
                    let mult = options.step ?? 1;
                    if(e.shiftKey) mult = 10;
                    else if(e.altKey) mult = 0.1;
                    vecinput.value = (+vecinput.valueAsNumber + mult * dt).toPrecision(5);
                    Panel.#dispatch_event(vecinput, "input");
                }

                lastY = e.pageY;
                e.stopPropagation();
                e.preventDefault();
            }

            function inner_mouseup(e) {
                var doc = that.root.ownerDocument;
                doc.removeEventListener("mousemove",inner_mousemove);
                doc.removeEventListener("mouseup",inner_mouseup);
                document.body.classList.remove('nocursor');
            }
            
            container.appendChild(box);
            element.appendChild(container);
        }

        static #VECTOR_COMPONENTS = {0: 'x', 1: 'y', 2: 'z', 3: 'w'};

        #add_vector( num_components, name, value, callback, options = {} ) {

            num_components = clamp(num_components, 2, 4);

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.VECTOR, options);
            widget.onSetValue = (new_value) => {
                const inputs = element.querySelectorAll(".vecinput");
                for( var i = 0; i < inputs.length; ++i ) {
                    inputs[i].value = new_value[i] ?? 0;
                    Panel.#dispatch_event(inputs[i], "input");
                }
            };
            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                this.style.display = "none";
                for( let v of element.querySelectorAll(".vecinput") ) {
                    v.value = v.iValue;
                    Panel.#dispatch_event(v, "input");
                }
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexvector";        
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            for( var i = 0; i < num_components; ++i ) {

                let box = document.createElement('div');
                box.className = "vecbox";
                box.innerHTML = "<span class='" + Panel.#VECTOR_COMPONENTS[i] + "'>" + Panel.#VECTOR_COMPONENTS[i] + "</span>";

                let vecinput = document.createElement('input');
                vecinput.className = "vecinput v" + num_components;
                vecinput.min = options.min || -1e24;
                vecinput.max = options.max || 1e24;
                vecinput.step = options.step ?? "any";
                vecinput.type = "number";
                vecinput.id = "vec"+num_components+"_"+simple_guidGenerator();
                vecinput.value = vecinput.iValue = value[i];

                if(options.disabled) {
                    vecinput.disabled = true;
                }

                // Add wheel input

                vecinput.addEventListener("wheel", function(e) {
                    e.preventDefault();
                    if(this !== document.activeElement)
                        return;
                    let mult = options.step ?? 1;
                    if(e.shiftKey) mult = 10;
                    else if(e.altKey) mult = 0.1;
                    this.value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
                    Panel.#dispatch_event(vecinput, "input");
                }, false);

                vecinput.addEventListener("input", e => {
                    let val = e.target.value = clamp(e.target.value, vecinput.min, vecinput.max);
        
                    // Reset button (default value)
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    if(btn)
                        btn.style.display = val != vecinput.iValue ? "block": "none";
                    this.#trigger( new IEvent(name, val, e), callback );
                }, false);
                
                // Add drag input

                vecinput.addEventListener("mousedown", inner_mousedown);

                var that = this;
                var lastY = 0;
                function inner_mousedown(e) {
                    var doc = that.root.ownerDocument;
                    doc.addEventListener("mousemove",inner_mousemove);
                    doc.addEventListener("mouseup",inner_mouseup);
                    lastY = e.pageY;
                    document.body.classList.add('nocursor');
                }

                function inner_mousemove(e) {
                    if (lastY != e.pageY) {
                        let dt = lastY - e.pageY;
                        let mult = options.step ?? 1;
                        if(e.shiftKey) mult = 10;
                        else if(e.altKey) mult = 0.1;
                        vecinput.value = (+vecinput.valueAsNumber + mult * dt).toPrecision(5);
                        Panel.#dispatch_event(vecinput, "input");
                    }

                    lastY = e.pageY;
                    e.stopPropagation();
                    e.preventDefault();
                }

                function inner_mouseup(e) {
                    var doc = that.root.ownerDocument;
                    doc.removeEventListener("mousemove",inner_mousemove);
                    doc.removeEventListener("mouseup",inner_mouseup);
                    document.body.classList.remove('nocursor');
                }
                
                box.appendChild(vecinput);
                container.appendChild(box);
            }
            
            element.appendChild(container);
        }

        /**
         * @method addVector N (2, 3, 4)
         * @param {String} name Widget name
         * @param {Array} value Array of N components 
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * step: Step of the inputs
         * min, max: Min and Max values for the inputs
         */

        addVector2( name, value, callback, options ) {

            this.#add_vector(2, name, value, callback, options);
        }

        addVector3( name, value, callback, options ) {

            this.#add_vector(3, name, value, callback, options);
        }

        addVector4( name, value, callback, options ) {

            this.#add_vector(4, name, value, callback, options);
        }

        /**
         * @method addProgress
         * @param {String} name Widget name
         * @param {Number} value Progress value 
         * @param {*} options:
         * min, max: Min and Max values
         */

        addProgress( name, value, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.PROGRESS, options);
            widget.onSetValue = (new_value) => {
                element.querySelector("meter").value = new_value;
            };
            let element = widget.domEl;

            var container = document.createElement('div');
            container.className = "lexprogress";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            // add slider (0-1 if not specified different )

            let progress = document.createElement('meter');
            progress.className = "lexprogressbar";
            progress.step = "any";
            progress.min = options.min ?? 0;
            progress.max = options.max ?? 1;
            progress.value = value;

            container.appendChild(progress);
            element.appendChild(container);
        }

        /**
         * @method addFile
         * @param {String} name Widget name
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * local: Ask for local file
         * type: type to read as [text (Default), buffer, bin, url]
         */

        addFile( name, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.FILE, options);
            let element = widget.domEl;

            let local = options.local ?? true;
            let type = options.type ?? 'text';

            // Create hidden input
            let input = document.createElement('input');
            input.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " - 20%)";
            input.type = 'file';
            input.addEventListener('change', function(e) {
                const files = e.target.files;
                if(!files.length) return;

                const reader = new FileReader();

                if(type === 'text') {
                    reader.readAsText(files[0]);
                }else if(type === 'buffer') {
                    reader.readAsArrayBuffer(files[0])
                }else if(type === 'bin') {
                    reader.readAsBinaryString(files[0])
                }else if(type === 'url') {
                    reader.readAsDataURL(files[0])
                }

                reader.onload = (e) => { callback.call(this, e.target.result) } ;
            });

            element.appendChild(input);

            this.queuedContainer = element;

            this.addButton(null, "<a class='fa-solid fa-folder-open'></a>", () => {
                input.click();
            }, { className: "small" });
            
            this.addButton(null, "<a class='fa-solid fa-gear'></a>", () => {
                
                new Dialog("Load Settings", p => {
                    p.addDropdown("Type", ['text', 'buffer', 'bin', 'url'], type, v => { type = v } );
                    p.addButton(null, "Reload", v => { input.dispatchEvent( new Event('change') ) } );
                });

            }, { className: "small" });

            delete this.queuedContainer;
        }

        /**
         * @method addTree
         * @param {String} name Widget name
         * @param {Object} data Data of the tree
         * @param {*} options:
         * icons: Array of objects with icon button information {name, icon, callback}
         * filter: Add nodes filter [true]
         * rename: Boolean to allow rename [true]
         * onevent(tree_event): Called when node is selected, dbl clicked, contextmenu opened, changed visibility, parent or name
         */

        addTree( name, data, options = {} ) {

            let container = document.createElement('div');
            container.className = "lextree";

            if(name) {
                let title = document.createElement('span');
                title.innerHTML = name;
                container.appendChild(title);
            }

            let toolsDiv = document.createElement('div');
            toolsDiv.className = "lextreetools";

            // Tree icons
            if(options.icons) {

                for( let data of options.icons )
                {
                    let iconEl = document.createElement('a');
                    iconEl.title = data.name;
                    iconEl.className = "lexicon " + data.icon;
                    iconEl.addEventListener("click", data.callback);
                    toolsDiv.appendChild(iconEl);
                }
            }

            // Node filter

            options.filter = options.filter ?? true;

            let node_filter_input = null;
            if(options.filter)
            {
                node_filter_input = document.createElement('input');
                node_filter_input.id = "lexnodetree_filter";
                node_filter_input.setAttribute("placeholder", "Filter..");
                node_filter_input.style.width =  "calc( 100% - 17px )";
                node_filter_input.style.marginTop =  "-6px";
                node_filter_input.addEventListener('input', function(){
                    nodeTree.refresh();
                });
        
                let searchIcon = document.createElement('a');
                searchIcon.className = "fa-solid fa-magnifying-glass";
                toolsDiv.appendChild(node_filter_input);
                toolsDiv.appendChild(searchIcon);
            }

            if(options.icons || options.filter)
                container.appendChild(toolsDiv);

            // Tree

            let list = document.createElement('ul');
            list.style.paddingTop = name ? "0px" : "16px";
            list.addEventListener("contextmenu", function(e) {
                e.preventDefault();
            });

            container.appendChild(list);
            this.root.appendChild(container);

            const nodeTree = new NodeTree( container, data, options );
            return nodeTree;
        }

        /**
         * @method addSeparator
         */

        addSeparator() {

            var element = document.createElement('div');
            element.className = "lexseparator";
            let widget = new Widget( null, Widget.SEPARATOR );
            widget.domEl = element;
            
            if(this.current_branch) {
                this.current_branch.content.appendChild( element );
                this.current_branch.widgets.push( widget );
            } else 
                this.root.appendChild(element);
        }

        /**
         * @method addTabs
         * @param {Array} tabs Contains objects with {name, icon, callback}
         * @param {*} options 
         * vertical: Use vertical or horizontal tabs (vertical by default)
         * showNames: Show tab name only in horizontal tabs
         */

        addTabs( tabs, options = {} ) {

            if(!this.current_branch)
                throw("No current branch!");

            if(tabs.constructor != Array)
                throw("Param @tabs must be an Array!");

            const vertical = options.vertical ?? true;
            const showNames = !vertical && (options.showNames ?? false);

            let container = document.createElement('div');
            container.className = "lextabscontainer";
            if( !vertical ) container.className += " horizontal";
            container.style.height = (tabs.length * 34) + "px";

            let tabContainer = document.createElement("div");
            tabContainer.className = "tabs";
            container.appendChild( tabContainer );
            this.current_branch.content.appendChild( container );

            for( var i = 0; i < tabs.length; ++i ) 
            {
                const tab = tabs[i];
                const selected = i == 0;
                let tabEl = document.createElement('div');
                tabEl.className = "lextab " + (i == tabs.length - 1 ? "last" : "") + (selected ? "selected" : "");
                tabEl.innerHTML = (showNames ? tab.name : "") + "<a class='" + (tab.icon || "fa fa-hashtag") + " " + (showNames ? "withname" : "") + "'></a>";
                tabEl.title = tab.name;

                let infoContainer = document.createElement("div");
                infoContainer.id = tab.name.replace(/\s/g, '');
                infoContainer.className = "widgets";
                if(!selected) infoContainer.toggleAttribute('hidden', true);
                container.appendChild( infoContainer );

                tabEl.addEventListener("click", function() {
                    // change selected tab
                    tabContainer.querySelectorAll(".lextab").forEach( e => { e.classList.remove("selected"); } );
                    this.classList.add("selected");
                    // hide all tabs content
                    container.querySelectorAll(".widgets").forEach( e => { e.toggleAttribute('hidden', true); } );
                    // show tab content
                    const el = container.querySelector("#" + infoContainer.id);
                    el.toggleAttribute('hidden');
                });

                tabContainer.appendChild(tabEl);

                // push to tab space
                this.queuedContainer = infoContainer;
                tab.callback( this );
            }
            
            // add separator to last opened tab
            this.addSeparator();

            // push to branch from now on
            delete this.queuedContainer;
        }

    }

    LX.Panel = Panel;

    /**
     * @class Branch
     */

    class Branch {

        
        constructor( name, options = {} ) {
            this.name = name;

            var root = document.createElement('div');
            root.className = "lexbranch";
            if(options.id)
                root.id = options.id;
            if(options.className)
                root.className += " " + options.className;

            root.style.width = "calc(100% - 7px)";
            root.style.margin = "0 auto";

            var that = this;

            this.root = root;
            this.widgets = [];

            // create element
            var title = document.createElement('div');
            title.className = "lexbranchtitle";
            
            title.innerHTML = "<span class='switch-branch-button'></span>";
            if(options.icon) {
                title.innerHTML += "<a class='branchicon " + options.icon + "' style='margin-right: 8px; margin-bottom: -2px;'>";
            }
            title.innerHTML += name || "Branch";

            root.appendChild(title);

            var branch_content = document.createElement('div');
            branch_content.id = name.replace(/\s/g, '');
            branch_content.className = "lexbranchcontent";
            root.appendChild(branch_content);
            this.content = branch_content;

            this.#addBranchSeparator();

            if(options.closed) {
                title.className += " closed";
                root.className += " closed";
                this.content.setAttribute('hidden', true);
                this.grabber.setAttribute('hidden', true);
            }

            this.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                var parent = this.parentElement;

                if(this.className.indexOf("closed") > 0)
                    this.classList.remove("closed")
                else
                    this.className += " closed";

                if(parent.className.indexOf("closed") > 0)
                    parent.classList.remove("closed")
                else
                    parent.className += " closed";

                that.content.toggleAttribute('hidden');
                that.grabber.toggleAttribute('hidden');
            };

            title.addEventListener("click", this.onclick);
        }

        #addBranchSeparator() {

            var element = document.createElement('div');
            element.className = "lexwidgetseparator";
            element.style.width = "100%";
            element.style.background = "none";

            var grabber = document.createElement('div');
            grabber.innerHTML = "&#9662;";
            grabber.style.marginLeft = LX.DEFAULT_NAME_WIDTH;
            element.appendChild(grabber);

            var line = document.createElement('div');
            line.style.width = "1px";
            line.style.marginLeft = "6px";
            line.style.marginTop = "2px";
            line.style.height = "0px"; // get in time
            grabber.appendChild(line);
            grabber.addEventListener("mousedown", inner_mousedown);

            this.grabber = grabber;

            function getBranchHeight(){
                
                return that.root.offsetHeight - that.root.children[0].offsetHeight;
            }

            var that = this;
            var lastX = 0;
            var lastXLine = 0;
            function inner_mousedown(e)
            {
                var doc = that.root.ownerDocument;
                doc.addEventListener("mouseup",inner_mouseup);
                doc.addEventListener("mousemove",inner_mousemove);
                lastX = e.pageX;
                lastXLine = e.pageX;
                e.stopPropagation();
                e.preventDefault();
                var h = getBranchHeight();
                line.style.height = (h-3) + "px";
                document.body.classList.add('nocursor');
            }
            
            function inner_mousemove(e)
            {
                if (lastXLine != e.pageX) {
                    var dt = lastXLine - e.pageX;
                    var margin = parseFloat( grabber.style.marginLeft );
                    grabber.style.marginLeft = clamp(margin - dt * 0.1, 10, 90) + "%";
                }

                lastXLine = e.pageX;
            }

            function inner_mouseup(e)
            {
                if (lastX != e.pageX)
                    that.#updateWidgets();
                lastX = e.pageX;
                lastXLine = e.pageX;
                line.style.height = "0px";

                var doc = that.root.ownerDocument;
                doc.removeEventListener("mouseup",inner_mouseup);
                doc.removeEventListener("mousemove",inner_mousemove);
                document.body.classList.remove('nocursor');
            }

            this.content.appendChild( element );
        }

        #updateWidgets() {

            var size = this.grabber.style.marginLeft;

            // Update sizes of widgets inside
            for(var i = 0; i < this.widgets.length;i++) {

                let widget = this.widgets[i];
                let element = widget.domEl;

                if(element.children.length < 2)
                    continue;

                var name = element.children[0];
                var value = element.children[1];

                name.style.width = size;
                let padding = "0px";
                switch(widget.type) {
                    case Widget.FILE:
                        padding = "20%";
                        break;
                    case Widget.TEXT:
                        padding = "8px";
                        break;
                };
                value.style.width = "calc( 100% - " + size + " - " + padding + " )";
            }
        }
    };

    LX.Branch = Branch;

    /**
     * @class Dialog
     */

    class Dialog {

        #oncreate;

        constructor( title, callback, options = {} ) {
            
            if(!callback)
            console.warn("Content is empty, add some widgets using 'callback' parameter!");

            this.#oncreate = callback;

            const size = options.size ?? [],
                position = options.position ?? [],
                draggable = options.draggable ?? true,
                modal = options.modal ?? false;

            if(modal)
                LX.modal.toggle(false);

            var root = document.createElement('div');
            root.className = "lexdialog";
            if(options.id)
                root.id = options.id;
            LX.root.appendChild( root );

            var titleDiv = document.createElement('div');
            if(title) {
                titleDiv.className = "lexdialogtitle";
                titleDiv.innerHTML = title;
                root.appendChild(titleDiv);
            }

            var closeButton = document.createElement('div');
            closeButton.className = "lexdialogcloser";
            closeButton.innerHTML = "<a class='fa-solid fa-xmark'></a>";
            closeButton.title = "Close";

            closeButton.addEventListener('click', e => {
                root.remove();
                if(modal)
                    LX.modal.toggle();
            });

            root.appendChild(closeButton);

            const panel = new Panel();
            panel.root.classList.add('lexdialogcontent');
            if(!title) panel.root.classList.add('notitle');
            callback.call(this, panel);
            root.appendChild(panel.root);
            
            this.panel = panel;
            this.root = root;

            if(draggable)
                set_as_draggable(root);

            // Process position and size

            root.style.width = size[0] ? (size[0] + "px") : "25%";
            root.style.height = size[1] ? (size[1] + "px") : "auto";
            
            let rect = root.getBoundingClientRect();
            root.style.left = position[0] ? (position[0] + "px") : "calc( 50% - " + (rect.width * 0.5) + "px )";
            root.style.top = position[1] ? (position[1] + "px") : "calc( 50vh - " + (rect.height * 0.5) + "px )";

            panel.root.style.width = "calc( 100% - 30px )";
            panel.root.style.height = title ? "calc( 100% - " + (titleDiv.offsetHeight + 30) + "px )" : "calc( 100% - 51px )";
        }

        refresh() {

            this.panel.root.innerHTML = "";
            this.#oncreate.call(this, this.panel);
        }
    }

    LX.Dialog = Dialog;

    /**
     * @class ContextMenu
     */

    class ContextMenu {

        constructor( event, title ) {
            
            // remove all context menus
            document.body.querySelectorAll(".lexcontextmenubox").forEach(e => e.remove());

            this.root = document.createElement('div');
            this.root.className = "lexcontextmenubox";
            this.root.style.left = (event.x - 16) + "px";
            this.root.style.top = (event.y - 8) + "px";

            this.root.addEventListener("mouseleave", function() {
                this.remove();
            });
            
            this.items = [];
            this.colors = {};

            if(title) {
                const item = {};
                item[ title ] = [];
                item[ 'className' ] = "cmtitle";
                // item[ 'icon' ] = "fa-solid fa-ellipsis-vertical";
                this.items.push( item );
            }
        }

        #adjust_position(div, margin, useAbsolute = false) {
            
            let rect = div.getBoundingClientRect();
            
            if(!useAbsolute)
            {   
                let width = rect.width + 36; // this has paddings
                if(window.innerWidth - rect.right < 0)
                    div.style.left = (window.innerWidth - width - margin) + "px";

                if(rect.top + rect.height > window.innerHeight)
                    div.style.top = (window.innerHeight - rect.height - margin) + "px";
            }
            else
            {
                let dt = window.innerWidth - rect.right;
                if(dt < 0) {
                    div.style.left = div.offsetLeft + (dt - margin) + "px";
                }
                
                dt = window.innerHeight - (rect.top + rect.height);
                if(dt < 0) {
                    div.style.top = div.offsetTop + (dt - margin + 20 ) + "px";
                }
            }
        }

        #create_submenu( o, k, c, d ) {

            let contextmenu = document.createElement('div');
            contextmenu.className = "lexcontextmenubox";
            c.appendChild( contextmenu );

            for( var i = 0; i < o[k].length; ++i )
            {
                const subitem = o[k][i];
                const subkey = Object.keys(subitem)[0];
                this.#create_entry(subitem, subkey, contextmenu, d);
            }

            var rect = c.getBoundingClientRect();
            contextmenu.style.left = rect.width + "px";
            contextmenu.style.marginTop = 6 - c.offsetHeight + "px";

            // Set final width
            contextmenu.style.width = contextmenu.offsetWidth + "px";
            this.#adjust_position( contextmenu, 6, true );
        }

        #create_entry( o, k, c, d ) {

            const hasSubmenu = o[ k ].length;
            let entry = document.createElement('div');
            entry.className = "lexcontextmenuentry" + (o[ 'className' ] ? " " + o[ 'className' ] : "" );
            entry.id = k.replace(/\s/g, '').replace('@', '_');
            entry.innerHTML = "";
            const icon = o[ 'icon' ];
            if(icon) {
                entry.innerHTML += "<a class='" + icon + " fa-sm'></a>";
            }
            const disabled = o['disabled'];
            entry.innerHTML += "<div class='lexentryname" + (disabled ? " disabled" : "") + "'>" + k + "</div>";
            c.appendChild( entry );

            if( this.colors[ k ] ) {
                entry.style.borderColor = this.colors[ k ];
            }

            // Add callback
            entry.addEventListener("click", e => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if(disabled) return;

                const f = o[ 'callback' ];
                if(f) {
                    f.call( this, k, entry );
                    this.root.remove();
                } 

                if( LX.OPEN_CONTEXTMENU_ENTRY == 'click' )
                    this.#create_submenu( o, k, entry, ++d );
            });

            if( !hasSubmenu )
                return;

            let submenuIcon = document.createElement('a');
            submenuIcon.className = "fa-solid fa-bars-staggered fa-xs";
            entry.appendChild( submenuIcon );

            if( LX.OPEN_CONTEXTMENU_ENTRY == 'mouseover' )
            {
                entry.addEventListener("mouseover", e => {
                    if(entry.built)
                        return;
                    entry.built = true;
                    this.#create_submenu( o, k, entry, ++d );
                    e.stopPropagation();
                });
            }

            entry.addEventListener("mouseleave", () => {
                d = -1; // Reset depth
                // delete entry.built;
                c.querySelectorAll(".lexcontextmenubox").forEach(e => e.remove());
            });
        }

        onCreate() {
            this.#adjust_position( this.root, 6 );
        }

        add( path, options = {} ) {

            if(options.constructor == Function)
                options = { callback: options };

            // process path
            const tokens = path.split("/");

            // assign color to last token in path
            const lastPath = tokens[tokens.length - 1];
            this.colors[ lastPath ] = options.color;

            let idx = 0;

            const insert = (token, list) => {
                if(token == undefined) return;

                let found = null;
                list.forEach( o => {
                    const keys = Object.keys(o);
                    const key = keys.find( t => t == token );
                    if(key) found = o[ key ];
                } );

                if(found) {
                    insert( tokens[idx++], found );    
                }
                else {
                    let item = {};
                    item[ token ] = [];
                    const next_token = tokens[idx++];
                    // Check if last token -> add callback
                    if(!next_token) {
                        item[ 'callback' ] = options.callback;
                        item[ 'disabled' ] = options.disabled ?? false;
                    } 

                    list.push( item );
                    insert( next_token, item[ token ] ); 
                }
            };

            insert( tokens[idx++], this.items );

            // Set parents

            const setParent = _item => {

                let key = Object.keys(_item)[0];
                let children = _item[ key ];

                if(!children.length)
                    return;

                if(children.find( c => Object.keys(c)[0] == key ) == null)
                {
                    const parent = {};
                    parent[ key ] = [];
                    parent[ 'className' ] = "cmtitle";
                    _item[ key ].unshift( parent );
                }

                for( var child of _item[ key ] ) {
                    let k = Object.keys(child)[0];
                    for( var i = 0; i < child[k].length; ++i )
                        setParent(child);
                }
            };

            for( let item of this.items )
                setParent(item);

            // Create elements

            for( let item of this.items )
            {
                let key = Object.keys(item)[0];
                let pKey = key.replace(/\s/g, '').replace('@', '_');

                // Item already created
                if( !this.root.querySelector("#" + pKey) )
                    this.#create_entry(item, key, this.root, -1);
            }
        }

        setColor( token, color ) {

            if(color[0] !== '#')
                color = rgbToHex(color);

            this.colors[ token ] = color;
        }
        
    };

    LX.ContextMenu = ContextMenu;

	const UTILS = {
        getTime() { return new Date().getTime() },
        compareThreshold( v, p, n, t ) { return Math.abs(v - p) >= t || Math.abs(v - n) >= t },
        compareThresholdRange( v0, v1, t0, t1 ) { return v0 > t0 && v0 <= t1 || v1 > t0 && v1 <= t1 }
    };

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );