// Lexgui.js @jxarco

/**
 * Main namespace
 * @namespace LX
*/

var LX = {
    version: "0.5.2",
    ready: false,
    components: [], // Specific pre-build components
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

function clamp( num, min, max ) { return Math.min( Math.max( num, min ), max ); }
function round( number, precision ) { return precision == 0 ? Math.floor( number ) : +(( number ).toFixed( precision ?? 2 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' )); }
function remapRange( oldValue, oldMin, oldMax, newMin, newMax ) { return ((( oldValue - oldMin ) * ( newMax - newMin )) / ( oldMax - oldMin )) + newMin; }

LX.clamp = clamp;
LX.round = round;
LX.remapRange = remapRange;

// Timer that works everywhere (from litegraph.js)
if ( typeof performance != "undefined" )
{
    LX.getTime = performance.now.bind( performance );
}
else if( typeof Date != "undefined" && Date.now )
{
    LX.getTime = Date.now.bind( Date );
}
else if ( typeof process != "undefined" )
{
    LX.getTime = function() {
        const t = process.hrtime();
        return t[ 0 ] * 0.001 + t[ 1 ] * 1e-6;
    };
}
else
{
    LX.getTime = function() {
        return new Date().getTime();
    };
}

let ASYNC_ENABLED = true;

/**
 * @method doAsync
 * @description Call a function asynchronously
 * @param {Function} fn Function to call
 * @param {Number} ms Time to wait until calling the function (in milliseconds)
 */
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

LX.doAsync = doAsync;

/**
 * @method getSupportedDOMName
 * @description Convert a text string to a valid DOM name
 * @param {String} text Original text
 */
function getSupportedDOMName( text )
{
    return text.replace( /\s/g, '' ).replaceAll('@', '_').replaceAll('+', '_plus_').replaceAll( '.', '' );
}

LX.getSupportedDOMName = getSupportedDOMName;

/**
 * @method has
 * @description Ask if LexGUI is using a specific component
 * @param {String} componentName Name of the LexGUI component
 */
function has( componentName )
{
    return ( LX.components.indexOf( componentName ) > -1 );
}

LX.has = has;

/**
 * @method getExtension
 * @description Get a extension from a path/url/filename
 * @param {String} name
 */
function getExtension( name )
{
    return name.includes('.') ? name.split('.').pop() : null;
}

LX.getExtension = getExtension;

/**
 * @method deepCopy
 * @description Create a deep copy with no references from an object
 * @param {Object} obj
 */
function deepCopy( obj )
{
    return JSON.parse( JSON.stringify( obj ) )
}

LX.deepCopy = deepCopy;

/**
 * @method setTheme
 * @description Set dark or light theme
 * @param {String} colorScheme Name of the scheme
 */
function setTheme( colorScheme )
{
    colorScheme = ( colorScheme == "light" ) ? "light" : "dark";
    document.documentElement.setAttribute( "data-theme", colorScheme );
    LX.emit( "@on_new_color_scheme", colorScheme );
}

LX.setTheme = setTheme;

/**
 * @method setThemeColor
 * @description Sets a new value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 * @param {String} color Color in rgba/hex
 */
function setThemeColor( colorName, color )
{
    const r = document.querySelector( ':root' );
    r.style.setProperty( '--' + colorName, color );
}

LX.setThemeColor = setThemeColor;

/**
 * @method getThemeColor
 * @description Get the value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 */
function getThemeColor( colorName )
{
    const r = getComputedStyle( document.querySelector( ':root' ) );
    const value = r.getPropertyValue( '--' + colorName );

    if( value.includes( "light-dark" ) )
    {
        const currentScheme = r.getPropertyValue( "color-scheme" );

        if( currentScheme == "light" )
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

/**
 * @method getBase64Image
 * @description Convert an image to a base64 string
 * @param {Image} img
 */
function getBase64Image( img )
{
    const canvas = document.createElement( 'canvas' );
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext( '2d' );
    ctx.drawImage( img, 0, 0 );
    return canvas.toDataURL( 'image/png' );
}

LX.getBase64Image = getBase64Image;

/**
 * @method hexToRgb
 * @description Convert a hexadecimal string to a valid RGB color array
 * @param {String} hexStr Hexadecimal color
 */
function hexToRgb( hexStr )
{
    const red = parseInt( hexStr.substring( 1, 3 ), 16 ) / 255;
    const green = parseInt( hexStr.substring( 3, 5 ), 16 ) / 255;
    const blue = parseInt( hexStr.substring( 5, 7 ), 16 ) / 255;
    return [ red, green, blue ];
}

LX.hexToRgb = hexToRgb;

/**
 * @method rgbToHex
 * @description Convert a RGB color array to a hexadecimal string
 * @param {Array} rgb Array containing R, G, B, A*
 */
function rgbToHex( rgb )
{
    let hex = "#";
    for( let c of rgb )
    {
        c = Math.floor( c * 255 );
        hex += c.toString( 16 );
    }
    return hex;
}

LX.rgbToHex = rgbToHex;

/**
 * @method measureRealWidth
 * @description Measure the pixel width of a text
 * @param {Number} value Text to measure
 * @param {Number} paddingPlusMargin Padding offset
 */
function measureRealWidth( value, paddingPlusMargin = 8 )
{
    var i = document.createElement( "span" );
    i.className = "lexinputmeasure";
    i.innerHTML = value;
    document.body.appendChild( i );
    var rect = i.getBoundingClientRect();
    LX.UTILS.deleteElement( i );
    return rect.width + paddingPlusMargin;
}

LX.measureRealWidth = measureRealWidth;

/**
 * @method simple_guidGenerator
 * @description Get a random unique id
 */
function simple_guidGenerator()
{
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+"-"+S4()+"-"+S4());
}

LX.guidGenerator = simple_guidGenerator;

/**
 * @method buildTextPattern
 * @description Create a validation pattern using specific options
 * @param {Object} options
 * lowercase (Boolean): Text must contain a lowercase char
 * uppercase (Boolean): Text must contain an uppercase char
 * digit (Boolean): Text must contain a digit
 * specialChar (Boolean): Text must contain a special char
 * noSpaces (Boolean): Do not allow spaces in text
 * minLength (Number): Text minimum length
 * maxLength (Number): Text maximum length
 * asRegExp (Boolean): Return pattern as Regular Expression instance
 */
function buildTextPattern( options = {} )
{
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

/**
 * @method makeDraggable
 * @description Allows an element to be dragged
 * @param {Element} domEl
 * @param {Object} options
 * autoAdjust (Bool): Sets in a correct position at the beggining
 * dragMargin (Number): Margin of drag container
 * onMove (Function): Called each move event
 * onDragStart (Function): Called when drag event starts
 */
function makeDraggable( domEl, options = { } )
{
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
        domEl.style.translate = "none"; // Force remove translation
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

        if( !currentTarget )
        {
            return;
        }

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

        currentTarget.eventCatched = true;

        // Force active dialog to show on top
        if( LX.activeDraggable )
        {
            LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX;
        }

        LX.activeDraggable = domEl;
        LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX + 1;

        if( onDragStart )
        {
            onDragStart( currentTarget, e );
        }
    }, false );

    document.addEventListener( 'mouseup', (e) => {
        if( currentTarget )
        {
            currentTarget = null;
            document.removeEventListener( "mousemove", onMove );
        }
    } );
}

LX.makeDraggable = makeDraggable;

/**
 * @method makeCollapsible
 * @description Allows an element to be collapsed/expanded
 * @param {Element} domEl: Element to be treated as collapsible
 * @param {Element} content: Content to display/hide on collapse/extend
 * @param {Element} parent: Element where the content will be appended (default is domEl.parent)
 * @param {Object} options
 */
function makeCollapsible( domEl, content, parent, options = { } )
{
    domEl.classList.add( "collapsible" );

    const collapsed = ( options.collapsed ?? true );
    const actionIcon = LX.makeIcon( "right" );
    actionIcon.classList.add( "collapser" );
    actionIcon.dataset[ "collapsed" ] = collapsed;
    actionIcon.style.marginLeft = "auto";
    actionIcon.style.marginRight = "0.2rem";

    actionIcon.addEventListener( "click", function( e ) {
        e.preventDefault();
        e.stopPropagation();
        if( this.dataset[ "collapsed" ] )
        {
            delete this.dataset[ "collapsed" ];
            content.style.display = "block";
        }
        else
        {
            this.dataset[ "collapsed" ] = true;
            content.style.display = "none";
        }
    } );

    domEl.appendChild( actionIcon );

    parent = parent ?? domEl.parentElement;

    parent.appendChild( content );
}

LX.makeCollapsible = makeCollapsible;

/**
 * @method makeCodeSnippet
 * @description Create a code snippet in a specific language
 * @param {String} code
 * @param {Array} size
 * @param {Object} options
 * language (String):
 * windowMode (Boolean):
 * lineNumbers (Boolean):
 * firstLine (Number): TODO
 * linesAdded (Array):
 * linesRemoved (Array):
 * tabName (String):
 */
function makeCodeSnippet( code, size, options = { } )
{
    if( !LX.has('CodeEditor') )
    {
        console.error( "Import the CodeEditor component to create snippets!" );
        return;
    }

    const snippet = document.createElement( "div" );
    snippet.className = "lexcodesnippet";
    snippet.style.width = size ? size[ 0 ] : "auto";
    snippet.style.height = size ? size[ 1 ] : "auto";
    const area = new Area( { noAppend: true } );
    let editor = new LX.CodeEditor( area, {
        skipInfo: true,
        disableEdition: true,
        allowAddScripts: false,
        name: options.tabName,
        // showTab: options.showTab ?? true
    } );
    editor.setText( code, options.language ?? "Plain Text" );

    if( options.linesAdded )
    {
        const code = editor.root.querySelector( ".code" );
        for( let l of options.linesAdded )
        {
            if( l.constructor == Number )
            {
                code.childNodes[ l - 1 ].classList.add( "added" );
            }
            else if( l.constructor == Array ) // It's a range
            {
                for( let i = ( l[0] - 1 ); i <= ( l[1] - 1 ); i++ )
                {
                    code.childNodes[ i ].classList.add( "added" );
                }
            }
        }
    }

    if( options.linesRemoved )
    {
        const code = editor.root.querySelector( ".code" );
        for( let l of options.linesRemoved )
        {
            if( l.constructor == Number )
            {
                code.childNodes[ l - 1 ].classList.add( "removed" );
            }
            else if( l.constructor == Array ) // It's a range
            {
                for( let i = ( l[0] - 1 ); i <= ( l[1] - 1 ); i++ )
                {
                    code.childNodes[ i ].classList.add( "removed" );
                }
            }
        }
    }

    if( options.windowMode )
    {
        const windowActionButtons = document.createElement( "div" );
        windowActionButtons.className = "lexwindowbuttons";
        const aButton = document.createElement( "span" );
        aButton.style.background = "#ee4f50";
        const bButton = document.createElement( "span" );
        bButton.style.background = "#f5b720";
        const cButton = document.createElement( "span" );
        cButton.style.background = "#53ca29";
        windowActionButtons.appendChild( aButton );
        windowActionButtons.appendChild( bButton );
        windowActionButtons.appendChild( cButton );
        const tabs = editor.root.querySelector( ".lexareatabs" );
        tabs.prepend( windowActionButtons );
    }

    if( !( options.lineNumbers ?? true ) )
    {
        editor.root.classList.add( "no-gutter" );
    }

    snippet.appendChild( area.root );
    return snippet;
}

LX.makeCodeSnippet = makeCodeSnippet;

/**
 * @method makeIcon
 * @description Gets an SVG element using one of LX.ICONS
 * @param {String} iconName
 * @param {String} iconTitle
 * @param {String} extraClass
 */
function makeIcon( iconName, iconTitle, extraClass = "" )
{
    let data = LX.ICONS[ iconName ];
    console.assert( data, `No icon named _${ iconName }_` );

    // Just another name for the same icon..
    if( data.constructor == String )
    {
        data = LX.ICONS[ data ];
    }

    const svg = document.createElementNS( "http://www.w3.org/2000/svg", "svg" );
    svg.setAttribute( "viewBox", `0 0 ${ data[ 0 ] } ${ data[ 1 ] }` );

    if( extraClass )
    {
        svg.classList.add( extraClass );
    }

    if( data[ 5 ] )
    {
        const attr = data[ 5 ].split( '=' );
        svg.setAttribute( attr[ 0 ], attr[ 1 ] );
    }

    const path = document.createElement( "path" );
    path.setAttribute( "fill",  "var(--color)" );
    path.setAttribute( "d",  data[ 4 ] );
    svg.appendChild( path );

    if( data[ 6 ] )
    {
        const attrs = data[ 6 ].split( ' ' );
        attrs.forEach( attr => {
            const t = attr.split( '=' );
            path.setAttribute( t[ 0 ], t[ 1 ] );
        } );
    }

    const faLicense = `<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->`;
    svg.innerHTML += faLicense;

    const icon = document.createElement( "a" );
    icon.title = iconTitle ?? "";
    icon.className = "lexicon " + extraClass;
    icon.appendChild( svg );

    return icon;
}

LX.makeIcon = makeIcon;

/**
 * @method registerCommandbarEntry
 * @description Adds an extra command bar entry
 * @param {String} name
 * @param {Function} callback
 */
function registerCommandbarEntry( name, callback )
{
    LX.extraCommandbarEntries.push( { name, callback } );
}

LX.registerCommandbarEntry = registerCommandbarEntry;

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
                const isCheckbox = (el.item.type && el.item.type === 'checkbox');
                this.close();
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
            searchItem.innerHTML = "<a class='fa fa-check'></a><span>" + ( p + t ) + "</span>"
        }
        else
        {
            searchItem.innerHTML = ( p + t );
        }
        searchItem.entry_name = t;
        searchItem.callback = c;
        searchItem.item = i;
        searchItem.addEventListener('click', function( e ) {
            this.callback.call( window, this.entry_name );
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

    commandbar._addElements = filter => {

        _resetBar();

        for( let m of LX.menubars )
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
            if( !instances.length ) return;

            const languages = instances[ 0 ].languages;

            for( let l of Object.keys( languages ) )
            {
                const key = "Language: " + l;
                const icon = instances[ 0 ]._getFileIcon( null, languages[ l ].ext );

                let value = icon.includes( 'fa-' ) ? "<i class='" + icon + "'></i>" :
                        "<img src='" + ( "https://raw.githubusercontent.com/jxarco/lexgui.js/master/" + icon ) + "'>";

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

    input.addEventListener('input', function( e ) {
        commandbar._addElements( this.value.toLowerCase() );
    });

    commandbar.appendChild( header );
    commandbar.appendChild( tabArea.root );
    commandbar.appendChild( itemContainer );

    return commandbar;
}

/**
 * @method init
 * @param {Object} options
 * container: Root location for the gui (default is the document body)
 * id: Id of the main area
 * skipRoot: Skip adding LX root container
 * skipDefaultArea: Skip creation of main area
 * strictViewport: Use only window area
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

    this.modal.classList.add( 'hidden-opacity' );
    this.modal.toggle = function( force ) { this.classList.toggle( 'hidden-opacity', force ); };

    if( options.container )
    {
        this.container = document.getElementById( options.container );
    }

    this.usingStrictViewport = options.strictViewport ?? true;
    document.documentElement.setAttribute( "data-strictVP", ( this.usingStrictViewport ) ? "true" : "false" );

    if( !this.usingStrictViewport )
    {
        document.addEventListener( "scroll", e => {
            // Get all active menuboxes
            const mbs = document.body.querySelectorAll( ".lexmenubox" );
            mbs.forEach( ( mb ) => {
                mb._updatePosition();
            } );
        } );
    }

    this.commandbar = _createCommandbar( this.container );

    this.container.appendChild( modal );

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
        this.container.appendChild( notifSection );

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

    this.widgetResizeObserver = new ResizeObserver( entries => {
        for ( const entry of entries )
        {
            const widget = entry.target?.jsInstance;
            if( widget && widget.onResize )
            {
                widget.onResize( entry.contentRect );
            }
        }
    });

    this.ready = true;
    this.menubars = [ ];

    if( !options.skipRoot && !options.skipDefaultArea )
    {
        this.main_area = new Area( { id: options.id ?? 'mainarea' } );
    }

    if( ( options.autoTheme ?? true ) && window.matchMedia && window.matchMedia( "(prefers-color-scheme: light)" ).matches )
    {
        LX.setTheme( "light" );

        window.matchMedia( "(prefers-color-scheme: dark)" ).addEventListener( "change", event => {
            LX.setTheme( event.matches ? "dark" : "light" );
        });
    }

    return this.main_area;
}

LX.init = init;

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

/**
 * @method message
 * @param {String} text
 * @param {String} title (Optional)
 * @param {Object} options
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
 * @param {Object} options
 * id: Id of the message dialog
 * timeout (Number): Delay time before it closes automatically (ms). Default: [3000]
 * position (Array): [x,y] Dialog position in screen. Default: [screen centered]
 * size (Array): [width, height]
 */

function popup( text, title, options = {} )
{
    if( !text )
    {
        throw("No message to show");
    }

    options.size = options.size ?? [ "max-content", "auto" ];
    options.class = "lexpopup";

    const time = options.timeout || 3000;
    const dialog = new Dialog( title, p => {
        p.addTextArea( null, text, null, { disabled: true, fitHeight: true } );
    }, options );

    setTimeout( () => {
        dialog.close();
    }, Math.max( time, 150 ) );

    return dialog;
}

LX.popup = popup;

/**
 * @method prompt
 * @param {String} text
 * @param {String} title (Optional)
 * @param {Object} options
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
    options.className = "prompt";

    let value = "";

    const dialog = new Dialog( title, p => {

        p.addTextArea( null, text, null, { disabled: true, fitHeight: true } );

        if( options.input ?? true )
        {
            p.addText( null, options.input || value, v => value = v, { placeholder: "..." } );
        }

        p.sameLine( 2 );

        p.addButton(null, "Cancel", () => {if(options.on_cancel) options.on_cancel(); dialog.close();} );

        p.addButton( null, options.accept || "Continue", () => {
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
 * @method toast
 * @param {String} title
 * @param {String} description (Optional)
 * @param {Object} options
 * action: Data of the custom action { name, callback }
 * closable: Allow closing the toast
 * timeout: Time in which the toast closed automatically, in ms. -1 means persistent. [3000]
 */

function toast( title, description, options = {} )
{
    if( !title )
    {
        throw( "The toast needs at least a title!" );
    }

    console.assert( this.notifications );

    const toast = document.createElement( "li" );
    toast.className = "lextoast";
    toast.style.translate = "0 calc(100% + 30px)";
    this.notifications.prepend( toast );

    doAsync( () => {

        if( this.notifications.offsetWidth > this.notifications.iWidth )
        {
            this.notifications.iWidth = Math.min( this.notifications.offsetWidth, 480 );
            this.notifications.style.width = this.notifications.iWidth + "px";
        }

        toast.dataset[ "open" ] = true;
    }, 10 );

    const content = document.createElement( "div" );
    content.className = "lextoastcontent";
    toast.appendChild( content );

    const titleContent = document.createElement( "div" );
    titleContent.className = "title";
    titleContent.innerHTML = title;
    content.appendChild( titleContent );

    if( description )
    {
        const desc = document.createElement( "div" );
        desc.className = "desc";
        desc.innerHTML = description;
        content.appendChild( desc );
    }

    if( options.action )
    {
        const panel = new Panel();
        panel.addButton(null, options.action.name ?? "Accept", options.action.callback.bind( this, toast ), { width: "auto", maxWidth: "150px", className: "right", buttonClass: "outline" });
        toast.appendChild( panel.root.childNodes[ 0 ] );
    }

    const that = this;

    toast.close = function() {
        this.dataset[ "closed" ] = true;
        doAsync( () => {
            this.remove();
            if( !that.notifications.childElementCount )
            {
                that.notifications.style.width = "unset";
                that.notifications.iWidth = 0;
            }
        }, 500 );
    };

    if( options.closable ?? true )
    {
        const closeButton = document.createElement( "a" );
        closeButton.className = "fa fa-xmark lexicon closer";
        closeButton.addEventListener( "click", () => {
            toast.close();
        } );
        toast.appendChild( closeButton );
    }

    const timeout = options.timeout ?? 3000;

    if( timeout != -1 )
    {
        doAsync( () => {
            toast.close();
        }, timeout );
    }
}

LX.toast = toast;

/**
 * @method badge
 * @param {String} text
 * @param {String} className
 * @param {Object} options
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

/**
 * @method makeContainer
 * @param {Array} size
 * @param {String} className
 * @param {Object} overrideStyle
 */

function makeContainer( size, className, overrideStyle = {} )
{
    const container = document.createElement( "div" );
    container.className = "lexcontainer " + ( className ?? "" );
    container.style.width = size && size[ 0 ] ? size[ 0 ] : "100%";
    container.style.height = size && size[ 1 ] ? size[ 1 ] : "100%";
    Object.assign( container.style, overrideStyle );
    return container;
}

LX.makeContainer = makeContainer;

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
        if( obj instanceof Widget )
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
 * @class DropdownMenu
 */

class DropdownMenu {

    static currentMenu = false;

    constructor( trigger, items, options = {} ) {

        console.assert( trigger, "DropdownMenu needs a DOM element as trigger!" );

        if( DropdownMenu.currentMenu )
        {
            DropdownMenu.currentMenu.destroy();
            return;
        }

        this._trigger = trigger;
        trigger.classList.add( "triggered" );
        trigger.ddm = this;

        this._items = items;

        this._windowPadding = 4;
        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.avoidCollisions = options.avoidCollisions ?? true;

        this.root = document.createElement( "div" );
        this.root.id = "root";
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexdropdownmenu";
        LX.root.appendChild( this.root );

        this._create( this._items );

        DropdownMenu.currentMenu = this;

        doAsync( () => {
            this._adjustPosition();

            this.root.focus();

            this._onClick = e => {
                if( e.target && ( this.root.contains( e.target ) || e.target == this._trigger ) )
                {
                    return;
                }
                this.destroy();
            };

            document.body.addEventListener( "click", this._onClick );
        }, 10 );
    }

    destroy() {

        this._trigger.classList.remove( "triggered" );

        delete this._trigger.ddm;

        document.body.removeEventListener( "click", this._onClick );

        LX.root.querySelectorAll( ".lexdropdownmenu" ).forEach( m => { m.remove(); } );

        DropdownMenu.currentMenu = null;
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
            newParent.id = parentDom.id;
            newParent.dataset["side"] = "right"; // submenus always come from the right
            LX.root.appendChild( newParent );

            newParent.currentParent = parentDom;
            parentDom = newParent;

            doAsync( () => {
                const position = [ parentRect.x + parentRect.width, parentRect.y ];

                if( this.avoidCollisions )
                {
                    position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - newParent.offsetWidth - this._windowPadding );
                    position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - newParent.offsetHeight - this._windowPadding );
                }

                newParent.style.left = `${ position[ 0 ] }px`;
                newParent.style.top = `${ position[ 1 ] }px`;
            }, 10 );
        }

        for( let item of items )
        {
            if( !item )
            {
                this._addSeparator( parentDom );
                continue;
            }

            const key = item.name ?? item;
            const pKey = key.replace( /\s/g, '' ).replaceAll( '.', '' );

            // Item already created
            if( parentDom.querySelector( "#" + pKey ) )
            {
                continue;
            }

            const menuItem = document.createElement('div');
            menuItem.className = "lexdropdownmenuitem" + ( item.name ? "" : " label" ) + ( item.disabled ?? false ? " disabled" : "" );
            menuItem.id = pKey;
            menuItem.innerHTML = `<span>${ key }</span>`;

            menuItem.tabIndex = "1";
            parentDom.appendChild( menuItem );

            if( item.constructor === String || ( item.disabled ?? false ) )
            {
                continue;
            }

            if( item.submenu )
            {
                let submenuIcon = document.createElement('a');
                submenuIcon.className = "fa-solid fa-angle-right fa-xs";
                menuItem.appendChild( submenuIcon );
            }

            if( item.icon )
            {
                const icon = LX.makeIcon( item.icon );
                menuItem.prepend( icon );
            }

            if( item.checked != undefined )
            {
                const checkbox = new Checkbox( pKey + "_entryChecked", item.checked, (v) => {
                    const f = item[ 'callback' ];
                    if( f )
                    {
                        f.call( this, key, menuItem, v );
                    }
                }, { className: "accent" });
                const input = checkbox.root.querySelector( "input" );
                menuItem.prepend( input );

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
                    this.destroy();
                } );
            }

            menuItem.addEventListener("mouseover", e => {

                let path = menuItem.id;
                let p = parentDom;

                while( p )
                {
                    path += "/" + p.id;
                    p = p.currentParent?.parentElement;
                }

                LX.root.querySelectorAll( ".lexdropdownmenu" ).forEach( m => {
                    if( !path.includes( m.id ) )
                    {
                        m.currentParent.built = false;
                        m.remove();
                    }
                } );

                if( item.submenu )
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
        }
    }

    _adjustPosition() {

        const position = [ document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop ];

        /*
        - avoidCollisions
        - side
        - align
        - alignOffset
        - sideOffsetS
        */

        // Place menu using trigger position and user options
        {
            const rect = this._trigger.getBoundingClientRect();

            let alignWidth = true;

            switch( this.side )
            {
                case "left":
                    position[ 0 ] += ( rect.x - this.root.offsetWidth );
                    alignWidth = false;
                    break;
                case "right":
                    position[ 0 ] += ( rect.x + rect.width );
                    alignWidth = false;
                    break;
                case "top":
                    position[ 1 ] += ( rect.y - this.root.offsetHeight );
                    alignWidth = true;
                    break;
                case "bottom":
                    position[ 1 ] += ( rect.y + rect.height );
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
        }

        if( this.avoidCollisions )
        {
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
    }

    _addSeparator( parent ) {
        const separator = document.createElement('div');
        separator.className = "separator";
        parent = parent ?? this.root;
        parent.appendChild( separator );
    }
};

LX.DropdownMenu = DropdownMenu;

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

        if( !options.skipAppend )
        {
            let lexroot = document.getElementById("lexroot");
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
     * @param {Object} options
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

        const type = options.type || "horizontal";
        const sizes = options.sizes || [ "50%", "50%" ];
        const auto = (options.sizes === 'auto');

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
        let area1 = new Area( { skipAppend: true, className: "split" + ( options.menubar || options.sidebar ? "" : " origin" ) } );
        let area2 = new Area( { skipAppend: true, className: "split" } );

        area1.parentArea = this;
        area2.parentArea = this;

        let minimizable = options.minimizable ?? false;
        let resize = ( options.resize ?? true ) || minimizable;

        let data = "0px";
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
            let width1 = sizes[ 0 ],
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
                    for ( const entry of entries )
                    {
                        const bb = entry.contentRect;
                        area2.root.style.height = "calc(100% - " + ( bb.height + 4) + "px )";
                    }
                });

                resizeObserver.observe( area1.root );
            }
            else
            {
                let height1 = sizes[ 0 ],
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
                area1.root.style.height = ( height1 == "auto" ? height1 : "calc( " + height1 + " - " + data + " )");
                area2.root.style.height = ( height2 == "auto" ? height2 : "calc( " + height2 + " - " + data + " )");
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

        doAsync( () => {
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

        let [area1, area2] = this.sections;
        this.splitExtended = true;

        if( this.type == "vertical")
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
        let panel = new Panel( options );
        this.attach( panel );
        this.panels.push( panel );
        return panel;
    }

    /**
     * @method addMenubar
     * @param {Function} callback Function to fill the menubar
     * @param {Object} options:
     * float: Justify content (left, center, right) [left]
     * sticky: Fix menubar at the top [true]
     */

    addMenubar( callback, options = {} ) {

        let menubar = new Menubar( options );

        if( callback )
        {
            callback( menubar );
        }

        LX.menubars.push( menubar );

        const height = 48; // pixels
        const [ bar, content ] = this.split({ type: 'vertical', sizes: [height, null], resize: false, menubar: true });
        menubar.siblingArea = content;

        bar.attach( menubar );
        bar.isMenubar = true;

        if( options.sticky ?? true )
        {
            bar.root.className += " sticky top-0";
        }

        return menubar;
    }

    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     * @param {Object} options: Sidebar options
     * width: Width of the sidebar [16rem]
     */

    addSidebar( callback, options = {} ) {

        let sidebar = new SideBar( options );

        if( callback )
        {
            callback( sidebar );
        }

        // Generate DOM elements after adding all entries
        sidebar.update();

        LX.menubars.push( sidebar );

        const width = options.width ?? "16rem";
        const [ bar, content ] = this.split( { type: 'horizontal', sizes: [ width, null ], resize: false, sidebar: true } );
        sidebar.siblingArea = content;

        bar.attach( sidebar );
        bar.isSidebar = true;

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
                className: b.class ?? "",
                title: b.name
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

                    callback( value, event, button.root );

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
     * @param {Object} options:
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

        for( var i = 0; i < this.sections.length; i++ )
        {
            this.sections[ i ]._update();
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

    constructor( area, options = {} ) {

        this.onclose = options.onclose;

        let container = document.createElement('div');
        container.className = "lexareatabs " + (options.fit ? "fit" : "row");

        const folding = options.folding ?? false;
        if(folding) container.classList.add("folding");

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

        area.split({ type: 'vertical', sizes: options.sizes ?? "auto", resize: false, top: 6 });
        area.sections[ 0 ].attach( container );

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
                tabEl.classList.toggle('selected', ( this.folding && tabEl.selected ));
                // Manage visibility
                scope.area.root.querySelectorAll( '.lextabcontent' ).forEach( c => c.style.display = 'none' );
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
                scope.thumb.style.width = ( tabEl.offsetWidth - 5 ) + "px";
                scope.thumb.style.height = ( tabEl.offsetHeight - 6 ) + "px";
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

        tabEl.addEventListener("mouseup", e => {
            e.preventDefault();
            e.stopPropagation();
            if( e.button == 1 )
            {
                this.delete( tabEl.dataset[ "name" ] );
            }
        });

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

    constructor( options = {} ) {

        this.root = document.createElement( "div" );
        this.root.className = "lexmenubar";

        if( options.float )
        {
            this.root.style.justifyContent = options.float;
        }

        this.items = [ ];
        this.buttons = [ ];
        this.icons = { };
        this.shorts = { };
    }

    _resetMenubar( focus ) {

        // Menu entries are in the menubar..
        this.root.querySelectorAll(".lexmenuentry").forEach( _entry => {
            _entry.classList.remove( 'selected' );
            _entry.built = false;
        } );

        // Menuboxes are in the root area!
        LX.root.querySelectorAll(".lexmenubox").forEach(e => e.remove());

        // Next time we need to click again
        this.focused = focus ?? false;
    }

    _createSubmenu( o, k, c, d ) {

        let menuElement = document.createElement('div');
        menuElement.className = "lexmenubox";
        menuElement.tabIndex = "0";
        c.currentMenu = menuElement;
        menuElement.parentEntry = c;

        const isSubMenu = c.classList.contains( "lexmenuboxentry" );
        if( isSubMenu )
        {
            menuElement.dataset[ "submenu" ] = true;
        }

        menuElement._updatePosition = () => {

            // Remove transitions for this change..
            const transition = menuElement.style.transition;
            menuElement.style.transition = "none";
            flushCss( menuElement );

            doAsync( () => {
                let rect = c.getBoundingClientRect();
                rect.x += document.scrollingElement.scrollLeft;
                rect.y += document.scrollingElement.scrollTop;
                menuElement.style.left = ( isSubMenu ? ( rect.x + rect.width ) : rect.x ) + "px";
                menuElement.style.top = ( isSubMenu ? rect.y : ( ( rect.y + rect.height ) ) - 4 ) + "px";

                menuElement.style.transition = transition;
            } );
        };

        menuElement._updatePosition();

        doAsync( () => {
            menuElement.dataset[ "open" ] = true;
        }, 10 );

        LX.root.appendChild( menuElement );

        for( var i = 0; i < o[ k ].length; ++i )
        {
            const subitem = o[ k ][ i ];
            const subkey = Object.keys( subitem )[ 0 ];
            const hasSubmenu = subitem[ subkey ].length;
            const isCheckbox = subitem[ 'type' ] == 'checkbox';
            let subentry = document.createElement('div');
            subentry.tabIndex = "1";
            subentry.className = "lexmenuboxentry";
            subentry.className += (i == o[k].length - 1 ? " last" : "") + ( subitem.disabled ? " disabled" : "" );

            if( subkey == '' )
            {
                subentry.className = " lexseparator";
            }
            else
            {
                subentry.id = subkey;
                let subentrycont = document.createElement('div');
                subentrycont.innerHTML = "";
                subentrycont.classList = "lexmenuboxentrycontainer";
                subentry.appendChild(subentrycont);
                const icon = this.icons[ subkey ];
                if( isCheckbox )
                {
                    subentrycont.innerHTML += "<input type='checkbox' >";
                }
                else if( icon )
                {
                    subentrycont.innerHTML += "<a class='" + icon + " fa-sm'></a>";
                }
                else
                {
                    subentrycont.innerHTML += "<a class='fa-solid fa-sm noicon'></a>";
                    subentrycont.classList.add( "noicon" );

                }
                subentrycont.innerHTML += "<div class='lexentryname'>" + subkey + "</div>";
            }

            let checkboxInput = subentry.querySelector('input');
            if( checkboxInput )
            {
                checkboxInput.checked = subitem.checked ?? false;
                checkboxInput.addEventListener('change', e => {
                    subitem.checked = checkboxInput.checked;
                    const f = subitem[ 'callback' ];
                    if( f )
                    {
                        f.call( this, subitem.checked, subkey, subentry );
                        this._resetMenubar();
                    }
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                })
            }

            menuElement.appendChild( subentry );

            // Nothing more for separators
            if( subkey == '' )
            {
                continue;
            }

            menuElement.addEventListener('keydown', e => {
                e.preventDefault();
                let short = this.shorts[ subkey ];
                if(!short) return;
                // check if it's a letter or other key
                short = short.length == 1 ? short.toLowerCase() : short;
                if( short == e.key )
                {
                    subentry.click()
                }
            });

            // Add callback
            subentry.addEventListener("click", e => {
                if( checkboxInput )
                {
                    subitem.checked = !subitem.checked;
                }
                const f = subitem[ 'callback' ];
                if( f )
                {
                    f.call( this, checkboxInput ? subitem.checked : subkey, checkboxInput ? subkey : subentry );
                    this._resetMenubar();
                }
                e.stopPropagation();
                e.stopImmediatePropagation();
            });

            subentry.addEventListener("blur", e => {

                if( e.target && e.target.className.includes( "lexmenu" ) )
                {
                    return;
                }
                this._resetMenubar();
            });

            // Add icon if has submenu, else check for shortcut
            if( !hasSubmenu )
            {
                if( this.shorts[ subkey ] )
                {
                    let shortEl = document.createElement('div');
                    shortEl.className = "lexentryshort";
                    shortEl.innerText = this.shorts[ subkey ];
                    subentry.appendChild( shortEl );
                }
                continue;
            }

            let submenuIcon = document.createElement('a');
            submenuIcon.className = "fa-solid fa-angle-right fa-xs";
            subentry.appendChild( submenuIcon );

            subentry.addEventListener("mouseover", e => {
                if( subentry.built )
                {
                    return;
                }
                subentry.built = true;
                this._createSubmenu( subitem, subkey, subentry, ++d );
                e.stopPropagation();
            });

            subentry.addEventListener("mouseleave", e => {
                if( subentry.currentMenu && ( subentry.currentMenu != e.toElement ) )
                {
                    d = -1; // Reset depth
                    delete subentry.built;
                    subentry.currentMenu.remove();
                    delete subentry.currentMenu;
                }
            });
        }

        // Set final width
        menuElement.style.width = menuElement.offsetWidth + "px";
    }

    /**
     * @method add
     * @param {Object} options:
     * callback: Function to call on each item
     * icon: Entry icon
     * short: Entry shortcut name
     */

    add( path, options = {} ) {

        if( options.constructor == Function )
        {
            options = { callback: options };
        }

        // Process path
        const tokens = path.split( "/" );

        // Assign icons and shortcuts to last token in path
        const lastPath = tokens[tokens.length - 1];
        this.icons[ lastPath ] = options.icon;
        this.shorts[ lastPath ] = options.short;

        let idx = 0;

        const _insertEntry = ( token, list ) => {
            if( token == undefined )
            {
                return;
            }

            let found = null;
            list.forEach( o => {
                const keys = Object.keys( o );
                const key = keys.find( t => t == token );
                if( key ) found = o[ key ];
            } );

            if( found )
            {
                _insertEntry( tokens[ idx++ ], found );
            }
            else
            {
                let item = {};
                item[ token ] = [];
                const nextToken = tokens[ idx++ ];
                // Check if last token -> add callback
                if( !nextToken )
                {
                    item[ 'callback' ] = options.callback;
                    item[ 'disabled' ] = options.disabled;
                    item[ 'type' ] = options.type;
                    item[ 'checked' ] = options.checked;
                }
                list.push( item );
                _insertEntry( nextToken, item[ token ] );
            }
        };

        _insertEntry( tokens[idx++], this.items );

        // Create elements

        for( let item of this.items )
        {
            let key = Object.keys( item )[ 0 ];
            let pKey = key.replace( /\s/g, '' ).replaceAll( '.', '' );

            // Item already created
            if( this.root.querySelector( "#" + pKey ) )
            {
                continue;
            }

            let entry = document.createElement('div');
            entry.className = "lexmenuentry";
            entry.id = pKey;
            entry.innerHTML = "<span>" + key + "</span>";
            entry.tabIndex = "1";

            if( options.position == "left" )
            {
                this.root.prepend( entry );
            }
            else
            {
                if( options.position == "right" )
                {
                    entry.right = true;
                }

                if( this.root.lastChild && this.root.lastChild.right )
                {
                    this.root.lastChild.before( entry );
                }
                else
                {
                    this.root.appendChild( entry );
                }
            }

            const _showEntry = () => {
                this._resetMenubar(true);
                entry.classList.add( "selected" );
                entry.built = true;
                this._createSubmenu( item, key, entry, -1 );
            };

            entry.addEventListener("click", () => {
                const f = item[ 'callback' ];
                if( f )
                {
                    f.call( this, key, entry );
                    return;
                }

                _showEntry();

                this.focused = true;
            });

            entry.addEventListener( "mouseover", (e) => {

                if( this.focused && !entry.built )
                {
                    _showEntry();
                }
            });

            entry.addEventListener("blur", e => {

                if( e.relatedTarget && e.relatedTarget.className.includes( "lexmenubox" ) )
                {
                    return;
                }

                this._resetMenubar();
            });
        }
    }

    /**
     * @method getButton
     * @param {String} name
     */

    getButton( name ) {
        return this.buttons[ name ];
    }

    /**
     * @method getSubitems
     * @param {Object} item: parent item
     * @param {Array} tokens: split path strings
    */
    getSubitem( item, tokens ) {

        let subitem = null;
        let path = tokens[ 0 ];

        for( let i = 0; i < item.length; i++ )
        {
            if( item[ i ][ path ] )
            {
                if( tokens.length == 1 )
                {
                    subitem = item[ i ];
                    return subitem;
                }
                else
                {
                    tokens.splice( 0, 1 );
                    return this.getSubitem( item[ i ][ path ], tokens );
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
     * @param {String} name
     * @param {String} icon
     * @param {Function} callback
     * @param {Object} options
     */

    setButtonIcon( name, icon, callback, options = {} ) {

        if( !name )
        {
            throw( "Set Button Name!" );
        }

        let button = this.buttons[ name ];
        if( button )
        {
            button.querySelector('a').className = "fa-solid" + " " + icon + " lexicon";
            return;
        }

        // Otherwise, create it
        button = document.createElement('div');
        const disabled = options.disabled ?? false;
        button.className = "lexmenubutton main" + (disabled ? " disabled" : "");
        button.title = name;
        button.innerHTML = "<a class='" + icon + " lexicon'></a>";

        if( options.float == "right" )
        {
            button.right = true;
        }

        if( this.root.lastChild && this.root.lastChild.right )
        {
            this.root.lastChild.before( button );
        }
        else if( options.float == "left" )
        {
            this.root.prepend( button );
        }
        else
        {
            this.root.appendChild( button );
        }

        const _b = button.querySelector('a');
        _b.addEventListener("click", (e) => {
            if( callback && !disabled )
            {
                callback.call( this, _b, e );
            }
        });

        this.buttons[ name ] = button;
    }

    /**
     * @method setButtonImage
     * @param {String} name
     * @param {String} src
     * @param {Function} callback
     * @param {Object} options
     */

    setButtonImage( name, src, callback, options = {} ) {

        if( !name )
        {
            throw( "Set Button Name!" );
        }

        let button = this.buttons[ name ];
        if( button )
        {
            button.querySelector('img').src = src;
            return;
        }

        // Otherwise, create it
        button = document.createElement('div');
        const disabled = options.disabled ?? false;
        button.className = "lexmenubutton" + (disabled ? " disabled" : "");
        button.title = name;
        button.innerHTML = "<a><image src='" + src + "' class='lexicon' style='height:32px;'></a>";

        if( options.float == "right" )
        {
            button.right = true;
        }

        if( this.root.lastChild && this.root.lastChild.right )
        {
            this.root.lastChild.before( button );
        }
        else if( options.float == "left" )
        {
            this.root.prepend( button );
        }
        else
        {
            this.root.appendChild( button );
        }

        const _b = button.querySelector('a');
        _b.addEventListener("click", (e) => {
            if( callback && !disabled )
            {
                callback.call( this, _b, e );
            }
        });

        this.buttons[ name ] = button;
    }

    /**
     * @method addButton
     * @param {Array} buttons
     * @param {Object} options
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

                button.swap = function() {
                    const swapInput = this.querySelector( "input" );
                    swapInput.checked = !swapInput.checked;
                };

                // Set if swap has to be performed
                button.setState = function( v ) {
                    const swapInput = this.querySelector( "input" );
                    swapInput.checked = v;
                };
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

    /**
     * @param {Object} options
     * filter: Add search bar to filter entries [false]
     * displaySelected: Indicate if an entry is displayed as selected
     * skipHeader: Do not use sidebar header [false]
     * headerImg: Image to be shown as avatar
     * headerIcon: Icon to be shown as avatar (from LX.ICONS)
     * headerTitle: Header title
     * headerSubtitle: Header subtitle
     * header: HTMLElement to add a custom header
     * skipFooter: Do not use sidebar footer [false]
     * footerImg: Image to be shown as avatar
     * footerIcon: Icon to be shown as avatar (from LX.ICONS)
     * footerTitle: Footer title
     * footerSubtitle: Footer subtitle
     * footer: HTMLElement to add a custom footer
     * collapsable: Sidebar can toggle between collapsed/expanded [true]
     * collapseToIcons: When Sidebar collapses, icons remains visible [true]
     * onHeaderPressed: Function to call when header is pressed
     * onFooterPressed: Function to call when footer is pressed
     */

    constructor( options = {} ) {

        this.root = document.createElement( "div" );
        this.root.className = "lexsidebar";

        this._displaySelected = options.displaySelected ?? false;

        Object.defineProperty( SideBar.prototype, "displaySelected", {
            get: function() { return this._displaySelected; },
            set: function( v ) {
                this._displaySelected = v;
                if( !this._displaySelected )
                {
                    this.root.querySelectorAll(".lexsidebarentry").forEach( e => e.classList.remove( 'selected' ) );
                }
            },
            enumerable: true,
            configurable: true
        });

        this.collapsable = options.collapsable ?? true;
        this._collapseWidth = ( options.collapseToIcons ?? true ) ? "58px" : "0px";
        this.collapsed = false;

        this.filterString = "";

        doAsync( () => {

            this.root.parentElement.ogWidth = this.root.parentElement.style.width;
            this.root.parentElement.style.transition = "width 0.25s ease-out";

            this.resizeObserver = new ResizeObserver( entries => {
                for ( const entry of entries )
                {
                    this.siblingArea.setSize( [ "calc(100% - " + ( entry.contentRect.width ) + "px )", null ] );
                }
            });

        }, 10 );

        // Header
        if( !( options.skipHeader ?? false ) )
        {
            this.header = options.header ?? this._generateDefaultHeader( options );
            console.assert( this.header.constructor === HTMLDivElement, "Use an HTMLDivElement to build your custom header" );
            this.header.className = "lexsidebarheader";
            this.root.appendChild( this.header );

            if( this.collapsable )
            {
                const icon = LX.makeIcon( "sidebar", "Toggle Sidebar", "toggler" );
                this.header.appendChild( icon );

                icon.addEventListener( "click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleCollapsed();
                } );
            }
        }

        // Entry filter
        if( ( options.filter ?? false ) )
        {
            const panel = new Panel();
            panel.addText(null, "", (value, event) => {
                this.filterString = value;
                this.update();
            }, { placeholder: "Search...", icon: "fa-solid fa-magnifying-glass" });
            this.filter = panel.root.childNodes[ 0 ];
            this.root.appendChild( this.filter );
        }

        // Content
        {
            this.content = document.createElement( 'div' );
            this.content.className = "lexsidebarcontent";
            this.root.appendChild( this.content );
        }

        // Footer
        if( !( options.skipFooter ?? false ) )
        {
            this.footer = options.footer ?? this._generateDefaultFooter( options );
            console.assert( this.footer.constructor === HTMLDivElement, "Use an HTMLDivElement to build your custom footer" );
            this.footer.className = "lexsidebarfooter";
            this.root.appendChild( this.footer );
        }

        // Set width depending on header/footer
        doAsync( () => {
            // This account for header, footer and all inner paddings
            const contentOffset = ( this.header?.offsetHeight ?? 0 ) +
                ( this.filter?.offsetHeight ?? 0 ) +
                ( this.footer?.offsetHeight ?? 0 );
            this.content.style.height = `calc(100% - ${ contentOffset }px)`;
        }, 10 );

        this.items = [ ];
        this.icons = { };
        this.groups = { };
    }

    _generateDefaultHeader( options ) {

        const header = document.createElement( 'div' );

        header.addEventListener( "click", e => {
            if( this.collapsed )
            {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCollapsed();
            }
            else if( options.onHeaderPressed )
            {
                options.onHeaderPressed( e );
            }
        } );

        const avatar = document.createElement( 'span' );
        avatar.className = "lexavatar";
        header.appendChild( avatar );

        if( options.headerImage )
        {
            const avatarImg = document.createElement( 'img' );
            avatarImg.src = options.headerImage;
            avatar.appendChild( avatarImg );
        }
        else if( options.headerIcon )
        {
            const avatarIcon = LX.makeIcon( options.headerIcon );
            avatar.appendChild( avatarIcon );
        }

        // Info
        {
            const info = document.createElement( 'div' );
            info.className = "infodefault";
            header.appendChild( info );

            const infoText = document.createElement( 'span' );
            infoText.innerHTML = options.headerTitle ?? "";
            info.appendChild( infoText );

            const infoSubtext = document.createElement( 'span' );
            infoSubtext.innerHTML = options.headerSubtitle ?? "";
            info.appendChild( infoSubtext );
        }

        return header;
    }

    _generateDefaultFooter( options ) {

        const footer = document.createElement( 'div' );

        footer.addEventListener( "click", e => {
            if( options.onFooterPressed )
            {
                options.onFooterPressed( e, footer );
            }
        } );

        const avatar = document.createElement( 'span' );
        avatar.className = "lexavatar";
        footer.appendChild( avatar );

        if( options.footerImage )
        {
            const avatarImg = document.createElement( 'img' );
            avatarImg.src = options.footerImage;
            avatar.appendChild( avatarImg );
        }
        else if( options.footerIcon )
        {
            const avatarIcon = LX.makeIcon( options.footerIcon );
            avatar.appendChild( avatarIcon );
        }

        // Info
        {
            const info = document.createElement( 'div' );
            info.className = "infodefault";
            footer.appendChild( info );

            const infoText = document.createElement( 'span' );
            infoText.innerHTML = options.footerTitle ?? "";
            info.appendChild( infoText );

            const infoSubtext = document.createElement( 'span' );
            infoSubtext.innerHTML = options.footerSubtitle ?? "";
            info.appendChild( infoSubtext );
        }

        const icon = LX.makeIcon( "menu-arrows" );
        footer.appendChild( icon );

        return footer;
    }

    /**
     * @method toggleCollapsed
     * @param {Boolean} force: Force collapsed state
     */

    toggleCollapsed( force ) {

        if( !this.collapsable )
        {
            return;
        }

        this.collapsed = force ?? !this.collapsed;

        if( this.collapsed )
        {
            this.root.classList.add( "collapsing" );
            this.root.parentElement.style.width = this._collapseWidth;
        }
        else
        {
            this.root.classList.remove( "collapsing" );
            this.root.classList.remove( "collapsed" );
            this.root.parentElement.style.width = this.root.parentElement.ogWidth;
        }

        if( !this.resizeObserver )
        {
            throw( "Wait until ResizeObserver has been created!" );
        }

        this.resizeObserver.observe( this.root.parentElement );

        doAsync( () => {

            this.root.classList.toggle( "collapsed", this.collapsed );
            this.resizeObserver.unobserve( this.root.parentElement );

        }, 250 );
    }

    /**
     * @method separator
     */

    separator() {

        this.currentGroup = null;

        this.add( "" );
    }

    /**
     * @method group
     * @param {String} groupName
     * @param {Object} action: { icon, callback }
     */

    group( groupName, action ) {

        this.currentGroup = groupName;

        this.groups[ groupName ] = action;
    }

    /**
     * @method add
     * @param {String} path
     * @param {Object} options:
     * callback: Function to call on each item
     * className: Add class to the entry DOM element
     * collapsable: Add entry as a collapsable section
     * icon: Entry icon
     */

    add( path, options = {} ) {

        if( options.constructor == Function )
        {
            options = { callback: options };
        }

        // Process path
        const tokens = path.split( "/" );

        // Assign icons and shortcuts to last token in path
        const lastPath = tokens[tokens.length - 1];
        this.icons[ lastPath ] = options.icon;

        let idx = 0;

        const _insertEntry = ( token, list ) => {

            if( token == undefined )
            {
                return;
            }

            let found = null;
            list.forEach( o => {
                const keys = Object.keys( o );
                const key = keys.find( t => t == token );
                if( key ) found = o[ key ];
            } );

            if( found )
            {
                _insertEntry( tokens[ idx++ ], found );
            }
            else
            {
                let item = {};
                item[ token ] = [];
                const nextToken = tokens[ idx++ ];
                // Check if last token -> add callback
                if( !nextToken )
                {
                    item[ 'callback' ] = options.callback;
                    item[ 'group' ] = this.currentGroup;
                    item[ 'options' ] = options;
                }
                list.push( item );
                _insertEntry( nextToken, item[ token ] );
            }
        };

        _insertEntry( tokens[idx++], this.items );
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

        entry.dom.click();
    }

    update() {

        // Reset first

        this.content.innerHTML = "";

        for( let item of this.items )
        {
            delete item.dom;
        }

        for( let item of this.items )
        {
            const options = item.options ?? { };

            // Item already created
            if( item.dom )
            {
                continue;
            }

            let key = Object.keys( item )[ 0 ];

            if( this.filterString.length && !key.toLowerCase().includes( this.filterString.toLowerCase() ) )
            {
                continue;
            }

            let pKey = key.replace( /\s/g, '' ).replaceAll( '.', '' );
            let currentGroup = null;

            let entry = document.createElement( 'div' );
            entry.className = "lexsidebarentry " + ( options.className ?? "" );
            entry.id = item.name = pKey;

            if( item.group )
            {
                const pGroupKey = item.group.replace( /\s/g, '' ).replaceAll( '.', '' );
                currentGroup = this.content.querySelector( "#" + pGroupKey );

                if( !currentGroup )
                {
                    currentGroup = document.createElement( 'div' );
                    currentGroup.id = pGroupKey;
                    currentGroup.className = "lexsidebargroup";
                    this.content.appendChild( currentGroup );

                    let groupEntry = document.createElement( 'div' );
                    groupEntry.className = "lexsidebargrouptitle";
                    currentGroup.appendChild( groupEntry );

                    let groupLabel = document.createElement( 'div' );
                    groupLabel.innerHTML = item.group;
                    groupEntry.appendChild( groupLabel );

                    if( this.groups[ item.group ] != null )
                    {
                        let groupAction = document.createElement( 'a' );
                        groupAction.className = ( this.groups[ item.group ].icon ?? "" ) + " lexicon";
                        groupEntry.appendChild( groupAction );
                        groupAction.addEventListener( "click", (e) => {
                            if( this.groups[ item.group ].callback )
                            {
                                this.groups[ item.group ].callback( item.group, e );
                            }
                        } );
                    }

                }
                else if( !currentGroup.classList.contains( "lexsidebargroup" ) )
                {
                    throw( "Bad id: " + item.group );
                }
            }

            if( pKey == "" )
            {
                let separatorDom = document.createElement( 'div' );
                separatorDom.className = "lexsidebarseparator";
                this.content.appendChild( separatorDom );
                continue;
            }

            if( this.collapseContainer )
            {
                this.collapseContainer.appendChild( entry );

                this.collapseQueue--;
                if( !this.collapseQueue )
                {
                    delete this.collapseContainer;
                }
            }
            else if( currentGroup )
            {
                currentGroup.appendChild( entry );
            }
            else
            {
                this.content.appendChild( entry );
            }

            let itemDom = document.createElement( 'div' );
            entry.appendChild( itemDom );
            item.dom = entry;

            if( options.type == "checkbox" )
            {
                item.value = options.value ?? false;
                const panel = new Panel();
                item.checkbox = panel.addCheckbox(null, item.value, (value, event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const f = options.callback;
                    item.value = value;
                    if( f ) f.call( this, key, value, event );
                }, { className: "accent", label: key, signal: ( "@checkbox_"  + key ) });
                itemDom.appendChild( panel.root.childNodes[ 0 ] );
            }
            else
            {
                if( options.icon )
                {
                    let itemIcon = document.createElement( 'i' );
                    itemIcon.className = options.icon;
                    itemDom.appendChild( itemIcon );
                }

                let itemName = document.createElement( 'a' );
                itemName.innerHTML = key;
                itemDom.appendChild( itemName );
            }

            const isCollapsable = options.collapsable != undefined ? options.collapsable : ( options.collapsable || item[ key ].length );

            entry.addEventListener("click", ( e ) => {
                if( e.target && e.target.classList.contains( "lexcheckbox" ) )
                {
                    return;
                }

                if( isCollapsable )
                {
                    itemDom.querySelector( ".collapser" ).click();
                }
                else
                {
                    const f = options.callback;
                    if( f ) f.call( this, key, item.value, e );

                    if( item.checkbox )
                    {
                        item.value = !item.value;
                        item.checkbox.set( item.value, true );
                    }
                }

                // Manage selected
                if( this.displaySelected )
                {
                    this.root.querySelectorAll(".lexsidebarentry").forEach( e => e.classList.remove( 'selected' ) );
                    entry.classList.add( "selected" );
                }
            });

            if( options.action )
            {
                const actionIcon = LX.makeIcon( options.action.icon ?? "more-horizontal", options.action.name );
                itemDom.appendChild( actionIcon );

                actionIcon.addEventListener( "click", (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const f = options.action.callback;
                    if( f ) f.call( this, key, e );
                } );
            }
            else if( isCollapsable )
            {
                const collapsableContent = document.createElement( 'div' );
                collapsableContent.className = "collapsablecontainer";
                Object.assign( collapsableContent.style, { width: "100%", display: "none" } );
                LX.makeCollapsible( itemDom, collapsableContent, currentGroup ?? this.content );
                this.collapseQueue = options.collapsable;
                this.collapseContainer = collapsableContent;
            }

            let desc = document.createElement( 'span' );
            desc.className = 'lexsidebarentrydesc';
            desc.innerHTML = key;
            entry.appendChild( desc );

            itemDom.addEventListener("mouseenter", () => {
                setTimeout( () => {
                    desc.style.display = "unset";
                }, 150 );
            });

            itemDom.addEventListener("mouseleave", () => {
                setTimeout( () => {
                    desc.style.display = "none";
                }, 150 );
            });

            // Subentries
            if( !item[ key ].length )
            {
                continue;
            }

            let subentryContainer = document.createElement( 'div' );
            subentryContainer.className = "lexsidebarsubentrycontainer";

            if( isCollapsable )
            {
                this.collapseContainer.appendChild( subentryContainer )
                delete this.collapseContainer;
            }
            else if( currentGroup )
            {
                subentryContainer.classList.add( "collapsablecontainer" );
                currentGroup.appendChild( subentryContainer );
            }
            else
            {
                this.content.appendChild( subentryContainer );
            }

            for( let i = 0; i < item[ key ].length; ++i )
            {
                const subitem = item[ key ][ i ];
                const suboptions = subitem.options ?? {};
                const subkey = Object.keys( subitem )[ 0 ];

                if( this.filterString.length && !subkey.toLowerCase().includes( this.filterString.toLowerCase() ) )
                {
                    continue;
                }

                let subentry = document.createElement( 'div' );
                subentry.innerHTML = `<span>${ subkey }</span>`;

                if( suboptions.action )
                {
                    const actionIcon = LX.makeIcon( suboptions.action.icon ?? "more-horizontal", suboptions.action.name );
                    subentry.appendChild( actionIcon );

                    actionIcon.addEventListener( "click", (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const f = suboptions.action.callback;
                        if( f ) f.call( this, subkey, e );
                    } );
                }

                subentry.className = "lexsidebarentry";
                subentry.id = subkey;
                subentryContainer.appendChild( subentry );

                subentry.addEventListener("click", (e) => {

                    const f = suboptions.callback;
                    if( f ) f.call( this, subkey, subentry, e );

                    // Manage selected
                    if( this.displaySelected )
                    {
                        this.root.querySelectorAll(".lexsidebarentry").forEach( e => e.classList.remove( 'selected' ) );
                        entry.classList.add( "selected" );
                    }
                });
            }
        }
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
    static SELECT       = 4;
    static CHECKBOX     = 5;
    static TOGGLE       = 6;
    static RADIO        = 7;
    static BUTTONS      = 8;
    static COLOR        = 9;
    static RANGE        = 10;
    static NUMBER       = 11;
    static TITLE        = 12;
    static VECTOR       = 13;
    static TREE         = 14;
    static PROGRESS     = 15;
    static FILE         = 16;
    static LAYERS       = 17;
    static ARRAY        = 18;
    static LIST         = 19;
    static TAGS         = 20;
    static CURVE        = 21;
    static CARD         = 22;
    static IMAGE        = 23;
    static CONTENT      = 24;
    static CUSTOM       = 25;
    static SEPARATOR    = 26;
    static KNOB         = 27;
    static SIZE         = 28;
    static PAD          = 29;
    static FORM         = 30;
    static DIAL         = 31;
    static COUNTER      = 32;
    static TABLE        = 33;
    static TABS         = 34;
    static LABEL        = 35;
    static BLANK        = 36;

    static NO_CONTEXT_TYPES = [
        Widget.BUTTON,
        Widget.LIST,
        Widget.FILE,
        Widget.PROGRESS
    ];

    constructor( type, name, value, options = {} ) {

        this.type = type;
        this.name = name;
        this.options = options;
        this._initialValue = value;

        const root = document.createElement( 'div' );
        root.className = "lexwidget";

        if( options.id )
        {
            root.id = options.id;
        }

        if( options.title )
        {
            root.title = options.title;
        }

        if( options.className )
        {
            root.className += " " + options.className;
        }

        if( type != Widget.TITLE )
        {
            // root.style.width = "calc(100% - " + (this._currentBranch || type == Widget.FILE || type == Widget.TREE ? 10 : 20) + "px)";

            if( options.width )
            {
                root.style.width = root.style.minWidth = options.width;
            }
            if( options.maxWidth )
            {
                root.style.maxWidth = options.maxWidth;
            }
            if( options.minWidth )
            {
                root.style.minWidth = options.minWidth;
            }
            if( options.height )
            {
                root.style.height = root.style.minHeight = options.height;
            }

            LX.widgetResizeObserver.observe( root );
        }

        if( name != undefined )
        {
            if( !( options.hideName ?? false ) )
            {
                let domName = document.createElement( 'div' );
                domName.className = "lexwidgetname";

                if( options.justifyName )
                {
                    domName.classList.add( "float-" + options.justifyName );
                }

                domName.innerHTML = name;
                domName.title = options.title ?? domName.innerHTML;
                domName.style.width = options.nameWidth || LX.DEFAULT_NAME_WIDTH;
                domName.style.minWidth = domName.style.width;

                root.appendChild( domName );
                root.domName = domName;

                const that = this;

                // Copy-paste info
                domName.addEventListener('contextmenu', function( e ) {
                    e.preventDefault();
                    that.oncontextmenu( e );
                });

                if( !( options.skipReset ?? false )  && ( value != null ) )
                {
                    this._addResetProperty( domName, function( e ) {
                        that.set( that._initialValue, false, e );
                        this.style.display = "none"; // Og value, don't show it
                    });
                }
            }
        }
        else
        {
            options.hideName = true;
        }

        if( options.signal )
        {
            LX.addSignal( options.signal, this );
        }

        this.root = root;
        this.root.jsInstance = this;
        this.options = options;
    }

    static _dispatchEvent( element, type, data, bubbles, cancelable ) {
        let event = new CustomEvent( type, { 'detail': data, 'bubbles': bubbles, 'cancelable': cancelable } );
        element.dispatchEvent( event );
    }

    _addResetProperty( container, callback ) {

        const domEl = LX.makeIcon( "rotate-left", "Reset" )
        domEl.style.display = "none";
        domEl.style.marginRight = "6px";
        domEl.style.marginLeft = "0";
        domEl.style.paddingInline = "6px";
        domEl.addEventListener( "click", callback );
        container.appendChild( domEl );
        return domEl;
    }

    _canPaste() {
        return this.type === Widget.CUSTOM ? navigator.clipboard.customIdx !== undefined && this.customIdx == navigator.clipboard.customIdx :
            navigator.clipboard.type === this.type;
    }

    _trigger( event, callback, scope = this ) {

        if( !callback )
        {
            return;
        }

        callback.call( scope, event.value, event.domEvent, event.name );
    }

    value() {

        if( this.onGetValue )
        {
            return this.onGetValue();
        }

        console.warn( "Can't get value of " + this.typeName() );
    }

    set( value, skipCallback, event ) {

        if( this.onSetValue )
        {
            let resetButton = this.root.querySelector( ".lexwidgetname .lexicon" );
            if( resetButton )
            {
                resetButton.style.display = ( value != this.value() ? "block" : "none" );

                const equalInitial = value.constructor === Array ? (function arraysEqual(a, b) {
                    if (a === b) return true;
                    if (a == null || b == null) return false;
                    if (a.length !== b.length) return false;
                    for (var i = 0; i < a.length; ++i) {
                        if (a[i] !== b[i]) return false;
                    }
                    return true;
                })( value, this._initialValue ) : ( value == this._initialValue );

                resetButton.style.display = ( !equalInitial ? "block" : "none" );
            }

            return this.onSetValue( value, skipCallback ?? false, event );
        }

        console.warn("Can't set value of " + this.typeName());
    }

    oncontextmenu( e ) {

        if( Widget.NO_CONTEXT_TYPES.includes( this.type ) )
        {
            return;
        }

        addContextMenu( this.typeName(), e, c => {
            c.add("Copy", () => { this.copy() });
            c.add("Paste", { disabled: !this._canPaste(), callback: () => { this.paste() } } );
        });
    }

    copy() {
        navigator.clipboard.type = this.type;
        navigator.clipboard.customIdx = this.customIdx;
        navigator.clipboard.data = this.value();
        navigator.clipboard.writeText( navigator.clipboard.data );
    }

    paste() {
        if( !this._canPaste() )
        {
            return;
        }

        this.set( navigator.clipboard.data );
    }

    typeName() {

        switch( this.type )
        {
            case Widget.TEXT: return "Text";
            case Widget.TEXTAREA: return "TextArea";
            case Widget.BUTTON: return "Button";
            case Widget.SELECT: return "Select";
            case Widget.CHECKBOX: return "Checkbox";
            case Widget.TOGGLE: return "Toggle";
            case Widget.RADIO: return "Radio";
            case Widget.COLOR: return "Color";
            case Widget.RANGE: return "Range";
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
            case Widget.TABLE: return "Table";
            case Widget.TABS: return "Tabs";
            case Widget.LABEL: return "Label";
            case Widget.BLANK: return "Blank";
            case Widget.CUSTOM: return this.customName;
        }

        console.error( `Unknown Widget type: ${ this.type }` );
    }

    refresh() {

    }
}

LX.Widget = Widget;

function ADD_CUSTOM_WIDGET( customWidgetName, options = {} )
{
    let customIdx = simple_guidGenerator();

    Panel.prototype[ 'add' + customWidgetName ] = function( name, instance, callback ) {

        options.nameWidth = "100%";

        let widget = new Widget( Widget.CUSTOM, name, null, options );
        this._attachWidget( widget );

        widget.customName = customWidgetName;
        widget.customIdx = customIdx;

        widget.onGetValue = () => {
            return instance;
        };

        widget.onSetValue = ( newValue, skipCallback, event ) => {
            instance = newValue;
            refresh_widget();
            element.querySelector( ".lexcustomitems" ).toggleAttribute( 'hidden', false );
            if( !skipCallback )
            {
                widget._trigger( new IEvent( name, instance, event ), callback );
            }
        };

        const element = widget.root;

        let container, customWidgetsDom;
        let default_instance = options.default ?? {};

        // Add instance button

        const refresh_widget = () => {

            if( instance )
            {
                widget.instance = instance = Object.assign(deepCopy(default_instance), instance);
            }

            if( container ) container.remove();
            if( customWidgetsDom ) customWidgetsDom.remove();

            container = document.createElement('div');
            container.className = "lexcustomcontainer";
            container.style.width = "100%";
            element.appendChild( container );
            element.dataset["opened"] = false;

            let buttonName = "<a class='fa-solid " + (options.icon ?? "fa-cube")  + "'></a>";
            buttonName += customWidgetName + (!instance ? " [empty]" : "");
            // Add always icon to keep spacing right
            buttonName += "<a class='fa-solid " + (instance ? "fa-bars-staggered" : " ") + " menu'></a>";

            let buttonEl = this.addButton(null, buttonName, (value, event) => {
                if( instance )
                {
                    element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                }
                else
                {
                    addContextMenu(null, event, c => {
                        c.add("New " + customWidgetName, () => {
                            instance = {};
                            refresh_widget();
                            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                        });
                    });
                }

            }, { buttonClass: 'custom' });
            container.appendChild( buttonEl.root );

            if( instance )
            {
                buttonEl.root.querySelector('a.menu').addEventListener('click', e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    addContextMenu(null, e, c => {
                        c.add("Clear", () => {
                            instance = null;
                            refresh_widget();
                        });
                    });
                });
            }

            // Show elements

            customWidgetsDom = document.createElement('div');
            customWidgetsDom.className = "lexcustomitems";
            customWidgetsDom.toggleAttribute('hidden', true);
            element.appendChild( customWidgetsDom );

            if( instance )
            {
                this.queue( customWidgetsDom );

                const on_instance_changed = ( key, value, event ) => {
                    instance[ key ] = value;
                    widget._trigger( new IEvent( name, instance, event ), callback );
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
                                this._addVector( value.length, key, value, on_instance_changed.bind( this, key ) );
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

        this._forceClose = false;

        if( data.constructor === Object )
        {
            this._createItem( null, data );
        }
        else
        {
            for( let d of data )
            {
                this._createItem( null, d );
            }
        }
    }

    _createItem( parent, node, level = 0, selectedId ) {

        const that = this;
        const nodeFilterInput = this.domEl.querySelector( ".lexnodetree_filter" );

        node.children = node.children ?? [];
        if( nodeFilterInput && nodeFilterInput.value != "" && !node.id.includes( nodeFilterInput.value ) )
        {
            for( var i = 0; i < node.children.length; ++i )
            {
                this._createItem( node, node.children[ i ], level + 1, selectedId );
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
        item.treeData = node;

        // Select hierarchy icon
        let icon = (this.options.skip_default_icon ?? true) ? "" : "fa-solid fa-square"; // Default: no childs
        if( isParent )
        {
            icon = node.closed ? "fa-solid fa-caret-right" : "fa-solid fa-caret-down";
            item.innerHTML = "<a class='" + icon + " hierarchy'></a>";
        }

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
        item.style.paddingLeft = ((3 + (level+1) * 15)) + "px";
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
            if( idx > -1 )
            {
                item.classList.remove( 'selected' );
                this.selected.splice( idx, 1 );
            }
            else
            {
                item.classList.add( 'selected' );
                this.selected.push( node );
            }

            // Only Show children...
            if( isParent && node.id.length > 1 /* Strange case... */)
            {
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

            if( !that.onevent )
            {
                return;
            }

            const event = new TreeEvent(TreeEvent.NODE_CONTEXTMENU, this.selected.length > 1 ? this.selected : node, e);
            event.multiple = this.selected.length > 1;

            LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {
                event.panel = m;
            });

            that.onevent( event );

            if( this.options.addDefault ?? false )
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
                            nodeItem.classList.add( "selected" );
                            this.selected.push( child );
                            selectChildren( child );
                        }
                    };

                    this.domEl.querySelectorAll( ".selected" ).forEach( i => i.classList.remove( "selected" ) );
                    this.selected.length = 0;

                    // Add childs of the clicked node
                    selectChildren( node );
                } );

                event.panel.add( "Delete", { callback: () => {
                    // It's the root node
                    if( !node.parent )
                    {
                        return;
                    }

                    if( that.onevent )
                    {
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
                if( that.onevent )
                {
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

        const nameInput = document.createElement( "input" );
        nameInput.toggleAttribute( "hidden", !node.rename );
        nameInput.value = node.id;
        item.appendChild( nameInput );

        if( node.rename )
        {
            item.classList.add('selected');
            nameInput.focus();
        }

        nameInput.addEventListener("keyup", function( e ) {
            if( e.key == "Enter" )
            {
                this.value = this.value.replace(/\s/g, '_');

                if( that.onevent )
                {
                    const event = new TreeEvent(TreeEvent.NODE_RENAMED, node, this.value);
                    that.onevent( event );
                }

                node.id = LX.getSupportedDOMName( this.value );
                delete node.rename;
                that.frefresh( node.id );
                list.querySelector( "#" + node.id ).classList.add('selected');
            }
            else if(e.key == "Escape")
            {
                delete node.rename;
                that.frefresh( node.id );
            }
        });

        nameInput.addEventListener("blur", function( e ) {
            delete node.rename;
            that.refresh();
        });

        if( this.options.draggable ?? true )
        {
            // Drag nodes
            if( parent ) // Root doesn't move!
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
                if( dragged.id == target.id )
                {
                    console.warn("Cannot parent node to itself!");
                    return;
                }

                // Can't drop to child node
                const isChild = function( newParent, node ) {
                    var result = false;
                    for( var c of node.children )
                    {
                        if( c.id == newParent.id ) return true;
                        result |= isChild( newParent, c );
                    }
                    return result;
                };

                if( isChild( target, dragged ))
                {
                    console.warn("Cannot parent node to a current child!");
                    return;
                }

                // Trigger node dragger event
                if( that.onevent )
                {
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
        if( isParent )
        {
            item.querySelector('a.hierarchy').addEventListener("click", function( e ) {

                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();

                if( e.altKey )
                {
                    const _closeNode = function( node ) {
                        node.closed = !node.closed;
                        for( var c of node.children )
                        {
                            _closeNode( c );
                        }
                    };
                    _closeNode( node );
                }
                else
                {
                    node.closed = !node.closed;
                }

                if( that.onevent )
                {
                    const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed);
                    that.onevent( event );
                }
                that.frefresh( node.id );
            });
        }

        // Add button icons

        const inputContainer = document.createElement( "div" );
        item.appendChild( inputContainer );

        if( node.actions )
        {
            for( let i = 0; i < node.actions.length; ++i )
            {
                let a = node.actions[ i ];
                let actionEl = document.createElement('a');
                actionEl.className = "lexicon " + a.icon;
                actionEl.title = a.name;
                actionEl.addEventListener("click", function( e ) {
                    a.callback( node, actionEl );
                    e.stopPropagation();
                });

                inputContainer.appendChild( actionEl );
            }
        }

        if( !node.skipVisibility ?? false )
        {
            let visibility = document.createElement( 'a' );
            visibility.className = "lexicon fa-solid fa-eye" + ( !node.visible ? "-slash" : "" );
            visibility.title = "Toggle visible";
            visibility.addEventListener("click", function( e ) {
                e.stopPropagation();
                node.visible = node.visible === undefined ? false : !node.visible;
                this.className = "lexicon fa-solid fa-eye" + ( !node.visible ? "-slash" : "" );
                // Trigger visibility event
                if( that.onevent )
                {
                    const event = new TreeEvent( TreeEvent.NODE_VISIBILITY, node, node.visible );
                    that.onevent( event );
                }
            });

            inputContainer.appendChild( visibility );
        }

        const _hasChild = function( parent, id ) {
            if( !parent.length  ) return;
            for( var c of parent.children )
            {
                if( c.id == id ) return true;
                return _hasChild( c, id );
            }
        };

        const exists = _hasChild( node, selectedId );

        if( node.closed && !exists )
        {
            return;
        }

        for( var i = 0; i < node.children.length; ++i )
        {
            let child = node.children[ i ];

            if( this.options.onlyFolders && child.type != 'folder' )
            {
                continue;
            }

            this._createItem( node, child, level + 1, selectedId );
        }
    }

    refresh( newData, selectedId ) {

        this.data = newData ?? this.data;
        this.domEl.querySelector( "ul" ).innerHTML = "";
        this._createItem( null, this.data, 0, selectedId );
    }

    /* Refreshes the tree and focuses current element */
    frefresh( id ) {

        this.refresh();
        var el = this.domEl.querySelector( "#" + id );
        if( el )
        {
            el.focus();
        }
    }

    select( id ) {

        this.refresh( null, id );

        this.domEl.querySelectorAll( ".selected" ).forEach( i => i.classList.remove( "selected" ) );
        this.selected.length = 0;

        var el = this.domEl.querySelector( "#" + id );
        if( el )
        {
            el.classList.add( "selected" );
            this.selected = [ el.treeData ];
            el.focus();
        }
    }
}

/**
 * @class Blank
 * @description Blank Widget
 */

class Blank extends Widget {

    constructor( width, height ) {

        super( Widget.BLANK );

        this.root.style.width = width ?? "auto";
        this.root.style.height = height ?? "8px";
    }
}

LX.Blank = Blank;

/**
 * @class Title
 * @description Title Widget
 */

class Title extends Widget {

    constructor( name, options = {} ) {

        console.assert( name, "Can't create Title Widget without text!" );

        // Note: Titles are not registered in Panel.widgets by now
        super( Widget.TITLE, null, null, options );

        this.root.className = "lextitle";

        if( options.icon )
        {
            let icon = document.createElement( 'a' );
            icon.className = options.icon;
            icon.style.color = options.iconColor || "";
            this.root.appendChild( icon );
        }

        let text = document.createElement( "span" );
        text.innerText = name;
        this.root.appendChild( text );

        Object.assign( this.root.style, options.style ?? {} );

        if( options.link != undefined )
        {
            let linkDom = document.createElement('a');
            linkDom.innerText = name;
            linkDom.href = options.link;
            linkDom.target = options.target ?? "";
            linkDom.className = "lextitle link";
            Object.assign( linkDom.style, options.style ?? {} );
            this.root.replaceWith( linkDom );
        }
    }
}

LX.Title = Title;

/**
 * @class TextInput
 * @description TextInput Widget
 */

class TextInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.TEXT, name, String( value ), options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( !this.valid( newValue ) || ( this._lastValueTriggered == newValue ) )
            {
                return;
            }

            this._lastValueTriggered = value = newValue;

            if( options.disabled  )
            {
                wValue.innerText = newValue;
            }
            else
            {
                wValue.value = newValue;
            }

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        this.valid = ( v ) => {
            v = v ?? this.value();
            if( !v.length || wValue.pattern == "" ) return true;
            const regexp = new RegExp( wValue.pattern );
            return regexp.test( v );
        };

        let container = document.createElement( 'div' );
        container.className = ( options.warning ? " lexwarning" : "" );
        container.style.display = "flex";
        this.root.appendChild( container );

        this.disabled = ( options.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue = null;

        if( !this.disabled )
        {
            wValue = document.createElement( 'input' );
            wValue.className = "lextext " + ( options.inputClass ?? "" );
            wValue.type = options.type || "";
            wValue.value = wValue.iValue = value || "";
            wValue.style.width = "100%";
            wValue.style.textAlign = ( options.float ?? "" );

            wValue.setAttribute( "placeholder", options.placeholder ?? "" );

            if( options.required )
            {
                wValue.setAttribute( "required", options.required );
            }

            if( options.pattern )
            {
                wValue.setAttribute( "pattern", options.pattern );
            }

            const trigger = options.trigger ?? "default";

            if( trigger == "default" )
            {
                wValue.addEventListener( "keyup", e => {
                    if( e.key == "Enter" )
                    {
                        wValue.blur();
                    }
                });

                wValue.addEventListener( "focusout", e => {
                    this.set( e.target.value, false, e );
                });
            }
            else if( trigger == "input" )
            {
                wValue.addEventListener("input", e => {
                    this.set( e.target.value, false, e );
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

        }
        else if( options.url )
        {
            wValue = document.createElement( 'a' );
            wValue.href = options.url;
            wValue.target = "_blank";

            const icon = options.warning ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '';
            wValue.innerHTML = ( icon + value ) || "";
            wValue.style.width = "100%";
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow";
        }
        else
        {
            wValue = document.createElement( 'input' );

            const icon = options.warning ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '';
            wValue.disabled = true;
            wValue.innerHTML = icon;
            wValue.value = value;
            wValue.style.width = "100%";
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow";
        }

        Object.assign( wValue.style, options.style ?? {} );
        container.appendChild( wValue );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Text = Text;

/**
 * @class TextArea
 * @description TextArea Widget
 */

class TextArea extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.TEXTAREA, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            wValue.value = value = newValue;

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        let container = document.createElement( "div" );
        container.className = "lextextarea";
        container.style.display = "flex";
        this.root.appendChild( container );

        let wValue = document.createElement( "textarea" );
        wValue.value = wValue.iValue = value || "";
        wValue.style.width = "100%";
        wValue.style.textAlign = options.float ?? "";
        Object.assign( wValue.style, options.style ?? {} );
        container.appendChild( wValue );

        if( options.disabled ?? false ) wValue.setAttribute( "disabled", true );
        if( options.placeholder ) wValue.setAttribute( "placeholder", options.placeholder );

        const trigger = options.trigger ?? "default";

        if( trigger == "default" )
        {
            wValue.addEventListener("keyup", function(e) {
                if( e.key == "Enter" )
                {
                    wValue.blur();
                }
            });

            wValue.addEventListener("focusout", e => {
                this.set( e.target.value, false, e );
            });
        }
        else if( trigger == "input" )
        {
            wValue.addEventListener("input", e => {
                this.set( e.target.value, false, e );
            });
        }

        if( options.icon )
        {
            let icon = document.createElement('a');
            icon.className = "inputicon " + options.icon;
            container.appendChild( icon );
        }

        doAsync( () => {
            container.style.height = options.height;

            if( options.fitHeight )
            {
                // Update height depending on the content
                wValue.style.height = wValue.scrollHeight + "px";
            }

            this.onResize();
        }, 10 );
    }
}

LX.TextArea = TextArea;

/**
 * @class Button
 * @description Button Widget
 */

class Button extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.BUTTON, name, null, options );

        this.onGetValue = () => {
            return wValue.innerText;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            wValue.innerHTML =
            ( options.icon ? "<a class='" + options.icon + "'></a>" :
            ( options.img  ? "<img src='" + options.img + "'>" : "<span>" + ( newValue || "" ) + "</span>" ) );
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            wValue.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        var wValue = document.createElement( 'button' );
        wValue.title = options.title ?? "";
        wValue.className = "lexbutton " + ( options.buttonClass ?? "" );
        this.root.appendChild( wValue );

        if( options.selected )
        {
            wValue.classList.add( "selected" );
        }

        wValue.innerHTML =
            ( options.icon ? "<a class='" + options.icon + "'></a>" :
            ( options.img  ? "<img src='" + options.img + "'>" : "<span>" + ( value || "" ) + "</span>" ) );

        if( options.disabled )
        {
            wValue.setAttribute( "disabled", true );
        }

        wValue.addEventListener( "click", e => {
            if( options.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( e => { if( e == wValue ) return; e.classList.remove( "selected" ) } );
                }

                wValue.classList.toggle('selected');
            }

            this._trigger( new IEvent( name, value, e ), callback );
        });

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Button = Button;

/**
 * @class ComboButtons
 * @description ComboButtons Widget
 */

class ComboButtons extends Widget {

    constructor( name, values, options = {} ) {

        const shouldSelect = !( options.noSelection ?? false );
        let shouldToggle = shouldSelect && ( options.toggle ?? false );

        let container = document.createElement('div');
        container.className = "lexcombobuttons ";

        options.skipReset = true;

        if( options.float )
        {
            container.className += options.float;
        }

        let currentValue = [];
        let buttonsBox = document.createElement('div');
        buttonsBox.className = "lexcombobuttonsbox ";
        container.appendChild( buttonsBox );

        for( let b of values )
        {
            if( !b.value )
            {
                throw( "Set 'value' for each button!" );
            }

            let buttonEl = document.createElement('button');
            buttonEl.className = "lexbutton combo";
            buttonEl.title = b.icon ? b.value : "";
            buttonEl.id = b.id ?? "";
            buttonEl.dataset["value"] = b.value;

            if( options.buttonClass )
            {
                buttonEl.classList.add( options.buttonClass );
            }

            if( shouldSelect && ( b.selected || options.selected == b.value ) )
            {
                buttonEl.classList.add("selected");
                currentValue = ( currentValue ).concat( [ b.value ] );
            }

            buttonEl.innerHTML = ( b.icon ? "<a class='" + b.icon +"'></a>" : "" ) + "<span>" + ( b.icon ? "" : b.value ) + "</span>";

            if( b.disabled )
            {
                buttonEl.setAttribute( "disabled", true );
            }

            buttonEl.addEventListener("click", e => {

                currentValue = [];

                if( shouldSelect )
                {
                    if( shouldToggle )
                    {
                        buttonEl.classList.toggle( "selected" );
                    }
                    else
                    {
                        container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));
                        buttonEl.classList.add( "selected" );
                    }
                }

                container.querySelectorAll( "button" ).forEach( s => {

                    if( s.classList.contains( "selected" ) )
                    {
                        currentValue.push( s.dataset[ "value" ] );
                    }

                } );

                if( !shouldToggle && currentValue.length > 1 )
                {
                    console.error( `Enable _options.toggle_ to allow selecting multiple options in ComboButtons.` )
                    return;
                }

                currentValue = currentValue[ 0 ];

                this.set( b.value, false, buttonEl.classList.contains( "selected" ) );
            });

            buttonsBox.appendChild( buttonEl );
        }

        if( currentValue.length > 1 )
        {
            options.toggle = true;
            shouldToggle = shouldSelect;
            console.warn( `Multiple options selected in '${ name }' ComboButtons. Enabling _toggle_ mode.` );
        }
        else
        {
            currentValue = currentValue[ 0 ];
        }

        super( Widget.BUTTONS, name, null, options );

        this.onGetValue = () => {
            return currentValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( shouldSelect && ( event == undefined ) )
            {
                container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));

                container.querySelectorAll( "button" ).forEach( s => {
                    if( currentValue && currentValue.indexOf( s.dataset[ "value" ] ) > -1 )
                    {
                        s.classList.add( "selected" );
                    }
                } );
            }

            if( !skipCallback && newValue.constructor != Array )
            {
                const enabled = event;
                const fn = values.filter( v => v.value == newValue )[ 0 ]?.callback;
                this._trigger( new IEvent( name, shouldToggle ? [ newValue, enabled ] : newValue, null ), fn );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        this.root.appendChild( container );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.ComboButtons = ComboButtons;

/**
 * @class Card
 * @description Card Widget
 */

class Card extends Widget {

    constructor( name, options = {} ) {

        options.hideName = true;

        super( Widget.CARD, name, null, options );

        let container = document.createElement('div');
        container.className = "lexcard";
        container.style.width = "100%";
        this.root.appendChild( container );

        if( options.img )
        {
            let img = document.createElement('img');
            img.src = options.img;
            container.appendChild( img );

            if( options.link != undefined )
            {
                img.style.cursor = "pointer";
                img.addEventListener('click', function() {
                    const hLink = container.querySelector('a');
                    if( hLink )
                    {
                        hLink.click();
                    }
                });
            }
        }

        let cardNameDom = document.createElement('span');
        cardNameDom.innerText = name;
        container.appendChild( cardNameDom );

        if( options.link != undefined )
        {
            let cardLinkDom = document.createElement( 'a' );
            cardLinkDom.innerText = name;
            cardLinkDom.href = options.link;
            cardLinkDom.target = options.target ?? "";
            cardNameDom.innerText = "";
            cardNameDom.appendChild( cardLinkDom );
        }

        if( options.callback )
        {
            container.style.cursor = "pointer";
            container.addEventListener("click", ( e ) => {
                this._trigger( new IEvent( name, null, e ), options.callback );
            });
        }
    }
}

LX.Card = Card;

/**
 * @class Form
 * @description Form Widget
 */

class Form extends Widget {

    constructor( name, data, callback, options = {} ) {

        if( data.constructor != Object )
        {
            console.error( "Form data must be an Object" );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        super( Widget.FORM, name, null, options );

        this.onGetValue = () => {
            return container.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
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
                Widget._dispatchEvent( entryInput, "focusout", skipCallback );
            }
        };

        let container = document.createElement( 'div' );
        container.className = "lexformdata";
        container.style.width = "100%";
        container.formData = {};
        this.root.appendChild( container );

        for( let entry in data )
        {
            let entryData = data[ entry ];

            if( entryData.constructor != Object )
            {
                entryData = { };
            }

            entryData.placeholder = entryData.placeholder ?? entry;
            entryData.width = "100%";

            // this.addLabel( entry, { textClass: "formlabel" } );

            entryData.textWidget = new TextInput( null, entryData.constructor == Object ? entryData.value : entryData, ( value ) => {
                container.formData[ entry ] = value;
            }, entryData );
            container.appendChild( entryData.textWidget.root );

            container.formData[ entry ] = entryData.constructor == Object ? entryData.value : entryData;
        }

        container.appendChild( new Blank().root );

        const submitButton = new Button( null, options.actionName ?? "Submit", ( value, event ) => {

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
        }, { buttonClass: "primary" } );

        container.appendChild( submitButton.root );
    }
}

LX.Form = Form;

/**
 * @class Select
 * @description Select Widget
 */

class Select extends Widget {

    constructor( name, values, value, callback, options = {} ) {

        super( Widget.SELECT, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;

            let item = null;
            const options = listOptions.childNodes;
            options.forEach( e => {
                e.classList.remove( "selected" );
                if( e.getAttribute( "value" ) == newValue )
                {
                    item = e;
                }
            } );

            console.assert( item, `Item ${ newValue } does not exist in the Select.` );
            item.classList.add( "selected" );
            selectedOption.refresh( value );

            // Reset filter
            if( filter )
            {
                filter.root.querySelector( "input" ).value = "";
                const filteredOptions = this._filterOptions( values, "" );
                list.refresh( filteredOptions );
            }

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        let container = document.createElement( "div" );
        container.className = "lexselect";
        this.root.appendChild( container );

        let wValue = document.createElement( 'div' );
        wValue.className = "lexselect lexoption";
        wValue.name = name;
        wValue.iValue = value;

        // Add select widget button
        let buttonName = value;
        buttonName += "<a class='fa-solid fa-angle-down'></a>";

        const _placeOptions = ( parent ) => {

            const selectRoot = selectedOption.root;
            const overflowContainer = parent.getParentArea();
            const rect = selectRoot.getBoundingClientRect();
            const nestedDialog = parent.parentElement.closest( "dialog" );

            // Manage vertical aspect
            {
                const listHeight = parent.offsetHeight;
                let topPosition = rect.y;

                let maxY = window.innerHeight;

                if( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxY = parentRect.y + parentRect.height;
                }

                if( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    topPosition -= rect.y;
                }

                parent.style.top = ( topPosition + selectRoot.offsetHeight ) + 'px';

                const showAbove = ( topPosition + listHeight ) > maxY;
                if( showAbove )
                {
                    parent.style.top = ( topPosition - listHeight ) + 'px';
                    parent.classList.add( "place-above" );
                }
            }

            // Manage horizontal aspect
            {
                const listWidth = parent.offsetWidth;
                let leftPosition = rect.x;

                parent.style.minWidth = ( rect.width ) + 'px';

                if( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    leftPosition -= rect.x;
                }

                parent.style.left = ( leftPosition ) + 'px';

                let maxX = window.innerWidth;

                if( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxX = parentRect.x + parentRect.width;
                }

                const showLeft = ( leftPosition + listWidth ) > maxX;
                if( showLeft )
                {
                    parent.style.left = ( leftPosition - ( listWidth - rect.width ) ) + 'px';
                }
            }
        };

        let selectedOption = new Button( null, buttonName, ( value, event ) => {
            if( list.unfocus_event )
            {
                delete list.unfocus_event;
                return;
            }

            listDialog.classList.remove( "place-above" );
            const opened = listDialog.hasAttribute( "open" );

            if( !opened )
            {
                listDialog.show();
                _placeOptions( listDialog );
            }
            else
            {
                listDialog.close();
            }

            if( filter )
            {
                filter.root.querySelector( "input" ).focus();
            }

        }, { buttonClass: "array", skipInlineCount: true, disabled: options.disabled } );

        container.appendChild( selectedOption.root );

        selectedOption.root.style.width = "100%";

        selectedOption.refresh = (v) => {
            const buttonSpan = selectedOption.root.querySelector("span");
            if( buttonSpan.innerText == "" )
            {
                buttonSpan.innerText = v;
            }
            else
            {
                buttonSpan.innerHTML = buttonSpan.innerHTML.replaceAll( buttonSpan.innerText, v );
            }
        }

        // Add select options container

        const listDialog = document.createElement( 'dialog' );
        listDialog.className = "lexselectoptions";

        let list = document.createElement( 'ul' );
        list.tabIndex = -1;
        list.className = "lexoptions";
        listDialog.appendChild( list )

        list.addEventListener( 'focusout', function( e ) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if( e.relatedTarget === selectedOption.root.querySelector( 'button' ) )
            {
                this.unfocus_event = true;
                setTimeout( () => delete this.unfocus_event, 200 );
            }
            else if ( e.relatedTarget && ( e.relatedTarget.tagName == "INPUT" || e.relatedTarget.classList.contains("lexoptions") ) )
            {
                return;
            }
            else if ( e.target.className == 'lexinput-filter' )
            {
                return;
            }
            listDialog.close();
        });

        // Add filter options
        let filter = null;
        if( options.filter ?? false )
        {
            const filterOptions = LX.deepCopy( options );
            filterOptions.placeholder = filterOptions.placeholder ?? "Search...";
            filterOptions.skipWidget = filterOptions.skipWidget ?? true;
            filterOptions.trigger = "input";
            filterOptions.icon = "fa-solid fa-magnifying-glass";
            filterOptions.className = "lexfilter";
            filterOptions.inputClass = "outline";

            filter = new TextInput(null, options.filterValue ?? "", ( v ) => {
                const filteredOptions = this._filterOptions( values, v );
                list.refresh( filteredOptions );
            }, filterOptions );
            filter.root.querySelector( ".lextext" ).style.border = "1px solid transparent";

            const input = filter.root.querySelector( "input" );

            input.addEventListener('focusout', function( e ) {
                if (e.relatedTarget && e.relatedTarget.tagName == "UL" && e.relatedTarget.classList.contains("lexoptions"))
                {
                    return;
                }
                listDialog.close();
            });

            list.appendChild( filter.root );
        }

        // Create option list to empty it easily..
        const listOptions = document.createElement('span');
        listOptions.className = "lexselectinnerlist";
        list.appendChild( listOptions );

        // Add select options list
        list.refresh = ( currentOptions ) => {

            // Empty list
            listOptions.innerHTML = "";

            if( !currentOptions.length )
            {
                let iValue = options.emptyMsg ?? "No options found.";

                let option = document.createElement( "div" );
                option.className = "option";
                option.innerHTML = iValue;

                let li = document.createElement( "li" );
                li.className = "lexselectitem empty";
                li.appendChild( option );

                listOptions.appendChild( li );
                return;
            }

            for( let i = 0; i < currentOptions.length; i++ )
            {
                let iValue = currentOptions[ i ];
                let li = document.createElement( "li" );
                let option = document.createElement( "div" );
                option.className = "option";
                li.appendChild( option );

                const onSelect = e => {
                    this.set( e.currentTarget.getAttribute( "value" ), false, e );
                    listDialog.close();
                };

                li.addEventListener( "click", onSelect );

                // Add string option
                if( iValue.constructor != Object )
                {
                    const asLabel = ( iValue[ 0 ] === '@' );

                    if( !asLabel )
                    {
                        option.innerHTML = "</a><span>" + iValue + "</span><a class='fa-solid fa-check'>";
                        option.value = iValue;
                        li.setAttribute( "value", iValue );

                        if( iValue == value )
                        {
                            li.classList.add( "selected" );
                            wValue.innerHTML = iValue;
                        }
                    }
                    else
                    {
                        option.innerHTML = "<span>" + iValue.substr( 1 ) + "</span>";
                        li.removeEventListener( "click", onSelect );
                    }

                    li.classList.add( asLabel ? "lexselectlabel" : "lexselectitem" );
                }
                else
                {
                    // Add image option
                    let img = document.createElement( "img" );
                    img.src = iValue.src;
                    li.setAttribute( "value", iValue.value );
                    li.className = "lexlistitem";
                    option.innerText = iValue.value;
                    option.className += " media";
                    option.prepend( img );

                    option.setAttribute( "value", iValue.value );
                    option.setAttribute( "data-index", i );
                    option.setAttribute( "data-src", iValue.src );
                    option.setAttribute( "title", iValue.value );

                    if( value == iValue.value )
                    {
                        li.classList.add( "selected" );
                    }
                }

                listOptions.appendChild( li );
            }
        }

        list.refresh( values );

        container.appendChild( listDialog );

        doAsync( this.onResize.bind( this ) );
    }

    _filterOptions( options, value ) {

        // Push to right container
        const emptyFilter = !value.length;
        let filteredOptions = [];

        // Add widgets
        for( let i = 0; i < options.length; i++ )
        {
            let o = options[ i ];
            if( !emptyFilter )
            {
                let toCompare = ( typeof o == 'string' ) ? o : o.value;
                const filterWord = value.toLowerCase();
                const name = toCompare.toLowerCase();
                if( !name.includes( filterWord ) ) continue;
            }

            filteredOptions.push( o );
        }

        return filteredOptions;
    }
}

LX.Select = Select;

/**
 * @class Curve
 * @description Curve Widget
 */

class Curve extends Widget {

    constructor( name, values, callback, options = {} ) {

        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( Widget.CURVE, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse(JSON.stringify( curveInstance.element.value ));
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, curveInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
            flushCss( container );
            curveInstance.canvas.width = container.offsetWidth;
            curveInstance.redraw();
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = (v, e) => {
            this._trigger( new IEvent( name, v, e ), callback );
        };

        options.name = name;

        let curveInstance = new CanvasCurve( values, options );
        container.appendChild( curveInstance.element );
        this.curveInstance = curveInstance;

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Curve = Curve;

/**
 * @class Dial
 * @description Dial Widget
 */

class Dial extends Widget {

    constructor( name, values, callback, options = {} ) {

        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( Widget.DIAL, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse( JSON.stringify( dialInstance.element.value ) );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            dialInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            dialInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, dialInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
            flushCss( container );
            dialInstance.element.style.height = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = ( v, e ) => {
            this._trigger( new IEvent( name, v, e ), callback );
        };

        options.name = name;

        let dialInstance = new CanvasDial( this, values, options );
        container.appendChild( dialInstance.element );
        this.dialInstance = dialInstance;

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Curve = Curve;

/**
 * @class Layers
 * @description Layers Widget
 */

class Layers extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.LAYERS, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;
            this.setLayers( value );
            if( !skipCallback )
            {
                this._trigger( new IEvent(name, value, event), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement( "div" );
        container.className = "lexlayers";
        this.root.appendChild( container );

        this.setLayers = ( val ) =>  {

            container.innerHTML = "";

            let binary = val.toString( 2 );
            let nbits = binary.length;

            // fill zeros
            for( let i = 0; i < ( 16 - nbits ); ++i )
            {
                binary = '0' + binary;
            }

            for( let bit = 0; bit < 16; ++bit )
            {
                let layer = document.createElement( "div" );
                layer.className = "lexlayer";

                if( val != undefined )
                {
                    const valueBit = binary[ 16 - bit - 1 ];
                    if( valueBit != undefined && valueBit == '1' )
                    {
                        layer.classList.add( "selected" );
                    }
                }

                layer.innerText = bit + 1;
                layer.title = "Bit " + bit + ", value " + (1 << bit);
                container.appendChild( layer );

                layer.addEventListener( "click", e => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.target.classList.toggle( "selected" );
                    const newValue = val ^ ( 1 << bit );
                    this.set( newValue, false, e );
                } );
            }
        };

        this.setLayers( value );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Layers = Layers;

/**
 * @class ItemArray
 * @description ItemArray Widget
 */

class ItemArray extends Widget {

    constructor( name, values = [], callback, options = {} ) {

        options.nameWidth = "100%";

        super( Widget.ARRAY, name, null, options );

        this.onGetValue = () => {
            return values;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            values = newValue;
            this._updateItems();
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, values, event ), callback );
            }
        };

        // Add open array button

        const itemNameWidth = "4%";

        var container = document.createElement('div');
        container.className = "lexarray";
        container.style.width = "100%";
        this.root.appendChild( container );
        this.root.dataset["opened"] = false;

        const angleDown = `<a class='fa-solid fa-angle-down'></a>`;

        let buttonName = "Array (size " + values.length + ")";
        buttonName += angleDown;

        const toggleButton = new Button(null, buttonName, () => {
            this.root.dataset["opened"] = this.root.dataset["opened"] == "true" ? false : true;
            this.root.querySelector(".lexarrayitems").toggleAttribute('hidden');
        }, { buttonClass: 'array' });
        container.appendChild( toggleButton.root );

        // Show elements

        let arrayItems = document.createElement( "div" );
        arrayItems.className = "lexarrayitems";
        arrayItems.toggleAttribute( "hidden",  true );
        this.root.appendChild( arrayItems );

        this._updateItems = () => {

            // Update num items
            let buttonEl = this.root.querySelector(".lexbutton.array span");
            buttonEl.innerHTML = "Array (size " + values.length + ")";
            buttonEl.innerHTML += angleDown;

            // Update inputs
            arrayItems.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                const value = values[ i ];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let widget = null;

                switch( baseclass  )
                {
                    case String:
                        widget = new TextInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                    case Number:
                        widget = new NumberInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                    case 'select':
                        widget = new Select(i + "", options.innerValues, value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: itemNameWidth, inputWidth: "95%", skipReset: true });
                        break;
                }

                console.assert( widget, `Value of type ${ baseclass } cannot be modified in ItemArray` );

                arrayItems.appendChild( widget.root );

                const removeWidget = new Button( null, "<a class='lexicon fa-solid fa-trash'></a>", ( v, event) => {
                    values.splice( values.indexOf( value ), 1 );
                    this._updateItems();
                    this._trigger( new IEvent(name, values, event), callback );
                }, { title: "Remove item", className: 'micro'} );

                widget.root.appendChild( removeWidget.root );
            }

            buttonName = "Add item";
            buttonName += "<a class='fa-solid fa-plus'></a>";

            const addButton = new Button(null, buttonName, (v, event) => {
                values.push( options.innerValues ? options.innerValues[ 0 ] : "" );
                this._updateItems();
                this._trigger( new IEvent(name, values, event), callback );
            }, { buttonClass: 'array' });

            arrayItems.appendChild( addButton.root );
        };

        this._updateItems();
    }
}

LX.ItemArray = ItemArray;

/**
 * @class List
 * @description List Widget
 */

class List extends Widget {

    constructor( name, values, value, callback, options = {} ) {

        super( Widget.LIST, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );

            let idx = null;
            for( let i = 0; i < values.length; ++i )
            {
                const v = values[ i ];
                if( v == newValue || ( ( v.constructor == Array ) && ( v[ 0 ] == newValue ) ) )
                {
                    idx = i;
                    break;
                }
            }

            if( !idx )
            {
                console.error( `Cannot find item ${ newValue } in List.` );
                return;
            }

            listContainer.children[ idx ].classList.toggle( 'selected' );
            value = newValue;

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            listContainer.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        this._updateValues = ( newValues ) => {

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

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = "lexlist";
        this.root.appendChild( listContainer );

        this._updateValues( values );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.List = List;

/**
 * @class Tags
 * @description Tags Widget
 */

class Tags extends Widget {

    constructor( name, value, callback, options = {} ) {

        value = value.replace( /\s/g, '' ).split( ',' );

        let defaultValue = [].concat( value );
        super( Widget.TAGS, name, defaultValue, options );

        this.onGetValue = () => {
            return [].concat( value );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = [].concat( newValue );
            this.generateTags( value );
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            tagsContainer.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        // Show tags

        const tagsContainer = document.createElement('div');
        tagsContainer.className = "lextags";
        this.root.appendChild( tagsContainer );

        this.generateTags = ( value ) => {

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
                    this.set( value, false, e );
                } );

                tagsContainer.appendChild( tag );
            }

            let tagInput = document.createElement( 'input' );
            tagInput.value = "";
            tagInput.placeholder = "Add tag...";
            tagsContainer.appendChild( tagInput );

            tagInput.onkeydown = e => {
                const val = tagInput.value.replace( /\s/g, '' );
                if( e.key == ' ' || e.key == 'Enter' )
                {
                    e.preventDefault();
                    if( !val.length || value.indexOf( val ) > -1 )
                        return;
                    value.push( val );
                    this.set( value, false, e );
                }
            };

            tagInput.focus();
        }

        this.generateTags( value );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Tags = Tags;

/**
 * @class Checkbox
 * @description Checkbox Widget
 */

class Checkbox extends Widget {

    constructor( name, value, callback, options = {} ) {

        if( !name && !options.label )
        {
            throw( "Set Widget Name or at least a label!" );
        }

        super( Widget.CHECKBOX, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( newValue == value )
            {
                return;
            }

            checkbox.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( ".lexcheckboxsubmenu" )?.toggleAttribute( 'hidden', !newValue );

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcheckboxcont";
        this.root.appendChild( container );

        let checkbox = document.createElement( "input" );
        checkbox.type = "checkbox";
        checkbox.className = "lexcheckbox " + ( options.className ?? "primary" );
        checkbox.checked = value;
        checkbox.disabled = options.disabled ?? false;
        container.appendChild( checkbox );

        let valueName = document.createElement( "span" );
        valueName.className = "checkboxtext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild( valueName );

        checkbox.addEventListener( "change" , e => {
            this.set( checkbox.checked, false, e );
        });

        if( options.suboptions )
        {
            let suboptions = document.createElement( "div" );
            suboptions.className = "lexcheckboxsubmenu";
            suboptions.toggleAttribute( "hidden", !checkbox.checked );

            const suboptionsPanel = new Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Checkbox = Checkbox;

/**
 * @class Toggle
 * @description Toggle Widget
 */

class Toggle extends Widget {

    constructor( name, value, callback, options = {} ) {

        if( !name && !options.label )
        {
            throw( "Set Widget Name or at least a label!" );
        }

        super( Widget.TOGGLE, name, value, options );

        this.onGetValue = () => {
            return toggle.checked;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( newValue == value )
            {
                return;
            }

            toggle.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( ".lextogglesubmenu" )?.toggleAttribute( 'hidden', !newValue );

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement('div');
        container.className = "lextogglecont";
        this.root.appendChild( container );

        let toggle = document.createElement('input');
        toggle.type = "checkbox";
        toggle.className = "lextoggle " + ( options.className ?? "" );
        toggle.checked = value;
        toggle.iValue = value;
        toggle.disabled = options.disabled ?? false;
        container.appendChild( toggle );

        let valueName = document.createElement( 'span' );
        valueName.className = "toggletext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild( valueName );

        toggle.addEventListener( "change" , e => {
            this.set( toggle.checked, false, e );
        });

        if( options.suboptions )
        {
            let suboptions = document.createElement('div');
            suboptions.className = "lextogglesubmenu";
            suboptions.toggleAttribute( 'hidden', !toggle.checked );

            const suboptionsPanel = new Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Toggle = Toggle;

/**
 * @class RadioGroup
 * @description RadioGroup Widget
 */

class RadioGroup extends Widget {

    constructor( name, label, values, callback, options = {} ) {

        super( Widget.RADIO, name, null, options );

        let currentIndex = null;

        this.onGetValue = () => {
            const items = container.querySelectorAll( 'button' );
            return currentIndex ? [ currentIndex, items[ currentIndex ] ] : undefined;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            newValue = newValue[ 0 ] ?? newValue; // Allow getting index of { index, value } tupple

            console.assert( newValue.constructor == Number, "RadioGroup _value_ must be an Array index!" );

            const items = container.querySelectorAll( 'button' );
            items.forEach( b => { b.checked = false; b.classList.remove( "checked" ) } );

            const optionItem = items[ newValue ];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle( "checked" );

            if( !skipCallback )
            {
                this._trigger( new IEvent( null, [ newValue, values[ newValue ] ], event ), callback );
            }
        };

        var container = document.createElement( 'div' );
        container.className = "lexradiogroup " + ( options.className ?? "" );
        this.root.appendChild( container );

        let labelSpan = document.createElement( 'span' );
        labelSpan.innerHTML = label;
        container.appendChild( labelSpan );

        for( let i = 0; i < values.length; ++i )
        {
            const optionItem = document.createElement( 'div' );
            optionItem.className = "lexradiogroupitem";
            container.appendChild( optionItem );

            const optionButton = document.createElement( 'button' );
            optionButton.className = "lexbutton";
            optionButton.disabled = options.disabled ?? false;
            optionItem.appendChild( optionButton );

            optionButton.addEventListener( "click", ( e ) => {
                this.set( i, false, e );
            } );

            const checkedSpan = document.createElement( 'span' );
            optionButton.appendChild( checkedSpan );

            const optionLabel = document.createElement( 'span' );
            optionLabel.innerHTML = values[ i ];
            optionItem.appendChild( optionLabel );
        }

        if( options.selected )
        {
            console.assert( options.selected.constructor == Number, "RadioGroup _selected_ must be an Array index!" );
            currentIndex = options.selected;
            this.set( currentIndex, true );
        }
    }
}

LX.RadioGroup = RadioGroup;

/**
 * @class ColorInput
 * @description ColorInput Widget
 */

class ColorInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        value = ( value.constructor === Array ) ? rgbToHex( value ) : value;

        super( Widget.COLOR, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( color.useRGB )
            {
                newValue = hexToRgb( newValue );
            }

            if( !this._skipTextUpdate )
            {
                textWidget.set( newValue, true, event );
            }

            color.value = value = newValue;

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement( 'span' );
        container.className = "lexcolor";
        this.root.appendChild( container );

        let color = document.createElement( 'input' );
        color.style.width = "32px";
        color.type = 'color';
        color.className = "colorinput";
        color.useRGB = options.useRGB ?? false;
        color.value = value;
        container.appendChild( color );

        if( options.disabled )
        {
            color.disabled = true;
        }

        color.addEventListener( "input", e => {
            this.set( e.target.value, false, e );
        }, false );

        const textWidget = new TextInput( null, color.value, v => {
            this._skipTextUpdate = true;
            this.set( v );
            delete this._skipTextUpdate;
        }, { width: "calc( 100% - 32px )", disabled: options.disabled });

        textWidget.root.style.marginLeft = "4px";
        container.appendChild( textWidget.root );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.ColorInput = ColorInput;

/**
 * @class RangeInput
 * @description RangeInput Widget
 */

class RangeInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.RANGE, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( isNaN( newValue ) )
            {
                return;
            }

            slider.value = value = clamp( +newValue, +slider.min, +slider.max );

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, options.left ? ( ( +slider.max ) - value + ( +slider.min ) ) : value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        const container = document.createElement( 'div' );
        container.className = "lexrange";
        this.root.appendChild( container );

        let slider = document.createElement( 'input' );
        slider.className = "lexrangeslider " + ( options.className ?? "" );
        slider.min = options.min ?? 0;
        slider.max = options.max ?? 100;
        slider.step = options.step ?? 1;
        slider.type = "range";
        slider.disabled = options.disabled ?? false;

        if( value.constructor == Number )
        {
            value = clamp( value, +slider.min, +slider.max );
        }

        if( options.left )
        {
            value = ( ( +slider.max ) - value + ( +slider.min ) );
        }

        slider.value = value;
        container.appendChild( slider );

        if( options.left ?? false )
        {
            slider.classList.add( "left" );
        }

        if( !( options.fill ?? true ) )
        {
            slider.classList.add( "no-fill" );
        }

        slider.addEventListener( "input", e => {
            this.set( e.target.valueAsNumber, false, e );
        }, { passive: false });

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

        // Method to change min, max, step parameters
        this.setLimits = ( newMin, newMax, newStep ) => {
            slider.min = newMin ?? slider.min;
            slider.max = newMax ?? slider.max;
            slider.step = newStep ?? slider.step;
            Widget._dispatchEvent( slider, "input", true );
        };

        doAsync( this.onResize.bind( this ) );
    }
}

LX.RangeInput = RangeInput;

/**
 * @class NumberInput
 * @description NumberInput Widget
 */

class NumberInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.NUMBER, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( isNaN( newValue ) )
            {
                return;
            }

            value = clamp( +newValue, +vecinput.min, +vecinput.max );
            vecinput.value = value = round( value, options.precision );

            // Update slider!
            if( box.querySelector( ".lexinputslider" ) )
            {
                box.querySelector( ".lexinputslider" ).value = value;
            }

            if( options.units )
            {
                vecinput.unitSpan.style.left = measureRealWidth( value ) + "px";
            }

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexnumber";
        this.root.appendChild( container );

        let box = document.createElement( 'div' );
        box.className = "numberbox";
        container.appendChild( box );

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

            slider.addEventListener( "input", ( e ) => {
                this.set( slider.valueAsNumber, false, e );
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
            this.setLimits = ( newMin, newMax, newStep ) => {
                vecinput.min = slider.min = newMin ?? vecinput.min;
                vecinput.max = slider.max = newMax ?? vecinput.max;
                vecinput.step = newStep ?? vecinput.step;
                slider.step = newStep ?? slider.step;
                this.set( value, true );
            };
        }

        vecinput.addEventListener( "input", function( e ) {
            value = +this.valueAsNumber;
            value = round( value, options.precision );
            if( options.units )
            {
                vecinput.unitSpan.style.left = measureRealWidth( vecinput.value ) + "px";
            }
        }, false );

        vecinput.addEventListener( "wheel", e => {
            e.preventDefault();
            if( vecinput !== document.activeElement )
            {
                return;
            }
            let mult = options.step ?? 1;
            if( e.shiftKey ) mult *= 10;
            else if( e.altKey ) mult *= 0.1;
            value = ( +vecinput.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ) );
            this.set( value, false, e );
        }, { passive: false });

        vecinput.addEventListener( "change", e => {
            this.set( vecinput.valueAsNumber, false, e );
        }, { passive: false });

        // Add drag input

        var that = this;

        let innerMouseDown = e => {

            if( document.activeElement == vecinput )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
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

        let innerMouseMove = e => {

            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if( e.shiftKey ) mult *= 10;
                else if( e.altKey ) mult *= 0.1;
                value = ( +vecinput.valueAsNumber + mult * dt );
                this.set( value, false, e );
                // vecinput.value = ( +new_value ).toFixed( 4 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUp = e => {

            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
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

        vecinput.addEventListener( "mousedown", innerMouseDown );

        doAsync( this.onResize.bind( this ) );
    }
}

LX.NumberInput = NumberInput;

/**
 * @class Vector
 * @description Vector Widget
 */

class Vector extends Widget {

    constructor( numComponents, name, value, callback, options = {} ) {

        numComponents = clamp( numComponents, 2, 4 );
        value = value ?? new Array( numComponents ).fill( 0 );

        super( Widget.VECTOR, name, [].concat( value ), options );

        this.onGetValue = () => {
            let inputs = this.root.querySelectorAll( "input" );
            let value = [];
            for( var v of inputs )
            {
                value.push( +v.value );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( vectorInputs.length != newValue.length )
            {
                console.error( "Input length does not match vector length." );
                return;
            }

            for( let i = 0; i < vectorInputs.length; ++i )
            {
                let value = newValue[ i ];
                value = clamp( value, +vectorInputs[ i ].min, +vectorInputs[ i ].max );
                value = round( value, options.precision ) ?? 0;
                vectorInputs[ i ].value = newValue[ i ] = value;
            }

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        const vectorInputs = [];

        var container = document.createElement( 'div' );
        container.className = "lexvector";
        this.root.appendChild( container );

        const that = this;

        for( let i = 0; i < numComponents; ++i )
        {
            let box = document.createElement( 'div' );
            box.className = "vecbox";
            box.innerHTML = "<span class='" + Panel.VECTOR_COMPONENTS[ i ] + "'></span>";

            let vecinput = document.createElement( 'input' );
            vecinput.className = "vecinput v" + numComponents;
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "vec" + numComponents + "_" + simple_guidGenerator();
            vecinput.idx = i;
            vectorInputs[ i ] = vecinput;

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
                    for( let v of that.querySelectorAll(".vecinput") )
                    {
                        v.value = round( +v.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                        Widget._dispatchEvent( v, "change" );
                    }
                }
                else
                {
                    this.value = round( +this.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                    Widget._dispatchEvent( vecinput, "change" );
                }
            }, { passive: false } );

            vecinput.addEventListener( "change", e => {

                if( isNaN( e.target.value ) )
                {
                    return;
                }

                let val = clamp( e.target.value, +vecinput.min, +vecinput.max );
                val = round( val, options.precision );

                if( locker.locked )
                {
                    for( let v of vectorInputs )
                    {
                        v.value = val;
                        value[ v.idx ] = val;
                    }
                }
                else
                {
                    vecinput.value = val;
                    value[ e.target.idx ] = val;
                }

                this.set( value, false, e );
            }, false );

            // Add drag input

            function innerMouseDown( e )
            {
                if( document.activeElement == vecinput )
                {
                    return;
                }

                var doc = that.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
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

            function innerMouseMove( e )
            {
                let dt = -e.movementY;

                if ( dt != 0 )
                {
                    let mult = options.step ?? 1;
                    if( e.shiftKey ) mult = 10;
                    else if( e.altKey ) mult = 0.1;

                    if( locker.locked )
                    {
                        for( let v of this.root.querySelectorAll( ".vecinput" ) )
                        {
                            v.value = round( +v.valueAsNumber + mult * dt, options.precision );
                            Widget._dispatchEvent( v, "change" );
                        }
                    }
                    else
                    {
                        vecinput.value = round( +vecinput.valueAsNumber + mult * dt, options.precision );
                        Widget._dispatchEvent( vecinput, "change" );
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

            vecinput.addEventListener( "mousedown", innerMouseDown );

            box.appendChild( vecinput );
            container.appendChild( box );
        }

        // Method to change min, max, step parameters
        if( options.min !== undefined || options.max !== undefined )
        {
            this.setLimits = ( newMin, newMax, newStep ) => {
                for( let v of vectorInputs )
                {
                    v.min = newMin ?? v.min;
                    v.max = newMax ?? v.max;
                    v.step = newStep ?? v.step;
                }

                this.set( value, true );
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

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Vector = Vector;

/**
 * @class SizeInput
 * @description SizeInput Widget
 */

class SizeInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.SIZE, name, value, options );

        this.onGetValue = () => {
            const value = [];
            for( let i = 0; i < this.root.dimensions.length; ++i )
            {
                value.push( this.root.dimensions[ i ].value() );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            for( let i = 0; i < this.root.dimensions.length; ++i )
            {
                this.root.dimensions[ i ].set( newValue[ i ], skipCallback );
            }
        };

        this.root.aspectRatio = ( value.length == 2 ? value[ 0 ] / value[ 1 ] : null );
        this.root.dimensions = [];

        for( let i = 0; i < value.length; ++i )
        {
            const p = new Panel();
            this.root.dimensions[ i ] = p.addNumber( null, value[ i ], ( v ) => {

                const value = this.value();

                if( this.root.locked )
                {
                    const ar = ( i == 0 ? 1.0 / this.root.aspectRatio : this.root.aspectRatio );
                    const index = ( 1 + i ) % 2;
                    value[ index ] = v * ar;
                    this.root.dimensions[ index ].set( value[ index ], true );
                }

                if( callback )
                {
                    callback( value );
                }

            }, { min: 0, disabled: options.disabled, precision: options.precision } );

            this.root.appendChild( this.root.dimensions[ i ].root );

            if( ( i + 1 ) != value.length )
            {
                let cross = document.createElement( 'a' );
                cross.className = "lexsizecross fa-solid fa-xmark";
                this.root.appendChild( cross );
            }
        }

        if( options.units )
        {
            let unitSpan = document.createElement( 'span' );
            unitSpan.className = "lexunit";
            unitSpan.innerText = options.units;
            this.root.appendChild( unitSpan );
        }

        // Lock aspect ratio
        if( this.root.aspectRatio )
        {
            let locker = document.createElement( 'a' );
            locker.title = "Lock Aspect Ratio";
            locker.className = "fa-solid fa-lock-open lexicon lock";
            this.root.appendChild( locker );
            locker.addEventListener( "click", e => {
                this.root.locked = !this.root.locked;
                if( this.root.locked )
                {
                    locker.classList.add( "fa-lock" );
                    locker.classList.remove( "fa-lock-open" );

                    // Recompute ratio
                    const value = this.value();
                    this.root.aspectRatio = value[ 0 ] / value[ 1 ];
                }
                else
                {
                    locker.classList.add( "fa-lock-open" );
                    locker.classList.remove( "fa-lock" );
                }
            }, false );
        }
    }
}

LX.SizeInput = SizeInput;

/**
 * @class Pad
 * @description Pad Widget
 */

class Pad extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.PAD, name, null, options );

        this.onGetValue = () => {
            return thumb.value.xy;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, thumb.value.xy ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        this.root.appendChild( container );

        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild( pad );

        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new LX.vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild( thumb );

        let _updateValue = v => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new LX.vec2( remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

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
            thumb.classList.add( "active" );

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
            thumb.classList.remove( "active" );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        doAsync( () => {
            this.onResize();
            _updateValue( thumb.value )
        } );
    }
}

LX.Pad = Pad;

/**
 * @class Progress
 * @description Progress Widget
 */

class Progress extends Widget {

    constructor( name, value, options = {} ) {

        super( Widget.PROGRESS, name, value, options );

        this.onGetValue = () => {
            return progress.value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            this.root.querySelector("meter").value = newValue;
            _updateColor();
            if( this.root.querySelector("span") )
            {
                this.root.querySelector("span").innerText = newValue;
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        const container = document.createElement('div');
        container.className = "lexprogress";
        this.root.appendChild( container );

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
        container.appendChild( progress );

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

            let innerMouseDown = e => {

                var doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                progress.classList.add( "grabbing" );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = round( remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                this.set( newValue, false, e );
            }

            let innerMouseMove = e => {

                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = round( remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max ) );
                    this.set( newValue, false, e );

                    if( options.callback )
                    {
                        options.callback( newValue, e );
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUp = e => {

                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( "grabbing" );
            }

            progress.addEventListener( "mousedown", innerMouseDown );
        }

        _updateColor();

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Progress = Progress;

/**
 * @class FileInput
 * @description FileInput Widget
 */

class FileInput extends Widget {

    constructor( name, callback, options = { } ) {

        super( Widget.FILE, name, null, options );

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            input.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = "lexfileinput";
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild( input );

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

        if( local )
        {
            let settingsDialog = null;

            const settingButton = new Button(null, "<a class='fa-solid fa-gear'></a>", () => {

                if( settingsDialog )
                {
                    return;
                }

                settingsDialog = new Dialog( "Load Settings", p => {
                    p.addSelect( "Type", [ 'text', 'buffer', 'bin', 'url' ], type, v => { type = v } );
                    p.addButton( null, "Reload", v => { input.dispatchEvent( new Event( 'change' ) ) } );
                }, { onclose: ( root ) => { root.remove(); settingsDialog = null; } } );

            }, { className: "micro", skipInlineCount: true, title: "Settings", disabled: options.disabled });

            this.root.appendChild( settingButton.root );
        }

        doAsync( this.onResize.bind( this ) );
    }
}

LX.FileInput = FileInput;

/**
 * @class Tree
 * @description Tree Widget
 */

class Tree extends Widget {

    constructor( name, data, options = {} ) {

        options.hideName = true;

        super( Widget.TREE, name, null, options );

        let container = document.createElement('div');
        container.className = "lextree";
        this.root.appendChild( container );

        if( name )
        {
            let title = document.createElement('span');
            title.innerHTML = name;
            container.appendChild( title );
        }

        let toolsDiv = document.createElement('div');
        toolsDiv.className = "lextreetools";
        if( !name )
        {
            toolsDiv.className += " notitle";
        }

        // Tree icons
        if( options.icons )
        {
            for( let data of options.icons )
            {
                let iconEl = document.createElement('a');
                iconEl.title = data.name;
                iconEl.className = "lexicon " + data.icon;
                iconEl.addEventListener("click", data.callback);
                toolsDiv.appendChild( iconEl );
            }
        }

        // Node filter

        options.filter = options.filter ?? true;

        let nodeFilterInput = null;
        if( options.filter )
        {
            nodeFilterInput = document.createElement('input');
            nodeFilterInput.className = "lexnodetree_filter";
            nodeFilterInput.setAttribute("placeholder", "Filter..");
            nodeFilterInput.style.width =  "100%";
            nodeFilterInput.addEventListener('input', () => {
                this.innerTree.refresh();
            });

            let searchIcon = document.createElement('a');
            searchIcon.className = "lexicon fa-solid fa-magnifying-glass";
            toolsDiv.appendChild( nodeFilterInput );
            toolsDiv.appendChild( searchIcon );
        }

        if( options.icons || options.filter )
        {
            container.appendChild( toolsDiv );
        }

        // Tree

        let list = document.createElement('ul');
        list.addEventListener("contextmenu", function( e ) {
            e.preventDefault();
        });

        container.appendChild( list );

        this.innerTree = new NodeTree( container, data, options );
    }
}

LX.Tree = Tree;

/**
 * @class TabSections
 * @description TabSections Widget
 */

class TabSections extends Widget {

    constructor( name, tabs, options = {} ) {

        options.hideName = true;

        super( Widget.TABS, name, null, options );

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

        let tabContainer = document.createElement( "div" );
        tabContainer.className = "tabs";
        container.appendChild( tabContainer );
        this.root.appendChild( container );

        for( let i = 0; i < tabs.length; ++i )
        {
            const tab = tabs[ i ];
            console.assert( tab.name );
            const isSelected = ( i == 0 );
            let tabEl = document.createElement( "div" );
            tabEl.className = "lextab " + (i == tabs.length - 1 ? "last" : "") + ( isSelected ? "selected" : "" );
            tabEl.innerHTML = ( showNames ? tab.name : "" ) + "<a class='" + ( tab.icon || "fa fa-hashtag" ) + " " + (showNames ? "withname" : "") + "'></a>";
            tabEl.title = tab.name;

            let infoContainer = document.createElement( "div" );
            infoContainer.id = tab.name.replace( /\s/g, '' );
            infoContainer.className = "widgets";

            if( !isSelected )
            {
                infoContainer.toggleAttribute( "hidden", true );
            }

            container.appendChild( infoContainer );

            tabEl.addEventListener( "click", e => {
                // Change selected tab
                tabContainer.querySelectorAll( ".lextab" ).forEach( e => { e.classList.remove( "selected" ); } );
                tabEl.classList.add( "selected" );
                // Hide all tabs content
                container.querySelectorAll(".widgets").forEach( e => { e.toggleAttribute( "hidden", true ); } );
                // Show tab content
                const el = container.querySelector( '#' + infoContainer.id );
                el.toggleAttribute( "hidden" );

                if( tab.onSelect )
                {
                    tab.onSelect( this, infoContainer );
                }
            });

            tabContainer.appendChild( tabEl );

            if( tab.onCreate )
            {
                // Push to tab space
                const creationPanel = new Panel();
                creationPanel.queue( infoContainer );
                tab.onCreate.call(this, creationPanel);
                creationPanel.clearQueue();
            }
        }
    }
}

LX.TabSections = TabSections;

/**
 * @class Counter
 * @description Counter Widget
 */

class Counter extends Widget {

    constructor( name, value, callback, options = { } ) {

        super( Widget.COUNTER, name, value, options );

        this.onGetValue = () => {
            return counterText.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            newValue = clamp( newValue, min, max );
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = "lexcounter";
        this.root.appendChild( container );

        const substrButton = new Button(null, "<a style='margin-top: 0px;' class='fa-solid fa-minus'></a>", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count - mult, false, e );
        }, { className: "micro", skipInlineCount: true, title: "Minus" });

        container.appendChild( substrButton.root );

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

        const addButton = new Button(null, "<a style='margin-top: 0px;' class='fa-solid fa-plus'></a>", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count + mult, false, e );
        }, { className: "micro", skipInlineCount: true, title: "Plus" });
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;

/**
 * @class Table
 * @description Table Widget
 */

class Table extends Widget {

    constructor( name, data, options = { } ) {

        if( !data )
        {
            throw( "Data is needed to create a table!" );
        }

        super( Widget.TABLE, name, null, options );

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.offsetWidth ?? 0 );
            container.style.width = `calc( 100% - ${ realNameWidth }px)`;
        };

        const container = document.createElement('div');
        container.className = "lextable";
        this.root.appendChild( container );

        this.centered = options.centered ?? false;
        if( this.centered === true )
        {
            container.classList.add( "centered" );
        }

        this.filter = options.filter ?? false;
        this.toggleColumns = options.toggleColumns ?? false;
        this.customFilters = options.customFilters ?? false;
        this.activeCustomFilters = {};

        data.head = data.head ?? [];
        data.body = data.body ?? [];
        data.checkMap = { };
        data.colVisibilityMap = { };
        data.head.forEach( (col, index) => { data.colVisibilityMap[ index ] = true; })

        const compareFn = ( idx, order, a, b) => {
            if (a[idx] < b[idx]) return -order;
            else if (a[idx] > b[idx]) return order;
            return 0;
        }

        const sortFn = ( idx, sign ) => {
            data.body = data.body.sort( compareFn.bind( this, idx, sign ) );
            this.refresh();
        }

        // Append header
        if( this.filter || this.customFilters || this.toggleColumns )
        {
            const headerContainer = LX.makeContainer( [ "100%", "auto" ] );

            if( this.filter )
            {
                const filterOptions = LX.deepCopy( options );
                filterOptions.placeholder = `Filter ${ this.filter }...`;
                filterOptions.skipWidget = true;
                filterOptions.trigger = "input";
                filterOptions.inputClass = "outline";

                let filter = new TextInput(null, "", ( v ) => {
                    this._currentFilter = v;
                    this.refresh();
                }, filterOptions );

                headerContainer.appendChild( filter.root );
            }

            if( this.customFilters )
            {
                const icon = LX.makeIcon( "circle-plus", null, "sm" );

                for( let f of this.customFilters )
                {
                    const customFilterBtn = new Button(null, icon.innerHTML + f.name, ( v ) => {

                        const menuOptions = f.options.map( ( colName, idx ) => {
                            const item = {
                                name: colName,
                                checked:  !!this.activeCustomFilters[ colName ],
                                callback: (key, dom, v) => {
                                    if( v ) { this.activeCustomFilters[ key ] = f.name; }
                                    else {
                                        delete this.activeCustomFilters[ key ];
                                    }
                                    this.refresh();
                                }
                            }
                            return item;
                        } );
                        new DropdownMenu( customFilterBtn.root, menuOptions, { side: "bottom", align: "start" });
                    }, { buttonClass: " primary dashed" } );
                    headerContainer.appendChild( customFilterBtn.root );
                }

                // const resetIcon = LX.makeIcon( "xmark", null, "sm" );
                this._resetCustomFiltersBtn = new Button(null, "resetButton", ( v ) => {
                    this.activeCustomFilters = {};
                    this.refresh();
                    this._resetCustomFiltersBtn.root.classList.add( "hidden" );
                }, { title: "Reset filters", icon: "fa fa-xmark" } );
                headerContainer.appendChild( this._resetCustomFiltersBtn.root );
                this._resetCustomFiltersBtn.root.classList.add( "hidden" );
            }

            if( this.toggleColumns )
            {
                const icon = LX.makeIcon( "sliders" );
                const toggleColumnsBtn = new Button( "toggleColumnsBtn", icon.innerHTML + "View", (value, e) => {
                    const menuOptions = data.head.map( ( colName, idx ) => {
                        const item = {
                            name: colName,
                            icon: "check",
                            callback: () => {
                                data.colVisibilityMap[ idx ] = !data.colVisibilityMap[ idx ];
                                const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                cells.forEach(cell => {
                                    cell.style.display = (cell.style.display === "none") ? "" : "none";
                                });
                            }
                        }
                        if( !data.colVisibilityMap[ idx ] ) delete item.icon;
                        return item;
                    } );
                    new DropdownMenu( e.target, menuOptions, { side: "bottom", align: "end" });
                }, { hideName: true } );
                headerContainer.appendChild( toggleColumnsBtn.root );
                toggleColumnsBtn.root.style.marginLeft = "auto";
            }

            container.appendChild( headerContainer );
        }

        const table = document.createElement( 'table' );
        container.appendChild( table );

        this.refresh = () => {

            this._currentFilter = this._currentFilter ?? "";

            table.innerHTML = "";

            this.rowOffsetCount = 0;

            // Head
            {
                const head = document.createElement( 'thead' );
                head.className = "lextablehead";
                table.appendChild( head );

                const hrow = document.createElement( 'tr' );

                if( options.sortable )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    hrow.appendChild( th );
                    this.rowOffsetCount++;
                }

                if( options.selectable )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    const input = document.createElement( 'input' );
                    input.type = "checkbox";
                    input.className = "lexcheckbox accent";
                    input.checked = data.checkMap[ ":root" ] ?? false;
                    th.appendChild( input );

                    input.addEventListener( 'change', function() {

                        data.checkMap[ ":root" ] = this.checked;

                        const body = table.querySelector( "tbody" );
                        for( const el of body.childNodes )
                        {
                            data.checkMap[ el.getAttribute( "rowId" ) ] = this.checked;
                            el.querySelector( "input" ).checked = this.checked;
                        }
                    });

                    this.rowOffsetCount++;
                    hrow.appendChild( th );
                }

                for( const headData of data.head )
                {
                    const th = document.createElement( 'th' );
                    th.innerHTML = `<span>${ headData }</span>`;
                    th.querySelector( "span" ).appendChild( LX.makeIcon( "menu-arrows", null, "sm" ) );

                    const idx = data.head.indexOf( headData );
                    if( this.centered && this.centered.indexOf( idx ) > -1 )
                    {
                        th.classList.add( "centered" );
                    }

                    const menuOptions = [
                        { name: "Asc", icon: "up", callback: sortFn.bind( this, idx, 1 ) },
                        { name: "Desc", icon: "down", callback: sortFn.bind( this, idx, -1 ) }
                    ];

                    if( this.toggleColumns )
                    {
                        menuOptions.push(
                            null,
                            {
                                name: "Hide", icon: "eye-slash", callback: () => {
                                    data.colVisibilityMap[ idx ] = false;
                                    const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                    cells.forEach(cell => {
                                        cell.style.display = (cell.style.display === "none") ? "" : "none";
                                    });
                                }
                            }
                        );
                    }

                    th.addEventListener( 'click', event => {
                        new DropdownMenu( event.target, menuOptions, { side: "bottom", align: "start" });
                    });

                    hrow.appendChild( th );
                }

                // Add empty header column
                if( options.rowActions )
                {
                    const th = document.createElement( 'th' );
                    th.className = "sm";
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Body
            {
                const body = document.createElement( 'tbody' );
                body.className = "lextablebody";
                table.appendChild( body );

                let rIdx = null;
                let eventCatched = false;
                let movePending = null;

                document.addEventListener( 'mouseup', (e) => {
                    if( !rIdx ) return;
                    document.removeEventListener( "mousemove", onMove );
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = 0;
                    fromRow.classList.remove( "dragging" );
                    Array.from( table.rows ).forEach( v => {
                        v.style.transform = ``;
                        v.style.transition = `none`;
                    } );
                    flushCss( fromRow );

                    if( movePending )
                    {
                        // Modify inner data first
                        const fromIdx = rIdx - 1;
                        const targetIdx = movePending[ 1 ] - 1;
                        var b = data.body[fromIdx];
                        data.body[fromIdx] = data.body[targetIdx];
                        data.body[targetIdx] = b;

                        const parent = movePending[ 0 ].parentNode;
                        parent.insertChildAtIndex(  movePending[ 0 ],  movePending[ 1 ] );
                        movePending = null;
                    }

                    rIdx = null;

                    doAsync( () => {
                        Array.from( table.rows ).forEach( v => {
                            v.style.transition = `transform 0.2s ease-in`;
                        } );
                    } )
                } );

                let onMove = ( e ) => {
                    if( !rIdx ) return;
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = fromRow.dY ?? 0;
                    fromRow.dY += e.movementY;
                    fromRow.style.transform = `translateY(${fromRow.dY}px)`;
                };

                for( let r = 0; r < data.body.length; ++r )
                {
                    const bodyData = data.body[ r ];

                    if( this.filter )
                    {
                        const filterColIndex = data.head.indexOf( this.filter );
                        if( filterColIndex > -1 )
                        {
                            if( !bodyData[ filterColIndex ].toLowerCase().includes( this._currentFilter.toLowerCase() ) )
                            {
                                continue;
                            }
                        }
                    }

                    if( Object.keys( this.activeCustomFilters ).length )
                    {
                        let acfMap = {};

                        this._resetCustomFiltersBtn.root.classList.remove( "hidden" );

                        for( let acfValue in this.activeCustomFilters )
                        {
                            const acfName = this.activeCustomFilters[ acfValue ];
                            acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                            const filterColIndex = data.head.indexOf( acfName );
                            if( filterColIndex > -1 )
                            {
                                acfMap[ acfName ] |= ( bodyData[ filterColIndex ] === acfValue );
                            }
                        }

                        const show = Object.values( acfMap ).reduce( ( e, acc ) => acc *= e );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    const row = document.createElement( 'tr' );
                    const rowId = LX.getSupportedDOMName( bodyData.join( '-' ) );
                    row.setAttribute( "rowId", rowId.substr(0, 16) );

                    if( options.sortable )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";
                        const icon = LX.makeIcon( "grip-vertical" );
                        td.appendChild( icon );

                        icon.draggable = true;

                        icon.addEventListener("dragstart", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            rIdx = row.rowIndex;
                            row.classList.add( "dragging" );

                            document.addEventListener( "mousemove", onMove );
                        }, false );

                        row.addEventListener("mouseenter", function(e) {
                            e.preventDefault();

                            if( rIdx && ( this.rowIndex != rIdx ) && ( eventCatched != this.rowIndex ) )
                            {
                                eventCatched = this.rowIndex;
                                const fromRow = table.rows[ rIdx ];
                                const undo = ( this.style.transform != `` );
                                if (this.rowIndex > rIdx) {
                                    movePending = [ fromRow, undo ? (this.rowIndex-1) : this.rowIndex ];
                                    this.style.transform = undo ? `` : `translateY(-${this.offsetHeight}px)`;
                                } else {
                                    movePending = [ fromRow, undo ? (this.rowIndex) : (this.rowIndex-1) ];
                                    this.style.transform = undo ? `` : `translateY(${this.offsetHeight}px)`;
                                }
                                doAsync( () => {
                                    eventCatched = false;
                                } )
                            }
                        });

                        row.appendChild( td );
                    }

                    if( options.selectable )
                    {
                        const td = document.createElement( 'td' );
                        const input = document.createElement( 'input' );
                        input.type = "checkbox";
                        input.className = "lexcheckbox accent";
                        input.checked = data.checkMap[ rowId ];
                        td.appendChild( input );

                        input.addEventListener( 'change', function() {
                            data.checkMap[ rowId ] = this.checked;

                            if( !this.checked )
                            {
                                const input = table.querySelector( "thead input[type='checkbox']" );
                                input.checked = data.checkMap[ ":root" ] = false;
                            }
                        });

                        row.appendChild( td );
                    }

                    for( const rowData of bodyData )
                    {
                        const td = document.createElement( 'td' );
                        td.innerHTML = `${ rowData }`;

                        const idx = bodyData.indexOf( rowData );
                        if( this.centered && this.centered.indexOf( idx ) > -1 )
                        {
                            td.classList.add( "centered" );
                        }

                        row.appendChild( td );
                    }

                    if( options.rowActions )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";

                        const buttons = document.createElement( 'div' );
                        buttons.className = "lextablebuttons";
                        td.appendChild( buttons );

                        for( const action of options.rowActions )
                        {
                            let button = null;

                            if( action == "delete" )
                            {
                                button = LX.makeIcon( "trash-can", "Delete Row" );
                                button.addEventListener( 'click', function() {
                                    // Don't need to refresh table..
                                    data.body.splice( r, 1 );
                                    row.remove();
                                });
                            }
                            else if( action == "menu" )
                            {
                                button = LX.makeIcon( "more-horizontal", "Menu" );
                                button.addEventListener( 'click', function( event ) {
                                    if( !options.onMenuAction )
                                    {
                                        return;
                                    }

                                    const menuOptions = options.onMenuAction( r, data );
                                    console.assert( menuOptions.length, "Add items to the Menu Action Dropdown!" );

                                    new DropdownMenu( event.target, menuOptions, { side: "bottom", align: "end" });
                                });
                            }
                            else // custom actions
                            {
                                console.assert( action.constructor == Object );
                                button = LX.makeIcon( action.icon, action.title );

                                if( action.callback )
                                {
                                    button.addEventListener( 'click', e => {
                                        const mustRefresh = action.callback( bodyData, table, e );
                                        if( mustRefresh )
                                        {
                                            this.refresh();
                                        }
                                    });
                                }
                            }

                            console.assert( button );
                            buttons.appendChild( button );
                        }

                        row.appendChild( td );
                    }

                    body.appendChild( row );
                }
            }

            for( const v in data.colVisibilityMap )
            {
                const idx = parseInt( v );
                if( !data.colVisibilityMap[ idx ] )
                {
                    const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                    cells.forEach(cell => {
                        cell.style.display = (cell.style.display === "none") ? "" : "none";
                    });
                }
            }
        }

        this.refresh();

        doAsync( this.onResize.bind( this ) );
    }
}

LX.Table = Table;

/**
 * @class Panel
 */

class Panel {

    /**
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the panel element [fit space]
     * height: Height of the panel element [fit space]
     * style: CSS Style object to be applied to the panel
     */

    constructor( options = {} ) {

        var root = document.createElement('div');
        root.className = "lexpanel";

        if( options.id )
        {
            root.id = options.id;
        }

        if( options.className )
        {
            root.className += " " + options.className;
        }

        root.style.width = options.width || "100%";
        root.style.height = options.height || "100%";
        Object.assign( root.style, options.style ?? {} );

        this.root = root;
        this.branches = [];
        this.widgets = {};

        this._branchOpen = false;
        this._currentBranch = null;
        this._queue = []; // Append widgets in other locations
        this._inlineWidgetsLeft = -1;
        this._inline_queued_container = null;
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

        console.assert( content, "No content to attach!" );
        content.parent = this;
        this.root.appendChild( content.root ? content.root : content );
    }

    /**
     * @method clear
     */

    clear() {

        this._branchOpen = false;
        this.branches = [];
        this._currentBranch = null;

        for( let w in this.widgets )
        {
            if( this.widgets[ w ].options && this.widgets[ w ].options.signal )
            {
                const signal = this.widgets[ w ].options.signal;
                for( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if( LX.signals[signal][i] == this.widgets[ w ] )
                    {
                        LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i+1)];
                    }
                }
            }
        }

        if( this.signals )
        {
            for( let w = 0; w < this.signals.length; w++ )
            {
                let widget = Object.values(this.signals[ w ])[0];
                let signal = widget.options.signal;
                for( let i = 0; i < LX.signals[signal].length; i++ )
                {
                    if( LX.signals[signal][i] == widget )
                    {
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
        this._inlineWidgetsLeft = ( number || Infinity );
    }

    /**
     * @method endLine
     * @description Stop inlining widgets. Use it only if the number of widgets to be inlined is NOT specified.
     */

    endLine( justifyContent ) {

        if( this._inlineWidgetsLeft == -1 )
        {
            console.warn("No pending widgets to be inlined!");
            return;
        }

        this._inlineWidgetsLeft = -1;

        if( !this._inlineContainer )
        {
            this._inlineContainer = document.createElement('div');
            this._inlineContainer.className = "lexinlinewidgets";

            if( justifyContent )
            {
                this._inlineContainer.style.justifyContent = justifyContent;
            }
        }

        // Push all elements single element or Array[element, container]
        for( let item of this._inlineWidgets )
        {
            const isPair = ( item.constructor == Array );

            if( isPair )
            {
                // eg. an array, inline items appended later to
                if( this._inline_queued_container )
                {
                    this._inlineContainer.appendChild( item[ 0 ] );
                }
                // eg. a select, item is appended to parent, not to inline cont.
                else
                {
                    item[ 1 ].appendChild( item[ 0 ] );
                }
            }
            else
            {
                this._inlineContainer.appendChild( item );
            }
        }

        if( !this._inline_queued_container )
        {
            if( this._currentBranch )
            {
                this._currentBranch.content.appendChild( this._inlineContainer );
            }
            else
            {
                this.root.appendChild( this._inlineContainer );
            }
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
     * @param {Object} options
     * id: Id of the branch
     * className: Add class to the branch
     * closed: Set branch collapsed/opened [false]
     * icon: Set branch icon (Fontawesome class e.g. "fa-solid fa-skull")
     * filter: Allow filter widgets in branch by name [false]
     */

    branch( name, options = {} ) {

        if( this._branchOpen )
        {
            this.merge();
        }

        // Create new branch
        var branch = new Branch( name, options );
        branch.panel = this;

        // Declare new open
        this._branchOpen = true;
        this._currentBranch = branch;

        // Append to panel
        if( this.branches.length == 0 )
        {
            branch.root.classList.add('first');
        }

        // This is the last!
        this.root.querySelectorAll(".lexbranch.last").forEach( e => { e.classList.remove("last"); } );
        branch.root.classList.add('last');

        this.branches.push( branch );
        this.root.appendChild( branch.root );

        // Add widget filter
        if( options.filter )
        {
            this._addFilter( options.filter, { callback: this._searchWidgets.bind( this, branch.name ) } );
        }

        return branch;
    }

    merge() {
        this._branchOpen = false;
        this._currentBranch = null;
    }

    _pick( arg, def ) {
        return (typeof arg == 'undefined' ? def : arg);
    }

    /*
        Panel Widgets
    */

    _attachWidget( widget, options = {} ) {

        if( widget.name != undefined )
        {
            this.widgets[ widget.name ] = widget;
        }

        if( widget.options.signal && !widget.name )
        {
            if( !this.signals )
            {
                this.signals = [];
            }

            this.signals.push( { [ widget.options.signal ]: widget } )
        }

        const _insertWidget = el => {
            if( options.container )
            {
                options.container.appendChild( el );
            }
            else if( !this.queuedContainer )
            {
                if( this._currentBranch )
                {
                    if( !options.skipWidget )
                    {
                        this._currentBranch.widgets.push( widget );
                    }
                    this._currentBranch.content.appendChild( el );
                }
                else
                {
                    el.className += " nobranch w-full";
                    this.root.appendChild( el );
                }
            }
            // Append content to queued tab container
            else
            {
                this.queuedContainer.appendChild( el );
            }
        };

        const _storeWidget = el => {

            if( !this.queuedContainer )
            {
                this._inlineWidgets.push( el );
            }
            // Append content to queued tab container
            else
            {
                this._inlineWidgets.push( [ el, this.queuedContainer ] );
            }
        };

        // Process inline widgets
        if( this._inlineWidgetsLeft > 0 && !options.skipInlineCount )
        {
            if( !this._inlineWidgets )
            {
                this._inlineWidgets = [];
            }

            // Store widget and its container
            _storeWidget( widget.root );

            this._inlineWidgetsLeft--;

            // Last widget
            if( !this._inlineWidgetsLeft )
            {
                this.endLine();
            }
        }
        else
        {
            _insertWidget( widget.root );
        }

        return widget;
    }

    _addFilter( placeholder, options = {} ) {

        options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties..";
        options.skipWidget = options.skipWidget ?? true;
        options.skipInlineCount = true;

        let widget = new TextInput( null, null, null, options )
        const element = widget.root;
        element.className += " lexfilter";

        let input = document.createElement('input');
        input.className = 'lexinput-filter';
        input.setAttribute( "placeholder", options.placeholder );
        input.style.width =  "100%";
        input.value = options.filterValue || "";

        let searchIcon = document.createElement('a');
        searchIcon.className = "fa-solid fa-magnifying-glass";
        element.appendChild( searchIcon );
        element.appendChild( input );

        input.addEventListener("input", e => {
            if( options.callback )
            {
                options.callback( input.value, e );
            }
        });

        return element;
    }

    _searchWidgets( branchName, value ) {

        for( let b of this.branches )
        {
            if( b.name !== branchName )
            {
                continue;
            }

            // remove all widgets
            for( let w of b.widgets )
            {
                if( w.domEl.classList.contains('lexfilter') )
                {
                    continue;
                }
                w.domEl.remove();
            }

            // push to right container
            this.queue( b.content );

            const emptyFilter = !value.length;

            // add widgets
            for( let w of b.widgets )
            {
                if( !emptyFilter )
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

    /**
     * @method getBranch
     * @param {String} name if null, return current branch
     */

    getBranch( name ) {

        if( name )
        {
            return this.branches.find( b => b.name == name );
        }

        return this._currentBranch;
    }

    /**
     * @method queue
     * @param {HTMLElement} domEl container to append elements to
     */

    queue( domEl ) {

        if( !domEl && this._currentBranch)
        {
            domEl = this._currentBranch.root;
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

        if( this._queue && this._queue.length)
        {
            this.queuedContainer = this._queue.pop();
            return;
        }

        delete this.queuedContainer;
    }

    /**
     * @method addSeparator
     */

    addSeparator() {

        var element = document.createElement('div');
        element.className = "lexseparator";

        let widget = new Widget( Widget.SEPARATOR );
        widget.root = element;

        if( this._currentBranch )
        {
            this._currentBranch.content.appendChild( element );
            this._currentBranch.widgets.push( widget );
        }
        else
        {
            this.root.appendChild( element );
        }
    }

    /**
     * @method addBlank
     * @param {Number} width
     * @param {Number} height
     */

    addBlank( width, height ) {
        const widget = new Blank( width, height );
        return this._attachWidget( widget );
    }

    /**
     * @method addTitle
     * @param {String} name Title name
     * @param {Object} options:
     * link: Href in case title is an hyperlink
     * target: Target name of the iframe (if any)
     * icon: FA class of the icon (if any)
     * iconColor: Color of title icon (if any)
     * style: CSS to override
     */

    addTitle( name, options = {} ) {
        const widget = new Title( name, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addText
     * @param {String} name Widget name
     * @param {String} value Text value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * required: Make the input required
     * placeholder: Add input placeholder
     * pattern: Regular expression that value must match
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * inputClass: Class to add to the native input element
     * skipReset: Don't add the reset value button when value changes
     * float: Justify input text content
     * justifyName: Justify name content
     */

    addText( name, value, callback, options = {} ) {
        const widget = new TextInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTextArea
     * @param {String} name Widget name
     * @param {String} value Text Area value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * placeholder: Add input placeholder
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * float: Justify input text content
     * justifyName: Justify name content
     * fitHeight: Height adapts to text
     */

    addTextArea( name, value, callback, options = {} ) {
        const widget = new TextArea( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addLabel
     * @param {String} value Information string
     * @param {Object} options Text options
     */

    addLabel( value, options = {} ) {
        options.disabled = true;
        const widget = this.addText( null, value, null, options );
        widget.type = Widget.LABEL;
        return widget;
    }

    /**
     * @method addButton
     * @param {String} name Widget name
     * @param {String} value Button name
     * @param {Function} callback Callback function on click
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * icon: Icon class to show as button value
     * img: Path to image to show as button value
     * title: Text to show in native Element title
     * buttonClass: Class to add to the native button element
     */

    addButton( name, value, callback, options = {} ) {
        const widget = new Button( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addComboButtons
     * @param {String} name Widget name
     * @param {Array} values Each of the {value, callback, selected, disabled} items
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * float: Justify content (left, center, right) [center]
     * @legacy selected: Selected item by default by value
     * noSelection: Buttons can be clicked, but they are not selectable
     * toggle: Buttons can be toggled insted of selecting only one
     */

    addComboButtons( name, values, options = {} ) {
        const widget = new ComboButtons( name, values, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCard
     * @param {String} name Card Name
     * @param {Object} options:
     * text: Card text
     * link: Card link
     * title: Card dom title
     * src: url of the image
     * callback (Function): function to call on click
     */

    addCard( name, options = {} ) {
        const widget = new Card( name, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addForm
     * @param {String} name Widget name
     * @param {Object} data Form data
     * @param {Function} callback Callback function on submit form
     * @param {Object} options:
     * actionName: Text to be shown in the button
     */

    addForm( name, data, callback, options = {} ) {
        const widget = new Form( name, data, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addContent
     * @param {String} name Widget name
     * @param {HTMLElement/String} element
     * @param {Object} options
     */

    addContent( name, element, options = {} ) {

        console.assert( element, "Empty content!" );

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

        options.hideName = true;

        let widget = new Widget( Widget.CONTENT, name, null, options );
        widget.root.appendChild( element );

        return this._attachWidget( widget );
    }

    /**
     * @method addImage
     * @param {String} name Widget name
     * @param {String} url Image Url
     * @param {Object} options
     * hideName: Don't use name as label [false]
     */

    async addImage( name, url, options = {} ) {

        console.assert( url, "Empty src/url for Image!" );

        let container = document.createElement( 'div' );
        container.className = "leximage";
        container.style.width = "100%";

        let img = document.createElement( 'img' );
        img.src = url;
        Object.assign( img.style, options.style ?? {} );
        container.appendChild( img );

        let widget = new Widget( Widget.IMAGE, name, null, options );
        widget.root.appendChild( container );

        // await img.decode();
        img.decode();

        return this._attachWidget( widget );
    }

    /**
     * @method addSelect
     * @param {String} name Widget name
     * @param {Array} values Posible options of the select widget -> String (for default select) or Object = {value, url} (for images, gifs..)
     * @param {String} value Select by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * filter: Add a search bar to the widget [false]
     * disabled: Make the widget disabled [false]
     * skipReset: Don't add the reset value button when value changes
     * placeholder: Placeholder for the filter input
     * emptyMsg: Custom message to show when no filtered results
     */

    addSelect( name, values, value, callback, options = {} ) {
        const widget = new Select( name, values, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCurve
     * @param {String} name Widget name
     * @param {Array of Array} values Array of 2N Arrays of each value of the curve
     * @param {Function} callback Callback function on change
     * @param {Object} options:
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
        const widget = new Curve( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addDial
     * @param {String} name Widget name
     * @param {Array of Array} values Array of 2N Arrays of each value of the dial
     * @param {Function} callback Callback function on change
     * @param {Object} options:
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
        const widget = new Dial( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addLayers
     * @param {String} name Widget name
     * @param {Number} value Flag value by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     */

    addLayers( name, value, callback, options = {} ) {
        const widget = new Layers( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addArray
     * @param {String} name Widget name
     * @param {Array} values By default values in the array
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * innerValues (Array): Use select mode and use values as options
     */

    addArray( name, values = [], callback, options = {} ) {
        const widget = new ItemArray( name, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addList
     * @param {String} name Widget name
     * @param {Array} values List values
     * @param {String} value Selected list value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addList( name, values, value, callback, options = {} ) {
        const widget = new List( name, values, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTags
     * @param {String} name Widget name
     * @param {String} value Comma separated tags
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */

    addTags( name, value, callback, options = {} ) {
        const widget = new Tags( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCheckbox
     * @param {String} name Widget name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * label: Checkbox label
     * suboptions: Callback to add widgets in case of TRUE value
     * className: Extra classes to customize style
     */

    addCheckbox( name, value, callback, options = {} ) {
        const widget = new Checkbox( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addToggle
     * @param {String} name Widget name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * label: Toggle label
     * suboptions: Callback to add widgets in case of TRUE value
     * className: Customize colors
     */

    addToggle( name, value, callback, options = {} ) {
        const widget = new Toggle( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addRadioGroup
     * @param {String} name Widget name
     * @param {String} label Radio label
     * @param {Array} values Radio options
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * className: Customize colors
     * selected: Index of the default selected option
     */

    addRadioGroup( name, label, values, callback, options = {} ) {
        const widget = new RadioGroup( name, label, values, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addColor
     * @param {String} name Widget name
     * @param {String} value Default color (hex)
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * useRGB: The callback returns color as Array (r, g, b) and not hex [false]
     */

    addColor( name, value, callback, options = {} ) {
        const widget = new ColorInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addRange
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * className: Extra classes to customize style
     * disabled: Make the widget disabled [false]
     * left: The slider goes to the left instead of the right
     * fill: Fill slider progress [true]
     * step: Step of the input
     * min, max: Min and Max values for the input
     */

    addRange( name, value, callback, options = {} ) {
        const widget = new RangeInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addNumber
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
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
        const widget = new NumberInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    static VECTOR_COMPONENTS = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };

    _addVector( numComponents, name, value, callback, options = {} ) {
        const widget = new Vector( numComponents, name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addVector N (2, 3, 4)
     * @param {String} name Widget name
     * @param {Array} value Array of N components
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * step: Step of the inputs
     * min, max: Min and Max values for the inputs
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse is released
     */

    addVector2( name, value, callback, options ) {
        return this._addVector( 2, name, value, callback, options );
    }

    addVector3( name, value, callback, options ) {
        return this._addVector( 3, name, value, callback, options );
    }

    addVector4( name, value, callback, options ) {
        return this._addVector( 4, name, value, callback, options );
    }

    /**
     * @method addSize
     * @param {String} name Widget name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the widget disabled [false]
     * units: Unit as string added to the end of the value
     */

    addSize( name, value, callback, options = {} ) {
        const widget = new SizeInput( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addPad
     * @param {String} name Widget name
     * @param {Array} value Pad value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * padSize: Size of the pad (css)
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */

    addPad( name, value, callback, options = {} ) {
        const widget = new Pad( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addProgress
     * @param {String} name Widget name
     * @param {Number} value Progress value
     * @param {Object} options:
     * min, max: Min and Max values
     * low, optimum, high: Low and High boundary values, Optimum point in the range
     * showValue: Show current value
     * editable: Allow edit value
     * callback: Function called on change value
     */

    addProgress( name, value, options = {} ) {
        const widget = new Progress( name, value, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addFile
     * @param {String} name Widget name
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * local: Ask for local file
     * disabled: Make the widget disabled [false]
     * read: Return the file itself (False) or the contents (True)
     * type: type to read as [text (Default), buffer, bin, url]
     */

    addFile( name, callback, options = { } ) {
        const widget = new FileInput( name, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTree
     * @param {String} name Widget name
     * @param {Object} data Data of the tree
     * @param {Object} options:
     * icons: Array of objects with icon button information {name, icon, callback}
     * filter: Add nodes filter [true]
     * rename: Boolean to allow rename [true]
     * onevent(tree_event): Called when node is selected, dbl clicked, contextmenu opened, changed visibility, parent or name
     */

    addTree( name, data, options = {} ) {
        const widget = new Tree( name, data, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTabSections
     * @param {String} name Widget name
     * @param {Array} tabs Contains objects with {
     *      name: Name of the tab (if icon, use as title)
     *      icon: Icon to be used as the tab icon (optional)
     *      onCreate: Func to be called at tab creation
     *      onSelect: Func to be called on select tab (optional)
     * }
     * @param {Object} options
     * vertical: Use vertical or horizontal tabs (vertical by default)
     * showNames: Show tab name only in horizontal tabs
     */

    addTabSections( name, tabs, options = {} ) {
        const widget = new TabSections( name, tabs, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addCounter
     * @param {String} name Widget name
     * @param {Number} value Counter value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the widget disabled [false]
     * min, max: Min and Max values
     * step: Step for adding/substracting
     * label: Text to show below the counter
     */

    addCounter( name, value, callback, options = { } ) {
        const widget = new Counter( name, value, callback, options );
        return this._attachWidget( widget );
    }

    /**
     * @method addTable
     * @param {String} name Widget name
     * @param {Number} data Table data
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * head: Table headers (each of the headers per column)
     * body: Table body (data per row for each column)
     * rowActions: Allow to add actions per row
     * onMenuAction: Function callback to fill the "menu" context
     * selectable: Each row can be selected
     * sortable: Rows can be sorted by the user manually
     * centered: Center text within columns. true for all, Array for center selected cols.
     */

    addTable( name, data, options = { } ) {
        const widget = new Table( name, data, options );
        return this._attachWidget( widget );
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

        root.style.margin = "0 auto";

        var that = this;

        this.root = root;
        this.widgets = [];

        // create element
        var title = document.createElement( 'div' );
        title.className = "lexbranchtitle";

        if( options.icon )
        {
            title.innerHTML = "<a class='branchicon " + options.icon + "'>";
        }

        title.innerHTML += ( name || "Branch" );

        title.innerHTML += "<a class='fa-solid fa-angle-right switch-branch-button'></a>";

        root.appendChild( title );

        var branchContent = document.createElement( 'div' );
        branchContent.id = name.replace( /\s/g, '' );
        branchContent.className = "lexbranchcontent";
        root.appendChild( branchContent );
        this.content = branchContent;

        this._addBranchSeparator();

        if( options.closed )
        {
            title.classList.add( "closed" );
            root.classList.add( "closed" );
            this.grabber.setAttribute( "hidden", true );
            doAsync( () => {
                this.content.setAttribute( "hidden", true );
            }, 10 );
        }

        this.onclick = function( e ) {
            // e.stopPropagation();
            this.classList.toggle( "closed" );
            this.parentElement.classList.toggle( "closed" );

            that.content.toggleAttribute( "hidden" );
            that.grabber.toggleAttribute( "hidden" );

            LX.emit( "@on_branch_closed", this.classList.contains( "closed" ) );
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
                p.add( 'Floating', that._onMakeFloating.bind( that ) );
            }, { icon: "fa-regular fa-window-restore" });
        };

        title.addEventListener( 'click', this.onclick );
        title.addEventListener( 'contextmenu', this.oncontextmenu );
    }

    _onMakeFloating() {

        const dialog = new Dialog(this.name, p => {
            // add widgets
            for( let w of this.widgets )
            {
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
        for( let i = 0; i < this.widgets.length; i++ )
        {
            let widget = this.widgets[ i ];
            const element = widget.root;

            if( element.children.length < 2 )
            {
                continue;
            }

            let name = element.children[ 0 ];
            let value = element.children[ 1 ];

            name.style.width = size;
            name.style.minWidth = size;

            switch( widget.type )
            {
                case Widget.CUSTOM:
                case Widget.ARRAY:
                    continue;
            };

            value.style.width = "-moz-calc( 100% - " + size + " )";
            value.style.width = "-webkit-calc( 100% - " + size + " )";
            value.style.width = "calc( 100% - " + size + " )";
        }
    }
};

LX.Branch = Branch;

/**
 * @class Footer
 */

class Footer {
    /**
     * @param {Object} options:
     * columns: Array with data per column { title, items: [ { title, link } ]  }
     * credits: html string
     * socials: Array with data per item { title, link, iconHtml }
    */
    constructor( options = {} ) {

        const root = document.createElement( "footer" );
        root.className = "lexfooter";

        const wrapper = document.createElement( "div" );
        wrapper.className = "w-full";
        root.appendChild( wrapper );

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
            const hr = document.createElement( "hr" );
            wrapper.appendChild( hr );

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
                socials.className = "social";

                for( let social of options.socials )
                {
                    const itemDom = document.createElement( "a" );
                    itemDom.title = social.title;
                    itemDom.innerHTML = social.icon;
                    itemDom.href = social.link;
                    itemDom.target = "_blank";
                    socials.appendChild( itemDom );
                }

                creditsSocials.appendChild( socials );
            }
        }

        // Append directly to body
        const parent = options.parent ?? document.body;
        parent.appendChild( root );
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
            console.warn("Content is empty, add some widgets using 'callback' parameter!");
        }

        this._oncreate = callback;
        this.id = simple_guidGenerator();

        const size = options.size ?? [],
            position = options.position ?? [],
            draggable = options.draggable ?? true,
            modal = options.modal ?? false;

        let root = document.createElement('dialog');
        root.className = "lexdialog " + (options.className ?? "");
        root.id = options.id ?? "dialog" + Dialog._last_id++;
        LX.root.appendChild( root );

        doAsync( () => {
            modal ? root.showModal() : root.show();
        }, 10 );

        let that = this;

        const titleDiv = document.createElement('div');

        if( title )
        {
            titleDiv.className = "lexdialogtitle";
            titleDiv.innerHTML = title;
            titleDiv.setAttribute('draggable', false);

            titleDiv.oncontextmenu = function( e ) {
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

                    doAsync( () => {
                        that.panel.clear();
                        root.remove();
                    }, 150 );
                }
                else
                {
                    options.onclose( this.root );
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
        this.panel.root.style.height = "calc( 100% - 40px )";
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
                else this.root.style.height = this.size[1];
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
                    const t = float[i];
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
        this.root.style.left = ( event.x - 48 + document.scrollingElement.scrollLeft ) + "px";
        this.root.style.top = ( event.y - 8 + document.scrollingElement.scrollTop ) + "px";

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
    }

    _adjustPosition( div, margin, useAbsolute = false ) {

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

    _createSubmenu( o, k, c, d ) {

        this.root.querySelectorAll( ".lexcontextmenu" ).forEach( cm => cm.remove() );

        let contextmenu = document.createElement('div');
        contextmenu.className = "lexcontextmenu";
        c.appendChild( contextmenu );

        for( let i = 0; i < o[k].length; ++i )
        {
            const subitem = o[ k ][ i ];
            const subkey = Object.keys( subitem )[ 0 ];
            this._createEntry(subitem, subkey, contextmenu, d);
        }

        const rect = c.getBoundingClientRect();
        contextmenu.style.left = rect.width + "px";
        contextmenu.style.marginTop =  3.5 - c.offsetHeight + "px";

        // Set final width
        this._adjustPosition( contextmenu, 6, true );
    }

    _createEntry( o, k, c, d ) {

        const hasSubmenu = o[ k ].length;
        let entry = document.createElement('div');
        entry.className = "lexmenuboxentry" + (o[ 'className' ] ? " " + o[ 'className' ] : "" );
        entry.id = o.id ?? ("eId" + getSupportedDOMName( k ));
        entry.innerHTML = "";
        const icon = o[ 'icon' ];
        if( icon )
        {
            entry.innerHTML += "<a class='" + icon + " fa-sm'></a>";
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

            if(disabled) return;

            const f = o[ 'callback' ];
            if( f )
            {
                f.call( this, k, entry );
                this.root.remove();
            }

            if( !hasSubmenu )
            return;

            if( LX.OPEN_CONTEXTMENU_ENTRY == 'click' )
                this._createSubmenu( o, k, entry, ++d );
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
        doAsync( () => this._adjustPosition( this.root, 6 ) );
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

            if( children.find( c => Object.keys(c)[0] == key ) == null )
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
            let pKey = "eId" + getSupportedDOMName( key );

            // Item already created
            const id = "#" + ( item.id ?? pKey );
            if( !this.root.querySelector( id ) )
            {
                this._createEntry( item, key, this.root, -1 );
            }
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
    const menu = new ContextMenu( event, title, options );
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
        element.pointscolor = options.pointsColor || LX.getThemeColor( "global-selected" );
        element.activepointscolor = options.activePointsColor || LX.getThemeColor( "global-selected-light" );
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
            element.pointscolor = options.pointsColor || LX.getThemeColor( "global-selected" );
            element.activepointscolor = options.activePointsColor || LX.getThemeColor( "global-selected-light" );
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
            let dx = (element.xrange[1] - element.xrange[ 0 ]) / samples;
            for( let i = element.xrange[0]; i <= element.xrange[1]; i += dx )
            {
                r.push( element.getValueAt(i) );
            }
            return r;
        }

        element.addValue = function(v) {

            for( let i = 0; i < element.value; i++ )
            {
                let value = element.value[i];
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

        let selected = -1;

        element.redraw = function( o = {} ) {

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
                LX.UTILS.drawSpline( ctx, values, element.smooth );
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
            for( var i = element.xrange[0]; i <= element.xrange[1]; i += dx)
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

        element.redraw = function( o = {} ) {

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
        switch(this.type)
        {
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

        const tree = this.leftPanel.addTree( "Content Browser", tree_data, {
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

        this.tree = tree.innerTree;
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
        this.rightPanel.addSelect( "Filter", this.allowedTypes, this.allowedTypes[ 0 ], v => this._refreshContent.call(this, null, v), { width: "30%", minWidth: "128px" } );
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
            ], { width: "20%", minWidth: "164px", noSelection: true } );
            this.rightPanel.addText(null, this.path.join('/'), null, { width: "70%", maxWidth: "calc(70% - 64px)", minWidth: "164px", disabled: true, signal: "@on_folder_change", style: { fontWeight: "bolder", fontSize: "16px", color: "#aaa" } });
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

            if( !that.skipPreview )
            {
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

                    if( newEmSize < 1 )
                    {
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

            itemEl.addEventListener('click', function( e ) {
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
                itemEl.addEventListener('contextmenu', function( e ) {
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

            itemEl.addEventListener("dragstart", function( e ) {
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
                this.previewPanel.addImage( null, file.src, { style: { width: "100%" } } );
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

                if( i == (num_files - 1) )
                {
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

        if( this.onevent)
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
            if( this.status != 200)
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
            for( var i in request.data)
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

        for( var i in url)
        {
            var script = document.createElement('script');
            script.num = i;
            script.type = 'text/javascript';
            script.src = url[i] + ( version ? "?version=" + version : "" );
            script.original_src = url[i];
            script.async = false;
            script.onload = function( e ) {
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

Element.prototype.getParentArea = function() {
    let parent = this.parentElement;
    while( parent ) {
        if( parent.classList.contains( "lexarea" ) ) { return parent; }
        parent = parent.parentElement;
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
        var cp = [];   // array of control points, as x0,y0,x1,y1,...
        var n = pts.length;

        // Draw an open curve, not connected at the ends
        for( var i = 0; i < (n - 4); i += 2 )
        {
            cp = cp.concat(LX.UTILS.getControlPoints(pts[i],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],t));
        }

        for( var i = 2; i < ( pts.length - 5 ); i += 2 )
        {
            ctx.beginPath();
            ctx.moveTo(pts[i], pts[i+1]);
            ctx.bezierCurveTo(cp[2*i-2],cp[2*i-1],cp[2*i],cp[2*i+1],pts[i+2],pts[i+3]);
            ctx.stroke();
            ctx.closePath();
        }

        //  For open curves the first and last arcs are simple quadratics.
        ctx.beginPath();
        ctx.moveTo( pts[ 0 ], pts[ 1 ] );
        ctx.quadraticCurveTo( cp[ 0 ], cp[ 1 ], pts[ 2 ], pts[ 3 ]);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo( pts[ n-2 ], pts[ n-1 ] );
        ctx.quadraticCurveTo( cp[ 2*n-10 ], cp[ 2*n-9 ], pts[ n-4 ], pts[ n-3 ]);
        ctx.stroke();
        ctx.closePath();

        ctx.restore();
    }
};

LX.ICONS = {
    "align-center": [448, 512, [], "solid", "M352 64c0-17.7-14.3-32-32-32L128 32c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32zm96 128c0-17.7-14.3-32-32-32L32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32zM0 448c0 17.7 14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 416c-17.7 0-32 14.3-32 32zM352 320c0-17.7-14.3-32-32-32l-192 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32z"],
    "align-justify": [448, 512, [], "solid", "M448 64c0-17.7-14.3-32-32-32L32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32zm0 256c0-17.7-14.3-32-32-32L32 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32zM0 192c0 17.7 14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160c-17.7 0-32 14.3-32 32zM448 448c0-17.7-14.3-32-32-32L32 416c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32z"],
    "align-left": [448, 512, [], "solid", "M288 64c0 17.7-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l224 0c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32L32 352c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 224c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"],
    "align-right": [448, 512, [], "solid", "M448 64c0 17.7-14.3 32-32 32L192 96c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 224c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"],
    "bell": [448, 512, [], "regular", "M224 0c-17.7 0-32 14.3-32 32l0 19.2C119 66 64 130.6 64 208l0 25.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416l400 0c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4l0-25.4c0-77.4-55-142-128-156.8L256 32c0-17.7-14.3-32-32-32zm0 96c61.9 0 112 50.1 112 112l0 25.4c0 47.9 13.9 94.6 39.7 134.6L72.3 368C98.1 328 112 281.3 112 233.4l0-25.4c0-61.9 50.1-112 112-112zm64 352l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z"],
    "bell-slash": [640, 512, [], "regular", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L542.6 400c2.7-7.8 1.3-16.5-3.9-23l-14.9-18.6C495.5 322.9 480 278.8 480 233.4l0-33.4c0-75.8-55.5-138.6-128-150.1L352 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 17.9c-43.9 7-81.5 32.7-104.4 68.7L38.8 5.1zM221.7 148.4C239.6 117.1 273.3 96 312 96l8 0 8 0c57.4 0 104 46.6 104 104l0 33.4c0 32.7 6.4 64.8 18.7 94.5L221.7 148.4zM406.2 416l-60.9-48-176.9 0c21.2-32.8 34.4-70.3 38.4-109.1L160 222.1l0 11.4c0 45.4-15.5 89.5-43.8 124.9L101.3 377c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6l286.2 0zM384 448l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z"],
    "display": [576, 512, [], "solid", "M64 0C28.7 0 0 28.7 0 64L0 352c0 35.3 28.7 64 64 64l176 0-10.7 32L160 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l256 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-69.3 0L336 416l176 0c35.3 0 64-28.7 64-64l0-288c0-35.3-28.7-64-64-64L64 0zM512 64l0 288L64 352 64 64l448 0z"],
    "fingerprint": [512, 512, [], "regular", "M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5c8.6 10.1 23.8 11.2 33.8 2.6s11.2-23.8 2.6-33.8C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40zm458.5-52.9c-2.7-13-15.5-21.3-28.4-18.5s-21.3 15.5-18.5 28.4c2.9 13.9 4.5 28.3 4.5 43.1l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c0-18.1-1.9-35.8-5.5-52.9zM256 80c-19 0-37.4 3-54.5 8.6c-15.2 5-18.7 23.7-8.3 35.9c7.1 8.3 18.8 10.8 29.4 7.9c10.6-2.9 21.8-4.4 33.4-4.4c70.7 0 128 57.3 128 128l0 24.9c0 25.2-1.5 50.3-4.4 75.3c-1.7 14.6 9.4 27.8 24.2 27.8c11.8 0 21.9-8.6 23.3-20.3c3.3-27.4 5-55 5-82.7l0-24.9c0-97.2-78.8-176-176-176zM150.7 148.7c-9.1-10.6-25.3-11.4-33.9-.4C93.7 178 80 215.4 80 256l0 24.9c0 24.2-2.6 48.4-7.8 71.9C68.8 368.4 80.1 384 96.1 384c10.5 0 19.9-7 22.2-17.3c6.4-28.1 9.7-56.8 9.7-85.8l0-24.9c0-27.2 8.5-52.4 22.9-73.1c7.2-10.4 8-24.6-.2-34.2zM256 160c-53 0-96 43-96 96l0 24.9c0 35.9-4.6 71.5-13.8 106.1c-3.8 14.3 6.7 29 21.5 29c9.5 0 17.9-6.2 20.4-15.4c10.5-39 15.9-79.2 15.9-119.7l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 36.3-3.5 72.4-10.4 107.9c-2.7 13.9 7.7 27.2 21.8 27.2c10.2 0 19-7 21-17c7.7-38.8 11.6-78.3 11.6-118.1l0-24.9c0-53-43-96-96-96zm24 96c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8l5.9-15.3C267.9 411.9 280 346.7 280 280.9l0-24.9z"],
    "mobile-screen": [384, 512, [], "solid", "M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zM144 448c0 8.8 7.2 16 16 16l64 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-64 0c-8.8 0-16 7.2-16 16zM304 64L80 64l0 320 224 0 0-320z"],
    "vr-cardboard": [640, 512, ["vr"], "solid", "M576 64L64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l120.4 0c24.2 0 46.4-13.7 57.2-35.4l32-64c8.8-17.5 26.7-28.6 46.3-28.6s37.5 11.1 46.3 28.6l32 64c10.8 21.7 33 35.4 57.2 35.4L576 448c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64zM96 240a64 64 0 1 1 128 0A64 64 0 1 1 96 240zm384-64a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"],
    "gamepad": [640, 512, [], "solid", "M192 64C86 64 0 150 0 256S86 448 192 448l256 0c106 0 192-86 192-192s-86-192-192-192L192 64zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24l0 32 32 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-32 0 0 32c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-32-32 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l32 0 0-32z"],
    "keyboard": [576, 512, [], "regular", "M64 112c-8.8 0-16 7.2-16 16l0 256c0 8.8 7.2 16 16 16l448 0c8.8 0 16-7.2 16-16l0-256c0-8.8-7.2-16-16-16L64 112zM0 128C0 92.7 28.7 64 64 64l448 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128zM176 320l224 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm-72-72c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16z"],
    "headset": [512, 512, [], "solid", "M256 48C141.1 48 48 141.1 48 256l0 40c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-40C0 114.6 114.6 0 256 0S512 114.6 512 256l0 144.1c0 48.6-39.4 88-88.1 88L313.6 488c-8.3 14.3-23.8 24-41.6 24l-32 0c-26.5 0-48-21.5-48-48s21.5-48 48-48l32 0c17.8 0 33.3 9.7 41.6 24l110.4 .1c22.1 0 40-17.9 40-40L464 256c0-114.9-93.1-208-208-208zM144 208l16 0c17.7 0 32 14.3 32 32l0 112c0 17.7-14.3 32-32 32l-16 0c-35.3 0-64-28.7-64-64l0-48c0-35.3 28.7-64 64-64zm224 0c35.3 0 64 28.7 64 64l0 48c0 35.3-28.7 64-64 64l-16 0c-17.7 0-32-14.3-32-32l0-112c0-17.7 14.3-32 32-32l16 0z"],
    "camera": [512, 512, [], "solid", "M149.1 64.8L138.7 96 64 96C28.7 96 0 124.7 0 160L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64l-74.7 0L362.9 64.8C356.4 45.2 338.1 32 317.4 32L194.6 32c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"],
    "print": [512, 512, [], "solid", "M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
    "bookmark": [384, 512, [], "regular", "M0 48C0 21.5 21.5 0 48 0l0 48 0 393.4 130.1-92.9c8.3-6 19.6-6 27.9 0L336 441.4 336 48 48 48 48 0 336 0c26.5 0 48 21.5 48 48l0 440c0 9-5 17.2-13 21.3s-17.6 3.4-24.9-1.8L192 397.5 37.9 507.5c-7.3 5.2-16.9 5.9-24.9 1.8S0 497 0 488L0 48z"],
    "calendar": [448, 512, [], "regular", "M152 24c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40L64 64C28.7 64 0 92.7 0 128l0 16 0 48L0 448c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-256 0-48 0-16c0-35.3-28.7-64-64-64l-40 0 0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40L152 64l0-40zM48 192l352 0 0 256c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256z"],
    "chart": [448, 512, [], "solid", "M160 80c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-352zM0 272c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 160c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48L0 272zM368 96l32 0c26.5 0 48 21.5 48 48l0 288c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48z"],
    "check": [448, 512, [], "solid", "M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"],
    "clone": [512, 512, [], "regular", "M64 464l224 0c8.8 0 16-7.2 16-16l0-64 48 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64l64 0 0 48-64 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zM224 304l224 0c8.8 0 16-7.2 16-16l0-224c0-8.8-7.2-16-16-16L224 48c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zm-64-16l0-224c0-35.3 28.7-64 64-64L448 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-224 0c-35.3 0-64-28.7-64-64z"],
    "copy": [448, 512, [], "regular", "M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"],
    "paste": [512, 512, [], "regular", "M104.6 48L64 48C28.7 48 0 76.7 0 112L0 384c0 35.3 28.7 64 64 64l96 0 0-48-96 0c-8.8 0-16-7.2-16-16l0-272c0-8.8 7.2-16 16-16l16 0c0 17.7 14.3 32 32 32l72.4 0C202 108.4 227.6 96 256 96l62 0c-7.1-27.6-32.2-48-62-48l-40.6 0C211.6 20.9 188.2 0 160 0s-51.6 20.9-55.4 48zM144 56a16 16 0 1 1 32 0 16 16 0 1 1 -32 0zM448 464l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L464 243.9 464 448c0 8.8-7.2 16-16 16zM256 512l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9l-67.9-67.9c-9-9-21.2-14.1-33.9-14.1L256 128c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64z"],
    "edit": [512, 512, [], "regular", "M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z"],
    "envelope": [512, 512, [], "regular", "M64 112c-8.8 0-16 7.2-16 16l0 22.1L220.5 291.7c20.7 17 50.4 17 71.1 0L464 150.1l0-22.1c0-8.8-7.2-16-16-16L64 112zM48 212.2L48 384c0 8.8 7.2 16 16 16l384 0c8.8 0 16-7.2 16-16l0-171.8L322 328.8c-38.4 31.5-93.7 31.5-132 0L48 212.2zM0 128C0 92.7 28.7 64 64 64l384 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128z"],
    "envelope-open": [512, 512, [], "regular", "M255.4 48.2c.2-.1 .4-.2 .6-.2s.4 .1 .6 .2L460.6 194c2.1 1.5 3.4 3.9 3.4 6.5l0 13.6L291.5 355.7c-20.7 17-50.4 17-71.1 0L48 214.1l0-13.6c0-2.6 1.2-5 3.4-6.5L255.4 48.2zM48 276.2L190 392.8c38.4 31.5 93.7 31.5 132 0L464 276.2 464 456c0 4.4-3.6 8-8 8L56 464c-4.4 0-8-3.6-8-8l0-179.8zM256 0c-10.2 0-20.2 3.2-28.5 9.1L23.5 154.9C8.7 165.4 0 182.4 0 200.5L0 456c0 30.9 25.1 56 56 56l400 0c30.9 0 56-25.1 56-56l0-255.5c0-18.1-8.7-35.1-23.4-45.6L284.5 9.1C276.2 3.2 266.2 0 256 0z"],
    "map": [576, 512, [], "regular", "M565.6 36.2C572.1 40.7 576 48.1 576 56l0 336c0 10-6.2 18.9-15.5 22.4l-168 64c-5.2 2-10.9 2.1-16.1 .3L192.5 417.5l-160 61c-7.4 2.8-15.7 1.8-22.2-2.7S0 463.9 0 456L0 120c0-10 6.1-18.9 15.5-22.4l168-64c5.2-2 10.9-2.1 16.1-.3L383.5 94.5l160-61c7.4-2.8 15.7-1.8 22.2 2.7zM48 136.5l0 284.6 120-45.7 0-284.6L48 136.5zM360 422.7l0-285.4-144-48 0 285.4 144 48zm48-1.5l120-45.7 0-284.6L408 136.5l0 284.6z"],
    "note-sticky": [448, 512, ["sticky-note"], "regular", "M64 80c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l224 0 0-80c0-17.7 14.3-32 32-32l80 0 0-224c0-8.8-7.2-16-16-16L64 80zM288 480L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l320 0c35.3 0 64 28.7 64 64l0 224 0 5.5c0 17-6.7 33.3-18.7 45.3l-90.5 90.5c-12 12-28.3 18.7-45.3 18.7l-5.5 0z"],
    "file": [384, 512, [], "regular", "M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"],
    "file-video": [384, 512, [], "regular", "M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zM80 288c0-17.7 14.3-32 32-32l96 0c17.7 0 32 14.3 32 32l0 16 44.9-29.9c2-1.3 4.4-2.1 6.8-2.1c6.8 0 12.3 5.5 12.3 12.3l0 103.4c0 6.8-5.5 12.3-12.3 12.3c-2.4 0-4.8-.7-6.8-2.1L240 368l0 16c0 17.7-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32l0-96z"],
    "file-code": [384, 512, [], "regular", "M64 464c-8.8 0-16-7.2-16-16L48 64c0-8.8 7.2-16 16-16l160 0 0 80c0 17.7 14.3 32 32 32l80 0 0 288c0 8.8-7.2 16-16 16L64 464zM64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-293.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0L64 0zm97 289c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L79 303c-9.4 9.4-9.4 24.6 0 33.9l48 48c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-31-31 31-31zM257 255c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l31 31-31 31c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l48-48c9.4-9.4 9.4-24.6 0-33.9l-48-48z"],
    "file-zip": [384, 512, [], "regular", "M64 464c-8.8 0-16-7.2-16-16L48 64c0-8.8 7.2-16 16-16l48 0c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l48 0 0 80c0 17.7 14.3 32 32 32l80 0 0 288c0 8.8-7.2 16-16 16L64 464zM64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-293.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0L64 0zm48 112c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm0 64c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm-6.3 71.8L82.1 335.9c-1.4 5.4-2.1 10.9-2.1 16.4c0 35.2 28.8 63.7 64 63.7s64-28.5 64-63.7c0-5.5-.7-11.1-2.1-16.4l-23.5-88.2c-3.7-14-16.4-23.8-30.9-23.8l-14.8 0c-14.5 0-27.2 9.7-30.9 23.8zM128 336l32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"],
    "file-pdf": [512, 512, [], "regular", "M64 464l48 0 0 48-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 304l-48 0 0-144-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z"],
    "scroll": [576, 512, ["script"], "solid", "M0 80l0 48c0 17.7 14.3 32 32 32l16 0 48 0 0-80c0-26.5-21.5-48-48-48S0 53.5 0 80zM112 32c10 13.4 16 30 16 48l0 304c0 35.3 28.7 64 64 64s64-28.7 64-64l0-5.3c0-32.4 26.3-58.7 58.7-58.7L480 320l0-192c0-53-43-96-96-96L112 32zM464 480c61.9 0 112-50.1 112-112c0-8.8-7.2-16-16-16l-245.3 0c-14.7 0-26.7 11.9-26.7 26.7l0 5.3c0 53-43 96-96 96l176 0 96 0z"],
    "floppy-disk": [448, 512, ["save"], "regular", "M48 96l0 320c0 8.8 7.2 16 16 16l320 0c8.8 0 16-7.2 16-16l0-245.5c0-4.2-1.7-8.3-4.7-11.3l33.9-33.9c12 12 18.7 28.3 18.7 45.3L448 416c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l245.5 0c17 0 33.3 6.7 45.3 18.7l74.5 74.5-33.9 33.9L320.8 84.7c-.3-.3-.5-.5-.8-.8L320 184c0 13.3-10.7 24-24 24l-192 0c-13.3 0-24-10.7-24-24L80 80 64 80c-8.8 0-16 7.2-16 16zm80-16l0 80 144 0 0-80L128 80zm32 240a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"],
    "download": [512, 512, [], "solid", "M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 242.7-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7 288 32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-101.5 0-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352 64 352zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
    "upload": [512, 512, [], "solid", "M288 109.3L288 352c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-242.7-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L288 109.3zM64 352l128 0c0 35.3 28.7 64 64 64s64-28.7 64-64l128 0c35.3 0 64 28.7 64 64l0 32c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64l0-32c0-35.3 28.7-64 64-64zM432 456a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"],
    "gear": [512, 512, [], "solid", "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"],
    "gears": [640, 512, [], "solid", "M308.5 135.3c7.1-6.3 9.9-16.2 6.2-25c-2.3-5.3-4.8-10.5-7.6-15.5L304 89.4c-3-5-6.3-9.9-9.8-14.6c-5.7-7.6-15.7-10.1-24.7-7.1l-28.2 9.3c-10.7-8.8-23-16-36.2-20.9L199 27.1c-1.9-9.3-9.1-16.7-18.5-17.8C173.9 8.4 167.2 8 160.4 8l-.7 0c-6.8 0-13.5 .4-20.1 1.2c-9.4 1.1-16.6 8.6-18.5 17.8L115 56.1c-13.3 5-25.5 12.1-36.2 20.9L50.5 67.8c-9-3-19-.5-24.7 7.1c-3.5 4.7-6.8 9.6-9.9 14.6l-3 5.3c-2.8 5-5.3 10.2-7.6 15.6c-3.7 8.7-.9 18.6 6.2 25l22.2 19.8C32.6 161.9 32 168.9 32 176s.6 14.1 1.7 20.9L11.5 216.7c-7.1 6.3-9.9 16.2-6.2 25c2.3 5.3 4.8 10.5 7.6 15.6l3 5.2c3 5.1 6.3 9.9 9.9 14.6c5.7 7.6 15.7 10.1 24.7 7.1l28.2-9.3c10.7 8.8 23 16 36.2 20.9l6.1 29.1c1.9 9.3 9.1 16.7 18.5 17.8c6.7 .8 13.5 1.2 20.4 1.2s13.7-.4 20.4-1.2c9.4-1.1 16.6-8.6 18.5-17.8l6.1-29.1c13.3-5 25.5-12.1 36.2-20.9l28.2 9.3c9 3 19 .5 24.7-7.1c3.5-4.7 6.8-9.5 9.8-14.6l3.1-5.4c2.8-5 5.3-10.2 7.6-15.5c3.7-8.7 .9-18.6-6.2-25l-22.2-19.8c1.1-6.8 1.7-13.8 1.7-20.9s-.6-14.1-1.7-20.9l22.2-19.8zM112 176a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM504.7 500.5c6.3 7.1 16.2 9.9 25 6.2c5.3-2.3 10.5-4.8 15.5-7.6l5.4-3.1c5-3 9.9-6.3 14.6-9.8c7.6-5.7 10.1-15.7 7.1-24.7l-9.3-28.2c8.8-10.7 16-23 20.9-36.2l29.1-6.1c9.3-1.9 16.7-9.1 17.8-18.5c.8-6.7 1.2-13.5 1.2-20.4s-.4-13.7-1.2-20.4c-1.1-9.4-8.6-16.6-17.8-18.5L583.9 307c-5-13.3-12.1-25.5-20.9-36.2l9.3-28.2c3-9 .5-19-7.1-24.7c-4.7-3.5-9.6-6.8-14.6-9.9l-5.3-3c-5-2.8-10.2-5.3-15.6-7.6c-8.7-3.7-18.6-.9-25 6.2l-19.8 22.2c-6.8-1.1-13.8-1.7-20.9-1.7s-14.1 .6-20.9 1.7l-19.8-22.2c-6.3-7.1-16.2-9.9-25-6.2c-5.3 2.3-10.5 4.8-15.6 7.6l-5.2 3c-5.1 3-9.9 6.3-14.6 9.9c-7.6 5.7-10.1 15.7-7.1 24.7l9.3 28.2c-8.8 10.7-16 23-20.9 36.2L315.1 313c-9.3 1.9-16.7 9.1-17.8 18.5c-.8 6.7-1.2 13.5-1.2 20.4s.4 13.7 1.2 20.4c1.1 9.4 8.6 16.6 17.8 18.5l29.1 6.1c5 13.3 12.1 25.5 20.9 36.2l-9.3 28.2c-3 9-.5 19 7.1 24.7c4.7 3.5 9.5 6.8 14.6 9.8l5.4 3.1c5 2.8 10.2 5.3 15.5 7.6c8.7 3.7 18.6 .9 25-6.2l19.8-22.2c6.8 1.1 13.8 1.7 20.9 1.7s14.1-.6 20.9-1.7l19.8 22.2zM464 304a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"],
    "sliders": [512, 512, [], "solid", "M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z"],
    "eye": [576, 512, [], "regular", "M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"],
    "eye-slash": [640, 512, [], "regular", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zm151 118.3C226 97.7 269.5 80 320 80c65.2 0 118.8 29.6 159.9 67.7C518.4 183.5 545 226 558.6 256c-12.6 28-36.6 66.8-70.9 100.9l-53.8-42.2c9.1-17.6 14.2-37.5 14.2-58.7c0-70.7-57.3-128-128-128c-32.2 0-61.7 11.9-84.2 31.5l-46.1-36.1zM394.9 284.2l-81.5-63.9c4.2-8.5 6.6-18.2 6.6-28.3c0-5.5-.7-10.9-2-16c.7 0 1.3 0 2 0c44.2 0 80 35.8 80 80c0 9.9-1.8 19.4-5.1 28.2zm9.4 130.3C378.8 425.4 350.7 432 320 432c-65.2 0-118.8-29.6-159.9-67.7C121.6 328.5 95 286 81.4 256c8.3-18.4 21.5-41.5 39.4-64.8L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5l-41.9-33zM192 256c0 70.7 57.3 128 128 128c13.3 0 26.1-2 38.2-5.8L302 334c-23.5-5.4-43.1-21.2-53.7-42.3l-56.1-44.2c-.2 2.8-.3 5.6-.3 8.5z"],
    "comment": [512, 512, [], "regular", "M123.6 391.3c12.9-9.4 29.6-11.8 44.6-6.4c26.5 9.6 56.2 15.1 87.8 15.1c124.7 0 208-80.5 208-160s-83.3-160-208-160S48 160.5 48 240c0 32 12.4 62.8 35.7 89.2c8.6 9.7 12.8 22.5 11.8 35.5c-1.4 18.1-5.7 34.7-11.3 49.4c17-7.9 31.1-16.7 39.4-22.7zM21.2 431.9c1.8-2.7 3.5-5.4 5.1-8.1c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208s-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6c-15.1 6.6-32.3 12.6-50.1 16.1c-.8 .2-1.6 .3-2.4 .5c-4.4 .8-8.7 1.5-13.2 1.9c-.2 0-.5 .1-.7 .1c-5.1 .5-10.2 .8-15.3 .8c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c4.1-4.2 7.8-8.7 11.3-13.5c1.7-2.3 3.3-4.6 4.8-6.9l.3-.5z"],
    "message": [512, 512, [], "regular", "M160 368c26.5 0 48 21.5 48 48l0 16 72.5-54.4c8.3-6.2 18.4-9.6 28.8-9.6L448 368c8.8 0 16-7.2 16-16l0-288c0-8.8-7.2-16-16-16L64 48c-8.8 0-16 7.2-16 16l0 288c0 8.8 7.2 16 16 16l96 0zm48 124l-.2 .2-5.1 3.8-17.1 12.8c-4.8 3.6-11.3 4.2-16.8 1.5s-8.8-8.2-8.8-14.3l0-21.3 0-6.4 0-.3 0-4 0-48-48 0-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L448 0c35.3 0 64 28.7 64 64l0 288c0 35.3-28.7 64-64 64l-138.7 0L208 492z"],
    "folder": [512, 512, [], "regular", "M0 96C0 60.7 28.7 32 64 32l132.1 0c19.1 0 37.4 7.6 50.9 21.1L289.9 96 448 96c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96zM64 80c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l384 0c8.8 0 16-7.2 16-16l0-256c0-8.8-7.2-16-16-16l-161.4 0c-10.6 0-20.8-4.2-28.3-11.7L213.1 87c-4.5-4.5-10.6-7-17-7L64 80z"],
    "folder-closed": [512, 512, [], "regular", "M251.7 127.6s0 0 0 0c10.5 10.5 24.7 16.4 39.6 16.4L448 144c8.8 0 16 7.2 16 16l0 32L48 192l0-96c0-8.8 7.2-16 16-16l133.5 0c4.2 0 8.3 1.7 11.3 4.7l33.9-33.9L208.8 84.7l42.9 42.9zM48 240l416 0 0 176c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16l0-176zM285.7 93.7L242.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L291.3 96c-2.1 0-4.2-.8-5.7-2.3z"],
    "folder-open": [576, 512, [], "regular", "M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"],
    "grip-vertical": [320, 512, [], "solid", "M40 352l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zm192 0l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zM40 320c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0zM232 192l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zM40 160c-22.1 0-40-17.9-40-40L0 72C0 49.9 17.9 32 40 32l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0zM232 32l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40z"],
    "image": [512, 512, [], "regular", "M448 80c8.8 0 16 7.2 16 16l0 319.8-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3L48 96c0-8.8 7.2-16 16-16l384 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"],
    "images": [576, 512, [], "regular", "M160 80l352 0c8.8 0 16 7.2 16 16l0 224c0 8.8-7.2 16-16 16l-21.2 0L388.1 178.9c-4.4-6.8-12-10.9-20.1-10.9s-15.7 4.1-20.1 10.9l-52.2 79.8-12.4-16.9c-4.5-6.2-11.7-9.8-19.4-9.8s-14.8 3.6-19.4 9.8L175.6 336 160 336c-8.8 0-16-7.2-16-16l0-224c0-8.8 7.2-16 16-16zM96 96l0 224c0 35.3 28.7 64 64 64l352 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L160 32c-35.3 0-64 28.7-64 64zM48 120c0-13.3-10.7-24-24-24S0 106.7 0 120L0 344c0 75.1 60.9 136 136 136l320 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-320 0c-48.6 0-88-39.4-88-88l0-224zm208 24a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"],
    "photo-film": [640, 512, ["media"], "solid", "M256 0L576 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-320 0c-35.3 0-64-28.7-64-64l0-224c0-35.3 28.7-64 64-64zM476 106.7C471.5 100 464 96 456 96s-15.5 4-20 10.7l-56 84L362.7 169c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6l80 0 48 0 144 0c8.9 0 17-4.9 21.2-12.7s3.7-17.3-1.2-24.6l-96-144zM336 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM64 128l96 0 0 256 0 32c0 17.7 14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-32 160 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 192c0-35.3 28.7-64 64-64zm8 64c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm0 104c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm0 104c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm336 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0c-8.8 0-16 7.2-16 16z"],
    "left": [320, 512, [], "solid", "M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"],
    "right": [320, 512, [], "solid", "M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"],
    "up": [448, 512, [], "solid", "M201.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 205.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"],
    "down": [448, 512, [], "solid", "M201.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 306.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"],
    "arrows": [512, 512, ["arrows-up-down-left-right"], "solid", "M278.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-64 64c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l9.4-9.4L224 224l-114.7 0 9.4-9.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-64 64c-12.5 12.5-12.5 32.8 0 45.3l64 64c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-9.4-9.4L224 288l0 114.7-9.4-9.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l64 64c12.5 12.5 32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-9.4 9.4L288 288l114.7 0-9.4 9.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3l-64-64c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l9.4 9.4L288 224l0-114.7 9.4 9.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-64-64z"],
    "rotate": [512, 512, [], "solid", "M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 22.2l0 128c0 13.3-10.7 24-24 24l-8.4 0c0 0 0 0 0 0L344 224c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l41.1-41.1c-62.6-61.5-163.1-61.2-225.3 1zM16 312c0-13.3 10.7-24 24-24l7.6 0 .7 0L168 288c9.7 0 18.5 5.8 22.2 14.8s1.7 19.3-5.2 26.2l-41.1 41.1c62.6 61.5 163.1 61.2 225.3-1c17.5-17.5 30.1-38 37.8-59.8c5.9-16.7 24.2-25.4 40.8-19.5s25.4 24.2 19.5 40.8c-10.8 30.6-28.4 59.3-52.9 83.8c-87.2 87.2-228.3 87.5-315.8 1L57 457c-6.9 6.9-17.2 8.9-26.2 5.2S16 449.7 16 440l0-119.6 0-.7 0-7.6z"],
    "rotate-right": [512, 512, ["rotate-forward"], "solid", "M463.5 224l8.5 0c13.3 0 24-10.7 24-24l0-128c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8l119.5 0z"],
    "rotate-left": [512, 512, ["rotate-back"], "solid", "M48.5 224L40 224c-13.3 0-24-10.7-24-24L16 72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8L48.5 224z"],
    "arrow-pointer": [320, 512, [], "solid", "M0 55.2L0 426c0 12.2 9.9 22 22 22c6.3 0 12.4-2.7 16.6-7.5L121.2 346l58.1 116.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9L179.8 320l118.1 0c12.2 0 22.1-9.9 22.1-22.1c0-6.3-2.7-12.3-7.4-16.5L38.6 37.9C34.3 34.1 28.9 32 23.2 32C10.4 32 0 42.4 0 55.2z"],
    "hand-pointer": [448, 512, [], "regular", "M160 64c0-8.8 7.2-16 16-16s16 7.2 16 16l0 136c0 10.3 6.6 19.5 16.4 22.8s20.6-.1 26.8-8.3c3-3.9 7.6-6.4 12.8-6.4c8.8 0 16 7.2 16 16c0 10.3 6.6 19.5 16.4 22.8s20.6-.1 26.8-8.3c3-3.9 7.6-6.4 12.8-6.4c7.8 0 14.3 5.6 15.7 13c1.6 8.2 7.3 15.1 15.1 18s16.7 1.6 23.3-3.6c2.7-2.1 6.1-3.4 9.9-3.4c8.8 0 16 7.2 16 16l0 16 0 104c0 39.8-32.2 72-72 72l-56 0-59.8 0-.9 0c-37.4 0-72.4-18.7-93.2-49.9L50.7 312.9c-4.9-7.4-2.9-17.3 4.4-22.2s17.3-2.9 22.2 4.4L116 353.2c5.9 8.8 16.8 12.7 26.9 9.7s17-12.4 17-23l0-19.9 0-256zM176 0c-35.3 0-64 28.7-64 64l0 197.7C91.2 238 55.5 232.8 28.5 250.7C-.9 270.4-8.9 310.1 10.8 339.5L78.3 440.8c29.7 44.5 79.6 71.2 133.1 71.2l.9 0 59.8 0 56 0c66.3 0 120-53.7 120-120l0-104 0-16c0-35.3-28.7-64-64-64c-4.5 0-8.8 .5-13 1.3c-11.7-15.4-30.2-25.3-51-25.3c-6.9 0-13.5 1.1-19.7 3.1C288.7 170.7 269.6 160 248 160c-2.7 0-5.4 .2-8 .5L240 64c0-35.3-28.7-64-64-64zm48 304c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 96c0 8.8 7.2 16 16 16s16-7.2 16-16l0-96zm48-16c-8.8 0-16 7.2-16 16l0 96c0 8.8 7.2 16 16 16s16-7.2 16-16l0-96c0-8.8-7.2-16-16-16zm80 16c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 96c0 8.8 7.2 16 16 16s16-7.2 16-16l0-96z"],
    "log-in": [512, 512, [], "solid", "M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z"],
    "log-out": [512, 512, [], "solid", "M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"],
    "menu-arrows": [512, 512, [], "solid", "M352 144l96 112-96 112M160 144L64 256l96 112", "transform=rotate(90)", "fill=none stroke=currentColor stroke-width=60 stroke-linejoin=round stroke-linecap=round"],
    "more": [128, 512, [], "solid", "M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z"],
    "minus": [448, 512, [], "solid", "M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"],
    "more-horizontal": [448, 512, [], "solid", "M8 256a56 56 0 1 1 112 0A56 56 0 1 1 8 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z"],
    "plus": [448, 512, [], "solid", "M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"],
    "circle-plus": [24, 24, [], "regular", "M12 8V16M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z", null, "fill=none stroke-width=2 stroke-linecap=round stroke-linejoin=round"],
    "search": [512, 512, [], "solid", "M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"],
    "compass": [512, 512, [], "regular", "M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm306.7 69.1L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"],
    "sidebar": [512, 512, [], "regular", "M64 64h384a32 32 0 0 1 32 32v320a32 32 0 0 1-32 32H64a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32zm128 0v384", null, "fill=none stroke=currentColor stroke-width=50 stroke-linejoin=round stroke-linecap=round"],
    "table-cells": [512, 512, [], "solid", "M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm88 64l0 64-88 0 0-64 88 0zm56 0l88 0 0 64-88 0 0-64zm240 0l0 64-88 0 0-64 88 0zM64 224l88 0 0 64-88 0 0-64zm232 0l0 64-88 0 0-64 88 0zm64 0l88 0 0 64-88 0 0-64zM152 352l0 64-88 0 0-64 88 0zm56 0l88 0 0 64-88 0 0-64zm240 0l0 64-88 0 0-64 88 0z"],
    "table-cells-large": [512, 512, [], "solid", "M448 96l0 128-160 0 0-128 160 0zm0 192l0 128-160 0 0-128 160 0zM224 224L64 224 64 96l160 0 0 128zM64 288l160 0 0 128L64 416l0-128zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z"],
    "lightbulb": [384, 512, [], "regular", "M297.2 248.9C311.6 228.3 320 203.2 320 176c0-70.7-57.3-128-128-128S64 105.3 64 176c0 27.2 8.4 52.3 22.8 72.9c3.7 5.3 8.1 11.3 12.8 17.7c0 0 0 0 0 0c12.9 17.7 28.3 38.9 39.8 59.8c10.4 19 15.7 38.8 18.3 57.5L109 384c-2.2-12-5.9-23.7-11.8-34.5c-9.9-18-22.2-34.9-34.5-51.8c0 0 0 0 0 0s0 0 0 0c-5.2-7.1-10.4-14.2-15.4-21.4C27.6 247.9 16 213.3 16 176C16 78.8 94.8 0 192 0s176 78.8 176 176c0 37.3-11.6 71.9-31.4 100.3c-5 7.2-10.2 14.3-15.4 21.4c0 0 0 0 0 0s0 0 0 0c-12.3 16.8-24.6 33.7-34.5 51.8c-5.9 10.8-9.6 22.5-11.8 34.5l-48.6 0c2.6-18.7 7.9-38.6 18.3-57.5c11.5-20.9 26.9-42.1 39.8-59.8c0 0 0 0 0 0s0 0 0 0s0 0 0 0c4.7-6.4 9-12.4 12.7-17.7zM192 128c-26.5 0-48 21.5-48 48c0 8.8-7.2 16-16 16s-16-7.2-16-16c0-44.2 35.8-80 80-80c8.8 0 16 7.2 16 16s-7.2 16-16 16zm0 384c-44.2 0-80-35.8-80-80l0-16 160 0 0 16c0 44.2-35.8 80-80 80z"],
    "flag": [448, 512, [], "regular", "M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24L0 64 0 350.5 0 400l0 88c0 13.3 10.7 24 24 24s24-10.7 24-24l0-100 80.3-20.1c41.1-10.3 84.6-5.5 122.5 13.4c44.2 22.1 95.5 24.8 141.7 7.4l34.7-13c12.5-4.7 20.8-16.6 20.8-30l0-279.7c0-23-24.2-38-44.8-27.7l-9.6 4.8c-46.3 23.2-100.8 23.2-147.1 0c-35.1-17.6-75.4-22-113.5-12.5L48 52l0-28zm0 77.5l96.6-24.2c27-6.7 55.5-3.6 80.4 8.8c54.9 27.4 118.7 29.7 175 6.8l0 241.8-24.4 9.1c-33.7 12.6-71.2 10.7-103.4-5.4c-48.2-24.1-103.3-30.1-155.6-17.1L48 338.5l0-237z"],
    "shuffle": [512, 512, [], "solid", "M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"],
    "credit-card": [576, 512, [], "regular", "M512 80c8.8 0 16 7.2 16 16l0 32L48 128l0-32c0-8.8 7.2-16 16-16l448 0zm16 144l0 192c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16l0-192 480 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm56 304c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm128 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-112 0z"],
    "lock": [448, 512, [], "solid", "M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z"],
    "lock-open": [576, 512, [], "solid", "M352 144c0-44.2 35.8-80 80-80s80 35.8 80 80l0 48c0 17.7 14.3 32 32 32s32-14.3 32-32l0-48C576 64.5 511.5 0 432 0S288 64.5 288 144l0 48L64 192c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192c0-35.3-28.7-64-64-64l-32 0 0-48z"],
    "trash-can": [448, 512, [], "regular", "M170.5 51.6L151.5 80l145 0-19-28.4c-1.5-2.2-4-3.6-6.7-3.6l-93.7 0c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80 368 80l48 0 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 304c0 44.2-35.8 80-80 80l-224 0c-44.2 0-80-35.8-80-80l0-304-8 0c-13.3 0-24-10.7-24-24S10.7 80 24 80l8 0 48 0 13.8 0 36.7-55.1C140.9 9.4 158.4 0 177.1 0l93.7 0c18.7 0 36.2 9.4 46.6 24.9zM80 128l0 304c0 17.7 14.3 32 32 32l224 0c17.7 0 32-14.3 32-32l0-304L80 128zm80 64l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16z"],
    "user": [448, 512, [], "regular", "M304 128a80 80 0 1 0 -160 0 80 80 0 1 0 160 0zM96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM49.3 464l349.5 0c-8.9-63.3-63.3-112-129-112l-91.4 0c-65.7 0-120.1 48.7-129 112zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3z"],
    "street-view": [512, 512, [], "solid", "M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-14-32.6c-7.5-7.9-17.3-14.3-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"],
    "closed-captioning": [576, 512, ["cc"], "regular", "M512 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l448 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM200 208c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48s21.5-48 48-48zm144 48c0-26.5 21.5-48 48-48c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48z"],
    "bone": [576, 512, [], "solid", "M153.7 144.8c6.9 16.3 20.6 31.2 38.3 31.2l192 0c17.7 0 31.4-14.9 38.3-31.2C434.4 116.1 462.9 96 496 96c44.2 0 80 35.8 80 80c0 30.4-17 56.9-42 70.4c-3.6 1.9-6 5.5-6 9.6s2.4 7.7 6 9.6c25 13.5 42 40 42 70.4c0 44.2-35.8 80-80 80c-33.1 0-61.6-20.1-73.7-48.8C415.4 350.9 401.7 336 384 336l-192 0c-17.7 0-31.4 14.9-38.3 31.2C141.6 395.9 113.1 416 80 416c-44.2 0-80-35.8-80-80c0-30.4 17-56.9 42-70.4c3.6-1.9 6-5.5 6-9.6s-2.4-7.7-6-9.6C17 232.9 0 206.4 0 176c0-44.2 35.8-80 80-80c33.1 0 61.6 20.1 73.7 48.8z"],
    "hands-asl-interpreting": [640, 512, ["asl"], "solid", "M156.6 46.3c7.9-15.8 1.5-35-14.3-42.9s-35-1.5-42.9 14.3L13.5 189.4C4.6 207.2 0 226.8 0 246.7L0 256c0 70.7 57.3 128 128 128l72 0 8 0 0-.3c35.2-2.7 65.4-22.8 82.1-51.7c8.8-15.3 3.6-34.9-11.7-43.7s-34.9-3.6-43.7 11.7c-7 12-19.9 20-34.7 20c-22.1 0-40-17.9-40-40s17.9-40 40-40c14.8 0 27.7 8 34.7 20c8.8 15.3 28.4 20.5 43.7 11.7s20.5-28.4 11.7-43.7c-12.8-22.1-33.6-39.1-58.4-47.1l80.8-22c17-4.6 27.1-22.2 22.5-39.3s-22.2-27.1-39.3-22.5L194.9 124.6l81.6-68c13.6-11.3 15.4-31.5 4.1-45.1S249.1-3.9 235.5 7.4L133.6 92.3l23-46zM483.4 465.7c-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l85.9-171.7c8.9-17.8 13.5-37.4 13.5-57.2l0-9.3c0-70.7-57.3-128-128-128l-72 0-8 0 0 .3c-35.2 2.7-65.4 22.8-82.1 51.7c-8.9 15.3-3.6 34.9 11.7 43.7s34.9 3.6 43.7-11.7c7-12 19.9-20 34.7-20c22.1 0 40 17.9 40 40s-17.9 40-40 40c-14.8 0-27.7-8-34.7-20c-8.9-15.3-28.4-20.5-43.7-11.7s-20.5 28.4-11.7 43.7c12.8 22.1 33.6 39.1 58.4 47.1l-80.8 22c-17.1 4.7-27.1 22.2-22.5 39.3s22.2 27.1 39.3 22.5l100.7-27.5-81.6 68c-13.6 11.3-15.4 31.5-4.1 45.1s31.5 15.4 45.1 4.1l101.9-84.9-23 46z"],
    "sun": [512, 512, [], "regular", "M375.7 19.7c-1.5-8-6.9-14.7-14.4-17.8s-16.1-2.2-22.8 2.4L256 61.1 173.5 4.2c-6.7-4.6-15.3-5.5-22.8-2.4s-12.9 9.8-14.4 17.8l-18.1 98.5L19.7 136.3c-8 1.5-14.7 6.9-17.8 14.4s-2.2 16.1 2.4 22.8L61.1 256 4.2 338.5c-4.6 6.7-5.5 15.3-2.4 22.8s9.8 13 17.8 14.4l98.5 18.1 18.1 98.5c1.5 8 6.9 14.7 14.4 17.8s16.1 2.2 22.8-2.4L256 450.9l82.5 56.9c6.7 4.6 15.3 5.5 22.8 2.4s12.9-9.8 14.4-17.8l18.1-98.5 98.5-18.1c8-1.5 14.7-6.9 17.8-14.4s2.2-16.1-2.4-22.8L450.9 256l56.9-82.5c4.6-6.7 5.5-15.3 2.4-22.8s-9.8-12.9-17.8-14.4l-98.5-18.1L375.7 19.7zM269.6 110l65.6-45.2 14.4 78.3c1.8 9.8 9.5 17.5 19.3 19.3l78.3 14.4L402 242.4c-5.7 8.2-5.7 19 0 27.2l45.2 65.6-78.3 14.4c-9.8 1.8-17.5 9.5-19.3 19.3l-14.4 78.3L269.6 402c-8.2-5.7-19-5.7-27.2 0l-65.6 45.2-14.4-78.3c-1.8-9.8-9.5-17.5-19.3-19.3L64.8 335.2 110 269.6c5.7-8.2 5.7-19 0-27.2L64.8 176.8l78.3-14.4c9.8-1.8 17.5-9.5 19.3-19.3l14.4-78.3L242.4 110c8.2 5.7 19 5.7 27.2 0zM256 368a112 112 0 1 0 0-224 112 112 0 1 0 0 224zM192 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"],
    "moon": [384, 512, [], "regular", "M144.7 98.7c-21 34.1-33.1 74.3-33.1 117.3c0 98 62.8 181.4 150.4 211.7c-12.4 2.8-25.3 4.3-38.6 4.3C126.6 432 48 353.3 48 256c0-68.9 39.4-128.4 96.8-157.3zm62.1-66C91.1 41.2 0 137.9 0 256C0 379.7 100 480 223.5 480c47.8 0 92-15 128.4-40.6c1.9-1.3 3.7-2.7 5.5-4c4.8-3.6 9.4-7.4 13.9-11.4c2.7-2.4 5.3-4.8 7.9-7.3c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-3.7 .6-7.4 1.2-11.1 1.6c-5 .5-10.1 .9-15.3 1c-1.2 0-2.5 0-3.7 0l-.3 0c-96.8-.2-175.2-78.9-175.2-176c0-54.8 24.9-103.7 64.1-136c1-.9 2.1-1.7 3.2-2.6c4-3.2 8.2-6.2 12.5-9c3.1-2 6.3-4 9.6-5.8c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-3.6-.3-7.1-.5-10.7-.6c-2.7-.1-5.5-.1-8.2-.1c-3.3 0-6.5 .1-9.8 .2c-2.3 .1-4.6 .2-6.9 .4z"],
    "heart": [512, 512, [], "regular", "M225.8 468.2l-2.5-2.3L48.1 303.2C17.4 274.7 0 234.7 0 192.8l0-3.3c0-70.4 50-130.8 119.2-144C158.6 37.9 198.9 47 231 69.6c9 6.4 17.4 13.8 25 22.3c4.2-4.8 8.7-9.2 13.5-13.3c3.7-3.2 7.5-6.2 11.5-9c0 0 0 0 0 0C313.1 47 353.4 37.9 392.8 45.4C462 58.6 512 119.1 512 189.5l0 3.3c0 41.9-17.4 81.9-48.1 110.4L288.7 465.9l-2.5 2.3c-8.2 7.6-19 11.9-30.2 11.9s-22-4.2-30.2-11.9zM239.1 145c-.4-.3-.7-.7-1-1.1l-17.8-20-.1-.1s0 0 0 0c-23.1-25.9-58-37.7-92-31.2C81.6 101.5 48 142.1 48 189.5l0 3.3c0 28.5 11.9 55.8 32.8 75.2L256 430.7 431.2 268c20.9-19.4 32.8-46.7 32.8-75.2l0-3.3c0-47.3-33.6-88-80.1-96.9c-34-6.5-69 5.4-92 31.2c0 0 0 0-.1 .1s0 0-.1 .1l-17.8 20c-.3 .4-.7 .7-1 1.1c-4.5 4.5-10.6 7-16.9 7s-12.4-2.5-16.9-7z"],
    "xmark": [384, 512, [], "solid", "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"],
    "wand-sparkles": [512, 512, [], "solid", "M464 6.1c9.5-8.5 24-8.1 33 .9l8 8c9 9 9.4 23.5 .9 33l-85.8 95.9c-2.6 2.9-4.1 6.7-4.1 10.7l0 21.4c0 8.8-7.2 16-16 16l-15.8 0c-4.6 0-8.9 1.9-11.9 5.3L100.7 500.9C94.3 508 85.3 512 75.8 512c-8.8 0-17.3-3.5-23.5-9.8L9.7 459.7C3.5 453.4 0 445 0 436.2c0-9.5 4-18.5 11.1-24.8l111.6-99.8c3.4-3 5.3-7.4 5.3-11.9l0-27.6c0-8.8 7.2-16 16-16l34.6 0c3.9 0 7.7-1.5 10.7-4.1L464 6.1zM432 288c3.6 0 6.7 2.4 7.7 5.8l14.8 51.7 51.7 14.8c3.4 1 5.8 4.1 5.8 7.7s-2.4 6.7-5.8 7.7l-51.7 14.8-14.8 51.7c-1 3.4-4.1 5.8-7.7 5.8s-6.7-2.4-7.7-5.8l-14.8-51.7-51.7-14.8c-3.4-1-5.8-4.1-5.8-7.7s2.4-6.7 5.8-7.7l51.7-14.8 14.8-51.7c1-3.4 4.1-5.8 7.7-5.8zM87.7 69.8l14.8 51.7 51.7 14.8c3.4 1 5.8 4.1 5.8 7.7s-2.4 6.7-5.8 7.7l-51.7 14.8L87.7 218.2c-1 3.4-4.1 5.8-7.7 5.8s-6.7-2.4-7.7-5.8L57.5 166.5 5.8 151.7c-3.4-1-5.8-4.1-5.8-7.7s2.4-6.7 5.8-7.7l51.7-14.8L72.3 69.8c1-3.4 4.1-5.8 7.7-5.8s6.7 2.4 7.7 5.8zM208 0c3.7 0 6.9 2.5 7.8 6.1l6.8 27.3 27.3 6.8c3.6 .9 6.1 4.1 6.1 7.8s-2.5 6.9-6.1 7.8l-27.3 6.8-6.8 27.3c-.9 3.6-4.1 6.1-7.8 6.1s-6.9-2.5-7.8-6.1l-6.8-27.3-27.3-6.8c-3.6-.9-6.1-4.1-6.1-7.8s2.5-6.9 6.1-7.8l27.3-6.8 6.8-27.3c.9-3.6 4.1-6.1 7.8-6.1z"],
    "star": [576, 512, [], "regular", "M287.9 0c9.2 0 17.6 5.2 21.6 13.5l68.6 141.3 153.2 22.6c9 1.3 16.5 7.6 19.3 16.3s.5 18.1-5.9 24.5L433.6 328.4l26.2 155.6c1.5 9-2.2 18.1-9.7 23.5s-17.3 6-25.3 1.7l-137-73.2L151 509.1c-8.1 4.3-17.9 3.7-25.3-1.7s-11.2-14.5-9.7-23.5l26.2-155.6L31.1 218.2c-6.5-6.4-8.7-15.9-5.9-24.5s10.3-14.9 19.3-16.3l153.2-22.6L266.3 13.5C270.4 5.2 278.7 0 287.9 0zm0 79L235.4 187.2c-3.5 7.1-10.2 12.1-18.1 13.3L99 217.9 184.9 303c5.5 5.5 8.1 13.3 6.8 21L171.4 443.7l105.2-56.2c7.1-3.8 15.6-3.8 22.6 0l105.2 56.2L384.2 324.1c-1.3-7.7 1.2-15.5 6.8-21l85.9-85.1L358.6 200.5c-7.8-1.2-14.6-6.1-18.1-13.3L287.9 79z"],
    "puzzle-piece": [512, 512, [], "solid", "M192 104.8c0-9.2-5.8-17.3-13.2-22.8C167.2 73.3 160 61.3 160 48c0-26.5 28.7-48 64-48s64 21.5 64 48c0 13.3-7.2 25.3-18.8 34c-7.4 5.5-13.2 13.6-13.2 22.8c0 12.8 10.4 23.2 23.2 23.2l56.8 0c26.5 0 48 21.5 48 48l0 56.8c0 12.8 10.4 23.2 23.2 23.2c9.2 0 17.3-5.8 22.8-13.2c8.7-11.6 20.7-18.8 34-18.8c26.5 0 48 28.7 48 64s-21.5 64-48 64c-13.3 0-25.3-7.2-34-18.8c-5.5-7.4-13.6-13.2-22.8-13.2c-12.8 0-23.2 10.4-23.2 23.2L384 464c0 26.5-21.5 48-48 48l-56.8 0c-12.8 0-23.2-10.4-23.2-23.2c0-9.2 5.8-17.3 13.2-22.8c11.6-8.7 18.8-20.7 18.8-34c0-26.5-28.7-48-64-48s-64 21.5-64 48c0 13.3 7.2 25.3 18.8 34c7.4 5.5 13.2 13.6 13.2 22.8c0 12.8-10.4 23.2-23.2 23.2L48 512c-26.5 0-48-21.5-48-48L0 343.2C0 330.4 10.4 320 23.2 320c9.2 0 17.3 5.8 22.8 13.2C54.7 344.8 66.7 352 80 352c26.5 0 48-28.7 48-64s-21.5-64-48-64c-13.3 0-25.3 7.2-34 18.8C40.5 250.2 32.4 256 23.2 256C10.4 256 0 245.6 0 232.8L0 176c0-26.5 21.5-48 48-48l120.8 0c12.8 0 23.2-10.4 23.2-23.2z"],
    // brands
    "discord": [640, 512, [], "brands", "M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"],
    "github": [496, 512, [], "brands", "M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"],
    "square-js": [448, 512, [], "brands", "M448 96c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96zM180.9 444.9c-33.7 0-53.2-17.4-63.2-38.5L152 385.7c6.6 11.7 12.6 21.6 27.1 21.6c13.8 0 22.6-5.4 22.6-26.5V237.7h42.1V381.4c0 43.6-25.6 63.5-62.9 63.5zm85.8-43L301 382.1c9 14.7 20.8 25.6 41.5 25.6c17.4 0 28.6-8.7 28.6-20.8c0-14.4-11.4-19.5-30.7-28l-10.5-4.5c-30.4-12.9-50.5-29.2-50.5-63.5c0-31.6 24.1-55.6 61.6-55.6c26.8 0 46 9.3 59.8 33.7L368 290c-7.2-12.9-15-18-27.1-18c-12.3 0-20.1 7.8-20.1 18c0 12.6 7.8 17.7 25.9 25.6l10.5 4.5c35.8 15.3 55.9 31 55.9 66.2c0 37.8-29.8 58.6-69.7 58.6c-39.1 0-64.4-18.6-76.7-43z"],
    "python": [448, 512, [], "brands", "M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-66.8 67.8H172.7c-29.2 0-53.4 25-53.4 54.3v101.8c0 29 25.2 46 53.4 54.3 33.8 9.9 66.3 11.7 106.8 0 26.9-7.8 53.4-23.5 53.4-54.3v-40.7H226.2v-13.6h160.2c31.1 0 42.6-21.7 53.4-54.2 11.2-33.5 10.7-65.7 0-108.6zM286.2 404c11.1 0 20.1 9.1 20.1 20.3 0 11.3-9 20.4-20.1 20.4-11 0-20.1-9.2-20.1-20.4.1-11.3 9.1-20.3 20.1-20.3zM167.8 248.1h106.8c29.7 0 53.4-24.5 53.4-54.3V91.9c0-29-24.4-50.7-53.4-55.6-35.8-5.9-74.7-5.6-106.8.1-45.2 8-53.4 24.7-53.4 55.6v40.7h106.9v13.6h-147c-31.1 0-58.3 18.7-66.8 54.2-9.8 40.7-10.2 66.1 0 108.6 7.6 31.6 25.7 54.2 56.8 54.2H101v-48.8c0-35.3 30.5-66.4 66.8-66.4zm-6.7-142.6c-11.1 0-20.1-9.1-20.1-20.3.1-11.3 9-20.4 20.1-20.4 11 0 20.1 9.2 20.1 20.4s-9 20.3-20.1 20.3z"],
    "microsoft": [448, 512, [], "brands", "M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"],
    "apple": [384, 512, [], "brands", "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"],
    "youtube": [576, 512, [], "brands", "M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"],
    "x-twitter": [512, 512, [], "brands", "M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"],
    "chrome": [512, 512, [], "brands", "M0 256C0 209.4 12.47 165.6 34.27 127.1L144.1 318.3C166 357.5 207.9 384 256 384C270.3 384 283.1 381.7 296.8 377.4L220.5 509.6C95.9 492.3 0 385.3 0 256zM365.1 321.6C377.4 302.4 384 279.1 384 256C384 217.8 367.2 183.5 340.7 160H493.4C505.4 189.6 512 222.1 512 256C512 397.4 397.4 511.1 256 512L365.1 321.6zM477.8 128H256C193.1 128 142.3 172.1 130.5 230.7L54.19 98.47C101 38.53 174 0 256 0C350.8 0 433.5 51.48 477.8 128V128zM168 256C168 207.4 207.4 168 256 168C304.6 168 344 207.4 344 256C344 304.6 304.6 344 256 344C207.4 344 168 304.6 168 256z"],
    "reddit": [512, 512, [], "brands", "M0 256C0 114.6 114.6 0 256 0S512 114.6 512 256s-114.6 256-256 256L37.1 512c-13.7 0-20.5-16.5-10.9-26.2L75 437C28.7 390.7 0 326.7 0 256zM349.6 153.6c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7c-20.6 0-37.8 14.6-41.8 34c-34.5 3.7-61.4 33-61.4 68.4l0 .2c-37.5 1.6-71.8 12.3-99 29.1c-10.1-7.8-22.8-12.5-36.5-12.5c-33 0-59.8 26.8-59.8 59.8c0 24 14.1 44.6 34.4 54.1c2 69.4 77.6 125.2 170.6 125.2s168.7-55.9 170.6-125.3c20.2-9.6 34.1-30.2 34.1-54c0-33-26.8-59.8-59.8-59.8c-13.7 0-26.3 4.6-36.4 12.4c-27.4-17-62.1-27.7-100-29.1l0-.2c0-25.4 18.9-46.5 43.4-49.9l0 0c4.4 18.8 21.3 32.8 41.5 32.8zM177.1 246.9c16.7 0 29.5 17.6 28.5 39.3s-13.5 29.6-30.3 29.6s-31.4-8.8-30.4-30.5s15.4-38.3 32.1-38.3zm190.1 38.3c1 21.7-13.7 30.5-30.4 30.5s-29.3-7.9-30.3-29.6c-1-21.7 11.8-39.3 28.5-39.3s31.2 16.6 32.1 38.3zm-48.1 56.7c-10.3 24.6-34.6 41.9-63 41.9s-52.7-17.3-63-41.9c-1.2-2.9 .8-6.2 3.9-6.5c18.4-1.9 38.3-2.9 59.1-2.9s40.7 1 59.1 2.9c3.1 .3 5.1 3.6 3.9 6.5z"],
    "ubuntu": [576, 512, [], "brands", "M469.2 75A75.6 75.6 0 1 0 317.9 75a75.6 75.6 0 1 0 151.2 0zM154.2 240.7A75.6 75.6 0 1 0 3 240.7a75.6 75.6 0 1 0 151.2 0zM57 346C75.6 392.9 108 433 150 461.1s91.5 42.6 142 41.7c-14.7-18.6-22.9-41.5-23.2-65.2c-6.8-.9-13.3-2.1-19.5-3.4c-26.8-5.7-51.9-17.3-73.6-34s-39.3-38.1-51.7-62.5c-20.9 9.9-44.5 12.8-67.1 8.2zm395.1 89.8a75.6 75.6 0 1 0 -151.2 0 75.6 75.6 0 1 0 151.2 0zM444 351.6c18.5 14.8 31.6 35.2 37.2 58.2c33.3-41.3 52.6-92.2 54.8-145.2s-12.5-105.4-42.2-149.4c-8.6 21.5-24 39.6-43.8 51.6c15.4 28.6 22.9 60.8 21.9 93.2s-10.7 64-28 91.6zM101.1 135.4c12.4 2.7 24.3 7.5 35.1 14.3c16.6-24.2 38.9-44.1 64.8-58S255.8 70.4 285.2 70c.2-5.9 .9-11.9 2-17.7c3.6-16.7 11.1-32.3 21.8-45.5c-47.7-3.8-95.4 6-137.6 28.5S94.3 91.7 70.8 133.4c2.7-.2 5.3-.3 8-.3c7.5 0 15 .8 22.4 2.3z"],
    "whatsapp": [448, 512, [], "brands", "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"],
    "linux": [448, 512, [], "brands", "M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"],
    "instagram": [448, 512, [], "brands", "M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"],
    "facebook": [512, 512, [], "brands", "M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z"],
    "safari": [512, 512, [], "brands", "M274.69,274.69l-37.38-37.38L166,346ZM256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8ZM411.85,182.79l14.78-6.13A8,8,0,0,1,437.08,181h0a8,8,0,0,1-4.33,10.46L418,197.57a8,8,0,0,1-10.45-4.33h0A8,8,0,0,1,411.85,182.79ZM314.43,94l6.12-14.78A8,8,0,0,1,331,74.92h0a8,8,0,0,1,4.33,10.45l-6.13,14.78a8,8,0,0,1-10.45,4.33h0A8,8,0,0,1,314.43,94ZM256,60h0a8,8,0,0,1,8,8V84a8,8,0,0,1-8,8h0a8,8,0,0,1-8-8V68A8,8,0,0,1,256,60ZM181,74.92a8,8,0,0,1,10.46,4.33L197.57,94a8,8,0,1,1-14.78,6.12l-6.13-14.78A8,8,0,0,1,181,74.92Zm-63.58,42.49h0a8,8,0,0,1,11.31,0L140,128.72A8,8,0,0,1,140,140h0a8,8,0,0,1-11.31,0l-11.31-11.31A8,8,0,0,1,117.41,117.41ZM60,256h0a8,8,0,0,1,8-8H84a8,8,0,0,1,8,8h0a8,8,0,0,1-8,8H68A8,8,0,0,1,60,256Zm40.15,73.21-14.78,6.13A8,8,0,0,1,74.92,331h0a8,8,0,0,1,4.33-10.46L94,314.43a8,8,0,0,1,10.45,4.33h0A8,8,0,0,1,100.15,329.21Zm4.33-136h0A8,8,0,0,1,94,197.57l-14.78-6.12A8,8,0,0,1,74.92,181h0a8,8,0,0,1,10.45-4.33l14.78,6.13A8,8,0,0,1,104.48,193.24ZM197.57,418l-6.12,14.78a8,8,0,0,1-14.79-6.12l6.13-14.78A8,8,0,1,1,197.57,418ZM264,444a8,8,0,0,1-8,8h0a8,8,0,0,1-8-8V428a8,8,0,0,1,8-8h0a8,8,0,0,1,8,8Zm67-6.92h0a8,8,0,0,1-10.46-4.33L314.43,418a8,8,0,0,1,4.33-10.45h0a8,8,0,0,1,10.45,4.33l6.13,14.78A8,8,0,0,1,331,437.08Zm63.58-42.49h0a8,8,0,0,1-11.31,0L372,383.28A8,8,0,0,1,372,372h0a8,8,0,0,1,11.31,0l11.31,11.31A8,8,0,0,1,394.59,394.59ZM286.25,286.25,110.34,401.66,225.75,225.75,401.66,110.34ZM437.08,331h0a8,8,0,0,1-10.45,4.33l-14.78-6.13a8,8,0,0,1-4.33-10.45h0A8,8,0,0,1,418,314.43l14.78,6.12A8,8,0,0,1,437.08,331ZM444,264H428a8,8,0,0,1-8-8h0a8,8,0,0,1,8-8h16a8,8,0,0,1,8,8h0A8,8,0,0,1,444,264Z"],
    "google": [488, 512, [], "brands", "M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"],
    "npm": [576, 512, [], "brands", "M288 288h-32v-64h32v64zm288-128v192H288v32H160v-32H0V160h576zm-416 32H32v128h64v-96h32v96h32V192zm160 0H192v160h64v-32h64V192zm224 0H352v128h64v-96h32v96h32v-96h32v96h32V192z"],
    "bluetooth-b": [320, 512, [], "brands", "M196.48 260.023l92.626-103.333L143.125 0v206.33l-86.111-86.111-31.406 31.405 108.061 108.399L25.608 368.422l31.406 31.405 86.111-86.111L145.84 512l148.552-148.644-97.912-103.333zm40.86-102.996l-49.977 49.978-.338-100.295 50.315 50.317zM187.363 313.04l49.977 49.978-50.315 50.316.338-100.294z"],
    // Some Aliases
    "vr": "vr-cardboard",
    "sticky-note": "note-sticky",
    "script": "scroll",
    "save": "floppy-disk",
    "media": "photo-film",
    "arrows-up-down-left-right": "arrows",
    "rotate-forward": "rotate-right",
    "rotate-back": "rotate-left",
    "cc": "closed-captioning",
    "asl": "hands-asl-interpreting",
}

export { LX };