// DropdownMenu.ts @jxarco

import { LX } from './../Namespace';
import { Checkbox } from './Checkbox';

/**
 * @class DropdownMenu
 */

export class DropdownMenu
{
    static currentMenu: DropdownMenu | null = null;

    root: any;
    side: string = "bottom";
    align: string = "center";
    sideOffset: number = 0;
    alignOffset: number = 0;
    avoidCollisions: boolean = true;
    onBlur: any;
    event: any;
    inPlace: boolean = false;

    _trigger: any;
    _items: any[] = [];
    _parent: any;
    _windowPadding: number = 4;
    _onClick: any;
    _radioGroup: { name: string, selected: any } | undefined;


    invalid: boolean = false;

    constructor( trigger: any, items: any[], options: any = {} ) {

        console.assert( trigger, "DropdownMenu needs a DOM element as trigger!" );

        if( DropdownMenu.currentMenu || !items?.length )
        {
            DropdownMenu.currentMenu?.destroy();
            this.invalid = true;
            return;
        }

        this._trigger = trigger;
        trigger.classList.add( "triggered" );
        trigger.ddm = this;

        this._items = items;

        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.sideOffset = options.sideOffset ?? 0;
        this.alignOffset = options.alignOffset ?? 0;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.onBlur = options.onBlur;
        this.event = options.event;

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

            this._onClick = ( e: any ) => {

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

    destroy( blurEvent: boolean = false )
    {
        this._trigger.classList.remove( "triggered" );

        delete this._trigger.ddm;

        document.body.removeEventListener( "mousedown", this._onClick, true );
        document.body.removeEventListener( "focusin", this._onClick, true );

        this._parent.querySelectorAll( ".lexdropdownmenu" ).forEach( ( m: any ) => { m.remove(); } );

        DropdownMenu.currentMenu = null;

        if( blurEvent && this.onBlur )
        {
            this.onBlur();
        }
    }

    _create( items: any[], parentDom?: any ) {

        if( !parentDom )
        {
            parentDom = this.root;
        }
        else
        {
            const parentRect = parentDom.getBoundingClientRect();

            let newParent: any = document.createElement( "div" );
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

        let applyIconPadding = items.filter( ( i: any ) => { return ( i?.icon != undefined ) || ( i?.checked != undefined ) } ).length > 0;

        for( let item of items )
        {
            this._createItem( item, parentDom, applyIconPadding );
        }
    }

    _createItem( item: any, parentDom: any, applyIconPadding?: boolean )
    {
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

        const menuItem: any = document.createElement('div');
        menuItem.className = "lexdropdownmenuitem" + ( ( item.name || item.options ) ? "" : " label" ) + ( item.disabled ?? false ? " disabled" : "" ) + ( ` ${ item.className ?? "" }` );
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
            const icon = LX.makeIcon( item.icon, { svgClass: disabled ? "fg-tertiary" : item.svgClass ?? item.className } );
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
            const checkbox = new Checkbox( pKey + "_entryChecked", item.checked, ( v: boolean ) => {
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

            menuItem.addEventListener( "click", ( e: any ) => {
                if( e.target.type == "checkbox" ) return;
                input.checked = !input.checked;
                checkbox.set( input.checked );
            } );
        }
        else
        {
            menuItem.addEventListener( "click", ( e: MouseEvent ) => {
                const radioName = menuItem.getAttribute( "data-radioname" );
                if( radioName )
                {
                    this._trigger[ radioName ] = key;
                }

                const f = item.callback;
                if( f )
                {
                    f.call( this, key, menuItem, radioName );
                }

                // If has options, it's a radio group label, so don't close the menu
                if( !item.options && ( item.closeOnClick ?? true ) )
                {
                    this.destroy( true );
                }
            } );
        }

        menuItem.addEventListener("mouseover", ( e: MouseEvent ) => {

            let path = menuItem.dataset["id"];
            if( !path ) return;
            let p = parentDom;

            while( p )
            {
                path += "/" + p.dataset["id"];
                p = p.currentParent?.parentElement;
            }

            this._parent.querySelectorAll( ".lexdropdownmenu" ).forEach( ( m: any ) => {
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

    _adjustPosition()
    {
        const position = [ 0, 0 ];
        const rect = this._trigger.getBoundingClientRect();

        // Place menu using trigger position and user options
        if( !this.event )
        {
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
        // Offset position based on event
        else
        {
            position[ 0 ] = this.event.x;
            position[ 1 ] = this.event.y;
        }

        if( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[ 0 ] -= parentRect.x;
            position[ 1 ] -= parentRect.y;
        }

        if( this.avoidCollisions )
        {
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
        this.inPlace = true;
    }

    _addSeparator( parent: HTMLElement | null = null )
    {
        const separator = document.createElement('div');
        separator.className = "separator";
        parent = parent ?? this.root;
        parent?.appendChild( separator );
    }
};

LX.DropdownMenu = DropdownMenu;

export function addDropdownMenu( trigger: any, items: any[], options: any = {} ): DropdownMenu | null
{
    const menu = new DropdownMenu( trigger, items, options );
    if( !menu.invalid )
    {
        return menu;
    }
    return null;
}

LX.addDropdownMenu = addDropdownMenu;