'use strict';

// Lexgui.js @jxarco

(function(global){

    /**
     * Main namespace
     * @namespace LX
    */

    var LX = global.LX = {
        version: "1.0.0",
        ready: false,
        components: [], // specific pre-build components
        signals: {} // events and triggers
    };

    function clamp (num, min, max) { return Math.min(Math.max(num, min), max) }
    function round(num, n) { return +num.toFixed(n); }
    function deepCopy(o) { return JSON.parse(JSON.stringify(o)) }
    function getExtension(s) { return s.split('.').pop(); }

    LX.getExtension = getExtension;
    LX.deepCopy = deepCopy;

    function setThemeColor(color_name, color)
    {
        var r = document.querySelector(':root');
        r.style.setProperty("--" + color_name, color);
    }

    LX.setThemeColor = setThemeColor;
    
    function getThemeColor(color_name)
    {
        var r = getComputedStyle(document.querySelector(':root'));
        return r.getPropertyValue("--" + color_name);
    }

    LX.getThemeColor = getThemeColor;

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

    let ASYNC_ENABLED = true;

    function doAsync( fn, ms ) {
        if( ASYNC_ENABLED )
            setTimeout( fn, ms ?? 0 );
        else
            fn();
    }

    function set_as_draggable(domEl) {

        let offsetX;
        let offsetY;
        let currentTarget = null;

        domEl.setAttribute('draggable', true);
        domEl.addEventListener("mousedown", function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            currentTarget = e.target.classList.contains('lexdialogtitle') ? e.target : null;
        });
        domEl.addEventListener("dragstart", function(e) {
            // Remove image when dragging
            var img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
            e.dataTransfer.setDragImage(img, 0, 0);
            e.dataTransfer.effectAllowed = "move";
            if(!currentTarget) return;
            const rect = e.target.getBoundingClientRect();
            offsetX = e.clientX - rect.x;
            offsetY = e.clientY - rect.y;
            e.dataTransfer.setData('branch_title', e.target.querySelector(".lexdialogtitle").innerText);
            e.dataTransfer.setData('dialog_id', e.target.id);
        });
        domEl.addEventListener("drag", function(e) {
            if(!currentTarget) return;
            e.preventDefault();
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            if(left > 0 && (left + this.offsetWidth + 6) <= window.innerWidth)
                this.style.left = left + 'px';
            if(top > 0 && (top + this.offsetHeight + 6) <= window.innerHeight)
                this.style.top = top + 'px';
        }, false );
        domEl.addEventListener("dragend", function(e) {
            currentTarget = null;
        }, false );
    }

    function create_global_searchbar( root ) {

        let global_search = document.createElement("div");
        global_search.id = "global_search";
        global_search.className = "hidden";
        global_search.tabIndex = -1;
        root.appendChild( global_search );

        let allItems = [];
        let hoverElId = null;

        global_search.addEventListener('keydown', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            hoverElId = hoverElId ?? -1;
            if( e.key == 'Escape' ) {
                this.classList.add("hidden");
                reset_bar(true);
            }
            else if( e.key == 'Enter' ) {
                const el = allItems[ hoverElId ];
                if(el) {
                    const is_checkbox = (el.item.type && el.item.type === 'checkbox');
                    this.classList.toggle('hidden');
                    if(is_checkbox)  {
                        el.item.checked = !el.item.checked;
                        el.callback.call(window, el.item.checked, el.entry_name);
                    }
                    else
                        el.callback.call(window, el.entry_name);
                }
            }
            else if ( e.key == 'ArrowDown' && hoverElId < (allItems.length - 1) ) {
                hoverElId++;
                global_search.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
                allItems[ hoverElId ].classList.add('hovered');

                let dt = allItems[ hoverElId ].offsetHeight * (hoverElId + 1) - itemContainer.offsetHeight;
                if( dt > 0) {
                    itemContainer.scrollTo({
                        top: dt,
                        behavior: "smooth",
                    });
                }

            } else if ( e.key == 'ArrowUp' && hoverElId > 0 ) {
                hoverElId--;
                global_search.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
                allItems[ hoverElId ].classList.add('hovered');
            }
        });

        global_search.addEventListener('focusout', function(e) {
           if(e.relatedTarget == e.currentTarget) return;
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.classList.add("hidden");
            reset_bar(true);
        });

        root.addEventListener('keydown', e => {
            if( e.key == ' ' && e.ctrlKey ) {
                e.stopImmediatePropagation();
                e.stopPropagation();
                global_search.classList.toggle('hidden');
                global_search.querySelector('input').focus();
                add_elements(undefined);
            }
        });

        let icon = document.createElement("a");
        icon.className = "fa-solid fa-magnifying-glass";

        let input = document.createElement("input");
        input.placeholder = "Search menus...";
        input.value = "";

        let itemContainer = document.createElement("div");
        itemContainer.className = "searchitembox";

        let ref_previous;

        const reset_bar = (reset_input) => {
            itemContainer.innerHTML = "";
            allItems.length = 0;
            hoverElId = null;
            if(reset_input) input.value = "";
        }

        const add_element = (t, c, p, i) => {
            if(!t.length) return;

            if(ref_previous) ref_previous.classList.remove('last');

            let searchItem = document.createElement("div");
            searchItem.className = "searchitem last";
            const is_checkbox = (i.type && i.type === 'checkbox');
            if(is_checkbox) {
                searchItem.innerHTML = "<a class='fa fa-check'></a><span>" + p + t + "</span>"
            } else {
                searchItem.innerHTML = p + t;
            }
            searchItem.entry_name = t;
            searchItem.callback = c;
            searchItem.item = i;
            searchItem.addEventListener('click', function(e) {
                this.callback.call(window, this.entry_name);
                global_search.classList.toggle('hidden');
                reset_bar(true);
            });
            searchItem.addEventListener('mouseenter', function(e) {
                global_search.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
                this.classList.add('hovered');
                hoverElId = allItems.indexOf(this);
            });
            searchItem.addEventListener('mouseleave', function(e) {
                this.classList.remove('hovered');
            });
            allItems.push( searchItem );
            itemContainer.appendChild(searchItem);
            ref_previous = searchItem;
        }

        const propagate_add = ( item, filter, path ) => {

            const key = Object.keys(item)[0];
            if( (path + key).toLowerCase().includes(filter) ) {
                if(item.callback)
                    add_element(key, item.callback, path, item);
            }

            path += key + " > ";

            for( let c of item[key] )
                propagate_add( c, filter, path );
        };

        const add_elements = filter => {
            
            reset_bar();

            for( let m of LX.menubars )
                for( let i of m.items ) {
                    propagate_add( i, filter, "");
                }
        }

        input.addEventListener('input', function(e) {
            add_elements( this.value.toLowerCase() );
        });
        
        global_search.appendChild(icon);
        global_search.appendChild(input);
        global_search.appendChild(itemContainer);

        return global_search;
    }

    /**
     * @method init
     * @param {*} options 
     * container: Root location for the gui (default is the document body)
     * skip_default_area: Skip creation of main area
     */

    function init(options = {})
    {
        if(this.ready)
            return this.main_area;

        // LexGUI root 
		var root = document.createElement("div");
		root.id = "lexroot";
        root.tabIndex = -1;
        
        var modal = document.createElement("div");
        modal.id = "modal";

        this.modal = modal;
        this.root = root;
        this.container = document.body;

        this.modal.toggleAttribute('hidden', true);
        this.modal.toggle = function(force) { this.toggleAttribute('hidden', force); };

        if(options.container)
            this.container = document.getElementById(options.container);
            
        this.global_search = create_global_searchbar( this.container );

        this.container.appendChild( modal );
        this.container.appendChild( root );

        // Disable drag icon
        root.addEventListener("dragover", function(e) {
            e.preventDefault();
        }, false );

        // CSS fontawesome
        var head = document.getElementsByTagName('HEAD')[0];
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://use.fontawesome.com/releases/v6.4.2/css/all.css';
        head.appendChild(link);

        // Global vars
        this.DEFAULT_NAME_WIDTH     = "30%";
        this.DEFAULT_SPLITBAR_SIZE  = 4;
        this.OPEN_CONTEXTMENU_ENTRY = 'click';

        this.ready = true;
        this.menubars = [];

        if(!options.skip_default_area)
            this.main_area = new Area( {id: options.id ?? "mainarea"} );

        return this.main_area;
    }

    LX.init = init;

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

        options.modal = true;

        return new Dialog(title, p => {
            p.addTextArea(null, text, null, { disabled: true });
        }, options);
    }

    LX.message = message;

    /**
     * @method prompt
     * @param {String} text 
     * @param {String} title (Optional)
     * @param {*} options 
     * id: Id of the prompt dialog
     * position: Dialog position in screen [screen centered]
     * draggable: Dialog can be dragged [false]
     * input: If false, no text input appears
     */

    function prompt(text, title, callback, options = {})
    {
        options.modal = true;

        let value = "";

        const dialog = new Dialog(title, p => {
            p.addTextArea(null, text, null, { disabled: true });
            if(options.input != false)
                p.addText(null, options.input || value, (v) => value = v, {placeholder: "..."} );
            p.sameLine(2);
            p.addButton(null, "OK", () => { callback.call(this, value); dialog.close() }, { buttonClass: "accept" });
            p.addButton(null, "Cancel", () => {if(options.on_cancel) options.on_cancel(); dialog.close();} );
        }, options);

        // Focus text prompt
        if(options.input != false)
            dialog.root.querySelector('input').focus();
        
        return dialog;
    }

    LX.prompt = prompt;

    /*
    *   Events and Signals
    */

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
        static NODE_DELETED         = 2;
        static NODE_DBLCLICKED      = 3;
        static NODE_CONTEXTMENU     = 4;
        static NODE_DRAGGED         = 5;
        static NODE_RENAMED         = 6;
        static NODE_VISIBILITY      = 7;
        static NODE_CARETCHANGED    = 8;

        constructor( type, node, value ) {
            this.type = type || TreeEvent.NONE;
            this.node = node;
            this.value = value;
            this.multiple = false; // Multiple selection
        }
        
        string() {
            switch(this.type) {
                case TreeEvent.NONE: return "tree_event_none";
                case TreeEvent.NODE_SELECTED: return "tree_event_selected";
                case TreeEvent.NODE_DELETED: return "tree_event_deleted";
                case TreeEvent.NODE_DBLCLICKED:  return "tree_event_dblclick";
                case TreeEvent.NODE_CONTEXTMENU:  return "tree_event_contextmenu";
                case TreeEvent.NODE_DRAGGED: return "tree_event_dragged";
                case TreeEvent.NODE_RENAMED: return "tree_event_renamed";
                case TreeEvent.NODE_VISIBILITY: return "tree_event_visibility";
                case TreeEvent.NODE_CARETCHANGED: return "tree_event_caretchanged";
            }
        }
    };

    LX.TreeEvent = TreeEvent;

    function emit( signal_name, value, target )
    {
        const data = LX.signals[ signal_name ];

        if( !data )
        return;

        if( target )
        {
            if(target[signal_name]) target[signal_name].call(target, value);
            return;
        }

        for( let obj of data )
        {
            if( obj.constructor === Widget )
            {
                obj.set( value );
                
                if(obj.options && obj.options.callback)
                    obj.options.callback(value, data);
            }else
            {
                obj[signal_name].call(obj, value);
            }
        }
    }

    LX.emit = emit;

    function addSignal( name, obj, callback )
    {
        obj[name] = callback;

        if( !LX.signals[ name ] )
            LX.signals[ name ] = [];
        
        if( LX.signals[ name ].indexOf( obj ) > -1 )
            return;

        LX.signals[ name ].push( obj );
    }

    LX.addSignal = addSignal;

    /*
    *   DOM Elements
    */

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
    
            this.offset = 0;
            this.root = root;
            this.size = [ this.root.offsetWidth, this.root.offsetHeight ];
            this.sections = [];
            this.panels = [];
    
            if(!options.no_append) {
                var lexroot = document.getElementById("lexroot");
                lexroot.appendChild( this.root );
            }

            let overlay = options.overlay;

            if(overlay)
            {
                this.root.classList.add("overlay-" + overlay);

                if(options.resize)
                {                  
                    this.split_bar = document.createElement("div");
                    let type = overlay == "left" || overlay == "right" ? "horizontal" : "vertical";
                    this.type = overlay;;
                    this.split_bar.className = "lexsplitbar " + type;
                    if(overlay == "right") {
                        this.split_bar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                        this.split_bar.style.left = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                    } 
                    else if(overlay == "left") {
                        let size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientWidth);
                        this.split_bar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                        this.split_bar.style.left = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                    }
                    else if (overlay == "top") {
                        let size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientHeight);
                        this.split_bar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                        this.split_bar.style.top = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                    }
                    else if(overlay == "bottom") {
                        this.split_bar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                        this.split_bar.style.top = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                    }

                    this.split_bar.addEventListener("mousedown", inner_mousedown);
                    this.root.appendChild(this.split_bar);
                    
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
                        switch(that.type) {
                            case "right":
                                var dt = (last_pos[0] - e.x);
                                var size = (that.root.offsetWidth + dt);
                                that.root.style.width = size + "px";
                                break;
                            
                            case "left":
                                var dt = (last_pos[0] - e.x);
                                var size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetWidth - dt));
                                that.root.style.width = size + "px";
                                that.split_bar.style.left = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                                break;
                            
                            case "top":
                                var dt = (last_pos[1] - e.y);
                                var size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetHeight - dt));
                                that.root.style.height = size + "px";
                                that.split_bar.style.top = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                                break;

                            case "bottom":
                                var dt = (last_pos[1] - e.y);
                                var size = (that.root.offsetHeight + dt);
                                that.root.style.height = size + "px";
                                break;
                        }
                        
                        last_pos[0] = e.x;
                        last_pos[1] = e.y;
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Resize events   
                        if(that.onresize)
                            that.onresize( that.root.getBoundingClientRect() );
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
                this.offset = this.root.childNodes[0].offsetHeight; // store offset to take into account when resizing
                this._root = this.sections[0].root;
                this.root = this.sections[1].root;
            }

            var type = options.type || "horizontal";
            var sizes = options.sizes || ["50%", "50%"];
            var infer_height = false;
            var auto = options.sizes === 'auto';

            if( !sizes[1] )
            {
                let size = sizes[0];
                let margin = options.top ? options.top : 0;
                if(size.constructor == Number) {
                    size += margin;
                    size += "px";
                }
                
                sizes[1] = "calc( 100% - " + size + " )";
                infer_height = true;
            }

            // Create areas
            var area1 = new Area({className: "split" + (options.menubar ? "" : " origin")});
            var area2 = new Area({className: "split"});

            area1.parentArea = this;
            area2.parentArea = this;

            var resize = options.resize ?? true;
            var data = "0px";
            
            this.offset = 0;

            if(resize)
            {
                this.resize = resize;
                this.split_bar = document.createElement("div");
                this.split_bar.className = "lexsplitbar " + type;

                if(type == "horizontal") {
                    this.split_bar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    // this.split_bar.style.left = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                }
                else {
                    this.split_bar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    // this.split_bar.style.top = -LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                }
                this.split_bar.addEventListener("mousedown", inner_mousedown);
                data = LX.DEFAULT_SPLITBAR_SIZE/2 + "px"; // updates
            }

            let minimizable = options.minimizable ?? false;

            if(minimizable) {

                // Keep state of the animation when ends...
                area2.root.addEventListener('animationend', e => {
                    const opacity = getComputedStyle(area2.root).opacity;
                    area2.root.classList.remove( e.animationName + "-" + type );
                    area2.root.style.opacity = opacity;
                    flushCss(area2.root);
                });

                this.min = document.createElement("div");
                this.min.className = "lexmin " + type + " fa-solid";
                if(type == "horizontal") 
                    this.min.classList.add("fa-angle-right");
                else
                    this.min.classList.add("fa-angle-down");

                this.min.addEventListener("mousedown", (e) => {
                    // Fade out to down
                    if(this.min.classList.contains("fa-angle-down")) this.minimize();
                    // Fade in from down
                    else if(this.min.classList.contains("fa-angle-up")) this.maximize();
                    // Fade out to right
                    else if(this.min.classList.contains("fa-angle-right")) this.minimize();
                    // Fade in from right
                    else if(this.min.classList.contains("fa-angle-left")) this.maximize();
                });
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
            else // vertical
            {
                area1.root.style.width = "100%";
                area2.root.style.width = "100%";

                if(auto)
                {
                    area1.root.style.height = "auto";

                    // Listen resize event on first area
                    const resizeObserver = new ResizeObserver((entries) => {
                        for (const entry of entries) {
                            const bb = entry.contentRect;
                            area2.root.style.height = "calc(100% - " + ( bb.height + 4) + "px )";
                        }
                    });

                    resizeObserver.observe(area1.root);
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
                    
                    // Check for menubar to add more offset
                    if(!infer_height && this.root.parentElement.parentElement.children.length) {
                        const item = this.root.parentElement.parentElement.children[0];
                        const menubar = item.querySelector('.lexmenubar');
                        if(menubar)
                            data = parseInt(data) + menubar.offsetHeight + "px";
                    }
    
                    area2.root.style.height = "calc( " + height2 + " - " + data + " )";
                }
            }

            this.root.appendChild( area1.root );

            if(resize) 
            {
                this.root.appendChild(this.split_bar);
            }

            if(minimizable)
            {
                area2.root.appendChild(this.min);
            }

            this.root.appendChild( area2.root );
            this.sections = [area1, area2];
            this.type = type;

            // Update sizes
            this._update();

            if(!resize)
            {
                return this.sections;
            }

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
                    that._moveSplit(last_pos[0] - e.x);
                        
                }
                else {
                    that._moveSplit(last_pos[1] - e.y);
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

            // Is this necessary?..
            // setTimeout( () => this._moveSplit(0), 100);

            return this.sections;
        }

        /**
        * @method resize
        * Resize element
        */
        setSize(size) {
            
            let [width, height] = size;
    
            if(width != undefined && width.constructor == Number)
                width += "px";
            if(height != undefined && height.constructor == Number)
                height += "px";
    
            if(width)
                this.root.style.width = width;
            if(height)
                this.root.style.height = height;

            this.size = [this.root.clientWidth, this.root.clientHeight];

            this.propagateEvent("onresize");
        }

         /**
        * @method minimize
        * Hide element
        */
        minimize() {

            if(!this.min)
                return;

            let [area1, area2] = this.sections;

            if(this.min.classList.contains("vertical") && this.min.classList.contains("fa-angle-down")) {
                this.min.classList.remove("fa-angle-down");
                this.min.classList.add("fa-angle-up");
                this.offset = area2.root.offsetHeight - this.min.offsetHeight;
                area2.root.classList.add("fadeout-vertical");
                this._moveSplit(-Infinity, true, this.min.offsetHeight); // Force some height here...

            }
            else if(this.min.classList.contains("horizontal") && this.min.classList.contains("fa-angle-right")) {
                this.min.classList.remove("fa-angle-right");
                this.min.classList.add("fa-angle-left");
                this.offset = area2.root.offsetWidth;
                area2.root.classList.add("fadeout-horizontal");
                this._moveSplit(-Infinity, true);
            }

            // Set min icon to the parent
            this.root.insertChildAtIndex( this.min, 2 );

            // Async resize in some ms...
            doAsync( () => this.propagateEvent('onresize'), 150 );
        }

        /**
        * @method maximize
        * Show element if it is hidden
        */
        maximize() {

            if(!this.min)
                return;
            
            let [area1, area2] = this.sections;

            if(this.min.classList.contains("vertical") && this.min.classList.contains("fa-angle-up")) {
                this.min.classList.remove("fa-angle-up");
                this.min.classList.add("fa-angle-down");
                area2.root.classList.add("fadein-vertical");
                this._moveSplit(this.offset);
            }
            else if(this.min.classList.contains("horizontal") && this.min.classList.contains("fa-angle-left")) {
                this.min.classList.remove("fa-angle-left");
                this.min.classList.add("fa-angle-right");
                area2.root.classList.add("fadein-horizontal");
                this._moveSplit(this.offset);
            }

            // Set min icon to the minimizable area
            area2.root.insertChildAtIndex( this.min, 0 );

            // Async resize in some ms...
            doAsync( () => this.propagateEvent('onresize'), 150 );
        }

        /**
        * @method hide
        * Hide element
        */
        hide() {
            this.root.classList.add("hidden");
        }

        /**
        * @method show
        * Show element if it is hidden
        */
        show() {
            this.root.classList.remove("hidden");
        }

        /**
        * @method toggle
        * Toggle element if it is hidden
        */
        toggle( force ) {
            this.root.classList.toggle("hidden", force);
        }

        /**
         * @method propagateEvent
         */

        propagateEvent( eventName ) {

            for(var i = 0; i < this.sections.length; i++)
            {
                const area = this.sections[i];
                if(area[ eventName ])
                    area[ eventName ].call( this, area.root.getBoundingClientRect() );
                area.propagateEvent( eventName );
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
            this.panels.push( panel );
            return panel;
        }

        /**
         * @method addMenubar
         * @param {Function} callback Function to fill the menubar
         * @param {*} options:
         * float: Justify content (left, center, right) [left]
         */

        addMenubar( callback, options = {} ) {
            
            let menubar = new Menubar(options);
            LX.menubars.push( menubar );

            if(callback) callback( menubar );

            // Hack to get content height
            // let d = document.createElement('div');
            // d.appendChild(menubar.root);
            // document.body.appendChild(d);
            // const height = menubar.root.clientHeight;
            // d.remove();
            const height = 48; // pixels

            const [bar, content] = this.split({type: 'vertical', sizes: [height, null], resize: false, menubar: true});
            bar.attach( menubar );
            bar.is_menubar = true;
            window.content = content;
            return menubar;
        }

        /**
         * @method addOverlayButtons
         * @param {Array} buttons Buttons info
         * @param {*} options:
         * float: Where to put the buttons (h: horizontal, v: vertical, t: top, m: middle, b: bottom, l: left, c: center, r: right) [htc]
         */

        addOverlayButtons( buttons, options = {} ) {
            
            // Add to last split section if area has been split
            if(this.sections.length) {
                this.sections[1].addOverlayButtons(  buttons, options );
                return;
            }

            console.assert( buttons.constructor == Array && buttons.length );

            // Set area to relative to use local position
            this.root.style.position = "relative";

            options.className = "lexoverlaybuttons";
            options.width = "calc( 100% - 24px )";
            options.height = "auto";

            const float = options.float;

            if( float )
            {
                for( var i = 0; i < float.length; i++ )
                {
                    const t = float[i];
                    switch( t )
                    {
                    case 'h': break;
                    case 'v': options.className += " vertical"; break;
                    case 't': break;
                    case 'm': options.className += " middle"; break;
                    case 'b': options.className += " bottom"; break;
                    case 'l': break;
                    case 'c': options.className += " center"; break;
                    case 'r': options.className += " right"; break;
                    }
                }
            }

            let overlayPanel = this.addPanel( options );
            let overlaygroup;
            
            const add_button = function(b, group, last) {

                const _options = { 
                    width: "auto", 
                    selectable: b.selectable,
                    selected: b.selected,
                    icon: b.icon,
                    img: b.img
                };

                if( group )
                {
                    if(!overlaygroup) {
                        overlaygroup = document.createElement('div');
                        overlaygroup.className = "lexoverlaygroup";
                        overlayPanel.queuedContainer = overlaygroup;
                    }

                    _options.parent = overlaygroup;
                }

                let callback = b.callback;

                if( b.options )
                {
                    callback = function(value, event) {
                        LX.addContextMenu(null, event, function(c) {
                            for( let o of b.options )
                                c.add(o, () => {
                                    if( b.name == o ) return;
                                    b.name = o;
                                    b.callback( o );
                                    refresh_panel();
                                });
                        });
                    };
                }

                overlayPanel.addButton( null, b.name, function(value, event) {
                    if(b.selectable) {
                        if( b.group ) {
                            let _prev = b.selected;
                            b.group.forEach( sub => sub.selected = false );
                            b.selected = !_prev;
                        }
                        else
                            b.selected = !b.selected;
                    }
                    callback( value, event );
                }, _options );

                // ends the group
                if(overlaygroup && last)
                {
                    overlayPanel.root.appendChild( overlaygroup );
                    overlaygroup = null;
                    overlayPanel.clearQueue();
                }
            }

            const refresh_panel = function() {

                overlayPanel.clear();

                for( let b of buttons )
                {
                    if( b.constructor === Array )
                    {
                        for( let i = 0; i < b.length; ++i )
                        {
                            let sub = b[i];
                            sub.group = b;
                            add_button(sub, true, i == (b.length - 1));
                        }
                    }else
                    {
                        add_button(b);
                    }
    
                }

                // Add floating info
                if( float )
                {
                    var height = 0;
                    overlayPanel.root.childNodes.forEach( c => { height += c.offsetHeight; } );

                    if( options.className.includes("middle") )
                    {
                        overlayPanel.root.style.top = "-moz-calc( 50% - " + (height * 0.5) + "px )";
                        overlayPanel.root.style.top = "-webkit-calc( 50% - " + (height * 0.5) + "px )";
                        overlayPanel.root.style.top = "calc( 50% - " + (height * 0.5) + "px )";
                    }
                }
            }

            refresh_panel();
        }

        /**
         * @method addTabs
         * @param {*} options:
         */

        addTabs( options = {} ) {

            const tabs = new Tabs( this, options );

            if( options.folding )
            {
                this.parentArea._disableSplitResize();
                // Compensate split bar...
                this.root.style.paddingTop = "4px"; 
            }

            return tabs;
        }

        _moveSplit( dt, force_animation = false, force_width = 0 ) {

            if(!this.type)
                throw("No split area");

            if(dt === undefined) // splitbar didn't move!
                return;

            var a1 = this.sections[0];
            var a2 = this.sections[1];
            var splitinfo = " - "+ LX.DEFAULT_SPLITBAR_SIZE + "px";

            let transition = null;
            if( !force_animation )
            {
                // Remove transitions for this change..
                transition = a1.root.style.transition;
                a1.root.style.transition = a2.root.style.transition = "none";
                flushCss(a1.root);
                flushCss(a2.root);
            }

            if(this.type == "horizontal") {

                var size = Math.max(a2.root.offsetWidth + dt,  0);
                if( force_width ) size = force_width;
				a1.root.style.width = "-moz-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.width = "-webkit-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.width = "calc( 100% - " + size + "px " + splitinfo + " )";
				a2.root.style.width = size + "px"; //other split
            }
            else {

                var size = Math.max((a2.root.offsetHeight + dt) + a2.offset,  0);
                if( force_width ) size = force_width;
				a1.root.style.height = "-moz-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.height = "-webkit-calc( 100% - " + size + "px " + splitinfo + " )";
				a1.root.style.height = "calc( 100% - " + size + "px " + splitinfo + " )";
				a2.root.style.height = ( size - a2.offset ) + "px"; //other split
            }
                
            if( !force_animation )
            {
                // Reapply transitions
                a1.root.style.transition = a2.root.style.transition = transition;
            }

            this._update();

            // Resize events   
            this.propagateEvent( 'onresize' );
        }

        _disableSplitResize() {

            this.resize = false;
            this.split_bar.remove();
            delete this.split_bar;
        }

        _update() {

            const rect = this.root.getBoundingClientRect();

            this.size = [ rect.width, rect.height ];

            for(var i = 0; i < this.sections.length; i++) {
                this.sections[i]._update();
            }
        }
    };

    LX.Area = Area;

    function flushCss(element) {
        // By reading the offsetHeight property, we are forcing
        // the browser to flush the pending CSS changes (which it
        // does to ensure the value obtained is accurate).
        element.offsetHeight;
    }

    /**
     * @class Tabs
     */

    class Tabs {

        static TAB_SIZE = 28;
        static TAB_ID   = 0;

        constructor( area, options = {} )  {

            this.onclose = options.onclose;

            let container = document.createElement('div');
            container.className = "lexareatabs " + (options.fit ? "fit" : "row");
            
            const folding = options.folding ?? false;
            if(folding) container.classList.add("folding");

            let that = this;

            container.addEventListener("dragenter", function(e) {
                e.preventDefault(); // Prevent default action (open as link for some elements)
                this.classList.add("dockingtab");
            });

            container.addEventListener("dragleave", function(e) {
                e.preventDefault(); // Prevent default action (open as link for some elements)
                this.classList.remove("dockingtab");
            });

            container.addEventListener("drop", function(e) {
                e.preventDefault(); // Prevent default action (open as link for some elements)

                const tab_id = e.dataTransfer.getData("source");
                const el = document.getElementById(tab_id);
                if( !el ) return;

                // Append tab and content
                this.appendChild( el );
                const content = document.getElementById(tab_id + "_content");
                that.area.attach( content );
                this.classList.remove("dockingtab");

                // Change tabs instance
                LX.emit( "@on_tab_docked", el.instance );
                el.instance = that;

                // Show on drop
                el.click();
                
                // Store info
                that.tabs[ el.dataset["name"] ] = content;
            });

            area.root.classList.add( "lexareatabscontainer" );

            area.split({type: 'vertical', sizes: "auto", resize: false, top: 6});
            area.sections[0].attach( container );

            this.area = area.sections[1];
            this.area.root.className += " lexareatabscontent";
            this.selected = null;
            this.root = container;
            this.tabs = {};
            this.tabDOMs = {};

            // debug
            if(folding) 
            {
                this.folded = true;
                this.folding = folding;
                
                if(folding == "up") area.root.insertChildAtIndex(area.sections[1].root, 0);

                // // Add fold back button

                // let btn = document.createElement('button');
                // btn.className = "lexbutton foldback";
                // btn.innerHTML = "<a class='fa-solid fa-x'></a>";
                // this.area.root.appendChild(btn);

                // btn.addEventListener('click', e => {
                //     this.area.hide();
                //     this.folded = true;
                // });

                // Listen resize event on parent area
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const bb = entry.contentRect;
                        const sibling = area.parentArea.sections[0].root;
                        const add_offset = true; // hardcoded...
                        sibling.style.height = "calc(100% - " + ((add_offset ? 42 : 0) + bb.height) + "px )";
                    }
                });

                resizeObserver.observe(this.area.root);
                this.area.root.classList.add('folded');
            }
        }

        add( name, content, isSelected, callback, options = {} ) {

            if( isSelected ) {
                this.root.querySelectorAll('span').forEach( s => s.classList.remove('selected'));
                this.area.root.querySelectorAll('.lextabcontent').forEach( c => c.style.display = 'none');
            }
            
            isSelected = !Object.keys( this.tabs ).length && !this.folding ? true : isSelected;

            let contentEl = content.root ? content.root : content;
            contentEl.style.display = isSelected ? "block" : "none";
            contentEl.classList.add("lextabcontent");

            // Create tab
            let tabEl = document.createElement('span');
            tabEl.dataset["name"] = name;
            tabEl.className = "lexareatab" + (isSelected ? " selected" : "");
            tabEl.innerHTML = name;
            tabEl.id = name.replace(/\s/g, '') + Tabs.TAB_ID++;
            tabEl.title = options.title;
            tabEl.selected = isSelected ?? false;
            tabEl.fixed = options.fixed;
            if(tabEl.selected)
                this.selected = name;
            tabEl.instance = this;
            contentEl.id = tabEl.id + "_content";

            LX.addSignal( "@on_tab_docked", tabEl, function() {
                if( this.parentElement.childNodes.length == 1 ){
                    this.parentElement.childNodes[0].click(); // single tab!!
                } 
            } );
            
            tabEl.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();

                if( !tabEl.fixed )
                {
                    // For folding tabs
                    const lastValue = tabEl.selected;
                    tabEl.parentElement.querySelectorAll('span').forEach( s => s.selected = false );
                    tabEl.selected = !lastValue; 
                    // Manage selected
                    tabEl.parentElement.querySelectorAll('span').forEach( s => s.classList.remove('selected'));
                    tabEl.classList.toggle('selected', (this.folding && tabEl.selected));
                    // Manage visibility 
                    tabEl.instance.area.root.querySelectorAll('.lextabcontent').forEach( c => c.style.display = 'none');
                    contentEl.style.display = "block";
                    tabEl.instance.selected = tabEl.dataset.name;
                }

                if( this.folding )
                {
                    this.folded = tabEl.selected;
                    this.area.root.classList.toggle('folded', !this.folded);
                }

                if(options.onSelect) 
                    options.onSelect(e, tabEl.dataset.name);
            });

            tabEl.addEventListener("mouseup", e => {
                e.preventDefault();
                e.stopPropagation();
                if(e.button == 1 ) {
                    if(this.onclose)
                        this.onclose( tabEl.dataset["name"] );
                    this.delete( tabEl.dataset["name"] );
                }
            });
            
            tabEl.setAttribute('draggable', true);
            tabEl.addEventListener("dragstart", function(e) {
                if( this.parentElement.childNodes.length == 1 ){
                    e.preventDefault();
                    return;
                } 
                e.dataTransfer.setData("source", e.target.id);
            });
            
            // Attach content
            this.root.appendChild( tabEl );
            this.area.attach( contentEl );
            this.tabDOMs[ name ] = tabEl;
            this.tabs[ name ] = content;

            setTimeout( () => {
                if( callback ) callback.call(this, this.area.root.getBoundingClientRect());
            }, 10 );
        }

        select( name ) {

            if(!this.tabDOMs[ name ] )
            return;

            this.tabDOMs[ name ].click();
        }

        delete( name ) {

            const tabEl = this.tabDOMs[ name ];

            if(!tabEl || tabEl.fixed)
            return;

            // Delete tab element
            this.tabDOMs[ name ].remove();
            delete this.tabDOMs[ name ];

            // Delete content
            this.tabs[ name ].remove();
            delete this.tabs[ name ];

            // Select last tab
            const last_tab = this.root.lastChild;
            if(last_tab && !last_tab.fixed)
                this.root.lastChild.click();
        }

    }

    LX.Tabs = Tabs;

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
                        item[ 'type' ] = options.type;
                        item[ 'checked' ] = options.checked;
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
                let pKey = key.replace(/\s/g, '').replaceAll('.', '');

                // Item already created
                if( this.root.querySelector("#" + pKey) )
                    continue;   

                let entry = document.createElement('div');
                entry.className = "lexmenuentry";
                entry.id = pKey;
                entry.innerText = key;
                if(options.position == "left") {	
                    this.root.prepend( entry );	
                }	
                else {	
                    if(options.position == "right") 	
                        entry.right = true;	
                    if(this.root.lastChild && this.root.lastChild.right) {	
                        this.root.lastChild.before( entry );	
                    }	
                    else {	
                        this.root.appendChild( entry );	
                    }	
                }

                const create_submenu = function( o, k, c, d ) {

                    let contextmenu = document.createElement('div');
                    contextmenu.className = "lexcontextmenu";
                    contextmenu.tabIndex = "0";
                    const isSubMenu = c.classList.contains('lexcontextmenuentry');
                    var rect = c.getBoundingClientRect();
                    contextmenu.style.left = (isSubMenu ? rect.width : rect.left) + "px";
                    // Entries use css to set top relative to parent
                    contextmenu.style.top = (isSubMenu ? 0 : rect.bottom) + "px";
                    c.appendChild( contextmenu );

                    contextmenu.focus();

                    rect = contextmenu.getBoundingClientRect();

                    for( var i = 0; i < o[k].length; ++i )
                    {
                        const subitem = o[k][i];
                        const subkey = Object.keys(subitem)[0];
                        const hasSubmenu = subitem[ subkey ].length;
                        const is_checkbox = subitem[ 'type' ] == 'checkbox';
                        let subentry = document.createElement('div');
                        subentry.className = "lexcontextmenuentry";
                        subentry.className += (i == o[k].length - 1 ? " last" : "");
                        if(subkey == '')
                            subentry.className = " lexseparator";
                        else {
                            
                            subentry.id = subkey;
                            let subentrycont = document.createElement('div');
                            subentrycont.innerHTML = "";
                            subentrycont.classList = "lexcontextmenuentrycontainer";
                            subentry.appendChild(subentrycont);
                            const icon = that.icons[ subkey ];
                            if(is_checkbox){
                                subentrycont.innerHTML += "<input type='checkbox' >";
                            }else if(icon) {
                                subentrycont.innerHTML += "<a class='" + icon + " fa-sm'></a>";
                            }else {
                                subentrycont.innerHTML += "<a class='fa-solid fa-sm noicon'></a>";
                                subentrycont.classList.add( "noicon" );

                            }
                            subentrycont.innerHTML += "<div class='lexentryname'>" + subkey + "</div>";
                        }

                        let checkbox_input = subentry.querySelector('input');
                        if(checkbox_input) {
                            checkbox_input.checked = subitem.checked ?? false;
                            checkbox_input.addEventListener('change', (e) => {
                                subitem.checked = checkbox_input.checked;
                                const f = subitem[ 'callback' ];
                                if(f) {
                                    f.call( this, subitem.checked, subkey, subentry );
                                    that.root.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());  
                                } 
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                            })
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
                            if(checkbox_input) {
                                subitem.checked = !subitem.checked;
                            }
                            const f = subitem[ 'callback' ];
                            if(f) {
                                f.call( this, checkbox_input ? subitem.checked : subkey, checkbox_input ? subkey : subentry );
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
         * @method getSubitems: recursive method to find subentries of a menu entry
         * @param {Object} item: parent item
         * @param {Array} tokens: split path strings
        */
        getSubitem(item, tokens) {
           
            let subitem = null;
            let path = tokens[0];
            for(let i = 0; i < item.length; i++) {
                if(item[i][path]) {

                    if(tokens.length == 1) {
                        subitem = item[i];
                        return subitem;
                    }
                    else {
                        tokens.splice(0,1);
                        return this.getSubitem(item[i][path], tokens);
                    }
                     
                }
            }
        }

        /**
         * @method getItem
         * @param {String} path
        */
        getItem( path ) {
            // process path
            const tokens = path.split("/");
            
            return this.getSubitem(this.items, tokens)
        }

        /**
         * @method setButtonIcon
         * @param {String} title
         * @param {String} icon
         */

        setButtonIcon( title, icon, callback, options = {} ) {

            const button = this.buttons[ title ];
            if(button) {

                button.querySelector('a').className = "fa-solid" + " " + icon + " lexicon";
            }
            else {
                let button = document.createElement('div');
                const disabled = options.disabled ?? false;
                button.className = "lexmenubutton" + (disabled ? " disabled" : "");
                button.title = title ?? "";
                button.innerHTML = "<a class='" + icon + " lexicon' style='font-size:x-large;'></a>";
                button.style.padding = "5px 10px";
                button.style.maxHeight = "calc(100% - 10px)";
                button.style.alignItems = "center";

                if(options.float == "right")	
                    button.right = true;	
                if(this.root.lastChild && this.root.lastChild.right) {	
                    this.root.lastChild.before( button );	
                }
                else if(options.float == "left") {
                    this.root.prepend(button);
                }	
                else {	
                    this.root.appendChild( button );	
                }
    
                const _b = button.querySelector('a');
                _b.addEventListener("click", (e) => {
                    if(callback && !disabled)
                        callback.call( this, _b, e );
                });
            }
        }

        /**
         * @method setButtonImage
         * @param {String} title
         * @param {String} src
         */

        setButtonImage( title, src, callback, options = {} ) {
            const button = this.buttons[ title ];
            if(button) {

                button.querySelector('a').className = "fa-solid" + " " + icon + " lexicon";
            }
            else {
                let button = document.createElement('div');
                const disabled = options.disabled ?? false;
                button.className = "lexmenubutton" + (disabled ? " disabled" : "");
                button.title = title ?? "";
                button.innerHTML = "<a><image src='" + src + "' class='lexicon' style='height:32px;'></a>";
                button.style.padding = "5px";
                button.style.alignItems = "center";

                if(options.float == "right")	
                    button.right = true;	
                if(this.root.lastChild && this.root.lastChild.right) {	
                    this.root.lastChild.before( button );	
                }	
                else if(options.float == "left") {
                    this.root.prepend(button);
                }
                else {	
                    this.root.appendChild( button );	
                }
    
                const _b = button.querySelector('a');
                _b.addEventListener("click", (e) => {
                    if(callback && !disabled)
                        callback.call( this, _b, e );
                });
            }
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
                if(options.position == "right")	
                    this.buttonContainer.right = true;	
                if(this.root.lastChild && this.root.lastChild.right) {	
                    this.root.lastChild.before( this.buttonContainer );	
                }	
                else {	
                    this.root.appendChild( this.buttonContainer );	
                }      
            }

            for( let i = 0; i < buttons.length; ++i )
            {
                let data = buttons[i];
                let button = document.createElement('div');
                const title = data.title;
                let disabled = data.disabled ?? false;
                button.className = "lexmenubutton" + (disabled ? " disabled" : "");
                button.title = title ?? "";
                button.innerHTML = "<a class='" + data.icon + " lexicon'></a>";
                this.buttonContainer.appendChild( button );
    
                const _b = button.querySelector('a');
                _b.addEventListener("click", (e) => {
                    disabled = e.target.parentElement.classList.contains("disabled");
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
        static TEXTAREA     = 2;
        static BUTTON       = 3;
        static DROPDOWN     = 4;
        static CHECKBOX     = 5;
        static COLOR        = 6;
        static NUMBER       = 7;
        static TITLE        = 8;
        static VECTOR       = 9;
        static TREE         = 10;
        static PROGRESS     = 11;
        static FILE         = 12;
        static LAYERS       = 13;
        static ARRAY        = 14;
        static LIST         = 15;
        static TAGS         = 16;
        static CURVE        = 17;
        static CARD         = 18;
        static IMAGE        = 19;
        static CUSTOM       = 20;
        static SEPARATOR    = 21;

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

            if(this.onGetValue)
                return this.onGetValue();

            console.warn("Can't get value of " + this.typeName());
        }

        set( value ) {

            if(this.onSetValue)
                this.onSetValue(value);
        }

        oncontextmenu(e) {

            if( this.#no_context_types.includes(this.type) )
                return;

            addContextMenu(this.typeName(), e, c => {
                c.add("Copy", () => { this.copy() });
                c.add("Paste", { disabled: !this.#can_paste(), callback: () => { this.paste() } } );
            });
        }

        copy() {
            navigator.clipboard.type = this.type;
            navigator.clipboard.customIdx = this.customIdx;
            navigator.clipboard.data = this.value();
            navigator.clipboard.writeText( navigator.clipboard.data );
        }

        #can_paste() {
            return this.type === Widget.CUSTOM ? navigator.clipboard.customIdx !== undefined && this.customIdx == navigator.clipboard.customIdx :
                navigator.clipboard.type === this.type;
        }

        paste() {
            if( !this.#can_paste() )
            return;

            this.set(navigator.clipboard.data);
        }

        typeName() {

            switch(this.type) {
                case Widget.TEXT: return "Text";
                case Widget.TEXTAREA: return "TextArea";
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
                case Widget.LIST: return "List";
                case Widget.TAGS: return "Tags";
                case Widget.CURVE: return "Curve";
                case Widget.CUSTOM: return this.customName;
            }
        }

        refresh() {
            // this.domEl.innerHTML = "";
            // if( this.options.callback ) this.options.callback();
        }
    }

    LX.Widget = Widget;

    function ADD_CUSTOM_WIDGET( custom_widget_name, options = {} )
    {
        let custom_idx = simple_guidGenerator();

        Panel.prototype[ 'add' + custom_widget_name ] = function( name, instance, callback ) {

            let widget = this.create_widget(name, Widget.CUSTOM, options);
            widget.customName = custom_widget_name;
            widget.customIdx = custom_idx;
            widget.onGetValue = () => {
                return instance;
            };
            widget.onSetValue = (new_value) => {
                instance = new_value;
                refresh_widget();
                element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                this._trigger( new IEvent(name, instance, null), callback );
            };

            let element = widget.domEl;
            element.style.flexWrap = "wrap";

            let container, custom_widgets;
            let default_instance = options.default ?? {};

            // Add instance button

            const refresh_widget = () => {

                if(instance)
                    widget.instance = instance = Object.assign(deepCopy(default_instance), instance);

                if(container) container.remove();
                if(custom_widgets) custom_widgets.remove();

                container = document.createElement('div');
                container.className = "lexcustomcontainer";
                container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";
    
                this.queue(container);

                let buttonName = "<a class='fa-solid " + (options.icon ?? "fa-cube")  + "' style='float:left'></a>";
                buttonName += custom_widget_name + (!instance ? " [empty]" : "");
                // Add alwayis icon to keep spacing right
                buttonName += "<a class='fa-solid " + (instance ? "fa-bars-staggered" : " ") + " menu' style='float:right; width:5%;'></a>";
                
                let buttonEl = this.addButton(null, buttonName, (value, event) => {

                    if( instance ) {
                        element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    }
                    else {
                        addContextMenu(null, event, c => {    
                            c.add("New " + custom_widget_name, () => { 
                                instance = {};
                                refresh_widget();
                                element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            });
                        });
                    }
    
                }, { buttonClass: 'custom' });
                
                this.clearQueue();
    
                if(instance)
                    buttonEl.querySelector('a.menu').addEventListener('click', e => {
                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        addContextMenu(null, e, c => {
                            c.add("Clear", () => {
                                instance = null;
                                refresh_widget();
                            });
                        });
                    });
    
                // Show elements
    
                custom_widgets = document.createElement('div');
                custom_widgets.className = "lexcustomitems";
                custom_widgets.toggleAttribute('hidden', true);
                
                element.appendChild(container);
                element.appendChild(custom_widgets);
    
                if( instance ) {
                    
                    this.queue( custom_widgets );
                    
                    const on_instance_changed = (key, value, event) => {
                        instance[key] = value;
                        this._trigger( new IEvent(name, instance, event), callback );
                    };

                    for( let key in default_instance )
                    {
                        const value = instance[key] ?? default_instance[key];
                        
                        switch(value.constructor) {
                            case String:
                                if(value[0] === '#')
                                    this.addColor(key, value, on_instance_changed.bind(this, key));
                                else
                                    this.addText(key, value, on_instance_changed.bind(this, key));
                                break;
                            case Number:
                                this.addNumber(key, value, on_instance_changed.bind(this, key));
                                break;
                            case Boolean:
                                this.addCheckbox(key, value, on_instance_changed.bind(this, key));
                                break;
                            case Array:
                                if( value.length > 4 )
                                    this.addArray(key, value, on_instance_changed.bind(this, key));    
                                else
                                    this._add_vector(value.length, key, value, on_instance_changed.bind(this, key));
                                break;
                        }
                    }

                    this.clearQueue();
                }
            };

            refresh_widget();
        };
    }

    LX.ADD_CUSTOM_WIDGET = ADD_CUSTOM_WIDGET;
    
    /**
     * @class NodeTree
     */

    class NodeTree {
            
        constructor(domEl, data, options) {
            this.domEl = domEl;
            this.data = data;
            this.onevent = options.onevent;
            this.options = options;
            this.selected = [];

            if(data.constructor === Object)
                this.#create_item(null, data);
            else
                for( let d of data )
                    this.#create_item(null, d);
        }

        #create_item( parent, node, level = 0, selectedId ) {

            const that = this;
            const node_filter_input = this.domEl.querySelector("#lexnodetree_filter");

            node.children = node.children ?? [];
            if(node_filter_input && !node.id.includes(node_filter_input.value) || (selectedId != undefined) && selectedId != node.id)
            {
                for( var i = 0; i < node.children.length; ++i )
                    this.#create_item( node, node.children[i], level + 1, selectedId );
                return;
            }

            const list = this.domEl.querySelector("ul");

            node.visible = node.visible ?? true;
            node.parent = parent;
            let is_parent = node.children.length > 0;
            let is_selected = this.selected.indexOf( node ) > -1;
            
            let has_parent_child = false;
            if( this.options.only_parents ) {
                node.children.forEach( c => has_parent_child |= (c.children && c.children.length) );
                is_parent = !!has_parent_child;
            }

            let item = document.createElement('li');
            item.className = "lextreeitem " + "datalevel" + level + (is_parent ? " parent" : "") + (is_selected ? " selected" : "");
            item.id = node.id;
            item.tabIndex = "0";

            // Select hierarchy icon
            let icon = "fa-solid fa-square"; // Default: no childs
            if( is_parent ) icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
            item.innerHTML = "<a class='" + icon + " hierarchy'></a>";
            
            // Add display icon
            icon = node.icon;
            if( icon ) item.innerHTML += "<a class='" + icon + "'></a>";

            item.innerHTML += (node.rename ? "" : node.id);

            item.setAttribute('draggable', true);
            item.style.paddingLeft = ((is_parent ? 0 : 3 ) + (3 + (level+1) * 25)) + "px";
            list.appendChild(item);

            // Callbacks
            item.addEventListener("click", e => {
                if( handled ) {
                    handled = false;
                    return;
                }

                if(!e.shiftKey) {
                    list.querySelectorAll("li").forEach( e => { e.classList.remove('selected'); } );
                    this.selected.length = 0;
                }
                
                // Add or remove
                const idx = this.selected.indexOf( node );
                if( idx > -1 ) {
                    item.classList.remove('selected');
                    this.selected.splice(idx, 1);
                }else {
                    item.classList.add('selected');
                    this.selected.push( node );
                }

                // Only Show children...
                if(is_parent && node.id.length > 1 /* Strange case... */) {
                    node.closed = false;
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed);
                        that.onevent( event );
                    }
                    that.refresh();
                    // Focus the element so we can read events...
                    var el = this.domEl.querySelector("#" + node.id);
                    if(el) el.focus();
                }

                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_SELECTED, e.shiftKey ? this.selected : node );
                    event.multiple = e.shiftKey;
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

            item.addEventListener("contextmenu", e => {
                e.preventDefault();
                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_CONTEXTMENU, this.selected.length > 1 ? this.selected : node, e);
                    event.multiple = this.selected.length > 1;
                    that.onevent( event );
                }
            });

            item.addEventListener("keydown", e => {
                e.preventDefault();
                if( e.key == "Delete" )
                {
                    // Send event now so we have the info in selected array..
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_DELETED, this.selected.length > 1 ? this.selected : node, e);
                        event.multiple = this.selected.length > 1;
                        that.onevent( event );
                    }

                    // Delete nodes now
                    for( let _node of this.selected )
                    {
                        let childs = _node.parent.children;
                        const index = childs.indexOf( _node );
                        childs.splice( index, 1 );
                    }

                    this.selected.length = 0;
                    this.refresh();
                }
                else if( e.key == "ArrowUp" || e.key == "ArrowDown" ) // Unique or zero selected
                {
                    var selected = this.selected.length > 1 ? (e.key == "ArrowUp" ? this.selected.shift() : this.selected.pop()) : this.selected[0];
                    var el = this.domEl.querySelector("#" + selected.id);
                    var sibling = e.key == "ArrowUp" ? el.previousSibling : el.nextSibling;
                    if( sibling ) sibling.click();
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

                    this.value = this.value.replace(/\s/g, '_');

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
            
            let handled = false;

            // Show/hide children
            if(is_parent) {
                item.querySelector('a.hierarchy').addEventListener("click", function(e) {
                    
                    handled = true;
                    e.stopImmediatePropagation();
                    e.stopPropagation();

                    node.closed = !node.closed;
                    if(that.onevent) {
                        const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed);
                        that.onevent( event );
                    }
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
                        a.callback(node, actionEl);
                        e.stopPropagation();
                    });
                    item.appendChild(actionEl);
                }
            }

            if(selectedId != undefined && node.id == selectedId) {
                this.selected = [node];
                item.click();
            }

            if(node.closed )
                return;

            for( var i = 0; i < node.children.length; ++i )
            {
                let child = node.children[i];

                if( this.options.only_parents ) {

                    if(!child.children || !child.children.length) continue;
                    let has_parent_child = false;
                    node.children.forEach( c => has_parent_child |= (c.children && c.children.length) );
                    if(!has_parent_child) continue;
                }
                this.#create_item( node, child, level + 1 );
            }
        }

        refresh(newData, selectedId) {
            this.data = newData ?? this.data;
            this.domEl.querySelector("ul").innerHTML = "";
            this.#create_item( null, this.data, 0, selectedId );
        }

        select(id) {
            this.refresh(null, id);
        }
    }

    /**
     * @class Panel
     */

    class Panel {

        #inline_queued_container;
        #inline_widgets_left;

        /**
         * @param {*} options 
         * id: Id of the element
         * className: Add class to the element
         * width: Width of the panel element [fit space]
         * height: Height of the panel element [fit space]
         */

        constructor( options = {} )  {
            var root = document.createElement('div');
            root.className = "lexpanel";
            if(options.id)
                root.id = options.id;
            if(options.className)
                root.className += " " + options.className;

            root.style.width = options.width || "calc( 100% - 6px )";
            root.style.height = options.height || "100%";
            Object.assign(root.style, options.style ?? {});

            this.root = root;

            this.onevent = (e => {});

            // branches
            this.branch_open = false;
            this.branches = [];
            this.current_branch = null;
            this.widgets = {};
            this._queue = []; // Append widgets in other locations
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

            return widget.set(value);
        }

        /**
         * @method attach
         * @param {Element} content child element to append to panel
         */

        attach( content ) {

            if(!content)
            throw("no content to attach");

            content.parent = this;
            let element = content.root ? content.root : content;
            //this.root.style.maxHeight = "800px"; // limit size when attaching stuff from outside
            this.root.appendChild( element );
        }

        /**
         * @method clear
         */

        clear() {

            this.branch_open = false;
            this.branches = [];
            this.current_branch = null;
            for(let w in this.widgets) {
                if(this.widgets[w].options && this.widgets[w].options.signal)
                {
                    const signal = this.widgets[w].options.signal;
                    for(let i = 0; i < LX.signals[signal].length; i++) {
                        if(LX.signals[signal][i] == this.widgets[w]) {
                            LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i+1)];
                        }
                    }
                }
            }
            if(this.signals) {
                for(let w = 0; w < this.signals.length; w++) {
                    let widget = Object.values(this.signals[w])[0];
                    let signal = widget.options.signal;
                    for(let i = 0; i < LX.signals[signal].length; i++) {
                        if(LX.signals[signal][i] == widget) {
                            LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i+1)];
                        }
                    }
                }
            }
            this.widgets = {};

            this.root.innerHTML = "";
        }

        /**
         * @method sameLine
         * @param {Number} number Of widgets that will be placed in the same line
         * @description Next N widgets will be in the same line. If no number, it will inline all until calling nextLine()
         */

        sameLine( number ) {

            this.#inline_queued_container = this.queuedContainer;
            this.#inline_widgets_left = number ||  Infinity;
        }

        /**
         * @method endLine
         * @description Stop inlining widgets
         */

        endLine(justifyContent) {

            this.#inline_widgets_left = 0;

            if(!this._inlineContainer)  {
                this._inlineContainer = document.createElement('div');
                this._inlineContainer.className = "lexinlinewidgets";
                if(justifyContent)
                {
                    this._inlineContainer.style.justifyContent = justifyContent;
                }
            }
            
            // Push all elements single element or Array[element, container]
            for( let item of this._inlineWidgets )
            {
                const is_pair = item.constructor == Array;

                if(is_pair)
                {
                    // eg. an array, inline items appended later to 
                    if(this.#inline_queued_container)
                        this._inlineContainer.appendChild( item[0] );
                    // eg. a dropdown, item is appended to parent, not to inline cont.
                    else
                        item[1].appendChild(item[0]);
                } 
                else
                    this._inlineContainer.appendChild( item );
            }
            
            if(!this.#inline_queued_container)
            {
                if(this.current_branch)
                    this.current_branch.content.appendChild( this._inlineContainer );
                else
                    this.root.appendChild( this._inlineContainer );
            }
            else
            {
                this.#inline_queued_container.appendChild( this._inlineContainer );
            }

            delete this._inlineWidgets;
            delete this._inlineContainer;
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
            this.root.querySelectorAll(".lexbranch.last").forEach( e => { e.classList.remove("last"); } );
            branch.root.classList.add('last');

            this.branches.push( branch );
            this.root.appendChild( branch.root );

            // Add widget filter
            if(options.filter) {
                this.#add_filter( options.filter, {callback: this.#search_widgets.bind(this, branch.name)} );
            }

            return branch;
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

        create_widget( name, type, options = {} ) {

            let widget = new Widget(name, type, options);

            let element = document.createElement('div');
            element.className = "lexwidget";
            if(options.id)
                element.id = options.id;
            if(options.className)
                element.className += " " + options.className;
            if(options.title)
                element.title = options.title;

            if( type != Widget.TITLE )
            {
                element.style.width = "calc(100% - " + (this.current_branch || type == Widget.FILE ? 10 : 20) + "px)";
                if( options.width ) {
                    element.style.width = element.style.minWidth = options.width;
                }
                if( options.height ) {
                    element.style.height = element.style.minHeight = options.height;
                }
            }

            if(name != undefined) {

                if(!(options.no_name ?? false) )
                {
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
                }
                
                this.widgets[ name ] = widget;
            }

            if(options.signal)
            {
                if(!name) {
                    if(!this.signals)
                        this.signals = [];
                    this.signals.push({[options.signal]: widget})
                }
                LX.addSignal( options.signal, widget );
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
                        el.classList.add("nobranch");
                        this.root.appendChild( el );
                    }
                } 
                // Append content to queued tab container
                else {
                    this.queuedContainer.appendChild( el );
                }
            };

            const store_widget = el => {

                if(!this.queuedContainer) {
                    this._inlineWidgets.push( el );
                } 
                // Append content to queued tab container
                else {
                    this._inlineWidgets.push( [el, this.queuedContainer] );
                }
            };

            // Process inline widgets
            if(this.#inline_widgets_left > 0)
            {
                if(!this._inlineWidgets)  {
                    this._inlineWidgets = [];
                }

                // Store widget and its container
                store_widget(element);

                this.#inline_widgets_left--;

                // Last widget
                if(!this.#inline_widgets_left) {
                    this.endLine();
                }
            }else {
                insert_widget(element);
            }

            return widget;
        }

        #add_filter( placeholder, options = {} ) {

            options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties..";
            options.skipWidget = options.skipWidget ?? true;

            let widget = this.create_widget(null, Widget.TEXT, options);
            let element = widget.domEl;
            element.className += " lexfilter noname";
            
            let input = document.createElement('input');
            input.id = 'input-filter';
            input.setAttribute("placeholder", options.placeholder);
            input.style.width =  "calc( 100% - 17px )";
            input.value = options.filterValue || "";

            let searchIcon = document.createElement('a');
            searchIcon.className = "fa-solid fa-magnifying-glass";
            element.appendChild(input);
            element.appendChild(searchIcon);

            input.addEventListener("input", (e) => { 
                if(options.callback)
                    options.callback(input.value, e); 
            });

            return element;
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
                this.queue( b.content );

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
                this.clearQueue();

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
                    let toCompare = (typeof o == 'string') ? o : o.value;
                    ;
                    const filterWord = value.toLowerCase();
                    const name = toCompare.toLowerCase();
                    if(!name.includes(filterWord)) continue;
                }
                // insert filtered widget
                filteredOptions.push(o);
            }

            this.refresh(filteredOptions);
        }

        _trigger( event, callback ) {
            if(callback)
                callback.call(this, event.value, event.domEvent, event.name);

            if(this.onevent)
                this.onevent.call(this, event);
        }

        /**
         * @method getBranch
         * @param {String} name if null, return current branch
         */

        getBranch( name ) {

            if( name )
            {
                return this.branches.find( b => b.name == name );
            }

            return this.current_branch;
        }

        /**
         * @method queue
         * @param {HTMLElement} domEl container to append elements to
         */

        queue( domEl ) {

            if( !domEl && this.current_branch)
            {
                domEl = this.current_branch.root;
            }

            if( this.queuedContainer )
            {
                this._queue.push( this.queuedContainer );
            }

            this.queuedContainer = domEl;
        }

        /**
         * @method clearQueue
         */

        clearQueue() {

            if(this._queue && this._queue.length)
            {
                this.queuedContainer = this._queue.pop();
                return;
            }

            delete this.queuedContainer;
        }

        /**
         * @method addBlank
         * @param {Number} height
         */

        addBlank( height = 8, width ) {

            let widget = this.create_widget(null, Widget.addBlank);
            widget.domEl.className += " blank";
            widget.domEl.style.height = height + "px";

            if(width)
                widget.domEl.style.width = width;

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

            let widget = this.create_widget(null, Widget.TITLE, options);
            let element = widget.domEl;
            element.className = "lextitle";

            if(options.icon) {
                let icon = document.createElement('a');
                icon.className = options.icon;
                icon.style.color = options.icon_color || "";
                element.appendChild(icon);
            }

            let text = document.createElement('span');
            text.innerText = name;
            element.appendChild(text);

            Object.assign(element.style, options.style ?? {});

            if(options.link != undefined)
            {
                let link_el = document.createElement('a');
                link_el.innerText = name;
                link_el.href = options.link;
                link_el.target = options.target ?? "";
                link_el.className = "lextitle link";
                Object.assign(link_el.style, options.style ?? {});
                element.replaceWith(link_el);
            }
            return element;
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
         * float: Justify text
         */

        addText( name, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.TEXT, options);
            widget.onGetValue = () => {
                return wValue.value;
            };
            widget.onSetValue = (new_value) => {
                wValue.value = new_value;
                Panel.#dispatch_event(wValue, "focusout");
            };

            let element = widget.domEl;

            // Add reset functionality
            if(widget.name && !(options.noreset ?? false)) {
                Panel.#add_reset_property(element.domName, function() {
                    wValue.value = wValue.iValue;
                    this.style.display = "none";
                    Panel.#dispatch_event(wValue, "focusout");
                });
            }
            
            // Add widget value

            let container = document.createElement('div');
            container.className = "lextext";
            container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " )";
            container.style.display = "flex";

            let wValue = document.createElement('input');
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = "100%";
            wValue.style.textAlign = options.float ?? "";
            Object.assign(wValue.style, options.style ?? {});

            if(options.disabled ?? false) wValue.setAttribute("disabled", true);
            if(options.placeholder) wValue.setAttribute("placeholder", options.placeholder);

            var resolve = (function(val, event) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (val != wValue.iValue ? "block" : "none");
                this._trigger( new IEvent(name, val, event), callback );
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

            if(options.icon)
            {
                let icon = document.createElement('a');
                icon.className = "inputicon " + options.icon;
                container.appendChild(icon);
            }

            container.appendChild(wValue);
            element.appendChild(container);
            
            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                container.style.width = "100%";
            }

            return widget;
        }

        /**
         * @method addTextArea
         * @param {String} name Widget name
         * @param {String} value Text Area value
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * placeholder: Add input placeholder
         * trigger: Choose onchange trigger (default, input) [default]
         * inputWidth: Width of the text input
         * fitHeight: Height adapts to text
         */

        addTextArea( name, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.TEXTAREA, options);
            widget.onGetValue = () => {
                return wValue.value;
            };
            widget.onSetValue = (new_value) => {
                wValue.value = new_value;
                Panel.#dispatch_event(wValue, "focusout");
            };
            let element = widget.domEl;

            // Add reset functionality
            if(widget.name && !(options.noreset ?? false)) {
                Panel.#add_reset_property(element.domName, function() {
                    wValue.value = wValue.iValue;
                    this.style.display = "none";
                    Panel.#dispatch_event(wValue, "focusout");
                });
            }
            
            // Add widget value

            let container = document.createElement('div');
            container.className = "lextextarea";
            container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " )";
            container.style.height = options.height;
            container.style.display = "flex";

            let wValue = document.createElement('textarea');
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = "100%";
            Object.assign(wValue.style, options.style ?? {});

            if(options.disabled ?? false) wValue.setAttribute("disabled", true);
            if(options.placeholder) wValue.setAttribute("placeholder", options.placeholder);

            var resolve = (function(val, event) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (val != wValue.iValue ? "block" : "none");
                this._trigger( new IEvent(name, val, event), callback );
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

            if(options.icon)
            {
                let icon = document.createElement('a');
                icon.className = "inputicon " + options.icon;
                container.appendChild(icon);
            }

            container.appendChild(wValue);
            element.appendChild(container);
            
            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                container.style.width = "100%";
            }

            // Do this after creating the DOM element
            doAsync( () => {
                if( options.fitHeight )
                {
                    // Update height depending on the content
                    wValue.style.height = wValue.scrollHeight + "px";
                }
            }, 100);

            return widget;
        }

        /**
         * @method addLabel
         * @param {String} value Information string
         */

        addLabel( value, options = {} ) {

            options.disabled = true;
            return this.addText( null, value, null, options );
        }
        
        /**
         * @method addButton
         * @param {String} name Widget name
         * @param {String} value Button name
         * @param {Function} callback Callback function on click
         * @param {*} options:
         * icon 
         * disabled: Make the widget disabled [false]
         */

        addButton( name, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.BUTTON, options);
            let element = widget.domEl;

            var wValue = document.createElement('button');
            if(options.icon || options.img) 
                wValue.title = value;
            wValue.className = "lexbutton";
            if(options.selected)
                wValue.classList.add("selected");
            if(options.buttonClass)
                wValue.classList.add(options.buttonClass);
            wValue.innerHTML = "<span>" + 
                (options.icon ? "<a class='" + options.icon + "'></a>" : 
                ( options.img  ? "<img src='" + options.img + "'>" : (value || ""))) + "</span>";

            wValue.style.width = "calc( 100% - " + (options.nameWidth ?? LX.DEFAULT_NAME_WIDTH) + ")";
          
            if(options.disabled)
                wValue.setAttribute("disabled", true);
            
            wValue.addEventListener("click", e => {
                if( options.selectable ) {
                    if( options.parent )
                        options.parent.querySelectorAll(".lexbutton.selected").forEach( e => { if(e == wValue) return; e.classList.remove("selected") } );
                    wValue.classList.toggle('selected');
                }
                this._trigger( new IEvent(name, value, e), callback );   
            });

            element.appendChild(wValue);
            
            // Remove branch padding and margins
            if(!widget.name) {
                wValue.className += " noname";
                wValue.style.width = "100%";
            }

            return element;
        }

        /**
         * @method addComboButtons
         * @param {String} name Widget name
         * @param {Array} values Each of the {value, callback} items
         * @param {*} options:
         * float: Justify content (left, center, right) [center]
         * noSelection: Buttons can be clicked, but they are not selectable
         */

        addComboButtons( name, values, options = {} ) {

            let widget = this.create_widget(name, Widget.BUTTON, options);
            let element = widget.domEl;

            let that = this;
            let container = document.createElement('div');
            container.className = "lexcombobuttons ";
            if( options.float ) container.className += options.float;
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";   

            let should_select = !(options.noSelection ?? false);
            for( let b of values )
            {
                if( !b.value ) throw("Set 'value' for each button!");

                let buttonEl = document.createElement('button');
                buttonEl.className = "lexbutton combo";
                buttonEl.title = b.icon ? b.value : "";
                if(options.buttonClass)
                    buttonEl.classList.add(options.buttonClass);

                if(options.selected == b.value) 
                    buttonEl.classList.add("selected");
                    
                buttonEl.innerHTML = (b.icon ? "<a class='" + b.icon +"'></a>" : "") + "<span>" + (b.icon ? "" : b.value) + "</span>";
              
                if(options.disabled)
                    buttonEl.setAttribute("disabled", true);
                
                buttonEl.addEventListener("click", function(e) {
                    if(should_select) {
                        container.querySelectorAll('button').forEach( s => s.classList.remove('selected'));
                        this.classList.add('selected');
                    }
                    that._trigger( new IEvent(name, b.value, e), b.callback );   
                });
    
                container.appendChild(buttonEl);
                
                // Remove branch padding and margins
                if(widget.name === undefined) {
                    buttonEl.className += " noname";
                    buttonEl.style.width =  "100%";
                }
            }

            // Remove branch padding and margins
            if(widget.name !== undefined) {
                element.className += " noname";
                container.style.width = "100%";
            }

            element.appendChild(container);

            return widget;
        }

        /**
         * @method addCard
         * @param {String} name Card Name
         * @param {*} options:
         * title: title if any
         * text: card text if any
         * src: url of the image if any
         * callback (Function): function to call on click
         */

        addCard( name, options = {} ) {

            options.no_name = true;
            let widget = this.create_widget(name, Widget.CARD, options);
            let element = widget.domEl;

            let container = document.createElement('div');
            container.className = "lexcard";
            container.style.width = "100%";

            if( options.img )
            {
                let img = document.createElement('img');
                img.src = options.img;
                container.appendChild(img);

                if(options.link != undefined)
                {
                    img.style.cursor = "pointer";
                    img.addEventListener('click', function() {
                        const _a = container.querySelector('a');
                        if(_a) _a.click();
                    });
                }
            }

            let name_el = document.createElement('span');
            name_el.innerText = name;

            if(options.link != undefined)
            {
                let link_el = document.createElement('a');
                link_el.innerText = name;
                link_el.href = options.link;
                link_el.target = options.target ?? "";
                name_el.innerText = "";
                name_el.appendChild(link_el);
            }

            container.appendChild(name_el);
            
            if( options.callback ) {
                container.style.cursor = "pointer";
                container.addEventListener("click", (e) => {
                    this._trigger( new IEvent(name, null, e), options.callback );   
                });
            }

            element.appendChild(container);

            return widget;
        }

        /**
         * @method addImage
         * @param {String} url Image Url
         * @param {*} options
         */

        async addImage( url, options = {} ) {

            if( !url )
            return;

            options.no_name = true;
            let widget = this.create_widget(null, Widget.IMAGE, options);
            let element = widget.domEl;

            let container = document.createElement('div');
            container.className = "leximage";
            container.style.width = "100%";

            let img = document.createElement('img');
            img.src = url;

            for(let s in options.style) {

                img.style[s] = options.style[s];
            }

            await img.decode();
            container.appendChild(img);
            element.appendChild(container);

            return widget;
        }

        /**
         * @method addDropdown
         * @param {String} name Widget name
         * @param {Array} values Posible options of the dropdown widget -> String (for default dropdown) or Object = {value, url} (for images, gifs..)
         * @param {String} value Select by default option
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * filter: Add a search bar to the widget [false]
         * disabled: Make the widget disabled [false]
         */

        addDropdown( name, values, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.DROPDOWN, options);
            widget.onGetValue = () => {
                return element.querySelector("li.selected").getAttribute('value');
            };
            widget.onSetValue = (new_value) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != wValue.iValue ? "block" : "none");
                value = new_value;
                list.querySelectorAll('li').forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
                this._trigger( new IEvent(name, value, null), callback ); 
            };

            let element = widget.domEl;
            let that = this;

            // Add reset functionality
            if(widget.name)
            {
                Panel.#add_reset_property(element.domName, function() {
                    value = wValue.iValue;
                    list.querySelectorAll('li').forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
                    this.style.display = "none";
                });
            }

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
            buttonName += "<a class='fa-solid fa-angle-down' style='float:right; margin-right: 6px;'></a>";

            this.queue(container);

            let selectedOption = this.addButton(null, buttonName, (value, event) => {
                if( list.unfocus_event ) {
                    delete list.unfocus_event;
                    return;
                }
                let container = selectedOption.parentElement.parentElement.parentElement.parentElement; // there must be a nicer way...
                let rect = event.currentTarget.getBoundingClientRect();
                let y_pos = container.classList.contains('lexdialog') ? rect.top - 5 + rect.height : rect.y + rect.height - 5;
                element.querySelector(".lexoptions").style.top = y_pos + 'px';
                element.querySelector(".lexoptions").style.width = (event.currentTarget.clientWidth) + 2 + 'px';
                element.querySelector(".lexoptions").toggleAttribute('hidden');
                list.focus();
            }, { buttonClass: 'array' });

            this.clearQueue();

            selectedOption.style.width = "100%";   

            selectedOption.refresh = (v) => {
                if(selectedOption.querySelector("span").innerText == "")
                    selectedOption.querySelector("span").innerText = v;
                else
                    selectedOption.querySelector("span").innerHTML = selectedOption.querySelector("span").innerHTML.replaceAll(selectedOption.querySelector("span").innerText, v); 
            }

            //Add dropdown options container
            let list = document.createElement('ul');
            list.tabIndex = -1;
            list.className = "lexoptions";
            list.hidden = true;

            list.addEventListener('focusout', function(e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                if(e.relatedTarget === selectedOption.querySelector("button")) {
                    this.unfocus_event = true;
                    setTimeout(() => delete this.unfocus_event, 200);
                } else if (e.relatedTarget && e.relatedTarget.tagName == "INPUT") {
                    return;
                }else if (e.target.id == 'input-filter') {
                    return;
                }
                this.toggleAttribute('hidden', true);
            });

            // Add filter options
            let filter = null;
            if(options.filter ?? false)
                filter = this.#add_filter("Search option", {container: list, callback: this.#search_options.bind(list, values)});

            // Create option list to empty it easily..
            const list_options = document.createElement('span');
            list.appendChild(list_options);
            
            if(filter)  {
                list.prepend(filter);
                list_options.style.height = "calc(100% - 25px)";
            }
            // Add dropdown options list
            list.refresh = (options) => {

                // Empty list
                list_options.innerHTML = "";

                for(let i = 0; i < options.length; i++)
                {
                    let iValue = options[i];
                    let li = document.createElement('li');
                    let option = document.createElement('div');
                    option.className = "option";
                    li.appendChild(option);
                    li.addEventListener("click", (e) => {
                        element.querySelector(".lexoptions").toggleAttribute('hidden', true);
                        const currentSelected = element.querySelector(".lexoptions .selected");
                        if(currentSelected) currentSelected.classList.remove("selected");
                        value = e.currentTarget.getAttribute("value");
                        e.currentTarget.toggleAttribute('hidden', false);
                        e.currentTarget.classList.add("selected");
                        selectedOption.refresh(value);

                        let btn = element.querySelector(".lexwidgetname .lexicon");
                        if(btn) btn.style.display = (value != wValue.iValue ? "block" : "none");
                        that._trigger( new IEvent(name, value, null), callback ); 

                        // Reset filter
                        if(filter)
                        {
                            filter.querySelector('input').value = "";
                            this.#search_options.bind(list, values, "")();
                        }
                    });

                    // Add string option
                    if(typeof iValue == 'string' || !iValue) {
                        option.style.flexDirection = 'unset';
                        option.innerHTML = "<a class='fa-solid fa-check'></a><span>" + iValue + "</span>";
                        option.value = iValue;
                        li.setAttribute("value", iValue);
                        li.className = "lexdropdownitem";
                        if( i == (options.length - 1) ) li.className += " last";
                        if(iValue == value) {
                            li.classList.add("selected");
                            wValue.innerHTML = iValue;
                        }
                    }
                    else {
                        // Add image option
                        let img = document.createElement("img");
                        img.src = iValue.src;
                        li.setAttribute("value", iValue.value);
                        li.className = "lexlistitem";
                        option.innerText = iValue.value;
                        option.className += " media";
                        option.prepend(img);

                        option.setAttribute("value", iValue.value);
                        option.setAttribute("data-index", i);
                        option.setAttribute("data-src", iValue.src);
                        option.setAttribute("title", iValue.value);
                        if(value == iValue.value)
                            li.classList.add("selected");
                    }      
                    list_options.appendChild(li);
                }
            }

            list.refresh(values);

            container.appendChild(list);
            element.appendChild(container);

            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                container.style.width = "100%";
            }

            return widget;
        }

        /**
         * @method addCurve
         * @param {String} name Widget name
         * @param {Array of Array} values Array of 2N Arrays of each value of the curve
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addCurve( name, values, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let that = this;
            let widget = this.create_widget(name, Widget.CURVE, options);
            widget.onGetValue = () => {
                return JSON.parse(JSON.stringify(curve_instance.element.value));
            };
            widget.onSetValue = (new_value) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != curve_instance.element.value ? "block" : "none");
                curve_instance.element.value = JSON.parse(JSON.stringify(new_value));
                curve_instance.redraw();
                that._trigger( new IEvent(name, curve_instance.element.value, null), callback );
            };

            let element = widget.domEl;
            let defaultValues = JSON.parse(JSON.stringify(values));

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                curve_instance.element.value = JSON.parse(JSON.stringify(defaultValues));
                curve_instance.redraw();
                that._trigger( new IEvent(name, curve_instance.element.value, e), callback );
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexcurve";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            options.callback = (v, e) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (v != defaultValues ? "block" : "none");
                that._trigger( new IEvent(name, v, e), callback );
            };
            options.name = name;
            let curve_instance = new Curve(this, values, options);
            container.appendChild(curve_instance.element);
            element.appendChild(container);

            // Resize
            curve_instance.canvas.width = container.offsetWidth;
            curve_instance.redraw();
            widget.onresize = curve_instance.redraw.bind(curve_instance);
            widget.curve_instance = curve_instance;
            return widget;
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
            let widget = this.create_widget(name, Widget.LAYERS, options);
            widget.onGetValue = () => {
                return element.value;
            };
            widget.onSetValue = (new_value) => {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != defaultValue ? "block" : "none");
                value = element.value = new_value;
                setLayers();
                that._trigger( new IEvent(name, value), callback );
            };

            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                value = element.value = defaultValue;
                setLayers();
                that._trigger( new IEvent(name, value, e), callback );
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
    
                        this._trigger( new IEvent(name, value, e), callback );
                    });
                }
    
            };

            setLayers();
            
            element.appendChild(container);

            return widget;
        }

        /**
         * @method addArray
         * @param {String} name Widget name
         * @param {Array} values By default values in the array
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addArray( name, values = [], callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.ARRAY, options);
            widget.onGetValue = () => {
                let array_inputs = element.querySelectorAll("input");
                let values = [];
                for( var v of array_inputs )
                values.push( v.value );
                return values;
            };
            widget.onSetValue = (new_value) => {
                values = new_value;
                updateItems();
                this._trigger( new IEvent(name, values, null), callback );
            };
            let element = widget.domEl;
            element.style.flexWrap = "wrap";

            // Add dropdown array button

            const itemNameWidth = "3%";

            var container = document.createElement('div');
            container.className = "lexarray";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";
            
            this.queue( container );

            const angle_down = `<a class='fa-solid fa-angle-down' style='float:right; margin-right: 6px;'></a>`;

            let buttonName = "Array (size " + values.length + ")";
            buttonName += angle_down;
            this.addButton(null, buttonName, () => {
                element.querySelector(".lexarrayitems").toggleAttribute('hidden');
            }, { buttonClass: 'array' });
            
            this.clearQueue();

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
                buttonEl.innerHTML += angle_down;

                // Update inputs
                array_items.innerHTML = "";

                this.queue( array_items );

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
                            }, { nameWidth: itemNameWidth, inputWidth: "95%", noreset: true });
                            break;
                        case Number:
                            this.addNumber(i+"", value, function(value, event) {
                                values[i] = value;
                                callback( values );
                            }, { nameWidth: itemNameWidth, inputWidth: "95%", noreset: true });
                            break;
                    }

                    this.addButton( null, "<a class='lexicon fa-solid fa-trash'></a>", (v, event) => {
                        values.splice(values.indexOf( value ), 1);
                        updateItems();
                        this._trigger( new IEvent(name, values, event), callback );
                    }, { title: "Remove item", className: 'small'} );
                }

                buttonName = "Add item";
                buttonName += "<a class='fa-solid fa-plus' style='float:right; margin-right: 6px;'></a>";
                this.addButton(null, buttonName, (v, event) => {
                    values.push( "" );
                    updateItems();
                    this._trigger( new IEvent(name, values, event), callback );
                }, { buttonClass: 'array' });

                // Stop pushing to array_items
                this.clearQueue();
            };

            updateItems();

            return widget;
        }

        /**
         * @method addList
         * @param {String} name Widget name
         * @param {Array} values List values
         * @param {String} value Selected list value
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addList( name, values, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.LIST, options);
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
                    this._trigger( new IEvent(name, item_value, e), callback );
                });

                list_container.appendChild(list_item);
            }

            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                list_container.style.width = "100%";
            }

            element.appendChild(list_container);

            return widget;
        }

        /**
         * @method addTags
         * @param {String} name Widget name
         * @param {String} value Comma separated tags
         * @param {Function} callback Callback function on change
         * @param {*} options:
         */

        addTags( name, value, callback, options = {} ) {

            value = value.replace(/\s/g, '').split(',');
            let defaultValue = [].concat(value);
            let widget = this.create_widget(name, Widget.TAGS, options);
            widget.onGetValue = () => {
                return [].concat(value);
            };
            widget.onSetValue = (new_value) => {
                value = [].concat(new_value);
                create_tags();
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = (new_value != defaultValue ? "block" : "none");1
                that._trigger( new IEvent(name, value), callback );
            };

            let element = widget.domEl;
            let that = this;

            // Add reset functionality
            if(widget.name)
            {
                Panel.#add_reset_property(element.domName, function(e) {
                    this.style.display = "none";
                    value = [].concat(defaultValue);
                    create_tags();
                    that._trigger( new IEvent(name, value, e), callback );
                });
            }

            // Show tags

            let tags_container = document.createElement('div');
            tags_container.className = "lextags";
            tags_container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            const create_tags = () => {

                tags_container.innerHTML = "";

                for( let i = 0; i < value.length; ++i )
                {
                    let tag_name = value[i];
                    let tag = document.createElement('span');
                    tag.className = "lextag";
                    tag.innerHTML = tag_name;
    
                    tag.addEventListener('click', function(e) {
                        this.remove();
                        value.splice( value.indexOf( tag_name ), 1 );
                        let btn = element.querySelector(".lexwidgetname .lexicon");
                        if(btn) btn.style.display = (value != defaultValue ? "block" : "none");
                        that._trigger( new IEvent(name, value, e), callback );
                    });
    
                    tags_container.appendChild(tag);
                }

                let tag_input = document.createElement('input');
                tag_input.value = "";
                tag_input.placeholder = "Tag...";
                tags_container.insertChildAtIndex(tag_input, 0);

                tag_input.onkeydown = function(e) {
                    const val = this.value.replace(/\s/g, '');
                    if( e.key == ' ') { 
                        e.preventDefault();
                        if( !val.length || value.indexOf( val ) > -1 )
                            return;
                        value.push(val);
                        create_tags();
                        let btn = element.querySelector(".lexwidgetname .lexicon");
                        if(btn) btn.style.display = "block";
                        that._trigger( new IEvent(name, value, e), callback );
                    }
                };

                tag_input.focus();
            }

            create_tags();

            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                tags_container.style.width = "100%";
            }

            element.appendChild(tags_container);

            return widget;
        }

        /**
         * @method addCheckbox
         * @param {String} name Widget name
         * @param {Boolean} value Value of the checkbox
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * suboptions: Callback to add widgets in case of TRUE value
         */

        addCheckbox( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.CHECKBOX, options);
            widget.onGetValue = () => {
                return flag.value;
            };
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
                if(btn) btn.style.display = flag.value != flag.iValue ? "block": "none";

                // Open suboptions
                let submenu = element.querySelector(".lexcheckboxsubmenu");
                if(submenu) submenu.toggleAttribute('hidden', !flag.value);

                this._trigger( new IEvent(name, flag.value, e), callback );
            });

            element.appendChild(container);

            if( options.suboptions )
            {
                element.style.flexWrap = "wrap";
                let suboptions = document.createElement('div');
                suboptions.className = "lexcheckboxsubmenu";
                suboptions.toggleAttribute('hidden', !flag.value);

                this.queue( suboptions );
                options.suboptions.call(this, this);
                this.clearQueue();

                element.appendChild(suboptions);
            }

            return widget;
        }

        /**
         * @method addColor
         * @param {String} name Widget name
         * @param {String} value Default color (hex)
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * useRGB: The callback returns color as Array (r, g, b) and not hex [false]
         */

        addColor( name, value, callback, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.COLOR, options);
            widget.onGetValue = () => {
                return color.value;
            };
            widget.onSetValue = (new_value) => {
                color.value = new_value;
                Panel.#dispatch_event(color, "input");
            };
            let element = widget.domEl;
            let change_from_input = false;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                this.style.display = "none";
                color.value = color.iValue;
                Panel.#dispatch_event(color, "input");
            });

            // Add widget value

            var container = document.createElement('span');
            container.className = "lexcolor";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            let color = document.createElement('input');
            color.style.width = "calc(30% - 6px)";
            color.type = 'color';
            color.className = "colorinput";
            color.id = "color" + simple_guidGenerator();
            color.useRGB = options.useRGB ?? false;
            color.value = color.iValue = value.constructor === Array ? rgbToHex(value) : value;
            
            if(options.disabled) {
                color.disabled = true;
            }

            color.addEventListener("input", e => {
                let val = e.target.value;

                // Change value (always hex)
                if( !change_from_input )
                    text_widget.set(val);

                // Reset button (default value)
                if(val != color.iValue) {
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    btn.style.display = "block";
                }

                if(color.useRGB)
                    val = hexToRgb(val);

                this._trigger( new IEvent(name, val, e), callback );
            }, false);

            container.appendChild(color);

            this.queue( container );

            const text_widget = this.addText(null, color.value, (v) => {
                change_from_input = true;
                widget.set( v );
                change_from_input = false;
            }, { width: "calc(70% - 4px)" });
            
            text_widget.domEl.style.marginLeft = "4px";

            this.clearQueue();

            // let valueName = document.createElement('span');
            // valueName.className = "colorinfo";
            // valueName.innerText = color.value;

            // valueName.addEventListener("click", e => {
            //     color.focus();
            //     color.click();
            // });

            // container.appendChild(valueName);
            
            element.appendChild(container);

            return widget;
        }

        /**
         * @method addNumber
         * @param {String} name Widget name
         * @param {Number} value Default number value
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * disabled: Make the widget disabled [false]
         * step: Step of the input
         * precision: The number of digits to appear after the decimal point
         * min, max: Min and Max values for the input
         * skipSlider: If there are min and max values, skip the slider
         */

        addNumber( name, value, callback, options = {} ) {

            let widget = this.create_widget(name, Widget.NUMBER, options);
            widget.onGetValue = () => {
                return +vecinput.value;
            };
            widget.onSetValue = (new_value) => {
                vecinput.value = new_value;
                Panel.#dispatch_event(vecinput, "change");
            };
            let element = widget.domEl;

            // add reset functionality
            if(widget.name) {
                Panel.#add_reset_property(element.domName, function() {
                    this.style.display = "none";
                    vecinput.value = vecinput.iValue;
                    Panel.#dispatch_event(vecinput, "change");
                });
            }

            // add widget value

            var container = document.createElement('div');
            container.className = "lexnumber";        
            container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            let box = document.createElement('div');
            box.className = "numberbox";

            let vecinput = document.createElement('input');
            vecinput.className = "vecinput";
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "number_"+simple_guidGenerator();
            vecinput.value = vecinput.iValue = value;
            box.appendChild(vecinput);

            let drag_icon = document.createElement('a');
            drag_icon.className = "fa-solid fa-arrows-up-down drag-icon hidden";
            box.appendChild(drag_icon);

            if(options.disabled) {
                vecinput.disabled = true;
            }

            // add slider below
            if(!options.skipSlider && options.min !== undefined && options.max !== undefined) {
                let slider = document.createElement('input');
                slider.className = "lexinputslider";
                slider.step = options.step ?? 1;
                slider.min = options.min;
                slider.max = options.max;
                slider.type = "range";
                slider.value = value;
                slider.addEventListener("input", function(e) {
                    let new_value = +this.valueAsNumber;
                    let fract = new_value % 1;
                    vecinput.value = Math.trunc(new_value) + (+fract.toPrecision(5));
                    Panel.#dispatch_event(vecinput, "change");
                }, false);
                box.appendChild(slider);
            }

            // Add wheel input

            vecinput.addEventListener("wheel", function(e) {
                e.preventDefault();
                if(this !== document.activeElement)
                    return;
                let mult = options.step ?? 1;
                if(e.shiftKey) mult *= 10;
                else if(e.altKey) mult *= 0.1;
                let new_value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1));
                let fract = new_value % 1;
                this.value = Math.trunc(new_value) + (+fract.toPrecision(5));
                Panel.#dispatch_event(vecinput, "change");
            }, {passive:false});

            vecinput.addEventListener("change", e => {
                let val = e.target.value = clamp(+e.target.valueAsNumber, +vecinput.min, +vecinput.max);
                val = options.precision ? round(val, options.precision) : val;
                // update slider!
                if( box.querySelector(".lexinputslider"))
                    box.querySelector(".lexinputslider").value = val;

                vecinput.value = val;
                // Reset button (default value)
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = val != vecinput.iValue ? "block": "none";
                this._trigger( new IEvent(name, val, e), callback );
            }, {passive:false});
            
            // Add drag input

            vecinput.addEventListener("mousedown", inner_mousedown);

            var that = this;
            var lastY = 0;
            function inner_mousedown(e) {
                if(document.activeElement == vecinput) return;
                var doc = that.root.ownerDocument;
                doc.addEventListener("mousemove",inner_mousemove);
                doc.addEventListener("mouseup",inner_mouseup);
                lastY = e.pageY;
                document.body.classList.add('nocursor');
                drag_icon.classList.remove('hidden');
            }

            function inner_mousemove(e) {
                if (lastY != e.pageY) {
                    let dt = lastY - e.pageY;
                    let mult = options.step ?? 1;
                    if(e.shiftKey) mult *= 10;
                    else if(e.altKey) mult *= 0.1;
                    let new_value = (+vecinput.valueAsNumber + mult * dt);
                    let fract = new_value % 1;
                    vecinput.value = Math.trunc(new_value) + (+fract.toPrecision(5));
                    Panel.#dispatch_event(vecinput, "change");
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
                drag_icon.classList.add('hidden');
            }
            
            container.appendChild(box);
            element.appendChild(container);

            // Remove branch padding and margins
            if(!widget.name) {
                element.className += " noname";
                container.style.width = "100%";
            }

            return widget;
        }

        static #VECTOR_COMPONENTS = {0: 'x', 1: 'y', 2: 'z', 3: 'w'};

        _add_vector( num_components, name, value, callback, options = {} ) {

            num_components = clamp(num_components, 2, 4);
            value = value ?? new Array(num_components).fill(0);

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.VECTOR, options);
            widget.onGetValue = () => {
                let inputs = element.querySelectorAll("input");
                let value = [];
                for( var v of inputs )
                    value.push( +v.value );
                return value;
            };
            widget.onSetValue = (new_value) => {
                const inputs = element.querySelectorAll(".vecinput");
                for( var i = 0; i < inputs.length; ++i ) {
                    inputs[i].value = new_value[i] ?? 0;
                    Panel.#dispatch_event(inputs[i], "change");
                }
            };
            widget.setValue = (new_value) => {
                const inputs = element.querySelectorAll(".vecinput");
                for( var i = 0; i < inputs.length; ++i ) {
                    inputs[i].value = new_value[i] ?? 0;
                }
            }

            let element = widget.domEl;

            // Add reset functionality
            Panel.#add_reset_property(element.domName, function() {
                this.style.display = "none";
                for( let v of element.querySelectorAll(".vecinput") ) {
                    v.value = v.iValue;
                    Panel.#dispatch_event(v, "change");
                }
            });

            // Add widget value

            var container = document.createElement('div');
            container.className = "lexvector";        
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            for( let i = 0; i < num_components; ++i ) {

                let box = document.createElement('div');
                box.className = "vecbox";
                box.innerHTML = "<span class='" + Panel.#VECTOR_COMPONENTS[i] + "'></span>";

                let vecinput = document.createElement('input');
                vecinput.className = "vecinput v" + num_components;
                vecinput.min = options.min ?? -1e24;
                vecinput.max = options.max ?? 1e24;
                vecinput.step = options.step ?? "any";
                vecinput.type = "number";
                vecinput.id = "vec"+num_components+"_"+simple_guidGenerator();
                vecinput.idx = i;
                vecinput.value = vecinput.iValue = value[i];

                let drag_icon = document.createElement('a');
                drag_icon.className = "fa-solid fa-arrows-up-down drag-icon hidden";
                box.appendChild(drag_icon);

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

                    if( lock_icon.locked )
                    {
                        for( let v of element.querySelectorAll(".vecinput") ) {
                            v.value = (+v.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
                            Panel.#dispatch_event(v, "change");
                        }
                    } else {
                        this.value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
                        Panel.#dispatch_event(vecinput, "change");
                    }
                }, {passive:false});

                vecinput.addEventListener("change", e => {
                    let val = e.target.value = clamp(e.target.value, vecinput.min, vecinput.max);
        
                    // Reset button (default value)
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    if(btn) btn.style.display = val != vecinput.iValue ? "block": "none";

                    if( lock_icon.locked )
                    {
                        for( let v of element.querySelectorAll(".vecinput") ) {
                            v.value = val;
                            value[v.idx] = val;
                        }
                    } else {
                        value[e.target.idx] = val;
                    }

                    this._trigger( new IEvent(name, value, e), callback );
                }, false);
                
                // Add drag input

                vecinput.addEventListener("mousedown", inner_mousedown);

                var that = this;
                var lastY = 0;
                function inner_mousedown(e) {
                    if(document.activeElement == vecinput) return;
                    var doc = that.root.ownerDocument;
                    doc.addEventListener("mousemove",inner_mousemove);
                    doc.addEventListener("mouseup",inner_mouseup);
                    lastY = e.pageY;
                    document.body.classList.add('nocursor');
                    drag_icon.classList.remove('hidden');
                }

                function inner_mousemove(e) {
                    if (lastY != e.pageY) {
                        let dt = lastY - e.pageY;
                        let mult = options.step ?? 1;
                        if(e.shiftKey) mult = 10;
                        else if(e.altKey) mult = 0.1;

                        if( lock_icon.locked )
                        {
                            for( let v of element.querySelectorAll(".vecinput") ) {
                                v.value = (+v.valueAsNumber + mult * dt).toPrecision(5);
                                Panel.#dispatch_event(v, "change");
                            }
                        } else {
                            vecinput.value = (+vecinput.valueAsNumber + mult * dt).toPrecision(5);
                            Panel.#dispatch_event(vecinput, "change");
                        }
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
                    drag_icon.classList.add('hidden');
                }
                
                box.appendChild(vecinput);
                container.appendChild(box);
            }

            let lock_icon = document.createElement('a');
            lock_icon.className = "fa-solid fa-lock-open lexicon";
            container.appendChild(lock_icon);
            lock_icon.addEventListener("click", function(e) {
                this.locked = !this.locked;
                if(this.locked){
                    this.classList.add("fa-lock");
                    this.classList.remove("fa-lock-open");
                } else {
                    this.classList.add("fa-lock-open");
                    this.classList.remove("fa-lock");
                }
            }, false);
            
            element.appendChild(container);

            return widget;
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

            return this._add_vector(2, name, value, callback, options);
        }

        addVector3( name, value, callback, options ) {

            return this._add_vector(3, name, value, callback, options);
        }

        addVector4( name, value, callback, options ) {

            return this._add_vector(4, name, value, callback, options);
        }

        /**
         * @method addProgress
         * @param {String} name Widget name
         * @param {Number} value Progress value 
         * @param {*} options:
         * min, max: Min and Max values
         * low, optimum, high: Low and High boundary values, Optimum point in the range
         * showValue: show current value
         * editable: allow edit value
         * callback: function called on change value
         */

        addProgress( name, value, options = {} ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.PROGRESS, options);
            widget.onGetValue = () => {
                return progress.value;
            };
            widget.onSetValue = (new_value) => {
                element.querySelector("meter").value = new_value;
                if( element.querySelector("span") )
                    element.querySelector("span").innerText = new_value;
            };
            let element = widget.domEl;

            var container = document.createElement('div');
            container.className = "lexprogress";
            container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

            // add slider (0-1 if not specified different )

            let progress = document.createElement('meter');
            progress.id = "lexprogressbar-" + name;
            progress.className = "lexprogressbar";
            progress.step = "any";
            progress.min = options.min ?? 0;
            progress.max = options.max ?? 1;
            progress.value = value;
            
            if(options.low)
                progress.low = options.low;
            if(options.high)
                progress.high = options.high;
            if(options.optimum)
                progress.optimum = options.optimum;

            container.appendChild(progress);
            element.appendChild(container);

            if(options.showValue) {
                if(document.getElementById('progressvalue-' + name ))
                    document.getElementById('progressvalue-' + name ).remove();
                let span = document.createElement("span");
                span.id = "progressvalue-" + name;
                span.style.padding = "0px 5px";
                span.innerText = value;
                container.appendChild(span);
            }

            if(options.editable) {
                progress.classList.add("editable");
                progress.addEventListener("mousemove", inner_mousemove.bind(this, value));
                progress.addEventListener("mouseup", inner_mouseup.bind(this, progress));

                function inner_mousemove(value, e) {
                
                    if(e.which < 1)
                        return;
                    let v = this.getValue(name, value);
                    v+=e.movementX/100;
                    v = v.toFixed(2);
                    this.setValue(name, v);

                    if(options.callback)
                        options.callback(v, e);
                }

                function inner_mouseup(el) {
                    el.removeEventListener("mousemove", inner_mousemove);
                }
            }

            return widget;
        }

        /**
         * @method addFile
         * @param {String} name Widget name
         * @param {Function} callback Callback function on change
         * @param {*} options:
         * local: Ask for local file
         * type: type to read as [text (Default), buffer, bin, url]
         */

        addFile( name, callback, options = { } ) {

            if(!name) {
                throw("Set Widget Name!");
            }

            let widget = this.create_widget(name, Widget.FILE, options);
            let element = widget.domEl;

            let local = options.local ?? true;
            let type = options.type ?? 'text';
            let read = options.read ?? true; 

            // Create hidden input
            let input = document.createElement('input');
            input.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " - 10%)";
            input.type = 'file';
            if(options.placeholder)
                input.placeholder = options.placeholder;

            input.addEventListener('change', function(e) {
                const files = e.target.files;
                if(!files.length) return;
                if(read) {
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
                }
                else 
                    callback(files[0]);
                
            });

            element.appendChild(input);

            this.queue( element );
            
            if(local) {

                this.addButton(null, "<a style='margin-top: 0px;' class='fa-solid fa-gear'></a>", () => {
                    
                    new Dialog("Load Settings", p => {
                        p.addDropdown("Type", ['text', 'buffer', 'bin', 'url'], type, v => { type = v } );
                        p.addButton(null, "Reload", v => { input.dispatchEvent( new Event('change') ) } );
                    });
                    
                }, { className: "small" });
            }

            this.clearQueue();

            return widget;
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
            if(!name)
                toolsDiv.className += " notitle";

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
                node_filter_input.addEventListener('input', function(){
                    nodeTree.refresh();
                });
        
                let searchIcon = document.createElement('a');
                searchIcon.className = "lexicon fa-solid fa-magnifying-glass";
                toolsDiv.appendChild(node_filter_input);
                toolsDiv.appendChild(searchIcon);
            }

            if(options.icons || options.filter)
                container.appendChild(toolsDiv);

            // Tree

            let list = document.createElement('ul');
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
            let root = this.current_branch ? this.current_branch.content : this.root;
            if(!this.current_branch)
                console.warn("No current branch!");

            if(tabs.constructor != Array)
                throw("Param @tabs must be an Array!");

            const vertical = options.vertical ?? true;
            const showNames = !vertical && (options.showNames ?? false);

            let container = document.createElement('div');
            container.className = "lextabscontainer";
            if( !vertical ) container.className += " horizontal";

            let tabContainer = document.createElement("div");
            tabContainer.className = "tabs";
            container.appendChild( tabContainer );
            root.appendChild( container );

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
                this.queue( infoContainer );
                tab.callback( this, infoContainer );
                this.clearQueue();
            }
            
            this.addSeparator();
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
            
            title.innerHTML = "<a class='fa-solid fa-angle-up switch-branch-button'></a>";
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
                e.stopPropagation();
                this.classList.toggle('closed');
                this.parentElement.classList.toggle('closed');

                that.content.toggleAttribute('hidden');
                that.grabber.toggleAttribute('hidden');

                LX.emit("@on_branch_closed", this.classList.contains("closed"), that.panel);
            };

            this.oncontextmenu = function(e) {

                e.preventDefault();
                e.stopPropagation();

                if( this.parentElement.classList.contains("dialog") )
                   return;
                   
                addContextMenu("Dock", e, p => {
                    e.preventDefault();
                    // p.add('<i class="fa-regular fa-window-maximize">', {id: 'dock_options0'});
                    // p.add('<i class="fa-regular fa-window-maximize fa-rotate-180">', {id: 'dock_options1'});
                    // p.add('<i class="fa-regular fa-window-maximize fa-rotate-90">', {id: 'dock_options2'});
                    // p.add('<i class="fa-regular fa-window-maximize fa-rotate-270">', {id: 'dock_options3'});
                    p.add('Floating', that.#on_make_floating.bind(that));
                }, { icon: "fa-regular fa-window-restore" });
            };

            title.addEventListener("click", this.onclick);
            title.addEventListener("contextmenu", this.oncontextmenu);
        }

        #on_make_floating() {

            const dialog = new Dialog(this.name, p => {
                // add widgets
                for( let w of this.widgets ) {
                    p.root.appendChild( w.domEl );
                }
            });
            dialog.widgets = this.widgets;

            const parent = this.root.parentElement;

            this.root.remove();

            // Make next the first branch
            const next_branch = parent.querySelector(".lexbranch");
            if(next_branch) next_branch.classList.add('first');

            // Make new last the last branch
            const last_branch = parent.querySelectorAll(".lexbranch");
            if(last_branch.length) last_branch[last_branch.length - 1].classList.add('last');
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
                    that._updateWidgets();
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

        _updateWidgets() {

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
                        padding = "10%";
                        break;
                    case Widget.TEXT:
                        padding = "8px";
                        break;
                };

                value.style.width = "-moz-calc( 100% - " + size + " - " + padding + " )";
                value.style.width = "-webkit-calc( 100% - " + size + " - " + padding + " )";
                value.style.width = "calc( 100% - " + size + " - " + padding + " )";

                if(widget.onresize) widget.onresize();
            }
        }
    };

    LX.Branch = Branch;

    /**
     * @class Dialog
     */

    class Dialog {

        #oncreate;

        static #last_id = 0;

        constructor( title, callback, options = {} ) {
            
            if(!callback)
            console.warn("Content is empty, add some widgets using 'callback' parameter!");

            this.#oncreate = callback;
            this.id = simple_guidGenerator();

            const size = options.size ?? [],
                position = options.position ?? [],
                draggable = options.draggable ?? true,
                modal = options.modal ?? false;

            if(modal)
                LX.modal.toggle(false);

            var root = document.createElement('div');
            root.className = "lexdialog";
            root.id = options.id ?? "dialog" + Dialog.#last_id++;
            LX.root.appendChild( root );

            let that = this;

            var titleDiv = document.createElement('div');

            if(title) {

                titleDiv.className = "lexdialogtitle";
                titleDiv.innerHTML = title;
                titleDiv.setAttribute('draggable', false);

                titleDiv.oncontextmenu = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
    
                    if(!LX.main_area || LX.main_area.type !== 'horizontal')
                        return;

                    addContextMenu("Dock", e, p => {
                        e.preventDefault();
                        
                        const get_next_panel = function(area) {
                            let p = area.panels[0];
                            if( p ) return p;
                            for(var s of area.sections){
                                p = get_next_panel(s);
                                if( p ) return p;
                            }
                        }

                        const append_branch = function(panel) {
                            let branch = panel.branches.find( b => b.name === title );
                            if( !branch ) {
                                panel.branch(title);
                                branch = panel.branches.find( b => b.name === title );                                    
                            }else
                                panel.root.appendChild( branch.root );

                            for( let w of that.widgets ) {
                                branch.content.appendChild( w.domEl );
                            }

                            branch.widgets = that.widgets;

                            // Make new last the last branch
                            panel.root.querySelectorAll(".lexbranch.last").forEach( e => { e.classList.remove("last"); } );
                            branch.root.classList.add('last');
                            root.remove();
                        }
                        
                        // Right
                        let rpanel = get_next_panel(LX.main_area.sections[1]);
                        p.add('<i class="fa-regular fa-window-maximize fa-window-maximize fa-rotate-90">', {disabled: !rpanel, id: 'dock_options0', callback: () => {
                            append_branch(rpanel);
                        }});
                        // Left
                        let lpanel = get_next_panel(LX.main_area.sections[0]);
                        p.add('<i class="fa-regular fa-window-maximize fa-window-maximize fa-rotate-270">', {disabled: !lpanel, id: 'dock_options1', callback: () => {
                            append_branch(lpanel);
                        }});
                    }, { icon: "fa-regular fa-window-restore" });
                };

                root.appendChild(titleDiv);
            }

            if( options.closable ?? true)
            {
                this.close = () => {

                    if( !options.onclose )
                    {
                        that.panel.clear();
                        root.remove();
                    } else
                    {
                        options.onclose( this.root );
                    }

                    if(modal)
                        LX.modal.toggle();
                };

                var closeButton = document.createElement('a');
                closeButton.className = "lexdialogcloser fa-solid fa-xmark";
                closeButton.title = "Close";
                closeButton.addEventListener('click', this.close);

                if(title) titleDiv.appendChild(closeButton);
                else {
                    closeButton.classList.add("notitle");
                    root.appendChild(closeButton);
                }
            }

            const panel = new Panel();
            panel.root.classList.add('lexdialogcontent');
            if(!title) panel.root.classList.add('notitle');
            if(callback)
                callback.call(this, panel);
            root.appendChild(panel.root);

            // Make branches have a distintive to manage some cases
            panel.root.querySelectorAll(".lexbranch").forEach( b => b.classList.add("dialog") );
            
            this.panel = panel;
            this.root = root;
            this.title = titleDiv;

            if(draggable)
                set_as_draggable(root);

            // Process position and size
            if(size.length && typeof(size[0]) != "string")
                size[0] += "px";
            if(size.length && typeof(size[1]) != "string")
                size[1] += "px";

            root.style.width = size[0] ? (size[0]) : "25%";
            root.style.height = size[1] ? (size[1]) : "auto";

            if(options.size) this.size = size;
            
            let rect = root.getBoundingClientRect();
            root.style.left = position[0] ? (position[0]) : "calc( 50% - " + (rect.width * 0.5) + "px )";
            root.style.top = position[1] ? (position[1]) : "calc( 50vh - " + (rect.height * 0.5) + "px )";

            panel.root.style.width = "calc( 100% - 30px )";
            panel.root.style.height = title ? "calc( 100% - " + (titleDiv.offsetHeight + 30) + "px )" : "calc( 100% - 51px )";
        }

        refresh() {

            this.panel.root.innerHTML = "";
            this.#oncreate.call(this, this.panel);
        }

        setPosition(x, y) {
            
            this.root.style.left = x + "px";
            this.root.style.top = y + "px";
        }
    }

    LX.Dialog = Dialog;

    /**
     * @class PocketDialog
     */

    class PocketDialog extends Dialog {

        static TOP      = 0;
        static BOTTOM   = 1;

        constructor( title, callback, options = {} ) {

            options.draggable = options.draggable ?? false;
            options.closable = options.closable ?? false;
            
            super( title, callback, options );
            
            let that = this;
            // Update margins on branch title closes/opens
            LX.addSignal("@on_branch_closed", this.panel, closed => {
                if( this.dock_pos == PocketDialog.BOTTOM )
                    this.root.style.top = "calc(100% - " + (this.root.offsetHeight + 6) + "px)";
            });

            // Custom 
            this.root.classList.add( "pocket" );
            this.root.style.left = "calc(100% - " + (this.root.offsetWidth + 6) + "px)";
            this.root.style.top = "0px";
            this.panel.root.style.width = "calc( 100% - 12px )";
            this.panel.root.style.height = "calc( 100% - 40px )";
            this.dock_pos = PocketDialog.TOP;

            this.minimized = false;
            this.title.tabIndex = -1;
            this.title.addEventListener("click", e => {

                // Sized dialogs have to keep their size 
                if( this.size )
                {
                    if( !this.minimized ) this.root.style.height = "auto";
                    else this.root.style.height = this.size[1];
                }

                this.root.classList.toggle("minimized");
                this.minimized = !this.minimized;

                if( this.dock_pos == PocketDialog.BOTTOM )
                    that.root.style.top = this.root.classList.contains("minimized") ? 
                    "calc(100% - " + (that.title.offsetHeight + 6) + "px)" : "calc(100% - " + (that.root.offsetHeight + 6) + "px)";
            });

            if( !options.draggable )
            {
                const float = options.float;

                if( float )
                {
                    for( var i = 0; i < float.length; i++ )
                    {
                        const t = float[i];
                        switch( t )
                        {
                        case 'b': 
                            this.root.style.top = "calc(100% - " + (this.root.offsetHeight + 6) + "px)";
                            break;
                        case 'l': 
                            this.root.style.left = "0px";
                            break;
                        }
                    }
                }

                this.root.classList.add('dockable');
                this.title.addEventListener("keydown", function(e) {
                    if( e.ctrlKey && e.key == 'ArrowLeft' ) {
                        that.root.style.left = '0px';
                    } else if( e.ctrlKey && e.key == 'ArrowRight' ) {
                        that.root.style.left = "calc(100% - " + (that.root.offsetWidth + 6) + "px)";
                    }else if( e.ctrlKey && e.key == 'ArrowUp' ) {
                        that.root.style.top = "0px";
                        that.dock_pos = PocketDialog.TOP;
                    }else if( e.ctrlKey && e.key == 'ArrowDown' ) {
                        that.root.style.top = "calc(100% - " + (that.root.offsetHeight + 6) + "px)";
                        that.dock_pos = PocketDialog.BOTTOM;
                    }
                });
            }
        }
    }

    LX.PocketDialog = PocketDialog;

    /**
     * @class ContextMenu
     */

    class ContextMenu {

        constructor( event, title, options = {} ) {
            
            // remove all context menus
            document.body.querySelectorAll(".lexcontextmenubox").forEach(e => e.remove());

            this.root = document.createElement('div');
            this.root.className = "lexcontextmenubox";
            this.root.style.left = (event.x - 48) + "px";
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
                item[ 'icon' ] = options.icon;
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

            this.root.querySelectorAll(".lexcontextmenubox").forEach( cm => cm.remove() );

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
            contextmenu.style.marginTop =  3.5 - c.offsetHeight + "px";

            // Set final width
            contextmenu.style.width = contextmenu.offsetWidth + "px";
            this.#adjust_position( contextmenu, 6, true );
        }

        #create_entry( o, k, c, d ) {

            const hasSubmenu = o[ k ].length;
            let entry = document.createElement('div');
            entry.className = "lexcontextmenuentry" + (o[ 'className' ] ? " " + o[ 'className' ] : "" );
            entry.id = o.id ?? ("eId" + k.replace(/\s/g, '').replace('@', '_'));
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

            if( k == "" ) {
                entry.className += " cmseparator";
                return;
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

                if( !hasSubmenu )
                return;

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
            path = path + ""; // make string!
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
                        item[ 'id' ] = options.id;
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
                let pKey = "eId" + key.replace(/\s/g, '').replace('@', '_');

                // Item already created
                const id = "#" + (item.id ?? pKey);
                if( !this.root.querySelector(id) )
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

    function addContextMenu( title, event, callback, options )
    {
        var menu = new ContextMenu( event, title, options );
        LX.root.appendChild(menu.root);

        if(callback)
            callback( menu );

        menu.onCreate();

        return menu;
    }

    LX.addContextMenu = addContextMenu;

    /**
     * @class Curve
     */

    // forked from litegui.js @jagenjo

    class Curve {

        constructor(panel, value, options = {}) {

            let element = document.createElement("div");
            element.className = "curve " + (options.className ? options.className : "");
            element.style.minHeight = "50px";
            element.style.width = options.width || "100%";

            element.bgcolor = options.bgcolor || "#15181c";
            element.pointscolor = options.pointscolor || "#7b8ae2";
            element.linecolor = options.linecolor || "#555";

            element.value = value || [];
            element.xrange = options.xrange || [0,1]; //min,max
            element.yrange = options.yrange || [0,1]; //min,max
            element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
            element.no_trespassing = options.no_trespassing || false;
            element.show_samples = options.show_samples || 0;
            element.allow_add_values = options.allow_add_values ?? true;
            element.draggable_x = options.draggable_x ?? true;
            element.draggable_y = options.draggable_y ?? true;

            element.options = options;
            element.style.minWidth = "50px";
            element.style.minHeight = "20px";

            this.element = element;

            let canvas = document.createElement("canvas");
            canvas.width = options.width || 200;
            canvas.height = options.height || 50;
            element.appendChild( canvas );
            this.canvas = canvas;

            element.addEventListener("mousedown", onmousedown);

            element.getValueAt = function(x) {

                if(x < element.xrange[0] || x > element.xrange[1])
                    return element.defaulty;

                var last = [ element.xrange[0], element.defaulty ];
                var f = 0;
                for(var i = 0; i < element.value.length; i += 1)
                {
                    var v = element.value[i];
                    if(x == v[0]) return v[1];
                    if(x < v[0])
                    {
                        f = (x - last[0]) / (v[0] - last[0]);
                        return last[1] * (1-f) + v[1] * f;
                    }
                    last = v;
                }

                v = [ element.xrange[1], element.defaulty ];
                f = (x - last[0]) / (v[0] - last[0]);
                return last[1] * (1-f) + v[1] * f;
            }

            element.resample = function(samples) {

                var r = [];
                var dx = (element.xrange[1] - element.xrange[0]) / samples;
                for(var i = element.xrange[0]; i <= element.xrange[1]; i += dx)
                {
                    r.push( element.getValueAt(i) );
                }
                return r;
            }

            element.addValue = function(v) {

                for(var i = 0; i < element.value; i++) {
                    var value = element.value[i];
                    if(value[0] < v[0]) continue;
                    element.value.splice(i,0,v);
                    redraw();
                    return;
                }

                element.value.push(v);
                redraw();
            }

            //value to canvas
            function convert(v) {
                return [ canvas.width * ( v[0] - element.xrange[0])/ (element.xrange[1]),
                    canvas.height * (v[1] - element.yrange[0])/ (element.yrange[1])];
                // return [ canvas.width * ( (element.xrange[1] - element.xrange[0]) * v[0] + element.xrange[0]),
                //     canvas.height * ((element.yrange[1] - element.yrange[0]) * v[1] + element.yrange[0])];
            }

            //canvas to value
            function unconvert(v) {
                return [(v[0] * element.xrange[1] / canvas.width + element.xrange[0]),
                        (v[1] * element.yrange[1] / canvas.height + element.yrange[0])];
                // return [(v[0] / canvas.width - element.xrange[0]) / (element.xrange[1] - element.xrange[0]),
                //         (v[1] / canvas.height - element.yrange[0]) / (element.yrange[1] - element.yrange[0])];
            }

            var selected = -1;

            element.redraw = function(o = {} )  {
                
                if(o.value) element.value = o.value;
                if(o.xrange) element.xrange = o.xrange;
                if(o.yrange) element.yrange = o.yrange;

                var rect = canvas.parentElement.getBoundingClientRect();
                if(canvas.parentElement.parentElement) rect = canvas.parentElement.parentElement.getBoundingClientRect();
                if(rect && canvas.width != rect.width && rect.width && rect.width < 1000)
                    canvas.width = rect.width;
                // if(rect && canvas.height != rect.height && rect.height && rect.height < 1000)
                //     canvas.height = rect.height;

                var ctx = canvas.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.translate(0,canvas.height);
                ctx.scale(1,-1);

                ctx.fillStyle = element.bgcolor;
                ctx.fillRect(0,0,canvas.width,canvas.height);

                ctx.strokeStyle = element.linecolor;
                ctx.beginPath();

                //draw line
                var pos = convert([element.xrange[0],element.defaulty]);
                ctx.moveTo( pos[0], pos[1] );

                for(var i in element.value) {
                    var value = element.value[i];
                    pos = convert(value);
                    ctx.lineTo( pos[0], pos[1] );
                }

                pos = convert([element.xrange[1],element.defaulty]);
                ctx.lineTo( pos[0], pos[1] );
                ctx.stroke();

                //draw points
                for(var i = 0; i < element.value.length; i += 1) {
                    var value = element.value[i];
                    pos = convert(value);
                    if(selected == i)
                        ctx.fillStyle = "white";
                    else
                        ctx.fillStyle = element.pointscolor;
                    ctx.beginPath();
                    ctx.arc( pos[0], pos[1], selected == i ? 4 : 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                if(element.show_samples) {
                    var samples = element.resample(element.show_samples);
                    ctx.fillStyle = "#888";
                    for(var i = 0; i < samples.length; i += 1)
                    {
                        var value = [ i * ((element.xrange[1] - element.xrange[0]) / element.show_samples) + element.xrange[0], samples[i] ];
                        pos = convert(value);
                        ctx.beginPath();
                        ctx.arc( pos[0], pos[1], 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            var last_mouse = [0,0];

            function onmousedown(evt) {
                document.addEventListener("mousemove",onmousemove);
                document.addEventListener("mouseup",onmouseup);

                var rect = canvas.getBoundingClientRect();
                var mousex = evt.clientX - rect.left;
                var mousey = evt.clientY - rect.top;

                selected = computeSelected(mousex,canvas.height-mousey);

                if(selected == -1 && element.allow_add_values) {
                    var v = unconvert([mousex,canvas.height-mousey]);
                    element.value.push(v);
                    sortValues();
                    selected = element.value.indexOf(v);
                }

                last_mouse = [mousex,mousey];
                element.redraw();
                evt.preventDefault();
                evt.stopPropagation();
            }

            function onmousemove(evt) {
                var rect = canvas.getBoundingClientRect();
                var mousex = evt.clientX - rect.left;
                var mousey = evt.clientY - rect.top;

                if(mousex < 0) mousex = 0;
                else if(mousex > canvas.width) mousex = canvas.width;
                if(mousey < 0) mousey = 0;
                else if(mousey > canvas.height) mousey = canvas.height;

                //dragging to remove
                if( selected != -1 && distance( [evt.clientX - rect.left, evt.clientY - rect.top], [mousex,mousey] ) > canvas.height * 0.5 )
                {
                    element.value.splice(selected,1);
                    onmouseup(evt);
                    return;
                }

                var dx = element.draggable_x ? last_mouse[0] - mousex : 0;
                var dy = element.draggable_y ? last_mouse[1] - mousey : 0;
                var delta = unconvert([-dx,dy]);
                if(selected != -1) {
                    var minx = element.xrange[0];
                    var maxx = element.xrange[1];

                    if(element.no_trespassing)
                    {
                        if(selected > 0) minx = element.value[selected-1][0];
                        if(selected < (element.value.length-1) ) maxx = element.value[selected+1][0];
                    }

                    var v = element.value[selected];
                    v[0] += delta[0];
                    v[1] += delta[1];
                    if(v[0] < minx) v[0] = minx;
                    else if(v[0] > maxx) v[0] = maxx;
                    if(v[1] < element.yrange[0]) v[1] = element.yrange[0];
                    else if(v[1] > element.yrange[1]) v[1] = element.yrange[1];
                }

                sortValues();
                element.redraw();
                last_mouse[0] = mousex;
                last_mouse[1] = mousey;
                onchange(evt);

                evt.preventDefault();
                evt.stopPropagation();
            }

            function onmouseup(evt) {
                selected = -1;
                element.redraw();
                document.removeEventListener("mousemove", onmousemove);
                document.removeEventListener("mouseup", onmouseup);
                onchange(evt);
                evt.preventDefault();
                evt.stopPropagation();
            }
            
            function onchange(e) {
                if(options.callback)
                    options.callback.call(element, element.value, e);
            }

            function distance(a,b) { return Math.sqrt( Math.pow(b[0]-a[0],2) + Math.pow(b[1]-a[1],2) ); };

            function computeSelected(x,y) {

                var min_dist = 100000;
                var max_dist = 8; //pixels
                var selected = -1;
                for(var i=0; i < element.value.length; i++)
                {
                    var value = element.value[i];
                    var pos = convert(value);
                    var dist = distance([x,y],pos);
                    if(dist < min_dist && dist < max_dist)
                    {
                        min_dist = dist;
                        selected = i;
                    }
                }
                return selected;
            }

            function sortValues() {
                var v = null;
                if(selected != -1)
                    v = element.value[selected];
                element.value.sort(function(a,b) { return a[0] - b[0]; });
                if(v)
                    selected = element.value.indexOf(v);
            }
            
            element.redraw();
            return this;
        }

        redraw(options = {}) {
            this.element.redraw(options);
        }
    }

    LX.Curve = Curve;

    class AssetViewEvent {

        static NONE             = 0;
        static ASSET_SELECTED   = 1;
        static ASSET_DELETED    = 2;
        static ASSET_RENAMED    = 3;
        static ASSET_CLONED     = 4;
        static ASSET_DBCLICK    = 5;

        constructor( type, item, value ) {
            this.type = type || TreeEvent.NONE;
            this.item = item;
            this.value = value;
            this.multiple = false; // Multiple selection
        }
        
        string() {
            switch(this.type) {
                case AssetViewEvent.NONE: return "assetview_event_none";
                case AssetViewEvent.ASSET_SELECTED: return "assetview_event_selected";
                case AssetViewEvent.ASSET_DELETED: return "assetview_event_deleted";
                case AssetViewEvent.ASSET_RENAMED:  return "assetview_event_renamed";
                case AssetViewEvent.ASSET_CLONED:  return "assetview_event_cloned";
                case AssetViewEvent.ASSET_DBCLICK:  return "assetview_event_dbclick";
            }
        }
    };

    LX.AssetViewEvent = AssetViewEvent;

    /**
     * @class AssetView
     * @description Asset container with Tree for file system
     */

    class AssetView {

        /**
         * @param {object} options
         */
        constructor( options = {} ) {

            let div = document.createElement('div');
            div.className = 'lexassetbrowser';
            this.root = div;

            let area = new LX.Area({height: "100%"});
            div.appendChild(area.root);

            let left, right, content_area = area;

            this.skip_browser = options.skip_browser ?? false;
            this.skip_preview = options.skip_preview ?? false;
            this.preview_actions = options.preview_actions ?? [];

            if( !this.skip_browser )
            {
                [left, right] = area.split({ type: "horizontal", sizes: ["15%", "85%"]});
                content_area = right;
            }

            if( !this.skip_preview )
                [content_area, right] = content_area.split({ type: "horizontal", sizes: ["80%", "20%"]});
            
            this.allowed_types = ["None", "Image", "Mesh", "Script", "JSON", "Clip"];

            this.prev_data = [];
            this.next_data = [];
            this.data = [];

            this._process_data(this.data, null);

            this.current_data = this.data;
            this.path = ['@'];

            if(!this.skip_browser)
                this._create_tree_panel(left);

            this._create_content_panel(content_area);
            
            // Create resource preview panel
            if( !this.skip_preview )
                this.previewPanel = right.addPanel({className: 'lexassetcontentpanel', style: { overflow: 'scroll' }});
        }

        /**
        * @method load
        */

        load( data, onevent ) {

            this.prev_data.length = 0;
            this.next_data.length = 0;
            
            this.data = data;
            this._process_data(this.data, null);
            this.current_data = this.data;
            this.path = ['@'];

            if(!this.skip_browser)
                this._create_tree_panel(this.area);
            this._refresh_content();

            this.onevent = onevent;
        }

        /**
        * @method clear
        */
        clear() {
            if(this.previewPanel)
                this.previewPanel.clear();
            if(this.leftPanel)
                this.leftPanel.clear();
            if(this.rightPanel)
             this.rightPanel.clear()
        }

        /**
        * @method _process_data
        */

        _process_data( data, parent ) {

            if( data.constructor !== Array )
            {
                // process
                data['folder'] = parent;
                data.children = data.children ?? [];
            }

            let list = data.constructor === Array ? data : data.children;

            for( var i = 0; i < list.length; ++i )
                this._process_data( list[i], data );
        }

        /**
        * @method _update_path
        */

        _update_path( data ) {
            
            this.path.length = 0;

            const push_parents_id = i => {
                if(!i) return;
                let list = i.children ? i.children : i;
                let c = list[0];
                if( !c ) return;
                if( !c.folder ) return;
                this.path.push( c.folder.id ?? '@' );
                push_parents_id( c.folder.folder );
            };

            push_parents_id( data );

            LX.emit("@on_folder_change", this.path.reverse().join('/'));
        }

        /**
        * @method _create_tree_panel
        */

        _create_tree_panel(area) {

            if(this.leftPanel)
                this.leftPanel.clear();
            else {
                this.leftPanel = area.addPanel({className: 'lexassetbrowserpanel'});
            }

            // Process data to show in tree
            let tree_data = {
                id: '/',
                children: this.data
            }

            this.tree = this.leftPanel.addTree("Content Browser", tree_data, { 
                // icons: tree_icons, 
                filter: false,
                only_parents: true,
                onevent: (event) => { 

                    let node = event.node;
                    let value = event.value;

                    switch(event.type) {
                        case LX.TreeEvent.NODE_SELECTED: 
                            if(!event.multiple) {
                                this._enter_folder( node );
                            }
                            if(!node.parent) {
                                this.prev_data.push( this.current_data );
                                this.current_data = this.data;
                                this._refresh_content();

                                this.path = ['@'];
                                LX.emit("@on_folder_change", this.path.join('/'));
                            }
                            break;
                        case LX.TreeEvent.NODE_DRAGGED: 
                            node.folder = value;
                            this._refresh_content();
                            break;
                    }
                },
            });    
        }

        /**
        * @method _create_content_panel
        */

        _create_content_panel(area) {

            if(this.rightPanel)
                this.rightPanel.clear();
            else {
                this.rightPanel = area.addPanel({className: 'lexassetcontentpanel'});
            }

            const on_sort = (value, event) => {
                const cmenu = addContextMenu( "Sort by", event, c => {
                    c.add("Name", () => this._sort_data('id') );
                    c.add("Type", () => this._sort_data('type') );
                    c.add("");
                    c.add("Ascending", () => this._sort_data() );
                    c.add("Descending", () => this._sort_data(null, true) );
                } );
                const parent = this.parent.root.parentElement;
                if( parent.classList.contains('lexdialog') )
                    cmenu.root.style.zIndex = (+getComputedStyle( parent ).zIndex) + 1;
            }

            this.rightPanel.sameLine();
            this.rightPanel.addDropdown("Filter", this.allowed_types, "None", (v) => this._refresh_content.call(this, null, v), { width: "20%" });
            this.rightPanel.addText(null, this.search_value ?? "", (v) => this._refresh_content.call(this, v, null), { placeholder: "Search assets.." });
            this.rightPanel.addButton(null, "<a class='fa fa-arrow-up-short-wide'></a>", on_sort.bind(this), { width: "3%" });
            this.rightPanel.endLine();

            if( !this.skip_browser )
            {
                this.rightPanel.sameLine();
                this.rightPanel.addComboButtons( null, [
                    {
                        value: "Left",
                        icon: "fa-solid fa-left-long",
                        callback:  (domEl) => { 
                            if(!this.prev_data.length) return;
                            this.next_data.push( this.current_data );
                            this.current_data = this.prev_data.pop();
                            this._refresh_content();
                            this._update_path( this.current_data );
                        }
                    },
                    {
                        value: "Right",
                        icon: "fa-solid fa-right-long",
                        callback:  (domEl) => { 
                            if(!this.next_data.length) return;
                            this.prev_data.push( this.current_data );
                            this.current_data = this.next_data.pop();
                            this._refresh_content();
                            this._update_path( this.current_data );
                        }
                    },
                    {
                        value: "Refresh",
                        icon: "fa-solid fa-arrows-rotate",
                        callback:  (domEl) => { this._refresh_content(); }
                    }
                ], { width: "auto", noSelection: true } );
                this.rightPanel.addText(null, this.path.join('/'), null, { disabled: true, signal: "@on_folder_change", style: { fontSize: "16px", color: "#aaa" } });
                this.rightPanel.endLine();
            }

            this.content = document.createElement('ul');
            this.content.className = "lexassetscontent";
            this.rightPanel.root.appendChild(this.content);

            this.content.addEventListener('dragenter', function(e) {
                e.preventDefault();
                this.classList.add('dragging');
            });
            this.content.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragging');
            });
            this.content.addEventListener('drop', (e) => {
                e.preventDefault();
                this._process_drop(e);
            });
            this.content.addEventListener('click', function() {
                this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
            });

            this._refresh_content();
        }

        _refresh_content(search_value, filter) {

            this.filter = filter ?? (this.filter ?? "None");
            this.search_value = search_value ?? (this.search_value ?? "");
            this.content.innerHTML = "";
            let that = this;

            const add_item = function(item) {

                const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                const is_folder = type === "Folder";
                const is_image = type === "Image";

                if((that.filter != "None" && type != that.filter) || !item.id.toLowerCase().includes(that.search_value.toLowerCase()))
                    return;

                let itemEl = document.createElement('li');
                itemEl.className = "lexassetitem " + item.type.toLowerCase();
                itemEl.title = type + ": " + item.id;
                itemEl.tabIndex = -1;
                that.content.appendChild(itemEl);

                let title = document.createElement('span');
                title.className = "lexassettitle";
                title.innerText = item.id;
                itemEl.appendChild(title);

                if( !that.skip_preview ) {

                    let preview = document.createElement('img');
                    const has_image = item.src && ['png', 'jpg'].indexOf( getExtension( item.src ) ) > -1;
                    preview.src = has_image ? item.src : "../images/" + item.type.toLowerCase() + ".png";
                    if(item.unknown_extension) preview.src = "../images/file.png";
                    itemEl.appendChild(preview);
                }

                if( !is_folder )
                {
                    let info = document.createElement('span');
                    info.className = "lexassetinfo";
                    info.innerText = type;
                    itemEl.appendChild(info);
                }

                itemEl.addEventListener('click', function(e) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();

                    if( !is_folder ) {
                        if(!e.shiftKey)
                            that.content.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
                        this.classList.add('selected');
                        if( !that.skip_preview )
                            that._preview_asset( item );
                    } else
                        that._enter_folder( item );

                    if(that.onevent) {
                        const event = new AssetViewEvent(e.detail === 1 ? AssetViewEvent.ASSET_SELECTED: AssetViewEvent.ASSET_DBCLICK, e.shiftKey ? [item] : item );
                        event.multiple = !!e.shiftKey;
                        that.onevent( event );
                    }
                });

                itemEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();

                    const multiple = that.content.querySelectorAll('.selected').length;

                    LX.addContextMenu( multiple > 1 ? (multiple + " selected") : 
                                is_folder ? item.id : item.type, e, m => {
                        if(multiple <= 1)   
                            m.add("Rename");
                        if( !is_folder )
                            m.add("Clone", that._clone_item.bind(that, item));
                        if(multiple <= 1)
                            m.add("Properties");
                        m.add("");
                        m.add("Delete", that._delete_item.bind(that, item));
                    });
                });

                itemEl.addEventListener("dragstart", function(e) {
                    e.preventDefault();
                }, false );

                return itemEl;
            }

            const fr = new FileReader();

            for( let item of this.current_data )
            {
                if( item.path )
                {
                    LX.request({ url: item.path, dataType: 'blob', success: (f) => {
                        fr.readAsDataURL( f );
                        fr.onload = e => { 
                            item.src = e.currentTarget.result;
                            delete item.path;
                            this._refresh_content(search_value, filter);
                        };
                    } });
                }else
                {
                    item.domEl = add_item( item );
                }
            }
        }

        /**
        * @method _preview_asset
        */

        _preview_asset(file) {

            this.previewPanel.clear();

            this.previewPanel.branch("Asset");

            if( file.type == 'image' || file.src )
            {
                const has_image = ['png', 'jpg'].indexOf( getExtension( file.src ) ) > -1;
                const source = has_image ? file.src : "../images/" + file.type.toLowerCase() + ".png";
                this.previewPanel.addImage(source, { style: { width: "100%" } });
            }

            const options = { disabled: true };

            this.previewPanel.addText("Filename", file.id, null, options);
            this.previewPanel.addText("URL", file.src, null, options);
            this.previewPanel.addText("Path", this.path.join('/'), null, options);
            this.previewPanel.sameLine();
            this.previewPanel.addText("Type", file.type, null, options);
            this.previewPanel.addText("Size", file.bytesize ?? "0 KBs", null, options);
            this.previewPanel.endLine();
            this.previewPanel.addSeparator();
            
            const preview_actions = [...this.preview_actions];

            if( !preview_actions.length )
            {
                // By default
                preview_actions.push({
                    name: 'Download', 
                    callback: () => LX.downloadURL(file.src, file.id)
                });
            }

            for( let action of preview_actions )
            {
                if( action.type && action.type !== file.type )
                    continue;
                this.previewPanel.addButton( null, action.name, action.callback.bind( this, file ) );
            }

            this.previewPanel.merge();
        }

        _process_drop(e) {

            const fr = new FileReader();
            const num_files = e.dataTransfer.files.length;

            for( let i = 0; i < e.dataTransfer.files.length; ++i )
            {
                const file = e.dataTransfer.files[i];

                const result = this.current_data.find( e => e.id === file.name );
                if(result) continue;

                fr.readAsDataURL( file );
                fr.onload = e => { 
                    
                    let ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();

                    let item = {
                        "id": file.name,
                        "src": e.currentTarget.result,
                        "extension": ext
                    };

                    switch(ext)
                    {
                    case 'png':
                    case 'jpg':
                        item.type = "image"; break;
                    case 'js': 
                        item.type = "script"; break;
                    case 'json': 
                        item.type = "json"; break;
                    default:
                        item.type = ext;
                        item.unknown_extension = true;
                        break;
                    }

                    this.current_data.push( item );
                    
                    if(i == (num_files - 1)) {
                        this._refresh_content();
                        if( !this.skip_browser )
                            this.tree.refresh();
                    }
                };
            }
        }

        _sort_data( sort_by, sort_descending = false ) {

            sort_by = sort_by ?? (this._last_sort_by ?? 'id');
            this.data = this.data.sort( (a, b) => {
                var r = sort_descending ? b[sort_by].localeCompare(a[sort_by]) : a[sort_by].localeCompare(b[sort_by]);
                if(r == 0) r = sort_descending ? b['id'].localeCompare(a['id']) : a['id'].localeCompare(b['id']);
                return r;
            } );

            this._last_sort_by = sort_by;
            this._refresh_content();
        }

        _enter_folder( folder_item ) {

            this.prev_data.push( this.current_data );
            this.current_data = folder_item.children;
            this._refresh_content();

            // Update path
            this._update_path(this.current_data);
        }

        _delete_item( item ) {

            const idx = this.current_data.indexOf(item);
            if(idx > -1) {
                this.current_data.splice(idx, 1);
                this._refresh_content(this.search_value, this.filter);

                if(this.onevent) {
                    const event = new AssetViewEvent(AssetViewEvent.ASSET_DELETED, item );
                    this.onevent( event );
                }

                this.tree.refresh();
                this._process_data(this.data);
            }
        }

        _clone_item( item ) {

            const idx = this.current_data.indexOf(item);
            if(idx > -1) {
                delete item.domEl;
                delete item.folder;
                const new_item = deepCopy( item );
                this.current_data.splice(idx, 0, new_item);
                this._refresh_content(this.search_value, this.filter);

                if(this.onevent) {
                    const event = new AssetViewEvent(AssetViewEvent.ASSET_CLONED, item );
                    this.onevent( event );
                }

                this._process_data(this.data);
            }
        }

    }

    LX.AssetView = AssetView;
        
    /*
    *   Requests
    */

    Object.assign(LX, {

        /**
        * Request file from url (it could be a binary, text, etc.). If you want a simplied version use 
        * @method request
        * @param {Object} request object with all the parameters like data (for sending forms), dataType, success, error
        * @param {Function} on_complete
        **/
        request(request) {

            var dataType = request.dataType || "text";
            if(dataType == "json") //parse it locally
                dataType = "text";
            else if(dataType == "xml") //parse it locally
                dataType = "text";
            else if (dataType == "binary")
            {
                //request.mimeType = "text/plain; charset=x-user-defined";
                dataType = "arraybuffer";
                request.mimeType = "application/octet-stream";
            }	

            //regular case, use AJAX call
            var xhr = new XMLHttpRequest();
            xhr.open( request.data ? 'POST' : 'GET', request.url, true);
            if(dataType)
                xhr.responseType = dataType;
            if (request.mimeType)
                xhr.overrideMimeType( request.mimeType );
            if( request.nocache )
                xhr.setRequestHeader('Cache-Control', 'no-cache');

            xhr.onload = function(load)
            {
                var response = this.response;
                if(this.status != 200)
                {
                    var err = "Error " + this.status;
                    if(request.error)
                        request.error(err);
                    return;
                }

                if(request.dataType == "json") //chrome doesnt support json format
                {
                    try
                    {
                        response = JSON.parse(response);
                    }
                    catch (err)
                    {
                        if(request.error)
                            request.error(err);
                        else
                            throw err;
                    }
                }
                else if(request.dataType == "xml")
                {
                    try
                    {
                        var xmlparser = new DOMParser();
                        response = xmlparser.parseFromString(response,"text/xml");
                    }
                    catch (err)
                    {
                        if(request.error)
                            request.error(err);
                        else
                            throw err;
                    }
                }
                if(request.success)
                    request.success.call(this, response, this);
            };
            xhr.onerror = function(err) {
                if(request.error)
                    request.error(err);
            }

            var data = new FormData();
            if( request.data )
            {
                for(var i in request.data)
                    data.append(i,request.data[i]);
            }

            xhr.send( data );
            return xhr;
        },

        /**
        * Request file from url
        * @method requestText
        * @param {String} url
        * @param {Function} on_complete
        * @param {Function} on_error
        **/
        requestText(url, on_complete, on_error ) {
            return this.request({ url: url, dataType:"text", success: on_complete, error: on_error });
        },

        /**
        * Request file from url
        * @method requestJSON
        * @param {String} url
        * @param {Function} on_complete
        * @param {Function} on_error
        **/
        requestJSON(url, on_complete, on_error ) {
            return this.request({ url: url, dataType:"json", success: on_complete, error: on_error });
        },

        /**
        * Request binary file from url
        * @method requestBinary
        * @param {String} url
        * @param {Function} on_complete
        * @param {Function} on_error
        **/
        requestBinary(url, on_complete, on_error ) {
            return this.request({ url: url, dataType:"binary", success: on_complete, error: on_error });
        },
        
        /**
        * Request script and inserts it in the DOM
        * @method requireScript
        * @param {String|Array} url the url of the script or an array containing several urls
        * @param {Function} on_complete
        * @param {Function} on_error
        * @param {Function} on_progress (if several files are required, on_progress is called after every file is added to the DOM)
        **/
        requireScript(url, on_complete, on_error, on_progress, version ) {

            if(!url)
                throw("invalid URL");

            if( url.constructor === String )
                url = [url];

            var total = url.length;
            var size = total;
            var loaded_scripts = [];

            for(var i in url)
            {
                var script = document.createElement('script');
                script.num = i;
                script.type = 'text/javascript';
                script.src = url[i] + ( version ? "?version=" + version : "" );
                script.original_src = url[i];
                script.async = false;
                script.onload = function(e) { 
                    total--;
                    loaded_scripts.push(this);
                    if(total)
                    {
                        if(on_progress)
                            on_progress(this.original_src, this.num);
                    }
                    else if(on_complete)
                        on_complete( loaded_scripts );
                };
                if(on_error)
                    script.onerror = function(err) { 
                        on_error(err, this.original_src, this.num );
                    }
                document.getElementsByTagName('head')[0].appendChild(script);
            }
        },

        downloadURL( url, filename ) {

            const fr = new FileReader();

            const _download = function(_url) {
                var link = document.createElement('a');
                link.href = _url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            if( url.includes('http') )
            {
                LX.request({ url: url, dataType: 'blob', success: (f) => {
                    fr.readAsDataURL( f );
                    fr.onload = e => { 
                        _download(e.currentTarget.result);
                    };
                } });
            }else
            {
                _download(url);
            }

        },

        downloadFile: function( filename, data, dataType ) {
            if(!data)
            {
                console.warn("No file provided to download");
                return;
            }

            if(!dataType)
            {
                if(data.constructor === String )
                    dataType = 'text/plain';
                else
                    dataType = 'application/octet-stream';
            }

            var file = null;
            if(data.constructor !== File && data.constructor !== Blob)
                file = new Blob( [ data ], {type : dataType});
            else
                file = data;

            var url = URL.createObjectURL( file );
            var element = document.createElement("a");
            element.setAttribute('href', url);
            element.setAttribute('download', filename );
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            setTimeout( function(){ URL.revokeObjectURL( url ); }, 1000*60 ); //wait one minute to revoke url
        }
    });

    Element.prototype.insertChildAtIndex = function(child, index = Infinity) {
        if (index >= this.children.length) this.appendChild(child);
        else this.insertBefore(child, this.children[index]);
    }

	LX.UTILS = {
        getTime() { return new Date().getTime() },
        compareThreshold( v, p, n, t ) { return Math.abs(v - p) >= t || Math.abs(v - n) >= t },
        compareThresholdRange( v0, v1, t0, t1 ) { return v0 >= t0 && v0 <= t1 || v1 >= t0 && v1 <= t1 || v0 <= t0 && v1 >= t1},
        clamp (num, min, max) { return Math.min(Math.max(num, min), max) }
    };
    
})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );