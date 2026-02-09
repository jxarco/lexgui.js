// NodeTree.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';

export type NodeTreeAction = 'select' | 'dbl_click' | 'move' | 'delete' | 'rename' | 'visibility' | 'caret' | 'context_menu';

// export interface NodeTreeItem
// {
//     id: string;
//     type: string;
//     children: NodeTreeItem[];
//     parent?: NodeTreeItem;
//     path?: string;
//     src?: string;
//     dir?: NodeTreeItem[];
//     domEl?: HTMLElement;
//     metadata: any; // optional user data
// }

export interface NodeTreeEvent
{
    type: NodeTreeAction;
    domEvent?: Event;
    items?: any[];
    result?: any[];
    from?: any;
    to?: any;
    where?: any;
    oldName?: string;
    newName?: string;
    search?: any[]; // 0: search value, 1: filter applied
    userInitiated: boolean; // clicked by user vs programmatically
}

/**
 * Signature for cancelable events.
 * `resolve()` MUST be called by the user to perform the UI action
 */
export type NodeTreeEventCallback = ( event: NodeTreeEvent, resolve?: ( ...args: any[] ) => void ) => boolean | void | Promise<void>;

/**
 * @class NodeTree
 */

export class NodeTree
{
    domEl: any;
    data: any;
    options: any;
    selected: any[] = [];

    _forceClose: boolean = false;
    _callbacks: Record<string, NodeTreeEventCallback> = {};

    constructor( domEl: any, data: any, options: any = {} )
    {
        this.domEl = domEl;
        this.data = data;
        this.options = options;

        if ( data.constructor === Object )
        {
            this._createItem( null, data );
        }
        else
        {
            for ( let d of data )
            {
                this._createItem( null, d );
            }
        }
    }

