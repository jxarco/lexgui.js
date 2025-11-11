// BaseComponent.ts @jxarco

import { LX } from './Namespace';
import { ContextMenu } from './ContextMenu';

export enum ComponentType
{
    NONE         = 0,
    TEXT         = 1,
    TEXTAREA     = 2,
    BUTTON       = 3,
    SELECT       = 4,
    CHECKBOX     = 5,
    TOGGLE       = 6,
    RADIO        = 7,
    BUTTONS      = 8,
    COLOR        = 9,
    RANGE        = 10,
    NUMBER       = 11,
    TITLE        = 12,
    VECTOR       = 13,
    TREE         = 14,
    PROGRESS     = 15,
    FILE         = 16,
    LAYERS       = 17,
    ARRAY        = 18,
    LIST         = 19,
    TAGS         = 20,
    CURVE        = 21,
    CARD         = 22,
    IMAGE        = 23,
    CONTENT      = 24,
    CUSTOM       = 25,
    SEPARATOR    = 26,
    KNOB         = 27,
    SIZE         = 28,
    OTP          = 29,
    PAD          = 30,
    FORM         = 31,
    DIAL         = 32,
    COUNTER      = 33,
    TABLE        = 34,
    TABS         = 35,
    DATE         = 36,
    MAP2D        = 37,
    LABEL        = 39,
    BLANK        = 40,
    RATE         = 41,
}

/**
 * @class BaseComponent
 */

export class BaseComponent {

    type: ComponentType;
    name: string | null;
    customName?: string;
    options: any;
    root: any;
    customIdx: number = -1;
    disabled: boolean = false;

    onSetValue?: ( v: any, b?: boolean, e?: any ) => void;
    onGetValue?: () => any;
    onAllowPaste?: ( b: boolean ) => boolean;
    onResize: ( r?: any ) => void;

    _initialValue: any;

    static NO_CONTEXT_TYPES = [
        ComponentType.BUTTON,
        ComponentType.LIST,
        ComponentType.FILE,
        ComponentType.PROGRESS
    ];

    constructor( type: ComponentType, name: string | null, value: any, options: any = {} )
    {
        this.type = type;
        this.name = name;
        this.options = options;
        this._initialValue = value;

        const root: any = document.createElement( 'div' );
        root.className = "lexcomponent";

        this.onResize = () => {};

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

        if( type != ComponentType.TITLE )
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

            LX.componentResizeObserver.observe( root );
        }

