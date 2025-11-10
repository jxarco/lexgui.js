// Lexgui.js @jxarco

/**
 * Main namespace
 * @namespace LX
*/

const LX: {
    version: string;
    ready: boolean;
    extensions: string[];           // Store extensions used
    extraCommandbarEntries: any[];  // User specific entries for command bar
    signals: Record<string, any>;   // Events and triggers
    activeDraggable: any;           // Watch for the current active draggable
    MOUSE_LEFT_CLICK: number;
    MOUSE_MIDDLE_CLICK: number;
    MOUSE_RIGHT_CLICK: number;
    MOUSE_DOUBLE_CLICK: number;
    MOUSE_TRIPLE_CLICK: number;
    CURVE_MOVEOUT_CLAMP: number;
    CURVE_MOVEOUT_DELETE: number;
    DRAGGABLE_Z_INDEX: number;
} = {
    version: "0.8.0",
    ready: false,
    extensions: [],
    extraCommandbarEntries: [],
    signals: {},
    activeDraggable: null,

    MOUSE_LEFT_CLICK: 0,
    MOUSE_MIDDLE_CLICK: 1,
    MOUSE_RIGHT_CLICK: 2,
    
    MOUSE_DOUBLE_CLICK: 2,
    MOUSE_TRIPLE_CLICK:3,
    
    CURVE_MOVEOUT_CLAMP: 0,
    CURVE_MOVEOUT_DELETE: 1,
    
    DRAGGABLE_Z_INDEX: 101
};

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

            const languages = LX.CodeEditor.languages;

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

    // Initial or automatic changes don't force color scheme
    // to be stored in localStorage

    this._onChangeSystemTheme = function( event ) {
        const storedcolorScheme = localStorage.getItem( "lxColorScheme" );
        if( storedcolorScheme ) return;
        LX.setTheme( event.matches ? "dark" : "light", false );
    }

    this._mqlPrefersDarkScheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    const storedcolorScheme = localStorage.getItem( "lxColorScheme" );
    if( storedcolorScheme )
    {
        LX.setTheme( storedcolorScheme );
    }
    else if( this._mqlPrefersDarkScheme && ( options.autoTheme ?? true ) )
    {
        if( window.matchMedia( "(prefers-color-scheme: light)" ).matches )
        {
            LX.setTheme( "light", false );
        }

        this._mqlPrefersDarkScheme.addEventListener( "change", this._onChangeSystemTheme );
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