// OTPInput.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class OTPInput
 * @description OTPInput Component
 */

export class OTPInput extends BaseComponent
{
    constructor( name: string, value: string, callback: any, options: any = {} )
    {
        const pattern = options.pattern ?? 'xxx-xxx';
        const patternSize = ( pattern.match( /x/g ) || [] ).length;

        value = String( value );
        if ( !value.length )
        {
            value = 'x'.repeat( patternSize );
        }

        super( ComponentType.OTP, name, value, options );

        this.onGetValue = () => {
            return +value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;

            _refreshInput( value );

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, +newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        this.disabled = options.disabled ?? false;

        const container = document.createElement( 'div' );
        container.className = 'lexotp flex flex-row items-center';
        this.root.appendChild( container );

        const groups = pattern.split( '-' );

        const _refreshInput = ( valueString: string ) => {
            container.innerHTML = '';

            let itemsCount = 0;
            let activeSlot = 0;

            for ( let i = 0; i < groups.length; ++i )
            {
                const g = groups[i];

                for ( let j = 0; j < g.length; ++j )
                {
                    let number = valueString[itemsCount++];
                    number = number == 'x' ? '' : number;

                    const slotDom = LX.makeContainer( [ '36px', '30px' ],
                        'lexotpslot border-top border-bottom border-left px-3 cursor-text select-none font-medium outline-none',
                        number, container );
                    slotDom.tabIndex = '1';

                    if ( this.disabled )
                    {
                        slotDom.classList.add( 'disabled' );
                    }

                    const otpIndex = itemsCount;

                    if ( j == 0 )
                    {
                        slotDom.className += ' rounded-l';
                    }
                    else if ( j == ( g.length - 1 ) )
                    {
                        slotDom.className += ' rounded-r border-right';
                    }

                    slotDom.addEventListener( 'click', () => {
                        if ( this.disabled ) return;
                        container.querySelectorAll( '.lexotpslot' ).forEach( ( s ) => s.classList.remove( 'active' ) );
                        const activeDom: any = container.querySelectorAll( '.lexotpslot' )[activeSlot];
                        activeDom.classList.add( 'active' );
                        activeDom.focus();
                    } );

                    slotDom.addEventListener( 'blur', () => {
                        if ( this.disabled ) return;
                        LX.doAsync( () => {
                            if ( container.contains( document.activeElement ) ) return;
                            container.querySelectorAll( '.lexotpslot' ).forEach( ( s ) =>
                                s.classList.remove( 'active' )
                            );
                        }, 10 );
                    } );

                    slotDom.addEventListener( 'keyup', ( e: KeyboardEvent ) => {
                        if ( this.disabled ) return;
                        if ( !/[^0-9]+/g.test( e.key ) )
                        {
                            const number = e.key;
                            console.assert( !Number.isNaN( parseInt( number ) ) );

                            slotDom.innerHTML = number;
                            valueString = valueString.substring( 0, otpIndex - 1 ) + number
                                + valueString.substring( otpIndex );

                            const nexActiveDom: any = container.querySelectorAll( '.lexotpslot' )[activeSlot + 1];
                            if ( nexActiveDom )
                            {
                                container.querySelectorAll( '.lexotpslot' )[activeSlot].classList.remove( 'active' );
                                nexActiveDom.classList.add( 'active' );
                                nexActiveDom.focus();
                                activeSlot++;
                            }
                            else
                            {
                                this.set( valueString );
                            }
                        }
                        else if ( e.key == 'ArrowLeft' || e.key == 'ArrowRight' )
                        {
                            const dt = ( e.key == 'ArrowLeft' ) ? -1 : 1;
                            const newActiveDom: any = container.querySelectorAll( '.lexotpslot' )[activeSlot + dt];
                            if ( newActiveDom )
                            {
                                container.querySelectorAll( '.lexotpslot' )[activeSlot].classList.remove( 'active' );
                                newActiveDom.classList.add( 'active' );
                                newActiveDom.focus();
                                activeSlot += dt;
                            }
                        }
                        else if ( e.key == 'Enter' && !valueString.includes( 'x' ) )
                        {
                            this.set( valueString );
                        }
                    } );
                }

                if ( i < ( groups.length - 1 ) )
                {
                    LX.makeContainer( [ 'auto', 'auto' ], 'mx-2', `-`, container );
                }
            }

            console.assert( itemsCount == valueString.length, 'OTP Value/Pattern Mismatch!' );
        };

        _refreshInput( value );
    }
}

LX.OTPInput = OTPInput;
