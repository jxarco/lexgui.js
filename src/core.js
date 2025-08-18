// Lexgui.js @jxarco

/**
 * Main namespace
 * @namespace LX
*/

const LX = {
    version: "0.7.1",
    ready: false,
    extensions: [], // Store extensions used
    signals: {}, // Events and triggers
    extraCommandbarEntries: [], // User specific entries for command bar
    activeDraggable: null // Watch for the current active draggable
};

LX.MOUSE_LEFT_CLICK     = 0;
LX.MOUSE_MIDDLE_CLICK   = 1;
LX.MOUSE_RIGHT_CLICK    = 2;

LX.MOUSE_DOUBLE_CLICK   = 2;
LX.MOUSE_TRIPLE_CLICK   = 3;

LX.CURVE_MOVEOUT_CLAMP  = 0;
LX.CURVE_MOVEOUT_DELETE = 1;

LX.DRAGGABLE_Z_INDEX    = 101;

class vec2 {

    constructor( x, y ) {
        this.x = x ?? 0;
        this.y = y ?? ( x ?? 0 );
    }

    get xy() { return [ this.x, this.y ]; }
    get yx() { return [ this.y, this.x ]; }

    set ( x, y ) { this.x = x; this.y = y; }
    add ( v, v0 = new vec2() ) { v0.set( this.x + v.x, this.y + v.y ); return v0; }
    sub ( v, v0 = new vec2() ) { v0.set( this.x - v.x, this.y - v.y ); return v0; }
    mul ( v, v0 = new vec2() ) { if( v.constructor == Number ) { v = new vec2( v ) } v0.set( this.x * v.x, this.y * v.y ); return v0; }
    div ( v, v0 = new vec2() ) { if( v.constructor == Number ) { v = new vec2( v ) } v0.set( this.x / v.x, this.y / v.y ); return v0; }
    abs ( v0 = new vec2() ) { v0.set( Math.abs( this.x ), Math.abs( this.y ) ); return v0; }
    dot ( v ) { return this.x * v.x + this.y * v.y; }
    len2 () { return this.dot( this ) }
    len () { return Math.sqrt( this.len2() ); }
    nrm ( v0 = new vec2() ) { v0.set( this.x, this.y ); return v0.mul( 1.0 / this.len(), v0 ); }
    dst ( v ) { return v.sub( this ).len(); }
    clp ( min, max, v0 = new vec2() ) { v0.set( LX.clamp( this.x, min, max ), LX.clamp( this.y, min, max ) ); return v0; }

    fromArray ( array ) { this.x = array[ 0 ]; this.y = array[ 1 ]; }
    toArray () { return this.xy }
};

LX.vec2 = vec2;

class Color {

	constructor( value ) {

        Object.defineProperty( Color.prototype, "rgb", {
            get: function() { return this._rgb; },
            set: function( v ) { this._fromRGB( v ) }, enumerable: true, configurable: true
        });

        Object.defineProperty( Color.prototype, "hex", {
            get: function() { return this._hex; },
            set: function( v ) { this._fromHex( v ) }, enumerable: true, configurable: true
        });

        Object.defineProperty( Color.prototype, "hsv", {
            get: function() { return this._hsv; },
            set: function( v ) { this._fromHSV( v ) }, enumerable: true, configurable: true
        });

		this.set( value );
	}

	set( value ) {

		if ( typeof value === 'string' && value.startsWith( '#' ) )
        {
			this._fromHex( value );
		}
        else if( 'r' in value && 'g' in value && 'b' in value)
        {
            value.a = value.a ?? 1.0;
			this._fromRGB( value );
		}
        else if( 'h' in value && 's' in value && 'v' in value )
        {
            value.a = value.a ?? 1.0;
			this._fromHSV( value );
		}
        else
        {
            throw( "Bad color model!", value );
        }
	}

    setHSV( hsv ) { this._fromHSV( hsv ); }
    setRGB( rgb ) { this._fromRGB( rgb ); }
    setHex( hex ) { this._fromHex( hex ); }

	_fromHex( hex ) {
		this._fromRGB( LX.hexToRgb( hex ) );
	}

	_fromRGB( rgb ) {
		this._rgb = rgb;
		this._hsv = LX.rgbToHsv( rgb );
		this._hex = LX.rgbToHex( rgb );
        this.css = LX.rgbToCss( this._rgb );
	}

	_fromHSV( hsv ) {
		this._hsv = hsv;
		this._rgb = LX.hsvToRgb( hsv );
		this._hex = LX.rgbToHex( this._rgb );
        this.css = LX.rgbToCss( this._rgb );
	}
}

LX.Color = Color;

// Command bar creation

function _createCommandbar( root )
{
    let commandbar = document.createElement( "dialog" );
    commandbar.className = "commandbar";
    commandbar.tabIndex = -1;
    root.appendChild( commandbar );

    let allItems = [];
    let hoverElId = null;

    commandbar.addEventListener('keydown', function( e ) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        hoverElId = hoverElId ?? -1;
        if( e.key == 'Escape' )
        {
            this.close();
            _resetBar( true );
        }
        else if( e.key == 'Enter' )
        {
            const el = allItems[ hoverElId ];
            if( el )
            {
                if( el.item.checked != undefined )
                {
                    el.item.checked = !el.item.checked;
                }

                this.close();

                el.callback.call( window, el.item.name, el.item.checked );
            }
        }
        else if ( e.key == 'ArrowDown' && hoverElId < (allItems.length - 1) )
        {
            hoverElId++;
            commandbar.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
            allItems[ hoverElId ].classList.add('hovered');

            let dt = allItems[ hoverElId ].offsetHeight * (hoverElId + 1) - itemContainer.offsetHeight;
            if( dt > 0 )
            {
                itemContainer.scrollTo({
                    top: dt,
                    behavior: "smooth",
                });
            }

        } else if ( e.key == 'ArrowUp' && hoverElId > 0 )
        {
            hoverElId--;
            commandbar.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
            allItems[ hoverElId ].classList.add('hovered');
        }
    });

    commandbar.addEventListener('focusout', function( e ) {
        if( e.relatedTarget == e.currentTarget )
        {
            return;
        }
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.close();
        _resetBar( true );
    });

    root.addEventListener('keydown', e => {
        if( e.key == ' ' && e.ctrlKey )
        {
            e.stopImmediatePropagation();
            e.stopPropagation();
            LX.setCommandbarState( true );
        }
        else
        {
            for( let c of LX.extensions )
            {
                if( !LX[ c ] || !LX[ c ].prototype.onKeyPressed )
                {
                    continue;
                }

                const instances = LX.CodeEditor.getInstances();
                for( let i of instances )
                {
                    i.onKeyPressed( e );
                }
            }
        }
    });

    const header = LX.makeContainer( ["100%", "auto"], "flex flex-row" );

    const filter = new LX.TextInput( null, "", (v) => {
        commandbar._addElements( v.toLowerCase() );
    }, { width: "100%", icon: "Search", trigger: "input", placeholder: "Search..." } );
    header.appendChild( filter.root );

    const tabArea = new LX.Area( {
        width: "100%",
        skipAppend: true,
        className: "cb-tabs"
    } );

    const cbTabs = tabArea.addTabs( { parentClass: "p-2" } );
    let cbFilter = null;

    // These tabs will serve as buttons by now
    // Filter stuff depending of the type of search
    {
        const _onSelectTab = ( e, tabName ) => {
            cbFilter = tabName;
        }

        cbTabs.add( "All", document.createElement('div'), { selected: true, onSelect: _onSelectTab } );
        // cbTabs.add( "Main", document.createElement('div'), { onSelect: _onSelectTab } );
    }

    const itemContainer = document.createElement("div");
    itemContainer.className = "searchitembox";

    let refPrevious = null;

    const _resetBar = resetInput => {
        itemContainer.innerHTML = "";
        allItems.length = 0;
        hoverElId = null;
        if( resetInput )
        {
            filter.set( "", true );
        }
    }

    const _addElement = ( t, c, p, i ) => {

        if( !t.length )
        {
            return;
        }

        if( refPrevious ) refPrevious.classList.remove('last');

        let searchItem = document.createElement("div");
        searchItem.className = "searchitem last";
        if( i?.checked !== undefined )
        {
            const iconHtml = i.checked ? LX.makeIcon( "Check" ).innerHTML : "";
            searchItem.innerHTML = iconHtml + ( p + t );
        }
        else
        {
            searchItem.innerHTML = ( p + t );
        }
        searchItem.callback = c;
        searchItem.item = i;

        searchItem.addEventListener('click', e => {

            if( i.checked != undefined )
            {
                i.checked = !i.checked;
            }

            c.call( window, t, i.checked );
            LX.setCommandbarState( false );
            _resetBar( true );
        });

        searchItem.addEventListener('mouseenter', function( e ) {
            commandbar.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
            this.classList.add('hovered');
            hoverElId = allItems.indexOf( this );
        });

        searchItem.addEventListener('mouseleave', function( e ) {
            this.classList.remove('hovered');
        });

        allItems.push( searchItem );
        itemContainer.appendChild( searchItem );
        refPrevious = searchItem;
    }

    const _propagateAdd = ( item, filter, path, skipPropagation ) => {

        if( !item || ( item.constructor != Object ) )
        {
            return;
        }

        let name = item.name;
        if( name.toLowerCase().includes( filter ) )
        {
            if( item.callback )
            {
                _addElement( name, item.callback, path, item );
            }
        }

        const submenu = item.submenu ?? item[ name ];
        if( skipPropagation || !submenu )
        {
            return;
        }

        const icon = LX.makeIcon( "ChevronRight", { svgClass: "sm fg-secondary separator" } );
        path += name + icon.innerHTML;

        for( let c of submenu )
        {
            _propagateAdd( c, filter, path );
        }
    };

    commandbar._addElements = filter => {

        _resetBar();

        for( let m of LX.menubars )
        {
            for( let i of m.items )
            {
                _propagateAdd( i, filter, "" );
            }
        }

        for( let m of LX.sidebars )
        {
            for( let i of m.items )
            {
                _propagateAdd( i, filter, "" );
            }
        }

        for( let entry of LX.extraCommandbarEntries )
        {
            const name = entry.name;
            if( !name.toLowerCase().includes( filter ) )
            {
                continue;
            }
            _addElement( name, entry.callback, "", {} );
        }

        if( LX.has('CodeEditor') )
        {
            const instances = LX.CodeEditor.getInstances();
            if( !instances.length || !instances[ 0 ].area.root.offsetHeight ) return;

            const languages = instances[ 0 ].languages;

            for( let l of Object.keys( languages ) )
            {
                const key = "Language: " + l;
                const icon = instances[ 0 ]._getFileIcon( null, languages[ l ].ext );
                const classes = icon.split( ' ' );

                let value = LX.makeIcon( classes[ 0 ], { svgClass: `${ classes.slice( 0 ).join( ' ' ) }` } ).innerHTML;
                value += key + " <span class='lang-ext'>(" + languages[ l ].ext + ")</span>";

                if( key.toLowerCase().includes( filter ) )
                {
                    _addElement( value, () => {
                        for( let i of instances )
                        {
                            i._changeLanguage( l );
                        }
                    }, "", {} );
                }
            }
        }
    }

    commandbar.appendChild( header );
    commandbar.appendChild( tabArea.root );
    commandbar.appendChild( itemContainer );

    return commandbar;
}

/**
 * @method init
 * @param {Object} options
 * autoTheme: Use theme depending on browser-system default theme [true]
 * container: Root location for the gui (default is the document body)
 * id: Id of the main area
 * rootClass: Extra class to the root container
 * skipRoot: Skip adding LX root container
 * skipDefaultArea: Skip creation of main area
 * layoutMode: Sets page layout mode (document | app)
 * spacingMode: Sets page layout spacing mode (default | compact)
 */

async function init( options = { } )
{
    if( this.ready )
    {
        return this.main_area;
    }

    await LX.loadScriptSync( "https://unpkg.com/lucide@latest" );

    // LexGUI root
    console.log( `LexGUI v${ this.version }` );

    var root = document.createElement( 'div' );
    root.id = "lexroot";
    root.className = "lexcontainer";
    root.tabIndex = -1;

    if( options.rootClass )
    {
        root.className += ` ${ options.rootClass }`;
    }

    this.modal = document.createElement( 'div' );
    this.modal.id = "modal";
    this.modal.classList.add( 'hidden-opacity' );
    this.modal.toggle = function( force ) { this.classList.toggle( 'hidden-opacity', force ); };

    this.root = root;
    this.container = document.body;

    if( options.container )
    {
        this.container = options.container.constructor === String ? document.getElementById( options.container ) : options.container;
    }

    this.layoutMode = options.layoutMode ?? "app";
    document.documentElement.setAttribute( "data-layout", this.layoutMode );

    if( this.layoutMode == "document" )
    {
        document.addEventListener( "scroll", e => {
            // Get all active menuboxes
            const mbs = document.body.querySelectorAll( ".lexdropdownmenu" );
            mbs.forEach( ( mb ) => {
                mb._updatePosition();
            } );
        } );
    }

    this.spacingMode = options.spacingMode ?? "default";
    document.documentElement.setAttribute( "data-spacing", this.spacingMode );

    this.container.appendChild( this.modal );

    if( !options.skipRoot )
    {
        this.container.appendChild( root );
    }
    else
    {
        this.root = document.body;
    }

    // Notifications
    {
        const notifSection = document.createElement( "section" );
        notifSection.className = "notifications";
        this.notifications = document.createElement( "ol" );
        this.notifications.className = "";
        this.notifications.iWidth = 0;
        notifSection.appendChild( this.notifications );
        document.body.appendChild( notifSection );

        this.notifications.addEventListener( "mouseenter", () => {
            this.notifications.classList.add( "list" );
        } );

        this.notifications.addEventListener( "mouseleave", () => {
            this.notifications.classList.remove( "list" );
        } );
    }

    // Disable drag icon
    root.addEventListener( 'dragover', function( e ) {
        e.preventDefault();
    }, false );

    document.addEventListener( 'contextmenu', function( e ) {
        e.preventDefault();
    }, false );

    // Global vars
    this.DEFAULT_NAME_WIDTH     = "30%";
    this.DEFAULT_SPLITBAR_SIZE  = 4;
    this.OPEN_CONTEXTMENU_ENTRY = 'click';

    this.componentResizeObserver = new ResizeObserver( entries => {
        for ( const entry of entries )
        {
            const c = entry.target?.jsInstance;
            if( c && c.onResize )
            {
                c.onResize( entry.contentRect );
            }
        }
    });

    this.ready = true;
    this.menubars = [ ];
    this.sidebars = [ ];
    this.commandbar = _createCommandbar( this.container );

    if( !options.skipRoot && !options.skipDefaultArea )
    {
        this.main_area = new LX.Area( { id: options.id ?? 'mainarea' } );
    }

    if( ( options.autoTheme ?? true ) )
    {
        if( window.matchMedia && window.matchMedia( "(prefers-color-scheme: light)" ).matches )
        {
            LX.setTheme( "light" );
        }

        window.matchMedia( "(prefers-color-scheme: dark)" ).addEventListener( "change", event => {
            LX.setTheme( event.matches ? "dark" : "light" );
        });
    }

    return this.main_area;
}

