// area.js @jxarco
import { LX } from './core.js';

class Area {

    /**
     * @constructor Area
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the area element [fit space]
     * height: Height of the area element [fit space]
     * skipAppend: Create but not append to GUI root [false]
     * minWidth: Minimum width to be applied when resizing
     * minHeight: Minimum height to be applied when resizing
     * maxWidth: Maximum width to be applied when resizing
     * maxHeight: Maximum height to be applied when resizing
     */

    constructor( options = {} ) {

        var root = document.createElement( 'div' );
        root.className = "lexarea";
        if( options.id )
        {
            root.id = options.id;
        }
        if( options.className )
        {
            root.className += " " + options.className;
        }

        var width = options.width || "100%";
        var height = options.height || "100%";

        // This has default options..
        this.setLimitBox( options.minWidth, options.minHeight, options.maxWidth, options.maxHeight );

        if( width.constructor == Number )
        {
            width += "px";
        }
        if( height.constructor == Number )
        {
            height += "px";
        }

        root.style.width = width;
        root.style.height = height;

        this.offset = 0;
        this.root = root;
        this.size = [ this.root.offsetWidth, this.root.offsetHeight ];
        this.sections = [];
        this.panels = [];

        let lexroot = document.getElementById("lexroot");
        if( lexroot && !options.skipAppend )
        {
            lexroot.appendChild( this.root );
        }

        let overlay = options.overlay;

        if( overlay )
        {
            this.root.classList.add("overlay-" + overlay);

            if( options.left )
            {
                this.root.style.left = options.left;
            }
            else if( options.right )
            {
                this.root.style.right = options.right;
            }
            else if( options.top )
            {
                this.root.style.top = options.top;
            }
            else if( options.bottom )
            {
                this.root.style.bottom = options.bottom;
            }

            const draggable = options.draggable ?? true;
            if( draggable )
            {
                LX.makeDraggable( root, options );
            }

            if( options.resizeable )
            {
                root.classList.add("resizeable");
            }

            if( options.resize )
            {
                this.splitBar = document.createElement("div");
                let type = (overlay == "left") || (overlay == "right") ? "horizontal" : "vertical";
                this.type = overlay;
                this.splitBar.className = "lexsplitbar " + type;

                if( overlay == "right" )
                {
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.left = -(LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if( overlay == "left" )
                {
                    let size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientWidth);
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.left = size + (LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if( overlay == "top" )
                {
                    let size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientHeight);
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.top = size + (LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if( overlay == "bottom" )
                {
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.top = -(LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }

                this.splitBar.addEventListener("mousedown", innerMouseDown);
                this.root.appendChild( this.splitBar );

                const that = this;
                let lastMousePosition = [ 0, 0 ];

                function innerMouseDown( e )
                {
                    const doc = that.root.ownerDocument;
                    doc.addEventListener( 'mousemove', innerMouseMove );
                    doc.addEventListener( 'mouseup', innerMouseUp );
                    lastMousePosition[ 0 ] = e.x;
                    lastMousePosition[ 1 ] = e.y;
                    e.stopPropagation();
                    e.preventDefault();
                    document.body.classList.add( 'nocursor' );
                    that.splitBar.classList.add( 'nocursor' );
                }

                function innerMouseMove( e )
                {
                    switch( that.type )
                    {
                        case "right":
                            var dt = ( lastMousePosition[ 0 ] - e.x );
                            var size = ( that.root.offsetWidth + dt );
                            that.root.style.width = size + "px";
                            break;
                        case "left":
                            var dt = ( lastMousePosition[ 0 ] - e.x );
                            var size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetWidth - dt));
                            that.root.style.width = size + "px";
                            that.splitBar.style.left = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                            break;
                        case "top":
                            var dt = ( lastMousePosition[ 1 ] - e.y );
                            var size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetHeight - dt));
                            that.root.style.height = size + "px";
                            that.splitBar.style.top = size + LX.DEFAULT_SPLITBAR_SIZE/2 + "px";
                            break;
                        case "bottom":
                            var dt = ( lastMousePosition[ 1 ] - e.y );
                            var size = ( that.root.offsetHeight + dt );
                            that.root.style.height = size + "px";
                            break;
                    }

                    lastMousePosition[ 0 ] = e.x;
                    lastMousePosition[ 1 ] = e.y;
                    e.stopPropagation();
                    e.preventDefault();

                    // Resize events
                    if( that.onresize )
                    {
                        that.onresize( that.root.getBoundingClientRect() );
                    }
                }

                function innerMouseUp( e )
                {
                    const doc = that.root.ownerDocument;
                    doc.removeEventListener( 'mousemove', innerMouseMove );
                    doc.removeEventListener( 'mouseup', innerMouseUp );
                    document.body.classList.remove( 'nocursor' );
                    that.splitBar.classList.remove( 'nocursor' );
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
        if( this.sections.length )
        {
            this.sections[ 1 ].attach( content );
            return;
        }

        if( !content )
        {
            throw("no content to attach");
        }

        content.parent = this;

        let element = content.root ? content.root : content;
        this.root.appendChild( element );
    }

    /**
     * @method split
     * @param {Object} options
     * type: Split mode (horizontal, vertical) ["horizontal"]
     * sizes: CSS Size of each new area (Array) ["50%", "50%"]
     * resize: Allow area manual resizing [true]
     * sizes: "Allow the area to be minimized [false]
     */

    split( options = {} ) {

        if( this.sections.length )
        {
            // In case Area has been split before, get 2nd section as root
            this.offset = this.root.childNodes[ 0 ].offsetHeight; // store offset to take into account when resizing
            this._root = this.sections[ 0 ].root;
            this.root = this.sections[ 1 ].root;
        }

        const type = options.type ?? "horizontal";
        const sizes = options.sizes || [ "50%", "50%" ];
        const auto = (options.sizes === 'auto') || ( options.sizes && options.sizes[ 0 ] == "auto" && options.sizes[ 1 ] == "auto" );
        const rect = this.root.getBoundingClientRect();

        // Secondary area fills space
        if( !sizes[ 1 ] || ( sizes[ 0 ] != "auto" && sizes[ 1 ] == "auto" ) )
        {
            let size = sizes[ 0 ];
            let margin = options.top ? options.top : 0;
            if( size.constructor == Number )
            {
                size += margin;
                size += "px";
            }

            sizes[ 1 ] = "calc( 100% - " + size + " )";
        }

        let minimizable = options.minimizable ?? false;
        let resize = ( options.resize ?? true ) || minimizable;
        let fixedSize = options.fixedSize ?? !resize;
        let splitbarOffset = 0;
        let primarySize = [];
        let secondarySize = [];

        this.offset = 0;

        if( resize )
        {
            this.resize = resize;
            this.splitBar = document.createElement( "div" );
            this.splitBar.className = "lexsplitbar " + type;

            if( type == "horizontal" )
            {
                this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
            }
            else
            {
                this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
            }

            this.splitBar.addEventListener( 'mousedown', innerMouseDown );

            splitbarOffset = ( LX.DEFAULT_SPLITBAR_SIZE / 2 ); // updates
        }

        if( type == "horizontal" )
        {
            this.root.style.display = "flex";

            if( !fixedSize )
            {
                const parentWidth = rect.width;
                const leftPx = LX.parsePixelSize( sizes[ 0 ], parentWidth );
                const rightPx = LX.parsePixelSize(  sizes[ 1 ], parentWidth );
                const leftPercent = ( leftPx / parentWidth ) * 100;
                const rightPercent = ( rightPx / parentWidth ) * 100;

                // Style using percentages
                primarySize[ 0 ] = `calc(${ leftPercent }% - ${ splitbarOffset }px)`;
                secondarySize[ 0 ] = `calc(${ rightPercent }% - ${ splitbarOffset }px)`;
            }
            else
            {
                primarySize[ 0 ] = `calc(${ sizes[ 0 ] } - ${ splitbarOffset }px)`;
                secondarySize[ 0 ] = `calc(${ sizes[ 1 ] } - ${ splitbarOffset }px)`;
            }

            primarySize[ 1 ] = "100%";
            secondarySize[ 1 ] = "100%";
        }
        else // vertical
        {
            if( auto )
            {
                primarySize[ 1 ] = "auto";
                secondarySize[ 1 ] = "auto";
            }
            else if( !fixedSize )
            {
                const parentHeight = rect.height;
                const topPx = LX.parsePixelSize( sizes[ 0 ], parentHeight );
                const bottomPx = LX.parsePixelSize( sizes[ 1 ], parentHeight );
                const topPercent = ( topPx / parentHeight ) * 100;
                const bottomPercent = ( bottomPx / parentHeight ) * 100;

                primarySize[ 1 ] = ( sizes[ 0 ] == "auto" ? "auto" : `calc(${ topPercent }% - ${ splitbarOffset }px)`);
                secondarySize[ 1 ] = ( sizes[ 1 ] == "auto" ? "auto" : `calc(${ bottomPercent }% - ${ splitbarOffset }px)`);
            }
            else
            {
                primarySize[ 1 ] = ( sizes[ 0 ] == "auto" ? "auto" : `calc(${ sizes[ 0 ] } - ${ splitbarOffset }px)`);
                secondarySize[ 1 ] = ( sizes[ 1 ] == "auto" ? "auto" : `calc(${ sizes[ 1 ] } - ${ splitbarOffset }px)`);
            }

            primarySize[ 0 ] = "100%";
            secondarySize[ 0 ] = "100%";
        }

        // Create areas
        let area1 = new Area( { width: primarySize[ 0 ], height: primarySize[ 1 ], skipAppend: true, className: "split" + ( options.menubar || options.sidebar ? "" : " origin" ) } );
        let area2 = new Area( { width: secondarySize[ 0 ], height: secondarySize[ 1 ], skipAppend: true, className: "split" } );

        /*
            If the parent area is not in the DOM, we need to wait for the resize event to get the its correct size
            and set the sizes of the split areas accordingly.
        */
        if( !fixedSize && ( !rect.width || !rect.height ) )
        {
            const observer = new ResizeObserver( entries => {

                console.assert( entries.length == 1, "AreaResizeObserver: more than one entry" );

                const rect = entries[ 0 ].contentRect;
                if( !rect.width || !rect.height )
                {
                    return;
                }

                this._update( [ rect.width, rect.height ], false );

                // On auto splits, we only need to set the size of the parent area
                if( !auto )
                {
                    if( type == "horizontal" )
                    {
                        const parentWidth = rect.width;
                        const leftPx = LX.parsePixelSize( sizes[ 0 ], parentWidth );
                        const rightPx = LX.parsePixelSize(  sizes[ 1 ], parentWidth );
                        const leftPercent = ( leftPx / parentWidth ) * 100;
                        const rightPercent = ( rightPx / parentWidth ) * 100;

                        // Style using percentages
                        primarySize[ 0 ] = `calc(${ leftPercent }% - ${ splitbarOffset }px)`;
                        secondarySize[ 0 ] = `calc(${ rightPercent }% - ${ splitbarOffset }px)`;
                    }
                    else // vertical
                    {
                        const parentHeight = rect.height;
                        const topPx = LX.parsePixelSize( sizes[ 0 ], parentHeight );
                        const bottomPx = LX.parsePixelSize( sizes[ 1 ], parentHeight );
                        const topPercent = ( topPx / parentHeight ) * 100;
                        const bottomPercent = ( bottomPx / parentHeight ) * 100;

                        primarySize[ 1 ] = ( sizes[ 0 ] == "auto" ? "auto" : `calc(${ topPercent }% - ${ splitbarOffset }px)`);
                        secondarySize[ 1 ] = ( sizes[ 1 ] == "auto" ? "auto" : `calc(${ bottomPercent }% - ${ splitbarOffset }px)`);
                    }

                    area1.root.style.width = primarySize[ 0 ];
                    area1.root.style.height = primarySize[ 1 ];

                    area2.root.style.width = secondarySize[ 0 ];
                    area2.root.style.height = secondarySize[ 1 ];
                }

                area1._update();
                area2._update();

                // Stop observing
                observer.disconnect();
            });

            // Observe the parent area until the DOM is ready
            // and the size is set correctly.
            LX.doAsync( () => {
                observer.observe( this.root );
            }, 100 );
        }

        if( auto && type == "vertical" )
        {
            // Listen resize event on first area
            this._autoVerticalResizeObserver = new ResizeObserver( entries => {
                for ( const entry of entries )
                {
                    const size = entry.target.getComputedSize();
                    area2.root.style.height = "calc(100% - " + ( size.height ) + "px )";
                }
            });

            this._autoVerticalResizeObserver.observe( area1.root );
        }

        // Being minimizable means it's also resizeable!
        if( resize && minimizable )
        {
            this.splitExtended = false;

            // Keep state of the animation when ends...
            area2.root.addEventListener('animationend', e => {
                const opacity = getComputedStyle( area2.root ).opacity;
                area2.root.classList.remove( e.animationName + "-" + type );
                area2.root.style.opacity = opacity;
                LX.flushCss( area2.root );
            });

            this.splitBar.addEventListener("contextmenu", e => {
                e.preventDefault();
                LX.addContextMenu(null, e, c => {
                    c.add("Extend", { disabled: this.splitExtended, callback: () => { this.extend() } });
                    c.add("Reduce", { disabled: !this.splitExtended, callback: () => { this.reduce() } });
                });
            });
        }

        area1.parentArea = this;
        area2.parentArea = this;

        this.root.appendChild( area1.root );

        if( resize )
        {
            this.root.appendChild( this.splitBar );
        }

        this.root.appendChild( area2.root );

        this.sections = [ area1, area2 ];
        this.type = type;

        // Update sizes
        this._update( rect.width || rect.height ? [ rect.width, rect.height ] : undefined );

        if( !resize )
        {
            return this.sections;
        }

        const that = this;

        function innerMouseDown( e )
        {
            const doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            e.stopPropagation();
            e.preventDefault();
            document.body.classList.add( 'nocursor' );
            that.splitBar.classList.add( 'nocursor' );
        }

        function innerMouseMove( e )
        {
            if( that.type == "horizontal" )
            {
                that._moveSplit( -e.movementX );
            }
            else
            {
                that._moveSplit( -e.movementY );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            const doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            that.splitBar.classList.remove( 'nocursor' );
        }

        return this.sections;
    }

    /**
    * @method setLimitBox
    * Set min max for width and height
    */
    setLimitBox( minw = 0, minh = 0, maxw = Infinity, maxh = Infinity ) {

        this.minWidth   = minw;
        this.minHeight  = minh;
        this.maxWidth   = maxw;
        this.maxHeight  = maxh;

        if( minw != 0 ) this.root.style.minWidth = `${ minw }px`;
        if( minh != 0 ) this.root.style.minHeight = `${ minh }px`;
        if( maxw != Infinity ) this.root.style.maxWidth = `${ maxw }px`;
        if( maxh != Infinity ) this.root.style.maxHeight = `${ maxh }px`;
    }

    /**
    * @method resize
    * Resize element
    */
    setSize( size ) {

        let [ width, height ] = size;

        if( width != undefined && width.constructor == Number )
        {
            width += "px";
        }

        if( height != undefined && height.constructor == Number )
        {
            height += "px";
        }

        if( width )
        {
            this.root.style.width = width;
        }

        if( height )
        {
            this.root.style.height = height;
        }

        if( this.onresize )
        {
            this.onresize( this.root.getBoundingClientRect() );
        }

        LX.doAsync( () => {
            this.size = [ this.root.clientWidth, this.root.clientHeight ];
            this.propagateEvent( "onresize" );
        }, 150 );
    }

    /**
    * @method extend
    * Hide 2nd area split
    */
    extend() {

        if( this.splitExtended )
        {
            return;
        }

        let [ area1, area2 ] = this.sections;
        this.splitExtended = true;

        if( this.type == "vertical" )
        {
            this.offset = area2.root.offsetHeight;
            area2.root.classList.add("fadeout-vertical");
            this._moveSplit( -Infinity, true );

        }
        else
        {
            this.offset = area2.root.offsetWidth - 8; // Force some height here...
            area2.root.classList.add("fadeout-horizontal");
            this._moveSplit( -Infinity, true, 8 );
        }

        LX.doAsync( () => this.propagateEvent('onresize'), 150 );
    }

    /**
    * @method reduce
    * Show 2nd area split
    */
    reduce() {

        if( !this.splitExtended )
        return;

        this.splitExtended = false;
        let [area1, area2] = this.sections;

        if( this.type == "vertical")
        {
            area2.root.classList.add("fadein-vertical");
            this._moveSplit(this.offset);
        }
        else
        {
            area2.root.classList.add("fadein-horizontal");
            this._moveSplit(this.offset);
        }

        LX.doAsync( () => this.propagateEvent('onresize'), 150 );
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

        for( let i = 0; i < this.sections.length; i++ )
        {
            const area = this.sections[ i ];

            if( area[ eventName ] )
            {
                area[ eventName ].call( this, area.root.getBoundingClientRect() );
            }

            area.propagateEvent( eventName );
        }
    }

    /**
     * @method addPanel
     * @param {Object} options
     * Options to create a Panel
     */

    addPanel( options ) {
        let panel = new LX.Panel( options );
        this.attach( panel );
        this.panels.push( panel );
        return panel;
    }

    /**
     * @method addMenubar
     * @param {Array} items Items to fill the menubar
     * @param {Object} options:
     * float: Justify content (left, center, right) [left]
     * sticky: Fix menubar at the top [true]
     */

    addMenubar( items, options = {} ) {

        let menubar = new LX.Menubar( items, options );

        LX.menubars.push( menubar );

        const [ bar, content ] = this.split({ type: 'vertical', sizes: ["48px", null], resize: false, menubar: true });
        menubar.siblingArea = content;

        bar.attach( menubar );
        bar.isMenubar = true;

        if( options.sticky ?? true )
        {
            bar.root.className += " sticky top-0";
        }

        if( options.parentClass )
        {
            bar.root.className += ` ${ options.parentClass }`;
        }

        return menubar;
    }

    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     * @param {Object} options: Sidebar options
     * width: Width of the sidebar [16rem]
     * side: Side to attach the sidebar (left|right) [left]
     */

    addSidebar( callback, options = {} ) {

        let sidebar = new LX.Sidebar( { callback, ...options } );

        if( callback )
        {
            callback( sidebar );
        }

        // Generate DOM elements after adding all entries
        sidebar.update();

        LX.sidebars.push( sidebar );

        const side = options.side ?? "left";
        console.assert( side == "left" || side == "right", "Invalid sidebar side: " + side );
        const leftSidebar = ( side == "left" );

        const width = options.width ?? "16rem";
        const sizes = leftSidebar ? [ width, null ] : [ null, width ];
        const [ left, right ] = this.split( { type: 'horizontal', sizes, resize: false, sidebar: true } );
        sidebar.siblingArea = leftSidebar ? right : left;

        let bar = leftSidebar ? left : right;
        bar.attach( sidebar );
        bar.isSidebar = true;

        if( options.parentClass )
        {
            bar.root.className += ` ${ options.parentClass }`;
        }

        return sidebar;
    }

    /**
     * @method addOverlayButtons
     * @param {Array} buttons Buttons info
     * @param {Object} options:
     * float: Where to put the buttons (h: horizontal, v: vertical, t: top, m: middle, b: bottom, l: left, c: center, r: right) [htc]
     */

    addOverlayButtons( buttons, options = {} ) {

        // Add to last split section if area has been split
        if( this.sections.length )
        {
            this.sections[ 1 ].addOverlayButtons(  buttons, options );
            return;
        }

        console.assert( buttons.constructor == Array && buttons.length );

        // Set area to relative to use local position
        this.root.style.position = "relative";

        options.className = "lexoverlaybuttons";

        let overlayPanel = this.addPanel( options );
        let overlayGroup = null;

        const container = document.createElement("div");
        container.className = "lexoverlaybuttonscontainer";
        container.appendChild( overlayPanel.root );
        this.attach( container );

        const float = options.float;

        if( float )
        {
            for( let i = 0; i < float.length; i++ )
            {
                const t = float[ i ];
                switch( t )
                {
                case 'h': break;
                case 'v': container.className += " vertical"; break;
                case 't': break;
                case 'm': container.className += " middle"; break;
                case 'b': container.className += " bottom"; break;
                case 'l': break;
                case 'c': container.className += " center"; break;
                case 'r': container.className += " right"; break;
                }
            }
        }

        const _addButton = function( b, group, last ) {

            const _options = {
                width: "auto",
                selectable: b.selectable,
                selected: b.selected,
                icon: b.icon,
                img: b.img,
                className: b.class ?? "",
                title: b.name,
                overflowContainerX: overlayPanel.root,
                swap: b.swap
            };

            if( group )
            {
                if( !overlayGroup )
                {
                    overlayGroup = document.createElement('div');
                    overlayGroup.className = "lexoverlaygroup";
                    overlayPanel.queuedContainer = overlayGroup;
                }

                _options.parent = overlayGroup;
            }

            let callback = b.callback;

            if( b.options )
            {
                overlayPanel.addSelect( null, b.options, b.name, callback, _options );
            }
            else
            {
                const button = overlayPanel.addButton( null, b.name, function( value, event ) {
                    if( b.selectable )
                    {
                        if( b.group )
                        {
                            let _prev = b.selected;
                            b.group.forEach( sub => sub.selected = false );
                            b.selected = !_prev;
                        }
                        else
                        {
                            b.selected = !b.selected;
                        }
                    }

                    if( callback )
                    {
                        callback( value, event, button.root );
                    }

                }, _options );
            }

            // ends the group
            if( overlayGroup && last )
            {
                overlayPanel.root.appendChild( overlayGroup );
                overlayGroup = null;
                overlayPanel.clearQueue();
            }
        }

        const _refreshPanel = function() {

            overlayPanel.clear();

            for( let b of buttons )
            {
                if( b === null )
                {
                    // Add a separator
                    const separator = document.createElement("div");
                    separator.className = "lexoverlayseparator";
                    overlayPanel.root.appendChild( separator );
                    continue;
                }

                if( b.constructor === Array )
                {
                    for( let i = 0; i < b.length; ++i )
                    {
                        let sub = b[ i ];
                        sub.group = b;
                        _addButton(sub, true, i == ( b.length - 1 ));
                    }
                }
                else
                {
                    _addButton( b );
                }
            }

            // Add floating info
            if( float )
            {
                var height = 0;
                overlayPanel.root.childNodes.forEach( c => { height += c.offsetHeight; } );

                if( container.className.includes( "middle" ) )
                {
                    container.style.top = "-moz-calc( 50% - " + (height * 0.5) + "px )";
                    container.style.top = "-webkit-calc( 50% - " + (height * 0.5) + "px )";
                    container.style.top = "calc( 50% - " + (height * 0.5) + "px )";
                }
            }
        }

        _refreshPanel();
    }

    /**
     * @method addTabs
     * @param {Object} options:
     * parentClass: Add extra class to tab buttons container
     */

    addTabs( options = {} ) {

        const tabs = new LX.Tabs( this, options );

        if( options.folding )
        {
            this.parentArea._disableSplitResize();
            // Compensate split bar...
            this.root.style.paddingTop = "4px";
        }

        return tabs;
    }

    _moveSplit( dt, forceAnimation = false, forceWidth = 0 ) {

        if( !this.type )
        {
            throw( "No split area" );
        }

        if( dt === undefined ) // Splitbar didn't move!
        {
            return;
        }

        // When manual resizing, we don't need the observer anymore
        if( this._autoVerticalResizeObserver )
        {
            this._autoVerticalResizeObserver.disconnect();
        }

        const a1 = this.sections[ 0 ];
        var a1Root = a1.root;

        if( !a1Root.classList.contains( "origin" ) )
        {
            a1Root = a1Root.parentElement;
        }

        const a2 = this.sections[ 1 ];
        const a2Root = a2.root;
        const splitData = "- "+ LX.DEFAULT_SPLITBAR_SIZE + "px";

        let transition = null;
        if( !forceAnimation )
        {
            // Remove transitions for this change..
            transition = a1Root.style.transition;
            a1Root.style.transition = a2Root.style.transition = "none";
            // LX.flushCss( a1Root );
        }

        if( this.type == "horizontal" )
        {
            var size = Math.max( a2Root.offsetWidth + dt, parseInt( a2.minWidth ) );
            if( forceWidth ) size = forceWidth;

            const parentWidth = this.size[ 0 ];
            const rightPercent = ( size / parentWidth ) * 100;
            const leftPercent = Math.max( 0, 100 - rightPercent );

            a1Root.style.width = `-moz-calc(${ leftPercent }% ${ splitData })`;
            a1Root.style.width = `-webkit-calc( ${ leftPercent }% ${ splitData })`;
            a1Root.style.width = `calc( ${ leftPercent }% ${ splitData })`;
            a2Root.style.width = `${ rightPercent }%`;
            a2Root.style.width = `${ rightPercent }%`;
            a2Root.style.width = `${ rightPercent }%`;

            if( a1.maxWidth != Infinity )
            {
                a2Root.style.minWidth = `calc( 100% - ${ parseInt( a1.maxWidth ) }px )`;
            }
        }
        else
        {
            var size = Math.max( ( a2Root.offsetHeight + dt ) + a2.offset, parseInt( a2.minHeight ) );
            if( forceWidth ) size = forceWidth;

            const parentHeight = this.size[ 1 ];
            const bottomPercent = ( size / parentHeight ) * 100;
            const topPercent = Math.max( 0, 100 - bottomPercent );

            a1Root.style.height = `-moz-calc(${ topPercent }% ${ splitData })`;
            a1Root.style.height = `-webkit-calc( ${ topPercent }% ${ splitData })`;
            a1Root.style.height = `calc( ${ topPercent }% ${ splitData })`;
            a2Root.style.height = `${ bottomPercent }%`;
            a2Root.style.height = `${ bottomPercent }%`;
            a2Root.style.height = `${ bottomPercent }%`;

            if( a1.maxHeight != Infinity )
            {
                a2Root.style.minHeight = `calc( 100% - ${ parseInt( a1.maxHeight ) }px )`;
            }
        }

        if( !forceAnimation )
        {
            // Reapply transitions
            a1Root.style.transition = a2Root.style.transition = transition;
        }

        LX.doAsync( () => {
            this._update();
            this.propagateEvent( 'onresize' );
        }, 10 );
    }

    _disableSplitResize() {

        this.resize = false;
        this.splitBar.remove();
        delete this.splitBar;
    }

    _update( newSize, propagate = true ) {

        if( !newSize )
        {
            const rect = this.root.getBoundingClientRect();
            this.size = [ rect.width, rect.height ];
        }
        else
        {
            this.size = newSize;
        }

        if( propagate )
        {
            for( var i = 0; i < this.sections.length; i++ )
            {
                this.sections[ i ]._update();
            }
        }
    }
};

LX.Area = Area;

export { Area };