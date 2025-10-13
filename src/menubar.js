// menubar.js @jxarco
import { LX } from './core.js';

/**
 * @class Menubar
 */

class Menubar {

    constructor( items, options = {} )
    {
        this.root = document.createElement( "div" );
        this.root.className = "lexmenubar";

        if( options.float )
        {
            this.root.style.justifyContent = options.float;
        }

        this.buttons = [ ];
        this.icons = { };
        this.shorts = { };
        this.items = items ?? [];

        this.createEntries();
    }

    _resetMenubar( focus )
    {
        this.root.querySelectorAll(".lexmenuentry").forEach( e => {
            e.classList.remove( 'selected' );
            delete e.dataset[ "built" ];
        } );

        if( this._currentDropdown )
        {
            this._currentDropdown.destroy();
            this._currentDropdown = null;
        }

        // Next time we need to click again
        this.focused = focus ?? false;
    }

    /**
     * @method createEntries
     */

    createEntries()
    {
        for( let item of this.items )
        {
            let key = item.name;
            let pKey = LX.getSupportedDOMName( key );

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

            this.root.appendChild( entry );

            const _showEntry = () => {
                this._resetMenubar(true);
                entry.classList.add( "selected" );
                entry.dataset["built"] = "true";
                this._currentDropdown = LX.addDropdownMenu( entry, item.submenu ?? [], { side: "bottom", align: "start", onBlur: () => {
                    this._resetMenubar();
                } });
            };

            entry.addEventListener("mousedown", (e) => {
                e.preventDefault();
            });

            entry.addEventListener("mouseup", (e) => {

                e.preventDefault();

                const f = item[ 'callback' ];
                if( f )
                {
                    f.call( this, key, entry, e );
                    return;
                }

                _showEntry();

                this.focused = true;

                return false;
            });

            entry.addEventListener( "mouseover", (e) => {

                if( this.focused && !( entry.dataset[ "built" ] ?? false ) )
                {
                    _showEntry();
                }
            });
        }
    }

    /**
     * @method getButton
     * @param {String} name
     */

    getButton( name )
    {
        return this.buttons[ name ];
    }

    /**
     * @method getSubitems
     * @param {Object} item: parent item
     * @param {Array} tokens: split path strings
    */
    getSubitem( item, tokens )
    {
        for( const s of item )
        {
            if ( s?.name != tokens[ 0 ] )
            {
                continue;
            }

            if( tokens.length == 1 )
            {
                return s;
            }
            else if ( s.submenu )
            {
                tokens.shift();
                return this.getSubitem( s.submenu, tokens );
            }
        }
    }

    /**
     * @method getItem
     * @param {String} path
    */
    getItem( path )
    {
        // Process path
        const tokens = path.split( '/' );
        return this.getSubitem( this.items, tokens );
    }

    /**
     * @method setButtonIcon
     * @param {String} name
     * @param {String} icon
     * @param {Function} callback
     * @param {Object} options
     */

    setButtonIcon( name, icon, callback, options = {} )
    {
        if( !name )
        {
            throw( "Set Button Name!" );
        }

        let button = this.buttons[ name ];
        // If the button already exists, delete it
        // since only one button of this type can exist
        if( button )
        {
            delete this.buttons[ name ];
            LX.deleteElement( button.root );
        }

        // Otherwise, create it
        button = new LX.Button( name, null, callback, {
            title: name,
            buttonClass: "lexmenubutton main bg-none",
            disabled: options.disabled,
            icon,
            svgClass: "xl",
            hideName: true,
            swap: options.swap
        } );

        if( options.float == "right" )
        {
            button.root.right = true;
        }

        if( this.root.lastChild && this.root.lastChild.right )
        {
            this.root.lastChild.before( button.root );
        }
        else if( options.float == "left" )
        {
            this.root.prepend( button.root );
        }
        else
        {
            this.root.appendChild( button.root );
        }

        this.buttons[ name ] = button;
    }

    /**
     * @method setButtonImage
     * @param {String} name
     * @param {String} src
     * @param {Function} callback
     * @param {Object} options
     */

    setButtonImage( name, src, callback, options = {} )
    {
        if( !name )
        {
            throw( "Set Button Name!" );
        }

        let button = this.buttons[ name ];
        if( button )
        {
            button.querySelector( 'img' ).src = src;
            return;
        }

        // Otherwise, create it
        button = document.createElement( 'div' );
        const disabled = options.disabled ?? false;
        button.className = "lexmenubutton main" + ( disabled ? " disabled" : "" );
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

        _b.addEventListener( "mousedown", e => {
            e.preventDefault();
        });

        _b.addEventListener( "mouseup", e => {
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

    addButtons( buttons, options = {} )
    {
        if( !buttons )
        {
            throw( "No buttons to add!" );
        }

        if( !this.buttonContainer )
        {
            this.buttonContainer = document.createElement( "div" );
            this.buttonContainer.className = "lexmenubuttons";
            this.buttonContainer.classList.add( options.float ?? "center" );

            if( options.float == "right" )
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

        for( const data of buttons )
        {
            const title = data.title;
            const button = new LX.Button( title, data.label, data.callback, {
                title,
                buttonClass: "bg-none",
                disabled: data.disabled,
                icon: data.icon,
                hideName: true,
                swap: data.swap,
                iconPosition: "start"
            } );
            this.buttonContainer.appendChild( button.root );

            if( title )
            {
                this.buttons[ title ] = button;
            }
        }
    }
};

LX.Menubar = Menubar;

export { Menubar };