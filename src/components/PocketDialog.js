// PocketDialog.js @jxarco
import { LX } from './core.js';

/**
 * @class PocketDialog
 */

class PocketDialog extends Dialog {

    static TOP      = 0;
    static BOTTOM   = 1;

    constructor( title, callback, options = {} ) {

        options.draggable = options.draggable ?? false;
        options.closable = options.closable ?? false;

        const dragMargin = 3;

        super( title, callback, options );

        let that = this;
        // Update margins on branch title closes/opens
        LX.addSignal("@on_branch_closed", this.panel, closed => {
            if( this.dock_pos == PocketDialog.BOTTOM )
            {
                this.root.style.top = "calc(100% - " + (this.root.offsetHeight + dragMargin) + "px)";
            }
        });

        // Custom
        this.root.classList.add( "pocket" );

        this.root.style.translate = "none";
        this.root.style.top = "0";
        this.root.style.left = "unset";

        if( !options.position )
        {
            this.root.style.right = dragMargin + "px";
            this.root.style.top = dragMargin + "px";
        }

        this.panel.root.style.width = "100%";
        this.panel.root.style.height = "100%";
        this.dock_pos = PocketDialog.TOP;

        this.minimized = false;
        this.title.tabIndex = -1;
        this.title.addEventListener("click", e => {
            if( this.title.eventCatched )
            {
                this.title.eventCatched = false;
                return;
            }

            // Sized dialogs have to keep their size
            if( this.size )
            {
                if( !this.minimized ) this.root.style.height = "auto";
                else this.root.style.height = this.size[ 1 ];
            }

            this.root.classList.toggle("minimized");
            this.minimized = !this.minimized;

            if( this.dock_pos == PocketDialog.BOTTOM )
                that.root.style.top = this.root.classList.contains("minimized") ?
                "calc(100% - " + (that.title.offsetHeight + 6) + "px)" : "calc(100% - " + (that.root.offsetHeight + dragMargin) + "px)";
        });

        if( !options.draggable )
        {
            const float = options.float;

            if( float )
            {
                for( let i = 0; i < float.length; i++ )
                {
                    const t = float[ i ];
                    switch( t )
                    {
                    case 'b':
                        this.root.style.top = "calc(100% - " + (this.root.offsetHeight + dragMargin) + "px)";
                        break;
                    case 'l':
                        this.root.style.right = "unset";
                        this.root.style.left = options.position ? options.position[ 1 ] : ( dragMargin + "px" );
                        break;
                    }
                }
            }

            this.root.classList.add('dockable');

            this.title.addEventListener("keydown", function( e ) {
                if( !e.ctrlKey )
                {
                    return;
                }

                that.root.style.right = "unset";

                if( e.key == 'ArrowLeft' )
                {
                    that.root.style.left = '0px';
                }
                else if( e.key == 'ArrowRight' )
                {
                    that.root.style.left = "calc(100% - " + (that.root.offsetWidth + dragMargin) + "px)";
                }
                else if( e.key == 'ArrowUp' )
                {
                    that.root.style.top = "0px";
                    that.dock_pos = PocketDialog.TOP;
                }
                else if( e.key == 'ArrowDown' )
                {
                    that.root.style.top = "calc(100% - " + (that.root.offsetHeight + dragMargin) + "px)";
                    that.dock_pos = PocketDialog.BOTTOM;
                }
            });
        }
    }
}

LX.PocketDialog = PocketDialog;

export { PocketDialog };