// Core.ts @jxarco

import { BaseComponent, ComponentType } from '../components/BaseComponent';
import { ContextMenu } from '../components/ContextMenu';
import { TextInput } from '../components/TextInput';
import { Area } from './Area';
import { IEvent } from './Event';
import { LX } from './Namespace';
import { Panel } from './Panel';

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

LX.init = async function( options: any = {} )
{
    if ( this.ready )
    {
        return this.mainArea;
    }

    await LX.loadScriptSync( 'https://unpkg.com/lucide@latest' );

    // LexGUI root
    console.log( `LexGUI v${this.version}` );

    var root = document.createElement( 'div' );
    root.id = 'lexroot';
    root.className = 'lexcontainer';
    root.tabIndex = -1;

    if ( options.rootClass )
    {
        root.className += ` ${options.rootClass}`;
    }

    this.modal = document.createElement( 'div' );
    this.modal.id = 'modal';
    this.modal.classList.add( 'hidden-opacity' );
    this.modal.toggle = function( force: boolean )
    {
        this.classList.toggle( 'hidden-opacity', force );
    };

    this.root = root;
    this.container = document.body;

    if ( options.container )
    {
        this.container = options.container.constructor === String
            ? document.getElementById( options.container )
            : options.container;
    }

    this.layoutMode = options.layoutMode ?? 'app';
    document.documentElement.setAttribute( 'data-layout', this.layoutMode );

    if ( this.layoutMode == 'document' )
    {
        // document.addEventListener( "scroll", e => {
        //     // Get all active menuboxes
        //     const mbs = document.body.querySelectorAll( ".lexdropdownmenu" );
        //     mbs.forEach( ( mb: any ) => {
        //         mb._updatePosition();
        //     } );
        // } );
    }

    this.spacingMode = options.spacingMode ?? 'default';
    document.documentElement.setAttribute( 'data-spacing', this.spacingMode );

    this.container.appendChild( this.modal );

    if ( !options.skipRoot )
    {
        this.container.appendChild( root );
    }
    else
    {
        this.root = document.body;
    }

    // Notifications
    {
        const notifSection = document.createElement( 'section' );
        notifSection.className = 'notifications';
        this.notifications = document.createElement( 'ol' );
        this.notifications.className = '';
        this.notifications.iWidth = 0;
        notifSection.appendChild( this.notifications );
        document.body.appendChild( notifSection );

        this.notifications.addEventListener( 'mouseenter', () => {
            this.notifications.classList.add( 'list' );
        } );

        this.notifications.addEventListener( 'mouseleave', () => {
            this.notifications.classList.remove( 'list' );
        } );
    }

    // Disable drag icon
    root.addEventListener( 'dragover', function( e )
    {
        e.preventDefault();
    }, false );

    document.addEventListener( 'contextmenu', function( e )
    {
        e.preventDefault();
    }, false );

    // Global vars
    this.DEFAULT_NAME_WIDTH = '30%';
    this.DEFAULT_SPLITBAR_SIZE = 4;
    this.OPEN_CONTEXTMENU_ENTRY = 'click';

    this.componentResizeObserver = new ResizeObserver( entries => {
        for ( const entry of entries )
        {
            const c = ( entry.target as any )?.jsInstance;
            if ( c && c.onResize )
            {
                c.onResize( entry.contentRect );
            }
        }
    } );

    this.ready = true;
    this.menubars = [];
    this.sidebars = [];
    this.commandbar = this._createCommandbar( this.container );

    if ( !options.skipRoot && !options.skipDefaultArea )
    {
        this.mainArea = new Area( { id: options.id ?? 'mainarea' } );
    }

    // Initial or automatic changes don't force color scheme
    // to be stored in localStorage

    this._onChangeSystemTheme = function( event: any )
    {
        const storedcolorScheme = localStorage.getItem( 'lxColorScheme' );
        if ( storedcolorScheme ) return;
        LX.setTheme( event.matches ? 'dark' : 'light', false );
    };

    this._mqlPrefersDarkScheme = window.matchMedia ? window.matchMedia( '(prefers-color-scheme: dark)' ) : null;

    const storedcolorScheme = localStorage.getItem( 'lxColorScheme' );
    if ( storedcolorScheme )
    {
        LX.setTheme( storedcolorScheme );
    }
    else if ( this._mqlPrefersDarkScheme && ( options.autoTheme ?? true ) )
    {
        if ( window.matchMedia( '(prefers-color-scheme: light)' ).matches )
        {
            LX.setTheme( 'light', false );
        }

        this._mqlPrefersDarkScheme.addEventListener( 'change', this._onChangeSystemTheme );
    }

    return this.mainArea;
}, /**
 * @method setSpacingMode
 * @param {String} mode: "default" | "compact"
 */ LX.setSpacingMode = function( mode: string )
{
    this.spacingMode = mode;
    document.documentElement.setAttribute( 'data-spacing', this.spacingMode );
}, /**
 * @method setLayoutMode
 * @param {String} mode: "app" | "document"
 */ LX.setLayoutMode = function( mode: string )
{
    this.layoutMode = mode;
    document.documentElement.setAttribute( 'data-layout', this.layoutMode );
}, /**
 * @method addSignal
 * @param {String} name
 * @param {Object} obj
 * @param {Function} callback
 */ LX.addSignal = function( name: string, obj: any, callback: ( value: any ) => void )
{
    obj[name] = callback;

    if ( !LX.signals[name] )
    {
        LX.signals[name] = [];
    }

    if ( LX.signals[name].indexOf( obj ) > -1 )
    {
        return;
    }

    LX.signals[name].push( obj );
}, /**
 * @method emitSignal
 * @param {String} name
 * @param {*} value
 * @param {Object} options
 */ LX.emitSignal = function( name: string, value: any, options: Record<string, any> = {} )
{
    const data = LX.signals[name];

    if ( !data )
    {
        return;
    }

    const target = options.target;

    if ( target )
    {
        if ( target[name] )
        {
            target[name].call( target, value );
        }

        return;
    }

    for ( let obj of data )
    {
        if ( obj instanceof BaseComponent )
        {
            obj.set( value, options.skipCallback ?? true );
        }
        else if ( obj.constructor === Function )
        {
            const fn = obj;
            fn( null, value );
        }
        else
        {
            // This is an element
            const fn = obj[name];
            console.assert( fn, `No callback registered with _${name}_ signal` );
            fn.bind( obj )( value );
        }
    }
};

