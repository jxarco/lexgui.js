// RadioGroup.ts @jxarco

import { LX } from './../Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

/**
 * @class RadioGroup
 * @description RadioGroup Component
 */

export class RadioGroup extends BaseComponent
{
    constructor( name: string, label: string, values: any[], callback: any, options: any = {} )
    {
        super( ComponentType.RADIO, name, null, options );

        let currentIndex: number | null = null;

        this.onGetValue = () => {
            const items = container.querySelectorAll( 'button' );
            return currentIndex ? [ currentIndex, items[ currentIndex ] ] : undefined;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            newValue = newValue[ 0 ] ?? newValue; // Allow getting index of { index, value } tupple

            console.assert( newValue.constructor == Number, "RadioGroup _value_ must be an Array index!" );

            const items = container.querySelectorAll( 'button' );
            items.forEach( ( b: any ) => { b.checked = false; b.classList.remove( "checked" ) } );

            const optionItem: any = items[ newValue ];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle( "checked" );

            if( !skipCallback )
            {
                this._trigger( new IEvent( null, [ newValue, values[ newValue ] ], event ), callback );
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