// TextInput.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class TextInput
 * @description TextInput Component
 */

export class TextInput extends BaseComponent
{
    valid: ( s: string, m?: string ) => boolean;

    _triggerEvent: Event | undefined;
    _lastValueTriggered?: any;

    constructor( name: string | null, value?: string, callback?: any, options: any = {} )
    {
        super( ComponentType.TEXT, name, String( value ), options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            let skipTrigger = this._lastValueTriggered == newValue;

            if ( !options.ignoreValidation )
            {
                skipTrigger = skipTrigger || ( !this.valid( newValue ) );
            }

            if ( skipTrigger )
            {
                return;
            }

            this._lastValueTriggered = value = newValue;

            wValue.value = newValue;

            delete this._triggerEvent;

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };

        this.valid = ( v, matchField ) => {
            v = v ?? this.value();
            if ( !options.pattern ) return true;
            const errs = LX.validateValueAtPattern( v, options.pattern, matchField );
            return ( errs.length == 0 );
        };

        let container = document.createElement( 'div' );
        container.className = options.warning ? ' lexwarning' : '';
        container.style.display = 'flex';
        container.style.position = 'relative';
        this.root.appendChild( container );

        this.disabled = ( options.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue: any = null;

        if ( !this.disabled )
        {
            wValue = document.createElement( 'input' );
            wValue.className = 'lextext ' + ( options.inputClass ?? '' );
            wValue.type = options.type || '';
            wValue.value = value || '';
            wValue.style.textAlign = options.float ?? '';

            wValue.setAttribute( 'placeholder', options.placeholder ?? '' );

            if ( options.required )
            {
                wValue.setAttribute( 'required', options.required );
            }

            if ( options.pattern )
            {
                wValue.setAttribute( 'pattern', LX.buildTextPattern( options.pattern ) );
            }

            const trigger = options.trigger ?? 'default';

            if ( trigger == 'default' )
            {
                wValue.addEventListener( 'keyup', ( e: KeyboardEvent ) => {
                    if ( e.key == 'Enter' )
                    {
                        this._triggerEvent = e;
                        wValue.blur();
                    }
                } );

                wValue.addEventListener( 'focusout', ( e: FocusEvent ) => {
                    this._triggerEvent = this._triggerEvent ?? e;
                    this.set( ( e.target as any ).value, false, this._triggerEvent );
                } );
            }
            else if ( trigger == 'input' )
            {
                wValue.addEventListener( 'input', ( e: InputEvent ) => {
                    this.set( ( e.target as any ).value, false, e );
                } );
            }

            wValue.addEventListener( 'mousedown', function( e: MouseEvent )
            {
                e.stopImmediatePropagation();
                e.stopPropagation();
            } );

            if ( options.icon )
            {
                wValue.style.paddingLeft = '1.75rem';
                const icon = LX.makeIcon( options.icon, { iconClass: 'absolute z-1 ml-2', svgClass: 'sm' } );
                container.appendChild( icon );
            }
        }
        else if ( options.url )
        {
            wValue = document.createElement( 'a' );
            wValue.href = options.url;
            wValue.target = '_blank';
            wValue.innerHTML = value ?? '';
            wValue.style.textAlign = options.float ?? '';
            wValue.className = 'lextext ellipsis-overflow';
        }
        else
        {
            wValue = document.createElement( 'input' );
            wValue.disabled = true;
            wValue.value = value;
            wValue.style.textAlign = options.float ?? '';
            wValue.className = 'lextext ellipsis-overflow ' + ( options.inputClass ?? '' );
        }

        if ( options.fit )
        {
            wValue.classList.add( 'size-content' );
        }

        Object.assign( wValue.style, options.style ?? {} );
        container.appendChild( wValue );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.TextInput = TextInput;
