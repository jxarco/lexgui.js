// NodeTree.ts @jxarco

import { LX } from './Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { ContextMenu } from './ContextMenu';

/**
 * @class NodeTree
 */

export class NodeTree
{
    domEl: any;
    data: any;
    onevent: any;
    options: any;
    selected: any[] = [];

    _forceClose: boolean = false;

    constructor( domEl: any, data: any, options: any = {} )
    {
        this.domEl = domEl;
        this.data = data;
        this.onevent = options.onevent;
        this.options = options;

        if( data.constructor === Object )
        {
            this._createItem( null, data );
        }
        else
        {
            for( let d of data )
            {
                this._createItem( null, d );
            }
        }
    }

    _createItem( parent: any, node: any, level: number = 0, selectedId?: string )
    {
        const that = this;
        const nodeFilterInput = this.domEl.querySelector( ".lexnodetreefilter" );

        node.children = node.children ?? [];

        if( nodeFilterInput && nodeFilterInput.value != "" && !node.id.includes( nodeFilterInput.value ) )
        {
            for( var i = 0; i < node.children.length; ++i )
            {
                this._createItem( node, node.children[ i ], level + 1, selectedId );
            }

            return;
        }

        const list = this.domEl.querySelector( 'ul' );

        node.visible = node.visible ?? true;
        node.parent = parent;
        let isParent = node.children.length > 0;
        let isSelected = this.selected.indexOf( node ) > -1 || node.selected;

        if( this.options.onlyFolders )
        {
            let hasFolders = false;
            node.children.forEach( ( c: any ) => { hasFolders = hasFolders || ( c.type == 'folder' ) } );
            isParent = !!hasFolders;
        }

        let item: any = document.createElement('li');
        item.className = "lextreeitem " + "datalevel" + level + (isParent ? " parent" : "") + (isSelected ? " selected" : "");
        item.id = LX.getSupportedDOMName( node.id );
        item.tabIndex = "0";
        item.treeData = node;

        // Select hierarchy icon
        let icon = (this.options.skipDefaultIcon ?? true) ? null : "Dot"; // Default: no childs
        if( isParent )
        {
            icon = node.closed ? "Right" : "Down";
        }

        if( icon )
        {
            item.appendChild( LX.makeIcon( icon, { iconClass: "hierarchy", svgClass: "xs" } ) );
        }

        // Add display icon
        icon = node.icon;

        // Process icon
        if( icon )
        {
            if( !node.icon.includes( '.' ) ) // Not a file
            {
                const classes = node.icon.split( ' ' );
                const nodeIcon = LX.makeIcon( classes[ 0 ], { iconClass: "tree-item-icon mr-2", svgClass: "md" + ( classes.length > 1 ? ` ${ classes.slice( 0 ).join( ' ' ) }` : '' ) } );
                item.appendChild( nodeIcon );
            }
            else // an image..
            {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                item.innerHTML += "<img src='" + ( rootPath + node.icon ) + "'>";
            }
        }

        item.innerHTML += (node.rename ? "" : node.id);

        item.setAttribute( 'draggable', true );
        item.style.paddingLeft = ((3 + (level+1) * 15)) + "px";
        list.appendChild( item );

        // Callbacks
        item.addEventListener( "click", ( e: MouseEvent ) =>
        {
            if( handled )
            {
                handled = false;
                return;
            }

            if( !e.shiftKey )
            {
                list.querySelectorAll( "li" ).forEach( ( e: HTMLElement ) => { e.classList.remove( 'selected' ); } );
                this.selected.length = 0;
            }

            // Add or remove
            const idx = this.selected.indexOf( node );
            if( idx > -1 )
            {
                item.classList.remove( 'selected' );
                this.selected.splice( idx, 1 );
            }
            else
            {
                item.classList.add( 'selected' );
                this.selected.push( node );
            }

            // Only Show children...
            if( isParent && node.id.length > 1 /* Strange case... */)
            {
                node.closed = false;
                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_CARETCHANGED, node, node.closed, e );
                    that.onevent( event );
                }
                that.frefresh( node.id );
            }

            if( that.onevent )
            {
                const event = new LX.TreeEvent( LX.TreeEvent.NODE_SELECTED, node, this.selected, e );
                event.multiple = e.shiftKey;
                that.onevent( event );
            }
        });

        item.addEventListener("dblclick", function( e: MouseEvent ) {

            if( that.options.rename ?? true )
            {
                // Trigger rename
                node.rename = true;
                that.refresh();
            }

            if( that.onevent )
            {
                const event = new LX.TreeEvent( LX.TreeEvent.NODE_DBLCLICKED, node, null, e );
                that.onevent( event );
            }
        });

        item.addEventListener( "contextmenu", ( e: any ) => {

            e.preventDefault();

            if( !that.onevent )
            {
                return;
            }

            const event = new LX.TreeEvent( LX.TreeEvent.NODE_CONTEXTMENU, node, this.selected, e );
            event.multiple = this.selected.length > 1;

            LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.event, ( m: ContextMenu ) => {
                event.panel = m;
            });

            that.onevent( event );

            if( this.options.addDefault ?? false )
            {
                if( event.panel.items )
                {
                    event.panel.add( "" );
                }

                event.panel.add( "Select Children", () => {

                    const selectChildren = ( n: any ) => {

                        if( n.closed )
                        {
                            return;
                        }

                        for( let child of n.children ?? [] )
                        {
                            if( !child )
                            {
                                continue;
                            }

                            let nodeItem = this.domEl.querySelector( '#' + child.id );
                            nodeItem.classList.add( "selected" );
                            this.selected.push( child );
                            selectChildren( child );
                        }
                    };

                    this.domEl.querySelectorAll( ".selected" ).forEach( ( i: HTMLElement ) => i.classList.remove( "selected" ) );
                    this.selected.length = 0;

                    // Add childs of the clicked node
                    selectChildren( node );
                } );

                event.panel.add( "Delete", { callback: () => {

                    const ok = that.deleteNode( node );

                    if( ok && that.onevent )
                    {
                        const event = new LX.TreeEvent( LX.TreeEvent.NODE_DELETED, node, [ node ], null );
                        that.onevent( event );
                    }

                    this.refresh();
                } } );
            }
        });

        item.addEventListener("keydown", ( e: KeyboardEvent ) => {

            if( node.rename )
            {
                return;
            }

            e.preventDefault();

            if( e.key == "Delete" )
            {
                const nodesDeleted = [];

                for( let _node of this.selected )
                {
                    if( that.deleteNode( _node ) )
                    {
                        nodesDeleted.push( _node );
                    }
                }

                // Send event now so we have the info in selected array..
                if( nodesDeleted.length && that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_DELETED, node, nodesDeleted, e );
                    event.multiple = nodesDeleted.length > 1;
                    that.onevent( event );
                }

                this.selected.length = 0;

                this.refresh();
            }
            else if( e.key == "ArrowUp" || e.key == "ArrowDown" ) // Unique or zero selected
            {
                var selected = this.selected.length > 1 ? ( e.key == "ArrowUp" ? this.selected.shift() : this.selected.pop() ) : this.selected[ 0 ];
                var el = this.domEl.querySelector( "#" + LX.getSupportedDOMName( selected.id ) );
                var sibling = e.key == "ArrowUp" ? el.previousSibling : el.nextSibling;
                if( sibling )
                {
                    sibling.click();
                }
            }
        });

        // Node rename

        const nameInput = document.createElement( "input" );
        nameInput.toggleAttribute( "hidden", !node.rename );
        nameInput.className = "bg-none";
        nameInput.value = node.id;
        item.appendChild( nameInput );

        if( node.rename )
        {
            item.classList.add('selected');
            nameInput.focus();
        }

        nameInput.addEventListener("keyup", function( e ) {
            if( e.key == "Enter" )
            {
                this.value = this.value.replace(/\s/g, '_');

                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_RENAMED, node, this.value, e );
                    that.onevent( event );
                }

                node.id = LX.getSupportedDOMName( this.value );
                delete node.rename;
                that.frefresh( node.id );
                list.querySelector( "#" + node.id ).classList.add('selected');
            }
            else if(e.key == "Escape")
            {
                delete node.rename;
                that.frefresh( node.id );
            }
        });

        nameInput.addEventListener("blur", function( e ) {
            delete node.rename;
            that.refresh();
        });

        if( this.options.draggable ?? true )
        {
            // Drag nodes
            if( parent ) // Root doesn't move!
            {
                item.addEventListener("dragstart", ( e: DragEvent ) => {
                    ( window as any ).__tree_node_dragged = node;
                });
            }

            /* Events fired on other node items */
            item.addEventListener("dragover", ( e: DragEvent ) => {
                e.preventDefault(); // allow drop
            }, false );
            item.addEventListener("dragenter", ( e: any ) => {
                e.target.classList.add("draggingover");
            });
            item.addEventListener("dragleave", ( e: any ) => {
                e.target.classList.remove("draggingover");
            });
            item.addEventListener("drop", ( e: DragEvent ) =>
            {
                e.preventDefault(); // Prevent default action (open as link for some elements)
                let dragged = ( window as any ).__tree_node_dragged;
                if( !dragged )
                {
                    return;
                }

                let target = node;
                // Can't drop to same node
                if( dragged.id == target.id )
                {
                    console.warn("Cannot parent node to itself!");
                    return;
                }

                // Can't drop to child node
                const isChild = function( newParent: any, node: any ): boolean {
                    var result = false;
                    for( var c of node.children )
                    {
                        if( c.id == newParent.id ) return true;
                        result = result || isChild( newParent, c );
                    }
                    return result;
                };

                if( isChild( target, dragged ))
                {
                    console.warn("Cannot parent node to a current child!");
                    return;
                }

                // Trigger node dragger event
                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_DRAGGED, dragged, target, e );
                    that.onevent( event );
                }

                const index = dragged.parent.children.findIndex( ( n: any ) => n.id == dragged.id );
                const removed = dragged.parent.children.splice(index, 1);
                target.children.push( removed[ 0 ] );
                that.refresh();
                delete ( window as any ).__tree_node_dragged;
            });
        }

        let handled = false;

        // Show/hide children
        if( isParent )
        {
            item.querySelector('a.hierarchy').addEventListener("click", function( e: MouseEvent ) {

                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();

                if( e.altKey )
                {
                    const _closeNode = function( node: any ) {
                        node.closed = !node.closed;
                        for( var c of node.children )
                        {
                            _closeNode( c );
                        }
                    };
                    _closeNode( node );
                }
                else
                {
                    node.closed = !node.closed;
                }

                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_CARETCHANGED, node, node.closed, e );
                    that.onevent( event );
                }
                that.frefresh( node.id );
            });
        }

        // Add button icons

        const inputContainer = document.createElement( "div" );
        item.appendChild( inputContainer );

        if( node.actions )
        {
            for( let i = 0; i < node.actions.length; ++i )
            {
                const action = node.actions[ i ];
                const actionBtn = new LX.Button( null, "", ( swapValue: boolean, event: any ) => {
                    event.stopPropagation();
                    if( action.callback )
                    {
                        action.callback( node, swapValue, event );
                    }
                }, { icon: action.icon, swap: action.swap, title: action.name, hideName:true, className: "p-0 m-0", buttonClass: "p-0 m-0 bg-none" } );
                actionBtn.root.style.minWidth = "fit-content";
                actionBtn.root.style.margin = "0"; // adding classes does not work
                actionBtn.root.style.padding = "0"; // adding classes does not work
                const _btn = actionBtn.root.querySelector("button");
                _btn.style.minWidth = "fit-content";
                _btn.style.margin = "0"; // adding classes does not work
                _btn.style.padding = "0"; // adding classes does not work

                inputContainer.appendChild( actionBtn.root );
            }
        }

        if( !( node.skipVisibility ?? false ) )
        {
            const visibilityBtn = new LX.Button( null, "", ( swapValue: boolean, e: any ) => {
                e.stopPropagation();
                node.visible = node.visible === undefined ? false : !node.visible;
                // Trigger visibility event
                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_VISIBILITY, node, node.visible, e );
                    that.onevent( event );
                }
            }, { icon: node.visible ? "Eye" : "EyeOff", swap: node.visible ? "EyeOff" : "Eye", title: "Toggle visible", className: "p-0 m-0", buttonClass: "bg-none" } );
            inputContainer.appendChild( visibilityBtn.root );
        }

        const _hasChild = function( node: any, id: string | undefined ): boolean {
            if( node.id == id ) return true;
            let found = false;
            for( var c of ( node?.children ?? [] ) )
            {
                found = found || _hasChild( c, id );
            }
            return found;
        };

        const exists = _hasChild( node, selectedId );

        if( node.closed && !exists )
        {
            return;
        }

        for( var i = 0; i < node.children.length; ++i )
        {
            let child = node.children[ i ];

            if( this.options.onlyFolders && child.type != 'folder' )
            {
                continue;
            }

            this._createItem( node, child, level + 1, selectedId );
        }
    }

    refresh( newData?: any, selectedId?: string )
    {
        this.data = newData ?? this.data;
        this.domEl.querySelector( "ul" ).innerHTML = "";

        if( this.data.constructor === Object )
        {
            this._createItem( null, this.data, 0, selectedId );
        }
        else
        {
            for( let d of this.data )
            {
                this._createItem( null, d, 0, selectedId );
            }
        }
    }

    /* Refreshes the tree and focuses current element */
    frefresh( id: string )
    {
        this.refresh();
        var el = this.domEl.querySelector( `#${ id }` );
        if( el )
        {
            el.focus();
        }
    }

    select( id: string )
    {
        const nodeFilter = this.domEl.querySelector( ".lexnodetreefilter" );
        if( nodeFilter )
        {
            nodeFilter.value = "";
        }

        this.refresh( null, id );

        this.domEl.querySelectorAll( ".selected" ).forEach( ( i: HTMLElement ) => i.classList.remove( "selected" ) );

        // Unselect
        if( !id )
        {
            this.selected.length = 0;
            return;
        }

        // Element should exist, since tree was refreshed to show it
        const el = this.domEl.querySelector( "#" + id );
        console.assert(  el, "NodeTree: Can't select node " + id );

        el.classList.add( "selected" );
        this.selected = [ el.treeData ];
        el.focus();
    }

    deleteNode( node: any ): boolean
    {
        const dataAsArray = ( this.data.constructor === Array );

        // Can be either Array or Object type data
        if( node.parent )
        {
            let childs = node.parent.children;
            const index = childs.indexOf( node );
            childs.splice( index, 1 );
        }
        else
        {
            if( dataAsArray )
            {
                const index = this.data.indexOf( node );
                console.assert( index > -1, "NodeTree: Can't delete root node " + node.id + " from data array!" );
                this.data.splice( index, 1 );
            }
            else
            {
                console.warn( "NodeTree: Can't delete root node from object data!" );
                return false;
            }
        }

        return true;
    }
}

