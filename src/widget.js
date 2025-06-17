// widget.js @jxarco
import { LX } from './core.js';

/**
 * @class Widget
 */

class Widget {

    static NONE         = 0;
    static TEXT         = 1;
    static TEXTAREA     = 2;
    static BUTTON       = 3;
    static SELECT       = 4;
    static CHECKBOX     = 5;
    static TOGGLE       = 6;
    static RADIO        = 7;
    static BUTTONS      = 8;
    static COLOR        = 9;
    static RANGE        = 10;
    static NUMBER       = 11;
    static TITLE        = 12;
    static VECTOR       = 13;
    static TREE         = 14;
    static PROGRESS     = 15;
    static FILE         = 16;
    static LAYERS       = 17;
    static ARRAY        = 18;
    static LIST         = 19;
    static TAGS         = 20;
    static CURVE        = 21;
    static CARD         = 22;
    static IMAGE        = 23;
    static CONTENT      = 24;
    static CUSTOM       = 25;
    static SEPARATOR    = 26;
    static KNOB         = 27;
    static SIZE         = 28;
    static OTP          = 29;
    static PAD          = 30;
    static FORM         = 31;
    static DIAL         = 32;
    static COUNTER      = 33;
    static TABLE        = 34;
    static TABS         = 35;
    static DATE         = 36;
    static MAP2D        = 37;
    static LABEL        = 38;
    static BLANK        = 39;

    static NO_CONTEXT_TYPES = [
        Widget.BUTTON,
        Widget.LIST,
        Widget.FILE,
        Widget.PROGRESS
    ];

    constructor( type, name, value, options = {} ) {

        this.type = type;
        this.name = name;
        this.options = options;
        this._initialValue = value;

        const root = document.createElement( 'div' );
        root.className = "lexwidget";

        if( options.id )
        {
            root.id = options.id;
        }

        if( options.title )
        {
            root.title = options.title;
        }

        if( options.className )
        {
            root.className += " " + options.className;
        }

        if( type != Widget.TITLE )
        {
            if( options.width )
            {
                root.style.width = root.style.minWidth = options.width;
            }
            if( options.maxWidth )
            {
                root.style.maxWidth = options.maxWidth;
            }
            if( options.minWidth )
            {
                root.style.minWidth = options.minWidth;
            }
            if( options.height )
            {
                root.style.height = root.style.minHeight = options.height;
            }

            LX.widgetResizeObserver.observe( root );
        }

        if( name != undefined )
        {
            if( !( options.hideName ?? false ) )
            {
                let domName = document.createElement( 'div' );
                domName.className = "lexwidgetname";

                if( options.justifyName )
                {
                    domName.classList.add( "float-" + options.justifyName );
                }

                domName.innerHTML = name;
                domName.title = options.title ?? domName.innerHTML;
                domName.style.width = options.nameWidth || LX.DEFAULT_NAME_WIDTH;
                domName.style.minWidth = domName.style.width;

                root.appendChild( domName );
                root.domName = domName;

                const that = this;

                // Copy-paste info
                domName.addEventListener('contextmenu', function( e ) {
                    e.preventDefault();
                    that.oncontextmenu( e );
                });

                if( !( options.skipReset ?? false )  && ( value != null ) )
                {
                    this._addResetProperty( domName, function( e ) {
                        that.set( that._initialValue, false, e );
                        this.style.display = "none"; // Og value, don't show it
                    });
                }
            }
        }
        else
        {
            options.hideName = true;
        }

        if( options.signal )
        {
            LX.addSignal( options.signal, this );
        }

        this.root = root;
        this.root.jsInstance = this;
        this.options = options;
    }

    static _dispatchEvent( element, type, data, bubbles, cancelable ) {
        let event = new CustomEvent( type, { 'detail': data, 'bubbles': bubbles, 'cancelable': cancelable } );
        element.dispatchEvent( event );
    }

    _addResetProperty( container, callback ) {

        const domEl = LX.makeIcon( "Undo2", { iconClass: "ml-0 mr-1 px-1", title: "Reset" } )
        domEl.style.display = "none";
        domEl.addEventListener( "click", callback );
        container.appendChild( domEl );
        return domEl;
    }

    _canPaste() {
        let pasteAllowed = this.type === Widget.CUSTOM ?
            ( navigator.clipboard.customIdx !== undefined && this.customIdx == navigator.clipboard.customIdx ) : navigator.clipboard.type === this.type;

        pasteAllowed &= ( this.disabled !== true );

        if( this.onAllowPaste )
        {
            pasteAllowed = this.onAllowPaste( pasteAllowed );
        }

        return pasteAllowed;
    }

    _trigger( event, callback, scope = this ) {

        if( !callback )
        {
            return;
        }

        callback.call( scope, event.value, event.domEvent, event.name );
    }

    value() {

        if( this.onGetValue )
        {
            return this.onGetValue();
        }

        console.warn( "Can't get value of " + this.typeName() );
    }

    set( value, skipCallback, event ) {

        if( this.onSetValue )
        {
            let resetButton = this.root.querySelector( ".lexwidgetname .lexicon" );
            if( resetButton )
            {
                resetButton.style.display = ( value != this.value() ? "block" : "none" );

                const equalInitial = value.constructor === Array ? (function arraysEqual(a, b) {
                    if (a === b) return true;
                    if (a == null || b == null) return false;
                    if (a.length !== b.length) return false;
                    for (var i = 0; i < a.length; ++i) {
                        if (a[ i ] !== b[ i ]) return false;
                    }
                    return true;
                })( value, this._initialValue ) : ( value == this._initialValue );

                resetButton.style.display = ( !equalInitial ? "block" : "none" );
            }

            return this.onSetValue( value, skipCallback ?? false, event );
        }

        console.warn("Can't set value of " + this.typeName());
    }

    oncontextmenu( e ) {

        if( Widget.NO_CONTEXT_TYPES.includes( this.type ) )
        {
            return;
        }

        LX.addContextMenu( this.typeName(), e, c => {
            c.add("Copy", () => { this.copy() });
            c.add("Paste", { disabled: !this._canPaste(), callback: () => { this.paste() } } );
        });
    }

    copy() {
        navigator.clipboard.type = this.type;
        navigator.clipboard.customIdx = this.customIdx;
        navigator.clipboard.data = this.value();
        navigator.clipboard.writeText( navigator.clipboard.data );
    }

    paste() {
        if( !this._canPaste() )
        {
            return;
        }

        this.set( navigator.clipboard.data );
    }

    typeName() {

        switch( this.type )
        {
            case Widget.TEXT: return "Text";
            case Widget.TEXTAREA: return "TextArea";
            case Widget.BUTTON: return "Button";
            case Widget.SELECT: return "Select";
            case Widget.CHECKBOX: return "Checkbox";
            case Widget.TOGGLE: return "Toggle";
            case Widget.RADIO: return "Radio";
            case Widget.COLOR: return "Color";
            case Widget.RANGE: return "Range";
            case Widget.NUMBER: return "Number";
            case Widget.VECTOR: return "Vector";
            case Widget.TREE: return "Tree";
            case Widget.PROGRESS: return "Progress";
            case Widget.FILE: return "File";
            case Widget.LAYERS: return "Layers";
            case Widget.ARRAY: return "Array";
            case Widget.LIST: return "List";
            case Widget.TAGS: return "Tags";
            case Widget.CURVE: return "Curve";
            case Widget.KNOB: return "Knob";
            case Widget.SIZE: return "Size";
            case Widget.PAD: return "Pad";
            case Widget.FORM: return "Form";
            case Widget.DIAL: return "Dial";
            case Widget.COUNTER: return "Counter";
            case Widget.TABLE: return "Table";
            case Widget.TABS: return "Tabs";
            case Widget.DATE: return "Date";
            case Widget.MAP2D: return "Map2D";
            case Widget.LABEL: return "Label";
            case Widget.BLANK: return "Blank";
            case Widget.CUSTOM: return this.customName;
        }

        console.error( `Unknown Widget type: ${ this.type }` );
    }

    refresh() {

    }
}

LX.Widget = Widget;

