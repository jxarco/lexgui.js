// Popover.js @jxarco
import { LX } from './core.js';

/**
 * @class Popover
 */

class Popover {

    static activeElement = false;

    constructor( trigger, content, options = {} ) {

        if( Popover.activeElement )
        {
            Popover.activeElement.destroy();
            return;
        }

        this._trigger = trigger;

        if( trigger )
        {
            trigger.classList.add( "triggered" );
            trigger.active = this;
        }

        this._windowPadding = 4;
        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.sideOffset = options.sideOffset ?? 0;
        this.alignOffset = options.alignOffset ?? 0;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.reference = options.reference;

        this.root = document.createElement( "div" );
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexpopover";

        const refElement = trigger ?? this.reference;
        const nestedDialog = refElement.closest( "dialog" );
        if( nestedDialog && nestedDialog.dataset[ "modal" ] == 'true' )
        {
            this._parent = nestedDialog;
        }
        else
        {
            this._parent = LX.root;
        }

        this._parent.appendChild( this.root );

        this.root.addEventListener( "keydown", (e) => {
            if( e.key == "Escape" )
            {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        } )

        if( content )
        {
            content = [].concat( content );
            content.forEach( e => {
                const domNode = e.root ?? e;
                this.root.appendChild( domNode );
                if( e.onPopover )
                {
                    e.onPopover();
                }
            } );
        }

        Popover.activeElement = this;

        LX.doAsync( () => {
            this._adjustPosition();

            if( this._trigger )
            {
                this.root.focus();

                this._onClick = e => {
                    if( e.target && ( this.root.contains( e.target ) || e.target == this._trigger ) )
                    {
                        return;
                    }
                    this.destroy();
                };

                document.body.addEventListener( "mousedown", this._onClick, true );
                document.body.addEventListener( "focusin", this._onClick, true );
            }

        }, 10 );
    }

    destroy() {

        if( this._trigger )
        {
            this._trigger.classList.remove( "triggered" );
            delete this._trigger.active;

            document.body.removeEventListener( "mousedown", this._onClick, true );
            document.body.removeEventListener( "focusin", this._onClick, true );
        }

        this.root.remove();

        Popover.activeElement = null;
    }

    _adjustPosition() {

        const position = [ 0, 0 ];

        // Place menu using trigger position and user options
        {
            const el = this.reference ?? this._trigger;
            console.assert( el, "Popover needs a trigger or reference element!" );
            const rect = el.getBoundingClientRect();

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

        if( this.avoidCollisions )
        {
            position[ 0 ] = LX.clamp( position[ 0 ], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[ 1 ] = LX.clamp( position[ 1 ], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        if( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[ 0 ] -= parentRect.x;
            position[ 1 ] -= parentRect.y;
        }

        this.root.style.left = `${ position[ 0 ] }px`;
        this.root.style.top = `${ position[ 1 ] }px`;
    }
};

LX.Popover = Popover;

export { Popover };