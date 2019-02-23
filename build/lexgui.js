
// useful methods and general properties

var LexGUI = {

    version: 0.1,

    init: function(options)
    {
        options = options || {};

        // LexGUI root 
		var root = document.createElement("div");
		root.id = "lexroot";
        
        this.root = root;
        this.container = document.body;

        if(options.container)
            this.container = document.getElementById(options.container);
        
        this.container.appendChild( root );
    }

};

(function(){

    function simple_guidGenerator() {
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+"-"+S4());
      }
	
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

        var width = options.width || "100%";
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

    /**
     * @param {*} options 
     * type: "horizontal" / "vertical" 
     * sizes: [ s1, s2 ]
     */
    Area.prototype.split = function( options )
    {
        if(this.sections.length)
            throw("area has been split before");

        options = options || {};

        var type = options.type || "horizontal";
        var sizes = options.sizes || ["50%", "50%"];

        // create areas
        var area1 = new LexGUI.Area({className: "split"});
        var area2 = new LexGUI.Area({className: "split"});

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

        if(content.constructor == LexGUI.Panel)
            this.root.appendChild( content.root );
        else
            this.root.appendChild( content );
    }

    LexGUI.Area = Area;
    
    Area.splitbar_size = 4;

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

        root.style.width = "100%";
        root.style.height = "100%";
        this.root = root;

        // branches
        this.branch_open = false;
        this.branches = [];
        this.current_branch = null;
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
        this.branches.push( branch );
        this.root.appendChild( branch.root );
    }

    function pick(arg, def) {
        return (typeof arg == 'undefined' ? def : arg);
     }

    Panel.prototype.addText = function( name, value, callback, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
        element.id = options.id;
        if(options.className)
        element.className += " " + options.className;

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
        var wValue = document.createElement('input');
        wValue.value = value || "";
        wValue.style.width = "calc( 60% - 25px )"; // only 10px is for the padding 
        wValue.style.width = name ? wValue.style.width : "calc( 100% - 16px )";

        if(options.disabled)
        wValue.setAttribute("disabled", true);
        if(options.placeholder)
        wValue.setAttribute("placeholder", options.placeholder);

        if(callback) {
            wValue.addEventListener("keyup", function(e){
                if(e.keyCode == 13)
                    callback(e.target.value, e);
            });
            wValue.addEventListener("focusout", function(e){
                callback(e.target.value, e);
            });
        }

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
        var wValue = document.createElement('select');
        wValue.className = "lexcombo";
        wValue.name = name;
        wValue.style.width = "calc( 60% - 25px )"; // only 10px is for the padding 
        wValue.style.width = name ? wValue.style.width : "calc( 100% - 16px )";

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

        element.style.width = "100%";

        // part 1
        if(!name){
            throw("set checkbox name")
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

        var toggle = document.createElement('div');
        toggle.className = "onoffswitch";

        var wValue = document.createElement('input');
        wValue.name = "onoffswitch";
        wValue.type = "checkbox";
        wValue.className = "onoffswitch__checkbox";
        wValue.id="myonoffswitch"+simple_guidGenerator();
        wValue.checked = value || false;

        var labels = document.createElement('label');
        labels.className = "onoffswitch__label";
        labels.setAttribute("for", wValue.id);
        labels.innerHTML = `<span class="onoffswitch__inner"></span>
        <span class="onoffswitch__switch"></span>`;

        toggle.appendChild(wValue);
        toggle.appendChild(labels);
        container.appendChild(toggle);

        if(options.disabled){
            labels.className += " disabled";
            wValue.setAttribute("disabled",true);
        }

        if(callback)
        wValue.addEventListener("click", callback);
        
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
            
    }

    Panel.prototype.merge = function() 
    {
        this.branch_open = false;
        this.current_branch = null;
    }

    LexGUI.Panel = Panel;
    Panel.branch_icon = "&#9722; ";

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

        this.root = root;
        var that = this;
        this.sizeLeft = "40%";
        this.widgets = [];

        // create element
        var title = document.createElement('div');
        title.className = "lexbranch title";
        title.innerHTML = "<span class='"+ (options.closed?"closed":"")+ "'>" + Panel.branch_icon + "</span> ";
        title.innerHTML += name || "Branch";
        title.innerHTML = title.innerHTML.bold();
        root.appendChild(title);

        var branch_content = document.createElement('div');
        branch_content.className = "lexbranchcontent";
        root.appendChild(branch_content);
        this.content = branch_content;

        this.addBranchSeparator();

        if(options.closed) {
            title.className += " closed";
            root.className += " closed";
            this.content.style.display = "none";
            this.grabber.style.display = "none";
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

            $(that.content).toggle();
            $(that.grabber).toggle();
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
        grabber.style.color = "#303030";
        grabber.innerHTML = "&#9662;";
        grabber.style.marginLeft = this.sizeLeft;
        element.appendChild(grabber);

        var line = document.createElement('div');
        line.style.width = "1px";
        line.style.marginLeft = "4px";
        line.style.marginTop = "5px";
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

            if(widget.children.length == 1)
            continue;

            var name = widget.children[0];
            var value = widget.children[1];

            name.style.width = this.sizeLeft;
            value.style.width = "calc( 100% - 25px" + " - " + this.sizeLeft + " )";
        }
    }


    LexGUI.Branch = Branch;
	
})();