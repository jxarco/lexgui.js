// Utils.ts @jxarco

import { LX } from './Namespace';
import { Area } from "../components/Area";
import { Panel } from "../components/Panel";
import { vec2 } from '../components/Vec2';

function clamp( num: number, min: number, max: number ) { return Math.min( Math.max( num, min ), max ); }
function round( number: number, precision?: number ) { return precision == 0 ? Math.floor( number ) : +(( number ).toFixed( precision ?? 2 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' )); }
function remapRange( oldValue: number,
    oldMin: number,
    oldMax: number,
    newMin: number,
    newMax: number ) { return ((( oldValue - oldMin ) * ( newMax - newMin )) / ( oldMax - oldMin )) + newMin; }

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
function doAsync( fn: () => void, ms: number ) {
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
 * @method flushCss
 * @description By reading the offsetHeight property, we are forcing the browser to flush
 * the pending CSS changes (which it does to ensure the value obtained is accurate).
 * @param {HTMLElement} element
 */
function flushCss( element: HTMLElement )
{
    element.offsetHeight;
}

LX.flushCss = flushCss;

/**
 * @method deleteElement
 * @param {HTMLElement} element
 */
function deleteElement( element: HTMLElement )
{
    if( element ) element.remove();
}

LX.deleteElement = deleteElement;

/**
 * @method toCamelCase
 * @param {String} str
 */
function toCamelCase( str: string )
{
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

LX.toCamelCase = toCamelCase;

/**
 * @method toTitleCase
 * @param {String} str
 */
function toTitleCase( str: string )
{
    return str.replace(/-/g, " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

LX.toTitleCase = toTitleCase;

/**
 * @method toKebabCase
 * @param {String} str
 */
function toKebabCase( str: string )
{
    return str.replace( /[A-Z]/g, m => "-" + m.toLowerCase() );
}

LX.toKebabCase = toKebabCase;

/**
 * @method getSupportedDOMName
 * @description Convert a text string to a valid DOM name
 * @param {String} text Original text
 */
function getSupportedDOMName( text: string )
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
 * @description Ask if LexGUI is using a specific extension
 * @param {String} extensionName Name of the LexGUI extension
 */
function has( extensionName: string )
{
    return ( LX.extensions.indexOf( extensionName ) > -1 );
}

LX.has = has;

/**
 * @method getExtension
 * @description Get a extension from a path/url/filename
 * @param {String} name
 */
function getExtension( name: string )
{
    return name.includes('.') ? name.split('.').pop() : null;
}

LX.getExtension = getExtension;

/**
 * @method stripHTML
 * @description Cleans any DOM element string to get only the text
 * @param {String} html
 */
function stripHTML( html: string )
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
function parsePixelSize( size: number|string, total: number )
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
function deepCopy( obj: any )
{
    return JSON.parse( JSON.stringify( obj ) )
}

LX.deepCopy = deepCopy;

/**
 * @method setTheme
 * @description Set dark or light theme
 * @param {String} colorScheme Name of the scheme
 * @param {Boolean} storeLocal Store in localStorage
 */
function setTheme( colorScheme: string, storeLocal: boolean = true )
{
    colorScheme = ( colorScheme == "light" ) ? "light" : "dark";
    document.documentElement.setAttribute( "data-theme", colorScheme );
    if( storeLocal ) localStorage.setItem( "lxColorScheme", colorScheme );
    LX.emitSignal( "@on_new_color_scheme", colorScheme );
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
 * @method setSystemTheme
 * @description Sets back the system theme
 */
function setSystemTheme()
{
    const currentTheme = ( window.matchMedia && window.matchMedia( "(prefers-color-scheme: light)" ).matches ) ? "light" : "dark";
    setTheme( currentTheme );
    localStorage.removeItem( "lxColorScheme" );

    // Reapply listener
    if( LX._mqlPrefersDarkScheme )
    {
        LX._mqlPrefersDarkScheme.removeEventListener( "change", LX._onChangeSystemTheme );
        LX._mqlPrefersDarkScheme.addEventListener( "change", LX._onChangeSystemTheme );
    }
}

LX.setSystemTheme = setSystemTheme;

/**
 * @method setThemeColor
 * @description Sets a new value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 * @param {String} color Color in rgba/hex
 */
function setThemeColor( colorName: string, color: string )
{
    const r: any = document.querySelector( ':root' );
    r.style.setProperty( '--' + colorName, color );
}

LX.setThemeColor = setThemeColor;

/**
 * @method getThemeColor
 * @description Get the value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 */
function getThemeColor( colorName: string )
{
    const r: any = document.querySelector( ':root' );
    const s = getComputedStyle( r );
    const value = s.getPropertyValue( '--' + colorName );

    if( value.includes( "light-dark" ) )
    {
        const currentScheme = s.getPropertyValue( "color-scheme" );

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
 * @method switchSpacing
 * @description Toggles between "default" and "compact" spacing layouts
 */
function switchSpacing()
{
    const currentSpacing = document.documentElement.getAttribute( "data-spacing" ) ?? "default";
    document.documentElement.setAttribute( "data-spacing", ( currentSpacing == "default" ) ? "compact" : "default" );
    LX.emitSignal( "@on_new_spacing_layout", currentSpacing );
}

LX.switchSpacing = switchSpacing;

/**
 * @method getBase64Image
 * @description Convert an image to a base64 string
 * @param {Image} img
 */
function getBase64Image( img: ImageBitmap )
{
    const canvas = document.createElement( 'canvas' );
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext( '2d' );
    if( ctx ) ctx.drawImage( img, 0, 0 );
    return canvas.toDataURL( 'image/png' );
}

LX.getBase64Image = getBase64Image;

/**
 * @method hexToRgb
 * @description Convert a hexadecimal string to a valid RGB color
 * @param {String} hex Hexadecimal color
 */
function hexToRgb( hex: string )
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
 * @param {String} hex Hexadecimal color
 */
function hexToHsv( hex: string )
{
    const rgb = hexToRgb( hex );
    return rgbToHsv( rgb );
}

LX.hexToHsv = hexToHsv;

/**
 * @method rgbToHex
 * @description Convert a RGB color to a hexadecimal string
 * @param {Object} rgb Object containing RGB color
 * @param {Number} scale Use 255 for 0..255 range or 1 for 0..1 range
 */
function rgbToHex( rgb: any, scale = 255 )
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
function rgbToCss( rgb: any )
{
    return { r: Math.floor( rgb.r * 255 ), g: Math.floor( rgb.g * 255 ), b: Math.floor( rgb.b * 255 ), a: rgb.a };
}

LX.rgbToCss = rgbToCss;

/**
 * @method rgbToHsv
 * @description Convert a RGB color (0..1) array to HSV (0..360|0..1|0..1)
 * @param {Object} rgb Array containing R, G, B
 */
function rgbToHsv( rgb: any )
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
 * @description Convert an HSV color (0..360|0..1|0..1) to RGB (0..1|0..255)
 * @param {Object} hsv containing H, S, V
 */
function hsvToRgb( hsv: any )
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
 * @method dateFromDateString
 * @description Get an instance of Date() from a Date in String format (DD/MM/YYYY)
 * @param {String} dateString
 */
function dateFromDateString( dateString: string )
{
    const tokens = dateString.split( '/' );
    const day = parseInt( tokens[ 0 ] );
    const month = parseInt( tokens[ 1 ] );
    const year = parseInt( tokens[ 2 ] );
    return new Date( `${ month }/${ day }/${ year }` );
}

LX.dateFromDateString = dateFromDateString;

/**
 * @method measureRealWidth
 * @description Measure the pixel width of a text
 * @param {String} value Text to measure
 * @param {Number} paddingPlusMargin Padding offset
 */
function measureRealWidth( value: string, paddingPlusMargin = 8 )
{
    var i = document.createElement( "span" );
    i.className = "lexinputmeasure";
    i.innerHTML = value;
    document.body.appendChild( i );
    var rect = i.getBoundingClientRect();
    LX.deleteElement( i );
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
function buildTextPattern( options: any = {} )
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
function makeDraggable( domEl: any, options: any = {} )
{
    let offsetX = 0;
    let offsetY = 0;
    let currentTarget: any = null;
    let targetClass = options.targetClass;
    let dragMargin = options.dragMargin ?? 3;

    let _computePosition = ( e: any, top?: number, left?: number ) => {
        const nullRect = { x: 0, y: 0, width: 0, height: 0 };
        const parentRect = domEl.parentElement ? domEl.parentElement.getBoundingClientRect() : nullRect;
        const isFixed = ( domEl.style.position == "fixed" );
        const fixedOffset = isFixed ? new vec2( parentRect.x, parentRect.y ) : new vec2();
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

    const defaultMoveFunc = ( e: any ) => {
        if( !currentTarget )
        {
            return;
        }

        _computePosition( e );
    };

    const customMoveFunc = ( e: Event ) => {
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

    domEl.setAttribute( "draggable", "true" );
    domEl.addEventListener( "mousedown", function( e: any ) {
        currentTarget = ( e.target.classList.contains( targetClass ) || !targetClass ) ? e.target : null;
    } );

    domEl.addEventListener( "dragstart", function( e: any ) {
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
        if( e.dataTransfer )
        {
            e.dataTransfer.setDragImage( img, 0, 0 );
            e.dataTransfer.effectAllowed = "move";
        }

        const rect = e.target.getBoundingClientRect();
        const parentRect = currentTarget.parentElement.getBoundingClientRect();
        const isFixed = ( currentTarget.style.position == "fixed" );
        const fixedOffset = isFixed ? new vec2( parentRect.x, parentRect.y ) : new vec2();
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
function makeCollapsible( domEl: any, content: any, parent: any, options: any = {} )
{
    domEl.classList.add( "collapsible" );

    const collapsed = ( options.collapsed ?? true );
    const actionIcon: HTMLElement = LX.makeIcon( "Right" );
    actionIcon.classList.add( "collapser" );
    actionIcon.dataset[ "collapsed" ] = `${ collapsed }`;
    actionIcon.style.marginLeft = "auto";
    actionIcon.style.marginRight = "0.2rem";

    actionIcon.addEventListener( "click", function( e: any ) {
        e.preventDefault();
        e.stopPropagation();
        if( this.dataset[ "collapsed" ] )
        {
            delete this.dataset[ "collapsed" ];
            content.style.display = "block";
        }
        else
        {
            this.dataset[ "collapsed" ] = "true";
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
function makeCodeSnippet( code: string, size: any[], options: any = {} )
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
    const area = new Area( { noAppend: true } );
    let editor = new LX.CodeEditor( area, {
        skipInfo: true,
        disableEdition: true,
        allowAddScripts: false,
        name: options.tabName,
        callback: () =>
        {
            if( options.linesAdded )
            {
                const code = editor.root.querySelector( ".code" );
                for( let ls of options.linesAdded )
                {
                    const l: number|number[] = ls;
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
                for( let ls of options.linesRemoved )
                {
                    const l: number|number[] = ls;
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
        }
    } );

    editor.setText( code, options.language ?? "Plain Text" );

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
function makeKbd( keys: string[], useSpecialKeys: boolean = true, extraClass: string = "" )
{
    const specialKeys: Record<string, string> = {
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
        LX.makeContainer( ["auto", "auto"], "self-center text-xs fg-secondary select-none " + extraClass, useSpecialKeys ? specialKeys[ k ] ?? k : k, kbd );
    }

    return kbd;
}

LX.makeKbd = makeKbd;

/**
 * @method makeBreadcrumb
 * @description Displays the path to the current resource using a hierarchy
 * @param {Array} items
 * @param {Object} options
 * maxItems: Max items until ellipsis is used to overflow
 * separatorIcon: Customize separator icon
 */
function makeBreadcrumb( items: any[], options: any = {} )
{
    const breadcrumb = LX.makeContainer( ["auto", "auto"], "flex flex-row gap-1" );

    const separatorIcon = options.separatorIcon ?? "ChevronRight";
    const maxItems = options.maxItems ?? 4;
    const eraseNum = items.length - maxItems;
    if( eraseNum > 0 )
    {
        const erased = items.splice( 1, eraseNum + 1 );
        const ellipsisItem = { title: "...", ellipsis: erased.map( v => v.title ).join( "/" ) };
        items.splice( 1, 0, ellipsisItem );
    }

    for( let i = 0; i < items.length; ++i )
    {
        const item = items[ i ];
        console.assert( item.title, "Breadcrumb item must have a title!" );

        if( i != 0 )
        {
            const icon = LX.makeIcon( separatorIcon, { svgClass: "sm fg-secondary separator" } );
            breadcrumb.appendChild( icon );
        }

        const lastElement = ( i == items.length - 1 );
        const breadcrumbItem = LX.makeContainer( ["auto", "auto"], `p-1 flex flex-row gap-1 items-center ${ lastElement ? "" : "fg-secondary" }` );
        breadcrumb.appendChild( breadcrumbItem );

        let itemTitle = LX.makeElement( "p", "", item.title );
        if( item.icon )
        {
            breadcrumbItem.appendChild( LX.makeIcon( item.icon, { svgClass: "sm" } ) );
        }

        if( item.items !== undefined )
        {
            const bDropdownTrigger = LX.makeContainer( ["auto", "auto"], `${ lastElement ? "" : "fg-secondary" }` );
            LX.listen( bDropdownTrigger, "click", ( e: any ) => {
                LX.addDropdownMenu( e.target, item.items, { side: "bottom", align: "start" });
            } );
            bDropdownTrigger.append( itemTitle );
            breadcrumbItem.appendChild( bDropdownTrigger );
        }
        else if( item.url !== undefined )
        {
            let itemUrl = LX.makeElement( "a", `decoration-none fg-${ lastElement ? "primary" : "secondary" }`, "", breadcrumbItem );
            itemUrl.href = item.url;
            itemUrl.appendChild( itemTitle );
        }
        else
        {
            breadcrumbItem.appendChild( itemTitle );
        }

        if( item.ellipsis )
        {
            LX.asTooltip( breadcrumbItem, item.ellipsis, { side: "bottom", offset: 4 } );
        }
    }

    return breadcrumb;
}

LX.makeBreadcrumb = makeBreadcrumb;

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
function makeIcon( iconName: string, options: any = {} )
{
    let svg: any = null;

    const _createIconFromSVG = ( svg: any ) => {
        if( options.svgClass && options.svgClass.length )
        {
            options.svgClass.split( " " ).forEach( ( c: string ) => svg.classList.add( c ) );
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

    let data: any = LX.ICONS[ iconName ];
    const lucide = (window as any).lucide;
    const lucideData = lucide[ iconName ] ?? lucide[ LX.LucideIconAlias[ iconName ] ];

    if( data )
    {
        // Resolve alias
        if( data.constructor != Array )
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
                classes?.split( ' ' ).forEach( ( c: string ) => {
                    svg.classList.add( c );
                } );

                const attrs = data[ 5 ].svgAttributes;
                attrs?.split( ' ' ).forEach( ( attr: string ) => {
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
                classes?.split( ' ' ).forEach( ( c: string ) => {
                    path.classList.add( c );
                } );

                const attrs = data[ 5 ].pathAttributes;
                attrs?.split( ' ' ).forEach( ( attr: string ) => {
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
function registerIcon( iconName: string, svgString: string, variant: string = "none", aliases: string[] = [] )
{
    const svg: any = new DOMParser().parseFromString( svgString, 'image/svg+xml' ).documentElement;
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
function registerCommandbarEntry( name: string, callback: any )
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

function message( text: string, title: string, options: any = {} )
{
    if( !text )
    {
        throw( "No message to show" );
    }

    options.modal = true;

    return new LX.Dialog( title, ( p: Panel ) => {
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

function popup( text: string, title: string, options: any = {} )
{
    if( !text )
    {
        throw("No message to show");
    }

    options.size = options.size ?? [ "max-content", "auto" ];
    options.class = "lexpopup";

    const time = options.timeout || 3000;
    const dialog = new LX.Dialog( title, ( p: Panel ) => {
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

function prompt( text: string, title: string, callback: (value: any) => void, options: any = {} )
{
    options.modal = true;
    options.className = "prompt";

    let value = "";

    const dialog = new LX.Dialog( title, ( p: Panel ) => {

        p.addTextArea( null, text, null, { disabled: true, fitHeight: true } );

        if( options.input ?? true )
        {
            p.addText( null, options.input || value, ( v: string ) => value = v, { placeholder: "..." } );
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
                if( callback ) callback.call( LX, value );
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
 * position: Set new position for the toasts ("top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right")
 * action: Data of the custom action { name, callback }
 * closable: Allow closing the toast
 * timeout: Time in which the toast closed automatically, in ms. -1 means persistent. [3000]
 */

function toast( title: string, description: string, options: any = {} )
{
    if( !title )
    {
        throw( "The toast needs at least a title!" );
    }

    const nots = LX.notifications;
    console.assert( nots );

    const toast: any = document.createElement( "li" );
    toast.className = "lextoast";
    nots.prepend( toast );

    const [ positionVertical, positionHorizontal ] = options.position ? options.position.split( "-" ) : [ "bottom", "right" ];

    // Reset style
    nots.style.right = "unset";
    nots.style.left = "unset";
    nots.style.top = "unset";
    nots.style.bottom = "unset";
    nots.style.placeSelf = "unset";

    switch( positionVertical )
    {
        case "top":
            toast.style.translate = "0 -30px";
            nots.style.top = "1rem";
            nots.style.flexDirection = "column";
            break;
        case "bottom":
            toast.style.translate = "0 calc(100% + 30px)";
            nots.style.top = "auto";
            nots.style.bottom = "1rem";
            nots.style.flexDirection = "column-reverse";
            break;
    }

    switch( positionHorizontal )
    {
        case "left":
            nots.style.left = "1rem";
            break;
        case "center":
            nots.style.placeSelf = "center";
            break;
        case "right":
            nots.style.right = "1rem";
            break;
    }

    toast.classList.add( positionVertical );
    toast.classList.add( positionHorizontal );

    LX.doAsync( () => {

        if( nots.offsetWidth > nots.iWidth )
        {
            nots.iWidth = Math.min( nots.offsetWidth, 480 );
            nots.style.width = nots.iWidth + "px";
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
        panel.addButton(null, options.action.name ?? "Accept", options.action.callback.bind( LX, toast ), { width: "auto", maxWidth: "150px", className: "right", buttonClass: "border" });
        toast.appendChild( panel.root.childNodes[ 0 ] );
    }

    toast.close = function() {
        this.dataset[ "open" ] = "false";
        LX.doAsync( () => {
            this.remove();
            if( !LX.notifications.childElementCount )
            {
                LX.notifications.style.width = "unset";
                LX.notifications.iWidth = 0;
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

function badge( text: string, className: string, options: any = {} )
{
    const container = document.createElement( "div" );
    container.innerHTML = text;
    container.className = "lexbadge " + ( className ?? "" );

    if( options.chip )
    {
        container.classList.add( "chip" );
    }

    Object.assign( container.style, options.style ?? {} );

    if( options.callback )
    {
        const arrowIcon = LX.makeIcon( "ArrowUpRight", { svgClass: "xs fg-contrast" } );
        arrowIcon.querySelector("svg").style.marginLeft = "-0.25rem";
        container.innerHTML += arrowIcon.innerHTML;
        container.addEventListener( "click", e => {
            e.preventDefault();
            e.stopPropagation();
            options.callback();
        } );
    }

    if( options.parent )
    {
        options.parent.classList.add( "lexbadge-parent" );
        options.parent.appendChild( container );
    }

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

function makeElement( htmlType: string, className: string, innerHTML: string, parent: any, overrideStyle = {} )
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

function makeContainer( size: any[], className: string, innerHTML: string, parent: any, overrideStyle = {} )
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
 * offsetX: Tooltip margin horizontal offset
 * offsetY: Tooltip margin vertical offset
 * active: Tooltip active by default [true]
 * callback: Callback function to execute when the tooltip is shown
 */

function asTooltip( trigger: any, content: any, options: any = {} )
{
    console.assert( trigger, "You need a trigger to generate a tooltip!" );

    trigger.dataset[ "disableTooltip" ] = !( options.active ?? true );

    let tooltipDom: any = null;

    const _offset = options.offset;
    const _offsetX = options.offsetX ?? ( _offset ?? 0 );
    const _offsetY = options.offsetY ?? ( _offset ?? 6 );

    trigger.addEventListener( "mouseenter", function( e: any ) {

        if( trigger.dataset[ "disableTooltip" ] == "true" )
        {
            return;
        }

        tooltipDom = document.createElement( "div" );
        tooltipDom.className = "lextooltip";
        tooltipDom.innerHTML = trigger.dataset[ "tooltipContent" ] ?? content;

        const nestedDialog = trigger.closest( "dialog" );
        const tooltipParent = nestedDialog ?? LX.root;

        // Remove other first
        LX.root.querySelectorAll( ".lextooltip" ).forEach( ( e: HTMLElement ) => e.remove() );

        // Append new tooltip
        tooltipParent.appendChild( tooltipDom );

        LX.doAsync( () => {

            const position = [ 0, 0 ];
            const offsetX = parseFloat( trigger.dataset[ "tooltipOffsetX" ] ?? _offsetX );
            const offsetY = parseFloat( trigger.dataset[ "tooltipOffsetY" ] ?? _offsetY );
            const rect = trigger.getBoundingClientRect();
            let alignWidth = true;

            switch( options.side ?? "top" )
            {
                case "left":
                    position[ 0 ] += ( rect.x - tooltipDom.offsetWidth - offsetX );
                    alignWidth = false;
                    break;
                case "right":
                    position[ 0 ] += ( rect.x + rect.width + offsetX );
                    alignWidth = false;
                    break;
                case "top":
                    position[ 1 ] += ( rect.y - tooltipDom.offsetHeight - offsetY );
                    alignWidth = true;
                    break;
                case "bottom":
                    position[ 1 ] += ( rect.y + rect.height + offsetY );
                    alignWidth = true;
                    break;
            }

            if( alignWidth ) { position[ 0 ] += ( rect.x + rect.width * 0.5 ) - tooltipDom.offsetWidth * 0.5 + offsetX; }
            else { position[ 1 ] += ( rect.y + rect.height * 0.5 ) - tooltipDom.offsetHeight * 0.5 + offsetY; }

            // Avoid collisions
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - tooltipDom.offsetWidth - 4 );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - tooltipDom.offsetHeight - 4 );

            if( nestedDialog )
            {
                let parentRect = tooltipParent.getBoundingClientRect();
                position[ 0 ] -= parentRect.x;
                position[ 1 ] -= parentRect.y;
            }

            tooltipDom.style.left = `${ position[ 0 ] }px`;
            tooltipDom.style.top = `${ position[ 1 ] }px`;

            if( options.callback )
            {
                options.callback( tooltipDom, trigger );
            }
        } );
    } );

    trigger.addEventListener( "mouseleave", function( e: any ) {
        if( tooltipDom )
        {
            tooltipDom.remove();
        }
    } );
}

LX.asTooltip = asTooltip;

function insertChildAtIndex( parent: HTMLElement, child: HTMLElement, index: number = Infinity )
{
    if ( index >= parent.children.length ) parent.appendChild( child );
    else parent.insertBefore( child, parent.children[index] );
}

LX.insertChildAtIndex = insertChildAtIndex;

// Since we use "box-sizing: border-box" now,
// it's all included in offsetWidth/offsetHeight
function getComputedSize( el: HTMLElement )
{
    return {
        width: el.offsetWidth,
        height: el.offsetHeight
    }
}

LX.getComputedSize = getComputedSize;

function listen( el: any, eventName: string, callback: any, callbackName?: string )
{
    callbackName = callbackName ?? ( "_on" + eventName );
    el[ callbackName ] = callback;
    el.addEventListener( eventName, callback );
}

LX.listen = listen;

function ignore( el: any, eventName: string, callbackName?: string )
{
    callbackName = callbackName ?? ( "_on" + eventName );
    const callback = el[ callbackName ];
    el.removeEventListener( eventName, callback );
}

LX.ignore = ignore;

function getParentArea( el: any )
{
    let parent = el.parentElement;
    while( parent )
    {
        if( parent.classList.contains( "lexarea" ) ) { return parent; }
        parent = parent.parentElement;
    }
}

LX.getParentArea = getParentArea;

function hasClass( el: any, list: string | string[] )
{
    list = ([] as string[]).concat( list );
    var r = list.filter( v => el.classList.contains( v ) );
    return !!r.length;
}

LX.hasClass = hasClass;

function addClass( el: any, className: string )
{
   if( className ) el.classList.add( className );
}

LX.addClass = addClass;

function removeClass( el: any, className: string )
{
   if( className ) el.classList.remove( className );
}

LX.removeClass = removeClass;

function toggleClass( el: any, className: string, force?: boolean )
{
   if( className ) el.classList.toggle( className, force );
}

LX.toggleClass = toggleClass;

function lastChar( str: string )
{
   return str[ str.length - 1 ];
}

LX.lastChar = lastChar;

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
    request( request: any ) {

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
    requestText( url: string, onComplete: (r: Response, rq: XMLHttpRequest) => void, onError: (e: ProgressEvent) => void ) {
        return this.request({ url: url, dataType:"text", success: onComplete, error: onError });
    },

    /**
    * Request file from url
    * @method requestJSON
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestJSON( url: string, onComplete: (r: Response, rq: XMLHttpRequest) => void, onError: (e: ProgressEvent) => void ) {
        return this.request({ url: url, dataType:"json", success: onComplete, error: onError });
    },

    /**
    * Request binary file from url
    * @method requestBinary
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestBinary( url: string, onComplete: (r: Response, rq: XMLHttpRequest) => void, onError: (e: ProgressEvent) => void ) {
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
    requireScript( url: any, onComplete: (r: any[]) => void, 
            onError: (e: ProgressEvent, src: string, n: string) => void, onProgress: (src: string, n: string) => void, version?: string ) {

        if(!url)
            throw("invalid URL");

        if( url.constructor === String )
            url = [url];

        var total = url.length;
        var loaded_scripts: any[] = [];

        for( var i in url )
        {
            var script: any = document.createElement('script');
            script.num = i;
            script.type = 'text/javascript';
            script.src = url[ i ] + ( version ? "?version=" + version : "" );
            script.original_src = url[ i ];
            script.async = false;
            script.onload = function( e: any ) {
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
                script.onerror = function(err: any) {
                    onError(err, this.original_src, this.num );
                }
            document.getElementsByTagName('head')[ 0 ].appendChild(script);
        }
    },

    loadScriptSync( url: string ) {
        return new Promise((resolve, reject) => {
            const script = document.createElement( "script" );
            script.src = url;
            script.async = false;
            script.onload = () => resolve(1);
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild( script );
        });
    },

    downloadURL( url: string, filename: string ) {

        const fr = new FileReader();

        const _download = function( _url: string ) {
            var link = document.createElement('a');
            link.href = _url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if( url.includes('http') )
        {
            LX.request({ url: url, dataType: 'blob', success: ( f: File ) => {
                fr.readAsDataURL( f );
                fr.onload = ( e: any ) => {
                    _download( e.currentTarget.result );
                };
            } });
        }else
        {
            _download(url);
        }

    },

    downloadFile: function( filename: string, data: any, dataType: string )
    {
        if( !data )
        {
            console.warn("No file provided to download");
            return;
        }

        if( !dataType )
        {
            if(data.constructor === String )
                dataType = 'text/plain';
            else
                dataType = 'application/octet-stream';
        }

        var file = null;
        if( data.constructor !== File && data.constructor !== Blob )
            file = new Blob( [ data ], {type : dataType});
        else
            file = data;

        var url = URL.createObjectURL( file );
        var element = document.createElement("a");
        element.setAttribute('href', url);
        element.setAttribute('download', filename );
        element.style.display = 'none';
        document.body.appendChild( element );
        element.click();
        document.body.removeChild( element );
        setTimeout( function(){ URL.revokeObjectURL( url ); }, 1000*60 ); //wait one minute to revoke url
    }
});

/**
 * @method formatBytes
 * @param {Number} bytes
 **/
function formatBytes( bytes: number )
{
    if( bytes === 0 ) return "0 B";
    const k = 1024;
    const sizes = [ "B", "KB", "MB", "GB", "TB" ];
    const i = Math.floor( Math.log( bytes ) / Math.log( k ) );
    const value = bytes / Math.pow( k, i );
    return value.toFixed( 2 ) + " " + sizes[ i ];
}

LX.formatBytes = formatBytes;

/**
 * @method compareThreshold
 **/
function compareThreshold( v: number, p: number, n: number, t: number )
{
    return Math.abs( v - p ) >= t || Math.abs( v - n ) >= t;
}

LX.compareThreshold = compareThreshold;

/**
 * @method compareThresholdRange
 **/
function compareThresholdRange( v0: number, v1: number, t0: number, t1: number )
{
    return v0 >= t0 && v0 <= t1 || v1 >= t0 && v1 <= t1 || v0 <= t0 && v1 >= t1;
}

LX.compareThresholdRange = compareThresholdRange;

/**
 * @method getControlPoints
 **/
function getControlPoints( x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, t: number )
{
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
}

LX.getControlPoints = getControlPoints;

/**
 * @method drawSpline
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} pts
 * @param {Number} t
 **/
function drawSpline( ctx: CanvasRenderingContext2D, pts: any[], t: number )
{
    ctx.save();
    var cp: any[] = [];   // array of control points, as x0,y0,x1,y1,...
    var n = pts.length;

    // Draw an open curve, not connected at the ends
    for( var i = 0; i < (n - 4); i += 2 )
    {
        cp = cp.concat(LX.getControlPoints(pts[ i ],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],t));
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

LX.drawSpline = drawSpline;