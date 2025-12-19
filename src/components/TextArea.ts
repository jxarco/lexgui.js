// TextArea.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class TextArea
 * @description TextArea Component
 */

export class TextArea extends BaseComponent
{
    constructor( name: string | null, value: string, callback: any, options: any = {} )
    {
        super( ComponentType.TEXTAREA, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            wValue.value = value = newValue;

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };

        let container = document.createElement( 'div' );
        container.className = 'lextextarea';
        container.style.display = 'flex';
        this.root.appendChild( container );

        let wValue: HTMLTextAreaElement = LX.makeElement( 'textarea', options.inputClass ?? '' );
        wValue.value = value ?? '';
        wValue.style.textAlign = options.float ?? '';
        Object.assign( wValue.style, options.style ?? {} );

        if ( options.fitHeight ?? false )
        {
            wValue.classList.add( 'field-sizing-content' );
        }

        if ( !( options.resize ?? true ) )
        {
            wValue.classList.add( 'resize-none' );
        }

        container.appendChild( wValue );

        if ( options.disabled ?? false )
        {
            this.disabled = true;
            wValue.setAttribute( 'disabled', 'true' );
        }

        if ( options.placeholder )
        {
            wValue.setAttribute( 'placeholder', options.placeholder );
        }

        const trigger = options.trigger ?? 'default';

        if ( trigger == 'default' )
        {
            wValue.addEventListener( 'keyup', function( e )
            {
                if ( e.key == 'Enter' )
                {
                    wValue.blur();
                }
            } );

            wValue.addEventListener( 'focusout', ( e: any ) => {
                this.set( e.target?.value, false, e );
            } );
        }
        else if ( trigger == 'input' )
        {
            wValue.addEventListener( 'input', ( e: any ) => {
                this.set( e.target?.value, false, e );
            } );
        }

        if ( options.icon )
        {
            const icon = LX.makeIcon( options.icon, { iconClass: 'absolute z-1 ml-2', svgClass: 'sm' } );
            container.appendChild( icon );
        }

        LX.doAsync( () => {
            container.style.height = options.height ?? '';
            this.onResize();
        }, 10 );
    }
}

LX.TextArea = TextArea;