// Command bar creation

LX._createCommandbar = function( root: any )
{
    let commandbar: any = document.createElement( 'dialog' );
    commandbar.className = 'commandbar';
    commandbar.tabIndex = -1;
    root.appendChild( commandbar );

    let allItems: string[] = [];
    let hoverElId: number | null = null;

    commandbar.addEventListener( 'keydown', function( e: KeyboardEvent )
    {
        e.stopPropagation();
        e.stopImmediatePropagation();
        hoverElId = hoverElId ?? -1;
        if ( e.key == 'Escape' )
        {
            commandbar.close();
            _resetBar( true );
        }
        else if ( e.key == 'Enter' )
        {
            const el = allItems[hoverElId] as any;
            if ( el )
            {
                if ( el.item.checked != undefined )
                {
                    el.item.checked = !el.item.checked;
                }

                commandbar.close();

                el.callback.call( window, el.item.name, el.item.checked );
            }
        }
        else if ( e.key == 'ArrowDown' && hoverElId < ( allItems.length - 1 ) )
        {
            hoverElId++;
            commandbar.querySelectorAll( '.hovered' ).forEach( ( e: HTMLElement ) => e.classList.remove( 'hovered' ) );
            const el = allItems[hoverElId] as any;
            el.classList.add( 'hovered' );

            let dt = el.offsetHeight * ( hoverElId + 1 ) - itemContainer.offsetHeight;
            if ( dt > 0 )
            {
                itemContainer.scrollTo( {
                    top: dt,
                    behavior: 'smooth'
                } );
            }
        }
        else if ( e.key == 'ArrowUp' && hoverElId > 0 )
        {
            hoverElId--;
            commandbar.querySelectorAll( '.hovered' ).forEach( ( e: HTMLElement ) => e.classList.remove( 'hovered' ) );
            const el = allItems[hoverElId] as any;
            el.classList.add( 'hovered' );
        }
    } );

    commandbar.addEventListener( 'focusout', function( e: FocusEvent )
    {
        if ( e.relatedTarget == e.currentTarget )
        {
            return;
        }
        e.stopPropagation();
        e.stopImmediatePropagation();
        commandbar.close();
        _resetBar( true );
    } );

    root.addEventListener( 'keydown', ( e: KeyboardEvent ) => {
        if ( e.key == ' ' && e.ctrlKey )
        {
            e.stopImmediatePropagation();
            e.stopPropagation();
            LX.setCommandbarState( true );
        }
        else
        {
            for ( let c of LX.extensions )
            {
                if ( !LX[c] || !LX[c].prototype.onKeyPressed )
                {
                    continue;
                }

                const instances = LX.CodeEditor.getInstances();
                for ( let i of instances )
                {
                    i.onKeyPressed( e );
                }
            }
        }
    } );

    const header = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row' );

    const filter = new TextInput( null, '', ( v: string ) => {
        commandbar._addElements( v.toLowerCase() );
    }, { width: '100%', icon: 'Search', trigger: 'input', placeholder: 'Search...' } );
    header.appendChild( filter.root );

    const tabArea = new Area( {
        width: '100%',
        skipAppend: true,
        className: 'cb-tabs'
    } );

    const cbTabs = tabArea.addTabs( { parentClass: 'p-2' } );
    let cbFilter = null;

    // These tabs will serve as buttons by now
    // Filter stuff depending of the type of search
    {
        const _onSelectTab = ( e: any, tabName: string ) => {
            cbFilter = tabName;
        };

        cbTabs.add( 'All', document.createElement( 'div' ), { selected: true, onSelect: _onSelectTab } );
        // cbTabs.add( "Main", document.createElement('div'), { onSelect: _onSelectTab } );
    }

    const itemContainer = document.createElement( 'div' );
    itemContainer.className = 'searchitembox';

    let refPrevious: any = null;

    const _resetBar = ( resetInput?: boolean ) => {
        itemContainer.innerHTML = '';
        allItems.length = 0;
        hoverElId = null;
        if ( resetInput )
        {
            filter.set( '', true );
        }
    };

    const _addElement = ( t: any, c: any, p: any, i: any ) => {
        if ( !t.length )
        {
            return;
        }

        if ( refPrevious ) refPrevious.classList.remove( 'last' );

        let searchItem: any = document.createElement( 'div' );
        searchItem.className = 'searchitem last';
        if ( i?.checked !== undefined )
        {
            const iconHtml = i.checked ? LX.makeIcon( 'Check' ).innerHTML : '';
            searchItem.innerHTML = iconHtml + ( p + t );
        }
        else
        {
            searchItem.innerHTML = p + t;
        }
        searchItem.callback = c;
        searchItem.item = i;

        searchItem.addEventListener( 'click', ( e: MouseEvent ) => {
            if ( i.checked != undefined )
            {
                i.checked = !i.checked;
            }

            c.call( window, t, i.checked );
            LX.setCommandbarState( false );
            _resetBar( true );
        } );

        searchItem.addEventListener( 'mouseenter', function( e: MouseEvent )
        {
            commandbar.querySelectorAll( '.hovered' ).forEach( ( e: HTMLElement ) => e.classList.remove( 'hovered' ) );
            searchItem.classList.add( 'hovered' );
            hoverElId = allItems.indexOf( searchItem );
        } );

        searchItem.addEventListener( 'mouseleave', function( e: MouseEvent )
        {
            searchItem.classList.remove( 'hovered' );
        } );

        allItems.push( searchItem );
        itemContainer.appendChild( searchItem );
        refPrevious = searchItem;
    };

    const _propagateAdd = ( item: any, filter: string, path: string, skipPropagation?: boolean ) => {
        if ( !item || ( item.constructor != Object ) )
        {
            return;
        }

        let name = item.name;
        if ( name.toLowerCase().includes( filter ) )
        {
            if ( item.callback )
            {
                _addElement( name, item.callback, path, item );
            }
        }

        const submenu = item.submenu ?? item[name];
        if ( skipPropagation || !submenu )
        {
            return;
        }

        const icon = LX.makeIcon( 'ChevronRight', { svgClass: 'sm fg-secondary separator' } );
        path += name + icon.innerHTML;

        for ( let c of submenu )
        {
            _propagateAdd( c, filter, path );
        }
    };

    commandbar._addElements = ( filter: string ) => {
        _resetBar();

        for ( let m of LX.menubars )
        {
            for ( let i of m.items )
            {
                _propagateAdd( i, filter, '' );
            }
        }

        for ( let m of LX.sidebars )
        {
            for ( let i of m.items )
            {
                _propagateAdd( i, filter, '' );
            }
        }

        for ( let entry of LX.extraCommandbarEntries )
        {
            const name = entry.name;
            if ( !name.toLowerCase().includes( filter ) )
            {
                continue;
            }
            _addElement( name, entry.callback, '', {} );
        }

        if ( LX.has( 'CodeEditor' ) )
        {
            const instances = LX.CodeEditor.getInstances();
            if ( !instances.length || !instances[0].area.root.offsetHeight ) return;

            const languages = LX.CodeEditor.languages;

            for ( let l of Object.keys( languages ) )
            {
                const key = 'Language: ' + l;
                const icon = instances[0]._getFileIcon( null, languages[l].ext );
                const classes = icon.split( ' ' );

                let value = LX.makeIcon( classes[0], { svgClass: `${classes.slice( 0 ).join( ' ' )}` } ).innerHTML;
                value += key + " <span class='lang-ext'>(" + languages[l].ext + ')</span>';

                if ( key.toLowerCase().includes( filter ) )
                {
                    _addElement( value, () => {
                        for ( let i of instances )
                        {
                            i._changeLanguage( l );
                        }
                    }, '', {} );
                }
            }
        }
    };

    commandbar.appendChild( header );
    commandbar.appendChild( tabArea.root );
    commandbar.appendChild( itemContainer );

    return commandbar;
};

