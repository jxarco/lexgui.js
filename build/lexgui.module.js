'use strict';

// Lexgui.js @jxarco

/**
 * Main namespace
 * @namespace LX
*/

var LX = {
    version: "0.1.44",
    ready: false,
    components: [], // specific pre-build components
    signals: {} // events and triggers
};

LX.MOUSE_LEFT_CLICK     = 0;
LX.MOUSE_MIDDLE_CLICK   = 1;
LX.MOUSE_RIGHT_CLICK    = 2;

LX.MOUSE_DOUBLE_CLICK = 2;
LX.MOUSE_TRIPLE_CLICK = 3;

LX.CURVE_MOVEOUT_CLAMP = 0;
LX.CURVE_MOVEOUT_DELETE = 1;

function clamp( num, min, max ) { return Math.min( Math.max( num, min ), max ); }
function round( number, precision ) { return precision == 0 ? Math.floor( number ) : +(( number ).toFixed( precision ?? 2 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' )); }
function remapRange( oldValue, oldMin, oldMax, newMin, newMax ) { return ((( oldValue - oldMin ) * ( newMax - newMin )) / ( oldMax - oldMin )) + newMin; }

LX.clamp = clamp;
LX.round = round;
LX.remapRange = remapRange;

function getSupportedDOMName( string )
{
    return string.replace(/\s/g, '').replaceAll('@', '_').replaceAll('+', '_plus_').replaceAll('.', '');
}

LX.getSupportedDOMName = getSupportedDOMName;

function has( component_name )
{
    return (LX.components.indexOf( component_name ) > -1);
}

LX.has = has;

function getExtension( s )
{
    return s.includes('.') ? s.split('.').pop() : null;
}

LX.getExtension = getExtension;

function deepCopy( o )
{
    return JSON.parse(JSON.stringify(o))
}

LX.deepCopy = deepCopy;

function setTheme( colorScheme )
{
    colorScheme = ( colorScheme == "light" ) ? "light" : "dark";
    document.documentElement.setAttribute( "data-theme", colorScheme );
    LX.emit( "@on_new_color_scheme", colorScheme );
}

LX.setTheme = setTheme;

function setThemeColor( colorName, color )
{
    var r = document.querySelector( ':root' );
    r.style.setProperty( '--' + colorName, color );
}

LX.setThemeColor = setThemeColor;

function getThemeColor( colorName )
{
    const r = getComputedStyle( document.querySelector( ':root' ) );
    const value = r.getPropertyValue( '--' + colorName );

    if( value.includes( "light-dark" ) && window.matchMedia )
    {
        const currentScheme = r.getPropertyValue( "color-scheme" );

        if( ( window.matchMedia( "(prefers-color-scheme: light)" ).matches ) || ( currentScheme == "light" ) )
        {
            return value.substring( value.indexOf( '(' ) + 1, value.indexOf( ',' ) ).replace( /\s/g, '' );
        }
        else
        {
            return value.substring( value.indexOf( ',' ) + 1, value.indexOf( ')' ) ).replace( /\s/g, '' );
        }
    }

    return value;
}

LX.getThemeColor = getThemeColor;

function getBase64Image( img ) {
    var canvas = document.createElement( 'canvas' );
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext( '2d' );
    ctx.drawImage( img, 0, 0 );
    return canvas.toDataURL( 'image/png' );
}

LX.getBase64Image = getBase64Image;

function hexToRgb( hexStr ) {
    const red = parseInt( hexStr.substring( 1, 3 ), 16 ) / 255;
    const green = parseInt( hexStr.substring( 3, 5 ), 16 ) / 255;
    const blue = parseInt( hexStr.substring( 5, 7 ), 16 ) / 255;
    return [ red, green, blue ];
}

LX.hexToRgb = hexToRgb;

function rgbToHex( rgb ) {
    let hex = "#";
    for( let c of rgb ) {
        c = Math.floor( c * 255 );
        hex += c.toString( 16 );
    }
    return hex;
}

LX.rgbToHex = rgbToHex;

function measureRealWidth( value, paddingPlusMargin = 8 ) {
    var i = document.createElement( "span" );
    i.className = "lexinputmeasure";
    i.innerHTML = value;
    document.body.appendChild( i );
    var rect = i.getBoundingClientRect();
    LX.UTILS.deleteElement( i );
    return rect.width + paddingPlusMargin;
}

LX.measureRealWidth = measureRealWidth;

function simple_guidGenerator() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+"-"+S4()+"-"+S4());
}

LX.guidGenerator = simple_guidGenerator;

function buildTextPattern( options = {} ) {
    let patterns = [];
    if ( options.lowercase ) patterns.push("(?=.*[a-z])");
    if ( options.uppercase ) patterns.push("(?=.*[A-Z])");
    if ( options.digit ) patterns.push("(?=.*\\d)");
    if ( options.specialChar ) patterns.push("(?=.*[@#$%^&+=!])");
    if ( options.noSpaces ) patterns.push("(?!.*\\s)");

    let minLength = options.minLength || 0;
    let maxLength = options.maxLength || ""; // Empty means no max length restriction

    let pattern = `^${ patterns.join("") }.{${ minLength },${ maxLength }}$`;
    return options.asRegExp ? new RegExp( pattern ) : pattern;
}

LX.buildTextPattern = buildTextPattern;

// Timer that works everywhere (from litegraph.js)
if (typeof performance != "undefined") {
    LX.getTime = performance.now.bind(performance);
} else if (typeof Date != "undefined" && Date.now) {
    LX.getTime = Date.now.bind(Date);
} else if (typeof process != "undefined") {
    LX.getTime = function() {
        var t = process.hrtime();
        return t[0] * 0.001 + t[1] * 1e-6;
    };
} else {
    LX.getTime = function getTime() {
        return new Date().getTime();
    };
}

let ASYNC_ENABLED = true;

function doAsync( fn, ms ) {
    if( ASYNC_ENABLED )
    {
        setTimeout( fn, ms ?? 0 );
    }
    else
    {
        fn();
    }
}

// Math classes

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
    clp ( min, max, v0 = new vec2() ) { v0.set( clamp( this.x, min, max ), clamp( this.y, min, max ) ); return v0; }
};

LX.vec2 = vec2;

// Other utils

/**
 * @method makeDraggable
 * @param {Element} domEl
 * @param {Object} options
 * autoAdjust (Bool): Sets in a correct position at the beggining
 * dragMargin (Number): Margin of drag container
 * onMove (Function): Called each move event
 * onDragStart (Function): Called when drag event starts
 */
function makeDraggable( domEl, options = { } ) {

    let offsetX = 0;
    let offsetY = 0;
    let currentTarget = null;
    let targetClass = options.targetClass;
    let dragMargin = options.dragMargin ?? 3;

    let _computePosition = ( e, top, left ) => {
        const nullRect = { x: 0, y: 0, width: 0, height: 0 };
        const parentRect = domEl.parentElement ? domEl.parentElement.getBoundingClientRect() : nullRect;
        const isFixed = ( domEl.style.position == "fixed" );
        const fixedOffset = isFixed ? new LX.vec2( parentRect.x, parentRect.y ) : new LX.vec2();
        left = left ?? e.clientX - offsetX - parentRect.x;
        top = top ?? e.clientY - offsetY - parentRect.y;
        domEl.style.left = clamp( left, dragMargin + fixedOffset.x, fixedOffset.x + parentRect.width - domEl.offsetWidth - dragMargin ) + 'px';
        domEl.style.top = clamp( top, dragMargin + fixedOffset.y, fixedOffset.y + parentRect.height - domEl.offsetHeight - dragMargin ) + 'px';
    };

    // Initial adjustment
    if( options.autoAdjust )
    {
       _computePosition( null, parseInt( domEl.style.left ), parseInt( domEl.style.top ) )
    }

    let id = LX.UTILS.uidGenerator();
    domEl[ 'draggable-id' ] = id;

    const defaultMoveFunc = e => {
        if( !currentTarget )
        {
            return;
        }

        _computePosition( e );
    };

    const customMoveFunc = e => {
        if( !currentTarget )
        {
            return;
        }

        if( options.onMove )
        {
            options.onMove( currentTarget );
        }
    };

    let onMove = options.onMove ? customMoveFunc : defaultMoveFunc;
    let onDragStart = options.onDragStart;

    domEl.setAttribute( 'draggable', true );
    domEl.addEventListener( "mousedown", function( e ) {
        currentTarget = ( e.target.classList.contains( targetClass ) || !targetClass ) ? e.target : null;
    } );

    domEl.addEventListener( "dragstart", function( e ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if( !currentTarget ) return;
        // Remove image when dragging
        var img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        e.dataTransfer.setDragImage( img, 0, 0 );
        e.dataTransfer.effectAllowed = "move";
        const rect = e.target.getBoundingClientRect();
        const parentRect = currentTarget.parentElement.getBoundingClientRect();
        const isFixed = ( currentTarget.style.position == "fixed" );
        const fixedOffset = isFixed ? new LX.vec2( parentRect.x, parentRect.y ) : new LX.vec2();
        offsetX = e.clientX - rect.x - fixedOffset.x;
        offsetY = e.clientY - rect.y - fixedOffset.y;
        document.addEventListener( "mousemove", onMove );
        if( onDragStart )
        {
            onDragStart( currentTarget, e );
        }
    }, false );

    document.addEventListener( 'mouseup', () => {
        if( currentTarget )
        {
            currentTarget = null;
            document.removeEventListener( "mousemove", onMove );
        }
    } );
}

LX.makeDraggable = makeDraggable;