        if( name != undefined )
        {
            if( !( options.hideName ?? false ) )
            {
                let domName = document.createElement( 'div' );
                domName.className = "lexcomponentname";

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
                    this._addResetProperty( domName, function( el: any, event: any ) {
                        that.set( that._initialValue, false, event );
                        el.style.display = "none"; // Og value, don't show it
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

    static _dispatchEvent( element: any, type: any, data?: any, bubbles?: any, cancelable?: any )
    {
        let event = new CustomEvent( type, { 'detail': data, 'bubbles': bubbles, 'cancelable': cancelable } );
        element.dispatchEvent( event );
    }

    _addResetProperty( container: any, callback: any )
    {
        const domEl = LX.makeIcon( "Undo2", { iconClass: "ml-0 mr-1 px-1", title: "Reset" } )
        domEl.style.display = "none";
        domEl.addEventListener( "click", callback.bind( domEl, domEl ) );
        container.appendChild( domEl );
        return domEl;
    }

    _canPaste()
    {
        const clipboard = ( navigator.clipboard as any );
        let pasteAllowed: boolean = this.type === ComponentType.CUSTOM ?
            ( clipboard.customIdx !== undefined && this.customIdx == clipboard.customIdx ) : clipboard.type === this.type;

        pasteAllowed = pasteAllowed && ( this.disabled !== true );

        if( this.onAllowPaste )
        {
            pasteAllowed = this.onAllowPaste( pasteAllowed );
        }

        return pasteAllowed;
    }

    _trigger( event: any, callback: any, scope: any = this )
    {
        if( !callback )
        {
            return;
        }

        callback.call( scope, event.value, event.domEvent, event.name );
    }

    value()
    {
        if( this.onGetValue )
        {
            return this.onGetValue();
        }

        console.warn( "Can't get value of " + this.typeName() );
    }

    set( value: any, skipCallback?: boolean, event?: any )
    {
        if( this.onSetValue )
        {
            let resetButton = this.root.querySelector( ".lexcomponentname .lexicon" );
            if( resetButton )
            {
                resetButton.style.display = ( value != this.value() ? "block" : "none" );

                const equalInitial = value.constructor === Array ? (function arraysEqual( a, b ) {
                    if( a === b ) return true;
                    if( a == null || b == null ) return false;
                    if( a.length !== b.length ) return false;
                    for( var i = 0; i < a.length; ++i )
                    {
                        if( a[ i ] !== b[ i ] ) return false;
                    }
                    return true;
                })( value, this._initialValue ) : ( value == this._initialValue );

                resetButton.style.display = ( !equalInitial ? "block" : "none" );
            }

            return this.onSetValue( value, skipCallback ?? false, event );
        }

        console.warn( `Can't set value of ${ this.typeName() }`);
    }

    oncontextmenu( e: any )
    {
        if( BaseComponent.NO_CONTEXT_TYPES.includes( this.type ) )
        {
            return;
        }

        LX.addContextMenu( this.typeName(), e, ( c: ContextMenu ) => {
            c.add("Copy", () => { this.copy() });
            c.add("Paste", { disabled: !this._canPaste(), callback: () => { this.paste() } } );
        });
    }

    copy()
    {
        const clipboard = ( navigator.clipboard as any );
        clipboard.type = this.type;
        clipboard.customIdx = this.customIdx;
        clipboard.data = this.value();
        clipboard.writeText(clipboard.data );
    }

    paste()
    {
        if( !this._canPaste() )
        {
            return;
        }

        const clipboard = ( navigator.clipboard as any );
        this.set( clipboard.data );
    }

    typeName()
    {
        switch( this.type )
        {
            case ComponentType.TEXT: return "Text";
            case ComponentType.TEXTAREA: return "TextArea";
            case ComponentType.BUTTON: return "Button";
            case ComponentType.SELECT: return "Select";
            case ComponentType.CHECKBOX: return "Checkbox";
            case ComponentType.TOGGLE: return "Toggle";
            case ComponentType.RADIO: return "Radio";
            case ComponentType.COLOR: return "Color";
            case ComponentType.RANGE: return "Range";
            case ComponentType.NUMBER: return "Number";
            case ComponentType.VECTOR: return "Vector";
            case ComponentType.TREE: return "Tree";
            case ComponentType.PROGRESS: return "Progress";
            case ComponentType.FILE: return "File";
            case ComponentType.LAYERS: return "Layers";
            case ComponentType.ARRAY: return "Array";
            case ComponentType.LIST: return "List";
            case ComponentType.TAGS: return "Tags";
            case ComponentType.CURVE: return "Curve";
            case ComponentType.KNOB: return "Knob";
            case ComponentType.SIZE: return "Size";
            case ComponentType.PAD: return "Pad";
            case ComponentType.FORM: return "Form";
            case ComponentType.DIAL: return "Dial";
            case ComponentType.COUNTER: return "Counter";
            case ComponentType.TABLE: return "Table";
            case ComponentType.TABS: return "Tabs";
            case ComponentType.DATE: return "Date";
            case ComponentType.MAP2D: return "Map2D";
            case ComponentType.RATE: return "Rate";
            case ComponentType.LABEL: return "Label";
            case ComponentType.BLANK: return "Blank";
            case ComponentType.CUSTOM: return this.customName;
        }

        console.error( `Unknown Component type: ${ this.type }` );
    }

    refresh() {

    }
}

LX.BaseComponent = BaseComponent;