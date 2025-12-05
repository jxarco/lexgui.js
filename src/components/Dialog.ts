// Dialog.ts @jxarco

import { LX } from './../core/Namespace';
import { Panel } from '../core/Panel';

/**
 * @class Dialog
 */

export class Dialog
{
    static _last_id = 0;

    id: string;
    root: HTMLDialogElement;
    panel: Panel;
    title: HTMLDivElement;
    size: any[] = [];
    branchData: any;

    close: () => void = () => {};

    _oncreate: any;

    constructor( title: string, callback: any, options: any = {} )
    {
        if( !callback )
        {
            console.warn("Content is empty, add some components using 'callback' parameter!");
        }

        this._oncreate = callback;
        this.id = LX.guidGenerator();

        const size = options.size ?? [],
            position = options.position ?? [],
            draggable = options.draggable ?? true,
            dockable = options.dockable ?? false,
            modal = options.modal ?? false;

        let root = document.createElement('dialog');
        root.className = "lexdialog " + (options.className ?? "");
        root.id = options.id ?? "dialog" + Dialog._last_id++;
        root.dataset["modal"] = modal;
        LX.root.appendChild( root );

        LX.doAsync( () => {
            modal ? root.showModal() : root.show();
        }, 10 );

        let that = this;

        const titleDiv = document.createElement( 'div' );

        if( title )
        {
            titleDiv.className = "lexdialogtitle";
            titleDiv.innerHTML = title;
            titleDiv.setAttribute( "draggable", "false" );
            root.appendChild( titleDiv );
        }

        if( options.closable ?? true )
        {
            this.close = () => {

                if( options.onBeforeClose )
                {
                    options.onBeforeClose( this );
                }

                if( !options.onclose )
                {
                    root.close();

                    LX.doAsync( () => {
                        that.panel.clear();
                        root.remove();
                    }, 150 );
                }
                else
                {
                    options.onclose( this.root );
                }
            };

            const closeButton = LX.makeIcon( "X", { title: "Close", iconClass: "lexdialogcloser" } );
            closeButton.addEventListener( "click", this.close );

            const dockButton = LX.makeIcon( "Minus", { title: "Dock", iconClass: "ml-auto mr-2" } );
            dockButton.addEventListener( "click", () => {

                const data = this.branchData;
                const panel = data.panel;
                const panelChildCount = panel.root.childElementCount;

                const branch = panel.branch( data.name, { closed: data.closed } );
                branch.components = data.components;

                for( let w of branch.components )
                {
                    branch.content.appendChild( w.root );
                }

                if( data.childIndex < panelChildCount )
                {
                    panel.root.insertChildAtIndex( branch.root, data.childIndex );
                }

                this.close();
            } );

            if( title )
            {
                if( dockable ) titleDiv.appendChild( dockButton );
                titleDiv.appendChild( closeButton );
            }
            else
            {
                closeButton.classList.add( "notitle" );
                root.appendChild( closeButton );
            }
        }

        const panel = new LX.Panel();
        panel.root.classList.add( "lexdialogcontent" );

        if( !title )
        {
            panel.root.classList.add( "notitle" );
        }

        if( callback )
        {
            callback.call( this, panel );
        }

        root.appendChild( panel.root );

        // Make branches have a distintive to manage some cases
        panel.root.querySelectorAll(".lexbranch").forEach( ( b: HTMLElement ) => b.classList.add("dialog") );

        this.panel = panel;
        this.root = root;
        this.title = titleDiv;

        if( draggable )
        {
            LX.makeDraggable( root, Object.assign( { targetClass: 'lexdialogtitle' }, options ) );
        }

        // Process position and size
        if( size.length && typeof(size[ 0 ]) != "string" )
        {
            size[ 0 ] += "px";
        }

        if( size.length && typeof(size[ 1 ]) != "string" )
        {
            size[ 1 ] += "px";
        }

        root.style.width = size[ 0 ] ? (size[ 0 ]) : "25%";
        root.style.height = size[ 1 ] ? (size[ 1 ]) : "auto";
        root.style.translate = options.position ? "unset" : "-50% -50%";

        if( options.size )
        {
            this.size = size;
        }

        root.style.left = position[ 0 ] ?? "50%";
        root.style.top = position[ 1 ] ?? "50%";

        panel.root.style.height = title ? "calc( 100% - " + ( titleDiv.offsetHeight + 30 ) + "px )" : "calc(100%)";
    }

    destroy()
    {
        this.root.remove();
    }

    refresh()
    {
        this.panel.root.innerHTML = "";
        this._oncreate.call(this, this.panel);
    }

    setPosition( x: number, y: number )
    {
        this.root.style.left = `${ x }px`;
        this.root.style.top = `${ y }px`;
    }

    setTitle( title: string )
    {
        const titleDOM: HTMLElement | null = this.root.querySelector( '.lexdialogtitle' );
        if( !titleDOM )
        {
            return;
        }
        titleDOM.innerText = title;
    }
}

LX.Dialog = Dialog;