function ADD_CUSTOM_WIDGET( customWidgetName, options = {} )
{
    let customIdx = LX.guidGenerator();

    LX.Panel.prototype[ 'add' + customWidgetName ] = function( name, instance, callback ) {

        const userParams = Array.from( arguments ).slice( 3 );

        let widget = new Widget( Widget.CUSTOM, name, null, options );
        this._attachWidget( widget );

        widget.customName = customWidgetName;
        widget.customIdx = customIdx;

        widget.onGetValue = () => {
            return instance;
        };

        widget.onSetValue = ( newValue, skipCallback, event ) => {
            instance = newValue;
            refresh_widget();
            element.querySelector( ".lexcustomitems" ).toggleAttribute( 'hidden', false );
            if( !skipCallback )
            {
                widget._trigger( new LX.IEvent( name, instance, event ), callback );
            }
        };

        widget.onResize = ( rect ) => {
            const realNameWidth = ( widget.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const element = widget.root;

        let container, customWidgetsDom;
        let defaultInstance = options.default ?? {};

        // Add instance button

        const refresh_widget = () => {

            if( container ) container.remove();
            if( customWidgetsDom ) customWidgetsDom.remove();

            container = document.createElement('div');
            container.className = "lexcustomcontainer w-full";
            element.appendChild( container );
            element.dataset["opened"] = false;

            const customIcon = LX.makeIcon( options.icon ?? "Box" );
            const menuIcon = LX.makeIcon( "Menu" );

            let buttonName = customWidgetName + (!instance ? " [empty]" : "");
            let buttonEl = this.addButton(null, buttonName, (value, event) => {
                if( instance )
                {
                    element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                }
                else
                {
                    LX.addContextMenu(null, event, c => {
                        c.add("New " + customWidgetName, () => {
                            instance = {};
                            refresh_widget();
                            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                        });
                    });
                }

            }, { buttonClass: 'custom' });

            const buttonSpan = buttonEl.root.querySelector( "span" );
            buttonSpan.prepend( customIcon );
            buttonSpan.appendChild( menuIcon );
            container.appendChild( buttonEl.root );

            if( instance )
            {
                menuIcon.addEventListener( "click", e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    LX.addContextMenu(null, e, c => {
                        c.add("Clear", () => {
                            instance = null;
                            refresh_widget();
                        });
                    });
                });
            }

            // Show elements

            customWidgetsDom = document.createElement('div');
            customWidgetsDom.className = "lexcustomitems";
            customWidgetsDom.toggleAttribute('hidden', true);
            element.appendChild( customWidgetsDom );

            if( instance )
            {
                this.queue( customWidgetsDom );

                const on_instance_changed = ( key, value, event ) => {
                    const setter = options[ `_set_${ key }` ];
                    if( setter )
                    {
                        setter.call( instance, value );
                    }
                    else
                    {
                        instance[ key ] = value;
                    }
                    widget._trigger( new LX.IEvent( name, instance, event ), callback );
                };

                for( let key in defaultInstance )
                {
                    let value = null;

                    const getter = options[ `_get_${ key }` ];
                    if( getter )
                    {
                        value = instance[ key ] ? getter.call( instance ) : getter.call( defaultInstance );
                    }
                    else
                    {
                        value = instance[ key ] ?? defaultInstance[ key ];
                    }

                    if( !value )
                    {
                        continue;
                    }

                    switch( value.constructor )
                    {
                        case String:
                            if( value[ 0 ] === '#' )
                            {
                                this.addColor( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this.addText( key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        case Number:
                            this.addNumber( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Boolean:
                            this.addCheckbox( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Array:
                            if( value.length > 4 )
                            {
                                this.addArray( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this._addVector( value.length, key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        default:
                            console.warn( `Unsupported property type: ${ value.constructor.name }` )
                            break;
                    }
                }

                if( options.onCreate )
                {
                    options.onCreate.call( this, this, ...userParams );
                }

                this.clearQueue();
            }
        };

        refresh_widget();
    };
}

LX.ADD_CUSTOM_WIDGET = ADD_CUSTOM_WIDGET;

/**
 * @class NodeTree
 */

class NodeTree {

    constructor( domEl, data, options ) {

        this.domEl = domEl;
        this.data = data;
        this.onevent = options.onevent;
        this.options = options;
        this.selected = [];

        this._forceClose = false;

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

    _createItem( parent, node, level = 0, selectedId ) {

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
            node.children.forEach( c => hasFolders |= (c.type == 'folder') );
            isParent = !!hasFolders;
        }

        let item = document.createElement('li');
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
        item.addEventListener("click", e => {
            if( handled )
            {
                handled = false;
                return;
            }

            if( !e.shiftKey )
            {
                list.querySelectorAll( "li" ).forEach( e => { e.classList.remove( 'selected' ); } );
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
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_CARETCHANGED, node, node.closed );
                    that.onevent( event );
                }
                that.frefresh( node.id );
            }

            if( that.onevent )
            {
                const event = new LX.TreeEvent(LX.TreeEvent.NODE_SELECTED, e.shiftKey ? this.selected : node );
                event.multiple = e.shiftKey;
                that.onevent( event );
            }
        });

        item.addEventListener("dblclick", function() {

            if( that.options.rename ?? true )
            {
                // Trigger rename
                node.rename = true;
                that.refresh();
            }

            if( that.onevent )
            {
                const event = new LX.TreeEvent( LX.TreeEvent.NODE_DBLCLICKED, node );
                that.onevent( event );
            }
        });

        item.addEventListener( "contextmenu", e => {

            e.preventDefault();

            if( !that.onevent )
            {
                return;
            }

            const event = new LX.TreeEvent(LX.TreeEvent.NODE_CONTEXTMENU, this.selected.length > 1 ? this.selected : node, e);
            event.multiple = this.selected.length > 1;

            LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {
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

                    const selectChildren = ( n ) => {

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

                    this.domEl.querySelectorAll( ".selected" ).forEach( i => i.classList.remove( "selected" ) );
                    this.selected.length = 0;

                    // Add childs of the clicked node
                    selectChildren( node );
                } );

                event.panel.add( "Delete", { callback: () => {

                    const ok = that.deleteNode( node );

                    if( ok && that.onevent )
                    {
                        const event = new LX.TreeEvent( LX.TreeEvent.NODE_DELETED, node, e );
                        that.onevent( event );
                    }

                    this.refresh();
                } } );
            }
        });

        item.addEventListener("keydown", e => {

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
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_DELETED, nodesDeleted.length > 1 ? nodesDeleted : node, e );
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
                    const event = new LX.TreeEvent(LX.TreeEvent.NODE_RENAMED, node, this.value);
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
                item.addEventListener("dragstart", e => {
                    window.__tree_node_dragged = node;
                });
            }

            /* Events fired on other node items */
            item.addEventListener("dragover", e => {
                e.preventDefault(); // allow drop
            }, false );
            item.addEventListener("dragenter", (e) => {
                e.target.classList.add("draggingover");
            });
            item.addEventListener("dragleave", (e) => {
                e.target.classList.remove("draggingover");
            });
            item.addEventListener("drop", e => {
                e.preventDefault(); // Prevent default action (open as link for some elements)
                let dragged = window.__tree_node_dragged;
                if(!dragged)
                    return;
                let target = node;
                // Can't drop to same node
                if( dragged.id == target.id )
                {
                    console.warn("Cannot parent node to itself!");
                    return;
                }

                // Can't drop to child node
                const isChild = function( newParent, node ) {
                    var result = false;
                    for( var c of node.children )
                    {
                        if( c.id == newParent.id ) return true;
                        result |= isChild( newParent, c );
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
                    const event = new LX.TreeEvent(LX.TreeEvent.NODE_DRAGGED, dragged, target);
                    that.onevent( event );
                }

                const index = dragged.parent.children.findIndex(n => n.id == dragged.id);
                const removed = dragged.parent.children.splice(index, 1);
                target.children.push( removed[ 0 ] );
                that.refresh();
                delete window.__tree_node_dragged;
            });
        }

        let handled = false;

        // Show/hide children
        if( isParent )
        {
            item.querySelector('a.hierarchy').addEventListener("click", function( e ) {

                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();

                if( e.altKey )
                {
                    const _closeNode = function( node ) {
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
                    const event = new LX.TreeEvent(LX.TreeEvent.NODE_CARETCHANGED, node, node.closed);
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
                const actionIcon = LX.makeIcon( action.icon, { title: action.name } );
                actionIcon.addEventListener("click", function( e ) {
                    if( action.callback )
                    {
                        action.callback( node, actionIcon );
                        e.stopPropagation();
                    }
                });

                inputContainer.appendChild( actionIcon );
            }
        }

        if( !node.skipVisibility ?? false )
        {
            const visibilityBtn = new LX.Button( null, "", ( swapValue, event ) => {
                event.stopPropagation();
                node.visible = node.visible === undefined ? false : !node.visible;
                // Trigger visibility event
                if( that.onevent )
                {
                    const event = new LX.TreeEvent( LX.TreeEvent.NODE_VISIBILITY, node, node.visible );
                    that.onevent( event );
                }
            }, { icon: node.visible ? "Eye" : "EyeOff", swap: node.visible ? "EyeOff" : "Eye", title: "Toggle visible", className: "p-0 m-0", buttonClass: "bg-none" } );
            inputContainer.appendChild( visibilityBtn.root );
        }

        const _hasChild = function( node, id ) {
            if( node.id == id ) return true;
            let found = false;
            for( var c of ( node?.children ?? [] ) )
            {
                found |= _hasChild( c, id );
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

    refresh( newData, selectedId ) {

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
    frefresh( id ) {

        this.refresh();
        var el = this.domEl.querySelector( "#" + id );
        if( el )
        {
            el.focus();
        }
    }

    select( id ) {

        this.refresh( null, id );

        this.domEl.querySelectorAll( ".selected" ).forEach( i => i.classList.remove( "selected" ) );

        // Element should exist, since tree was refreshed to show it
        const el = this.domEl.querySelector( "#" + id );
        console.assert(  el, "NodeTree: Can't select node " + id );

        el.classList.add( "selected" );
        this.selected = [ el.treeData ];
        el.focus();
    }

    deleteNode( node ) {

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
 * @class Blank
 * @description Blank Widget
 */

class Blank extends Widget {

    constructor( width, height ) {

        super( Widget.BLANK );

        this.root.style.width = width ?? "auto";
        this.root.style.height = height ?? "8px";
    }
}

LX.Blank = Blank;

/**
 * @class Title
 * @description Title Widget
 */

class Title extends Widget {

    constructor( name, options = {} ) {

        console.assert( name, "Can't create Title Widget without text!" );

        // Note: Titles are not registered in Panel.widgets by now
        super( Widget.TITLE, null, null, options );

        this.root.className = `lextitle ${ this.root.className }`;

        if( options.icon )
        {
            let icon = LX.makeIcon( options.icon, { iconClass: "mr-2" } );
            icon.querySelector( "svg" ).style.color = options.iconColor || "";
            this.root.appendChild( icon );
        }

        let text = document.createElement( "span" );
        text.innerText = name;
        this.root.appendChild( text );

        Object.assign( this.root.style, options.style ?? {} );

        if( options.link != undefined )
        {
            let linkDom = document.createElement('a');
            linkDom.innerText = name;
            linkDom.href = options.link;
            linkDom.target = options.target ?? "";
            linkDom.className = "lextitle link";
            Object.assign( linkDom.style, options.style ?? {} );
            this.root.replaceWith( linkDom );
        }
    }
}

LX.Title = Title;

/**
 * @class TextInput
 * @description TextInput Widget
 */

class TextInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.TEXT, name, String( value ), options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( !this.valid( newValue ) || ( this._lastValueTriggered == newValue ) )
            {
                return;
            }

            this._lastValueTriggered = value = newValue;

            wValue.value = newValue;

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        this.valid = ( v ) => {
            v = v ?? this.value();
            if( !v.length || wValue.pattern == "" ) return true;
            const regexp = new RegExp( wValue.pattern );
            return regexp.test( v );
        };

        let container = document.createElement( 'div' );
        container.className = ( options.warning ? " lexwarning" : "" );
        container.style.display = "flex";
        container.style.position = "relative";
        this.root.appendChild( container );

        this.disabled = ( options.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue = null;

        if( !this.disabled )
        {
            wValue = document.createElement( 'input' );
            wValue.className = "lextext " + ( options.inputClass ?? "" );
            wValue.type = options.type || "";
            wValue.value = value || "";
            wValue.style.textAlign = ( options.float ?? "" );

            wValue.setAttribute( "placeholder", options.placeholder ?? "" );

            if( options.required )
            {
                wValue.setAttribute( "required", options.required );
            }

            if( options.pattern )
            {
                wValue.setAttribute( "pattern", options.pattern );
            }

            const trigger = options.trigger ?? "default";

            if( trigger == "default" )
            {
                wValue.addEventListener( "keyup", e => {
                    if( e.key == "Enter" )
                    {
                        wValue.blur();
                    }
                });

                wValue.addEventListener( "focusout", e => {
                    this.set( e.target.value, false, e );
                });
            }
            else if( trigger == "input" )
            {
                wValue.addEventListener("input", e => {
                    this.set( e.target.value, false, e );
                });
            }

            wValue.addEventListener( "mousedown", function( e ){
                e.stopImmediatePropagation();
                e.stopPropagation();
            });

            if( options.icon )
            {
                wValue.style.paddingLeft = "1.75rem";
                const icon = LX.makeIcon( options.icon, { iconClass: "absolute z-1 ml-2", svgClass: "sm" } );
                container.appendChild( icon );
            }

        }
        else if( options.url )
        {
            wValue = document.createElement( 'a' );
            wValue.href = options.url;
            wValue.target = "_blank";
            wValue.innerHTML = value ?? "";
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow";
        }
        else
        {
            wValue = document.createElement( 'input' );
            wValue.disabled = true;
            wValue.value = value;
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow " + ( options.inputClass ?? "" );
        }

        if( options.fit )
        {
            wValue.classList.add( "size-content" );
        }

        Object.assign( wValue.style, options.style ?? {} );
        container.appendChild( wValue );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.TextInput = TextInput;

/**
 * @class TextArea
 * @description TextArea Widget
 */

class TextArea extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.TEXTAREA, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            wValue.value = value = newValue;

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        let container = document.createElement( "div" );
        container.className = "lextextarea";
        container.style.display = "flex";
        this.root.appendChild( container );

        let wValue = document.createElement( "textarea" );
        wValue.value = value ?? "";
        wValue.className = ( options.inputClass ?? "" );
        wValue.style.textAlign = options.float ?? "";
        Object.assign( wValue.style, options.style ?? {} );

        if( options.fitHeight ?? false )
        {
            wValue.classList.add( "size-content" );
        }

        if( !( options.resize ?? true ) )
        {
            wValue.classList.add( "resize-none" );
        }

        container.appendChild( wValue );

        if( options.disabled ?? false )
        {
            this.disabled = true;
            wValue.setAttribute( "disabled", true );
        }

        if( options.placeholder )
        {
            wValue.setAttribute( "placeholder", options.placeholder );
        }

        const trigger = options.trigger ?? "default";

        if( trigger == "default" )
        {
            wValue.addEventListener("keyup", function(e) {
                if( e.key == "Enter" )
                {
                    wValue.blur();
                }
            });

            wValue.addEventListener("focusout", e => {
                this.set( e.target.value, false, e );
            });
        }
        else if( trigger == "input" )
        {
            wValue.addEventListener("input", e => {
                this.set( e.target.value, false, e );
            });
        }

        if( options.icon )
        {
            const icon = LX.makeIcon( options.icon, { iconClass: "absolute z-1 ml-2", svgClass: "sm" } );
            container.appendChild( icon );
        }

        LX.doAsync( () => {
            container.style.height = options.height ?? "";
            this.onResize();
        }, 10 );
    }
}

LX.TextArea = TextArea;

/**
 * @class Button
 * @description Button Widget
 */

class Button extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.BUTTON, name, null, options );

        this.onGetValue = () => {
            const swapInput = wValue.querySelector( "input" );
            return swapInput ? swapInput.checked : value
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( ( options.swap ?? false ) )
            {
                this.root.setState( newValue, skipCallback );
                return;
            }

            // No-swap buttons

            wValue.innerHTML = "";

            if( options.icon )
            {
                const icon = LX.makeIcon( options.icon );
                wValue.prepend( icon );
            }
            else if( options.img )
            {
                let img = document.createElement( 'img' );
                img.src = options.img;
                wValue.prepend( img );
            }
            else
            {
                wValue.innerHTML = `<span>${ ( newValue ?? "" ) }</span>`;
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            wValue.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // In case of swap, set if a change has to be performed
        this.setState = function( v, skipCallback ) {
            const swapInput = wValue.querySelector( "input" );

            if( swapInput )
            {
                swapInput.checked = v;
            }
            else if( options.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( b => { if( b == wValue ) return; b.classList.remove( "selected" ) } );
                }

                wValue.classList.toggle( "selected", v );
            }

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, swapInput ? swapInput.checked : value, null ), callback );
            }
        };

        var wValue = document.createElement( 'button' );
        wValue.title = options.tooltip ? "" : ( options.title ?? "" );
        wValue.className = "lexbutton p-1 " + ( options.buttonClass ?? "" );

        this.root.appendChild( wValue );

        if( options.selected )
        {
            wValue.classList.add( "selected" );
        }

        if( options.img )
        {
            let img = document.createElement( 'img' );
            img.src = options.img;
            wValue.prepend( img );
        }
        else if( options.icon )
        {
            const icon = LX.makeIcon( options.icon, { iconClass: options.iconClass, svgClass: options.svgClass } );
            const iconPosition = options.iconPosition ?? "cover";

            // Default
            if( iconPosition == "cover" || ( options.swap !== undefined ) )
            {
                wValue.prepend( icon );
            }
            else
            {
                wValue.innerHTML = `<span>${ ( value || "" ) }</span>`;

                if( iconPosition == "start" )
                {
                    wValue.querySelector( "span" ).prepend( icon );
                }
                else // "end"
                {
                    wValue.querySelector( "span" ).appendChild( icon );
                }
            }

            wValue.classList.add( "justify-center" );
        }
        else
        {
            wValue.innerHTML = `<span>${ ( value || "" ) }</span>`;
        }

        if( options.fileInput )
        {
            const fileInput = document.createElement( "input" );
            fileInput.type = "file";
            fileInput.className = "file-input";
            fileInput.style.display = "none";
            wValue.appendChild( fileInput );

            fileInput.addEventListener( 'change', function( e ) {
                const files = e.target.files;
                if( !files.length ) return;

                const reader = new FileReader();
                if( options.fileInputType === 'text' ) reader.readAsText( files[ 0 ] );
                else if( options.fileInputType === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( options.fileInputType === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( options.fileInputType === 'url' ) reader.readAsDataURL( files[ 0 ] );
                reader.onload = e => { callback.call( this, e.target.result, files[ 0 ] ); } ;
            });
        }

        if( options.disabled )
        {
            this.disabled = true;
            wValue.setAttribute( "disabled", true );
        }

        let trigger = wValue;

        if( options.swap )
        {
            wValue.classList.add( "swap" );
            wValue.querySelector( "a" ).classList.add( "swap-off" );

            const input = document.createElement( "input" );
            input.className = "p-0 border-0";
            input.type = "checkbox";
            wValue.prepend( input );

            const swapIcon = LX.makeIcon( options.swap, { iconClass: "swap-on" } );
            wValue.appendChild( swapIcon );

            this.swap = function( skipCallback ) {
                const swapInput = wValue.querySelector( "input" );
                swapInput.checked = !swapInput.checked;
                if( !skipCallback )
                {
                    trigger.click();
                }
            };
        }

        trigger.addEventListener( "click", e => {
            if( options.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( b => { if( b == wValue ) return; b.classList.remove( "selected" ) } );
                }

                wValue.classList.toggle('selected');
            }

            if( options.fileInput )
            {
                wValue.querySelector( ".file-input" ).click();
            }
            else
            {
                const swapInput = wValue.querySelector( "input" );
                this._trigger( new LX.IEvent( name, swapInput?.checked ?? value, e ), callback );
            }
        });

        if( options.tooltip )
        {
            LX.asTooltip( wValue, options.title ?? name );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Button = Button;

/**
 * @class ComboButtons
 * @description ComboButtons Widget
 */

class ComboButtons extends Widget {

    constructor( name, values, options = {} ) {

        const shouldSelect = !( options.noSelection ?? false );
        let shouldToggle = shouldSelect && ( options.toggle ?? false );

        let container = document.createElement('div');
        container.className = "lexcombobuttons ";

        options.skipReset = true;

        if( options.float )
        {
            container.className += options.float;
        }

        let currentValue = [];
        let buttonsBox = document.createElement('div');
        buttonsBox.className = "lexcombobuttonsbox ";
        container.appendChild( buttonsBox );

        for( let b of values )
        {
            if( !b.value )
            {
                throw( "Set 'value' for each button!" );
            }

            let buttonEl = document.createElement('button');
            buttonEl.className = "lexbutton combo";
            buttonEl.title = b.icon ? b.value : "";
            buttonEl.id = b.id ?? "";
            buttonEl.dataset["value"] = b.value;

            if( options.buttonClass )
            {
                buttonEl.classList.add( options.buttonClass );
            }

            if( shouldSelect && ( b.selected || options.selected?.includes( b.value ) ) )
            {
                buttonEl.classList.add("selected");
                currentValue = ( currentValue ).concat( [ b.value ] );
            }

            if( b.icon )
            {
                const icon = LX.makeIcon( b.icon );
                buttonEl.appendChild( icon );
            }
            else
            {
                buttonEl.innerHTML = `<span>${ b.value }</span>`;
            }

            if( b.disabled )
            {
                buttonEl.setAttribute( "disabled", true );
            }

            buttonEl.addEventListener("click", e => {

                currentValue = [];

                if( shouldSelect )
                {
                    if( shouldToggle )
                    {
                        buttonEl.classList.toggle( "selected" );
                    }
                    else
                    {
                        container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));
                        buttonEl.classList.add( "selected" );
                    }
                }

                container.querySelectorAll( "button" ).forEach( s => {

                    if( s.classList.contains( "selected" ) )
                    {
                        currentValue.push( s.dataset[ "value" ] );
                    }

                } );

                if( !shouldToggle && currentValue.length > 1 )
                {
                    console.error( `Enable _options.toggle_ to allow selecting multiple options in ComboButtons.` );
                    return;
                }

                currentValue = currentValue[ 0 ];

                this.set( b.value, false, buttonEl.classList.contains( "selected" ) );
            });

            buttonsBox.appendChild( buttonEl );
        }

        if( currentValue.length > 1 )
        {
            if( !shouldToggle )
            {
                options.toggle = true;
                shouldToggle = shouldSelect;
                console.warn( `Multiple options selected in '${ name }' ComboButtons. Enabling _toggle_ mode.` );
            }
        }
        else
        {
            currentValue = currentValue[ 0 ];
        }

        super( Widget.BUTTONS, name, null, options );

        this.onGetValue = () => {
            return currentValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( shouldSelect && ( event == undefined ) )
            {
                container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));

                container.querySelectorAll( "button" ).forEach( s => {
                    if( currentValue && currentValue.indexOf( s.dataset[ "value" ] ) > -1 )
                    {
                        s.classList.add( "selected" );
                    }
                } );
            }

            if( !skipCallback && newValue.constructor != Array )
            {
                const enabled = event;
                const fn = values.filter( v => v.value == newValue )[ 0 ]?.callback;
                this._trigger( new LX.IEvent( name, shouldToggle ? [ newValue, enabled ] : newValue, null ), fn );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this.root.appendChild( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.ComboButtons = ComboButtons;

/**
 * @class Card
 * @description Card Widget
 */

class Card extends Widget {

    constructor( name, options = {} ) {

        options.hideName = true;

        super( Widget.CARD, name, null, options );

        let container = document.createElement('div');
        container.className = "lexcard";
        container.style.width = "100%";
        this.root.appendChild( container );

        if( options.img )
        {
            let img = document.createElement('img');
            img.src = options.img;
            container.appendChild( img );

            if( options.link != undefined )
            {
                img.style.cursor = "pointer";
                img.addEventListener('click', function() {
                    const hLink = container.querySelector('a');
                    if( hLink )
                    {
                        hLink.click();
                    }
                });
            }
        }

        let cardNameDom = document.createElement('span');
        cardNameDom.innerText = name;
        container.appendChild( cardNameDom );

        if( options.link != undefined )
        {
            let cardLinkDom = document.createElement( 'a' );
            cardLinkDom.innerText = name;
            cardLinkDom.href = options.link;
            cardLinkDom.target = options.target ?? "";
            cardNameDom.innerText = "";
            cardNameDom.appendChild( cardLinkDom );
        }

        if( options.callback )
        {
            container.style.cursor = "pointer";
            container.addEventListener("click", ( e ) => {
                this._trigger( new LX.IEvent( name, null, e ), options.callback );
            });
        }
    }
}

LX.Card = Card;

/**
 * @class Form
 * @description Form Widget
 */

class Form extends Widget {

    constructor( name, data, callback, options = {} ) {

        if( data.constructor != Object )
        {
            console.error( "Form data must be an Object" );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        super( Widget.FORM, name, null, options );

        this.onGetValue = () => {
            return container.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            container.formData = newValue;
            const entries = container.querySelectorAll( ".lexwidget" );
            for( let i = 0; i < entries.length; ++i )
            {
                const entry = entries[ i ];
                if( entry.jsInstance.type != LX.Widget.TEXT )
                {
                    continue;
                }
                let entryName = entries[ i ].querySelector( ".lexwidgetname" ).innerText;
                let entryInput = entries[ i ].querySelector( ".lextext input" );
                entryInput.value = newValue[ entryName ] ?? "";
                Widget._dispatchEvent( entryInput, "focusout", skipCallback );
            }
        };

        let container = document.createElement( 'div' );
        container.className = "lexformdata";
        container.style.width = "100%";
        container.formData = {};
        this.root.appendChild( container );

        for( let entry in data )
        {
            let entryData = data[ entry ];

            if( entryData.constructor != Object )
            {
                entryData = { };
                data[ entry ] = entryData;
            }

            entryData.placeholder = entryData.placeholder ?? entry;
            entryData.width = "100%";

            if( !( options.skipLabels ?? false ) )
            {
                const label = new LX.TextInput( null, entry, null, { disabled: true, inputClass: "formlabel nobg" } );
                container.appendChild( label.root );
            }

            entryData.textWidget = new LX.TextInput( null, entryData.constructor == Object ? entryData.value : entryData, ( value ) => {
                container.formData[ entry ] = value;
            }, entryData );
            container.appendChild( entryData.textWidget.root );

            container.formData[ entry ] = entryData.constructor == Object ? entryData.value : entryData;
        }

        const buttonContainer = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", container );

        if( options.secondaryActionName || options.secondaryActionCallback )
        {
            const secondaryButton = new LX.Button( null, options.secondaryActionName ?? "Cancel", ( value, event ) => {
                if( callback )
                {
                    callback( container.formData, event );
                }
            }, { width: "100%", minWidth: "0", buttonClass: options.secondaryButtonClass ?? "primary" } );

            buttonContainer.appendChild( secondaryButton.root );
        }

        const primaryButton = new LX.Button( null, options.primaryActionName ?? "Submit", ( value, event ) => {

            for( let entry in data )
            {
                let entryData = data[ entry ];

                if( !entryData.textWidget.valid() )
                {
                    return;
                }
            }

            if( callback )
            {
                callback( container.formData, event );
            }
        }, { width: "100%", minWidth: "0", buttonClass: options.primaryButtonClass ?? "contrast" } );

        buttonContainer.appendChild( primaryButton.root );
    }
}

LX.Form = Form;

/**
 * @class Select
 * @description Select Widget
 */

class Select extends Widget {

    constructor( name, values, value, callback, options = {} ) {

        super( Widget.SELECT, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;

            let item = null;
            const listOptionsNodes = listOptions.childNodes;
            listOptionsNodes.forEach( e => {
                e.classList.remove( "selected" );
                if( e.getAttribute( "value" ) == newValue )
                {
                    item = e;
                }
            } );

            console.assert( item, `Item ${ newValue } does not exist in the Select.` );
            item.classList.add( "selected" );
            selectedOption.refresh( value );

            // Reset filter
            if( filter )
            {
                filter.root.querySelector( "input" ).value = "";
                const filteredOptions = this._filterOptions( values, "" );
                list.refresh( filteredOptions );
            }

            // Update suboptions menu
            const suboptions = this.root.querySelector( ".lexcustomcontainer" );
            const suboptionsFunc = options[ `on_${ value }` ];
            suboptions.toggleAttribute( "hidden", !suboptionsFunc );

            if( suboptionsFunc )
            {
                suboptions.innerHTML = "";
                const suboptionsPanel = new LX.Panel();
                suboptionsPanel.queue( suboptions );
                suboptionsFunc.call(this, suboptionsPanel);
                suboptionsPanel.clearQueue();
            }

            this.root.dataset["opened"] = ( !!suboptionsFunc );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        let container = document.createElement( "div" );
        container.className = "lexselect";
        this.root.appendChild( container );

        let wValue = document.createElement( 'div' );
        wValue.className = "lexselect lexoption";
        wValue.name = name;
        wValue.iValue = value;

        if( options.overflowContainer )
        {
            options.overflowContainerX = options.overflowContainerY = options.overflowContainer;
        }

        const _placeOptions = ( parent ) => {

            const selectRoot = selectedOption.root;
            const rect = selectRoot.getBoundingClientRect();
            const nestedDialog = parent.parentElement.closest( "dialog" ) ?? parent.parentElement.closest( ".lexcolorpicker" );

            // Manage vertical aspect
            {
                const overflowContainer = options.overflowContainerY ?? parent.getParentArea();
                const listHeight = parent.offsetHeight;
                let topPosition = rect.y;

                let maxY = window.innerHeight;

                if( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxY = parentRect.y + parentRect.height;
                }

                if( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    topPosition -= rect.y;
                    maxY -= rect.y;
                }

                parent.style.top = ( topPosition + selectRoot.offsetHeight ) + 'px';

                const showAbove = ( topPosition + listHeight ) > maxY;
                if( showAbove )
                {
                    parent.style.top = ( topPosition - listHeight ) + 'px';
                    parent.classList.add( "place-above" );
                }
            }

            // Manage horizontal aspect
            {
                const overflowContainer = options.overflowContainerX ?? parent.getParentArea();
                const listWidth = parent.offsetWidth;
                let leftPosition = rect.x;

                parent.style.minWidth = ( rect.width ) + 'px';

                if( nestedDialog )
                {
                    const rect = nestedDialog.getBoundingClientRect();
                    leftPosition -= rect.x;
                }

                parent.style.left = ( leftPosition ) + 'px';

                let maxX = window.innerWidth;

                if( overflowContainer )
                {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxX = parentRect.x + parentRect.width;
                }

                const showLeft = ( leftPosition + listWidth ) > maxX;
                if( showLeft )
                {
                    parent.style.left = ( leftPosition - ( listWidth - rect.width ) ) + 'px';
                }
            }
        };

        let selectedOption = new LX.Button( null, value, ( value, event ) => {
            if( list.unfocus_event )
            {
                delete list.unfocus_event;
                return;
            }

            listDialog.classList.remove( "place-above" );
            const opened = listDialog.hasAttribute( "open" );

            if( !opened )
            {
                listDialog.show();
                _placeOptions( listDialog );
            }
            else
            {
                listDialog.close();
            }

            if( filter )
            {
                filter.root.querySelector( "input" ).focus();
            }

        }, { buttonClass: "array", skipInlineCount: true, disabled: options.disabled } );

        selectedOption.root.style.width = "100%";
        selectedOption.root.querySelector( "span" ).appendChild( LX.makeIcon( "Down", { svgClass: "sm" } ) );

        container.appendChild( selectedOption.root );

        selectedOption.refresh = (v) => {
            const buttonSpan = selectedOption.root.querySelector("span");
            if( buttonSpan.innerText == "" )
            {
                buttonSpan.innerText = v;
            }
            else
            {
                buttonSpan.innerHTML = buttonSpan.innerHTML.replaceAll( buttonSpan.innerText, v );
            }
        }

        // Add select options container

        const listDialog = document.createElement( 'dialog' );
        listDialog.className = "lexselectoptions";

        let list = document.createElement( 'ul' );
        list.tabIndex = -1;
        list.className = "lexoptions";
        listDialog.appendChild( list )

        list.addEventListener( 'focusout', function( e ) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if( e.relatedTarget === selectedOption.root.querySelector( 'button' ) )
            {
                this.unfocus_event = true;
                setTimeout( () => delete this.unfocus_event, 200 );
            }
            else if ( e.relatedTarget && listDialog.contains( e.relatedTarget ) )
            {
                return;
            }
            else if ( e.target.className == 'lexinput-filter' )
            {
                return;
            }
            listDialog.close();
        });

        // Add filter options
        let filter = null;
        if( options.filter ?? false )
        {
            const filterOptions = LX.deepCopy( options );
            filterOptions.placeholder = filterOptions.placeholder ?? "Search...";
            filterOptions.skipWidget = filterOptions.skipWidget ?? true;
            filterOptions.trigger = "input";
            filterOptions.icon = "Search";
            filterOptions.className = "lexfilter";
            filterOptions.inputClass = "outline";

            filter = new LX.TextInput(null, options.filterValue ?? "", ( v ) => {
                const filteredOptions = this._filterOptions( values, v );
                list.refresh( filteredOptions );
            }, filterOptions );
            filter.root.querySelector( ".lextext" ).style.border = "1px solid transparent";

            const input = filter.root.querySelector( "input" );

            input.addEventListener('focusout', function( e ) {
                if (e.relatedTarget && e.relatedTarget.tagName == "UL" && e.relatedTarget.classList.contains("lexoptions"))
                {
                    return;
                }
                listDialog.close();
            });

            list.appendChild( filter.root );
        }

        // Create option list to empty it easily..
        const listOptions = document.createElement('span');
        listOptions.className = "lexselectinnerlist";
        list.appendChild( listOptions );

        // Add select options list
        list.refresh = ( currentOptions ) => {

            // Empty list
            listOptions.innerHTML = "";

            if( !currentOptions.length )
            {
                let iValue = options.emptyMsg ?? "No options found.";

                let option = document.createElement( "div" );
                option.className = "option";
                option.innerHTML = iValue;

                let li = document.createElement( "li" );
                li.className = "lexselectitem empty";
                li.appendChild( option );

                listOptions.appendChild( li );
                return;
            }

            for( let i = 0; i < currentOptions.length; i++ )
            {
                let iValue = currentOptions[ i ];
                let li = document.createElement( "li" );
                let option = document.createElement( "div" );
                option.className = "option";
                li.appendChild( option );

                const onSelect = e => {
                    this.set( e.currentTarget.getAttribute( "value" ), false, e );
                    listDialog.close();
                };

                li.addEventListener( "click", onSelect );

                // Add string option
                if( iValue.constructor != Object )
                {
                    const asLabel = ( iValue[ 0 ] === '@' );

                    if( !asLabel )
                    {
                        option.innerHTML = `<span>${ iValue }</span>`;
                        option.appendChild( LX.makeIcon( "Check" ) )
                        option.value = iValue;
                        li.setAttribute( "value", iValue );

                        if( iValue == value )
                        {
                            li.classList.add( "selected" );
                            wValue.innerHTML = iValue;
                        }
                    }
                    else
                    {
                        option.innerHTML = "<span>" + iValue.substr( 1 ) + "</span>";
                        li.removeEventListener( "click", onSelect );
                    }

                    li.classList.add( asLabel ? "lexselectlabel" : "lexselectitem" );
                }
                else
                {
                    // Add image option
                    let img = document.createElement( "img" );
                    img.src = iValue.src;
                    li.setAttribute( "value", iValue.value );
                    li.className = "lexlistitem";
                    option.innerText = iValue.value;
                    option.className += " media";
                    option.prepend( img );

                    option.setAttribute( "value", iValue.value );
                    option.setAttribute( "data-index", i );
                    option.setAttribute( "data-src", iValue.src );
                    option.setAttribute( "title", iValue.value );

                    if( value == iValue.value )
                    {
                        li.classList.add( "selected" );
                    }
                }

                listOptions.appendChild( li );
            }
        }

        list.refresh( values );

        container.appendChild( listDialog );

        // Element suboptions
        let suboptions = document.createElement( "div" );
        suboptions.className = "lexcustomcontainer w-full";

        const suboptionsFunc = options[ `on_${ value }` ];
        suboptions.toggleAttribute( "hidden", !suboptionsFunc );

        if( suboptionsFunc )
        {
            suboptions.innerHTML = "";
            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            suboptionsFunc.call( this, suboptionsPanel );
            suboptionsPanel.clearQueue();
        }

        this.root.appendChild( suboptions );
        this.root.dataset["opened"] = ( !!suboptionsFunc );

        LX.doAsync( this.onResize.bind( this ) );
    }

    _filterOptions( options, value ) {

        // Push to right container
        const emptyFilter = !value.length;
        let filteredOptions = [];

        // Add widgets
        for( let i = 0; i < options.length; i++ )
        {
            let o = options[ i ];
            if( !emptyFilter )
            {
                let toCompare = ( typeof o == 'string' ) ? o : o.value;
                const filterWord = value.toLowerCase();
                const name = toCompare.toLowerCase();
                if( !name.includes( filterWord ) ) continue;
            }

            filteredOptions.push( o );
        }

        return filteredOptions;
    }
}

LX.Select = Select;

/**
 * @class Curve
 * @description Curve Widget
 */

class Curve extends Widget {

    constructor( name, values, callback, options = {} ) {

        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( Widget.CURVE, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse(JSON.stringify( curveInstance.element.value ));
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, curveInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = (v, e) => {
            this._trigger( new LX.IEvent( name, v, e ), callback );
        };

        options.name = name;

        let curveInstance = new LX.CanvasCurve( values, options );
        container.appendChild( curveInstance.element );
        this.curveInstance = curveInstance;

        const observer = new ResizeObserver( entries => {
            for ( const entry of entries )
            {
                curveInstance.canvas.width = entry.contentRect.width;
                curveInstance.redraw();
            }
        });

        observer.observe( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Curve = Curve;

/**
 * @class Dial
 * @description Dial Widget
 */

class Dial extends Widget {

    constructor( name, values, callback, options = {} ) {

        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( Widget.DIAL, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse( JSON.stringify( dialInstance.element.value ) );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            dialInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            dialInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, dialInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
            LX.flushCss( container );
            dialInstance.element.style.height = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = ( v, e ) => {
            this._trigger( new LX.IEvent( name, v, e ), callback );
        };

        options.name = name;

        let dialInstance = new LX.CanvasDial( this, values, options );
        container.appendChild( dialInstance.element );
        this.dialInstance = dialInstance;

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Dial = Dial;

/**
 * @class Layers
 * @description Layers Widget
 */

class Layers extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.LAYERS, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;
            this.setLayers( value );
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent(name, value, event), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexlayers";
        this.root.appendChild( container );

        this.setLayers = ( val ) =>  {

            container.innerHTML = "";

            let binary = val.toString( 2 );
            let nbits = binary.length;

            // fill zeros
            for( let i = 0; i < ( 16 - nbits ); ++i )
            {
                binary = '0' + binary;
            }

            for( let bit = 0; bit < 16; ++bit )
            {
                let layer = document.createElement( "div" );
                layer.className = "lexlayer";

                if( val != undefined )
                {
                    const valueBit = binary[ 16 - bit - 1 ];
                    if( valueBit != undefined && valueBit == '1' )
                    {
                        layer.classList.add( "selected" );
                    }
                }

                layer.innerText = bit + 1;
                layer.title = "Bit " + bit + ", value " + (1 << bit);
                container.appendChild( layer );

                layer.addEventListener( "click", e => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.target.classList.toggle( "selected" );
                    const newValue = val ^ ( 1 << bit );
                    this.set( newValue, false, e );
                } );
            }
        };

        this.setLayers( value );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Layers = Layers;

/**
 * @class ItemArray
 * @description ItemArray Widget
 */

class ItemArray extends Widget {

    constructor( name, values = [], callback, options = {} ) {

        options.nameWidth = "100%";

        super( Widget.ARRAY, name, null, options );

        this.onGetValue = () => {
            return values;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            values = newValue;
            this._updateItems();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, values, event ), callback );
            }
        };

        // Add open array button

        let container = document.createElement( "div" );
        container.className = "lexarray";
        container.style.width = "100%";
        this.root.appendChild( container );
        this.root.dataset["opened"] = false;

        let buttonName = `Array (size ${ values.length })`;

        const toggleButton = new LX.Button(null, buttonName, () => {
            this.root.dataset["opened"] = this.root.dataset["opened"] == "true" ? false : true;
            this.root.querySelector(".lexarrayitems").toggleAttribute( "hidden" );
        }, { buttonClass: "array" });
        toggleButton.root.querySelector( "span" ).appendChild( LX.makeIcon( "Down", { svgClass: "sm" } ) );
        container.appendChild( toggleButton.root );

        // Show elements

        let arrayItems = document.createElement( "div" );
        arrayItems.className = "lexarrayitems";
        arrayItems.toggleAttribute( "hidden",  true );
        this.root.appendChild( arrayItems );

        this._updateItems = () => {

            // Update num items
            let buttonSpan = this.root.querySelector(".lexbutton.array span");
            for( let node of buttonSpan.childNodes )
            {
                if ( node.nodeType === Node.TEXT_NODE ) { node.textContent = `Array (size ${ values.length })`; break; }
            }

            // Update inputs
            arrayItems.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                const value = values[ i ];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let widget = null;

                switch( baseclass  )
                {
                    case String:
                        widget = new LX.TextInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case Number:
                        widget = new NumberInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case 'select':
                        widget = new Select(i + "", options.innerValues, value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                }

                console.assert( widget, `Value of type ${ baseclass } cannot be modified in ItemArray` );

                arrayItems.appendChild( widget.root );

                const removeWidget = new LX.Button( null, "", ( v, event) => {
                    values.splice( values.indexOf( value ), 1 );
                    this._updateItems();
                    this._trigger( new LX.IEvent(name, values, event), callback );
                }, { title: "Remove item", icon: "Trash3"} );

                widget.root.appendChild( removeWidget.root );
            }

            const addButton = new LX.Button(null, LX.makeIcon( "Plus", { svgClass: "sm" } ).innerHTML + "Add item", (v, event) => {
                values.push( options.innerValues ? options.innerValues[ 0 ] : "" );
                this._updateItems();
                this._trigger( new LX.IEvent(name, values, event), callback );
            }, { buttonClass: 'array' });

            arrayItems.appendChild( addButton.root );
        };

        this._updateItems();
    }
}

LX.ItemArray = ItemArray;

/**
 * @class List
 * @description List Widget
 */

class List extends Widget {

    constructor( name, values, value, callback, options = {} ) {

        super( Widget.LIST, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );

            let idx = null;
            for( let i = 0; i < values.length; ++i )
            {
                const v = values[ i ];
                if( v == newValue || ( ( v.constructor == Array ) && ( v[ 0 ] == newValue ) ) )
                {
                    idx = i;
                    break;
                }
            }

            if( !idx )
            {
                console.error( `Cannot find item ${ newValue } in List.` );
                return;
            }

            listContainer.children[ idx ].classList.toggle( 'selected' );
            value = newValue;

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            listContainer.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this._updateValues = ( newValues ) => {

            values = newValues;
            listContainer.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let itemValue = values[ i ];

                if( itemValue.constructor === Array )
                {
                    icon = itemValue[ 1 ];
                    itemValue = itemValue[ 0 ];
                }

                let listElement = document.createElement( 'div' );
                listElement.className = "lexlistitem" + ( value == itemValue ? " selected" : "" );

                if( icon )
                {
                    listElement.appendChild( LX.makeIcon( icon ) );
                }

                listElement.innerHTML += `<span>${ itemValue }</span>`;

                listElement.addEventListener( 'click', e => {
                    listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );
                    listElement.classList.toggle( 'selected' );
                    value = itemValue;
                    this._trigger( new LX.IEvent( name, itemValue, e ), callback );
                });

                listContainer.appendChild( listElement );
            }
        };

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = "lexlist";
        this.root.appendChild( listContainer );

        this._updateValues( values );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.List = List;

/**
 * @class Tags
 * @description Tags Widget
 */

class Tags extends Widget {

    constructor( name, value, callback, options = {} ) {

        value = value.replace( /\s/g, '' ).split( ',' );

        let defaultValue = [].concat( value );
        super( Widget.TAGS, name, defaultValue, options );

        this.onGetValue = () => {
            return [].concat( value );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = [].concat( newValue );
            this.generateTags( value );
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            tagsContainer.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // Show tags

        const tagsContainer = document.createElement('div');
        tagsContainer.className = "lextags";
        this.root.appendChild( tagsContainer );

        this.generateTags = ( value ) => {

            tagsContainer.innerHTML = "";

            for( let i = 0; i < value.length; ++i )
            {
                const tagName = value[ i ];
                const tag = document.createElement('span');
                tag.className = "lextag";
                tag.innerHTML = tagName;

                const removeButton = LX.makeIcon( "X", { svgClass: "sm" } );
                tag.appendChild( removeButton );

                removeButton.addEventListener( 'click', e => {
                    tag.remove();
                    value.splice( value.indexOf( tagName ), 1 );
                    this.set( value, false, e );
                } );

                tagsContainer.appendChild( tag );
            }

            let tagInput = document.createElement( 'input' );
            tagInput.value = "";
            tagInput.placeholder = "Add tag...";
            tagsContainer.appendChild( tagInput );

            tagInput.onkeydown = e => {
                const val = tagInput.value.replace( /\s/g, '' );
                if( e.key == ' ' || e.key == 'Enter' )
                {
                    e.preventDefault();
                    if( !val.length || value.indexOf( val ) > -1 )
                        return;
                    value.push( val );
                    this.set( value, false, e );
                }
            };

            tagInput.focus();
        }

        this.generateTags( value );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Tags = Tags;

/**
 * @class Checkbox
 * @description Checkbox Widget
 */

class Checkbox extends Widget {

    constructor( name, value, callback, options = {} ) {

        if( !name && !options.label )
        {
            throw( "Set Widget Name or at least a label!" );
        }

        super( Widget.CHECKBOX, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( newValue == value )
            {
                return;
            }

            checkbox.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( ".lexcheckboxsubmenu" )?.toggleAttribute( 'hidden', !newValue );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcheckboxcont";
        this.root.appendChild( container );

        let checkbox = document.createElement( "input" );
        checkbox.type = "checkbox";
        checkbox.className = "lexcheckbox " + ( options.className ?? "primary" );
        checkbox.checked = value;
        checkbox.disabled = options.disabled ?? false;
        container.appendChild( checkbox );

        let valueName = document.createElement( "span" );
        valueName.className = "checkboxtext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild( valueName );

        checkbox.addEventListener( "change" , e => {
            this.set( checkbox.checked, false, e );
        });

        if( options.suboptions )
        {
            let suboptions = document.createElement( "div" );
            suboptions.className = "lexcheckboxsubmenu";
            suboptions.toggleAttribute( "hidden", !checkbox.checked );

            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Checkbox = Checkbox;

/**
 * @class Toggle
 * @description Toggle Widget
 */

class Toggle extends Widget {

    constructor( name, value, callback, options = {} ) {

        if( !name && !options.label )
        {
            throw( "Set Widget Name or at least a label!" );
        }

        super( Widget.TOGGLE, name, value, options );

        this.onGetValue = () => {
            return toggle.checked;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( newValue == value )
            {
                return;
            }

            toggle.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( ".lextogglesubmenu" )?.toggleAttribute( 'hidden', !newValue );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement('div');
        container.className = "lextogglecont";
        this.root.appendChild( container );

        let toggle = document.createElement('input');
        toggle.type = "checkbox";
        toggle.className = "lextoggle " + ( options.className ?? "" );
        toggle.checked = value;
        toggle.iValue = value;
        toggle.disabled = options.disabled ?? false;
        container.appendChild( toggle );

        let valueName = document.createElement( 'span' );
        valueName.className = "toggletext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild( valueName );

        toggle.addEventListener( "change" , e => {
            this.set( toggle.checked, false, e );
        });

        if( options.suboptions )
        {
            let suboptions = document.createElement('div');
            suboptions.className = "lextogglesubmenu";
            suboptions.toggleAttribute( 'hidden', !toggle.checked );

            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Toggle = Toggle;

/**
 * @class RadioGroup
 * @description RadioGroup Widget
 */

class RadioGroup extends Widget {

    constructor( name, label, values, callback, options = {} ) {

        super( Widget.RADIO, name, null, options );

        let currentIndex = null;

        this.onGetValue = () => {
            const items = container.querySelectorAll( 'button' );
            return currentIndex ? [ currentIndex, items[ currentIndex ] ] : undefined;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            newValue = newValue[ 0 ] ?? newValue; // Allow getting index of { index, value } tupple

            console.assert( newValue.constructor == Number, "RadioGroup _value_ must be an Array index!" );

            const items = container.querySelectorAll( 'button' );
            items.forEach( b => { b.checked = false; b.classList.remove( "checked" ) } );

            const optionItem = items[ newValue ];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle( "checked" );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( null, [ newValue, values[ newValue ] ], event ), callback );
            }
        };

        var container = document.createElement( 'div' );
        container.className = "lexradiogroup " + ( options.className ?? "" );
        this.root.appendChild( container );

        let labelSpan = document.createElement( 'span' );
        labelSpan.innerHTML = label;
        container.appendChild( labelSpan );

        for( let i = 0; i < values.length; ++i )
        {
            const optionItem = document.createElement( 'div' );
            optionItem.className = "lexradiogroupitem";
            container.appendChild( optionItem );

            const optionButton = document.createElement( 'button' );
            optionButton.className = "flex p-0 rounded-lg cursor-pointer";
            optionButton.disabled = options.disabled ?? false;
            optionItem.appendChild( optionButton );

            optionButton.addEventListener( "click", ( e ) => {
                this.set( i, false, e );
            } );

            const checkedSpan = document.createElement( 'span' );
            optionButton.appendChild( checkedSpan );

            const optionLabel = document.createElement( 'span' );
            optionLabel.innerHTML = values[ i ];
            optionItem.appendChild( optionLabel );
        }

        if( options.selected )
        {
            console.assert( options.selected.constructor == Number, "RadioGroup _selected_ must be an Array index!" );
            currentIndex = options.selected;
            this.set( currentIndex, true );
        }
    }
}

LX.RadioGroup = RadioGroup;

/**
 * @class ColorInput
 * @description ColorInput Widget
 */

class ColorInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        value = value ?? "#000000";

        const useAlpha = options.useAlpha ??
            ( ( value.constructor === Object && 'a' in value ) || ( value.constructor === String && [ 5, 9 ].includes( value.length ) ) );

        const widgetColor = new LX.Color( value );

        // Force always hex internally
        value = useAlpha ? widgetColor.hex : widgetColor.hex.substr( 0, 7 );

        super( Widget.COLOR, name, value, options );

        this.onGetValue = () => {
            const currentColor = new LX.Color( value );
            return options.useRGB ? currentColor.rgb : value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            const newColor = new LX.Color( newValue );

            colorSampleRGB.style.color = value = newColor.hex.substr( 0, 7 );

            if( useAlpha )
            {
                colorSampleAlpha.style.color = value = newColor.hex;
            }

            if( !this._skipTextUpdate )
            {
                textWidget.set( value, true, event );
            }

            if( !skipCallback )
            {
                let retValue = value;

                if( options.useRGB )
                {
                    retValue = newColor.rgb;

                    if( !useAlpha )
                    {
                        delete retValue.a;
                    }
                }

                this._trigger( new LX.IEvent( name, retValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'span' );
        container.className = "lexcolor";
        this.root.appendChild( container );

        this.picker = new LX.ColorPicker( value, {
            colorModel: options.useRGB ? "RGB" : "Hex",
            useAlpha,
            onChange: ( color ) => {
                this._fromColorPicker = true;
                this.set( color.hex );
                delete this._fromColorPicker;
            }
        } );

        let sampleContainer = LX.makeContainer( ["18px", "18px"], "flex flex-row bg-contrast rounded overflow-hidden", "", container );
        sampleContainer.tabIndex = "1";
        sampleContainer.addEventListener( "click", e => {
            if( ( options.disabled ?? false ) )
            {
                return;
            }

            this._popover = new LX.Popover( sampleContainer, [ this.picker ] );
        } );

        let colorSampleRGB = document.createElement( 'div' );
        colorSampleRGB.className = "lexcolorsample";
        colorSampleRGB.style.color = value;
        sampleContainer.appendChild( colorSampleRGB );

        let colorSampleAlpha = null;

        if( useAlpha )
        {
            colorSampleAlpha = document.createElement( 'div' );
            colorSampleAlpha.className = "lexcolorsample";
            colorSampleAlpha.style.color = value;
            sampleContainer.appendChild( colorSampleAlpha );
        }
        else
        {
            colorSampleRGB.style.width = "18px";
        }

        const textWidget = new LX.TextInput( null, value, v => {
            this._skipTextUpdate = true;
            this.set( v );
            delete this._skipTextUpdate;
        }, { width: "calc( 100% - 24px )", disabled: options.disabled });

        textWidget.root.style.marginLeft = "6px";
        container.appendChild( textWidget.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.ColorInput = ColorInput;

/**
 * @class RangeInput
 * @description RangeInput Widget
 */

class RangeInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.RANGE, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( isNaN( newValue ) )
            {
                return;
            }

            slider.value = value = LX.clamp( +newValue, +slider.min, +slider.max );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, options.left ? ( ( +slider.max ) - value + ( +slider.min ) ) : value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement( 'div' );
        container.className = "lexrange";
        this.root.appendChild( container );

        let slider = document.createElement( 'input' );
        slider.className = "lexrangeslider " + ( options.className ?? "" );
        slider.min = options.min ?? 0;
        slider.max = options.max ?? 100;
        slider.step = options.step ?? 1;
        slider.type = "range";
        slider.disabled = options.disabled ?? false;

        if( value.constructor == Number )
        {
            value = LX.clamp( value, +slider.min, +slider.max );
        }

        if( options.left )
        {
            value = ( ( +slider.max ) - value + ( +slider.min ) );
        }

        slider.value = value;
        container.appendChild( slider );

        if( options.left ?? false )
        {
            slider.classList.add( "left" );
        }

        if( !( options.fill ?? true ) )
        {
            slider.classList.add( "no-fill" );
        }

        slider.addEventListener( "input", e => {
            this.set( e.target.valueAsNumber, false, e );
        }, { passive: false });

        slider.addEventListener( "mousedown", function( e ) {
            if( options.onPress )
            {
                options.onPress.bind( slider )( e, slider );
            }
        }, false );

        slider.addEventListener( "mouseup", function( e ) {
            if( options.onRelease )
            {
                options.onRelease.bind( slider )( e, slider );
            }
        }, false );

        // Method to change min, max, step parameters
        this.setLimits = ( newMin, newMax, newStep ) => {
            slider.min = newMin ?? slider.min;
            slider.max = newMax ?? slider.max;
            slider.step = newStep ?? slider.step;
            Widget._dispatchEvent( slider, "input", true );
        };

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.RangeInput = RangeInput;

/**
 * @class NumberInput
 * @description NumberInput Widget
 */

class NumberInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.NUMBER, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( isNaN( newValue ) )
            {
                return;
            }

            value = LX.clamp( +newValue, +vecinput.min, +vecinput.max );
            vecinput.value = value = LX.round( value, options.precision );

            // Update slider!
            if( box.querySelector( ".lexinputslider" ) )
            {
                box.querySelector( ".lexinputslider" ).value = value;
            }

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexnumber";
        this.root.appendChild( container );

        let box = document.createElement( 'div' );
        box.className = "numberbox";
        container.appendChild( box );

        let valueBox = LX.makeContainer( [ "auto", "100%" ], "relative flex flex-row cursor-text", "", box );

        let vecinput = document.createElement( 'input' );
        vecinput.id = "number_" + LX.guidGenerator();
        vecinput.className = "vecinput";
        vecinput.min = options.min ?? -1e24;
        vecinput.max = options.max ?? 1e24;
        vecinput.step = options.step ?? "any";
        vecinput.type = "number";

        if( value.constructor == Number )
        {
            value = LX.clamp( value, +vecinput.min, +vecinput.max );
            value = LX.round( value, options.precision );
        }

        vecinput.value = vecinput.iValue = value;
        valueBox.appendChild( vecinput );

        const dragIcon = LX.makeIcon( "MoveVertical", { iconClass: "drag-icon hidden-opacity", svgClass: "sm" } );
        valueBox.appendChild( dragIcon );

        if( options.units )
        {
            let unitBox = LX.makeContainer( [ "auto", "auto" ], "px-2 bg-secondary content-center", options.units, valueBox, { "word-break": "keep-all" } );
            vecinput.unitBox = unitBox;
        }

        if( options.disabled )
        {
            this.disabled = vecinput.disabled = true;
        }

        // Add slider below
        if( !options.skipSlider && options.min !== undefined && options.max !== undefined )
        {
            let sliderBox = LX.makeContainer( [ "100%", "auto" ], "", "", box );
            let slider = document.createElement( 'input' );
            slider.className = "lexinputslider";
            slider.min = options.min;
            slider.max = options.max;
            slider.step = options.step ?? 1;
            slider.type = "range";
            slider.value = value;
            slider.disabled = this.disabled;

            slider.addEventListener( "input", ( e ) => {
                this.set( slider.valueAsNumber, false, e );
            }, false );

            slider.addEventListener( "mousedown", function( e ) {
                if( options.onPress )
                {
                    options.onPress.bind( slider )( e, slider );
                }
            }, false );

            slider.addEventListener( "mouseup", function( e ) {
                if( options.onRelease )
                {
                    options.onRelease.bind( slider )( e, slider );
                }
            }, false );

            sliderBox.appendChild( slider );

            // Method to change min, max, step parameters
            this.setLimits = ( newMin, newMax, newStep ) => {
                vecinput.min = slider.min = newMin ?? vecinput.min;
                vecinput.max = slider.max = newMax ?? vecinput.max;
                vecinput.step = newStep ?? vecinput.step;
                slider.step = newStep ?? slider.step;
                this.set( value, true );
            };
        }

        vecinput.addEventListener( "input", function( e ) {
            value = +this.valueAsNumber;
            value = LX.round( value, options.precision );
        }, false );

        vecinput.addEventListener( "wheel", e => {
            e.preventDefault();
            if( vecinput !== document.activeElement )
            {
                return;
            }
            let mult = options.step ?? 1;
            if( e.shiftKey ) mult *= 10;
            else if( e.altKey ) mult *= 0.1;
            value = ( +vecinput.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ) );
            this.set( value, false, e );
        }, { passive: false });

        vecinput.addEventListener( "change", e => {
            this.set( vecinput.valueAsNumber, false, e );
        }, { passive: false });

        // Add drag input

        var that = this;

        let innerMouseDown = e => {

            if( ( document.activeElement == vecinput ) || ( e.button != LX.MOUSE_LEFT_CLICK ) )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'noevents' );
            dragIcon.classList.remove( 'hidden-opacity' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            if( !document.pointerLockElement )
            {
                valueBox.requestPointerLock();
            }

            if( options.onPress )
            {
                options.onPress.bind( vecinput )( e, vecinput );
            }
        }

        let innerMouseMove = e => {

            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if( e.shiftKey ) mult *= 10;
                else if( e.altKey ) mult *= 0.1;
                value = ( +vecinput.valueAsNumber + mult * dt );
                this.set( value, false, e );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        let innerMouseUp = e => {

            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'noevents' );
            dragIcon.classList.add( 'hidden-opacity' );

            if( document.pointerLockElement )
            {
                document.exitPointerLock();
            }

            if( options.onRelease )
            {
                options.onRelease.bind( vecinput )( e, vecinput );
            }
        }

        valueBox.addEventListener( "mousedown", innerMouseDown );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.NumberInput = NumberInput;

/**
 * @class Vector
 * @description Vector Widget
 */

class Vector extends Widget {

    constructor( numComponents, name, value, callback, options = {} ) {

        numComponents = LX.clamp( numComponents, 2, 4 );
        value = value ?? new Array( numComponents ).fill( 0 );

        super( Widget.VECTOR, name, [].concat( value ), options );

        this.onGetValue = () => {
            let inputs = this.root.querySelectorAll( "input[type='number']" );
            let value = [];
            for( var v of inputs )
            {
                value.push( +v.value );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( vectorInputs.length != newValue.length )
            {
                console.error( "Input length does not match vector length." );
                return;
            }

            for( let i = 0; i < vectorInputs.length; ++i )
            {
                let value = newValue[ i ];
                value = LX.clamp( value, +vectorInputs[ i ].min, +vectorInputs[ i ].max );
                value = LX.round( value, options.precision ) ?? 0;
                vectorInputs[ i ].value = newValue[ i ] = value;
            }

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const vectorInputs = [];

        var container = document.createElement( 'div' );
        container.className = "lexvector";
        this.root.appendChild( container );

        this.disabled = ( options.disabled ?? false );
        const that = this;

        for( let i = 0; i < numComponents; ++i )
        {
            let box = document.createElement( 'div' );
            box.className = "vecbox";
            box.innerHTML = "<span class='" + LX.Panel.VECTOR_COMPONENTS[ i ] + "'></span>";

            let vecinput = document.createElement( 'input' );
            vecinput.className = "vecinput v" + numComponents;
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "vec" + numComponents + "_" + LX.guidGenerator();
            vecinput.idx = i;
            vectorInputs[ i ] = vecinput;
            box.appendChild( vecinput );

            if( value[ i ].constructor == Number )
            {
                value[ i ] = LX.clamp( value[ i ], +vecinput.min, +vecinput.max );
                value[ i ] = LX.round( value[ i ], options.precision );
            }

            vecinput.value = vecinput.iValue = value[ i ];

            const dragIcon = LX.makeIcon( "MoveVertical", { iconClass: "drag-icon hidden-opacity", svgClass: "sm" } );
            box.appendChild( dragIcon );

            if( this.disabled )
            {
                vecinput.disabled = true;
            }

            // Add wheel input
            vecinput.addEventListener( "wheel", function( e ) {
                e.preventDefault();
                if( this !== document.activeElement )
                    return;
                let mult = options.step ?? 1;
                if( e.shiftKey ) mult = 10;
                else if( e.altKey ) mult = 0.1;

                if( lockerButton.locked )
                {
                    for( let v of that.querySelectorAll(".vecinput") )
                    {
                        v.value = LX.round( +v.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                        Widget._dispatchEvent( v, "change" );
                    }
                }
                else
                {
                    this.value = LX.round( +this.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                    Widget._dispatchEvent( vecinput, "change" );
                }
            }, { passive: false } );

            vecinput.addEventListener( "change", e => {

                if( isNaN( e.target.value ) )
                {
                    return;
                }

                let val = LX.clamp( e.target.value, +vecinput.min, +vecinput.max );
                val = LX.round( val, options.precision );

                if( lockerButton.locked )
                {
                    for( let v of vectorInputs )
                    {
                        v.value = val;
                        value[ v.idx ] = val;
                    }
                }
                else
                {
                    vecinput.value = val;
                    value[ e.target.idx ] = val;
                }

                this.set( value, false, e );
            }, false );

            // Add drag input

            function innerMouseDown( e )
            {
                if( ( document.activeElement == vecinput ) || ( e.button != LX.MOUSE_LEFT_CLICK ) )
                {
                    return;
                }

                var doc = that.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                dragIcon.classList.remove( 'hidden-opacity' );
                e.stopImmediatePropagation();
                e.stopPropagation();

                if( !document.pointerLockElement )
                {
                    box.requestPointerLock();
                }

                if( options.onPress )
                {
                    options.onPress.bind( vecinput )( e, vecinput );
                }
            }

            function innerMouseMove( e )
            {
                let dt = -e.movementY;

                if ( dt != 0 )
                {
                    let mult = options.step ?? 1;
                    if( e.shiftKey ) mult = 10;
                    else if( e.altKey ) mult = 0.1;

                    if( lockerButton.locked )
                    {
                        for( let v of that.root.querySelectorAll( ".vecinput" ) )
                        {
                            v.value = LX.round( +v.valueAsNumber + mult * dt, options.precision );
                            Widget._dispatchEvent( v, "change" );
                        }
                    }
                    else
                    {
                        vecinput.value = LX.round( +vecinput.valueAsNumber + mult * dt, options.precision );
                        Widget._dispatchEvent( vecinput, "change" );
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            function innerMouseUp( e )
            {
                var doc = that.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                dragIcon.classList.add('hidden-opacity');

                if( document.pointerLockElement )
                {
                    document.exitPointerLock();
                }

                if( options.onRelease )
                {
                    options.onRelease.bind( vecinput )( e, vecinput );
                }
            }

            box.addEventListener( "mousedown", innerMouseDown );
            container.appendChild( box );
        }

        // Method to change min, max, step parameters
        if( options.min !== undefined || options.max !== undefined )
        {
            this.setLimits = ( newMin, newMax, newStep ) => {
                for( let v of vectorInputs )
                {
                    v.min = newMin ?? v.min;
                    v.max = newMax ?? v.max;
                    v.step = newStep ?? v.step;
                }

                this.set( value, true );
            };
        }

        const lockerButton = new LX.Button( null, "", (swapValue) => {
            lockerButton.locked = swapValue;
        }, { title: "Lock", icon: "LockOpen", swap: "Lock", buttonClass: "bg-none p-0" } );
        container.appendChild( lockerButton.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Vector = Vector;

/**
 * @class SizeInput
 * @description SizeInput Widget
 */

class SizeInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.SIZE, name, value, options );

        this.onGetValue = () => {
            const value = [];
            for( let i = 0; i < this.root.dimensions.length; ++i )
            {
                value.push( this.root.dimensions[ i ].value() );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            for( let i = 0; i < this.root.dimensions.length; ++i )
            {
                this.root.dimensions[ i ].set( newValue[ i ], skipCallback );
            }
        };

        this.root.aspectRatio = ( value.length == 2 ? value[ 0 ] / value[ 1 ] : null );
        this.root.dimensions = [];

        for( let i = 0; i < value.length; ++i )
        {
            const p = new LX.Panel();
            this.root.dimensions[ i ] = p.addNumber( null, value[ i ], ( v ) => {

                const value = this.value();

                if( this.root.locked )
                {
                    const ar = ( i == 0 ? 1.0 / this.root.aspectRatio : this.root.aspectRatio );
                    const index = ( 1 + i ) % 2;
                    value[ index ] = v * ar;
                    this.root.dimensions[ index ].set( value[ index ], true );
                }

                if( callback )
                {
                    callback( value );
                }

            }, { min: 0, disabled: options.disabled, precision: options.precision, className: "flex-fill" } );

            this.root.appendChild( this.root.dimensions[ i ].root );

            if( ( i + 1 ) != value.length )
            {
                const xIcon = LX.makeIcon( "X", { svgClass: "fg-accent font-bold" } );
                this.root.appendChild( xIcon );
            }
        }

        if( options.units )
        {
            let unitSpan = document.createElement( 'span' );
            unitSpan.className = "select-none fg-tertiary font-medium";
            unitSpan.innerText = options.units;
            this.root.appendChild( unitSpan );
        }

        // Lock aspect ratio
        if( this.root.aspectRatio )
        {
            const lockerButton = new LX.Button( null, "", (swapValue) => {
                this.root.locked = swapValue;
                if( swapValue )
                {
                    // Recompute ratio
                    const value = this.value();
                    this.root.aspectRatio = value[ 0 ] / value[ 1 ];
                }
            }, { title: "Lock Aspect Ratio", icon: "LockOpen", swap: "Lock", buttonClass: "bg-none p-0" } );
            this.root.appendChild( lockerButton.root );
        }
    }
}

LX.SizeInput = SizeInput;

/**
 * @class OTPInput
 * @description OTPInput Widget
 */

class OTPInput extends Widget {

    constructor( name, value, callback, options = {} ) {

        const pattern = options.pattern ?? "xxx-xxx";
        const patternSize = ( pattern.match(/x/g) || [] ).length;

        value = String( value );
        if( !value.length )
        {
            value = "x".repeat( patternSize );
        }

        super( Widget.OTP, name, value, options );

        this.onGetValue = () => {
            return +value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            value = newValue;

            _refreshInput( value );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, +newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this.disabled = options.disabled ?? false;

        const container = document.createElement( 'div' );
        container.className = "lexotp flex flex-row items-center";
        this.root.appendChild( container );

        const groups = pattern.split( '-' );

        const _refreshInput = ( valueString ) => {

            container.innerHTML = "";

            let itemsCount = 0;
            let activeSlot = 0;

            for( let i = 0; i < groups.length; ++i )
            {
                const g = groups[ i ];

                for( let j = 0; j < g.length; ++j )
                {
                    let number = valueString[ itemsCount++ ];
                    number = ( number == 'x' ? '' : number );

                    const slotDom = LX.makeContainer( ["36px", "30px"],
                        "lexotpslot border-top border-bottom border-left px-3 cursor-text select-none font-medium outline-none", number, container );
                    slotDom.tabIndex = "1";

                    if( this.disabled )
                    {
                        slotDom.classList.add( "disabled" );
                    }

                    const otpIndex = itemsCount;

                    if( j == 0 )
                    {
                        slotDom.className += " rounded-l";
                    }
                    else if( j == ( g.length - 1 ) )
                    {
                        slotDom.className += " rounded-r border-right";
                    }

                    slotDom.addEventListener( "click", () => {
                        if( this.disabled ) { return; }
                        container.querySelectorAll( ".lexotpslot" ).forEach( s => s.classList.remove( "active" ) );
                        const activeDom = container.querySelectorAll( ".lexotpslot" )[ activeSlot ];
                        activeDom.classList.add( "active" );
                        activeDom.focus();
                    } );

                    slotDom.addEventListener( "blur", () => {
                        if( this.disabled ) { return; }
                        LX.doAsync( () => {
                            if( container.contains( document.activeElement ) ) { return; }
                            container.querySelectorAll( ".lexotpslot" ).forEach( s => s.classList.remove( "active" ) );
                        }, 10 );
                    } );

                    slotDom.addEventListener( "keyup", e => {
                        if( this.disabled ) { return; }
                        if( !/[^0-9]+/g.test( e.key ) )
                        {
                            const number = e.key;
                            console.assert( parseInt( number ) != NaN );

                            slotDom.innerHTML = number;
                            valueString = valueString.substring( 0, otpIndex - 1 ) + number + valueString.substring( otpIndex );

                            const nexActiveDom = container.querySelectorAll( ".lexotpslot" )[ activeSlot + 1 ];
                            if( nexActiveDom )
                            {
                                container.querySelectorAll( ".lexotpslot" )[ activeSlot ].classList.remove( "active" );
                                nexActiveDom.classList.add( "active" );
                                nexActiveDom.focus();
                                activeSlot++;
                            }
                            else
                            {
                                this.set( valueString );
                            }
                        }
                        else if( e.key == "ArrowLeft" || e.key == "ArrowRight" )
                        {
                            const dt = ( e.key == "ArrowLeft" ) ? -1 : 1;
                            const newActiveDom = container.querySelectorAll( ".lexotpslot" )[ activeSlot + dt ];
                            if( newActiveDom )
                            {
                                container.querySelectorAll( ".lexotpslot" )[ activeSlot ].classList.remove( "active" );
                                newActiveDom.classList.add( "active" );
                                newActiveDom.focus();
                                activeSlot += dt;
                            }
                        }
                        else if( e.key == "Enter" && !valueString.includes( 'x' ) )
                        {
                            this.set( valueString );
                        }
                    } );
                }

                if( i < ( groups.length - 1 ) )
                {
                    LX.makeContainer( ["auto", "auto"], "mx-2", `-`, container );
                }
            }

            console.assert( itemsCount == valueString.length, "OTP Value/Pattern Mismatch!" )
        }

        _refreshInput( value );
    }
}

LX.OTPInput = OTPInput;

/**
 * @class Pad
 * @description Pad Widget
 */

class Pad extends Widget {

    constructor( name, value, callback, options = {} ) {

        super( Widget.PAD, name, null, options );

        this.onGetValue = () => {
            return thumb.value.xy;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, thumb.value.xy ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        this.root.appendChild( container );

        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild( pad );

        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new LX.vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild( thumb );

        let _updateValue = v => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new LX.vec2( LX.remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), LX.remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

        pad.addEventListener( "mousedown", innerMouseDown );

        let that = this;

        function innerMouseDown( e )
        {
            if( document.activeElement == thumb )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'nocursor' );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();
            thumb.classList.add( "active" );

            if( options.onPress )
            {
                options.onPress.bind( thumb )( e, thumb );
            }
        }

        function innerMouseMove( e )
        {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new LX.vec2( e.x - rect.x, e.y - rect.y );
            relativePosition.clp( 0.0, pad.offsetWidth, relativePosition);
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = relativePosition.div( new LX.vec2( pad.offsetWidth, pad.offsetHeight ) );

            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
            thumb.value = new LX.vec2( LX.remapRange( value0to1.x, 0.0, 1.0, thumb.min, thumb.max ), LX.remapRange( value0to1.y, 0.0, 1.0, thumb.min, thumb.max ) );

            that._trigger( new LX.IEvent( name, thumb.value.xy, e ), callback );

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            document.body.classList.remove( 'noevents' );
            thumb.classList.remove( "active" );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        LX.doAsync( () => {
            this.onResize();
            _updateValue( thumb.value )
        } );
    }
}

LX.Pad = Pad;

/**
 * @class Progress
 * @description Progress Widget
 */

class Progress extends Widget {

    constructor( name, value, options = {} ) {

        super( Widget.PROGRESS, name, value, options );

        this.onGetValue = () => {
            return progress.value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            this.root.querySelector("meter").value = newValue;
            _updateColor();
            if( this.root.querySelector("span") )
            {
                this.root.querySelector("span").innerText = newValue;
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lexprogress";
        this.root.appendChild( container );

        // add slider (0-1 if not specified different )

        let progress = document.createElement('meter');
        progress.id = "lexprogressbar-" + name;
        progress.className = "lexprogressbar";
        progress.step = "any";
        progress.min = options.min ?? 0;
        progress.max = options.max ?? 1;
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;
        container.appendChild( progress );

        const _updateColor = () => {

            let backgroundColor = LX.getThemeColor( "global-selected" );

            if( progress.low != undefined && progress.value < progress.low )
            {
                backgroundColor = LX.getThemeColor( "global-color-error" );
            }
            else if( progress.high != undefined && progress.value < progress.high )
            {
                backgroundColor = LX.getThemeColor( "global-color-warning" );
            }

            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };

        if( options.showValue )
        {
            if( document.getElementById('progressvalue-' + name ) )
            {
                document.getElementById('progressvalue-' + name ).remove();
            }

            let span = document.createElement("span");
            span.id = "progressvalue-" + name;
            span.style.padding = "0px 5px";
            span.innerText = value;
            container.appendChild( span );
        }

        if( options.editable ?? false )
        {
            progress.classList.add( "editable" );

            let innerMouseDown = e => {

                var doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                progress.classList.add( "grabbing" );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = LX.round( LX.remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                this.set( newValue, false, e );
            }

            let innerMouseMove = e => {

                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = LX.round( LX.remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max ) );
                    this.set( newValue, false, e );

                    if( options.callback )
                    {
                        options.callback( newValue, e );
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUp = e => {

                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( "grabbing" );
            }

            progress.addEventListener( "mousedown", innerMouseDown );
        }

        _updateColor();

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Progress = Progress;

/**
 * @class FileInput
 * @description FileInput Widget
 */

class FileInput extends Widget {

    constructor( name, callback, options = { } ) {

        super( Widget.FILE, name, null, options );

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            input.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = "lexfileinput";
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild( input );

        if( options.placeholder )
        {
            input.placeholder = options.placeholder;
        }

        input.addEventListener( 'change', function( e ) {

            const files = e.target.files;
            if( !files.length ) return;
            if( read )
            {
                if( options.onBeforeRead )
                    options.onBeforeRead();

                const reader = new FileReader();

                if( type === 'text' ) reader.readAsText( files[ 0 ] );
                else if( type === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( type === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( type === 'url' ) reader.readAsDataURL( files[ 0 ] );

                reader.onload = e => { callback.call( this, e.target.result, files[ 0 ] ) } ;
            }
            else
                callback( files[ 0 ] );
        });

        input.addEventListener( 'cancel', function( e ) {
            callback( null );
        });

        if( local )
        {
            let settingsDialog = null;

            const settingButton = new LX.Button(null, "", () => {

                if( settingsDialog )
                {
                    return;
                }

                settingsDialog = new LX.Dialog( "Load Settings", p => {
                    p.addSelect( "Type", [ 'text', 'buffer', 'bin', 'url' ], type, v => { type = v } );
                    p.addButton( null, "Reload", v => { input.dispatchEvent( new Event( 'change' ) ) } );
                }, { onclose: ( root ) => { root.remove(); settingsDialog = null; } } );

            }, { skipInlineCount: true, title: "Settings", disabled: options.disabled, icon: "Settings" });

            this.root.appendChild( settingButton.root );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.FileInput = FileInput;

/**
 * @class Tree
 * @description Tree Widget
 */

class Tree extends Widget {

    constructor( name, data, options = {} ) {

        options.hideName = true;

        super( Widget.TREE, name, null, options );

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

/**
 * @class TabSections
 * @description TabSections Widget
 */

class TabSections extends Widget {

    constructor( name, tabs, options = {} ) {

        options.hideName = true;

        super( Widget.TABS, name, null, options );

        if( tabs.constructor != Array )
        {
            throw( "Param @tabs must be an Array!" );
        }

        const vertical = options.vertical ?? true;
        const showNames = !vertical && ( options.showNames ?? false );

        let container = document.createElement( 'div' );
        container.className = "lextabscontainer";
        if( !vertical )
        {
            container.className += " horizontal";
        }

        let tabContainer = document.createElement( "div" );
        tabContainer.className = "tabs";
        container.appendChild( tabContainer );
        this.root.appendChild( container );

        for( let i = 0; i < tabs.length; ++i )
        {
            const tab = tabs[ i ];
            console.assert( tab.name );
            const isSelected = ( i == 0 );
            let tabEl = document.createElement( "div" );
            tabEl.className = "lextab " + (i == tabs.length - 1 ? "last" : "") + ( isSelected ? "selected" : "" );
            tabEl.innerHTML = ( showNames ? tab.name : "" );
            tabEl.appendChild( LX.makeIcon( tab.icon ?? "Hash", { title: tab.name, iconClass: tab.iconClass, svgClass: tab.svgClass } ) );

            let infoContainer = document.createElement( "div" );
            infoContainer.id = tab.name.replace( /\s/g, '' );
            infoContainer.className = "widgets";

            if( !isSelected )
            {
                infoContainer.toggleAttribute( "hidden", true );
            }

            container.appendChild( infoContainer );

            tabEl.addEventListener( "click", e => {
                // Change selected tab
                tabContainer.querySelectorAll( ".lextab" ).forEach( e => { e.classList.remove( "selected" ); } );
                tabEl.classList.add( "selected" );
                // Hide all tabs content
                container.querySelectorAll(".widgets").forEach( e => { e.toggleAttribute( "hidden", true ); } );
                // Show tab content
                const el = container.querySelector( '#' + infoContainer.id );
                el.toggleAttribute( "hidden" );

                if( tab.onSelect )
                {
                    tab.onSelect( this, infoContainer );
                }
            });

            tabContainer.appendChild( tabEl );

            if( tab.onCreate )
            {
                // Push to tab space
                const creationPanel = new LX.Panel();
                creationPanel.queue( infoContainer );
                tab.onCreate.call( this, creationPanel, infoContainer );
                creationPanel.clearQueue();
            }
        }
    }
}

LX.TabSections = TabSections;

/**
 * @class Counter
 * @description Counter Widget
 */

class Counter extends Widget {

    constructor( name, value, callback, options = { } ) {

        super( Widget.COUNTER, name, value, options );

        this.onGetValue = () => {
            return counterText.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            newValue = LX.clamp( newValue, min, max );
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = "lexcounter";
        this.root.appendChild( container );

        const substrButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count - mult, false, e );
        }, { skipInlineCount: true, title: "Minus", icon: "Minus" });

        container.appendChild( substrButton.root );

        const containerBox = document.createElement( 'div' );
        containerBox.className = "lexcounterbox";
        container.appendChild( containerBox );

        const counterText = document.createElement( 'span' );
        counterText.className = "lexcountervalue";
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild( counterText );

        if( options.label )
        {
            const counterLabel = document.createElement( 'span' );
            counterLabel.className = "lexcounterlabel";
            counterLabel.innerHTML = options.label;
            containerBox.appendChild( counterLabel );
        }

        const addButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count + mult, false, e );
        }, { skipInlineCount: true, title: "Plus", icon: "Plus" });
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;

/**
 * @class Table
 * @description Table Widget
 */

class Table extends Widget {

    constructor( name, data, options = { } ) {

        if( !data )
        {
            throw( "Data is needed to create a table!" );
        }

        super( Widget.TABLE, name, null, options );

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lextable";
        this.root.appendChild( container );

        this._centered = options.centered ?? false;
        if( this._centered === true )
        {
            container.classList.add( "centered" );
        }

        this.activeCustomFilters = {};
        this.filter = options.filter ?? false;
        this.customFilters = options.customFilters ?? false;
        this._toggleColumns = options.toggleColumns ?? false;
        this._currentFilter = options.filterValue;

        data.head = data.head ?? [];
        data.body = data.body ?? [];
        data.checkMap = { };
        data.colVisibilityMap = { };
        data.head.forEach( (col, index) => { data.colVisibilityMap[ index ] = true; })
        this.data = data;

        const compareFn = ( idx, order, a, b) => {
            if (a[idx] < b[idx]) return -order;
            else if (a[idx] > b[idx]) return order;
            return 0;
        }

        const sortFn = ( idx, sign ) => {
            data.body = data.body.sort( compareFn.bind( this, idx, sign ) );
            this.refresh();
        }

        // Append header
        if( this.filter || this.customFilters || this._toggleColumns )
        {
            const headerContainer = LX.makeContainer( [ "100%", "auto" ], "flex flex-row" );

            if( this.filter )
            {
                const filterOptions = LX.deepCopy( options );
                filterOptions.placeholder = `Filter ${ this.filter }...`;
                filterOptions.skipWidget = true;
                filterOptions.trigger = "input";
                filterOptions.inputClass = "outline";

                let filter = new LX.TextInput(null, this._currentFilter ?? "", ( v ) => {
                    this._currentFilter = v;
                    this.refresh();
                }, filterOptions );

                headerContainer.appendChild( filter.root );
            }

            if( this.customFilters )
            {
                const icon = LX.makeIcon( "CirclePlus", { svgClass: "sm" } );
                const separatorHtml = `<div class="lexcontainer border-right self-center mx-1" style="width: 1px; height: 70%;"></div>`;

                for( let f of this.customFilters )
                {
                    f.widget = new LX.Button(null, icon.innerHTML + f.name, ( v ) => {

                        const spanName = f.widget.root.querySelector( "span" );

                        if( f.options )
                        {
                            const menuOptions = f.options.map( ( colName, idx ) => {
                                const item = {
                                    name: colName,
                                    checked:  !!this.activeCustomFilters[ colName ],
                                    callback: (key, v, dom) => {
                                        if( v ) { this.activeCustomFilters[ key ] = f.name; }
                                        else {
                                            delete this.activeCustomFilters[ key ];
                                        }
                                        const activeFilters = Object.keys( this.activeCustomFilters ).filter(  k => this.activeCustomFilters[ k ] == f.name );
                                        const filterBadgesHtml = activeFilters.reduce( ( acc, key ) => acc += LX.badge( key, "bg-tertiary fg-secondary text-sm border-0" ), "" );
                                        spanName.innerHTML = icon.innerHTML + f.name + ( activeFilters.length ? separatorHtml : "" ) + filterBadgesHtml;
                                        this.refresh();
                                    }
                                }
                                return item;
                            } );
                            new LX.DropdownMenu( f.widget.root, menuOptions, { side: "bottom", align: "start" });
                        }
                        else if( f.type == "range" )
                        {
                            console.assert( f.min != undefined && f.max != undefined, "Range filter needs min and max values!" );
                            const container = LX.makeContainer( ["240px", "auto"], "text-md" );
                            const panel = new LX.Panel();
                            LX.makeContainer( ["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container );

                            f.start = f.start ?? f.min;
                            f.end = f.end ?? f.max;

                            panel.refresh = () => {
                                panel.clear();
                                panel.sameLine( 2, "justify-center" );
                                panel.addNumber( null, f.start, (v) => {
                                    f.start = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addNumber( null, f.end, (v) => {
                                    f.end = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addButton( null, "Reset", () => {
                                    f.start = f.min;
                                    f.end = f.max;
                                    spanName.innerHTML = icon.innerHTML + f.name;
                                    panel.refresh();
                                    this.refresh();
                                }, { buttonClass: "contrast" } );
                            }
                            panel.refresh();
                            container.appendChild( panel.root );
                            new LX.Popover( f.widget.root, [ container ], { side: "bottom" } );
                        }

                    }, { buttonClass: "px-2 primary dashed" } );
                    headerContainer.appendChild( f.widget.root );
                }

                this._resetCustomFiltersBtn = new LX.Button(null, "resetButton", ( v ) => {
                    this.activeCustomFilters = {};
                    this._resetCustomFiltersBtn.root.classList.add( "hidden" );
                    for( let f of this.customFilters )
                    {
                        f.widget.root.querySelector( "span" ).innerHTML = ( icon.innerHTML + f.name );
                        if( f.type == "range" )
                        {
                            f.start = f.min;
                            f.end = f.max;
                        }
                    }
                    this.refresh();
                }, { title: "Reset filters", tooltip: true, icon: "X" } );
                headerContainer.appendChild( this._resetCustomFiltersBtn.root );
                this._resetCustomFiltersBtn.root.classList.add( "hidden" );
            }

            if( this._toggleColumns )
            {
                const icon = LX.makeIcon( "Settings2" );
                const toggleColumnsBtn = new LX.Button( "toggleColumnsBtn", icon.innerHTML + "View", (value, e) => {
                    const menuOptions = data.head.map( ( colName, idx ) => {
                        const item = {
                            name: colName,
                            icon: "Check",
                            callback: () => {
                                data.colVisibilityMap[ idx ] = !data.colVisibilityMap[ idx ];
                                const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                cells.forEach(cell => {
                                    cell.style.display = (cell.style.display === "none") ? "" : "none";
                                });
                            }
                        }
                        if( !data.colVisibilityMap[ idx ] ) delete item.icon;
                        return item;
                    } );
                    new LX.DropdownMenu( e.target, menuOptions, { side: "bottom", align: "end" });
                }, { hideName: true } );
                headerContainer.appendChild( toggleColumnsBtn.root );
                toggleColumnsBtn.root.style.marginLeft = "auto";
            }

            container.appendChild( headerContainer );
        }

        const table = document.createElement( 'table' );
        container.appendChild( table );

        this.refresh = () => {

            this._currentFilter = this._currentFilter ?? "";

            table.innerHTML = "";

            this.rowOffsetCount = 0;

            // Head
            {
                const head = document.createElement( 'thead' );
                head.className = "lextablehead";
                table.appendChild( head );

                const hrow = document.createElement( 'tr' );

                if( options.sortable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    hrow.appendChild( th );
                    this.rowOffsetCount++;
                }

                if( options.selectable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    const input = document.createElement( 'input' );
                    input.type = "checkbox";
                    input.className = "lexcheckbox accent";
                    input.checked = data.checkMap[ ":root" ] ?? false;
                    th.appendChild( input );

                    input.addEventListener( 'change', function() {

                        data.checkMap[ ":root" ] = this.checked;

                        const body = table.querySelector( "tbody" );
                        for( const el of body.childNodes )
                        {
                            const rowId = el.getAttribute( "rowId" );
                            if( !rowId ) continue;
                            data.checkMap[ rowId ] = this.checked;
                            el.querySelector( "input[type='checkbox']" ).checked = this.checked;
                        }
                    });

                    this.rowOffsetCount++;
                    hrow.appendChild( th );
                }

                for( const headData of data.head )
                {
                    const th = document.createElement( 'th' );
                    th.innerHTML = `<span>${ headData }</span>`;
                    th.querySelector( "span" ).appendChild( LX.makeIcon( "MenuArrows", { svgClass: "sm" } ) );

                    const idx = data.head.indexOf( headData );
                    if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                    {
                        th.classList.add( "centered" );
                    }

                    const menuOptions = [
                        { name: "Asc", icon: "ArrowUpAZ", callback: sortFn.bind( this, idx, 1 ) },
                        { name: "Desc", icon: "ArrowDownAZ", callback: sortFn.bind( this, idx, -1 ) }
                    ];

                    if( this._toggleColumns )
                    {
                        menuOptions.push(
                            null,
                            {
                                name: "Hide", icon: "EyeOff", callback: () => {
                                    data.colVisibilityMap[ idx ] = false;
                                    const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                    cells.forEach(cell => {
                                        cell.style.display = (cell.style.display === "none") ? "" : "none";
                                    });
                                }
                            }
                        );
                    }

                    th.addEventListener( 'click', event => {
                        new LX.DropdownMenu( event.target, menuOptions, { side: "bottom", align: "start" });
                    });

                    hrow.appendChild( th );
                }

                // Add empty header column
                if( options.rowActions )
                {
                    const th = document.createElement( 'th' );
                    th.className = "sm";
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Body
            {
                const body = document.createElement( 'tbody' );
                body.className = "lextablebody";
                table.appendChild( body );

                let rIdx = null;
                let eventCatched = false;
                let movePending = null;

                document.addEventListener( 'mouseup', (e) => {
                    if( rIdx === null ) return;
                    document.removeEventListener( "mousemove", onMove );
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = 0;
                    fromRow.classList.remove( "dragging" );
                    Array.from( table.rows ).forEach( v => {
                        v.style.transform = ``;
                        v.style.transition = `none`;
                    } );
                    LX.flushCss( fromRow );

                    if( movePending )
                    {
                        // Modify inner data first
                        // Origin row should go to the target row, and the rest should be moved up/down
                        const fromIdx = rIdx - 1;
                        const targetIdx = movePending[ 1 ] - 1;

                        LX.emit( "@on_table_sort", { instance: this, fromIdx, targetIdx } );

                        const b = data.body[ fromIdx ];
                        let targetOffset = 0;

                        if( fromIdx == targetIdx ) return;
                        if( fromIdx > targetIdx ) // Move up
                        {
                            for( let i = fromIdx; i > targetIdx; --i )
                            {
                                data.body[ i ] = data.body[ i - 1 ];
                            }
                        }
                        else // Move down
                        {
                            targetOffset = 1;
                            for( let i = fromIdx; i < targetIdx; ++i )
                            {
                                data.body[ i ] = data.body[ i + 1 ];
                            }
                        }

                        data.body[targetIdx] = b;

                        const parent = movePending[ 0 ].parentNode;
                        parent.insertChildAtIndex(  movePending[ 0 ], targetIdx + targetOffset );
                        movePending = null;
                    }

                    rIdx = null;

                    LX.doAsync( () => {
                        Array.from( table.rows ).forEach( v => {
                            v.style.transition = `transform 0.2s ease-in`;
                        } );
                    } )
                } );

                let onMove = ( e ) => {
                    if( !rIdx ) return;
                    const fromRow = table.rows[ rIdx ];
                    fromRow.dY = fromRow.dY ?? 0;
                    fromRow.dY += e.movementY;
                    fromRow.style.transform = `translateY(${fromRow.dY}px)`;
                };

                for( let r = 0; r < data.body.length; ++r )
                {
                    const bodyData = data.body[ r ];

                    if( this.filter )
                    {
                        const filterColIndex = data.head.indexOf( this.filter );
                        if( filterColIndex > -1 )
                        {
                            const validRowValue = LX.stripHTML( bodyData[ filterColIndex ] ).toLowerCase();
                            if( !validRowValue.includes( this._currentFilter.toLowerCase() ) )
                            {
                                continue;
                            }
                        }
                    }

                    if( Object.keys( this.activeCustomFilters ).length )
                    {
                        let acfMap = {};

                        this._resetCustomFiltersBtn.root.classList.remove( "hidden" );

                        for( let acfValue in this.activeCustomFilters )
                        {
                            const acfName = this.activeCustomFilters[ acfValue ];
                            acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                            const filterColIndex = data.head.indexOf( acfName );
                            if( filterColIndex > -1 )
                            {
                                acfMap[ acfName ] |= ( bodyData[ filterColIndex ] === acfValue );
                            }
                        }

                        const show = Object.values( acfMap ).reduce( ( e, acc ) => acc *= e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    // Check range/date filters
                    if( this.customFilters )
                    {
                        let acfMap = {};

                        for( let f of this.customFilters )
                        {
                            const acfName = f.name;

                            if( f.type == "range" )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                                const filterColIndex = data.head.indexOf( acfName );
                                if( filterColIndex > -1 )
                                {
                                    const validRowValue = parseFloat( bodyData[ filterColIndex ] );
                                    const min = f.start ?? f.min;
                                    const max = f.end ?? f.max;
                                    acfMap[ acfName ] |= ( validRowValue >= min ) && ( validRowValue <= max );
                                }
                            }
                            else if( f.type == "date" )
                            {
                                // TODO
                            }
                        }

                        const show = Object.values( acfMap ).reduce( ( e, acc ) => acc *= e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    const row = document.createElement( 'tr' );
                    const rowId = LX.getSupportedDOMName( bodyData.join( '-' ) ).substr(0, 32);
                    row.setAttribute( "rowId", rowId );

                    if( options.sortable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";
                        const icon = LX.makeIcon( "GripVertical" );
                        td.appendChild( icon );

                        icon.draggable = true;

                        icon.addEventListener("dragstart", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            rIdx = row.rowIndex;
                            row.classList.add( "dragging" );

                            document.addEventListener( "mousemove", onMove );
                        }, false );

                        row.addEventListener("mouseenter", function(e) {
                            e.preventDefault();

                            if( rIdx != null && ( this.rowIndex != rIdx ) && ( eventCatched != this.rowIndex ) )
                            {
                                eventCatched = this.rowIndex;
                                const fromRow = table.rows[ rIdx ];
                                const undo = ( this.style.transform != `` );
                                if (this.rowIndex > rIdx) {
                                    movePending = [ fromRow, undo ? (this.rowIndex-1) : this.rowIndex ];
                                    this.style.transform = undo ? `` : `translateY(-${this.offsetHeight}px)`;
                                } else {
                                    movePending = [ fromRow, undo ? (this.rowIndex+1) : (this.rowIndex) ];
                                    this.style.transform = undo ? `` : `translateY(${this.offsetHeight}px)`;
                                }
                                LX.doAsync( () => {
                                    eventCatched = false;
                                } )
                            }
                        });

                        row.appendChild( td );
                    }

                    if( options.selectable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        const input = document.createElement( 'input' );
                        input.type = "checkbox";
                        input.className = "lexcheckbox accent";
                        input.checked = data.checkMap[ rowId ];
                        td.appendChild( input );

                        input.addEventListener( 'change', function() {
                            data.checkMap[ rowId ] = this.checked;

                            const headInput = table.querySelector( "thead input[type='checkbox']" );

                            if( !this.checked )
                            {
                                headInput.checked = data.checkMap[ ":root" ] = false;
                            }
                            else
                            {
                                const rowInputs = Array.from( table.querySelectorAll( "tbody input[type='checkbox']" ) );
                                const uncheckedRowInputs = rowInputs.filter( i => { return !i.checked; } );
                                if( !uncheckedRowInputs.length )
                                {
                                    headInput.checked = data.checkMap[ ":root" ] = true;
                                }
                            }
                        });

                        row.appendChild( td );
                    }

                    for( const rowData of bodyData )
                    {
                        const td = document.createElement( 'td' );
                        td.innerHTML = `${ rowData }`;

                        const idx = bodyData.indexOf( rowData );
                        if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                        {
                            td.classList.add( "centered" );
                        }

                        row.appendChild( td );
                    }

                    if( options.rowActions )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";

                        const buttons = document.createElement( 'div' );
                        buttons.className = "lextablebuttons";
                        td.appendChild( buttons );

                        for( const action of options.rowActions )
                        {
                            let button = null;

                            if( action == "delete" )
                            {
                                button = LX.makeIcon( "Trash3", { title: "Delete Row" } );
                                button.addEventListener( 'click', function() {
                                    // Don't need to refresh table..
                                    data.body.splice( r, 1 );
                                    row.remove();
                                });
                            }
                            else if( action == "menu" )
                            {
                                button = LX.makeIcon( "EllipsisVertical", { title: "Menu" } );
                                button.addEventListener( 'click', function( event ) {
                                    if( !options.onMenuAction )
                                    {
                                        return;
                                    }

                                    const menuOptions = options.onMenuAction( r, data );
                                    console.assert( menuOptions.length, "Add items to the Menu Action Dropdown!" );

                                    new LX.DropdownMenu( event.target, menuOptions, { side: "bottom", align: "end" });
                                });
                            }
                            else // custom actions
                            {
                                console.assert( action.constructor == Object );
                                button = LX.makeIcon( action.icon, { title: action.title } );

                                if( action.callback )
                                {
                                    button.addEventListener( 'click', e => {
                                        const mustRefresh = action.callback( bodyData, table, e );
                                        if( mustRefresh )
                                        {
                                            this.refresh();
                                        }
                                    });
                                }
                            }

                            console.assert( button );
                            buttons.appendChild( button );
                        }

                        row.appendChild( td );
                    }

                    body.appendChild( row );
                }

                if( body.childNodes.length == 0 )
                {
                    const row = document.createElement( 'tr' );
                    const td = document.createElement( 'td' );
                    td.setAttribute( "colspan", data.head.length + this.rowOffsetCount + 1 ); // +1 for rowActions
                    td.className = "empty-row";
                    td.innerHTML = "No results.";
                    row.appendChild( td );
                    body.appendChild( row );
                }
            }

            for( const v in data.colVisibilityMap )
            {
                const idx = parseInt( v );
                if( !data.colVisibilityMap[ idx ] )
                {
                    const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                    cells.forEach(cell => {
                        cell.style.display = (cell.style.display === "none") ? "" : "none";
                    });
                }
            }
        }

        this.refresh();

        LX.doAsync( this.onResize.bind( this ) );
    }

    getSelectedRows() {

        const selectedRows = [];

        for( const row of this.data.body )
        {
            const rowId = LX.getSupportedDOMName( row.join( '-' ) ).substr( 0, 32 );
            if( this.data.checkMap[ rowId ] === true )
            {
                selectedRows.push( row );
            }
        }

        return selectedRows;
    }

    _setCentered( v ) {

        if( v.constructor == Boolean )
        {
            const container = this.root.querySelector( ".lextable" );
            container.classList.toggle( "centered", v );
        }
        else
        {
            // Make sure this is an array containing which columns have
            // to be centered
            v = [].concat( v );
        }

        this._centered = v;

        this.refresh();
    }
}

Object.defineProperty( Table.prototype, "centered", {
    get: function() { return this._centered; },
    set: function( v ) { this._setCentered( v ); },
    enumerable: true,
    configurable: true
});

LX.Table = Table;

/**
 * @class DatePicker
 * @description DatePicker Widget
 */

class DatePicker extends Widget {

    constructor( name, dateString, callback, options = { } ) {

        super( Widget.DATE, name, null, options );

        if( options.today )
        {
            const date = new Date();
            dateString = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
        }

        this.onGetValue = () => {
            return dateString;
        }

        this.onSetValue = ( newValue, skipCallback, event ) => {

            dateString = newValue;

            this.calendar.fromDateString( newValue );

            refresh( this.calendar.getFullDate() );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        }

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lexdate";
        this.root.appendChild( container );

        this.calendar = new LX.Calendar( dateString, { onChange: ( date ) => {
            this.set( `${ date.day }/${ date.month }/${ date.year }` )
        }, ...options });

        const refresh = ( currentDate ) => {
            container.innerHTML = "";
            const calendarIcon = LX.makeIcon( "Calendar" );
            const calendarButton = new LX.Button( null, currentDate ?? "Pick a date", () => {
                this._popover = new LX.Popover( calendarButton.root, [ this.calendar ] );
            }, { buttonClass: `flex flex-row px-3 ${ currentDate ? "" : "fg-tertiary" } justify-between` } );

            calendarButton.root.querySelector( "button" ).appendChild( calendarIcon );
            container.appendChild( calendarButton.root );
        };

        refresh( dateString ? this.calendar.getFullDate(): null );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.DatePicker = DatePicker;

/**
 * @class Map2D
 * @description Map2D Widget
 */

class Map2D extends Widget {

    constructor( name, points, callback, options = {} ) {

        super( Widget.MAP2D, name, null, options );

        this.onGetValue = () => {
            return this.map2d.weightsObj;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            // if( !skipCallback )
            // {
            //     this._trigger( new LX.IEvent( name, curveInstance.element.value, event ), callback );
            // }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexmap2d";
        this.root.appendChild( container );

        this.map2d = new LX.CanvasMap2D( points, callback, options );

        const calendarIcon = LX.makeIcon( "SquareMousePointer" );
        const calendarButton = new LX.Button( null, "Open Map", () => {
            this._popover = new LX.Popover( calendarButton.root, [ this.map2d ] );
        }, { buttonClass: `flex flex-row px-3 fg-secondary justify-between` } );

        calendarButton.root.querySelector( "button" ).appendChild( calendarIcon );
        container.appendChild( calendarButton.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Map2D = Map2D;

export { Widget, ADD_CUSTOM_WIDGET };