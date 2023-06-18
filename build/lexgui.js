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
        GEAR: "fa-gear"
    };

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

        var resize = options.resize || true;
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
        this.root.appendChild(this.split_bar);
        this.root.appendChild( area2.root );
        this.sections = [area1, area2];
        this.type = type;

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
        
        // update sizes
        this.update();
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

    function pick(arg, def) {
        return (typeof arg == 'undefined' ? def : arg);
    }

    Panel.prototype.addText = function( name, value, callback, options ) 
    {
        options = options || {};

        let element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        // part 1
        if(name) {
            var wName = document.createElement('div');
            wName.className = "lexwidgetname";
            wName.innerHTML = name || "";
            wName.style.width = "40%";
            element.appendChild(wName);

            var resetValButton = document.createElement('a');
            resetValButton.style.display = "none";
            resetValButton.className = "lexicon fa fa-rotate-left";

            resetValButton.addEventListener("click", function() {
                wValue.value = wValue.iValue;
                this.style.display = "none";
            });

            wName.appendChild(resetValButton);
        }
        
        // part 2
        let wValue = document.createElement('input');
        wValue.value = wValue.iValue = value || "";
        wValue.style.width = "calc( 60% - 25px )"; // only 10px is for the padding 
        wValue.style.width = name ? wValue.style.width : "calc( 100% - 16px )";

        if(options.disabled)
        wValue.setAttribute("disabled", true);
        if(options.placeholder)
        wValue.setAttribute("placeholder", options.placeholder);

        var resolve = (function(val, event) {
            if(val != wValue.iValue) {
                let btn = element.querySelector(".lexwidgetname .lexicon");
                if(btn) btn.style.display = "block";
            }
            if(callback)
                callback(val, event);
        }).bind(this);

        wValue.addEventListener("keyup", function(e){
            if(e.keyCode == 13)
                resolve(e.target.value, e);
        });
        wValue.addEventListener("focusout", function(e){
            resolve(e.target.value, e);
        });

        element.appendChild(wValue);
        
        if(this.current_branch) {
            if(!name){ // remove branch padding
                element.className += " nomargin";
                wValue.style.width =  "calc( 100% - 21px )";
            }
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name){ // remove branch padding
                element.className += " nomargin";
            }
            else // add branch padding 
                wValue.style.width =  "calc( 60% - 28px )";
            this.root.appendChild(element);
        }
          
        this.widgets[ name ] = element;
    }

    Panel.prototype.addTitle = function( name, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.innerText = name;
        element.className = "lextitle";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        if(this.current_branch) {
            element.className += " nomargin";
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name){ // remove branch padding
                element.className += " nomargin";
            }
            this.root.appendChild(element);
        }
    }
    
    Panel.prototype.addButton = function( name, value, callback, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        // part 1
        if(name) {
            var wName = document.createElement('div');
            wName.className = "lexwidgetname";
            wName.innerHTML = name || "";
            wName.style.width = "40%";
            element.appendChild(wName);
        }
        
        // part 2
        var wValue = document.createElement('button');
        wValue.className = "lexbutton";
        wValue.innerHTML = value || "";
        wValue.style.width = "calc( 60% - 20px )"; // only 10px is for the padding 

        if(!name)
            wValue.style.width = name ? wValue.style.width : "calc( 100% - 16px )";

        if(options.disabled)
        wValue.setAttribute("disabled", true);

        if(callback)
        wValue.addEventListener("click", callback);

        element.appendChild(wValue);
        
        if(this.current_branch) {
            if(!name){ // remove branch padding
                wValue.className += " noname";
                wValue.style.width =  "calc( 100% - 16px )";
            }
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name) // remove branch padding
            {
                wValue.className += " noname";
                wValue.style.width =  "calc( 100% - 11px )";
            }
            else // add branch padding 
            {
                wValue.style.width =  "calc( 60% - 28px )";
            }
            this.root.appendChild(element);
        }
            
        this.widgets[ name ] = element;
    }

    Panel.prototype.addCombo = function( name, values, callback, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        // part 1
        if(name) {
            var wName = document.createElement('div');
            wName.className = "lexwidgetname";
            wName.innerHTML = name || "";
            wName.style.width = "40%";
            element.appendChild(wName);
        }
        
        // part 2

        var container = document.createElement('div');
        container.className = "lexcombo";

        var wValue = document.createElement('select');
        wValue.name = name;
        
        container.style.width = "calc( 60% - 25px )"; // only 10px is for the padding 
        container.style.width = name ? wValue.style.width : "calc( 100% - 16px )";

        if(values.length)
            for(var i = 0; i < values.length; i++)
            {
                var option = document.createElement('option');
                option.innerHTML = option.value = values[i];
                if(i == 0)
                    option.selected = true;
                wValue.appendChild(option);
            }

        if(options.disabled)
        wValue.setAttribute("disabled", true);

        if(callback)
            wValue.addEventListener("change", function(e){
                callback(e.target.value, e);
            });

        container.appendChild(wValue);
        element.appendChild(container);
        
        if(this.current_branch) {
            if(!name){ // remove branch padding
                element.className += " nomargin";
                wValue.style.width =  "calc( 100% - 21px )";
            }
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name){ // remove branch padding
                element.className += " nomargin";
            }
            else // add branch padding 
                wValue.style.width =  "calc( 60% - 28px )";
            this.root.appendChild(element);
        }

        this.widgets[ name ] = element;
    }

    Panel.prototype.addCheckbox = function( name, value, callback, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        // part 1
        if(!name){
            throw("Set Widget name");
        }

        var wName = document.createElement('div');
        wName.className = "lexwidgetname";
        wName.innerHTML = name || "";
        wName.style.width = "40%";
        wName.setAttribute("for","toggle");
        element.appendChild(wName);
        
        // part 2

        // create full toggle html

        var container = document.createElement('div');

        var toggle = document.createElement('span');
        toggle.className = "lexcheckbox";

        var flag = document.createElement('span');
        flag.value = value || false;
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

            if(callback) callback( flag.value, e );
        });
        
        element.appendChild(container);
        
        if(this.current_branch) {
            if(!name){ // remove branch padding
                container.className += " noname";
                container.style.width =  "calc( 100% - 16px )";
            }
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name) // remove branch padding
            {
                container.className += " noname";
                container.style.width =  "calc( 100% - 11px )";
            }
            else // add branch padding 
            {
                container.style.width =  "calc( 60% - 28px )";
            }
            this.root.appendChild(element);
        }
            
        this.widgets[ name ] = element;
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
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
            element.id = options.id;
        if(options.className)
            element.className += " " + options.className;
        if(options.title)
            element.title = options.title;

        element.style.width = "100%";

        // part 1
        if(!name){
            throw("Set Widget name");
        }

        var wName = document.createElement('div');
        wName.className = "lexwidgetcolor";
        wName.innerHTML = name || "";
        wName.style.width = "40%";
        element.appendChild(wName);
        
        // part 2

        // create color input

        var container = document.createElement('span');
        container.className = "lexcolor";

        let color = document.createElement('input');
        color.type = 'color';
        color.className = "colorinput";
        color.id = "color"+simple_guidGenerator();
        color.useRGB = options.useRGB || true;
        color.value = value.constructor === Array ? rgbToHex(value) : value;
        
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

                if(this.useRGB)
                    val = hexToRgb(val);
                callback(val, e);
            }, false);
        }
        
        element.appendChild(container);
        
        if(this.current_branch) {
            if(!name){ // remove branch padding
                container.className += " noname";
                container.style.width =  "calc( 100% - 16px )";
            }
            this.current_branch.content.appendChild( element );
            this.current_branch.widgets.push( element );
        }
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            if(!name) // remove branch padding
            {
                container.className += " noname";
                container.style.width =  "calc( 100% - 11px )";
            }
            else // add branch padding 
            {
                container.style.width =  "calc( 60% - 28px )";
            }
            this.root.appendChild(element);
        }
            
        this.widgets[ name ] = element;
    }

    Panel.prototype.separate = function() 
    {
        if(!this.current_branch)
            throw("You can only separate branches!");

        var element = document.createElement('div');
        element.className = "lexseparator";
        this.current_branch.content.appendChild( element );
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

            var widget = this.widgets[i];

            if(widget.children.length < 2)
            continue;

            var name = widget.children[0];
            var value = widget.children[1];

            name.style.width = this.sizeLeft;
            value.style.width = "calc( 100% - 25px" + " - " + this.sizeLeft + " )";
        }
    }


    LX.Branch = Branch;
	
})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );