// ContextMenu.ts @jxarco

import { LX } from './../Namespace';

/**
 * @class ContextMenu
 */

export class ContextMenu {

    root: any;
    items: any[];
    colors: any;

    _parent: any;

    constructor( event: any, title: string, options: any = {} )
    {
        // Remove all context menus
        document.body.querySelectorAll( ".lexcontextmenu" ).forEach( e => e.remove() );

        this.root = document.createElement( "div" );
        this.root.className = "lexcontextmenu";
        this.root.addEventListener("mouseleave", function(this: HTMLElement) { // TOCHECK
            this.remove();
        });

        this.items = [];
        this.colors = {};

        if( title )
        {
            let item: Record<string, any> = {};
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

    _adjustPosition( div: HTMLElement, margin: number, useAbsolute = false )
    {
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
                div.style.marginTop = "";
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

    _createSubmenu( o: any, k: string, c: any, d: number )
    {
        this.root.querySelectorAll( ".lexcontextmenu" ).forEach( ( m: HTMLElement ) => m.remove() );

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

    _createEntry( o: any, k: string, c: any, d: number )
    {
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
            {
                this._createSubmenu( o, k, entry, ++d );
            }
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
                if( entry.dataset["built"] == "true" ) return;
                entry.dataset["built"] = "true";
                this._createSubmenu( o, k, entry, ++d );
                e.stopPropagation();
            });
        }

        entry.addEventListener("mouseleave", () => {
            d = -1; // Reset depth
            c.querySelectorAll(".lexcontextmenu").forEach( ( m: HTMLElement ) => m.remove() );
        });
    }

    onCreate()
    {
        LX.doAsync( () => this._adjustPosition( this.root, 6 ) );
    }

    add( path: string, options: any = {} )
    {
        if( options.constructor == Function )
            options = { callback: options };

        // process path
        path = path + ""; // make string!
        const tokens = path.split("/");

        // assign color to last token in path
        const lastPath = tokens[tokens.length - 1];
        this.colors[ lastPath ] = options.color;

        let idx = 0;

        const insert = ( token: string|undefined, list: any ) => {
            if( token == undefined ) return;

            let found = null;
            list.forEach( ( o: any ) => {
                const keys = Object.keys( o );
                const key = keys.find( t => t == token );
                if(key) found = o[ key ];
            } );

            if( found )
            {
                insert( tokens[ idx++ ], found );
            }
            else
            {
                let item: Record<string, any> = {};
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

        const setParent = ( _item: any ) => {

            let key = Object.keys( _item )[ 0 ];
            let children = _item[ key ];

            if( !children.length )
            {
                return;
            }

            if( children.find( ( c: any ) => Object.keys(c)[ 0 ] == key ) == null )
            {
                let parent: Record<string, any> = {};
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

    setColor( token: string, color: any )
    {
        if( color[ 0 ] !== '#' )
        {
            color = LX.rgbToHex( color );
        }

        this.colors[ token ] = color;
    }
};

LX.ContextMenu = ContextMenu;

function addContextMenu( title: string, event: any, callback: any, options: any = {} )
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