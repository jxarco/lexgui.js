// ComboButtons.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class ComboButtons
 * @description ComboButtons Component
 */

export class ComboButtons extends BaseComponent
{
    constructor( name: string, values: any[], options: any = {} )
    {
        const shouldSelect = !( options.noSelection ?? false );
        let shouldToggle = shouldSelect && ( options.toggle ?? false );

        let container = document.createElement( 'div' );
        container.className = 'lexcombobuttons ';

        options.skipReset = true;

        if ( options.float )
        {
            container.className += options.float;
        }

        let currentValue: any = [];
        let buttonsBox = document.createElement( 'div' );
        buttonsBox.className = 'lexcombobuttonsbox ';
        container.appendChild( buttonsBox );

        for ( let b of values )
        {
            if ( !b.value )
            {
                throw ( "Set 'value' for each button!" );
            }

            let buttonEl = document.createElement( 'button' );
            buttonEl.className = 'lexbutton combo';
            buttonEl.title = b.icon ? b.value : '';
            buttonEl.id = b.id ?? '';
            buttonEl.dataset['value'] = b.value;

            if ( options.buttonClass )
            {
                buttonEl.classList.add( options.buttonClass );
            }

            if ( shouldSelect && ( b.selected || options.selected?.includes( b.value ) ) )
            {
                buttonEl.classList.add( 'selected' );
                currentValue = currentValue.concat( [ b.value ] );
            }

            if ( b.icon )
            {
                const icon = LX.makeIcon( b.icon );
                buttonEl.appendChild( icon );
            }
            else
            {
                buttonEl.innerHTML = `<span>${b.value}</span>`;
            }

            if ( b.disabled )
            {
                buttonEl.setAttribute( 'disabled', 'true' );
            }

            buttonEl.addEventListener( 'click', e =>
            {
                currentValue = [];

                if ( shouldSelect )
                {
                    if ( shouldToggle )
                    {
                        buttonEl.classList.toggle( 'selected' );
                    }
                    else
                    {
                        container.querySelectorAll( 'button' ).forEach( s => s.classList.remove( 'selected' ) );
                        buttonEl.classList.add( 'selected' );
                    }
                }

                container.querySelectorAll( 'button' ).forEach( s =>
                {
                    if ( s.classList.contains( 'selected' ) )
                    {
                        currentValue.push( s.dataset['value'] );
                    }
                } );

                if ( !shouldToggle && currentValue.length > 1 )
                {
                    console.error( `Enable _options.toggle_ to allow selecting multiple options in ComboButtons.` );
                    return;
                }

                currentValue = currentValue[0];

                this.set( b.value, false, buttonEl.classList.contains( 'selected' ) );
            } );

            buttonsBox.appendChild( buttonEl );
        }

        if ( currentValue.length > 1 )
        {
            if ( !shouldToggle )
            {
                options.toggle = true;
                shouldToggle = shouldSelect;
                console.warn( `Multiple options selected in '${name}' ComboButtons. Enabling _toggle_ mode.` );
            }
        }
        else
        {
            currentValue = currentValue[0];
        }

        super( ComponentType.BUTTONS, name, null, options );

        this.onGetValue = () =>
        {
            return currentValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            if ( shouldSelect && ( event == undefined ) )
            {
                container.querySelectorAll( 'button' ).forEach( s => s.classList.remove( 'selected' ) );

                container.querySelectorAll( 'button' ).forEach( s =>
                {
                    if ( currentValue && currentValue.indexOf( s.dataset['value'] ) > -1 )
                    {
                        s.classList.add( 'selected' );
                    }
                } );
            }

            if ( !skipCallback && newValue.constructor != Array )
            {
                const enabled = event;
                const fn = values.filter( v => v.value == newValue )[0]?.callback;
                this._trigger( new IEvent( name, shouldToggle ? [ newValue, enabled ] : newValue, null ), fn );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        this.root.appendChild( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.ComboButtons = ComboButtons;
