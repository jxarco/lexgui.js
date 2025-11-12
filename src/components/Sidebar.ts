// Sidebar.ts @jxarco

import { LX } from './../core/Namespace';
import { Area } from './Area';
import { Panel } from './Panel';
import { TextInput } from './TextInput';

/**
 * @class Sidebar
 */

export class Sidebar {

    /**
     * @param {Object} options
     * className: Extra class to customize root element
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

    root: any;
    callback: any;

    items: any[] = [];
    icons: any = {};
    groups: any = {};

    side: string;
    collapsable: boolean;
    collapsed: boolean;
    filterString: string;
    filter: any; // DOM Element
    header: any;
    content: any;
    footer: any;
    resizeObserver: ResizeObserver|undefined = undefined;
    siblingArea: Area|undefined = undefined;
    currentGroup: any;
    collapseQueue: any;
    collapseContainer: any;

    _collapseWidth: string;

    private _displaySelected: boolean = true;

    get displaySelected(): boolean {
        return this._displaySelected;
    }

    set displaySelected( v: boolean ) {
        this._displaySelected = v;
        if (!v)
        {
            this.root.querySelectorAll(".lexsidebarentry")
                .forEach((e: HTMLElement) => e.classList.remove("selected"));
        }
    }

    constructor( options: any = {} ) {

        const mobile = navigator && /Android|iPhone/i.test( navigator.userAgent );

        this.root = document.createElement( "div" );
        this.root.className = "lexsidebar " + ( options.className ?? "" );
        this.callback = options.callback ?? null;
        this._displaySelected = options.displaySelected ?? false;
        this.side = options.side ?? "left";
        this.collapsable = options.collapsable ?? true;
        this._collapseWidth = ( options.collapseToIcons ?? true ) ? "58px" : "0px";
        this.collapsed = options.collapsed ?? mobile;
        this.filterString = "";

        LX.doAsync( () => {

            this.root.parentElement.ogWidth = this.root.parentElement.style.width;
            this.root.parentElement.style.transition = this.collapsed ? "" : "width 0.25s ease-out";

            this.resizeObserver = new ResizeObserver( entries => {
                for ( const entry of entries )
                {
                    this.siblingArea?.setSize( [ "calc(100% - " + ( entry.contentRect.width ) + "px )", null ] );
                }
            });

            if( this.collapsed )
            {
                this.root.classList.toggle( "collapsed", this.collapsed );
                this.root.parentElement.style.width = this._collapseWidth;

                if( !this.resizeObserver )
                {
                    throw( "Wait until ResizeObserver has been created!" );
                }

                this.resizeObserver.observe( this.root.parentElement );

                LX.doAsync( () => {
                    this.resizeObserver?.unobserve( this.root.parentElement );
                    this.root.querySelectorAll( ".lexsidebarentrycontent" ).forEach( ( e: HTMLElement ) => e.dataset[ "disableTooltip" ] = `${ !this.collapsed }` );
                }, 10 );
            }

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
                const icon = LX.makeIcon( this.side == "left" ? "PanelLeft" : "PanelRight", { title: "Toggle Sidebar", iconClass: "toggler" } );
                this.header.appendChild( icon );

                if( mobile )
                {
                    // create an area and append a sidebar:
                    const area = new Area({ skipAppend: true });
                    const sheetSidebarOptions = LX.deepCopy( options );
                    sheetSidebarOptions.collapsed = false;
                    sheetSidebarOptions.collapsable = false;
                    area.addSidebar( this.callback, sheetSidebarOptions );

                    icon.addEventListener( "click", ( e: MouseEvent ) => {
                        e.preventDefault();
                        e.stopPropagation();
                        new LX.Sheet("256px", [ area ], { side: this.side } );
                    } );
                }
                else
                {
                    icon.addEventListener( "click", ( e: MouseEvent ) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleCollapsed();
                    } );
                }
            }
        }

        // Entry filter
        if( ( options.filter ?? false ) )
        {
            const filterTextInput = new TextInput(null, "", ( value: string, event: InputEvent) => {
                this.filterString = value;
                this.update();
            }, { inputClass: "outline", placeholder: "Search...", icon: "Search", className: "lexsidebarfilter" });
            this.filter = filterTextInput.root;
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

        const resizeObserver = new ResizeObserver( entries => {
            const contentOffset = ( this.header?.offsetHeight ?? 0 ) +
            ( this.filter?.offsetHeight ?? 0 ) +
            ( this.footer?.offsetHeight ?? 0 );
            this.content.style.height = `calc(100% - ${ contentOffset }px)`;
        } );
        resizeObserver.observe( this.root );
    }

    _generateDefaultHeader( options: any = {} ) {

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

        // Add icon if onHeaderPressed is defined and not collapsable (it uses the toggler icon)
        if( options.onHeaderPressed && !this.collapsable )
        {
            const icon = LX.makeIcon( "MenuArrows" );
            header.appendChild( icon );
        }

        return header;
    }

    _generateDefaultFooter( options: any = {} ) {

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

        // Add icon if onFooterPressed is defined
        // Useful to indicate that the footer is clickable
        if( options.onFooterPressed )
        {
            const icon = LX.makeIcon( "MenuArrows" );
            footer.appendChild( icon );
        }

        return footer;
    }

    /**
     * @method toggleCollapsed
     * @param {Boolean} force: Force collapsed state
     */

