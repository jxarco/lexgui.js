// List.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class List
 * @description List Component
 */

export class List extends BaseComponent
{
    _updateValues: ( newValues: any[] ) => void;

    constructor( name: string, values: any[], value: any, callback: any, options: any = {} )
    {
        super( ComponentType.LIST, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( ( e ) => e.classList.remove( 'selected' ) );

            let idx = null;
            for ( let i = 0; i < values.length; ++i )
            {
                const v = values[i];
                if ( v == newValue || ( ( v.constructor == Array ) && ( v[0] == newValue ) ) )
                {
                    idx = i;
                    break;
                }
            }

            if ( !idx )
            {
                console.error( `Cannot find item ${newValue} in List.` );
                return;
            }

            listContainer.children[idx].classList.toggle( 'selected' );
            value = newValue;

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            listContainer.style.width = `calc( 100% - ${realNameWidth})`;
        };

        this._updateValues = ( newValues ) => {
            values = newValues;
            listContainer.innerHTML = '';

            for ( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let itemValue = values[i];

                if ( itemValue.constructor === Array )
                {
                    icon = itemValue[1];
                    itemValue = itemValue[0];
                }

                let listElement = document.createElement( 'div' );
                listElement.className = 'lexlistitem' + ( value == itemValue ? ' selected' : '' );

                if ( icon )
                {
                    listElement.appendChild( LX.makeIcon( icon ) );
                }

                listElement.innerHTML += `<span>${itemValue}</span>`;

                listElement.addEventListener( 'click', ( e ) => {
                    listContainer.querySelectorAll( '.lexlistitem' ).forEach( ( e ) =>
                        e.classList.remove( 'selected' )
                    );
                    listElement.classList.toggle( 'selected' );
                    value = itemValue;
                    this._trigger( new IEvent( name, itemValue, e ), callback );
                } );

                listContainer.appendChild( listElement );
            }
        };

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = 'lexlist';
        this.root.appendChild( listContainer );

        this._updateValues( values );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.List = List;