    _createItem( parent: any, node: any, level: number = 0, selectedId?: string )
    {
        const that = this;
        const nodeFilterInput = this.domEl.querySelector( '.lexnodetreefilter' );

        node.children = node.children ?? [];

        if ( nodeFilterInput && nodeFilterInput.value != '' && !node.id.includes( nodeFilterInput.value ) )
        {
            for ( var i = 0; i < node.children.length; ++i )
            {
                this._createItem( node, node.children[i], level + 1, selectedId );
            }

            return;
        }

        const list = this.domEl.querySelector( 'ul' );

        node.visible = node.visible ?? true;
        node.parent = parent;
        let isParent = node.children.length > 0;
        let isSelected = this.selected.indexOf( node ) > -1 || node.selected;

        if ( this.options.onlyFolders )
        {
            let hasFolders = false;
            node.children.forEach( ( c: any ) => {
                hasFolders = hasFolders || ( c.type == 'folder' );
            } );
            isParent = !!hasFolders;
        }

        let item: any = document.createElement( 'li' );
        item.className =
            `lextreeitem inline-flex outline-none text-sm items-center h-7 cursor-pointer truncate rounded-lg select-none datalevel${level} ${
                isParent ? 'parent' : ''
            } ${isSelected ? ' selected' : ''}`;
        item.id = LX.getSupportedDOMName( node.id );
        item.tabIndex = '0';
        item.treeData = node;
        node.treeEl = item;

        // Select hierarchy icon
        let icon = ( this.options.skipDefaultIcon ?? true ) ? null : 'Dot'; // Default: no childs
        if ( isParent )
        {
            icon = node.closed ? 'Right' : 'Down';
        }

        if ( icon )
        {
            item.appendChild( LX.makeIcon( icon, { iconClass: 'hierarchy', svgClass: 'sm' } ) );
        }

        // Add display icon
        icon = node.icon;

        // Process icon
        if ( icon )
        {
            if ( !node.icon.includes( '.' ) )
            { // Not a file
                const classes = node.icon.split( ' ' );
                const nodeIcon = LX.makeIcon( classes[0], { iconClass: 'tree-item-icon mr-2',
                    svgClass: 'md' + ( classes.length > 1 ? ` ${classes.slice( 0 ).join( ' ' )}` : '' ) } );
                item.appendChild( nodeIcon );
            }
            // an image..
            else
            {
                const rootPath = 'https://raw.githubusercontent.com/jxarco/lexgui.js/master/';
                item.innerHTML += `<img src="${rootPath + node.icon}">`;
            }
        }

        item.innerHTML += node.rename ? '' : node.id;
        item.style.paddingLeft = ( 3 + ( level + 1 ) * 15 ) + 'px';
        list.appendChild( item );

        const isDraggable = parent && ( node.metadata?.draggable ?? ( this.options.defaultDraggable ?? true ) );
        if ( isDraggable ) item.setAttribute( 'draggable', 'true' );

        // Callbacks
        item.addEventListener( 'click', ( e: MouseEvent ) => {
            if ( handled )
            {
                handled = false;
                return;
            }

            if ( !e.shiftKey )
            {
                list.querySelectorAll( 'li' ).forEach( ( e: HTMLElement ) => {
                    e.classList.remove( 'selected' );
                } );
                this.selected.length = 0;
            }

            // Add or remove
            const idx = this.selected.indexOf( node );
            item.classList.toggle( 'selected', idx == -1 );
            if ( idx > -1 )
            {
                this.selected.splice( idx, 1 );
            }
            else
            {
                this.selected.push( node );
            }

            // Only Show children...
            if ( isParent && node.id.length > 1 /* Strange case... */ )
            {
                node.closed = false;

                const onCaretChanged = that._callbacks['caretChanged'];
                if ( onCaretChanged !== undefined )
                {
                    const event: NodeTreeEvent = {
                        type: 'caret',
                        items: [ node ],
                        domEvent: e,
                        userInitiated: true
                    };
                    onCaretChanged( event );
                }

                that.frefresh( node.id );
            }

            const onSelect = that._callbacks['select'];
            if ( onSelect !== undefined )
            {
                const event: NodeTreeEvent = {
                    type: 'select',
                    items: [ node ],
                    result: this.selected,
                    domEvent: e,
                    userInitiated: true
                };

                onSelect( event );
            }
        } );

        item.addEventListener( 'dblclick', function( e: MouseEvent )
        {
            if ( that.options.rename ?? true )
            {
                // Trigger rename
                node.rename = true;
                that.refresh();
            }

            const onDblClick = that._callbacks['dblClick'];
            if ( onDblClick !== undefined )
            {
                const event: NodeTreeEvent = {
                    type: 'dbl_click',
                    items: [ node ],
                    domEvent: e,
                    userInitiated: true
                };

                onDblClick( event );
            }
        } );

        item.addEventListener( 'contextmenu', async ( e: any ) => {
            e.preventDefault();

            const onContextMenu = that._callbacks['contextMenu'];
            if ( !onContextMenu )
            {
                return;
            }

            const event: NodeTreeEvent = {
                type: 'context_menu',
                items: this.selected,
                from: node,
                domEvent: e,
                userInitiated: true
            };

            const r: any = await onContextMenu( event );

            const multiple = this.selected.length > 1;

            LX.addContextMenu( multiple ? 'Selected Nodes' : node.id, e, ( m: ContextMenu ) => {
                if ( r?.length )
                {
                    for ( const i of r )
                    {
                        m.add( i.name, { callback: i.callback } );
                    }

                    m.add( '' );
                }

                m.add( 'Select Children', () => {
                    const selectChildren = ( n: any ) => {
                        if ( n.closed )
                        {
                            return;
                        }

                        for ( let child of n.children ?? [] )
                        {
                            if ( !child )
                            {
                                continue;
                            }

                            let nodeItem = this.domEl.querySelector( '#' + child.id );
                            nodeItem.classList.add( 'selected' );
                            this.selected.push( child );
                            selectChildren( child );
                        }
                    };

                    this.domEl.querySelectorAll( '.selected' ).forEach( ( i: HTMLElement ) => i.classList.remove( 'selected' ) );
                    this.selected.length = 0;

                    // Add childs of the clicked node
                    selectChildren( node );

                    const onSelect = this._callbacks['select'];
                    if ( onSelect !== undefined )
                    {
                        const event: NodeTreeEvent = {
                            type: 'select',
                            items: [ node ],
                            result: this.selected,
                            domEvent: e,
                            userInitiated: true
                        };

                        onSelect( event );
                    }
                } );

                m.add( 'Delete', { callback: () => {
                    const onBeforeDelete = this._callbacks['beforeDelete'];
                    const onDelete = this._callbacks['delete'];

                    const resolve = ( ...args: any[] ) => {
                        let deletedNodes = [];

                        if ( this.selected.length )
                        {
                            deletedNodes.push( ...that.deleteNodes( this.selected ) );
                        }
                        else if ( that.deleteNode( node ) )
                        {
                            deletedNodes.push( node );
                        }

                        this.refresh();

                        const event: NodeTreeEvent = {
                            type: 'delete',
                            items: deletedNodes,
                            userInitiated: true
                        };
                        if ( onDelete ) onDelete( event, ...args );
                    };

                    if ( onBeforeDelete )
                    {
                        const event: NodeTreeEvent = {
                            type: 'delete',
                            items: this.selected.length ? this.selected : [ node ],
                            userInitiated: true
                        };
                        onBeforeDelete( event, resolve );
                    }
                    else
                    {
                        resolve();
                    }
                } } );
            } );

            if ( !( this.options.addDefault ?? false ) )
            {
                return;
            }
        } );

        item.addEventListener( 'keydown', ( e: KeyboardEvent ) => {
            if ( node.rename )
            {
                return;
            }

            e.preventDefault();

            if ( e.key == 'Delete' )
            {
                const onBeforeDelete = this._callbacks['beforeDelete'];
                const onDelete = this._callbacks['delete'];

                const resolve = ( ...args: any[] ) => {
                    const nodesDeleted = [];

                    for ( let n of this.selected )
                    {
                        if ( that.deleteNode( n ) )
                        {
                            nodesDeleted.push( n );
                        }
                    }

                    this.selected.length = 0;

                    this.refresh();

                    if ( nodesDeleted.length )
                    {
                        const event: NodeTreeEvent = {
                            type: 'delete',
                            items: nodesDeleted,
                            domEvent: e,
                            userInitiated: true
                        };
                        if ( onDelete ) onDelete( event, ...args );
                    }
                };

                if ( onBeforeDelete )
                {
                    const event: NodeTreeEvent = {
                        type: 'delete',
                        items: this.selected,
                        domEvent: e,
                        userInitiated: true
                    };
                    onBeforeDelete( event, resolve );
                }
                else
                {
                    resolve();
                }
            }
            else if ( e.key == 'ArrowUp' || e.key == 'ArrowDown' )
            { // Unique or zero selected
                var selected = this.selected.length > 1
                    ? ( e.key == 'ArrowUp' ? this.selected.shift() : this.selected.pop() )
                    : this.selected[0];
                var el = this.domEl.querySelector( '#' + LX.getSupportedDOMName( selected.id ) );
                var sibling = e.key == 'ArrowUp' ? el.previousSibling : el.nextSibling;
                if ( sibling )
                {
                    sibling.click();
                }
            }
        } );

        // Node rename

        const nameInput = document.createElement( 'input' );
        nameInput.toggleAttribute( 'hidden', !node.rename );
        nameInput.className = 'text-foreground bg-none text-sm border-none outline-none';
        nameInput.value = node.id;
        item.appendChild( nameInput );

        if ( node.rename )
        {
            item.classList.add( 'selected' );
            nameInput.focus();
        }

        nameInput.addEventListener( 'keyup', function( e )
        {
            if ( e.key == 'Enter' )
            {
                const onBeforeRename = that._callbacks['beforeRename'];
                const onRename = that._callbacks['rename'];
                const oldName = node.id;

                this.value = this.value.replace( /\s/g, '_' );

                const resolve = ( ...args: any[] ) => {
                    node.id = LX.getSupportedDOMName( this.value );
                    delete node.rename;
                    that.frefresh( node.id );
                    list.querySelector( `#${node.id}` ).classList.add( 'selected' );

                    const event: NodeTreeEvent = {
                        type: 'rename',
                        items: [ node ],
                        oldName,
                        newName: this.value,
                        userInitiated: true
                    };
                    if ( onRename ) onRename( event, ...args );
                };

                if ( onBeforeRename )
                {
                    const event: NodeTreeEvent = {
                        type: 'rename',
                        items: [ node ],
                        oldName,
                        newName: this.value,
                        userInitiated: true
                    };

                    onBeforeRename( event, resolve );
                }
                else
                {
                    resolve();
                }
            }
            else if ( e.key == 'Escape' )
            {
                delete node.rename;
                that.frefresh( node.id );
            }
        } );

        nameInput.addEventListener( 'blur', function( e )
        {
            delete node.rename;
            that.refresh();
        } );

        if ( isDraggable )
        {
            item.addEventListener( 'dragstart', ( e: DragEvent ) => {
                ( window as any ).__tree_node_dragged = node;
            } );
        }

        /* Events fired on other node items,
        by now everyone is a drop target, cancel in the event if necessary */

        item.addEventListener( 'dragover', ( e: DragEvent ) => {
            e.preventDefault(); // allow drop
        }, false );
        item.addEventListener( 'dragenter', ( e: any ) => {
            e.target.classList.add( 'draggingover' );
        } );
        item.addEventListener( 'dragend', ( e: any ) => {
            e.target.classList.remove( 'draggingover' );
        } );
        item.addEventListener( 'dragleave', ( e: any ) => {
            e.target.classList.remove( 'draggingover' );
        } );
        item.addEventListener( 'drop', ( e: DragEvent ) => {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = ( window as any ).__tree_node_dragged;
            if ( !dragged )
            {
                // Test if we are moving from AssetView extension
                dragged = ( window as any ).__av_item_dragged;
                if ( dragged )
                {
                    dragged._nodeTarget = node;
                }

                return;
            }

            const domTarget: any = e.target;
            domTarget.classList.remove( 'draggingover' );

            let target = node;
            // Can't drop to same node
            if ( dragged.id == target.id )
            {
                console.warn( 'Cannot parent node to itself!' );
                return;
            }

            // Can't drop to child node
            const isChild = function( newParent: any, node: any ): boolean
            {
                var result = false;
                for ( var c of node.children )
                {
                    if ( c.id == newParent.id ) return true;
                    result = result || isChild( newParent, c );
                }
                return result;
            };

            if ( isChild( target, dragged ) )
            {
                console.warn( 'Cannot parent node to a current child!' );
                return;
            }

            const onBeforeMove = this._callbacks['beforeMove'];
            const onMove = this._callbacks['move'];

            const resolve = ( ...args: any[] ) => {
                const index = dragged.parent.children.findIndex( ( n: any ) => n.id == dragged.id );
                const removed = dragged.parent.children.splice( index, 1 );
                target.children.push( removed[0] );
                that.refresh();
                delete ( window as any ).__tree_node_dragged;

                const event: NodeTreeEvent = {
                    type: 'move',
                    items: [ dragged ],
                    to: target,
                    domEvent: e,
                    userInitiated: true
                };
                if ( onMove ) onMove( event, ...args );
            };

            if ( onBeforeMove )
            {
                const event: NodeTreeEvent = {
                    type: 'move',
                    items: [ dragged ],
                    to: target,
                    domEvent: e,
                    userInitiated: true
                };
                onBeforeMove( event, resolve );
            }
            else
            {
                resolve();
            }
        } );

        let handled = false;

        // Show/hide children
        if ( isParent )
        {
            item.querySelector( 'a.hierarchy' ).addEventListener( 'click', function( e: MouseEvent )
            {
                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();

                if ( e.altKey )
                {
                    const _closeNode = function( node: any )
                    {
                        node.closed = !node.closed;
                        for ( var c of node.children )
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

                const onCaretChanged = that._callbacks['caretChanged'];
                if ( onCaretChanged !== undefined )
                {
                    const event: NodeTreeEvent = {
                        type: 'caret',
                        items: [ node ],
                        domEvent: e,
                        userInitiated: true
                    };
                    onCaretChanged( event );
                }

                that.frefresh( node.id );
            } );
        }

        // Add button icons

        const inputContainer = LX.makeElement( 'div', 'flex flex-row ml-auto mr-2' );
        item.appendChild( inputContainer );

        if ( node.actions )
        {
            for ( let i = 0; i < node.actions.length; ++i )
            {
                const action = node.actions[i];
                const actionBtn = new Button( null, '', ( swapValue: boolean, event: any ) => {
                    event.stopPropagation();
                    if ( action.callback )
                    {
                        action.callback( node, swapValue, event );
                    }
                }, { icon: action.icon, swap: action.swap, title: action.name, hideName: true, className: 'p-0 min-h-fit',
                    buttonClass: 'px-0 h-full bg-none' } );
                inputContainer.appendChild( actionBtn.root );
            }
        }

        if ( !( node.skipVisibility ?? false ) )
        {
            const visibilityBtn = new Button( null, '', ( swapValue: boolean, e: any ) => {
                e.stopPropagation();
                node.visible = node.visible === undefined ? false : !node.visible;

                const onVisibleChanged = this._callbacks['visibleChanged'];
                if ( onVisibleChanged !== undefined )
                {
                    const event: NodeTreeEvent = {
                        type: 'visibility',
                        items: [ node ],
                        domEvent: e,
                        userInitiated: true
                    };

                    onVisibleChanged( event );
                }
            }, { icon: node.visible ? 'Eye' : 'EyeOff', swap: node.visible ? 'EyeOff' : 'Eye', title: 'Toggle visible', className: 'p-0 min-h-fit',
                buttonClass: 'px-0 h-full bg-none' } );
            inputContainer.appendChild( visibilityBtn.root );
        }

        const _hasChild = function( node: any, id: string | undefined ): boolean
        {
            if ( node.id == id ) return true;
            let found = false;
            for ( var c of ( node?.children ?? [] ) )
            {
                found = found || _hasChild( c, id );
            }
            return found;
        };

        const exists = _hasChild( node, selectedId );

        if ( node.closed && !exists )
        {
            return;
        }

        for ( var i = 0; i < node.children.length; ++i )
        {
            let child = node.children[i];

            if ( this.options.onlyFolders && child.type != 'folder' )
            {
                continue;
            }

            this._createItem( node, child, level + 1, selectedId );
        }
    }

    refresh( newData?: any, selectedId?: string )
    {
        this.data = newData ?? this.data;
        this.domEl.querySelector( 'ul' ).innerHTML = '';

        if ( this.data.constructor === Object )
        {
            this._createItem( null, this.data, 0, selectedId );
        }
        else
        {
            for ( let d of this.data )
            {
                this._createItem( null, d, 0, selectedId );
            }
        }
    }

    /* Refreshes the tree and focuses current element */
    frefresh( id: string )
    {
        this.refresh();
        var el = this.domEl.querySelector( `#${id}` );
        if ( el )
        {
            el.focus();
        }
    }

    /* 'path' here helps to identity the correct item based on its parent path, for same 'id' issues */
    select( id?: string, path?: string[] )
    {
        const nodeFilter = this.domEl.querySelector( '.lexnodetreefilter' );
        if ( nodeFilter )
        {
            nodeFilter.value = '';
        }

        this.refresh( null, id );

        this.domEl.querySelectorAll( '.selected' ).forEach( ( i: HTMLElement ) => i.classList.remove( 'selected' ) );

        if ( id === undefined )
        {
            // if no id, try with the path
            if ( path !== undefined )
            {
                id = path.at( -1 );
            }
            else
            {
                // Unselect
                this.selected.length = 0;
                return;
            }
        }

        let el = null;

        if ( path !== undefined )
        {
            let sourceData = this.data;
            for ( const p of path )
            {
                const pItem = sourceData.children.find( ( item: any ) => item.id === p );
                if ( !pItem ) break;
                sourceData = pItem;
            }

            el = sourceData.treeEl;
            console.assert( el, 'NodeTree: No domEl in item ' + id );
        }
        else if ( id !== undefined )
        {
            // Element should exist, since tree was refreshed to show it
            el = this.domEl.querySelector( '#' + LX.getSupportedDOMName( id ) );
            console.assert( el, "NodeTree: Can't select node " + id );
        }

        if ( !el )
        {
            console.assert( el, "NodeTree: Can't select node " + id );
        }

        el.classList.add( 'selected' );
        this.selected = [ el.treeData ];
        el.focus();
    }

    deleteNodes( nodes: any[] )
    {
        const nodesDeleted = [];

        for ( const n of nodes )
        {
            if ( this.deleteNode( n ) )
            {
                nodesDeleted.push( n );
            }
        }

        return nodesDeleted;
    }

    deleteNode( node: any ): boolean
    {
        const dataAsArray = this.data.constructor === Array;

        // Can be either Array or Object type data
        if ( node.parent )
        {
            let childs = node.parent.children;
            const index = childs.indexOf( node );
            childs.splice( index, 1 );
        }
        else
        {
            if ( dataAsArray )
            {
                const index = this.data.indexOf( node );
                console.assert( index > -1, "NodeTree: Can't delete root node " + node.id + ' from data array!' );
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

        let container = LX.makeElement( 'div', 'lextree p-1 rounded-lg w-full my-0 mx-auto font-medium text-sm min-h-3', '', this.root );

        if ( name )
        {
            let title = LX.makeElement( 'span', 'block p-1 select-none text-base font-medium whitespace-nowrap', name, container );
        }

        let toolsDiv = LX.makeElement( 'div', 'lextreetools flex items-center bg-secondary px-2 rounded-lg gap-2 my-1' );
        if ( !name )
        {
            toolsDiv.className += ' notitle';
        }

        // Tree icons
        if ( options.icons )
        {
            for ( let data of options.icons )
            {
                const iconEl = LX.makeIcon( data.icon, { title: data.name } );
                iconEl.addEventListener( 'click', data.callback );
                toolsDiv.appendChild( iconEl );
            }
        }

        // Node filter

        options.filter = options.filter ?? true;

        let nodeFilterInput = null;
        if ( options.filter )
        {
            nodeFilterInput = document.createElement( 'input' );
            nodeFilterInput.className = 'lexnodetreefilter';
            nodeFilterInput.setAttribute( 'placeholder', 'Filter..' );
            nodeFilterInput.style.width = '100%';
            nodeFilterInput.addEventListener( 'input', () => {
                this.innerTree.refresh();
            } );

            let searchIcon = LX.makeIcon( 'Search' );
            toolsDiv.appendChild( nodeFilterInput );
            toolsDiv.appendChild( searchIcon );
        }

        if ( options.icons || options.filter )
        {
            container.appendChild( toolsDiv );
        }

        // Tree

        let list: HTMLUListElement = LX.makeElement( 'ul', 'flex flex-col gap-1 ps-0' );
        list.addEventListener( 'contextmenu', function( e )
        {
            e.preventDefault();
        } );

        container.appendChild( list );

        this.innerTree = new NodeTree( container, data, options );
    }

    /**
     * @method on
     * @description Stores an event callback for the desired action
     */
    on( eventName: string, callback: NodeTreeEventCallback )
    {
        this.innerTree._callbacks[eventName] = callback;
    }
}

LX.Tree = Tree;