    toggleCollapsed( force?: boolean ) {

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

        LX.doAsync( () => {
            this.root.classList.toggle( "collapsed", this.collapsed );
            this.resizeObserver?.unobserve( this.root.parentElement );
            this.root.querySelectorAll( ".lexsidebarentrycontent" ).forEach( ( e: HTMLElement ) => e.dataset[ "disableTooltip" ] = `${ !this.collapsed }` );
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

    group( groupName: string, action: any ) {

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

    add( path: string, options: any = {} ) {

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

        const _insertEntry = ( token: string, list: any[] ) => {

            if( token == undefined )
            {
                return;
            }

            let found = null;
            list.forEach( ( o: any ) => {
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
                let item: Record<string, any> = {};
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

    select( name: string ) {

        let pKey = LX.getSupportedDOMName( name );

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

            let key = item.name = Object.keys( item )[ 0 ];

            if( this.filterString.length && !key.toLowerCase().includes( this.filterString.toLowerCase() ) )
            {
                continue;
            }

            let pKey = LX.getSupportedDOMName( key );
            let currentGroup = null;

            let entry = document.createElement( 'div' );
            entry.id = pKey;
            entry.className = "lexsidebarentry " + ( options.className ?? "" );

            if( this.displaySelected && options.selected )
            {
                entry.classList.add( "selected" );
            }

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
                        const groupActionIcon = LX.makeIcon( this.groups[ item.group ].icon, { svgClass: "sm" } )
                        groupEntry.appendChild( groupActionIcon );
                        groupActionIcon.addEventListener( "click", ( e: MouseEvent ) => {
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
            itemDom.className = "lexsidebarentrycontent";
            entry.appendChild( itemDom );
            item.dom = entry;

            if( options.type == "checkbox" )
            {
                item.value = options.value ?? false;
                const panel = new Panel();
                item.checkbox = panel.addCheckbox(null, item.value, ( value: boolean, event: InputEvent ) => {
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
                    const itemIcon = LX.makeIcon( options.icon, { iconClass: "lexsidebarentryicon" } );
                    itemDom.appendChild( itemIcon );
                    LX.asTooltip( itemDom, key, { side: "right", offset: 16, active: false } );
                }

                let itemName = LX.makeElement( 'a', "grid-column-start-2", key, itemDom );

                if( options.swap )
                {
                    itemDom.classList.add( "swap", "inline-grid" );
                    itemDom.querySelector( "a" )?.classList.add( "swap-off" );

                    const input = document.createElement( "input" );
                    input.className = "p-0 border-0";
                    input.type = "checkbox";
                    itemDom.prepend( input );

                    const swapIcon = LX.makeIcon( options.swap, { iconClass: "lexsidebarentryicon swap-on" } );
                    itemDom.appendChild( swapIcon );
                }

                if( options.content )
                {
                    itemDom.appendChild( options.content );
                }
            }

            const isCollapsable = options.collapsable != undefined ? options.collapsable : ( options.collapsable || item[ key ].length );

            entry.addEventListener("click", ( e: any ) => {
                if( e.target && e.target.classList.contains( "lexcheckbox" ) )
                {
                    return;
                }

                let value = undefined;

                if( isCollapsable )
                {
                    ( itemDom.querySelector( ".collapser" ) as any )?.click();
                }
                else if( item.checkbox )
                {
                    item.value = !item.value;
                    item.checkbox.set( item.value, true );
                    value = item.value;
                }
                else if( options.swap && !( e.target instanceof HTMLInputElement ) )
                {
                    const swapInput: any = itemDom.querySelector( "input" );
                    swapInput.checked = !swapInput.checked;
                    value = swapInput.checked;
                }

                const f = options.callback;
                if( f ) f.call( this, key, value ?? entry, e );

                // Manage selected
                if( this.displaySelected && !options.skipSelection )
                {
                    this.root.querySelectorAll(".lexsidebarentry").forEach( ( e: HTMLElement ) => e.classList.remove( 'selected' ) );
                    entry.classList.add( "selected" );
                }
            });

            if( options.action )
            {
                const actionIcon = LX.makeIcon( options.action.icon ?? "Ellipsis", { title: options.action.name } );
                itemDom.appendChild( actionIcon );

                actionIcon.addEventListener( "click", ( e: MouseEvent ) => {
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
                const subkey = subitem.name = Object.keys( subitem )[ 0 ];

                if( this.filterString.length && !subkey.toLowerCase().includes( this.filterString.toLowerCase() ) )
                {
                    continue;
                }

                let subentry = document.createElement( 'div' );
                subentry.innerHTML = `<span>${ subkey }</span>`;

                if( suboptions.action )
                {
                    const actionIcon = LX.makeIcon( suboptions.action.icon ?? "Ellipsis", { title: suboptions.action.name } );
                    subentry.appendChild( actionIcon );

                    actionIcon.addEventListener( "click", ( e: MouseEvent ) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const f = suboptions.action.callback;
                        if( f ) f.call( this, subkey, e );
                    } );
                }

                subentry.className = "lexsidebarentry";
                subentry.id = subkey;

                if( suboptions.content )
                {
                    const parentContainer = LX.makeElement( "div" );
                    parentContainer.appendChild( suboptions.content );
                    subentry.appendChild( parentContainer );
                }

                subentryContainer.appendChild( subentry );

                subentry.addEventListener("click", ( e: MouseEvent ) => {

                    const f = suboptions.callback;
                    if( f ) f.call( this, subkey, subentry, e );

                    // Manage selected
                    if( this.displaySelected && !suboptions.skipSelection )
                    {
                        this.root.querySelectorAll(".lexsidebarentry").forEach( ( e: HTMLElement ) => e.classList.remove( 'selected' ) );
                        subentry.classList.add( "selected" );
                    }
                });
            }
        }
    }
};

LX.Sidebar = Sidebar;