// Button.ts @jxarco

import { LX } from './Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class TextInput
 * @description TextInput Component
 */

class TextInput extends BaseComponent
{
    valid: ( s: string ) => boolean;
    onResize: ( r: any ) => void;

    _lastValueTriggered?: any;

    constructor( name: string, value: string, callback: any, options: any = {} )
    {
        super( ComponentType.TEXT, name, String( value ), options );

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
            if( ( wValue.pattern ?? "" ) == "" ) return true;
            const regexp = new RegExp( wValue.pattern );
            return regexp.test( v );
        };

        let container = document.createElement( 'div' );
        container.className = ( options.warning ? " lexwarning" : "" );
        container.style.display = "flex";
        container.style.position = "relative";
        this.root.appendChild( container );

        this.disabled = ( options.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue: any = null;

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
                wValue.addEventListener( "keyup", ( e: KeyboardEvent ) => {
                    if( e.key == "Enter" )
                    {
                        wValue.blur();
                    }
                });

                wValue.addEventListener( "focusout", ( e: any ) => {
                    this.set( e.target.value, false, e );
                });
            }
            else if( trigger == "input" )
            {
                wValue.addEventListener("input", ( e: any ) => {
                    this.set( e.target.value, false, e );
                });
            }

            wValue.addEventListener( "mousedown", function( e: KeyboardEvent ) {
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