function create_global_searchbar( root ) {

    let globalSearch = document.createElement("div");
    globalSearch.id = "global-search";
    globalSearch.className = "hidden";
    globalSearch.tabIndex = -1;
    root.appendChild( globalSearch );

    let allItems = [];
    let hoverElId = null;

    globalSearch.addEventListener('keydown', function( e ) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        hoverElId = hoverElId ?? -1;
        if( e.key == 'Escape' )
        {
            this.classList.add("hidden");
            _resetBar( true );
        }
        else if( e.key == 'Enter' )
        {
            const el = allItems[ hoverElId ];
            if( el )
            {
                const isCheckbox = (el.item.type && el.item.type === 'checkbox');
                this.classList.toggle('hidden');
                if( isCheckbox )
                {
                    el.item.checked = !el.item.checked;
                    el.callback.call( window, el.item.checked, el.entry_name );
                }
                else
                {
                    el.callback.call( window, el.entry_name );
                }
            }
        }
        else if ( e.key == 'ArrowDown' && hoverElId < (allItems.length - 1) )
        {
            hoverElId++;
            globalSearch.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
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
            globalSearch.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
            allItems[ hoverElId ].classList.add('hovered');
        }
    });

    globalSearch.addEventListener('focusout', function( e ) {
        if( e.relatedTarget == e.currentTarget )
        {
            return;
        }
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.classList.add( "hidden" );
        _resetBar( true );
    });

    root.addEventListener('keydown', e => {
        if( e.key == ' ' && e.ctrlKey )
        {
            e.stopImmediatePropagation();
            e.stopPropagation();
            globalSearch.classList.toggle('hidden');
            globalSearch.querySelector('input').focus();
            _addElements( undefined );
        }
        else
        {
            for( let c of LX.components )
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

    const header = document.createElement( "div" );
    header.className = "gs-header";

    const icon = document.createElement("a");
    icon.className = "fa-solid fa-magnifying-glass";
    header.appendChild( icon );

    const input = document.createElement("input");
    input.placeholder = "Search...";
    input.value = "";
    header.appendChild( input );

    const tabArea = new Area( {
        width: "100%",
        skipAppend: true,
        className: "gs-tabs"
    } );

    const gsTabs = tabArea.addTabs();
    let gsFilter = null;

    // These tabs will serve as buttons by now
    // Filter stuff depending of the type of search
    {
        const _onSelectTab = ( e, tabName ) => {
            gsFilter = tabName;
        }

        gsTabs.add( "All", document.createElement('div'), { selected: true, onSelect: _onSelectTab } );
        // gsTabs.add( "Main", document.createElement('div'), { onSelect: _onSelectTab } );
    }

    const itemContainer = document.createElement("div");
    itemContainer.className = "searchitembox";

    let refPrevious = null;

    const _resetBar = (reset_input) => {
        itemContainer.innerHTML = "";
        allItems.length = 0;
        hoverElId = null;
        if(reset_input) input.value = "";
    }

    const _addElement = ( t, c, p, i ) => {

        if( !t.length )
        {
            return;
        }

        if( refPrevious ) refPrevious.classList.remove('last');

        let searchItem = document.createElement("div");
        searchItem.className = "searchitem last";
        const isCheckbox = (i && i.type && i.type === 'checkbox');
        if( isCheckbox )
        {
            searchItem.innerHTML = "<a class='fa fa-check'></a><span>" + p + t + "</span>"
        }
        else
        {
            searchItem.innerHTML = p + t;
        }
        searchItem.entry_name = t;
        searchItem.callback = c;
        searchItem.item = i;
        searchItem.addEventListener('click', function(e) {
            this.callback.call(window, this.entry_name);
            globalSearch.classList.toggle('hidden');
            _resetBar( true );
        });
        searchItem.addEventListener('mouseenter', function(e) {
            globalSearch.querySelectorAll(".hovered").forEach(e => e.classList.remove('hovered'));
            this.classList.add('hovered');
            hoverElId = allItems.indexOf( this );
        });
        searchItem.addEventListener('mouseleave', function(e) {
            this.classList.remove('hovered');
        });
        allItems.push( searchItem );
        itemContainer.appendChild( searchItem );
        refPrevious = searchItem;
    }

    const _propagateAdd = ( item, filter, path ) => {

        const key = Object.keys( item )[ 0 ];
        let name = item.name ?? path + key;
        if( name.toLowerCase().includes( filter ) )
        {
            if( item.callback )
            {
                _addElement( item.name ?? key, item.callback, path, item );
            }
        }

        // is sidebar..
        if( item.name )
        return;

        path += key + " > ";

        for( let c of item[ key ] )
            _propagateAdd( c, filter, path );
    };

    const _addElements = filter => {

        _resetBar();

        for( let m of LX.menubars )
        {
            for( let i of m.items )
            {
                _propagateAdd( i, filter, "" );
            }
        }

        if( LX.has('CodeEditor') )
        {
            const instances = LX.CodeEditor.getInstances();
            if(!instances.length) return;

            const languages = instances[ 0 ].languages;

            for( let l of Object.keys( languages ) ) {

                const key = "Language: " + l;
                const icon = instances[ 0 ]._getFileIcon( null, languages[ l ].ext );

                let value = icon.includes( 'fa-' ) ? "<i class='" + icon + "'></i>" :
                        "<img src='" + ( "https://raw.githubusercontent.com/jxarco/lexgui.js/master/" + icon ) + "'>";

                value += key + " <span class='lang-ext'>(" + languages[ l ].ext + ")</span>";
                if( key.toLowerCase().includes( filter ) ) {
                    add_element( value, () => {
                        for( let i of instances ) {
                            i._changeLanguage( l );
                        }
                    }, "", {} );
                }
            }
        }
    }

    input.addEventListener('input', function(e) {
        _addElements( this.value.toLowerCase() );
    });

    globalSearch.appendChild( header );
    globalSearch.appendChild( tabArea.root );
    globalSearch.appendChild( itemContainer );

    return globalSearch;
}

/**
 * @method init
 * @param {Object} options
 * container: Root location for the gui (default is the document body)
 * id: Id of the main area
 * skipRoot: Skip adding LX root container
 * skipDefaultArea: Skip creation of main area
 */

function init( options = { } )
{
    if( this.ready )
    {
        return this.main_area;
    }

    // LexGUI root

    var root = document.createElement( 'div' );
    root.id = "lexroot";
    root.tabIndex = -1;

    var modal = document.createElement( 'div' );
    modal.id = "modal";

    this.modal = modal;
    this.root = root;
    this.container = document.body;

    // this.modal.toggleAttribute( 'hidden', true );
    // this.modal.toggle = function( force ) { this.toggleAttribute( 'hidden', force ); };

    this.modal.classList.add( 'hiddenOpacity' );
    this.modal.toggle = function( force ) { this.classList.toggle( 'hiddenOpacity', force ); };

    if( options.container )
        this.container = document.getElementById( options.container );

    this.globalSearch = create_global_searchbar( this.container );

    this.container.appendChild( modal );

    if( !options.skipRoot )
    {
        this.container.appendChild( root );
    }
    else
    {
        this.root = document.body;
    }

    // Disable drag icon
    root.addEventListener( 'dragover', function( e ) {
        e.preventDefault();
    }, false );

    document.addEventListener( 'contextmenu', function( e ) {
        e.preventDefault();
    }, false );

    // CSS fontawesome
    var head = document.getElementsByTagName( 'HEAD' )[ 0 ];
    var link = document.createElement( 'link' );
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.crossOrigin = 'anonymous';
    link.href = 'https://use.fontawesome.com/releases/v6.7.2/css/all.css';
    head.appendChild( link );

    // Global vars
    this.DEFAULT_NAME_WIDTH     = "30%";
    this.DEFAULT_SPLITBAR_SIZE  = 4;
    this.OPEN_CONTEXTMENU_ENTRY = 'click';

    this.ready = true;
    this.menubars = [ ];

    if( !options.skipRoot && !options.skipDefaultArea )
    {
        this.main_area = new Area( { id: options.id ?? 'mainarea' } );
    }

    window.matchMedia( "(prefers-color-scheme: dark)" ).addEventListener( "change", event => {
        const newColorScheme = event.matches ? "dark" : "light";
        LX.emit( "@on_new_color_scheme", newColorScheme );
    });

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

function message( text, title, options = {} )
{
    if( !text )
    {
        throw( "No message to show" );
    }

    options.modal = true;

    return new Dialog( title, p => {
        p.addTextArea( null, text, null, { disabled: true, fitHeight: true  } );
    }, options );
}

LX.message = message;

/**
 * @method popup
 * @param {String} text
 * @param {String} title (Optional)
 * @param {*} options
 * id: Id of the message dialog
 * time: (Number) Delay time before close automatically (ms). Defalut: [3000]
 * position: (Array) [x,y] Dialog position in screen. Default: [screen centered]
 * size: (Array) [width, height]
 */

function popup( text, title, options = {} )
{
    if( !text )
    {
        throw("No message to show");
    }

    options.size = options.size ?? [ "auto", "auto" ];
    options.class = "lexpopup";

    const time = options.timeout || 3000;
    const dialog = new Dialog( title, p => {
        p.addTextArea( null, text, null, { disabled: true, fitHeight: true } );
    }, options );

    dialog.root.classList.add( 'fadein' );
    setTimeout(() => {
        dialog.root.classList.remove( 'fadein' );
        dialog.root.classList.add( 'fadeout' );
    }, time - 1000 );

    setTimeout( dialog.close, time );

    return dialog;
}

LX.popup = popup;

/**
 * @method prompt
 * @param {String} text
 * @param {String} title (Optional)
 * @param {*} options
 * id: Id of the prompt dialog
 * position: Dialog position in screen [screen centered]
 * draggable: Dialog can be dragged [false]
 * input: If false, no text input appears
 * accept: Accept text
 * required: Input has to be filled [true]. Default: false
 */

function prompt( text, title, callback, options = {} )
{
    options.modal = true;

    let value = "";

    const dialog = new Dialog( title, p => {

        p.addTextArea( null, text, null, { disabled: true, fitHeight: true } );

        if( options.input ?? true )
        {
            p.addText( null, options.input || value, v => value = v, { placeholder: "..." } );
        }

        p.sameLine( 2 );

        p.addButton( null, options.accept || "OK", () => {
            if( options.required && value === '' )
            {
                text += text.includes("You must fill the input text.") ? "": "\nYou must fill the input text.";
                dialog.close();
                prompt( text, title, callback, options );
            }
            else
            {
                if( callback ) callback.call( this, value );
                dialog.close();
            }
        }, { buttonClass: "primary" });

        p.addButton(null, "Cancel", () => {if(options.on_cancel) options.on_cancel(); dialog.close();} );

    }, options );

    // Focus text prompt
    if( options.input ?? true )
    {
        dialog.root.querySelector( 'input' ).focus();
    }

    return dialog;
}

LX.prompt = prompt;

/**
 * @method badge
 * @param {String} text
 * @param {String} className
 * @param {*} options
 * style: Style attributes to override
 */

function badge( text, className, options = {} )
{
    const container = document.createElement( "div" );
    container.innerHTML = text;
    container.className = "lexbadge " + ( className ?? "" );
    Object.assign( container.style, options.style ?? {} );
    return container.outerHTML;
}

LX.badge = badge;

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
        if( obj.constructor === Widget )
        {
            obj.set( value, options.skipCallback ?? true );

            if( obj.options && obj.options.callback )
            {
                obj.options.callback( value, data );
            }
        }
        else
        {
            // This is a function callback!
            const fn = obj;
            fn( null, value );
        }
    }
}

LX.emit = emit;

function addSignal( name, obj, callback )
{
    obj[name] = callback;

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

class Area {

    /**
     * @constructor Area
     * @param {*} options
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

        var width = options.width || "calc( 100% )";
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

        if( !options.skipAppend )
        {
            var lexroot = document.getElementById("lexroot");
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
                makeDraggable( root, options );
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

                this.splitBar.addEventListener("mousedown", inner_mousedown);
                this.root.appendChild( this.splitBar );

                var that = this;
                var lastMousePosition = [ 0, 0 ];

                function inner_mousedown( e )
                {
                    var doc = that.root.ownerDocument;
                    doc.addEventListener( 'mousemove', inner_mousemove );
                    doc.addEventListener( 'mouseup', inner_mouseup );
                    lastMousePosition[ 0 ] = e.x;
                    lastMousePosition[ 1 ] = e.y;
                    e.stopPropagation();
                    e.preventDefault();
                    document.body.classList.add( 'nocursor' );
                    that.splitBar.classList.add( 'nocursor' );
                }

                function inner_mousemove( e )
                {
                    switch( that.type ) {
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

                function inner_mouseup( e )
                {
                    var doc = that.root.ownerDocument;
                    doc.removeEventListener( 'mousemove', inner_mousemove );
                    doc.removeEventListener( 'mouseup', inner_mouseup );
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
        if( this.sections.length)
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
     * @param {*} options
     * type: Split mode (horizontal, vertical) ["horizontal"]
     * sizes: Size of each new area (Array) ["50%", "50%"]
     */

    split( options = {} ) {

        if( this.sections.length )
        {
            // In case Area has been split before, get 2nd section as root
            this.offset = this.root.childNodes[ 0 ].offsetHeight; // store offset to take into account when resizing
            this._root = this.sections[ 0 ].root;
            this.root = this.sections[ 1 ].root;
        }

        var type = options.type || "horizontal";
        var sizes = options.sizes || [ "50%", "50%" ];
        var auto = (options.sizes === 'auto');

        if( !sizes[ 1 ] )
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

        // Create areas
        var area1 = new Area( { skipAppend: true, className: "split" + ( options.menubar || options.sidebar ? "" : " origin" ) } );
        var area2 = new Area( { skipAppend: true, className: "split" } );

        area1.parentArea = this;
        area2.parentArea = this;

        let minimizable = options.minimizable ?? false;
        let resize = ( options.resize ?? true ) || minimizable;

        var data = "0px";
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

            data = ( LX.DEFAULT_SPLITBAR_SIZE / 2 ) + "px"; // updates

            // Being minimizable means it's also resizeable!
            if( minimizable )
            {
                this.splitExtended = false;

                // Keep state of the animation when ends...
                area2.root.addEventListener('animationend', e => {
                    const opacity = getComputedStyle( area2.root ).opacity;
                    area2.root.classList.remove( e.animationName + "-" + type );
                    area2.root.style.opacity = opacity;
                    flushCss(area2.root);
                });

                this.splitBar.addEventListener("contextmenu", e => {
                    e.preventDefault();
                    addContextMenu(null, e, c => {
                        c.add("Extend", { disabled: this.splitExtended, callback: () => { this.extend() } });
                        c.add("Reduce", { disabled: !this.splitExtended, callback: () => { this.reduce() } });
                    });
                });
            }
        }

        if( type == "horizontal" )
        {
            var width1 = sizes[ 0 ],
                width2 = sizes[ 1 ];

            if( width1.constructor == Number )
            {
                width1 += "px";
            }

            if( width2.constructor == Number )
            {
                width2 += "px";
            }

            area1.root.style.width = "calc( " + width1 + " - " + data + " )";
            area1.root.style.height = "calc(100% - 0px)";
            area2.root.style.width = "calc( " + width2 + " - " + data + " )";
            area2.root.style.height = "calc(100% - 0px)";
            this.root.style.display = "flex";
        }
        else // vertical
        {
            area1.root.style.width = "100%";
            area2.root.style.width = "100%";

            if( auto )
            {
                area1.root.style.height = "auto";

                // Listen resize event on first area
                const resizeObserver = new ResizeObserver( entries => {
                    for (const entry of entries) {
                        const bb = entry.contentRect;
                        area2.root.style.height = "calc(100% - " + ( bb.height + 4) + "px )";
                    }
                });

                resizeObserver.observe( area1.root );
            }
            else
            {
                var height1 = sizes[ 0 ],
                    height2 = sizes[ 1 ];

                if( height1.constructor == Number )
                {
                    height1 += "px";
                }

                if( height2.constructor == Number )
                {
                    height2 += "px";
                }

                area1.root.style.width = "100%";
                area1.root.style.height = "calc( " + height1 + " - " + data + " )";
                area2.root.style.height = "calc( " + height2 + " - " + data + " )";
            }
        }

        this.root.appendChild( area1.root );

        if( resize )
        {
            this.root.appendChild(this.splitBar);
        }

        this.root.appendChild( area2.root );
        this.sections = [ area1, area2 ];
        this.type = type;

        // Update sizes
        this._update();

        if( !resize )
        {
            return this.sections;
        }

        var that = this;

        function innerMouseDown( e )
        {
            var doc = that.root.ownerDocument;
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

            const widgets = that.root.querySelectorAll( ".lexwidget" );

            // Send area resize to every widget in the area
            for( let widget of widgets )
            {
                const jsInstance = widget.jsInstance;

                if( jsInstance.onresize )
                {
                    jsInstance.onresize();
                }
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            var doc = that.root.ownerDocument;
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

        this.size = [ this.root.clientWidth, this.root.clientHeight ];

        this.propagateEvent( "onresize" );
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

        let [area1, area2] = this.sections;
        this.splitExtended = true;

        if(this.type == "vertical")
        {
            this.offset = area2.root.offsetHeight;
            area2.root.classList.add("fadeout-vertical");
            this._moveSplit(-Infinity, true);

        }
        else
        {
            this.offset = area2.root.offsetWidth - 8; // Force some height here...
            area2.root.classList.add("fadeout-horizontal");
            this._moveSplit(-Infinity, true, 8);
        }

        // Async resize in some ms...
        doAsync( () => this.propagateEvent('onresize'), 150 );
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

        if(this.type == "vertical")
        {
            area2.root.classList.add("fadein-vertical");
            this._moveSplit(this.offset);
        }
        else
        {
            area2.root.classList.add("fadein-horizontal");
            this._moveSplit(this.offset);
        }

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

        if(callback) callback( menubar );

        LX.menubars.push( menubar );

        const height = 48; // pixels

        const [bar, content] = this.split({type: 'vertical', sizes: [height, null], resize: false, menubar: true});
        bar.attach( menubar );
        bar.is_menubar = true;
        return menubar;
    }

    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     */

    addSidebar( callback, options = {} ) {

        let sidebar = new SideBar( options );

        if( callback ) callback( sidebar );

        LX.menubars.push( sidebar );

        const width = 64; // pixels

        const [bar, content] = this.split( { type: 'horizontal', sizes: [ width, null ], resize: false, sidebar: true } );
        bar.attach( sidebar );
        bar.is_sidebar = true;
        return sidebar;
    }

    /**
     * @method addOverlayButtons
     * @param {Array} buttons Buttons info
     * @param {*} options:
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
            for( var i = 0; i < float.length; i++ )
            {
                const t = float[i];
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
                className: b.class
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
                overlayPanel.addDropdown( null, b.options, b.name, callback, _options );
            }
            else
            {
                overlayPanel.addButton( null, b.name, function( value, event ) {
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

                    callback( value, event );

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

    _moveSplit( dt, forceAnimation = false, forceWidth = 0 ) {

        if( !this.type )
        {
            throw( "No split area" );
        }

        if( dt === undefined ) // Splitbar didn't move!
        {
            return;
        }

        const a1 = this.sections[ 0 ];
        var a1Root = a1.root;

        if( !a1Root.classList.contains( "origin" ) )
        {
            a1Root = a1Root.parentElement;
        }

        const a2 = this.sections[ 1 ];
        const a2Root = a2.root;
        const splitData = " - "+ LX.DEFAULT_SPLITBAR_SIZE + "px";

        let transition = null;
        if( !forceAnimation )
        {
            // Remove transitions for this change..
            transition = a1Root.style.transition;
            a1Root.style.transition = a2Root.style.transition = "none";
            flushCss( a1Root );
            flushCss( a2Root );
        }

        if( this.type == "horizontal" )
        {
            var size = Math.max( a2Root.offsetWidth + dt, parseInt( a2.minWidth ) );
            if( forceWidth ) size = forceWidth;
            a1Root.style.width = "-moz-calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.width = "-webkit-calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.width = "calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.minWidth = parseInt( a1.minWidth ) + "px";
            a2Root.style.width = size + "px";
            if( a1.maxWidth != Infinity ) a2Root.style.minWidth = "calc( 100% - " + parseInt( a1.maxWidth ) + "px" + " )";
        }
        else
        {
            var size = Math.max((a2Root.offsetHeight + dt) + a2.offset, parseInt(a2.minHeight));
            if( forceWidth ) size = forceWidth;
            a1Root.style.height = "-moz-calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.height = "-webkit-calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.height = "calc( 100% - " + size + "px " + splitData + " )";
            a1Root.style.minHeight = a1.minHeight + "px";
            a2Root.style.height = ( size - a2.offset ) + "px";
        }

        if( !forceAnimation )
        {
            // Reapply transitions
            a1Root.style.transition = a2Root.style.transition = transition;
        }

        this._update();

        // Resize events
        this.propagateEvent( 'onresize' );
    }

    _disableSplitResize() {

        this.resize = false;
        this.splitBar.remove();
        delete this.splitBar;
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
            LX.emit( "@on_tab_docked" );
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
                this.thumb.style.width = ( tabEl.offsetWidth - 5 ) + "px";
                this.thumb.style.height = ( tabEl.offsetHeight - 6 ) + "px";
                flushCss( this.thumb );
                this.thumb.style.transition = transition;
            });

            resizeObserver.observe( this.area.root );
        }

        // debug
        if(folding)
        {
            this.folded = true;
            this.folding = folding;

            if(folding == "up") area.root.insertChildAtIndex(area.sections[1].root, 0);

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

    add( name, content, options = {} ) {

        let isSelected = options.selected ?? false;

        if( isSelected )
        {
            this.root.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ) );
            this.area.root.querySelectorAll( '.lextabcontent' ).forEach( c => c.style.display = 'none' );
        }

        isSelected = !Object.keys( this.tabs ).length && !this.folding ? true : isSelected;

        let contentEl = content.root ? content.root : content;
        contentEl.originalDisplay = contentEl.style.display;
        contentEl.style.display = isSelected ? contentEl.originalDisplay : "none";
        contentEl.classList.add( 'lextabcontent' );

        // Process icon
        if( options.icon )
        {
            if( options.icon.includes( 'fa-' ) ) // It's fontawesome icon...
            {
                options.icon = "<i class='" + options.icon + "'></i>";
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
        tabEl.className = "lexareatab" + ( isSelected ? " selected" : "" );
        tabEl.innerHTML = ( options.icon ?? "" ) + name;
        tabEl.id = name.replace( /\s/g, '' ) + Tabs.TAB_ID++;
        tabEl.title = options.title ?? "";
        tabEl.selected = isSelected ?? false;
        tabEl.fixed = options.fixed;
        tabEl.instance = this;
        contentEl.id = tabEl.id + "_content";

        if( tabEl.selected )
        {
            this.selected = name;
        }

        LX.addSignal( "@on_tab_docked", tabEl, function() {
            if( this.parentElement.childNodes.length == 1 )
            {
                this.parentElement.childNodes[ 0 ].click(); // single tab!!
            }
        } );

        tabEl.addEventListener("click", e => {

            e.preventDefault();
            e.stopPropagation();

            if( !tabEl.fixed )
            {
                // For folding tabs
                const lastValue = tabEl.selected;
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.selected = false );
                tabEl.selected = !lastValue;
                // Manage selected
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ));
                tabEl.classList.toggle('selected', ( this.folding && tabEl.selected ));
                // Manage visibility
                tabEl.instance.area.root.querySelectorAll( '.lextabcontent' ).forEach( c => c.style.display = 'none' );
                contentEl.style.display = contentEl.originalDisplay;
                tabEl.instance.selected = tabEl.dataset.name;
            }

            if( this.folding )
            {
                this.folded = tabEl.selected;
                this.area.root.classList.toggle( 'folded', !this.folded );
            }

            if( options.onSelect )
            {
                options.onSelect(e, tabEl.dataset.name);
            }

            if( this.thumb )
            {
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth - 5 ) + "px";
                this.thumb.style.height = ( tabEl.offsetHeight - 6 ) + "px";
                this.thumb.item = tabEl;
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

        tabEl.addEventListener("mouseup", e => {
            e.preventDefault();
            e.stopPropagation();
            if( e.button == 1 )
            {
                this.delete( tabEl.dataset[ "name" ] );
            }
        });

        tabEl.setAttribute( 'draggable', true );
        tabEl.addEventListener( 'dragstart', function( e ) {
            if( this.parentElement.childNodes.length == 1 ){
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData( 'source', e.target.id );
        });

        // Attach content
        tabEl.childIndex = ( this.root.childElementCount - 1 );
        this.root.appendChild( tabEl );
        this.area.attach( contentEl );
        this.tabDOMs[ name ] = tabEl;
        this.tabs[ name ] = content;

        setTimeout( () => {

            if( options.onCreate ) {
                options.onCreate.call(this, this.area.root.getBoundingClientRect());
            }

            if( isSelected && this.thumb )
            {
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth - 5 ) + "px";
                this.thumb.style.height = ( tabEl.offsetHeight - 6 ) + "px";
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
            entry.innerHTML = "<span>" + key + "</span>";
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
                contextmenu.style.top = (isSubMenu ? 0 : rect.bottom - 4) + "px";
                c.appendChild( contextmenu );

                contextmenu.focus();

                rect = contextmenu.getBoundingClientRect();

                for( var i = 0; i < o[k].length; ++i )
                {
                    const subitem = o[k][i];
                    const subkey = Object.keys(subitem)[0];
                    const hasSubmenu = subitem[ subkey ].length;
                    const isCheckbox = subitem[ 'type' ] == 'checkbox';
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
                        if(isCheckbox){
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

                // Manage selected
                this.root.querySelectorAll(".lexmenuentry").forEach( e => e.classList.remove( 'selected' ) );
                entry.classList.add( "selected" );

                this.root.querySelectorAll(".lexcontextmenu").forEach( e => e.remove() );
                create_submenu( item, key, entry, -1 );
            });

            entry.addEventListener("mouseleave", () => {
                this.root.querySelectorAll(".lexmenuentry").forEach( e => e.classList.remove( 'selected' ) );
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

        if( !buttons )
        {
            throw( "No buttons to add!" );
        }

        if( !this.buttonContainer )
        {
            this.buttonContainer = document.createElement( "div" );
            this.buttonContainer.className = "lexmenubuttons";
            this.buttonContainer.classList.add( options.float ?? "center" );

            if( options.position == "right" )
            {
                this.buttonContainer.right = true;
            }

            if( this.root.lastChild && this.root.lastChild.right )
            {
                this.root.lastChild.before( this.buttonContainer );
            }
            else
            {
                this.root.appendChild( this.buttonContainer );
            }
        }

        for( let i = 0; i < buttons.length; ++i )
        {
            let data = buttons[ i ];
            let button = document.createElement( "label" );
            const title = data.title;
            let disabled = data.disabled ?? false;
            button.className = "lexmenubutton" + (disabled ? " disabled" : "");
            button.title = title ?? "";
            this.buttonContainer.appendChild( button );

            const icon = document.createElement( "a" );
            icon.className = data.icon + " lexicon";
            button.appendChild( icon );

            let trigger = icon;

            if( data.swap )
            {
                button.classList.add( "swap" );
                icon.classList.add( "swap-off" );

                const input = document.createElement( "input" );
                input.type = "checkbox";
                button.prepend( input );
                trigger = input;

                const swapIcon = document.createElement( "a" );
                swapIcon.className = data.swap + " swap-on lexicon";
                button.appendChild( swapIcon );
            }

            trigger.addEventListener("click", e => {
                if( data.callback && !disabled )
                {
                    const swapInput = button.querySelector( "input" );
                    data.callback.call( this, e, swapInput?.checked );
                }
            });

            if( title )
            {
                this.buttons[ title ] = button;
            }
        }
    }
};

LX.Menubar = Menubar;

/**
 * @class SideBar
 */

class SideBar {

    constructor( options = {} )  {

        this.root = document.createElement( 'div' );
        this.root.className = "lexsidebar";

        this.footer = document.createElement( 'div' );
        this.footer.className = "lexsidebarfooter";
        this.root.appendChild( this.footer );

        this.items = [ ];
    }

    /**
     * @method add
     * @param {*} options:
     * callback: Function to call on each item
     * bottom: Bool to set item at the bottom as helper button (not selectable)
     * className: Add class to the entry DOM element
     */

    add( key, options = {} ) {

        if( options.constructor == Function )
            options = { callback: options };

        let pKey = key.replace( /\s/g, '' ).replaceAll( '.', '' );

        if( this.items.findIndex( (v, i) => v.key == pKey ) > -1 )
        {
            console.warn( `'${key}' already created in Sidebar` );
            return;
        }

        let entry = document.createElement( 'div' );
        entry.className = "lexsidebarentry " + ( options.className ?? "" );
        entry.id = pKey;

        if( options.bottom )
        {
            this.footer.appendChild( entry );
        }
        else
        {
            this.root.appendChild( entry );
        }

        // Reappend footer in root
        this.root.appendChild( this.footer );

        let button = document.createElement( 'button' );
        button.innerHTML = "<i class='"+ (options.icon ?? "") + "'></i>";
        entry.appendChild( button );

        let desc = document.createElement( 'span' );
        desc.className = 'lexsidebarentrydesc';
        desc.innerHTML = key;
        entry.appendChild( desc );

        button.addEventListener("mouseenter", () => {
            setTimeout( () => {
                desc.style.display = "unset";
            }, 100 );
        });

        button.addEventListener("mouseleave", () => {
            setTimeout( () => {
                desc.style.display = "none";
            }, 100 );
        });

        entry.addEventListener("click", () => {

            const f = options.callback;
            if( f ) f.call( this, key, entry );

            // Manage selected
            if( !options.bottom )
            {
                this.root.querySelectorAll(".lexsidebarentry").forEach( e => e.classList.remove( 'selected' ) );
                entry.classList.add( "selected" );
            }
        });

        this.items.push( { name: pKey, domEl: entry, callback: options.callback } );
    }

    /**
     * @method select
     * @param {String} name Element name to select
     */

    select( name ) {

        let pKey = name.replace( /\s/g, '' ).replaceAll( '.', '' );

        const entry = this.items.find( v => v.name === pKey );

        if( !entry )
            return;

        entry.domEl.click();
    }
};

LX.SideBar = SideBar;

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
    static TOGGLE       = 6;
    static COLOR        = 7;
    static NUMBER       = 8;
    static TITLE        = 9;
    static VECTOR       = 10;
    static TREE         = 11;
    static PROGRESS     = 12;
    static FILE         = 13;
    static LAYERS       = 14;
    static ARRAY        = 15;
    static LIST         = 16;
    static TAGS         = 17;
    static CURVE        = 18;
    static CARD         = 19;
    static IMAGE        = 20;
    static CONTENT      = 21;
    static CUSTOM       = 22;
    static SEPARATOR    = 23;
    static KNOB         = 24;
    static SIZE         = 25;
    static PAD          = 26;
    static FORM         = 27;
    static DIAL         = 28;
    static COUNTER      = 29;

    static NO_CONTEXT_TYPES = [
        Widget.BUTTON,
        Widget.LIST,
        Widget.FILE,
        Widget.PROGRESS
    ];

    constructor( name, type, options ) {
        this.name = name;
        this.type = type;
        this.options = options;
    }

    value() {

        if( this.onGetValue )
        {
            return this.onGetValue();
        }

        console.warn( "Can't get value of " + this.typeName() );
    }

    set( value, skipCallback = false, signalName = "" ) {

        if( this.onSetValue )
            return this.onSetValue( value, skipCallback );

        console.warn("Can't set value of " + this.typeName());
    }

    oncontextmenu(e) {

        if( Widget.NO_CONTEXT_TYPES.includes(this.type) )
            return;

        addContextMenu(this.typeName(), e, c => {
            c.add("Copy", () => { this.copy() });
            c.add("Paste", { disabled: !this._can_paste(), callback: () => { this.paste() } } );
        });
    }

    copy() {
        navigator.clipboard.type = this.type;
        navigator.clipboard.customIdx = this.customIdx;
        navigator.clipboard.data = this.value();
        navigator.clipboard.writeText( navigator.clipboard.data );
    }

    _can_paste() {
        return this.type === Widget.CUSTOM ? navigator.clipboard.customIdx !== undefined && this.customIdx == navigator.clipboard.customIdx :
            navigator.clipboard.type === this.type;
    }

    paste() {
        if( !this._can_paste() )
        {
            return;
        }

        this.set( navigator.clipboard.data );
    }

    typeName() {

        switch( this.type ) {
            case Widget.TEXT: return "Text";
            case Widget.TEXTAREA: return "TextArea";
            case Widget.BUTTON: return "Button";
            case Widget.DROPDOWN: return "Dropdown";
            case Widget.CHECKBOX: return "Checkbox";
            case Widget.TOGGLE: return "Toggle";
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
            case Widget.KNOB: return "Knob";
            case Widget.SIZE: return "Size";
            case Widget.PAD: return "Pad";
            case Widget.FORM: return "Form";
            case Widget.DIAL: return "Dial";
            case Widget.COUNTER: return "Counter";
            case Widget.CUSTOM: return this.customName;
        }

        console.error( `Unknown Widget type: ${ this.type }` );
    }

    refresh() {

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
        widget.onSetValue = ( newValue, skipCallback ) => {
            instance = newValue;
            refresh_widget();
            element.querySelector( ".lexcustomitems" ).toggleAttribute( 'hidden', false );
            if( !skipCallback ) this._trigger( new IEvent( name, instance, null ), callback );
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

            element.appendChild( container );
            element.appendChild( custom_widgets );

            if( instance )
            {

                this.queue( custom_widgets );

                const on_instance_changed = ( key, value, event ) => {
                    instance[ key ] = value;
                    this._trigger( new IEvent( name, instance, event ), callback );
                };

                for( let key in default_instance )
                {
                    const value = instance[ key ] ?? default_instance[ key ];

                    switch( value.constructor )
                    {
                        case String:
                            if( value[ 0 ] === '#' )
                            {
                                this.addColor( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this.addText( key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        case Number:
                            this.addNumber( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Boolean:
                            this.addCheckbox( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Array:
                            if( value.length > 4 )
                            {
                                this.addArray( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this._add_vector( value.length, key, value, on_instance_changed.bind( this, key ) );
                            }
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

    constructor( domEl, data, options ) {

        this.domEl = domEl;
        this.data = data;
        this.onevent = options.onevent;
        this.options = options;
        this.selected = [];

        if(data.constructor === Object)
            this._create_item( null, data );
        else
            for( let d of data )
                this._create_item( null, d );
    }

    _create_item( parent, node, level = 0, selectedId ) {

        const that = this;
        const node_filter_input = this.domEl.querySelector( "#lexnodetree_filter" );

        node.children = node.children ?? [];
        if( node_filter_input && !node.id.includes( node_filter_input.value ) || (selectedId != undefined) && selectedId != node.id )
        {
            for( var i = 0; i < node.children.length; ++i )
            {
                this._create_item( node, node.children[ i ], level + 1, selectedId );
            }
            return;
        }

        const list = this.domEl.querySelector( 'ul' );

        node.visible = node.visible ?? true;
        node.parent = parent;
        let isParent = node.children.length > 0;
        let isSelected = this.selected.indexOf( node ) > -1 || node.selected;

        if( this.options.onlyFolders )
        {
            let has_folders = false;
            node.children.forEach( c => has_folders |= (c.type == 'folder') );
            isParent = !!has_folders;
        }

        let item = document.createElement('li');
        item.className = "lextreeitem " + "datalevel" + level + (isParent ? " parent" : "") + (isSelected ? " selected" : "");
        item.id = LX.getSupportedDOMName( node.id );
        item.tabIndex = "0";

        // Select hierarchy icon
        let icon = (this.options.skip_default_icon ?? true) ? "" : "fa-solid fa-square"; // Default: no childs
        if( isParent ) icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
        item.innerHTML = "<a class='" + icon + " hierarchy'></a>";

        // Add display icon
        icon = node.icon;

        // Process icon
        if( node.icon )
        {
            if( node.icon.includes( 'fa-' ) ) // It's fontawesome icon...
                item.innerHTML += "<a class='" + node.icon + " tree-item-icon'></a>";
            else // an image..
            {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                item.innerHTML += "<img src='" + ( rootPath + node.icon ) + "'>";
            }
        }

        item.innerHTML += (node.rename ? "" : node.id);

        item.setAttribute( 'draggable', true );
        item.style.paddingLeft = ((isParent ? 0 : 3 ) + (3 + (level+1) * 15)) + "px";
        list.appendChild( item );

        // Callbacks
        item.addEventListener("click", e => {
            if( handled )
            {
                handled = false;
                return;
            }

            if( !e.shiftKey )
            {
                list.querySelectorAll( "li" ).forEach( e => { e.classList.remove( 'selected' ); } );
                this.selected.length = 0;
            }

            // Add or remove
            const idx = this.selected.indexOf( node );
            if( idx > -1 ) {
                item.classList.remove( 'selected' );
                this.selected.splice( idx, 1 );
            }else {
                item.classList.add( 'selected' );
                this.selected.push( node );
            }

            // Only Show children...
            if( isParent && node.id.length > 1 /* Strange case... */) {
                node.closed = false;
                if( that.onevent )
                {
                    const event = new TreeEvent( TreeEvent.NODE_CARETCHANGED, node, node.closed );
                    that.onevent( event );
                }
                that.frefresh( node.id );
            }

            if( that.onevent )
            {
                const event = new TreeEvent(TreeEvent.NODE_SELECTED, e.shiftKey ? this.selected : node );
                event.multiple = e.shiftKey;
                that.onevent( event );
            }
        });

        item.addEventListener("dblclick", function() {

            if( that.options.rename ?? true )
            {
                // Trigger rename
                node.rename = true;
                that.refresh();
            }

            if( that.onevent )
            {
                const event = new TreeEvent( TreeEvent.NODE_DBLCLICKED, node );
                that.onevent( event );
            }
        });

        item.addEventListener( "contextmenu", e => {

            e.preventDefault();

            if( that.onevent )
            {
                return;
            }

            const event = new TreeEvent(TreeEvent.NODE_CONTEXTMENU, this.selected.length > 1 ? this.selected : node, e);
            event.multiple = this.selected.length > 1;

            LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {
                event.panel = m;
            });

            that.onevent( event );

            if( ( this.options.addDefault ?? false ) == true )
            {
                if( event.panel.items )
                {
                    event.panel.add( "" );
                }

                event.panel.add( "Select Children", () => {

                    const selectChildren = ( n ) => {

                        if( n.closed )
                        {
                            return;
                        }

                        for( let child of n.children ?? [] )
                        {
                            if( !child )
                            {
                                continue;
                            }

                            let nodeItem = this.domEl.querySelector( '#' + child.id );
                            nodeItem.classList.add('selected');
                            this.selected.push( child );
                            selectChildren( child );
                        }
                    };

                    // Add childs of the clicked node
                    selectChildren( node );
                } );

                event.panel.add( "Delete", { callback: () => {

                    // It's the root node
                    if( !node.parent )
                    {
                        return;
                    }

                    if( that.onevent ) {
                        const event = new TreeEvent( TreeEvent.NODE_DELETED, node, e );
                        that.onevent( event );
                    }

                    // Delete nodes now
                    let childs = node.parent.children;
                    const index = childs.indexOf( node );
                    childs.splice( index, 1 );

                    this.refresh();
                } } );
            }
        });

        item.addEventListener("keydown", e => {

            if( node.rename )
            {
                return;
            }

            e.preventDefault();

            if( e.key == "Delete" )
            {
                // Send event now so we have the info in selected array..
                if( that.onevent ) {
                    const event = new TreeEvent( TreeEvent.NODE_DELETED, this.selected.length > 1 ? this.selected : node, e );
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
                var selected = this.selected.length > 1 ? ( e.key == "ArrowUp" ? this.selected.shift() : this.selected.pop() ) : this.selected[ 0 ];
                var el = this.domEl.querySelector( "#" + LX.getSupportedDOMName( selected.id ) );
                var sibling = e.key == "ArrowUp" ? el.previousSibling : el.nextSibling;
                if( sibling )
                {
                    sibling.click();
                }
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

                node.id = LX.getSupportedDOMName( this.value );
                delete node.rename;
                that.frefresh( node.id );
                list.querySelector("#" + node.id).classList.add('selected');
            }
            if(e.key == 'Escape') {
                delete node.rename;
                that.frefresh( node.id );
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
        if(isParent) {
            item.querySelector('a.hierarchy').addEventListener("click", function(e) {

                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();

                node.closed = !node.closed;
                if(that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed);
                    that.onevent( event );
                }
                that.frefresh( node.id );
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

            if( this.options.onlyFolders && child.type != 'folder')
                continue;

            this._create_item( node, child, level + 1 );
        }
    }

    refresh( newData, selectedId ) {
        this.data = newData ?? this.data;
        this.domEl.querySelector( "ul" ).innerHTML = "";
        this._create_item( null, this.data, 0, selectedId );
    }

    /* Refreshes the tree and focuses current element */
    frefresh( id ) {
        this.refresh();
        var el = this.domEl.querySelector( "#" + id );
        if( el ) el.focus();
    }

    select( id ) {
        this.refresh( null, id );
    }
}

/**
 * @class Panel
 */

class Panel {

    /**
     * @param {*} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the panel element [fit space]
     * height: Height of the panel element [fit space]
     * style: CSS Style object to be applied to the panel
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

        this._inline_widgets_left = -1;
        this._inline_queued_container = null;

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

        if( !widget )
        {
            throw( "No widget called " + name );
        }

        return widget.value();
    }

    setValue( name, value, skipCallback ) {

        let widget = this.widgets[ name ];

        if( !widget )
        {
            throw( "No widget called " + name );
        }

        return widget.set( value, skipCallback );
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
            if(this.widgets[w].options && this.widgets[w].options.signal) {
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

        this._inline_queued_container = this.queuedContainer;
        this._inline_widgets_left = number || Infinity;
    }

    /**
     * @method endLine
     * @description Stop inlining widgets. Use it only if the number of widgets to be inlined is NOT specified.
     */

    endLine( justifyContent ) {

        if( this._inline_widgets_left == -1)
        {
            console.warn("No pending widgets to be inlined!");
            return;
        }

        this._inline_widgets_left = -1;

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
                if(this._inline_queued_container)
                    this._inlineContainer.appendChild( item[0] );
                // eg. a dropdown, item is appended to parent, not to inline cont.
                else
                    item[1].appendChild(item[0]);
            }
            else
                this._inlineContainer.appendChild( item );
        }

        if(!this._inline_queued_container)
        {
            if(this.current_branch)
                this.current_branch.content.appendChild( this._inlineContainer );
            else
                this.root.appendChild( this._inlineContainer );
        }
        else
        {
            this._inline_queued_container.appendChild( this._inlineContainer );
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
            this._addFilter( options.filter, {callback: this._searchWidgets.bind(this, branch.name)} );
        }

        return branch;
    }

    merge() {

        this.branch_open = false;
        this.current_branch = null;
    }

    _pick( arg, def ) {
        return (typeof arg == 'undefined' ? def : arg);
    }

    static _dispatch_event( element, type, data, bubbles, cancelable ) {
        let event = new CustomEvent( type, { 'detail': data, 'bubbles': bubbles, 'cancelable': cancelable } );
        element.dispatchEvent( event );
    }

    static _add_reset_property( container, callback ) {
        var domEl = document.createElement('a');
        domEl.style.display = "none";
        domEl.style.marginRight = "6px";
        domEl.className = "lexicon fa fa-rotate-left";
        domEl.addEventListener( "click", callback );
        container.appendChild( domEl );
        return domEl;
    }

    /*
        Panel Widgets
    */

    create_widget( name, type, options = {} ) {

        let widget = new Widget( name, type, options );

        let element = document.createElement( 'div' );
        element.className = "lexwidget";
        element.id = options.id ?? "";
        element.title = options.title ?? "";

        if( options.className )
        {
            element.className += " " + options.className;
        }

        if( type != Widget.TITLE )
        {
            element.style.width = "calc(100% - " + (this.current_branch || type == Widget.FILE ? 10 : 20) + "px)";

            if( options.width )
            {
                element.style.width = element.style.minWidth = options.width;
            }
            if( options.maxWidth )
            {
                element.style.maxWidth = options.maxWidth;
            }
            if( options.minWidth )
            {
                element.style.minWidth = options.minWidth;
            }
            if( options.height )
            {
                element.style.height = element.style.minHeight = options.height;
            }
        }

        if( name != undefined )
        {
            if( !(options.hideName ?? false) )
            {
                let domName = document.createElement( 'div' );
                domName.className = "lexwidgetname";
                if( options.justifyName )
                {
                    domName.classList.add( "float-" + options.justifyName );
                }
                domName.innerHTML = name || "";
                domName.title = options.title ?? domName.innerHTML;
                domName.style.width = options.nameWidth || LX.DEFAULT_NAME_WIDTH;
                element.appendChild(domName);
                element.domName = domName;

                // Copy-paste info
                domName.addEventListener('contextmenu', function( e ) {
                    e.preventDefault();
                    widget.oncontextmenu( e );
                });
            }

            this.widgets[ name ] = widget;
        }

        if( options.signal )
        {
            if( !name )
            {
                if( !this.signals )
                {
                    this.signals = [];
                }

                this.signals.push( { [ options.signal ]: widget } )
            }

            LX.addSignal( options.signal, widget );
        }

        widget.domEl = element;
        element.jsInstance = widget;

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
        if(this._inline_widgets_left > 0 && !options.skipInlineCount)
        {
            if(!this._inlineWidgets)  {
                this._inlineWidgets = [];
            }

            // Store widget and its container
            store_widget(element);

            this._inline_widgets_left--;

            // Last widget
            if(!this._inline_widgets_left) {
                this.endLine();
            }
        }else {
            insert_widget(element);
        }

        return widget;
    }

    _addFilter( placeholder, options = {} ) {

        options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties..";
        options.skipWidget = options.skipWidget ?? true;
        options.skipInlineCount = true;

        let widget = this.create_widget(null, Widget.TEXT, options);
        let element = widget.domEl;
        element.className += " lexfilter noname";

        let input = document.createElement('input');
        input.className = 'lexinput-filter';
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

    _searchWidgets(branchName, value) {

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

    _search_options(options, value) {
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

        if( callback )
            callback.call( this, event.value, event.domEvent, event.name );

        if( this.onevent )
            this.onevent.call( this, event );
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
     * @param {*} options:
     * link: Href in case title is an hyperlink
     * target: Target name of the iframe (if any)
     * icon: FA class of the icon (if any)
     * iconColor: Color of title icon (if any)
     * style: CSS to override
     */

    addTitle( name, options = {} ) {

        if( !name )
        {
            throw( "Can't create Title without text!" );
        }

        let widget = this.create_widget( null, Widget.TITLE, options );
        let element = widget.domEl;
        element.className = "lextitle";

        if( options.icon )
        {
            let icon = document.createElement( 'a' );
            icon.className = options.icon;
            icon.style.color = options.iconColor || "";
            element.appendChild( icon );
        }

        let text = document.createElement( "span");
        text.innerText = name;
        element.appendChild( text );

        Object.assign( element.style, options.style ?? {} );

        if( options.link != undefined )
        {
            let linkDom = document.createElement('a');
            linkDom.innerText = name;
            linkDom.href = options.link;
            linkDom.target = options.target ?? "";
            linkDom.className = "lextitle link";
            Object.assign( linkDom.style, options.style ?? {} );
            element.replaceWith( linkDom );
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
     * required: Make the input required
     * placeholder: Add input placeholder
     * pattern: Regular expression that value must match
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * skipReset: Don't add the reset value button when value changes
     * float: Justify input text content
     * justifyName: Justify name content
     */

    addText( name, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.TEXT, options );

        widget.onGetValue = () => {
            return wValue.value;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            this.disabled ? wValue.innerText = newValue : wValue.value = newValue;
            Panel._dispatch_event( wValue, "focusout", skipCallback );
        };

        widget.valid = () => {
            if( wValue.pattern == "" ) { return true; }
            const regexp = new RegExp( wValue.pattern );
            return regexp.test( wValue.value );
        };

        let element = widget.domEl;

        // Add reset functionality
        if( widget.name && !( options.skipReset ?? false ) ) {
            Panel._add_reset_property( element.domName, function() {
                wValue.value = wValue.iValue;
                this.style.display = "none";
                Panel._dispatch_event( wValue, "focusout" );
            } );
        }

        // Add widget value

        let container = document.createElement( 'div' );
        container.className = "lextext" + ( options.warning ? " lexwarning" : "" );
        container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " )";
        container.style.display = "flex";

        if( options.textClass )
        {
            container.classList.add( options.textClass );
        }

        this.disabled = ( options.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue = null;

        if( !this.disabled )
        {
            wValue = document.createElement( 'input' );
            wValue.type = options.type || "";
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = "100%";
            wValue.style.textAlign = options.float ?? "";

            wValue.setAttribute( "placeholder", options.placeholder ?? "" );

            if( options.required )
            {
                wValue.setAttribute( "required", options.required );
            }

            if( options.pattern )
            {
                wValue.setAttribute( "pattern", options.pattern );
            }

            var resolve = ( function( val, event ) {

                if( !widget.valid() )
                {
                    return;
                }

                const skipCallback = event.detail;
                let btn = element.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = ( val != wValue.iValue ? "block" : "none" );
                if( !skipCallback )
                {
                    this._trigger( new IEvent( name, val, event ), callback );
                }

            }).bind( this );

            const trigger = options.trigger ?? 'default';

            if( trigger == 'default' )
            {
                wValue.addEventListener( "keyup", function( e ){
                    if(e.key == 'Enter')
                        resolve( e.target.value, e );
                });
                wValue.addEventListener( "focusout", function( e ){
                    resolve( e.target.value, e );
                });
            }
            else if( trigger == 'input' )
            {
                wValue.addEventListener("input", function( e ){
                    resolve( e.target.value, e );
                });
            }

            wValue.addEventListener( "mousedown", function( e ){
                e.stopImmediatePropagation();
                e.stopPropagation();
            });

            if( options.icon )
            {
                let icon = document.createElement( 'a' );
                icon.className = "inputicon " + options.icon;
                container.appendChild( icon );
            }

        } else
        {
            wValue = document.createElement( options.url ? 'a' : 'div' );
            if( options.url )
            {
                wValue.href = options.url;
                wValue.target = "_blank";
            }
            const icon = options.warning ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '';
            wValue.innerHTML = ( icon + value ) || "";
            wValue.style.width = "100%";
            wValue.style.textAlign = options.float ?? "";
        }

        Object.assign( wValue.style, options.style ?? {} );

        container.appendChild( wValue );
        element.appendChild( container );

        // Remove branch padding and margins
        if( !widget.name ) {
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
     * float: Justify input text content
     * justifyName: Justify name content
     * fitHeight: Height adapts to text
     */

    addTextArea( name, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.TEXTAREA, options );

        widget.onGetValue = () => {
            return wValue.value;
        };
        widget.onSetValue = ( newValue, skipCallback ) => {
            wValue.value = newValue;
            Panel._dispatch_event( wValue, "focusout", skipCallback );
        };

        let element = widget.domEl;

        // Add reset functionality
        if( widget.name && !( options.skipReset ?? false ) ) {
            Panel._add_reset_property( element.domName, function() {
                wValue.value = wValue.iValue;
                this.style.display = "none";
                Panel._dispatch_event( wValue, "focusout" );
            });
        }

        // Add widget value

        let container = document.createElement( 'div' );
        container.className = "lextextarea";
        container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " )";
        container.style.height = options.height;
        container.style.display = "flex";

        let wValue = document.createElement( 'textarea' );
        wValue.value = wValue.iValue = value || "";
        wValue.style.width = "100%";
        wValue.style.textAlign = options.float ?? "";
        Object.assign( wValue.style, options.style ?? {} );

        if( options.disabled ?? false ) wValue.setAttribute("disabled", true);
        if( options.placeholder ) wValue.setAttribute("placeholder", options.placeholder);

        var resolve = (function( val, event ) {
            const skipCallback = event.detail;
            let btn = element.querySelector( ".lexwidgetname .lexicon" );
            if( btn ) btn.style.display = ( val != wValue.iValue ? "block" : "none" );
            if( !skipCallback ) this._trigger( new IEvent( name, val, event ), callback );
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
        }, 10);

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
     * disabled: Make the widget disabled [false]
     * icon: Icon class to show as button value
     * img: Path to image to show as button value
     * title: Text to show in native Element title
     */

    addButton( name, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.BUTTON, options );

        widget.onGetValue = () => {
            return wValue.innerText;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            wValue.innerHTML =
            (options.icon ? "<a class='" + options.icon + "'></a>" :
            ( options.img  ? "<img src='" + options.img + "'>" : "<span>" + (newValue || "") + "</span>" ));
        };

        let element = widget.domEl;

        var wValue = document.createElement( 'button' );
        wValue.title = options.title ?? "";
        wValue.className = "lexbutton " + ( options.buttonClass ?? "" );

        if( options.selected )
        {
            wValue.classList.add( "selected" );
        }

        wValue.innerHTML =
            (options.icon ? "<a class='" + options.icon + "'></a>" :
            ( options.img  ? "<img src='" + options.img + "'>" : "<span>" + (value || "") + "</span>" ));

        wValue.style.width = "calc( 100% - " + (options.nameWidth ?? LX.DEFAULT_NAME_WIDTH) + ")";

        if( options.disabled )
        {
            wValue.setAttribute( "disabled", true );
        }

        wValue.addEventListener("click", e => {
            if( options.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( e => { if(e == wValue) return; e.classList.remove("selected") } );
                }

                wValue.classList.toggle('selected');
            }

            this._trigger( new IEvent( name, value, e ), callback );
        });

        element.appendChild( wValue );

        // Remove branch padding and margins
        if( !widget.name )
        {
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

            if(b.id)
                buttonEl.id = b.id;

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

        options.hideName = true;
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
     * @method addForm
     * @param {String} name Widget name
     * @param {Object} data Form data
     * @param {Function} callback Callback function on submit form
     * @param {*} options:
     * actionName: Text to be shown in the button
     */

    addForm( name, data, callback, options = {} ) {

        if( data.constructor != Object )
        {
            console.error( "Form data must be an Object" );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        let widget = this.create_widget( name, Widget.FORM, options );

        widget.onGetValue = () => {
            return container.formData;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            container.formData = newValue;
            const entries = container.querySelectorAll( ".lexwidget" );
            for( let i = 0; i < entries.length; ++i )
            {
                const entry = entries[ i ];
                if( entry.jsInstance.type != LX.Widget.TEXT )
                {
                    continue;
                }
                let entryName = entries[ i ].querySelector( ".lexwidgetname" ).innerText;
                let entryInput = entries[ i ].querySelector( ".lextext input" );
                entryInput.value = newValue[ entryName ] ?? "";
                Panel._dispatch_event( entryInput, "focusout", skipCallback );
            }
        };

        // Add widget value

        let element = widget.domEl;

        let container = document.createElement( 'div' );
        container.className = "lexformdata";

        this.queue( container );

        container.formData = {};

        for( let entry in data )
        {
            let entryData = data[ entry ];

            if( entryData.constructor != Object )
            {
                entryData = { };
            }

            entryData.placeholder = entryData.placeholder ?? entry;
            entryData.width = "calc(100% - 10px)";

            this.addLabel( entry, { textClass: "formlabel" } );

            entryData.textWidget = this.addText( null, entryData.constructor == Object ? entryData.value : entryData, ( value ) => {
                container.formData[ entry ] = value;
            }, entryData );

            container.formData[ entry ] = entryData.constructor == Object ? entryData.value : entryData;
        }

        this.addBlank( );

        this.addButton( null, options.actionName ?? "Submit", ( value, event ) => {

            for( let entry in data )
            {
                let entryData = data[ entry ];

                if( !entryData.textWidget.valid() )
                {
                    return;
                }
            }

            if( callback )
            {
                callback( container.formData, event );
            }
        }, { buttonClass: "primary", width: "calc(100% - 10px)" } );

        this.clearQueue();

        element.appendChild( container );

        if( !widget.name || options.hideName ) {
            element.className += " noname";
            container.style.width = "100%";
        }

        return widget;
    }

    /**
     * @method addContent
     * @param {HTMLElement/String} element
     */

    addContent( element, options = {} ) {

        if( !element )
        {
            return;
        }

        if( element.constructor == String )
        {
            const tmp = document.createElement( "div" );
            tmp.innerHTML = element;
            if( tmp.childElementCount > 1 )
            {
                element = tmp;
            }
            else
            {
                element = tmp.firstElementChild;
            }
        }

        let widget = this.create_widget( null, Widget.CONTENT, options );
        widget.domEl.appendChild( element );
        return widget;
    }

    /**
     * @method addImage
     * @param {String} url Image Url
     * @param {*} options
     */

    async addImage( url, options = {} ) {

        if( !url )
        {
            return;
        }

        options.hideName = true;
        let widget = this.create_widget( null, Widget.IMAGE, options );
        let element = widget.domEl;

        let container = document.createElement( 'div' );
        container.className = "leximage";
        container.style.width = "100%";

        let img = document.createElement( 'img' );
        img.src = url;

        for( let s in options.style )
        {
            img.style[ s ] = options.style[ s ];
        }

        await img.decode();
        container.appendChild( img );
        element.appendChild( container );

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
     * skipReset: Don't add the reset value button when value changes
     */

    addDropdown( name, values, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.DROPDOWN, options );

        widget.onGetValue = () => {
            return element.querySelector( "li.selected" ).getAttribute( 'value' );
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            let btn = element.querySelector( ".lexwidgetname .lexicon" );
            if( btn ) btn.style.display = ( newValue != wValue.iValue ? "block" : "none" );
            value = newValue;
            list.querySelectorAll( 'li' ).forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
            if( !skipCallback ) this._trigger( new IEvent( name, value, null ), callback );
        };

        let element = widget.domEl;
        let that = this;

        // Add reset functionality
        if(widget.name && !( options.skipReset ?? false ))
        {
            Panel._add_reset_property( element.domName, function() {
                value = wValue.iValue;
                list.querySelectorAll( 'li' ).forEach( e => { if( e.getAttribute('value') == value ) e.click() } );
                this.style.display = "none";
            });
        }

        let container = document.createElement( 'div' );
        container.className = "lexdropdown";
        container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        // Add widget value
        let wValue = document.createElement( 'div' );
        wValue.className = "lexdropdown lexoption";
        wValue.name = name;
        wValue.iValue = value;

        // Add dropdown widget button
        let buttonName = value;
        buttonName += "<a class='fa-solid fa-angle-down' style='float:right; margin-right: 3px;'></a>";

        this.queue(container);

        const _getMaxListWidth = () => {

            let maxWidth = 0;
            for( let i of values )
            {
                const iString = String( i );
                maxWidth = Math.max( iString.length, maxWidth );
            }
            return Math.max( maxWidth * 10, 80 );
        };

        let selectedOption = this.addButton( null, buttonName, ( value, event ) => {
            if( list.unfocus_event )
            {
                delete list.unfocus_event;
                return;
            }

            list.toggleAttribute( "hidden" );
            list.classList.remove( "place-above" );

            const listHeight = 26 * values.length;
            const rect = selectedOption.getBoundingClientRect();
            const topPosition = rect.y;

            let maxY = window.innerHeight;

            if( this.mainContainer )
            {
                const parentRect = this.mainContainer.getBoundingClientRect();
                maxY = parentRect.y + parentRect.height;
            }

            list.style.top = ( topPosition + selectedOption.offsetHeight ) + 'px';

            const showAbove = ( topPosition + listHeight ) > maxY;
            if( showAbove )
            {
                list.style.top = ( topPosition - listHeight ) + 'px';
                list.classList.add( "place-above" );
            }

            list.style.width = (event.currentTarget.clientWidth) + 'px';
            list.style.minWidth = (_getMaxListWidth()) + 'px';
            list.focus();
        }, { buttonClass: "array", skipInlineCount: true });

        this.clearQueue();

        selectedOption.style.width = "100%";

        selectedOption.refresh = (v) => {
            if(selectedOption.querySelector("span").innerText == "")
                selectedOption.querySelector("span").innerText = v;
            else
                selectedOption.querySelector("span").innerHTML = selectedOption.querySelector("span").innerHTML.replaceAll(selectedOption.querySelector("span").innerText, v);
        }

        // Add dropdown options container
        let list = document.createElement( 'ul' );
        list.tabIndex = -1;
        list.className = "lexoptions";
        list.hidden = true;

        list.addEventListener( 'focusout', function( e ) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if( e.relatedTarget === selectedOption.querySelector( 'button' ) )
            {
                this.unfocus_event = true;
                setTimeout( () => delete this.unfocus_event, 200 );
            }
            else if ( e.relatedTarget && e.relatedTarget.tagName == "INPUT" )
            {
                return;
            }
            else if ( e.target.className == 'lexinput-filter' )
            {
                return;
            }
            this.toggleAttribute( 'hidden', true );
        });

        // Add filter options
        let filter = null;
        if(options.filter ?? false)
        {
            filter = this._addFilter("Search option", {container: list, callback: this._search_options.bind(list, values)});
        }

        // Create option list to empty it easily..
        const listOptions = document.createElement('span');
        list.appendChild( listOptions );

        if( filter )
        {
            list.prepend( filter );
            listOptions.style.height = "calc(100% - 25px)";

            filter.addEventListener('focusout', function( e ) {
                if (e.relatedTarget && e.relatedTarget.tagName == "UL" && e.relatedTarget.classList.contains("lexoptions"))
                {
                    return;
                }
                list.toggleAttribute( 'hidden', true );
            });
        }

        // Add dropdown options list
        list.refresh = options => {

            // Empty list
            listOptions.innerHTML = "";

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
                        this._search_options.bind(list, values, "")();
                    }
                });

                // Add string option
                if( iValue.constructor != Object ) {
                    option.style.flexDirection = 'unset';
                    option.innerHTML = "</a><span>" + iValue + "</span><a class='fa-solid fa-check'>";
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

                listOptions.appendChild( li );
            }
        }

        list.refresh( values );

        container.appendChild( list );
        element.appendChild( container );

        // Remove branch padding and margins
        if( !widget.name )
        {
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
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Widget background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */

    addCurve( name, values, callback, options = {} ) {

        if(!name) {
            throw("Set Widget Name!");
        }

        let that = this;
        let widget = this.create_widget(name, Widget.CURVE, options);

        widget.onGetValue = () => {
            return JSON.parse(JSON.stringify(curveInstance.element.value));
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            let btn = element.querySelector( ".lexwidgetname .lexicon" );
            if( btn ) btn.style.display = ( newValue != curveInstance.element.value ? "block" : "none" );
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback ) that._trigger( new IEvent( name, curveInstance.element.value, null ), callback );
        };

        let element = widget.domEl;
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        // Add reset functionality
        if( !(options.skipReset ?? false) )
        {
            Panel._add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                curveInstance.element.value = JSON.parse( JSON.stringify( defaultValues ) );
                curveInstance.redraw();
                that._trigger( new IEvent( name, curveInstance.element.value, e ), callback );
            });
        }

        // Add widget value

        var container = document.createElement( 'div' );
        container.className = "lexcurve";
        container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        options.callback = (v, e) => {
            let btn = element.querySelector(".lexwidgetname .lexicon");
            if(btn) btn.style.display = (v != defaultValues ? "block" : "none");
            that._trigger( new IEvent(name, v, e), callback );
        };

        options.name = name;

        let curveInstance = new Curve( this, values, options );
        container.appendChild( curveInstance.element );
        element.appendChild( container );

        // Resize
        widget.onresize = curveInstance.redraw.bind( curveInstance );
        widget.curveInstance = curveInstance;

        doAsync(() => {
            curveInstance.canvas.width = container.offsetWidth;
            curveInstance.redraw();
        });

        return widget;
    }

    /**
     * @method addDial
     * @param {String} name Widget name
     * @param {Array of Array} values Array of 2N Arrays of each value of the dial
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Widget background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */

    addDial( name, values, callback, options = {} ) {

        let that = this;
        let widget = this.create_widget(name, Widget.DIAL, options);

        widget.onGetValue = () => {
            return JSON.parse(JSON.stringify(curveInstance.element.value));
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            let btn = element.querySelector( ".lexwidgetname .lexicon" );
            if( btn ) btn.style.display = ( newValue != curveInstance.element.value ? "block" : "none" );
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback ) that._trigger( new IEvent( name, curveInstance.element.value, null ), callback );
        };

        let element = widget.domEl;
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        // Add reset functionality
        if( widget.name && !(options.skipReset ?? false) )
        {
            Panel._add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                curveInstance.element.value = JSON.parse( JSON.stringify( defaultValues ) );
                curveInstance.redraw();
                that._trigger( new IEvent( name, curveInstance.element.value, e ), callback );
            });
        }

        // Add widget value

        var container = document.createElement( 'div' );
        container.className = "lexcurve";
        container.style.width = widget.name ? "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")" : '100%';

        options.callback = (v, e) => {
            let btn = element.querySelector(".lexwidgetname .lexicon");
            if(btn) btn.style.display = (v != defaultValues ? "block" : "none");
            that._trigger( new IEvent(name, v, e), callback );
        };

        options.name = name;

        let curveInstance = new Dial( this, values, options );
        container.appendChild( curveInstance.element );
        element.appendChild( container );

        // Resize
        widget.onresize = curveInstance.redraw.bind( curveInstance );
        widget.curveInstance = curveInstance;

        doAsync(() => {
            curveInstance.element.style.height = curveInstance.element.offsetWidth + "px";
            curveInstance.canvas.width = curveInstance.element.offsetWidth;
            container.style.width = curveInstance.element.offsetWidth + "px";
            curveInstance.canvas.height = curveInstance.canvas.width;
            curveInstance.redraw();
        });

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
        widget.onSetValue = ( newValue, skipCallback ) => {
            let btn = element.querySelector(".lexwidgetname .lexicon");
            if(btn) btn.style.display = (newValue != defaultValue ? "block" : "none");
            value = element.value = newValue;
            setLayers();
            if( !skipCallback ) that._trigger( new IEvent(name, value), callback );
        };

        let element = widget.domEl;

        // Add reset functionality
        Panel._add_reset_property(element.domName, function(e) {
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
     * innerValues (Array): Use dropdown mode and use values as options
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
        widget.onSetValue = ( newValue, skipCallback ) => {
            values = newValue;
            updateItems();
            if( !skipCallback ) this._trigger( new IEvent(name, values, null), callback );
        };

        let element = widget.domEl;
        element.style.flexWrap = "wrap";

        // Add dropdown array button

        const itemNameWidth = "4%";

        var container = document.createElement('div');
        container.className = "lexarray";
        container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        this.queue( container );

        const angle_down = `<a class='fa-solid fa-angle-down' style='float:right; margin-right: 3px;'></a>`;

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
                let baseclass = options.innerValues ? 'dropdown' : value.constructor;

                this.sameLine(2);

                switch(baseclass)
                {
                    case String:
                        this.addText(i + "", value, function(value, event) {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                    case Number:
                        this.addNumber(i + "", value, function(value, event) {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                    case 'dropdown':
                        this.addDropdown(i + "", options.innerValues, value, function(value, event) {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                }

                this.addButton( null, "<a class='lexicon fa-solid fa-trash'></a>", (v, event) => {
                    values.splice(values.indexOf( value ), 1);
                    updateItems();
                    this._trigger( new IEvent(name, values, event), callback );
                }, { title: "Remove item", className: 'micro'} );
            }

            buttonName = "Add item";
            buttonName += "<a class='fa-solid fa-plus' style='float:right; margin-right: 3px; margin-top: 2px;'></a>";
            this.addButton(null, buttonName, (v, event) => {
                values.push( options.innerValues ? options.innerValues[ 0 ] : "" );
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

        let widget = this.create_widget( name, Widget.LIST, options );

        widget.onGetValue = () => {
            return value;
        };
        widget.onSetValue = ( newValue, skipCallback ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );
            const idx = values.indexOf( newValue );
            if( idx == -1 ) return;
            listContainer.children[ idx ].classList.toggle( 'selected' );
            value = newValue;
            if( !skipCallback ) this._trigger( new IEvent( name, newValue ), callback );
        };

        widget.updateValues = ( newValues ) => {

            values = newValues;
            listContainer.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let itemValue = values[ i ];

                if( itemValue.constructor === Array )
                {
                    icon = itemValue[ 1 ];
                    itemValue = itemValue[ 0 ];
                }

                let listElement = document.createElement( 'div' );
                listElement.className = "lexlistitem" + ( value == itemValue ? " selected" : "" );
                listElement.innerHTML = "<span>" + itemValue + "</span>" + ( icon ? "<a class='" + icon + "'></a>" : "" );

                listElement.addEventListener( 'click', e => {
                    listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );
                    listElement.classList.toggle( 'selected' );
                    value = itemValue;
                    this._trigger( new IEvent( name, itemValue, e ), callback );
                });

                listContainer.appendChild( listElement );
            }
        };

        let element = widget.domEl;

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = "lexlist";
        listContainer.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        widget.updateValues( values );

        // Remove branch padding and margins
        if( !widget.name ) {
            element.className += " noname";
            listContainer.style.width = "100%";
        }

        element.appendChild( listContainer );

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

        value = value.replace( /\s/g, '' ).split( ',' );
        let defaultValue = [].concat( value );
        let widget = this.create_widget( name, Widget.TAGS, options );

        widget.onGetValue = () => {
            return [].concat( value );
        };
        widget.onSetValue = ( newValue, skipCallback ) => {
            value = [].concat( newValue );
            create_tags();
            let btn = element.querySelector( ".lexwidgetname .lexicon" );
            if( btn ) btn.style.display = ( newValue != defaultValue ? "block" : "none" );
            if( !skipCallback ) that._trigger( new IEvent( name, value ), callback );
        };

        let element = widget.domEl;
        let that = this;

        // Add reset functionality
        if(widget.name)
        {
            Panel._add_reset_property(element.domName, function(e) {
                this.style.display = "none";
                value = [].concat(defaultValue);
                create_tags();
                that._trigger( new IEvent(name, value, e), callback );
            });
        }

        // Show tags

        const tagsContainer = document.createElement('div');
        tagsContainer.className = "lextags";
        tagsContainer.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        const create_tags = () => {

            tagsContainer.innerHTML = "";

            for( let i = 0; i < value.length; ++i )
            {
                const tagName = value[i];
                const tag = document.createElement('span');
                tag.className = "lextag";
                tag.innerHTML = tagName;

                const removeButton = document.createElement('a');
                removeButton.className = "lextagrmb fa-solid fa-xmark lexicon";
                tag.appendChild( removeButton );

                removeButton.addEventListener( 'click', e => {
                    tag.remove();
                    value.splice( value.indexOf( tagName ), 1 );
                    let btn = element.querySelector( ".lexwidgetname .lexicon" );
                    if( btn ) btn.style.display = ( value != defaultValue ? "block" : "none" );
                    that._trigger( new IEvent( name, value, e ), callback );
                } );

                tagsContainer.appendChild( tag );
            }

            let tagInput = document.createElement( 'input' );
            tagInput.value = "";
            tagInput.placeholder = "Add tag...";
            tagsContainer.appendChild( tagInput );

            tagInput.onkeydown = function( e ) {
                const val = this.value.replace(/\s/g, '');
                if( e.key == ' ' || e.key == 'Enter' )
                {
                    e.preventDefault();
                    if( !val.length || value.indexOf( val ) > -1 )
                        return;
                    value.push( val );
                    create_tags();
                    let btn = element.querySelector( ".lexwidgetname .lexicon" );
                    if(btn) btn.style.display = "block";
                    that._trigger( new IEvent( name, value, e ), callback );
                }
            };

            tagInput.focus();
        }

        create_tags();

        // Remove branch padding and margins
        if( !widget.name )
        {
            element.className += " noname";
            tagsContainer.style.width = "100%";
        }

        element.appendChild( tagsContainer );

        return widget;
    }

    addMasonry() {

        let widget = this.create_widget( "masonry", 999 );
        let element = widget.domEl;

        element.innerHTML = `
            <div class="masonry">
            <div class="mitem _1">Item 1</div>
            <div class="mitem _2">Item 2</div>
            <div class="mitem _3">Item 3</div>
            <div class="mitem _4">Item 4</div>
            <div class="mitem _5">Item 5</div>
            <div class="mitem _6">Item 6</div>
            <div class="mitem _7">Item 7</div>
            <div class="mitem _8">Item 8</div>
            <div class="mitem _9">Item 9</div>
            <div class="mitem _10">Item 10</div>
        </div>`;

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
     * className: Customize colors
     */

    addCheckbox( name, value, callback, options = {} ) {

        if( !name )
        {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.CHECKBOX, options );

        widget.onGetValue = () => {
            return checkbox.checked;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            if( checkbox.checked !== newValue )
            {
                checkbox.checked = newValue;
                Panel._dispatch_event( checkbox, "change", skipCallback );
            }
        };

        let element = widget.domEl;

        // Add reset functionality
        Panel._add_reset_property( element.domName, function() {
            checkbox.checked = !checkbox.checked;
            Panel._dispatch_event( checkbox, "change" );
        });

        // Add widget value

        var container = document.createElement('div');
        container.className = "lexcheckboxcont";

        let checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.className = "lexcheckbox " + ( options.className ?? "" );
        checkbox.checked = value;
        checkbox.iValue = value;
        checkbox.disabled = options.disabled ?? false;

        let valueName = document.createElement( 'span' );
        valueName.className = "checkboxtext";
        valueName.innerHTML = "On";

        container.appendChild( checkbox );
        container.appendChild( valueName );

        checkbox.addEventListener( "change" , e => {

            const skipCallback = ( e.detail?.constructor == Number ? null : e.detail );

            // Reset button (default value)
            if( !skipCallback )
            {
                let btn = element.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = checkbox.checked != checkbox.iValue ? "block": "none";
            }

            // Open suboptions
            let submenu = element.querySelector( ".lexcheckboxsubmenu" );
            if( submenu ) submenu.toggleAttribute( 'hidden', !checkbox.checked );

            if( !skipCallback ) this._trigger( new IEvent( name, checkbox.checked, e ), callback );
        });

        element.appendChild( container );

        if( options.suboptions )
        {
            element.style.flexWrap = "wrap";
            let suboptions = document.createElement('div');
            suboptions.className = "lexcheckboxsubmenu";
            suboptions.toggleAttribute( 'hidden', !checkbox.checked );

            this.queue( suboptions );
            options.suboptions.call(this, this);
            this.clearQueue();

            element.appendChild( suboptions );
        }

        return widget;
    }

    /**
     * @method addToggle
     * @param {String} name Widget name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * disabled: Make the widget disabled [false]
     * suboptions: Callback to add widgets in case of TRUE value
     * className: Customize colors
     */

    addToggle( name, value, callback, options = {} ) {

        if( !name )
        {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.TOGGLE, options );

        widget.onGetValue = () => {
            return toggle.checked;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            if( toggle.checked !== newValue )
            {
                toggle.checked = newValue;
                Panel._dispatch_event( toggle, "change", skipCallback );
            }
        };

        let element = widget.domEl;

        // Add reset functionality
        Panel._add_reset_property( element.domName, function() {
            toggle.checked = !toggle.checked;
            Panel._dispatch_event( toggle, "change" );
        });

        // Add widget value

        var container = document.createElement('div');
        container.className = "lextogglecont";

        let toggle = document.createElement('input');
        toggle.type = "checkbox";
        toggle.className = "lextoggle " + ( options.className ?? "" );
        toggle.checked = value;
        toggle.iValue = value;
        toggle.disabled = options.disabled ?? false;

        let valueName = document.createElement( 'span' );
        valueName.className = "toggletext";
        valueName.innerHTML = "On";

        container.appendChild( toggle );
        container.appendChild( valueName );

        toggle.addEventListener( "change" , e => {

            const skipCallback = ( e.detail?.constructor == Number ? null : e.detail );

            // Reset button (default value)
            if( !skipCallback )
            {
                let btn = element.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = toggle.checked != toggle.iValue ? "block": "none";
            }

            // Open suboptions
            let submenu = element.querySelector( ".lextogglesubmenu" );
            if( submenu ) submenu.toggleAttribute( 'hidden', !toggle.checked );

            if( !skipCallback ) this._trigger( new IEvent( name, toggle.checked, e ), callback );
        });

        element.appendChild( container );

        if( options.suboptions )
        {
            element.style.flexWrap = "wrap";
            let suboptions = document.createElement('div');
            suboptions.className = "lextogglesubmenu";
            suboptions.toggleAttribute( 'hidden', !toggle.checked );

            this.queue( suboptions );
            options.suboptions.call(this, this);
            this.clearQueue();

            element.appendChild( suboptions );
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

        if( !name ) {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.COLOR, options );

        widget.onGetValue = () => {
            return color.value;
        };
        widget.onSetValue = ( newValue, skipCallback ) => {
            color.value = newValue;
            Panel._dispatch_event( color, "input", skipCallback );
        };

        let element = widget.domEl;
        let change_from_input = false;

        // Add reset functionality
        Panel._add_reset_property( element.domName, function() {
            this.style.display = "none";
            color.value = color.iValue;
            Panel._dispatch_event( color, "input" );
        });

        // Add widget value

        var container = document.createElement( 'span' );
        container.className = "lexcolor";
        container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        let color = document.createElement( 'input' );
        color.style.width = "32px";
        color.type = 'color';
        color.className = "colorinput";
        color.id = "color" + simple_guidGenerator();
        color.useRGB = options.useRGB ?? false;
        color.value = color.iValue = value.constructor === Array ? rgbToHex( value ) : value;

        if( options.disabled ) {
            color.disabled = true;
        }

        color.addEventListener( "input", e => {
            let val = e.target.value;

            const skipCallback = e.detail;

            // Change value (always hex)
            if( !change_from_input )
                text_widget.set( val );

            // Reset button (default value)
            if( !skipCallback )
            {
                let btn = element.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = val != color.iValue ? "block": "none";
            }

            if( color.useRGB )
                val = hexToRgb( val );

            if( !skipCallback ) this._trigger( new IEvent( name, val, e ), callback );
        }, false );

        container.appendChild( color );

        this.queue( container );

        const text_widget = this.addText( null, color.value, v => {
            change_from_input = true;
            widget.set( v );
            change_from_input = false;
        }, { width: "calc( 100% - 32px )"});

        text_widget.domEl.style.marginLeft = "4px";

        this.clearQueue();

        element.appendChild( container );

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
     * units: Unit as string added to the end of the value
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addNumber( name, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.NUMBER, options );

        widget.onGetValue = () => {
            return +vecinput.value;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            vecinput.value = round( newValue, options.precision );
            Panel._dispatch_event( vecinput, "change", skipCallback );
        };

        let element = widget.domEl;

        // add reset functionality
        if( widget.name ) {
            Panel._add_reset_property( element.domName, function() {
                this.style.display = "none";
                vecinput.value = vecinput.iValue;
                Panel._dispatch_event( vecinput, "change" );
            });
        }

        // add widget value

        var container = document.createElement( 'div' );
        container.className = "lexnumber";
        container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        let box = document.createElement( 'div' );
        box.className = "numberbox";

        let vecinput = document.createElement( 'input' );
        vecinput.id = "number_" + simple_guidGenerator();
        vecinput.className = "vecinput";
        vecinput.min = options.min ?? -1e24;
        vecinput.max = options.max ?? 1e24;
        vecinput.step = options.step ?? "any";
        vecinput.type = "number";

        if( value.constructor == Number )
        {
            value = clamp( value, +vecinput.min, +vecinput.max );
            value = round( value, options.precision );
        }

        vecinput.value = vecinput.iValue = value;
        box.appendChild( vecinput );

        if( options.units )
        {
            let unitSpan = document.createElement( 'span' );
            unitSpan.className = "lexunit";
            unitSpan.innerText = options.units;
            unitSpan.style.left = measureRealWidth( vecinput.value ) + "px";
            vecinput.unitSpan = unitSpan;
            box.appendChild( unitSpan );
        }

        let dragIcon = document.createElement( 'a' );
        dragIcon.className = "fa-solid fa-arrows-up-down drag-icon hidden";
        box.appendChild( dragIcon );

        if( options.disabled )
        {
            vecinput.disabled = true;
        }

        // Add slider below
        if( !options.skipSlider && options.min !== undefined && options.max !== undefined )
        {
            let slider = document.createElement( 'input' );
            slider.className = "lexinputslider";
            slider.min = options.min;
            slider.max = options.max;
            slider.step = options.step ?? 1;
            slider.type = "range";
            slider.value = value;

            slider.addEventListener( "input", function( e ) {
                let new_value = +this.valueAsNumber;
                vecinput.value = round( new_value, options.precision );
                Panel._dispatch_event( vecinput, "change" );
            }, false );

            slider.addEventListener( "mousedown", function( e ) {
                if( options.onPress )
                {
                    options.onPress.bind( slider )( e, slider );
                }
            }, false );

            slider.addEventListener( "mouseup", function( e ) {
                if( options.onRelease )
                {
                    options.onRelease.bind( slider )( e, slider );
                }
            }, false );

            box.appendChild( slider );

            // Method to change min, max, step parameters
            widget.setLimits = ( newMin, newMax, newStep ) => {
                vecinput.min = slider.min = newMin ?? vecinput.min;
                vecinput.max = slider.max = newMax ?? vecinput.max;
                vecinput.step = newStep ?? vecinput.step;
                slider.step = newStep ?? slider.step;
                Panel._dispatch_event( vecinput, "change", true );
            };
        }

        vecinput.addEventListener( "input", function( e ) {
            let new_value = +this.valueAsNumber;
            vecinput.value = round( new_value, options.precision );
            if( options.units )
            {
                vecinput.unitSpan.style.left = measureRealWidth( vecinput.value ) + "px";
            }
        }, false );

        vecinput.addEventListener( "wheel", function( e ) {
            e.preventDefault();
            if( this !== document.activeElement )
            {
                return;
            }
            let mult = options.step ?? 1;
            if( e.shiftKey ) mult *= 10;
            else if( e.altKey ) mult *= 0.1;
            let new_value = ( +this.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ) );
            this.value = round( new_value, options.precision );
            Panel._dispatch_event(vecinput, "change");
        }, { passive: false });

        vecinput.addEventListener( "change", e => {

            if( isNaN( e.target.valueAsNumber ) )
            {
                return;
            }

            const skipCallback = e.detail;

            let val = e.target.value = clamp( +e.target.valueAsNumber, +vecinput.min, +vecinput.max );
            val = options.precision ? round( val, options.precision ) : val;

            // Update slider!
            if( box.querySelector( ".lexinputslider" ) )
            {
                box.querySelector( ".lexinputslider" ).value = val;
            }

            vecinput.value = val;

            if( options.units )
            {
                vecinput.unitSpan.style.left = measureRealWidth( vecinput.value ) + "px";
            }

            // Reset button (default value)
            if( !skipCallback )
            {
                let btn = element.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = val != vecinput.iValue ? "block": "none";
            }

            if( !skipCallback ) this._trigger( new IEvent( name, val, e ), callback );
        }, { passive: false });

        // Add drag input

        vecinput.addEventListener( "mousedown", inner_mousedown );

        var that = this;

        function inner_mousedown( e )
        {
            if( document.activeElement == vecinput )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', inner_mousemove );
            doc.addEventListener( 'mouseup', inner_mouseup );
            document.body.classList.add( 'noevents' );
            dragIcon.classList.remove( 'hidden' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            if( !document.pointerLockElement )
            {
                vecinput.requestPointerLock();
            }

            if( options.onPress )
            {
                options.onPress.bind( vecinput )( e, vecinput );
            }
        }

        function inner_mousemove( e )
        {
            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if( e.shiftKey ) mult *= 10;
                else if( e.altKey ) mult *= 0.1;
                let new_value = ( +vecinput.valueAsNumber + mult * dt );
                vecinput.value = ( +new_value ).toFixed( 4 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' );
                Panel._dispatch_event( vecinput, "change" );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', inner_mousemove );
            doc.removeEventListener( 'mouseup', inner_mouseup );
            document.body.classList.remove( 'noevents' );
            dragIcon.classList.add( 'hidden' );

            if( document.pointerLockElement )
            {
                document.exitPointerLock();
            }

            if( options.onRelease )
            {
                options.onRelease.bind( vecinput )( e, vecinput );
            }
        }

        container.appendChild( box );
        element.appendChild( container );

        // Remove branch padding and margins
        if( !widget.name )
        {
            element.className += " noname";
            container.style.width = "100%";
        }

        return widget;
    }

    static VECTOR_COMPONENTS = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };

    _add_vector( num_components, name, value, callback, options = {} ) {

        num_components = clamp( num_components, 2, 4 );
        value = value ?? new Array( num_components ).fill( 0 );

        if( !name )
        {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.VECTOR, options );

        widget.onGetValue = () => {
            let inputs = element.querySelectorAll( "input" );
            let value = [];
            for( var v of inputs )
            {
                value.push( +v.value );
            }
            return value;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            const inputs = element.querySelectorAll( ".vecinput" );
            if( inputs.length == newValue.length )
            {
                console.error( "Input length does not match vector length." );
                return;
            }

            for( let i = 0; i < inputs.length; ++i ) {
                let value = newValue[ i ];
                inputs[ i ].value = round( value, options.precision ) ?? 0;
                Panel._dispatch_event( inputs[ i ], "change", skipCallback );
            }
        };

        let element = widget.domEl;

        // Add reset functionality
        Panel._add_reset_property( element.domName, function() {
            this.style.display = "none";
            for( let v of element.querySelectorAll( ".vecinput" ) ) {
                v.value = v.iValue;
                Panel._dispatch_event( v, "change" );
            }
        });

        // Add widget value

        var container = document.createElement( 'div' );
        container.className = "lexvector";
        container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        for( let i = 0; i < num_components; ++i ) {

            let box = document.createElement( 'div' );
            box.className = "vecbox";
            box.innerHTML = "<span class='" + Panel.VECTOR_COMPONENTS[ i ] + "'></span>";

            let vecinput = document.createElement( 'input' );
            vecinput.className = "vecinput v" + num_components;
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "vec" + num_components + "_" + simple_guidGenerator();
            vecinput.idx = i;

            if( value[ i ].constructor == Number )
            {
                value[ i ] = clamp( value[ i ], +vecinput.min, +vecinput.max );
                value[ i ] = round( value[ i ], options.precision );
            }

            vecinput.value = vecinput.iValue = value[ i ];

            let dragIcon = document.createElement( 'a' );
            dragIcon.className = "fa-solid fa-arrows-up-down drag-icon hidden";
            box.appendChild( dragIcon );

            if( options.disabled )
            {
                vecinput.disabled = true;
            }

            // Add wheel input
            vecinput.addEventListener( "wheel", function( e ) {
                e.preventDefault();
                if( this !== document.activeElement )
                    return;
                let mult = options.step ?? 1;
                if( e.shiftKey ) mult = 10;
                else if( e.altKey ) mult = 0.1;

                if( locker.locked )
                {
                    for( let v of element.querySelectorAll(".vecinput") )
                    {
                        v.value = round( +v.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                        Panel._dispatch_event( v, "change" );
                    }
                }
                else
                {
                    this.value = round( +this.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                    Panel._dispatch_event( vecinput, "change" );
                }
            }, { passive: false } );

            vecinput.addEventListener( "change", e => {

                if( isNaN( e.target.value ) )
                {
                    return;
                }

                const skipCallback = e.detail;

                let val = e.target.value = clamp( e.target.value, +vecinput.min, +vecinput.max );
                val = round( val, options.precision );

                // Reset button (default value)
                if( !skipCallback )
                {
                    let btn = element.querySelector( ".lexwidgetname .lexicon" );
                    if( btn ) btn.style.display = val != vecinput.iValue ? "block" : "none";
                }

                if( locker.locked )
                {
                    for( let v of element.querySelectorAll( ".vecinput" ) ) {
                        v.value = val;
                        value[ v.idx ] = val;
                    }
                }
                else
                {
                    vecinput.value = val;
                    value[ e.target.idx ] = val;
                }

                if( !skipCallback ) this._trigger( new IEvent( name, value, e ), callback );
            }, false );

            // Add drag input

            vecinput.addEventListener( "mousedown", inner_mousedown );

            var that = this;

            function inner_mousedown( e )
            {
                if( document.activeElement == vecinput )
                {
                    return;
                }

                var doc = that.root.ownerDocument;
                doc.addEventListener( 'mousemove', inner_mousemove );
                doc.addEventListener( 'mouseup', inner_mouseup );
                document.body.classList.add( 'noevents' );
                dragIcon.classList.remove( 'hidden' );
                e.stopImmediatePropagation();
                e.stopPropagation();

                if( !document.pointerLockElement )
                {
                    vecinput.requestPointerLock();
                }

                if( options.onPress )
                {
                    options.onPress.bind( vecinput )( e, vecinput );
                }
            }

            function inner_mousemove( e )
            {
                let dt = -e.movementY;

                if ( dt != 0 )
                {
                    let mult = options.step ?? 1;
                    if( e.shiftKey ) mult = 10;
                    else if( e.altKey ) mult = 0.1;

                    if( locker.locked )
                    {
                        for( let v of element.querySelectorAll( ".vecinput" ) ) {
                            v.value = round( +v.valueAsNumber + mult * dt, options.precision );
                            Panel._dispatch_event( v, "change" );
                        }
                    }
                    else
                    {
                        vecinput.value = round( +vecinput.valueAsNumber + mult * dt, options.precision );
                        Panel._dispatch_event( vecinput, "change" );
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            function inner_mouseup( e )
            {
                var doc = that.root.ownerDocument;
                doc.removeEventListener( 'mousemove', inner_mousemove );
                doc.removeEventListener( 'mouseup', inner_mouseup );
                document.body.classList.remove( 'noevents' );
                dragIcon.classList.add('hidden');

                if( document.pointerLockElement )
                {
                    document.exitPointerLock();
                }

                if( options.onRelease )
                {
                    options.onRelease.bind( vecinput )( e, vecinput );
                }
            }

            box.appendChild( vecinput );
            container.appendChild( box );
        }

        // Method to change min, max, step parameters
        if( options.min !== undefined || options.max !== undefined )
        {
            widget.setLimits = ( newMin, newMax, newStep ) => {
                const inputs = element.querySelectorAll(".vecinput");
                for( let v of inputs )
                {
                    v.min = newMin ?? v.min;
                    v.max = newMax ?? v.max;
                    v.step = newStep ?? v.step;
                    Panel._dispatch_event( v, "change", true );
                }

                // To call onChange callback
                this._trigger( new IEvent( name, value ), callback );
            };
        }

        let locker = document.createElement( 'a' );
        locker.title = "Lock";
        locker.className = "fa-solid fa-lock-open lexicon lock";
        container.appendChild( locker );
        locker.addEventListener( "click", function( e ) {
            this.locked = !this.locked;
            if( this.locked )
            {
                this.classList.add( "fa-lock" );
                this.classList.remove( "fa-lock-open" );
            }
            else
            {
                this.classList.add( "fa-lock-open" );
                this.classList.remove( "fa-lock" );
            }
        }, false );

        element.appendChild( container );

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
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse is released
     */

    addVector2( name, value, callback, options ) {

        return this._add_vector( 2, name, value, callback, options );
    }

    addVector3( name, value, callback, options ) {

        return this._add_vector( 3, name, value, callback, options );
    }

    addVector4( name, value, callback, options ) {

        return this._add_vector( 4, name, value, callback, options );
    }

    /**
     * @method addSize
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * disabled: Make the widget disabled [false]
     * units: Unit as string added to the end of the value
     */

    addSize( name, value, callback, options = {} ) {

        let widget = this.create_widget( name, Widget.SIZE, options );

        widget.onGetValue = () => {
            const value = [];
            for( let i = 0; i < element.dimensions.length; ++i )
            {
                value.push( element.dimensions[ i ].onGetValue() );
            }
            return value;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            for( let i = 0; i < element.dimensions.length; ++i )
            {
                element.dimensions[ i ].onSetValue( newValue[ i ], skipCallback );
            }
        };

        let element = widget.domEl;

        this.queue( element );

        element.aspectRatio = ( value.length == 2 ? value[ 0 ] / value[ 1 ] : null );
        element.dimensions = [];

        for( let i = 0; i < value.length; ++i )
        {
            element.dimensions[ i ] = this.addNumber( null, value[ i ], ( v ) => {

                const value = widget.onGetValue();

                if( element.locked )
                {
                    const ar = ( i == 0 ? 1.0 / element.aspectRatio : element.aspectRatio );
                    const index = ( 1 + i ) % 2;
                    value[ index ] = v * ar;
                    element.dimensions[ index ].onSetValue( value[ index ], true );
                }

                if( callback )
                {
                    callback( value );
                }

            }, { min: 0, disabled: options.disabled, precision: options.precision } );

            if( ( i + 1 ) != value.length )
            {
                let cross = document.createElement( 'a' );
                cross.className = "lexsizecross fa-solid fa-xmark";
                element.appendChild( cross );
            }
        }

        this.clearQueue();

        if( options.units )
        {
            let unitSpan = document.createElement( 'span' );
            unitSpan.className = "lexunit";
            unitSpan.innerText = options.units;
            element.appendChild( unitSpan );
        }

        // Lock aspect ratio
        if( element.aspectRatio )
        {
            let locker = document.createElement( 'a' );
            locker.title = "Lock Aspect Ratio";
            locker.className = "fa-solid fa-lock-open lexicon lock";
            element.appendChild( locker );
            locker.addEventListener( "click", function( e ) {
                element.locked = !element.locked;
                if( element.locked )
                {
                    this.classList.add( "fa-lock" );
                    this.classList.remove( "fa-lock-open" );

                    // Recompute ratio
                    const value = widget.onGetValue();
                    element.aspectRatio = value[ 0 ] / value[ 1 ];
                }
                else
                {
                    this.classList.add( "fa-lock-open" );
                    this.classList.remove( "fa-lock" );
                }
            }, false );
        }

        // Remove branch padding and margins
        if( !widget.name )
        {
            element.className += " noname";
            container.style.width = "100%";
        }

        return widget;
    }

    /**
     * @method addPad
     * @param {String} name Widget name
     * @param {Array} value Pad value
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * padSize: Size of the pad (css)
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addPad( name, value, callback, options = {} ) {

        if( !name )
        {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.PAD, options );

        widget.onGetValue = () => {
            return thumb.value.xy;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, thumb.value.xy ), callback );
            }
        };

        let element = widget.domEl;

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        container.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';

        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new LX.vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;

        let _updateValue = v => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new LX.vec2( remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

        doAsync( () => {
            _updateValue( thumb.value )
        } );

        pad.appendChild( thumb );
        container.appendChild( pad );
        element.appendChild( container );

        pad.addEventListener( "mousedown", innerMouseDown );

        let that = this;

        function innerMouseDown( e )
        {
            if( document.activeElement == thumb )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'nocursor' );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            if( options.onPress )
            {
                options.onPress.bind( thumb )( e, thumb );
            }
        }

        function innerMouseMove( e )
        {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new LX.vec2( e.x - rect.x, e.y - rect.y );
            relativePosition.clp( 0.0, pad.offsetWidth, relativePosition);
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = relativePosition.div( new LX.vec2( pad.offsetWidth, pad.offsetHeight ) );

            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
            thumb.value = new LX.vec2( remapRange( value0to1.x, 0.0, 1.0, thumb.min, thumb.max ), remapRange( value0to1.y, 0.0, 1.0, thumb.min, thumb.max ) );

            that._trigger( new IEvent( name, thumb.value.xy, e ), callback );

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            document.body.classList.remove( 'noevents' );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        return widget;
    }

    /**
     * @method addProgress
     * @param {String} name Widget name
     * @param {Number} value Progress value
     * @param {*} options:
     * min, max: Min and Max values
     * low, optimum, high: Low and High boundary values, Optimum point in the range
     * showValue: Show current value
     * editable: Allow edit value
     * callback: Function called on change value
     */

    addProgress( name, value, options = {} ) {

        if( !name )
        {
            throw("Set Widget Name!");
        }

        let widget = this.create_widget( name, Widget.PROGRESS, options );

        widget.onGetValue = () => {
            return progress.value;
        };
        widget.onSetValue = ( newValue, skipCallback ) => {
            element.querySelector("meter").value = newValue;
            _updateColor();
            if( element.querySelector("span") )
            {
                element.querySelector("span").innerText = newValue;
            }
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
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;

        const _updateColor = () => {

            let backgroundColor = LX.getThemeColor( "global-selected" );

            if( progress.low != undefined && progress.value < progress.low )
            {
                backgroundColor = LX.getThemeColor( "global-color-error" );
            }
            else if( progress.high != undefined && progress.value < progress.high )
            {
                backgroundColor = LX.getThemeColor( "global-color-warning" );
            }

            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };

        container.appendChild( progress );
        element.appendChild( container );

        if( options.showValue )
        {
            if( document.getElementById('progressvalue-' + name ) )
            {
                document.getElementById('progressvalue-' + name ).remove();
            }

            let span = document.createElement("span");
            span.id = "progressvalue-" + name;
            span.style.padding = "0px 5px";
            span.innerText = value;
            container.appendChild( span );
        }

        if( options.editable )
        {
            progress.classList.add( "editable" );
            progress.addEventListener( "mousedown", inner_mousedown );

            const that = this;

            function inner_mousedown( e )
            {
                var doc = that.root.ownerDocument;
                doc.addEventListener( 'mousemove', inner_mousemove );
                doc.addEventListener( 'mouseup', inner_mouseup );
                document.body.classList.add( 'noevents' );
                progress.classList.add( "grabbing" );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = round( remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                that.setValue( name, newValue );
            }

            function inner_mousemove( e )
            {
                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = round( remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max ) );
                    that.setValue( name, newValue );

                    if( options.callback )
                    {
                        options.callback( newValue, e );
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            function inner_mouseup( e )
            {
                var doc = that.root.ownerDocument;
                doc.removeEventListener( 'mousemove', inner_mousemove );
                doc.removeEventListener( 'mouseup', inner_mouseup );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( "grabbing" );
            }
        }

        _updateColor();

        return widget;
    }

    /**
     * @method addFile
     * @param {String} name Widget name
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * local: Ask for local file
     * disabled: Make the widget disabled [false]
     * read: Return the file itself (False) or the contents (True)
     * type: type to read as [text (Default), buffer, bin, url]
     */

    addFile( name, callback, options = { } ) {

        if( !name )
        {
            throw( "Set Widget Name!" );
        }

        let widget = this.create_widget( name, Widget.FILE, options );
        let element = widget.domEl;

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = "lexfileinput";
        input.style.width = "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + " - 10%)";
        input.type = 'file';
        input.disabled = options.disabled ?? false;

        if( options.placeholder )
        {
            input.placeholder = options.placeholder;
        }

        input.addEventListener( 'change', function( e ) {

            const files = e.target.files;
            if( !files.length ) return;
            if( read )
            {
                if( options.onBeforeRead )
                    options.onBeforeRead();

                const reader = new FileReader();

                if( type === 'text' ) reader.readAsText( files[ 0 ] );
                else if( type === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( type === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( type === 'url' ) reader.readAsDataURL( files[ 0 ] );

                reader.onload = e => { callback.call( this, e.target.result, files[ 0 ] ) } ;
            }
            else
                callback( files[ 0 ] );
        });

        input.addEventListener( 'cancel', function( e ) {

            callback( null );
        });

        element.appendChild( input );

        this.queue( element );

        if( local )
        {
            let settingsDialog = null;

            this.addButton(null, "<a style='margin-top: 0px;' class='fa-solid fa-gear'></a>", () => {

                if( settingsDialog )
                {
                    return;
                }

                settingsDialog = new Dialog( "Load Settings", p => {
                    p.addDropdown( "Type", [ 'text', 'buffer', 'bin', 'url' ], type, v => { type = v } );
                    p.addButton( null, "Reload", v => { input.dispatchEvent( new Event( 'change' ) ) } );
                }, { onclose: ( root ) => { root.remove(); settingsDialog = null; } } );

            }, { className: "micro", skipInlineCount: true, title: "Settings" });
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
     * @param {Array} tabs Contains objects with {
     *      name: Name of the tab (if icon, use as title)
     *      icon: Icon to be used as the tab icon (optional)
     *      onCreate: Func to be called at tab creation
     *      onSelect: Func to be called on select tab (optional)
     * }
     * @param {*} options
     * vertical: Use vertical or horizontal tabs (vertical by default)
     * showNames: Show tab name only in horizontal tabs
     */

    addTabs( tabs, options = {} ) {

        let root = this.current_branch ? this.current_branch.content : this.root;

        if( !this.current_branch )
        {
            console.warn("No current branch!");
        }

        if( tabs.constructor != Array )
        {
            throw( "Param @tabs must be an Array!" );
        }

        const vertical = options.vertical ?? true;
        const showNames = !vertical && ( options.showNames ?? false );

        let container = document.createElement( 'div' );
        container.className = "lextabscontainer";
        if( !vertical )
        {
            container.className += " horizontal";
        }

        let tabContainer = document.createElement( 'div' );
        tabContainer.className = 'tabs';
        container.appendChild( tabContainer );
        root.appendChild( container );

        for( let i = 0; i < tabs.length; ++i )
        {
            const tab = tabs[ i ];
            console.assert( tab.name );
            const isSelected = ( i == 0 );
            let tabEl = document.createElement( 'div' );
            tabEl.className = "lextab " + (i == tabs.length - 1 ? "last" : "") + ( isSelected ? "selected" : "" );
            tabEl.innerHTML = ( showNames ? tab.name : "" ) + "<a class='" + ( tab.icon || "fa fa-hashtag" ) + " " + (showNames ? "withname" : "") + "'></a>";
            tabEl.title = tab.name;

            let infoContainer = document.createElement( 'div' );
            infoContainer.id = tab.name.replace( /\s/g, '' );
            infoContainer.className = "widgets";

            if(!isSelected)
            {
                infoContainer.toggleAttribute('hidden', true);
            }

            container.appendChild( infoContainer );

            tabEl.addEventListener( 'click', e => {

                // Change selected tab
                tabContainer.querySelectorAll( '.lextab' ).forEach( e => { e.classList.remove( 'selected' ); } );
                e.target.classList.add( 'selected' );
                // Hide all tabs content
                container.querySelectorAll(".widgets").forEach( e => { e.toggleAttribute( 'hidden', true ); } );
                // Show tab content
                const el = container.querySelector( '#' + infoContainer.id );
                el.toggleAttribute( 'hidden' );

                if( tab.onSelect )
                {
                    tab.onSelect( this, infoContainer );
                }
            });

            tabContainer.appendChild( tabEl );

            if( tab.onCreate )
            {
                // push to tab space
                this.queue( infoContainer );
                tab.onCreate( this, infoContainer );
                this.clearQueue();
            }
        }

        this.addSeparator();
    }

    /**
     * @method addCounter
     * @param {String} name Widget name
     * @param {Number} value Counter value
     * @param {Function} callback Callback function on change
     * @param {*} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * step: Step for adding/substracting
     * label: Text to show below the counter
     */

    addCounter( name, value, callback, options = { } ) {

        let widget = this.create_widget( name, Widget.COUNTER, options );

        widget.onGetValue = () => {
            return counterText.count;
        };

        widget.onSetValue = ( newValue, skipCallback ) => {
            _onChange( newValue, skipCallback );
        };

        let element = widget.domEl;

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const _onChange = ( value, skipCallback, event ) => {
            value = clamp( value, min, max );
            counterText.count = value;
            counterText.innerHTML = value;
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        }

        const container = document.createElement( 'div' );
        container.className = "lexcounter";
        element.appendChild( container );

        this.queue( container );

        this.addButton(null, "<a style='margin-top: 0px;' class='fa-solid fa-minus'></a>", (value, e) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            _onChange( counterText.count - mult, false, e );
        }, { className: "micro", skipInlineCount: true, title: "Minus" });

        this.clearQueue();

        const containerBox = document.createElement( 'div' );
        containerBox.className = "lexcounterbox";
        container.appendChild( containerBox );

        const counterText = document.createElement( 'span' );
        counterText.className = "lexcountervalue";
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild( counterText );

        if( options.label )
        {
            const counterLabel = document.createElement( 'span' );
            counterLabel.className = "lexcounterlabel";
            counterLabel.innerHTML = options.label;
            containerBox.appendChild( counterLabel );
        }

        this.queue( container );

        this.addButton(null, "<a style='margin-top: 0px;' class='fa-solid fa-plus'></a>", (value, e) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            _onChange( counterText.count + mult, false, e );
        }, { className: "micro", skipInlineCount: true, title: "Plus" });

        this.clearQueue();

        return widget;
    }
}

LX.Panel = Panel;

/**
 * @class Branch
 */

class Branch {

    constructor( name, options = {} ) {

        this.name = name;

        var root = document.createElement( 'div' );
        root.className = "lexbranch";
        if( options.id )
        {
            root.id = options.id;
        }
        if( options.className )
        {
            root.className += " " + options.className;
        }

        root.style.width = "calc(100% - 7px)";
        root.style.margin = "0 auto";

        var that = this;

        this.root = root;
        this.widgets = [];

        // create element
        var title = document.createElement( 'div' );
        title.className = "lexbranchtitle";

        title.innerHTML = "<a class='fa-solid fa-angle-up switch-branch-button'></a>";
        if( options.icon )
        {
            title.innerHTML += "<a class='branchicon " + options.icon + "' style='margin-right: 8px; margin-bottom: -2px;'>";
        }
        title.innerHTML += name || "Branch";

        root.appendChild( title );

        var branchContent = document.createElement( 'div' );
        branchContent.id = name.replace(/\s/g, '');
        branchContent.className = "lexbranchcontent";
        root.appendChild(branchContent);
        this.content = branchContent;

        this._addBranchSeparator();

        if( options.closed )
        {
            title.className += " closed";
            root.className += " closed";
            this.grabber.setAttribute('hidden', true);
            doAsync( () => {
                this.content.setAttribute( 'hidden', true );
            }, 15 );
        }

        this.onclick = function( e ) {
            e.stopPropagation();
            this.classList.toggle( 'closed' );
            this.parentElement.classList.toggle( 'closed' );

            that.content.toggleAttribute( 'hidden' );
            that.grabber.toggleAttribute( 'hidden' );

            LX.emit( "@on_branch_closed", this.classList.contains("closed"), { target: that.panel } );
        };

        this.oncontextmenu = function( e ) {

            e.preventDefault();
            e.stopPropagation();

            if( this.parentElement.classList.contains("dialog") )
            {
                return;
            }

            addContextMenu("Dock", e, p => {
                e.preventDefault();
                // p.add('<i class="fa-regular fa-window-maximize">', {id: 'dock_options0'});
                // p.add('<i class="fa-regular fa-window-maximize fa-rotate-180">', {id: 'dock_options1'});
                // p.add('<i class="fa-regular fa-window-maximize fa-rotate-90">', {id: 'dock_options2'});
                // p.add('<i class="fa-regular fa-window-maximize fa-rotate-270">', {id: 'dock_options3'});
                p.add( 'Floating', that._on_make_floating.bind( that ) );
            }, { icon: "fa-regular fa-window-restore" });
        };

        title.addEventListener( 'click', this.onclick );
        title.addEventListener( 'contextmenu', this.oncontextmenu );
    }

    _on_make_floating() {

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

    _addBranchSeparator() {

        const element = document.createElement('div');
        element.className = "lexwidgetseparator";
        element.style.width = "100%";
        element.style.background = "none";

        const grabber = document.createElement('div');
        grabber.innerHTML = "&#9662;";
        element.appendChild(grabber);

        doAsync( () => {
            grabber.style.marginLeft = ((parseFloat(LX.DEFAULT_NAME_WIDTH) / 100.0) * this.content.offsetWidth) + "px";
        }, 10 )

        const line = document.createElement('div');
        line.style.width = "1px";
        line.style.marginLeft = "6px";
        line.style.marginTop = "2px";
        line.style.height = "0px"; // get in time
        grabber.appendChild( line );
        grabber.addEventListener( "mousedown", innerMouseDown );

        this.grabber = grabber;

        function getBranchHeight() {
            return that.root.offsetHeight - that.root.children[0].offsetHeight;
        }

        let that = this;

        function innerMouseDown( e )
        {
            var doc = that.root.ownerDocument;
            doc.addEventListener("mouseup", innerMouseUp);
            doc.addEventListener("mousemove", innerMouseMove);
            e.stopPropagation();
            e.preventDefault();
            const h = getBranchHeight();
            line.style.height = (h-3) + "px";
            document.body.classList.add('nocursor');
        }

        function innerMouseMove(e)
        {
            let dt = e.movementX;

            if ( dt != 0 )
            {
                const margin = parseFloat( grabber.style.marginLeft );
                grabber.style.marginLeft = clamp( margin + dt, 32, that.content.offsetWidth - 32 ) + "px";
            }
        }

        function innerMouseUp(e)
        {
            that._updateWidgets();

            line.style.height = "0px";

            var doc = that.root.ownerDocument;
            doc.removeEventListener("mouseup", innerMouseUp);
            doc.removeEventListener("mousemove", innerMouseMove);
            document.body.classList.remove('nocursor');
        }

        this.content.appendChild( element );
    }

    _updateWidgets() {

        var size = this.grabber.style.marginLeft;

        // Update sizes of widgets inside
        for(var i = 0; i < this.widgets.length; i++) {

            let widget = this.widgets[ i ];
            let element = widget.domEl;

            if( element.children.length < 2 )
            {
                continue;
            }

            var name = element.children[ 0 ];
            var value = element.children[ 1 ];

            name.style.width = size;
            let padding = "0px";
            switch( widget.type )
            {
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

            if( widget.onresize )
            {
                widget.onresize();
            }
        }
    }
};

LX.Branch = Branch;

/**
 * @class Dialog
 */

class Dialog {

    static _last_id = 0;

    constructor( title, callback, options = {} ) {

        if( !callback )
        {
            console.warn("Content is empty, add some widgets using 'callback' parameter!");
        }

        this._oncreate = callback;
        this.id = simple_guidGenerator();

        const size = options.size ?? [],
            position = options.position ?? [],
            draggable = options.draggable ?? true,
            modal = options.modal ?? false;

        if( modal )
        {
            LX.modal.toggle( false );
        }

        var root = document.createElement('div');
        root.className = "lexdialog " + (options.class ?? "");
        root.id = options.id ?? "dialog" + Dialog._last_id++;
        LX.root.appendChild( root );

        let that = this;

        var titleDiv = document.createElement('div');

        if( title )
        {
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

                    const _getNextPanel = function( area ) {
                        let p = area.panels[ 0 ];
                        if( p ) return p;
                        for(var s of area.sections){
                            p = _getNextPanel( s );
                            if( p ) return p;
                        }
                    }

                    const _appendBranch = function( panel ) {
                        let branch = panel.branches.find( b => b.name === title );
                        if( !branch )
                        {
                            panel.branch( title );
                            branch = panel.branches.find( b => b.name === title );
                        }
                        else
                        {
                            panel.root.appendChild( branch.root );
                        }

                        for( let w of that.widgets )
                        {
                            branch.content.appendChild( w.domEl );
                        }

                        branch.widgets = that.widgets;

                        // Make new last the last branch
                        panel.root.querySelectorAll(".lexbranch.last").forEach( e => { e.classList.remove("last"); } );
                        branch.root.classList.add('last');
                        root.remove();
                    }

                    // Right
                    let rpanel = _getNextPanel(LX.main_area.sections[ 1 ]);
                    p.add('<i class="fa-regular fa-window-maximize fa-window-maximize fa-rotate-90">', {disabled: !rpanel, id: 'dock_options0', callback: () => {
                        _appendBranch(rpanel);
                    }});
                    // Left
                    let lpanel = _getNextPanel(LX.main_area.sections[ 0 ]);
                    p.add('<i class="fa-regular fa-window-maximize fa-window-maximize fa-rotate-270">', {disabled: !lpanel, id: 'dock_options1', callback: () => {
                        _appendBranch(lpanel);
                    }});
                }, { icon: "fa-regular fa-window-restore" });
            };

            root.appendChild(titleDiv);
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
                    that.panel.clear();
                    root.remove();
                }
                else
                {
                    options.onclose( this.root );
                }

                if( modal )
                {
                    LX.modal.toggle( true );
                }
            };

            var closeButton = document.createElement( 'a' );
            closeButton.className = "lexdialogcloser fa-solid fa-xmark";
            closeButton.title = "Close";
            closeButton.addEventListener( "click", this.close );

            if( title )
            {
                titleDiv.appendChild( closeButton );
            }
            else
            {
                closeButton.classList.add( "notitle" );
                root.appendChild( closeButton );
            }
        }

        const panel = new Panel();
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
            makeDraggable( root, Object.assign( { targetClass: 'lexdialogtitle' }, options ) );
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

        if( options.size )
        {
            this.size = size;
        }

        let rect = root.getBoundingClientRect();
        root.style.left = position[ 0 ] ? (position[ 0 ]) : "calc( 50% - " + ( rect.width * 0.5 ) + "px )";
        root.style.top = position[ 1 ] ? (position[ 1 ]) : "calc( 50% - " + ( rect.height * 0.5 ) + "px )";

        panel.root.style.width = "calc( 100% - 30px )";
        panel.root.style.height = title ? "calc( 100% - " + ( titleDiv.offsetHeight + 30 ) + "px )" : "calc( 100% - 51px )";
    }

    destroy() {

        this.root.remove();
    }

    refresh() {

        this.panel.root.innerHTML = "";
        this._oncreate.call(this, this.panel);
    }

    setPosition(x, y) {

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

        super( title, callback, options );

        let that = this;
        // Update margins on branch title closes/opens
        LX.addSignal("@on_branch_closed", this.panel, closed => {
            if( this.dock_pos == PocketDialog.BOTTOM )
                this.root.style.top = "calc(100% - " + (this.root.offsetHeight + 6) + "px)";
        });

        // Custom
        this.root.classList.add( "pocket" );
        if( !options.position ) {
            this.root.style.left = "calc(100% - " + (this.root.offsetWidth + 6) + "px)";
            this.root.style.top = "0px";
        }
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
                        this.root.style.left = options.position ? options.position[ 1 ] : "0px";
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
        this.root.style.left = (event.x - 48 + document.scrollingElement.scrollLeft) + "px";
        this.root.style.top = (event.y - 8 + document.scrollingElement.scrollTop) + "px";

        this.root.addEventListener("mouseleave", function() {
            this.remove();
        });

        this.items = [];
        this.colors = {};

        if( title )
        {
            const item = {};
            item[ title ] = [];
            item[ 'className' ] = "cmtitle";
            item[ 'icon' ] = options.icon;
            this.items.push( item );
        }
    }

    _adjust_position( div, margin, useAbsolute = false ) {

        let rect = div.getBoundingClientRect();

        if( !useAbsolute )
        {
            let width = rect.width;
            if( rect.left < 0 )
            {
                div.style.left = margin + "px";
            }
            else if( window.innerWidth - rect.right < 0 )
            {
                div.style.left = (window.innerWidth - width - margin) + "px";
            }

            if( rect.top < 0 )
            {
                div.style.top = margin + "px";
            }
            else if( (rect.top + rect.height) > window.innerHeight )
            {
                div.style.top = (window.innerHeight - rect.height - margin) + "px";
            }
        }
        else
        {
            let dt = window.innerWidth - rect.right;
            if( dt < 0 )
            {
                div.style.left = div.offsetLeft + (dt - margin) + "px";
            }

            dt = window.innerHeight - (rect.top + rect.height);
            if( dt < 0 )
            {
                div.style.top = div.offsetTop + (dt - margin + 20 ) + "px";
            }
        }
    }

    _create_submenu( o, k, c, d ) {

        this.root.querySelectorAll(".lexcontextmenubox").forEach( cm => cm.remove() );

        let contextmenu = document.createElement('div');
        contextmenu.className = "lexcontextmenubox";
        c.appendChild( contextmenu );

        for( var i = 0; i < o[k].length; ++i )
        {
            const subitem = o[k][i];
            const subkey = Object.keys(subitem)[0];
            this._create_entry(subitem, subkey, contextmenu, d);
        }

        var rect = c.getBoundingClientRect();
        contextmenu.style.left = rect.width + "px";
        contextmenu.style.marginTop =  3.5 - c.offsetHeight + "px";

        // Set final width
        this._adjust_position( contextmenu, 6, true );
    }

    _create_entry( o, k, c, d ) {

        const hasSubmenu = o[ k ].length;
        let entry = document.createElement('div');
        entry.className = "lexcontextmenuentry" + (o[ 'className' ] ? " " + o[ 'className' ] : "" );
        entry.id = o.id ?? ("eId" + getSupportedDOMName( k ));
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
                this._create_submenu( o, k, entry, ++d );
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
                this._create_submenu( o, k, entry, ++d );
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
        doAsync( () => this._adjust_position( this.root, 6 ) );
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
            let pKey = "eId" + getSupportedDOMName( key );

            // Item already created
            const id = "#" + (item.id ?? pKey);
            if( !this.root.querySelector(id) )
                this._create_entry(item, key, this.root, -1);
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
    LX.root.appendChild( menu.root );

    if( callback )
    {
        callback( menu );
    }

    menu.onCreate();

    return menu;
}

LX.addContextMenu = addContextMenu;

/**
 * @class Curve
 */

// forked from litegui.js @jagenjo

class Curve {

    constructor( panel, value, options = {} ) {

        let element = document.createElement( "div" );
        element.className = "curve " + ( options.className ? options.className : "" );
        element.style.minHeight = "50px";
        element.style.width = options.width || "100%";
        element.style.minWidth = "50px";
        element.style.minHeight = "20px";

        element.bgcolor = options.bgColor || LX.getThemeColor( "global-intense-background" );
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-selected-light" );
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
            element.pointscolor = options.pointsColor || LX.getThemeColor( "global-selected-light" );
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
            var dx = (element.xrange[1] - element.xrange[ 0 ]) / samples;
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
        }

        //canvas to value
        function unconvert(v) {
            return [(v[0] * element.xrange[1] / canvas.width + element.xrange[0]),
                    (v[1] * element.yrange[1] / canvas.height + element.yrange[0])];
        }

        var selected = -1;

        element.redraw = function( o = {} )  {

            if( o.value ) element.value = o.value;
            if( o.xrange ) element.xrange = o.xrange;
            if( o.yrange ) element.yrange = o.yrange;
            if( o.smooth ) element.smooth = o.smooth;
            var rect = canvas.parentElement.getBoundingClientRect();
            if( canvas.parentElement.parentElement ) rect = canvas.parentElement.parentElement.getBoundingClientRect();
            if( rect && canvas.width != rect.width && rect.width && rect.width < 1000 )
            {
                canvas.width = rect.width;
            }

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

            for(var i in element.value) {
                var value = element.value[i];
                pos = convert(value);
                values.push(pos[ 0 ]);
                values.push(pos[ 1 ]);
                if(!element.smooth)
                    ctx.lineTo( pos[ 0 ], pos[ 1 ] );
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
                LX.UTILS.drawSpline( ctx, values, element.smooth );
            }

            // Draw points
            for( var i = 0; i < element.value.length; i += 1 ) {
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

            if(element.show_samples) {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for(var i = 0; i < samples.length; i += 1)
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

            if( e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values ) {
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

            if( selected != -1 ) {
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

        function distance(a,b) { return Math.sqrt( Math.pow(b[0]-a[0],2) + Math.pow(b[1]-a[1],2) ); };

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

LX.Curve = Curve;

/**
 * @class Dial
 */

class Dial {

    constructor( panel, value, options = {} ) {

        let element = document.createElement( "div" );
        element.className = "dial " + ( options.className ? options.className : "" );
        element.style.width = element.style.height = options.size || "100%";
        element.style.minWidth = element.style.minHeight = "50px";

        element.bgcolor = options.bgColor || LX.getThemeColor( "global-dark-background" );
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-selected-light" );
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
            var dx = (element.xrange[1] - element.xrange[ 0 ]) / samples;
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
        function convert(v, r) {

            Math.pow(v[0],2)
            return [ canvas.width * ( v[0] - element.xrange[0])/ (element.xrange[1]),
                canvas.height * (v[1] - element.yrange[0])/ (element.yrange[1])];
        }

        //canvas to value
        function unconvert(v) {
            return [(v[0] * element.xrange[1] / canvas.width + element.xrange[0]),
                    (v[1] * element.yrange[1] / canvas.height + element.yrange[0])];
        }

        var selected = -1;

        element.redraw = function( o = {} )  {

            if( o.value ) element.value = o.value;
            if( o.xrange ) element.xrange = o.xrange;
            if( o.yrange ) element.yrange = o.yrange;
            if( o.smooth ) element.smooth = o.smooth;
            var rect = canvas.parentElement.getBoundingClientRect();
            if( canvas.parentElement.parentElement ) rect = canvas.parentElement.parentElement.getBoundingClientRect();
            if( rect && canvas.width != rect.width && rect.width && rect.width < 1000 )
            {
                canvas.width = rect.width;
            }

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

            for(var i in element.value) {
                var value = element.value[i];
                pos = convert(value);
                values.push(pos[ 0 ]);
                values.push(pos[ 1 ]);

            }

            pos = convert([ element.xrange[ 1 ], element.defaulty ]);
            values.push(pos[ 0 ]);
            values.push(pos[ 1 ]);

            // Draw points
            const center =  [0,0];
            pos = convert(center)
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc( pos[ 0 ], pos[ 1 ], 3, 0, Math.PI * 2);
            ctx.fill();

            for( var i = 0; i < element.value.length; i += 1 ) {
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

            if(element.show_samples) {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for(var i = 0; i < samples.length; i += 1)
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

            if( e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values ) {
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

            if( selected != -1 ) {
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

        function distance(a,b) { return Math.sqrt( Math.pow(b[0]-a[0],2) + Math.pow(b[1]-a[1],2) ); };

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

LX.Dial = Dial;

class AssetViewEvent {

    static NONE             = 0;
    static ASSET_SELECTED   = 1;
    static ASSET_DELETED    = 2;
    static ASSET_RENAMED    = 3;
    static ASSET_CLONED     = 4;
    static ASSET_DBLCLICKED = 5;
    static ENTER_FOLDER     = 6;
    static ASSET_CHECKED    = 7;

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
            case AssetViewEvent.ASSET_RENAMED: return "assetview_event_renamed";
            case AssetViewEvent.ASSET_CLONED: return "assetview_event_cloned";
            case AssetViewEvent.ASSET_DBLCLICKED: return "assetview_event_dblclicked";
            case AssetViewEvent.ENTER_FOLDER: return "assetview_event_enter_folder";
            case AssetViewEvent.ASSET_CHECKED: return "assetview_event_checked";
        }
    }
};

LX.AssetViewEvent = AssetViewEvent;

/**
 * @class AssetView
 * @description Asset container with Tree for file system
 */

class AssetView {

    static LAYOUT_CONTENT       = 0;
    static LAYOUT_LIST          = 1;
    static MAX_PAGE_ELEMENTS    = 50;

    /**
     * @param {object} options
     */
    constructor( options = {} ) {

        this.rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
        this.layout = options.layout ?? AssetView.LAYOUT_CONTENT;
        this.contentPage = 1;

        if( options.rootPath )
        {
            if(options.rootPath.constructor !== String)
                console.warn("Asset Root Path must be a String (now is " + path.constructor.name + ")");
            else
                this.rootPath = options.rootPath;
        }

        let div = document.createElement('div');
        div.className = 'lexassetbrowser';
        this.root = div;

        let area = new LX.Area({height: "100%"});
        div.appendChild(area.root);

        let left, right, contentArea = area;

        this.skipBrowser = options.skipBrowser ?? false;
        this.skipPreview = options.skipPreview ?? false;
        this.useNativeTitle = options.useNativeTitle ?? false;
        this.onlyFolders = options.onlyFolders ?? true;
        this.allowMultipleSelection = options.allowMultipleSelection ?? false;
        this.previewActions = options.previewActions ?? [];
        this.contextMenu = options.contextMenu ?? [];
        this.onRefreshContent = options.onRefreshContent;

        if( !this.skipBrowser )
        {
            [left, right] = area.split({ type: "horizontal", sizes: ["15%", "85%"]});
            contentArea = right;

            left.setLimitBox( 210, 0 );
            right.setLimitBox( 512, 0 );
        }

        if( !this.skipPreview )
        {
            [ contentArea, right ] = contentArea.split({ type: "horizontal", sizes: ["80%", "20%"]});
        }

        this.allowedTypes = options.allowedTypes || ["None", "Image", "Mesh", "Script", "JSON", "Clip"];

        this.prevData = [];
        this.nextData = [];
        this.data = [];

        this._processData( this.data, null );

        this.currentData = this.data;
        this.path = ['@'];

        if( !this.skipBrowser )
        {
            this._createTreePanel( left );
        }

        this._createContentPanel( contentArea );

        // Create resource preview panel
        if( !this.skipPreview )
        {
            this.previewPanel = right.addPanel( {className: 'lexassetcontentpanel', style: { overflow: 'scroll' }} );
        }
    }

    /**
    * @method load
    */

    load( data, onevent ) {

        this.prevData.length = 0;
        this.nextData.length = 0;

        this.data = data;

        this._processData( this.data, null );
        this.currentData = this.data;
        this.path = [ '@' ];

        if( !this.skipBrowser )
        {
            this._createTreePanel( this.area );
        }

        this._refreshContent();

        this.onevent = onevent;
    }

    /**
    * @method clear
    */
    clear() {

        if( this.previewPanel )
        {
            this.previewPanel.clear();
        }

        if( this.leftPanel )
        {
            this.leftPanel.clear();
        }

        if( this.rightPanel )
        {
            this.rightPanel.clear()
        }
    }

    /**
    * @method _processData
    */

    _processData( data, parent ) {

        if( data.constructor !== Array )
        {
            data[ 'folder' ] = parent;
            data.children = data.children ?? [];
        }

        let list = data.constructor === Array ? data : data.children;

        for( var i = 0; i < list.length; ++i )
        {
            this._processData( list[ i ], data );
        }
    }

    /**
    * @method _updatePath
    */

    _updatePath( data ) {

        this.path.length = 0;

        const push_parents_id = i => {
            if( !i ) return;
            let list = i.children ? i.children : i;
            let c = list[ 0 ];
            if( !c ) return;
            if( !c.folder ) return;
            this.path.push( c.folder.id ?? '@' );
            push_parents_id( c.folder.folder );
        };

        push_parents_id( data );

        LX.emit( "@on_folder_change", this.path.reverse().join('/') );
    }

    /**
    * @method _createTreePanel
    */

    _createTreePanel( area ) {

        if( this.leftPanel )
        {
            this.leftPanel.clear();
        }
        else
        {
            this.leftPanel = area.addPanel({ className: 'lexassetbrowserpanel' });
        }

        // Process data to show in tree
        let tree_data = {
            id: '/',
            children: this.data
        }

        this.tree = this.leftPanel.addTree( "Content Browser", tree_data, {
            // icons: tree_icons,
            filter: false,
            onlyFolders: this.onlyFolders,
            onevent: event => {

                let node = event.node;
                let value = event.value;

                switch( event.type )
                {
                    case LX.TreeEvent.NODE_SELECTED:
                        if( !event.multiple )
                        {
                            this._enterFolder( node );
                        }
                        if( !node.parent )
                        {
                            this.prevData.push( this.currentData );
                            this.currentData = this.data;
                            this._refreshContent();

                            this.path = ['@'];
                            LX.emit("@on_folder_change", this.path.join('/'));
                        }
                        break;
                    case LX.TreeEvent.NODE_DRAGGED:
                        node.folder = value;
                        this._refreshContent();
                        break;
                }
            },
        });
    }

    /**
    * @method _setContentLayout
    */

    _setContentLayout( layoutMode ) {

        this.layout = layoutMode;

        this._refreshContent();
    }

    /**
    * @method _createContentPanel
    */

    _createContentPanel( area ) {

        if( this.rightPanel )
        {
            this.rightPanel.clear();
        }
        else
        {
            this.rightPanel = area.addPanel({ className: 'lexassetcontentpanel' });
        }

        const on_sort = ( value, event ) => {
            const cmenu = addContextMenu( "Sort by", event, c => {
                c.add("Name", () => this._sortData('id') );
                c.add("Type", () => this._sortData('type') );
                c.add("");
                c.add("Ascending", () => this._sortData() );
                c.add("Descending", () => this._sortData(null, true) );
            } );
            const parent = this.parent.root.parentElement;
            if( parent.classList.contains('lexdialog') )
            {
                cmenu.root.style.zIndex = (+getComputedStyle( parent ).zIndex) + 1;
            }
        }

        const on_change_view = ( value, event ) => {
            const cmenu = addContextMenu( "Layout", event, c => {
                c.add("Content", () => this._setContentLayout( AssetView.LAYOUT_CONTENT ) );
                c.add("");
                c.add("List", () => this._setContentLayout( AssetView.LAYOUT_LIST ) );
            } );
            const parent = this.parent.root.parentElement;
            if( parent.classList.contains('lexdialog') )
                cmenu.root.style.zIndex = (+getComputedStyle( parent ).zIndex) + 1;
        }

        const on_change_page = ( value, event ) => {
            if( !this.allowNextPage )
            {
                return;
            }
            const lastPage = this.contentPage;
            this.contentPage += value;
            this.contentPage = Math.min( this.contentPage, (((this.currentData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1 );
            this.contentPage = Math.max( this.contentPage, 1 );

            if( lastPage != this.contentPage )
            {
                this._refreshContent();
            }
        }

        this.rightPanel.sameLine();
        this.rightPanel.addDropdown( "Filter", this.allowedTypes, this.allowedTypes[ 0 ], v => this._refreshContent.call(this, null, v), { width: "20%", minWidth: "128px" } );
        this.rightPanel.addText( null, this.searchValue ?? "", v => this._refreshContent.call(this, v, null), { placeholder: "Search assets.." } );
        this.rightPanel.addButton( null, "<a class='fa fa-arrow-up-short-wide'></a>", on_sort.bind(this), { className: "micro", title: "Sort" } );
        this.rightPanel.addButton( null, "<a class='fa-solid fa-grip'></a>", on_change_view.bind(this), { className: "micro", title: "View" } );
        // Content Pages
        this.rightPanel.addButton( null, "<a class='fa-solid fa-angles-left'></a>", on_change_page.bind(this, -1), { className: "micro", title: "Previous Page" } );
        this.rightPanel.addButton( null, "<a class='fa-solid fa-angles-right'></a>", on_change_page.bind(this, 1), { className: "micro", title: "Next Page" } );
        this.rightPanel.endLine();

        if( !this.skipBrowser )
        {
            this.rightPanel.sameLine();
            this.rightPanel.addComboButtons( null, [
                {
                    value: "Left",
                    icon: "fa-solid fa-left-long",
                    callback: domEl => {
                        if(!this.prevData.length) return;
                        this.nextData.push( this.currentData );
                        this.currentData = this.prevData.pop();
                        this._refreshContent();
                        this._updatePath( this.currentData );
                    }
                },
                {
                    value: "Right",
                    icon: "fa-solid fa-right-long",
                    callback: domEl => {
                        if(!this.nextData.length) return;
                        this.prevData.push( this.currentData );
                        this.currentData = this.nextData.pop();
                        this._refreshContent();
                        this._updatePath( this.currentData );
                    }
                },
                {
                    value: "Refresh",
                    icon: "fa-solid fa-arrows-rotate",
                    callback: domEl => { this._refreshContent(); }
                }
            ], { width: "auto", noSelection: true } );
            this.rightPanel.addText(null, this.path.join('/'), null, { disabled: true, signal: "@on_folder_change", style: { fontWeight: "bolder", fontSize: "16px", color: "#aaa" } });
            this.rightPanel.addText(null, "Page " + this.contentPage + " / " + ((((this.currentData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1), null, {disabled: true, signal: "@on_page_change", width: "fit-content"})
            this.rightPanel.endLine();
        }

        this.content = document.createElement('ul');
        this.content.className = "lexassetscontent";
        this.rightPanel.root.appendChild(this.content);

        this.content.addEventListener('dragenter', function( e ) {
            e.preventDefault();
            this.classList.add('dragging');
        });
        this.content.addEventListener('dragleave', function( e ) {
            e.preventDefault();
            this.classList.remove('dragging');
        });
        this.content.addEventListener('drop', ( e ) => {
            e.preventDefault();
            this._processDrop( e );
        });
        this.content.addEventListener('click', function() {
            this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
        });

        this._refreshContent();
    }

    _refreshContent( searchValue, filter ) {

        const isContentLayout = ( this.layout == AssetView.LAYOUT_CONTENT ); // default

        this.filter = filter ?? ( this.filter ?? "None" );
        this.searchValue = searchValue ?? (this.searchValue ?? "");
        this.content.innerHTML = "";
        this.content.className = (isContentLayout ? "lexassetscontent" : "lexassetscontent list");
        let that = this;

        const add_item = function(item) {

            const type = item.type.charAt( 0 ).toUpperCase() + item.type.slice( 1 );
            const extension = getExtension( item.id );
            const isFolder = type === "Folder";

            let itemEl = document.createElement('li');
            itemEl.className = "lexassetitem " + item.type.toLowerCase();
            itemEl.tabIndex = -1;
            that.content.appendChild( itemEl );

            if( !that.useNativeTitle )
            {
                let desc = document.createElement( 'span' );
                desc.className = 'lexitemdesc';
                desc.innerHTML = "File: " + item.id + "<br>Type: " + type;
                that.content.appendChild( desc );

                itemEl.addEventListener("mousemove", e => {

                    if( !isContentLayout )
                    {
                        return;
                    }

                    const rect = itemEl.getBoundingClientRect();
                    const targetRect = e.target.getBoundingClientRect();
                    const parentRect = desc.parentElement.getBoundingClientRect();

                    let localOffsetX = targetRect.x - parentRect.x - ( targetRect.x - rect.x );
                    let localOffsetY = targetRect.y - parentRect.y - ( targetRect.y - rect.y );

                    if( e.target.classList.contains( "lexassettitle" ) )
                    {
                        localOffsetY += ( targetRect.y - rect.y );
                    }

                    desc.style.left = (localOffsetX + e.offsetX + 12) + "px";
                    desc.style.top = (localOffsetY + e.offsetY) + "px";
                });

                itemEl.addEventListener("mouseenter", () => {
                    if( isContentLayout )
                    {
                        desc.style.display = "unset";
                    }
                });

                itemEl.addEventListener("mouseleave", () => {
                    if( isContentLayout )
                    {
                        setTimeout( () => {
                            desc.style.display = "none";
                        }, 100 );
                    }
                });
            }
            else
            {
                itemEl.title = type + ": " + item.id;
            }

            if( that.allowMultipleSelection )
            {
                let checkbox = document.createElement( 'input' );
                checkbox.type = "checkbox";
                checkbox.className = "lexcheckbox";
                checkbox.checked = item.selected;
                checkbox.addEventListener('change', ( e, v ) => {
                    item.selected = !item.selected;
                    if( that.onevent )
                    {
                        const event = new AssetViewEvent(AssetViewEvent.ASSET_CHECKED, e.shiftKey ? [item] : item );
                        event.multiple = !!e.shiftKey;
                        that.onevent( event );
                    }
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });

                itemEl.appendChild( checkbox );
            }

            let title = document.createElement('span');
            title.className = "lexassettitle";
            title.innerText = item.id;
            itemEl.appendChild( title );

            if( !that.skipPreview ) {

                let preview = null;
                const hasImage = item.src && (['png', 'jpg'].indexOf( getExtension( item.src ) ) > -1 || item.src.includes("data:image/") ); // Support b64 image as src

                if( hasImage || isFolder || !isContentLayout)
                {
                    preview = document.createElement('img');
                    let real_src = item.unknown_extension ? that.rootPath + "images/file.png" : (isFolder ? that.rootPath + "images/folder.png" : item.src);
                    preview.src = (isContentLayout || isFolder ? real_src : that.rootPath + "images/file.png");
                    itemEl.appendChild( preview );
                }
                else
                {
                    preview = document.createElement('svg');
                    preview.className = "asset-file-preview";
                    itemEl.appendChild(preview);

                    let textEl = document.createElement('text');
                    preview.appendChild(textEl);
                    // If no extension, e.g. Clip, use the type...
                    textEl.innerText = (!extension || extension == item.id) ? item.type.toUpperCase() : ("." + extension.toUpperCase());

                    var newLength = textEl.innerText.length;
                    var charsPerLine = 2.5;
                    var newEmSize = charsPerLine / newLength;
                    var textBaseSize = 64;

                    if(newEmSize < 1) {
                        var newFontSize = newEmSize * textBaseSize;
                        textEl.style.fontSize = newFontSize + "px";
                        preview.style.paddingTop = "calc(50% - " + (textEl.offsetHeight * 0.5 + 10) + "px)"
                    }
                }
            }

            if( !isFolder )
            {
                let info = document.createElement('span');
                info.className = "lexassetinfo";
                info.innerText = type;
                itemEl.appendChild(info);
            }

            itemEl.addEventListener('click', function(e) {
                e.stopImmediatePropagation();
                e.stopPropagation();

                const isDoubleClick = ( e.detail == LX.MOUSE_DOUBLE_CLICK );

                if( !isDoubleClick )
                {
                    if( !e.shiftKey )
                    {
                        that.content.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
                    }

                    this.classList.add('selected');
                    that.selectedItem = item;

                    if( !that.skipPreview )
                    {
                        that._previewAsset( item );
                    }
                }
                else if( isFolder )
                {
                    that._enterFolder( item );
                    return;
                }

                if( that.onevent )
                {
                    const event = new AssetViewEvent(isDoubleClick ? AssetViewEvent.ASSET_DBLCLICKED : AssetViewEvent.ASSET_SELECTED, e.shiftKey ? [item] : item );
                    event.multiple = !!e.shiftKey;
                    that.onevent( event );
                }
            });

            if( that.contextMenu )
            {
                itemEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();

                    const multiple = that.content.querySelectorAll('.selected').length;

                    LX.addContextMenu( multiple > 1 ? (multiple + " selected") :
                                isFolder ? item.id : item.type, e, m => {
                        if( multiple <= 1 )
                        {
                            m.add("Rename");
                        }
                        if( !isFolder )
                        {
                            m.add("Clone", that._cloneItem.bind( that, item ));
                        }
                        if( multiple <= 1 )
                        {
                            m.add("Properties");
                        }
                        m.add("");
                        m.add("Delete", that._deleteItem.bind( that, item ));
                    });
                });
            }

            itemEl.addEventListener("dragstart", function(e) {
                e.preventDefault();
            }, false );

            return itemEl;
        }

        const fr = new FileReader();

        const filteredData = this.currentData.filter( _i => {
            return (this.filter != "None" ? _i.type.toLowerCase() == this.filter.toLowerCase() : true) &&
                _i.id.toLowerCase().includes(this.searchValue.toLowerCase())
        } );

        if( filter || searchValue )
        {
            this.contentPage = 1;
        }

        // Show all data if using filters
        const startIndex = (this.contentPage - 1) * AssetView.MAX_PAGE_ELEMENTS;
        const endIndex = Math.min( startIndex + AssetView.MAX_PAGE_ELEMENTS, filteredData.length );

        for( let i = startIndex; i < endIndex; ++i )
        {
            let item = filteredData[ i ];

            if( item.path )
            {
                LX.request({ url: item.path, dataType: 'blob', success: (f) => {
                    item.bytesize = f.size;
                    fr.readAsDataURL( f );
                    fr.onload = e => {
                        item.src = e.currentTarget.result;  // This is a base64 string...
                        item._path = item.path;
                        delete item.path;
                        this._refreshContent( searchValue, filter );
                    };
                } });
            }else
            {
                item.domEl = add_item( item );
            }
        }

        this.allowNextPage = filteredData.length - 1 > AssetView.MAX_PAGE_ELEMENTS;
        LX.emit("@on_page_change", "Page " + this.contentPage + " / " + ((((filteredData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1));

        if( this.onRefreshContent )
        {
            this.onRefreshContent( searchValue, filter );
        }
    }

    /**
    * @method _previewAsset
    */

    _previewAsset( file ) {

        const is_base_64 = file.src && file.src.includes("data:image/");

        this.previewPanel.clear();
        this.previewPanel.branch("Asset");

        if( file.type == 'image' || file.src )
        {
            const hasImage = ['png', 'jpg'].indexOf( getExtension( file.src ) ) > -1 || is_base_64;
            if( hasImage )
            {
                this.previewPanel.addImage( file.src, { style: { width: "100%" } } );
            }
        }

        const options = { disabled: true };

        this.previewPanel.addText("Filename", file.id, null, options);
        if( file.lastModified ) this.previewPanel.addText("Last Modified", new Date( file.lastModified ).toLocaleString(), null, options);
        if( file._path || file.src ) this.previewPanel.addText("URL", file._path ? file._path : file.src, null, options);
        this.previewPanel.addText("Path", this.path.join('/'), null, options);
        this.previewPanel.addText("Type", file.type, null, options);
        if( file.bytesize ) this.previewPanel.addText("Size", (file.bytesize/1024).toPrecision(3) + " KBs", null, options);
        if( file.type == "folder" ) this.previewPanel.addText("Files", file.children ? file.children.length.toString() : "0", null, options);

        this.previewPanel.addSeparator();

        const previewActions = [...this.previewActions];

        if( !previewActions.length )
        {
            // By default
            previewActions.push({
                name: 'Download',
                callback: () => LX.downloadURL(file.src, file.id)
            });
        }

        for( let action of previewActions )
        {
            if( action.type && action.type !== file.type || action.path && action.path !== this.path.join('/') )
                continue;
            this.previewPanel.addButton( null, action.name, action.callback.bind( this, file ) );
        }

        this.previewPanel.merge();
    }

    _processDrop( e ) {

        const fr = new FileReader();
        const num_files = e.dataTransfer.files.length;

        for( let i = 0; i < e.dataTransfer.files.length; ++i )
        {
            const file = e.dataTransfer.files[i];

            const result = this.currentData.find( e => e.id === file.name );
            if(result) continue;

            fr.readAsDataURL( file );
            fr.onload = e => {

                let ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();

                let item = {
                    "id": file.name,
                    "src": e.currentTarget.result,
                    "extension": ext,
                    "lastModified": file.lastModified
                };

                switch(ext)
                {
                case 'png':
                case 'jpg':
                    item.type = "image"; break;
                case 'js':
                case 'css':
                    item.type = "script"; break;
                case 'json':
                    item.type = "json"; break;
                case 'obj':
                    item.type = "mesh"; break;
                default:
                    item.type = ext;
                    item.unknown_extension = true;
                    break;
                }

                this.currentData.push( item );

                if(i == (num_files - 1)) {
                    this._refreshContent();
                    if( !this.skipBrowser )
                        this.tree.refresh();
                }
            };
        }
    }

    _sortData( sort_by, sort_descending = false ) {

        sort_by = sort_by ?? (this._lastSortBy ?? 'id');
        this.currentData = this.currentData.sort( (a, b) => {
            var r = sort_descending ? b[sort_by].localeCompare(a[sort_by]) : a[sort_by].localeCompare(b[sort_by]);
            if(r == 0) r = sort_descending ? b['id'].localeCompare(a['id']) : a['id'].localeCompare(b['id']);
            return r;
        } );

        this._lastSortBy = sort_by;
        this._refreshContent();
    }

    _enterFolder( folderItem ) {

        this.prevData.push( this.currentData );
        this.currentData = folderItem.children;
        this.contentPage = 1;
        this._refreshContent();

        // Update path
        this._updatePath(this.currentData);

        // Trigger event
        if( this.onevent )
        {
            const event = new AssetViewEvent( AssetViewEvent.ENTER_FOLDER, folderItem );
            this.onevent( event );
        }
    }

    _deleteItem( item ) {

        const idx = this.currentData.indexOf( item );
        if(idx < 0)
        {
            console.error( "[AssetView Error] Cannot delete. Item not found." );
            return;
        }

        this.currentData.splice( idx, 1 );
        this._refreshContent( this.searchValue, this.filter );

        if(this.onevent)
        {
            const event = new AssetViewEvent( AssetViewEvent.ASSET_DELETED, item );
            this.onevent( event );
        }

        this.tree.refresh();
        this._processData( this.data );
    }

    _cloneItem( item ) {

        const idx = this.currentData.indexOf( item );
        if( idx < 0 )
        {
            return;
        }

        delete item.domEl;
        delete item.folder;
        const new_item = deepCopy( item );
        this.currentData.splice( idx, 0, new_item );

        this._refreshContent( this.searchValue, this.filter );

        if( this.onevent )
        {
            const event = new AssetViewEvent( AssetViewEvent.ASSET_CLONED, item );
            this.onevent( event );
        }

        this._processData( this.data );
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
    request( request ) {

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
    const cs = getComputedStyle( this );
    return {
        width: this.offsetWidth + cs.getPropertyValue('marginLeft') + cs.getPropertyValue('marginRight'),
        height: this.offsetHeight + cs.getPropertyValue('marginTop') + cs.getPropertyValue('marginBottom')
    }
}

LX.UTILS = {
    getTime() { return new Date().getTime() },
    compareThreshold( v, p, n, t ) { return Math.abs(v - p) >= t || Math.abs(v - n) >= t },
    compareThresholdRange( v0, v1, t0, t1 ) { return v0 >= t0 && v0 <= t1 || v1 >= t0 && v1 <= t1 || v0 <= t0 && v1 >= t1},
    uidGenerator: simple_guidGenerator,
    deleteElement( el ) { if( el ) el.remove(); },
    flushCss(element) {
        // By reading the offsetHeight property, we are forcing
        // the browser to flush the pending CSS changes (which it
        // does to ensure the value obtained is accurate).
        element.offsetHeight;
    },
    getControlPoints( x0, y0, x1, y1, x2, y2, t ) {

        //  x0,y0,x1,y1 are the coordinates of the end (knot) pts of this segment
        //  x2,y2 is the next knot -- not connected here but needed to calculate p2
        //  p1 is the control point calculated here, from x1 back toward x0.
        //  p2 is the next control point, calculated here and returned to become the
        //  next segment's p1.
        //  t is the 'tension' which controls how far the control points spread.

        //  Scaling factors: distances from this knot to the previous and following knots.
        var d01=Math.sqrt(Math.pow(x1-x0,2)+Math.pow(y1-y0,2));
        var d12=Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));

        var fa=t*d01/(d01+d12);
        var fb=t-fa;

        var p1x=x1+fa*(x0-x2);
        var p1y=y1+fa*(y0-y2);

        var p2x=x1-fb*(x0-x2);
        var p2y=y1-fb*(y0-y2);

        return [p1x,p1y,p2x,p2y]
    },
    drawSpline( ctx, pts, t ) {

        ctx.save();
        var cp=[];   // array of control points, as x0,y0,x1,y1,...
        var n=pts.length;

        // Draw an open curve, not connected at the ends
        for(var i=0;i<n-4;i+=2) {
            cp=cp.concat(LX.UTILS.getControlPoints(pts[i],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],t));
        }

        for(var i=2;i<pts.length-5;i+=2) {
            ctx.beginPath();
            ctx.moveTo(pts[i],pts[i+1]);
            ctx.bezierCurveTo(cp[2*i-2],cp[2*i-1],cp[2*i],cp[2*i+1],pts[i+2],pts[i+3]);
            ctx.stroke();
            ctx.closePath();
        }

        //  For open curves the first and last arcs are simple quadratics.
        ctx.beginPath();
        ctx.moveTo(pts[0],pts[1]);
        ctx.quadraticCurveTo(cp[0],cp[1],pts[2],pts[3]);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(pts[n-2],pts[n-1]);
        ctx.quadraticCurveTo(cp[2*n-10],cp[2*n-9],pts[n-4],pts[n-3]);
        ctx.stroke();
        ctx.closePath();

        ctx.restore();
    }
};

export { LX };