/**
 * @method setCommandbarState
 * @param {Boolean} value
 * @param {Boolean} resetEntries
 */

LX.setCommandbarState = function( value: boolean, resetEntries: boolean = true )
{
    const cb = this.commandbar;

    if ( value )
    {
        cb.show();
        cb.querySelector( 'input' ).focus();

        if ( resetEntries )
        {
            cb._addElements( undefined );
        }
    }
    else
    {
        cb.close();
    }
};

LX.REGISTER_COMPONENT = function( customComponentName: string, options: any = {} )
{
    let customIdx = LX.guidGenerator();

    const PanelPrototype: any = Panel.prototype;
    PanelPrototype['add' + customComponentName] = function( name: string, instance: any, callback: any )
    {
        const userParams = Array.from( arguments ).slice( 3 );

        let component = new BaseComponent( ComponentType.CUSTOM, name, null, options );
        this._attachComponent( component );

        component.customName = customComponentName;
        component.customIdx = customIdx;

        component.onGetValue = () => {
            return instance;
        };

        component.onSetValue = ( newValue, skipCallback, event ) => {
            instance = newValue;
            _refreshComponent();
            element.querySelector( '.lexcustomitems' ).toggleAttribute( 'hidden', false );
            if ( !skipCallback )
            {
                component._trigger( new IEvent( name, instance, event ), callback );
            }
        };

        component.onResize = () => {
            const realNameWidth = component.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const element = component.root;

        let container: any, customComponentsDom: any;
        let defaultInstance = options.default ?? {};

        // Add instance button

        const _refreshComponent = () => {
            if ( container ) container.remove();
            if ( customComponentsDom ) customComponentsDom.remove();

            container = document.createElement( 'div' );
            container.className = 'lexcustomcontainer w-full';
            element.appendChild( container );
            element.dataset['opened'] = false;

            const customIcon = LX.makeIcon( options.icon ?? 'Box' );
            const menuIcon = LX.makeIcon( 'Menu' );

            let buttonName = customComponentName + ( !instance ? ' [empty]' : '' );
            let buttonEl = this.addButton( null, buttonName, ( value: any, event: MouseEvent ) => {
                if ( instance )
                {
                    element.querySelector( '.lexcustomitems' ).toggleAttribute( 'hidden' );
                    element.dataset['opened'] = !element.querySelector( '.lexcustomitems' ).hasAttribute( 'hidden' );
                }
                else
                {
                    LX.addContextMenu( null, event, ( c: ContextMenu ) => {
                        c.add( 'New ' + customComponentName, () => {
                            instance = {};
                            _refreshComponent();
                            element.querySelector( '.lexcustomitems' ).toggleAttribute( 'hidden', false );
                            element.dataset['opened'] = !element.querySelector( '.lexcustomitems' ).hasAttribute(
                                'hidden'
                            );
                        } );
                    } );
                }
            }, { buttonClass: 'custom' } );

            const buttonSpan = buttonEl.root.querySelector( 'span' );
            buttonSpan.prepend( customIcon );
            buttonSpan.appendChild( menuIcon );
            container.appendChild( buttonEl.root );

            if ( instance )
            {
                menuIcon.addEventListener( 'click', ( e: MouseEvent ) => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    LX.addContextMenu( null, e, ( c: ContextMenu ) => {
                        c.add( 'Clear', () => {
                            instance = null;
                            _refreshComponent();
                        } );
                    } );
                } );
            }

            // Show elements

            customComponentsDom = document.createElement( 'div' );
            customComponentsDom.className = 'lexcustomitems';
            customComponentsDom.toggleAttribute( 'hidden', true );
            element.appendChild( customComponentsDom );

            if ( instance )
            {
                this.queue( customComponentsDom );

                const on_instance_changed = ( key: string, value: any, event: any ) => {
                    const setter = options[`_set_${key}`];
                    if ( setter )
                    {
                        setter.call( instance, value );
                    }
                    else
                    {
                        instance[key] = value;
                    }
                    component._trigger( new IEvent( name, instance, event ), callback );
                };

                for ( let key in defaultInstance )
                {
                    let value = null;

                    const getter = options[`_get_${key}`];
                    if ( getter )
                    {
                        value = instance[key] ? getter.call( instance ) : getter.call( defaultInstance );
                    }
                    else
                    {
                        value = instance[key] ?? defaultInstance[key];
                    }

                    if ( !value )
                    {
                        continue;
                    }

                    switch ( value.constructor )
                    {
                        case String:
                            if ( value[0] === '#' )
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
                            if ( value.length > 4 )
                            {
                                this.addArray( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this._addVector( value.length, key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        default:
                            console.warn( `Unsupported property type: ${value.constructor.name}` );
                            break;
                    }
                }

                if ( options.onCreate )
                {
                    options.onCreate.call( this, this, ...userParams );
                }

                this.clearQueue();
            }
        };

        _refreshComponent();
    };
};