LX.NodeTree = NodeTree;

/**
 * @class Tree
 * @description Tree Component
 */

export class Tree extends BaseComponent
{
    innerTree: NodeTree;

    constructor( name: string, data: any, options: any = {} )
    {
        options.hideName = true;

        super( ComponentType.TREE, name, null, options );

        let container = document.createElement('div');
        container.className = "lextree";
        this.root.appendChild( container );

        if( name )
        {
            let title = document.createElement('span');
            title.innerHTML = name;
            container.appendChild( title );
        }

        let toolsDiv = document.createElement('div');
        toolsDiv.className = "lextreetools";
        if( !name )
        {
            toolsDiv.className += " notitle";
        }

        // Tree icons
        if( options.icons )
        {
            for( let data of options.icons )
            {
                const iconEl = LX.makeIcon( data.icon, { title: data.name } );
                iconEl.addEventListener( "click", data.callback );
                toolsDiv.appendChild( iconEl );
            }
        }

        // Node filter

        options.filter = options.filter ?? true;

        let nodeFilterInput = null;
        if( options.filter )
        {
            nodeFilterInput = document.createElement( "input" );
            nodeFilterInput.className = "lexnodetreefilter";
            nodeFilterInput.setAttribute("placeholder", "Filter..");
            nodeFilterInput.style.width =  "100%";
            nodeFilterInput.addEventListener('input', () => {
                this.innerTree.refresh();
            });

            let searchIcon = LX.makeIcon( "Search" );
            toolsDiv.appendChild( nodeFilterInput );
            toolsDiv.appendChild( searchIcon );
        }

        if( options.icons || options.filter )
        {
            container.appendChild( toolsDiv );
        }

        // Tree

        let list = document.createElement('ul');
        list.addEventListener("contextmenu", function( e ) {
            e.preventDefault();
        });

        container.appendChild( list );

        this.innerTree = new NodeTree( container, data, options );
    }
}

LX.Tree = Tree;