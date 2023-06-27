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
        this.root.appendChild(menu.root);

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
                last_pos[0] = e.pageX;
                last_pos[1] = e.pageY;
                e.stopPropagation();
                e.preventDefault();
                document.body.classList.add("nocursor");
                that.split_bar.classList.add("nocursor");
            }

            function inner_mousemove(e)
            {
                if(that.type == "horizontal") {
                    if (last_pos[0] != e.pageX)
                        that.#moveSplit(last_pos[0] - e.pageX);
                }
                else {
                    if (last_pos[1] != e.pageY)
                        that.#moveSplit(last_pos[1] - e.pageY);
                }

                last_pos[0] = e.pageX;
                last_pos[1] = e.pageY;
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
                throw("no split area");

            var a1 = this.sections[0];
            var a2 = this.sections[1];

            const midSize = LX.DEFAULT_SPLITBAR_SIZE / 2;

            if(this.type == "horizontal") {

                var width2 = a2.size[0],
                    data = midSize + "px"; // updates

                // Move to left
                if(dt > 0) {    

                    dt = dt < midSize ? midSize: dt;

                    var size = width2 + dt;
                    data += " - " + size + "px";
                    a1.root.style.width = "calc( 100% - " + data + " )";
                    a2.root.style.width = size + "px";
                } else {

                    dt = dt > -midSize ? -midSize : dt;
                    width2 = a1.size[0];

                    var size = width2 - dt;
                    data += " - " + size + "px";
                    a2.root.style.width = "calc( 100% - " + data + " )";
                    a1.root.style.width = size + "px";
                }
            }
            else {
                var height2 = a2.size[1],
                    data = midSize + "px"; // updates

                // Move up
                if(dt > 0) {
                    var size = height2 + dt;
                    data += " - " + size + "px";
                    a1.root.style.height = "calc( 100% - " + data + " )";
                    a2.root.style.height = size + "px";
                }
                
                else {
                    var size = height2 + dt;
                    data += " - " + size + "px";
                    a1.root.style.height = "calc( 100% - " + data + " )";
                    a2.root.style.height = size + "px";
                }
            }
                
            this.#update();

            // Resize events   
            this.propagateEvent( 'onresize' );
        }

        #update()
        {
            this.size = [ this.root.offsetWidth, this.root.offsetHeight ];

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
                            console.log(e.key);
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
    };

    LX.Menubar = Menubar;

    /**
     * @class Widget
     */

    class Widget {
        
        static TEXT         = 0;
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
        static SEPARATOR    = 14;

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
                    return this.domEl.querySelector("select").value;
                case Widget.CHECKBOX: 
                    return this.domEl.querySelector(".checkbox").value;
                case Widget.PROGRESS:
                    return this.domEl.querySelector("meter").value;
                case Widget.VECTOR:
                    const inputs = this.domEl.querySelectorAll("input");
                    let value = [];
                    for( var v of inputs )
                        value.push( +v.value );
                    return value;
            }
        }

        setValue( value ) {

            switch(this.type) {
                case Widget.TEXT: 
                case Widget.COLOR:
                    this.domEl.querySelector("input").value = value;
                    break;
                case Widget.NUMBER:
                    this.domEl.querySelector("input").value = value;
                    break;
                case Widget.DROPDOWN: 
                    this.domEl.querySelector("select").value = value;
                    break;
                case Widget.CHECKBOX: 
                    this.domEl.querySelector(".checkbox").value = value;
                    break;
                case Widget.PROGRESS:
                    this.domEl.querySelector("meter").value = value;
                    break;
                case Widget.VECTOR:
                    const inputs = this.domEl.querySelectorAll("input");
                    for( var i = 0; i < inputs.length; ++i ) 
                        inputs[i].value = value[i];
                    break;
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
            
        constructor(domEl, data, onevent) {
            this.domEl = domEl;
            this.data = data;
            this.onevent = onevent;
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

            var item = document.createElement('li');
            item.className = "lextreeitem " + "datalevel" + level + " " + (is_parent ? "parent" : "");
            item.id = node.id;
            // Select icon
            let icon = "fa-solid fa-square"; // Default: no childs
            if( is_parent ) icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
            item.innerHTML = "<a class='" + icon + "'></a>" + (node.rename ? "" : node.id);
            item.setAttribute('draggable', true);
            item.style.paddingLeft = ((is_parent ? 0 : 3 ) + (3 + (level+1) * 25)) + "px";
            list.appendChild(item);

            // Callbacks
            item.addEventListener("click", function(){
                list.querySelectorAll("li").forEach( e => { e.classList.remove('selected'); } );
                this.classList.add('selected');
                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_SELECTED, node);
                    that.onevent( event );
                }
            });

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

            // Show/hide children
            if(is_parent) {
                item.querySelector('a').addEventListener("click", function(){
                    node.closed = !node.closed;
                    that.refresh();
                });
            }

            // Add button icons

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

            if(node.actions) 
            {
                for(var i = 0; i < node.actions.length; ++i) {
                    let a = node.actions[i];
                    var actionEl = document.createElement('a');
                    actionEl.className = "itemicon " + a.icon;
                    actionEl.title = a.name;
                    actionEl.addEventListener("click", a.callback);
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

            root.style.width = "calc( 100% - 7px )";
            root.style.height = "100%";
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
                this.#add_filter( options.filter );
            }
        }

        merge() {

            this.branch_open = false;
            this.current_branch = null;
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

            element.style.width = "calc( 100% - 10px)";

            if(name) {
                var domName = document.createElement('div');
                domName.className = "lexwidgetname";
                domName.innerHTML = name || "";
                domName.style.width = (options.nameFitsWidth ?? false) ? "100%" : LX.DEFAULT_NAME_WIDTH;

                element.appendChild(domName);
                element.domName = domName;

                this.widgets[ name ] = widget;
            }

            widget.domEl = element;

            const insert_widget = el => {
                
                if(!this.queuedContainer) {

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
            options.skipWidget = true;

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

            input.addEventListener("input", (function(e){
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
                    that.queuedContainer = b.content;

                    const emptyFilter = !input.value.length;

                    // add widgets
                    for( let w of b.widgets ) {

                        if(!emptyFilter)
                        {
                            if(!w.name) continue;
                            const filterWord = input.value.toLowerCase();
                            const name = w.name.toLowerCase();
                            if(!name.includes(input.value)) continue;
                        }

                        // insert filtered widget
                        that.queuedContainer.appendChild( w.domEl );
                    }

                    // push again to current branch
                    delete that.queuedContainer;

                    // no more branches to check!
                    return;
                }

            }).bind(this));
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
         */

        addText( name, value, callback, options = {} ) {

            let widget = this.#create_widget(name, Widget.TEXT, options);
            let element = widget.domEl;

            // Add reset functionality
            if(name) {
                Panel.#add_reset_property(element.domName, function() {
                    wValue.value = wValue.iValue;
                    this.style.display = "none";
                    Panel.#dispatch_event(wValue, "focusout");
                });
            }
            
            // Add widget value
            let wValue = document.createElement('input');
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " - 8px )";
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
        }

        /**
         * @method addDropdown
         * @param {String} name Widget name
         * @param {Array} values Posible options of the dropdown widget
         * @param {String} value Select by default option
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         */

        addDropdown( name, values, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.DROPDOWN, options);
            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                for(let o of wValue.options)
                    if(o.value == wValue.iValue) o.selected = true;
                this.style.display = "none";
                Panel.#dispatch_event(wValue, "change");
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexdropdown";

            let wValue = document.createElement('select');
            wValue.name = name;
            wValue.iValue = value;
            
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            if(values.length)
                for(var i = 0; i < values.length; i++)
                {
                    var option = document.createElement('option');
                    option.innerHTML = option.value = values[i];
                    if(values[i] == value)
                        option.selected = true;
                    wValue.appendChild(option);
                }

            if(options.disabled)
                wValue.setAttribute("disabled", true);
            
            wValue.addEventListener("change", e => {
                const val = e.target.value;
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn)
                    btn.style.display = (val != wValue.iValue ? "block" : "none");
                this.#trigger( new IEvent(name, val, e), callback ); 
            });

            container.appendChild(wValue);
            element.appendChild(container);
        }

        /**
         * @method addLayers
         * @param {String} name Widget name
         * @param {} value Select by default option
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addLayers( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.#create_widget(name, Widget.LAYERS, options);
            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                // ...
                this.style.display = "none";
                // Panel.#dispatch_event(wValue, "change");
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexlayers";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            let flagvalue = 0;

            for( let bit = 0; bit < 16; ++bit )
            {
                let layer = document.createElement('div');
                layer.className = "lexlayer";
                layer.innerText = bit + 1;
                layer.title = "Bit " + bit + ", value " + (1 << bit);
                container.appendChild( layer );
                
                layer.addEventListener("click", e => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.target.classList.toggle('selected');
                    flagvalue ^= ( 1 << bit );
                    this.#trigger( new IEvent(name, flagvalue, e), callback );
                });
            }

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
            let element = widget.domEl;
            element.style.flexWrap = "wrap";

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                // ...
                this.style.display = "none";
                // Panel.#dispatch_event(wValue, "change");
            });

            // Add dropdown array button

            var container = document.createElement('div');
            container.className = "lexarray";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            this.queuedContainer = container;
            let buttonName = "Array (size " + values.length + ")";
            buttonName += "<a class='fa-solid fa-caret-down' style='float:right'></a>";
            this.addButton(null, buttonName, () => {


            }, { buttonClass: 'array' });
            delete this.queuedContainer;

            // Show elements

            var array_items = document.createElement('div');
            array_items.className = "lexarrayitems";

            this.queuedContainer = array_items;

            for( let i = 0; i < values.length; ++i )
            {
                // let item = document.createElement('div');
                // item.className = "lexarrayitem";
                // item.innerText = values[i];
                // array_items.appendChild( item );

                this.addText(i+"", values[i], null, { width: "10%" });

                // item.addEventListener("click", e => {
                //     e.stopPropagation();
                //     e.stopImmediatePropagation();
                //     e.target.classList.toggle('selected');
                //     flagvalue ^= ( 1 << bit );
                //     this.#trigger( new IEvent(name, flagvalue, e), callback );
                // });
            }

            buttonName = "Add item";
            buttonName += "<a class='fa-solid fa-plus' style='float:right'></a>";
            this.addButton(null, buttonName, () => {


            }, { buttonClass: 'array' });

            // Stop pushing to array_items
            delete this.queuedContainer;

            element.appendChild(container);
            element.appendChild(array_items);
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
            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                Panel.#dispatch_event(toggle, "click");
            });
            
            // Add widget value

            var container = document.createElement('div');

            let toggle = document.createElement('span');
            toggle.className = "lexcheckbox";

            let flag = document.createElement('span');
            flag.value = flag.iValue = value || false;
            flag.className = "checkbox " + (flag.value ? "on" : "");
            flag.id = "checkbox"+simple_guidGenerator();
            
            if(options.disabled) {
                flag.disabled = true;
                toggle.className += " disabled";
            }

            toggle.appendChild(flag);
            container.appendChild(toggle);

            toggle.addEventListener("click", (e) => {

                let flag = toggle.querySelector(".checkbox");
                if(flag.disabled)
                return;

                flag.value = !flag.value;
                flag.className = "checkbox " + (flag.value ? "on" : "");

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

            let copy = document.createElement('i');
            copy.className = "lexicon fa fa-copy";

            copy.addEventListener("click", () => {
                navigator.clipboard.writeText( color.value );
                console.log("Copied to clipboard: " + color.value)
            });

            let valueName = document.createElement('div');
            valueName.className = "colorinfo";
            valueName.innerText = color.value;

            container.appendChild(color);
            container.appendChild(valueName);
            container.appendChild(copy);

            if(callback) {
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
            }
            
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
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

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

            const nodeTree = new NodeTree( container, data, options.onevent );
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
            title.className = "lexbranch title";
            
            title.innerHTML = "<span class='switch-branch-button'></span>";
            if(options.icon) {
                title.innerHTML += "<a class='branchicon " + options.icon + "' style='margin-right: 8px; margin-bottom: -2px;'>";
            }
            title.innerHTML += name || "Branch";

            root.appendChild(title);

            var branch_content = document.createElement('div');
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

            title.addEventListener("click", function(e){
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
            })
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
                item[ 'icon' ] = "fa-solid fa-ellipsis-vertical";
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
            entry.id = k.replace(/\s/g, '').replace('@', '_');;
            entry.innerHTML = "";
            const icon = o[ 'icon' ];
            if(icon) {
                entry.innerHTML += "<a class='" + icon + " fa-sm'></a>";
            }
            entry.innerHTML += "<div class='lexentryname'>" + k + "</div>";
            c.appendChild( entry );

            if( this.colors[ k ] )
            {
                entry.style.borderColor = this.colors[ k ];
            }

            // Add callback
            entry.addEventListener("click", e => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const f = o[ 'callback' ];
                if(f) {
                    f.call( this, k, entry );
                    this.root.remove();
                } 

                if( LX.OPEN_CONTEXTMENU_ENTRY == 'click' )
                    this.#create_submenu( o, k, entry, ++d );
            });

            if( !hasSubmenu)
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
	
    /**
     * @class Timeline
     * @description Agnostic timeline, do not impose any timeline content. Renders to a canvas
     */

    class Timeline {

        /**
         * @param {string} name 
         * @param {object} options = {animationClip, selectedItem, position = [0,0], width, height, canvas, trackHeight}
         */
        constructor( name, options = {} ) {

            this.name = name ?? '';
            this.currentTime = 0;
            this.framerate = 30;
            this.opacity = 0.8;
            this.sidebarWidth = 200;
            this.topMargin = 24;
            this.renderOutFrames = false;

            this.lastMouse = [];

            this.lastKeyFramesSelected = [];
            this.tracksDrawn = [];
            this.buttonsDrawn = [];
            this.trackState = [];
            this.clipboard = null;
            this.pixelsToSeconds;
            this.grabTime = 0;
            this.timeBeforeMove = 0;

            this.canvas = options.canvas ?? document.createElement('canvas');

            //do not change, it will be updated when called draw
            this.duration = 100;
            this.position = [options.x ?? 0, options.y ?? 0];

            this.size = [ options.width ?? 400, options.height ?? 100];

            if(options.width) 
                this.canvas.width = this.size[0];

            if(options.height)
                this.canvas.height = this.size[1];

            this.currentScroll = 0; //in percentage
            this.currentScrollInPixels = 0; //in pixels
            this.scrollableHeight = this.size[1]; //true height of the timeline content
            this.secondsToPixels = 100;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
          

            this.selectedItem = options.selectedItem ?? null;

            this.animationClip = options.animationClip ?? null;
            
            this.trackHeight = options.trackHeight ?? 15;
            this.onDrawContent = null;

            this.active = true;
            var div = document.createElement("div");
            div.className = "lextimeline";
            this.root = div;
            div.appendChild(this.canvas);

            if(!options.canvas && this.name != '') {
                this.root.id = this.name;
                this.canvas.id = this.name + '-canvas';
            }
            this.root.addEventListener("mousedown", this.processMouse.bind(this));
            this.root.addEventListener("mouseup", this.processMouse.bind(this));
            this.root.addEventListener("mousemove", this.processMouse.bind(this));
            this.root.addEventListener("wheel", this.processMouse.bind(this));
            this.root.addEventListener("dblclick", this.processMouse.bind(this));
        }

        /**
         * @method addButtons
         * @param {*} buttons 
         * TODO
         */

        addButtons( buttons ) {

            var div = document.createElement('div');
            div.className = 'lexbuttonscontainer';
            for(let i = 0; i < buttons.length; i++) {
                let icon = document.createElement('i');
                icon.className = 'lexicon ' + buttons[i].icon;
                icon.title = buttons[i].name;
                
                let button = {
                    element: icon, 
                    callback: buttons[i].callback,
                    name: buttons[i].name
                };
                icon.addEventListener('click', button.callback)
                this.buttonsDrawn.push(button);
                div.appendChild(icon);
            }
            
            this.root.prepend(div);
        }

        /**
         * @method addNewTrack
         */

        addNewTrack() {

            if(!this.animationClip)
                this.animationClip = {tracks:[]};

            let trackInfo = {
                idx: this.animationClip.tracks.length,
                clips: [],
                selected: [], edited: [], hovered: []
            };

            this.animationClip.tracks.push(trackInfo);
            return trackInfo.idx;
        }

        /**
         * @method setAnimationClip
         * @param {*} animation 
         * TODO
         */

        setAnimationClip( animation ) {
            this.animationClip = animation;
            if(this.processTracks)
                this.processTracks();
        }

        /**
         * @method draw
         * @param {*} currentTime 
         * @param {*} rect 
         * TODO
         */

        draw( currentTime = this.currentTime, rect ) {
            let ctx = this.canvas.getContext("2d");
            ctx.globalAlpha = 1.0;
            if(!rect)
                rect = [0, ctx.canvas.height - ctx.canvas.height , ctx.canvas.width, ctx.canvas.height ];

            this.canvas = ctx.canvas;
            this.position[0] = rect[0];
            this.position[1] = rect[1];
            var w = this.size[0] = rect[2];
            var h = this.size[1] = rect[3];
            var P2S = this.pixelsToSeconds;
            var S2P = this.secondsToPixels;
            var timelineHeight = this.size[1];
            ctx.fillStyle = "black";
            ctx.clearRect(0,0, w , h);
            this.currentTime = currentTime;
            if(this.animationClip)
                this.duration = this.animationClip.duration;
            var duration = this.duration;
            this.currentScrollInPixels = this.scrollableHeight <= h ? 0 : (this.currentScroll * (this.scrollableHeight - timelineHeight));
            ctx.save();
            ctx.translate( this.position[0], this.position[1] + this.topMargin ); //20 is the top margin area
            
            //background
            ctx.clearRect(0, -this.topMargin, w, h+this.topMargin);
            ctx.fillStyle = "#161c21";// "#000";
            //ctx.globalAlpha = 0.65;
            ctx.fillRect(0, -this.topMargin, w, this.topMargin);
            ctx.fillStyle = "#1a2025";// "#000";
            ctx.globalAlpha = 0.75;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;

            //buttons
            // for( const b of this.buttonsDrawn ) {
            //     const boundProperty = b[1];
            //     ctx.fillStyle = this[ boundProperty ] ? "#b66" : "#454545";	
            //     if(b.pressed) ctx.fillStyle = "#eee";
            //     ctx.roundRect(b[2], b[3], b[4], b[5], 5, true, false);
            //     ctx.drawImage(b[0], b[2] + 2, b[3] + 2, b[4] - 4, b[5] - 4);
            // }

            //seconds markers
            var secondsFullWindow = (w * P2S); //how many seconds fit in the current window
            var secondsHalfWindow = secondsFullWindow * 0.5;

            //time in the left side (current time is always in the middle)
            var timeStart = currentTime - secondsHalfWindow;
            //time in the right side
            var timeEnd = currentTime + secondsHalfWindow;

            this.startTime = timeStart;
            this.endTime = timeEnd;

            var sidebar = this.sidebarWidth;

            //this ones are limited to the true timeline (not the visible area)
            var start = Math.ceil( Math.max(0,timeStart) );
            var end = Math.floor( Math.min(duration,timeEnd) + 0.01 );
            
            // Calls using as 0,0 the top-left of the tracks area (not the top-left of the timeline but 20 pixels below)
            this.tracksDrawn.length = 0;

            // Frame lines
            if(S2P > 200)
            {
                ctx.strokeStyle = "#444";
                ctx.globalAlpha = 0.4;
                ctx.beginPath();

                let start = timeStart;
                let end = timeEnd;
                
                if(!this.renderOutFrames) {
                    start = 0;
                    end = duration;
                }
                
                var pixelsPerFrame = S2P / this.framerate;
                var x = pixelsPerFrame + Math.round( this.timeToX( Math.floor(start * this.framerate) / this.framerate));
                var numFrames = (end - start ) * this.framerate - 1;
                for(var i = 0; i < numFrames; ++i)
                {
                    ctx.moveTo( Math.round(x) + 0.5, 0);
                    ctx.lineTo( Math.round(x) + 0.5, 10);
                    x += pixelsPerFrame;
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Vertical lines
            ctx.strokeStyle = "#444";
            ctx.beginPath();
            var linex = this.timeToX( 0 );
            if( linex > sidebar )
            {
                ctx.moveTo( linex, 0.5);
                ctx.lineTo( linex, h );
            }
            var linex = this.timeToX( duration );
            if( linex > sidebar && linex < w )
            {
                ctx.moveTo( linex, 0.5);
                ctx.lineTo( linex, h );
            }
            ctx.stroke();

            // Horizontal line
            ctx.strokeStyle = "#AAA";
            ctx.beginPath();
            ctx.moveTo( Math.max(sidebar, this.timeToX( Math.max(0,timeStart) ) ), 0.5);
            ctx.lineTo( Math.min(w, this.timeToX( Math.min(duration,timeEnd) ) ), 0.5);
            ctx.moveTo( Math.max(sidebar, this.timeToX( Math.max(0,timeStart) ) ), 1.5);
            ctx.lineTo( Math.min(w, this.timeToX( Math.min(duration,timeEnd) ) ), 1.5);
            var deltaSeconds = 1;
            if( this.secondsToPixels < 50)
                deltaSeconds = 10;
            ctx.stroke();
            
            // Numbers
            ctx.fillStyle = "#FFF";
            ctx.font = "12px Tahoma";
            ctx.textAlign = "center";
            for(var t = start; t <= end; t += 1 )
            {
                if( t % deltaSeconds != 0 )
                    continue;
                ctx.globalAlpha = t % 10 == 0 ? 0.5 : clamp( (this.secondsToPixels - 50) * 0.01,0,0.7);
                // if(Math.abs(t - currentTime) < 0.05)
                // 	ctx.globalAlpha = 0.25;
                var x = ((this.timeToX(t))|0) + 0.5;
                if( x > sidebar-10 && x < (w + 10))
                    ctx.fillText(String(t),x,-5);
            }
            ctx.fillText(String(duration.toFixed(3)), this.timeToX(duration),-5);
            ctx.globalAlpha = 1;

            // Current time marker
            ctx.strokeStyle = "#AFD";
            var x = ((w*0.5)|0) + 0.5;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#AAA";
            ctx.fillRect( x-2,1,4,h);
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo( x,1);
            ctx.lineTo( x,h);
            ctx.stroke();

            ctx.fillStyle = "#AFD";
            ctx.beginPath();
            ctx.moveTo( x - 4,1);
            ctx.lineTo( x + 4,1);
            ctx.lineTo( x,6);
            ctx.fill();

            // Current time text
            ctx.fillText(String(currentTime.toFixed(3)), x, -5);

            // Selections
            if(this.boxSelection && this.boxSelectionStart && this.boxSelectionEnd) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = "#AAA";
                ctx.strokeRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            if(this.onDrawContent)
                this.onDrawContent( ctx, timeStart, timeEnd, this );
            ctx.restore();
            
        }

        /**
         * @method drawMarkers
         * @param {*} ctx 
         * @param {*} markers 
         * TODO
         */

        drawMarkers( ctx, markers ) {
            //render markers
            ctx.fillStyle = "white";
            ctx.textAlign = "left";
            var markersPos = [];
            for (var i = 0; i < markers.length; ++i) {
                var marker = markers[i];
                if (marker.time < this.startTime - this.pixelsToSeconds * 100 ||
                    marker.time > this.endTime)
                    continue;
                var x = this.timeToX(marker.time);
                markersPos.push(x);
                ctx.save();
                ctx.translate(x, 0);
                ctx.rotate(Math.PI * -0.25);
                ctx.fillText(marker.title, 20, 4);
                ctx.restore();
            }

            if (markersPos.length) {
                ctx.beginPath();
                for (var i = 0; i < markersPos.length; ++i) {
                    ctx.moveTo(markersPos[i] - 5, 0);
                    ctx.lineTo(markersPos[i], -5);
                    ctx.lineTo(markersPos[i] + 5, 0);
                    ctx.lineTo(markersPos[i], 5);
                    ctx.lineTo(markersPos[i] - 5, 0);
                }
                ctx.fill();
            }
        }

        /**
         * @method clearState
         */

        clearState() {
            this.trackState = [];
        }

        /**
         * @method setDuration
         * @param {Number} t 
         */

        setDuration( t ) {
            this.duration = this.animationClip.duration = t; 
            if( this.onSetDuration ) 
                this.onSetDuration( t );	 
        }

        /**
         * @method optimizeTracks
         */

        optimizeTracks() {
            
            let tracks = [];
            for(let i = 0; i < this.animationClip.tracks.length; i++)
            {
                if(this.animationClip.tracks[i].clips.length) {
                    this.animationClip.tracks[i].idx = tracks.length;
                    for(let j = 0; j < this.animationClip.tracks[i].clips.length; j++)
                    {
                        this.animationClip.tracks[i].clips[j].trackIdx = tracks.length;
                    }
                    let selectedIdx = 0;
                    for(let l = 0; l < this.lastClipsSelected.length; l++)
                    {
                        let [t,c] = this.lastClipsSelected[l];
                    
                        if(t > i)
                            this.lastClipsSelected[l][1] = t - 1;
                        if(t == i)
                            selectedIdx = l;
                    }
                    this.lastClipsSelected = [...this.lastClipsSelected.slice(0, selectedIdx), ...this.lastClipsSelected.slice(selectedIdx + 1, this.lastClipsSelected.length)];
                    tracks.push(this.animationClip.tracks[i]);
                }			
            }
        }

        // Converts distance in pixels to time
        xToTime( x, global ) {
            if (global)
                x -= this.position[0];
            var v = (x - this.size[0] * 0.5) * this.pixelsToSeconds + this.currentTime;
            return v;
        }

        // Converts time to disance in pixels
        timeToX( t, framerate, global ) {
            if (framerate)
                t = Math.round(t * framerate) / framerate;
            var x = (t - this.currentTime) * this.secondsToPixels + this.size[0] * 0.5;
            if (global)
                x += this.position[0];
            return x;
        }

        getCurrentFrame( framerate ) {
            return Math.floor(this.currentTime * framerate);
        }
        
        /**
         * @method setScale
         * @param {*} v
         * TODO
         */

        setScale( v ) {

            this.secondsToPixels = v;
            if (this.secondsToPixels > 3000)
                this.secondsToPixels = 3000;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
        }
        
        /**
         * @method setFramerate
         * @param {*} v
         * TODO
         */

        setFramerate( v ) {
            this.framerate = v;
        }

        /**
         * @method processMouse
         * @param {*} e
         * TODO
         */

        processMouse( e ) {

            if(!this.canvas)
                return;

            var w = this.size[0];

            // Process mouse
            var x = e.offsetX;
            var y = e.offsetY;
            e.deltax = x - this.lastMouse[0];
            e.deltay = y - this.lastMouse[1];
            var localX = e.offsetX - this.position[0];
            var localY = e.offsetY - this.position[1];
            this.lastMouse[0] = x;
            this.lastMouse[1] = y;
            var timelineHeight = this.size[1];

            var time = this.xToTime(x, true);

            var is_inside = x >= this.position[0] && x <= (this.position[0] + this.size[0]) &&
                            y >= this.position[1] && y <= (this.position[1] + this.size[1]);

            var track = null;
            for(var i = this.tracksDrawn.length - 1; i >= 0; --i)
            {
                var t = this.tracksDrawn[i];
                if( localY >= t[1] && localY < (t[1] + t[2]) )
                {
                    track = t[0];
                    break;
                }
            }

            e.track = track;
            e.localX = localX;
            e.localY = localY;

            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }

            if( e.type == "mouseup" )
            {
                const discard = this.movingKeys || (UTILS.getTime() - this.clickTime) > 420; // ms
                this.movingKeys ? innerSetTime( this.currentTime ) : 0;

                if(this.grabbing && this.onClipMoved){
                    this.onClipMoved();
                }

                this.grabbing = false;
                this.grabbingScroll = false;
                this.movingKeys = false;
                this.timeBeforeMove = null;
                e.discard = discard;
                
                if( this.onMouseUp )
                    this.onMouseUp(e, time);
            }

            if( !is_inside && !this.grabbing && !(e.metaKey || e.altKey ) )
                return;

            if( this.onMouse && this.onMouse( e, time, this ) )
                return;

            if( e.type == "mousedown")	{
                this.clickTime = UTILS.getTime();

                if(this.trackBulletCallback && e.track)
                    this.trackBulletCallback(e.track,e,this,[localX,localY]);

                if( timelineHeight < this.scrollableHeight && x > w - 10)
                {
                    this.grabbingScroll = true;
                }
                else
                {
                    this.grabbing = true;
                    this.grabTime = time - this.currentTime;

                    if(this.onMouseDown)
                        this.onMouseDown(e);
                }
            }
            else if( e.type == "mousemove" ) {

                if(e.shiftKey) {
                    if(this.boxSelection) {
                        this.boxSelectionEnd = [localX, localY - 20];
                        return; // Handled
                    }
                }

                if(this.onMouseMove)
                    this.onMouseMove(e, time);
            }

            else if( e.type == "wheel" ) {
                if( timelineHeight < this.scrollableHeight && x > w - 10)
                {
                    this.currentScroll = clamp( this.currentScroll + (e.wheelDelta < 0 ? 0.1 : -0.1), 0, 1);
                }
                else
                {
                    this.setScale( this.secondsToPixels * (e.wheelDelta < 0 ? 0.9 : (1/0.9)) );
                }
            }
            else if (e.type == "dblclick" && this.onDblClick) {
                this.onDblClick(e);	
            }
            this.canvas.style.cursor = this.grabbing && (UTILS.getTime() - this.clickTime > 320) ? "grabbing" : "pointer" ;

            return true;
        }

        /**
         * @method drawTrackWithKeyframes
         * @param {*} ctx
         * ...
         * @description helper function, you can call it from onDrawContent to render all the keyframes
         * TODO
         */
        drawTrackWithKeyframes( ctx, y, trackHeight, title, track, trackInfo ) {
            
            if(trackInfo.enabled === false)
                ctx.globalAlpha = 0.4;

            ctx.font = Math.floor( trackHeight * 0.8) + "px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            
            if(title != null)
            {
                // var info = ctx.measureText( title );
                ctx.fillStyle = this.active ? "rgba(255,255,255,0.9)" : "rgba(250,250,250,0.7)";
                ctx.fillText( title, 25, y + trackHeight * 0.75 );
            }
            
            ctx.fillStyle = "rgba(10,200,200,1)";
            var keyframes = track.times;

            if(keyframes) {
                
                this.tracksDrawn.push([track,y+this.topMargin,trackHeight]);
                for(var j = 0; j < keyframes.length; ++j)
                {
                    let time = keyframes[j];
                    let selected = trackInfo.selected[j];
                    if( time < this.startTime || time > this.endTime )
                        continue;
                    var keyframePosX = this.timeToX( time );
                    if( keyframePosX > this.sidebarWidth ){
                        ctx.save();

                        let margin = 0;
                        let size = trackHeight * 0.4;
                        if(trackInfo.edited[j])
                            ctx.fillStyle = "rgba(255,0,255,1)";
                        if(selected) {
                            ctx.fillStyle = "rgba(250,250,20,1)";
                            size = trackHeight * 0.5;
                            margin = -2;
                        }
                        if(trackInfo.hovered[j]) {
                            size = trackHeight * 0.5;
                            ctx.fillStyle = "rgba(250,250,250,0.7)";
                            margin = -2;
                        }
                        if(!this.active)
                            ctx.fillStyle = "rgba(250,250,250,0.7)";
                            
                        ctx.translate(keyframePosX, y + size * 2 + margin);
                        ctx.rotate(45 * Math.PI / 180);		
                        ctx.fillRect( -size, -size, size, size);
                        if(selected) {
                            ctx.globalAlpha = 0.3;
                            ctx.fillRect( -size*1.5, -size*1.5, size*2, size*2);
                        }
                            
                        ctx.restore();
                    }
                }
            }

            ctx.globalAlpha = 1;
        }

        /**
         * @method drawTrackWithBoxes
         * @param {*} ctx
         * ...
         * TODO
         */

        drawTrackWithBoxes( ctx, y, trackHeight, title, track ) {

            trackHeight *= 0.8;
            let selectedClipArea = null;

            if(track.enabled === false)
                ctx.globalAlpha = 0.4;
            this.tracksDrawn.push([track,y+this.topMargin,trackHeight]);
            this.canvas = this.canvas || ctx.canvas;
            ctx.font = Math.floor( trackHeight * 0.8) + "px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,255,255,0.8)";

            if(title != null)
            {
                // var info = ctx.measureText( title );
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.fillText( title, 25, y + trackHeight * 0.8 );
            }

            ctx.fillStyle = "rgba(10,200,200,1)";
            var clips = track.clips;
            let trackAlpha = 1;

            if(clips) {
                // A utility function to draw a rectangle with rounded corners.
                function roundedRect(ctx, x, y, width, height, radius, fill = true) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + radius);
                    ctx.arcTo(x, y + height, x + radius, y + height, radius);
                    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
                    ctx.arcTo(x + width, y, x + width - radius, y, radius);
                    ctx.arcTo(x, y, x, y + radius, radius);
                    if(fill)
                        ctx.fill();
                    else
                        ctx.stroke();
                }
                for(var j = 0; j < clips.length; ++j)
                {
                    let clip = clips[j];
                    let framerate = this.framerate;
                    //let selected = track.selected[j];
                    var frameNum = Math.floor( clip.start * framerate );
                    var x = Math.floor( this.timeToX( frameNum / framerate) ) + 0.5;
                    frameNum = Math.floor( (clip.start + clip.duration) * framerate );
                    var x2 = Math.floor( this.timeToX( frameNum / framerate) ) + 0.5;
                    var w = x2-x;

                    if( x2 < 0 || x > this.canvas.width )
                        continue;

                    //background rect
                    ctx.globalAlpha = trackAlpha;
                    ctx.fillStyle = clip.clipColor || "#333";
                    //ctx.fillRect(x,y,w,trackHeight);
                    roundedRect(ctx, x, y, w, trackHeight, 5, true);

                    //draw clip content
                    if( clip.drawTimeline )
                    {
                        ctx.save();
                        ctx.translate(x,y);
                        ctx.strokeStyle = "#AAA";
                        ctx.fillStyle = "#AAA";
                        clip.drawTimeline( ctx, x2-x,trackHeight, this.selectedClip == clip || track.selected[j], this );
                        ctx.restore();
                    }
                    //draw clip outline
                    if(clip.hidden)
                        ctx.globalAlpha = trackAlpha * 0.5;
                    
                        var safex = Math.max(-2, x );
                    var safex2 = Math.min( this.canvas.width + 2, x2 );
                    // ctx.lineWidth = 0.5;
                    // ctx.strokeStyle = clip.constructor.color || "black";
                    // ctx.strokeRect( safex, y, safex2-safex, trackHeight );
                    ctx.globalAlpha = trackAlpha;
                    if(this.selectedClip == clip || track.selected[j])
                        selectedClipArea = [x,y,x2-x,trackHeight ]
                    //render clip selection area
                    if(selectedClipArea)
                    {
                        ctx.strokeStyle = track.clips[j].clipColor;
                        ctx.globalAlpha = 0.8;
                        ctx.lineWidth = 1;
                        roundedRect(ctx, selectedClipArea[0]-1,selectedClipArea[1]-1,selectedClipArea[2]+2,selectedClipArea[3]+2, 5, false);
                        ctx.strokeStyle = "#888";
                        ctx.lineWidth = 0.5;
                        ctx.globalAlpha = 1;
                }
                }
            }

            //ctx.restore();
        }

        /**
         * @method resize
         * @param {*} size
         * ...
         * TODO
         */

        resize( size ) {
            this.size = size;
            // this.canvas.style.width = size[0] + 'px';
            // this.canvas.style.height = size[1] + 'px';
            [this.canvas.width, this.canvas.height] = size;
            this.draw(this.currentTime);
        }
    };

    LX.Timeline = Timeline;

    /**
     * Draws a rounded rectangle using the current state of the canvas.
     * If you omit the last three params, it will draw a rectangle
     * outline with a 5 pixel border radius
     * @param {Number} x The top left x coordinate
     * @param {Number} y The top left y coordinate
     * @param {Number} width The width of the rectangle
     * @param {Number} height The height of the rectangle
     * @param {Number} [radius = 5] The corner radius; It can also be an object 
     *                 to specify different radii for corners
     * @param {Number} [radius.tl = 0] Top left
     * @param {Number} [radius.tr = 0] Top right
     * @param {Number} [radius.br = 0] Bottom right
     * @param {Number} [radius.bl = 0] Bottom left
     * @param {Boolean} [fill = false] Whether to fill the rectangle.
     * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
     */

    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        
        this.beginPath();
        this.moveTo(x + radius.tl, y);
        this.lineTo(x + width - radius.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        this.lineTo(x + width, y + height - radius.br);
        this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        this.lineTo(x + radius.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        this.lineTo(x, y + radius.tl);
        this.quadraticCurveTo(x, y, x + radius.tl, y);
        this.closePath();
        
        if (fill) {
            this.fill();
        }
        if (stroke) {
         this.stroke();
        }
    }

    /**
     * @class KeyFramesTimeline
     */

    class KeyFramesTimeline extends Timeline {       

        /**
         * @param {string} name 
         * @param {object} options = {animationClip, selectedItem, position = [0,0], width, height, canvas, trackHeight}
         */
        constructor(name, options = {}) {

            super(name, options,);
            
            this.tracksPerItem = {};
            
            // this.selectedItem = selectedItem;
            this.snappedKeyFrameIndex = -1;
            this.autoKeyEnabled = false;


            if(this.animationClip)
                this.processTracks();

            // Add button data
            let offset = 25;
            if(this.active)
            {

            }
        }

        onMouseUp( e, time)  {

            let track = e.track;
            let localX = e.localX;
            
            let discard = e.discard;
            
            if(e.shiftKey) {

                // Multiple selection
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX, true ); 
                }
                // Box selection
                else{
            
                    this.unSelectAllKeyFrames();
                    
                    let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                    
                    for(let t of tracks) {
                        let keyFrameIndices = this.getKeyFramesInRange(t, 
                            this.xToTime( this.boxSelectionStart[0] ), 
                            this.xToTime( this.boxSelectionEnd[0] ),
                            this.pixelsToSeconds * 5);
                            
                        if(keyFrameIndices) {
                        for(let index of keyFrameIndices)
                            this.processCurrentKeyFrame( e, index, t, null, true );
                        }
                    }
                }

            }else {
                let boundingBox = this.canvas.getBoundingClientRect()
                if(e.y < boundingBox.top || e.y > boundingBox.bottom)
                    return;
                // Check exact track keyframe
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX );
                    
                } 
                else {
                    let x = e.offsetX;
                    let y = e.offsetY - this.topMargin;
                    for( const b of this.buttonsDrawn ) {
                        b.pressed = false;
                        const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                        if(bActive) {
                            const callback = b[6]; 
                            if(callback) callback(e);
                            else this[ b[1] ] = !this[ b[1] ];
                            break;
                        }
                    }
                }
                
            }

            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;

        }

        onMouseDown( e ) {

            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX, localY - 20];

            }
            else if(e.ctrlKey && track) {

                    const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                    if( keyFrameIndex != undefined ) {
                        this.processCurrentKeyFrame( e, keyFrameIndex, track, null, true ); // Settings this as multiple so time is not being set
                        this.movingKeys = true;
                        
                        // Set pre-move state
                        for(let selectedKey of this.lastKeyFramesSelected) {
                            let [name, idx, keyIndex] = selectedKey;
                            let trackInfo = this.tracksPerItem[name][idx];
                            selectedKey[3] = this.animationClip.tracks[ trackInfo.clipIdx ].times[ keyIndex ];
                        }
                        
                        this.timeBeforeMove = track.times[ keyFrameIndex ];
                    }
                

            }else if(!track) {
                let x = e.offsetX;
                let y = e.offsetY - this.topMargin;
                for( const b of this.buttonsDrawn ) {
                    const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                    b.pressed = bActive;
                }
            }
        }

        onMouseMove( e, time ) {
            
            let localX = e.localX;
            let track = e.track;
            
            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }
            // Manage keyframe movement
            if(this.movingKeys) {

                this.clearState();
                const newTime = this.xToTime( localX );
                
                for(let [name, idx, keyIndex, keyTime] of this.lastKeyFramesSelected) {
                    track = this.tracksPerItem[name][idx];
                    const delta = this.timeBeforeMove - keyTime;
                    this.animationClip.tracks[ track.clipIdx ].times[ keyIndex ] = Math.min( this.animationClip.duration, Math.max(0, newTime - delta) );
                }

                return;
            }

            const removeHover = () => {
                if(this.lastHovered)
                    this.tracksPerItem[ this.lastHovered[0] ][ this.lastHovered[1] ].hovered[ this.lastHovered[2] ] = undefined;
            };

            if( this.grabbing && e.button != 2) {

                var curr = time - this.currentTime;
                var delta = curr - this.grabTime;
                this.grabTime = curr;
                this.currentTime = Math.max(0,this.currentTime - delta);

                // fix this
                if(e.shiftKey && track) {

                    let keyFrameIndex = this.getNearestKeyFrame( track, this.currentTime);
                    
                    if(keyFrameIndex != this.snappedKeyFrameIndex){
                        this.snappedKeyFrameIndex = keyFrameIndex;
                        this.currentTime = track.times[ keyFrameIndex ];		
                        innerSetTime( this.currentTime );		
                    }
                }
                else{
                    innerSetTime( this.currentTime );	
                }
                    
            }
            else if(track) {

                let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if(keyFrameIndex != undefined) {
                    
                    const [name, type] = this.getTrackName(track.name);
                    let t = this.tracksPerItem[ name ][track.idx];

                    removeHover();
                        
                    this.lastHovered = [name, track.idx, keyFrameIndex];
                    t.hovered[keyFrameIndex] = true;

                }else {
                    removeHover();
                }
            }
            else {
                removeHover();
            }
        }

        onDrawContent( ctx, timeStart, timeEnd ) {
        
            
            if(this.selectedItem == null || !this.tracksPerItem) 
                return;
            
            ctx.save();
            let tracks = this.tracksPerItem[this.selectedItem] ? this.tracksPerItem[this.selectedItem] : [{name: this.selectedItem}];
            //if(!tracks) return;
            
            const height = this.trackHeight;
            for(let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                this.drawTrackWithKeyframes(ctx, (i+1) * height, height, track.name + " (" + track.type + ")", this.animationClip.tracks[track.clipIdx], track);
            }
            
            ctx.restore();
            let offset = 25;
            ctx.fillStyle = 'white';

            if(this.name)
                ctx.fillText(this.name,  offset + ctx.measureText(this.name).actualBoundingBoxLeft , -this.topMargin*0.4 );
        };

        onUpdateTracks ( keyType ) {
        
            if(this.selectedItem == null || this.lastKeyFramesSelected.length || !this.autoKeyEnabled)
            return;

            let tracks = this.tracksPerItem[this.selectedItem];
            if(!tracks) return;

            // Get current track
            const selectedTrackIdx = tracks.findIndex( t => t.type === keyType );
            if(selectedTrackIdx < 0)
                return;
            let track = tracks[ selectedTrackIdx ];
            
            // Add new keyframe
            const newIdx = this.addKeyFrame( track );
            if(newIdx === null) 
                return;

            // Select it
            this.lastKeyFramesSelected.push( [track.name, track.idx, newIdx] );
            track.selected[newIdx] = true;

            // Update time
            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return true; // Handled
        }

        // Creates a map for each item -> tracks
        processTracks() {

            this.tracksPerItem = {};

            for( let i = 0; i < this.animationClip.tracks.length; ++i ) {

                let track = this.animationClip.tracks[i];

                const [name, type] = this.getTrackName(track.name);

                let trackInfo = {
                    name: name, type: type,
                    dim: track.values.length/track.times.length,
                    selected: [], edited: [], hovered: []
                };
                
                if(!this.tracksPerItem[name]) {
                    this.tracksPerItem[name] = [trackInfo];
                }else {
                    this.tracksPerItem[name].push( trackInfo );
                }

                const trackIndex = this.tracksPerItem[name].length - 1;
                this.tracksPerItem[name][trackIndex].idx = trackIndex;
                this.tracksPerItem[name][trackIndex].clipIdx = i;

                // Save index also in original track
                track.idx = trackIndex;
            }
        }

        getNumTracks( item ) {
            if(!item || !this.tracksPerItem)
                return;
            const tracks = this.tracksPerItem[item.name];
            return tracks ? tracks.length : null;
        }

        onShowOptimizeMenu( e ) {
            
            if(this.selectedItem == null)
                return;

            let tracks = this.tracksPerItem[this.selectedItem];
            if(!tracks) return;

            const threshold = this.onGetOptimizeThreshold ? this.onGetOptimizeThreshold() : 0.025;

            addContextMenu("Optimize", e, m => {
                for( let t of tracks ) {
                    m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                        this.animationClip.tracks[t.clipIdx].optimize( threshold );
                        t.edited = [];
                    })
                }
            });
        }

        onPreProcessTrack( track ) {
            const name = this.getTrackName(track.name)[0];
            let trackInfo = this.tracksPerItem[name][track.idx];
            trackInfo.selected = [];
            trackInfo.edited = [];
            trackInfo.hovered = [];
        }

        isKeyFrameSelected( track, index ) {
            return track.selected[ index ];
        }

        saveState( clipIdx ) {

            const localIdx = this.animationClip.tracks[clipIdx].idx;
            const name = this.getTrackName(this.animationClip.tracks[clipIdx].name)[0];
            const trackInfo = this.tracksPerItem[name][localIdx];

            this.trackState.push({
                idx: clipIdx,
                t: this.animationClip.tracks[clipIdx].times.slice(),
                v: this.animationClip.tracks[clipIdx].values.slice(),
                editedTracks: [].concat(trackInfo.edited)
            });
        }

        restoreState() {
            
            if(!this.trackState.length)
            return;

            const state = this.trackState.pop();
            this.animationClip.tracks[state.idx].times = state.t;
            this.animationClip.tracks[state.idx].values = state.v;

            const localIdx = this.animationClip.tracks[state.idx].idx;
            const name = this.getTrackName(this.animationClip.tracks[state.idx].name)[0];
            this.tracksPerItem[name][localIdx].edited = state.editedTracks;

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.idx );
        }

        selectKeyFrame( track, selectionInfo, index ) {
            
            if(index == undefined || !track)
            return;

            this.unSelectAllKeyFrames();
                                
            this.lastKeyFramesSelected.push( selectionInfo );
            track.selected[index] = true;

            if( this.onSetTime )
                this.onSetTime( this.animationClip.tracks[track.clipIdx].times[ index ] );
        }

        canPasteKeyFrame () {
            return this.clipboard != null;
        }

        copyKeyFrame( track, index ) {

            // 1 element clipboard by now

            let values = [];
            let start = index * track.dim;
            for(let i = start; i < start + track.dim; ++i)
                values.push( this.animationClip.tracks[ track.clipIdx ].values[i] );

            this.clipboard = {
                type: track.type,
                values: values
            };
        }

        #paste( track, index ) {

            let clipboardInfo = this.clipboard;

            if(clipboardInfo.type != track.type){
                return;
            }

            let start = index * track.dim;
            let j = 0;
            for(let i = start; i < start + track.dim; ++i) {
                this.animationClip.tracks[ track.clipIdx ].values[i] = clipboardInfo.values[j];
                ++j;
            }

            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            track.edited[ index ] = true;
        }

        pasteKeyFrame( e, track, index ) {

            this.saveState(track.clipIdx);

            // Copy to current key
            this.#paste( track, index );
            
            if(!e.multipleSelection)
            return;
            
            // Don't want anything after this
            this.clearState();

            // Copy to every selected key
            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.#paste( this.tracksPerItem[name][idx], keyIndex );
            }
        }

        addKeyFrame( track ) {

            // Update animationClip information
            const clipIdx = track.clipIdx;

            // Time slot with other key?
            const keyInCurrentSlot = this.animationClip.tracks[clipIdx].times.find( t => { return !UTILS.compareThreshold(this.currentTime, t, t, 0.001 ); });
            if( keyInCurrentSlot ) {
                console.warn("There is already a keyframe stored in time slot ", keyInCurrentSlot)
                return;
            }

            this.saveState(clipIdx);

            // Find new index
            let newIdx = this.animationClip.tracks[clipIdx].times.findIndex( t => t > this.currentTime );

            // Add as last index
            let lastIndex = false;
            if(newIdx < 0) {
                newIdx = this.animationClip.tracks[clipIdx].times.length;
                lastIndex = true;
            }

            // Add time key
            const timesArray = [];
            this.animationClip.tracks[clipIdx].times.forEach( (a, b) => {
                b == newIdx ? timesArray.push(this.currentTime, a) : timesArray.push(a);
            } );

            if(lastIndex) {
                timesArray.push(this.currentTime);			
            }

            this.animationClip.tracks[clipIdx].times = new Float32Array( timesArray );
            
            // Get mid values
            const item = this.onGetSelectedItem();
            const lerpValue = item[ track.type ].toArray();
            
            // Add values
            const valuesArray = [];
            this.animationClip.tracks[clipIdx].values.forEach( (a, b) => {
                if(b == newIdx * track.dim) {
                    for( let i = 0; i < track.dim; ++i )
                        valuesArray.push(lerpValue[i]);
                }
                valuesArray.push(a);
            } );

            if(lastIndex) {
                for( let i = 0; i < track.dim; ++i )
                    valuesArray.push(lerpValue[i]);
            }

            this.animationClip.tracks[clipIdx].values = new Float32Array( valuesArray );

            // Move the other's key properties
            for(let i = (this.animationClip.tracks[clipIdx].times.length - 1); i > newIdx; --i) {
                track.edited[i - 1] ? track.edited[i] = track.edited[i - 1] : 0;
            }
            
            // Reset this key's properties
            track.hovered[newIdx] = undefined;
            track.selected[newIdx] = undefined;
            track.edited[newIdx] = undefined;

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );

            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return newIdx;
        }

        /** Delete a keyframe given the track and the its index
         * @track: track that keyframe belongs to
         * @index: index of the keyframe on the track
        */
        #delete( track, index ) {

            // Don't remove by now the first key
            if(index == 0) {
                console.warn("Operation not supported! [remove first keyframe track]");
                return;
            }

            // Update clip information
            const clipIdx = track.clipIdx;

            // Don't remove by now the last key
            // if(index == this.animationClip.tracks[clipIdx].times.length - 1) {
            // 	console.warn("Operation not supported! [remove last keyframe track]");
            // 	return;
            // }

            // Reset this key's properties
            track.hovered[index] = undefined;
            track.selected[index] = undefined;
            track.edited[index] = undefined;

            // Delete time key
            this.animationClip.tracks[clipIdx].times = this.animationClip.tracks[clipIdx].times.filter( (v, i) => i != index);

            // Delete values
            const indexDim = track.dim * index;
            const slice1 = this.animationClip.tracks[clipIdx].values.slice(0, indexDim);
            const slice2 = this.animationClip.tracks[clipIdx].values.slice(indexDim + track.dim);

            this.animationClip.tracks[clipIdx].values = UTILS.concatTypedArray([slice1, slice2], Float32Array);

            // Move the other's key properties
            for(let i = index; i < this.animationClip.tracks[clipIdx].times.length; ++i) {
                track.edited[i] = track.edited[i + 1];
            }

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );
        }

        /** Delete one or more keyframes given the triggered event
         * @e: event
         * @track:
         * @index: index of the keyframe on the track
        */
        deleteKeyFrame(e, track, index) {
            
            if(e.multipleSelection) {

                // Split in tracks
                const perTrack = [];
                this.lastKeyFramesSelected.forEach( e => perTrack[e[1]] ? perTrack[e[1]].push(e) : perTrack[e[1]] = [e] );
                
                for(let pts of perTrack) {
                    
                    if(!pts) continue;

                    pts = pts.sort( (a,b) => a[2] - b[2] );
                    
                    let deletedIndices = 0;

                    // Delete every selected key
                    for(let [name, idx, keyIndex] of pts) {
                        this.#delete( this.tracksPerItem[name][idx], keyIndex - deletedIndices );
                        deletedIndices++;
                    }
                }
            }
            else{

                // Key pressed
                if(!track && this.lastKeyFramesSelected.length > 0) {
                    const [itemName, trackIndex, keyIndex] = this.lastKeyFramesSelected[0];
                    track = this.tracksPerItem[itemName][trackIndex];
                    index = keyIndex;
                }

                if ( track ){
                    this.saveState(track.clipIdx);
                    this.#delete( track, index );
                }
            }

            this.unSelectAllKeyFrames();
        }

        getNumKeyFramesSelected() {
            return this.lastKeyFramesSelected.length;
        }

        unSelect() {

            if(!this.unSelectAllKeyFrames()) {
                this.selectedItem = null;
                if(this.onItemUnselected)
                    this.onItemUnselected();
            }
        }

        setSelectedItem( itemName ) {

            if(itemName.constructor !== String)
            throw("Item name has to be a string!");

            this.selectedItem = itemName;
            this.unSelectAllKeyFrames();
        }

        getTrack( trackInfo )  {
            const [name, trackIndex] = trackInfo;
            return this.tracksPerItem[ name ][trackIndex];
        }

        getTracksInRange( minY, maxY, threshold ) {

            let tracks = [];

            // Manage negative selection
            if(minY > maxY) {
                let aux = minY;
                minY = maxY;
                maxY = aux;
            }

            for(let i = this.tracksDrawn.length - 1; i >= 0; --i) {
                let t = this.tracksDrawn[i];
                let pos = t[1] - this.topMargin, size = t[2];
                if( pos + threshold >= minY && (pos + size - threshold) <= maxY ) {
                    tracks.push( t[0] );
                }
            }

            return tracks;
        }

        getTrackName( uglyName ) {

            let name, type;

            // Support other versions
            if(uglyName.includes("[")) {
                const nameIndex = uglyName.indexOf('['),
                    trackNameInfo = uglyName.substr(nameIndex+1).split("].");
                name = trackNameInfo[0];
                type = trackNameInfo[1];
            }else {
                const trackNameInfo = uglyName.split(".");
                name = trackNameInfo[0];
                type = trackNameInfo[1];
            }

            return [name, type];
        }

        getCurrentKeyFrame( track, time, threshold ) {

            if(!track || !track.times.length)
            return;

            // Avoid iterating through all timestamps
            if((time + threshold) < track.times[0])
            return;

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (time - threshold) && 
                    t <= (time + threshold)) {
                    return i;
                }
            }

            return;
        }

        getKeyFramesInRange( track, minTime, maxTime, threshold ) {

            if(!track || !track.times.length)
            return;

            // Manage negative selection
            if(minTime > maxTime) {
                let aux = minTime;
                minTime = maxTime;
                maxTime = aux;
            }

            // Avoid iterating through all timestamps
            if((maxTime + threshold) < track.times[0])
            return;

            let indices = [];

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (minTime - threshold) && 
                    t <= (maxTime + threshold)) {
                    indices.push(i);
                }
            }

            return indices;
        }

        getNearestKeyFrame( track, time ) {

            if(!track || !track.times.length)
            return;

            return track.times.reduce((a, b) => {
                return Math.abs(b - time) < Math.abs(a - time) ? b : a;
            });
        }

        unSelectAllKeyFrames() {

            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.tracksPerItem[name][idx].selected[keyIndex] = false;
            }

            // Something has been unselected
            const unselected = this.lastKeyFramesSelected.length > 0;
            this.lastKeyFramesSelected.length = 0;
            return unselected;
        }

        processCurrentKeyFrame( e, keyFrameIndex, track, localX, multiple ) {

            e.multipleSelection = multiple;
            keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllKeyFrames();
            }
                            
            const [name, type] = this.getTrackName( track.name );
            let t = this.tracksPerItem[ name ][track.idx];
            let currentSelection = [name, track.idx, keyFrameIndex];
            
            if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection, keyFrameIndex)) {
                // Event handled
                return;
            }
            
            if(keyFrameIndex == undefined)
            return;

            // Select if not handled
            this.lastKeyFramesSelected.push( currentSelection );
            t.selected[keyFrameIndex] = true;

            if( !multiple && this.onSetTime )
                this.onSetTime( track.times[ keyFrameIndex ] );
        }
    }

    LX.KeyFramesTimeline = KeyFramesTimeline;

    /**
     * @class ClipsTimeline
     */

    class ClipsTimeline extends Timeline {

        lastClipsSelected = [];
        buttonsDrawn = [];

        clipboard = null;

        pixelsToSeconds;
        grabTime = 0;
        timeBeforeMove = 0;

        movingKeys = false;
        grabbing = false;
        grabbingScroll = false;

        /**
         * @param {string} name 
         * @param {object} options = {animationClip, selectedItem, position = [0,0], width, height, canvas, trackHeight}
         */
        constructor(name, options = {}) {

            super(name, options);
        }

        onMouseUp( e ) {
            
            let track = e.track;
            let localX = e.localX;

            let discard = e.discard;

            if(e.shiftKey) {

                // Multiple selection
                if(!discard && track) {
                        this.processCurrentClip( e, null, track, localX, true );
                }
                // Box selection
                else{
                    
                    let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                    
                    for(let t of tracks) {
                        let clipsIndices = this.getClipsInRange(t, 
                            this.xToTime( this.boxSelectionStart[0] ), 
                            this.xToTime( this.boxSelectionEnd[0] ),
                            this.pixelsToSeconds * 5);
                            
                        if(clipsIndices) {
                        for(let index of clipsIndices)
                            this.processCurrentClip( e, index, t, null, true );
                        }
                    }
                }

            }
            else {

                let boundingBox = this.canvas.getBoundingClientRect()
                if(e.y < boundingBox.top || e.y > boundingBox.bottom)
                    return;

                // Check exact track clip
                if(!discard && track) {
                    if(e.button!=2){
                        this.processCurrentClip( e, null, track, localX );
                    }
                } 
                
            }

            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;

        }

        onMouseDown( e ) {

            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX,localY - 20];

            }
            else if(e.ctrlKey && track) {
                
                let x = e.offsetX;
                let selectedClips = [];
                if(this.lastClipsSelected.length){
                    selectedClips = this.lastClipsSelected;
                }
                // else{
                // 	clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                // 	if(clipIndex != undefined)
                // 	{
                // 		selectedClips = [[trackIndex, clipIndex]];
                // 	}
                
                // }
                
                for(let i = 0; i< selectedClips.length; i++)
                {
                    this.movingKeys = false
                    let [trackIndex, clipIndex] = selectedClips[i];
                    var clip = this.animationClip.tracks[trackIndex].clips[clipIndex];

                    if(!this.timelineClickedClips)
                        this.timelineClickedClips  = [];
                    this.timelineClickedClips.push(clip);

                    if(!this.timelineClickedClipsTime)
                        this.timelineClickedClipsTime  = [];
                    this.timelineClickedClipsTime.push(this.xToTime( localX ));

                    var endingX = this.timeToX( clip.start + clip.duration );
                    var distToStart = Math.abs( this.timeToX( clip.start ) - x );
                    var distToEnd = Math.abs( this.timeToX( clip.start + clip.duration ) - e.offsetX );

                    if(this.duration < clip.start + clip.duration  )
                        this.setDuration(clip.start + clip.duration);
                    //this.addUndoStep( "clip_modified", clip );
                    if( (e.shiftKey && distToStart < 5) || (clip.fadein && Math.abs( this.timeToX( clip.start + clip.fadein ) - e.offsetX ) < 5) )
                        this.dragClipMode = "fadein";
                    else if( (e.shiftKey && distToEnd < 5) || (clip.fadeout && Math.abs( this.timeToX( clip.start + clip.duration - clip.fadeout ) - e.offsetX ) < 5) )
                        this.dragClipMode = "fadeout";
                    else if( Math.abs( endingX - x ) < 10 )
                        this.dragClipMode = "duration";
                    else
                        this.dragClipMode = "move";
                }
                
            }
            else if(!track) {

                if( this.timelineClickedClips )
                {
                    for(let i = 0; i < this.timelineClickedClips.length; i++){

                        if( this.timelineClickedClips[i].fadein && this.timelineClickedClips[i].fadein < 0 )
                            this.timelineClickedClips[i].fadein = 0;
                        if( this.timelineClickedClips[i].fadeout && this.timelineClickedClips[i].fadeout < 0 )
                            this.timelineClickedClips[i].fadeout = 0;
                    }
                }
                this.timelineClickedClips = null;
                this.selectedClip = null;
                this.unSelectAllClips();
                this.onSelectClip(null);
            }
        }

        onMouseMove( e, time ) {

            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }

            if(e.shiftKey) {
                if(this.boxSelection) {
                    this.boxSelectionEnd = [localX,localY - 20];
                    return; // Handled
                }
            }

            if(this.grabbing && e.button != 2) {

                var curr = time - this.currentTime;
                var delta = curr - this.grabTime;
                this.grabTime = curr;
                this.currentTime = Math.max(0,this.currentTime - delta);

                if( this.timelineClickedClips != undefined) {
                    for(let i = 0; i < this.timelineClickedClips.length; i++){
                        
                        var clip = this.timelineClickedClips[i] ;
                        var diff = delta;//this.currentTime - this.timelineClickedClipsTime[i];//delta;
                        if( this.dragClipMode == "move" ) {
                            clip.start += diff;
                            clip.attackPeak += diff;
                            clip.relax += diff;
                        }
                        else if( this.dragClipMode == "fadein" )
                            clip.fadein = (clip.fadein || 0) + diff;
                        else if( this.dragClipMode == "fadeout" )
                            clip.fadeout = (clip.fadeout || 0) - diff;
                        else if( this.dragClipMode == "duration" )
                            clip.duration += diff;
                        this.clipTime = this.currentTime;
                        if(this.duration < clip.start + clip.duration  )
                            this.setDuration(clip.start + clip.duration);
                    }
                    return true;
                }
                else{
                    innerSetTime( this.currentTime );	
                }
            }
        }

        onDblClick( e ) {
            
            let track = e.track;
            let localX = e.localX;

            let clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
            if(clipIndex != undefined)  {
                this.lastClipsSelected = [track.idx, clipIndex];

                if( this.onSelectClip ) 
                    this.onSelectClip(track.clips[clipIndex]);
            }
        }

        onDrawContent( ctx, timeStart, timeEnd )  {

            
            let tracks = this.animationClip.tracks|| [{name: "NMF", clips: []}];
            if(!tracks) return;
            
            ctx.save();
            const height = this.trackHeight*1.2;
            for(let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                this.drawTrackWithBoxes(ctx, (i+1) * height, height, track.name || "", track);
            }
            
            ctx.restore();
            let offset = 25;
            ctx.fillStyle = 'white';
            if(this.name)
                ctx.fillText(this.name, offset + ctx.measureText(this.name).actualBoundingBoxLeft, -this.topMargin*0.4 );
        }


        /** Add a clip to the timeline in a free track slot at the current time
         * @clip: clip to be added
         * @offsetTime: (optional) offset time of current time
         * @callback: (optional) function to call after adding the clip
        */
        addClip( clip, offsetTime = 0, callback = null ) {

            // Update clip information
            let trackIdx = null;
            let newStart = this.currentTime + offsetTime;

            clip.attackPeak += (newStart - clip.start);
            clip.relax += (newStart - clip.start);
            clip.start = newStart;

            // Time slot with other clip?
            let clipInCurrentSlot = null;
            if(!this.animationClip) 
                this.addNewTrack();

            for(let i = 0; i < this.animationClip.tracks.length; i++) {
                clipInCurrentSlot = this.animationClip.tracks[i].clips.find( t => { 
                    return UTILS.compareThresholdRange(this.currentTime, clip.start + clip.duration, t.start, t.start+t.duration);
                    
                });
                if(!clipInCurrentSlot)
                {
                    trackIdx = i;
                    break;
                }
                console.warn("There is already a clip stored in time slot ", clipInCurrentSlot)
            }
            if(trackIdx == undefined)
            {
                // clipIdx = this.animationClip.tracks.length;
                // this.animationClip.tracks.push({clipIdx: clipIdx, clips: []} );
                trackIdx = this.addNewTrack();
            }
            //this.saveState(clipIdx);

            // Find new index
            let newIdx = this.animationClip.tracks[trackIdx].clips.findIndex( t => t.start > this.currentTime );

            // Add as last index
            let lastIndex = false;
            if(newIdx < 0) {
                newIdx = this.animationClip.tracks[trackIdx].clips.length;
                lastIndex = true;
            }

            // Add clip
            const clipsArray = [];
            this.animationClip.tracks[trackIdx].clips.forEach( (a, b) => {
                b == newIdx ? clipsArray.push(clip, a) : clipsArray.push(a);
            } );

            if(lastIndex) {
                clipsArray.push(clip);			
            }

            this.animationClip.tracks[trackIdx].clips = clipsArray;	
            // Move the other's clips properties
            let track = this.animationClip.tracks[trackIdx];
            for(let i = (track.clips.length - 1); i > newIdx; --i) {
                track.edited[i - 1] ? track.edited[i] = track.edited[i - 1] : 0;
            }
            
            // Reset this clip's properties
            track.hovered[newIdx] = undefined;
            track.selected[newIdx] = undefined;
            track.edited[newIdx] = undefined;

            // // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( trackIdx );

            if(this.onSetTime)
                this.onSetTime(this.currentTime);
                
            let end = clip.start + clip.duration;
            
            if( end > this.duration)
                this.setDuration(end);

            if(callback)
                callback();

            return newIdx;
        }

        /** Delete clip from the timeline
         * @clip: clip to be delete
         * @callback: (optional) function to call after deleting the clip
        */
        deleteClip( clip, callback ) {

            let index = -1;
            // Key pressed
            if(!clip && this.selectedClip) {
                clip = this.selectedClip;
            }
            

            let [trackIdx, clipIdx] = clip;
            let clips = this.animationClip.tracks[trackIdx].clips;
            if(clipIdx >= 0)
            {
                clips = [...clips.slice(0, clipIdx), ...clips.slice(clipIdx + 1, clips.length)];
                this.animationClip.tracks[trackIdx].clips = clips;
                if(clips.length)
                {
                    let selectedIdx = 0;
                    for(let i = 0; i < this.lastClipsSelected.length; i++)
                    {
                        let [t,c] = this.lastClipsSelected[i];
                    
                        if( t == trackIdx  && c > clipIdx)
                            this.lastClipsSelected[i][1] = c - 1;
                        if(t == trackIdx && c == clipIdx)
                            selectedIdx = i;
                    }
                    this.lastClipsSelected = [...this.lastClipsSelected.slice(0, selectedIdx), ...this.lastClipsSelected.slice(selectedIdx + 1, this.lastClipsSelected.length)];
                }
                if(callback)
                    callback();
            }
            this.selectedClip = null;
            //this.unSelectAllClips();
            // // Update animation action interpolation info

        }

        
        getCurrentClip( track, time, threshold ) {

            if(!track || !track.clips.length)
            return;

            // Avoid iterating through all timestamps
            if((time + threshold) < track.clips[0])
            return;

            for(let i = 0; i < track.clips.length; ++i) {
                let t = track.clips[i];
                if(t.start + t.duration >= (time - threshold) && 
                    t.start <= (time + threshold)) {
                    return i;
                }
            }

            return;
        };

        unSelectAllClips() {

            for(let [ idx, keyIndex] of this.lastClipsSelected) {
                this.animationClip.tracks[idx].selected[keyIndex]= false;
            }
            // Something has been unselected
            const unselected = this.lastClipsSelected.length > 0;
            this.lastClipsSelected.length = 0;
            this.selectedClip = false;
            return unselected;
        }

        processCurrentClip( e, clipIndex, track, localX, multiple ) {

            e.multipleSelection = multiple;
            clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllClips();
            }
                            
            if(clipIndex == undefined)
                return;

            let currentSelection = [ track.idx, clipIndex];
            // Select if not handled
            this.lastClipsSelected.push( currentSelection );
            track.selected[clipIndex] = true;

            // if( !multiple && this.onSetTime )
            // 	this.onSetTime( track.clips[ clipIndex ] );

            if( this.onSelectClip && this.onSelectClip(track.clips[ clipIndex ])) {
                // Event handled
                return;
            }
        }

        getClipsInRange( track, minTime, maxTime, threshold ) {

            if(!track || !track.clips.length)
            return;

            // Manage negative selection
            if(minTime > maxTime) {
                let aux = minTime;
                minTime = maxTime;
                maxTime = aux;
            }

            // Avoid iterating through all timestamps
            
            if((maxTime + threshold) < track.clips[0].start)
                return;

            let indices = [];

            for(let i = 0; i < track.clips.length; ++i) {
                let t = track.clips[i];
                if((t.start + t.duration <= (maxTime + threshold) || t.start <= (maxTime + threshold)) &&
                    (t.start + t.duration >= (minTime - threshold) || t.start >= (minTime - threshold)) ) 
                {
                    indices.push(i);
                }
            }

            return indices;
        }
    }

    LX.ClipsTimeline = ClipsTimeline;

	const UTILS = {
        getTime() { return new Date().getTime() },
        compareThreshold( v, p, n, t ) { return Math.abs(v - p) >= t || Math.abs(v - n) >= t },
        compareThresholdRange( v0, v1, t0, t1 ) { return v0 > t0 && v0 <= t1 || v1 > t0 && v1 <= t1 }
    };

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );