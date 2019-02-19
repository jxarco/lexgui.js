
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
            var height1 = "50vh",//sizes[0],
                height2 = "50vh";

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
            console.warn("TODO");
    }

    LexGUI.Area = Area;
    
    Area.splitbar_size = 6;

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

        // branches
        this.root = root;
        this.branch_open = false;
        this.current_branch = null;
    }

    Panel.prototype.branch = function( name, options ) 
    {
        options = options || {};

        var branch = document.createElement('div');
        branch.className = "lexbranch";
        if(options.id)
        branch.id = options.id;
        if(options.className)
        branch.className += " " + options.className;
        if(options.closed)
        branch.className += " closed";

        branch.style.width = "100%";

        // create element
        var title = document.createElement('div');
        title.className = "lexbranch title";
        title.innerHTML = "<span class='"+ (options.closed?"closed":"")+ "'>" + Panel.branch_icon + "</span> ";
        title.innerHTML += name || "Branch";
        title.innerHTML = title.innerHTML.bold();
        branch.appendChild(title);

        var branch_content = document.createElement('div');
        branch_content.className = "lexbranchcontent";
        branch.appendChild(branch_content);

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

            this.innerHTML = "<span class='"+ (options.closed?"closed":"")+ "'>" + Panel.branch_icon + "</span> ";
            this.innerHTML += name || "Branch";
            this.innerHTML = this.innerHTML.bold();
        })

        this.branch_open = true;
        this.current_branch = branch_content;

        this.root.appendChild( branch );
    }

    Panel.prototype.addText = function( name, value, options ) 
    {
        options = options || {};

        var element = document.createElement('div');
        element.className = "lexwidget";
        if(options.id)
        element.id = options.id;
        if(options.className)
        element.className += " " + options.className;

        element.style.width = options.width || "100%";

        // part 1
        if(name) {
            var wName = document.createElement('div');
            wName.className = "lexwidgetname";
            wName.innerHTML = name || "";
            wName.style.width = options.name_width || "30%";
            element.appendChild(wName);
        }
        
        // part 2
        var wValue = document.createElement('input');
        wValue.value = value || "";
        wValue.style.width = options.name_width ? "calc( 100% - 15px - " + options.name_width + " )" :
        "calc( 70% - 15px )"; // only 10px is for the padding 
        wValue.style.width = name ? wValue.style.width : "calc( 100% - 15px )";

        if(options.disabled)
        wValue.setAttribute("disabled", true);
        if(options.placeholder)
        wValue.setAttribute("placeholder", options.placeholder);

        element.appendChild(wValue);
        
        if(this.current_branch)
            this.current_branch.appendChild( element );
        else
        {
            console.warn("Get used to insert widgets only in a branch!");
            this.root.appendChild(element);
        }
            
    }

    Panel.prototype.merge = function() 
    {
        this.branch_open = false;
        this.current_branch = null;
    }

    LexGUI.Panel = Panel;
    Panel.branch_icon = "&#9663;";
	
})();