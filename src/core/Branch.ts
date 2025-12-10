// Branch.ts @jxarco

import { ContextMenu } from '../components/ContextMenu';
import { LX } from './Namespace';
import { Panel } from './Panel';

/**
 * @class Branch
 */

export class Branch
{
    name: string;
    components: any[];
    closed: boolean;

    root: any;
    content: any;
    grabber: any;
    panel: Panel | null;

    onclick: () => void;
    oncontextmenu: ( e: any ) => void;

    constructor( name: string, options: any = {} )
    {
        this.name = name;

        var root = document.createElement( 'div' );
        root.className = 'lexbranch';
        if ( options.id )
        {
            root.id = options.id;
        }
        if ( options.className )
        {
            root.className += ' ' + options.className;
        }

        root.style.margin = '0 auto';

        var that = this;

        this.closed = options.closed ?? false;
        this.root = root;
        this.components = [];
        this.panel = null;

        // Create element
        const title: any = document.createElement( 'div' );
        title.className = 'lexbranchtitle';

        if ( options.icon )
        {
            const branchIcon = LX.makeIcon( options.icon, { iconClass: 'mr-2' } );
            title.appendChild( branchIcon );
        }

        title.innerHTML += name || 'Branch';

        const collapseIcon = LX.makeIcon( 'Right', { iconClass: 'switch-branch-button', svgClass: 'sm' } );
        title.appendChild( collapseIcon );

        root.appendChild( title );

        var branchContent = document.createElement( 'div' );
        branchContent.id = name.replace( /\s/g, '' );
        branchContent.className = 'lexbranchcontent';
        root.appendChild( branchContent );
        this.content = branchContent;

        this._addBranchSeparator();

        if ( this.closed )
        {
            title.classList.add( 'closed' );
            root.classList.add( 'closed' );
            this.grabber.setAttribute( 'hidden', true );
            LX.doAsync( () => {
                this.content.setAttribute( 'hidden', true );
            }, 10 );
        }

        this.onclick = function()
        {
            // e.stopPropagation();
            title.classList.toggle( 'closed' );
            title.parentElement.classList.toggle( 'closed' );

            that.content.toggleAttribute( 'hidden' );
            that.grabber.toggleAttribute( 'hidden' );

            LX.emitSignal( '@on_branch_closed', title.classList.contains( 'closed' ) );
        };

        this.oncontextmenu = function( e: any )
        {
            e.preventDefault();
            e.stopPropagation();

            if ( title.parentElement.classList.contains( 'dialog' ) )
            {
                return;
            }

            LX.addContextMenu( 'Dock', e, ( m: ContextMenu ) => {
                e.preventDefault();
                m.add( 'Floating', that._onMakeFloating.bind( that ) );
            }, { icon: 'WindowRestore' } );
        };

        title.addEventListener( 'click', this.onclick );
        title.addEventListener( 'contextmenu', this.oncontextmenu );
    }

    _onMakeFloating()
    {
        const dialog = new LX.Dialog( this.name, ( p: Panel ) => {
            // Add components
            for ( let w of this.components )
            {
                p.root.appendChild( w.root );
            }
        }, { dockable: true } );

        const childIndex = Array.from( this.root.parentElement.childNodes ).indexOf( this.root );
        console.assert( childIndex >= 0, 'Branch not found!' );

        dialog.branchData = {
            name: this.name,
            components: this.components,
            closed: this.closed,
            panel: this.panel,
            childIndex
        };

        this.root.remove();
    }

    _addBranchSeparator()
    {
        const element = document.createElement( 'div' );
        element.className = 'lexcomponentseparator';
        element.style.width = '100%';
        element.style.background = 'none';

        const grabber = document.createElement( 'div' );
        grabber.innerHTML = '&#9662;';
        element.appendChild( grabber );

        LX.doAsync( () => {
            grabber.style.marginLeft = ( ( parseFloat( LX.DEFAULT_NAME_WIDTH ) / 100.0 ) * this.content.offsetWidth )
                + 'px';
        }, 10 );

        const line = document.createElement( 'div' );
        line.style.width = '1px';
        line.style.marginLeft = '6px';
        line.style.marginTop = '2px';
        line.style.height = '0px'; // get in time
        grabber.appendChild( line );
        grabber.addEventListener( 'mousedown', innerMouseDown );

        this.grabber = grabber;

        function getBranchHeight()
        {
            return that.root.offsetHeight - that.root.children[0].offsetHeight;
        }

        let that = this;

        function innerMouseDown( e: MouseEvent )
        {
            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mouseup', innerMouseUp );
            doc.addEventListener( 'mousemove', innerMouseMove );
            e.stopPropagation();
            e.preventDefault();
            const h = getBranchHeight();
            line.style.height = ( h - 3 ) + 'px';
            document.body.classList.add( 'nocursor' );
        }

        function innerMouseMove( e: MouseEvent )
        {
            let dt = e.movementX;

            if ( dt != 0 )
            {
                const margin = parseFloat( grabber.style.marginLeft );
                grabber.style.marginLeft = LX.clamp( margin + dt, 32, that.content.offsetWidth - 32 ) + 'px';
            }
        }

        function innerMouseUp( e: MouseEvent )
        {
            that._updateComponents();

            line.style.height = '0px';

            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mouseup', innerMouseUp );
            doc.removeEventListener( 'mousemove', innerMouseMove );
            document.body.classList.remove( 'nocursor' );
        }

        this.content.appendChild( element );
    }

    _updateComponents()
    {
        var size = this.grabber.style.marginLeft;

        // Update sizes of components inside
        for ( let i = 0; i < this.components.length; i++ )
        {
            let component = this.components[i];
            const element = component.root;

            if ( element.children.length < 2 )
            {
                continue;
            }

            let name = element.children[0];
            let value = element.children[1];

            name.style.width = size;
            name.style.minWidth = size;

            switch ( component.type )
            {
                case LX.BaseComponent.CUSTOM:
                case LX.BaseComponent.ARRAY:
                    continue;
            }

            value.style.width = '-moz-calc( 100% - ' + size + ' )';
            value.style.width = '-webkit-calc( 100% - ' + size + ' )';
            value.style.width = 'calc( 100% - ' + size + ' )';
        }
    }
}

LX.Branch = Branch;
