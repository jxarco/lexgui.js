// Sheet.js @jxarco
import { LX } from './core.js';

/**
 * @class Sheet
 */

class Sheet {

    constructor( size, content, options = {} ) {

        this.side = options.side ?? "left";

        this.root = document.createElement( "div" );
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.role = "dialog";
        this.root.className = "lexsheet fixed z-1000 bg-primary";
        document.body.appendChild( this.root );

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
                if( e.onSheet )
                {
                    e.onSheet();
                }
            } );
        }

        LX.doAsync( () => {

            LX.modal.toggle( false );

            switch( this.side )
            {
                case "left":
                    this.root.style.left = 0;
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "right":
                    this.root.style.right = 0;
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "top":
                    this.root.style.left = 0;
                    this.root.style.top = 0;
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
                case "bottom":
                    this.root.style.left = 0;
                    this.root.style.bottom = 0;
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
                default:
                    break;
            }

            document.documentElement.setAttribute( "data-scale", `sheet-${ this.side }` );

            this.root.focus();

            this._onClick = e => {
                if( e.target && ( this.root.contains( e.target ) ) )
                {
                    return;
                }
                this.destroy();
            };

            document.body.addEventListener( "mousedown", this._onClick, true );
            document.body.addEventListener( "focusin", this._onClick, true );
        }, 10 );
    }

    destroy() {

        document.documentElement.setAttribute( "data-scale", "" );

        document.body.removeEventListener( "mousedown", this._onClick, true );
        document.body.removeEventListener( "focusin", this._onClick, true );

        this.root.remove();

        LX.modal.toggle( true );
    }
};

LX.Sheet = Sheet;

export { Sheet };