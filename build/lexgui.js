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

    LX.icons = {
        INFO: "fa-circle-info",
        CIRCLE: "fa-circle-small",
        GEAR: "fa-gear",
        TABS: "fa-table-list",
    };

    function clamp (num, min, max) { return Math.min(Math.max(num, min), max); }

    function simple_guidGenerator() {
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+"-"+S4());
    }

    function init(options)
    {
        if(this.ready)
            return;

        options = options || {};

        // LexGUI root 
		var root = document.createElement("div");
		root.id = "lexroot";
        
        var modal = document.createElement("div");
        modal.id = "modal";

        this.modal = modal;
        this.root = root;
        this.container = document.body;

        this.modal.hidden = true;
        this.modal.toggle = function() { this.toggleAttribute('hidden'); };

        if(options.container)
            this.container = document.getElementById(options.container);
        
        this.container.appendChild( modal );
        this.container.appendChild( root );

        this.ready = true;
    }

    LX.init = init;

    function message(text, title, options)
    {
        if(!text)
            throw("No message to show");

        options = options || {};

        this.modal.toggle();

        var root = document.createElement('div');
        root.className = "lexmessage";
        if(options.id)
            root.id = options.id;

        var content = document.createElement('div');
        content.className = "lexmessagecontent";
        content.innerHTML = text;

        root.style.width = "30%";
        root.style.height = "30vh";
        root.style.left = "35%";
        root.style.top = "35vh";

        var closeButton = document.createElement('div');
        closeButton.className = "lexmessagecloser";
        closeButton.innerHTML = '&#10005;';
        closeButton.title = "Close message";
        
        closeButton.addEventListener('click', (function(e) {
            root.remove();
            this.modal.toggle();
        }).bind(this));

        root.appendChild(closeButton);
        
        if(title) {
            var titleDiv = document.createElement('div');
            titleDiv.className = "lexmessagetitle";
            titleDiv.innerHTML = title;
            root.appendChild(titleDiv);
        }
        
        root.appendChild(content);

        this.container.appendChild(root);
    }

    LX.message = message;
	
	/**
     * @param {*} options 
     * id: id of the element
     */

    function Area( options ) 
    {
        options = options || {};

        var root = document.createElement('div');
        root.className = "lexarea";
        if(options.id)
            root.id = options.id;
        if(options.className)
            root.className += " " + options.className;

        var width = options.width || "calc( 100% )";
        var height = options.height || "100vh";

        // size depending on the parent?

        if(width.constructor == Number)
            width += "px";
        if(height.constructor == Number)
            height += "px";

        root.style.width = width;
        root.style.height = height;

        this.root = root;
        this.size = [ this.root.offsetWidth, this.root.offsetHeight ];
        this.sections = {};

        // content ????

        if(!options.no_append) {
            // append to lexroot
            var lexroot = document.getElementById("lexroot");
            lexroot.appendChild( this.root );
        }
    }

    Area.splitbar_size = 4;

    /**
     * @param {*} options 
     * type: "horizontal" / "vertical" 
     * sizes: [ s1, s2 ]
     */
    Area.prototype.split = function( options )
    {
        if(this.sections.length)
            throw("Area has been split before");

        options = options || {};

        var type = options.type || "horizontal";
        var sizes = options.sizes || ["50%", "50%"];

        // create areas
        var area1 = new LX.Area({className: "split"});
        var area2 = new LX.Area({className: "split"});

        var resize = options.resize ?? true;
        var data = "0px";
        
        if(resize)
        {
            this.resize = resize;
            this.split_bar = document.createElement("div");
            this.split_bar.className = "lexsplitbar " + type;

            if(type == "horizontal")
                this.split_bar.style.width = Area.splitbar_size + "px";
            else
                this.split_bar.style.height = Area.splitbar_size + "px";
            this.split_bar.addEventListener("mousedown", inner_mousedown);
            data = Area.splitbar_size/2 + "px"; // updates
        }

        if(type == "horizontal")
        {
            var width1 = sizes[0],
                width2 = sizes[1];

            if(width1.constructor == Number)
                width += "px";
            if(width2.constructor == Number)
                width += "px";

            area1.root.style.width = "calc( " + width1 + " - " + data + " )";
            area2.root.style.width = "calc( " + width2 + " - " + data + " )";
            area1.root.style.height = "100%";
            area2.root.style.height = "100%";
            this.root.style.display = "flex";
        }

        else
        {
            var height1 = sizes[0],
                height2 = sizes[1];

            if(height1.constructor == Number)
                width += "px";
            if(height2.constructor == Number)
                width += "px";

            area1.root.style.height = "calc( " + height1 + " - " + data + " )";
            area2.root.style.height = "calc( " + height2 + " - " + data + " )";
            area1.root.style.width = "100%";
            area2.root.style.width = "100%";
        }

        this.root.appendChild( area1.root );
        if(resize) this.root.appendChild(this.split_bar);
        this.root.appendChild( area2.root );
        this.sections = [area1, area2];
        this.type = type;

        // update sizes
        this.update();

        if(!resize)
        return;

        // litegui.js @jagenjo

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
            document.body.classList.add("dragging-split-area");
            that.split_bar.classList.add("dragging-split-area");
		}

		function inner_mousemove(e)
		{
			if(that.type == "horizontal")
			{
				if (last_pos[0] != e.pageX)
                    that.moveSplit(last_pos[0] - e.pageX);
            }
            else
			{
				if (last_pos[1] != e.pageY)
                    that.moveSplit(last_pos[1] - e.pageY);
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
            document.body.classList.remove("dragging-split-area");
            that.split_bar.classList.remove("dragging-split-area");
        }
    }

    Area.prototype.moveSplit = function( dt )
    {
        if(!this.type)
        throw("no split area");

        var a1 = this.sections[0];
        var a2 = this.sections[1];

        if(this.type == "horizontal")
        {
            var width2 = a2.size[0],
                data = Area.splitbar_size/2 + "px"; // updates

            // move to left
            if(dt > 0) {    

                dt = dt < 2 ? 2: dt;

                var size = width2 + dt;
                data += " - " + size + "px";
                a1.root.style.width = "calc( 100% - " + data + " )";
                a2.root.style.width = size + "px";
            }
            
            else {

                dt = dt > -2 ? -2 : dt;
                width2 = a1.size[0];

                var size = width2 - dt;
                data += " - " + size + "px";
                a2.root.style.width = "calc( 100% - " + data + " )";
                a1.root.style.width = size + "px";
            }
            
            this.update();
        }
        else
        {
            var height2 = a2.size[1],
                data = Area.splitbar_size/2 + "px"; // updates

            // move up
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

            this.update();
        }
    }

    Area.prototype.update = function()
    {
        this.size = [ this.root.offsetWidth, this.root.offsetHeight ];

        for(var i = 0; i < this.sections.length; i++)
        this.sections[i].update();
    }

    Area.prototype.attach = function( content )
    {
        if(!content)
        throw("no content to attach");

        if(content.constructor == LX.Panel)
            this.root.appendChild( content.root );
        else
            this.root.appendChild( content );
    }

    LX.Area = Area;

    /**
     * @class Widget
     */

    class Widget {
        
        constructor(name, type) {
            this.name = name;
            this.type = type;
        }

        get_val() {

            switch(this.type) {
                case Widget.TEXT: 
                case Widget.COLOR:
                    return this.domEl.querySelector("input").value;
                case Widget.NUMBER:
                    return +this.domEl.querySelector("input").value;
                case Widget.COMBO: 
                    return this.domEl.querySelector("select").value;
                case Widget.CHECKBOX: 
                    return this.domEl.querySelector(".checkbox").value;
                case Widget.VECTOR:
                    const inputs = this.domEl.querySelectorAll("input");
                    let value = [];
                    for( var v of inputs ) value.push( +v.value );
                    return value;
            }
        }
    }

    Widget.TEXT     = 0;
    Widget.BUTTON   = 1;
    Widget.COMBO    = 2;
    Widget.CHECKBOX = 3;
    Widget.COLOR    = 4;
    Widget.NUMBER   = 5;
    Widget.TITLE    = 6;
    Widget.VECTOR   = 7;
    Widget.TREE     = 8;

    LX.Widget = Widget;

    /**
     * @param {*} options 
     * id: id of the element
     */

    function Panel( options ) 
    {
        options = options || {};

        var root = document.createElement('div');
        root.className = "lexpanel";
        if(options.id)
            root.id = options.id;
        if(options.className)
            root.className += " " + options.className;

        root.style.width = "calc( 100% - 6px )";
        root.style.height = "100%";
        this.root = root;

        // branches
        this.branch_open = false;
        this.branches = [];
        this.current_branch = null;
        this.widgets = {};
    }

    Panel.prototype.get = function( name ) 
    {
        return this.widgets[ name ];
    }

    Panel.prototype.getValue = function( name ) 
    {
        let widget = this.widgets[ name ];
        if(!widget)
            throw("No widget called " + name);

        return widget.get_val();
    }

    Panel.prototype.branch = function( name, options ) 
    {
        options = options || {};

        // create new branch
        var branch = new Branch(name, options);
        branch.panel = this;
        // declare new open
        this.branch_open = true;
        this.current_branch = branch;
        // append to panel
        if(this.branches.length == 0)
            branch.root.classList.add('first');
        this.branches.push( branch );
        this.root.appendChild( branch.root );
    }

    Panel.prototype.merge = function() 
    {
        this.branch_open = false;
        this.current_branch = null;
    }

    Panel.prototype.end = function() 
    {
        if(this.current_branch) {
            this.current_branch.root.classList.add('last');
            this.branches = [];
        }

        this.merge();
    }

    function pick( arg, def ) {
        return (typeof arg == 'undefined' ? def : arg);
    }

    function dispatch_event( element, type, bubbles, cancellable ) {
        let event = document.createEvent("HTMLEvents");
        event.initEvent(type, bubbles, cancellable);
        element.dispatchEvent(event);
    }

    function add_reset_property( container, callback ) {
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

    Panel.prototype.create_widget = function( name, type, options ) {

        if(!this.current_branch && !this.queuedContainer)
            throw("No current branch!");

        let widget = new Widget(name, type);

        let element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        if(name) {
            var domName = document.createElement('div');
            domName.className = "lexwidgetname";
            domName.innerHTML = name || "";
            domName.style.width = "40%";
            element.appendChild(domName);
            element.domName = domName;

            this.widgets[ name ] = widget;
        }

        widget.domEl = element;
        
        if(!this.queuedContainer) {
            this.current_branch.widgets.push( widget );
            this.current_branch.content.appendChild( element );
        } 
        // append content to queued tab container
        else {
            this.queuedContainer.appendChild( element );
        }

        return widget;
    }

    Panel.prototype.addTitle = function( name, options ) 
    {
        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(null, Widget.TITLE, options);
        let element = widget.domEl;
        element.innerText = name;
        element.className = "lextitle noname";
    }

    Panel.prototype.addText = function( name, value, callback, options ) 
    {
        options = options || {};

        let widget = this.create_widget(name, Widget.TEXT, options);
        let element = widget.domEl;

        // add reset functionality
        if(name) {
            add_reset_property(element.domName, function() {
                wValue.value = wValue.iValue;
                this.style.display = "none";
                dispatch_event(wValue, "focusout");
            });
        }
        
        // add widget value
        let wValue = document.createElement('input');
        wValue.value = wValue.iValue = value || "";
        wValue.style.width = "calc( 60% - 17px )"; // only 10px is for the padding 

        if(options.disabled) wValue.setAttribute("disabled", true);
        if(options.placeholder) wValue.setAttribute("placeholder", options.placeholder);

        var resolve = (function(val, event) {
            if(val != wValue.iValue) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = "block";
            }
            if(callback)
                callback(val, event);
        }).bind(this);

        wValue.addEventListener("keyup", function(e){
            if(e.key == 'Enter')
                resolve(e.target.value, e);
        });
        wValue.addEventListener("focusout", function(e){
            resolve(e.target.value, e);
        });

        element.appendChild(wValue);
        
        if(!name){ // remove branch padding
            element.className += " noname";
            wValue.style.width =  "calc( 100% - 17px )";
        }
    }
    
    Panel.prototype.addButton = function( name, value, callback, options ) 
    {
        options = options || {};

        let widget = this.create_widget(name, Widget.BUTTON, options);
        let element = widget.domEl;

        var wValue = document.createElement('button');
        wValue.className = "lexbutton";
        wValue.innerHTML = value || "";
        wValue.style.width = "calc( 60% - 17px )"; // only 10px is for the padding 

        if(options.disabled)
            wValue.setAttribute("disabled", true);
        if(callback)
            wValue.addEventListener("click", callback);

        element.appendChild(wValue);
        
        if(!name) { // remove branch padding
            wValue.className += " noname";
            wValue.style.width =  "calc( 100% - 10px )";
        }
    }

    Panel.prototype.addCombo = function( name, values, value, callback, options ) 
    {
        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(name, Widget.COMBO, options);
        let element = widget.domEl;

        // add reset functionality
        add_reset_property(element.domName, function() {
            for(let o of wValue.options)
                if(o.value == wValue.iValue) o.selected = true;
            this.style.display = "none";
            dispatch_event(wValue, "change");
        });

        // add widget value

        var container = document.createElement('div');
        container.className = "lexcombo";

        let wValue = document.createElement('select');
        wValue.name = name;
        wValue.iValue = value;
        
        container.style.width = "calc( 60% - 17px )"; // only 10px is for the padding 

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
        
        wValue.addEventListener("change", function(e) {
            const val = e.target.value;
            if(val != wValue.iValue) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = "block";
            }
            if(callback) callback(val, e);
        });

        container.appendChild(wValue);
        element.appendChild(container);
    }

    Panel.prototype.addCheckbox = function( name, value, callback, options ) 
    {
        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(name, Widget.CHECKBOX, options);
        let element = widget.domEl;

        // add reset functionality
        add_reset_property(element.domName, function() {
            dispatch_event(toggle, "click");
        });
        
        // add widget value

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

        toggle.addEventListener("click", function(e) {

            let flag = this.querySelector(".checkbox");
            if(flag.disabled)
            return;

            flag.value = !flag.value;
            flag.className = "checkbox " + (flag.value ? "on" : "");

            // reset button (default value)
            let btn = element.querySelector(".lexwidgetname .lexicon");
            btn.style.display = flag.value != flag.iValue ? "block": "none";

            if(callback) callback( flag.value, e );
        });
        
        element.appendChild(container);
    }

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

    Panel.prototype.addColor = function( name, value, callback, options ) 
    {
        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(name, Widget.COLOR, options);
        let element = widget.domEl;

        // add reset functionality
        add_reset_property(element.domName, function() {
            this.style.display = "none";
            color.value = color.iValue;
            dispatch_event(color, "input");
        });

        // add widget value

        var container = document.createElement('span');
        container.className = "lexcolor";

        let color = document.createElement('input');
        color.type = 'color';
        color.className = "colorinput";
        color.id = "color"+simple_guidGenerator();
        color.useRGB = options.useRGB || true;
        color.value = color.iValue = value.constructor === Array ? rgbToHex(value) : value;
        
        if(options.disabled) {
            color.disabled = true;
        }

        let copy = document.createElement('i');
        copy.className = "lexicon fa fa-copy";

        copy.addEventListener("click", () => {
            navigator.clipboard.writeText( color.value );
        });

        let valueName = document.createElement('div');
        valueName.className = "colorinfo";
        valueName.innerText = color.value;

        container.appendChild(color);
        container.appendChild(valueName);
        container.appendChild(copy);

        if(callback) {
            color.addEventListener("input", function(e) {
                let val = e.target.value;

                // change value (always hex)
                valueName.innerText = val;

                // reset button (default value)
                if(val != color.iValue) {
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    btn.style.display = "block";
                }

                if(this.useRGB)
                    val = hexToRgb(val);
                callback(val, e);
            }, false);
        }
        
        element.appendChild(container);
    }

    Panel.prototype.addNumber = function( name, value, callback, options ) 
    {
        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(name, Widget.NUMBER, options);
        let element = widget.domEl;

        // add reset functionality
        add_reset_property(element.domName, function() {
            this.style.display = "none";
            vecinput.value = vecinput.iValue;
            dispatch_event(vecinput, "input");
        });

        // add widget value

        var container = document.createElement('div');
        container.className = "lexnumber";        
        container.style.width = "calc( 60% - 9px )"; // only 10px is for the padding 

        let box = document.createElement('div');
        box.className = "numberbox";

        let vecinput = document.createElement('input');
        vecinput.className = "vecinput";
        vecinput.min = options.min || -1e24;
        vecinput.max = options.max || 1e24;
        vecinput.step = "any";
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
            slider.min = options.min;
            slider.max = options.max;
            slider.type = "range";
            slider.addEventListener("input", function(e) {
                vecinput.value = +this.value;
                dispatch_event(vecinput, "input");
            }, false);
            box.appendChild(slider);
        }

        // Add wheel input

        vecinput.addEventListener("wheel", function(e) {
            e.preventDefault();
            let mult = 1;
            if(e.shiftKey) mult = 10;
            else if(e.altKey) mult = 0.1;
            this.value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
            dispatch_event(vecinput, "input");
            this.blur();
        }, false);

        vecinput.addEventListener("input", function(e) {
            let val = e.target.value = clamp(e.target.value, vecinput.min, vecinput.max);
            // reset button (default value)
            if(val != vecinput.iValue) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                btn.style.display = "block";
            }
            // update slider!
            box.querySelector(".lexinputslider").value = val;
            callback(val, e);
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
        }

        function inner_mousemove(e) {
            if (lastY != e.pageY) {
                let dt = lastY - e.pageY;
                let mult = 1;
                if(e.shiftKey) mult = 10;
                else if(e.altKey) mult = 0.1;
                vecinput.value = (+vecinput.valueAsNumber + mult * dt).toPrecision(5);
                dispatch_event(vecinput, "input");
            }

            lastY = e.pageY;
            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup(e) {
            var doc = that.root.ownerDocument;
            doc.removeEventListener("mousemove",inner_mousemove);
            doc.removeEventListener("mouseup",inner_mouseup);
        }
        
        container.appendChild(box);
        element.appendChild(container);
    }

    const components = {0: 'x', 1: 'y', 2: 'z', 3: 'w'};

    Panel.prototype.add_vector = function( num_components, name, value, callback, options ) 
    {
        num_components = clamp(num_components, 2, 4);

        if(!name) {
            throw("Set Widget Name!");
        }

        options = options || {};

        let widget = this.create_widget(name, Widget.VECTOR, options);
        let element = widget.domEl;

        // add reset functionality
        add_reset_property(element.domName, function() {
            this.style.display = "none";
            for( let v of element.querySelectorAll(".vecinput") ) {
                v.value = v.iValue;
                dispatch_event(v, "input");
            }
        });

        // add widget value

        var container = document.createElement('div');
        container.className = "lexvector";        
        container.style.width = "calc( 60% - 9px )"; // only 10px is for the padding 

        for( var i = 0; i < num_components; ++i ) {

            let box = document.createElement('div');
            box.className = "vecbox";
            box.innerHTML = "<span class='" + components[i] + "'>" + components[i] + "</span>";

            let vecinput = document.createElement('input');
            vecinput.className = "vecinput v" + num_components;
            vecinput.min = options.min || -1e24;
            vecinput.max = options.max || 1e24;
            vecinput.step = "any";
            vecinput.type = "number";
            vecinput.id = "vec"+num_components+"_"+simple_guidGenerator();
            vecinput.value = vecinput.iValue = value[i];

            if(options.disabled) {
                vecinput.disabled = true;
            }

            // Add wheel input

            vecinput.addEventListener("wheel", function(e) {
                e.preventDefault();
                let mult = 1;
                if(e.shiftKey) mult = 10;
                else if(e.altKey) mult = 0.1;
                this.value = (+this.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1)).toPrecision(5);
                dispatch_event(vecinput, "input");
                this.blur();
            }, false);

            vecinput.addEventListener("input", function(e) {
                let val = e.target.value = clamp(e.target.value, vecinput.min, vecinput.max);
                // reset button (default value)
                if(val != vecinput.iValue) {
                    let btn = element.querySelector(".lexwidgetname .lexicon");
                    btn.style.display = "block";
                }
    
                callback(val, e);
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
            }

            function inner_mousemove(e) {
                if (lastY != e.pageY) {
                    let dt = lastY - e.pageY;
                    let mult = 1;
                    if(e.shiftKey) mult = 10;
                    else if(e.altKey) mult = 0.1;
                    vecinput.value = (+vecinput.valueAsNumber + mult * dt).toPrecision(5);
                    dispatch_event(vecinput, "input");
                }

                lastY = e.pageY;
                e.stopPropagation();
                e.preventDefault();
            }

            function inner_mouseup(e) {
                var doc = that.root.ownerDocument;
                doc.removeEventListener("mousemove",inner_mousemove);
                doc.removeEventListener("mouseup",inner_mouseup);
            }
            
            box.appendChild(vecinput);
            container.appendChild(box);
        }
        
        element.appendChild(container);
    }

    Panel.prototype.addVector2 = function( name, value, callback, options ) 
    {
        this.add_vector(2, name, value, callback, options);
    }

    Panel.prototype.addVector3 = function( name, value, callback, options ) 
    {
        this.add_vector(3, name, value, callback, options);
    }

    Panel.prototype.addVector4 = function( name, value, callback, options ) 
    {
        this.add_vector(4, name, value, callback, options);
    }

    /**
     * @param {*} options:
     * onselect(node_id)
     * ondoubleclick(node_id)
     * onchange(tree_event)
     */

    class TreeEvent {
        constructor( type, node, parent ) {
            this.type = type || TreeEvent.NONE;
            this.node = node;
            this.parent = parent;
        }
        
        string() {
            switch(this.type) {
                case TreeEvent.NONE: return "tree_event_none";
                case TreeEvent.NODE_DRAGGED: return "tree_event_dragged";
                case TreeEvent.NODE_RENAMED: return "tree_event_renamed";
                case TreeEvent.NODE_VISIBILITY: return "tree_event_visibility";
            }
        }
    };

    TreeEvent.NONE              = 0;
    TreeEvent.NODE_DRAGGED      = 1;
    TreeEvent.NODE_RENAMED      = 2;
    TreeEvent.NODE_VISIBILITY   = 3;

    LX.TreeEvent = TreeEvent;

    Panel.prototype.addTree = function( name, data, options ) 
    {
        options = options || {};

        let container = document.createElement('div');
        container.className = "lextree";

        if(name) {
            let title = document.createElement('span');
            title.innerHTML = name;
            container.appendChild(title);
        }

        let list = document.createElement('ul');
        list.style.paddingTop = name ? "0px" : "16px";

        const update_tree = function() {
            list.innerHTML = "";
            create_item( null, data );
        };

        const create_item = function( parent, node, level = 0 ) {

            node.visible = node.visible ?? true;
            node.parent = parent;
            const is_parent = node.children.length > 0;

            var item = document.createElement('li');
            item.className = "lextreeitem " + "datalevel" + level + " " + (is_parent ? "parent" : "");
            item.id = node.id;
            // select icon
            let icon = "fa-solid fa-square"; // default: no childs
            if( is_parent ) icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
            item.innerHTML = "<a class='" + icon + "'></a>" + (node.rename ? "" : node.id);
            item.setAttribute('draggable', true);
            item.style.paddingLeft = ((is_parent ? 0 : 3 ) + (3 + (level+1) * 25)) + "px";
            list.appendChild(item);

            // callbacks
            item.addEventListener("click", function(){
                list.querySelectorAll("li").forEach( e => { e.classList.remove('selected'); } );
                this.classList.add('selected');
                if(options.onselect) options.onselect( node.id );
            });

            item.addEventListener("dblclick", function(){
                // trigger rename
                node.rename = true;
                update_tree();
                if(options.ondblclick) options.ondblclick( node.id );
            });

            // node rename

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

                    if(options.onchange) {
                        const event = new TreeEvent(TreeEvent.NODE_RENAMED, node);
                        event.name = this.value;
                        options.onchange( event );
                    }

                    node.id = this.value;
                    delete node.rename;
                    update_tree();
                    list.querySelector("#" + this.value).classList.add('selected');
                }
                if(e.key == 'Escape') {
                    delete node.rename;
                    update_tree();
                }
            });

            name_input.addEventListener("blur", function(e){
                delete node.rename;
                update_tree();
            });

            // drag nodes
            if(parent) // root doesn't move!
            {
                item.addEventListener("dragstart", e => {
                    window.__tree_node_dragged = node;
                });
            }

            /* events fired on other node items */
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
                e.preventDefault(); // prevent default action (open as link for some elements)
                let dragged = window.__tree_node_dragged;
                if(!dragged)
                    return;
                let target = node;
                if(dragged.id == target.id)
                    return;
                if(options.onchange) {
                    const event = new TreeEvent(TreeEvent.NODE_DRAGGED, dragged, target);
                    options.onchange( event );
                }
                const index = dragged.parent.children.findIndex(n => n.id == dragged.id);
                const removed = dragged.parent.children.splice(index, 1);
                target.children.push( removed[0] );
                update_tree();
                delete window.__tree_node_dragged;
            });

            // show/hide children
            if(is_parent) {
                item.querySelector('a').addEventListener("click", function(){
                    node.closed = !node.closed;
                    update_tree();
                });
            }

            // add button icons

            let visibility = document.createElement('a');
            visibility.className = "itemicon fa-solid fa-eye" + (!node.visible ? "-slash" : "");
            visibility.title = "Toggle visible";
            visibility.addEventListener("click", function(){
                node.visible = node.visible === undefined ? false : !node.visible;
                this.className = "itemicon fa-solid fa-eye" + (!node.visible ? "-slash" : "");
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
                create_item( node, node.children[i], level + 1 );
        };

        create_item( null, data );

        container.appendChild(list);
        this.root.appendChild(container);
    }

    Panel.prototype.separate = function() 
    {
        if(!this.current_branch)
            throw("You can only separate branches!");

        var element = document.createElement('div');
        element.className = "lexseparator";
        this.current_branch.content.appendChild( element );
    }

    Panel.prototype.tabs = function( tabs ) 
    {
        if(!this.current_branch)
            throw("No current branch!");

        if(tabs.constructor != Array)
            throw("Param @tabs must be an Array!");

        let container = document.createElement('div');
        container.className = "lextabs-container";
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
            tabEl.innerHTML = "<a class='" + (tab.icon || "fa fa-hashtag") + "'></a>";
            
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
        
        // push to branch from now on
        delete this.queuedContainer;
    }

    LX.Panel = Panel;

    /**
     * @param {*} options 
     * id: id of the element
     */

    function Branch( name, options ) 
    {
        options = options || {};

        var root = document.createElement('div');
        root.className = "lexbranch";
        if(options.id)
            root.id = options.id;
        if(options.className)
            root.className += " " + options.className;

        root.style.width = "calc(100% - 6px)";
        root.style.margin = "0 auto";

        var that = this;

        this.root = root;
        this.sizeLeft = "40%";
        this.widgets = [];

        // create element
        var title = document.createElement('div');
        title.className = "lexbranch title";
        
        title.innerHTML = "<span class='switch-branch-button'></span>";
        if(options.icon) {
            title.innerHTML += "<a class='branchicon fa " + options.icon + "' style='margin-right: 8px; margin-bottom: -2px;'>";
        }
        title.innerHTML += name || "Branch";

        root.appendChild(title);

        var branch_content = document.createElement('div');
        branch_content.className = "lexbranchcontent";
        root.appendChild(branch_content);
        this.content = branch_content;

        this.addBranchSeparator();

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

    Branch.prototype.addBranchSeparator = function( options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidgetseparator";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;

        element.style.width = "100%";
        element.style.background = "none";

        var grabber = document.createElement('div');
        grabber.innerHTML = "&#9662;";
        grabber.style.marginLeft = this.sizeLeft;
        element.appendChild(grabber);

        var line = document.createElement('div');
        line.style.width = "1px";
        line.style.marginLeft = "4px";
        line.style.marginTop = "-5px";
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
        }
        
        function inner_mousemove(e)
        {
            if (lastXLine != e.pageX) {
                var dt = lastXLine - e.pageX;
                var margin = line.style.marginLeft;
                var size = "calc( " + margin + " - " + dt + "px )";
                line.style.marginLeft = size;
            }

            lastXLine = e.pageX;
        }

		function inner_mouseup(e)
		{
            if (lastX != e.pageX)
                that.moveBranchSeparator(lastX - e.pageX);
            lastX = e.pageX;
            lastXLine = e.pageX;
            line.style.marginLeft = "4px";
            line.style.height = "0px";

			var doc = that.root.ownerDocument;
            doc.removeEventListener("mouseup",inner_mouseup);
            doc.removeEventListener("mousemove",inner_mousemove);
        }

        this.content.appendChild( element );
    }

    Branch.prototype.moveBranchSeparator = function( dt ) 
    {
        var size = "calc( " + this.sizeLeft + " - " + dt + "px )";
        this.grabber.style.marginLeft = size;
        this.sizeLeft = size;

        // update sizes of widgets inside
        for(var i = 0; i < this.widgets.length;i++) {

            let widget = this.widgets[i];
            let element = widget.domEl;

            if(element.children.length < 2)
            continue;

            var name = element.children[0];
            var value = element.children[1];

            name.style.width = this.sizeLeft;
            const padding = widget.type == Widget.VECTOR ? 9 : 17;
            value.style.width = "calc( 100% - " + padding + "px" + " - " + this.sizeLeft + " )";
        }
    }


    LX.Branch = Branch;
	
})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );