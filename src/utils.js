// utils.js @jxarco
import { LX } from './core.js';

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
    console.assert( typeof text == "string", "getSupportedDOMName: Text is not a string!" );

    let name = text.trim();

    // Replace specific known symbols
    name = name.replace( /@/g, '_at_' ).replace( /\+/g, '_plus_' ).replace( /\./g, '_dot_' );
    name = name.replace( /[^a-zA-Z0-9_-]/g, '_' );

    // prefix with an underscore if needed
    if( /^[0-9]/.test( name ) )
    {
        name = '_' + name;
    }

    return name;
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
 * @method stripHTML
 * @description Cleans any DOM element string to get only the text
 * @param {String} html
 */
function stripHTML( html )
{
    const div = document.createElement( "div" );
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

LX.stripHTML = stripHTML;

/**
 * @method parsePixelSize
 * @description Parses any css size and returns a number of pixels
 * @param {Number|String} size
 * @param {Number} total
 */
function parsePixelSize( size, total )
{
    // Assuming pixels..
    if( size.constructor === Number )
    {
        return size;
    }

    if( size.constructor === String )
    {
        const value = parseFloat( size );

        if( size.endsWith( "px" ) ) { return value; } // String pixels
        if( size.endsWith( '%' ) ) { return ( value / 100 ) * total; } // Percentage
        if( size.endsWith( "rem" ) || size.endsWith( "em" ) ) { const rootFontSize = 16; /*parseFloat(getComputedStyle(document.documentElement).fontSize);*/ return value * rootFontSize; } // rem unit: assume 16px = 1rem
        if( size.endsWith( "vw" ) ) { return ( value / 100 ) * window.innerWidth; } // wViewport units
        if( size.endsWith( "vh" ) ) { return ( value / 100 ) * window.innerHeight; } // hViewport units

        // Any CSS calc expression (e.g., "calc(30% - 4px)")
        if( size.startsWith( "calc(" ) )
        {
            const expr = size.slice( 5, -1 );
            const parts = expr.split( /([+\-])/ ); // ["30% ", "-", "4px"]
            let result = 0;
            let op = "+";
            for( let part of parts )
            {
                part = part.trim();
                if( part === "+" || part === "-" )
                {
                    op = part;
                }
                else
                {
                    let value = parsePixelSize( part, total );
                    result = ( op === "+" ) ? result + value : result - value;
                }
            }

            return result;
        }
    }

    throw( "Bad size format!" );
}

LX.parsePixelSize = parsePixelSize;

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
 * @method getTheme
 * @description Gets either "dark" or "light" theme value
 */
function getTheme()
{
    return document.documentElement.getAttribute( "data-theme" ) ?? "dark";
}

LX.getTheme = getTheme;

/**
 * @method switchTheme
 * @description Toggles between "dark" and "light" themes
 */
function switchTheme()
{
    const currentTheme = getTheme();
    setTheme( currentTheme == "dark" ? "light" : "dark" );
}

LX.switchTheme = switchTheme;

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
 * @description Convert a hexadecimal string to a valid RGB color
 * @param {String} hex Hexadecimal color
 */
function hexToRgb( hex )
{
    const hexPattern = /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if( !hexPattern.test( hex ) )
    {
        throw( `Invalid Hex Color: ${ hex }` );
    }

    hex = hex.replace( /^#/, '' );

    // Expand shorthand form (#RGB or #RGBA)
    if( hex.length === 3 || hex.length === 4 )
    {
        hex = hex.split( '' ).map( c => c + c ).join( '' );
    }

    const bigint = parseInt( hex, 16 );

    const r = ( ( bigint >> ( hex.length === 8 ? 24 : 16 ) ) & 255 ) / 255;
    const g = ( ( bigint >> ( hex.length === 8 ? 16 : 8 ) ) & 255 ) / 255;
    const b = ( ( bigint >> ( hex.length === 8 ? 8 : 0 ) ) & 255 ) / 255;
    const a = ( hex.length === 8 ? ( bigint & 255 ) : ( hex.length === 4 ? parseInt( hex.slice( -2 ), 16 ) : 255 ) ) / 255;

    return { r, g, b, a };
}

LX.hexToRgb = hexToRgb;

/**
 * @method hexToHsv
 * @description Convert a hexadecimal string to HSV (0..360|0..1|0..1)
 * @param {String} hexStr Hexadecimal color
 */
function hexToHsv( hexStr )
{
    const rgb = hexToRgb( hexStr );
    return rgbToHsv( rgb );
}

LX.hexToHsv = hexToHsv;

/**
 * @method rgbToHex
 * @description Convert a RGB color to a hexadecimal string
 * @param {Object} rgb Object containing RGB color
 * @param {Number} scale Use 255 for 0..255 range or 1 for 0..1 range
 */
function rgbToHex( rgb, scale = 255 )
{
    const rgbArray = [ rgb.r, rgb.g, rgb.b ];
    if( rgb.a != undefined ) rgbArray.push( rgb.a );

    return (
        "#" +
        rgbArray.map( c => {
            c = Math.floor( c * scale );
            const hex = c.toString(16);
            return hex.length === 1 ? ( '0' + hex ) : hex;
        }).join("")
    );
}

LX.rgbToHex = rgbToHex;

/**
 * @method rgbToCss
 * @description Convert a RGB color (0..1) to a CSS color format
 * @param {Object} rgb Object containing RGB color
 */
function rgbToCss( rgb )
{
    return { r: Math.floor( rgb.r * 255 ), g: Math.floor( rgb.g * 255 ), b: Math.floor( rgb.b * 255 ), a: rgb.a };
}

LX.rgbToCss = rgbToCss;

/**
 * @method rgbToHsv
 * @description Convert a RGB color (0..1) array to HSV (0..360|0..1|0..1)
 * @param {Object} rgb Array containing R, G, B
 */
function rgbToHsv( rgb )
{
    let { r, g, b, a } = rgb;
    a = a ?? 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;

    if (d !== 0) {
        if (max === r) { h = ((g - b) / d) % 6 }
        else if (max === g) { h = (b - r) / d + 2 }
        else { h = (r - g) / d + 4 }
        h *= 60
        if (h < 0) { h += 360 }
    }

    const s = max === 0 ? 0 : (d / max);
    const v = max;

    return { h, s, v, a };
}

LX.rgbToHsv = rgbToHsv;

/**
 * @method hsvToRgb
 * @description Convert an HSV color (0..360|0..1|0..1) array to RGB (0..1|0..255)
 * @param {Array} hsv Array containing H, S, V
 */
function hsvToRgb( hsv )
{
    const { h, s, v, a } = hsv;
    const c = v * s;
    const x = c * (1 - Math.abs( ( (h / 60) % 2 ) - 1) )
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if( h < 60 ) { r = c; g = x; b = 0; }
    else if ( h < 120 ) { r = x; g = c; b = 0; }
    else if ( h < 180 ) { r = 0; g = c; b = x; }
    else if ( h < 240 ) { r = 0; g = x; b = c; }
    else if ( h < 300 ) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return { r: ( r + m ), g: ( g + m ), b: ( b + m ), a };
}

LX.hsvToRgb = hsvToRgb;

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
 * @method guidGenerator
 * @description Get a random unique id
 */
function guidGenerator()
{
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+"-"+S4()+"-"+S4());
}

LX.guidGenerator = guidGenerator;

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
 * updateLayers (Function): Update Zindex of elements to update layers
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
        domEl.style.left = LX.clamp( left, dragMargin + fixedOffset.x, fixedOffset.x + parentRect.width - domEl.offsetWidth - dragMargin ) + 'px';
        domEl.style.top = LX.clamp( top, dragMargin + fixedOffset.y, fixedOffset.y + parentRect.height - domEl.offsetHeight - dragMargin ) + 'px';
        domEl.style.translate = "none"; // Force remove translation
    };

    // Initial adjustment
    if( options.autoAdjust )
    {
        _computePosition( null, parseInt( domEl.style.left ), parseInt( domEl.style.top ) );
    }

    let id = LX.guidGenerator();
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

        if( options.updateLayers ?? true )
        {
            // Force active dialog to show on top
            if( LX.activeDraggable )
            {
                LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX;
            }

            LX.activeDraggable = domEl;
            LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX + 1;
        }

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
    const actionIcon = LX.makeIcon( "Right" );
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
 * className (String): Extra class to customize snippet
 */
function makeCodeSnippet( code, size, options = { } )
{
    if( !LX.has('CodeEditor') )
    {
        console.error( "Import the CodeEditor component to create snippets!" );
        return;
    }

    const snippet = document.createElement( "div" );
    snippet.className = "lexcodesnippet " + ( options.className ?? "" );
    snippet.style.width = size ? size[ 0 ] : "auto";
    snippet.style.height = size ? size[ 1 ] : "auto";
    const area = new LX.Area( { noAppend: true } );
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
                for( let i = ( l[ 0 ] - 1 ); i <= ( l[ 1 ] - 1 ); i++ )
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
                for( let i = ( l[ 0 ] - 1 ); i <= ( l[ 1 ] - 1 ); i++ )
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
 * @method makeKbd
 * @description Kbd element to display a keyboard key.
 * @param {Array} keys
 * @param {String} extraClass
 */
function makeKbd( keys, extraClass = "" )
{
    const specialKeys = {
        "Ctrl": '⌃',
        "Enter": '↩',
        "Shift": '⇧',
        "CapsLock": '⇪',
        "Meta": '⌘',
        "Option": '⌥',
        "Alt": '⌥',
        "Tab": '⇥',
        "ArrowUp": '↑',
        "ArrowDown": '↓',
        "ArrowLeft": '←',
        "ArrowRight": '→',
        "Space": '␣'
    };

    const kbd = LX.makeContainer( ["auto", "auto"], "flex flex-row ml-auto" );

    for( const k of keys )
    {
        LX.makeContainer( ["auto", "auto"], "self-center text-xs fg-secondary select-none", specialKeys[ k ] ?? k, kbd );
    }

    return kbd;
}

LX.makeKbd = makeKbd;

/**
 * @method makeIcon
 * @description Gets an SVG element using one of LX.ICONS
 * @param {String} iconName
 * @param {Object} options
 * title
 * extraClass
 * svgClass
 * variant
 * ...Any Lucide icon options
 */
function makeIcon( iconName, options = { } )
{
    let svg = null;

    const _createIconFromSVG = ( svg ) => {
        if( options.svgClass && options.svgClass.length )
        {
            options.svgClass.split( " " ).forEach( c => svg.classList.add( c ) );
        }
        const icon = document.createElement( "a" );
        icon.title = options.title ?? "";
        icon.className = "lexicon " + ( options.iconClass ?? "" );
        icon.appendChild( svg );
        svg.dataset[ "name" ] = iconName;
        return icon;
    }

    if( iconName.includes( "@" ) )
    {
        const parts = iconName.split( "@" );
        iconName = parts[ 0 ];
        options.variant = parts[ 1 ];
    }

    let data = LX.ICONS[ iconName ];
    const lucideData = lucide[ iconName ] ?? lucide[ LX.LucideIconAlias[ iconName ] ];

    if( data )
    {
        // Resolve alias
        if( data.constructor == String )
        {
            data = LX.ICONS[ data ];
        }

        // Resolve variant
        const requestedVariant = options.variant ?? "regular";
        data = ( ( requestedVariant == "solid" ) ? LX.ICONS[ `${ iconName }@solid` ] : data ) ?? data;
        const variant = data[ 3 ];

        // Create internal icon if variant is the same as requested, there's no lucide/fallback data or if variant is "regular" (default)
        if( ( requestedVariant == variant ) || !lucideData || variant == "regular" )
        {
            svg = document.createElementNS( "http://www.w3.org/2000/svg", "svg" );
            svg.setAttribute( "viewBox", `0 0 ${ data[ 0 ] } ${ data[ 1 ] }` );

            if( data[ 5 ] )
            {
                const classes = data[ 5 ].svgClass;
                classes?.split( ' ' ).forEach( c => {
                    svg.classList.add( c );
                } );

                const attrs = data[ 5 ].svgAttributes;
                attrs?.split( ' ' ).forEach( attr => {
                    const t = attr.split( '=' );
                    svg.setAttribute( t[ 0 ], t[ 1 ] );
                } );
            }

            const path = document.createElement( "path" );
            path.setAttribute( "fill",  "currentColor" );
            path.setAttribute( "d",  data[ 4 ] );
            svg.appendChild( path );

            if( data[ 5 ] )
            {
                const classes = data[ 5 ].pathClass;
                classes?.split( ' ' ).forEach( c => {
                    path.classList.add( c );
                } );

                const attrs = data[ 5 ].pathAttributes;
                attrs?.split( ' ' ).forEach( attr => {
                    const t = attr.split( '=' );
                    path.setAttribute( t[ 0 ], t[ 1 ] );
                } );
            }

            const faLicense = `<!-- This icon might belong to a collection from Iconify - https://iconify.design/ - or !Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->`;
            svg.innerHTML += faLicense;
            return _createIconFromSVG( svg );
        }
    }

    // Fallback to Lucide icon
    console.assert( lucideData, `No existing icon named _${ iconName }_` );
    svg = lucide.createElement( lucideData, options );

    return _createIconFromSVG( svg );
}

LX.makeIcon = makeIcon;

/**
 * @method registerIcon
 * @description Register an SVG icon to LX.ICONS
 * @param {String} iconName
 * @param {String} svgString
 * @param {String} variant
 * @param {Array} aliases
 */
function registerIcon( iconName, svgString, variant = "none", aliases = [] )
{
    const svg = new DOMParser().parseFromString( svgString, 'image/svg+xml' ).documentElement;
    const path = svg.querySelector( "path" );
    const viewBox = svg.getAttribute( "viewBox" ).split( ' ' );
    const pathData = path.getAttribute( 'd' );

    let svgAttributes = [];
    let pathAttributes = [];

    for( const attr of svg.attributes )
    {
        switch( attr.name )
        {
        case "transform":
        case "fill":
        case "stroke-width":
        case "stroke-linecap":
        case "stroke-linejoin":
            svgAttributes.push( `${ attr.name }=${ attr.value }` );
            break;
        }
    }

    for( const attr of path.attributes )
    {
        switch( attr.name )
        {
        case "transform":
        case "fill":
        case "stroke-width":
        case "stroke-linecap":
        case "stroke-linejoin":
            pathAttributes.push( `${ attr.name }=${ attr.value }` );
            break;
        }
    }

    const iconData = [
        parseInt( viewBox[ 2 ] ),
        parseInt( viewBox[ 3 ] ),
        aliases,
        variant,
        pathData,
        {
            svgAttributes: svgAttributes.length ? svgAttributes.join( ' ' ) : null,
            pathAttributes: pathAttributes.length ? pathAttributes.join( ' ' ) : null
        }
    ];

    if( LX.ICONS[ iconName ] )
    {
        console.warn( `${ iconName } will be added/replaced in LX.ICONS` );
    }

    LX.ICONS[ iconName ] = iconData;
}

LX.registerIcon = registerIcon;

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

/*
    Dialog and Notification Elements
*/

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

    return new LX.Dialog( title, p => {
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
    const dialog = new LX.Dialog( title, p => {
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

    const dialog = new LX.Dialog( title, p => {

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

    LX.doAsync( () => {

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
        const panel = new LX.Panel();
        panel.addButton(null, options.action.name ?? "Accept", options.action.callback.bind( this, toast ), { width: "auto", maxWidth: "150px", className: "right", buttonClass: "border" });
        toast.appendChild( panel.root.childNodes[ 0 ] );
    }

    const that = this;

    toast.close = function() {
        this.dataset[ "closed" ] = true;
        LX.doAsync( () => {
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
        const closeIcon = LX.makeIcon( "X", { iconClass: "closer" } );
        closeIcon.addEventListener( "click", () => {
            toast.close();
        } );
        toast.appendChild( closeIcon );
    }

    const timeout = options.timeout ?? 3000;

    if( timeout != -1 )
    {
        LX.doAsync( () => {
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
 * asElement: Returns the badge as HTMLElement [false]
 */

function badge( text, className, options = {} )
{
    const container = document.createElement( "div" );
    container.innerHTML = text;
    container.className = "lexbadge " + ( className ?? "" );
    Object.assign( container.style, options.style ?? {} );
    return ( options.asElement ?? false ) ? container : container.outerHTML;
}

LX.badge = badge;

/**
 * @method makeElement
 * @param {String} htmlType
 * @param {String} className
 * @param {String} innerHTML
 * @param {HTMLElement} parent
 * @param {Object} overrideStyle
 */

function makeElement( htmlType, className, innerHTML, parent, overrideStyle = {} )
{
    const element = document.createElement( htmlType );
    element.className = className ?? ""
    element.innerHTML = innerHTML ?? "";
    Object.assign( element.style, overrideStyle );

    if( parent )
    {
        if( parent.attach ) // Use attach method if possible
        {
            parent.attach( element );
        }
        else // its a native HTMLElement
        {
            parent.appendChild( element );
        }
    }

    return element;
}

LX.makeElement = makeElement;

/**
 * @method makeContainer
 * @param {Array} size
 * @param {String} className
 * @param {String} innerHTML
 * @param {HTMLElement} parent
 * @param {Object} overrideStyle
 */

function makeContainer( size, className, innerHTML, parent, overrideStyle = {} )
{
    const container = LX.makeElement( "div", "lexcontainer " + ( className ?? "" ), innerHTML, parent, overrideStyle );
    container.style.width = size && size[ 0 ] ? size[ 0 ] : "100%";
    container.style.height = size && size[ 1 ] ? size[ 1 ] : "100%";
    return container;
}

LX.makeContainer = makeContainer;

/**
 * @method asTooltip
 * @param {HTMLElement} trigger
 * @param {String} content
 * @param {Object} options
 * side: Side of the tooltip
 * offset: Tooltip margin offset
 * active: Tooltip active by default [true]
 */

function asTooltip( trigger, content, options = {} )
{
    console.assert( trigger, "You need a trigger to generate a tooltip!" );

    trigger.dataset[ "disableTooltip" ] = !( options.active ?? true );

    let tooltipDom = null;

    trigger.addEventListener( "mouseenter", function(e) {

        if( trigger.dataset[ "disableTooltip" ] == "true" )
        {
            return;
        }

        LX.root.querySelectorAll( ".lextooltip" ).forEach( e => e.remove() );

        tooltipDom = document.createElement( "div" );
        tooltipDom.className = "lextooltip";
        tooltipDom.innerHTML = content;

        LX.doAsync( () => {

            const position = [ 0, 0 ];
            const rect = this.getBoundingClientRect();
            const offset = options.offset ?? 6;
            let alignWidth = true;

            switch( options.side ?? "top" )
            {
                case "left":
                    position[ 0 ] += ( rect.x - tooltipDom.offsetWidth - offset );
                    alignWidth = false;
                    break;
                case "right":
                    position[ 0 ] += ( rect.x + rect.width + offset );
                    alignWidth = false;
                    break;
                case "top":
                    position[ 1 ] += ( rect.y - tooltipDom.offsetHeight - offset );
                    alignWidth = true;
                    break;
                case "bottom":
                    position[ 1 ] += ( rect.y + rect.height + offset );
                    alignWidth = true;
                    break;
            }

            if( alignWidth ) { position[ 0 ] += ( rect.x + rect.width * 0.5 ) - tooltipDom.offsetWidth * 0.5; }
            else { position[ 1 ] += ( rect.y + rect.height * 0.5 ) - tooltipDom.offsetHeight * 0.5; }

            // Avoid collisions
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - tooltipDom.offsetWidth - 4 );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - tooltipDom.offsetHeight - 4 );

            tooltipDom.style.left = `${ position[ 0 ] }px`;
            tooltipDom.style.top = `${ position[ 1 ] }px`;
        } )

        LX.root.appendChild( tooltipDom );
    } );

    trigger.addEventListener( "mouseleave", function(e) {
        if( tooltipDom )
        {
            tooltipDom.remove();
        }
    } )
}

LX.asTooltip = asTooltip;

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
                data.append(i,request.data[ i ]);
        }

        xhr.send( data );
        return xhr;
    },

    /**
    * Request file from url
    * @method requestText
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestText( url, onComplete, onError ) {
        return this.request({ url: url, dataType:"text", success: onComplete, error: onError });
    },

    /**
    * Request file from url
    * @method requestJSON
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestJSON( url, onComplete, onError ) {
        return this.request({ url: url, dataType:"json", success: onComplete, error: onError });
    },

    /**
    * Request binary file from url
    * @method requestBinary
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestBinary( url, onComplete, onError ) {
        return this.request({ url: url, dataType:"binary", success: onComplete, error: onError });
    },

    /**
    * Request script and inserts it in the DOM
    * @method requireScript
    * @param {String|Array} url the url of the script or an array containing several urls
    * @param {Function} onComplete
    * @param {Function} onError
    * @param {Function} onProgress (if several files are required, onProgress is called after every file is added to the DOM)
    **/
    requireScript( url, onComplete, onError, onProgress, version ) {

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
            script.src = url[ i ] + ( version ? "?version=" + version : "" );
            script.original_src = url[ i ];
            script.async = false;
            script.onload = function( e ) {
                total--;
                loaded_scripts.push(this);
                if(total)
                {
                    if( onProgress )
                    {
                        onProgress( this.original_src, this.num );
                    }
                }
                else if(onComplete)
                    onComplete( loaded_scripts );
            };
            if(onError)
                script.onerror = function(err) {
                    onError(err, this.original_src, this.num );
                }
            document.getElementsByTagName('head')[ 0 ].appendChild(script);
        }
    },

    loadScriptSync( url ) {
        return new Promise((resolve, reject) => {
            const script = document.createElement( "script" );
            script.src = url;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild( script );
        });
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

/**
 * Utils package
 * @namespace LX.UTILS
 * @description Collection of utility functions
 */

LX.UTILS = {

    compareThreshold( v, p, n, t ) { return Math.abs(v - p) >= t || Math.abs(v - n) >= t },
    compareThresholdRange( v0, v1, t0, t1 ) { return v0 >= t0 && v0 <= t1 || v1 >= t0 && v1 <= t1 || v0 <= t0 && v1 >= t1},
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
            cp = cp.concat(LX.UTILS.getControlPoints(pts[ i ],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],t));
        }

        for( var i = 2; i < ( pts.length - 5 ); i += 2 )
        {
            ctx.beginPath();
            ctx.moveTo(pts[ i ], pts[i+1]);
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