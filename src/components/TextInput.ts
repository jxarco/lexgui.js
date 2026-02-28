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

    input: HTMLInputElement | HTMLAnchorElement;

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

        this.onSetDisabled = ( disabled: boolean ) => {
            const input = this.root.querySelector( 'input' );
            if( input ) input.disabled = disabled;
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

        // override disabled (default is options.disable)
        this.disabled = ( this.disabled || options.warning ) ?? ( options.url ? true : false );
        let wValue: any = null;

        if ( !this.disabled )
        {
            wValue = LX.makeElement( 'input', LX.mergeClass( 'lextext text-sm', options.inputClass ) );
            wValue.type = options.type || '';

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
            wValue.className = LX.mergeClass( 'lextext ellipsis-overflow', options.inputClass );
        }

        if ( options.fit )
        {
            wValue.classList.add( 'field-sizing-content' );
        }

        if ( wValue instanceof HTMLInputElement )
        {
            wValue.name = options.name;
            wValue.value = value ?? '';

            if ( options.autocomplete )
            {
                wValue.autocomplete = options.autocomplete;
            }
            else if ( wValue.type === 'password' )
            {
                // allow password managers by default
                wValue.autocomplete = 'current-password';
            }
            else if ( options.name === 'username' || options.name === 'email' )
            {
                wValue.autocomplete = options.name;
            }
            else
            {
                // neutral default, don't break browser heuristics
                wValue.autocomplete = 'on';
            }

            wValue.style.textAlign = options.float ?? '';

            wValue.addEventListener( 'transitionstart', ( e: TransitionEvent ) => {
                if ( e.propertyName === 'background-color'
                    && wValue.matches( ':-webkit-autofill' ) )
                {
                    this.syncFromDOM();
                }
            } );
        }

        Object.assign( wValue.style, options.style ?? {} );

        container.appendChild( wValue );

        this.input = wValue;

        LX.doAsync( this.onResize.bind( this ) );
    }

    syncFromDOM( skipCallback: boolean = true )
    {
        if ( this.input instanceof HTMLInputElement )
        {
            this.set( this.input.value, skipCallback );
        }
    }
}

LX.TextInput = TextInput;