LX.init = init;

/**
 * @method setLayoutMode
 * @param {String} mode: document | app
 */

function setLayoutMode( mode )
{
    this.layoutMode = mode;
    document.documentElement.setAttribute( "data-layout", this.layoutMode );
}

LX.setLayoutMode = setLayoutMode;

/**
 * @method setSpacingMode
 * @param {String} mode: default | compact
 */

function setSpacingMode( mode )
{
    this.spacingMode = mode;
    document.documentElement.setAttribute( "data-spacing", this.spacingMode );
}

LX.setSpacingMode = setSpacingMode;

/**
 * @method setCommandbarState
 * @param {Boolean} value
 * @param {Boolean} resetEntries
 */

function setCommandbarState( value, resetEntries = true )
{
    const cb = this.commandbar;

    if( value )
    {
        cb.show();
        cb.querySelector('input').focus();

        if( resetEntries )
        {
            cb._addElements( undefined );
        }
    }
    else
    {
        cb.close();
    }
}

LX.setCommandbarState = setCommandbarState;

/*
*   Events and Signals
*/

class IEvent {

    constructor( name, value, domEvent ) {
        this.name = name;
        this.value = value;
        this.domEvent = domEvent;
    }
};

LX.IEvent = IEvent;

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
        this.panel = null;
    }

    string() {
        switch( this.type )
        {
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

function emit( signalName, value, options = {} )
{
    const data = LX.signals[ signalName ];

    if( !data )
    {
        return;
    }

    const target = options.target;

    if( target )
    {
        if( target[ signalName ])
        {
            target[ signalName ].call( target, value );
        }

        return;
    }

    for( let obj of data )
    {
        if( obj instanceof LX.BaseComponent )
        {
            obj.set( value, options.skipCallback ?? true );
        }
        else if( obj.constructor === Function )
        {
            const fn = obj;
            fn( null, value );
        }
        else
        {
            // This is an element
            const fn = obj[ signalName ];
            console.assert( fn, `No callback registered with _${ signalName }_ signal` );
            fn.bind( obj )( value );
        }
    }
}

LX.emit = emit;

function addSignal( name, obj, callback )
{
    obj[ name ] = callback;

    if( !LX.signals[ name ] )
    {
        LX.signals[ name ] = [];
    }

    if( LX.signals[ name ].indexOf( obj ) > -1 )
    {
        return;
    }

    LX.signals[ name ].push( obj );
}

LX.addSignal = addSignal;

/*
*   DOM Elements
*/

/**
 * @class Popover
 */

class Popover {

    static activeElement = false;

    constructor( trigger, content, options = {} ) {

        if( Popover.activeElement )
        {
            Popover.activeElement.destroy();
            return;
        }

        this._trigger = trigger;

        if( trigger )
        {
            trigger.classList.add( "triggered" );
            trigger.active = this;
        }

        this._windowPadding = 4;
        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.sideOffset = options.sideOffset ?? 0;
        this.alignOffset = options.alignOffset ?? 0;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.reference = options.reference;

        this.root = document.createElement( "div" );
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexpopover";

        const refElement = trigger ?? this.reference;
        const nestedDialog = refElement.closest( "dialog" );
        if( nestedDialog && nestedDialog.dataset[ "modal" ] == 'true' )
        {
            this._parent = nestedDialog;
        }
        else
        {
            this._parent = LX.root;
        }

        this._parent.appendChild( this.root );

        this.root.addEventListener( "keydown", (e) => {
            if( e.key == "Escape" )
            {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        } )

        if( content )
        {
            content = [].concat( content );
            content.forEach( e => {
                const domNode = e.root ?? e;
                this.root.appendChild( domNode );
                if( e.onPopover )
                {
                    e.onPopover();
                }
            } );
        }

        Popover.activeElement = this;

        LX.doAsync( () => {
            this._adjustPosition();

            if( this._trigger )
            {
                this.root.focus();

                this._onClick = e => {
                    if( e.target && ( this.root.contains( e.target ) || e.target == this._trigger ) )
                    {
                        return;
                    }
                    this.destroy();
                };

                document.body.addEventListener( "mousedown", this._onClick, true );
                document.body.addEventListener( "focusin", this._onClick, true );
            }

        }, 10 );
    }

    destroy() {

        if( this._trigger )
        {
            this._trigger.classList.remove( "triggered" );
            delete this._trigger.active;

            document.body.removeEventListener( "mousedown", this._onClick, true );
            document.body.removeEventListener( "focusin", this._onClick, true );
        }

        this.root.remove();

        Popover.activeElement = null;
    }

    _adjustPosition() {

        const position = [ 0, 0 ];

        // Place menu using trigger position and user options
        {
            const el = this.reference ?? this._trigger;
            console.assert( el, "Popover needs a trigger or reference element!" );
            const rect = el.getBoundingClientRect();

            let alignWidth = true;

            switch( this.side )
            {
                case "left":
                    position[ 0 ] += ( rect.x - this.root.offsetWidth - this.sideOffset );
                    alignWidth = false;
                    break;
                case "right":
                    position[ 0 ] += ( rect.x + rect.width + this.sideOffset );
                    alignWidth = false;
                    break;
                case "top":
                    position[ 1 ] += ( rect.y - this.root.offsetHeight - this.sideOffset );
                    alignWidth = true;
                    break;
                case "bottom":
                    position[ 1 ] += ( rect.y + rect.height + this.sideOffset );
                    alignWidth = true;
                    break;
                default:
                    break;
            }

            switch( this.align )
            {
                case "start":
                    if( alignWidth ) { position[ 0 ] += rect.x; }
                    else { position[ 1 ] += rect.y; }
                    break;
                case "center":
                    if( alignWidth ) { position[ 0 ] += ( rect.x + rect.width * 0.5 ) - this.root.offsetWidth * 0.5; }
                    else { position[ 1 ] += ( rect.y + rect.height * 0.5 ) - this.root.offsetHeight * 0.5; }
                    break;
                case "end":
                    if( alignWidth ) { position[ 0 ] += rect.x - this.root.offsetWidth + rect.width; }
                    else { position[ 1 ] += rect.y - this.root.offsetHeight + rect.height; }
                    break;
                default:
                    break;
            }

            if( alignWidth ) { position[ 0 ] += this.alignOffset; }
            else { position[ 1 ] += this.alignOffset; }
        }

        if( this.avoidCollisions )
        {
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        if( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[ 0 ] -= parentRect.x;
            position[ 1 ] -= parentRect.y;
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
    }
};

LX.Popover = Popover;

/**
 * @class PopConfirm
 */

class PopConfirm {

    constructor( reference, options = {} ) {

        const okText = options.confirmText ?? "Yes";
        const cancelText = options.cancelText ?? "No";
        const title = options.title ?? "Confirm";
        const content = options.content ?? "Are you sure you want to proceed?";
        const onConfirm = options.onConfirm;
        const onCancel = options.onCancel;

        const popoverContainer = LX.makeContainer( ["auto", "auto"], "tour-step-container" );

        {
            const headerDiv = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", popoverContainer );
            const titleDiv = LX.makeContainer( ["100%", "auto"], "p-1 font-medium text-md", title, headerDiv );
        }

        LX.makeContainer( ["100%", "auto"], "p-1 text-md", content, popoverContainer, { maxWidth: "400px" } );
        const footer = LX.makeContainer( ["100%", "auto"], "flex flex-row text-md", "", popoverContainer );
        const footerButtons = LX.makeContainer( ["100%", "auto"], "text-md", "", footer );
        const footerPanel = new LX.Panel();
        footerButtons.appendChild( footerPanel.root );

        footerPanel.sameLine( 2, "justify-end" );
        footerPanel.addButton( null, cancelText, () => {
            if( onCancel ) onCancel();
            this._popover?.destroy();
        }, { xbuttonClass: "contrast" } );
        footerPanel.addButton( null, okText, () => {
            if( onConfirm ) onConfirm();
            this._popover?.destroy();
        }, { buttonClass: "accent" } );

        this._popover?.destroy();
        this._popover = new LX.Popover( null, [ popoverContainer ], {
            reference,
            side: options.side ?? "top",
            align: options.align,
            sideOffset: options.sideOffset,
            alignOffset: options.alignOffset,
        } );

    }
}

LX.PopConfirm = PopConfirm;

/**
 * @class Sheet
 */

class Sheet {

    constructor( size, content, options = {} ) {

        this.side = options.side ?? "left";

        this.root = document.createElement( "div" );
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.role = "dialog";
        this.root.className = "lexsheet fixed z-1000 bg-primary";
        document.body.appendChild( this.root );

        this.root.addEventListener( "keydown", (e) => {
            if( e.key == "Escape" )
            {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        } )

        if( content )
        {
            content = [].concat( content );
            content.forEach( e => {
                const domNode = e.root ?? e;
                this.root.appendChild( domNode );
                if( e.onSheet )
                {
                    e.onSheet();
                }
            } );
        }

        LX.doAsync( () => {

            LX.modal.toggle( false );

            switch( this.side )
            {
                case "left":
                    this.root.style.left = 0;
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "right":
                    this.root.style.right = 0;
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "top":
                    this.root.style.left = 0;
                    this.root.style.top = 0;
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
                case "bottom":
                    this.root.style.left = 0;
                    this.root.style.bottom = 0;
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
                default:
                    break;
            }

            document.documentElement.setAttribute( "data-scale", `sheet-${ this.side }` );

            this.root.focus();

            this._onClick = e => {
                if( e.target && ( this.root.contains( e.target ) ) )
                {
                    return;
                }
                this.destroy();
            };

            document.body.addEventListener( "mousedown", this._onClick, true );
            document.body.addEventListener( "focusin", this._onClick, true );
        }, 10 );
    }

    destroy() {

        document.documentElement.setAttribute( "data-scale", "" );

        document.body.removeEventListener( "mousedown", this._onClick, true );
        document.body.removeEventListener( "focusin", this._onClick, true );

        this.root.remove();

        LX.modal.toggle( true );
    }
};

LX.Sheet = Sheet;

/**
 * @class DropdownMenu
 */

class DropdownMenu {

    static currentMenu = false;

    constructor( trigger, items, options = {} ) {

        console.assert( trigger, "DropdownMenu needs a DOM element as trigger!" );

        if( DropdownMenu.currentMenu || !items?.length )
        {
            DropdownMenu.currentMenu.destroy();
            this.invalid = true;
            return;
        }

        this._trigger = trigger;
        trigger.classList.add( "triggered" );
        trigger.ddm = this;

        this._items = items;

        this._windowPadding = 4;
        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.sideOffset = options.sideOffset ?? 0;
        this.alignOffset = options.alignOffset ?? 0;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.onBlur = options.onBlur;
        this.inPlace = false;

        this.root = document.createElement( "div" );
        this.root.id = "root";
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexdropdownmenu";

        const nestedDialog = trigger.closest( "dialog" );
        if( nestedDialog && nestedDialog.dataset[ "modal" ] == 'true' )
        {
            this._parent = nestedDialog;
        }
        else
        {
            this._parent = LX.root;
        }

        this._parent.appendChild( this.root );

        this._create( this._items );

        DropdownMenu.currentMenu = this;

        LX.doAsync( () => {
            this._adjustPosition();

            this.root.focus();

            this._onClick = e => {

                // Check if the click is inside a menu or on the trigger
                if( e.target && ( e.target.closest( ".lexdropdownmenu" ) != undefined || e.target == this._trigger ) )
                {
                    return;
                }

                this.destroy( true );
            };

            document.body.addEventListener( "mousedown", this._onClick, true );
            document.body.addEventListener( "focusin", this._onClick, true );
        }, 10 );
    }

    destroy( blurEvent ) {

        this._trigger.classList.remove( "triggered" );

        delete this._trigger.ddm;

        document.body.removeEventListener( "mousedown", this._onClick, true );
        document.body.removeEventListener( "focusin", this._onClick, true );

        this._parent.querySelectorAll( ".lexdropdownmenu" ).forEach( m => { m.remove(); } );

        DropdownMenu.currentMenu = null;

        if( blurEvent && this.onBlur )
        {
            this.onBlur();
        }
    }

    _create( items, parentDom ) {

        if( !parentDom )
        {
            parentDom = this.root;
        }
        else
        {
            const parentRect = parentDom.getBoundingClientRect();

            let newParent = document.createElement( "div" );
            newParent.tabIndex = "1";
            newParent.className = "lexdropdownmenu";
            newParent.dataset["id"] = parentDom.dataset["id"];
            newParent.dataset["side"] = "right"; // submenus always come from the right
            this._parent.appendChild( newParent );

            newParent.currentParent = parentDom;
            parentDom = newParent;

            LX.doAsync( () => {

                const position = [ parentRect.x + parentRect.width, parentRect.y ];

                if( this._parent instanceof HTMLDialogElement )
                {
                    let rootParentRect = this._parent.getBoundingClientRect();
                    position[ 0 ] -= rootParentRect.x;
                    position[ 1 ] -= rootParentRect.y;
                }

                if( this.avoidCollisions )
                {
                    position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - newParent.offsetWidth - this._windowPadding );
                    position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - newParent.offsetHeight - this._windowPadding );
                }

                newParent.style.left = `${ position[ 0 ] }px`;
                newParent.style.top = `${ position[ 1 ] }px`;
            }, 10 );
        }

        let applyIconPadding = items.filter( i => { return ( i?.icon != undefined ) || ( i?.checked != undefined ) } ).length > 0;

        for( let item of items )
        {
            this._createItem( item, parentDom, applyIconPadding );
        }
    }

    _createItem( item, parentDom, applyIconPadding ) {

        if( !item )
        {
            this._addSeparator( parentDom );
            return;
        }

        const key = item.name ?? item;
        const pKey = LX.getSupportedDOMName( key );

        // Item already created
        if( parentDom.querySelector( "#" + pKey ) )
        {
            return;
        }

        const menuItem = document.createElement('div');
        menuItem.className = "lexdropdownmenuitem" + ( item.name ? "" : " label" ) + ( item.disabled ?? false ? " disabled" : "" ) + ( ` ${ item.className ?? "" }` );
        menuItem.dataset["id"] = pKey;
        menuItem.innerHTML = `<span>${ key }</span>`;
        menuItem.tabIndex = "1";
        parentDom.appendChild( menuItem );

        if( item.constructor === String ) // Label case
        {
            return;
        }

        if( item.submenu )
        {
            const submenuIcon = LX.makeIcon( "Right", { svgClass: "sm" } );
            menuItem.appendChild( submenuIcon );
        }
        else if( item.kbd )
        {
            item.kbd = [].concat( item.kbd );

            const kbd = LX.makeKbd( item.kbd );
            menuItem.appendChild( kbd );

            document.addEventListener( "keydown", e => {
                if( !this._trigger.ddm ) return;
                e.preventDefault();
                // Check if it's a letter or other key
                let kdbKey = item.kbd.join("");
                kdbKey = kdbKey.length == 1 ? kdbKey.toLowerCase() : kdbKey;
                if( kdbKey == e.key )
                {
                    menuItem.click();
                }
            } );
        }

        const disabled = item.disabled ?? false;

        if( this._radioGroup !== undefined )
        {
            if( item.name === this._radioGroup.selected )
            {
                const icon = LX.makeIcon( "Circle", { svgClass: "xxs fill-current" } );
                menuItem.prepend( icon );
            }

            menuItem.setAttribute( "data-radioname", this._radioGroup.name );
        }
        else if( item.icon )
        {
            const icon = LX.makeIcon( item.icon, { svgClass: disabled ? "fg-tertiary" : item.className } );
            menuItem.prepend( icon );
        }
        else if( item.checked == undefined && applyIconPadding ) // no checkbox, no icon, apply padding if there's checkbox or icon in other items
        {
            menuItem.classList.add( "pl-8" );
        }

        if( disabled )
        {
            return;
        }

        if( item.checked != undefined )
        {
            const checkbox = new LX.Checkbox( pKey + "_entryChecked", item.checked, (v) => {
                const f = item[ 'callback' ];
                item.checked = v;
                if( f )
                {
                    f.call( this, key, v, menuItem );
                }
            }, { className: "accent" });
            const input = checkbox.root.querySelector( "input" );
            input.classList.add( "ml-auto" );
            menuItem.appendChild( input );

            menuItem.addEventListener( "click", (e) => {
                if( e.target.type == "checkbox" ) return;
                input.checked = !input.checked;
                checkbox.set( input.checked );
            } );
        }
        else
        {
            menuItem.addEventListener( "click", () => {
                const f = item[ 'callback' ];
                if( f )
                {
                    f.call( this, key, menuItem );
                }

                const radioName = menuItem.getAttribute( "data-radioname" );
                if( radioName )
                {
                    this._trigger[ radioName ] = key;
                }

                this.destroy( true );
            } );
        }

        menuItem.addEventListener("mouseover", e => {

            let path = menuItem.dataset["id"];
            let p = parentDom;

            while( p )
            {
                path += "/" + p.dataset["id"];
                p = p.currentParent?.parentElement;
            }

            this._parent.querySelectorAll( ".lexdropdownmenu" ).forEach( m => {
                if( !path.includes( m.dataset["id"] ) )
                {
                    m.currentParent.built = false;
                    m.remove();
                }
            } );

            if( item.submenu && this.inPlace )
            {
                if( menuItem.built )
                {
                    return;
                }
                menuItem.built = true;
                this._create( item.submenu, menuItem );
            }

            e.stopPropagation();
        });

        if( item.options )
        {
            this._addSeparator();

            console.assert( this._trigger[ item.name ] && "An item of the radio group must be selected!" );
            this._radioGroup = {
                name: item.name,
                selected: this._trigger[ item.name ]
            };

            for( let o of item.options )
            {
                this._createItem( o, parentDom, applyIconPadding );
            }

            delete this._radioGroup;

            this._addSeparator();
        }
    }

    _adjustPosition() {

        const position = [ 0, 0 ];

        // Place menu using trigger position and user options
        {
            const rect = this._trigger.getBoundingClientRect();

            let alignWidth = true;

            switch( this.side )
            {
                case "left":
                    position[ 0 ] += ( rect.x - this.root.offsetWidth - this.sideOffset );
                    alignWidth = false;
                    break;
                case "right":
                    position[ 0 ] += ( rect.x + rect.width + this.sideOffset );
                    alignWidth = false;
                    break;
                case "top":
                    position[ 1 ] += ( rect.y - this.root.offsetHeight - this.sideOffset );
                    alignWidth = true;
                    break;
                case "bottom":
                    position[ 1 ] += ( rect.y + rect.height + this.sideOffset );
                    alignWidth = true;
                    break;
                default:
                    break;
            }

            switch( this.align )
            {
                case "start":
                    if( alignWidth ) { position[ 0 ] += rect.x; }
                    else { position[ 1 ] += rect.y; }
                    break;
                case "center":
                    if( alignWidth ) { position[ 0 ] += ( rect.x + rect.width * 0.5 ) - this.root.offsetWidth * 0.5; }
                    else { position[ 1 ] += ( rect.y + rect.height * 0.5 ) - this.root.offsetHeight * 0.5; }
                    break;
                case "end":
                    if( alignWidth ) { position[ 0 ] += rect.x - this.root.offsetWidth + rect.width; }
                    else { position[ 1 ] += rect.y - this.root.offsetHeight + rect.height; }
                    break;
                default:
                    break;
            }

            if( alignWidth ) { position[ 0 ] += this.alignOffset; }
            else { position[ 1 ] += this.alignOffset; }
        }

        if( this.avoidCollisions )
        {
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        if( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[ 0 ] -= parentRect.x;
            position[ 1 ] -= parentRect.y;
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
        this.inPlace = true;
    }

    _addSeparator( parent ) {
        const separator = document.createElement('div');
        separator.className = "separator";
        parent = parent ?? this.root;
        parent.appendChild( separator );
    }
};

LX.DropdownMenu = DropdownMenu;

function addDropdownMenu( trigger, items, options )
{
    const menu = new DropdownMenu( trigger, items, options );
    if( !menu.invalid )
    {
        return menu;
    }
    return null;
}

LX.addDropdownMenu = addDropdownMenu;

/**
 * @class ColorPicker
 */

class ColorPicker {

    static currentPicker = false;

    constructor( hexValue, options = {} ) {

        this.colorModel = options.colorModel ?? "Hex";
        this.useAlpha = options.useAlpha ?? false;
        this.callback = options.onChange;

        if( !this.callback )
        {
            console.warn( "Define a callback in _options.onChange_ to allow getting new Color values!" );
        }

        this.root = document.createElement( "div" );
        this.root.className = "lexcolorpicker";

        this.markerHalfSize = 8;
        this.markerSize = this.markerHalfSize * 2;
        this.currentColor = new Color( hexValue );

        const hueColor = new Color( { h: this.currentColor.hsv.h, s: 1, v: 1 } );

        // Intensity, Sat
        this.colorPickerBackground = document.createElement( 'div' );
        this.colorPickerBackground.className = "lexcolorpickerbg";
        this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.root.appendChild( this.colorPickerBackground );

        this.intSatMarker = document.createElement( 'div' );
        this.intSatMarker.className = "lexcolormarker";
        this.intSatMarker.style.backgroundColor = this.currentColor.hex;
        this.colorPickerBackground.appendChild( this.intSatMarker );

        let pickerRect = null;

        let innerMouseDown = e => {
            var doc = this.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            const currentLeft = ( e.offsetX - this.markerHalfSize );
            this.intSatMarker.style.left = currentLeft + "px";
            const currentTop = ( e.offsetY - this.markerHalfSize );
            this.intSatMarker.style.top = currentTop + "px";
            this._positionToSv( currentLeft, currentTop );
            this._updateColorValue();

            pickerRect = this.colorPickerBackground.getBoundingClientRect();
        }

        let innerMouseMove = e => {
            const dX = e.movementX;
            const dY = e.movementY;
            const mouseX = e.x - pickerRect.x;
            const mouseY = e.y - pickerRect.y;

            if ( dX != 0 && ( mouseX >= 0 || dX < 0 ) && ( mouseX < this.colorPickerBackground.offsetWidth || dX > 0 ) )
            {
                this.intSatMarker.style.left = LX.clamp( parseInt( this.intSatMarker.style.left ) + dX, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize ) + "px";
            }

            if ( dY != 0 && ( mouseY >= 0 || dY < 0 ) && ( mouseY < this.colorPickerBackground.offsetHeight || dY > 0 ) )
            {
                this.intSatMarker.style.top = LX.clamp( parseInt( this.intSatMarker.style.top ) + dY, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize ) + "px";
            }

            this._positionToSv( parseInt( this.intSatMarker.style.left ), parseInt( this.intSatMarker.style.top ) );
            this._updateColorValue();

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUp = e => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'noevents' );
        }

        this.colorPickerBackground.addEventListener( "mousedown", innerMouseDown );

        const hueAlphaContainer = LX.makeContainer( ["100%", "auto"], "flex flex-row gap-1 items-center", "", this.root );

        if( window.EyeDropper )
        {
            hueAlphaContainer.appendChild( new LX.Button(null, "eyedrop",  async () => {
                const eyeDropper = new EyeDropper();
                try {
                    const result = await eyeDropper.open();
                    this.fromHexColor( result.sRGBHex );
                } catch ( err ) {
                    // console.error("EyeDropper cancelled or failed: ", err)
                }
            }, { icon: "Pipette", buttonClass: "bg-none", title: "Sample Color" }).root );
        }

        const innerHueAlpha = LX.makeContainer( ["100%", "100%"], "flex flex-col gap-2", "", hueAlphaContainer );

        // Hue
        this.colorPickerTracker = document.createElement( 'div' );
        this.colorPickerTracker.className = "lexhuetracker";
        innerHueAlpha.appendChild( this.colorPickerTracker );

        this.hueMarker = document.createElement( 'div' );
        this.hueMarker.className = "lexcolormarker";
        this.hueMarker.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.colorPickerTracker.appendChild( this.hueMarker );

        const _fromHueX = ( hueX ) => {
            this.hueMarker.style.left = hueX + "px";
            this.currentColor.hsv.h = LX.remapRange( hueX, 0, this.colorPickerTracker.offsetWidth - this.markerSize, 0, 360 );

            const hueColor = new Color( { h: this.currentColor.hsv.h, s: 1, v: 1 } );
            this.hueMarker.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
            this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
            this._updateColorValue();
        };

        let hueTrackerRect = null;

        let innerMouseDownHue = e => {
            const doc = this.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMoveHue );
            doc.addEventListener( 'mouseup', innerMouseUpHue );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            const hueX = LX.clamp( e.offsetX - this.markerHalfSize, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
            _fromHueX( hueX );

            hueTrackerRect = this.colorPickerTracker.getBoundingClientRect();
        }

        let innerMouseMoveHue = e => {
            const dX = e.movementX;
            const mouseX = e.x - hueTrackerRect.x;

            if ( dX != 0 && ( mouseX >= this.markerHalfSize || dX < 0 ) && ( mouseX < ( this.colorPickerTracker.offsetWidth - this.markerHalfSize ) || dX > 0 ) )
            {
                const hueX = LX.clamp( parseInt( this.hueMarker.style.left ) + dX, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
                _fromHueX( hueX );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUpHue = e => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMoveHue );
            doc.removeEventListener( 'mouseup', innerMouseUpHue );
            document.body.classList.remove( 'noevents' );
        }

        this.colorPickerTracker.addEventListener( "mousedown", innerMouseDownHue );

        // Alpha
        if( this.useAlpha )
        {
            this.alphaTracker = document.createElement( 'div' );
            this.alphaTracker.className = "lexalphatracker";
            this.alphaTracker.style.color = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b })`;
            innerHueAlpha.appendChild( this.alphaTracker );

            this.alphaMarker = document.createElement( 'div' );
            this.alphaMarker.className = "lexcolormarker";
            this.alphaMarker.style.backgroundColor = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b },${ this.currentColor.css.a })`;
            this.alphaTracker.appendChild( this.alphaMarker );

            const _fromAlphaX = ( alphaX ) => {
                this.alphaMarker.style.left = alphaX + "px";
                this.currentColor.hsv.a = LX.remapRange( alphaX, 0, this.alphaTracker.offsetWidth - this.markerSize, 0, 1 );
                this._updateColorValue();
                // Update alpha marker once the color is updated
                this.alphaMarker.style.backgroundColor = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b },${ this.currentColor.css.a })`;
            };

            let alphaTrackerRect = null;

            let innerMouseDownAlpha = e => {
                const doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMoveAlpha );
                doc.addEventListener( 'mouseup', innerMouseUpAlpha );
                document.body.classList.add( 'noevents' );
                e.stopImmediatePropagation();
                e.stopPropagation();
                const alphaX = LX.clamp( e.offsetX - this.markerHalfSize, 0, this.alphaTracker.offsetWidth - this.markerSize );
                _fromAlphaX( alphaX );
                alphaTrackerRect = this.alphaTracker.getBoundingClientRect();
            }

            let innerMouseMoveAlpha = e => {
                const dX = e.movementX;
                const mouseX = e.x - alphaTrackerRect.x;

                if ( dX != 0 && ( mouseX >= this.markerHalfSize || dX < 0 ) && ( mouseX < ( this.alphaTracker.offsetWidth - this.markerHalfSize ) || dX > 0 ) )
                {
                    const alphaX = LX.clamp( parseInt( this.alphaMarker.style.left ) + dX, 0, this.alphaTracker.offsetWidth - this.markerSize );
                    _fromAlphaX( alphaX );
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUpAlpha = e => {
                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMoveAlpha );
                doc.removeEventListener( 'mouseup', innerMouseUpAlpha );
                document.body.classList.remove( 'noevents' );
            }

            this.alphaTracker.addEventListener( "mousedown", innerMouseDownAlpha );
        }

        // Info display
        const colorLabel = LX.makeContainer( ["100%", "auto"], "flex flex-row gap-1", "", this.root );

        colorLabel.appendChild( new LX.Select( null, [ "CSS", "Hex", "HSV", "RGB" ], this.colorModel, v => {
            this.colorModel = v;
            this._updateColorValue( null, true );
        } ).root );

        this.labelComponent = new LX.TextInput( null, "", null, { inputClass: "bg-none", fit: true, disabled: true } );
        colorLabel.appendChild( this.labelComponent.root );

        // Copy button
        {
            const copyButtonComponent = new LX.Button(null, "copy",  async () => {
                navigator.clipboard.writeText( this.labelComponent.value() );
                copyButtonComponent.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "none";

                LX.doAsync( () => {
                    copyButtonComponent.swap( true );
                    copyButtonComponent.root.querySelector( "input[type='checkbox']" ).style.pointerEvents = "auto";
                }, 3000 );

            }, { swap: "Check", icon: "Copy", buttonClass: "bg-none", className: "ml-auto", title: "Copy" } );

            copyButtonComponent.root.querySelector( ".swap-on svg" ).addClass( "fg-success" );

            colorLabel.appendChild( copyButtonComponent.root );
        }

        this._updateColorValue( hexValue, true );

        LX.doAsync( this._placeMarkers.bind( this ) );

        this.onPopover = this._placeMarkers.bind( this );
    }

    _placeMarkers() {

        this._svToPosition( this.currentColor.hsv.s, this.currentColor.hsv.v );

        const hueLeft = LX.remapRange( this.currentColor.hsv.h, 0, 360, 0, this.colorPickerTracker.offsetWidth - this.markerSize );
        this.hueMarker.style.left = hueLeft + "px";

        if( this.useAlpha )
        {
            const alphaLeft = LX.remapRange( this.currentColor.hsv.a, 0, 1, 0, this.alphaTracker.offsetWidth - this.markerSize );
            this.alphaMarker.style.left = alphaLeft + "px";
        }
    }

    _svToPosition( s, v ) {
        this.intSatMarker.style.left = `${ LX.remapRange( s, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize ) }px`;
        this.intSatMarker.style.top = `${ LX.remapRange( 1 - v, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize ) }px`;
    }

    _positionToSv( left, top ) {
        this.currentColor.hsv.s = LX.remapRange( left, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize, 0, 1 );
        this.currentColor.hsv.v = 1 - LX.remapRange( top, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize, 0, 1 );
    }

    _updateColorValue( newHexValue, skipCallback = false ) {

        this.currentColor.set( newHexValue ?? this.currentColor.hsv );

        if( this.callback && !skipCallback )
        {
            this.callback( this.currentColor );
        }

        this.intSatMarker.style.backgroundColor = this.currentColor.hex;

        if( this.useAlpha )
        {
            this.alphaTracker.style.color = `rgb(${ this.currentColor.css.r }, ${ this.currentColor.css.g }, ${ this.currentColor.css.b })`;
        }

        const toFixed = ( s, n = 2) => { return s.toFixed( n ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' ) };

        if( this.colorModel == "CSS" )
        {
            const { r, g, b, a } = this.currentColor.css;
            this.labelComponent.set( `rgb${ this.useAlpha ? 'a' : '' }(${ r },${ g },${ b }${ this.useAlpha ? ',' + toFixed( a ) : '' })` );
        }
        else if( this.colorModel == "Hex" )
        {
            this.labelComponent.set( ( this.useAlpha ? this.currentColor.hex : this.currentColor.hex.substr( 0, 7 ) ).toUpperCase() );
        }
        else if( this.colorModel == "HSV" )
        {
            const { h, s, v, a } = this.currentColor.hsv;
            const components = [ Math.floor( h ) + 'º', Math.floor( s * 100 ) + '%', Math.floor( v * 100 ) + '%' ];
            if( this.useAlpha ) components.push( toFixed( a ) );
            this.labelComponent.set( components.join( ' ' ) );
        }
        else // RGB
        {
            const { r, g, b, a } = this.currentColor.rgb;
            const components = [ toFixed( r ), toFixed( g ), toFixed( b ) ];
            if( this.useAlpha ) components.push( toFixed( a ) );
            this.labelComponent.set( components.join( ' ' ) );
        }
    }

    fromHexColor( hexColor ) {

        this.currentColor.setHex( hexColor );

        // Decompose into HSV
        const { h, s, v } = this.currentColor.hsv;
        this._svToPosition( s, v );

        const hueColor = new Color( { h, s: 1, v: 1 } );
        this.hueMarker.style.backgroundColor = this.colorPickerBackground.style.backgroundColor = `rgb(${ hueColor.css.r }, ${ hueColor.css.g }, ${ hueColor.css.b })`;
        this.hueMarker.style.left = LX.remapRange( h, 0, 360, -this.markerHalfSize, this.colorPickerTracker.offsetWidth - this.markerHalfSize ) + "px";

        this._updateColorValue( hexColor );
    }
};

LX.ColorPicker = ColorPicker;

class Calendar {

    /**
     * @constructor Calendar
     * @param {String} dateString D/M/Y
     * @param {Object} options
     * onChange: Function to call on date changes
     */

    constructor( dateString, options = {} ) {

        this.root = LX.makeContainer( ["256px", "auto"], "p-1 text-md" );

        this.onChange = options.onChange;
        this.onPreviousMonth = options.onPreviousMonth;
        this.onNextMonth = options.onNextMonth;

        this.untilToday = options.untilToday;
        this.fromToday = options.fromToday;
        this.range = options.range;

        this.skipPrevMonth = options.skipPrevMonth;
        this.skipNextMonth = options.skipNextMonth;

        if( dateString )
        {
            this.fromDateString( dateString );
        }
        else
        {
            const date = new Date();
            this.month = date.getMonth() + 1;
            this.year = date.getFullYear();
            this.fromMonthYear( this.month, this.year );
        }
    }

    _getCurrentDate() {
        return {
            day: this.day,
            month: this.month,
            year: this.year,
            fullDate: this.getFullDate()
        }
    }

    _previousMonth( skipCallback ) {

        this.month = Math.max( 0, this.month - 1 );

        if( this.month == 0 )
        {
            this.month = 12;
            this.year--;
        }

        this.fromMonthYear( this.month, this.year );

        if( !skipCallback && this.onPreviousMonth )
        {
            this.onPreviousMonth( this.currentDate );
        }
    }

    _nextMonth( skipCallback ) {

        this.month = Math.min( this.month + 1, 12 );

        if( this.month == 12 )
        {
            this.month = 0;
            this.year++;
        }

        this.fromMonthYear( this.month, this.year );

        if( !skipCallback && this.onNextMonth )
        {
            this.onNextMonth( this.currentDate );
        }
    }

    refresh() {

        this.root.innerHTML = "";

        // Header
        {
            const header = LX.makeContainer( ["100%", "auto"], "flex flex-row p-1", "", this.root );

            if( !this.skipPrevMonth )
            {
                const prevMonthIcon = LX.makeIcon( "Left", { title: "Previous Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" } );
                header.appendChild( prevMonthIcon );
                prevMonthIcon.addEventListener( "click", () => {
                    this._previousMonth();
                } );
            }

            const monthYearLabel = LX.makeContainer( ["100%", "auto"], "text-center font-medium select-none", `${ this.monthName } ${ this.year }`, header );

            if( !this.skipNextMonth )
            {
                const nextMonthIcon = LX.makeIcon( "Right", { title: "Next Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" } );
                header.appendChild( nextMonthIcon );
                nextMonthIcon.addEventListener( "click", () => {
                    this._nextMonth();
                } );
            }
        }

        // Body
        {
            const daysTable = document.createElement( "table" );
            daysTable.className = "w-full";
            this.root.appendChild( daysTable );

            // Table Head
            {
                const head = document.createElement( 'thead' );
                daysTable.appendChild( head );

                const hrow = document.createElement( 'tr' );

                for( const headData of [ "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su" ] )
                {
                    const th = document.createElement( 'th' );
                    th.className = "fg-tertiary text-sm font-normal select-none";
                    th.innerHTML = `<span>${ headData }</span>`;
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Table Body
            {
                const body = document.createElement( 'tbody' );
                daysTable.appendChild( body );

                let fromRangeDate = this.range ? LX.dateFromDateString( this.range[ 0 ] ) : null;
                let toRangeDate = this.range ? LX.dateFromDateString( this.range[ 1 ] ) : null;

                for( let week = 0; week < 6; week++ )
                {
                    const hrow = document.createElement( 'tr' );
                    const weekDays = this.calendarDays.slice( week * 7, week * 7 + 7 );

                    for( const dayData of weekDays )
                    {
                        const th = document.createElement( 'th' );
                        th.className = "leading-loose font-normal rounded select-none cursor-pointer";

                        const dayDate = new Date( `${ this.month }/${ dayData.day }/${ this.year }` );
                        const date = new Date();
                        // today inclusives
                        const beforeToday = this.untilToday ? ( dayDate.getTime() < date.getTime() ) : true;
                        const afterToday = this.fromToday ? ( dayDate.getFullYear() > date.getFullYear() ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() > date.getMonth()) ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() === date.getMonth() && dayDate.getDate() >= date.getDate())
                        ) : true;
                        const selectable = dayData.currentMonth && beforeToday && afterToday;
                        const currentDay = this.currentDate && ( dayData.day == this.currentDate.day ) && ( this.month == this.currentDate.month )
                            && ( this.year == this.currentDate.year ) && dayData.currentMonth;
                        const currentFromRange = selectable && fromRangeDate && ( dayData.day == fromRangeDate.getDate() ) && ( this.month == ( fromRangeDate.getMonth() + 1 ) )
                            && ( this.year == fromRangeDate.getFullYear() );
                        const currentToRange = selectable && toRangeDate && ( dayData.day == toRangeDate.getDate() ) && ( this.month == ( toRangeDate.getMonth() + 1 ) )
                            && ( this.year == toRangeDate.getFullYear() );

                        if( ( !this.range && currentDay ) || this.range && ( currentFromRange || currentToRange ) )
                        {
                            th.className += ` bg-contrast fg-contrast`;
                        }
                        else if( this.range && selectable && ( dayDate > fromRangeDate ) && ( dayDate < toRangeDate ) )
                        {
                            th.className += ` bg-accent fg-contrast`;
                        }
                        else
                        {
                            th.className += ` ${ selectable ? "fg-primary" : "fg-tertiary" } hover:bg-secondary`;
                        }

                        th.innerHTML = `<span>${ dayData.day }</span>`;
                        hrow.appendChild( th );

                        if( selectable )
                        {
                            th.addEventListener( "click", () => {
                                this.day = dayData.day;
                                this.currentDate = this._getCurrentDate();
                                if( this.onChange )
                                {
                                    this.onChange( this.currentDate );
                                }
                            } );
                        }
                        // This event should only be applied in non current month days
                        else if( this.range === undefined && !dayData.currentMonth )
                        {
                            th.addEventListener( "click", () => {
                                if( dayData?.prevMonth )
                                {
                                    this._previousMonth();
                                }
                                else
                                {
                                    this._nextMonth();
                                }
                            } );
                        }
                    }

                    body.appendChild( hrow );
                }
            }
        }
    }

    fromDateString( dateString ) {

        const tokens = dateString.split( '/' );

        this.day = parseInt( tokens[ 0 ] );
        this.month = parseInt( tokens[ 1 ] );
        this.monthName = this.getMonthName( this.month - 1 );
        this.year = parseInt( tokens[ 2 ] );

        this.currentDate = this._getCurrentDate();

        this.fromMonthYear( this.month, this.year );
    }

    fromMonthYear( month, year ) {

        // Month is 0-based (0 = January, ... 11 = December)
        month--;

        year = year ?? new Date().getFullYear();

        const weekDay = new Date( year, month, 1 ).getDay();
        const firstDay = weekDay === 0 ? 6 : weekDay - 1; // 0 = Monday, 1 = Tuesday...
        const daysInMonth = new Date( year, month + 1, 0 ).getDate();

        // Previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date( prevYear, prevMonth + 1, 0 ).getDate();

        // Prepare full grid (up to 6 weeks = 42 days)
        const calendarDays = [];

        // Fill in days from previous month
        for( let i = firstDay - 1; i >= 0; i--)
        {
            calendarDays.push( { day: daysInPrevMonth - i, currentMonth: false, prevMonth: true } );
        }

        // Fill in current month days
        for ( let i = 1; i <= daysInMonth; i++ )
        {
            calendarDays.push( { day: i, currentMonth: true } );
        }

        // Fill in next month days to complete the grid (if needed)
        const remaining = 42 - calendarDays.length;
        for( let i = 1; i <= remaining; i++ )
        {
            calendarDays.push( { day: i, currentMonth: false, nextMonth: true } );
        }

        this.monthName = this.getMonthName( month );
        this.firstDay = firstDay;
        this.daysInMonth = daysInMonth;
        this.calendarDays = calendarDays;

        this.refresh();
    }

    getMonthName( monthIndex, locale = "en-US" ) {
        const formatter = new Intl.DateTimeFormat( locale, { month: "long" } );
        return formatter.format( new Date( 2000, monthIndex, 1 ) );
    }

    getFullDate( monthName, day, year ) {
        return `${ monthName ?? this.monthName } ${ day ?? this.day }${ this._getOrdinalSuffix( day ?? this.day ) }, ${ year ?? this.year }`;
    }

    setRange( range ) {
        console.assert( range.constructor === Array, "Date Range must be in Array format" );
        this.range = range;
        this.refresh();
    }

    setMonth( month ) {

        this.month = month;

        this.fromMonthYear( this.month, this.year );
    }

    _getOrdinalSuffix( day ) {
        if ( day > 3 && day < 21 ) return "th";
        switch ( day % 10 )
        {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }
}

LX.Calendar = Calendar;

class CalendarRange {

    /**
     * @constructor CalendarRange
     * @param {Array} range ["DD/MM/YYYY", "DD/MM/YYYY"]
     * @param {Object} options
     */

    constructor( range, options = {} ) {

        this.root = LX.makeContainer( ["auto", "auto"], "flex flex-row" );

        console.assert( range && range.constructor === Array, "Range cannot be empty and has to be an Array!" );

        let mustSetMonth = null;
        let dateReversed = false;

        // Fix any issues with date range picking
        {
            const t0 = LX.dateFromDateString( range[ 0 ] );
            const t1 = LX.dateFromDateString( range[ 1 ] );

            if( t0 > t1 )
            {
                const tmp = range[ 0 ];
                range[ 0 ] = range[ 1 ];
                range[ 1 ] = tmp;
                dateReversed = true;
            }

            mustSetMonth = (dateReversed ? t1.getMonth() : t0.getMonth() ) + 2; // +1 to convert range, +1 to use next month
        }

        this.from = range[ 0 ];
        this.to = range[ 1 ];

        this._selectingRange = false;

        const onChange = ( date ) => {

            const newDateString = `${ date.day }/${ date.month }/${ date.year }`;

            if( !this._selectingRange )
            {
                this.from = this.to = newDateString;
                this._selectingRange = true;
            }
            else
            {
                this.to = newDateString;
                this._selectingRange = false;
            }

            const newRange = [ this.from, this.to ];

            this.fromCalendar.setRange( newRange );
            this.toCalendar.setRange( newRange );

            if( options.onChange )
            {
                options.onChange( newRange );
            }

        };

        this.fromCalendar = new LX.Calendar( this.from, {
            skipNextMonth: true,
            onChange,
            onPreviousMonth: () => {
                this.toCalendar._previousMonth();
            },
            range
        });

        this.toCalendar = new LX.Calendar( this.to, {
            skipPrevMonth: true,
            onChange,
            onNextMonth: () => {
                this.fromCalendar._nextMonth();
            },
            range
        });

        console.assert( mustSetMonth && "New Month must be valid" );
        this.toCalendar.setMonth( mustSetMonth );

        this.root.appendChild( this.fromCalendar.root );
        this.root.appendChild( this.toCalendar.root );
    }

    getFullDate() {

        const d0 = LX.dateFromDateString( this.from );
        const d0Month = this.fromCalendar.getMonthName( d0.getMonth() );

        const d1 = LX.dateFromDateString( this.to );
        const d1Month = this.toCalendar.getMonthName( d1.getMonth() );

        return `${ this.fromCalendar.getFullDate( d0Month, d0.getDate(), d0.getFullYear() ) } to ${ this.toCalendar.getFullDate( d1Month, d1.getDate(), d1.getFullYear() ) }`;
    }
}

LX.CalendarRange = CalendarRange;

/**
 * @class Tabs
 */

class Tabs {

    static TAB_ID   = 0;

    constructor( area, options = {} ) {

        this.onclose = options.onclose;

        let container = document.createElement('div');
        container.className = "lexareatabs " + ( options.fit ? "fit" : "row" );

        const folding = options.folding ?? false;
        if( folding ) container.classList.add("folding");

        let that = this;

        container.addEventListener("dragenter", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            this.classList.add("dockingtab");
        });

        container.addEventListener("dragleave", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            if ( this.contains( e.relatedTarget ) ) return; // Still inside
            this.classList.remove("dockingtab");
        });

        container.addEventListener("drop", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)

            const tabId = e.dataTransfer.getData( "source" );
            const tabDom = document.getElementById( tabId );
            if( !tabDom ) return;

            const sourceContainer = tabDom.parentElement;
            const target = e.target;
            const rect = target.getBoundingClientRect();

            if( e.offsetX < ( rect.width * 0.5 ) )
            {
                this.insertBefore( tabDom, target );
            }
            else if( target.nextElementSibling )
            {
                this.insertBefore( tabDom, target.nextElementSibling );
            }
            else
            {
                this.appendChild( tabDom );
            }

            {
                // Update childIndex for fit mode tabs in source container
                sourceContainer.childNodes.forEach( (c, idx) => c.childIndex = ( idx - 1 ) );

                // If needed, set last tab of source container active
                const sourceAsFit = (/true/).test( e.dataTransfer.getData( "fit" ) );
                if( sourceContainer.childElementCount == ( sourceAsFit ? 2 : 1 ) )
                {
                    sourceContainer.lastChild.click(); // single tab or thumb first (fit mode)
                }
                else
                {
                    const sourceSelected = sourceContainer.querySelector( ".selected" );
                    ( sourceSelected ?? sourceContainer.childNodes[ sourceAsFit ? 1 : 0 ] ).click();
                }
            }

            // Update childIndex for fit mode tabs in target container
            this.childNodes.forEach( (c, idx) => c.childIndex = ( idx - 1 ) );

            const content = document.getElementById( tabId + "_content" );
            that.area.attach( content );
            this.classList.remove("dockingtab");

            // Change tabs instance and select on drop
            tabDom.instance = that;
            tabDom.click();

            // Store info
            that.tabs[ tabDom.dataset["name"] ] = content;
        });

        area.root.classList.add( "lexareatabscontainer" );

        const [ tabButtons, content ] = area.split({ type: 'vertical', sizes: options.sizes ?? "auto", resize: false, top: 2 });
        tabButtons.attach( container );

        if( options.parentClass )
        {
            container.parentElement.className += ` ${ options.parentClass }`;
        }

        this.area = content;
        this.area.root.className += " lexareatabscontent";

        if( options.contentClass )
        {
            this.area.root.className += ` ${ options.contentClass }`;
        }

        this.selected = null;
        this.root = container;
        this.tabs = {};
        this.tabDOMs = {};

        if( options.fit )
        {
            // Create movable element
            let mEl = document.createElement('span');
            mEl.className = "lexareatab thumb";
            this.thumb = mEl;
            this.root.appendChild( mEl );

            const resizeObserver = new ResizeObserver((entries) => {
                const tabEl = this.thumb.item;
                if( !tabEl ) return;
                var transition = this.thumb.style.transition;
                this.thumb.style.transition = "none";
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                LX.flushCss( this.thumb );
                this.thumb.style.transition = transition;
            });

            resizeObserver.observe( this.area.root );
        }

        // debug
        if( folding )
        {
            this.folded = true;
            this.folding = folding;

            if( folding == "up" )
            {
                area.root.insertChildAtIndex( area.sections[ 1 ].root, 0 );
            }

            // Listen resize event on parent area
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries)
                {
                    const bb = entry.contentRect;
                    const sibling = area.parentArea.sections[ 0 ].root;
                    const addOffset = true; // hardcoded...
                    sibling.style.height = "calc(100% - " + ((addOffset ? 42 : 0) + bb.height) + "px )";
                }
            });

            resizeObserver.observe( this.area.root );
            this.area.root.classList.add('folded');
        }
    }

    add( name, content, options = {} ) {

        let isSelected = options.selected ?? false;

        if( isSelected )
        {
            this.root.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ) );
            const pseudoParent = this.area.root.querySelector( ":scope > .pseudoparent-tabs" );
            const contentRoot = pseudoParent ?? this.area.root;
            contentRoot.querySelectorAll( ':scope > .lextabcontent' ).forEach( c => c.style.display = 'none' );
        }

        isSelected = !Object.keys( this.tabs ).length && !this.folding ? true : isSelected;

        let contentEl = content.root ? content.root : content;
        contentEl.originalDisplay = contentEl.style.display;
        contentEl.style.display = isSelected ? contentEl.originalDisplay : "none";
        contentEl.classList.add( 'lextabcontent' );

        // Process icon
        if( options.icon )
        {
            if( !options.icon.includes( '.' ) ) // Not a file
            {
                const classes = options.icon.split( ' ' );
                options.icon = LX.makeIcon( classes[ 0 ], { svgClass: "sm " + classes.slice( 0 ).join( ' ' ) } ).innerHTML;
            }
            else // an image..
            {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                options.icon = "<img src='" + ( rootPath + options.icon ) + "'>";
            }
        }

        // Create tab
        let tabEl = document.createElement( 'span' );
        tabEl.dataset[ "name" ] = name;
        tabEl.className = "lexareatab flex flex-row gap-1" + ( isSelected ? " selected" : "" );
        tabEl.innerHTML = ( options.icon ?? "" ) + name;
        tabEl.id = name.replace( /\s/g, '' ) + Tabs.TAB_ID++;
        tabEl.title = options.title ?? "";
        tabEl.selected = isSelected ?? false;
        tabEl.fixed = options.fixed;
        tabEl.instance = this;
        contentEl.id = tabEl.id + "_content";

        if( options.badge )
        {
            const asChild = options.badge.asChild ?? false;
            const badgeOptions = { };

            if( asChild )
            {
                badgeOptions.parent = tabEl;
            }

            tabEl.innerHTML += LX.badge( options.badge.content ?? "", options.badge.className, badgeOptions );
        }

        if( tabEl.selected )
        {
            this.selected = name;
        }

        tabEl.addEventListener("click", e => {

            e.preventDefault();
            e.stopPropagation();

            const scope = tabEl.instance;

            if( !tabEl.fixed )
            {
                // For folding tabs
                const lastValue = tabEl.selected;
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.selected = false );
                tabEl.selected = !lastValue;
                // Manage selected
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ));
                tabEl.classList.toggle('selected', ( scope.folding && tabEl.selected ));
                // Manage visibility
                const pseudoParent = scope.area.root.querySelector( ":scope > .pseudoparent-tabs" );
                const contentRoot = pseudoParent ?? scope.area.root;
                contentRoot.querySelectorAll( ':scope > .lextabcontent' ).forEach( c => c.style.display = 'none' );
                contentEl.style.display = contentEl.originalDisplay;
                scope.selected = tabEl.dataset.name;
            }

            if( scope.folding )
            {
                scope.folded = tabEl.selected;
                scope.area.root.classList.toggle( 'folded', !scope.folded );
            }

            if( options.onSelect )
            {
                options.onSelect(e, tabEl.dataset.name);
            }

            if( scope.thumb )
            {
                scope.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                scope.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                scope.thumb.item = tabEl;
            }
        });

        tabEl.addEventListener("contextmenu", e => {
            e.preventDefault();
            e.stopPropagation();

            if( options.onContextMenu )
            {
                options.onContextMenu( e, tabEl.dataset.name );
            }
        });

        if( options.allowDelete ?? false )
        {
            tabEl.addEventListener("mousedown", e => {
                if( e.button == LX.MOUSE_MIDDLE_CLICK )
                {
                    e.preventDefault();
                }
            });

            tabEl.addEventListener("mouseup", e => {
                e.preventDefault();
                e.stopPropagation();
                if( e.button == LX.MOUSE_MIDDLE_CLICK )
                {
                    this.delete( tabEl.dataset[ "name" ] );
                }
            });
        }

        tabEl.setAttribute( 'draggable', true );
        tabEl.addEventListener( 'dragstart', e => {
            const sourceAsFit = !!this.thumb;
            if( tabEl.parentElement.childNodes.length == ( sourceAsFit ? 2 : 1 ) ){
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData( 'source', e.target.id );
            e.dataTransfer.setData( 'fit', sourceAsFit );
        });

        // Attach content
        tabEl.childIndex = ( this.root.childElementCount - 1 );
        this.root.appendChild( tabEl );
        this.area.attach( contentEl );
        this.tabDOMs[ name ] = tabEl;
        this.tabs[ name ] = content;

        setTimeout( () => {

            if( options.onCreate )
            {
                options.onCreate.call(this, this.area.root.getBoundingClientRect());
            }

            if( isSelected && this.thumb )
            {
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                this.thumb.item = tabEl;
            }

        }, 10 );
    }

    select( name ) {

        if(!this.tabDOMs[ name ] )
        return;

        this.tabDOMs[ name ].click();
    }

    delete( name ) {

        if( this.selected == name )
        {
            this.selected = null;
        }

        const tabEl = this.tabDOMs[ name ];

        if( !tabEl || tabEl.fixed )
        {
            return;
        }

        if( this.onclose )
        {
            this.onclose( name );
        }

        // Delete tab element
        this.tabDOMs[ name ].remove();
        delete this.tabDOMs[ name ];

        // Delete content
        this.tabs[ name ].remove();
        delete this.tabs[ name ];

        // Select last tab
        const lastTab = this.root.lastChild;
        if( lastTab && !lastTab.fixed )
        {
            this.root.lastChild.click();
        }
    }
}

LX.Tabs = Tabs;

/**
 * @class Footer
 */

class Footer {
    /**
     * @param {Object} options:
     * columns: Array with data per column { title, items: [ { title, link } ]  }
     * credits: html string
     * socials: Array with data per item { title, link, icon }
     * className: Extra class to customize
    */
    constructor( options = {} ) {

        const root = document.createElement( "footer" );
        root.className = "lexfooter" + ` ${ options.className ?? "" }`;

        const wrapper = document.createElement( "div" );
        wrapper.style.minHeight = "48px";
        wrapper.className = "w-full";
        root.appendChild( wrapper );

        // const hr = document.createElement( "hr" );
        // wrapper.appendChild( hr );

        if( options.columns && options.columns.constructor == Array )
        {
            const cols = document.createElement( "div" );
            cols.className = "columns";
            cols.style.gridTemplateColumns = "1fr ".repeat( options.columns.length );
            wrapper.appendChild( cols );

            for( let col of options.columns )
            {
                const colDom = document.createElement( "div" );
                colDom.className = "col";
                cols.appendChild( colDom );

                const colTitle = document.createElement( "h2" );
                colTitle.innerHTML = col.title;
                colDom.appendChild( colTitle );

                if( !col.items || !col.items.length )
                {
                    continue;
                }

                const itemListDom = document.createElement( "ul" );
                colDom.appendChild( itemListDom );

                for( let item of col.items )
                {
                    const itemDom = document.createElement( "li" );
                    itemDom.innerHTML = `<a class="" href="${ item.link }">${ item.title }</a>`;
                    itemListDom.appendChild( itemDom );
                }
            }
        }

        if( options.credits || options.socials )
        {
            const creditsSocials = document.createElement( "div" );
            creditsSocials.className = "credits-and-socials";
            wrapper.appendChild( creditsSocials );

            if( options.credits )
            {
                const credits = document.createElement( "p" );
                credits.innerHTML = options.credits;
                creditsSocials.appendChild( credits );
            }

            if( options.socials )
            {
                const socials = document.createElement( "div" );
                socials.className = "socials flex flex-row gap-1 my-2 justify-end";

                for( let social of options.socials )
                {
                    const socialIcon = LX.makeIcon( social.icon, { title: social.title, svgClass: "xl" } );
                    socialIcon.href = social.link;
                    socialIcon.target = "_blank";
                    socials.appendChild( socialIcon );
                }

                creditsSocials.appendChild( socials );
            }
        }

        // Append directly to body
        const parent = options.parent ?? document.body;
        parent.appendChild( root );

        // Set always at bottom
        root.previousElementSibling.style.flexGrow = "1";

        this.root = root;
    }
}

LX.Footer = Footer;

/**
 * @class Dialog
 */

class Dialog {

    static _last_id = 0;

    constructor( title, callback, options = {} ) {

        if( !callback )
        {
            console.warn("Content is empty, add some components using 'callback' parameter!");
        }

        this._oncreate = callback;
        this.id = LX.guidGenerator();

        const size = options.size ?? [],
            position = options.position ?? [],
            draggable = options.draggable ?? true,
            dockable = options.dockable ?? false,
            modal = options.modal ?? false;

        let root = document.createElement('dialog');
        root.className = "lexdialog " + (options.className ?? "");
        root.id = options.id ?? "dialog" + Dialog._last_id++;
        root.dataset["modal"] = modal;
        LX.root.appendChild( root );

        LX.doAsync( () => {
            modal ? root.showModal() : root.show();
        }, 10 );

        let that = this;

        const titleDiv = document.createElement('div');

        if( title )
        {
            titleDiv.className = "lexdialogtitle";
            titleDiv.innerHTML = title;
            titleDiv.setAttribute( "draggable", false );
            root.appendChild( titleDiv );
        }

        if( options.closable ?? true )
        {
            this.close = () => {

                if( options.onBeforeClose )
                {
                    options.onBeforeClose( this );
                }

                if( !options.onclose )
                {
                    root.close();

                    LX.doAsync( () => {
                        that.panel.clear();
                        root.remove();
                    }, 150 );
                }
                else
                {
                    options.onclose( this.root );
                }
            };

            const closeButton = LX.makeIcon( "X", { title: "Close", iconClass: "lexdialogcloser" } );
            closeButton.addEventListener( "click", this.close );

            const dockButton = LX.makeIcon( "Minus", { title: "Dock", iconClass: "ml-auto mr-2" } );
            dockButton.addEventListener( "click", () => {

                const data = this.branchData;
                const panel = data.panel;
                const panelChildCount = panel.root.childElementCount;

                const branch = panel.branch( data.name, { closed: data.closed } );
                branch.components = data.components;

                for( let w of branch.components )
                {
                    branch.content.appendChild( w.root );
                }

                if( data.childIndex < panelChildCount )
                {
                    panel.root.insertChildAtIndex( branch.root, data.childIndex );
                }

                this.close();
            } );

            if( title )
            {
                if( dockable ) titleDiv.appendChild( dockButton );
                titleDiv.appendChild( closeButton );
            }
            else
            {
                closeButton.classList.add( "notitle" );
                root.appendChild( closeButton );
            }
        }

        const panel = new LX.Panel();
        panel.root.classList.add( "lexdialogcontent" );

        if( !title )
        {
            panel.root.classList.add( "notitle" );
        }

        if( callback )
        {
            callback.call( this, panel );
        }

        root.appendChild( panel.root );

        // Make branches have a distintive to manage some cases
        panel.root.querySelectorAll(".lexbranch").forEach( b => b.classList.add("dialog") );

        this.panel = panel;
        this.root = root;
        this.title = titleDiv;

        if( draggable )
        {
            LX.makeDraggable( root, Object.assign( { targetClass: 'lexdialogtitle' }, options ) );
        }

        // Process position and size
        if( size.length && typeof(size[ 0 ]) != "string" )
        {
            size[ 0 ] += "px";
        }

        if( size.length && typeof(size[ 1 ]) != "string" )
        {
            size[ 1 ] += "px";
        }

        root.style.width = size[ 0 ] ? (size[ 0 ]) : "25%";
        root.style.height = size[ 1 ] ? (size[ 1 ]) : "auto";
        root.style.translate = options.position ? "unset" : "-50% -50%";

        if( options.size )
        {
            this.size = size;
        }

        root.style.left = position[ 0 ] ?? "50%";
        root.style.top = position[ 1 ] ?? "50%";

        panel.root.style.height = title ? "calc( 100% - " + ( titleDiv.offsetHeight + 30 ) + "px )" : "calc( 100% - 51px )";
    }

    destroy() {

        this.root.remove();
    }

    refresh() {

        this.panel.root.innerHTML = "";
        this._oncreate.call(this, this.panel);
    }

    setPosition( x, y ) {

        this.root.style.left = x + "px";
        this.root.style.top = y + "px";
    }

    setTitle( title ) {

        const titleDOM = this.root.querySelector( '.lexdialogtitle' );
        if( !titleDOM )
            return;
        titleDOM.innerText = title;
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

        const dragMargin = 3;

        super( title, callback, options );

        let that = this;
        // Update margins on branch title closes/opens
        LX.addSignal("@on_branch_closed", this.panel, closed => {
            if( this.dock_pos == PocketDialog.BOTTOM )
            {
                this.root.style.top = "calc(100% - " + (this.root.offsetHeight + dragMargin) + "px)";
            }
        });

        // Custom
        this.root.classList.add( "pocket" );

        this.root.style.translate = "none";
        this.root.style.top = "0";
        this.root.style.left = "unset";

        if( !options.position )
        {
            this.root.style.right = dragMargin + "px";
            this.root.style.top = dragMargin + "px";
        }

        this.panel.root.style.width = "100%";
        this.panel.root.style.height = "100%";
        this.dock_pos = PocketDialog.TOP;

        this.minimized = false;
        this.title.tabIndex = -1;
        this.title.addEventListener("click", e => {
            if( this.title.eventCatched )
            {
                this.title.eventCatched = false;
                return;
            }

            // Sized dialogs have to keep their size
            if( this.size )
            {
                if( !this.minimized ) this.root.style.height = "auto";
                else this.root.style.height = this.size[ 1 ];
            }

            this.root.classList.toggle("minimized");
            this.minimized = !this.minimized;

            if( this.dock_pos == PocketDialog.BOTTOM )
                that.root.style.top = this.root.classList.contains("minimized") ?
                "calc(100% - " + (that.title.offsetHeight + 6) + "px)" : "calc(100% - " + (that.root.offsetHeight + dragMargin) + "px)";
        });

        if( !options.draggable )
        {
            const float = options.float;

            if( float )
            {
                for( let i = 0; i < float.length; i++ )
                {
                    const t = float[ i ];
                    switch( t )
                    {
                    case 'b':
                        this.root.style.top = "calc(100% - " + (this.root.offsetHeight + dragMargin) + "px)";
                        break;
                    case 'l':
                        this.root.style.right = "unset";
                        this.root.style.left = options.position ? options.position[ 1 ] : ( dragMargin + "px" );
                        break;
                    }
                }
            }

            this.root.classList.add('dockable');

            this.title.addEventListener("keydown", function( e ) {
                if( !e.ctrlKey )
                {
                    return;
                }

                that.root.style.right = "unset";

                if( e.key == 'ArrowLeft' )
                {
                    that.root.style.left = '0px';
                }
                else if( e.key == 'ArrowRight' )
                {
                    that.root.style.left = "calc(100% - " + (that.root.offsetWidth + dragMargin) + "px)";
                }
                else if( e.key == 'ArrowUp' )
                {
                    that.root.style.top = "0px";
                    that.dock_pos = PocketDialog.TOP;
                }
                else if( e.key == 'ArrowDown' )
                {
                    that.root.style.top = "calc(100% - " + (that.root.offsetHeight + dragMargin) + "px)";
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
        document.body.querySelectorAll( ".lexcontextmenu" ).forEach( e => e.remove() );

        this.root = document.createElement( "div" );
        this.root.className = "lexcontextmenu";
        this.root.addEventListener("mouseleave", function() {
            this.remove();
        });

        this.items = [];
        this.colors = {};

        if( title )
        {
            const item = {};
            item[ title ] = [];
            item[ "className" ] = "cmtitle";
            item[ "icon" ] = options.icon;
            this.items.push( item );
        }

        const nestedDialog = event.target.closest( "dialog" );
        if( nestedDialog && nestedDialog.dataset[ "modal" ] == 'true' )
        {
            this._parent = nestedDialog;
        }
        else
        {
            this._parent = LX.root;
        }

        this._parent.appendChild( this.root );

        // Set position based on parent
        const position = [ event.x - 48, event.y - 8 ];
        if( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[ 0 ] -= parentRect.x;
            position[ 1 ] -= parentRect.y;
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
    }

    _adjustPosition( div, margin, useAbsolute = false ) {

        let rect = div.getBoundingClientRect();
        let left = parseInt( div.style.left );
        let top = parseInt( div.style.top );

        if( !useAbsolute )
        {
            let width = rect.width;
            if( rect.left < 0 )
            {
                left = margin;
            }
            else if( window.innerWidth - rect.right < 0 )
            {
                left = (window.innerWidth - width - margin);
            }

            if( rect.top < 0 )
            {
                top = margin;
            }
            else if( (rect.top + rect.height) > window.innerHeight )
            {
                top = (window.innerHeight - rect.height - margin);
            }
        }
        else
        {
            let dt = window.innerWidth - rect.right;
            if( dt < 0 )
            {
                left = div.offsetLeft + (dt - margin);
            }

            dt = window.innerHeight - (rect.top + rect.height);
            if( dt < 0 )
            {
                top = div.offsetTop + (dt - margin + 20 );
            }
        }

        div.style.left = `${ left }px`;
        div.style.top = `${ top }px`;
    }

    _createSubmenu( o, k, c, d ) {

        this.root.querySelectorAll( ".lexcontextmenu" ).forEach( cm => cm.remove() );

        let contextmenu = document.createElement('div');
        contextmenu.className = "lexcontextmenu";
        c.appendChild( contextmenu );

        for( let i = 0; i < o[ k ].length; ++i )
        {
            const subitem = o[ k ][ i ];
            const subkey = Object.keys( subitem )[ 0 ];
            this._createEntry( subitem, subkey, contextmenu, d );
        }

        const rect = c.getBoundingClientRect();
        contextmenu.style.left = ( rect.x + rect.width ) + "px";
        contextmenu.style.marginTop = "-31px"; // Force to be at the first element level

        // Set final width
        this._adjustPosition( contextmenu, 6 );
    }

    _createEntry( o, k, c, d ) {

        const hasSubmenu = o[ k ].length;
        let entry = document.createElement('div');
        entry.className = "lexmenuboxentry" + (o[ 'className' ] ? " " + o[ 'className' ] : "" );
        entry.id = o.id ?? ("eId" + LX.getSupportedDOMName( k ));
        entry.innerHTML = "";
        const icon = o[ 'icon' ];
        if( icon )
        {
            entry.appendChild( LX.makeIcon( icon, { svgClass: "sm" } ) );
        }
        const disabled = o['disabled'];
        entry.innerHTML += "<div class='lexentryname" + (disabled ? " disabled" : "") + "'>" + k + "</div>";
        c.appendChild( entry );

        if( this.colors[ k ] )
        {
            entry.style.borderColor = this.colors[ k ];
        }

        if( k == "" )
        {
            entry.className += " cmseparator";
            return;
        }

        // Add callback
        entry.addEventListener("click", e => {
            e.stopPropagation();
            e.stopImmediatePropagation();

            if( disabled )
            {
                return;
            }

            const f = o[ 'callback' ];
            if( f )
            {
                f.call( this, k, entry );
                this.root.remove();
            }

            if( !hasSubmenu )
            {
                return;
            }

            if( LX.OPEN_CONTEXTMENU_ENTRY == 'click' )
                this._createSubmenu( o, k, entry, ++d );
        });

        if( !hasSubmenu )
        {
            return;
        }

        const submenuIcon = LX.makeIcon( "Menu", { svgClass: "sm" } )
        entry.appendChild( submenuIcon );

        if( LX.OPEN_CONTEXTMENU_ENTRY == 'mouseover' )
        {
            entry.addEventListener("mouseover", e => {
                if(entry.built)
                    return;
                entry.built = true;
                this._createSubmenu( o, k, entry, ++d );
                e.stopPropagation();
            });
        }

        entry.addEventListener("mouseleave", () => {
            d = -1; // Reset depth
            c.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());
        });
    }

    onCreate() {
        LX.doAsync( () => this._adjustPosition( this.root, 6 ) );
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

            if( found )
            {
                insert( tokens[ idx++ ], found );
            }
            else
            {
                let item = {};
                item[ token ] = [];
                const nextToken = tokens[ idx++ ];
                // Check if last token -> add callback
                if( !nextToken )
                {
                    item[ 'id' ] = options.id;
                    item[ 'icon' ] = options.icon;
                    item[ 'callback' ] = options.callback;
                    item[ 'disabled' ] = options.disabled ?? false;
                }

                list.push( item );
                insert( nextToken, item[ token ] );
            }
        };

        insert( tokens[idx++], this.items );

        // Set parents

        const setParent = _item => {

            let key = Object.keys( _item )[ 0 ];
            let children = _item[ key ];

            if( !children.length )
            {
                return;
            }

            if( children.find( c => Object.keys(c)[ 0 ] == key ) == null )
            {
                const parent = {};
                parent[ key ] = [];
                parent[ 'className' ] = "cmtitle";
                _item[ key ].unshift( parent );
            }

            for( let child of _item[ key ] )
            {
                let k = Object.keys( child )[ 0 ];
                for( let i = 0; i < child[ k ].length; ++i )
                {
                    setParent( child );
                }
            }
        };

        for( let item of this.items )
        {
            setParent( item );
        }

        // Create elements

        for( let item of this.items )
        {
            let key = Object.keys( item )[ 0 ];
            let pKey = "eId" + LX.getSupportedDOMName( key );

            // Item already created
            const id = "#" + ( item.id ?? pKey );
            if( !this.root.querySelector( id ) )
            {
                this._createEntry( item, key, this.root, -1 );
            }
        }
    }

    setColor( token, color ) {

        if(color[ 0 ] !== '#')
            color = LX.rgbToHex(color);

        this.colors[ token ] = color;
    }
};

LX.ContextMenu = ContextMenu;

function addContextMenu( title, event, callback, options )
{
    const menu = new ContextMenu( event, title, options );

    if( callback )
    {
        callback( menu );
    }

    menu.onCreate();

    return menu;
}

LX.addContextMenu = addContextMenu;

/**
 * @class CanvasCurve
 */

class CanvasCurve {

    constructor( value, options = {} ) {

        let element = document.createElement( "div" );
        element.className = "curve " + ( options.className ? options.className : "" );
        element.style.minHeight = "50px";
        element.style.width = options.width || "100%";
        element.style.minWidth = "50px";
        element.style.minHeight = "20px";

        element.bgcolor = options.bgColor || LX.getThemeColor( "global-intense-background" );
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-color-accent" );
        element.activepointscolor = options.activePointsColor || LX.getThemeColor( "global-color-accent-light" );
        element.linecolor = options.lineColor || "#555";
        element.value = value || [];
        element.xrange = options.xrange || [ 0, 1 ]; // min, max
        element.yrange = options.yrange || [ 0, 1 ]; // min, max
        element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
        element.no_overlap = options.noOverlap || false;
        element.show_samples = options.showSamples || 0;
        element.allow_add_values = options.allowAddValues ?? true;
        element.draggable_x = options.draggableX ?? true;
        element.draggable_y = options.draggableY ?? true;
        element.smooth = (options.smooth && typeof( options.smooth ) == 'number' ? options.smooth : 0.3) || false;
        element.move_out = options.moveOutAction ?? LX.CURVE_MOVEOUT_DELETE;

        LX.addSignal( "@on_new_color_scheme", (el, value) => {
            element.bgcolor = options.bgColor || LX.getThemeColor( "global-intense-background" );
            element.pointscolor = options.pointsColor || LX.getThemeColor( "global-color-accent" );
            element.activepointscolor = options.activePointsColor || LX.getThemeColor( "global-color-accent-light" );
            this.redraw();
        } );

        this.element = element;

        let canvas = document.createElement( "canvas" );
        canvas.width = options.width || 200;
        canvas.height = options.height || 50;
        element.appendChild( canvas );
        this.canvas = canvas;

        element.addEventListener( "mousedown", onmousedown );

        element.getValueAt = function( x ) {

            if( x < element.xrange[ 0 ] || x > element.xrange[ 1 ] )
            {
                return element.defaulty;
            }

            let last = [ element.xrange[ 0 ], element.defaulty ];
            let f = 0;
            for( let i = 0; i < element.value.length; i += 1 )
            {
                let v = element.value[ i ];
                if( x == v[ 0 ] ) return v[ 1 ];
                if( x < v[ 0 ] )
                {
                    f = ( x - last[ 0 ] ) / (v[ 0 ] - last[ 0 ]);
                    return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
                }

                last = v;
            }

            v = [ element.xrange[ 1 ], element.defaulty ];
            f = (x - last[ 0 ]) / (v[ 0 ] - last[ 0 ]);
            return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
        }

        element.resample = function( samples ) {

            let r = [];
            let dx = (element.xrange[ 1 ] - element.xrange[ 0 ]) / samples;
            for( let i = element.xrange[ 0 ]; i <= element.xrange[ 1 ]; i += dx )
            {
                r.push( element.getValueAt(i) );
            }
            return r;
        }

        element.addValue = function(v) {

            for( let i = 0; i < element.value; i++ )
            {
                let value = element.value[ i ];
                if(value[ 0 ] < v[ 0 ]) continue;
                element.value.splice(i,0,v);
                redraw();
                return;
            }

            element.value.push(v);
            redraw();
        }

        //value to canvas
        function convert(v) {
            return [ canvas.width * ( v[ 0 ] - element.xrange[ 0 ])/ (element.xrange[ 1 ]),
                canvas.height * (v[ 1 ] - element.yrange[ 0 ])/ (element.yrange[ 1 ])];
        }

        //canvas to value
        function unconvert(v) {
            return [(v[ 0 ] * element.xrange[ 1 ] / canvas.width + element.xrange[ 0 ]),
                    (v[ 1 ] * element.yrange[ 1 ] / canvas.height + element.yrange[ 0 ])];
        }

        let selected = -1;

        element.redraw = function( o = {} ) {

            if( o.value ) element.value = o.value;
            if( o.xrange ) element.xrange = o.xrange;
            if( o.yrange ) element.yrange = o.yrange;
            if( o.smooth ) element.smooth = o.smooth;

            var ctx = canvas.getContext( "2d" );
            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
            ctx.translate( 0, canvas.height );
            ctx.scale( 1, -1 );

            ctx.fillStyle = element.bgcolor;
            ctx.fillRect(0,0,canvas.width,canvas.height);

            ctx.strokeStyle = element.linecolor;
            ctx.beginPath();

            //draw line
            var pos = convert([ element.xrange[ 0 ],element.defaulty ]);
            ctx.moveTo( pos[ 0 ], pos[ 1 ] );
            let values = [pos[ 0 ], pos[ 1 ]];

            for( var i in element.value )
            {
                var value = element.value[ i ];
                pos = convert( value );
                values.push( pos[ 0 ] );
                values.push( pos[ 1 ] );
                if( !element.smooth )
                {
                    ctx.lineTo( pos[ 0 ], pos[ 1 ] );
                }
            }

            pos = convert([ element.xrange[ 1 ], element.defaulty ]);
            values.push(pos[ 0 ]);
            values.push(pos[ 1 ]);
            if( !element.smooth )
            {
                ctx.lineTo( pos[ 0 ], pos[ 1 ] );
                ctx.stroke();
            }
            else
            {
                LX.drawSpline( ctx, values, element.smooth );
            }

            // Draw points
            for( var i = 0; i < element.value.length; i += 1 )
            {
                var value = element.value[ i ];
                pos = convert( value );
                if( selected == i )
                    ctx.fillStyle = element.activepointscolor;
                else
                    ctx.fillStyle = element.pointscolor;
                ctx.beginPath();
                ctx.arc( pos[ 0 ], pos[ 1 ], selected == i ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if( element.show_samples )
            {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for( var i = 0; i < samples.length; i += 1)
                {
                    var value = [ i * ((element.xrange[ 1 ] - element.xrange[ 0 ]) / element.show_samples) + element.xrange[ 0 ], samples[ i ] ];
                    pos = convert(value);
                    ctx.beginPath();
                    ctx.arc( pos[ 0 ], pos[ 1 ], 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        var last_mouse = [ 0, 0 ];

        function onmousedown( e ) {
            document.addEventListener( "mousemove", onmousemove );
            document.addEventListener( "mouseup", onmouseup );

            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            selected = computeSelected( mousex, canvas.height - mousey );

            if( e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values )
            {
                var v = unconvert([ mousex, canvas.height - mousey ]);
                element.value.push( v );
                sortValues();
                selected = element.value.indexOf( v );
            }

            last_mouse = [ mousex, mousey ];
            element.redraw();
            e.preventDefault();
            e.stopPropagation();
        }

        function onmousemove( e ) {

            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            if( mousex < 0 ) mousex = 0;
            else if( mousex > canvas.width ) mousex = canvas.width;
            if( mousey < 0 ) mousey = 0;
            else if( mousey > canvas.height ) mousey = canvas.height;

            // Dragging to remove
            const currentMouseDiff = [ e.clientX - rect.left, e.clientY - rect.top ];
            if( selected != -1 && distance( currentMouseDiff, [ mousex, mousey ] ) > canvas.height * 0.5 )
            {
                if( element.move_out == LX.CURVE_MOVEOUT_DELETE)
                {
                    element.value.splice( selected, 1 );
                }
                else
                {
                    const d = [ currentMouseDiff[ 0 ] - mousex, currentMouseDiff[ 1 ] - mousey ];
                    let value = element.value[ selected ];
                    value[ 0 ] = ( d[ 0 ] == 0.0 ) ? value[ 0 ] : ( d[ 0 ] < 0.0 ? element.xrange[ 0 ] : element.xrange[ 1 ] );
                    value[ 1 ] = ( d[ 1 ] == 0.0 ) ? value[ 1 ] : ( d[ 1 ] < 0.0 ? element.yrange[ 1 ] : element.yrange[ 0 ] );
                }

                onmouseup( e );
                return;
            }

            var dx = element.draggable_x ? last_mouse[ 0 ] - mousex : 0;
            var dy = element.draggable_y ? last_mouse[ 1 ] - mousey : 0;
            var delta = unconvert([ -dx, dy ]);

            if( selected != -1 )
            {
                var minx = element.xrange[ 0 ];
                var maxx = element.xrange[ 1 ];

                if( element.no_overlap )
                {
                    if( selected > 0) minx = element.value[ selected - 1 ][ 0 ];
                    if( selected < ( element.value.length - 1 ) ) maxx = element.value[ selected + 1 ][ 0 ];
                }

                var v = element.value[selected];
                v[ 0 ] += delta[ 0 ];
                v[ 1 ] += delta[ 1 ];
                if(v[ 0 ] < minx) v[ 0 ] = minx;
                else if(v[ 0 ] > maxx) v[ 0 ] = maxx;
                if(v[ 1 ] < element.yrange[ 0 ]) v[ 1 ] = element.yrange[ 0 ];
                else if(v[ 1 ] > element.yrange[ 1 ]) v[ 1 ] = element.yrange[ 1 ];
            }

            sortValues();
            element.redraw();
            last_mouse[ 0 ] = mousex;
            last_mouse[ 1 ] = mousey;
            onchange( e );

            e.preventDefault();
            e.stopPropagation();
        }

        function onmouseup( e ) {
            selected = -1;
            element.redraw();
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }

        function onchange( e ) {
            if( options.callback )
                options.callback.call( element, element.value, e );
        }

        function distance(a,b) { return Math.sqrt( Math.pow(b[ 0 ]-a[ 0 ],2) + Math.pow(b[ 1 ]-a[ 1 ],2) ); };

        function computeSelected( x, y ) {

            var minDistance = 100000;
            var maxDistance = 8; //pixels
            var selected = -1;
            for( var i = 0; i < element.value.length; i++ )
            {
                var value = element.value[ i ];
                var pos = convert( value );
                var dist = distance( [ x,y ], pos );
                if( dist < minDistance && dist < maxDistance )
                {
                    minDistance = dist;
                    selected = i;
                }
            }
            return selected;
        }

        function sortValues() {
            var v = null;
            if( selected != -1 )
            {
                v = element.value[ selected ];
            }
            element.value.sort(function( a,b ) { return a[ 0 ] - b[ 0 ]; });
            if( v )
            {
                selected = element.value.indexOf( v );
            }
        }

        element.redraw();
        return this;
    }

    redraw( options = {} ) {
        this.element.redraw( options );
    }
}

LX.CanvasCurve = CanvasCurve;

/**
 * @class CanvasDial
 */

class CanvasDial {

    constructor( panel, value, options = {} ) {

        let element = document.createElement( "div" );
        element.className = "dial " + ( options.className ? options.className : "" );
        element.style.width = element.style.height = options.size || "100%";
        element.style.minWidth = element.style.minHeight = "50px";

        element.bgcolor = options.bgColor || LX.getThemeColor( "global-dark-background" );
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-color-accent-light" );
        element.linecolor = options.lineColor || "#555";
        element.value = value || [];
        element.xrange = options.xrange || [ 0, 1 ]; // min, max
        element.yrange = options.yrange || [ 0, 1 ]; // min, max
        element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
        element.no_overlap = options.noOverlap || false;
        element.show_samples = options.showSamples || 0;
        element.allow_add_values = options.allowAddValues ?? true;
        element.draggable_x = options.draggableX ?? true;
        element.draggable_y = options.draggableY ?? true;
        element.smooth = (options.smooth && typeof( options.smooth ) == 'number' ? options.smooth : 0.3) || false;
        element.move_out = options.moveOutAction ?? LX.CURVE_MOVEOUT_DELETE;

        this.element = element;

        let canvas = document.createElement( "canvas" );
        canvas.width = canvas.height = options.size || 200;
        element.appendChild( canvas );
        this.canvas = canvas;

        element.addEventListener( "mousedown", onmousedown );

        element.getValueAt = function( x ) {

            if( x < element.xrange[ 0 ] || x > element.xrange[ 1 ] )
            {
                return element.defaulty;
            }

            var last = [ element.xrange[ 0 ], element.defaulty ];
            var f = 0;
            for( var i = 0; i < element.value.length; i += 1 )
            {
                var v = element.value[ i ];
                if( x == v[ 0 ] ) return v[ 1 ];
                if( x < v[ 0 ] )
                {
                    f = ( x - last[ 0 ] ) / (v[ 0 ] - last[ 0 ]);
                    return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
                }

                last = v;
            }

            v = [ element.xrange[ 1 ], element.defaulty ];
            f = (x - last[ 0 ]) / (v[ 0 ] - last[ 0 ]);
            return last[ 1 ] * ( 1 - f ) + v[ 1 ] * f;
        }

        element.resample = function( samples ) {

            var r = [];
            var dx = (element.xrange[ 1 ] - element.xrange[ 0 ]) / samples;
            for( var i = element.xrange[ 0 ]; i <= element.xrange[ 1 ]; i += dx)
            {
                r.push( element.getValueAt(i) );
            }
            return r;
        }

        element.addValue = function(v) {

            for( var i = 0; i < element.value; i++ )
            {
                var value = element.value[ i ];
                if(value[ 0 ] < v[ 0 ]) continue;
                element.value.splice( i, 0, v );
                redraw();
                return;
            }

            element.value.push( v );
            redraw();
        }

        //value to canvas
        function convert(v, r) {

            Math.pow(v[ 0 ],2)
            return [ canvas.width * ( v[ 0 ] - element.xrange[ 0 ])/ (element.xrange[ 1 ]),
                canvas.height * (v[ 1 ] - element.yrange[ 0 ])/ (element.yrange[ 1 ])];
        }

        //canvas to value
        function unconvert(v) {
            return [(v[ 0 ] * element.xrange[ 1 ] / canvas.width + element.xrange[ 0 ]),
                    (v[ 1 ] * element.yrange[ 1 ] / canvas.height + element.yrange[ 0 ])];
        }

        var selected = -1;

        element.redraw = function( o = {} ) {

            if( o.value ) element.value = o.value;
            if( o.xrange ) element.xrange = o.xrange;
            if( o.yrange ) element.yrange = o.yrange;
            if( o.smooth ) element.smooth = o.smooth;

            var ctx = canvas.getContext( "2d" );
            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
            ctx.translate( 0, canvas.height );
            ctx.scale( 1, -1 );

            ctx.fillStyle = element.bgcolor;
            ctx.fillRect(0,0,canvas.width,canvas.height);

            ctx.strokeStyle = element.linecolor;
            ctx.beginPath();

            //draw line
            var pos = convert([ element.xrange[ 0 ],element.defaulty ]);
            ctx.moveTo( pos[ 0 ], pos[ 1 ] );
            let values = [pos[ 0 ], pos[ 1 ]];

            for( var i in element.value)
            {
                var value = element.value[ i ];
                pos = convert( value );
                values.push( pos[ 0 ] );
                values.push( pos[ 1 ] );
            }

            pos = convert([ element.xrange[ 1 ], element.defaulty ]);
            values.push( pos[ 0 ] );
            values.push( pos[ 1 ] );

            // Draw points
            const center =  [0,0];
            pos = convert(center)
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc( pos[ 0 ], pos[ 1 ], 3, 0, Math.PI * 2);
            ctx.fill();

            for( var i = 0; i < element.value.length; i += 1 )
            {
                var value = element.value[ i ];
                pos = convert( value );
                if( selected == i )
                    ctx.fillStyle = "white";
                else
                    ctx.fillStyle = element.pointscolor;
                ctx.beginPath();
                ctx.arc( pos[ 0 ], pos[ 1 ], selected == i ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if( element.show_samples )
            {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for( var i = 0; i < samples.length; i += 1)
                {
                    var value = [ i * ((element.xrange[ 1 ] - element.xrange[ 0 ]) / element.show_samples) + element.xrange[ 0 ], samples[ i ] ];
                    pos = convert(value);
                    ctx.beginPath();
                    ctx.arc( pos[ 0 ], pos[ 1 ], 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        var last_mouse = [ 0, 0 ];

        function onmousedown( e ) {
            document.addEventListener( "mousemove", onmousemove );
            document.addEventListener( "mouseup", onmouseup );

            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            selected = computeSelected( mousex, canvas.height - mousey );

            if( e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values )
            {
                var v = unconvert([ mousex, canvas.height - mousey ]);
                element.value.push( v );
                sortValues();
                selected = element.value.indexOf( v );
            }

            last_mouse = [ mousex, mousey ];
            element.redraw();
            e.preventDefault();
            e.stopPropagation();
        }

        function onmousemove( e ) {

            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;

            if( mousex < 0 ) mousex = 0;
            else if( mousex > canvas.width ) mousex = canvas.width;
            if( mousey < 0 ) mousey = 0;
            else if( mousey > canvas.height ) mousey = canvas.height;

            // Dragging to remove
            const currentMouseDiff = [ e.clientX - rect.left, e.clientY - rect.top ];
            if( selected != -1 && distance( currentMouseDiff, [ mousex, mousey ] ) > canvas.height * 0.5 )
            {
                if( element.move_out == LX.CURVE_MOVEOUT_DELETE)
                {
                    element.value.splice( selected, 1 );
                }
                else
                {
                    const d = [ currentMouseDiff[ 0 ] - mousex, currentMouseDiff[ 1 ] - mousey ];
                    let value = element.value[ selected ];
                    value[ 0 ] = ( d[ 0 ] == 0.0 ) ? value[ 0 ] : ( d[ 0 ] < 0.0 ? element.xrange[ 0 ] : element.xrange[ 1 ] );
                    value[ 1 ] = ( d[ 1 ] == 0.0 ) ? value[ 1 ] : ( d[ 1 ] < 0.0 ? element.yrange[ 1 ] : element.yrange[ 0 ] );
                }

                onmouseup( e );
                return;
            }

            var dx = element.draggable_x ? last_mouse[ 0 ] - mousex : 0;
            var dy = element.draggable_y ? last_mouse[ 1 ] - mousey : 0;
            var delta = unconvert([ -dx, dy ]);

            if( selected != -1 )
            {
                var minx = element.xrange[ 0 ];
                var maxx = element.xrange[ 1 ];

                if( element.no_overlap )
                {
                    if( selected > 0) minx = element.value[ selected - 1 ][ 0 ];
                    if( selected < ( element.value.length - 1 ) ) maxx = element.value[ selected + 1 ][ 0 ];
                }

                var v = element.value[selected];
                v[ 0 ] += delta[ 0 ];
                v[ 1 ] += delta[ 1 ];
                if(v[ 0 ] < minx) v[ 0 ] = minx;
                else if(v[ 0 ] > maxx) v[ 0 ] = maxx;
                if(v[ 1 ] < element.yrange[ 0 ]) v[ 1 ] = element.yrange[ 0 ];
                else if(v[ 1 ] > element.yrange[ 1 ]) v[ 1 ] = element.yrange[ 1 ];
            }

            sortValues();
            element.redraw();
            last_mouse[ 0 ] = mousex;
            last_mouse[ 1 ] = mousey;
            onchange( e );

            e.preventDefault();
            e.stopPropagation();
        }

        function onmouseup( e ) {
            selected = -1;
            element.redraw();
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }

        function onchange( e ) {
            if( options.callback )
                options.callback.call( element, element.value, e );
        }

        function distance(a,b) { return Math.sqrt( Math.pow(b[ 0 ]-a[ 0 ],2) + Math.pow(b[ 1 ]-a[ 1 ],2) ); };

        function computeSelected( x, y ) {

            var minDistance = 100000;
            var maxDistance = 8; //pixels
            var selected = -1;
            for( var i = 0; i < element.value.length; i++ )
            {
                var value = element.value[ i ];
                var pos = convert( value );
                var dist = distance( [ x,y ], pos );
                if( dist < minDistance && dist < maxDistance )
                {
                    minDistance = dist;
                    selected = i;
                }
            }
            return selected;
        }

        function sortValues() {
            var v = null;
            if( selected != -1 )
            {
                v = element.value[ selected ];
            }
            element.value.sort(function( a,b ) { return a[ 0 ] - b[ 0 ]; });
            if( v )
            {
                selected = element.value.indexOf( v );
            }
        }

        element.redraw();
        return this;
    }

    redraw( options = {} ) {
        this.element.redraw( options );
    }
}

LX.CanvasDial = CanvasDial;

// Based on LGraphMap2D from @tamats (jagenjo)
// https://github.com/jagenjo/litescene.js
class CanvasMap2D {

    static COLORS = [ [255, 0, 0], [0, 255, 0], [0, 0, 255], [0, 128, 128], [128, 0, 128], [128, 128, 0], [255, 128, 0], [255, 0, 128], [0, 128, 255], [128, 0, 255] ];
    static GRID_SIZE = 64;

    /**
     * @constructor Map2D
     * @param {Array} initialPoints
     * @param {Function} callback
     * @param {Object} options
     * circular
     * showNames
     * size
     */

    constructor( initialPoints, callback, options = {} ) {

        this.circular = options.circular ?? false;
        this.showNames = options.showNames ?? true;
        this.size = options.size ?? [ 200, 200 ];

        this.points = initialPoints ?? [];
        this.callback = callback;
        this.weights = [];
        this.weightsObj = {};
        this.currentPosition = new LX.vec2( 0.0, 0.0 );
        this.circleCenter = [ 0, 0 ];
        this.circleRadius = 1;
        this.margin = 8;
        this.dragging = false;

        this._valuesChanged = true;
        this._selectedPoint = null;

        this.root = LX.makeContainer( ["auto", "auto"] );
        this.root.tabIndex = "1";

        this.root.addEventListener( "mousedown", innerMouseDown );

        const that = this;

        function innerMouseDown( e )
        {
            var doc = that.root.ownerDocument;
            doc.addEventListener("mouseup", innerMouseUp);
            doc.addEventListener("mousemove", innerMouseMove);
            e.stopPropagation();
            e.preventDefault();

            that.dragging = true;
            return true;
        }

        function innerMouseMove( e )
        {
            if( !that.dragging )
            {
                return;
            }

            const margin = that.margin;
            const rect = that.root.getBoundingClientRect();

            let pos = new LX.vec2();
            pos.set( e.x - rect.x - that.size[ 0 ] * 0.5, e.y - rect.y - that.size[ 1 ] * 0.5 );
            var cpos = that.currentPosition;
            cpos.set(
                LX.clamp( pos.x / ( that.size[ 0 ] * 0.5 - margin ), -1, 1 ),
                LX.clamp( pos.y / ( that.size[ 1 ] * 0.5 - margin ), -1, 1 )
            );

            if( that.circular )
            {
                const center = new LX.vec2( 0, 0 );
                const dist = cpos.dst( center );
                if( dist > 1 )
                {
                    cpos = cpos.nrm();
                }
            }

            that.renderToCanvas( that.canvas.getContext( "2d", { willReadFrequently: true } ), that.canvas );

            that.computeWeights( cpos );

            if( that.callback )
            {
                that.callback( that.weightsObj, that.weights, cpos );
            }

            return true;
        }

        function innerMouseUp( e )
        {
            that.dragging = false;

            var doc = that.root.ownerDocument;
            doc.removeEventListener("mouseup", innerMouseUp);
            doc.removeEventListener("mousemove", innerMouseMove);
        }

        this.canvas = document.createElement( "canvas" );
        this.canvas.width = this.size[ 0 ];
        this.canvas.height = this.size[ 1 ];
        this.root.appendChild( this.canvas );

        const ctx = this.canvas.getContext( "2d", { willReadFrequently: true } );
        this.renderToCanvas( ctx, this.canvas );
    }

    /**
     * @method computeWeights
     * @param {LX.vec2} p
     * @description Iterate for every cell to see if our point is nearer to the cell than the nearest point of the cell,
     * If that is the case we increase the weight of the nearest point. At the end we normalize the weights of the points by the number of near points
     * and that give us the weight for every point
     */

    computeWeights( p ) {

        if( !this.points.length )
        {
            return;
        }

        let values = this._precomputedWeights;
        if( !values || this._valuesChanged )
        {
            values = this.precomputeWeights();
        }

        let weights = this.weights;
        weights.length = this.points.length;
        for(var i = 0; i < weights.length; ++i)
        {
            weights[ i ] = 0;
        }

        const gridSize = CanvasMap2D.GRID_SIZE;

        let totalInside = 0;
        let pos2 = new LX.vec2();

        for( var y = 0; y < gridSize; ++y )
        {
            for( var x = 0; x < gridSize; ++x )
            {
                pos2.set( ( x / gridSize) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                var dataPos = x * 2 + y * gridSize * 2;
                var pointIdx = values[ dataPos ];

                var isInside = p.dst( pos2 ) < ( values[ dataPos + 1] + 0.001 ); // epsilon
                if( isInside )
                {
                    weights[ pointIdx ] += 1;
                    totalInside++;
                }
            }
        }

        for( var i = 0; i < weights.length; ++i )
        {
            weights[ i ] /= totalInside;
            this.weightsObj[ this.points[ i ].name ] = weights[ i ];
        }

        return weights;
    }

    /**
     * @method precomputeWeights
     * @description Precompute for every cell, which is the closest point of the points set and how far it is from the center of the cell
     * We store point index and distance in this._precomputedWeights. This is done only when the points set change
     */

    precomputeWeights() {

        this._valuesChanged = false;

        const numPoints = this.points.length;
        const gridSize = CanvasMap2D.GRID_SIZE;
        const totalNums = 2 * gridSize * gridSize;

        let position = new LX.vec2();

        if( !this._precomputedWeights || this._precomputedWeights.length != totalNums )
        {
            this._precomputedWeights = new Float32Array( totalNums );
        }

        let values = this._precomputedWeights;
        this._precomputedWeightsGridSize = gridSize;

        for( let y = 0; y < gridSize; ++y )
        {
            for( let x = 0; x < gridSize; ++x )
            {
                let nearest = -1;
                let minDistance = 100000;

                for( let i = 0; i < numPoints; ++i )
                {
                    position.set( ( x / gridSize ) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                    let pointPosition = new LX.vec2();
                    pointPosition.fromArray( this.points[ i ].pos );
                    let dist = position.dst( pointPosition );
                    if( dist > minDistance )
                    {
                        continue;
                    }

                    nearest = i;
                    minDistance = dist;
                }

                values[ x * 2 + y * 2 * gridSize ] = nearest;
                values[ x * 2 + y * 2 * gridSize + 1 ] = minDistance;
            }
        }

        return values;
    }

    /**
     * @method precomputeWeightsToImage
     * @param {LX.vec2} p
     */

    precomputeWeightsToImage( p ) {

        if( !this.points.length )
        {
            return null;
        }

        const gridSize = CanvasMap2D.GRID_SIZE;
        var values = this._precomputedWeights;
        if( !values || this._valuesChanged || this._precomputedWeightsGridSize != gridSize )
        {
            values = this.precomputeWeights();
        }

        var canvas = this.imageCanvas;
        if( !canvas )
        {
            canvas = this.imageCanvas = document.createElement( "canvas" );
        }

        canvas.width = canvas.height = gridSize;
        var ctx = canvas.getContext( "2d", { willReadFrequently: true } );

        var weights = this.weights;
        weights.length = this.points.length;
        for (var i = 0; i < weights.length; ++i)
        {
            weights[ i ] = 0;
        }

        let totalInside = 0;
        let pixels = ctx.getImageData( 0, 0, gridSize, gridSize );
        let pos2 = new LX.vec2();

        for( var y = 0; y < gridSize; ++y )
        {
            for( var x = 0; x < gridSize; ++x )
            {
                pos2.set( ( x / gridSize ) * 2 - 1, ( y / gridSize ) * 2 - 1 );

                const pixelPos = x * 4 + y * gridSize * 4;
                const dataPos = x * 2 + y * gridSize * 2;
                const pointIdx = values[ dataPos ];
                const c = CanvasMap2D.COLORS[ pointIdx % CanvasMap2D.COLORS.length ];

                var isInside = p.dst( pos2 ) < ( values[ dataPos + 1 ] + 0.001 );
                if( isInside )
                {
                    weights[ pointIdx ] += 1;
                    totalInside++;
                }

                pixels.data[ pixelPos ] = c[ 0 ] + ( isInside ? 128 : 0 );
                pixels.data[ pixelPos + 1 ] = c[ 1 ] + ( isInside ? 128 : 0 );
                pixels.data[ pixelPos + 2 ] = c[ 2 ] + ( isInside ? 128 : 0 );
                pixels.data[ pixelPos + 3 ] = 255;
            }
        }

        for( let i = 0; i < weights.length; ++i )
        {
            weights[ i ] /= totalInside;
        }

        ctx.putImageData( pixels, 0, 0 );
        return canvas;
    }

    addPoint( name, pos ) {
        if( this.findPoint( name ) )
        {
            console.warn("CanvasMap2D.addPoint: There is already a point with that name" );
            return;
        }

        if( !pos )
        {
            pos = [ this.currentPosition[ 0 ], this.currentPosition[ 1 ] ];
        }

        pos[ 0 ] = LX.clamp( pos[ 0 ], -1, 1 );
        pos[ 1 ] = LX.clamp( pos[ 1 ], -1, 1 );

        const point = { name, pos };
        this.points.push( point );
        this._valuesChanged = true;
        return point;
    }

    removePoint( name ) {
        const removeIdx = this.points.findIndex( (p) => p.name == name );
        if( removeIdx > -1 )
        {
            this.points.splice( removeIdx, 1 );
            this._valuesChanged = true;
        }
    }

    findPoint( name ) {
        return this.points.find( p => p.name == name );
    }

    clear() {
        this.points.length = 0;
        this._precomputedWeights = null;
        this._canvas = null;
        this._selectedPoint = null;
    }

    renderToCanvas( ctx, canvas ) {

        const margin = this.margin;
        const w = this.size[ 0 ];
        const h = this.size[ 1 ];

        ctx.fillStyle = "black";
        ctx.strokeStyle = "#BBB";

        ctx.clearRect( 0, 0, w, h );

        if( this.circular )
        {
            this.circleCenter[ 0 ] = w * 0.5;
            this.circleCenter[ 1 ] = h * 0.5;
            this.circleRadius = h * 0.5 - margin;

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc( this.circleCenter[ 0 ], this.circleCenter[ 1 ], this.circleRadius, 0, Math.PI * 2 );
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo( this.circleCenter[ 0 ] + 0.5, this.circleCenter[ 1 ] - this.circleRadius );
            ctx.lineTo( this.circleCenter[ 0 ] + 0.5, this.circleCenter[ 1 ] + this.circleRadius );
            ctx.moveTo( this.circleCenter[ 0 ] - this.circleRadius, this.circleCenter[ 1 ]);
            ctx.lineTo( this.circleCenter[ 0 ] + this.circleRadius, this.circleCenter[ 1 ]);
            ctx.stroke();
        }
        else
        {
            ctx.fillRect( margin, margin, w - margin * 2, h - margin * 2 );
            ctx.strokeRect( margin, margin, w - margin * 2, h - margin * 2 );
        }

        var image = this.precomputeWeightsToImage( this.currentPosition );
        if( image )
        {
            ctx.globalAlpha = 0.5;
            ctx.imageSmoothingEnabled = false;
            if( this.circular )
            {
                ctx.save();
                ctx.beginPath();
                ctx.arc( this.circleCenter[ 0 ], this.circleCenter[ 1 ], this.circleRadius, 0, Math.PI * 2 );
                ctx.clip();
                ctx.drawImage( image, this.circleCenter[ 0 ] - this.circleRadius, this.circleCenter[ 1 ] - this.circleRadius, this.circleRadius * 2, this.circleRadius * 2 );
                ctx.restore();
            }
            else
            {
                ctx.drawImage( image, margin, margin, w - margin * 2, h - margin * 2 );
            }
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = 1;
        }

        for( let i = 0; i < this.points.length; ++i )
        {
            const point = this.points[ i ];
            let x = point.pos[ 0 ] * 0.5 + 0.5;
            let y = point.pos[ 1 ] * 0.5 + 0.5;
            x = x * ( w - margin * 2 ) + margin;
            y = y * ( h - margin * 2 ) + margin;
            x = LX.clamp( x, margin, w - margin );
            y = LX.clamp( y, margin, h - margin );
            ctx.fillStyle = ( point == this._selectedPoint ) ? "#CDF" : "#BCD";
            ctx.beginPath();
            ctx.arc( x, y, 3, 0, Math.PI * 2 );
            ctx.fill();
            if( this.showNames )
            {
                ctx.fillText( point.name, x + 5, y + 5 );
            }
        }

        ctx.fillStyle = "white";
        ctx.beginPath();
        var x = this.currentPosition.x * 0.5 + 0.5;
        var y = this.currentPosition.y * 0.5 + 0.5;
        x = x * ( w - margin * 2 ) + margin;
        y = y * ( h - margin * 2 ) + margin;
        x = LX.clamp( x, margin, w - margin );
        y = LX.clamp( y, margin, h - margin );
        ctx.arc( x, y, 4, 0, Math.PI * 2 );
        ctx.fill();
    }
}

LX.CanvasMap2D = CanvasMap2D;

class Skeleton {

    constructor( elements ) {

        this.root = LX.makeContainer( [ "auto", "auto" ], "flex flex-row lexskeleton" );

        if( elements.constructor === String )
        {
            this.root.innerHTML = elements;
        }
        else
        {
            // Force array
            elements = [].concat( elements );

            for( let e of elements )
            {
                this.root.appendChild( e );
            }
        }
    }

    destroy() {

        this.root.dataset[ "closed" ] = true;

        LX.doAsync( () => {
            this.root.remove();
            this.root = null;
        }, 200 );
    }
}

LX.Skeleton = Skeleton;

// Js native overrides

Object.defineProperty(String.prototype, 'lastChar', {
    get: function() { return this[ this.length - 1 ]; },
    enumerable: true,
    configurable: true
});

Element.prototype.insertChildAtIndex = function( child, index = Infinity ) {
    if ( index >= this.children.length ) this.appendChild( child );
    else this.insertBefore( child, this.children[index] );
}

Element.prototype.hasClass = function( list ) {
    list = [].concat( list );
    var r = list.filter( v => this.classList.contains( v ) );
    return !!r.length;
}

Element.prototype.addClass = function( className ) {
    if( className ) this.classList.add( className );
}

Element.prototype.getComputedSize = function() {
    // Since we use "box-sizing: border-box" now,
    // it's all included in offsetWidth/offsetHeight
    return {
        width: this.offsetWidth,
        height: this.offsetHeight
    }
}

Element.prototype.getParentArea = function() {
    let parent = this.parentElement;
    while( parent ) {
        if( parent.classList.contains( "lexarea" ) ) { return parent; }
        parent = parent.parentElement;
    }
}

Element.prototype.listen = function( eventName, callback, callbackName ) {
    callbackName = callbackName ?? ( "_on" + eventName );
    this[ callbackName ] = callback;
    this.addEventListener( eventName, callback );
}

Element.prototype.ignore = function( eventName, callbackName ) {
    callbackName = callbackName ?? ( "_on" + eventName );
    const callback = this[ callbackName ];
    this.removeEventListener( eventName, callback );
}

export { LX };